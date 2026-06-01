import { proxySection1AnalyticsGet } from "../../../../_lib/section1AnalyticsProxy";

/** Proxies Nest `GET /partners/university/analytics/section1`. */
export async function GET(request: Request) {
    return proxySection1AnalyticsGet(request, "partners/university/analytics/section1");
}
