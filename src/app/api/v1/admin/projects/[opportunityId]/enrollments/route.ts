import { NextResponse } from "next/server";

/** Proxies Nest `GET /admin/projects/:opportunityId/enrollments`. */
export async function GET(
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
        const response = await fetch(
            `${backendBase}/admin/projects/${encodeURIComponent(opportunityId)}/enrollments`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: authHeader || "",
                },
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
                        "Failed to fetch enrollments",
                },
                { status: response.status },
            );
        }

        return NextResponse.json(payload);
    } catch (error) {
        console.error("admin projects enrollments GET proxy:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
