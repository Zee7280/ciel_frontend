"use client";

import { useState, useEffect, useMemo } from "react";
import {
    BookOpen,
    Star,
    Trophy,
    Clock,
    Loader2,
    TrendingUp,
    Award,
    AlertCircle,
    Timer,
    ChevronRight,
    FolderKanban,
    Bell,
    Wallet,
    FileCheck,
} from "lucide-react";
import Link from "next/link";
import { Button } from "./report/components/ui/button";
import type {
    ActiveProject,
    DashboardData,
    DashboardNotificationCategory,
    DashboardNotificationsPreview,
    DashboardOverview,
    DashboardStats,
} from "./types";
import { fetchStudentDashboardData } from "@/utils/student-dashboard-fetch";
import StudentProgressTracker from "./components/StudentProgressTracker";

function normStatus(s: string) {
    return s.toLowerCase();
}

function normReportStatus(p: ActiveProject) {
    return (p.report_status || "").trim().toLowerCase();
}

function deriveOverview(stats: DashboardStats, projects: ActiveProject[]): DashboardOverview {
    const pending = projects.filter((p) => /pending|approval|awaiting/i.test(p.status));
    const review = projects.filter((p) => /review|submitted/i.test(p.status));
    const active = projects.filter((p) => {
        const st = normStatus(p.status);
        return st.includes("progress") || st.includes("active") || (!st.includes("complete") && !st.includes("verified"));
    });

    const pendingPaymentProjects = projects.filter((p) => normReportStatus(p) === "pending_payment");
    const paymentsUnderReviewProjects = projects.filter((p) => normReportStatus(p) === "payment_under_review");

    return {
        activeProjectsCount: active.length || projects.length,
        pendingApprovalsCount: pending.length,
        pendingApprovalsSample: pending.slice(0, 2).map((p) => ({ id: p.id, title: p.title })),
        reportsUnderReviewCount: review.length,
        reportsUnderReviewSample: review.slice(0, 2).map((p) => ({ id: p.id, title: p.title })),
        totalVerifiedHours: stats.hoursVolunteered,
        hoursActivityBars: [40, 55, 35, 60, 45, 50, 48],
        completedCount: stats.projectsCompleted,
        completedSample: projects[0]
            ? { id: projects[0].id, title: projects[0].title }
            : undefined,
        completedActivityBars: [30, 40, 35, 50, 45, 55, 50],
        impactHistoryBadgeCount: 0,
        pendingPaymentsCount: pendingPaymentProjects.length,
        paymentsUnderReviewCount: paymentsUnderReviewProjects.length,
        pendingPaymentsSample: pendingPaymentProjects.slice(0, 2).map((p) => ({
            id: p.id,
            title: p.title,
        })),
    };
}

function mergeStudentOverview(data: DashboardData): DashboardOverview {
    const derived = deriveOverview(data.stats, data.activeProjects);
    const o = data.overview;
    if (!o) return derived;
    return {
        ...derived,
        ...o,
        pendingPaymentsCount: o.pendingPaymentsCount != null ? o.pendingPaymentsCount : derived.pendingPaymentsCount,
        paymentsUnderReviewCount:
            o.paymentsUnderReviewCount != null ? o.paymentsUnderReviewCount : derived.paymentsUnderReviewCount,
        pendingPaymentsSample:
            o.pendingPaymentsSample !== undefined ? o.pendingPaymentsSample : derived.pendingPaymentsSample,
    };
}

function notificationCategoryLabel(c?: DashboardNotificationCategory | string) {
    if (!c) return null;
    const labels: Record<string, string> = {
        deadline: "Deadline",
        pipeline: "Approval",
        approval: "Approval",
        report: "Report",
        payment: "Payment",
    };
    return labels[c] ?? c;
}

function MiniBars({ values, barClass }: { values: number[]; barClass: string }) {
    const max = Math.max(1, ...values);
    return (
        <div className="flex h-10 items-end gap-1">
            {values.map((v, i) => (
                <div
                    key={i}
                    className={`w-1.5 rounded-t ${barClass}`}
                    style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
                />
            ))}
        </div>
    );
}

function DeadlineIcon({ type }: { type: string }) {
    if (type === "urgent") return <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />;
    if (type === "warning") return <Timer className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />;
    return <Clock className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />;
}

