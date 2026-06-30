import { NextResponse } from "next/server";
import { proxyNestJson } from "../../../../_lib/nestProxy";

/** Proxies Nest `PATCH /admin/participations/:participationId/attendance-editable`. */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ participationId: string }> },
) {
    try {
        const { participationId } = await params;
        return proxyNestJson(
            request,
            `admin/participations/${encodeURIComponent(participationId)}/attendance-editable`,
            { defaultErrorMessage: "Failed to update attendance access" },
        );
    } catch (error) {
        console.error("admin participations attendance-editable PATCH proxy:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
