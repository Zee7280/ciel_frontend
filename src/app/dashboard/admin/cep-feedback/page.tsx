"use client";

import { useCallback, useEffect, useState } from "react";
import {
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    Loader2,
    MessageSquare,
    RefreshCw,
    Search,
    Star,
} from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { Badge } from "@/app/dashboard/student/report/components/ui/badge";
import { Button } from "@/app/dashboard/student/report/components/ui/button";
import { Card } from "@/app/dashboard/student/report/components/ui/card";
import { Input } from "@/app/dashboard/student/report/components/ui/input";

export type CepFeedbackRow = {
    id: string;
    user_id?: string | null;
    user_name?: string | null;
    user_email?: string | null;
    user_role?: string | null;
    account_role?: string | null;
    survey_version?: string | null;
    overall_rating?: number | null;
    sections_ease?: string | null;
    reflect_impact?: string | null;
    most_useful_text?: string | null;
    improvement_text?: string | null;
    created_at?: string | null;
};

type CepFeedbackResponse = {
    success?: boolean;
    data?: CepFeedbackRow[];
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
    };
};

const EASE_LABELS: Record<string, string> = {
    very_easy: "Very easy",
    easy: "Easy",
    neutral: "Neutral",
    difficult: "Difficult",
    very_difficult: "Very difficult",
};

const REFLECT_LABELS: Record<string, string> = {
    yes: "Yes",
    partially: "Partially",
    no: "No",
};

function formatWhen(value?: string | null) {
    if (!value) return "N/A";
    try {
        return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    } catch {
        return "N/A";
    }
}

function humanEase(value?: string | null) {
    if (!value) return "—";
    return EASE_LABELS[value] ?? value.replace(/_/g, " ");
}

function humanReflect(value?: string | null) {
    if (!value) return "—";
    return REFLECT_LABELS[value] ?? value;
}

function ratingTone(rating: number): string {
    if (rating >= 4) return "border-emerald-200 bg-emerald-50 text-emerald-800";
    if (rating === 3) return "border-amber-200 bg-amber-50 text-amber-900";
    return "border-red-200 bg-red-50 text-red-800";
}

