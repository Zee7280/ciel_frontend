/**
 * Single place for student project CTAs — separates:
 * 1) Listing workflow (create → faculty → partner → admin → live, revision, permanent reject)
 * 2) Join workflow (apply to participate on a listing, including own live listing for reporting)
 */

import {
    canEditReturnedOpportunity,
    isOpportunityPermanentlyRejected,
    isOpportunityPubliclyLive,
    isStudentOpportunityLiveForReporting,
    resolveStudentOpportunityWorkflow,
} from "@/utils/opportunityWorkflow";
import {
    isJoinApplicationPendingStatus,
    isJoinApplicationRejectedStatus,
    joinApplicationLocksApplyButton,
    mergeHasAppliedFields,
    pickJoinApplicationStatus,
} from "@/utils/studentJoinApplication";

export type StudentProjectActionsInput = {
    raw: Record<string, unknown>;
    isStudentOwner: boolean;
    hasApplied: boolean;
    applyLocked: boolean;
    applicationStatus: string;
    live: boolean;
};

export type StudentProjectActions = {
    /** Listing needs edit (revision) — not join apply. */
    showEditResubmit: boolean;
    /** Browse-style Apply Now / Apply again (someone else's listing, or own live listing participation). */
    showJoinApplyNow: boolean;
    showJoinApplyAgain: boolean;
    /** Join pending or approved — show Applied chip. */
    showJoinAppliedLocked: boolean;
    /** Listing permanently closed. */
    showListingClosed: boolean;
    /** Short helper under buttons (listing queue or join). */
    helperMessage: string | null;
};

function lower(v: unknown): string {
    if (v == null) return "";
    return String(v).trim().toLowerCase();
}

/**
 * Join apply buttons apply to:
 * - any non-owner listing, or
 * - owner's own listing only when it is live and listing revision is not active.
 */
export function shouldShowJoinApplicationApplyUi(
    raw: Record<string, unknown>,
    opts: { isStudentOwner: boolean },
): boolean {
    if (!opts.isStudentOwner) return true;
    if (canEditReturnedOpportunity(raw)) return false;
    if (!isStudentOpportunityLiveForReporting(raw) && !isOpportunityPubliclyLive(raw)) return false;
    return true;
}

export function resolveStudentProjectActions(input: StudentProjectActionsInput): StudentProjectActions {
    const { raw, isStudentOwner, hasApplied, applyLocked, applicationStatus } = input;
    const live = input.live || isStudentOpportunityLiveForReporting(raw);
    const workflow = resolveStudentOpportunityWorkflow(raw);
    const canEditListing = isStudentOwner && canEditReturnedOpportunity(raw);
    const listingClosed = isStudentOwner && isOpportunityPermanentlyRejected(raw);
    const joinUi = shouldShowJoinApplicationApplyUi(raw, { isStudentOwner });

    const joinRejected =
        Boolean(applicationStatus) && isJoinApplicationRejectedStatus(applicationStatus);
    const joinPending =
        Boolean(applicationStatus) && isJoinApplicationPendingStatus(applicationStatus);

    if (isStudentOwner && canEditListing) {
        return {
            showEditResubmit: true,
            showJoinApplyNow: false,
            showJoinApplyAgain: false,
            showJoinAppliedLocked: false,
            showListingClosed: false,
            helperMessage: workflow.queueMessage,
        };
    }

    if (listingClosed) {
        return {
            showEditResubmit: false,
            showJoinApplyNow: false,
            showJoinApplyAgain: false,
            showJoinAppliedLocked: false,
            showListingClosed: true,
            helperMessage: workflow.queueMessage,
        };
    }

    if (joinUi) {
        if (applyLocked || (hasApplied && !joinRejected)) {
            return {
                showEditResubmit: false,
                showJoinApplyNow: false,
                showJoinApplyAgain: false,
                showJoinAppliedLocked: true,
                showListingClosed: false,
                helperMessage: joinPending ? workflow.queueMessage : null,
            };
        }
        if (hasApplied && joinRejected) {
            return {
                showEditResubmit: false,
                showJoinApplyNow: false,
                showJoinApplyAgain: true,
                showJoinAppliedLocked: false,
                showListingClosed: false,
                helperMessage: isStudentOwner
                    ? "Your participation signup was not approved. Re-apply to unlock reporting on your project."
                    : "Application not approved. You can submit a new request.",
            };
        }
        return {
            showEditResubmit: false,
            showJoinApplyNow: true,
            showJoinApplyAgain: false,
            showJoinAppliedLocked: false,
            showListingClosed: false,
            helperMessage: null,
        };
    }

    if (isStudentOwner && !live) {
        return {
            showEditResubmit: false,
            showJoinApplyNow: false,
            showJoinApplyAgain: false,
            showJoinAppliedLocked: false,
            showListingClosed: false,
            helperMessage: workflow.queueMessage,
        };
    }

    return {
        showEditResubmit: false,
        showJoinApplyNow: false,
        showJoinApplyAgain: false,
        showJoinAppliedLocked: false,
        showListingClosed: false,
        helperMessage: null,
    };
}

/** Build apply-lock fields from API payload (browse + my projects). */
export function buildJoinApplyFields(raw: Record<string, unknown>): {
    applicationStatus: string;
    hasApplied: boolean;
    applyLocked: boolean;
} {
    const applicationStatus = pickJoinApplicationStatus(raw);
    const hasApplied = mergeHasAppliedFields(raw);
    const applyLocked = joinApplicationLocksApplyButton({
        ...raw,
        application_status: applicationStatus || raw.application_status,
        has_applied: hasApplied,
        hasApplied: hasApplied,
    });
    return { applicationStatus, hasApplied, applyLocked };
}
