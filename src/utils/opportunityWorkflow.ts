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

/** Whole-string UUID or Mongo-style ObjectId — not human remarks (API sometimes echoes IDs in generic keys). */
function isOpaqueTechnicalIdentifier(s: string): boolean {
    const t = s.trim();
    if (!t) return false;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) return true;
    if (/^[0-9a-f]{24}$/i.test(t)) return true;
    return false;
}

function reviewText(v: unknown): string | null {
    if (typeof v === "string") {
        const t = v.trim();
        if (!t || isOpaqueTechnicalIdentifier(t)) return null;
        return t;
    }
    if (Array.isArray(v)) {
        const parts = v
            .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
            .map((item) => item.trim())
            .filter((item) => !isOpaqueTechnicalIdentifier(item));
        const joined = parts.join("\n");
        return joined.trim() || null;
    }
    return null;
}

function sameNormalizedText(a: string, b: string): boolean {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Ignore API echoes where a generic remarks field repeats the listing title or description. */
function textLooksLikeEchoOfProject(text: string, project: Record<string, unknown>): boolean {
    const title = typeof project.title === "string" ? project.title.trim() : "";
    const desc = typeof project.description === "string" ? project.description.trim() : "";
    if (title && sameNormalizedText(text, title)) return true;
    if (desc && sameNormalizedText(text, desc)) return true;
    return false;
}

const REVIEW_LIKE_INNER_KEYS = [
    "remarks",
    "remark",
    "comment",
    "comments",
    "feedback",
    "text",
    "message",
    "note",
    "notes",
    "decision_note",
    "decisionNote",
    "reason",
    "review_feedback",
    "reviewFeedback",
] as const;

function pickFromReviewLikeObject(nested: Record<string, unknown>): string | null {
    for (const key of REVIEW_LIKE_INNER_KEYS) {
        const text = reviewText(nested[key]);
        if (text) return text;
    }
    return null;
}

const FACULTY_REMARK_KEYS = [
    "faculty_remarks",
    "facultyRemarks",
    "faculty_feedback",
    "facultyFeedback",
    "faculty_comment",
    "faculty_comments",
    "facultyComment",
    "facultyComments",
    "liaison_remarks",
    "liaisonRemarks",
    "liaison_feedback",
    "liaisonFeedback",
    "liaison_comment",
    "liaison_comments",
    "liaisonComment",
    "liaisonComments",
    "supervisor_remarks",
    "supervisorRemarks",
    "supervisor_feedback",
    "supervisorFeedback",
] as const;

const PARTNER_REMARK_KEYS = [
    "partner_remarks",
    "partnerRemarks",
    "partner_feedback",
    "partnerFeedback",
    "partner_comment",
    "partner_comments",
    "partnerComment",
    "partnerComments",
    "external_partner_remarks",
    "externalPartnerRemarks",
    "external_partner_feedback",
    "externalPartnerFeedback",
] as const;

const ADMIN_REMARK_KEYS = [
    "admin_remarks",
    "adminRemarks",
    "admin_feedback",
    "adminFeedback",
    "admin_comment",
    "admin_comments",
    "adminComment",
    "adminComments",
    "ciel_remarks",
    "cielRemarks",
] as const;

const FACULTY_NESTED_REVIEW_KEYS = ["faculty_review", "facultyReview", "faculty_decision", "facultyDecision"] as const;
const PARTNER_NESTED_REVIEW_KEYS = ["partner_review", "partnerReview", "partner_decision", "partnerDecision"] as const;
const ADMIN_NESTED_REVIEW_KEYS = ["admin_review", "adminReview", "admin_decision", "adminDecision"] as const;

function pickStakeholderRemarks(project: Record<string, unknown>, role: "faculty" | "partner" | "admin"): string | null {
    const directKeys =
        role === "faculty" ? FACULTY_REMARK_KEYS : role === "partner" ? PARTNER_REMARK_KEYS : ADMIN_REMARK_KEYS;
    for (const key of directKeys) {
        const text = reviewText(project[key]);
        if (text) return text;
    }
    const nestedKeys =
        role === "faculty"
            ? FACULTY_NESTED_REVIEW_KEYS
            : role === "partner"
              ? PARTNER_NESTED_REVIEW_KEYS
              : ADMIN_NESTED_REVIEW_KEYS;
    for (const nk of nestedKeys) {
        const nested = project[nk];
        if (nested && typeof nested === "object" && !Array.isArray(nested)) {
            const fromInner = pickFromReviewLikeObject(nested as Record<string, unknown>);
            if (fromInner) return fromInner;
        }
    }
    return null;
}

export type OpportunityReturnRemarkSection = {
    label: "Faculty" | "Partner" | "Admin";
    text: string;
};

/**
 * Pulls return/rejection notes per gate (Faculty → Partner → Admin) when the API stores them separately.
 * Skips text that only echoes the opportunity title/description (common bad payload shape).
 */
export function extractOpportunityReturnRemarkSections(project: Record<string, unknown>): OpportunityReturnRemarkSection[] {
    const out: OpportunityReturnRemarkSection[] = [];
    const seenNorm = new Set<string>();
    const roles: Array<{ label: OpportunityReturnRemarkSection["label"]; role: "faculty" | "partner" | "admin" }> = [
        { label: "Faculty", role: "faculty" },
        { label: "Partner", role: "partner" },
        { label: "Admin", role: "admin" },
    ];
    for (const { label, role } of roles) {
        const text = pickStakeholderRemarks(project, role);
        if (!text) continue;
        if (textLooksLikeEchoOfProject(text, project)) continue;
        const norm = text.trim().toLowerCase();
        if (seenNorm.has(norm)) continue;
        seenNorm.add(norm);
        out.push({ label, text });
    }
    return out;
}

function extractGenericOpportunityReviewFeedback(project: Record<string, unknown>): string | null {
    const candidate = pickFeedbackFromUnknown(project);
    if (!candidate) return null;
    if (textLooksLikeEchoOfProject(candidate, project)) return null;
    return candidate;
}

function pickFeedbackFromObject(obj: Record<string, unknown> | null | undefined): string | null {
    if (!obj) return null;
    const directKeys = [
        "admin_remarks",
        "adminRemarks",
        "admin_feedback",
        "adminFeedback",
        "admin_comment",
        "admin_comments",
        "adminComment",
        "adminComments",
        "faculty_remarks",
        "facultyRemarks",
        "faculty_feedback",
        "facultyFeedback",
        "faculty_comment",
        "faculty_comments",
        "facultyComment",
        "facultyComments",
        "partner_remarks",
        "partnerRemarks",
        "partner_feedback",
        "partnerFeedback",
        "partner_comment",
        "partner_comments",
        "partnerComment",
        "partnerComments",
        "return_reason",
        "returnReason",
        "return_remarks",
        "returnRemarks",
        "returned_reason",
        "returnedReason",
        "returned_remarks",
        "returnedRemarks",
        "rejection_reason",
        "rejectionReason",
        "rejection_remarks",
        "rejectionRemarks",
        "rejected_reason",
        "rejectedReason",
        "rejected_remarks",
        "rejectedRemarks",
        "review_comments",
        "review_comment",
        "review_feedback",
        "reviewComments",
        "reviewComment",
        "reviewFeedback",
        "remarks_text",
        "remarksText",
        "feedback_text",
        "feedbackText",
        "decision_note",
        "decisionNote",
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

function pickFeedbackFromUnknown(value: unknown, depth = 0): string | null {
    if (depth > 4 || value == null) return null;
    if (typeof value === "string") return reviewText(value);
    if (Array.isArray(value)) {
        const inlineText = reviewText(value);
        if (inlineText) return inlineText;
        for (const item of value) {
            const fromItem = pickFeedbackFromUnknown(item, depth + 1);
            if (fromItem) return fromItem;
        }
        return null;
    }
    if (typeof value !== "object") return null;

    const asRecord = value as Record<string, unknown>;
    const direct = pickFeedbackFromObject(asRecord);
    if (direct) return direct;

    const nestedKeys = [
        "review",
        "reviews",
        "latest_review",
        "latestReview",
        "admin_review",
        "adminReview",
        "faculty_review",
        "facultyReview",
        "partner_review",
        "partnerReview",
        "approval",
        "approvals",
        "decision",
        "decisions",
        "latest_decision",
        "latestDecision",
        "status_detail",
        "status_details",
        "statusDetail",
        "statusDetails",
        "workflow",
        "workflow_state",
        "workflowState",
        "history",
    ] as const;

    for (const key of nestedKeys) {
        if (Object.prototype.hasOwnProperty.call(asRecord, key)) {
            const fromNested = pickFeedbackFromUnknown(asRecord[key], depth + 1);
            if (fromNested) return fromNested;
        }
    }

    for (const key of Object.keys(asRecord)) {
        const fromAnyNested = pickFeedbackFromUnknown(asRecord[key], depth + 1);
        if (fromAnyNested) return fromAnyNested;
    }

    return null;
}

export function extractOpportunityReviewFeedback(project: Record<string, unknown>): string | null {
    const sections = extractOpportunityReturnRemarkSections(project);
    if (sections.length > 0) {
        return sections.map((s) => `${s.label}: ${s.text}`).join("\n\n");
    }
    return extractGenericOpportunityReviewFeedback(project);
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

/** True when the listing is publicly live: API-aligned `status` plus final admin approval (do not infer from `workflow_stage`). */
export function isOpportunityPubliclyLive(project: Record<string, unknown>): boolean {
    if (lower(project.status) !== "live") return false;
    const adminFlag = project.admin_approved ?? project.adminApproved;
    return truthyApproved(adminFlag) || adminFlag === true;
}

/**
 * Student may treat the project as in the post-approval / reporting phase: completed projects,
 * or opportunities that are publicly live (`status === "live"` and admin approved).
 */
export function isStudentOpportunityLiveForReporting(project: Record<string, unknown>): boolean {
    const status = lower(project.status);
    if (status === "completed") return true;
    return isOpportunityPubliclyLive(project);
}

function adminApprovedExplicitlyFalse(project: Record<string, unknown>): boolean {
    const v = project.admin_approved ?? project.adminApproved;
    if (v === false) return true;
    return lower(v) === "false" || lower(v) === "no";
}

export type PartnerOpportunityListLabels = {
    primaryLabel: string;
    badgeTone: "live" | "review" | "rejected" | "neutral";
    /** Pipeline position only — not used as the primary “live” signal. */
    workflowSubtitle: string | null;
};

/** Partner dashboard list/table: primary label from `status` + `admin_approved`; subtitle from `workflow_stage`. */
export function resolvePartnerOpportunityListLabels(project: Record<string, unknown>): PartnerOpportunityListLabels {
    const wfRaw = project.workflow_stage ?? project.workflowStage ?? project.approval_stage;
    const wf = typeof wfRaw === "string" && wfRaw.trim() ? wfRaw.trim().replace(/_/g, " ") : null;

    if (isOpportunityPubliclyLive(project)) {
        return { primaryLabel: "Live", badgeTone: "live", workflowSubtitle: wf };
    }

    const st = lower(project.status);
    if (st === "rejected") {
        return { primaryLabel: "Rejected", badgeTone: "rejected", workflowSubtitle: wf };
    }

    if (adminApprovedExplicitlyFalse(project)) {
        return { primaryLabel: "Under review", badgeTone: "review", workflowSubtitle: wf };
    }

    if (
        ["pending_verification", "pending_approval", "pending_execution", "pending", "draft"].includes(st) ||
        st.includes("pending")
    ) {
        const label = st === "pending_approval" ? "Pending approval" : "Under review";
        return { primaryLabel: label, badgeTone: "review", workflowSubtitle: wf };
    }

    if (st === "live") {
        return { primaryLabel: "Under review", badgeTone: "review", workflowSubtitle: wf };
    }

    return {
        primaryLabel: st ? st.replace(/_/g, " ") : "—",
        badgeTone: "neutral",
        workflowSubtitle: wf,
    };
}

/** Human-readable top-level status for detail headers (use API `status`, not `workflow_stage`). */
export function formatOpportunityDetailStatusBadge(project: Record<string, unknown>): string {
    if (isOpportunityPubliclyLive(project)) return "Live";
    const st = lower(project.status);
    if (st === "completed") return "Completed";
    if (st === "rejected") return "Rejected";
    if (st) return st.replace(/_/g, " ");
    return "—";
}

/** Align with backend: partner approve/reject must not run until faculty step is complete. */
export function isFacultyApprovalCompleteForPartnerGate(project: Record<string, unknown>): boolean {
    return (
        truthyApproved(project.faculty_verified) ||
        truthyApproved(project.liaison_verified) ||
        lower(project.faculty_verification_status) === "faculty_verified" ||
        lower(project.faculty_approval_status) === "approved"
    );
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
            badgeLabel: "Live",
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

    const facultyStepDone = isFacultyApprovalCompleteForPartnerGate(project);

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
