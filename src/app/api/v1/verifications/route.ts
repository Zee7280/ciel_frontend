import { NextRequest, NextResponse } from "next/server";
import { resolveBackendApiV1Base } from "@/utils/backendApiV1Base";

export async function GET(req: NextRequest) {
    try {
        // Verify authentication
        const authHeader = req.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const token = authHeader.split(" ")[1];

        // Get query parameters
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status") || "pending";

        const apiBase = resolveBackendApiV1Base();
        if (!apiBase) {
            return NextResponse.json(
                { success: false, message: "Server misconfiguration: backend URL not set" },
                { status: 500 },
            );
        }

        const backendUrl = `${apiBase}/partners/verifications?status=${encodeURIComponent(status)}`;
        const response = await fetch(backendUrl, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { success: false, message: data.message || "Failed to fetch verifications" },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Verifications fetch error:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
