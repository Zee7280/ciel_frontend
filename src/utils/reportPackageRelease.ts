import { isCommunityReportAdminSignedOff, type CommunityReviewRow } from "./reviewQueue";

/**
 * One rule for every stakeholder screen: nobody opens the Impact Package (flashcard, detailed
 * report, evidence) before CIEL PK Admin approves the report. The backend enforces the same rule
 * (faculty and partner/university reads answer 403 until then); this helper keeps list links,
 * monitor cards and queue cards honest so a reviewer is never sent to a locked screen.
 */
export const REPORT_PACKAGE_LOCK_TITLE = "Opens after CIEL PK approval";
export const REPORT_PACKAGE_LOCK_MESSAGE =
    "No one sees the Impact Package before CIEL PK Admin approves the report. Until then this screen shows the report's status only.";

export function isReportPackageReleased(row: CommunityReviewRow | null | undefined): boolean {
    return Boolean(row) && isCommunityReportAdminSignedOff(row as CommunityReviewRow);
}

/** The backend answers 403 for a package that is not released yet. */
export function isPackageLockedResponse(status: number | undefined | null): boolean {
    return status === 403;
}
