import type { ReportData } from "@/app/dashboard/student/report/context/ReportContext";

/** Prefer a team seat when the student also has a leftover individual row on the same project. */
export function pickPreferredEngagementSeat<T extends Record<string, unknown>>(
    rows: T[],
    projectId: string,
): T | null {
    const pid = String(projectId || "").trim();
    const matches = rows.filter((row) => {
        const id = String(row.projectId ?? row.project_id ?? "").trim();
        return Boolean(pid) && id === pid;
    });
    if (!matches.length) return null;
    const teamish = matches.filter((row) => {
        const mode = String(row.participationMode ?? row.participation_mode ?? "").toLowerCase();
        const teamId = String(row.teamId ?? row.team_id ?? "").trim();
        return mode === "team" || Boolean(teamId);
    });
    const pool = teamish.length ? teamish : matches;
    const lead = pool.find(
        (row) =>
            row.isTeamLead === true ||
            row.is_team_lead === true ||
            String(row.is_team_lead ?? "").toLowerCase() === "true",
    );
    return lead || pool[0] || null;
}

/** Team projects: only the canonical team lead may edit/submit (backend enforces too). */
export function isTeamLeadForReportSubmit(
    data: Pick<ReportData, "section1">,
    userEmail?: string | null,
    myParticipationIsTeamLead?: boolean | null,
): boolean {
    if (data.section1?.participation_type !== "team") {
        return true;
    }

    if (myParticipationIsTeamLead === true) {
        return true;
    }
    if (myParticipationIsTeamLead === false) {
        return false;
    }

    const selfEmail = String(userEmail || "").trim().toLowerCase();
    const leadEmail = String(
        (data.section1?.team_lead as { email?: string } | undefined)?.email || "",
    )
        .trim()
        .toLowerCase();

    if (selfEmail && leadEmail) {
        return selfEmail === leadEmail;
    }

    return false;
}

/** Stable team-member role (stays true even when report is read-only). */
export function isTeamMemberRole(
    data: Pick<ReportData, "section1">,
    userEmail?: string | null,
    myParticipationIsTeamLead?: boolean | null,
): boolean {
    if (data.section1?.participation_type !== "team") {
        return false;
    }
    return !isTeamLeadForReportSubmit(data, userEmail, myParticipationIsTeamLead);
}

/** Teammate: Section 1 attendance only; no draft save / submit on sections 2–11. */
export function isTeamMemberAttendanceOnlyMode(
    data: Pick<ReportData, "section1">,
    userEmail?: string | null,
    myParticipationIsTeamLead?: boolean | null,
): boolean {
    if (myParticipationIsTeamLead === false) {
        return true;
    }
    return isTeamMemberRole(data, userEmail, myParticipationIsTeamLead);
}

export function canFinalizeReportSubmit(
    data: Pick<ReportData, "section1">,
    sectionsComplete: boolean,
    hoursEligible: boolean,
    userEmail?: string | null,
): boolean {
    return sectionsComplete && hoursEligible && isTeamLeadForReportSubmit(data, userEmail);
}
