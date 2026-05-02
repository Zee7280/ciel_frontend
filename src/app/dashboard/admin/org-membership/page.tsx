"use client";

import { useCallback, useEffect, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import { ExternalLink, Loader2, Check, X, Building2, User, History } from "lucide-react";

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
                            <dd className="text-xs">
                                {[o.contactName, o.contactEmail, o.contactPhone].filter(Boolean).join(" · ") || "—"}
                            </dd>
                        </div>
                        {o.websiteUrl ? (
                            <div>
                                <dt className="text-xs text-slate-500">Website</dt>
                                <dd>
                                    <a href={o.websiteUrl} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">
                                        {o.websiteUrl}
                                    </a>
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
                            <dd>{u.email}</dd>
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

export default function AdminOrgMembershipPage() {
    const [tab, setTab] = useState<"pending" | "history">("pending");
    const [rows, setRows] = useState<MembershipRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [actingId, setActingId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<Record<string, string>>({});

    const loadPending = useCallback(async () => {
        const res = await authenticatedFetch("/api/v1/admin/org-membership/pending");
        if (!res?.ok) {
            toast.error("Failed to load pending membership payments");
            return;
        }
        const j = (await res.json().catch(() => null)) as { data?: MembershipRow[] } | null;
        setRows(Array.isArray(j?.data) ? j.data : []);
    }, []);

    const loadHistory = useCallback(async () => {
        const res = await authenticatedFetch("/api/v1/admin/org-membership/history");
        if (!res?.ok) {
            toast.error("Failed to load history");
            return;
        }
        const j = (await res.json().catch(() => null)) as { data?: MembershipRow[] } | null;
        setRows(Array.isArray(j?.data) ? j.data : []);
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            if (tab === "pending") {
                await loadPending();
            } else {
                await loadHistory();
            }
            if (!cancelled) setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [tab, loadPending, loadHistory]);

    const approve = async (id: string) => {
        setActingId(id);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/org-membership/${id}/approve`, { method: "POST" });
            if (!res) {
                toast.error("Approve failed");
                return;
            }
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                toast.error(
                    typeof err === "object" && err && "message" in err ? String((err as { message: unknown }).message) : "Approve failed",
                );
                return;
            }
            toast.success("Account activated");
            await loadPending();
        } finally {
            setActingId(null);
        }
    };

    const reject = async (id: string) => {
        setActingId(id);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/org-membership/${id}/reject`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ feedback: feedback[id]?.trim() || undefined }),
            });
            if (!res) {
                toast.error("Reject failed");
                return;
            }
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                toast.error(
                    typeof err === "object" && err && "message" in err ? String((err as { message: unknown }).message) : "Reject failed",
                );
                return;
            }
            toast.success("Submission rejected");
            setFeedback((f) => ({ ...f, [id]: "" }));
            await loadPending();
        } finally {
            setActingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center gap-2 text-slate-600">
                <Loader2 className="h-6 w-6 animate-spin" />
                Loading…
            </div>
        );
    }

    const emptyMsg = tab === "pending" ? "No pending submissions." : "No processed payments yet.";

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
                        "rounded-lg px-4 py-2 text-sm font-semibold transition " +
                        (tab === "pending" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")
                    }
                >
                    Pending
                </button>
                <button
                    type="button"
                    onClick={() => setTab("history")}
                    className={
                        "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition " +
                        (tab === "history" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")
                    }
                >
                    <History className="h-4 w-4" aria-hidden />
                    History
                </button>
            </div>

            {rows.length === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">{emptyMsg}</p>
            ) : (
                <ul className="space-y-4">
                    {rows.map((r) => (
                        <li key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="font-semibold text-slate-900">{r.user?.name || "Unknown user"}</p>
                                    <p className="text-sm text-slate-600">{r.user?.email}</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Role: {r.user?.role} · User ID: {r.userId} · PKR {r.paidAmountPkr.toLocaleString("en-PK")}
                                        {tab === "history" ? (
                                            <>
                                                {" "}
                                                · <span className="font-medium capitalize">{r.status}</span>
                                                {r.reviewedAt ? ` · ${new Date(r.reviewedAt).toLocaleString()}` : null}
                                            </>
                                        ) : null}
                                    </p>
                                    {tab === "history" && r.adminFeedback ? (
                                        <p className="mt-1 text-xs text-red-700">Note: {r.adminFeedback}</p>
                                    ) : null}
                                </div>
                                <a
                                    href={r.proofUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                                >
                                    Open proof <ExternalLink className="h-3.5 w-3.5" />
                                </a>
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
                                            onClick={() => approve(r.id)}
                                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
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
                                            onClick={() => reject(r.id)}
                                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
                                        >
                                            <X className="h-4 w-4" />
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
