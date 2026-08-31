"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { Clock, FolderKanban, Hourglass, ListChecks } from "lucide-react";
import {
    fetchImpactSummary,
    readImpactSummaryCache,
    type CielImpactSummary,
} from "@/utils/cielImpactSummary";
import {
    fetchStudentDashboardData,
    readStudentDashboardCache,
} from "@/utils/student-dashboard-fetch";
import type { DashboardData } from "@/app/dashboard/student/types";
import { CIEL_PATHS, pathStateLabel } from "@/utils/cielPaths";
import { CII_BREAKDOWN_ORDER, CII_SECTION_MAX, CII_SECTION_SHORT_LABELS } from "@/app/dashboard/student/report/utils/ciiSectionWeights";
import ImpactDonut from "@/components/ciel/ImpactDonut";
import ProgressBar from "@/components/ciel/ProgressBar";
import StatTile from "@/components/ciel/StatTile";
import clsx from "clsx";

type Activity = {
    title: string;
    date: string;
    hours: number;
    status: string;
};

const STATUS_COLORS: Record<string, string> = {
    verified: "#0e7d74",
    paid: "#0e7d74",
    submitted: "#0369a1",
    draft: "#64748b",
    pending_payment: "#b45309",
    payment_under_review: "#b45309",
    pending: "#b45309",
};

function formatStatus(status: string): string {
    return status.replace(/_/g, " ");
}

function hoursByMonth(activities: Activity[]): Array<{ label: string; hours: number }> {
    const map = new Map<string, number>();
    for (const a of activities) {
        const d = new Date(a.date);
        if (Number.isNaN(d.getTime())) continue;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        map.set(key, (map.get(key) ?? 0) + (a.hours || 0));
    }
    return [...map.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-8)
        .map(([key, hours]) => {
            const [y, m] = key.split("-");
            const label = new Date(Number(y), Number(m) - 1, 1).toLocaleString("en", { month: "short" });
            return { label, hours: Math.round(hours * 10) / 10 };
        });
}

