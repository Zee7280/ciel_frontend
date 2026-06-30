import { proxyNestJson } from "../../../../_lib/nestProxy";

/** Proxies Nest `POST /admin/projects/:opportunityId/dedupe-student-seats`. */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ opportunityId: string }> },
) {
    try {
        const { opportunityId } = await params;
        return proxyNestJson(
            request,
            `admin/projects/${encodeURIComponent(opportunityId)}/dedupe-student-seats`,
            { defaultErrorMessage: "Failed to remove duplicate seats" },
        );
    } catch (error) {
        console.error("admin projects dedupe-student-seats POST proxy:", error);
        return Response.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
