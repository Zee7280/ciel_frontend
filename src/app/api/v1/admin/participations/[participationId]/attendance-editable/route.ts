import { NextResponse } from "next/server";

/** Proxies Nest `PATCH /admin/participations/:participationId/attendance-editable`. */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ participationId: string }> },
) {
    try {
        const { participationId } = await params;
        const backendBase = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(/\/+$/, "");
        if (!backendBase) {
            return NextResponse.json({ success: false, message: "Backend URL is not configured" }, { status: 500 });
        }

        const authHeader = request.headers.get("Authorization");
        const body = await request.json().catch(() => ({}));

        const response = await fetch(
            `${backendBase}/admin/participations/${encodeURIComponent(participationId)}/attendance-editable`,
            {
                method: "PATCH",
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
                        "Failed to update attendance access",
                },
                { status: response.status },
            );
        }

        return NextResponse.json(payload);
    } catch (error) {
        console.error("admin participations attendance-editable PATCH proxy:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
