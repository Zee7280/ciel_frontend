"use client";

import type { MutableRefObject } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    BookOpen,
    Check,
    ChevronRight,
    Loader2,
    RefreshCw,
    Search,
    Users,
} from "lucide-react";
import clsx from "clsx";
import AttendancePendingQueuePanel from "@/components/engagement/AttendancePendingQueuePanel";

/** Primary accent aligned with Attendance Verification reference */
const accent = "text-[#0056B3]";
const accentRing = "ring-[#0056B3]";
const accentBorder = "border-[#0056B3]";
const accentSoftBg = "bg-[#0056B3]/[0.06]";

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
                "inline-flex min-w-[2rem] items-center justify-center rounded-full px-2.5 py-0.5 text-[11px] font-bold tabular-nums",
                hue === "zero" && "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80",
                hue === "mid" && "bg-amber-100 text-amber-900 ring-1 ring-amber-300/80",
                hue === "high" && "bg-rose-100 text-rose-900 ring-1 ring-rose-300/80",
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
    const selectedPending = projectId ? (pendingById[projectId] ?? 0) : 0;
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

    const breadcrumbProjectLabel = selected ? selected.title : "Choose opportunity";

    return (
        <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            <header className="space-y-5">
                <Link
                    href={backHref}
                    className="group inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-[#0056B3]"
                >
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                    {backLabel}
                </Link>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{eyebrow}</p>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.65rem]">{title}</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{description}</p>
                </div>

                <nav aria-label="Progress" className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-2">
                    <ol className="flex flex-wrap items-center gap-1 text-xs font-medium text-slate-500 sm:text-sm">
                        <li className="text-slate-500">Opportunities</li>
                        <li aria-hidden className="text-slate-300">
                            <ChevronRight className="h-4 w-4" />
                        </li>
                        <li className={clsx("max-w-[min(100vw-8rem,28rem)] truncate", selected ? "text-slate-800" : "text-slate-400")}>
                            {breadcrumbProjectLabel}
                        </li>
                        <li aria-hidden className="text-slate-300">
                            <ChevronRight className="h-4 w-4" />
                        </li>
                        <li className={clsx(selected ? accent : "text-slate-400")}>Review individual records</li>
                    </ol>
                </nav>

                <div className="flex items-center gap-0 overflow-x-auto pb-1">
                    <div className="flex min-w-[200px] flex-1 items-center gap-2">
                        <div
                            className={clsx(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors",
                                projectId
                                    ? clsx("border-[#0056B3] bg-[#0056B3] text-white")
                                    : clsx(accentBorder, accentSoftBg, accent),
                            )}
                        >
                            {projectId ? <Check className="h-4 w-4" strokeWidth={2.5} /> : "1"}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-500">Step 1</p>
                            <p className="truncate text-sm font-semibold text-slate-900">Select opportunity</p>
                        </div>
                    </div>
                    <div className="mx-2 hidden h-px min-w-[1.5rem] flex-1 bg-slate-200 sm:block" />
                    <div className="flex min-w-[200px] flex-1 items-center gap-2">
                        <div
                            className={clsx(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors",
                                projectId
                                    ? clsx(accentBorder, accentSoftBg, accent)
                                    : "border-slate-200 bg-white text-slate-400",
                            )}
                        >
                            2
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-500">Step 2</p>
                            <p className="truncate text-sm font-semibold text-slate-900">Attendance entries</p>
                        </div>
                    </div>
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center rounded-xl border border-slate-200/80 bg-white py-20 shadow-sm">
                    <Loader2 className="h-8 w-8 animate-spin text-[#0056B3]" aria-hidden />
                </div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
                    <div className="space-y-4 lg:col-span-4">
                        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex gap-1 rounded-[10px] bg-slate-100 p-1">
                                    <button
                                        type="button"
                                        onClick={() => setListTab("all")}
                                        className={clsx(
                                            "rounded-lg px-3 py-2 text-xs font-semibold transition",
                                            listTab === "all"
                                                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
                                                : "text-slate-600 hover:text-slate-900",
                                        )}
                                    >
                                        All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setListTab("pending")}
                                        className={clsx(
                                            "rounded-lg px-3 py-2 text-xs font-semibold transition",
                                            listTab === "pending"
                                                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
                                                : "text-slate-600 hover:text-slate-900",
                                        )}
                                    >
                                        Pending
                                    </button>
                                </div>
                                {onRefreshCounts ? (
                                    <button
                                        type="button"
                                        onClick={() => void handleRefreshCounts()}
                                        disabled={refreshingCounts || countsLoading}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[#0056B3]/30 hover:bg-[#0056B3]/[0.04] hover:text-[#0056B3] disabled:cursor-not-allowed disabled:opacity-50"
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

                            <label className="relative mt-4 block">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="search"
                                    placeholder="Search opportunities…"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className="w-full rounded-[10px] border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0056B3]/40 focus:bg-white focus:ring-2 focus:ring-[#0056B3]/15"
                                />
                            </label>

                            <div className="mt-4 max-h-[min(28rem,calc(100vh-14rem))] space-y-2 overflow-y-auto overscroll-contain pr-1">
                                {filteredRows.length === 0 ? (
                                    <div className="rounded-[10px] border border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center text-sm text-slate-600">
                                        No matches. Try{" "}
                                        <button
                                            type="button"
                                            className="font-semibold text-[#0056B3] underline decoration-[#0056B3]/30 underline-offset-2"
                                            onClick={() => setListTab("all")}
                                        >
                                            All
                                        </button>
                                        .
                                    </div>
                                ) : (
                                    filteredRows.map((p) => {
                                        const n = pendingById[p.id] ?? 0;
                                        const sel = projectId === p.id;
                                        return (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => handleRowSelect(p.id)}
                                                className={clsx(
                                                    "relative w-full overflow-hidden rounded-[10px] border px-4 py-3.5 text-left text-sm transition shadow-sm",
                                                    sel
                                                        ? clsx(
                                                              "border-[#0056B3]/35 bg-[#0056B3]/[0.07] shadow-md ring-2",
                                                              accentRing,
                                                              "ring-offset-2 ring-offset-white",
                                                          )
                                                        : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/90",
                                                )}
                                            >
                                                {sel ? (
                                                    <span
                                                        className="absolute left-0 top-0 h-full w-1 rounded-l-[10px] bg-[#0056B3]"
                                                        aria-hidden
                                                    />
                                                ) : null}
                                                <div className="flex items-start justify-between gap-3 pl-0.5">
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-slate-900">{p.title}</p>
                                                        {p.subtitle ? (
                                                            <p className="mt-0.5 text-xs text-slate-500">{p.subtitle}</p>
                                                        ) : null}
                                                    </div>
                                                    <PendingCountBadge n={n} />
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 lg:col-span-8">
                        {selected ? (
                            <>
                                <div className="flex flex-col gap-4">
                                    <div className="flex gap-4 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
                                        <div
                                            className={clsx(
                                                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                                                accentSoftBg,
                                            )}
                                        >
                                            <BookOpen className={clsx("h-6 w-6", accent)} aria-hidden />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Selected opportunity
                                            </p>
                                            <p className="mt-0.5 text-base font-bold text-slate-900">{selected.title}</p>
                                            {selected.subtitle ? (
                                                <p className="mt-1 text-sm text-slate-600">{selected.subtitle}</p>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="flex max-w-md gap-4 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
                                        <div
                                            className={clsx(
                                                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                                                accentSoftBg,
                                            )}
                                        >
                                            <Users className={clsx("h-6 w-6", accent)} aria-hidden />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Pending sessions
                                            </p>
                                            <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">{selectedPending}</p>
                                            <p className="mt-1 text-xs text-slate-500">Awaiting review for this opportunity</p>
                                        </div>
                                    </div>
                                </div>
                                <AttendancePendingQueuePanel
                                    projectId={projectId}
                                    title={queueTitle}
                                    description={queueDescription}
                                    autoLoadOnProjectIdChange
                                    onPendingCountChanged={onQueuePendingCountChanged}
                                />
                            </>
                        ) : (
                            <div className="rounded-xl border border-dashed border-slate-300/90 bg-white px-4 py-16 text-center text-sm text-slate-600 shadow-sm">
                                Select an opportunity from the list to load pending attendance.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
