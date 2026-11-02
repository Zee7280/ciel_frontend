"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ChevronDown, ChevronUp, Download, History, Loader2, RefreshCw, Search, Trash2 } from "lucide-react";
import { authenticatedFetch, resolveSameOriginApiPath } from "@/utils/api";
import { deleteAdminLogs, downloadAdminCsv, num } from "@/utils/adminLogTools";
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
    target_label?: string | null;
    ip?: string | null;
    method?: string | null;
    outcome?: string | null;
    status_code?: number | null;
    user_role?: string | null;
    has_details?: boolean;
    created_at?: string;
};

type AuditLogsResponse = { success?: boolean; data?: AuditLogRow[]; meta?: { page?: number; limit?: number; total?: number } };
type Summary = {
    total: number;
    last_24h: number;
    failures_24h: number;
    last_7d: number;
    by_method_7d: { key: string; count: number }[];
    top_actors_7d: { key: string; count: number }[];
    top_actions_7d: { key: string; count: number }[];
};

const PURGE_MIN_DAYS = 30;
const SELECT_CLASS = "h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/30";

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

function methodAccent(method: string): string {
    const m = method.toUpperCase();
    if (m === "DELETE") return "border-amber-200 bg-amber-50 text-amber-900";
    if (m === "POST") return "border-blue-200 bg-blue-50 text-blue-800";
    if (m === "PATCH" || m === "PUT") return "border-violet-200 bg-violet-50 text-violet-800";
    return "border-slate-200 bg-slate-50 text-slate-800";
}

/** Human line for an action like "POST /admin/users/:id": "Updated user · <label>". */
function describe(log: AuditLogRow): string {
    const action = (log.action || "").trim();
    const route = action.replace(/^[A-Z]+\s+/, "").replace(/^\/?api\/v1/, "");
    const method = (log.method || action.split(" ")[0] || "").toUpperCase();
    const verb = method === "DELETE" ? "Deleted" : method === "POST" ? "Created / ran" : method === "PATCH" || method === "PUT" ? "Updated" : method || "Action";
    const what = route.split("/").filter((s) => s && !s.startsWith(":") && s !== "admin").slice(0, 3).join(" › ") || route;
    const target = log.target_label || log.target;
    return `${verb} ${what}${target ? ` · ${target}` : ""}`;
}

const EMPTY_FILTERS = { search: "", userEmail: "", path: "", outcome: "", method: "", dateFrom: "", dateTo: "" };
type Filters = typeof EMPTY_FILTERS;

function filtersFromSearchParams(sp: { get: (key: string) => string | null }): Filters {
    const f = { ...EMPTY_FILTERS };
    (Object.keys(f) as (keyof Filters)[]).forEach((k) => {
        f[k] = sp.get(k)?.trim() ?? "";
    });
    return f;
}

export default function AdminAuditLogsPage() {
    return (
        <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading audit logs…</div>}>
            <AdminAuditLogsPageInner />
        </Suspense>
    );
}

