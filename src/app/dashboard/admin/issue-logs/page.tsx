"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Loader2, RefreshCw, Search, ShieldAlert } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { Badge } from "@/app/dashboard/student/report/components/ui/badge";
import { Button } from "@/app/dashboard/student/report/components/ui/button";
import { Card } from "@/app/dashboard/student/report/components/ui/card";
import { Input } from "@/app/dashboard/student/report/components/ui/input";

type IssueLog = {
    id: string;
    eventType?: string;
    severity?: string;
    module?: string | null;
    action?: string | null;
    stage?: string | null;
    statusCode?: number | null;
    method?: string | null;
    path?: string | null;
    message?: string | null;
    errorName?: string | null;
    stack?: string | null;
    userId?: string | null;
    userEmail?: string | null;
    userRole?: string | null;
    targetType?: string | null;
    targetId?: string | null;
    requestId?: string | null;
    ip?: string | null;
    userAgent?: string | null;
    metadata?: unknown;
    createdAt?: string;
};

type IssueLogsResponse = {
    success?: boolean;
    data?: IssueLog[];
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
    };
};

const MODULE_OPTIONS = ["all", "student", "students", "reports", "payments", "support", "admin"];
const SEVERITY_OPTIONS = ["all", "error", "warning"];

function formatWhen(value?: string) {
    if (!value) return "N/A";
    try {
        return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    } catch {
        return "N/A";
    }
}

function severityClass(severity?: string | null) {
    if (severity === "error") return "border-red-200 bg-red-50 text-red-700";
    return "border-amber-200 bg-amber-50 text-amber-700";
}

function statusClass(statusCode?: number | null) {
    if (!statusCode) return "bg-slate-100 text-slate-600";
    if (statusCode >= 500) return "bg-red-100 text-red-700";
    if (statusCode >= 400) return "bg-amber-100 text-amber-700";
    return "bg-emerald-100 text-emerald-700";
}

