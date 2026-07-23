import { proxySectionAnalyticsGet } from "../../../_lib/sectionAnalyticsProxy";

/** Proxies Nest `GET /faculty/analytics/overview`. */
export async function GET(request: Request) {
    return proxySectionAnalyticsGet(request, "faculty/analytics/overview");
}
