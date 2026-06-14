import type { ReportData } from "@/app/dashboard/student/report/context/ReportContext";

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

    // Fail closed for team projects when lead identity is unclear.
    return false;
}

/** Teammate: attendance in Section 1 only; sections 2–10 read-only; no submit. */
export function isTeamMemberAttendanceOnlyMode(
    data: Pick<ReportData, "section1">,
    userEmail?: string | null,
    myParticipationIsTeamLead?: boolean | null,
    reportLocked?: boolean,
): boolean {
    if (reportLocked) {
        return false;
    }
    if (data.section1?.participation_type !== "team") {
        return false;
    }
    return !isTeamLeadForReportSubmit(data, userEmail, myParticipationIsTeamLead);
}

export function canFinalizeReportSubmit(
    data: Pick<ReportData, "section1">,
    sectionsComplete: boolean,
    hoursEligible: boolean,
    userEmail?: string | null,
): boolean {
    return sectionsComplete && hoursEligible && isTeamLeadForReportSubmit(data, userEmail);
}
