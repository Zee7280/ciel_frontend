import type { ReportCIIauditMeta } from "@/lib/parseCIIauditSummary";

export interface AISummaryResponse {
    summary?: string;
    error?: string;
    auditMeta?: ReportCIIauditMeta | null;
}

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
    try {
        // Clean data: remove non-serializable objects (like File arrays) before sending to AI
        const cleanData = JSON.parse(JSON.stringify(data, (_key, value: unknown) => {
            if (isNativeFile(value) || isFileLike(value)) return undefined; // Skip files
            if (Array.isArray(value) && value.some(v => isNativeFile(v) || isFileLike(v))) return []; // Skip file arrays
            return value;
        }));

        const controller = new AbortController();
        const timeoutMs = section === "section11" ? 90000 : 45000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        const response = await fetch("/api/ai/summarize", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ section: SUMMARY_ROUTE_BY_SECTION[section] || section, data: cleanData }),
            signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to generate summary");
        }

        return await response.json();
    } catch (error: unknown) {
        return { error: error instanceof Error ? error.message : "Failed to generate summary" };
    }
}
