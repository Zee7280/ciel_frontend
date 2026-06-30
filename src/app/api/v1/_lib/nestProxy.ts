import { NextResponse } from "next/server";
import { resolveBackendApiV1Base } from "@/utils/backendApiV1Base";

export type ProxyNestJsonOptions = {
    method?: string;
    body?: BodyInit | null;
    /** Extra Nest paths to try after 404 (e.g. student ↔ students alias). */
    alternatePaths?: string[];
    defaultErrorMessage?: string;
};

/** `student/foo` → also try `students/foo`, and vice versa. */
export function studentNestPathAlternates(nestPath: string): string[] {
    const trimmed = nestPath.replace(/^\/+/, "");
    if (trimmed.startsWith("student/")) {
        return [`students/${trimmed.slice("student/".length)}`];
    }
    if (trimmed.startsWith("students/")) {
        return [`student/${trimmed.slice("students/".length)}`];
    }
    return [];
}

function pathsToTry(primary: string, alternates: string[] = []): string[] {
    const out: string[] = [];
    for (const candidate of [primary, ...alternates]) {
        const trimmed = candidate.replace(/^\/+/, "");
        if (trimmed && !out.includes(trimmed)) out.push(trimmed);
    }
    return out;
}

/**
 * Forward a BFF request to Nest `api/v1/{nestPath}` with normalized base URL.
 * Returns parsed JSON (passthrough on success).
 */
export async function proxyNestJson(
    request: Request,
    nestPath: string,
    options: ProxyNestJsonOptions = {},
): Promise<NextResponse> {
    const base = resolveBackendApiV1Base();
    if (!base) {
        return NextResponse.json({ success: false, message: "Backend URL is not configured" }, { status: 500 });
    }

    const method = (options.method ?? request.method).toUpperCase();
    const authHeader = request.headers.get("Authorization");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authHeader) headers.Authorization = authHeader;

    const incoming = new URL(request.url);
    const qs = incoming.search;

    let body: BodyInit | undefined;
    if (options.body !== undefined) {
        body = options.body ?? undefined;
    } else if (method !== "GET" && method !== "HEAD") {
        const text = await request.text();
        if (text) body = text;
    }

    const paths = pathsToTry(nestPath, options.alternatePaths ?? []);

    for (let i = 0; i < paths.length; i++) {
        const target = `${base}/${paths[i]}${qs}`;
        const response = await fetch(target, {
            method,
            headers,
            ...(body !== undefined ? { body } : {}),
        });

        const isLast = i === paths.length - 1;
        const payload = await response.json().catch(() => ({}));

        if (response.status === 404 && !isLast) {
            continue;
        }

        if (!response.ok) {
            const message =
                (payload as { message?: string }).message ||
                (payload as { error?: string }).error ||
                options.defaultErrorMessage ||
                "Request failed";
            return NextResponse.json(
                typeof payload === "object" && payload !== null && Object.keys(payload).length
                    ? payload
                    : { success: false, message },
                { status: response.status },
            );
        }

        return NextResponse.json(payload);
    }

    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
}
