import type { ReportData } from "@/app/dashboard/student/report/context/ReportContext";

/**
 * Whether we show the institutional “verified” band + QR in UI (Section 11, certificate, dossier print).
 * Kept in sync with the Section 11 “Report Approved & Impact Verified” card so a visible success state
 * is not missing a QR when `impact_verify_url` is present.
 *
 * Public `GET …/public/impact-reports/:key/verification` may still return `verified: false` for some
 * edge statuses until payment/finalization — backend should only issue `impact_verify_url` when ready.
 */
export function isInstitutionallyVerifiedReport(
    data: Pick<ReportData, "status" | "admin_status">,
): boolean {
    const reportSt = String(data.status || "").toLowerCase();
    const adminSt = String(data.admin_status || "").toLowerCase();
    return (
        adminSt === "verified" ||
        adminSt === "approved" ||
        reportSt === "approved" ||
        reportSt === "verified" ||
        reportSt === "paid" ||
        reportSt === "finalized"
    );
}
