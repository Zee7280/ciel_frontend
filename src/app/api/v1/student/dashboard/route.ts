import { NextResponse } from "next/server";
import { proxyStudentDashboardGet } from "@/lib/student-dashboard-api";

/**
 * GET /api/v1/student/dashboard
 *
 * Tries new `…/me/dashboard` routes first, then legacy backend paths. Without
 * `NEXT_PUBLIC_BACKEND_BASE_URL`, returns the local additive mock payload.
 */
export async function GET(request: Request) {
    try {
        return await proxyStudentDashboardGet(request, [
            "/students/me/dashboard",
            "/student/me/dashboard",
            "/student/dashboard",
            "/students/dashboard",
        ]);
    } catch (error) {
        console.error("student/dashboard GET:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
