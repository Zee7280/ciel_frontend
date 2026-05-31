"use client";

import type { MutableRefObject } from "react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
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
import { authenticatedFetch } from "@/utils/api";
import {
    buildPartnerTeamBuckets,
    PARTNER_ATTENDANCE_ALL_TEAMS,
    PARTNER_ATTENDANCE_AWAIT_TEAM,
    type PartnerTeamBucket,
} from "@/utils/engagementPartnerTeamScope";
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
    /** Full-width layout with in-panel table scroll (faculty + partner attendance review). */
    wideQueueLayout = false,
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
    wideQueueLayout?: boolean;
}) {
    const isPartner = variant === "partner";
    const stretchViewport = wideQueueLayout;
    const facultyWide = stretchViewport && !isPartner;
    const [listTab, setListTab] = useState<ListTab>(isPartner ? "all" : "pending");
    const [query, setQuery] = useState("");
    const [refreshingCounts, setRefreshingCounts] = useState(false);
    const [partnerRoster, setPartnerRoster] = useState<PartnerParticipantChip[]>([]);
    const [partnerQueueRows, setPartnerQueueRows] = useState(0);
    const [selectedParticipantKey, setSelectedParticipantKey] = useState("");
    const [partnerTeamBuckets, setPartnerTeamBuckets] = useState<PartnerTeamBucket[]>([]);
    const [partnerTeamsLoading, setPartnerTeamsLoading] = useState(false);
    const [selectedTeamKey, setSelectedTeamKey] = useState(PARTNER_ATTENDANCE_AWAIT_TEAM);

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

    const totalPendingAcrossProjects = useMemo(
        () => Object.values(pendingById).reduce((sum, n) => sum + (n ?? 0), 0),
        [pendingById],
    );

    const selected = projects.find((p) => p.id === projectId) ?? null;
    const selectedPendingCount = selected ? (pendingById[selected.id] ?? 0) : 0;
    useEffect(() => {
        if (!isPartner) return;
        setPartnerRoster([]);
        setPartnerQueueRows(0);
        setSelectedParticipantKey("");
        setPartnerTeamBuckets([]);
        setSelectedTeamKey(PARTNER_ATTENDANCE_AWAIT_TEAM);
    }, [projectId, isPartner]);

    useEffect(() => {
        if (!isPartner || !projectId.trim()) {
            return;
        }
        let cancelled = false;
        (async () => {
            setPartnerTeamsLoading(true);
            try {
                const res = await authenticatedFetch(
                    `/api/v1/engagement/project/${encodeURIComponent(projectId.trim())}/team`,
                );
                if (!res?.ok) {
                    if (!cancelled) {
                        setPartnerTeamBuckets([]);
                        setSelectedTeamKey(PARTNER_ATTENDANCE_ALL_TEAMS);
                    }
                    return;
                }
                const json = await res.json();
                const teamRows = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
                const buckets = buildPartnerTeamBuckets(teamRows);
                if (cancelled) return;
                setPartnerTeamBuckets(buckets);
                if (buckets.length === 0) {
                    setSelectedTeamKey(PARTNER_ATTENDANCE_ALL_TEAMS);
                } else if (buckets.length === 1) {
                    setSelectedTeamKey(buckets[0].key);
                } else {
                    setSelectedTeamKey(PARTNER_ATTENDANCE_AWAIT_TEAM);
                }
            } catch {
                if (!cancelled) {
                    setPartnerTeamBuckets([]);
                    setSelectedTeamKey(PARTNER_ATTENDANCE_ALL_TEAMS);
                }
            } finally {
                if (!cancelled) setPartnerTeamsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isPartner, projectId]);

    useEffect(() => {
        if (!isPartner) return;
        setSelectedParticipantKey("");
    }, [selectedTeamKey, isPartner]);

    useEffect(() => {
        if (!isPartner) return;
        if (selectedTeamKey === PARTNER_ATTENDANCE_AWAIT_TEAM) return;
        if (partnerRoster.length === 0) return;
        if (!partnerRoster.some((p) => p.key === selectedParticipantKey)) {
            setSelectedParticipantKey(partnerRoster[0].key);
        }
    }, [isPartner, partnerRoster, selectedParticipantKey, selectedTeamKey]);

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

    const oppIdTail = projectId.replace(/\W/g, "").slice(-8).toUpperCase() || "—";
    const partnerStepProjectDone = Boolean(projectId && selected);
    const partnerStepTeamResolved =
        isPartner && partnerStepProjectDone && selectedTeamKey !== PARTNER_ATTENDANCE_AWAIT_TEAM;
    const partnerTeamScopeLabel =
        selectedTeamKey === PARTNER_ATTENDANCE_AWAIT_TEAM
            ? "Select team"
            : selectedTeamKey === PARTNER_ATTENDANCE_ALL_TEAMS
              ? "All cohorts"
              : (partnerTeamBuckets.find((b) => b.key === selectedTeamKey)?.label ?? "Team");
    const partnerStepMembersDone =
        partnerStepTeamResolved &&
        (partnerRoster.length === 0 || Boolean(selectedParticipantKey.trim()));

    const selectedTeamBucket = partnerTeamBuckets.find((b) => b.key === selectedTeamKey) ?? null;

    function partnerTeamIdLabel(key: string): string | null {
        if (key === PARTNER_ATTENDANCE_ALL_TEAMS || key === PARTNER_ATTENDANCE_AWAIT_TEAM) return null;
        const i = key.indexOf(":");
        const tail = (i >= 0 ? key.slice(i + 1) : key).trim();
        return tail || null;
    }

    function partnerMemberAvatar(name: string, key: string): { initials: string; avatarClass: string } {
        const cleaned = name.trim() || "?";
        const parts = cleaned.split(/\s+/).filter(Boolean);
        const initials =
            parts.length >= 2
                ? `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase()
                : cleaned.slice(0, 2).toUpperCase() || "?";
        const PALETTE = ["bg-[#0056B3]", "bg-emerald-500", "bg-violet-600", "bg-rose-500", "bg-teal-600", "bg-orange-600"] as const;
        let h = 0;
        for (let i = 0; i < key.length; i++) h = ((h << 5) - h + key.charCodeAt(i)) | 0;
        const avatarClass = PALETTE[(Math.abs(h) >>> 0) % PALETTE.length] ?? PALETTE[0];
        return { initials, avatarClass };
    }

    return (
        <div
            className={clsx(
                facultyWide
                    ? "mx-auto w-full max-w-none space-y-3 px-3 py-4 sm:px-4 lg:px-5"
                    : stretchViewport
                      ? "mx-auto w-full max-w-none space-y-4 px-4 py-4 sm:px-6 lg:px-8"
                      : "mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8",
            )}
        >
            <header
                className={clsx(
                    isPartner && !stretchViewport ? "space-y-5" : stretchViewport ? "space-y-2" : "space-y-4",
                )}
            >
                <Link
                    href={backHref}
                    className={clsx(
                        "group inline-flex items-center gap-1.5 text-sm font-medium transition-colors",
                        isPartner || stretchViewport
                            ? "text-slate-500 hover:text-[#0056B3]"
                            : "text-slate-600 hover:text-slate-900",
                    )}
                >
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                    {backLabel}
                </Link>
                <div>
                    {eyebrow.trim() ? (
                        <p
                            className={clsx(
                                "text-xs uppercase tracking-wider text-slate-500",
                                isPartner ? "font-semibold" : "font-medium tracking-wider",
                            )}
                        >
                            {eyebrow}
                        </p>
                    ) : null}
                    <h1
                        className={clsx(
                            "text-2xl tracking-tight text-slate-900",
                            isPartner ? "font-bold sm:text-[1.65rem]" : "font-semibold sm:text-3xl",
                            eyebrow.trim() ? "mt-1" : null,
                        )}
                    >
                        {title}
                    </h1>
                    {description.trim() ? (
                        <p className={clsx("mt-2 max-w-2xl text-sm text-slate-600", isPartner && "leading-relaxed")}>
                            {description}
                        </p>
                    ) : null}
                </div>

                {isPartner ? (
                    <>
                        <nav aria-label="Breadcrumb">
                            <p className="text-[11px] leading-relaxed text-slate-500 sm:text-xs">
                                <span className={clsx(selected ? "text-slate-700" : "text-slate-400")}>
                                    {selected?.title ?? "Project title"}
                                </span>
                                <span className="mx-1.5 text-slate-300">→</span>
                                <span
                                    className={clsx(
                                        selectedTeamKey !== PARTNER_ATTENDANCE_AWAIT_TEAM ? "text-slate-700" : "text-slate-400",
                                    )}
                                >
                                    {partnerTeamScopeLabel}
                                </span>
                                <span className="mx-1.5 text-slate-300">→</span>
                                <span className={clsx(partnerRoster.length > 0 ? "text-slate-700" : "text-slate-400")}>
                                    Group members ({partnerRoster.length})
                                </span>
                                <span className="mx-1.5 text-slate-300">→</span>
                                <span className={clsx(partnerStepMembersDone ? accent : "text-slate-400")}>
                                    Review individual attendance records
                                </span>
                            </p>
                        </nav>

                        <div aria-label="Verification steps" className="border-b border-slate-100 pb-3">
                            <div className="-mx-1 overflow-x-auto px-1 sm:overflow-visible">
                                <div className="flex min-w-[32rem] items-center pb-px sm:min-w-0">
                                {(
                                    [
                                        { n: 1, label: "Project title", done: partnerStepProjectDone },
                                        { n: 2, label: "Team name", done: partnerStepTeamResolved },
                                        { n: 3, label: "Group members", done: partnerStepMembersDone },
                                        {
                                            n: 4,
                                            label: "Attendance entries",
                                            done: false,
                                            current: partnerStepMembersDone,
                                        },
                                    ] as const
                                ).map((step, i) => {
                                    const isDone = Boolean("done" in step && step.done);
                                    const isCurrent = Boolean("current" in step && step.current);
                                    const pendingPrimary =
                                        !isDone &&
                                        !isCurrent &&
                                        ((step.n === 1 && !partnerStepProjectDone) ||
                                            (step.n === 2 && partnerStepProjectDone && !partnerStepTeamResolved) ||
                                            (step.n === 3 && partnerStepTeamResolved && !partnerStepMembersDone));
                                    const connectorFilled =
                                        i === 1
                                            ? partnerStepProjectDone
                                            : i === 2
                                              ? partnerStepTeamResolved
                                              : partnerStepMembersDone;

                                    const circle = (
                                        <div
                                            className={clsx(
                                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
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
                                            {isDone ? <Check className="h-4 w-4" strokeWidth={2.5} /> : step.n}
                                        </div>
                                    );

                                    return (
                                        <Fragment key={step.n}>
                                            {i > 0 ? (
                                                <div
                                                    className={clsx(
                                                        "h-0.5 min-w-[0.75rem] flex-1 shrink",
                                                        connectorFilled ? "bg-[#0056B3]" : "bg-slate-200",
                                                    )}
                                                    aria-hidden
                                                />
                                            ) : null}
                                            <div className="flex w-[min(7rem,calc((100%-3rem)/4))] shrink-0 flex-col items-center text-center">
                                                {circle}
                                                <p className="mt-1.5 px-0.5 text-[10px] font-semibold leading-tight text-slate-600 sm:text-[11px]">
                                                    {step.label}
                                                </p>
                                            </div>
                                        </Fragment>
                                    );
                                })}
                                </div>
                            </div>
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
                <div
                    className={clsx(
                        stretchViewport && !isPartner
                            ? "flex min-h-[calc(100dvh-11rem)] flex-col gap-4"
                            : "grid gap-6 lg:grid-cols-12 lg:gap-8",
                        stretchViewport && isPartner && "min-h-[calc(100dvh-11rem)] lg:items-stretch",
                    )}
                >
                    <div
                        className={clsx(
                            stretchViewport && !isPartner
                                ? "flex w-full min-h-[min(24rem,calc(100dvh-20rem))] max-h-[min(36rem,calc(100dvh-14rem))] shrink-0 flex-col gap-4"
                                : "space-y-4 lg:col-span-4",
                            stretchViewport &&
                                isPartner &&
                                "flex min-h-0 max-h-[calc(100dvh-11rem)] flex-col gap-4 lg:col-span-3",
                        )}
                    >
                        {isPartner ? (
                            <div
                                className={clsx(
                                    "rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm",
                                    stretchViewport && "flex min-h-0 flex-1 flex-col",
                                )}
                            >
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

                                <div
                                    className={clsx(
                                        "mt-4 space-y-2 overflow-y-auto overscroll-contain pr-1",
                                        stretchViewport ? "min-h-0 flex-1" : "max-h-[min(28rem,calc(100vh-14rem))]",
                                    )}
                                >
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
                            <div
                                className={clsx(
                                    "border bg-white",
                                    facultyWide
                                        ? "rounded-2xl border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.1)]"
                                        : "rounded-xl border-slate-200/90 shadow-sm",
                                    stretchViewport && "flex min-h-0 flex-1 flex-col",
                                    facultyWide && stretchViewport && "min-h-[20rem] p-4 sm:p-5",
                                    !stretchViewport && "p-4",
                                )}
                            >
                                {facultyWide ? (
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Opportunities
                                        </p>
                                        {totalPendingAcrossProjects > 0 ? (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-900 ring-1 ring-inset ring-amber-200/90">
                                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
                                                {totalPendingAcrossProjects} pending total
                                            </span>
                                        ) : (
                                            <span className="text-[11px] font-medium text-slate-400">All caught up</span>
                                        )}
                                    </div>
                                ) : null}
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div
                                        className={clsx(
                                            "flex gap-1 p-1",
                                            facultyWide ? "rounded-xl bg-slate-100/80 ring-1 ring-inset ring-slate-200/60" : "rounded-[10px] bg-slate-100",
                                        )}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setListTab("all")}
                                            className={clsx(
                                                "rounded-lg px-3 py-2 text-xs font-semibold transition",
                                                listTab === "all"
                                                    ? facultyWide
                                                        ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
                                                        : "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
                                                    : "text-slate-600 hover:bg-white/60 hover:text-slate-900",
                                            )}
                                        >
                                            All
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setListTab("pending")}
                                            className={clsx(
                                                "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition",
                                                listTab === "pending"
                                                    ? facultyWide
                                                        ? "bg-amber-500 text-white shadow-md shadow-amber-500/30 ring-2 ring-amber-400/40"
                                                        : "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
                                                    : facultyWide && totalPendingAcrossProjects > 0
                                                      ? "bg-amber-50/80 text-amber-900 ring-1 ring-inset ring-amber-200/70 hover:bg-amber-100"
                                                      : "text-slate-600 hover:bg-white/60 hover:text-slate-900",
                                            )}
                                        >
                                            Pending
                                            {facultyWide ? (
                                                <span
                                                    className={clsx(
                                                        "min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums",
                                                        listTab === "pending"
                                                            ? "bg-white/20 text-white"
                                                            : totalPendingAcrossProjects > 0
                                                              ? "bg-amber-500 text-white"
                                                              : "bg-slate-200 text-slate-600",
                                                    )}
                                                >
                                                    {totalPendingAcrossProjects}
                                                </span>
                                            ) : null}
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

                                <label className={clsx("relative block", stretchViewport ? "mt-4" : "mt-4")}>
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="search"
                                        placeholder="Search opportunities…"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        className="w-full rounded-[10px] border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0056B3]/40 focus:bg-white focus:ring-2 focus:ring-[#0056B3]/15"
                                    />
                                </label>

                                <div
                                    className={clsx(
                                        "mt-4 overflow-y-auto overscroll-contain pr-1",
                                        facultyWide ? "min-h-[14rem] flex-1 space-y-2.5" : "space-y-2",
                                        stretchViewport && !facultyWide && "min-h-0 flex-1 max-h-none",
                                        !stretchViewport && "max-h-[min(28rem,calc(100vh-14rem))]",
                                    )}
                                >
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
                                                        "relative w-full overflow-hidden border text-left transition shadow-sm",
                                                        facultyWide
                                                            ? "min-h-[4.75rem] rounded-xl px-5 py-4 text-sm"
                                                            : "rounded-[10px] px-4 py-3.5 text-sm",
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
                                                            className={clsx(
                                                                "absolute left-0 top-0 h-full w-1 bg-[#0056B3]",
                                                                facultyWide ? "rounded-l-xl" : "rounded-l-[10px]",
                                                            )}
                                                            aria-hidden
                                                        />
                                                    ) : null}
                                                    <div className="flex items-start justify-between gap-3 pl-0.5">
                                                        <div className="min-w-0">
                                                            <p
                                                                className={clsx(
                                                                    "font-semibold text-slate-900",
                                                                    facultyWide && "line-clamp-2 leading-snug",
                                                                )}
                                                            >
                                                                {p.title}
                                                            </p>
                                                            {p.subtitle ? (
                                                                <p className="mt-1 text-xs text-slate-500">{p.subtitle}</p>
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
                        )}
                    </div>

                    <div
                        className={clsx(
                            stretchViewport && !isPartner
                                ? "flex min-h-0 w-full flex-1 flex-col"
                                : stretchViewport
                                  ? "flex min-h-0 flex-col lg:col-span-9"
                                  : "lg:col-span-8",
                            isPartner ? "space-y-4" : "space-y-3",
                            stretchViewport && isPartner && "max-h-[calc(100dvh-11rem)]",
                        )}
                    >
                        {selected ? (
                            <div className={clsx(stretchViewport && "flex min-h-0 flex-1 flex-col gap-3")}>
                                {isPartner ? (
                                    <div className={clsx("flex shrink-0 flex-col gap-4", stretchViewport && "gap-3")}>
                                        <div className="flex items-center gap-4 rounded-xl border border-slate-200/90 bg-white px-4 py-3.5 shadow-sm">
                                            <div
                                                className={clsx(
                                                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                                                    accentSoftBg,
                                                )}
                                            >
                                                <BookOpen className={clsx("h-5 w-5", accent)} aria-hidden />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold leading-snug text-slate-900 sm:text-base">
                                                    {selected.title}
                                                </p>
                                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                                    {selected.subtitle ? (
                                                        <span className="text-xs text-slate-500">{selected.subtitle}</span>
                                                    ) : null}
                                                    <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                                                        OPP-{oppIdTail}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={clsx("grid gap-3 lg:grid-cols-2", stretchViewport && "lg:gap-3")}>
                                            <div className="flex gap-3 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm sm:p-4">
                                                <div
                                                    className={clsx(
                                                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                                                        accentSoftBg,
                                                    )}
                                                >
                                                    <Users className={clsx("h-4.5 w-4.5 sm:h-5 sm:w-5", accent)} aria-hidden />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                        Selected team
                                                    </p>
                                                    {!partnerTeamsLoading ? (
                                                        <p className="mt-1 text-[10px] leading-snug text-slate-500">
                                                            Titles in the pattern &quot;[lead name]&apos;s team&quot; use the{" "}
                                                            <strong>team lead on roster</strong> — they label the cohort you
                                                            selected, not who is approving and not proof that everyone on that
                                                            roster has partner-pending attendance.
                                                        </p>
                                                    ) : null}
                                                    {partnerTeamsLoading ? (
                                                        <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                                                            <Loader2
                                                                className={clsx("h-4 w-4 shrink-0 animate-spin", accent)}
                                                                aria-hidden
                                                            />
                                                            Loading teams…
                                                        </div>
                                                    ) : partnerTeamBuckets.length === 0 ? (
                                                        <>
                                                            <p className="mt-1 text-sm font-bold leading-snug text-slate-900">
                                                                All cohorts
                                                            </p>
                                                            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                                                                No separate teams — rows shown together.
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <div
                                                            className={clsx(
                                                                "mt-2 max-h-[8rem] space-y-1.5 overflow-y-auto pr-0.5",
                                                                stretchViewport && "max-h-28 sm:max-h-36",
                                                            )}
                                                        >
                                                            {partnerTeamBuckets.map((b) => {
                                                                const sel = selectedTeamKey === b.key;
                                                                return (
                                                                    <button
                                                                        key={b.key}
                                                                        type="button"
                                                                        onClick={() => setSelectedTeamKey(b.key)}
                                                                        className={clsx(
                                                                            "flex w-full items-start justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-[13px] transition",
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
                                                                                {b.label}
                                                                            </span>
                                                                            {b.subtitle ? (
                                                                                <span className="mt-0.5 block truncate text-xs text-slate-500">
                                                                                    {b.subtitle}
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
                                                            })}
                                                        </div>
                                                    )}
                                                    {selectedTeamBucket && partnerTeamIdLabel(selectedTeamBucket.key) ? (
                                                        <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                                                            Team ID: {partnerTeamIdLabel(selectedTeamBucket.key)}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </div>

                                            <div
                                                className={clsx(
                                                    "flex flex-col rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm sm:p-4",
                                                    stretchViewport ? "min-h-[9rem]" : "min-h-[10rem]",
                                                )}
                                            >
                                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                    Group members ({partnerRoster.length})
                                                </p>
                                                <p className="mt-1 text-[10px] leading-snug text-slate-500">
                                                    Only volunteers who currently have attendance <strong>sitting in your partner queue</strong>{" "}
                                                    appear here — not everyone enrolled on the project roster. With a cohort
                                                    card selected right now, rows must also <strong>match that cohort&apos;s grouping key</strong>{" "}
                                                    (often the team ID). If someone is missing, usual causes: no attendance log yet,
                                                    routed to <strong>faculty</strong> instead of partner, already approved, or roster /{" "}
                                                    <strong>teamId</strong> on their record doesn&apos;t line up — try another cohort card if
                                                    the project lists more than one, or escalate a data fix.
                                                </p>
                                                <div className="mt-2 min-h-[5rem] max-h-48 flex-1 space-y-1.5 overflow-y-auto pr-0.5">
                                                    {partnerRoster.length === 0 ? (
                                                        <p className="text-sm text-slate-500">
                                                            {selectedTeamKey === PARTNER_ATTENDANCE_AWAIT_TEAM
                                                                ? "Select a team to list members with pending sessions for that cohort."
                                                                : partnerQueueRows === 0
                                                                  ? "No pending rows for this filter yet. Refresh after students submit attendance."
                                                                  : "No named participants in this filtered queue."}
                                                        </p>
                                                    ) : (
                                                        partnerRoster.map((m) => {
                                                            const sel = selectedParticipantKey === m.key;
                                                            const { initials, avatarClass } = partnerMemberAvatar(
                                                                m.name,
                                                                m.key,
                                                            );
                                                            return (
                                                                <button
                                                                    key={m.key}
                                                                    type="button"
                                                                    onClick={() => setSelectedParticipantKey(m.key)}
                                                                    className={clsx(
                                                                        "flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-[13px] transition",
                                                                        sel
                                                                            ? clsx(
                                                                                  "border-[#0056B3]/40 bg-[#0056B3]/[0.08] ring-2",
                                                                                  accentRing,
                                                                                  "ring-offset-1 ring-offset-white",
                                                                              )
                                                                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80",
                                                                    )}
                                                                >
                                                                    <span className="flex min-w-0 items-center gap-2.5">
                                                                        <span
                                                                            className={clsx(
                                                                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-inner",
                                                                                avatarClass,
                                                                            )}
                                                                        >
                                                                            {initials}
                                                                        </span>
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
                                    </div>
                                ) : stretchViewport ? (
                                    <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white via-slate-50/40 to-white px-4 py-3.5 shadow-sm">
                                        <div
                                            className={clsx(
                                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                                                accentSoftBg,
                                                "ring-1 ring-inset ring-[#0056B3]/10",
                                            )}
                                        >
                                            <BookOpen className={clsx("h-5 w-5", accent)} aria-hidden />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold leading-snug text-slate-900 sm:text-base">
                                                {selected.title}
                                            </p>
                                            {selected.subtitle ? (
                                                <p className="mt-0.5 text-xs text-slate-500">{selected.subtitle}</p>
                                            ) : null}
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end gap-1">
                                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                Pending
                                            </span>
                                            <PendingCountBadge n={selectedPendingCount} partner />
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
                                <div
                                    className={clsx(
                                        isPartner && stretchViewport && "flex min-h-0 flex-1 flex-col",
                                        isPartner && "min-h-[420px]",
                                        stretchViewport && !isPartner && "flex min-h-0 w-full flex-1 flex-col",
                                    )}
                                >
                                    <AttendancePendingQueuePanel
                                        projectId={projectId}
                                        title={queueTitle}
                                        description={queueDescription}
                                        autoLoadOnProjectIdChange
                                        onPendingCountChanged={onQueuePendingCountChanged}
                                        presentation={isPartner ? "partner" : "default"}
                                        onPartnerQueueSnapshot={isPartner ? handlePartnerQueueSnapshot : undefined}
                                        partnerSelectedMemberKey={isPartner ? selectedParticipantKey : undefined}
                                        partnerScopedTeamFilter={isPartner ? selectedTeamKey : undefined}
                                        scrollTableInPanel={stretchViewport}
                                    />
                                </div>
                            </div>
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
