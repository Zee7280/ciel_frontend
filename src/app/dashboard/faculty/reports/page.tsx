"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authenticatedFetch } from "@/utils/api";
import { CheckCircle2, Clock, Eye, FileText, Search } from "lucide-react";
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

function normalizeStatus(value: string | null | undefined): string {
    if (!value) return "";
    return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function reportMatchesTab(report: FacultyReportRow, tab: ReportStatusFilter): boolean {
    if (tab === "all") return true;
    const overall = normalizeStatus(report.status);
    return overall === "verified" || overall === "paid" || overall === "partner_verified";
}

export default function FacultyStudentReportsPage() {
    const router = useRouter();
    const [reports, setReports] = useState<FacultyReportRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<ReportStatusFilter>("all");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchReports();
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
            submitted: { color: "bg-yellow-50 text-yellow-700", icon: Clock, label: "Submitted" },
            verified: { color: "bg-green-50 text-green-700", icon: CheckCircle2, label: "Verified" },
            paid: { color: "bg-green-50 text-green-700", icon: CheckCircle2, label: "Verified" },
            partner_verified: { color: "bg-indigo-50 text-indigo-700", icon: CheckCircle2, label: "Verified" },
            pending: { color: "bg-amber-50 text-amber-700", icon: Clock, label: "Pending" },
            draft: { color: "bg-slate-100 text-slate-600", icon: FileText, label: "Draft" },
        };
        const { color, icon: Icon, label } = config[key] || config.pending;
        return (
            <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", color)}>
                <Icon className="h-3.5 w-3.5" />
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
            <div className="mx-auto max-w-7xl space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                        Student impact reports
                    </h1>
                    <p className="mt-2 text-sm text-slate-500 sm:text-base">
                        Read-only executive dossiers for your supervised students, visible after CIEL Admin final
                        approval.
                    </p>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="relative min-w-0 flex-1">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by student, email, or project..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm text-slate-700 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-50"
                            />
                        </div>
                        <select
                            value={activeTab}
                            onChange={(e) => setActiveTab(e.target.value as ReportStatusFilter)}
                            className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none lg:w-56"
                        >
                            {statusOptions.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="rounded-[28px] border border-slate-200 bg-white p-16 text-center shadow-sm">
                        <FileText className="mx-auto mb-4 h-10 w-10 text-slate-400" />
                        <h3 className="text-xl font-bold text-slate-900">No reports found</h3>
                        <p className="mt-2 text-slate-500">
                            Reports appear here after CIEL Admin verification. Try another search or check back later.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="min-w-[800px] w-full">
                                <thead className="border-b border-slate-200 bg-slate-100/80">
                                    <tr className="text-left">
                                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">Student</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">Project</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">Organization</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">Submitted</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">View</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredReports.map((report) => {
                                        const submitted =
                                            report.submission_date || report.report_submitted_at || "";
                                        return (
                                            <tr key={report.id} className="hover:bg-slate-50/60">
                                                <td className="px-6 py-5">
                                                    <div className="font-semibold text-slate-900">{report.student_name}</div>
                                                    <div className="mt-1 break-all text-sm text-slate-500">
                                                        {report.student_email}
                                                    </div>
                                                </td>
                                                <td className="max-w-[240px] break-words px-6 py-5 text-slate-700">
                                                    {report.project_title}
                                                </td>
                                                <td className="px-6 py-5 text-sm text-slate-600">
                                                    {report.organization_name || "—"}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-5 text-sm text-slate-700">
                                                    {submitted
                                                        ? new Date(submitted).toLocaleDateString("en-US", {
                                                              month: "short",
                                                              day: "numeric",
                                                              year: "numeric",
                                                          })
                                                        : "—"}
                                                </td>
                                                <td className="px-6 py-5">{getStatusBadge(report.status)}</td>
                                                <td className="px-6 py-5">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            router.push(`/dashboard/faculty/reports/${report.id}`)
                                                        }
                                                        className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
                                                    >
                                                        <Eye className="h-4 w-4" />
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
