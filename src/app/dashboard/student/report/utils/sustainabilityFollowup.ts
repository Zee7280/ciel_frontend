/**
 * Section 10 (Sustainability) — 9.5 "Follow-up check".
 *
 * Stored inside the existing `section10` JSON (no new table / column):
 *   followup_plan             '' | 'yes' | 'no' | 'later'   ('' = not answered)
 *   followup_no_reason        one of FOLLOWUP_NO_REASONS      (plan = no)
 *   followup_no_reason_other  free text when reason is "Other"
 *   followup_decision_owner   'faculty' | 'coordinator' | 'admin'   (plan = later)
 *   followup_owner_role / followup_owner_name / followup_owner_email  (plan = yes)
 *   followup_interval         '1' | '3' | '6' | '12' (months after project end) | 'custom'
 *   followup_custom_date      yyyy-mm-dd, used when interval = 'custom'
 *   followup_due_date         yyyy-mm-dd, computed from the opportunity end date + interval
 *   followup_check            what should be checked (one of FOLLOWUP_CHECKS)
 *   followup_check_notes      optional specific instruction
 *
 * This only RECORDS the arrangement. Nothing here emails anyone; a nominated contact is only
 * approached after the report is approved (a separate, later workflow).
 *
 * Reports saved before 9.5 existed have none of these keys; every helper treats a missing value as
 * "not answered" so those drafts and submitted reports stay valid and unchanged.
 *
 * Keep ids/values in sync with ciel_backend/src/reports/report-submit-validation.util.ts.
 */

export type FollowupPlan = "yes" | "no" | "later";

export const FOLLOWUP_PLAN_OPTIONS: ReadonlyArray<{ id: FollowupPlan; label: string }> = [
    { id: "yes", label: "Yes" },
    { id: "no", label: "No" },
    { id: "later", label: "Not decided yet" },
];

export const FOLLOWUP_OTHER = "Other";

export const FOLLOWUP_NO_REASONS: ReadonlyArray<string> = [
    "One-time service completed; no ongoing result to check",
    "Partner has its own monitoring process",
    "Follow-up is not feasible",
    FOLLOWUP_OTHER,
];

export const FOLLOWUP_DECISION_OWNERS: ReadonlyArray<{ value: string; label: string }> = [
    { value: "faculty", label: "Assigned faculty supervisor (from opportunity)" },
    { value: "coordinator", label: "University community engagement coordinator" },
    { value: "admin", label: "CIEL PK Admin" },
];

export const FOLLOWUP_OWNER_ROLES: ReadonlyArray<string> = [
    "Partner / NGO representative",
    "Faculty supervisor",
    "School / host representative",
    "Student team lead",
    "University coordinator",
    FOLLOWUP_OTHER,
];

export const FOLLOWUP_INTERVALS: ReadonlyArray<{ value: string; label: string; months?: number }> = [
    { value: "1", label: "1 month after project end", months: 1 },
    { value: "3", label: "3 months after project end", months: 3 },
    { value: "6", label: "6 months after project end", months: 6 },
    { value: "12", label: "12 months after project end", months: 12 },
    { value: "custom", label: "Choose a date" },
];

export const FOLLOWUP_DEFAULT_INTERVAL = "3";

export const FOLLOWUP_CHECKS: ReadonlyArray<string> = [
    "Whether the reported benefits are still continuing",
    "Condition / use of items or facilities provided",
    "Survival / maintenance of planted trees",
    "Continuation of skills learned",
    "Updated outcomes or beneficiary results from Section 5",
    FOLLOWUP_OTHER,
];

export const FOLLOWUP_TEXT_LIMITS = { name: 120, email: 200, notes: 400, reason: 300 } as const;

