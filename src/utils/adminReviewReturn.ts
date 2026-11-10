/**
 * Where the Admin's "Back" goes from a report's verify page, package and AI analyser. Each list that
 * opens a report (the Student reports table, the Community Service "Reports for review" board)
 * records itself on mount; Back returns there instead of always to the table. Session-only, per tab,
 * and every access is guarded, so a blocked storage just falls back to the table.
 */

export const ADMIN_REVIEW_RETURN_KEY = "ciel.admin.reviewReturn";
export const ADMIN_REPORTS_TABLE_HREF = "/dashboard/admin/reports/verify";

/** Only in-app Admin list pages are accepted, never an outside or arbitrary URL. */
export function isAdminReviewReturnHref(href: unknown): href is string {
    if (typeof href !== "string") return false;
    if (!href.startsWith("/dashboard/admin/") || href.startsWith("//")) return false;
    // A report's own verify page is never a list to return to.
    return !/^\/dashboard\/admin\/reports\/verify\/[^/?#]+/.test(href);
}

export function rememberAdminReviewReturn(href: string): void {
    if (!isAdminReviewReturnHref(href)) return;
    try {
        window.sessionStorage.setItem(ADMIN_REVIEW_RETURN_KEY, href);
    } catch {
        /* storage blocked: Back falls back to the table */
    }
}

export function readAdminReviewReturn(): string {
    try {
        const stored = window.sessionStorage.getItem(ADMIN_REVIEW_RETURN_KEY);
        if (isAdminReviewReturnHref(stored)) return stored;
    } catch {
        /* storage blocked */
    }
    return ADMIN_REPORTS_TABLE_HREF;
}

export function adminReviewReturnLabel(href: string): string {
    return href.startsWith("/dashboard/admin/community-service") ? "Reports for review" : "Student reports";
}
