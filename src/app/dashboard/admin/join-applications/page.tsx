"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Clock, GraduationCap, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
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
    ADMIN_APPLICATIONS_HISTORY_STATUS_TRY_ORDER,
    fetchJoinApplicationsHistoryRows,
    normalizeOpportunityApplicationsListResponse,
    type OpportunityApplicationListRow,
} from "@/utils/opportunityApplicationsAdmin";
import { formatDisplayId } from "@/utils/displayIds";

export default function AdminJoinApplicationsPage() {
    const [tab, setTab] = useState<"pending" | "history">("pending");
    const [pendingRows, setPendingRows] = useState<OpportunityApplicationListRow[]>([]);
    const [historyRows, setHistoryRows] = useState<OpportunityApplicationListRow[]>([]);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [approveSubmittingId, setApproveSubmittingId] = useState<string | null>(null);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
    const [rejectComment, setRejectComment] = useState("");
    const [rejectSubmitting, setRejectSubmitting] = useState(false);
    const [historyLoadError, setHistoryLoadError] = useState<string | null>(null);

    const loadLists = async () => {
        setIsLoading(true);
        try {
            const pendingRes = await authenticatedFetch(`/api/v1/admin/applications?status=pending`);
            if (pendingRes?.ok) {
                const j = await pendingRes.json();
                setPendingRows(normalizeOpportunityApplicationsListResponse(j));
            } else {
                toast.error("Could not load admin join queue");
                setPendingRows([]);
            }

            const { rows: historyList, matchedStatus: historyStatus } = await fetchJoinApplicationsHistoryRows(
                "/api/v1/admin/applications",
            );
            setHistoryRows(historyList);
            setHistoryLoadError(
                pendingRes?.ok && historyStatus === null
                    ? `History could not be loaded. Tried status=${ADMIN_APPLICATIONS_HISTORY_STATUS_TRY_ORDER.join(", ")} — align GET /admin/applications with one of these (or implement on the server).`
                    : null,
            );
        } catch (e) {
            console.error(e);
            toast.error("Failed to load applications");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadLists();
    }, []);

    const visible = tab === "pending" ? pendingRows : historyRows;
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return visible;
        return visible.filter((r) =>
            [
                r.opportunityTitle,
                r.studentName,
                r.studentEmail,
                r.status,
                r.id,
                r.applicationStage,
                r.facultyReviewerName,
                r.primaryFacultyEmail,
                r.facultyApprovalStatus,
            ]
                .join(" ")
                .toLowerCase()
                .includes(q),
        );
    }, [visible, search]);

    const handleApprove = async (applicationId: string) => {
        if (approveSubmittingId === applicationId) return;
        setApproveSubmittingId(applicationId);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/applications/${applicationId}/approve`, {
                method: "POST",
            });
            if (res?.ok) {
                toast.success("Application approved — student can be enrolled for reporting.");
                setPendingRows((prev) => prev.filter((r) => r.id !== applicationId));
                void loadLists();
            } else {
                toast.error("Failed to approve");
            }
        } catch {
            toast.error("Error connecting to server");
        } finally {
            setApproveSubmittingId((p) => (p === applicationId ? null : p));
        }
    };

    const openReject = (id: string) => {
        setRejectTargetId(id);
        setRejectComment("");
        setRejectOpen(true);
    };

    const confirmReject = async () => {
        if (!rejectTargetId) return;
        const reason = rejectComment.trim();
        if (reason.length < 3) {
            toast.error("Please add feedback (at least 3 characters).");
            return;
        }
        setRejectSubmitting(true);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/applications/${rejectTargetId}/reject`, {
                method: "POST",
                body: JSON.stringify({ reason }),
            });
            if (res?.ok) {
                toast.success("Application rejected");
                setPendingRows((prev) => prev.filter((r) => r.id !== rejectTargetId));
                setRejectOpen(false);
                setRejectTargetId(null);
                void loadLists();
            } else {
                toast.error("Failed to reject");
            }
        } catch {
            toast.error("Error connecting to server");
        } finally {
            setRejectSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 pb-20">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Join applications (CIEL)</h1>
                <p className="text-slate-500 max-w-3xl">
                    Final queue for students who applied to partner opportunities (after faculty where required). Approving
                    here should create enrollment / participation so the student can open their report. This is separate from
                    the legacy{" "}
                    <Link href="/dashboard/admin/approvals" className="text-blue-600 font-medium hover:underline">
                        Approvals
                    </Link>{" "}
                    screen for other workflows.
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button variant={tab === "pending" ? "default" : "outline"} size="sm" className="h-9" onClick={() => setTab("pending")}>
                    Pending
                </Button>
                <Button variant={tab === "history" ? "default" : "outline"} size="sm" className="h-9" onClick={() => setTab("history")}>
                    History
                </Button>
            </div>

            {tab === "history" && historyLoadError ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                    {historyLoadError}
                </div>
            ) : null}

            <div className="flex gap-4 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search…"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>

            <div className="grid gap-6">
                {isLoading ? (
                    <div className="text-center py-12 text-slate-500 text-sm flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" /> Loading…
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                        <h3 className="text-lg font-bold text-slate-900">{tab === "pending" ? "Queue is empty" : "No history yet"}</h3>
                        <p className="text-slate-500">
                            After faculty approves, requests appear here in Pending for final CIEL action. History loads when the
                            API accepts a supported history filter.
                        </p>
                    </div>
                ) : (
                    filtered.map((row) => (
                        <Card key={row.id} className="overflow-hidden">
                            <div className="flex flex-col md:flex-row">
                                <div className="p-6 flex-1 space-y-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-bold text-lg text-slate-900">{row.opportunityTitle}</h3>
                                        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px]">
                                            App {formatDisplayId(row.id, "APP")}
                                        </Badge>
                                        {tab === "pending" ? (
                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                                <Clock className="w-3 h-3 mr-1" /> Pending admin
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                                                {row.status}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-slate-600 text-sm">
                                        <strong>{row.studentName}</strong>
                                        {row.studentEmail ? <span className="text-slate-500"> · {row.studentEmail}</span> : null}
                                    </p>
                                    <p className="text-xs text-slate-400 font-mono">Opportunity: {formatDisplayId(row.opportunityId, "OPP")}</p>

                                    {tab === "pending" ? (
                                        <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 space-y-1.5 text-xs text-emerald-950">
                                            <div className="flex items-start gap-2 font-semibold text-emerald-900">
                                                <GraduationCap className="w-4 h-4 shrink-0 mt-0.5" />
                                                <span>Faculty review complete — awaiting your final approval</span>
                                            </div>
                                            <p className="text-emerald-800/90 pl-6 leading-relaxed">
                                                This application already passed the faculty supervisor step and is in the CIEL admin
                                                queue only. Approving here should enroll the student for reporting.
                                            </p>
                                            {(row.applicationStage ||
                                                row.facultyApprovedAt ||
                                                row.facultyReviewerName ||
                                                row.facultyApprovalStatus ||
                                                row.primaryFacultyEmail) && (
                                                <ul className="pl-6 mt-1 space-y-0.5 text-emerald-900/85 font-medium list-disc list-inside">
                                                    {row.applicationStage ? (
                                                        <li>
                                                            Pipeline stage:{" "}
                                                            <span className="font-mono">{row.applicationStage}</span>
                                                        </li>
                                                    ) : null}
                                                    {row.facultyApprovalStatus ? (
                                                        <li>
                                                            Faculty status:{" "}
                                                            <span className="capitalize">{row.facultyApprovalStatus.replace(/_/g, " ")}</span>
                                                        </li>
                                                    ) : null}
                                                    {row.facultyReviewerName ? <li>Reviewer: {row.facultyReviewerName}</li> : null}
                                                    {row.facultyApprovedAt ? (
                                                        <li>
                                                            Faculty action at:{" "}
                                                            {(() => {
                                                                const d = new Date(row.facultyApprovedAt);
                                                                return Number.isNaN(d.getTime())
                                                                    ? row.facultyApprovedAt
                                                                    : d.toLocaleString();
                                                            })()}
                                                        </li>
                                                    ) : null}
                                                    {row.primaryFacultyEmail ? (
                                                        <li>Primary faculty email: {row.primaryFacultyEmail}</li>
                                                    ) : null}
                                                </ul>
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                                <div className="bg-slate-50 border-t md:border-t-0 md:border-l border-slate-100 p-6 flex flex-row md:flex-col justify-center gap-3 w-full md:w-52">
                                    {tab === "pending" ? (
                                        <>
                                            <Button
                                                className="w-full bg-green-600 hover:bg-green-700"
                                                onClick={() => void handleApprove(row.id)}
                                                disabled={approveSubmittingId === row.id}
                                            >
                                                {approveSubmittingId === row.id ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Approving…
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle className="w-4 h-4 mr-2" /> Approve
                                                    </>
                                                )}
                                            </Button>
                                            <Button variant="destructive" className="w-full" onClick={() => openReject(row.id)}>
                                                <XCircle className="w-4 h-4 mr-2" /> Reject
                                            </Button>
                                        </>
                                    ) : null}
                                    <Link
                                        href="/dashboard/admin/projects"
                                        className="inline-flex h-10 w-full items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50"
                                    >
                                        Admin projects
                                    </Link>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject application</DialogTitle>
                        <DialogDescription>Optional notes are stored for audit.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label htmlFor="ar">Reason</Label>
                        <Textarea
                            id="ar"
                            value={rejectComment}
                            onChange={(e) => setRejectComment(e.target.value)}
                            rows={4}
                            placeholder="Reason for rejection…"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" disabled={rejectSubmitting} onClick={() => void confirmReject()}>
                            {rejectSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
