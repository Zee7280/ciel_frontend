import type { ActiveProject } from "@/app/dashboard/student/types";

/**
 * CEP survey only after report is submitted AND payment proof has been submitted
 * (`payment_under_review` or cleared), matching dashboard `report_status`.
 * Omits draft / pending_payment / submitted-before-payment flows.
 */
export function studentEligibleForCepExperienceFeedback(projects: ActiveProject[]): boolean {
    return projects.some((p) => {
        const rs = (p.report_status ?? "").trim().toLowerCase();
        return (
            rs === "payment_under_review" ||
            rs === "paid" ||
            rs === "verified" ||
            rs === "finalized"
        );
    });
}