function matchesSearch(row: CepFeedbackRow, q: string): boolean {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    const hay = [
        row.user_name,
        row.user_email,
        row.user_role,
        row.account_role,
        row.survey_version,
        row.sections_ease,
        row.reflect_impact,
        row.most_useful_text,
        row.improvement_text,
        row.overall_rating != null ? String(row.overall_rating) : "",
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
    return hay.includes(needle);
}

function RatingStars({ rating }: { rating: number }) {
    return (
        <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
            {[1, 2, 3, 4, 5].map((n) => (
                <Star
                    key={n}
                    className={`h-3.5 w-3.5 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                    strokeWidth={1.5}
                />
            ))}
        </span>
    );
}

export default function AdminCepFeedbackPage() {
    const [rows, setRows] = useState<CepFeedbackRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;
    const [totalItems, setTotalItems] = useState(0);

    const loadFeedback = useCallback(async () => {
        setIsLoading(true);
        setError("");
        try {
            const res = await authenticatedFetch(
                `/api/v1/admin/cep-feedback?page=${currentPage}&limit=${itemsPerPage}`,
                {},
                { redirectToLogin: false },
            );
            if (!res?.ok) {
                setRows([]);
                setTotalItems(0);
                setError("Could not load CEP feedback. Check admin permissions or try again.");
                return;
            }
            const body = (await res.json()) as CepFeedbackResponse;
            if (body.success && Array.isArray(body.data)) {
                setRows(body.data);
                setTotalItems(body.meta?.total ?? body.data.length);
            } else {
                setRows([]);
                setTotalItems(0);
                setError("Unexpected response from CEP feedback API.");
            }
        } catch {
            setRows([]);
            setTotalItems(0);
            setError("Network error while loading CEP feedback.");
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, itemsPerPage]);

    useEffect(() => {
        void loadFeedback();
    }, [loadFeedback]);

    const displayedRows = rows.filter((row) => matchesSearch(row, searchQuery));
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-0 pb-20 sm:p-4">
            <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-slate-900 text-white shadow-lg">
                        <MessageSquare className="h-7 w-7" strokeWidth={2} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">CEP experience feedback</h1>
                        <p className="mt-1 max-w-3xl text-sm text-slate-500 sm:text-base">
                            Student survey responses after report and payment — overall rating, section ease, impact reflection, and open-text
                            suggestions.
                        </p>
                    </div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => void loadFeedback()} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Refresh
                </Button>
            </div>

            <Card className="p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter current page: student, email, rating, comments…"
                            className="pl-9"
                        />
                    </div>
                    <p className="text-sm text-slate-500">
                        {totalItems.toLocaleString()} submission{totalItems === 1 ? "" : "s"}
                    </p>
                </div>
            </Card>

            {error ? (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                </div>
            ) : null}

            {isLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-24">
                    <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
                    <p className="text-sm font-medium text-slate-500">Loading feedback…</p>
                </div>
            ) : displayedRows.length === 0 ? (
                <Card className="py-16 text-center shadow-sm">
                    <MessageSquare className="mx-auto h-10 w-10 text-slate-300" strokeWidth={1.5} />
                    <h3 className="mt-4 text-lg font-bold text-slate-900">No feedback matches</h3>
                    <p className="mt-2 text-sm text-slate-500">
                        Students see the survey after qualifying (report + payment). Submissions will appear here.
                    </p>
                </Card>
            ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
                    <div className="hidden grid-cols-[168px_minmax(0,1.2fr)_100px_minmax(0,120px)_minmax(0,120px)_90px] gap-4 border-b border-slate-100 bg-slate-50/80 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 lg:grid">
                        <span>Submitted</span>
                        <span>Student</span>
                        <span>Rating</span>
                        <span>Sections ease</span>
                        <span>Reflects impact</span>
                        <span>Details</span>
                    </div>
                    <ul role="list">
                        {displayedRows.map((row) => {
                            const rating = Number(row.overall_rating);
                            const hasRating = Number.isFinite(rating) && rating > 0;
                            const isExpanded = expandedId === row.id;
                            return (
                                <li key={row.id} className="border-b border-slate-100 last:border-0">
                                    <button
                                        type="button"
                                        onClick={() => setExpandedId(isExpanded ? null : row.id)}
                                        className="grid w-full gap-3 px-4 py-4 text-left transition hover:bg-slate-50/90 lg:grid-cols-[168px_minmax(0,1.2fr)_100px_minmax(0,120px)_minmax(0,120px)_90px] lg:items-center lg:gap-4"
                                    >
                                        <div className="text-xs tabular-nums text-slate-500">{formatWhen(row.created_at)}</div>
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold text-slate-900">{row.user_name || "Unknown"}</p>
                                            <p className="truncate text-xs text-slate-500">{row.user_email || "—"}</p>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            {hasRating ? (
                                                <>
                                                    <Badge variant="outline" className={`w-fit ${ratingTone(rating)}`}>
                                                        {rating}/5
                                                    </Badge>
                                                    <RatingStars rating={rating} />
                                                </>
                                            ) : (
                                                <span className="text-xs text-slate-400">—</span>
                                            )}
                                        </div>
                                        <div className="text-sm text-slate-700">{humanEase(row.sections_ease)}</div>
                                        <div className="text-sm text-slate-700">{humanReflect(row.reflect_impact)}</div>
                                        <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                                            {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                                            {isExpanded ? "Hide" : "Expand"}
                                        </div>
                                    </button>
                                    {isExpanded ? (
                                        <div className="border-t border-slate-100 bg-slate-50 px-4 py-4">
                                            <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Survey version</p>
                                                    <p className="mt-1 font-mono text-xs text-slate-800">{row.survey_version || "—"}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Role at submit</p>
                                                    <p className="mt-1 text-slate-800">{row.user_role || row.account_role || "—"}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">User ID</p>
                                                    <p className="mt-1 break-all font-mono text-xs text-slate-600">{row.user_id || "—"}</p>
                                                </div>
                                            </div>
                                            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                                    <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Most useful</p>
                                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                                                        {row.most_useful_text?.trim() || "—"}
                                                    </p>
                                                </div>
                                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                                    <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700">Improvements suggested</p>
                                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                                                        {row.improvement_text?.trim() || "—"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            <div className="flex items-center justify-between text-sm text-slate-500">
                <span>
                    Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1 || isLoading}
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    >
                        Previous
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages || isLoading}
                        onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    );
}
