"use client";

import type { MutableRefObject } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    Building2,
    CheckCircle2,
    ClipboardList,
    Inbox,
    Loader2,
    RefreshCw,
    Search,
    TrendingUp,
} from "lucide-react";
import clsx from "clsx";
import AttendancePendingQueuePanel from "@/components/engagement/AttendancePendingQueuePanel";

export type AttendanceReviewProjectRow = {
    id: string;
    title: string;
    /** Optional subtitle, e.g. university or meta from API */
    subtitle?: string;
};

type ListTab = "all" | "pending";

function pendingHue(n: number): "zero" | "mid" | "high" {
    if (n === 0) return "zero";
    if (n >= 10) return "high";
    return "mid";
}

function PendingCountBadge({ n }: { n: number }) {
    const hue = pendingHue(n);
    return (
        <span
            className={clsx(
                "inline-flex min-w-[2.25rem] items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-black tabular-nums",
                hue === "zero" && "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80",
                hue === "mid" && "bg-amber-50 text-amber-900 ring-1 ring-amber-200/80",
                hue === "high" && "bg-rose-50 text-rose-800 ring-1 ring-rose-200/80",
            )}
        >
            {n}
        </span>
    );
}

export default function AttendanceReviewDashboard({
    backHref,
    backLabel,
    eyebrow,
    title,
    description,
    reviewerBadge = "Review queue",
    projects,
    projectId,
    setProjectId,
    didInitProjectChoiceRef,
    pendingById,
    loading,
    countsLoading,
    onRefreshCounts,
    onQueuePendingCountChanged,
    queueTitle,
    queueDescription,
}: {
    backHref: string;
    backLabel: string;
    eyebrow: string;
    title: string;
    description: string;
    reviewerBadge?: string;
    projects: AttendanceReviewProjectRow[];
    projectId: string;
    setProjectId: (id: string) => void;
    didInitProjectChoiceRef: MutableRefObject<boolean>;
    pendingById: Record<string, number>;
    loading: boolean;
    countsLoading: boolean;
    onRefreshCounts?: () => void | Promise<void>;
    onQueuePendingCountChanged?: (n: number) => void;
    queueTitle: string;
    queueDescription: string;
}) {
    const [listTab, setListTab] = useState<ListTab>("all");
    const [query, setQuery] = useState("");
    const [refreshingCounts, setRefreshingCounts] = useState(false);

    const stats = useMemo(() => {
        const totalPending = Object.values(pendingById).reduce((a, b) => a + b, 0);
        const withBacklog = Object.values(pendingById).filter((n) => n > 0).length;
        return { totalPending, withBacklog };
    }, [pendingById]);

    const filteredRows = useMemo(() => {
        let list = [...projects];
        if (listTab === "pending") {
            list = list.filter((p) => (pendingById[p.id] ?? 0) > 0);
        }
        const q = query.trim().toLowerCase();
        if (q) {
            list = list.filter(
                (p) =>
                    p.title.toLowerCase().includes(q) ||
                    (p.subtitle && p.subtitle.toLowerCase().includes(q)),
            );
        }
        list.sort((a, b) => {
            const da = pendingById[b.id] ?? 0;
            const db = pendingById[a.id] ?? 0;
            if (da !== db) return da - db;
            return a.title.localeCompare(b.title);
        });
        return list;
    }, [projects, pendingById, listTab, query]);

    const selected = projects.find((p) => p.id === projectId) ?? null;
    const handleRowSelect = (id: string) => {
        didInitProjectChoiceRef.current = true;
        setProjectId(id);
    };

    const handleRefreshCounts = async () => {
        if (!onRefreshCounts) return;
        setRefreshingCounts(true);
        try {
            await Promise.resolve(onRefreshCounts());
        } finally {
            setRefreshingCounts(false);
        }
    };

    return (
        <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            <header className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
                <Link
                    href={backHref}
                    className="group inline-flex items-center gap-1.5 rounded-full px-1 text-sm font-semibold text-slate-500 transition-colors hover:text-blue-600"
                >
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                    {backLabel}
                </Link>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">{eyebrow}</p>
                        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
                    </div>
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                        {reviewerBadge}
                    </div>
                </div>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
            </header>

            {loading ? (
                <div className="flex justify-center gap-2 rounded-3xl border border-slate-200 bg-white py-20 text-slate-500 shadow-sm">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-hidden />
                </div>
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                                        Pending sessions
                                    </p>
                                    <p className="mt-3 text-3xl font-black tabular-nums text-slate-950">{stats.totalPending}</p>
                                    <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">
                                        In your routed queue projects
                                    </p>
                                </div>
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                                    <ClipboardList className="h-6 w-6" aria-hidden />
                                </span>
                            </div>
                        </div>
                        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                                        Projects with pending
                                    </p>
                                    <p className="mt-3 text-3xl font-black tabular-nums text-slate-950">
                                        {countsLoading ? "…" : stats.withBacklog}
                                    </p>
                                    <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">Need attention</p>
                                </div>
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                                    <TrendingUp className="h-6 w-6" aria-hidden />
                                </span>
                            </div>
                        </div>
                        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                                        Opportunities listed
                                    </p>
                                    <p className="mt-3 text-3xl font-black tabular-nums text-slate-950">{projects.length}</p>
                                    <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">
                                        From your dashboard role
                                    </p>
                                </div>
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 ring-1 ring-slate-100">
                                    <Building2 className="h-6 w-6" aria-hidden />
                                </span>
                            </div>
                        </div>
                    </div>

                    <div
                        className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-slate-50 p-4 shadow-sm"
                        role="status"
                    >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-blue-100">
                            <Inbox className="h-5 w-5" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5 text-sm leading-6 text-slate-700">
                            {countsLoading ? (
                                <p>Checking which opportunities still have attendance waiting…</p>
                            ) : stats.totalPending === 0 ? (
                                <p>
                                    <span className="font-semibold text-slate-900">No open queue right now.</span> You can still
                                    select an opportunity below to confirm it is cleared.
                                </p>
                            ) : (
                                <p>
                                    <span className="font-semibold text-slate-900">
                                        {stats.totalPending} {stats.totalPending === 1 ? "session" : "sessions"} pending
                                    </span>{" "}
                                    across {stats.withBacklog}{" "}
                                    {stats.withBacklog === 1 ? "opportunity" : "opportunities"}. Pick one on the left; details
                                    load on the right.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-12 xl:gap-8">
                        <div className="space-y-4 xl:col-span-5">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex gap-2 rounded-xl bg-slate-100/90 p-1">
                                    <button
                                        type="button"
                                        onClick={() => setListTab("all")}
                                        className={clsx(
                                            "rounded-lg px-3 py-2 text-xs font-black uppercase tracking-widest transition",
                                            listTab === "all"
                                                ? "bg-white text-slate-900 shadow-sm"
                                                : "text-slate-500 hover:text-slate-800",
                                        )}
                                    >
                                        All projects
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setListTab("pending")}
                                        className={clsx(
                                            "rounded-lg px-3 py-2 text-xs font-black uppercase tracking-widest transition",
                                            listTab === "pending"
                                                ? "bg-white text-slate-900 shadow-sm"
                                                : "text-slate-500 hover:text-slate-800",
                                        )}
                                    >
                                        Pending only
                                    </button>
                                </div>
                                {onRefreshCounts ? (
                                    <button
                                        type="button"
                                        onClick={() => void handleRefreshCounts()}
                                        disabled={refreshingCounts || countsLoading}
                                        className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {refreshingCounts || countsLoading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <RefreshCw className="h-4 w-4" />
                                        )}
                                        Sync counts
                                    </button>
                                ) : null}
                            </div>
                            <label className="relative block">
                                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="search"
                                    placeholder="Search projects…"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                />
                            </label>

                            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                                <div className="max-h-[min(28rem,calc(100vh-22rem))] overflow-y-auto overscroll-contain">
                                    <table className="w-full border-collapse text-left text-sm">
                                        <thead className="sticky top-0 z-[1] border-b border-slate-100 bg-slate-50/95 backdrop-blur">
                                            <tr>
                                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                                                    Project
                                                </th>
                                                <th className="hidden px-3 py-3 text-right text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 sm:table-cell">
                                                    Pending
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredRows.length === 0 ? (
                                                <tr>
                                                    <td colSpan={2} className="px-4 py-10 text-center text-slate-500">
                                                        No matches. Try clearing search or switching to{" "}
                                                        <button
                                                            type="button"
                                                            className="font-semibold text-blue-600 underline"
                                                            onClick={() => setListTab("all")}
                                                        >
                                                            All projects
                                                        </button>
                                                        .
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredRows.map((p) => {
                                                    const n = pendingById[p.id] ?? 0;
                                                    const sel = projectId === p.id;
                                                    return (
                                                        <tr
                                                            key={p.id}
                                                            tabIndex={0}
                                                            className={clsx(
                                                                "cursor-pointer border-b border-slate-50 transition last:border-b-0",
                                                                sel ? "bg-blue-50/80" : "hover:bg-slate-50",
                                                            )}
                                                            onClick={() => handleRowSelect(p.id)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter" || e.key === " ") {
                                                                    e.preventDefault();
                                                                    handleRowSelect(p.id);
                                                                }
                                                            }}
                                                        >
                                                            <td className="px-4 py-3.5">
                                                                <p className="font-bold text-slate-900">{p.title}</p>
                                                                {p.subtitle ? (
                                                                    <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                                                        {p.subtitle}
                                                                    </p>
                                                                ) : null}
                                                                <div className="mt-2 sm:hidden">
                                                                    <PendingCountBadge n={n} />
                                                                </div>
                                                            </td>
                                                            <td className="hidden px-3 py-3.5 text-right align-middle sm:table-cell">
                                                                <PendingCountBadge n={n} />
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 xl:col-span-7">
                            {selected ? (
                                <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/60 p-5 shadow-sm">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                                Selected opportunity
                                            </p>
                                            <h2 className="mt-1 break-words text-lg font-black text-slate-950 sm:text-xl">
                                                {selected.title}
                                            </h2>
                                            {selected.subtitle ? (
                                                <p className="mt-1 text-xs font-semibold text-slate-500">{selected.subtitle}</p>
                                            ) : null}
                                        </div>
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-800">
                                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                                            Queue open
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center text-sm text-slate-500">
                                    Select a project from the list to load its pending attendance.
                                </div>
                            )}

                            <AttendancePendingQueuePanel
                                projectId={projectId}
                                title={queueTitle}
                                description={queueDescription}
                                autoLoadOnProjectIdChange
                                onPendingCountChanged={onQueuePendingCountChanged}
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
