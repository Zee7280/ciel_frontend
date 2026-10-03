"use client";

import { useCallback, useEffect, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import { ExternalLink, Loader2, Check, X, Building2, User, History, AlertTriangle } from "lucide-react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import StatusBadge from "@/components/admin/StatusBadge";
import { useAbortableFetch, isAbortError, readErrorMessage } from "@/components/admin/useAbortableFetch";
import { formatAdminDateTime } from "@/utils/adminDate";

const HISTORY_PAGE_SIZE = 25;

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

type OrgDetail = {
    id: string;
    name: string;
    orgType: string;
    description: string | null;
    city: string | null;
    region: string | null;
    address: string | null;
    country: string;
    websiteUrl: string | null;
    logoUrl: string | null;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    verificationStatus: string;
    safeguardingAcknowledged: boolean;
    dataPolicyAcknowledged: boolean;
} | null;

type UserDetail = {
    id: string;
    name?: string;
    email?: string;
    role?: string;
    accountStatus?: string;
    phone?: string | null;
    city?: string | null;
    orgName?: string | null;
    orgType?: string | null;
    contactPerson?: string | null;
    institution?: string | null;
    university?: string | null;
    department?: string | null;
} | null;

type MembershipRow = {
    id: string;
    userId: string;
    organizationId: string | null;
    paidAmountPkr: number;
    proofUrl: string;
    status: string;
    createdAt: string;
    reviewedAt?: string | null;
    adminFeedback?: string | null;
    reviewedByUserId?: string | null;
    expectedAmountPkr?: number | null;
    amountMismatch?: boolean;
    user: UserDetail;
    organization: OrgDetail;
};

function OrgAndAccountDetails({ row }: { row: MembershipRow }) {
    const o = row.organization;
    const u = row.user;
    return (
        <div className="mt-4 grid gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm sm:grid-cols-2">
            <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <Building2 className="h-3.5 w-3.5" /> Organization (registered)
                </p>
                {o ? (
                    <dl className="space-y-1.5 text-slate-800">
                        <div>
                            <dt className="text-xs text-slate-500">Name</dt>
                            <dd className="font-semibold">{o.name}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-slate-500">Type</dt>
                            <dd>{o.orgType}</dd>
                        </div>
                        {[o.city, o.region, o.address].filter(Boolean).length ? (
                            <div>
                                <dt className="text-xs text-slate-500">Location</dt>
                                <dd>
                                    {[o.city, o.region, o.address].filter(Boolean).join(" · ")}{" "}
                                    {o.country ? `· ${o.country}` : ""}
                                </dd>
                            </div>
                        ) : null}
                        {o.description ? (
                            <div>
                                <dt className="text-xs text-slate-500">Description</dt>
                                <dd className="text-xs leading-relaxed">{o.description}</dd>
                            </div>
                        ) : null}
                        <div>
                            <dt className="text-xs text-slate-500">Org contact</dt>
                            <dd className="text-xs break-words">
                                {[o.contactName, o.contactEmail, o.contactPhone].filter(Boolean).join(" · ") || "—"}
                            </dd>
                        </div>
                        {o.websiteUrl ? (
                            <div>
                                <dt className="text-xs text-slate-500">Website</dt>
                                <dd>
                                    {safeHttpUrl(o.websiteUrl) ? (
                                        <a href={safeHttpUrl(o.websiteUrl)!} className="break-all text-blue-600 hover:underline" target="_blank" rel="noreferrer">
                                            {o.websiteUrl}
                                        </a>
                                    ) : (
                                        <span className="break-all">{o.websiteUrl}</span>
                                    )}
                                </dd>
                            </div>
                        ) : null}
                        <div className="text-xs text-slate-600">
                            Verification: {o.verificationStatus} · Safeguarding OK:{" "}
                            {o.safeguardingAcknowledged ? "yes" : "no"} · Data policy OK:{" "}
                            {o.dataPolicyAcknowledged ? "yes" : "no"}
                        </div>
                    </dl>
                ) : (
                    <p className="text-slate-500">No organization record linked yet.</p>
                )}
            </div>
            <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <User className="h-3.5 w-3.5" /> Primary account (signup)
                </p>
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
                            <dt className="text-xs text-slate-500">Role · status</dt>
                            <dd>
                                {u.role} · {u.accountStatus}
                            </dd>
                        </div>
                        {u.phone ? (
                            <div>
                                <dt className="text-xs text-slate-500">Phone</dt>
                                <dd>{u.phone}</dd>
                            </div>
                        ) : null}
                        {u.city ? (
                            <div>
                                <dt className="text-xs text-slate-500">City (profile)</dt>
                                <dd>{u.city}</dd>
                            </div>
                        ) : null}
                        <div>
                            <dt className="text-xs text-slate-500">Signup org name / type</dt>
                            <dd className="text-xs">
                                {[u.orgName, u.orgType].filter(Boolean).join(" · ") || "—"}
                            </dd>
                        </div>
                        {u.contactPerson ? (
                            <div>
                                <dt className="text-xs text-slate-500">Contact person</dt>
                                <dd>{u.contactPerson}</dd>
                            </div>
                        ) : null}
                        {[u.institution, u.university, u.department].filter(Boolean).length ? (
                            <div>
                                <dt className="text-xs text-slate-500">Institution / university</dt>
                                <dd className="text-xs">{[u.institution, u.university, u.department].filter(Boolean).join(" · ")}</dd>
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

type PendingAction = { kind: "approve" | "reject"; row: MembershipRow } | null;

function isMismatch(r: MembershipRow): boolean {
    if (r.amountMismatch === true) return true;
    return typeof r.expectedAmountPkr === "number" && r.expectedAmountPkr > 0 && r.expectedAmountPkr !== r.paidAmountPkr;
}

export default function AdminOrgMembershipPage() {
    const [tab, setTab] = useState<"pending" | "history">("pending");
    const [rows, setRows] = useState<MembershipRow[]>([]);
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
            const url =
                tab === "pending"
                    ? "/api/v1/admin/org-membership/pending"
                    : `/api/v1/admin/org-membership/history?page=${historyPage}&limit=${HISTORY_PAGE_SIZE}`;
            const res = await authenticatedFetch(url, { signal: run.signal });
            if (!run.isCurrent()) return;
            if (!res?.ok) {
                toast.error(tab === "pending" ? "Failed to load pending membership payments" : "Failed to load history");
                setRows([]);
                return;
            }
            const j = (await res.json().catch(() => null)) as { data?: MembershipRow[] } | null;
            if (!run.isCurrent()) return;
            const list = Array.isArray(j?.data) ? j.data : [];
            setRows(list);
            if (tab === "pending") {
                setPendingCount(list.length);
            } else {
                setHistoryTotal(readTotal(j));
            }
        } catch (e) {
            if (isAbortError(e) || !run.isCurrent()) return;
            setRows([]);
            toast.error("Failed to load membership payments");
        } finally {
            if (run.isCurrent()) setLoading(false);
        }
    }, [tab, historyPage, begin]);

    useEffect(() => {
        void load();
    }, [load]);

    // Keep the other tab's badge fresh (best effort, never blocks the main list).
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                if (tab === "history") {
                    const res = await authenticatedFetch("/api/v1/admin/org-membership/pending");
                    if (!res?.ok || cancelled) return;
                    const j = (await res.json().catch(() => null)) as { data?: unknown[] } | null;
                    if (!cancelled && Array.isArray(j?.data)) setPendingCount(j.data.length);
                } else if (historyTotal == null) {
                    const res = await authenticatedFetch(`/api/v1/admin/org-membership/history?page=1&limit=1`);
                    if (!res?.ok || cancelled) return;
                    const j = await res.json().catch(() => null);
                    const t = readTotal(j);
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

    const openAction = (kind: "approve" | "reject", row: MembershipRow) => {
        setMismatchAck(false);
        setAction({ kind, row });
    };

    const orgLabel = (r: MembershipRow) => r.organization?.name || r.user?.orgName || r.user?.name || "this organization";

    const runAction = async () => {
        if (!action) return;
        const { kind, row } = action;
        const id = row.id;
        setActingId(id);
        try {
            const res =
                kind === "approve"
                    ? await authenticatedFetch(`/api/v1/admin/org-membership/${id}/approve`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(isMismatch(row) ? { allowAmountMismatch: true } : {}),
                      })
                    : await authenticatedFetch(`/api/v1/admin/org-membership/${id}/reject`, {
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
            toast.success(kind === "approve" ? "Account activated" : "Submission rejected");
            if (kind === "reject") setFeedback((f) => ({ ...f, [id]: "" }));
            setAction(null);
            setHistoryTotal(null);
            await load();
        } finally {
            setActingId(null);
        }
    };

    const emptyMsg = tab === "pending" ? "No pending submissions." : "No processed payments yet.";
    const totalPages = historyTotal != null ? Math.max(1, Math.ceil(historyTotal / HISTORY_PAGE_SIZE)) : null;
    const mismatchOnApprove = action?.kind === "approve" && isMismatch(action.row);

    const badge = (n: number | null, active: boolean) =>
        n == null ? null : (
            <span
                className={
                    "rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums " +
                    (active ? "bg-white/20 text-white" : "bg-white text-slate-600")
                }
            >
                {n}
            </span>
        );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Organization membership fees</h1>
                <p className="mt-1 text-slate-600">
                    Review payment proofs for university and corporate signups. Approve to set the account active. History shows
                    past approvals and rejections.
                </p>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
                <button
                    type="button"
                    onClick={() => setTab("pending")}
                    className={
                        "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition " +
                        (tab === "pending" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")
                    }
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
                    className={
                        "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition " +
                        (tab === "history" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")
                    }
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
                                        <p className="font-semibold text-slate-900">{r.user?.name || "Unknown user"}</p>
                                        <p className="text-sm text-slate-600 break-all">{r.user?.email}</p>
                                        <p className="mt-1 text-xs text-slate-500 break-all">
                                            Role: {r.user?.role} · User ID: {r.userId} · Paid PKR{" "}
                                            {Number(r.paidAmountPkr ?? 0).toLocaleString("en-PK")}
                                            {typeof r.expectedAmountPkr === "number" && r.expectedAmountPkr > 0
                                                ? ` · Expected PKR ${r.expectedAmountPkr.toLocaleString("en-PK")}`
                                                : ""}
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
                                                Amount mismatch: paid differs from the expected membership fee.
                                            </p>
                                        ) : null}
                                        {tab === "history" && r.adminFeedback ? (
                                            <p className="mt-1 text-xs text-red-700 break-words">Note: {r.adminFeedback}</p>
                                        ) : null}
                                    </div>
                                    {proof ? (
                                        <a
                                            href={proof}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                                        >
                                            Open proof <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                    ) : (
                                        <span className="text-xs text-slate-400">
                                            {r.proofUrl ? "Proof link unavailable (invalid URL)" : "No proof uploaded"}
                                        </span>
                                    )}
                                </div>

                                <OrgAndAccountDetails row={r} />

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
                                                {actingId === r.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Check className="h-4 w-4" />
                                                )}
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
                    <button
                        type="button"
                        disabled={historyPage <= 1 || loading}
                        onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                        className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 font-medium hover:bg-slate-50 disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span>
                        Page {historyPage} of {totalPages}
                    </span>
                    <button
                        type="button"
                        disabled={historyPage >= totalPages || loading}
                        onClick={() => setHistoryPage((p) => p + 1)}
                        className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 font-medium hover:bg-slate-50 disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            ) : null}

            <ConfirmDialog
                open={action != null}
                title={action?.kind === "approve" ? `Approve ${action ? orgLabel(action.row) : ""}?` : `Reject ${action ? orgLabel(action.row) : ""}?`}
                description={
                    action?.kind === "approve"
                        ? "This activates the account and notifies the user."
                        : action?.row && feedback[action.row.id]?.trim()
                          ? `The user is notified and may submit again. Note: "${feedback[action.row.id].trim()}"`
                          : "The user is notified and may submit again. No rejection note was entered."
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
                        <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 shrink-0"
                            checked={mismatchAck}
                            onChange={(e) => setMismatchAck(e.target.checked)}
                        />
                        <span>
                            Paid PKR {Number(action.row.paidAmountPkr ?? 0).toLocaleString("en-PK")}
                            {typeof action.row.expectedAmountPkr === "number"
                                ? ` but expected PKR ${action.row.expectedAmountPkr.toLocaleString("en-PK")}`
                                : " does not match the expected fee"}
                            . I understand and want to approve despite the mismatch.
                        </span>
                    </label>
                ) : null}
            </ConfirmDialog>
        </div>
    );
}
