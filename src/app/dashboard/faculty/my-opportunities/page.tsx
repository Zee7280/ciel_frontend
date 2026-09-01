"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { authenticatedFetch } from "@/utils/api";
import { AlertTriangle, ChevronRight, Info, Loader2, MoreVertical, Pencil, Plus, Search, Users } from "lucide-react";
import { getStoredCurrentUserEmail } from "@/utils/currentUser";
import { toast } from "sonner";
import {
    canEditReturnedOpportunity,
    extractOpportunityReviewFeedback,
    isOpportunityPermanentlyRejected,
    isOpportunityPubliclyLive,
    resolvePartnerOpportunityListLabels,
} from "@/utils/opportunityWorkflow";
import { extractFacultyMineOpportunityRows } from "@/utils/facultyMineOpportunities";

type Row = {
    id: string;
    title: string;
    status: string;
    workflow_stage?: string | null;
    partner_approval_status?: string | null;
    admin_approval_status?: string | null;
    requires_partner_approval?: boolean;
    created_at?: string;
    mode?: string;
    applicants_count?: number;
    remaining_seats?: number;
    volunteers_required?: number;
    expected_hours?: number;
    organization_name?: string | null;
    partner_name?: string | null;
    admin_approved?: boolean;
    rejection_reason?: string | null;
    review_feedback?: string | null;
};

type StatusTab = "all" | "live" | "review" | "rejected";
type StepTone = "done" | "current" | "pending" | "rejected";

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

function asRecord(row: Row): Record<string, unknown> {
    return row as unknown as Record<string, unknown>;
}

