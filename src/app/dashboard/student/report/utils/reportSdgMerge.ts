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

    const firstGoalLike = raw.match(/\b0?(1[0-7]|[1-9])\b/);
    if (!firstGoalLike?.[1]) return null;
    const n = parseInt(firstGoalLike[1], 10);
    if (!Number.isFinite(n) || n < 1 || n > 17) return null;
    return n;
}

const GOAL_NUMBER_KEYS = [
    "goal_number",
    "goalNumber",
    "goal_no",
    "goalNo",
    "goal",
    "sdg_id",
    "sdgId",
    "sdg",
    "sdg_number",
    "sdgNumber",
    "sdg_goal",
    "sdgGoal",
    "number",
    "id",
    "value",
    "label",
] as const;

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
            if (trimmed.startsWith("[")) {
                try {
                    const parsed = JSON.parse(trimmed) as unknown;
                    const parsedRows = firstArray(parsed);
                    if (parsedRows.length) return parsedRows;
                } catch {
                    /* ignore non-JSON list strings */
                }
            }
            const parts = trimmed
                .split(/[,\|;/]+|\s+and\s+/i)
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

function goalNumberFromRecord(record: Record<string, unknown> | null | undefined): number | null {
    if (!record) return null;
    for (const key of GOAL_NUMBER_KEYS) {
        const n = digitsGoalNumber(record[key]);
        if (n) return n;
    }
    return null;
}

function nestedRecords(record: Record<string, unknown>, keys: string[]): Record<string, unknown>[] {
    return keys
        .map((key) => objectRecord(record[key]))
        .filter((value): value is Record<string, unknown> => Boolean(value));
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

    const payloads = [
        p,
        ...nestedRecords(p, ["opportunity", "project", "projectData", "opportunity_details", "opportunityDetails"]),
    ];

    payloads.forEach((payload) => {
        const info = objectRecord(payload.sdg_info) ?? objectRecord(payload.sdgInfo) ?? {};
        const primaryObj = objectRecord(payload.primary_sdg) ?? objectRecord(payload.primarySdg);
        const primaryNum =
            goalNumberFromRecord(info) ??
            goalNumberFromRecord(primaryObj) ??
            digitsGoalNumber(firstValue(payload, ["sdg", "sdg_id", "sdgId", "goal_number", "goalNumber"])) ??
            digitsGoalNumber(firstValue(payload, ["primary_sdg", "primarySdg"]));
        if (primaryNum) {
            rows.push({
                goalNumber: primaryNum,
                title: titleForGoal(primaryNum, String(primaryObj?.goal_title ?? primaryObj?.title ?? "").trim() || null),
                targetId: String(
                    firstValue(info, ["target_id", "targetId", "target"]) ??
                        (primaryObj ? firstValue(primaryObj, ["target_id", "targetId", "target"]) : undefined) ??
                        firstValue(payload, ["target_id", "targetId", "target"]) ??
                        "",
                ).trim(),
                indicatorId: String(
                    firstValue(info, ["indicator_id", "indicatorId", "indicator"]) ??
                        (primaryObj ? firstValue(primaryObj, ["indicator_id", "indicatorId", "indicator"]) : undefined) ??
                        firstValue(payload, ["indicator_id", "indicatorId", "indicator"]) ??
                        "",
                ).trim(),
                source: "opportunity",
                role: "primary",
            });
        }

        const secondaries = firstArray(
            payload.secondary_sdgs,
            payload.secondarySdgs,
            payload.secondary_sdg,
            payload.secondarySdg,
            payload.secondary_sdg_id,
            payload.secondarySdgId,
            payload.secondary_sdg_ids,
            payload.secondarySdgIds,
            info.secondary_sdgs,
            info.secondarySdgs,
            info.secondary_sdg,
            info.secondarySdg,
            info.secondary_sdg_id,
            info.secondarySdgId,
            info.secondary_sdg_ids,
            info.secondarySdgIds,
        );

        secondaries.forEach((raw) => {
            const s = objectRecord(raw);
            const n = s ? goalNumberFromRecord(s) : digitsGoalNumber(raw);
            if (!n) return;
            rows.push({
                goalNumber: n,
                title: titleForGoal(n, String(s?.goal_title ?? s?.title ?? "").trim() || null),
                targetId: String(
                    (s ? firstValue(s, ["target_id", "targetId", "target"]) : undefined) ??
                        firstValue(payload, ["secondary_target", "secondaryTarget", "secondary_target_id", "secondaryTargetId"]) ??
                        firstValue(info, ["secondary_target", "secondaryTarget", "secondary_target_id", "secondaryTargetId"]) ??
                        "",
                ).trim(),
                indicatorId: String(
                    (s ? firstValue(s, ["indicator_id", "indicatorId", "indicator"]) : undefined) ??
                        firstValue(payload, ["secondary_indicator", "secondaryIndicator", "secondary_indicator_id", "secondaryIndicatorId"]) ??
                        firstValue(info, ["secondary_indicator", "secondaryIndicator", "secondary_indicator_id", "secondaryIndicatorId"]) ??
                        "",
                ).trim(),
                source: "opportunity",
                role: "secondary",
                justification: String(s ? firstValue(s, ["justification_text", "justification"]) ?? "" : "").trim(),
            });
        });

        firstArray(
            payload.sdgs,
            payload.sdgIds,
            payload.sdg_ids,
            payload.sdg_alignment,
            payload.sdgAlignment,
            payload.aligned_sdgs,
            payload.alignedSdgs,
        ).forEach((raw) => {
            const s = objectRecord(raw);
            const n = s ? goalNumberFromRecord(s) : digitsGoalNumber(raw);
            if (!n) return;
            rows.push({
                goalNumber: n,
                title: titleForGoal(n, String(s?.goal_title ?? s?.title ?? "").trim() || null),
                targetId: String(s ? firstValue(s, ["target_id", "targetId", "target"]) : "").trim(),
                indicatorId: String(s ? firstValue(s, ["indicator_id", "indicatorId", "indicator"]) : "").trim(),
                source: "opportunity",
                role: "secondary",
                justification: String(s ? firstValue(s, ["justification_text", "justification"]) ?? "" : "").trim(),
            });
        });
    });

    return rows;
}

