import { proxySectionAnalyticsGet } from "../../../_lib/sectionAnalyticsProxy";

/** Proxies Nest `GET /admin/analytics/overview`. */
export async function GET(request: Request) {
    return proxySectionAnalyticsGet(request, "admin/analytics/overview");
}