export default function StudentImpactAnalytics({
    activities,
    hoursThisMonth,
}: {
    activities: Activity[];
    hoursThisMonth: number;
}) {
    // Starts null (matching the server render) rather than reading localStorage synchronously —
    // that caused a hydration mismatch (and the thrown error killed interactivity for the whole
    // page) for any returning visitor who already had cached data. Read client-side in the effect
    // below instead, which only runs after hydration completes.
    const [summary, setSummary] = useState<CielImpactSummary | null>(null);
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);

    useEffect(() => {
        setSummary(readImpactSummaryCache());
        void fetchImpactSummary({ redirectToLogin: false }).then((data) => {
            if (data) setSummary(data);
        });
        const cached = readStudentDashboardCache();
        if (cached) setDashboard(cached);
        void fetchStudentDashboardData({ redirectToLogin: false }).then((data) => {
            if (data) setDashboard(data);
        });
    }, []);

    const monthSeries = useMemo(() => hoursByMonth(activities), [activities]);

    const reportStatusSeries = useMemo(() => {
        const counts = new Map<string, number>();
        for (const p of dashboard?.activeProjects ?? []) {
            const status = (p.report_status || p.status || "draft").toLowerCase();
            counts.set(status, (counts.get(status) ?? 0) + 1);
        }
        return [...counts.entries()].map(([label, value]) => ({
            label: formatStatus(label),
            value,
            color: STATUS_COLORS[label] ?? "#64748b",
        }));
    }, [dashboard]);

    const requiredHours = (dashboard?.activeProjects ?? []).reduce(
        (sum, p) => sum + (Number(p.required_hours_per_student) || 0),
        0,
    );
    const verifiedHours = summary?.verifiedHours ?? dashboard?.overview?.totalVerifiedHours ?? 0;
    const pendingHours = summary?.pendingHours ?? 0;
    const hoursTarget = requiredHours > 0 ? requiredHours : Math.max(verifiedHours + pendingHours, 16);
    const hoursPct = hoursTarget > 0 ? Math.min(100, Math.round((verifiedHours / hoursTarget) * 100)) : 0;

    return (
        <section className="space-y-5">
            <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ciel-text-soft">My analytics</p>
                <h2 className="mt-1 text-lg font-bold text-ciel-text">Hours, score, and path progress for you</h2>
                <p className="mt-0.5 text-sm text-ciel-text-mid">
                    Built from your verified attendance, reports, and path work — not platform BI.
                </p>
            </div>

            <div className="rounded-ciel-xl border border-ciel-border bg-white p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-6">
                    <ImpactDonut score={summary?.compositeScore ?? 0} />
                    <div className="grid min-w-[16rem] flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
                        <StatTile label="Verified hours" value={`${Math.round(verifiedHours)}h`} icon={Clock} />
                        <StatTile label="Pending hours" value={`${Math.round(pendingHours)}h`} icon={Hourglass} />
                        <StatTile label="This month" value={`${Math.round(hoursThisMonth)}h`} icon={Clock} />
                        <StatTile
                            label="Active work"
                            value={String(summary?.activeEngagements ?? dashboard?.overview?.activeProjectsCount ?? 0)}
                            icon={ListChecks}
                        />
                    </div>
                </div>
                <div className="mt-5">
                    <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-ciel-text-mid">
                        <span>Hours toward your current requirement</span>
                        <span>
                            {Math.round(verifiedHours)} / {Math.round(hoursTarget)}h
                        </span>
                    </div>
                    <ProgressBar value={hoursPct} className="h-2.5" />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-ciel-lg border border-ciel-border bg-white p-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-ciel-text-soft">Hours by month</p>
                    {monthSeries.length ? (
                        <div className="mt-3 h-52">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthSeries} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                                    <CartesianGrid stroke="#e8e9ee" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#7a919a" }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: "#7a919a" }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        formatter={(value) => [`${value ?? 0}h`, "Hours"]}
                                        contentStyle={{ borderRadius: 8, border: "1px solid #e8e9ee", fontSize: 12 }}
                                    />
                                    <Bar dataKey="hours" fill="#0e7d74" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <p className="mt-8 text-center text-sm text-ciel-text-soft">Log sessions to see your monthly hours.</p>
                    )}
                </div>

                <div className="rounded-ciel-lg border border-ciel-border bg-white p-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-ciel-text-soft">Report status</p>
                    {reportStatusSeries.length ? (
                        <div className="mt-3 flex h-52 items-center gap-4">
                            <div className="h-full min-w-0 flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={reportStatusSeries} dataKey="value" nameKey="label" innerRadius={48} outerRadius={72} paddingAngle={2}>
                                            {reportStatusSeries.map((row) => (
                                                <Cell key={row.label} fill={row.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e8e9ee", fontSize: 12 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <ul className="shrink-0 space-y-1.5 text-xs">
                                {reportStatusSeries.map((row) => (
                                    <li key={row.label} className="flex items-center gap-2 capitalize text-ciel-text-mid">
                                        <span className="h-2 w-2 rounded-full" style={{ background: row.color }} />
                                        {row.label} · {row.value}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p className="mt-8 text-center text-sm text-ciel-text-soft">Start a report to see status here.</p>
                    )}
                </div>
            </div>

            <div className="rounded-ciel-lg border border-ciel-border bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-ciel-text-soft">Your paths</p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {CIEL_PATHS.map((path) => {
                        const status = summary?.pathsStatus[path.key];
                        const state = status?.state ?? "not_started";
                        return (
                            <Link
                                key={path.key}
                                href={path.href}
                                className="rounded-ciel-md border border-ciel-border p-3 hover:border-ciel-green/40"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-bold text-ciel-text">
                                        {path.emoji} {path.label}
                                    </span>
                                    <span
                                        className={clsx(
                                            "rounded-ciel-xs px-2 py-0.5 text-[10px] font-bold uppercase",
                                            state === "complete" && "bg-ciel-green-soft text-ciel-green-deep",
                                            state === "active" && "bg-ciel-indigo-soft text-ciel-indigo",
                                            state === "not_started" && "bg-ciel-page text-ciel-text-soft",
                                        )}
                                    >
                                        {pathStateLabel(state)}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-ciel-text-soft">{status?.detail ?? "Not started"}</p>
                                <ProgressBar value={status?.progress ?? 0} className="mt-2" />
                            </Link>
                        );
                    })}
                </div>
            </div>

            {(dashboard?.activeProjects.length ?? 0) > 0 ? (
                <div className="rounded-ciel-lg border border-ciel-border bg-white p-5">
                    <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-ciel-text-soft">
                        <FolderKanban className="h-3.5 w-3.5" /> My projects
                    </p>
                    <div className="space-y-3">
                        {dashboard?.activeProjects.map((project) => (
                            <Link
                                key={project.id}
                                href={`/dashboard/student/report?projectId=${encodeURIComponent(project.id)}`}
                                className="block rounded-ciel-md border border-ciel-border p-3 hover:border-ciel-green/40"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm font-bold text-ciel-text">{project.title}</p>
                                    <span className="rounded-full bg-ciel-page px-2 py-0.5 text-[10px] font-bold uppercase text-ciel-text-mid">
                                        {formatStatus(project.report_status || project.status || "draft")}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-ciel-text-soft">
                                    {project.required_hours_per_student
                                        ? `${project.required_hours_per_student}h required`
                                        : "Hours requirement not set"}
                                    {project.participation_type ? ` · ${project.participation_type}` : ""}
                                </p>
                                <ProgressBar value={project.progress ?? 0} className="mt-2" />
                            </Link>
                        ))}
                    </div>
                </div>
            ) : null}

            {summary?.rubric ? (
                <div className="rounded-ciel-lg border border-ciel-border bg-white p-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-ciel-text-soft">CII breakdown</p>
                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {CII_BREAKDOWN_ORDER.map((key) => {
                            const max = CII_SECTION_MAX[key];
                            const raw = summary.rubric[key] ?? 0;
                            const pct = max > 0 ? Math.round((raw / max) * 100) : 0;
                            return (
                                <div key={key}>
                                    <div className="mb-1 flex justify-between text-[11px] font-semibold text-ciel-text-mid">
                                        <span>{CII_SECTION_SHORT_LABELS[key]}</span>
                                        <span>
                                            {raw}/{max}
                                        </span>
                                    </div>
                                    <ProgressBar value={pct} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : null}
        </section>
    );
}
