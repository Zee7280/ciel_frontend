import { NextResponse } from "next/server";
import { proxyStudentDashboardGet } from "@/lib/student-dashboard-api";

/** GET /api/v1/students/me/dashboard — proxies to backend `GET /students/me/dashboard` (JWT = dashboard owner). */
export async function GET(request: Request) {
    try {
        return await proxyStudentDashboardGet(request, ["/students/me/dashboard"]);
    } catch (error) {
        console.error("students/me/dashboard GET:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
