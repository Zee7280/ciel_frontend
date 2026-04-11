import { NextResponse } from "next/server";
import { mapFacultyApprovalBackendRow, extractFacultyApprovalsArray } from "@/utils/facultyApprovals";

export async function GET(request: Request) {
    try {
        const backendBase = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(/\/+$/, "");
        if (!backendBase) {
            return NextResponse.json(
                { success: false, message: "Backend URL is not configured" },
                { status: 500 },
            );
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status") || "pending";
        const authHeader = request.headers.get("Authorization");

        const url = `${backendBase}/faculty/approvals?status=${encodeURIComponent(status)}`;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: authHeader || "",
            },
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            const msg =
                (payload as { message?: string }).message ||
                (payload as { error?: string }).error ||
                "Failed to fetch faculty approvals";
            return NextResponse.json({ success: false, message: msg }, { status: response.status });
        }

        const rows = extractFacultyApprovalsArray(payload).map(mapFacultyApprovalBackendRow).filter(Boolean);
        return NextResponse.json({ success: true, data: rows });
    } catch (error) {
        console.error("faculty/approvals GET proxy:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
