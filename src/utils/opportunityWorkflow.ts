/**
 * Student-owned opportunity lifecycle (CIEL): Faculty → Partner (optional) → Admin → LIVE → reporting.
 * Faculty-created opportunities follow the same downstream gates: optional external partner → Admin → LIVE
 * (no “second faculty” step on the creator’s own posting). Backend sets `workflow_stage` / *_approval_status; UI falls back to `status`.
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

function reviewText(v: unknown): string | null {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (Array.isArray(v)) {
        const joined = v
            .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
            .join("\n");
        return joined.trim() || null;
    }
    return null;
}

function pickFeedbackFromObject(obj: Record<string, unknown> | null | undefined): string | null {
    if (!obj) return null;
    const directKeys = [
        "admin_remarks",
        "admin_feedback",
        "admin_comment",
        "admin_comments",
        "faculty_remarks",
        "faculty_feedback",
        "faculty_comment",
        "faculty_comments",
        "partner_remarks",
        "partner_feedback",
        "partner_comment",
        "partner_comments",
        "return_reason",
        "returned_reason",
        "rejection_reason",
        "rejected_reason",
        "review_comments",
        "review_comment",
        "review_feedback",
        "feedback",
        "remarks",
        "comment",
        "comments",
        "reason",
        "note",
        "notes",
    ] as const;
    for (const key of directKeys) {
        const text = reviewText(obj[key]);
        if (text) return text;
    }
    return null;
}

export function extractOpportunityReviewFeedback(project: Record<string, unknown>): string | null {
    const direct = pickFeedbackFromObject(project);
    if (direct) return direct;
    const nestedKeys = [
        "review",
        "latest_review",
        "admin_review",
        "faculty_review",
        "partner_review",
        "approval",
        "approvals",
        "decision",
        "latest_decision",
        "status_detail",
        "status_details",
        "workflow",
        "workflow_state",
    ] as const;
    for (const key of nestedKeys) {
        const value = project[key];
        if (value && typeof value === "object" && !Array.isArray(value)) {
            const text = pickFeedbackFromObject(value as Record<string, unknown>);
            if (text) return text;
        }
    }
    return null;
}

export function canEditReturnedOpportunity(project: Record<string, unknown>): boolean {
    const states = [
        lower(project.status),
        lower(project.workflow_stage ?? project.approval_stage),
        lower(project.admin_approval_status),
        lower(project.faculty_approval_status),
        lower(project.partner_approval_status),
    ];
    return states.some((state) => ["returned", "revision", "needs_revision", "rejected"].includes(state));
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
                queueMessage:
                    "This project is completed. You can still open your report or certificate when available.",
            };
        }
        return {
            stage: "live",
            badgeLabel: "Approved – LIVE",
            queueMessage:
                "Your opportunity is now live. You can start or continue your report and project tracking.",
        };
    }

    const stage = lower(project.workflow_stage ?? project.approval_stage);
    const statusEarly = lower(project.status);
    const adminStatus = lower(project.admin_approval_status);
    const facultyStatus = lower(project.faculty_approval_status);
    const partnerStatus = lower(project.partner_approval_status);

    if (
        [stage, statusEarly, adminStatus, facultyStatus, partnerStatus].some((value) =>
            ["returned", "revision", "needs_revision"].includes(value),
        )
    ) {
        return {
            stage: "revision",
            badgeLabel: "Revision requested",
            queueMessage: "Your opportunity was returned for updates. Review the remarks, edit the details, and resubmit.",
        };
    }

    // Backend contract: status / stage `pending_approval` = CIEL admin final queue only (after faculty + partner when applicable).
    if (statusEarly === "pending_approval" || stage === "pending_approval") {
        return {
            stage: "pending_admin",
            badgeLabel: "Pending Admin Approval (Final)",
            queueMessage:
                "Your opportunity is in the CIEL Admin queue (final step). Faculty and partner steps are already complete where they applied. You will be notified when it is Approved – LIVE.",
        };
    }
    const partEarly = partnerStatus;
    const needsPartnerEarly =
        project.requires_partner_approval === true ||
        partEarly === "pending" ||
        partEarly === "awaiting" ||
        partEarly === "required";

    const facultyStepDone =
        truthyApproved(project.faculty_verified) ||
        truthyApproved(project.liaison_verified) ||
        lower(project.faculty_verification_status) === "faculty_verified" ||
        lower(project.faculty_approval_status) === "approved";

    if (facultyStepDone) {
        if (
            stage === "pending_partner" ||
            statusEarly === "pending_partner" ||
            (needsPartnerEarly && (partEarly === "pending" || partEarly === "awaiting"))
        ) {
            return {
                stage: "pending_partner",
                badgeLabel: "Pending Partner Approval",
                queueMessage:
                    "Step 2 of 3: Partner approval (you added a partner). You will be notified when they respond.",
            };
        }
        if (stage === "pending_admin") {
            return {
                stage: "pending_admin",
                badgeLabel: "Pending Admin Approval (Final)",
                queueMessage:
                    "Step 3 of 3: CIEL Admin gives final approval. After this, your opportunity becomes Approved – LIVE.",
            };
        }
        if (statusEarly === "pending_verification" || statusEarly === "pending_faculty") {
            if (needsPartnerEarly && (partEarly === "pending" || partEarly === "awaiting")) {
                return {
                    stage: "pending_partner",
                    badgeLabel: "Pending Partner Approval",
                    queueMessage:
                        "Faculty approval is done. Next: partner confirmation, then CIEL Admin. You will be notified.",
                };
            }
            return {
                stage: "pending_admin",
                badgeLabel: "Pending Admin Approval (Final)",
                queueMessage:
                    "Faculty approval is done. CIEL Admin will complete the final review before your opportunity goes live.",
            };
        }
    }

    if (stage === "pending_faculty" || stage === "faculty_pending") {
        return {
            stage: "pending_faculty",
            badgeLabel: "Pending Faculty Approval",
            queueMessage:
                "Step 1 of 3: Your faculty supervisor reviews academic relevance and feasibility. You will be notified when they decide.",
        };
    }
    if (stage === "pending_partner" || stage === "partner_pending") {
        return {
            stage: "pending_partner",
            badgeLabel: "Pending Partner Approval",
            queueMessage:
                "Step 2 of 3: The partner organization must confirm. You will be notified when they respond.",
        };
    }
    if (stage === "pending_admin" || stage === "admin_pending") {
        return {
            stage: "pending_admin",
            badgeLabel: "Pending Admin Approval (Final)",
            queueMessage:
                "Step 3 of 3: CIEL Admin final review. This dashboard only lists items at this stage after earlier approvals. After admin approval, your opportunity becomes Approved – LIVE.",
        };
    }
    if (stage === "rejected" || project.rejected === true || lower(project.status) === "rejected") {
        return {
            stage: "rejected",
            badgeLabel: "Rejected",
            queueMessage: "This opportunity was returned. Check the remarks from faculty, partner, or admin, then edit and resubmit.",
        };
    }

    const fac = facultyStatus;
    const part = partnerStatus;
    const needsPartner = project.requires_partner_approval === true || part === "pending" || part === "required";

    if (fac === "pending" || fac === "awaiting") {
        return {
            stage: "pending_faculty",
            badgeLabel: "Pending Faculty Approval",
            queueMessage:
                "Step 1 of 3: Faculty approval is required before the next stage. You will be notified.",
        };
    }
    if (needsPartner && (part === "pending" || part === "awaiting")) {
        return {
            stage: "pending_partner",
            badgeLabel: "Pending Partner Approval",
            queueMessage:
                "Step 2 of 3: Partner approval is required before CIEL Admin. You will be notified.",
        };
    }
    if (lower(project.admin_approval_status) === "pending" || lower(project.admin_approval_status) === "awaiting") {
        return {
            stage: "pending_admin",
            badgeLabel: "Pending Admin Approval (Final)",
            queueMessage:
                "Step 3 of 3: Final CIEL Admin approval. Reporting unlocks after your opportunity is Approved – LIVE.",
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
                badgeLabel: "In approval journey",
                queueMessage:
                    "Journey: (1) Pending Faculty Approval → (2) Pending Partner Approval if you added a partner → (3) Pending Admin Approval (Final) → Approved – LIVE. You will be notified at each step.",
            };
        }
        return {
            stage: "pending_unknown",
            badgeLabel: "Pending approval",
            queueMessage:
                "Waiting for confirmation from the organizer or CIEL Admin. You will be notified when you are approved.",
        };
    }

    return {
        stage: "pending_unknown",
        badgeLabel: status ? status.replace(/_/g, " ") : "Unknown",
        queueMessage:
            "Status will update as you move through Faculty → Partner (if any) → CIEL Admin → Approved – LIVE.",
    };
}