export type FollowupShape = {
    followup_plan?: unknown;
    followup_no_reason?: unknown;
    followup_no_reason_other?: unknown;
    followup_decision_owner?: unknown;
    followup_owner_role?: unknown;
    followup_owner_name?: unknown;
    followup_owner_email?: unknown;
    followup_interval?: unknown;
    followup_custom_date?: unknown;
    followup_due_date?: unknown;
    followup_check?: unknown;
    followup_check_notes?: unknown;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function text(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function pad2(n: number): string {
    return String(n).padStart(2, "0");
}

function isRealDate(y: number, m: number, d: number): boolean {
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Any date-ish value (yyyy-mm-dd, full ISO timestamp, Date string) → yyyy-mm-dd, or "" when unusable. */
export function normalizeIsoDate(value: unknown): string {
    const raw = text(value);
    if (!raw) return "";
    const head = ISO_DATE_RE.exec(raw.slice(0, 10));
    if (head) {
        return isRealDate(Number(head[1]), Number(head[2]), Number(head[3])) ? raw.slice(0, 10) : "";
    }
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return "";
    return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`;
}

/** Calendar-month arithmetic that clamps to the end of a shorter month (31 Jan + 1 month = 28/29 Feb). */
export function addMonthsIso(isoDate: string, months: number): string {
    const m = ISO_DATE_RE.exec(isoDate);
    if (!m || !Number.isFinite(months)) return "";
    const year = Number(m[1]);
    const monthIndex = Number(m[2]) - 1;
    const day = Number(m[3]);
    if (!isRealDate(year, monthIndex + 1, day)) return "";
    const target = new Date(Date.UTC(year, monthIndex + months, 1));
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    return `${target.getUTCFullYear()}-${pad2(target.getUTCMonth() + 1)}-${pad2(Math.min(day, lastDay))}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** The opportunity's end date, read the same way Section 2 reads the project dates. */
export function projectEndDateOf(projectData: unknown): string {
    const project = asRecord(projectData);
    const timeline = asRecord(project?.timeline);
    const candidates = [
        project?.end_date,
        project?.endDate,
        timeline?.end_date,
        timeline?.endDate,
    ];
    for (const candidate of candidates) {
        const iso = normalizeIsoDate(candidate);
        if (iso) return iso;
    }
    return "";
}

/** Due date for plan = yes: the picked calendar date, or project end + the chosen interval ("" when unknown). */
export function computeFollowupDueDate(block: FollowupShape | null | undefined, projectEndDate: string): string {
    if (!block) return "";
    const interval = text(block.followup_interval) || FOLLOWUP_DEFAULT_INTERVAL;
    if (interval === "custom") return normalizeIsoDate(block.followup_custom_date);
    const months = FOLLOWUP_INTERVALS.find((o) => o.value === interval)?.months;
    if (!months || !projectEndDate) return "";
    return addMonthsIso(projectEndDate, months);
}

export function followupPlanOf(block: FollowupShape | null | undefined): FollowupPlan | "" {
    const plan = text(block?.followup_plan);
    return plan === "yes" || plan === "no" || plan === "later" ? plan : "";
}

/** Status recorded at submit time. Later states (accepted / awaiting response / verified…) belong to the post-approval workflow. */
export function followupStatusLabel(block: FollowupShape | null | undefined): string {
    switch (followupPlanOf(block)) {
        case "yes":
            return "Planned — awaiting report approval";
        case "no":
            return "Not planned";
        case "later":
            return "Decision pending";
        default:
            return "";
    }
}

export function hasFollowupContent(block: FollowupShape | null | undefined): boolean {
    return followupPlanOf(block) !== "";
}

export function decisionOwnerLabel(value: unknown): string {
    const v = text(value) || "faculty";
    return FOLLOWUP_DECISION_OWNERS.find((o) => o.value === v)?.label ?? v;
}

export type FollowupRow = { label: string; value: string; fullWidth?: boolean };

/**
 * Read-only rows for admin / partner / print. Only fields relevant to the chosen plan are shown, so a
 * student who switched from "Yes" to "No" never leaks the stale contact. The contact's email is only
 * included when the viewer needs it (admin).
 */
export function followupSummaryRows(
    block: FollowupShape | null | undefined,
    opts: { includeEmail?: boolean } = {},
): FollowupRow[] {
    const plan = followupPlanOf(block);
    if (!block || !plan) return [];
    const rows: FollowupRow[] = [{ label: "Follow-up check", value: followupStatusLabel(block) }];
    if (plan === "no") {
        const reason = text(block.followup_no_reason);
        const other = text(block.followup_no_reason_other);
        rows.push({
            label: "Reason no follow-up is planned",
            value: reason === FOLLOWUP_OTHER && other ? `${reason} — ${other}` : reason,
            fullWidth: true,
        });
    } else if (plan === "later") {
        rows.push({ label: "Who decides on follow-up", value: decisionOwnerLabel(block.followup_decision_owner), fullWidth: true });
    } else {
        rows.push({ label: "Responsible role", value: text(block.followup_owner_role) });
        rows.push({ label: "Responsible person", value: text(block.followup_owner_name) });
        if (opts.includeEmail) rows.push({ label: "Follow-up contact email", value: text(block.followup_owner_email) });
        rows.push({ label: "Follow-up due", value: text(block.followup_due_date) });
        rows.push({ label: "What to check", value: text(block.followup_check), fullWidth: true });
        const notes = text(block.followup_check_notes);
        if (notes) rows.push({ label: "Specific instruction", value: notes, fullWidth: true });
    }
    return rows;
}

/**
 * Conditional rules, deliberately backward compatible:
 *  - no plan chosen (older report / not touched yet) → no errors, the block is optional;
 *  - "not decided yet" → no errors (a decision task is created after approval);
 *  - "no" → a reason is required (and a short text when the reason is "Other");
 *  - "yes" → responsible role, name, a valid email and a follow-up due date are required.
 */
export function followupBlockErrors(
    block: FollowupShape | null | undefined,
): Array<{ field: string; message: string }> {
    const errors: Array<{ field: string; message: string }> = [];
    const plan = followupPlanOf(block);
    if (!block || !plan) return errors;
    if (plan === "no") {
        const reason = text(block.followup_no_reason);
        if (!reason) {
            errors.push({ field: "followup_no_reason", message: "Select a brief reason for no follow-up" });
        } else if (reason === FOLLOWUP_OTHER && !text(block.followup_no_reason_other)) {
            errors.push({ field: "followup_no_reason_other", message: "Add a short explanation" });
        }
    } else if (plan === "yes") {
        if (!text(block.followup_owner_role)) {
            errors.push({ field: "followup_owner_role", message: "Choose who will check the results" });
        }
        if (!text(block.followup_owner_name)) {
            errors.push({ field: "followup_owner_name", message: "Enter the responsible person's name" });
        }
        const email = text(block.followup_owner_email);
        if (!email) {
            errors.push({ field: "followup_owner_email", message: "Enter an email for the follow-up invitation" });
        } else if (!EMAIL_RE.test(email)) {
            errors.push({ field: "followup_owner_email", message: "Enter a valid email address" });
        }
        if (!normalizeIsoDate(block.followup_due_date)) {
            errors.push({ field: "followup_due_date", message: "Choose when the results should be checked" });
        }
    }
    return errors;
}
