"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authenticatedFetch } from "@/utils/api";
import { CheckCircle2, Clock, Eye, FileText, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";

interface FacultyReportRow {
    id: string;
    student_name: string;
    student_email: string;
    project_title: string;
    organization_name?: string;
    status: string;
    submission_date?: string;
    report_submitted_at?: string;
}

type ReportStatusFilter = "all" | "verified";

const TABLE_HEAD =
    "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap";

function normalizeStatus(value: string | null | undefined): string {
    if (!value) return "";
    return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function reportMatchesTab(report: FacultyReportRow, tab: ReportStatusFilter): boolean {
    if (tab === "all") return true;
    const overall = normalizeStatus(report.status);
    return overall === "verified" || overall === "paid" || overall === "partner_verified";
}

function formatOrganizationLabel(name?: string): string {
    if (!name?.trim()) return "—";
    const trimmed = name.trim();
    if (trimmed.length <= 56) return trimmed;
    return `${trimmed.slice(0, 53)}…`;
}

export default function FacultyStudentReportsPage() {
    const router = useRouter();
    const [reports, setReports] = useState<FacultyReportRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<ReportStatusFilter>("all");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        void fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const response = await authenticatedFetch("/api/v1/faculty/reports");
            if (response?.ok) {
                const data = await response.json();
                setReports(Array.isArray(data.data) ? data.data : []);
            } else {
                toast.error("Failed to load student reports");
                setReports([]);
            }
        } catch {
            toast.error("Failed to load student reports");
            setReports([]);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string | undefined) => {
        const key = normalizeStatus(status) || "pending";
        const config: Record<string, { color: string; icon: typeof Clock; label: string }> = {
            submitted: { color: "bg-amber-50 text-amber-800 ring-1 ring-amber-200/80", icon: Clock, label: "Submitted" },
            verified: { color: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80", icon: CheckCircle2, label: "Verified" },
            paid: { color: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80", icon: CheckCircle2, label: "Verified" },
            partner_verified: {
                color: "bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200/80",
                icon: CheckCircle2,
                label: "Verified",
            },
            pending: { color: "bg-slate-100 text-slate-600 ring-1 ring-slate-200/80", icon: Clock, label: "Pending" },
            draft: { color: "bg-slate-100 text-slate-600 ring-1 ring-slate-200/80", icon: FileText, label: "Draft" },
        };
        const { color, icon: Icon, label } = config[key] || config.pending;
        return (
            <span
                className={clsx(
                    "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold",
                    color,
                )}
            >
                <Icon className="h-3 w-3 shrink-0" />
                {label}
            </span>
        );
    };

    const filteredReports = reports.filter((report) => {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
            report.student_name?.toLowerCase().includes(q) ||
            report.student_email?.toLowerCase().includes(q) ||
            report.project_title?.toLowerCase().includes(q) ||
            (report.organization_name && report.organization_name.toLowerCase().includes(q));
        return matchesSearch && reportMatchesTab(report, activeTab);
    });

    const statusOptions = [
        { id: "all", label: "All admin-verified" },
        { id: "verified", label: "Verified only" },
    ] as const;

    return (
        <div className="min-h-screen bg-[#f7f9fc] px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-5">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600">Faculty</p>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                        Student impact reports
                    </h1>
                    <p className="mt-1.5 max-w-3xl text-sm text-slate-500">
                        Read-only executive dossiers for your supervised students, visible after CIEL Admin final
                        approval.
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative min-w-0 flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by student, email, or project…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                            />
                        </div>
                        <select
                            value={activeTab}
                            onChange={(e) => setActiveTab(e.target.value as ReportStatusFilter)}
                            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none sm:w-52"
                        >
                            {statusOptions.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                        {loading
                            ? "Loading reports…"
                            : `${filteredReports.length} report${filteredReports.length === 1 ? "" : "s"} shown`}
                    </p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 shadow-sm">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                        <FileText className="mx-auto mb-3 h-9 w-9 text-slate-300" />
                        <h3 className="text-lg font-semibold text-slate-900">No reports found</h3>
                        <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
                            Reports appear here after CIEL Admin verification. Try another search or check back later.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[960px] border-collapse text-left">
                                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 backdrop-blur-sm">
                                    <tr>
                                        <th className={TABLE_HEAD}>Student</th>
                                        <th className={TABLE_HEAD}>Project</th>
                                        <th className={TABLE_HEAD}>Organization</th>
                                        <th className={TABLE_HEAD}>Submitted</th>
                                        <th className={TABLE_HEAD}>Status</th>
                                        <th className={clsx(TABLE_HEAD, "text-right")}>View</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredReports.map((report) => {
                                        const submitted =
                                            report.submission_date || report.report_submitted_at || "";
                                        const orgLabel = formatOrganizationLabel(report.organization_name);
                                        return (
                                            <tr key={report.id} className="transition-colors hover:bg-slate-50/70">
                                                <td className="px-4 py-3 align-top">
                                                    <div className="flex items-start gap-2.5">
                                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                                                            {(report.student_name || "?").charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-semibold text-slate-900">
                                                                {report.student_name}
                                                            </p>
                                                            <p
                                                                className="truncate text-xs text-slate-500"
                                                                title={report.student_email}
                                                            >
                                                                {report.student_email}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="max-w-[220px] px-4 py-3 align-top">
                                                    <p
                                                        className="line-clamp-2 text-sm font-medium leading-snug text-slate-800"
                                                        title={report.project_title}
                                                    >
                                                        {report.project_title}
                                                    </p>
                                                </td>
                                                <td className="max-w-[200px] px-4 py-3 align-top">
                                                    <p
                                                        className="line-clamp-2 text-xs leading-snug text-slate-600"
                                                        title={report.organization_name || undefined}
                                                    >
                                                        {orgLabel}
                                                    </p>
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 align-top text-xs text-slate-600">
                                                    {submitted
                                                        ? new Date(submitted).toLocaleDateString("en-US", {
                                                              month: "short",
                                                              day: "numeric",
                                                              year: "numeric",
                                                          })
                                                        : "—"}
                                                </td>
                                                <td className="px-4 py-3 align-top">{getStatusBadge(report.status)}</td>
                                                <td className="px-4 py-3 text-right align-top">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            router.push(`/dashboard/faculty/reports/${report.id}`)
                                                        }
                                                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                        View dossier
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
