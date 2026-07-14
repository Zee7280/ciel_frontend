import { generateAISummary } from "@/app/dashboard/student/report/utils/aiSummarizer";
import { calculateCII } from "@/app/dashboard/student/report/utils/calculateCII";
import type { ReportData } from "@/app/dashboard/student/report/context/ReportContext";
import { readPersistedCiiSnapshot, type ReportCiiSnapshot } from "@/utils/reportCiiSnapshot";
import { prepareReportForVerifyDossier } from "@/utils/reportTeamScope";
import { authenticatedFetch } from "@/utils/api";

export type RegenerateAiScoreResult = {
    success: boolean;
    score?: number;
    error?: string;
    framework?: Section11AiFramework;
};

export type Section11AiFramework = "v8.2" | "v1.2";

export type Section11AiSummarizeRequest = {
    section: "section11";
    data: unknown;
};

export type CielPkAiEvaluationPayload = {
    schema_version: string;
    evaluation_mode: string;
    generated_at: string;
    submission_metadata: Record<string, unknown>;
    uploaded_evidence_files: Array<Record<string, unknown>>;
    system_validation: Record<string, unknown>;
    [key: string]: unknown;
};

const isFileLike = (value: unknown): value is { name: string; size: number } =>
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    "size" in value;

const isNativeFile = (value: unknown): value is File =>
    typeof File !== "undefined" && value instanceof File;

/** Same sanitizer used before POST /api/ai/summarize. */
export function sanitizeReportDataForAi(data: unknown): unknown {
    return JSON.parse(JSON.stringify(data, (_key, value: unknown) => {
        if (isNativeFile(value) || isFileLike(value)) return undefined;
        if (Array.isArray(value) && value.some((v) => isNativeFile(v) || isFileLike(v))) return [];
        return value;
    }));
}

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

export function buildSection11AiSummarizeRequest(
    evaluationPayload: CielPkAiEvaluationPayload,
): Section11AiSummarizeRequest {
    return {
        section: "section11",
        data: sanitizeReportDataForAi(evaluationPayload),
    };
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

export function resolveReportRequiredHours(report: ReportData & { opportunity?: { hours?: number; expected_hours?: number } }): number {
    const fromReport =
        typeof report.required_hours === "number" && report.required_hours > 0 ? report.required_hours : null;
    const opp = report.opportunity;
    const fromOpp =
        typeof opp?.hours === "number" && opp.hours > 0
            ? opp.hours
            : typeof opp?.expected_hours === "number" && opp.expected_hours > 0
              ? opp.expected_hours
              : null;
    return fromReport ?? fromOpp ?? 16;
}

export function buildReportPayloadForAi(
    report: ReportData & { opportunity?: { hours?: number; expected_hours?: number }; id?: string },
): ReportData {
    const reqH = resolveReportRequiredHours(report);
    const projectId =
        typeof report.project_id === "string" && report.project_id.trim()
            ? report.project_id
            : String(report.id ?? "");
    return {
        ...report,
        required_hours: reqH,
        project_id: projectId,
    };
}

export async function fetchAdminReportDetail(reportId: string): Promise<ReportData | null> {
    const response = await authenticatedFetch(
        `/api/v1/admin/reports/${reportId}`,
        {},
        { redirectToLogin: true, timeoutMs: 60000 },
    );
    if (!response?.ok) return null;

    const data = await response.json();
    const raw = (data as { data?: unknown; report?: unknown }).data ?? (data as { report?: unknown }).report ?? data;
    return prepareReportForVerifyDossier(raw as Record<string, unknown>) as unknown as ReportData;
}

/** Run section11 ChatGPT audit and persist CII score for one report. */
export async function regenerateAdminReportAiScore(
    reportId: string,
    existingReport?: ReportData | null,
    options?: { framework?: Section11AiFramework },
): Promise<RegenerateAiScoreResult> {
    const framework = options?.framework ?? "v8.2";
    const evaluationPayload = await fetchAdminReportAiEvaluationPayload(reportId);
    if (!evaluationPayload) {
        return { success: false, error: "Failed to load AI evaluation payload", framework };
    }

    const report = existingReport ?? (await fetchAdminReportDetail(reportId));
    const legacyCii = report && framework === "v8.2" ? calculateCII(buildReportPayloadForAi(report)) : null;
    const requestBody = buildSection11AiSummarizeRequest(evaluationPayload);
    const summarizeSection = framework === "v1.2" ? "section11_master_rubric" : "section11";
    const section11Res = await generateAISummary(summarizeSection, requestBody.data);

    if (section11Res.error || !section11Res.summary) {
        return { success: false, error: section11Res.error || "AI scoring failed", framework };
    }

    const draftSection11 = {
        ...(report?.section11 ?? {}),
        summary_text: section11Res.summary,
        is_ai_generated: true,
        audit_meta: section11Res.auditMeta ?? null,
        evaluation_framework_version: framework,
        ...(legacyCii ? { legacy_cii_index: legacyCii } : {}),
    };
    const persistedCii = resolvePersistedCiiSnapshot(draftSection11);

    if (!persistedCii) {
        return {
            success: false,
            error: "AI evaluation completed but no parseable FINAL CII SCORE was returned",
            framework,
        };
    }

    const section11 = {
        ...draftSection11,
        cii_index: persistedCii,
        ai_generated_impact_score: Math.round(persistedCii.totalScore),
    };

    const response = await authenticatedFetch(
        `/api/v1/admin/reports/${reportId}/ai-score`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                section11,
                cii_index: persistedCii,
            }),
        },
        { timeoutMs: 190000 },
    );

    if (!response?.ok) {
        const message = await response?.text().catch(() => "");
        return { success: false, error: message || "Failed to save AI score", framework };
    }

    return { success: true, score: Math.round(persistedCii.totalScore), framework };
}

/** Admin-only: Master Rubric v1.2 evaluation (0–100 CII scale). */
export async function regenerateAdminReportMasterRubricAiScore(
    reportId: string,
    existingReport?: ReportData | null,
): Promise<RegenerateAiScoreResult> {
    return regenerateAdminReportAiScore(reportId, existingReport, { framework: "v1.2" });
}

function resolvePersistedCiiSnapshot(
    section11: Record<string, unknown>,
): ReportCiiSnapshot | null {
    return readPersistedCiiSnapshot({ section11 });
}
