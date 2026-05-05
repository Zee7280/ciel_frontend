"use client";

import type { MutableRefObject } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    BookOpen,
    Check,
    Loader2,
    RefreshCw,
    Search,
    Users,
} from "lucide-react";
import clsx from "clsx";
import AttendancePendingQueuePanel, { type PartnerParticipantChip } from "@/components/engagement/AttendancePendingQueuePanel";

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

function PendingCountBadge({ n, partner }: { n: number; partner?: boolean }) {
    const hue = pendingHue(n);
    return (
        <span
            className={clsx(
                "inline-flex min-w-[2rem] items-center justify-center tabular-nums",
                partner
                    ? "rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                    : "rounded-md px-2 py-0.5 text-[11px] font-semibold",
                hue === "zero" &&
                    (partner
                        ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80"
                        : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"),
                hue === "mid" &&
                    (partner
                        ? "bg-amber-100 text-amber-900 ring-1 ring-amber-300/80"
                        : "bg-amber-50 text-amber-900 ring-1 ring-amber-200"),
                hue === "high" &&
                    (partner
                        ? "bg-rose-100 text-rose-900 ring-1 ring-rose-300/80"
                        : "bg-rose-50 text-rose-800 ring-1 ring-rose-200"),
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
    variant = "default",
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
    /** Partner attendance verification shell; faculty uses plain `default`. */
    variant?: "default" | "partner";
}) {
    const isPartner = variant === "partner";
    const [listTab, setListTab] = useState<ListTab>("all");
    const [query, setQuery] = useState("");
    const [refreshingCounts, setRefreshingCounts] = useState(false);
    const [partnerRoster, setPartnerRoster] = useState<PartnerParticipantChip[]>([]);
    const [partnerQueueRows, setPartnerQueueRows] = useState(0);
    const [selectedParticipantKey, setSelectedParticipantKey] = useState("");

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
    useEffect(() => {
        if (!isPartner) return;
        setPartnerRoster([]);
        setPartnerQueueRows(0);
        setSelectedParticipantKey("");
    }, [projectId, isPartner]);

    useEffect(() => {
        if (!isPartner) return;
        if (partnerRoster.length === 0) return;
        if (!partnerRoster.some((p) => p.key === selectedParticipantKey)) {
            setSelectedParticipantKey(partnerRoster[0].key);
        }
    }, [isPartner, partnerRoster, selectedParticipantKey]);

    const handlePartnerQueueSnapshot = useCallback((summary: { participants: PartnerParticipantChip[]; rowCount: number }) => {
        setPartnerRoster(summary.participants);
        setPartnerQueueRows(summary.rowCount);
    }, []);
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

    const teamCrumbLabel = selected?.subtitle?.trim() || "Team cohort";
    const oppIdTail = projectId.replace(/\W/g, "").slice(-8).toUpperCase() || "—";
    const partnerStepProjectDone = Boolean(projectId && selected);
    const partnerStepMembersDone = partnerRoster.length > 0;
    const partnerStepEntriesActive = partnerQueueRows > 0;

    return (
        <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            <header className={clsx(isPartner ? "space-y-5" : "space-y-4")}>
                <Link
                    href={backHref}
                    className={clsx(
                        "group inline-flex items-center gap-1.5 text-sm font-medium transition-colors",
                        isPartner
                            ? "text-slate-500 hover:text-[#0056B3]"
                            : "text-slate-600 hover:text-slate-900",
                    )}
                >
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                    {backLabel}
                </Link>
                <div>
                    <p
                        className={clsx(
                            "text-xs uppercase tracking-wider text-slate-500",
                            isPartner ? "font-semibold" : "font-medium tracking-wider",
                        )}
                    >
                        {eyebrow}
                    </p>
                    <h1
                        className={clsx(
                            "mt-1 text-2xl tracking-tight text-slate-900",
                            isPartner ? "font-bold sm:text-[1.65rem]" : "font-semibold sm:text-3xl",
                        )}
                    >
                        {title}
                    </h1>
                    <p className={clsx("mt-2 max-w-2xl text-sm text-slate-600", isPartner && "leading-relaxed")}>
                        {description}
                    </p>
                </div>

                {isPartner ? (
                    <>
                        <nav aria-label="Breadcrumb">
                            <p className="text-xs leading-relaxed text-slate-500 sm:text-[13px]">
                                <span className={clsx(selected ? "text-slate-700" : "text-slate-400")}>
                                    {selected?.title ?? "Project title"}
                                </span>
                                <span className="mx-1.5 text-slate-300">→</span>
                                <span className={clsx(selected ? "text-slate-700" : "text-slate-400")}>{teamCrumbLabel}</span>
                                <span className="mx-1.5 text-slate-300">→</span>
                                <span className={clsx(partnerRoster.length > 0 ? "text-slate-700" : "text-slate-400")}>
                                    Group members ({partnerRoster.length})
                                </span>
                                <span className="mx-1.5 text-slate-300">→</span>
                                <span className={clsx(partnerStepEntriesActive ? accent : "text-slate-400")}>
                                    Review individual attendance records
                                </span>
                            </p>
                        </nav>

                        <div
                            aria-label="Verification steps"
                            className="flex flex-wrap items-stretch gap-x-1 gap-y-4 border-b border-slate-100 pb-5 sm:gap-x-2"
                        >
                            {(
                                [
                                    { n: 1, label: "Project title", done: partnerStepProjectDone },
                                    { n: 2, label: "Team name", done: partnerStepProjectDone },
                                    { n: 3, label: "Group members", done: partnerStepMembersDone },
                                    {
                                        n: 4,
                                        label: "Attendance entries",
                                        done: false,
                                        current: partnerStepEntriesActive,
                                    },
                                ] as const
                            ).map((step, i, arr) => {
                                const isDone = Boolean("done" in step && step.done);
                                const isCurrent = Boolean("current" in step && step.current);
                                const pendingPrimary =
                                    !isDone &&
                                    !isCurrent &&
                                    ((step.n === 1 && !partnerStepProjectDone) ||
                                        (step.n === 3 && partnerStepProjectDone && !partnerStepMembersDone));

                                return (
                                    <div
                                        key={step.n}
                                        className={clsx(
                                            "flex min-w-[10rem] flex-1 items-center gap-2.5 sm:min-w-[8rem]",
                                            i < arr.length - 1 && "sm:border-r sm:border-slate-100 sm:pr-2",
                                        )}
                                    >
                                        <div
                                            className={clsx(
                                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors",
                                                isDone &&
                                                    "border-[#0056B3] bg-[#0056B3] text-white shadow-[0_1px_2px_rgba(0,0,0,.06)]",
                                                !isDone &&
                                                    isCurrent &&
                                                    "border-[#0056B3] bg-white text-[#0056B3] shadow-sm ring-2 ring-[#0056B3]/20",
                                                !isDone && !isCurrent && pendingPrimary && clsx(accentBorder, accentSoftBg, accent),
                                                !isDone &&
                                                    !isCurrent &&
                                                    !pendingPrimary &&
                                                    "border-slate-200 bg-white text-slate-400",
                                            )}
                                        >
                                            {isDone ? <Check className="h-5 w-5" strokeWidth={2.5} /> : step.n}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                Step {step.n}
                                            </p>
                                            <p className="truncate text-xs font-semibold text-slate-900 sm:text-sm">{step.label}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : null}
            </header>

            {loading ? (
                <div
                    className={clsx(
                        "flex justify-center border border-slate-200 bg-white py-20",
                        isPartner ? "rounded-xl border-slate-200/80 shadow-sm" : "rounded-lg",
                    )}
                >
                    <Loader2
                        className={clsx("h-8 w-8 animate-spin", isPartner ? "text-[#0056B3]" : "text-slate-400")}
                        aria-hidden
                    />
                </div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
                    <div className="space-y-4 lg:col-span-4">
                        {isPartner ? (
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
                                                        <PendingCountBadge n={n} partner />
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                                        <button
                                            type="button"
                                            onClick={() => setListTab("all")}
                                            className={clsx(
                                                "rounded-md px-3 py-2 text-xs font-medium transition",
                                                listTab === "all"
                                                    ? "bg-white text-slate-900 shadow-sm"
                                                    : "text-slate-600 hover:text-slate-900",
                                            )}
                                        >
                                            All
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setListTab("pending")}
                                            className={clsx(
                                                "rounded-md px-3 py-2 text-xs font-medium transition",
                                                listTab === "pending"
                                                    ? "bg-white text-slate-900 shadow-sm"
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
                                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="search"
                                        placeholder="Search opportunities…"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                                    />
                                </label>

                                <div className="max-h-[min(28rem,calc(100vh-14rem))] space-y-2 overflow-y-auto overscroll-contain pr-1">
                                    {filteredRows.length === 0 ? (
                                        <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-600">
                                            No matches. Try{" "}
                                            <button
                                                type="button"
                                                className="font-medium text-slate-900 underline"
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
                                                        "w-full rounded-lg border px-4 py-3 text-left text-sm transition",
                                                        sel
                                                            ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
                                                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80",
                                                    )}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-slate-900">{p.title}</p>
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
                            </>
                        )}
                    </div>

                    <div className={clsx("lg:col-span-8", isPartner ? "space-y-4" : "space-y-3")}>
                        {selected ? (
                            <>
                                {isPartner ? (
                                    <div className="grid gap-4 lg:grid-cols-3">
                                        <div className="flex gap-4 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm lg:flex-col lg:gap-3">
                                            <div
                                                className={clsx(
                                                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl lg:h-14 lg:w-14",
                                                    accentSoftBg,
                                                )}
                                            >
                                                <BookOpen className={clsx("h-6 w-6 lg:h-7 lg:w-7", accent)} aria-hidden />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                    Selected project
                                                </p>
                                                <p className="mt-1 text-sm font-bold leading-snug text-slate-900 sm:text-base">
                                                    {selected.title}
                                                </p>
                                                {selected.subtitle ? (
                                                    <p className="mt-2 text-xs text-slate-600 sm:text-sm">{selected.subtitle}</p>
                                                ) : null}
                                            </div>
                                        </div>
                                        <div className="flex gap-4 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm lg:flex-col lg:gap-3">
                                            <div
                                                className={clsx(
                                                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl lg:h-14 lg:w-14",
                                                    accentSoftBg,
                                                )}
                                            >
                                                <Users className={clsx("h-6 w-6 lg:h-7 lg:w-7", accent)} aria-hidden />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                    Selected team
                                                </p>
                                                <p className="mt-1 text-sm font-bold leading-snug text-slate-900 sm:text-base">
                                                    {selected.subtitle?.trim() || "Partner organization queue"}
                                                </p>
                                                <p className="mt-2 text-xs font-medium text-slate-600">
                                                    Team ID: OPP-{oppIdTail}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex min-h-[12rem] flex-col rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Group members ({partnerRoster.length})
                                            </p>
                                            <div className="mt-3 max-h-56 flex-1 space-y-2 overflow-y-auto pr-0.5">
                                                {partnerRoster.length === 0 ? (
                                                    <p className="text-sm text-slate-500">
                                                        {partnerQueueRows === 0
                                                            ? "Load the pending queue to see participants from submitted sessions."
                                                            : "No named participants in this queue."}
                                                    </p>
                                                ) : (
                                                    partnerRoster.map((m) => {
                                                        const sel = selectedParticipantKey === m.key;
                                                        return (
                                                            <button
                                                                key={m.key}
                                                                type="button"
                                                                onClick={() => setSelectedParticipantKey(m.key)}
                                                                className={clsx(
                                                                    "flex w-full items-center justify-between gap-2 rounded-[10px] border px-3 py-2.5 text-left text-sm transition",
                                                                    sel
                                                                        ? clsx(
                                                                              "border-[#0056B3]/40 bg-[#0056B3]/[0.08] ring-2",
                                                                              accentRing,
                                                                              "ring-offset-1 ring-offset-white",
                                                                          )
                                                                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80",
                                                                )}
                                                            >
                                                                <span className="min-w-0">
                                                                    <span className="block truncate font-semibold text-slate-900">
                                                                        {m.name}
                                                                    </span>
                                                                    {m.subtitle ? (
                                                                        <span className="mt-0.5 block truncate text-xs text-slate-500">
                                                                            {m.subtitle}
                                                                        </span>
                                                                    ) : null}
                                                                </span>
                                                                {sel ? (
                                                                    <Check
                                                                        className={clsx("h-4 w-4 shrink-0", accent)}
                                                                        aria-hidden
                                                                    />
                                                                ) : (
                                                                    <span
                                                                        className="h-4 w-4 shrink-0 rounded-full border-2 border-slate-300"
                                                                        aria-hidden
                                                                    />
                                                                )}
                                                            </button>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-600">
                                        <span className="font-medium text-slate-900">{selected.title}</span>
                                        {selected.subtitle ? (
                                            <span className="text-slate-500"> · {selected.subtitle}</span>
                                        ) : null}
                                    </p>
                                )}
                                <AttendancePendingQueuePanel
                                    projectId={projectId}
                                    title={queueTitle}
                                    description={queueDescription}
                                    autoLoadOnProjectIdChange
                                    onPendingCountChanged={onQueuePendingCountChanged}
                                    presentation={isPartner ? "partner" : "default"}
                                    onPartnerQueueSnapshot={isPartner ? handlePartnerQueueSnapshot : undefined}
                                    partnerSelectedMemberKey={isPartner ? selectedParticipantKey : undefined}
                                />
                            </>
                        ) : (
                            <div
                                className={clsx(
                                    "border border-dashed border-slate-200 bg-white px-4 text-center text-sm text-slate-600",
                                    isPartner
                                        ? "rounded-xl border-slate-300/90 py-16 shadow-sm"
                                        : "rounded-lg py-14",
                                )}
                            >
                                {isPartner
                                    ? "Select an opportunity from the list to load pending attendance."
                                    : "Select an opportunity to load pending attendance."}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
