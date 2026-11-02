"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Download, Loader2, RefreshCw, Search, ShieldAlert, Trash2 } from "lucide-react";
import { authenticatedFetch, resolveSameOriginApiPath } from "@/utils/api";
import { deleteAdminLogs, downloadAdminCsv, num } from "@/utils/adminLogTools";
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
    resolvedAt?: string | null;
    userAgent?: string | null;
    metadata?: unknown;
    /** List rows are summaries; these say whether the detail route has a payload to show. */
    hasMetadata?: boolean;
    hasStack?: boolean;
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

const MODULE_OPTIONS = [
    "all",
    "auth",
    "engagement",
    "student",
    "students",
    "reports",
    "payments",
    "support",
    "admin",
    "opportunities",
] as const;
const METHOD_OPTIONS = ["all", "GET", "POST", "PUT", "PATCH", "DELETE"] as const;
const SEVERITY_OPTIONS = ["all", "error", "warning", "info"] as const;

const SEARCH_DEBOUNCE_MS = 350;

type IssueSummary = {
    open_total: number;
    resolved_total: number;
    last_24h: number;
    last_7d: number;
    open_by_severity: { key: string; count: number }[];
    open_by_module: { key: string; count: number }[];
    open_by_status: { key: string; count: number }[];
    top_open_messages: { key: string; count: number }[];
};

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
    if (severity === "info") return "border-blue-200 bg-blue-50 text-blue-700";
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
    /** Detail payloads (metadata + stack) fetched on expand, keyed by log id. */
    const [details, setDetails] = useState<Record<string, { metadata?: unknown; stack?: string | null; error?: string }>>({});
    const loadDetail = async (id: string) => {
        if (details[id]) return;
        try {
            const res = await authenticatedFetch(
                resolveSameOriginApiPath(`/api/v1/admin/issue-logs/${encodeURIComponent(id)}`),
                {},
                { redirectToLogin: false },
            );
            const body = res?.ok ? ((await res.json()) as { data?: { metadata?: unknown; stack?: string | null } }) : null;
            setDetails((prev) => ({
                ...prev,
                [id]: body?.data ? { metadata: body.data.metadata, stack: body.data.stack } : { error: `Could not load details (HTTP ${res?.status ?? "network"}).` },
            }));
        } catch {
            setDetails((prev) => ({ ...prev, [id]: { error: "Could not load details." } }));
        }
    };

    const [summary, setSummary] = useState<IssueSummary | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState("");
    const [purgeDays, setPurgeDays] = useState("30");
    const loadSummary = useCallback(async () => {
        try {
            const res = await authenticatedFetch(resolveSameOriginApiPath("/api/v1/admin/issue-logs/summary"), {}, { redirectToLogin: false });
            const body = res?.ok ? ((await res.json()) as { data?: IssueSummary }) : null;
            setSummary(body?.data ?? null);
        } catch {
            setSummary(null);
        }
    }, []);
    useEffect(() => {
        void loadSummary();
    }, [loadSummary]);

    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [moduleFilter, setModuleFilter] = useState("all");
    const [severityFilter, setSeverityFilter] = useState("all");
    const [methodFilter, setMethodFilter] = useState("all");
    const [resolvedFilter, setResolvedFilter] = useState<"open" | "resolved" | "all">("open");
    const [resolving, setResolving] = useState(false);
    const [resolveMessage, setResolveMessage] = useState("");
    const [statusCodeFilter, setStatusCodeFilter] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [knownModules, setKnownModules] = useState<string[]>([]);
    const reqSeq = useRef(0);
    const abortRef = useRef<AbortController | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const itemsPerPage = 20;

    useEffect(() => {
        const timer = window.setTimeout(() => {
            const next = searchInput.trim();
            setDebouncedSearch((prev) => {
                if (prev !== next) setCurrentPage(1);
                return next;
            });
        }, SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
    }, [searchInput]);

    const queryString = useMemo(() => {
        const params = new URLSearchParams({
            page: String(currentPage),
            limit: String(itemsPerPage),
        });
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (moduleFilter !== "all") params.set("module", moduleFilter);
        if (severityFilter !== "all") params.set("severity", severityFilter);
        if (methodFilter !== "all") params.set("method", methodFilter);
        if (/^\d{3}$/.test(statusCodeFilter.trim())) params.set("statusCode", statusCodeFilter.trim());
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
        if (resolvedFilter !== "all") params.set("resolved", resolvedFilter);
        return params.toString();
    }, [currentPage, moduleFilter, debouncedSearch, severityFilter, methodFilter, statusCodeFilter, dateFrom, dateTo, resolvedFilter]);

    const moduleOptions = useMemo(() => {
        const set = new Set<string>(MODULE_OPTIONS.filter((m) => m !== "all"));
        knownModules.forEach((m) => set.add(m));
        if (moduleFilter !== "all") set.add(moduleFilter);
        return ["all", ...Array.from(set).sort()];
    }, [knownModules, moduleFilter]);

    const changeFilter = (setter: (v: string) => void) => (value: string) => {
        setter(value);
        setCurrentPage(1);
    };

    const loadLogs = useCallback(async () => {
        const seq = ++reqSeq.current;
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setIsLoading(true);
        setError("");
        try {
            const res = await authenticatedFetch(
                resolveSameOriginApiPath(`/api/v1/admin/issue-logs?${queryString}`),
                { signal: controller.signal },
                { redirectToLogin: false },
            );
            if (seq !== reqSeq.current) return;
            if (!res?.ok) {
                setLogs([]);
                setTotalItems(0);
                const body = res ? ((await res.json().catch(() => null)) as { message?: string } | null) : null;
                const why = res ? `HTTP ${res.status}${body?.message ? ` · ${body.message}` : ""}` : "network error";
                setError(`Could not load issue logs (${why}). Check the backend deployment and your admin session.`);
                return;
            }
            const body = (await res.json()) as IssueLogsResponse;
            if (seq !== reqSeq.current) return;
            const rows = Array.isArray(body.data) ? body.data : [];
            setLogs(rows);
            setTotalItems(body.meta?.total ?? rows.length);
            const mods = rows.map((l) => l.module).filter((m): m is string => typeof m === "string" && m.trim() !== "");
            if (mods.length) setKnownModules((prev) => Array.from(new Set([...prev, ...mods])));
        } catch (err) {
            if (seq !== reqSeq.current || (err as { name?: string })?.name === "AbortError") return;
            setLogs([]);
            setTotalItems(0);
            setError("Network error while loading issue logs.");
        } finally {
            if (seq === reqSeq.current) setIsLoading(false);
        }
    }, [queryString]);

    const resolveLogs = async (ids: string[]) => {
        if (!ids.length || resolving) return;
        setResolving(true);
        setResolveMessage("");
        try {
            const res = await authenticatedFetch(
                resolveSameOriginApiPath("/api/v1/admin/issue-logs/resolve"),
                { method: "POST", body: JSON.stringify({ ids }) },
                { redirectToLogin: false },
            );
            if (!res?.ok) {
                setResolveMessage("Could not mark as resolved. Please try again.");
                return;
            }
            const body = (await res.json().catch(() => ({}))) as { resolved?: number };
            setResolveMessage(`${body.resolved ?? ids.length} issue${(body.resolved ?? ids.length) === 1 ? "" : "s"} marked as resolved.`);
            void loadLogs();
        } finally {
            setResolving(false);
        }
    };


    useEffect(() => {
        void loadLogs();
    }, [loadLogs]);

    useEffect(() => () => abortRef.current?.abort(), []);

    const refreshAll = () => {
        void loadLogs();
        void loadSummary();
    };

    const runDelete = async (body: Record<string, unknown>, confirmText: string) => {
        if (!window.confirm(confirmText)) return;
        setBusy(true);
        setNotice("");
        const r = await deleteAdminLogs("/api/v1/admin/issue-logs", body);
        setBusy(false);
        if (r.error) {
            setError(r.error);
            return;
        }
        setNotice(`${num(r.deleted)} issue log${r.deleted === 1 ? "" : "s"} deleted.`);
        setSelected(new Set());
        refreshAll();
    };

    const deleteOne = async (id: string) => {
        if (!window.confirm("Delete this issue log? This cannot be undone.")) return;
        setBusy(true);
        try {
            const res = await authenticatedFetch(resolveSameOriginApiPath(`/api/v1/admin/issue-logs/${encodeURIComponent(id)}`), { method: "DELETE" }, { redirectToLogin: false });
            if (!res?.ok) {
                setError(`Could not delete (HTTP ${res?.status ?? "network"}).`);
                return;
            }
            setNotice("Issue log deleted.");
            setExpandedId(null);
            refreshAll();
        } finally {
            setBusy(false);
        }
    };

    const exportCsv = async () => {
        setBusy(true);
        const err = await downloadAdminCsv(`/api/v1/admin/issue-logs/export?${queryString}`, `issue-logs-${new Date().toISOString().slice(0, 10)}.csv`);
        setBusy(false);
        if (err) setError(err);
    };

    const toggleSelect = (id: string) =>
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    const allOnPageSelected = logs.length > 0 && logs.every((l) => selected.has(l.id));
    const purgeDaysNum = Number(purgeDays);

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
                <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => void exportCsv()} disabled={busy || isLoading}>
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={refreshAll} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Refresh
                    </Button>
                </div>
            </div>

            {summary ? (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
                    {[
                        ["Open issues", num(summary.open_total), summary.open_total ? "text-red-700" : "text-slate-900"],
                        ["Resolved", num(summary.resolved_total), "text-slate-900"],
                        ["New · 24 h", num(summary.last_24h), "text-slate-900"],
                        ["New · 7 days", num(summary.last_7d), "text-slate-900"],
                    ].map(([label, value, tone]) => (
                        <div key={label} className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
                            <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p>
                        </div>
                    ))}
                    <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Open by module</p>
                        <ul className="mt-1 space-y-0.5 text-xs text-slate-700">
                            {summary.open_by_module.length ? summary.open_by_module.slice(0, 3).map((m) => (
                                <li key={m.key} className="flex justify-between gap-2"><button type="button" className="truncate text-left hover:underline" onClick={() => changeFilter(setModuleFilter)(m.key)}>{m.key}</button><b>{num(m.count)}</b></li>
                            )) : <li className="text-slate-400">Nothing open</li>}
                        </ul>
                    </div>
                    <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Most repeated · open</p>
                        <ul className="mt-1 space-y-0.5 text-xs text-slate-700">
                            {summary.top_open_messages.length ? summary.top_open_messages.slice(0, 3).map((m) => (
                                <li key={m.key} className="flex justify-between gap-2" title={m.key}><span className="truncate">{m.key}</span><b>{num(m.count)}</b></li>
                            )) : <li className="text-slate-400">Nothing open</li>}
                        </ul>
                    </div>
                </div>
            ) : null}

            <Card className="p-4 shadow-sm">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
                    <div className="relative sm:col-span-2 lg:col-span-4">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            placeholder="Search message, email, module, path, request ID..."
                            className="pl-9"
                        />
                    </div>
                    <select
                        value={moduleFilter}
                        onChange={(event) => changeFilter(setModuleFilter)(event.target.value)}
                        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/30"
                    >
                        {moduleOptions.map((option) => (
                            <option key={option} value={option}>
                                {option === "all" ? "All modules" : option}
                                {option === "student" ? " (incl. students)" : ""}
                            </option>
                        ))}
                    </select>
                    <select
                        value={severityFilter}
                        onChange={(event) => changeFilter(setSeverityFilter)(event.target.value)}
                        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/30"
                    >
                        {SEVERITY_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                                {option === "all" ? "All severity" : option}
                            </option>
                        ))}
                    </select>
                    <select
                        value={resolvedFilter}
                        onChange={(event) => changeFilter((v) => setResolvedFilter(v as "open" | "resolved" | "all"))(event.target.value)}
                        aria-label="Resolution status"
                        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/30"
                    >
                        <option value="open">Open only</option>
                        <option value="resolved">Resolved only</option>
                        <option value="all">Open + resolved</option>
                    </select>
                    <select
                        value={methodFilter}
                        onChange={(event) => changeFilter(setMethodFilter)(event.target.value)}
                        aria-label="HTTP method"
                        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/30"
                    >
                        {METHOD_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                                {option === "all" ? "All methods" : option}
                            </option>
                        ))}
                    </select>
                    <Input
                        inputMode="numeric"
                        maxLength={3}
                        value={statusCodeFilter}
                        onChange={(event) => changeFilter(setStatusCodeFilter)(event.target.value.replace(/\D/g, ""))}
                        placeholder="Status code (e.g. 500)"
                        aria-label="Status code"
                    />
                    <Input type="date" value={dateFrom} onChange={(event) => changeFilter(setDateFrom)(event.target.value)} aria-label="From date" />
                    <Input type="date" value={dateTo} onChange={(event) => changeFilter(setDateTo)(event.target.value)} aria-label="To date" />
                    <div className="text-sm text-slate-500 sm:col-span-2 lg:col-span-4">
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
            {notice ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">{notice}</div> : null}

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
                    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2 text-xs text-slate-600">
                        <label className="flex items-center gap-2 font-semibold">
                            <input type="checkbox" checked={allOnPageSelected} onChange={() => setSelected(allOnPageSelected ? new Set() : new Set(logs.map((l) => l.id)))} aria-label="Select all on this page" />
                            {selected.size ? `${selected.size} selected` : `${logs.length} on this page`}
                        </label>
                        <Button type="button" variant="outline" size="sm" disabled={busy || selected.size === 0} onClick={() => void runDelete({ ids: [...selected] }, `Delete ${selected.size} selected issue log${selected.size === 1 ? "" : "s"}? This cannot be undone.`)}>
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Delete selected
                        </Button>
                        <Button type="button" variant="outline" size="sm" disabled={busy || !(summary?.resolved_total)} onClick={() => void runDelete({ resolvedOnly: true }, `Delete all ${num(summary?.resolved_total)} resolved issue logs? This cannot be undone.`)}>
                            Delete all resolved
                        </Button>
                        <span className="ml-auto flex items-center gap-2">
                            <span>Purge older than</span>
                            <Input inputMode="numeric" className="h-8 w-16" value={purgeDays} onChange={(e) => setPurgeDays(e.target.value.replace(/\D/g, ""))} aria-label="Purge older than days" />
                            <span>days</span>
                            <Button type="button" variant="outline" size="sm" disabled={busy || !Number.isFinite(purgeDaysNum) || purgeDaysNum < 1} onClick={() => void runDelete({ olderThanDays: purgeDaysNum }, `Purge every issue log older than ${purgeDaysNum} days, resolved or not? This cannot be undone.`)}>
                                Purge
                            </Button>
                        </span>
                    </div>
                    {logs.length > 0 || resolveMessage ? (
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2 text-xs text-slate-600">
                            <span role="status">{resolveMessage || "Resolve keeps the record; delete removes it."}</span>
                            {logs.some((l) => !l.resolvedAt) ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={resolving}
                                    onClick={() => void resolveLogs(logs.filter((l) => !l.resolvedAt).map((l) => l.id))}
                                >
                                    {resolving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                                    Mark this page resolved
                                </Button>
                            ) : null}
                        </div>
                    ) : null}
                    <ul role="list">
                        {logs.map((log) => {
                            const isExpanded = expandedId === log.id;
                            return (
                                <li key={log.id} className="flex items-start border-b border-slate-100 last:border-0">
                                    <label className="flex items-center px-3 py-4 lg:px-4">
                                        <input type="checkbox" checked={selected.has(log.id)} onChange={() => toggleSelect(log.id)} aria-label="Select issue" />
                                    </label>
                                    <div className="min-w-0 flex-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setExpandedId(isExpanded ? null : log.id);
                                            if (!isExpanded) void loadDetail(log.id);
                                        }}
                                        className="grid w-full gap-3 py-4 pr-4 text-left transition hover:bg-slate-50/90 lg:grid-cols-[170px_120px_1fr_220px_90px] lg:items-center lg:gap-4"
                                    >
                                        <div className="text-xs tabular-nums text-slate-500">{formatWhen(log.createdAt)}</div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge className={severityClass(log.severity)} variant="outline">
                                                {log.severity || "warning"}
                                            </Badge>
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusClass(log.statusCode)}`}>
                                                {log.statusCode || "N/A"}
                                            </span>
                                            {log.resolvedAt ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">Resolved</span> : null}
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
                                            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                                                {log.resolvedAt ? (
                                                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-bold text-emerald-300">Resolved {formatWhen(log.resolvedAt)}</span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        disabled={resolving}
                                                        onClick={() => void resolveLogs([log.id])}
                                                        className="rounded-md bg-emerald-500 px-3 py-1 font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                                                    >
                                                        Mark resolved
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    disabled={busy}
                                                    onClick={() => void deleteOne(log.id)}
                                                    className="rounded-md bg-red-500/90 px-3 py-1 font-bold text-white hover:bg-red-400 disabled:opacity-60"
                                                >
                                                    Delete
                                                </button>
                                            </div>
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
                                                {details[log.id]?.error
                                                    ? details[log.id].error
                                                    : details[log.id]
                                                      ? prettyJson({ metadata: details[log.id].metadata, stack: details[log.id].stack })
                                                      : log.hasMetadata || log.hasStack
                                                        ? "Loading details…"
                                                        : prettyJson({ metadata: log.metadata ?? null, stack: log.stack ?? null })}
                                            </pre>
                                        </div>
                                    ) : null}
                                    </div>
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
