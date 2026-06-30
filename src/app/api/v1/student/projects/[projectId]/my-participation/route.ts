import { NextResponse } from "next/server";
import { proxyNestJson, studentNestPathAlternates } from "../../../../_lib/nestProxy";

/** Proxies Nest `GET /student/projects/:id/my-participation`. */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> },
) {
    try {
        const { projectId } = await params;
        const nestPath = `student/projects/${encodeURIComponent(projectId)}/my-participation`;
        return proxyNestJson(request, nestPath, {
            alternatePaths: studentNestPathAlternates(nestPath),
            defaultErrorMessage: "Failed to load participation",
        });
    } catch (error) {
        console.error("my-participation GET proxy:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
