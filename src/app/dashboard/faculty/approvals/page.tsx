"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { CheckCircle, XCircle, Clock, Eye, Filter, Loader2 } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { Button } from "@/app/dashboard/student/report/components/ui/button";
import { Badge } from "@/app/dashboard/student/report/components/ui/badge";
import { Card } from "@/app/dashboard/student/report/components/ui/card";
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
import {
    type FacultyApprovalRow,
    normalizeFacultyApprovalsResponse,
} from "@/utils/facultyApprovals";
import { formatDisplayId } from "@/utils/displayIds";
import { getStoredCurrentUserEmail } from "@/utils/currentUser";
import { FacultyOpportunityDetailBody } from "@/components/faculty/FacultyOpportunityDetailBody";

export default function FacultyApprovalsPage() {
    const [tab, setTab] = useState<"pending" | "history">("pending");
    const [pendingProjects, setPendingProjects] = useState<FacultyApprovalRow[]>([]);
    const [historyProjects, setHistoryProjects] = useState<FacultyApprovalRow[]>([]);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailRecord, setDetailRecord] = useState<Record<string, unknown> | null>(null);
    /** When set, detail dialog shows Approve/Reject for this opportunity id (pending tab only). */
    const [detailActionId, setDetailActionId] = useState<string | null>(null);
    const [approveSubmittingId, setApproveSubmittingId] = useState<string | null>(null);

    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
    const [rejectComment, setRejectComment] = useState("");
    const [rejectSubmitting, setRejectSubmitting] = useState(false);
    const autoOpenedIdRef = useRef<string | null>(null);

    useEffect(() => {
        void loadLists();
    }, []);

    const loadLists = async () => {
        setIsLoading(true);
        try {
            const facultyEmail = getStoredCurrentUserEmail();
            const pendingParams = new URLSearchParams({ status: "pending" });
            const historyParams = new URLSearchParams({ status: "history" });
            if (facultyEmail) {
                pendingParams.set("faculty_email", facultyEmail);
                historyParams.set("faculty_email", facultyEmail);
            }

            const [pendingRes, historyRes] = await Promise.all([
                authenticatedFetch(`/api/v1/faculty/approvals?${pendingParams.toString()}`),
                authenticatedFetch(`/api/v1/faculty/approvals?${historyParams.toString()}`),
            ]);

            if (pendingRes?.ok) {
                const j = await pendingRes.json();
                setPendingProjects(normalizeFacultyApprovalsResponse(j));
            } else {
                toast.error("Could not load pending approvals");
            }

            if (historyRes?.ok) {
                const j = await historyRes.json();
                setHistoryProjects(normalizeFacultyApprovalsResponse(j));
            } else {
                toast.error("Could not load approval history");
            }
        } catch (error) {
            console.error("Failed to fetch approvals", error);
            toast.error("Failed to load approvals");
        } finally {
            setIsLoading(false);
        }
    };

    const openOpportunityDetail = async (opportunityId: string, options?: { showActions?: boolean }) => {
        setDetailOpen(true);
        setDetailLoading(true);
        setDetailRecord(null);
        setDetailActionId(options?.showActions ? opportunityId : null);
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
    };

    const visibleList = tab === "pending" ? pendingProjects : historyProjects;

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return visibleList;
        return visibleList.filter((p) => {
            const hay = [
                p.projectTitle,
                p.studentName,
                p.studentId,
                p.studentEmail || "",
                p.opportunityStatus || "",
            ]
                .join(" ")
                .toLowerCase();
            return hay.includes(q);
        });
    }, [visibleList, search]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const currentSearch = new URLSearchParams(window.location.search);
        const nextTab = currentSearch.get("tab");
        if (nextTab === "pending" || nextTab === "history") {
            setTab(nextTab);
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (isLoading) return;
        const currentSearch = new URLSearchParams(window.location.search);
        const opportunityId = currentSearch.get("opportunity") || currentSearch.get("id");
        if (!opportunityId || autoOpenedIdRef.current === opportunityId) return;

        const targetTab = currentSearch.get("tab") === "history" ? "history" : "pending";
        const sourceRows = targetTab === "history" ? historyProjects : pendingProjects;
        if (!sourceRows.some((row) => row.id === opportunityId)) return;

        autoOpenedIdRef.current = opportunityId;
        void openOpportunityDetail(opportunityId, { showActions: targetTab === "pending" });
    }, [historyProjects, isLoading, pendingProjects]);

    const handleApprove = async (id: string) => {
        if (approveSubmittingId === id) return;
        setApproveSubmittingId(id);
        try {
            const res = await authenticatedFetch(`/api/v1/faculty/approvals/${id}/approve`, {
                method: "POST",
            });
            if (res && res.ok) {
                toast.success("Project Approved Successfully");
                setPendingProjects((prev) => prev.filter((p) => p.id !== id));
                setDetailOpen(false);
                setDetailActionId(null);
                void loadLists();
            } else {
                toast.error("Failed to approve project");
            }
        } catch (error) {
            console.error("Failed to approve", error);
            toast.error("Error connecting to server");
        } finally {
            setApproveSubmittingId((prev) => (prev === id ? null : prev));
        }
    };

    const openRejectDialog = (id: string) => {
        setRejectTargetId(id);
        setRejectComment("");
        setRejectOpen(true);
    };

    const closeRejectDialog = () => {
        setRejectOpen(false);
        setRejectTargetId(null);
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
            const res = await authenticatedFetch(`/api/v1/faculty/approvals/${rejectTargetId}/reject`, {
                method: "POST",
                body: JSON.stringify({ reason }),
            });
            if (res && res.ok) {
                toast.success("Rejected. Your comments are sent to the student when the server sends notifications.");
                setPendingProjects((prev) => prev.filter((p) => p.id !== rejectTargetId));
                setDetailOpen(false);
                setDetailActionId(null);
                setDetailRecord(null);
                closeRejectDialog();
                void loadLists();
            } else {
                toast.error("Failed to reject project");
            }
        } catch (error) {
            console.error("Failed to reject", error);
            toast.error("Error connecting to server");
        } finally {
            setRejectSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 pb-20">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Student Project Approvals</h1>
                <p className="text-slate-500">
                    When a student requests approval (you may get an email), open the opportunity and review{" "}
                    <strong className="text-slate-600 font-semibold">academic relevance</strong>,{" "}
                    <strong className="text-slate-600 font-semibold">feasibility</strong>, and{" "}
                    <strong className="text-slate-600 font-semibold">student readiness</strong>. Approve to move the
                    request forward, or reject with comments so they can revise.
                </p>
                <p className="text-slate-500 text-sm mt-2">
                    Past decisions appear under <span className="font-medium text-slate-600">Approval history</span>.
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button
                    variant={tab === "pending" ? "default" : "outline"}
                    size="sm"
                    className="h-9"
                    onClick={() => setTab("pending")}
                >
                    Pending
                </Button>
                <Button
                    variant={tab === "history" ? "default" : "outline"}
                    size="sm"
                    className="h-9"
                    onClick={() => setTab("history")}
                >
                    Approval history
                </Button>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="relative flex-1">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by student name, ID, or email..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>
            </div>

            <div className="grid gap-6">
                {isLoading ? (
                    <div className="text-center py-12 text-slate-500 text-sm">Loading…</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                        <div className="mx-auto w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="w-6 h-6 text-green-500" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">
                            {tab === "pending" ? "All Caught Up!" : "No history yet"}
                        </h3>
                        <p className="text-slate-500">
                            {tab === "pending"
                                ? "No pending approvals at the moment."
                                : "Approved or progressed projects will appear here after you act or verify by email."}
                        </p>
                    </div>
                ) : (
                    filtered.map((project) => (
                        <Card key={project.id} className="overflow-hidden">
                            <div className="flex flex-col md:flex-row">
                                <div className="flex-1 space-y-4 p-5 sm:p-6">
                                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <h3 className="font-bold text-lg text-slate-900">{project.projectTitle}</h3>
                                                {tab === "pending" ? (
                                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                                        <Clock className="w-3 h-3 mr-1" /> Pending review
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                                                        {formatHistoryStatus(project)}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-slate-500 text-sm flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                                                <span>
                                                    Student:{" "}
                                                    <strong className="text-slate-700">{project.studentName}</strong> ({formatDisplayId(project.studentId, "STU")})
                                                </span>
                                                {project.studentEmail ? (
                                                    <span className="break-all text-slate-600">· {project.studentEmail}</span>
                                                ) : null}
                                                <span className="hidden sm:inline w-1 h-1 bg-slate-300 rounded-full shrink-0" />
                                                <span>Submitted {project.submittedDate}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Impact Hours</p>
                                            <p className="font-bold text-blue-600 text-lg">
                                                {formatApprovalMetric(project.totalHours)}{" "}
                                                <span className="text-xs font-medium text-slate-400">(after verification)</span>
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase mb-1">EIS Score</p>
                                            <p className="font-bold text-amber-600 text-lg">
                                                {formatApprovalMetric(project.eisScore)}
                                                <span className="text-xs font-medium text-slate-400">/100</span>
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Primary SDG</p>
                                            <p className="font-medium text-slate-800 text-sm">{project.sdg || "—"}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex w-full flex-col justify-center gap-3 border-t border-slate-100 bg-slate-50 p-5 sm:flex-row md:w-48 md:flex-col md:border-l md:border-t-0 md:p-6">
                                    {tab === "pending" ? (
                                        <>
                                            <Button
                                                className="w-full bg-green-600 hover:bg-green-700"
                                                onClick={() => void handleApprove(project.id)}
                                                disabled={approveSubmittingId === project.id}
                                            >
                                                {approveSubmittingId === project.id ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Approving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle className="w-4 h-4 mr-2" /> Approve
                                                    </>
                                                )}
                                            </Button>
                                            <Button variant="destructive" className="w-full" onClick={() => openRejectDialog(project.id)}>
                                                <XCircle className="w-4 h-4 mr-2" /> Reject
                                            </Button>
                                        </>
                                    ) : null}
                                    <Button
                                        variant="ghost"
                                        className="w-full"
                                        onClick={() => void openOpportunityDetail(project.id, { showActions: tab === "pending" })}
                                    >
                                        <Eye className="w-4 h-4 mr-2" /> {tab === "pending" ? "Review full details" : "Opportunity details"}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            <Dialog
                open={detailOpen}
                onOpenChange={(open) => {
                    setDetailOpen(open);
                    if (!open) {
                        setDetailRecord(null);
                        setDetailActionId(null);
                    }
                }}
            >
                <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Student opportunity</DialogTitle>
                        <DialogDescription>
                            Student profile, partner context (if any), and full proposal. Confirm academic fit, feasibility,
                            and student capability before you approve or reject with written feedback.
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
                                <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-slate-200">
                                    <Button variant="destructive" onClick={() => detailActionId && openRejectDialog(detailActionId)}>
                                        <XCircle className="w-4 h-4 mr-2" /> Reject
                                    </Button>
                                    <Button
                                        className="bg-green-600 hover:bg-green-700"
                                        onClick={() => void handleApprove(detailActionId)}
                                        disabled={approveSubmittingId === detailActionId}
                                    >
                                        {approveSubmittingId === detailActionId ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Approving...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="w-4 h-4 mr-2" /> Approve
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
                        <DialogTitle>Reject with feedback</DialogTitle>
                        <DialogDescription>
                            Comments are shared with the student (and stored on the server) so they can understand what to
                            change.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label htmlFor="faculty-reject-comment">Comments for the student</Label>
                        <Textarea
                            id="faculty-reject-comment"
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
                        <Button type="button" variant="destructive" onClick={() => void confirmReject()} disabled={rejectSubmitting}>
                            {rejectSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…
                                </>
                            ) : (
                                <>
                                    <XCircle className="w-4 h-4 mr-2" /> Submit rejection
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function formatHistoryStatus(project: FacultyApprovalRow): string {
    const st = (project.opportunityStatus || "").replace(/_/g, " ").trim();
    const ws = (project.workflowStage || "").replace(/_/g, " ").trim();
    if (ws) return ws;
    if (st) return st;
    return "In workflow";
}

function formatApprovalMetric(value?: number): string | number {
    if (typeof value !== "number" || Number.isNaN(value) || value <= 0) return "—";
    return value;
}
