import { NextResponse } from "next/server";
import { extractJsonErrorMessage, normalizeNestHttpMessage } from "@/utils/applyOpportunityUx";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authHeader = request.headers.get("Authorization");
        const { id } = await params;

        let body;
        try {
            body = await request.json();
        } catch (e) {
            body = null;
        }

        // Proxy to backend /students/opportunities/[id]/apply
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/students/opportunities/${id}/apply`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": authHeader || ""
            },
            body: body ? JSON.stringify(body) : undefined
        });

        let data: Record<string, unknown> = {};
        try {
            data = (await response.json()) as Record<string, unknown>;
        } catch {
            data = {};
        }

        if (!response.ok) {
            const merged = extractJsonErrorMessage(data);
            const msg = merged || normalizeNestHttpMessage(data?.error) || "Operation failed";
            return NextResponse.json({ error: msg, message: msg }, { status: response.status });
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error("Error in students/opportunities/[id]/apply proxy:", error);
        return NextResponse.json({ error: "Internal Server Error", message: "Internal Server Error" }, { status: 500 });
    }
}
