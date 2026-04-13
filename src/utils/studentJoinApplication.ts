/**
 * Student join-application pipeline (browse apply → faculty → admin → report).
 * Backend exposes application_status, application_stage, application_id; legacy pending/applied still supported.
 */

function lower(v: unknown): string {
    if (v == null) return "";
    return String(v).trim().toLowerCase();
}

/** Canonical join application status from API (snake or camel). */
export function pickJoinApplicationStatus(raw: Record<string, unknown>): string {
    const s = raw.application_status ?? raw.applicationStatus;
    return lower(s);
}

export function pickJoinApplicationId(raw: Record<string, unknown>): string {
    for (const k of ["application_id", "applicationId"]) {
        const v = raw[k];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
}

export type JoinApplicationStage = "faculty" | "admin";

export function pickJoinApplicationStage(raw: Record<string, unknown>): JoinApplicationStage | null {
    const s = lower(raw.application_stage ?? raw.applicationStage);
    if (s === "faculty") return "faculty";
    if (s === "admin") return "admin";
    return null;
}

export function mergeHasAppliedFields(raw: Record<string, unknown>): boolean {
    if (raw.has_applied === true || raw.hasApplied === true) return true;
    const st = pickJoinApplicationStatus(raw);
    if (st) return true;
    if (lower(raw.status) === "applied") return true;
    return false;
}

export function isJoinApplicationPendingStatus(status: string): boolean {
    return ["pending_approval", "pending", "applied"].includes(status);
}

export function isJoinApplicationApprovedStatus(status: string): boolean {
    return status === "approved" || status === "verified";
}

export function isJoinApplicationRejectedStatus(status: string): boolean {
    return ["rejected", "not_approved", "denied", "declined", "faculty_rejected", "admin_rejected"].includes(status);
}

/**
 * When true, the student must not submit another join-application (pending pipeline or approved).
 * When false but {@link mergeHasAppliedFields} is true, the last application was rejected — UI may offer "Apply again".
 */
export function joinApplicationLocksApplyButton(raw: Record<string, unknown>): boolean {
    const merged = mergeHasAppliedFields(raw);
    if (!merged) return false;
    const st = pickJoinApplicationStatus(raw);
    if (isJoinApplicationRejectedStatus(st)) return false;
    return true;
}

/**
 * Apply join-pipeline rules only when API sent an explicit application_status
 * (avoids treating student-owned listings on detail page as join rows).
 */
export function shouldApplyJoinApplicationRules(raw: Record<string, unknown>, opts?: { isStudentOwner?: boolean }): boolean {
    if (opts?.isStudentOwner) return false;
    return Boolean(pickJoinApplicationStatus(raw));
}

/** Browse / detail: show Start Report when join is cleared and status allows. */
export function canStudentShowStartReportCta(
    raw: Record<string, unknown>,
    opts?: { isStudentOwner?: boolean },
): boolean {
    if (opts?.isStudentOwner) {
        const st = lower(raw.status);
        return ["active", "completed"].includes(st);
    }
    const app = pickJoinApplicationStatus(raw);
    if (!app) {
        const st = lower(raw.status);
        return ["active", "completed"].includes(st);
    }
    if (isJoinApplicationRejectedStatus(app)) return false;
    if (isJoinApplicationPendingStatus(app)) return false;
    if (isJoinApplicationApprovedStatus(app)) {
        const st = lower(raw.status);
        return ["active", "completed", "approved", "verified"].includes(st);
    }
    return ["active", "completed", "approved", "verified"].includes(lower(raw.status));
}

/** Short badge line for pending join (faculty vs admin queue). */
export function joinApplicationPendingLabel(raw: Record<string, unknown>): string {
    const stage = pickJoinApplicationStage(raw);
    if (stage === "faculty") return "Pending faculty review";
    if (stage === "admin") return "Pending CIEL admin review";
    return "Pending approval";
}

/** Report page / project fetch: allow access only when project status allowlisted and join not blocking. */
export function canStudentAccessReportForProjectPayload(raw: Record<string, unknown>): boolean {
    const status = lower(raw.status);
    const allowedStatuses = ["active", "completed", "approved", "verified"];
    if (!allowedStatuses.includes(status)) return false;

    const app = pickJoinApplicationStatus(raw);
    if (!app) return true;
    if (isJoinApplicationApprovedStatus(app)) return true;
    if (isJoinApplicationRejectedStatus(app)) return false;
    if (isJoinApplicationPendingStatus(app)) return false;
    return true;
}
