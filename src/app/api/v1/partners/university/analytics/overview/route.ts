import { proxySectionAnalyticsGet } from "../../../../_lib/sectionAnalyticsProxy";

/** Proxies Nest `GET /partners/university/analytics/overview`. */
export async function GET(request: Request) {
    return proxySectionAnalyticsGet(
        request,
        "partners/university/analytics/overview",
    );
}
