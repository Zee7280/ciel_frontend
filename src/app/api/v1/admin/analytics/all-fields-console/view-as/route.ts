import { proxySectionAnalyticsGet } from "../../../../_lib/sectionAnalyticsProxy";

/** Proxies Nest `GET /admin/analytics/all-fields-console/view-as`. */
export async function GET(request: Request) {
    return proxySectionAnalyticsGet(
        request,
        "admin/analytics/all-fields-console/view-as",
    );
}
