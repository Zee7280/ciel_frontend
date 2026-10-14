"use client";

import { useCallback, useEffect, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import { ExternalLink, Loader2, Check, X, GraduationCap, History, AlertTriangle } from "lucide-react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import StatusBadge from "@/components/admin/StatusBadge";
import { useAbortableFetch, isAbortError, readErrorMessage } from "@/components/admin/useAbortableFetch";
import { formatAdminDateTime } from "@/utils/adminDate";

const HISTORY_PAGE_SIZE = 25;
const API = "/api/v1/admin/student-subscriptions";

function safeHttpUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    try {
        const u = new URL(url.trim());
        return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
    } catch {
        return null;
    }
}

function readTotal(j: unknown): number | null {
    if (!j || typeof j !== "object") return null;
    const o = j as Record<string, unknown>;
    const meta = (o.meta ?? o.pagination) as Record<string, unknown> | undefined;
    const t = o.total ?? meta?.total;
    return typeof t === "number" && Number.isFinite(t) ? t : null;
}

type SubscriptionRow = {
    id: string;
    userId: string;
    universityName: string | null;
    paidAmountPkr: number;
    expectedAmountPkr: number | null;
    amountMismatch?: boolean;
    proofUrl: string;
    status: string;
    createdAt: string;
    reviewedAt?: string | null;
    adminFeedback?: string | null;
    user: {
        id: string;
        name?: string | null;
        email?: string | null;
        role?: string | null;
        accountStatus?: string | null;
        phone?: string | null;
        city?: string | null;
        institution?: string | null;
        university?: string | null;
        department?: string | null;
    } | null;
};

type PendingAction = { kind: "approve" | "reject"; row: SubscriptionRow } | null;

function isMismatch(r: SubscriptionRow): boolean {
    if (r.amountMismatch === true) return true;
    return typeof r.expectedAmountPkr === "number" && r.expectedAmountPkr > 0 && r.expectedAmountPkr !== r.paidAmountPkr;
}

function StudentDetails({ row }: { row: SubscriptionRow }) {
    const u = row.user;
    const uni = row.universityName || u?.university || u?.institution || "—";
    return (
        <div className="mt-4 grid gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm sm:grid-cols-2">
            <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <GraduationCap className="h-3.5 w-3.5" /> University (declared at signup)
                </p>
                <dl className="space-y-1.5 text-slate-800">
                    <div>
                        <dt className="text-xs text-slate-500">Name</dt>
                        <dd className="font-semibold">{uni}</dd>
                    </div>
                    {u?.department ? (
                        <div>
                            <dt className="text-xs text-slate-500">Programme / department</dt>
                            <dd>{u.department}</dd>
                        </div>
                    ) : null}
                    <p className="text-xs text-slate-600">
                        Not a CIEL member university at signup time, so the subscription fee applied.
                    </p>
                </dl>
            </div>
            <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Student account</p>
                {u ? (
                    <dl className="space-y-1.5 text-slate-800">
                        <div>
                            <dt className="text-xs text-slate-500">Name</dt>
                            <dd className="font-semibold">{u.name || "—"}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-slate-500">Email</dt>
                            <dd className="break-all">{u.email}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-slate-500">Status</dt>
                            <dd>{u.accountStatus ? <StatusBadge status={u.accountStatus} /> : "—"}</dd>
                        </div>
                        {u.phone ? (
                            <div>
                                <dt className="text-xs text-slate-500">Phone</dt>
                                <dd>{u.phone}</dd>
                            </div>
                        ) : null}
                        {u.city ? (
                            <div>
                                <dt className="text-xs text-slate-500">City</dt>
                                <dd>{u.city}</dd>
                            </div>
                        ) : null}
                    </dl>
                ) : (
                    <p className="text-slate-500">—</p>
                )}
            </div>
        </div>
    );
}

