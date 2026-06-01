import { proxySection1AnalyticsGet } from "../../../../_lib/section1AnalyticsProxy";

/** Proxies Nest `GET /admin/analytics/section1/stakeholders`. */
export async function GET(request: Request) {
    return proxySection1AnalyticsGet(request, "admin/analytics/section1/stakeholders");
}
