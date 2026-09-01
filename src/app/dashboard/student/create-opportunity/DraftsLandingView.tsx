"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";

type DraftRow = {
    id: string;
    title: string;
    updated_at?: string;
    created_at?: string;
};

/** Honest completion from the same fields the create form requires — no fabricated numbers. */
const COMPLETION_CHECKS: Array<(d: Record<string, unknown>) => boolean> = [
    (d) => Boolean(typeof d.title === "string" && d.title.trim()),
    (d) => Array.isArray(d.types) && d.types.length > 0,
    (d) => Boolean(typeof d.mode === "string" && d.mode.trim()),
    (d) => Boolean((d.sdg_info as Record<string, unknown> | undefined)?.sdg_id),
    (d) => Boolean(typeof (d.objectives as Record<string, unknown> | undefined)?.description === "string" && (d.objectives as Record<string, unknown>).description),
    (d) =>
        Boolean(
            typeof (d.activity_details as Record<string, unknown> | undefined)?.student_responsibilities === "string" &&
                (d.activity_details as Record<string, unknown>).student_responsibilities,
        ),
    (d) => Boolean(typeof (d.supervision as Record<string, unknown> | undefined)?.contact === "string" && (d.supervision as Record<string, unknown>).contact),
    (d) => Array.isArray(d.verification_method) && d.verification_method.length > 0,
];

const STEP_COUNT = COMPLETION_CHECKS.length;

function computeCompletionPercent(detail: Record<string, unknown>): number {
    const passed = COMPLETION_CHECKS.filter((check) => check(detail)).length;
    return Math.round((passed / STEP_COUNT) * 100);
}

function stepsDone(pct: number): number {
    return Math.round((pct / 100) * STEP_COUNT);
}

