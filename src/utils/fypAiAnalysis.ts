import { authenticatedFetch } from "@/utils/api";

/** Mirrors ciel_backend's fyp-ai-analysis.constants.ts FypAiDimensionResult. */
export interface FypAiDimensionResult {
    key: string;
    label: string;
    max: number;
    score: number;
    rationale?: string;
}

/** Mirrors ciel_backend's parse-fyp-ai.util.ts FypAiSectionInput. */
export interface FypAiSectionInput {
    key: string;
    analysis: string;
}

/** The stored `aiAnalysis` jsonb shape on a FypEntry — see runFypAiAnalysis/approveFypAiAnalysis
 * in ciel_backend/src/paths/paths.service.ts. Once locked (aiAnalysisLock.locked), a student/team
 * view of this entry only carries {final, classification, dimensions: [{key,label,max,score}]} —
 * faculty reads (this panel) always see the full record. */
export interface FypAiAnalysis {
    dimensions: FypAiDimensionResult[];
    rawTotal: number;
    final: number;
    classification: string;
    gatesApplied: string[];
    sections?: FypAiSectionInput[];
    why?: string;
    whyNotHigher?: string;
    sustainability?: string;
    opportunityPotential?: string;
    redFlags?: string[];
    needsAdminReview?: boolean;
    studentFeedback?: string;
    frameworkVersion?: string;
    facultyModified?: boolean;
    computedAt?: string;
    facultyEditedAt?: string;
    status?: "running" | "ready" | "failed";
    original?: { final?: number; classification?: string; computedAt?: string };
}

export interface FypAiAnalysisLock {
    locked: boolean;
    hash: string;
    lockedAt: string;
    lockedBySupervisorEmail: string;
    facultyNote?: string;
}

async function parseJson(res: Response | null): Promise<Record<string, unknown> | null> {
    if (!res) return null;
    return res.json().catch(() => null);
}

function errorMessage(json: Record<string, unknown> | null, fallback: string): string {
    const err = json?.error ?? json?.message;
    return typeof err === "string" && err.trim() ? err : fallback;
}

/** Runs (or re-runs, while unlocked) the FYP-MM 1.0 AI pre-analysis. */
export async function runFypAiAnalysis(id: string): Promise<FypAiAnalysis> {
    const res = await authenticatedFetch(`/api/v1/paths/fyp-thesis/${id}/ai-analysis/analyse`, {
        method: "POST",
    });
    const json = await parseJson(res);
    if (!res?.ok) throw new Error(errorMessage(json, "The AI analysis could not be run. Please retry."));
    return json?.data as FypAiAnalysis;
}

/** Faculty override of one or more AI-scored dimensions before approving. */
export async function editFypAiAnalysis(
    id: string,
    dimensions: Array<{ key: string; score: number; rationale?: string }>,
): Promise<FypAiAnalysis> {
    const res = await authenticatedFetch(`/api/v1/paths/fyp-thesis/${id}/ai-analysis`, {
        method: "PATCH",
        body: JSON.stringify({ dimensions }),
    });
    const json = await parseJson(res);
    if (!res?.ok) throw new Error(errorMessage(json, "Could not save your edits."));
    return json?.data as FypAiAnalysis;
}

/** Approves and hash-locks the AI analysis — also records the supervisor's FYP approval decision. */
export async function approveFypAiAnalysis(
    id: string,
    note?: string,
): Promise<{ aiAnalysis: FypAiAnalysis; aiAnalysisLock: FypAiAnalysisLock }> {
    const res = await authenticatedFetch(`/api/v1/paths/fyp-thesis/${id}/ai-analysis/approve`, {
        method: "POST",
        body: JSON.stringify({ note }),
    });
    const json = await parseJson(res);
    if (!res?.ok) throw new Error(errorMessage(json, "Could not approve the AI assessment."));
    return json?.data as { aiAnalysis: FypAiAnalysis; aiAnalysisLock: FypAiAnalysisLock };
}
