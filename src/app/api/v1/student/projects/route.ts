import { proxyNestJson, studentNestPathAlternates } from "../../_lib/nestProxy";

export async function POST(request: Request) {
    try {
        const nestPath = "student/projects";
        return proxyNestJson(request, nestPath, {
            alternatePaths: studentNestPathAlternates(nestPath),
            defaultErrorMessage: "Failed to fetch projects",
        });
    } catch (error) {
        console.error("Error in student/projects POST proxy:", error);
        return Response.json({ success: false, message: "Failed to fetch projects" }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const nestPath = "student/projects";
        return proxyNestJson(request, nestPath, {
            alternatePaths: studentNestPathAlternates(nestPath),
            defaultErrorMessage: "Failed to fetch projects",
        });
    } catch (error) {
        console.error("Error in student/projects GET proxy:", error);
        return Response.json({ success: false, message: "Failed to fetch projects" }, { status: 500 });
    }
}
