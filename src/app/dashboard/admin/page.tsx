"use client";

import { useCallback, useEffect, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import {
    Users,
    Briefcase,
    Clock,
    FileText,
    TrendingUp,
    AlertCircle,
    ArrowRight,
    RefreshCw,
    Globe2,
    BarChart3,
    ClipboardList,
    Building2,
    GraduationCap,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import Link from "next/link";
import PendingActionCards, { type PendingSummary } from "@/components/dashboard/PendingActionCards";

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
    };
    sdgDistribution?: SdgDistributionPoint[];
    pendingSummary?: PendingSummary;
};

const shortcutLinks = [
    {
        href: "/dashboard/admin/master-analytics",
        label: "CIEL Master",
        description: "Students, verification, growth",
        icon: Globe2,
        className: "bg-indigo-50 text-indigo-700 ring-indigo-100 hover:bg-indigo-100/80",
    },
    {
        href: "/dashboard/admin/impact",
        label: "Impact analytics",
        description: "Hours, SDGs, HEC / Gov / UN",
        icon: BarChart3,
        className: "bg-emerald-50 text-emerald-800 ring-emerald-100 hover:bg-emerald-100/80",
    },
    {
        href: "/dashboard/admin/join-applications",
        label: "Join applications",
        description: "Application queue",
        icon: ClipboardList,
        className: "bg-amber-50 text-amber-900 ring-amber-100 hover:bg-amber-100/80",
    },
    {
        href: "/dashboard/admin/organizations",
        label: "Organizations",
        description: "Partners & orgs",
        icon: Building2,
        className: "bg-slate-50 text-slate-800 ring-slate-200 hover:bg-slate-100/80",
    },
];