/** Student Section 3 mapping (primary + optional secondaries). */
export function listStudentReportSdgs(section3: ReportData["section3"]): ReportSdgRow[] {
    const rows: ReportSdgRow[] = [];
    const primary = objectRecord(section3?.primary_sdg);
    const primaryNum = goalNumberFromRecord(primary);
    if (primaryNum) {
        rows.push({
            goalNumber: primaryNum,
            title: titleForGoal(primaryNum, String(primary?.goal_title ?? primary?.title ?? "").trim() || null),
            targetId: String(primary ? firstValue(primary, ["target_id", "targetId", "target"]) ?? "" : "").trim(),
            indicatorId: String(primary ? firstValue(primary, ["indicator_id", "indicatorId", "indicator"]) ?? "" : "").trim(),
            source: "student",
            role: "primary",
        });
    }

    (section3?.secondary_sdgs || []).forEach((raw) => {
        const s = objectRecord(raw);
        const n = s ? goalNumberFromRecord(s) : digitsGoalNumber(raw?.goal_number);
        if (!n) return;
        rows.push({
            goalNumber: n,
            title: titleForGoal(n, String(s?.goal_title ?? s?.title ?? "").trim() || null),
            targetId: String(s ? firstValue(s, ["target_id", "targetId", "target"]) : raw.target_id ?? "").trim(),
            indicatorId: String(s ? firstValue(s, ["indicator_id", "indicatorId", "indicator"]) : raw.indicator_id ?? "").trim(),
            source: "student",
            role: "secondary",
            justification: String(s ? firstValue(s, ["justification_text", "justification"]) ?? "" : raw.justification_text ?? "").trim(),
        });
    });

    return rows;
}

/** Extra goal indices sometimes persisted alongside primary/secondary (API alias fields). */
function collectLooseGoalNumbersFromSection3(section3: ReportData["section3"] | undefined): number[] {
    if (!section3) return [];
    const loose = section3 as unknown as Record<string, unknown>;
    const out: number[] = [];
    for (const key of ["sdg_alignment", "sdgAlignment", "aligned_sdgs", "alignedSdgs", "sdgs", "sdg_ids", "sdgIds"] as const) {
        const raw = loose[key];
        if (raw == null) continue;
        const pushN = (v: unknown) => {
            const n = typeof v === "object" && v !== null ? goalNumberFromRecord(v as Record<string, unknown>) : digitsGoalNumber(v);
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

/**
 * Ordered rows for read-only snapshots (Section 6, etc.): union of opportunity + student mappings,
 * plus loose goal numbers. Student row wins when the same goal appears on both sides.
 */
export function mergeReportSdgSnapshotRows(
    projectData: unknown,
    section3: ReportData["section3"],
): ReportSdgRow[] {
    const nums = uniqueMergedSdgGoalNumbers(projectData, section3);
    if (!nums.length) return [];

    const oppByGoal = new Map<number, ReportSdgRow>(
        listOpportunityReportSdgs(projectData).map((r) => [r.goalNumber, r]),
    );
    const studByGoal = new Map<number, ReportSdgRow>(
        listStudentReportSdgs(section3).map((r) => [r.goalNumber, r]),
    );

    return nums.map((n) => {
        const stud = studByGoal.get(n);
        const opp = oppByGoal.get(n);
        if (stud) return stud;
        if (opp) return opp;
        return {
            goalNumber: n,
            title: titleForGoal(n),
            targetId: "",
            indicatorId: "",
            source: "student",
            role: "primary",
        };
    });
}

/** Labels for snapshot UI: goals like "SDG 8, SDG 10"; targets/indicators from merged rows. */
export function formatMergedSdgGoalsSnapshotLabels(rows: ReportSdgRow[]): {
    goalsLine: string;
    targetsLine: string;
} {
    if (!rows.length) {
        return { goalsLine: "—", targetsLine: "—" };
    }
    const goalsLine = rows.map((r) => `SDG ${r.goalNumber}`).join(", ");
    const parts = rows
        .map((r) => {
            const t = r.targetId?.trim();
            const i = r.indicatorId?.trim();
            if (t && i) return `${t} (${i})`;
            if (t) return t;
            if (i) return i;
            return "";
        })
        .filter(Boolean);
    const targetsLine = parts.length ? [...new Set(parts)].join(", ") : "—";
    return { goalsLine, targetsLine };
}