function prettyJson(value: unknown) {
    if (value == null) return "No metadata";
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

export default function AdminIssueLogsPage() {
    const [logs, setLogs] = useState<IssueLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [moduleFilter, setModuleFilter] = useState("all");
    const [severityFilter, setSeverityFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const itemsPerPage = 20;

    const queryString = useMemo(() => {
        const params = new URLSearchParams({
            page: String(currentPage),
            limit: String(itemsPerPage),
        });
        const q = search.trim();
        if (q) params.set("search", q);
        if (moduleFilter !== "all") params.set("module", moduleFilter);
        if (severityFilter !== "all") params.set("severity", severityFilter);
        return params.toString();
    }, [currentPage, moduleFilter, search, severityFilter]);

    const loadLogs = useCallback(async () => {
        setIsLoading(true);
        setError("");
        try {
            const res = await authenticatedFetch(`/api/v1/admin/issue-logs?${queryString}`, {}, { redirectToLogin: false });
            if (!res?.ok) {
                setLogs([]);
                setTotalItems(0);
                setError("Could not load issue logs. Please check backend/admin permissions.");
                return;
            }
            const body = (await res.json()) as IssueLogsResponse;
            setLogs(Array.isArray(body.data) ? body.data : []);
            setTotalItems(body.meta?.total ?? 0);
        } catch {
            setLogs([]);
            setTotalItems(0);
            setError("Network error while loading issue logs.");
        } finally {
            setIsLoading(false);
        }
    }, [queryString]);

    useEffect(() => {
        void loadLogs();
    }, [loadLogs]);

    useEffect(() => {
        setCurrentPage(1);
    }, [moduleFilter, search, severityFilter]);

    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-0 pb-20 sm:p-4">
            <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-slate-900 text-white shadow-lg">
                        <ShieldAlert className="h-7 w-7" strokeWidth={2} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Issue Logs</h1>
                        <p className="mt-1 max-w-3xl text-sm text-slate-500 sm:text-base">
                            User-facing API failures captured from the backend. Use this to inspect report submission, upload, validation, and
                            other stage-level issues without logging into a user account.
                        </p>
                    </div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => void loadLogs()} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Refresh
                </Button>
            </div>

            <Card className="p-4 shadow-sm">
                <div className="grid gap-3 lg:grid-cols-[1fr_180px_160px_auto] lg:items-end">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search message, email, request ID, path, target..."
                            className="pl-9"
                        />
                    </div>
                    <select
                        value={moduleFilter}
                        onChange={(event) => setModuleFilter(event.target.value)}
                        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/30"
                    >
                        {MODULE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                                {option === "all" ? "All modules" : option}
                            </option>
                        ))}
                    </select>
                    <select
                        value={severityFilter}
                        onChange={(event) => setSeverityFilter(event.target.value)}
                        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/30"
                    >
                        {SEVERITY_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                                {option === "all" ? "All severity" : option}
                            </option>
                        ))}
                    </select>
                    <div className="text-sm text-slate-500 lg:text-right">
                        {totalItems.toLocaleString()} log{totalItems === 1 ? "" : "s"}
                    </div>
                </div>
            </Card>

            {error ? (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                </div>
            ) : null}

            {isLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-24">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                    <p className="text-sm font-medium text-slate-500">Loading issue logs...</p>
                </div>
            ) : logs.length === 0 ? (
                <Card className="py-16 text-center shadow-sm">
                    <ShieldAlert className="mx-auto h-10 w-10 text-slate-300" strokeWidth={1.5} />
                    <h3 className="mt-4 text-lg font-bold text-slate-900">No issue logs found</h3>
                    <p className="mt-2 text-sm text-slate-500">Try changing filters or reproduce a user-facing error.</p>
                </Card>
            ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
                    <div className="hidden grid-cols-[170px_120px_1fr_220px_90px] gap-4 border-b border-slate-100 bg-slate-50/80 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 lg:grid">
                        <span>Time</span>
                        <span>Status</span>
                        <span>Issue</span>
                        <span>User / Request</span>
                        <span>Details</span>
                    </div>
                    <ul role="list">
                        {logs.map((log) => {
                            const isExpanded = expandedId === log.id;
                            return (
                                <li key={log.id} className="border-b border-slate-100 last:border-0">
                                    <button
                                        type="button"
                                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                                        className="grid w-full gap-3 px-4 py-4 text-left transition hover:bg-slate-50/90 lg:grid-cols-[170px_120px_1fr_220px_90px] lg:items-center lg:gap-4"
                                    >
                                        <div className="text-xs tabular-nums text-slate-500">{formatWhen(log.createdAt)}</div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge className={severityClass(log.severity)} variant="outline">
                                                {log.severity || "warning"}
                                            </Badge>
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusClass(log.statusCode)}`}>
                                                {log.statusCode || "N/A"}
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {log.module ? <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{log.module}</span> : null}
                                                {log.stage ? <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{log.stage}</span> : null}
                                            </div>
                                            <p className="mt-1 line-clamp-2 font-semibold text-slate-900">{log.message || log.errorName || "Unhandled issue"}</p>
                                            <p className="mt-1 truncate text-xs text-slate-500">
                                                {[log.method, log.path].filter(Boolean).join(" ")}
                                            </p>
                                        </div>
                                        <div className="min-w-0 text-sm text-slate-600">
                                            <p className="truncate font-medium text-slate-800">{log.userEmail || log.userId || "Unknown user"}</p>
                                            <p className="truncate text-xs text-slate-500">{log.requestId || log.targetId || "No request ID"}</p>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            {isExpanded ? "Hide" : "View"}
                                        </div>
                                    </button>
                                    {isExpanded ? (
                                        <div className="border-t border-slate-100 bg-slate-950 px-4 py-4 text-slate-200">
                                            <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                                                <div>
                                                    <p className="font-bold uppercase tracking-wide text-slate-500">User</p>
                                                    <p className="mt-1 break-all">{log.userEmail || log.userId || "N/A"}</p>
                                                </div>
                                                <div>
                                                    <p className="font-bold uppercase tracking-wide text-slate-500">Target</p>
                                                    <p className="mt-1 break-all">{[log.targetType, log.targetId].filter(Boolean).join(": ") || "N/A"}</p>
                                                </div>
                                                <div>
                                                    <p className="font-bold uppercase tracking-wide text-slate-500">IP</p>
                                                    <p className="mt-1 break-all">{log.ip || "N/A"}</p>
                                                </div>
                                                <div>
                                                    <p className="font-bold uppercase tracking-wide text-slate-500">Request ID</p>
                                                    <p className="mt-1 break-all">{log.requestId || "N/A"}</p>
                                                </div>
                                            </div>
                                            <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-black/40 p-4 text-xs leading-relaxed text-slate-300">
                                                {prettyJson({ metadata: log.metadata, stack: log.stack })}
                                            </pre>
                                        </div>
                                    ) : null}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            <div className="flex items-center justify-between text-sm text-slate-500">
                <span>
                    Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1 || isLoading}
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    >
                        Previous
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages || isLoading}
                        onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    );
}
