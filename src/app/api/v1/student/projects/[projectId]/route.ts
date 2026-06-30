import { NextResponse } from "next/server";
import { proxyNestJson, studentNestPathAlternates } from "../../../_lib/nestProxy";

/** GET /student/projects/:projectId — report gate + project detail for student. */
export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
    try {
        const { projectId } = await params;
        const nestPath = `student/projects/${encodeURIComponent(projectId)}`;
        return proxyNestJson(request, nestPath, {
            alternatePaths: studentNestPathAlternates(nestPath),
            defaultErrorMessage: "Failed to load project",
        });
    } catch (error) {
        console.error("student/projects/[projectId] GET proxy:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
