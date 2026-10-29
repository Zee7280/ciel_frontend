import { NextResponse } from "next/server";

/**
 * Proxy for the organisation profile. The backend reads the caller's own organisation from their
 * session (a `userId` in the body is honoured for admins only), so an empty body is a valid request.
 */
export async function POST(request: Request) {
    try {
        const body = (await request.json().catch(() => ({}))) as { userId?: unknown } | null;
        const authHeader = request.headers.get("Authorization");
        const userId = typeof body?.userId === "string" && body.userId.trim() ? body.userId.trim() : undefined;

        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/organisation/profile/detail`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": authHeader || ""
            },
            body: JSON.stringify(userId ? { userId } : {}),
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { error: data.message || "Failed to fetch profile details" },
                { status: response.status }
            );
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error("Error in organisation/profile/detail proxy:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
