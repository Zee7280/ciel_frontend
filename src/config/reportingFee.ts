export const REPORTING_FEE_PKR = 200;

export function formatPkrAmount(amountPkr: number): string {
    return `${Math.round(amountPkr).toLocaleString("en-PK")} PKR`;
}

export const REPORTING_FEE_DISPLAY = formatPkrAmount(REPORTING_FEE_PKR);

function readPositiveHeadcount(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        const n = Math.floor(value);
        if (n >= 1) return n;
    }
    if (typeof value === "string" && value.trim()) {
        const n = parseInt(value.replace(/[^\d]/g, ""), 10);
        if (Number.isFinite(n) && n >= 1) return n;
    }
    return null;
}

/**
 * Report API merges `team_members` from participation rows — one element per billed student (includes team lead).
 * Draft Section 1 uses `team_members` as additional members only; headcount then is `members.length + 1` for team mode.
 */
function isParticipationShapedTeamRoster(members: unknown[]): boolean {
    if (!Array.isArray(members) || members.length === 0) return false;
    for (const m of members) {
        if (!m || typeof m !== "object") continue;
        const o = m as Record<string, unknown>;
        if ("isTeamLead" in o || "is_team_lead" in o) return true;
        if ("studentId" in o || "student_id" in o) return true;
    }
    return false;
}

function headcountFromTeamMembersList(participationType: string, membersRaw: unknown): number | null {
    if (!Array.isArray(membersRaw) || membersRaw.length === 0) return null;
    const len = membersRaw.length;
    const part = participationType.toLowerCase();
    if (part !== "team") return null;
    const fullRoster = isParticipationShapedTeamRoster(membersRaw);
    return fullRoster ? Math.max(1, len) : Math.max(1, len + 1);
}

/**
 * Billable student count for the reporting fee (fee per student × this number).
 * Prefers `team_size` / `teamSize` from the API; otherwise team lead + `team_members` / `teamMembers` length; else 1.
 */
export function resolveReportPaymentHeadcountFromProject(project: unknown): number {
    if (!project || typeof project !== "object") return 1;
    const p = project as Record<string, unknown>;

    const fromSize = readPositiveHeadcount(p.team_size ?? p.teamSize);
    if (fromSize != null) return fromSize;

    const membersRaw = p.team_members ?? p.teamMembers;
    const membersLen = Array.isArray(membersRaw) ? membersRaw.length : 0;

    const part = String(p.participation_type ?? p.participationType ?? "").toLowerCase();
    const fromList = headcountFromTeamMembersList(part, membersRaw);
    if (fromList != null) return fromList;
    if (membersLen > 0) return membersLen + 1;

    return 1;
}

export function computeReportingFeeTotalPkr(headcount: number): number {
    const n = Number.isFinite(headcount) && headcount >= 1 ? Math.floor(headcount) : 1;
    return REPORTING_FEE_PKR * n;
}

/** Roster size from saved report Section 1 (when project payload omits team fields). */
export function resolveReportPaymentHeadcountFromReport(report: unknown): number {
    if (!report || typeof report !== "object") return 1;
    const r = report as Record<string, unknown>;
    const s1raw = r.section1;
    if (!s1raw || typeof s1raw !== "object") return 1;
    const s1 = s1raw as Record<string, unknown>;

    const fromSize = readPositiveHeadcount(s1.team_size ?? s1.teamSize);
    if (fromSize != null) return fromSize;

    const membersRaw = s1.team_members ?? s1.teamMembers;
    const membersLen = Array.isArray(membersRaw) ? membersRaw.length : 0;
    const part = String(s1.participation_type ?? s1.participationType ?? "").toLowerCase();
    const fromList = headcountFromTeamMembersList(part, membersRaw);
    if (fromList != null) return fromList;
    if (membersLen > 0) return membersLen + 1;
    return 1;
}

/** Use the larger of project API vs report draft so team size is not missed after submit. */
export function resolveReportPaymentHeadcountMerged(project: unknown, report: unknown | null | undefined): number {
    const fromProject = resolveReportPaymentHeadcountFromProject(project);
    if (project && typeof project === "object") {
        const p = project as Record<string, unknown>;
        const part = String(p.participation_type ?? p.participationType ?? "").toLowerCase();
        const explicitSize = readPositiveHeadcount(p.team_size ?? p.teamSize);
        if (part === "individual") return 1;
        if (part === "team" && explicitSize != null) return explicitSize;
    }
    const fromReport = report ? resolveReportPaymentHeadcountFromReport(report) : 1;
    return Math.max(fromProject, fromReport);
}
