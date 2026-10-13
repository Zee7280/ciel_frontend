import type { ReportCIIauditMeta } from "@/lib/parseCIIauditSummary";
import { authenticatedFetch } from "@/utils/api";

export interface AISummaryResponse {
    summary?: string;
    error?: string;
    skipped?: boolean;
    auditMeta?: ReportCIIauditMeta | null;
}

/** Infra / missing-key failures must not block or toast the student wizard. */
export function isOptionalAiSummaryUnavailable(message: string | null | undefined): boolean {
    const text = String(message || "").toLowerCase();
    if (!text.trim()) return false;
    return text.includes("api key is not configured") || text.includes("openai api key");
}

let studentSummariesUnavailable = false;

const SUMMARY_ROUTE_BY_SECTION: Record<string, string> = {
    section5: "section5_summary",
    section6: "section6_summary",
    section7: "section7_summary",
    section8: "section8_summary",
    section9: "section9_summary",
    section10: "section10_summary",
};

const isFileLike = (value: unknown): value is { name: string; size: number } => (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    "size" in value
);

const isNativeFile = (value: unknown): value is File => (
    typeof File !== "undefined" && value instanceof File
);

export async function generateAISummary(section: string, data: unknown): Promise<AISummaryResponse> {
    if (studentSummariesUnavailable && section !== "section11" && section !== "section11_master_rubric") {
        return { skipped: true };
    }
    try {
        // Clean data: remove non-serializable objects (like File arrays) before sending to AI
        const cleanData = JSON.parse(JSON.stringify(data, (_key, value: unknown) => {
            if (isNativeFile(value) || isFileLike(value)) return undefined; // Skip files
            if (Array.isArray(value) && value.some(v => isNativeFile(v) || isFileLike(v))) return []; // Skip file arrays
            return value;
        }));

        const timeoutMs =
            section === "section11" || section === "section11_master_rubric" ? 180000 : 45000;
        const response = await authenticatedFetch(
            "/api/ai/summarize",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ section: SUMMARY_ROUTE_BY_SECTION[section] || section, data: cleanData }),
            },
            { redirectToLogin: false, timeoutMs },
        );

        if (!response) {
            throw new Error("Your session has expired. Please log in again.");
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({} as Record<string, unknown>));
            const message = String(
                (errorData as { error?: unknown }).error ||
                    (errorData as { message?: unknown }).message ||
                    "Failed to generate summary",
            );
            if (isOptionalAiSummaryUnavailable(message)) {
                studentSummariesUnavailable = true;
                return { skipped: true };
            }
            throw new Error(message);
        }

        const payload = (await response.json()) as AISummaryResponse;
        if (payload?.skipped) {
            studentSummariesUnavailable = true;
            return { skipped: true };
        }
        return payload;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to generate summary";
        if (isOptionalAiSummaryUnavailable(message)) {
            studentSummariesUnavailable = true;
            return { skipped: true };
        }
        return { error: message };
    }
}
