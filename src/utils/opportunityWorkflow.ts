/**
 * Student-owned opportunity lifecycle (CIEL): Faculty → Partner (optional) → Admin → LIVE → reporting.
 * Backend can set `workflow_stage` or granular *_approval_status fields; we fall back to `status`.
 */

export type OpportunityWorkflowStage =
    | "pending_faculty"
    | "pending_partner"
    | "pending_admin"
    | "live"
    | "rejected"
    | "revision"
    | "pending_unknown";

function lower(v: unknown): string {
    if (v == null) return "";
    return String(v).trim().toLowerCase();
}

function truthyApproved(v: unknown): boolean {
    const s = lower(v);
    return s === "approved" || s === "yes" || s === "true" || v === true;
}

/** True when admin has cleared the opportunity; student may start report / tracking. */
export function isStudentOpportunityLiveForReporting(project: Record<string, unknown>): boolean {
    const status = lower(project.status);
    if (["active", "live", "approved", "verified", "completed"].includes(status)) return true;
    const stage = lower(project.workflow_stage ?? project.approval_stage);
    if (stage === "live" || stage === "active" || stage === "approved") return true;
    if (truthyApproved(project.admin_approved)) return true;
    return false;
}

/**
 * Resolves UI copy for list/detail views. Extend mappings when API stabilizes.
 */
export function resolveStudentOpportunityWorkflow(project: Record<string, unknown>): {
    stage: OpportunityWorkflowStage;
    badgeLabel: string;
    queueMessage: string;
} {
    if (isStudentOpportunityLiveForReporting(project)) {
        const status = lower(project.status);
        if (status === "completed") {
            return {
                stage: "live",
                badgeLabel: "Completed",
                queueMessage: "This project is completed. You can still open your report or certificate from the actions.",
            };
        }
        return {
            stage: "live",
            badgeLabel: "Live",
            queueMessage: "Your opportunity is live. You can start or continue your report.",
        };
    }

    const stage = lower(project.workflow_stage ?? project.approval_stage);

    if (stage === "pending_faculty" || stage === "faculty_pending") {
        return {
            stage: "pending_faculty",
            badgeLabel: "Pending faculty approval",
            queueMessage: "Waiting for your faculty supervisor to approve. You will be notified when they respond.",
        };
    }
    if (stage === "pending_partner" || stage === "partner_pending") {
        return {
            stage: "pending_partner",
            badgeLabel: "Pending partner approval",
            queueMessage: "Waiting for the partner organization to confirm. You will be notified when they respond.",
        };
    }
    if (stage === "pending_admin" || stage === "admin_pending") {
        return {
            stage: "pending_admin",
            badgeLabel: "Pending admin approval",
            queueMessage: "Faculty/partner steps are done. CIEL Admin will give the final approval before the opportunity goes live.",
        };
    }
    if (stage === "rejected" || project.rejected === true || lower(project.status) === "rejected") {
        return {
            stage: "rejected",
            badgeLabel: "Rejected",
            queueMessage: "This opportunity was not approved. Check feedback from faculty, partner, or admin.",
        };
    }
    if (stage === "revision" || lower(project.status) === "revision" || lower(project.status) === "needs_revision") {
        return {
            stage: "revision",
            badgeLabel: "Revision requested",
            queueMessage: "Please update your opportunity based on the feedback and resubmit.",
        };
    }

    const fac = lower(project.faculty_approval_status);
    const part = lower(project.partner_approval_status);
    const needsPartner = project.requires_partner_approval === true || part === "pending" || part === "required";

    if (fac === "pending" || fac === "awaiting") {
        return {
            stage: "pending_faculty",
            badgeLabel: "Pending faculty approval",
            queueMessage: "Waiting for faculty approval before the next step.",
        };
    }
    if (needsPartner && (part === "pending" || part === "awaiting")) {
        return {
            stage: "pending_partner",
            badgeLabel: "Pending partner approval",
            queueMessage: "Waiting for partner approval before admin review.",
        };
    }
    if (lower(project.admin_approval_status) === "pending" || lower(project.admin_approval_status) === "awaiting") {
        return {
            stage: "pending_admin",
            badgeLabel: "Pending admin approval",
            queueMessage: "Awaiting final approval from CIEL Admin. Reporting unlocks only after approval.",
        };
    }

    const status = lower(project.status);
    const studentCreated =
        project.is_student_created === true ||
        lower(project.created_by_role) === "student" ||
        lower(project.source) === "student_created" ||
        stage.length > 0;

    if (["pending", "pending_approval", "applied", "draft"].includes(status)) {
        if (studentCreated) {
            return {
                stage: "pending_unknown",
                badgeLabel: "In approval",
                queueMessage:
                    "Your opportunity is in the approval chain: faculty (required), partner if applicable, then CIEL Admin. Reporting unlocks only after final admin approval.",
            };
        }
        return {
            stage: "pending_unknown",
            badgeLabel: "Pending approval",
            queueMessage:
                "Waiting for confirmation from the project organizer or CIEL Admin. You will be notified when your participation is approved.",
        };
    }

    return {
        stage: "pending_unknown",
        badgeLabel: status ? status.replace(/_/g, " ") : "Unknown",
        queueMessage: "Approval status will update here as faculty, partner, and admin respond.",
    };
}
