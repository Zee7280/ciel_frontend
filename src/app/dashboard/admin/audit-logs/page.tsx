"use client";

import { useCallback, useEffect, useState } from "react";
import {
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    History,
    Loader2,
    RefreshCw,
    Search,
} from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { Badge } from "@/app/dashboard/student/report/components/ui/badge";
import { Button } from "@/app/dashboard/student/report/components/ui/button";
import { Card } from "@/app/dashboard/student/report/components/ui/card";
import { Input } from "@/app/dashboard/student/report/components/ui/input";

export type AuditLogRow = {
    id: string;
    action?: string | null;
    user?: string | null;
    user_email?: string | null;
    target?: string | null;
    target_type?: string | null;
    ip?: string | null;
    details?: unknown;
    created_at?: string;
};

type AuditLogsResponse = {
    success?: boolean;
    data?: AuditLogRow[];
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
    };
};

function formatWhen(value?: string | null) {
    if (!value) return "N/A";
    try {
        return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    } catch {
        return "N/A";
    }
}

function prettyJson(value: unknown) {
    if (value == null) return "—";
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

function actionAccent(action: string): string {
    const a = action.toUpperCase();
    if (a.includes("DELETE")) return "border-amber-200 bg-amber-50 text-amber-900";
    if (a.includes("FAIL") || a.includes("REJECT")) return "border-red-200 bg-red-50 text-red-800";
    if (a.includes("POST")) return "border-blue-200 bg-blue-50 text-blue-800";
    if (a.includes("PATCH") || a.includes("PUT")) return "border-violet-200 bg-violet-50 text-violet-800";
    return "border-slate-200 bg-slate-50 text-slate-800";
}

function matchesSearch(log: AuditLogRow, q: string): boolean {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    const hay = [
        log.action,
        log.user,
        log.user_email,
        log.target,
        log.target_type,
        log.ip,
        typeof log.details === "string" ? log.details : prettyJson(log.details),
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
    return hay.includes(needle);
}

export default function AdminAuditLogsPage() {
    const [logs, setLogs] = useState<AuditLogRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;
    const [totalItems, setTotalItems] = useState(0);

    const loadLogs = useCallback(async () => {
        setIsLoading(true);
        setError("");
        try {
            const res = await authenticatedFetch(
                `/api/v1/admin/audit-logs?page=${currentPage}&limit=${itemsPerPage}`,
                {},
                { redirectToLogin: false },
            );
            if (!res?.ok) {
                setLogs([]);
                setTotalItems(0);
                setError("Could not load audit logs. Check admin permissions or try again.");
                return;
            }
            const body = (await res.json()) as AuditLogsResponse;
            if (body.success && Array.isArray(body.data)) {
                setLogs(body.data);
                setTotalItems(body.meta?.total ?? body.data.length);
            } else {
                setLogs([]);
                setTotalItems(0);
                setError("Unexpected response from audit logs API.");
            }
        } catch {
            setLogs([]);
            setTotalItems(0);
            setError("Network error while loading audit logs.");
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, itemsPerPage]);

    useEffect(() => {
        void loadLogs();
    }, [loadLogs]);

    const displayedLogs = logs.filter((log) => matchesSearch(log, searchQuery));
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-0 pb-20 sm:p-4">
            <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-slate-900 text-white shadow-lg">
                        <History className="h-7 w-7" strokeWidth={2} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Audit Logs</h1>
                        <p className="mt-1 max-w-3xl text-sm text-slate-500 sm:text-base">
                            Admin mutations (successful POST/PATCH/DELETE) recorded by the backend. Use this for accountability and tracing who
                            changed what — separate from Issue Logs (API errors).
                        </p>
                    </div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => void loadLogs()} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Refresh
                </Button>
            </div>

            <Card className="p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter current page: action, user, target, details…"
                            className="pl-9"
                        />
                    </div>
                    <p className="text-sm text-slate-500">{totalItems.toLocaleString()} total entr{totalItems === 1 ? "y" : "ies"}</p>
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
                    <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
                    <p className="text-sm font-medium text-slate-500">Loading audit logs…</p>
                </div>
            ) : displayedLogs.length === 0 ? (
                <Card className="py-16 text-center shadow-sm">
                    <History className="mx-auto h-10 w-10 text-slate-300" strokeWidth={1.5} />
                    <h3 className="mt-4 text-lg font-bold text-slate-900">No audit entries match</h3>
                    <p className="mt-2 text-sm text-slate-500">Try another page, clear search, or perform an admin action to generate logs.</p>
                </Card>
            ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
                    <div className="hidden grid-cols-[168px_minmax(0,1fr)_minmax(0,220px)_100px_90px] gap-4 border-b border-slate-100 bg-slate-50/80 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 lg:grid">
                        <span>Time</span>
                        <span>Action</span>
                        <span>Actor / target</span>
                        <span>IP</span>
                        <span>Details</span>
                    </div>
                    <ul role="list">
                        {displayedLogs.map((log) => {
                            const actionLabel = log.action?.trim() || "unknown_action";
                            const isExpanded = expandedId === log.id;
                            return (
                                <li key={log.id} className="border-b border-slate-100 last:border-0">
                                    <button
                                        type="button"
                                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                                        className="grid w-full gap-3 px-4 py-4 text-left transition hover:bg-slate-50/90 lg:grid-cols-[168px_minmax(0,1fr)_minmax(0,220px)_100px_90px] lg:items-center lg:gap-4"
                                    >
                                        <div className="text-xs tabular-nums text-slate-500">{formatWhen(log.created_at)}</div>
                                        <div className="min-w-0">
                                            <Badge variant="outline" className={`inline-block max-w-full whitespace-normal text-left leading-snug ${actionAccent(actionLabel)}`}>
                                                {actionLabel}
                                            </Badge>
                                        </div>
                                        <div className="min-w-0 text-sm text-slate-700">
                                            <p className="truncate font-semibold text-slate-900">{log.user || "Unknown"}</p>
                                            <p className="truncate text-xs text-slate-500">
                                                {log.target ?? "—"}
                                                {log.target_type ? (
                                                    <>
                                                        {" "}
                                                        <span className="italic text-slate-400">({log.target_type})</span>
                                                    </>
                                                ) : null}
                                            </p>
                                        </div>
                                        <div className="text-xs tabular-nums text-slate-500">{log.ip || "—"}</div>
                                        <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                                            {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                                            {isExpanded ? "Hide" : "Expand"}
                                        </div>
                                    </button>
                                    {isExpanded ? (
                                        <div className="border-t border-slate-100 bg-slate-950 px-4 py-4 text-slate-200">
                                            <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                                                <div>
                                                    <p className="font-bold uppercase tracking-wide text-slate-500">User email</p>
                                                    <p className="mt-1 break-all">{log.user_email || log.user || "—"}</p>
                                                </div>
                                                <div>
                                                    <p className="font-bold uppercase tracking-wide text-slate-500">Target</p>
                                                    <p className="mt-1 break-all">{log.target ?? "—"}</p>
                                                </div>
                                                <div>
                                                    <p className="font-bold uppercase tracking-wide text-slate-500">Target type</p>
                                                    <p className="mt-1 break-all">{log.target_type ?? "—"}</p>
                                                </div>
                                                <div>
                                                    <p className="font-bold uppercase tracking-wide text-slate-500">IP</p>
                                                    <p className="mt-1 break-all">{log.ip ?? "—"}</p>
                                                </div>
                                            </div>
                                            <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-black/40 p-4 text-xs leading-relaxed text-slate-300">
                                                {prettyJson(log.details)}
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
