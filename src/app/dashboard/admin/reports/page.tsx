"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Flag, MessageSquare, AlertTriangle, RefreshCw } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { formatDisplayId } from "@/utils/displayIds";
import Link from "next/link";

type LegacyReport = {
    id: string;
    subject?: string;
    type?: string;
    reporter?: string;
    severity?: string;
    status?: string;
    created_at?: string;
};

const PAGE_SIZE = 20;

const SEVERITY_STYLES: Record<string, string> = {
    critical: "bg-rose-100 text-rose-800",
    high: "bg-red-100 text-red-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-blue-100 text-blue-700",
};

function severityClass(severity: string | undefined): string {
    return SEVERITY_STYLES[String(severity ?? "").toLowerCase()] ?? "bg-slate-100 text-slate-600";
}

function isPending(status: string | undefined): boolean {
    return String(status ?? "").toLowerCase() === "pending";
}

export default function AdminReportsPage() {
    const [reports, setReports] = useState<LegacyReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);

    const fetchReports = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // NOTE: `/admin/reports` returns community-service StudentReport rows, which do
            // not have subject/type/reporter/severity. This page renders the legacy generic
            // moderation Report shape, which lives at its own explicit route.
            const res = await authenticatedFetch(`/api/v1/admin/reports/legacy-system`);
            if (!res || !res.ok) {
                setReports([]);
                setError("Could not load reports. Please try again.");
                return;
            }
            const data = await res.json().catch(() => null);
            const rows: unknown = Array.isArray(data) ? data : data?.data;
            setReports(
                Array.isArray(rows)
                    ? (rows as LegacyReport[]).filter((r) => r && typeof r === "object" && r.id != null)
                    : [],
            );
            setPage(1);
        } catch (err) {
            console.error("Failed to fetch reports", err);
            setReports([]);
            setError("Could not load reports. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchReports();
    }, [fetchReports]);

    const pageCount = Math.max(1, Math.ceil(reports.length / PAGE_SIZE));
    const currentPage = Math.min(page, pageCount);
    const pageRows = useMemo(
        () => reports.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
        [reports, currentPage],
    );

    return (
        <div className="min-w-0 space-y-6 p-0 lg:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">Reports & Moderation</h1>
                    <p className="text-slate-500">Handle user reports, flags, and system alerts.</p>
                </div>
                <Link
                    href="/dashboard/admin/reports/verify"
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                    Student report verification
                </Link>
            </div>

            {error ? (
                <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <span className="flex items-center gap-2 text-sm font-medium text-red-800">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        {error}
                    </span>
                    <button
                        type="button"
                        onClick={() => void fetchReports()}
                        className="inline-flex h-9 items-center gap-2 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Retry
                    </button>
                </div>
            ) : null}

            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                {/* Cards under md */}
                <div className="divide-y divide-slate-100 md:hidden">
                    {isLoading ? (
                        <p className="p-6 text-center text-slate-500">Loading reports...</p>
                    ) : pageRows.length === 0 ? (
                        <p className="p-6 text-center text-slate-500">{error ? "Nothing to show." : "No reports found."}</p>
                    ) : (
                        pageRows.map((report) => (
                            <div key={report.id} className="min-w-0 space-y-2 p-4">
                                <div className="break-words font-bold text-slate-900">{report.subject || "Untitled report"}</div>
                                <div className="text-xs text-slate-500" title={String(report.id ?? "")}>
                                    ID: {formatDisplayId(report.id, "RPT")}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                                    {report.type === "Content" ? (
                                        <MessageSquare className="h-4 w-4 text-blue-500" />
                                    ) : (
                                        <Flag className="h-4 w-4 text-red-500" />
                                    )}
                                    {report.type || "-"}
                                    <span className="text-slate-400">by</span>
                                    <span className="break-all">{report.reporter || "Unknown"}</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <span className={`rounded px-2 py-1 text-xs font-bold uppercase ${severityClass(report.severity)}`}>
                                        {report.severity || "n/a"}
                                    </span>
                                    <StatusPill status={report.status} />
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Table from md */}
                <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[640px] text-left">
                        <thead className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="p-4 lg:p-6">Report Subject</th>
                                <th className="p-4 lg:p-6">Type</th>
                                <th className="p-4 lg:p-6">Reporter</th>
                                <th className="p-4 lg:p-6">Severity</th>
                                <th className="p-4 lg:p-6">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">Loading reports...</td>
                                </tr>
                            ) : pageRows.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        {error ? "Nothing to show." : "No reports found."}
                                    </td>
                                </tr>
                            ) : (
                                pageRows.map((report) => (
                                    <tr key={report.id} className="transition-colors hover:bg-slate-50/50">
                                        <td className="max-w-xs p-4 lg:p-6">
                                            <div className="break-words font-bold text-slate-900">{report.subject || "Untitled report"}</div>
                                            <div className="text-xs text-slate-500" title={String(report.id ?? "")}>
                                                ID: {formatDisplayId(report.id, "RPT")}
                                            </div>
                                        </td>
                                        <td className="p-4 lg:p-6">
                                            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                                {report.type === "Content" ? (
                                                    <MessageSquare className="h-4 w-4 text-blue-500" />
                                                ) : (
                                                    <Flag className="h-4 w-4 text-red-500" />
                                                )}
                                                {report.type || "-"}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-slate-600 lg:p-6">{report.reporter || "Unknown"}</td>
                                        <td className="p-4 lg:p-6">
                                            <span className={`rounded px-2 py-1 text-xs font-bold uppercase ${severityClass(report.severity)}`}>
                                                {report.severity || "n/a"}
                                            </span>
                                        </td>
                                        <td className="p-4 lg:p-6">
                                            <StatusPill status={report.status} />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {reports.length > PAGE_SIZE ? (
                    <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
                        <button
                            type="button"
                            disabled={currentPage <= 1}
                            onClick={() => setPage(currentPage - 1)}
                            className="h-9 rounded-lg border border-slate-200 px-3 font-semibold disabled:opacity-40"
                        >
                            Previous
                        </button>
                        <span className="tabular-nums">
                            Page {currentPage} of {pageCount} ({reports.length} total)
                        </span>
                        <button
                            type="button"
                            disabled={currentPage >= pageCount}
                            onClick={() => setPage(currentPage + 1)}
                            className="h-9 rounded-lg border border-slate-200 px-3 font-semibold disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function StatusPill({ status }: { status: string | undefined }) {
    return isPending(status) ? (
        <span className="rounded bg-amber-50 px-2 py-1 text-xs font-bold uppercase text-amber-600">Pending</span>
    ) : (
        <span className="rounded bg-green-50 px-2 py-1 text-xs font-bold uppercase text-green-600">Resolved</span>
    );
}
