import { proxyNestJson } from "../../../../_lib/nestProxy";

/** Proxies Nest `GET /admin/projects/:opportunityId/enrollments`. */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ opportunityId: string }> },
) {
    try {
        const { opportunityId } = await params;
        return proxyNestJson(
            request,
            `admin/projects/${encodeURIComponent(opportunityId)}/enrollments`,
            { defaultErrorMessage: "Failed to fetch enrollments" },
        );
    } catch (error) {
        console.error("admin projects enrollments GET proxy:", error);
        return Response.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
