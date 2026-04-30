import type { ReportData } from "../context/ReportContext";
import { findSdgById } from "@/utils/sdgData";

function digitsGoalNumber(v: unknown): number | null {
    if (typeof v === "number" && Number.isFinite(v)) {
        const n = Math.trunc(v);
        if (n >= 1 && n <= 17) return n;
    }

    const raw = String(v ?? "").trim();
    if (!raw) return null;

    const exactDigits = raw.match(/^\D*([0-9]{1,2})\D*$/);
    if (exactDigits?.[1]) {
        const n = parseInt(exactDigits[1], 10);
        if (Number.isFinite(n) && n >= 1 && n <= 17) return n;
    }

    const firstGoalLike = raw.match(/\b(1[0-7]|[1-9])\b/);
    if (!firstGoalLike?.[1]) return null;
    const n = parseInt(firstGoalLike[1], 10);
    if (!Number.isFinite(n) || n < 1 || n > 17) return null;
    return n;
}

function objectRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
}

function firstArray(...values: unknown[]): unknown[] {
    for (const value of values) {
        if (Array.isArray(value)) return value;
        if (objectRecord(value)) return [value];
        if (typeof value === "string") {
            const trimmed = value.trim();
            if (!trimmed) continue;
            const parts = trimmed
                .split(/[,\|;/]+/)
                .map((s) => s.trim())
                .filter(Boolean);
            if (parts.length > 1) return parts;
            return [trimmed];
        }
        if (value !== undefined && value !== null && String(value).trim() !== "") return [value];
    }
    return [];
}

function firstValue(record: Record<string, unknown>, keys: string[]): unknown {
    for (const key of keys) {
        const value = record[key];
        if (value !== undefined && value !== null && String(value).trim() !== "") return value;
    }
    return undefined;
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

    const info = objectRecord(p.sdg_info) ?? objectRecord(p.sdgInfo) ?? {};
    const primaryNum = digitsGoalNumber(
        firstValue(info, ["sdg_id", "sdgId", "goal_number", "goalNumber", "id"]) ?? p.sdg,
    );
    if (primaryNum) {
        rows.push({
            goalNumber: primaryNum,
            title: titleForGoal(primaryNum),
            targetId: String(firstValue(info, ["target_id", "targetId", "target"]) ?? "").trim(),
            indicatorId: String(firstValue(info, ["indicator_id", "indicatorId", "indicator"]) ?? "").trim(),
            source: "opportunity",
            role: "primary",
        });
    }

    const secondaries = firstArray(
        p.secondary_sdgs,
        p.secondarySdgs,
        p.secondary_sdg,
        p.secondarySdg,
        info.secondary_sdgs,
        info.secondarySdgs,
    );

    secondaries.forEach((raw) => {
        const s = objectRecord(raw);
        const n = digitsGoalNumber(
            s ? firstValue(s, ["sdg_id", "sdgId", "goal_number", "goalNumber", "sdg", "id"]) : raw,
        );
        if (!n) return;
        rows.push({
            goalNumber: n,
            title: titleForGoal(n),
            targetId: String(s ? firstValue(s, ["target_id", "targetId", "target"]) : "").trim(),
            indicatorId: String(s ? firstValue(s, ["indicator_id", "indicatorId", "indicator"]) : "").trim(),
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

/** Extra goal indices sometimes persisted alongside primary/secondary (API alias fields). */
function collectLooseGoalNumbersFromSection3(section3: ReportData["section3"] | undefined): number[] {
    if (!section3) return [];
    const loose = section3 as unknown as Record<string, unknown>;
    const out: number[] = [];
    for (const key of ["sdg_alignment", "aligned_sdgs", "sdgs"] as const) {
        const raw = loose[key];
        if (raw == null) continue;
        const pushN = (v: unknown) => {
            const n =
                typeof v === "object" && v !== null
                    ? digitsGoalNumber(
                          firstValue(v as Record<string, unknown>, [
                              "goal_number",
                              "goalNumber",
                              "sdg_id",
                              "sdgId",
                              "sdg",
                              "id",
                          ]),
                      )
                    : digitsGoalNumber(v);
            if (n) out.push(n);
        };
        if (Array.isArray(raw)) {
            raw.forEach(pushN);
        } else {
            pushN(raw);
        }
    }
    return out;
}

/** Distinct goal numbers (opportunity ∪ student ∪ loose section3 fields), sorted 1–17. */
export function uniqueMergedSdgGoalNumbers(projectData: unknown, section3: ReportData["section3"]): number[] {
    const set = new Set<number>();
    listOpportunityReportSdgs(projectData).forEach((r) => set.add(r.goalNumber));
    listStudentReportSdgs(section3).forEach((r) => set.add(r.goalNumber));
    collectLooseGoalNumbersFromSection3(section3).forEach((n) => set.add(n));
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
