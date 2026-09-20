import { NextResponse } from "next/server";
import { resolveBackendApiV1Base } from "@/utils/backendApiV1Base";

export async function DELETE(request: Request, context: { params: Promise<{ facultyUserId: string }> }) {
    try {
        const base = resolveBackendApiV1Base();
        if (!base) {
            return NextResponse.json({ success: false, message: "Backend URL not configured" }, { status: 500 });
        }
        const { facultyUserId } = await context.params;
        const authHeader = request.headers.get("Authorization");
        const response = await fetch(
            `${base}/partners/community-service/faculty-representatives/${encodeURIComponent(facultyUserId)}`,
            {
                method: "DELETE",
                headers: {
                    Authorization: authHeader || "",
                    "Content-Type": "application/json",
                },
            },
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }
        return NextResponse.json(data);
    } catch (e) {
        console.error("partners/community-service/faculty-representatives DELETE proxy:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