export default function AdminDashboard() {
    const [data, setData] = useState<AdminDashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setLoadError(false);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/dashboard`);
            if (!res) {
                setLoadError(true);
                return;
            }
            const result = await res.json();
            if (result.success) {
                setData(result.data);
                setUpdatedAt(new Date());
            } else {
                setLoadError(true);
            }
        } catch (error) {
            console.error("Failed to fetch admin stats", error);
            setLoadError(true);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const { metrics, sdgDistribution } = data || {};

    const chartData: SdgDistributionPoint[] =
        sdgDistribution && sdgDistribution.length > 0 ? sdgDistribution : [];

    const totalUsers = metrics?.totalUsers?.total ?? 0;
    const studentCount = metrics?.totalUsers?.students ?? 0;
    const studentPercent = totalUsers > 0 ? Math.round((studentCount / totalUsers) * 100) : 0;
    const pendingTotal = metrics?.pendingApprovals ?? 0;

    if (isLoading) {
        return (
            <div className="flex min-h-[600px] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                    <p className="animate-pulse font-medium text-slate-500">Loading dashboard…</p>
                </div>
            </div>
        );
    }

    const pendingSummary: PendingSummary = data?.pendingSummary ?? {
        total: pendingTotal,
        items: [
            {
                key: "admin_pending_actions",
                title: "Pending approvals",
                count: pendingTotal,
                href: "/dashboard/admin/approvals",
                tone: "urgent",
                description: "Users, participation requests, and applications waiting for admin action.",
            },
        ],
    };

    return (
        <div className="mx-auto max-w-[1600px] space-y-6 p-0 sm:space-y-8 lg:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Platform Overview</h1>
                    <p className="mt-2 max-w-2xl text-base text-slate-500 sm:text-lg">
                        Live counts from your CIEL backend: users, opportunities, verified hours, and SDG distribution from
                        listings.
                    </p>
                    {updatedAt ? (
                        <p className="mt-2 text-xs text-slate-400">
                            Last refreshed {updatedAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                    ) : null}
                    {loadError ? (
                        <p className="mt-2 text-sm font-medium text-amber-700">
                            Could not refresh stats. Check your connection and try again.
                        </p>
                    ) : null}
                </div>
                <button
                    type="button"
                    onClick={() => void fetchData()}
                    className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </button>
            </div>

            <PendingActionCards summary={pendingSummary} emptyMessage="No platform approvals are pending right now." />

            <section aria-label="Shortcuts">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Quick access</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {shortcutLinks.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex gap-3 rounded-2xl p-4 ring-1 transition ${item.className}`}
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/60">
                                <item.icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="font-bold text-slate-900">{item.label}</div>
                                <div className="text-xs font-medium opacity-90">{item.description}</div>
                            </div>
                            <ArrowRight className="ml-auto h-4 w-4 shrink-0 self-center opacity-50" />
                        </Link>
                    ))}
                </div>
            </section>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                <div className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/40 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/10">
                    <div className="pointer-events-none absolute right-0 top-0 p-6 opacity-10 transition-opacity group-hover:opacity-20">
                        <Users className="h-24 w-24 translate-x-4 -translate-y-4 rotate-12 transform text-blue-600" />
                    </div>
                    <div className="relative z-10">
                        <div className="mb-4 flex items-center gap-4">
                            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 shadow-inner transition-transform group-hover:scale-110">
                                <Users className="h-6 w-6" />
                            </div>
                            <h3 className="font-bold text-slate-600">Total users</h3>
                        </div>
                        <div className="mb-2 flex items-baseline gap-2">
                            <span className="text-4xl font-black tracking-tight text-slate-900">
                                {totalUsers.toLocaleString()}
                            </span>
                        </div>
                        <p className="mb-6 text-sm font-medium text-slate-500">
                            <span className="font-bold text-slate-800">{studentCount.toLocaleString()}</span> students ·{" "}
                            <span className="font-bold text-slate-800">{(metrics?.totalUsers?.ngos ?? 0).toLocaleString()}</span>{" "}
                            NGOs ·{" "}
                            <span className="font-bold text-slate-800">
                                {(metrics?.totalUsers?.corporates ?? 0).toLocaleString()}
                            </span>{" "}
                            corporates
                        </p>

                        <div className="space-y-3">
                            <div className="mb-1 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                                <span>Share: students</span>
                                <span>{studentPercent}%</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-blue-500" style={{ width: `${studentPercent}%` }} />
                            </div>
                        </div>
                        <Link
                            href="/dashboard/admin/users"
                            className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700"
                        >
                            Manage users <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>

                <div className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/40 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-900/10">
                    <div className="pointer-events-none absolute right-0 top-0 p-6 opacity-10 transition-opacity group-hover:opacity-20">
                        <Briefcase className="h-24 w-24 -translate-y-4 translate-x-4 -rotate-12 transform text-amber-500" />
                    </div>
                    <div className="relative z-10 flex h-full flex-col">
                        <div className="mb-4 flex items-center gap-4">
                            <div className="rounded-2xl bg-amber-50 p-3 text-amber-600 shadow-inner transition-transform group-hover:scale-110">
                                <Briefcase className="h-6 w-6" />
                            </div>
                            <h3 className="font-bold text-slate-600">Opportunities</h3>
                        </div>
                        <div className="mb-2 text-4xl font-black tracking-tight text-slate-900">
                            {(metrics?.opportunities ?? 0).toLocaleString()}
                        </div>
                        <div className="max-w-full text-sm font-medium leading-relaxed text-slate-500 sm:max-w-[90%]">
                            Total opportunity listings in the system (all statuses).
                        </div>
                        <div className="mt-auto pt-6">
                            <Link
                                href="/dashboard/admin/projects"
                                className="inline-flex items-center gap-2 text-sm font-bold text-amber-600 transition-all hover:gap-3 group-hover:text-amber-700"
                            >
                                View all projects <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/40 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-900/10">
                    <div className="pointer-events-none absolute -bottom-6 -right-6 h-32 w-32 rounded-full bg-purple-50 opacity-50 blur-2xl transition-opacity group-hover:opacity-100" />
                    <div className="relative z-10 flex h-full flex-col">
                        <div className="mb-4 flex items-center gap-4">
                            <div className="rounded-2xl bg-purple-50 p-3 text-purple-600 shadow-inner transition-transform group-hover:scale-110">
                                <Clock className="h-6 w-6" />
                            </div>
                            <h3 className="font-bold text-slate-600">Verified hours</h3>
                        </div>
                        <div className="mb-2 text-4xl font-black tracking-tight text-slate-900">
                            {(metrics?.verifiedHours ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        </div>
                        <div className="text-sm font-medium text-slate-500">Sum of verified timesheets across the platform.</div>
                        <div className="mt-auto pt-6">
                            <Link
                                href="/dashboard/admin/impact"
                                className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1.5 text-xs font-bold text-purple-800 hover:bg-purple-200/80"
                            >
                                <TrendingUp className="h-3 w-3" /> Open impact dashboard
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-6 shadow-xl shadow-slate-200/40 transition-all duration-300 hover:shadow-2xl hover:shadow-red-900/10">
                    <div className="relative z-10 flex h-full flex-col">
                        <div className="mb-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="rounded-2xl border border-red-50 bg-white p-3 text-red-500 shadow-sm transition-transform hover:scale-110">
                                    <AlertCircle className="h-6 w-6" />
                                </div>
                                <h3 className="font-bold text-slate-700">Pending actions</h3>
                            </div>
                            {pendingTotal > 0 ? (
                                <div className="h-3 w-3 animate-pulse rounded-full bg-red-500" title="Items in queue" />
                            ) : null}
                        </div>

                        <div className="mb-2 text-5xl font-black tracking-tight text-slate-900">{pendingTotal.toLocaleString()}</div>
                        <p className="mb-6 text-sm font-bold text-red-600">Users, participations, and join applications combined.</p>

                        <div className="mt-auto flex flex-col gap-2">
                            <Link href="/dashboard/admin/approvals">
                                <button
                                    type="button"
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 transition-all hover:bg-red-700"
                                >
                                    Review queue <ArrowRight className="h-4 w-4" />
                                </button>
                            </Link>
                            <Link
                                href="/dashboard/admin/join-applications"
                                className="text-center text-xs font-bold text-red-700 underline-offset-2 hover:underline"
                            >
                                Join applications only →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
                <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xl shadow-slate-200/40 sm:p-8 xl:col-span-2">
                    <div className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h3 className="flex items-center gap-3 text-xl font-extrabold text-slate-900">
                                <TrendingUp className="h-6 w-6 text-slate-400" /> Listings by SDG tag
                            </h3>
                            <p className="mt-1 text-slate-500">
                                Count of opportunities per primary SDG label on the listing (not verified hours).
                            </p>
                        </div>
                        <Link
                            href="/dashboard/admin/impact"
                            className="text-sm font-bold text-blue-600 hover:text-blue-700"
                        >
                            Impact analytics →
                        </Link>
                    </div>

                    <div className="min-h-[320px] w-full rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-3 sm:min-h-[350px] sm:p-4">
                        {chartData.length === 0 ? (
                            <div className="flex h-[300px] flex-col items-center justify-center gap-2 text-center sm:h-[320px]">
                                <GraduationCap className="h-12 w-12 text-slate-300" />
                                <p className="max-w-sm text-sm font-medium text-slate-500">
                                    No SDG-tagged listings yet, or projects do not have SDG text set. Data appears here once
                                    opportunities include SDG labels.
                                </p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={chartData}
                                    layout="vertical"
                                    margin={{ top: 10, right: 30, left: 40, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={140}
                                        tick={{ fontSize: 13, fontWeight: 700, fill: "#64748b" }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: "#f1f5f9", opacity: 0.5 }}
                                        contentStyle={{
                                            borderRadius: "16px",
                                            border: "none",
                                            boxShadow: "0 10px 30px -10px rgba(0,0,0,0.15)",
                                            padding: "16px",
                                            background: "rgba(255, 255, 255, 0.95)",
                                            backdropFilter: "blur(4px)",
                                        }}
                                        itemStyle={{ color: "#1e293b", fontWeight: "bold" }}
                                    />
                                    <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={32} animationDuration={1000}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color || "#3b82f6"} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/40">
                        <div className="mb-6 flex items-center gap-4">
                            <div className="rounded-2xl bg-teal-50 p-3 text-teal-600 shadow-inner">
                                <FileText className="h-6 w-6" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">System reports</h3>
                        </div>
                        <div className="mb-2 text-5xl font-black tracking-tight text-slate-900">
                            {(metrics?.totalReports ?? 0).toLocaleString()}
                        </div>
                        <p className="text-sm font-medium text-slate-400">
                            Total rows in the partner/system reports table (all time).
                        </p>
                        <Link
                            href="/dashboard/admin/reports"
                            className="mt-4 inline-flex text-sm font-bold text-teal-700 hover:text-teal-800"
                        >
                            Open reports →
                        </Link>
                    </div>

                    <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 text-white shadow-xl shadow-slate-900/20">
                        <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
                        <h3 className="mb-6 flex items-center gap-3 text-lg font-bold">
                            <Briefcase className="h-5 w-5 text-blue-400" /> More actions
                        </h3>
                        <div className="relative z-10 space-y-3">
                            <Link
                                href="/dashboard/admin/approvals"
                                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-6 py-4 text-sm font-bold backdrop-blur-sm transition hover:bg-white/20"
                            >
                                Review approvals
                                <ArrowRight className="h-4 w-4 opacity-70" />
                            </Link>
                            <Link
                                href="/dashboard/admin/impact"
                                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-6 py-4 text-sm font-bold backdrop-blur-sm transition hover:bg-white/20"
                            >
                                Impact & stakeholders
                                <ArrowRight className="h-4 w-4 opacity-70" />
                            </Link>
                            <Link
                                href="/dashboard/admin/master-analytics"
                                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-6 py-4 text-sm font-bold backdrop-blur-sm transition hover:bg-white/20"
                            >
                                CIEL Master metrics
                                <ArrowRight className="h-4 w-4 opacity-70" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
