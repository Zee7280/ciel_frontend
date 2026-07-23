import { NextResponse } from "next/server";
import { resolveBackendApiV1Base } from "@/utils/backendApiV1Base";

/** Shared GET proxy for Nest section analytics routes (sections 1–10 + summary). */
export async function proxySectionAnalyticsGet(
    request: Request,
    nestPath: string,
    alternatePaths: string[] = [],
) {
    try {
        const base = resolveBackendApiV1Base();
        if (!base) {
            return NextResponse.json({ success: false, message: "Backend URL not configured" }, { status: 500 });
        }
        const authHeader = request.headers.get("Authorization");
        const incoming = new URL(request.url);
        const qs = incoming.searchParams.toString();
        const suffix = qs ? `?${qs}` : "";

        const paths = [nestPath.replace(/^\/+/, ""), ...alternatePaths.map((p) => p.replace(/^\/+/, ""))].filter(
            (p, i, arr) => p && arr.indexOf(p) === i,
        );

        for (let i = 0; i < paths.length; i++) {
            const target = `${base}/${paths[i]}${suffix}`;
            const response = await fetch(target, {
                headers: {
                    Authorization: authHeader || "",
                    "Content-Type": "application/json",
                },
            });
            const data = await response.json().catch(() => ({}));
            const isLast = i === paths.length - 1;
            if (response.status === 404 && !isLast) continue;
            if (!response.ok) {
                return NextResponse.json(data, { status: response.status });
            }
            return NextResponse.json(data);
        }

        return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    } catch (e) {
        console.error(`section analytics GET proxy (${nestPath}):`, e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
