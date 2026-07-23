import { proxySectionAnalyticsGet } from "../../../_lib/sectionAnalyticsProxy";

/** Proxies Nest `GET /faculty/analytics/summary`. */
export async function GET(request: Request) {
    return proxySectionAnalyticsGet(request, "faculty/analytics/summary");
}
