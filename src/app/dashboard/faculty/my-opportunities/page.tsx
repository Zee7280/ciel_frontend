"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authenticatedFetch } from "@/utils/api";
import { Button } from "@/app/dashboard/student/report/components/ui/button";
import { Badge } from "@/app/dashboard/student/report/components/ui/badge";
import { Loader2, Pencil, Plus } from "lucide-react";
import { getStoredCurrentUserEmail } from "@/utils/currentUser";
import { toast } from "sonner";
import { canEditReturnedOpportunity, extractOpportunityReviewFeedback } from "@/utils/opportunityWorkflow";

type Row = {
    id: string;
    title: string;
    status: string;
    workflow_stage?: string | null;
    created_at?: string;
    mode?: string;
    sdg?: string;
    applicants_count?: number;
    remaining_seats?: number;
    organization_name?: string | null;
    review_feedback?: string | null;
};

function statusBadgeClass(status: string) {
    const s = status?.toLowerCase() || "";
    if (s === "active" || s === "live") return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (s === "rejected") return "bg-red-100 text-red-800 border-red-200";
    if (s.includes("pending") || s === "draft") return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
}

function isLikelyMachineId(text: string): boolean {
    const value = text.trim();
    if (!value) return false;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
        return true;
    }
    if (/^[0-9a-f]{24,}$/i.test(value)) return true;
    if (!/\s/.test(value) && /[0-9]/.test(value) && value.length >= 20 && /[-_]/.test(value)) return true;
    return false;
}

function sanitizeReviewFeedback(value: string | null | undefined): string | null {
    if (!value) return null;
    const normalized = value.trim();
    if (!normalized) return null;
    return isLikelyMachineId(normalized) ? null : normalized;
}

export default function FacultyMyOpportunitiesPage() {
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const facultyEmail = getStoredCurrentUserEmail();
                const params = new URLSearchParams();
                if (facultyEmail) params.set("faculty_email", facultyEmail);

                const res = await authenticatedFetch(
                    `/api/v1/opportunities/faculty/mine${params.toString() ? `?${params.toString()}` : ""}`,
                );
                if (res?.ok) {
                    const data = await res.json();
                    if (data.success && Array.isArray(data.data)) {
                        const baseRows = data.data as Row[];
                        const rowsWithRemarks = await Promise.all(
                            baseRows.map(async (row) => {
                                const feedbackFromList = extractOpportunityReviewFeedback(
                                    row as unknown as Record<string, unknown>,
                                );
                                const safeListFeedback = sanitizeReviewFeedback(feedbackFromList);
                                if (safeListFeedback) {
                                    return { ...row, review_feedback: safeListFeedback };
                                }
                                if (!canEditReturnedOpportunity(row as unknown as Record<string, unknown>)) {
                                    return row;
                                }
                                try {
                                    const detailRes = await authenticatedFetch(`/api/v1/opportunities/detail`, {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ id: row.id }),
                                    });
                                    if (!detailRes?.ok) return row;
                                    const detailJson = await detailRes.json();
                                    const detail = detailJson?.data as Record<string, unknown> | undefined;
                                    if (!detail) return row;
                                    const feedbackFromDetail = extractOpportunityReviewFeedback(detail);
                                    const safeDetailFeedback = sanitizeReviewFeedback(feedbackFromDetail);
                                    return safeDetailFeedback ? { ...row, review_feedback: safeDetailFeedback } : row;
                                } catch {
                                    return row;
                                }
                            }),
                        );
                        setRows(rowsWithRemarks);
                    } else {
                        setRows([]);
                    }
                } else {
                    toast.error("Could not load your opportunities");
                    setRows([]);
                }
            } catch {
                toast.error("Could not load your opportunities");
                setRows([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-4 pb-20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">My Opportunities</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Opportunities you created. Approval order: optional partner (if you added one) → CIEL Admin → LIVE.
                        After approval, monitor applicants and use Student Grading for academic oversight.
                    </p>
                </div>
                <Link href="/dashboard/faculty/create-opportunity">
                    <Button className="gap-2">
                        <Plus className="w-4 h-4" />
                        Create opportunity
                    </Button>
                </Link>
            </div>

            {loading ? (
                <div className="flex justify-center py-24">
                    <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
                </div>
            ) : rows.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
                    <p className="text-slate-600 mb-4">You have not created any opportunities yet.</p>
                    <Link href="/dashboard/faculty/create-opportunity">
                        <Button>Create your first opportunity</Button>
                    </Link>
                </div>
            ) : (
                <ul className="space-y-3">
                    {rows.map((r) => (
                        <li
                            key={r.id}
                            className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                        >
                            <div className="space-y-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="font-semibold text-slate-900 truncate">{r.title}</h2>
                                    <Badge variant="outline" className={statusBadgeClass(r.status)}>
                                        {r.status?.replace(/_/g, " ") || "—"}
                                    </Badge>
                                    {r.workflow_stage ? (
                                        <Badge variant="outline" className="text-xs font-normal text-slate-600">
                                            {String(r.workflow_stage).replace(/_/g, " ")}
                                        </Badge>
                                    ) : null}
                                </div>
                                <p className="text-xs text-slate-500">
                                    {r.created_at
                                        ? new Date(r.created_at).toLocaleDateString(undefined, {
                                              year: "numeric",
                                              month: "short",
                                              day: "numeric",
                                          })
                                        : "—"}
                                    {r.sdg ? ` · ${r.sdg}` : ""}
                                    {r.mode ? ` · ${r.mode}` : ""}
                                    {r.organization_name ? ` · ${r.organization_name}` : ""}
                                </p>
                                <p className="text-xs text-slate-400">
                                    Applicants: {r.applicants_count ?? 0}
                                    {typeof r.remaining_seats === "number"
                                        ? ` · Seats left: ${r.remaining_seats}`
                                        : ""}
                                </p>
                                {r.review_feedback ? (
                                    <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">
                                            Rejection remarks
                                        </p>
                                        <p className="mt-1 text-xs text-rose-900 whitespace-pre-wrap">
                                            {r.review_feedback}
                                        </p>
                                    </div>
                                ) : null}
                            </div>
                            <div className="flex shrink-0 gap-2">
                                <Link href={`/dashboard/faculty/create-opportunity?edit=${encodeURIComponent(r.id)}`}>
                                    <Button variant="outline" size="sm" className="gap-1.5">
                                        <Pencil className="w-3.5 h-3.5" />
                                        Edit
                                    </Button>
                                </Link>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
