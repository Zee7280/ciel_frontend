import { proxySection1AnalyticsGet } from "../../../_lib/section1AnalyticsProxy";

/** Proxies Nest `GET /faculty/analytics/section1`. */
export async function GET(request: Request) {
    return proxySection1AnalyticsGet(request, "faculty/analytics/section1");
}
