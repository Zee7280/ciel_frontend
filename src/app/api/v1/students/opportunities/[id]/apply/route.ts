import { NextResponse } from "next/server";
import { extractJsonErrorMessage, normalizeNestHttpMessage } from "@/utils/applyOpportunityUx";
import { proxyNestJson, studentNestPathAlternates } from "../../../../_lib/nestProxy";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const nestPath = `students/opportunities/${encodeURIComponent(id)}/apply`;
        const response = await proxyNestJson(request, nestPath, {
            alternatePaths: studentNestPathAlternates(nestPath),
            defaultErrorMessage: "Operation failed",
        });

        if (response.status < 400) {
            return response;
        }

        const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        const msg =
            extractJsonErrorMessage(data) ||
            normalizeNestHttpMessage(data?.error) ||
            normalizeNestHttpMessage(data?.message) ||
            "Operation failed";
        return NextResponse.json({ error: msg, message: msg }, { status: response.status });
    } catch (error) {
        console.error("Error in students/opportunities/[id]/apply proxy:", error);
        return NextResponse.json({ error: "Internal Server Error", message: "Internal Server Error" }, { status: 500 });
    }
}