export default function AdminStudentSubscriptionsPage() {
    const [tab, setTab] = useState<"pending" | "history">("pending");
    const [rows, setRows] = useState<SubscriptionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [actingId, setActingId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<Record<string, string>>({});
    const [pendingCount, setPendingCount] = useState<number | null>(null);
    const [historyTotal, setHistoryTotal] = useState<number | null>(null);
    const [historyPage, setHistoryPage] = useState(1);
    const [action, setAction] = useState<PendingAction>(null);
    const [mismatchAck, setMismatchAck] = useState(false);
    const { begin } = useAbortableFetch();

    const load = useCallback(async () => {
        const run = begin();
        setLoading(true);
        setRows([]);
        try {
            const url = tab === "pending" ? `${API}/pending` : `${API}/history?page=${historyPage}&limit=${HISTORY_PAGE_SIZE}`;
            const res = await authenticatedFetch(url, { signal: run.signal });
            if (!run.isCurrent()) return;
            if (!res?.ok) {
                toast.error(tab === "pending" ? "Failed to load pending subscription payments" : "Failed to load history");
                setRows([]);
                return;
            }
            const j = (await res.json().catch(() => null)) as { data?: SubscriptionRow[] } | null;
            if (!run.isCurrent()) return;
            const list = Array.isArray(j?.data) ? j.data : [];
            setRows(list);
            if (tab === "pending") setPendingCount(list.length);
            else setHistoryTotal(readTotal(j));
        } catch (e) {
            if (isAbortError(e) || !run.isCurrent()) return;
            setRows([]);
            toast.error("Failed to load subscription payments");
        } finally {
            if (run.isCurrent()) setLoading(false);
        }
    }, [tab, historyPage, begin]);

    useEffect(() => {
        void load();
    }, [load]);

    // Keep the other tab's badge fresh (best effort).
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                if (tab === "history") {
                    const res = await authenticatedFetch(`${API}/pending`);
                    if (!res?.ok || cancelled) return;
                    const j = (await res.json().catch(() => null)) as { data?: unknown[] } | null;
                    if (!cancelled && Array.isArray(j?.data)) setPendingCount(j.data.length);
                } else if (historyTotal == null) {
                    const res = await authenticatedFetch(`${API}/history?page=1&limit=1`);
                    if (!res?.ok || cancelled) return;
                    const t = readTotal(await res.json().catch(() => null));
                    if (!cancelled && t != null) setHistoryTotal(t);
                }
            } catch {
                /* badge is optional */
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    const openAction = (kind: "approve" | "reject", row: SubscriptionRow) => {
        setMismatchAck(false);
        setAction({ kind, row });
    };

    const studentLabel = (r: SubscriptionRow) => r.user?.name || r.user?.email || "this student";

    const runAction = async () => {
        if (!action) return;
        const { kind, row } = action;
        const id = row.id;
        setActingId(id);
        try {
            const res =
                kind === "approve"
                    ? await authenticatedFetch(`${API}/${id}/approve`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(isMismatch(row) ? { allowAmountMismatch: true } : {}),
                      })
                    : await authenticatedFetch(`${API}/${id}/reject`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ feedback: feedback[id]?.trim() || undefined }),
                      });
            if (!res) {
                toast.error(kind === "approve" ? "Approve failed" : "Reject failed");
                return;
            }
            if (!res.ok) {
                toast.error(await readErrorMessage(res, kind === "approve" ? "Approve failed" : "Reject failed"));
                return;
            }
            toast.success(kind === "approve" ? "Student portal activated" : "Submission rejected");
            if (kind === "reject") setFeedback((f) => ({ ...f, [id]: "" }));
            setAction(null);
            setHistoryTotal(null);
            await load();
        } finally {
            setActingId(null);
        }
    };

    const emptyMsg = tab === "pending" ? "No pending subscription payments." : "No processed payments yet.";
    const totalPages = historyTotal != null ? Math.max(1, Math.ceil(historyTotal / HISTORY_PAGE_SIZE)) : null;
    const mismatchOnApprove = action?.kind === "approve" && isMismatch(action.row);

    const badge = (n: number | null, active: boolean) =>
        n == null ? null : (
            <span className={"rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums " + (active ? "bg-white/20 text-white" : "bg-white text-slate-600")}>
                {n}
            </span>
        );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Student subscription fees</h1>
                <p className="mt-1 text-slate-600">
                    Bank-transfer proofs from students whose university is not a CIEL member. Approve to activate the student
                    portal. The fee amount and the on/off switch live in Settings → Fees &amp; payments.
                </p>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
                <button
                    type="button"
                    onClick={() => setTab("pending")}
                    className={"inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition " + (tab === "pending" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")}
                >
                    Pending
                    {badge(pendingCount, tab === "pending")}
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setHistoryPage(1);
                        setTab("history");
                    }}
                    className={"inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition " + (tab === "history" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")}
                >
                    <History className="h-4 w-4" aria-hidden />
                    History
                    {badge(historyTotal, tab === "history")}
                </button>
            </div>

            {loading ? (
                <div className="flex min-h-[40vh] items-center justify-center gap-2 text-slate-600">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Loading…
                </div>
            ) : rows.length === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">{emptyMsg}</p>
            ) : (
                <ul className="space-y-4">
                    {rows.map((r) => {
                        const proof = safeHttpUrl(r.proofUrl);
                        const mismatch = isMismatch(r);
                        return (
                            <li key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-slate-900">{r.user?.name || "Unknown student"}</p>
                                        <p className="text-sm text-slate-600 break-all">{r.user?.email}</p>
                                        <p className="mt-1 text-xs text-slate-500 break-all">
                                            Paid PKR {Number(r.paidAmountPkr ?? 0).toLocaleString("en-PK")}
                                            {typeof r.expectedAmountPkr === "number" && r.expectedAmountPkr > 0
                                                ? ` · Expected PKR ${r.expectedAmountPkr.toLocaleString("en-PK")}`
                                                : ""}
                                            {" · Submitted "}
                                            {formatAdminDateTime(r.createdAt)}
                                            {tab === "history" ? (
                                                <>
                                                    {" "}
                                                    · <StatusBadge status={r.status} />
                                                    {r.reviewedAt ? ` · ${formatAdminDateTime(r.reviewedAt)}` : null}
                                                </>
                                            ) : null}
                                        </p>
                                        {mismatch ? (
                                            <p className="mt-2 inline-flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800">
                                                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                                                Amount mismatch: paid differs from the expected subscription fee.
                                            </p>
                                        ) : null}
                                        {tab === "history" && r.adminFeedback ? (
                                            <p className="mt-1 text-xs text-red-700 break-words">Note: {r.adminFeedback}</p>
                                        ) : null}
                                    </div>
                                    {proof ? (
                                        <a href={proof} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800">
                                            Open proof <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                    ) : (
                                        <span className="text-xs text-slate-400">{r.proofUrl ? "Proof link unavailable (invalid URL)" : "No proof uploaded"}</span>
                                    )}
                                </div>

                                <StudentDetails row={r} />

                                {tab === "pending" ? (
                                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                                        <label className="block flex-1 text-sm">
                                            <span className="text-slate-600">Rejection note (optional)</span>
                                            <input
                                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                                value={feedback[r.id] || ""}
                                                onChange={(e) => setFeedback((f) => ({ ...f, [r.id]: e.target.value }))}
                                                placeholder="Reason if rejecting"
                                            />
                                        </label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                disabled={actingId === r.id}
                                                onClick={() => openAction("approve", r)}
                                                className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                                            >
                                                {actingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                Approve
                                            </button>
                                            <button
                                                type="button"
                                                disabled={actingId === r.id}
                                                onClick={() => openAction("reject", r)}
                                                className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
                                            >
                                                <X className="h-4 w-4" />
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </li>
                        );
                    })}
                </ul>
            )}

            {tab === "history" && totalPages != null && totalPages > 1 ? (
                <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
                    <button type="button" disabled={historyPage <= 1 || loading} onClick={() => setHistoryPage((p) => Math.max(1, p - 1))} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 font-medium hover:bg-slate-50 disabled:opacity-50">
                        Previous
                    </button>
                    <span>
                        Page {historyPage} of {totalPages}
                    </span>
                    <button type="button" disabled={historyPage >= totalPages || loading} onClick={() => setHistoryPage((p) => p + 1)} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 font-medium hover:bg-slate-50 disabled:opacity-50">
                        Next
                    </button>
                </div>
            ) : null}

            <ConfirmDialog
                open={action != null}
                title={action?.kind === "approve" ? `Approve ${action ? studentLabel(action.row) : ""}?` : `Reject ${action ? studentLabel(action.row) : ""}?`}
                description={
                    action?.kind === "approve"
                        ? "This activates the student portal and notifies the student."
                        : action?.row && feedback[action.row.id]?.trim()
                          ? `The student is notified and may submit again. Note: "${feedback[action.row.id].trim()}"`
                          : "The student is notified and may submit again. No rejection note was entered."
                }
                variant={action?.kind === "approve" ? (mismatchOnApprove ? "warning" : "default") : "danger"}
                confirmLabel={action?.kind === "approve" ? "Approve" : "Reject"}
                loading={action != null && actingId === action.row.id}
                confirmDisabled={mismatchOnApprove && !mismatchAck}
                onConfirm={runAction}
                onCancel={() => setAction(null)}
            >
                {action && mismatchOnApprove ? (
                    <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" checked={mismatchAck} onChange={(e) => setMismatchAck(e.target.checked)} />
                        <span>
                            Paid PKR {Number(action.row.paidAmountPkr ?? 0).toLocaleString("en-PK")}
                            {typeof action.row.expectedAmountPkr === "number" ? ` but expected PKR ${action.row.expectedAmountPkr.toLocaleString("en-PK")}` : " does not match the expected fee"}
                            . I understand and want to approve despite the mismatch.
                        </span>
                    </label>
                ) : null}
            </ConfirmDialog>
        </div>
    );
}
