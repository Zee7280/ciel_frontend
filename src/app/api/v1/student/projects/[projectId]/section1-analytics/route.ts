import { proxySection1AnalyticsGet } from "../../../../_lib/section1AnalyticsProxy";
import { studentNestPathAlternates } from "../../../../_lib/nestProxy";

/** Proxies Nest `GET /student/projects/:projectId/section1-analytics`. */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> },
) {
    const { projectId } = await params;
    const nestPath = `student/projects/${encodeURIComponent(projectId)}/section1-analytics`;
    return proxySection1AnalyticsGet(request, nestPath, studentNestPathAlternates(nestPath));
}
