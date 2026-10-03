"use client";

import { useCallback, useState } from "react";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { Button } from "@/app/dashboard/student/report/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/app/dashboard/student/report/components/ui/dialog";
import { Textarea } from "@/app/dashboard/student/report/components/ui/textarea";
import { Label } from "@/app/dashboard/student/report/components/ui/label";
import { toast } from "sonner";
import type { FacultyApprovalAction } from "@/utils/facultyApprovals";
import { FacultyOpportunityDetailBody } from "@/components/faculty/FacultyOpportunityDetailBody";
import { approvalActionClass } from "@/components/ciel/community-service/OpportunityApprovalCard";

/** Same faculty/partner approval endpoints as /dashboard/faculty/approvals — UI only stays on Review Opportunities. */
export function useFacultyOpportunityReviewActions(onChanged?: () => void) {
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailRecord, setDetailRecord] = useState<Record<string, unknown> | null>(null);
    const [detailActionId, setDetailActionId] = useState<string | null>(null);
    const [detailActionKind, setDetailActionKind] = useState<FacultyApprovalAction>("faculty_review");
    const [approveSubmittingId, setApproveSubmittingId] = useState<string | null>(null);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
    const [rejectActionKind, setRejectActionKind] = useState<FacultyApprovalAction>("faculty_review");
    const [rejectComment, setRejectComment] = useState("");
    const [rejectSubmitting, setRejectSubmitting] = useState(false);
    const [feedbackMode, setFeedbackMode] = useState<"revise" | "reject_permanent">("revise");

    const openOpportunityDetail = useCallback(
        async (
            opportunityId: string,
            options?: { showActions?: boolean; approvalAction?: FacultyApprovalAction },
        ) => {
        setDetailOpen(true);
        setDetailLoading(true);
        setDetailRecord(null);
        setDetailActionId(options?.showActions ? opportunityId : null);
        setDetailActionKind(options?.approvalAction ?? "faculty_review");
        try {
            const res = await authenticatedFetch(`/api/v1/opportunities/detail`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: opportunityId }),
            });
            if (!res?.ok) {
                toast.error("Could not load opportunity details");
                setDetailOpen(false);
                setDetailActionId(null);
                return;
            }
            const json = await res.json();
            const d = json?.data as Record<string, unknown> | undefined;
            if (!d) {
                toast.error("Opportunity not found");
                setDetailOpen(false);
                setDetailActionId(null);
                return;
            }
            setDetailRecord(d);
        } catch {
            toast.error("Could not load opportunity details");
            setDetailOpen(false);
            setDetailActionId(null);
        } finally {
            setDetailLoading(false);
        }
        },
        [],
    );

    const handleApprove = async (id: string, action: FacultyApprovalAction = "faculty_review") => {
        if (approveSubmittingId === id) return;
        setApproveSubmittingId(id);
        try {
            const endpoint =
                action === "partner_ack"
                    ? `/api/v1/partner/approvals/${id}/approve`
                    : `/api/v1/faculty/approvals/${id}/approve`;
            const res = await authenticatedFetch(endpoint, { method: "POST" });
            if (res && res.ok) {
                toast.success(action === "partner_ack" ? "Partner acknowledgement submitted" : "Project approved successfully");
                setDetailOpen(false);
                setDetailActionId(null);
                setDetailActionKind("faculty_review");
                onChanged?.();
            } else {
                let message = "Failed to approve project";
                try {
                    const errorBody = (await res?.json()) as { message?: unknown };
                    if (typeof errorBody?.message === "string" && errorBody.message.trim()) {
                        message = errorBody.message.trim();
                    }
                } catch {
                    /* ignore */
                }
                toast.error(message);
            }
        } catch {
            toast.error("Error connecting to server");
        } finally {
            setApproveSubmittingId((prev) => (prev === id ? null : prev));
        }
    };

    const openRejectDialog = (
        id: string,
        action: FacultyApprovalAction = "faculty_review",
        mode: "revise" | "reject_permanent" = "revise",
    ) => {
        setRejectTargetId(id);
        setRejectActionKind(action);
        setFeedbackMode(mode);
        setRejectComment("");
        setRejectOpen(true);
    };

    const closeRejectDialog = () => {
        setRejectOpen(false);
        setRejectTargetId(null);
        setRejectActionKind("faculty_review");
        setRejectComment("");
    };

    const confirmReject = async () => {
        if (!rejectTargetId) return;
        const reason = rejectComment.trim();
        if (reason.length < 3) {
            toast.error("Please add feedback for the student (at least 3 characters).");
            return;
        }
        setRejectSubmitting(true);
        try {
            const actionPath = feedbackMode === "revise" ? "revise" : "reject";
            const reviewEndpoint =
                rejectActionKind === "partner_ack"
                    ? `/api/v1/partner/approvals/${rejectTargetId}/${actionPath}`
                    : `/api/v1/faculty/approvals/${rejectTargetId}/${actionPath}`;
            const res = await authenticatedFetch(reviewEndpoint, {
                method: "POST",
                body: JSON.stringify({ reason }),
            });
            if (res && res.ok) {
                toast.success(
                    feedbackMode === "revise"
                        ? "Revision requested. The student can edit and resubmit."
                        : "Permanently rejected. The student cannot edit this opportunity.",
                );
                setDetailOpen(false);
                setDetailActionId(null);
                setDetailRecord(null);
                closeRejectDialog();
                onChanged?.();
            } else {
                toast.error("Failed to reject project");
            }
        } catch {
            toast.error("Error connecting to server");
        } finally {
            setRejectSubmitting(false);
        }
    };

    const dialogs = (
        <>
            <Dialog
                open={detailOpen}
                onOpenChange={(open) => {
                    setDetailOpen(open);
                    if (!open) {
                        setDetailRecord(null);
                        setDetailActionId(null);
                        setDetailActionKind("faculty_review");
                    }
                }}
            >
                <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-5xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Student opportunity</DialogTitle>
                        <DialogDescription>
                            Review the flashcard and full proposal here. Approve, request revision, or reject without leaving
                            Review Opportunities.
                        </DialogDescription>
                    </DialogHeader>
                    {detailLoading ? (
                        <div className="flex justify-center py-12 text-slate-500">
                            <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                    ) : detailRecord ? (
                        <>
                            <FacultyOpportunityDetailBody d={detailRecord} />
                            {detailActionId ? (
                                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
                                    <Button
                                        variant="outline"
                                        className="border-amber-300 text-amber-900 hover:bg-amber-50"
                                        onClick={() => openRejectDialog(detailActionId, detailActionKind, "revise")}
                                    >
                                        <XCircle className="mr-2 h-4 w-4" /> Request revision
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={() => openRejectDialog(detailActionId, detailActionKind, "reject_permanent")}
                                    >
                                        <XCircle className="mr-2 h-4 w-4" /> Reject permanently
                                    </Button>
                                    <Button
                                        className="bg-green-600 hover:bg-green-700"
                                        onClick={() => void handleApprove(detailActionId, detailActionKind)}
                                        disabled={approveSubmittingId === detailActionId}
                                    >
                                        {approveSubmittingId === detailActionId ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Approving...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="mr-2 h-4 w-4" /> Approve
                                            </>
                                        )}
                                    </Button>
                                </div>
                            ) : null}
                        </>
                    ) : null}
                </DialogContent>
            </Dialog>
            <Dialog open={rejectOpen} onOpenChange={(open) => !open && !rejectSubmitting && closeRejectDialog()}>
                <DialogContent className="w-[calc(100vw-2rem)] max-w-md sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{feedbackMode === "revise" ? "Request revision" : "Reject permanently"}</DialogTitle>
                        <DialogDescription>
                            {feedbackMode === "revise"
                                ? "The student can edit and resubmit. Your comments explain what to change."
                                : "This closes the opportunity. The student cannot edit or resubmit."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label htmlFor="faculty-hub-reject-comment">Comments for the student</Label>
                        <Textarea
                            id="faculty-hub-reject-comment"
                            value={rejectComment}
                            onChange={(e) => setRejectComment(e.target.value)}
                            placeholder="e.g. Scope is too broad for one semester; tighten objectives and resubmit."
                            className="min-h-[120px]"
                            disabled={rejectSubmitting}
                        />
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={closeRejectDialog} disabled={rejectSubmitting}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant={feedbackMode === "revise" ? "default" : "destructive"}
                            className={feedbackMode === "revise" ? "bg-amber-600 hover:bg-amber-700" : undefined}
                            onClick={() => void confirmReject()}
                            disabled={rejectSubmitting}
                        >
                            {rejectSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {feedbackMode === "revise" ? "Send revision request" : "Reject permanently"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );

    return {
        approveSubmittingId,
        handleApprove,
        openRejectDialog,
        openOpportunityDetail,
        dialogs,
    };
}

export function FacultyPendingReviewButtons({
    opportunityId,
    approvalAction = "faculty_review",
    approveSubmittingId,
    onRevise,
    onReject,
    onOpenFlashcard,
}: {
    opportunityId: string;
    approvalAction?: FacultyApprovalAction;
    approveSubmittingId: string | null;
    onRevise: (id: string, action: FacultyApprovalAction) => void;
    onReject: (id: string, action: FacultyApprovalAction) => void;
    onOpenFlashcard: (id: string, action: FacultyApprovalAction) => void;
}) {
    const busy = approveSubmittingId === opportunityId;
    return (
        <>
            <button
                type="button"
                className={approvalActionClass.green}
                disabled={busy}
                onClick={() => onOpenFlashcard(opportunityId, approvalAction)}
            >
                {busy ? "Approving…" : "View Flashcard & Approve"}
            </button>
            <button
                type="button"
                className={approvalActionClass.gold}
                disabled={busy}
                onClick={() => onRevise(opportunityId, approvalAction)}
            >
                Request Revision
            </button>
            <button
                type="button"
                className={approvalActionClass.red}
                disabled={busy}
                onClick={() => onReject(opportunityId, approvalAction)}
            >
                Reject
            </button>
        </>
    );
}
