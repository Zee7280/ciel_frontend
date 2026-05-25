import type { ReportData } from "@/app/dashboard/student/report/context/ReportContext";

function norm(value: unknown): string {
    return String(value ?? "").trim().toLowerCase();
}

function isApprovedishStatus(value: unknown): boolean {
    const s = norm(value);
    return s === "verified" || s === "approved" || s === "finalized";
}

/**
 * Whether we show the institutional “verified” band + QR in UI (Section 11, certificate, dossier print).
 * Kept in sync with student report gates (`ciiVerifiedSummaryLock`, admin verify actions).
 *
 * Backend payloads vary: some set `admin_status`, others `admin_approval_status` or top-level `status: approved`.
 */
export function isInstitutionallyVerifiedReport(data: Partial<ReportData>): boolean {
    const row = data as Partial<ReportData> & { reportStatus?: string; adminStatus?: string; adminApprovalStatus?: string };

    const reportSt = norm(data.status ?? row.reportStatus);
    const reportRs = norm(data.report_status);
    const adminSt = norm(data.admin_status ?? row.adminStatus);
    const adminApproval = norm(data.admin_approval_status ?? row.adminApprovalStatus);

    return (
        isApprovedishStatus(adminSt) ||
        isApprovedishStatus(adminApproval) ||
        isApprovedishStatus(reportSt) ||
        isApprovedishStatus(reportRs)
    );
}

/** Dossier summary chip — same institutional gate as QR / verified band. */
export function getReportReadinessLabel(data: Partial<ReportData>): "Ready" | "Pending" {
    return isInstitutionallyVerifiedReport(data) ? "Ready" : "Pending";
}
