import { NextResponse } from "next/server";

/** GET /student/projects/:projectId — report gate + project detail for student. */
export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
    try {
        const { projectId } = await params;
        const backendBase = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(/\/+$/, "");
        if (!backendBase) {
            return NextResponse.json({ success: false, message: "Backend URL is not configured" }, { status: 500 });
        }

        const authHeader = request.headers.get("Authorization");
        const primary = `${backendBase}/student/projects/${encodeURIComponent(projectId)}`;
        const fallback = `${backendBase}/students/projects/${encodeURIComponent(projectId)}`;

        let response = await fetch(primary, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: authHeader || "",
            },
        });

        if (response.status === 404) {
            response = await fetch(fallback, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: authHeader || "",
                },
            });
        }

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json(
                { success: false, message: (data as { message?: string }).message || "Failed to load project" },
                { status: response.status },
            );
        }

        return NextResponse.json(typeof data === "object" && data !== null ? data : { success: true, data });
    } catch (error) {
        console.error("student/projects/[projectId] GET proxy:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
