/**
 * Shared report lifecycle helpers — keep in sync with `StudentReportsService` in ciel_backend:
 * reject → status `revision`, admin_status `partner_status` may be `rejected`.
 */

export type ReportRevisionFields = {
    status?: string | null;
    report_status?: string | null;
    admin_status?: string | null;
    admin_approval_status?: string | null;
    partner_status?: string | null;
    faculty_status?: string | null;
};

export function normalizeReportLifecycleToken(value: string | null | undefined): string {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");
}

function isFacultyRevisionRequested(value: string): boolean {
    return value === "revision_requested" || value === "revisions_requested" || value === "changes_requested" || value.includes("revision");
}

/** True when the student should revise (editable). Faculty reject ends the process. */
export function isReportReturnedForRevision(report: ReportRevisionFields | null | undefined): boolean {
    if (!report) return false;
    const st = normalizeReportLifecycleToken(report.status ?? report.report_status);
    const adm = normalizeReportLifecycleToken(report.admin_status ?? report.admin_approval_status);
    const partner = normalizeReportLifecycleToken(report.partner_status);
    const fac = normalizeReportLifecycleToken(report.faculty_status);
    if (isFacultyRevisionRequested(fac) || st === "revision") return true;
    if (fac === "rejected" || st === "rejected") return false;
    return adm === "rejected" || partner === "rejected";
}

/** Display label for admin/partner dossier badges. */
export function reportRevisionStatusLabel(report: ReportRevisionFields): string {
    if (isReportReturnedForRevision(report)) return "Revision required";
    const st = normalizeReportLifecycleToken(report.status);
    if (st === "partner_verified") return "NGO Verified";
    return report.status || "—";
}
