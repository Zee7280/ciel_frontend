import { NextResponse } from "next/server";
import { resolveBackendApiV1Base } from "@/utils/backendApiV1Base";

/** JSON-only proxy — avoids ~1MB gateway limit on multipart; browser uploads to S3 via presigned PUT. */
export async function POST(request: Request) {
    try {
        const base = resolveBackendApiV1Base();
        if (!base) {
            return NextResponse.json(
                { success: false, message: "Backend URL is not configured" },
                { status: 500 },
            );
        }
        const authHeader = request.headers.get("Authorization");
        const bodyText = await request.text();
        const response = await fetch(`${base}/student/reports/upload/presign`, {
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
