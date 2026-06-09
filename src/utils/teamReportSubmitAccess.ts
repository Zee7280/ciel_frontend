import type { ReportData } from "@/app/dashboard/student/report/context/ReportContext";

/** Team projects: only the displayed team lead may finalize submission (backend enforces too). */
export function isTeamLeadForReportSubmit(data: Pick<ReportData, "section1">, userEmail?: string | null): boolean {
    if (data.section1?.participation_type !== "team") {
        return true;
    }

    const selfEmail = String(userEmail || "").trim().toLowerCase();
    const leadEmail = String(
        (data.section1?.team_lead as { email?: string } | undefined)?.email || "",
    )
        .trim()
        .toLowerCase();

    if (!selfEmail || !leadEmail) {
        return true;
    }

    return selfEmail === leadEmail;
}

export function canFinalizeReportSubmit(
    data: Pick<ReportData, "section1">,
    sectionsComplete: boolean,
    hoursEligible: boolean,
    userEmail?: string | null,
): boolean {
    return sectionsComplete && hoursEligible && isTeamLeadForReportSubmit(data, userEmail);
}
