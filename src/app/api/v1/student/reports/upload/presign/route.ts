import { NextResponse } from "next/server";

/** JSON-only proxy — avoids ~1MB gateway limit on multipart; browser uploads to S3 via presigned PUT. */
export async function POST(request: Request) {
    try {
        const backendBase = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(/\/+$/, "");
        if (!backendBase) {
            return NextResponse.json(
                { success: false, message: "Backend URL is not configured" },
                { status: 500 },
            );
        }
        const authHeader = request.headers.get("Authorization");
        const bodyText = await request.text();
        const response = await fetch(`${backendBase}/api/v1/student/reports/upload/presign`, {
            method: "POST",
            headers: {
                Authorization: authHeader || "",
                "Content-Type": "application/json",
            },
            body: bodyText || "{}",
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json(
                typeof data === "object" && data !== null ? data : { success: false, message: "Presign failed" },
                { status: response.status },
            );
        }
        return NextResponse.json(data);
    } catch (e) {
        console.error("student/reports/upload/presign proxy:", e);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
