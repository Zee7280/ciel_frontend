import { proxyNestJson } from "../../../../_lib/nestProxy";

/** Proxies Nest `POST /admin/projects/:opportunityId/reconcile-enrollments`. */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ opportunityId: string }> },
) {
    try {
        const { opportunityId } = await params;
        return proxyNestJson(
            request,
            `admin/projects/${encodeURIComponent(opportunityId)}/reconcile-enrollments`,
            { defaultErrorMessage: "Failed to reconcile enrollments" },
        );
    } catch (error) {
        console.error("reconcile-enrollments proxy error:", error);
        return Response.json({ success: false, message: "Failed to reconcile enrollments" }, { status: 500 });
    }
}
