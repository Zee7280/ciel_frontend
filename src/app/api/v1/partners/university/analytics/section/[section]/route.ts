import { proxySectionAnalyticsGet } from "../../../../../_lib/sectionAnalyticsProxy";

/** Proxies Nest `GET /partners/university/analytics/section/:section`. */
export async function GET(
    request: Request,
    context: { params: Promise<{ section: string }> },
) {
    const { section } = await context.params;
    return proxySectionAnalyticsGet(
        request,
        `partners/university/analytics/section/${encodeURIComponent(section)}`,
    );
}
