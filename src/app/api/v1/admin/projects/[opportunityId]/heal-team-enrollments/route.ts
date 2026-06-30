import { proxyNestJson } from "../../../../_lib/nestProxy";

/** Proxies Nest `POST /admin/projects/:opportunityId/heal-team-enrollments`. */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ opportunityId: string }> },
) {
    try {
        const { opportunityId } = await params;
        return proxyNestJson(
            request,
            `admin/projects/${encodeURIComponent(opportunityId)}/heal-team-enrollments`,
            { defaultErrorMessage: "Failed to repair enrollments" },
        );
    } catch (error) {
        console.error("heal-team-enrollments proxy error:", error);
        return Response.json({ success: false, message: "Failed to repair enrollments" }, { status: 500 });
    }
}
