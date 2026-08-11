import { proxySectionAnalyticsGet } from "../../../../_lib/sectionAnalyticsProxy";

/** Proxies Nest `GET /admin/analytics/all-fields-console/registry`. */
export async function GET(request: Request) {
    return proxySectionAnalyticsGet(
        request,
        "admin/analytics/all-fields-console/registry",
    );
}