export default function StudentDashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const payload = await fetchStudentDashboardData();
                if (payload) setData(payload);
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const overview = useMemo(() => {
        if (!data) return null;
        return mergeStudentOverview(data);
    }, [data]);

    if (isLoading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!data || !overview) {
        return (
            <div className="py-10 text-center">
                <p className="text-slate-500">Failed to load dashboard data.</p>
            </div>
        );
    }

    const { stats, activeProjects, deadlines } = data;
    const notificationsPreview: DashboardNotificationsPreview | undefined = data.notificationsPreview;

    const statItems = [
        { label: "Active Courses", value: stats.activeCourses.toString(), icon: BookOpen, iconBg: "bg-blue-50", iconText: "text-blue-600" },
        { label: "Impact Points", value: stats.impactPoints.toLocaleString(), icon: Star, iconBg: "bg-amber-50", iconText: "text-amber-600" },
        { label: "Projects Completed", value: stats.projectsCompleted.toString(), icon: Trophy, iconBg: "bg-emerald-50", iconText: "text-emerald-600" },
        { label: "Hours Volunteered", value: stats.hoursVolunteered.toString(), icon: Clock, iconBg: "bg-violet-50", iconText: "text-violet-600" },
    ];

    const continueReport = data.quickActions?.continueReport;
    const viewPayment = data.quickActions?.viewPayment;
    const viewReportResults = data.quickActions?.viewReportResults;
    const firstProjectForTracker = activeProjects[0]?.id;
    const pendingPay = overview.pendingPaymentsCount ?? 0;
    const payReview = overview.paymentsUnderReviewCount ?? 0;

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-800">Overview</h2>
                <p className="text-sm text-slate-500">Your projects, deadlines, and actions at a glance.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
                <div className="space-y-6 lg:col-span-2">
                    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between gap-2">
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">Active Projects</h3>
                            <FolderKanban className="h-5 w-5 text-slate-300" />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Active</p>
                                <p className="mt-1 text-3xl font-black text-slate-900">{overview.activeProjectsCount}</p>
                            </div>
                            <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700/80">Pending approvals</p>
                                <p className="mt-1 text-3xl font-black text-slate-900">{overview.pendingApprovalsCount}</p>
                                <ul className="mt-2 space-y-1 text-xs font-medium text-slate-600">
                                    {overview.pendingApprovalsSample.map((row) => (
                                        <li key={row.id} className="line-clamp-2">
                                            {row.title}
                                            {row.hint ? <span className="text-slate-400"> — {row.hint}</span> : null}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-700/80">Reports under review</p>
                                <p className="mt-1 text-3xl font-black text-slate-900">{overview.reportsUnderReviewCount}</p>
                                <ul className="mt-2 space-y-1 text-xs font-medium text-slate-600">
                                    {overview.reportsUnderReviewSample.map((row) => (
                                        <li key={row.id} className="line-clamp-2">
                                            {row.title}
                                            {row.hint ? <span className="text-slate-400"> — {row.hint}</span> : null}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-rose-800/80">Reporting fee due</p>
                                <p className="mt-1 text-3xl font-black text-slate-900">{pendingPay}</p>
                                <p className="mt-1 text-xs font-medium text-rose-800/90">
                                    {payReview > 0 ? `${payReview} payment slip${payReview === 1 ? "" : "s"} with admin` : "No slips in admin review"}
                                </p>
                                <ul className="mt-2 space-y-1 text-xs font-medium text-slate-600">
                                    {(overview.pendingPaymentsSample ?? []).map((row) => (
                                        <li key={row.id} className="line-clamp-2">
                                            {row.title}
                                            {row.hint ? <span className="text-slate-400"> — {row.hint}</span> : null}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total verified hours</p>
                                    <p className="mt-1 text-2xl font-black text-slate-900">{overview.totalVerifiedHours}h</p>
                                </div>
                                <MiniBars values={overview.hoursActivityBars} barClass="bg-blue-500/80" />
                            </div>
                            <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4">
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Completed</p>
                                    <p className="mt-1 text-2xl font-black text-slate-900">{overview.completedCount}</p>
                                    {overview.completedSample ? (
                                        <p className="mt-1 truncate text-xs font-medium text-slate-600">{overview.completedSample.title}</p>
                                    ) : null}
                                </div>
                                <MiniBars values={overview.completedActivityBars} barClass="bg-emerald-500/80" />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-slate-400">Quick actions</h3>
                        <div className="flex flex-col gap-4 md:flex-row md:items-stretch">
                            {continueReport ? (
                                <Link
                                    href={`/dashboard/student/report?projectId=${continueReport.projectId}`}
                                    className="flex flex-1 flex-col justify-center rounded-2xl bg-blue-600 px-6 py-5 text-white shadow-lg shadow-blue-200/50 transition hover:bg-blue-700"
                                >
                                    <span className="text-xs font-bold uppercase tracking-widest text-white/80">Continue report</span>
                                    <span className="mt-1 text-lg font-black">{continueReport.title}</span>
                                    <span className="text-sm font-medium text-white/90">{continueReport.subtitle}</span>
                                </Link>
                            ) : (
                                <Link
                                    href="/dashboard/student/projects"
                                    className="flex flex-1 flex-col justify-center rounded-2xl border-2 border-dashed border-slate-200 px-6 py-5 text-slate-600 transition hover:border-blue-300 hover:bg-blue-50/50"
                                >
                                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Continue report</span>
                                    <span className="mt-1 text-sm font-bold">No in-progress report linked — open My Projects</span>
                                </Link>
                            )}
                            <div className="flex flex-1 flex-col justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-5">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Browse opportunities</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-700">Find placements or start your own opportunity.</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Link href="/dashboard/student/browse">
                                        <Button size="sm" variant="outline" className="font-bold">
                                            Browse
                                        </Button>
                                    </Link>
                                    <Link href="/dashboard/student/create-opportunity">
                                        <Button size="sm" className="bg-slate-900 font-bold hover:bg-slate-800">
                                            Create opportunity
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch">
                            {viewPayment ? (
                                <Link
                                    href={`/dashboard/student/payment?projectId=${encodeURIComponent(viewPayment.projectId)}`}
                                    className="inline-flex flex-1 min-w-[10rem] items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3.5 text-sm font-black text-white shadow-md shadow-rose-200/50 transition hover:bg-rose-700"
                                >
                                    <Wallet className="h-4 w-4 shrink-0" />
                                    <span className="text-center leading-tight">
                                        Complete payment
                                        <span className="mt-0.5 block text-xs font-semibold text-white/90">{viewPayment.title}</span>
                                    </span>
                                </Link>
                            ) : null}
                            {viewReportResults ? (
                                <Link
                                    href={`/dashboard/student/report?projectId=${encodeURIComponent(viewReportResults.projectId)}`}
                                    className="inline-flex flex-1 min-w-[10rem] items-center justify-center gap-2 rounded-2xl border-2 border-slate-900 bg-white px-4 py-3.5 text-sm font-black text-slate-900 shadow-sm transition hover:bg-slate-50"
                                >
                                    <FileCheck className="h-4 w-4 shrink-0" />
                                    <span className="text-center leading-tight">
                                        View results
                                        <span className="mt-0.5 block text-xs font-semibold text-slate-600">{viewReportResults.title}</span>
                                    </span>
                                </Link>
                            ) : null}
                            <Link
                                href="/dashboard/student/notifications"
                                className="inline-flex flex-1 min-w-[10rem] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                            >
                                <Bell className="h-4 w-4 shrink-0 text-slate-500" />
                                View notifications
                            </Link>
                        </div>
                        <Link
                            href="/dashboard/student/projects"
                            className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700"
                        >
                            Go to My Projects <ChevronRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-slate-400">Upcoming deadlines</h3>
                        {deadlines.length > 0 ? (
                            <ul className="space-y-4">
                                {deadlines.map((deadline) => (
                                    <li key={deadline.id} className="flex gap-3">
                                        <DeadlineIcon type={deadline.type} />
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-800">{deadline.title}</p>
                                            <p className="text-xs text-slate-500">
                                                {new Date(deadline.date).toLocaleDateString(undefined, {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                })}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-slate-500">No upcoming deadlines.</p>
                        )}
                        <Link
                            href="/dashboard/student/projects"
                            className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700"
                        >
                            View all deadlines <ChevronRight className="h-4 w-4" />
                        </Link>
                    </div>

                    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-slate-400">Notifications snapshot</h3>
                        {notificationsPreview ? (
                            <ul className="space-y-4 text-sm">
                                <li>
                                    <span className="font-black text-slate-900">{notificationsPreview.active.length} Active</span>
                                    {notificationsPreview.active[0] ? (
                                        <p className="mt-1 text-slate-600">
                                            {notificationsPreview.active[0].category ? (
                                                <span className="mb-1 mr-2 inline-block rounded-md bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700">
                                                    {notificationCategoryLabel(notificationsPreview.active[0].category)}
                                                </span>
                                            ) : null}
                                            <span className="font-semibold text-slate-800">{notificationsPreview.active[0].title}</span>
                                            <span className="text-slate-500"> ({notificationsPreview.active[0].detail})</span>
                                        </p>
                                    ) : (
                                        <p className="mt-1 text-slate-500">None right now.</p>
                                    )}
                                </li>
                                <li>
                                    <span className="font-black text-slate-900">{notificationsPreview.pending.length} Pending</span>
                                    {notificationsPreview.pending[0] ? (
                                        <p className="mt-1 text-slate-600">
                                            {notificationsPreview.pending[0].category ? (
                                                <span className="mb-1 mr-2 inline-block rounded-md bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700">
                                                    {notificationCategoryLabel(notificationsPreview.pending[0].category)}
                                                </span>
                                            ) : null}
                                            <span className="font-semibold text-slate-800">{notificationsPreview.pending[0].title}</span>
                                            <span className="text-slate-500"> ({notificationsPreview.pending[0].detail})</span>
                                        </p>
                                    ) : (
                                        <p className="mt-1 text-slate-500">None right now.</p>
                                    )}
                                </li>
                                <li>
                                    <span className="font-black text-slate-900">{notificationsPreview.underReview.length} Under review</span>
                                    {notificationsPreview.underReview[0] ? (
                                        <p className="mt-1 text-slate-600">
                                            {notificationsPreview.underReview[0].category ? (
                                                <span className="mb-1 mr-2 inline-block rounded-md bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700">
                                                    {notificationCategoryLabel(notificationsPreview.underReview[0].category)}
                                                </span>
                                            ) : null}
                                            <span className="font-semibold text-slate-800">{notificationsPreview.underReview[0].title}</span>
                                            <span className="text-slate-500"> ({notificationsPreview.underReview[0].detail})</span>
                                        </p>
                                    ) : (
                                        <p className="mt-1 text-slate-500">None right now.</p>
                                    )}
                                </li>
                            </ul>
                        ) : (
                            <p className="text-sm text-slate-500">Notification groups will appear here when the API includes them.</p>
                        )}
                        <Link
                            href="/dashboard/student/notifications"
                            className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700"
                        >
                            View all notifications <ChevronRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Summary stats (legacy metrics; still populated from API) */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                {statItems.map((stat, index) => (
                    <div
                        key={index}
                        className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]"
                    >
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.iconBg} ${stat.iconText}`}>
                            <stat.icon className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
                            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {firstProjectForTracker ? <StudentProgressTracker projectId={firstProjectForTracker} /> : null}

            <div className="flex flex-col items-center justify-between gap-4 rounded-2xl bg-blue-600 p-6 text-white shadow-lg shadow-blue-100 md:flex-row">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                        <TrendingUp className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">Verified Impact Tracking (Section 1)</h3>
                        <p className="text-sm opacity-80">
                            Authenticate your identity and log attendance directly within your Project Report.
                        </p>
                    </div>
                </div>
                <Link href="/dashboard/student/projects">
                    <Button className="h-11 bg-white px-8 font-bold text-blue-600 hover:bg-blue-50">Go to Project Reports</Button>
                </Link>
            </div>

            {activeProjects.some(
                (p) =>
                    p.status?.toLowerCase() === "verified" ||
                    p.status?.toLowerCase() === "approved" ||
                    p.progress >= 80,
            ) && (
                <div className="group relative animate-in overflow-hidden rounded-[2.5rem] border-2 border-slate-900 bg-white p-8 shadow-2xl shadow-slate-200/50 fade-in slide-in-from-top-4 duration-700">
                    <div className="absolute -right-16 -top-16 scale-150 rounded-full bg-slate-900 p-12 opacity-5 transition-transform duration-700 group-hover:scale-[1.6]" />
                    <div className="relative z-10 flex flex-col items-center justify-between gap-8 text-center md:flex-row md:text-left">
                        <div className="flex flex-col items-center gap-6 md:flex-row">
                            <div className="flex h-16 w-16 rotate-3 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-xl transition-transform duration-500 group-hover:rotate-0">
                                <Award className="h-8 w-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Official Digital Credentials</h3>
                                <p className="mt-1 text-sm font-bold text-slate-400">
                                    Your social impact has been institutionally verified. Download your CII certificate.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap justify-center gap-3">
                            <Link href="/dashboard/student/report">
                                <Button className="flex h-12 items-center gap-2 rounded-xl bg-slate-900 px-8 text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-slate-800">
                                    <Star className="h-4 w-4 text-amber-400" /> View CII & Dossier
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            <div>
                <h2 className="mb-4 text-lg font-bold text-slate-800">My Projects</h2>
                <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                    {activeProjects.length > 0 ? (
                        activeProjects.map((project) => (
                            <div
                                key={project.id}
                                className="group flex items-center justify-between border-b border-slate-50 p-6 transition-colors last:border-none hover:bg-slate-50"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-blue-600">
                                        {project.title.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 transition-colors group-hover:text-blue-600">{project.title}</h4>
                                        <p className="text-xs text-slate-500">
                                            {project.category} • {project.status}
                                            {project.report_status ? (
                                                <span className="text-slate-400"> • Report: {project.report_status}</span>
                                            ) : null}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Link href={`/dashboard/student/report?projectId=${project.id}`}>
                                        <Button
                                            size="sm"
                                            variant={
                                                project.status?.toLowerCase() === "verified" || project.progress >= 80 ? "default" : "outline"
                                            }
                                            className={
                                                project.status?.toLowerCase() === "verified" || project.progress >= 80
                                                    ? "border-none bg-green-600 text-white shadow-md shadow-green-100 hover:bg-green-700"
                                                    : ""
                                            }
                                        >
                                            {project.status?.toLowerCase() === "verified" || project.progress >= 80
                                                ? "Get CII Certificate"
                                                : "Edit Report"}
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center text-slate-500">No active projects found.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