function formatSavedAt(iso?: string): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const diffMs = Date.now() - d.getTime();
    const diffDays = Math.floor(diffMs / 86_400_000);
    if (diffDays <= 0) return `today, ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString();
}

const FLOW = ["Draft", "Submit Opportunity", "Faculty", "Partner, if applicable", "CIEL PK Final Approval", "Start Report"];

export default function DraftsLandingView({ embedded = false }: { embedded?: boolean }) {
    const [drafts, setDrafts] = useState<DraftRow[]>([]);
    const [completion, setCompletion] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const res = await authenticatedFetch("/api/v1/student/opportunity/mine?status=draft", {}, { redirectToLogin: false });
                const json = res?.ok ? await res.json().catch(() => null) : null;
                const rows: DraftRow[] = Array.isArray(json?.data) ? json.data : [];
                if (cancelled) return;
                setDrafts(rows);

                const pairs = await Promise.all(
                    rows.map(async (row) => {
                        try {
                            const detailRes = await authenticatedFetch(
                                "/api/v1/opportunities/detail",
                                { method: "POST", body: JSON.stringify({ id: row.id }) },
                                { redirectToLogin: false },
                            );
                            const detailJson = detailRes?.ok ? await detailRes.json().catch(() => null) : null;
                            const detail = detailJson?.data as Record<string, unknown> | undefined;
                            return [row.id, detail ? computeCompletionPercent(detail) : 0] as const;
                        } catch {
                            return [row.id, 0] as const;
                        }
                    }),
                );
                if (!cancelled) setCompletion(Object.fromEntries(pairs));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleDelete = async (id: string, title: string) => {
        if (!window.confirm(`Delete draft "${title}"? This cannot be undone.`)) return;
        setDeletingId(id);
        try {
            const res = await authenticatedFetch(`/api/v1/opportunities/${encodeURIComponent(id)}`, { method: "DELETE" }, { redirectToLogin: false });
            if (!res?.ok) throw new Error("Could not delete this draft");
            setDrafts((prev) => prev.filter((d) => d.id !== id));
            toast.success("Draft deleted");
        } catch {
            toast.error("Could not delete this draft");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div>
            {!embedded ? (
                <div className="mb-3.5 flex flex-wrap items-center gap-3">
                    <p className="text-[13px] text-[#71828e]">
                        Student Dashboard / <b className="font-semibold text-[#183140]">Community Service</b>
                        {" / "}
                        <b className="font-semibold text-[#183140]">Create Opportunity</b>
                    </p>
                    <Link
                        href="/dashboard/student/paths/community-service"
                        className="ml-auto border-0 bg-transparent text-xs font-black text-[#087c75] hover:underline"
                    >
                        ← Back to module buttons
                    </Link>
                </div>
            ) : null}

            <div className="flex flex-col items-start justify-between gap-4 rounded-[20px] bg-[linear-gradient(135deg,#0b5c59,#19a18f)] px-5 py-5 text-white sm:flex-row sm:items-center">
                <div>
                    <h3 className="m-0 text-[21px] font-semibold">Create Opportunity</h3>
                    <p className="mt-1.5 max-w-[720px] text-[11.5px] leading-[1.5] text-[#d9f4ef]">
                        Start a new Community Service opportunity or return to an unfinished draft. Drafts stay here until you formally submit them for approval.
                    </p>
                </div>
                <Link
                    href="/dashboard/student/create-opportunity?new=1"
                    className="shrink-0 rounded-xl bg-white px-[15px] py-[11px] text-[11px] font-[950] text-[#0c665d] shadow-[0_6px_14px_rgba(15,118,110,.16)]"
                >
                    + Create New Opportunity
                </Link>
            </div>

            <div className="mt-3.5 rounded-2xl border border-[#dfe9e7] bg-[linear-gradient(135deg,#f3fbf8,#fff)] p-3.5">
                <p className="mb-2.5 text-[10px] font-[950] uppercase tracking-[0.07em] text-[#176e64]">What happens after submission</p>
                <div className="flex flex-wrap items-center gap-[7px]">
                    {FLOW.map((step, i) => (
                        <span key={step} className="flex items-center gap-[7px]">
                            <span className="rounded-[18px] border border-[#dde5ea] bg-white px-2.5 py-[7px] text-[10px] font-[850] text-[#486068]">
                                {step}
                            </span>
                            {i < FLOW.length - 1 ? <span className="font-black text-[#8ba29d]">→</span> : null}
                        </span>
                    ))}
                </div>
            </div>

            <div className="mb-2.5 mt-[19px] flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h4 className="m-0 text-[15px] font-semibold text-[#16313d]">Saved Opportunity Drafts</h4>
                    <p className="mt-1 text-[10.5px] text-[#70808a]">Only opportunities that have not yet been submitted appear here.</p>
                </div>
                <span className="rounded-[18px] bg-[#edf4fb] px-2 py-1 text-[9.5px] font-black text-[#376d9f]">
                    {loading ? "…" : `${drafts.length} Draft${drafts.length === 1 ? "" : "s"}`}
                </span>
            </div>

            {loading ? (
                <div className="py-10 text-center text-[#7a919a]">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading drafts…
                </div>
            ) : drafts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#cbe7e3] bg-[#fbfefd] px-5 py-8 text-center text-[11px] text-[#7a919a]">
                    No saved drafts yet. Start a new opportunity above — it appears here the moment you save.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {drafts.map((d) => {
                        const pct = completion[d.id] ?? 0;
                        const done = stepsDone(pct);
                        const editHref = `/dashboard/student/create-opportunity?edit=${encodeURIComponent(d.id)}&draft=1`;
                        return (
                            <div key={d.id} className="rounded-2xl border border-[#dde5ea] bg-white p-[15px]">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h4 className="m-0 truncate text-[13px] font-semibold text-[#16313d]">{d.title || "Untitled opportunity"}</h4>
                                        <p className="mt-1 text-[10px] text-[#70808a]">Draft · Last saved {formatSavedAt(d.updated_at || d.created_at)}</p>
                                    </div>
                                    <span className="shrink-0 text-lg font-[950] text-[#0f766e]">{pct}%</span>
                                </div>
                                <div className="mt-2.5 h-[7px] overflow-hidden rounded-full bg-[#e6eef1]">
                                    <div
                                        className="h-full rounded-full bg-[linear-gradient(90deg,#0e7d74,#f59e0b)]"
                                        style={{ width: `${Math.max(4, pct)}%` }}
                                    />
                                </div>
                                <div className="mt-2 flex justify-between text-[9.5px] text-[#70808a]">
                                    <span>
                                        {done} of {STEP_COUNT} opportunity steps completed
                                    </span>
                                    <span>Auto-saved ✓</span>
                                </div>
                                <div className="mt-[11px] flex flex-wrap gap-2">
                                    <Link href={editHref} className="rounded-[10px] bg-[#174b43] px-3 py-2 text-[10px] font-black text-white">
                                        Continue Draft
                                    </Link>
                                    <Link href={editHref} className="rounded-[10px] border border-[#dde5ea] bg-[#edf3f6] px-3 py-2 text-[10px] font-black text-[#3c5968]">
                                        Preview
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(d.id, d.title)}
                                        disabled={deletingId === d.id}
                                        className="rounded-[10px] bg-[#ffe8ea] px-3 py-2 text-[10px] font-black text-[#b13e49] disabled:opacity-50"
                                    >
                                        {deletingId === d.id ? "Deleting…" : "Delete"}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
