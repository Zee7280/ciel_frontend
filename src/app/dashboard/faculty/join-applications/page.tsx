"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Clock, Loader2, XCircle } from "lucide-react";
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
import { FacultyOpportunityDetailBody } from "@/components/faculty/FacultyOpportunityDetailBody";

export default function FacultyJoinApplicationsPage() {
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

    const [listingOpen, setListingOpen] = useState(false);
    const [listingLoading, setListingLoading] = useState(false);
    const [listingRecord, setListingRecord] = useState<Record<string, unknown> | null>(null);

    const openListingModal = async (opportunityId: string) => {
        setListingOpen(true);
        setListingLoading(true);
        setListingRecord(null);
        try {
            const res = await authenticatedFetch(`/api/v1/opportunities/detail`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: opportunityId }),
            });
            if (!res?.ok) {
                toast.error("Could not load opportunity details");
                setListingOpen(false);
                return;
            }
            const json = await res.json();
            const d = json?.data as Record<string, unknown> | undefined;
            if (!d) {
                toast.error("Opportunity not found");
                setListingOpen(false);
                return;
            }
            setListingRecord(d);
        } catch {
            toast.error("Could not load opportunity details");
            setListingOpen(false);
        } finally {
            setListingLoading(false);
        }
    };

    const loadLists = async () => {
        setIsLoading(true);
        try {
            const pendingRes = await authenticatedFetch(`/api/v1/faculty/applications?status=pending`);
            if (pendingRes?.ok) {
                const j = await pendingRes.json();
                setPendingRows(normalizeOpportunityApplicationsListResponse(j));
            } else {
                toast.error("Could not load pending join applications");
                setPendingRows([]);
            }

            const { rows: historyList, matchedStatus: historyStatus } = await fetchJoinApplicationsHistoryRows(
                "/api/v1/faculty/applications",
            );
            setHistoryRows(historyList);
            setHistoryLoadError(
                pendingRes?.ok && historyStatus === null
                    ? `History could not be loaded. Tried status=${ADMIN_APPLICATIONS_HISTORY_STATUS_TRY_ORDER.join(", ")} — align GET /faculty/applications with one of these (or implement on the server).`
                    : null,
            );
        } catch (e) {
            console.error(e);
            toast.error("Failed to load join applications");
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
            [r.opportunityTitle, r.studentName, r.studentEmail, r.status, r.id].join(" ").toLowerCase().includes(q),
        );
    }, [visible, search]);

    const handleApprove = async (applicationId: string) => {
        if (approveSubmittingId === applicationId) return;
        setApproveSubmittingId(applicationId);
        try {
            const res = await authenticatedFetch(`/api/v1/faculty/applications/${applicationId}/approve`, {
                method: "POST",
            });
            if (res?.ok) {
                toast.success("Application approved");
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
            const res = await authenticatedFetch(`/api/v1/faculty/applications/${rejectTargetId}/reject`, {
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
                <h1 className="text-3xl font-bold text-slate-900">Join applications</h1>
                <p className="text-slate-500 max-w-3xl">
                    Students who applied to join partner-listed opportunities appear here. This is separate from{" "}
                    <Link href="/dashboard/faculty/approvals" className="text-blue-600 font-medium hover:underline">
                        Project Approvals
                    </Link>{" "}
                    (student-created listings). Approve to send the request to CIEL admin for final enrollment.
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

            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by student, opportunity, or application id…"
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
                        <h3 className="text-lg font-bold text-slate-900">{tab === "pending" ? "No pending applications" : "No history yet"}</h3>
                        <p className="text-slate-500">When students apply to opportunities where you are the listed faculty contact, they will show here.</p>
                    </div>
                ) : (
                    filtered.map((row) => (
                        <Card key={row.id} className="overflow-hidden">
                            <div className="flex flex-col md:flex-row">
                                <div className="flex-1 space-y-3 p-5 sm:p-6">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-bold text-lg text-slate-900">{row.opportunityTitle}</h3>
                                        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px]">
                                            App {formatDisplayId(row.id, "APP")}
                                        </Badge>
                                        {tab === "pending" ? (
                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                                <Clock className="w-3 h-3 mr-1" /> Pending faculty
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                                                {row.status}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-slate-600 text-sm">
                                        <strong>{row.studentName}</strong>
                                        {row.studentEmail ? <span className="break-all text-slate-500"> · {row.studentEmail}</span> : null}
                                    </p>
                                    <p className="text-xs text-slate-400 font-mono">
                                        Opportunity ID: {formatDisplayId(row.opportunityId, "OPP")}
                                    </p>
                                </div>
                                <div className="flex w-full flex-col justify-center gap-3 border-t border-slate-100 bg-slate-50 p-5 sm:flex-row md:w-52 md:flex-col md:border-l md:border-t-0 md:p-6">
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
                                    <button
                                        type="button"
                                        onClick={() => void openListingModal(row.opportunityId)}
                                        className="inline-flex h-10 w-full items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50"
                                    >
                                        View listing
                                    </button>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            <Dialog
                open={listingOpen}
                onOpenChange={(open) => {
                    setListingOpen(open);
                    if (!open) setListingRecord(null);
                }}
            >
                <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Opportunity listing</DialogTitle>
                        <DialogDescription>
                            Full opportunity details (same view as faculty project review). Use Approve / Reject on the card
                            for this join application.
                        </DialogDescription>
                    </DialogHeader>
                    {listingLoading ? (
                        <div className="flex justify-center py-12 text-slate-500">
                            <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                    ) : listingRecord ? (
                        <FacultyOpportunityDetailBody d={listingRecord} />
                    ) : null}
                </DialogContent>
            </Dialog>

            <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                <DialogContent className="w-[calc(100vw-2rem)] max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Reject application</DialogTitle>
                        <DialogDescription>Your comments help the student understand what to change.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label htmlFor="rej">Feedback</Label>
                        <Textarea
                            id="rej"
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
