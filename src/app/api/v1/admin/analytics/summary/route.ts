import { proxySectionAnalyticsGet } from "../../../_lib/sectionAnalyticsProxy";

/** Proxies Nest `GET /admin/analytics/summary`. */
export async function GET(request: Request) {
    return proxySectionAnalyticsGet(request, "admin/analytics/summary");
}
