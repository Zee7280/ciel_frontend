import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ opportunityId: string }> };

export async function GET(request: Request, context: RouteContext) {
    try {
        const { opportunityId } = await context.params;
        const id = opportunityId?.trim();
        if (!id) {
            return NextResponse.json({ error: "Project id is required" }, { status: 400 });
        }

        const authHeader = request.headers.get("Authorization");
        const backendBase = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(/\/+$/, "");
        if (!backendBase) {
            return NextResponse.json({ error: "Backend URL is not configured" }, { status: 500 });
        }

        const response = await fetch(
            `${backendBase}/admin/projects/${encodeURIComponent(id)}/evidence/download`,
            {
                headers: {
                    Authorization: authHeader || "",
                },
            },
        );

        if (!response.ok) {
            const errBody = await response.json().catch(() => ({}));
            const message =
                (errBody as { message?: string }).message ||
                (errBody as { error?: string }).error ||
                "Failed to download evidence";
            return NextResponse.json({ error: message }, { status: response.status });
        }

        const contentType = response.headers.get("Content-Type") || "application/zip";
        const disposition =
            response.headers.get("Content-Disposition") ||
            `attachment; filename="project-${id}-evidence.zip"`;

        return new NextResponse(response.body, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": disposition,
            },
        });
    } catch (error) {
        console.error("evidence download proxy:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
