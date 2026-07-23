import { proxySectionAnalyticsGet } from "../../../../../../_lib/sectionAnalyticsProxy";

/** Proxies Nest `GET /student/projects/:projectId/sections/:section/analytics`. */
export async function GET(
    request: Request,
    context: { params: Promise<{ projectId: string; section: string }> },
) {
    const { projectId, section } = await context.params;
    return proxySectionAnalyticsGet(
        request,
        `student/projects/${encodeURIComponent(projectId)}/sections/${encodeURIComponent(section)}/analytics`,
    );
}
