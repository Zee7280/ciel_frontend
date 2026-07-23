import { proxySectionAnalyticsGet } from "../../../../../_lib/sectionAnalyticsProxy";

/** Proxies Nest `GET /student/projects/:projectId/analytics/summary`. */
export async function GET(
    request: Request,
    context: { params: Promise<{ projectId: string }> },
) {
    const { projectId } = await context.params;
    return proxySectionAnalyticsGet(
        request,
        `student/projects/${encodeURIComponent(projectId)}/analytics/summary`,
    );
}
