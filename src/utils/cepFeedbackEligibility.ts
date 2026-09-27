import type { ActiveProject } from "@/app/dashboard/student/types";

/**
 * CEP survey after the student has submitted a report that is no longer on the
 * private-candidate fee hold. University submit is `submitted` (fee paused);
 * private candidates reach this after payment proof (`payment_under_review`+).
 */
export function studentEligibleForCepExperienceFeedback(projects: ActiveProject[]): boolean {
    return projects.some((p) => {
        const rs = (p.report_status ?? "").trim().toLowerCase();
        return (
            rs === "submitted" ||
            rs === "payment_under_review" ||
            rs === "paid" ||
            rs === "verified" ||
            rs === "finalized"
        );
    });
}
