import { NextResponse } from "next/server";

/** Proxies Nest `POST /admin/projects/:opportunityId/dedupe-student-seats`. */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ opportunityId: string }> },
) {
    try {
        const { opportunityId } = await params;
        const backendBase = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(/\/+$/, "");
        if (!backendBase) {
            return NextResponse.json({ success: false, message: "Backend URL is not configured" }, { status: 500 });
        }

        const authHeader = request.headers.get("Authorization");
        const body = await request.json().catch(() => ({}));

        const response = await fetch(
            `${backendBase}/admin/projects/${encodeURIComponent(opportunityId)}/dedupe-student-seats`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: authHeader || "",
                },
                body: JSON.stringify(body),
            },
        );

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        (payload as { message?: string; error?: string }).message ||
                        (payload as { message?: string; error?: string }).error ||
                        "Failed to remove duplicate seats",
                },
                { status: response.status },
            );
        }

        return NextResponse.json(payload);
    } catch (error) {
        console.error("admin projects dedupe-student-seats POST proxy:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
