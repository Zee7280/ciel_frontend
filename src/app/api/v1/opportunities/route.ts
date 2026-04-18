import { NextResponse } from "next/server";

function requireBackendBase(): string | null {
    const base = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
    if (!base || typeof base !== "string") return null;
    return base.replace(/\/$/, "");
}

/** Avoid throwing when upstream returns HTML, plain text, or empty body (common on proxy misconfig / 502 pages). */
function tryParseJsonResponse(raw: string): { ok: true; value: unknown } | { ok: false } {
    const t = raw.trim();
    if (!t) return { ok: true, value: {} };
    try {
        return { ok: true, value: JSON.parse(t) };
    } catch {
        return { ok: false };
    }
}

export async function GET(request: Request) {
    try {
        const root = requireBackendBase();
        if (!root) {
            return NextResponse.json({ error: "Server configuration error: backend URL is not set." }, { status: 500 });
        }

        const authHeader = request.headers.get("Authorization");
        const { searchParams } = new URL(request.url);
        const backendUrl = new URL(`${root}/opportunities`);
        for (const [key, value] of searchParams.entries()) {
            if (value.trim()) backendUrl.searchParams.append(key, value);
        }

        const response = await fetch(backendUrl.toString(), {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: authHeader || "",
            },
        });

        const raw = await response.text();
        const parsed = tryParseJsonResponse(raw);
        if (!parsed.ok) {
            console.error("opportunities GET: upstream non-JSON", response.status, raw.slice(0, 400));
            return NextResponse.json(
                { error: "Opportunity service returned a non-JSON response. Check NEXT_PUBLIC_BACKEND_BASE_URL and the backend." },
                { status: 502 }
            );
        }

        const data = parsed.value as Record<string, unknown>;

        if (!response.ok) {
            return NextResponse.json(
                { error: (typeof data.message === "string" && data.message) || (typeof data.error === "string" && data.error) || "Failed to fetch opportunities" },
                { status: response.status }
            );
        }

        return NextResponse.json(parsed.value);
    } catch (error) {
        console.error("Error in opportunities GET proxy:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const root = requireBackendBase();
        if (!root) {
            return NextResponse.json({ error: "Server configuration error: backend URL is not set." }, { status: 500 });
        }

        const authHeader = request.headers.get("Authorization");
        const body = await request.text();

        const response = await fetch(`${root}/opportunities`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: authHeader || "",
            },
            body,
        });

        const raw = await response.text();
        const parsed = tryParseJsonResponse(raw);
        if (!parsed.ok) {
            console.error("opportunities POST: upstream non-JSON", response.status, raw.slice(0, 400));
            return NextResponse.json(
                {
                    error: "Opportunity service returned a non-JSON response. Check NEXT_PUBLIC_BACKEND_BASE_URL and that the backend is running.",
                },
                { status: 502 }
            );
        }

        const data = parsed.value as Record<string, unknown>;

        if (!response.ok) {
            const msg =
                (typeof data.message === "string" && data.message) ||
                (typeof data.error === "string" && data.error) ||
                "Operation failed";
            return NextResponse.json({ error: msg }, { status: response.status });
        }

        return NextResponse.json(parsed.value);
    } catch (error) {
        console.error("Error in opportunities POST proxy:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
