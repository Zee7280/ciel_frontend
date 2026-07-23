import { proxySectionAnalyticsGet } from "../../../../_lib/sectionAnalyticsProxy";

/** Proxies Nest `GET /partners/university/analytics/summary`. */
export async function GET(request: Request) {
    return proxySectionAnalyticsGet(request, "partners/university/analytics/summary");
}
