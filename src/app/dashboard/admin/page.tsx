"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, RefreshCw } from "lucide-react";
import { authenticatedFetch, resolveSameOriginApiPath } from "@/utils/api";
import { namedTimeGreeting } from "@/utils/timeGreeting";
import {
    fetchAdminPendingCounts,
    readAdminPendingCountsCache,
    type AdminPendingCounts,
} from "@/utils/adminPendingCounts";
import {
    MOCKUP_GRADIENTS,
    MockupHero,
    MockupPanel,
    MockupSectionHead,
    MockupStatBars,
} from "@/components/ciel/dashboard/MockupChrome";

type SdgDistributionPoint = {
    name: string;
    value: number;
    color?: string;
};

type AdminDashboardData = {
    metrics?: {
        totalUsers?: {
            total?: number;
            students?: number;
            ngos?: number;
            corporates?: number;
        };
        opportunities?: number;
        verifiedHours?: number;
        pendingApprovals?: number;
        totalReports?: number;
        issueReports?: number;
        studentReports?: number;
    };
    issueReports?: number;
    studentReports?: number;
    sdgDistribution?: SdgDistributionPoint[];
};

const DASHBOARD_FETCH = { timeoutMs: 60_000 } as const;

function numOrNull(v: unknown): number | null {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function fmt(n: number | null): string {
    return n === null ? "\u2014" : n.toLocaleString();
}

/** Trim, collapse whitespace and merge case-variants of the same SDG label. */
function normaliseSdg(raw: unknown): { name: string; value: number }[] {
    if (!Array.isArray(raw)) return [];
    const merged = new Map<string, { name: string; value: number }>();
    for (const d of raw) {
        const row = (d && typeof d === "object" ? d : {}) as Partial<SdgDistributionPoint>;
        const name = String(row.name ?? "").replace(/\s+/g, " ").trim() || "Unknown";
        const value = Number(row.value);
        if (!Number.isFinite(value) || value <= 0) continue;
        const key = name.toLowerCase();
        const prev = merged.get(key);
        if (prev) prev.value += value;
        else merged.set(key, { name: name === name.toLowerCase() ? name.charAt(0).toUpperCase() + name.slice(1) : name, value });
    }
    return [...merged.values()].sort((a, b) => b.value - a.value);
}

const ACTION_ITEMS: { key: keyof AdminPendingCounts; label: string; href: string }[] = [
    { key: "opportunityApprovals", label: "Opportunity approvals", href: "/dashboard/admin/approvals" },
    { key: "userApprovals", label: "User approvals", href: "/dashboard/admin/users" },
    { key: "joinApplications", label: "Applications & reports", href: "/dashboard/admin/join-applications" },
    { key: "payments", label: "Payments", href: "/dashboard/admin/payments" },
    { key: "orgMembership", label: "Org membership fees", href: "/dashboard/admin/org-membership" },
    { key: "reportsAwaitingAdmin", label: "Student reports awaiting admin", href: "/dashboard/admin/reports/verify" },
    { key: "issueLogsOpen", label: "Open issue logs", href: "/dashboard/admin/issue-logs" },
    { key: "supportOpen", label: "Open support requests", href: "/dashboard/admin/support" },
];

const AREA_CARDS = [
    { href: "/dashboard/admin/community-service", emoji: "\u{1F3D5}\uFE0F", ghost: "\u{1F331}", title: "Community Service", subtitle: "Manage opportunity approvals, report completion, faculty review and approved impact.", background: MOCKUP_GRADIENTS.teal },
    { href: "/dashboard/admin/path-submissions?tab=course-project", emoji: "\u{1F4DA}", ghost: "\u{1F4D8}", title: "Coursework", subtitle: "Track student progress, faculty review and approved sustainability-linked coursework.", background: MOCKUP_GRADIENTS.blue },
    { href: "/dashboard/admin/path-submissions?tab=fyp-thesis", emoji: "\u{1F393}", ghost: undefined, title: "Final Year Project (FYP)", subtitle: "Monitor FYP progress, faculty review and approved research impact records.", background: MOCKUP_GRADIENTS.orange },
    { href: "/dashboard/admin/startup-business", emoji: "\u{1F4BC}", ghost: "\u{1F680}", title: "Startup / Venture", subtitle: "Track venture completion, faculty review, AI ranking and investor-ready projects.", background: MOCKUP_GRADIENTS.purple },
];

function AreaCard({
    href,
    emoji,
    ghost,
    title,
    subtitle,
    background,
    full,
}: {
    href: string;
    emoji: string;
    ghost?: string;
    title: string;
    subtitle: string;
    background: string;
    full?: boolean;
}) {
    return (
        <Link
            href={href}
            style={{ background }}
            className={`relative min-h-[130px] min-w-0 overflow-hidden rounded-[24px] px-4 py-4 text-left text-white shadow-[0_7px_15px_rgba(23,49,57,.08)] transition duration-[220ms] hover:-translate-y-[3px] hover:shadow-[0_14px_24px_rgba(23,49,57,.13)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15988b] sm:min-h-[150px] sm:px-[22px] sm:py-5 ${full ? "sm:col-span-2" : ""}`}
        >
            <span className="mb-[14px] block text-[29px] leading-none">{emoji}</span>
            <h3 className="m-0 text-[18px] font-[950] leading-tight sm:text-[21px]">{title}</h3>
            <p className="mt-1.5 text-[12px] leading-[1.45] text-white/90 sm:max-w-[78%] sm:text-[12.5px]">{subtitle}</p>
            <span className="pointer-events-none absolute -bottom-6 -right-2 rotate-[-7deg] text-[92px] opacity-10" aria-hidden>
                {ghost || emoji}
            </span>
        </Link>
    );
}

function KpiTile({ label, value, hint, href }: { label: string; value: string; hint?: string; href: string }) {
    return (
        <Link
            href={href}
            className="block min-w-0 rounded-[15px] border border-[#dde5ea] bg-white p-3.5 transition hover:border-[#15988b] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15988b]"
        >
            <span className="text-[9px] font-black tracking-[0.05em] text-[#70808a]">{label}</span>
            <strong className="mt-1.5 block truncate text-2xl font-semibold text-[#16313d]">{value}</strong>
            {hint ? <small className="text-[10px] text-[#18806a]">{hint}</small> : null}
        </Link>
    );
}

function SkeletonBlock({ className = "" }: { className?: string }) {
    return <div className={`animate-pulse rounded-[15px] bg-[#e6eef1] ${className}`} aria-hidden />;
}

export default function AdminDashboard() {
    const [data, setData] = useState<AdminDashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [counts, setCounts] = useState<AdminPendingCounts | null>(null);
    const [countsLoading, setCountsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
            const res = await authenticatedFetch(
                resolveSameOriginApiPath("/api/v1/admin/dashboard"),
                {},
                DASHBOARD_FETCH,
            );
            if (!res) {
                setLoadError("Unable to load dashboard (session or network).");
                return;
            }
            if (!res.ok) {
                const errBody = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
                setLoadError(
                    (typeof errBody.message === "string" && errBody.message) ||
                        (typeof errBody.error === "string" && errBody.error) ||
                        `Dashboard request failed (${res.status}).`,
                );
                return;
            }
            const result = await res.json().catch(() => null);
            if (result?.success && result.data) {
                setData(result.data);
                setLastUpdated(new Date());
            } else {
                setLoadError("Dashboard response was not successful.");
            }
        } catch (error) {
            console.error("Failed to fetch admin stats", error);
            setLoadError(
                error instanceof Error && error.name === "AbortError"
                    ? "Request timed out. Try again."
                    : "Could not load stats. Check your connection.",
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchCounts = useCallback(async (force: boolean) => {
        setCountsLoading(true);
        const c = await fetchAdminPendingCounts({ force });
        if (c) setCounts(c);
        setCountsLoading(false);
    }, []);

    const refreshAll = useCallback(() => {
        void fetchData();
        void fetchCounts(true);
    }, [fetchData, fetchCounts]);

    useEffect(() => {
        setCounts(readAdminPendingCountsCache());
        void fetchData();
        void fetchCounts(false);
    }, [fetchData, fetchCounts]);

    const metrics = data?.metrics;
    const hasData = !!data;
    const sdgRows = useMemo(() => normaliseSdg(data?.sdgDistribution), [data?.sdgDistribution]);
    const shownSdg = sdgRows.slice(0, 6);
    const shownSdgTotal = shownSdg.reduce((sum, d) => sum + d.value, 0);

    const totalUsers = hasData ? numOrNull(metrics?.totalUsers?.total) : null;
    const students = hasData ? numOrNull(metrics?.totalUsers?.students) : null;
    const opportunities = hasData ? numOrNull(metrics?.opportunities) : null;
    const verifiedHours = hasData ? numOrNull(metrics?.verifiedHours) : null;
    const pendingTotal = hasData ? numOrNull(metrics?.pendingApprovals) : null;
    const issueReports = hasData ? numOrNull(data?.issueReports ?? metrics?.issueReports) : null;
    const studentReports = hasData
        ? numOrNull(data?.studentReports ?? metrics?.studentReports ?? metrics?.totalReports)
        : null;

    const actionRows = useMemo(
        () =>
            counts
                ? ACTION_ITEMS.map((i) => ({ ...i, count: counts[i.key] }))
                      .filter((i) => i.count > 0)
                      .sort((a, b) => b.count - a.count)
                : [],
        [counts],
    );
    const actionTotal = actionRows.reduce((sum, r) => sum + r.count, 0);

    const failedNoData = !!loadError && !hasData;

    return (
        <div className="mx-auto min-w-0 max-w-[1500px]">
            <MockupHero
                title={namedTimeGreeting("CIEL PK", "\u{1F44B}")}
                subtitle="Four impact areas. One command center. Monitor work, intervene when anyone is delayed, and turn approved projects into measurable impact intelligence."
                stats={[
                    { value: fmt(totalUsers), label: "Total users", href: "/dashboard/admin/users" },
                    { value: counts ? fmt(actionTotal) : fmt(pendingTotal), label: "Need attention", href: "/dashboard/admin/approvals" },
                    { value: fmt(issueReports), label: "Issue reports", href: "/dashboard/admin/issue-logs" },
                    { value: fmt(studentReports), label: "Student reports", href: "/dashboard/admin/reports/verify" },
                ]}
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#70808a]">
                <span aria-live="polite">
                    {lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : isLoading ? "Loading\u2026" : "Not updated yet"}
                </span>
                <button
                    type="button"
                    onClick={refreshAll}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#dde5ea] bg-white px-3 py-1.5 font-semibold text-[#16313d] hover:bg-[#f4f7fa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15988b] disabled:opacity-60"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
                </button>
            </div>

            {loadError ? (
                <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                        {loadError}
                        {hasData ? " Showing the last loaded numbers." : " Numbers are unavailable."}
                    </span>
                    <button
                        type="button"
                        onClick={refreshAll}
                        className="rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                    >
                        Retry
                    </button>
                </div>
            ) : null}

            <MockupSectionHead
                title="Super Admin Command Center"
                subtitle="Choose an area below to open its workflow."
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {AREA_CARDS.map((c) => (
                    <AreaCard key={c.href} {...c} />
                ))}
                <AreaCard
                    href="/dashboard/admin/analytics"
                    emoji={"\u{1F4CA}"}
                    ghost={"\u{1F3C6}"}
                    title="Impact Intelligence Hub"
                    subtitle="Overall statistics, AI Rankings for Coursework/FYP/Startup, Community Service Composite Indicator Scores and Level badges, batches, university comparisons and impact trends."
                    background={MOCKUP_GRADIENTS.green}
                    full
                />
            </div>

            <section className="mt-5 min-w-0 rounded-[22px] border border-[#dde5ea] bg-white p-4 shadow-[0_8px_22px_rgba(24,52,64,.05)] sm:p-5" aria-label="Needs your action">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="m-0 text-[16px] font-semibold text-[#16313d] sm:text-[18px]">Needs your action</h3>
                    {counts ? <span className="text-xs text-[#70808a]">{actionTotal.toLocaleString()} open item{actionTotal === 1 ? "" : "s"}</span> : null}
                </div>
                {!counts && countsLoading ? (
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <SkeletonBlock className="h-14" />
                        <SkeletonBlock className="h-14" />
                    </div>
                ) : !counts ? (
                    <p className="mt-3 text-sm text-[#70808a]">
                        Pending counts are unavailable right now.{" "}
                        <button type="button" onClick={() => void fetchCounts(true)} className="font-bold text-[#0e756e] underline">
                            Retry
                        </button>
                    </p>
                ) : actionRows.length === 0 ? (
                    <p className="mt-3 flex items-center gap-2 text-sm text-[#18806a]">
                        <CheckCircle2 className="h-4 w-4" /> Nothing is waiting on you right now.
                    </p>
                ) : (
                    <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {actionRows.map((r) => (
                            <li key={r.key} className="min-w-0">
                                <Link
                                    href={r.href}
                                    className="flex min-w-0 items-center gap-3 rounded-[14px] border border-[#dde5ea] bg-[#f7fafb] px-3.5 py-3 transition hover:border-[#15988b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15988b]"
                                >
                                    <span className="grid h-8 min-w-8 shrink-0 place-items-center rounded-full bg-rose-600 px-2 text-xs font-bold text-white">
                                        {r.count > 99 ? "99+" : r.count}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#16313d]">{r.label}</span>
                                    <ArrowRight className="h-4 w-4 shrink-0 text-[#70808a]" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <MockupPanel title="Platform snapshot" subtitle="Live counts from the CIEL backend. Select a tile to open the list behind it.">
                {isLoading && !hasData ? (
                    <div className="grid grid-cols-1 gap-[11px] min-[380px]:grid-cols-2 xl:grid-cols-3" aria-busy="true">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <SkeletonBlock key={i} className="h-[84px]" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-[11px] min-[380px]:grid-cols-2 xl:grid-cols-3">
                        <KpiTile label="TOTAL USERS" value={fmt(totalUsers)} hint={students !== null ? `${students.toLocaleString()} students` : undefined} href="/dashboard/admin/users" />
                        <KpiTile label="OPPORTUNITIES" value={fmt(opportunities)} hint="All listings" href="/dashboard/admin/projects" />
                        <KpiTile label="VERIFIED HOURS" value={fmt(verifiedHours)} hint="Across the platform" href="/dashboard/admin/analytics" />
                        <KpiTile label="ISSUE REPORTS" value={fmt(issueReports)} hint="Logged issues" href="/dashboard/admin/issue-logs" />
                        <KpiTile label="STUDENT REPORTS" value={fmt(studentReports)} hint="Community service reports" href="/dashboard/admin/reports/verify" />
                        <KpiTile label="PENDING APPROVALS" value={fmt(pendingTotal)} hint="Awaiting admin" href="/dashboard/admin/approvals" />
                    </div>
                )}
                {failedNoData ? null : isLoading && !hasData ? (
                    <SkeletonBlock className="mt-4 h-40" />
                ) : shownSdg.length > 0 ? (
                    <div className="mt-4">
                        <MockupStatBars
                            title={`Listings by SDG tag${sdgRows.length > shownSdg.length ? ` (top ${shownSdg.length} of ${sdgRows.length})` : ""}`}
                            rows={shownSdg.map((d) => ({
                                label: d.name,
                                pct: shownSdgTotal ? Math.round((d.value / shownSdgTotal) * 100) : 0,
                            }))}
                        />
                    </div>
                ) : null}
            </MockupPanel>
        </div>
    );
}
