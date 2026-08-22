import { proxyNestJson } from "../../../_lib/nestProxy";

/** Proxies Nest `POST /admin/projects/remind-zero-hours`. */
export async function POST(request: Request) {
    try {
        return proxyNestJson(request, "admin/projects/remind-zero-hours", {
            defaultErrorMessage: "Failed to send hours-logging reminders",
        });
    } catch (error) {
        console.error("admin projects remind-zero-hours POST proxy:", error);
        return Response.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
