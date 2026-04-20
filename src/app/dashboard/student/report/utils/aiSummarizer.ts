import type { ReportCIIauditMeta } from "@/lib/parseCIIauditSummary";

export interface AISummaryResponse {
    summary?: string;
    error?: string;
    auditMeta?: ReportCIIauditMeta | null;
}

export async function generateAISummary(section: string, data: any): Promise<AISummaryResponse> {
    try {
        // Clean data: remove non-serializable objects (like File arrays) before sending to AI
        const cleanData = JSON.parse(JSON.stringify(data, (key, value) => {
            if (value instanceof File || (value && typeof value === 'object' && value.name && value.size)) return undefined; // Skip files
            if (Array.isArray(value) && value.some(v => v instanceof File || (v && typeof v === 'object' && v.name && v.size))) return []; // Skip file arrays
            return value;
        }));

        const response = await fetch("/api/ai/summarize", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ section, data: cleanData }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to generate summary");
        }

        return await response.json();
    } catch (error: any) {
        return { error: error.message };
    }
}
