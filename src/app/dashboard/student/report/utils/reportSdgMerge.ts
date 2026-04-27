import type { ReportData } from "../context/ReportContext";
import { findSdgById } from "@/utils/sdgData";

function digitsGoalNumber(v: unknown): number | null {
    const digits = String(v ?? "").replace(/\D/g, "");
    if (!digits) return null;
    const n = parseInt(digits, 10);
    if (!Number.isFinite(n) || n < 1 || n > 17) return null;
    return n;
}

export function formatSdgGoalPadded(goalNumber: number): string {
    if (!Number.isFinite(goalNumber) || goalNumber < 1 || goalNumber > 17) return String(goalNumber);
    return goalNumber >= 1 && goalNumber <= 9 ? `0${goalNumber}` : String(goalNumber);
}

export type ReportSdgSource = "opportunity" | "student";

export type ReportSdgRow = {
    goalNumber: number;
    title: string;
    targetId: string;
    indicatorId: string;
    source: ReportSdgSource;
    role: "primary" | "secondary";
    justification?: string;
};

function titleForGoal(goalNumber: number, explicit?: string | null): string {
    const t = explicit?.trim();
    if (t) return t;
    return findSdgById(goalNumber)?.title || `SDG ${goalNumber}`;
}

/** Opportunity-level SDGs from project payload (partner / browse API shape). */
export function listOpportunityReportSdgs(projectData: unknown): ReportSdgRow[] {
    if (!projectData || typeof projectData !== "object") return [];
    const p = projectData as Record<string, unknown>;
    const rows: ReportSdgRow[] = [];

    const info = p.sdg_info as Record<string, unknown> | undefined;
    const primaryNum = digitsGoalNumber(info?.sdg_id ?? p.sdg);
    if (primaryNum) {
        rows.push({
            goalNumber: primaryNum,
            title: titleForGoal(primaryNum),
            targetId: String(info?.target_id ?? "").trim(),
            indicatorId: String(info?.indicator_id ?? "").trim(),
            source: "opportunity",
            role: "primary",
        });
    }

    const secondaries = p.secondary_sdgs;
    if (!Array.isArray(secondaries)) return rows;

    secondaries.forEach((raw) => {
        if (!raw || typeof raw !== "object") return;
        const s = raw as Record<string, unknown>;
        const n = digitsGoalNumber(s.sdg_id);
        if (!n) return;
        rows.push({
            goalNumber: n,
            title: titleForGoal(n),
            targetId: String(s.target_id ?? "").trim(),
            indicatorId: String(s.indicator_id ?? "").trim(),
            source: "opportunity",
            role: "secondary",
        });
    });

    return rows;
}

/** Student Section 3 mapping (primary + optional secondaries). */
export function listStudentReportSdgs(section3: ReportData["section3"]): ReportSdgRow[] {
    const rows: ReportSdgRow[] = [];
    const primaryNum = digitsGoalNumber(section3?.primary_sdg?.goal_number);
    if (primaryNum) {
        rows.push({
            goalNumber: primaryNum,
            title: titleForGoal(primaryNum, section3.primary_sdg?.goal_title),
            targetId: String(section3.primary_sdg?.target_id ?? "").trim(),
            indicatorId: String(section3.primary_sdg?.indicator_id ?? "").trim(),
            source: "student",
            role: "primary",
        });
    }

    (section3?.secondary_sdgs || []).forEach((s) => {
        const n = digitsGoalNumber(s?.goal_number);
        if (!n) return;
        rows.push({
            goalNumber: n,
            title: titleForGoal(n),
            targetId: String(s.target_id ?? "").trim(),
            indicatorId: String(s.indicator_id ?? "").trim(),
            source: "student",
            role: "secondary",
            justification: String(s.justification_text ?? "").trim(),
        });
    });

    return rows;
}

/** Distinct goal numbers (opportunity ∪ student), sorted 1–17. */
export function uniqueMergedSdgGoalNumbers(projectData: unknown, section3: ReportData["section3"]): number[] {
    const set = new Set<number>();
    listOpportunityReportSdgs(projectData).forEach((r) => set.add(r.goalNumber));
    listStudentReportSdgs(section3).forEach((r) => set.add(r.goalNumber));
    return Array.from(set).sort((a, b) => a - b);
}

export function formatMergedSdgGoalsLabel(nums: number[]): string {
    if (!nums.length) return "—";
    return nums.map(formatSdgGoalPadded).join(", ");
}

/** Human-readable "Goal 4, Goal 5" for dashboard tiles. */
export function formatMergedSdgGoalsShort(nums: number[]): string {
    if (!nums.length) return "—";
    if (nums.length <= 3) return nums.map((n) => `Goal ${n}`).join(", ");
    const head = nums
        .slice(0, 2)
        .map((n) => `Goal ${n}`)
        .join(", ");
    return `${head} +${nums.length - 2}`;
}

export function mergedSdgTitlesLine(projectData: unknown, section3: ReportData["section3"]): string {
    const nums = uniqueMergedSdgGoalNumbers(projectData, section3);
    if (!nums.length) return "";
    const titleByNum = new Map<number, string>();
    listOpportunityReportSdgs(projectData).forEach((r) => titleByNum.set(r.goalNumber, r.title));
    listStudentReportSdgs(section3).forEach((r) => titleByNum.set(r.goalNumber, r.title));
    return nums
        .map((n) => titleByNum.get(n) || findSdgById(n)?.title || `SDG ${n}`)
        .join(" · ");
}
