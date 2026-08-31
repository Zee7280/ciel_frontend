"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";

type DraftRow = {
    id: string;
    title: string;
    updated_at?: string;
    created_at?: string;
};

/** Rough, honest completion estimate from the same fields `validateForm()` requires — no fabricated numbers. */
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

function computeCompletionPercent(detail: Record<string, unknown>): number {
    const passed = COMPLETION_CHECKS.filter((check) => check(detail)).length;
    return Math.round((passed / COMPLETION_CHECKS.length) * 100);
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

export default function DraftsLandingView() {
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

                // Honest per-draft completion % — fetched from the full record, never guessed.
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
        <div className="co-form">
            <div className="mb-3.5 flex items-center gap-3">
                <p className="text-[10px] text-[#7a919a]">
                    Community Service → <b className="text-[#0e7d74]">Create Opportunity</b>
                </p>
                <Link
                    href="/dashboard/student/paths/community-service"
                    className="ml-auto rounded-full border border-[#dcebee] bg-white px-4 py-2 text-[10.5px] font-extrabold text-[#0e7d74]"
                >
                    ← Back to module buttons
                </Link>
            </div>

            <div className="relative mb-4 overflow-hidden rounded-[22px] bg-[linear-gradient(115deg,#04252b,#0e5f63_55%,#12a5a0_110%)] px-6 py-5 text-white">
                <div>
                    <h2 className="text-[18px] font-extrabold">Create Opportunity</h2>
                    <p className="mt-1 max-w-[560px] text-xs leading-relaxed text-[#cdf5f0]">
                        Start a new opportunity or return to an unfinished draft. Drafts stay here until you formally submit them for approval.
                    </p>
                </div>
                <Link
                    href="/dashboard/student/create-opportunity?new=1"
                    className="mt-4 inline-block rounded-[13px] bg-white px-5 py-2.5 text-xs font-extrabold text-[#0e7d74]"
                >
                    + Create New Opportunity
                </Link>
            </div>

            <div className="mb-4 rounded-[17px] border border-[#dcebee] bg-white px-4 py-4">
                <p className="text-[9px] font-extrabold tracking-[0.12em] text-[#0e7d74]">WHAT HAPPENS AFTER SUBMISSION</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-bold text-[#4c5f66]">
                    {["Draft", "Submit Opportunity", "Faculty", "Partner, if applicable", "CIEL PK Final Approval", "Start Report"].map((step, i, arr) => (
                        <span key={step} className="flex items-center gap-2">
                            <span className="rounded-full bg-[#f3f7f8] px-2.5 py-1">{step}</span>
                            {i < arr.length - 1 ? <span className="text-[#c3d2d6]">→</span> : null}
                        </span>
                    ))}
                </div>
            </div>

            <div>
                <h3 className="text-[13px] font-extrabold text-[#0d2b33]">Saved Opportunity Drafts</h3>
                <p className="mb-3 text-[10.5px] text-[#7a919a]">Only opportunities that have not yet been submitted appear here.</p>

                {loading ? (
                    <div className="py-8 text-center text-[#7a919a]">
                        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading drafts…
                    </div>
                ) : drafts.length === 0 ? (
                    <div className="rounded-[17px] border border-dashed border-[#cbe7e3] bg-[#fbfefd] px-5 py-8 text-center text-[11px] text-[#7a919a]">
                        No saved drafts yet. Start a new opportunity above — it appears here the moment you save.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {drafts.map((d) => {
                            const pct = completion[d.id] ?? 0;
                            return (
                                <div key={d.id} className="rounded-[16px] border border-[#dcebee] bg-white p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <h4 className="truncate text-[13px] font-extrabold text-[#0d2b33]">{d.title || "Untitled opportunity"}</h4>
                                            <p className="text-[10px] text-[#7a919a]">Draft · Last saved {formatSavedAt(d.updated_at || d.created_at)}</p>
                                        </div>
                                        <span className="shrink-0 text-[17px] font-extrabold text-[#0e7d74]">{pct}%</span>
                                    </div>
                                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#eef2f3]">
                                        <div
                                            className="h-full rounded-full bg-[linear-gradient(90deg,#0e7d74,#f59e0b)]"
                                            style={{ width: `${Math.max(4, pct)}%` }}
                                        />
                                    </div>
                                    <p className="mt-1.5 text-[9.5px] text-[#7a919a]">Auto-saved ✓</p>
                                    <div className="mt-3 flex gap-2">
                                        <Link
                                            href={`/dashboard/student/create-opportunity?edit=${encodeURIComponent(d.id)}&draft=1`}
                                            className="flex-1 rounded-[11px] bg-[#0e7d74] py-2 text-center text-[11px] font-extrabold text-white"
                                        >
                                            Continue Draft
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(d.id, d.title)}
                                            disabled={deletingId === d.id}
                                            aria-label="Delete draft"
                                            className="flex items-center justify-center rounded-[11px] border border-red-200 px-3 text-red-600 disabled:opacity-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
