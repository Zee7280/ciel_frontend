import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log("Received Report Submission:", body);

        // Simulate DB delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        return NextResponse.json({ success: true, message: "Report submitted successfully!" });
    } catch (error) {
        return NextResponse.json({ success: false, message: "Failed to submit report" }, { status: 500 });
    }
}
