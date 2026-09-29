import {
    canEditReturnedOpportunity,
    resolveStudentOpportunityWorkflow,
} from "@/utils/opportunityWorkflow";
import { normalizeReviewStatus } from "@/utils/reviewQueue";

export type PartnerQueueBucket = "linked" | "waiting_faculty" | "pending" | "revision" | "decided";

function lower(value: unknown): string {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}

function asRecord(row: Record<string, unknown>): Record<string, unknown> {
    return {
        ...row,
        status: row.status ?? row.opportunityStatus,
        workflow_stage: row.workflow_stage ?? row.workflowStage,
        partner_approval_status: row.partner_approval_status ?? row.partnerApprovalStatus ?? row.partner_status,
        linked_draft: row.linked_draft ?? row.linkedDraft,
    };
}

/** Named partner/NGO still sees the same master row while it is an unsaved draft. */
export function isPartnerLinkedDraft(row: Record<string, unknown>): boolean {
    const r = asRecord(row);
    return r.linked_draft === true || lower(r.status) === "draft";
}

/** Submitted and linked, but Faculty has not approved yet — view-only, no partner gate. */
export function isPartnerWaitingForFaculty(row: Record<string, unknown>): boolean {
    if (isPartnerLinkedDraft(row)) return false;
    return resolveStudentOpportunityWorkflow(asRecord(row)).stage === "pending_faculty";
}

export function isPartnerPendingDecision(row: Record<string, unknown>): boolean {
    if (isPartnerLinkedDraft(row) || isPartnerWaitingForFaculty(row)) return false;
    return resolveStudentOpportunityWorkflow(asRecord(row)).stage === "pending_partner";
}

export function isPartnerRevisionQueue(row: Record<string, unknown>): boolean {
    if (isPartnerLinkedDraft(row)) return false;
    const r = asRecord(row);
    const partnerStatus = lower(r.partner_approval_status);
    const stage = resolveStudentOpportunityWorkflow(r).stage;
    if (stage === "revision") return true;
    if (partnerStatus.includes("revision") || partnerStatus === "returned") return true;
    const key = `${normalizeReviewStatus(r.status)} ${lower(r.workflow_stage)} ${lower(r.revision_with ?? r.revisionWith)}`;
    return key.includes("revision") || key.includes("returned") || canEditReturnedOpportunity(r);
}

export function partnerQueueBucket(row: Record<string, unknown>): PartnerQueueBucket {
    if (isPartnerLinkedDraft(row)) return "linked";
    if (isPartnerWaitingForFaculty(row)) return "waiting_faculty";
    if (isPartnerRevisionQueue(row)) return "revision";
    if (isPartnerPendingDecision(row)) return "pending";
    return "decided";
}
