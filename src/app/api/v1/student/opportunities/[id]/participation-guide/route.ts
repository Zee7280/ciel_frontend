import { NextResponse } from "next/server";
import { proxyNestJson, studentNestPathAlternates } from "../../../../_lib/nestProxy";

/** Proxies Nest `GET /student/opportunities/:id/participation-guide`. */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;
        const nestPath = `student/opportunities/${encodeURIComponent(id)}/participation-guide`;
        return proxyNestJson(request, nestPath, {
            alternatePaths: studentNestPathAlternates(nestPath),
            defaultErrorMessage: "Failed to load participation guide",
        });
    } catch (error) {
        console.error("participation-guide GET proxy:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
