import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const token = authHeader.split(" ")[1];
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");
        const type = searchParams.get("type");

        let backendUrl = `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/notifications`;
        const params = [];
        if (status) params.push(`status=${status}`);
        if (type) params.push(`type=${type}`);
        if (params.length > 0) backendUrl += `?${params.join('&')}`;

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
                { success: false, message: data.message || "Failed to fetch notifications" },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Notifications fetch error:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
