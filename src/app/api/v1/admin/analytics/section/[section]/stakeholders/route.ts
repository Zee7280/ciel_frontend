import { proxySectionAnalyticsGet } from "../../../../../_lib/sectionAnalyticsProxy";

/** Proxies Nest `GET /admin/analytics/section/:section/stakeholders`. */
export async function GET(
    request: Request,
    context: { params: Promise<{ section: string }> },
) {
    const { section } = await context.params;
    return proxySectionAnalyticsGet(
        request,
        `admin/analytics/section/${encodeURIComponent(section)}/stakeholders`,
    );
}
