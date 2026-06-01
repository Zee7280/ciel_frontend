import { proxySection1AnalyticsGet } from "../../../../_lib/section1AnalyticsProxy";

/** Proxies Nest `GET /student/projects/:projectId/section1-analytics`. */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> },
) {
    const { projectId } = await params;
    return proxySection1AnalyticsGet(
        request,
        `student/projects/${encodeURIComponent(projectId)}/section1-analytics`,
    );
}