function AdminAuditLogsPageInner() {
    const searchParams = useSearchParams();
    const seeded = filtersFromSearchParams(searchParams);
    const [logs, setLogs] = useState<AuditLogRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [details, setDetails] = useState<Record<string, { data?: unknown; error?: string }>>({});
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;
    const [totalItems, setTotalItems] = useState(0);
    const [draft, setDraft] = useState<Filters>(seeded);
    const [filters, setFilters] = useState<Filters>(seeded);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [busy, setBusy] = useState(false);
    const [purgeDays, setPurgeDays] = useState(String(PURGE_MIN_DAYS * 3));
    const reqSeq = useRef(0);

    const queryString = useCallback(() => {
        const qs = new URLSearchParams();
        (Object.keys(filters) as (keyof Filters)[]).forEach((k) => {
            const v = filters[k].trim();
            if (v) qs.set(k, v);
        });
        return qs;
    }, [filters]);

    const loadSummary = useCallback(async () => {
        try {
            const res = await authenticatedFetch(resolveSameOriginApiPath("/api/v1/admin/audit-logs/summary"), {}, { redirectToLogin: false });
            const body = res?.ok ? ((await res.json()) as { data?: Summary }) : null;
            setSummary(body?.data ?? null);
        } catch {
            setSummary(null);
        }
    }, []);

    const loadLogs = useCallback(async () => {
        const seq = ++reqSeq.current;
        setIsLoading(true);
        setError("");
        try {
            const qs = queryString();
            qs.set("page", String(currentPage));
            qs.set("limit", String(itemsPerPage));
            const res = await authenticatedFetch(`/api/v1/admin/audit-logs?${qs.toString()}`, {}, { redirectToLogin: false });
            if (seq !== reqSeq.current) return;
            if (!res?.ok) {
                const body = res ? ((await res.json().catch(() => null)) as { message?: string } | null) : null;
                setLogs([]);
                setTotalItems(0);
                setError(`Could not load audit logs (${res ? `HTTP ${res.status}${body?.message ? ` · ${body.message}` : ""}` : "network error"}).`);
                return;
            }
            const body = (await res.json()) as AuditLogsResponse;
            if (seq !== reqSeq.current) return;
            if (body.success && Array.isArray(body.data)) {
                setLogs(body.data);
                setTotalItems(body.meta?.total ?? body.data.length);
                setSelected(new Set());
            } else {
                setLogs([]);
                setTotalItems(0);
                setError("Unexpected response from audit logs API.");
            }
        } catch {
            if (seq !== reqSeq.current) return;
            setLogs([]);
            setTotalItems(0);
            setError("Network error while loading audit logs.");
        } finally {
            if (seq === reqSeq.current) setIsLoading(false);
        }
    }, [currentPage, itemsPerPage, queryString]);

    const loadDetail = async (id: string) => {
        if (details[id]) return;
        try {
            const res = await authenticatedFetch(resolveSameOriginApiPath(`/api/v1/admin/audit-logs/${encodeURIComponent(id)}`), {}, { redirectToLogin: false });
            const body = res?.ok ? ((await res.json()) as { data?: { details?: unknown } }) : null;
            setDetails((prev) => ({ ...prev, [id]: body?.data ? { data: body.data.details ?? null } : { error: `Could not load details (HTTP ${res?.status ?? "network"}).` } }));
        } catch {
            setDetails((prev) => ({ ...prev, [id]: { error: "Could not load details." } }));
        }
    };

    const applyFilters = () => {
        setCurrentPage(1);
        setFilters(draft);
    };
    const clearFilters = () => {
        setCurrentPage(1);
        setDraft(EMPTY_FILTERS);
        setFilters(EMPTY_FILTERS);
    };

    useEffect(() => {
        void loadLogs();
    }, [loadLogs]);
    useEffect(() => {
        void loadSummary();
    }, [loadSummary]);

    const urlQuery = searchParams.toString();
    useEffect(() => {
        const next = filtersFromSearchParams(searchParams);
        setDraft(next);
        setFilters(next);
        setCurrentPage(1);
        // URL is the source of truth when landing from a project audit link.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [urlQuery]);

    const refreshAll = () => {
        void loadLogs();
        void loadSummary();
    };

    const runDelete = async (body: Record<string, unknown>, confirmText: string) => {
        if (!window.confirm(confirmText)) return;
        setBusy(true);
        setNotice("");
        const r = await deleteAdminLogs("/api/v1/admin/audit-logs", body);
        setBusy(false);
        if (r.error) {
            setError(r.error);
            return;
        }
        setNotice(`${num(r.deleted)} audit entr${r.deleted === 1 ? "y" : "ies"} deleted. This deletion is itself recorded in the trail.`);
        refreshAll();
    };

    const deleteOne = async (id: string) => {
        if (!window.confirm("Delete this audit entry? The deletion itself will be recorded.")) return;
        setBusy(true);
        try {
            const res = await authenticatedFetch(resolveSameOriginApiPath(`/api/v1/admin/audit-logs/${encodeURIComponent(id)}`), { method: "DELETE" }, { redirectToLogin: false });
            if (!res?.ok) {
                setError(`Could not delete (HTTP ${res?.status ?? "network"}).`);
                return;
            }
            setNotice("Audit entry deleted.");
            setExpandedId(null);
            refreshAll();
        } finally {
            setBusy(false);
        }
    };

    const exportCsv = async () => {
        setBusy(true);
        const err = await downloadAdminCsv(`/api/v1/admin/audit-logs/export?${queryString().toString()}`, `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`);
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
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const purgeDaysNum = Number(purgeDays);

    const stat = (label: string, value: string, tone = "text-slate-900") => (
        <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
            <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p>
        </div>
    );

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
                            Every change an admin makes (create, update, delete), with who, what, when and whether it succeeded. Failures of user requests live in Issue Logs.
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
                    {stat("All entries", num(summary.total))}
                    {stat("Last 24 h", num(summary.last_24h))}
                    {stat("Failed · 24 h", num(summary.failures_24h), summary.failures_24h ? "text-red-700" : "text-slate-900")}
                    {stat("Last 7 days", num(summary.last_7d))}
                    <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm lg:col-span-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Most active admins · 7 d</p>
                        <ul className="mt-1 space-y-0.5 text-xs text-slate-700">
                            {summary.top_actors_7d.length ? summary.top_actors_7d.slice(0, 3).map((a) => (
                                <li key={a.key} className="flex justify-between gap-2"><span className="truncate">{a.key}</span><b>{num(a.count)}</b></li>
                            )) : <li className="text-slate-400">No activity yet</li>}
                        </ul>
                    </div>
                </div>
            ) : null}

            <Card className="p-4 shadow-sm">
                <form
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        applyFilters();
                    }}
                >
                    <div className="relative sm:col-span-2 lg:col-span-4">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input value={draft.search} onChange={(e) => setDraft({ ...draft, search: e.target.value })} placeholder="Search action, admin, target, label, IP…" className="pl-9" aria-label="Search" />
                    </div>
                    <Input value={draft.userEmail} onChange={(e) => setDraft({ ...draft, userEmail: e.target.value })} placeholder="Admin email contains…" aria-label="User email" />
                    <Input value={draft.path} onChange={(e) => setDraft({ ...draft, path: e.target.value })} placeholder="Route contains… (e.g. /admin/users)" aria-label="Action or route" />
                    <select value={draft.outcome} onChange={(e) => setDraft({ ...draft, outcome: e.target.value })} className={SELECT_CLASS} aria-label="Outcome">
                        <option value="">Success + failure</option>
                        <option value="success">Success only</option>
                        <option value="failure">Failure only</option>
                    </select>
                    <select value={draft.method} onChange={(e) => setDraft({ ...draft, method: e.target.value })} className={SELECT_CLASS} aria-label="Method">
                        <option value="">All methods</option>
                        {["POST", "PATCH", "PUT", "DELETE"].map((m) => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                    <Input type="date" value={draft.dateFrom} onChange={(e) => setDraft({ ...draft, dateFrom: e.target.value })} aria-label="From date" />
                    <Input type="date" value={draft.dateTo} onChange={(e) => setDraft({ ...draft, dateTo: e.target.value })} aria-label="To date" />
                    <div className="flex items-center gap-2 sm:col-span-2">
                        <Button type="submit" size="sm" disabled={isLoading}>Apply filters</Button>
                        <Button type="button" variant="outline" size="sm" onClick={clearFilters}>Clear</Button>
                        <span className="ml-auto text-sm text-slate-500">{num(totalItems)} entr{totalItems === 1 ? "y" : "ies"}</span>
                    </div>
                </form>
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
                    <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
                    <p className="text-sm font-medium text-slate-500">Loading audit logs…</p>
                </div>
            ) : logs.length === 0 ? (
                <Card className="py-16 text-center shadow-sm">
                    <History className="mx-auto h-10 w-10 text-slate-300" strokeWidth={1.5} />
                    <h3 className="mt-4 text-lg font-bold text-slate-900">No audit entries match</h3>
                    <p className="mt-2 text-sm text-slate-500">Change the filters, or perform an admin action to generate entries.</p>
                </Card>
            ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2 text-xs text-slate-600">
                        <label className="flex items-center gap-2 font-semibold">
                            <input type="checkbox" checked={allOnPageSelected} onChange={() => setSelected(allOnPageSelected ? new Set() : new Set(logs.map((l) => l.id)))} aria-label="Select all on this page" />
                            {selected.size ? `${selected.size} selected` : `${logs.length} on this page`}
                        </label>
                        <Button type="button" variant="outline" size="sm" disabled={busy || selected.size === 0} onClick={() => void runDelete({ ids: [...selected] }, `Delete ${selected.size} selected audit entr${selected.size === 1 ? "y" : "ies"}? The deletion itself will be recorded.`)}>
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Delete selected
                        </Button>
                        <span className="ml-auto flex items-center gap-2">
                            <span>Purge entries older than</span>
                            <Input inputMode="numeric" className="h-8 w-20" value={purgeDays} onChange={(e) => setPurgeDays(e.target.value.replace(/\D/g, ""))} aria-label="Purge older than days" />
                            <span>days</span>
                            <Button type="button" variant="outline" size="sm" disabled={busy || !Number.isFinite(purgeDaysNum) || purgeDaysNum < PURGE_MIN_DAYS} onClick={() => void runDelete({ olderThanDays: purgeDaysNum }, `Purge every audit entry older than ${purgeDaysNum} days? This cannot be undone; the purge itself will be recorded.`)}>
                                Purge
                            </Button>
                            <span className="text-slate-400">(min {PURGE_MIN_DAYS})</span>
                        </span>
                    </div>
                    <div className="hidden grid-cols-[32px_168px_minmax(0,1fr)_minmax(0,220px)_100px_90px] gap-4 border-b border-slate-100 bg-slate-50/80 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 lg:grid">
                        <span />
                        <span>Time</span>
                        <span>What happened</span>
                        <span>Admin / target</span>
                        <span>IP</span>
                        <span>Details</span>
                    </div>
                    <ul role="list">
                        {logs.map((log) => {
                            const isExpanded = expandedId === log.id;
                            const method = (log.method || (log.action || "").split(" ")[0] || "—").toUpperCase();
                            const failed = log.outcome === "failure";
                            const detail = details[log.id];
                            return (
                                <li key={log.id} className="flex items-start border-b border-slate-100 last:border-0">
                                    <label className="flex items-center px-3 py-4 lg:px-4">
                                        <input type="checkbox" checked={selected.has(log.id)} onChange={() => toggleSelect(log.id)} aria-label="Select entry" />
                                    </label>
                                    <div className="min-w-0 flex-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setExpandedId(isExpanded ? null : log.id);
                                                if (!isExpanded) void loadDetail(log.id);
                                            }}
                                            className="grid w-full gap-3 py-4 pr-4 text-left transition hover:bg-slate-50/90 lg:grid-cols-[168px_minmax(0,1fr)_minmax(0,220px)_100px_90px] lg:items-center lg:gap-4"
                                        >
                                            <div className="text-xs tabular-nums text-slate-500">{formatWhen(log.created_at)}</div>
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <Badge variant="outline" className={methodAccent(method)}>{method}</Badge>
                                                    {failed ? <Badge variant="outline" className="border-red-300 bg-red-50 font-bold text-red-700">FAILED{log.status_code ? ` ${log.status_code}` : ""}</Badge> : null}
                                                    {log.user_role ? <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{log.user_role}</span> : null}
                                                </div>
                                                <p className="mt-1 break-words text-sm font-semibold text-slate-900">{describe(log)}</p>
                                                <p className="truncate text-xs text-slate-500">{log.action}</p>
                                            </div>
                                            <div className="min-w-0 text-sm text-slate-700">
                                                <p className="truncate font-semibold text-slate-900">{log.user_email || log.user || "Unknown"}</p>
                                                <p className="truncate text-xs text-slate-500">
                                                    {log.target ?? "—"}
                                                    {log.target_type ? <span className="italic text-slate-400"> ({log.target_type})</span> : null}
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
                                                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                                                    <button type="button" disabled={busy} onClick={() => void deleteOne(log.id)} className="rounded-md bg-red-500/90 px-3 py-1 font-bold text-white hover:bg-red-400 disabled:opacity-60">
                                                        Delete this entry
                                                    </button>
                                                    <span className="text-slate-500">Entry {log.id}</span>
                                                </div>
                                                <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                                                    <div><p className="font-bold uppercase tracking-wide text-slate-500">Admin</p><p className="mt-1 break-all">{log.user_email || log.user || "—"}{log.user_role ? ` · ${log.user_role}` : ""}</p></div>
                                                    <div><p className="font-bold uppercase tracking-wide text-slate-500">Target</p><p className="mt-1 break-all">{log.target_label || "—"}{log.target ? ` · ${log.target}` : ""}</p></div>
                                                    <div><p className="font-bold uppercase tracking-wide text-slate-500">Outcome</p><p className="mt-1 break-all">{log.outcome || "—"}{log.status_code ? ` · HTTP ${log.status_code}` : ""}</p></div>
                                                    <div><p className="font-bold uppercase tracking-wide text-slate-500">IP</p><p className="mt-1 break-all">{log.ip ?? "—"}</p></div>
                                                </div>
                                                <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-black/40 p-4 text-xs leading-relaxed text-slate-300">
                                                    {detail?.error ? detail.error : detail ? prettyJson(detail.data) : log.has_details ? "Loading request details…" : "No request details stored."}
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
                <span>Page {currentPage} of {totalPages}</span>
                <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={currentPage <= 1 || isLoading} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>Previous</Button>
                    <Button type="button" variant="outline" size="sm" disabled={currentPage >= totalPages || isLoading} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>Next</Button>
                </div>
            </div>
        </div>
    );
}
