import { isReportReturnedForRevision } from "./reportRevisionState";

/**
 * How the admin Report Verification list classifies a report. Keep in step with the queue counts
 * the backend sends (`StudentReportsService.findAll` → meta.counts) — both follow the same rules:
 *   - closed        → history: never "Verified", never "Needs review" (listed under All only);
 *   - sent back / rejected → "Revision / rejected";
 *   - admin approved / verified / paid → "Verified";
 *   - any other submitted report → "Needs review".
 */
export type QueueReportFields = {
    status?: string | null;
    admin_status?: string | null;
    partner_status?: string | null;
    faculty_status?: string | null;
};

export type ReportQueueTab = "all" | "submitted" | "pending" | "verified" | "rejected";
export type QueueCounts = { needsReview: number; verified: number; revision: number; all: number };

const norm = (value: string | null | undefined): string =>
    String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");

const overall = (r: QueueReportFields) => norm(r.status);

/** CIEL PK retracted a published report. It keeps admin_status=approved on record but is no longer live. */
export function isReportClosed(r: QueueReportFields): boolean {
    return overall(r) === "closed";
}

/** Permanently rejected (legacy faculty reject): ends the process, the student cannot revise it. */
export function isReportTerminallyRejected(r: QueueReportFields): boolean {
    if (isReportReturnedForRevision(r)) return false;
    return overall(r) === "rejected" || norm(r.faculty_status) === "rejected";
}

export function isReportAdminVerified(r: QueueReportFields): boolean {
    if (isReportClosed(r)) return false;
    const st = overall(r);
    // partner_verified means the NGO signed off; the admin still has to approve it.
    return norm(r.admin_status) === "approved" || st === "verified" || st === "paid";
}

/** Key for the "Overall" badge: the real lifecycle state, not the raw column (which can lag behind). */
export function reportBadgeKey(r: QueueReportFields): string {
    if (isReportClosed(r)) return "closed";
    if (isReportReturnedForRevision(r)) return "revision";
    return overall(r);
}

/** Overall status tab — uses lifecycle fields only (NGO has its own filter). */
export function reportMatchesTab(r: QueueReportFields, tab: ReportQueueTab): boolean {
    if (tab === "all") return true;
    // A retracted report is history: it belongs to "All reports" only.
    if (isReportClosed(r)) return false;
    if (isReportReturnedForRevision(r) || isReportTerminallyRejected(r)) return tab === "rejected";

    const st = overall(r);
    if (tab === "verified") return isReportAdminVerified(r);
    if (tab === "rejected") return false;
    if (tab === "submitted") return st === "submitted" || st.includes("under_review");
    if (tab === "pending") {
        // Needs review = anything submitted whose admin decision is not "approved" yet
        // (includes partner_verified reports and reports waiting on the reporting fee).
        if (isReportAdminVerified(r)) return false;
        return !(st === "draft" || st === "" || st === "continue");
    }
    return true;
}

export function countReportQueues(reports: QueueReportFields[]): QueueCounts {
    let needsReview = 0;
    let verified = 0;
    let revision = 0;
    for (const r of reports) {
        if (isReportClosed(r)) continue;
        if (isReportReturnedForRevision(r) || isReportTerminallyRejected(r)) revision += 1;
        else if (reportMatchesTab(r, "verified")) verified += 1;
        else if (reportMatchesTab(r, "pending")) needsReview += 1;
    }
    return { needsReview, verified, revision, all: reports.length };
}