function lower(value: unknown): string {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isApprovedStatus(value: unknown): boolean {
    return ["approved", "verified", "accepted", "complete", "completed"].includes(lower(value));
}

function isRejectedStatus(value: unknown): boolean {
    return ["rejected", "declined", "denied"].includes(lower(value));
}

/** faculty/mine `status` is already API-normalized — `live` only after CIEL admin approve. */
function isMineLive(row: Row): boolean {
    if (isOpportunityPubliclyLive(asRecord(row))) return true;
    return lower(row.status) === "live";
}

function listTab(row: Row): Exclude<StatusTab, "all"> {
    if (isMineLive(row)) return "live";
    const tone = resolvePartnerOpportunityListLabels(asRecord(row)).badgeTone;
    if (tone === "rejected") return "rejected";
    return "review";
}

function statusDotClass(tone: "live" | "review" | "rejected" | "neutral"): string {
    if (tone === "live") return "bg-emerald-500";
    if (tone === "review") return "bg-amber-500";
    if (tone === "rejected") return "bg-rose-500";
    return "bg-slate-400";
}

function statusTextClass(tone: "live" | "review" | "rejected" | "neutral"): string {
    if (tone === "live") return "text-emerald-700";
    if (tone === "review") return "text-amber-700";
    if (tone === "rejected") return "text-rose-700";
    return "text-slate-500";
}

function formatMode(mode?: string): string | null {
    if (!mode?.trim()) return null;
    const key = mode.trim().toLowerCase().replace(/[_-]+/g, " ");
    if (key === "onsite" || key === "on site") return "On site";
    if (key === "hybrid") return "Hybrid";
    if (key === "remote" || key === "online") return "Remote";
    return mode.trim();
}

function formatCreated(value?: string): string {
    if (!value) return "Created —";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Created —";
    return `Created ${date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
}

function partnerLabel(row: Row): string {
    const name = (row.partner_name || row.organization_name || "").trim();
    return name || "No partner organisation";
}

function titleKey(title: string): string {
    return title.trim().toLowerCase().replace(/\s+/g, " ");
}

function pipelineSteps(row: Row): { key: string; label: string; tone: StepTone }[] {
    const live = isMineLive(row);
    const rejected = isOpportunityPermanentlyRejected(asRecord(row));
    const partnerRequired = Boolean(row.requires_partner_approval);
    const partnerRejected = isRejectedStatus(row.partner_approval_status);
    const adminRejected = isRejectedStatus(row.admin_approval_status) || rejected;
    const partnerDone = !partnerRequired || isApprovedStatus(row.partner_approval_status);
    const adminDone = live || isApprovedStatus(row.admin_approval_status);
    const stage = lower(row.workflow_stage);

    let partnerTone: StepTone = "pending";
    if (!partnerRequired || partnerDone) partnerTone = "done";
    else if (partnerRejected) partnerTone = "rejected";
    else if (stage.includes("partner") || !adminDone) partnerTone = "current";

    let adminTone: StepTone = "pending";
    if (adminDone) adminTone = "done";
    else if (adminRejected && partnerDone) adminTone = "rejected";
    else if (partnerTone === "current" || partnerTone === "rejected") adminTone = "pending";
    else adminTone = "current";

    const liveTone: StepTone = live ? "done" : "pending";

    return [
        { key: "partner", label: "Partner", tone: partnerTone },
        { key: "admin", label: "CIEL admin", tone: adminTone },
        { key: "live", label: "Live", tone: liveTone },
    ];
}

function stepClass(tone: StepTone): string {
    if (tone === "done") return "bg-emerald-100 text-emerald-800";
    if (tone === "current") return "bg-amber-100 text-amber-800";
    if (tone === "rejected") return "bg-rose-100 text-rose-800";
    return "bg-slate-100 text-slate-500";
}

export default function FacultyMyOpportunitiesPage() {
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState<StatusTab>("all");
    const [newestFirst, setNewestFirst] = useState(true);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [highlightIds, setHighlightIds] = useState<string[]>([]);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const next = new URLSearchParams(window.location.search).get("tab");
        if (next === "all" || next === "live" || next === "review" || next === "rejected") {
            setTab(next);
        }
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                const params = new URLSearchParams({ scope: "authored" });
                const facultyEmail = getStoredCurrentUserEmail();
                if (facultyEmail) params.set("faculty_email", facultyEmail);

                const res = await authenticatedFetch(
                    `/api/v1/opportunities/faculty/mine?${params.toString()}`,
                );
                if (res?.ok) {
                    const data = await res.json();
                    if (data.success === false) {
                        setRows([]);
                    } else {
                        const baseRows = extractFacultyMineOpportunityRows(data).map((raw) => {
                            const id = String(raw.id ?? raw._id ?? raw.opportunity_id ?? "");
                            return { ...raw, id } as Row;
                        }).filter((row) => row.id);
                        const rowsWithRemarks = await Promise.all(
                            baseRows.map(async (row) => {
                                const feedbackFromList = extractOpportunityReviewFeedback(asRecord(row));
                                const safeListFeedback = sanitizeReviewFeedback(feedbackFromList);
                                if (safeListFeedback) {
                                    return { ...row, review_feedback: safeListFeedback };
                                }
                                const needsDetailRemarks =
                                    canEditReturnedOpportunity(asRecord(row)) ||
                                    isOpportunityPermanentlyRejected(asRecord(row)) ||
                                    lower(row.status) === "rejected";
                                if (!needsDetailRemarks) {
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

    useEffect(() => {
        const close = (event: MouseEvent) => {
            if (!listRef.current?.contains(event.target as Node)) setOpenMenuId(null);
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, []);

    const duplicateGroups = useMemo(() => {
        const grouped = new Map<string, Row[]>();
        for (const row of rows) {
            const key = titleKey(row.title || "");
            if (!key) continue;
            const list = grouped.get(key) ?? [];
            list.push(row);
            grouped.set(key, list);
        }
        return [...grouped.values()].filter((group) => group.length >= 2);
    }, [rows]);

    const counts = useMemo(() => {
        const next = { all: rows.length, live: 0, review: 0, rejected: 0 };
        for (const row of rows) next[listTab(row)] += 1;
        return next;
    }, [rows]);

    const visibleRows = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return rows
            .filter((row) => (tab === "all" ? true : listTab(row) === tab))
            .filter((row) => {
                if (!needle) return true;
                const hay = `${row.title} ${partnerLabel(row)} ${row.mode ?? ""}`.toLowerCase();
                return hay.includes(needle);
            })
            .sort((a, b) => {
                const ta = new Date(a.created_at || 0).getTime();
                const tb = new Date(b.created_at || 0).getTime();
                const na = Number.isFinite(ta) ? ta : 0;
                const nb = Number.isFinite(tb) ? tb : 0;
                return newestFirst ? nb - na : na - nb;
            });
    }, [rows, search, tab, newestFirst]);

    const compareDuplicates = () => {
        const group = duplicateGroups[0];
        if (!group) return;
        setTab("all");
        setSearch(group[0].title);
        setHighlightIds(group.map((row) => row.id));
        requestAnimationFrame(() => {
            document.getElementById(`faculty-opp-${group[0].id}`)?.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        });
    };

    return (
        <div className="mx-auto max-w-5xl space-y-5 p-0 pb-20 sm:p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-[28px] font-bold tracking-tight text-slate-900">My opportunities</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Opportunities you created. Once approved they go live and students can apply.
                    </p>
                </div>
                <Link
                    href="/dashboard/faculty/create-opportunity"
                    className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0e7d74] px-4 text-sm font-semibold text-white hover:bg-[#0c6b64] sm:w-auto"
                >
                    <Plus className="h-4 w-4" />
                    Create opportunity
                </Link>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-slate-100 px-4 py-2.5 text-[13px] text-slate-600">
                <span className="font-medium text-slate-500">Approval order</span>
                <span className="font-medium text-slate-800">Partner if added</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-medium text-slate-800">CIEL admin</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-medium text-slate-800">Live for students</span>
            </div>

            {duplicateGroups.length > 0 ? (
                <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-start gap-2 text-sm text-amber-950">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        <span>
                            Two opportunities look like the same project. “{duplicateGroups[0][0].title}” appears{" "}
                            {duplicateGroups[0].length} times
                            {duplicateGroups.length > 1 ? ` (and ${duplicateGroups.length - 1} more title match${duplicateGroups.length === 2 ? "" : "es"})` : ""}.
                            Compare them before students apply.
                        </span>
                    </p>
                    <button
                        type="button"
                        onClick={compareDuplicates}
                        className="shrink-0 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-amber-50"
                    >
                        Compare them
                    </button>
                </div>
            ) : null}

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <label className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search your opportunities"
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none ring-teal-600/20 placeholder:text-slate-400 focus:border-teal-600 focus:ring-2"
                    />
                </label>
                <div className="flex flex-wrap items-center gap-1 rounded-full bg-slate-100 p-1">
                    {(
                        [
                            ["all", "All", counts.all],
                            ["live", "Live", counts.live],
                            ["review", "Under review", counts.review],
                            ["rejected", "Rejected", counts.rejected],
                        ] as const
                    ).map(([key, label, count]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setTab(key)}
                            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                                tab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            {label} {count}
                        </button>
                    ))}
                </div>
                <select
                    value={newestFirst ? "newest" : "oldest"}
                    onChange={(event) => setNewestFirst(event.target.value === "newest")}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-teal-600"
                >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                </select>
            </div>

            {loading ? (
                <div className="flex justify-center py-24">
                    <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
                </div>
            ) : rows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
                    <p className="text-slate-600">You have not created any opportunities yet.</p>
                    <Link
                        href="/dashboard/faculty/create-opportunity"
                        className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#0e7d74] px-4 text-sm font-semibold text-white hover:bg-[#0c6b64]"
                    >
                        <Plus className="h-4 w-4" />
                        Create your first opportunity
                    </Link>
                </div>
            ) : visibleRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white py-14 text-center text-sm text-slate-500">
                    No opportunities match this search or filter.
                </div>
            ) : (
                <div ref={listRef} className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100 bg-white">
                    {visibleRows.map((row) => {
                        const labels = resolvePartnerOpportunityListLabels(asRecord(row));
                        const live = isMineLive(row);
                        const badgeTone = live ? "live" : labels.badgeTone;
                        const primaryLabel = live ? "Live" : labels.primaryLabel;
                        const applicants = Number(row.applicants_count) || 0;
                        const remaining = Number(row.remaining_seats) || 0;
                        const totalSeats =
                            Number(row.volunteers_required) > 0
                                ? Number(row.volunteers_required)
                                : applicants + remaining;
                        const taken = totalSeats > 0 ? Math.min(applicants, totalSeats) : applicants;
                        const pct = totalSeats > 0 ? Math.min(100, (taken / totalSeats) * 100) : 0;
                        const hours = Number(row.expected_hours) || 0;
                        const mode = formatMode(row.mode);
                        const rejectedCopy = row.review_feedback || row.rejection_reason || null;
                        const editHref = `/dashboard/faculty/create-opportunity?edit=${encodeURIComponent(row.id)}`;
                        const highlighted = highlightIds.includes(row.id);
                        const steps = pipelineSteps(row);

                        return (
                            <article
                                key={row.id}
                                id={`faculty-opp-${row.id}`}
                                className={`px-4 py-5 sm:px-5 ${highlighted ? "bg-amber-50/70" : "bg-white"}`}
                            >
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="truncate text-[15px] font-semibold text-slate-900">{row.title}</h2>
                                            <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${statusTextClass(badgeTone)}`}>
                                                <span className={`h-2 w-2 rounded-full ${statusDotClass(badgeTone)}`} />
                                                {primaryLabel}
                                            </span>
                                        </div>
                                        <p className="text-[13px] text-slate-500">
                                            {row.expected_hours != null ? `${hours} hours credit • ` : ""}
                                            {mode ? `${mode} • ` : ""}
                                            {partnerLabel(row)}
                                            {` • ${formatCreated(row.created_at)}`}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {steps.map((step, index) => (
                                                <span key={step.key} className="inline-flex items-center gap-1.5">
                                                    {index > 0 ? <ChevronRight className="h-3 w-3 text-slate-300" /> : null}
                                                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${stepClass(step.tone)}`}>
                                                        {step.label}
                                                    </span>
                                                </span>
                                            ))}
                                        </div>
                                        {badgeTone === "rejected" && rejectedCopy ? (
                                            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-800">
                                                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                                                <p>Rejected: {rejectedCopy}</p>
                                            </div>
                                        ) : row.review_feedback ? (
                                            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-800">
                                                {row.review_feedback}
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
                                        <div className="min-w-[168px]">
                                            <p className="text-[13px] text-slate-500">
                                                {applicants} applicant{applicants === 1 ? "" : "s"}
                                                {totalSeats > 0 ? ` • ${taken} of ${totalSeats} seats taken` : ""}
                                            </p>
                                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-800" : "bg-teal-700"}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Link
                                                href="/dashboard/faculty/join-applications"
                                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                            >
                                                <Users className="h-4 w-4" />
                                                Applicants
                                            </Link>
                                            <Link
                                                href={editHref}
                                                title="Edit opportunity"
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Link>
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    aria-label="More actions"
                                                    onClick={() => setOpenMenuId((current) => (current === row.id ? null : row.id))}
                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                </button>
                                                {openMenuId === row.id ? (
                                                    <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                                                        <Link
                                                            href={editHref}
                                                            className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                                            onClick={() => setOpenMenuId(null)}
                                                        >
                                                            Edit listing
                                                        </Link>
                                                        <Link
                                                            href="/dashboard/faculty/join-applications"
                                                            className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                                            onClick={() => setOpenMenuId(null)}
                                                        >
                                                            View applicants
                                                        </Link>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
