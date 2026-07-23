import { proxySectionAnalyticsGet } from "../../../_lib/sectionAnalyticsProxy";

/** Proxies Nest `GET /partners/analytics/summary`. */
export async function GET(request: Request) {
    return proxySectionAnalyticsGet(request, "partners/analytics/summary");
}
