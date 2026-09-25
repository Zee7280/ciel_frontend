import { readPersistedCiiSnapshot } from "@/utils/reportCiiSnapshot";
import type { ReportData } from "../context/ReportContext";
import { calculateCII, type CIIResult } from "./calculateCII";
import { CII_BREAKDOWN_ORDER, type CIIBreakdownKey } from "./ciiSectionWeights";

export type ReportCiiSource = "faculty_locked" | "submitted_snapshot" | "live_preview";

export type ResolvedReportCii = CIIResult & {
    source: ReportCiiSource;
    /** Faculty-locked or submit-time snapshot. A live preview is not the official record yet. */
    official: boolean;
};

function clampCii(score: number): number {
    return Math.min(100, Math.max(0, Math.round(score)));
}

function emptyLive(): CIIResult {
    return {
        totalScore: 0,
        level: "Introductory Engagement",
        breakdown: {
            participation: 0,
            context: 0,
            sdg: 0,
            outputs: 0,
            outcomes: 0,
            resources: 0,
            partnerships: 0,
            evidence: 0,
            learning: 0,
            sustainability: 0,
        },
        suggestions: [],
    };
}

function mergeBreakdown(
    live: CIIResult["breakdown"],
    extra: Record<string, number> | undefined,
): CIIResult["breakdown"] {
    if (!extra) return live;
    const merged = { ...live };
    for (const key of CII_BREAKDOWN_ORDER) {
        const value = extra[key];
        if (typeof value === "number" && Number.isFinite(value)) {
            merged[key as CIIBreakdownKey] = value;
        }
    }
    return merged;
}

/** Draft / revision (e.g. after admin delete + new start) must not keep an old submit snapshot. */
function hasSubmittedLifecycle(data: ReportData): boolean {
    const status = `${data.status || ""} ${data.report_status || ""} ${data.admin_status || ""}`.toLowerCase();
    return /(submitted|under_review|pending_payment|payment|paid|verified|approved|finalized|partner_verified)/.test(
        status,
    );
}

/**
 * One CII reading for the flashcard and the detailed report.
 * Faculty-locked CII v2 wins, then the snapshot saved at submit, then a live preview of the same fields.
 */
export function resolveReportCii(data: ReportData): ResolvedReportCii {
    let live: CIIResult;
    try {
        live = calculateCII(data);
    } catch {
        live = emptyLive();
    }
    const facultyFinal =
        data.ciiV2Lock?.locked === true &&
        typeof data.ciiV2?.final === "number" &&
        Number.isFinite(data.ciiV2.final)
            ? clampCii(data.ciiV2.final)
            : null;

    if (facultyFinal != null) {
        const persisted = readPersistedCiiSnapshot(data);
        return {
            ...live,
            level: persisted?.level || live.level,
            totalScore: facultyFinal,
            breakdown: mergeBreakdown(live.breakdown, persisted?.breakdown),
            suggestions: persisted?.suggestions ?? live.suggestions,
            source: "faculty_locked",
            official: true,
        };
    }

    const persisted = readPersistedCiiSnapshot(data);
    if (persisted && Number.isFinite(persisted.totalScore) && hasSubmittedLifecycle(data)) {
        return {
            ...live,
            level: persisted.level || live.level,
            totalScore: clampCii(persisted.totalScore),
            breakdown: mergeBreakdown(live.breakdown, persisted.breakdown),
            suggestions: persisted.suggestions ?? live.suggestions,
            source: "submitted_snapshot",
            official: true,
        };
    }

    return { ...live, source: "live_preview", official: false };
}
