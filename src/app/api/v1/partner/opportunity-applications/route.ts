import { proxyNestJson } from "@/app/api/v1/_lib/nestProxy";

export async function GET(request: Request) {
    return proxyNestJson(request, "partner/opportunity-applications", {
        defaultErrorMessage: "Failed to load join applications",
    });
}
