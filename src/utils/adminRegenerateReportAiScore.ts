import { authenticatedFetch } from "@/utils/api";

export type CielPkAiEvaluationPayload = {
    schema_version: string;
    evaluation_mode: string;
    generated_at: string;
    submission_metadata: Record<string, unknown>;
    uploaded_evidence_files: Array<Record<string, unknown>>;
    system_validation: Record<string, unknown>;
    [key: string]: unknown;
};

export async function fetchAdminReportAiEvaluationPayload(
    reportId: string,
): Promise<CielPkAiEvaluationPayload | null> {
    const response = await authenticatedFetch(
        `/api/v1/admin/reports/${reportId}/ai-evaluation-payload`,
        {},
        { redirectToLogin: true, timeoutMs: 60000 },
    );
    if (!response?.ok) return null;

    const body = await response.json();
    const payload =
        (body as { data?: CielPkAiEvaluationPayload }).data ??
        (body as { payload?: CielPkAiEvaluationPayload }).payload ??
        null;
    return payload && typeof payload === "object" ? payload : null;
}

function triggerJsonDownload(filename: string, payload: unknown): void {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

export async function downloadAdminReportAiPayload(
    reportId: string,
): Promise<{ success: boolean; error?: string }> {
    const payload = await fetchAdminReportAiEvaluationPayload(reportId);
    if (!payload) {
        return { success: false, error: "Failed to load AI evaluation payload" };
    }

    const safeId = reportId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 36) || "report";
    triggerJsonDownload(`ciel-pk-ai-evaluation-${safeId}.json`, payload);
    return { success: true };
}
