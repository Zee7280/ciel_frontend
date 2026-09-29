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
import {
    REPORTING_WINDOW_CLOSED_MESSAGE,
    canJoinOrApply,
    canRecordCompletedService,
    lifecycleStatusLabel,
} from "@/utils/opportunityTimelineLifecycle";

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
    /** Primary join CTA copy. */
    joinCtaLabel: string;
    /** Date-driven lifecycle badge, if any. */
    lifecycleLabel: string | null;
};

function timelineFromRaw(raw: Record<string, unknown>): unknown {
    return raw.timeline ?? (raw.detail_view as { timeline?: unknown } | undefined)?.timeline;
}

function joinCtaForTimeline(raw: Record<string, unknown>): {
    allowJoin: boolean;
    label: string;
    helper: string | null;
    lifecycleLabel: string | null;
} {
    const timeline = timelineFromRaw(raw);
    const lifecycleLabel = lifecycleStatusLabel(timeline);
    if (canJoinOrApply(timeline)) {
        return { allowJoin: true, label: "Join Opportunity", helper: null, lifecycleLabel };
    }
    if (canRecordCompletedService(timeline)) {
        return {
            allowJoin: true,
            label: "Record Completed Service",
            helper:
                "Project service period ended. You can still record completed service during the reporting window.",
            lifecycleLabel,
        };
    }
    if (lifecycleLabel === "Applications Closed") {
        return {
            allowJoin: false,
            label: "Applications Closed",
            helper:
                "Applications have closed. Enrolled students can continue service until the project end date.",
            lifecycleLabel,
        };
    }
    if (lifecycleLabel === "Reporting Window Closed") {
        return {
            allowJoin: false,
            label: "Reporting Window Closed",
            helper: REPORTING_WINDOW_CLOSED_MESSAGE,
            lifecycleLabel,
        };
    }
    return { allowJoin: true, label: "Join Opportunity", helper: null, lifecycleLabel };
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
    if (opts.isStudentOwner) return false;
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
    const joinTiming = joinCtaForTimeline(raw);

    const empty = (extra: Partial<StudentProjectActions>): StudentProjectActions => ({
        showEditResubmit: false,
        showJoinApplyNow: false,
        showJoinApplyAgain: false,
        showJoinAppliedLocked: false,
        showListingClosed: false,
        helperMessage: null,
        joinCtaLabel: joinTiming.label,
        lifecycleLabel: joinTiming.lifecycleLabel,
        ...extra,
    });

    const joinRejected =
        Boolean(applicationStatus) && isJoinApplicationRejectedStatus(applicationStatus);
    const joinPending =
        Boolean(applicationStatus) && isJoinApplicationPendingStatus(applicationStatus);

    if (isStudentOwner && canEditListing) {
        return empty({
            showEditResubmit: true,
            helperMessage: workflow.queueMessage,
        });
    }

    if (listingClosed) {
        return empty({
            showListingClosed: true,
            helperMessage: workflow.queueMessage,
        });
    }

    if (joinUi) {
        if (!joinTiming.allowJoin) {
            return empty({
                helperMessage: joinTiming.helper,
            });
        }
        if (applyLocked || (hasApplied && !joinRejected)) {
            return empty({
                showJoinAppliedLocked: true,
                helperMessage: joinPending ? workflow.queueMessage : null,
            });
        }
        if (hasApplied && joinRejected) {
            return empty({
                showJoinApplyAgain: true,
                joinCtaLabel:
                    joinTiming.label === "Record Completed Service"
                        ? "Record Completed Service"
                        : "Apply again",
                helperMessage: isStudentOwner
                    ? "Your participation signup was not approved. Re-apply to unlock reporting on your project."
                    : "Application not approved. You can submit a new request.",
            });
        }
        return empty({
            showJoinApplyNow: true,
            helperMessage: joinTiming.helper,
        });
    }

    if (isStudentOwner && !live) {
        return empty({
            helperMessage: workflow.queueMessage,
        });
    }

    return empty({});
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
