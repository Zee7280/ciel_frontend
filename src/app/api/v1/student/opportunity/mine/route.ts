import { NextResponse } from "next/server";
import { proxyNestJson, studentNestPathAlternates } from "../../../_lib/nestProxy";

/** Proxies Nest `GET /student/opportunity/mine` — this student's own created opportunities. */
export async function GET(request: Request) {
    try {
        const nestPath = "student/opportunity/mine";
        return proxyNestJson(request, nestPath, {
            alternatePaths: studentNestPathAlternates(nestPath),
            defaultErrorMessage: "Failed to load your opportunities",
        });
    } catch (error) {
        console.error("student/opportunity/mine GET proxy:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
