"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/utils/api";

type CiiSection = {
    id: number;
    title: string;
    weight: number;
    score: number;
    good?: string;
    limit?: string;
};

type CiiEvidence = { id: string; type: string; claim: string; verdict: "MATCH" | "PARTIAL" | "MISMATCH" };

type CiiBreakdown = {
    final?: number;
    level?: { level?: number; name?: string; quality?: string };
    sections?: CiiSection[];
    evidence?: CiiEvidence[];
    bonus?: { effort?: number; resources?: number; partners?: number; total?: number };
    integrityPenalty?: number;
    studentFeedback?: { opening_praise?: string; why_score_is_high_or_low?: string };
    redFlags?: Array<{ flag: string; severity?: string }>;
};

function confidenceLabel(score: number, weight: number): string {
    if (!weight) return "—";
    const ratio = score / weight;
    if (ratio >= 0.85) return "High";
    if (ratio >= 0.65) return "Med-High";
    if (ratio >= 0.45) return "Developing";
    return "Needs work";
}

/**
 * Read-only CII v2 breakdown for non-faculty stakeholders (NGO, Partner, University, Super
 * Admin) — same redacted subset the student flashcard shows (section scores + verified
 * highlights, evidence type/verdict), never per-criterion detail or faculty moderation.
 * `fetchUrl` picks the caller's own role-scoped endpoint; this component doesn't know or care
 * which role is viewing it.
 */
export default function CommunityCiiBreakdownModal({
    fetchUrl,
    title,
    onClose,
}: {
    fetchUrl: string;
    title: string;
    onClose: () => void;
}) {
    const [state, setState] = useState<"loading" | "ok" | "error">("loading");
    const [data, setData] = useState<CiiBreakdown | null>(null);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        let cancelled = false;
        setState("loading");
        authenticatedFetch(fetchUrl, {}, { redirectToLogin: false })
            .then(async (r) => {
                if (cancelled) return;
                if (!r?.ok) {
                    const body = await r?.json().catch(() => null);
                    setErrorMessage(body?.message || "This record isn't faculty-approved yet, or isn't in your scope.");
                    setState("error");
                    return;
                }
                const json = await r.json();
                setData(json?.data?.ciiV2 ?? null);
                setState("ok");
            })
            .catch(() => {
                if (cancelled) return;
                setErrorMessage("Could not load the CII breakdown.");
                setState("error");
            });
        return () => {
            cancelled = true;
        };
    }, [fetchUrl]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center overflow-auto bg-[rgba(7,28,35,.58)] p-4 sm:p-6"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            role="presentation"
        >
            <div
                role="dialog"
                aria-modal="true"
                className="max-h-[92vh] w-[min(720px,96vw)] overflow-auto rounded-[22px] bg-white shadow-[0_28px_70px_rgba(0,0,0,.24)]"
            >
                <div className="relative bg-[linear-gradient(125deg,#0e4d4e,#117669)] px-6 py-5 text-white">
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute right-3.5 top-3.5 grid h-[30px] w-[30px] place-items-center rounded-full border-0 bg-white/16 text-[15px] font-black text-white"
                        aria-label="Close"
                    >
                        ×
                    </button>
                    <span className="inline-block rounded-[12px] border border-white/18 bg-white/14 px-2 py-1 text-[8.5px] font-black">
                        CII V2 BREAKDOWN · READ-ONLY
                    </span>
                    <h3 className="mb-0.5 mt-1.5 text-lg font-semibold">{title}</h3>
                </div>

                <div className="p-5 sm:p-6">
                    {state === "loading" && <p className="py-8 text-center text-sm text-slate-500">Loading…</p>}
                    {state === "error" && (
                        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-800">
                            {errorMessage}
                        </p>
                    )}
                    {state === "ok" && data && (
                        <>
                            <div className="flex items-center gap-4">
                                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#0b8278,#3bc3b5)]">
                                    <span className="text-xl font-black text-white">{Math.round(data.final ?? 0)}</span>
                                </div>
                                <div>
                                    <span className="inline-block rounded-full bg-[#eaf8f4] px-2.5 py-1 text-[9px] font-black text-[#176958]">
                                        {data.level?.quality || "VERIFIED"}
                                    </span>
                                    <div className="mt-1 text-[14px] font-bold text-[#16313d]">{data.level?.name || "Approved"}</div>
                                </div>
                            </div>

                            {data.sections && data.sections.length > 0 && (
                                <>
                                    <h4 className="mb-2 mt-5 text-[10px] font-black uppercase tracking-[0.1em] text-[#70808a]">
                                        Section scores
                                    </h4>
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        {data.sections.map((s) => (
                                            <div key={s.id} className="rounded-[13px] border border-[#dde5ea] bg-[#fbfdfd] p-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <b className="text-[10px] leading-tight text-[#16313d]">
                                                        {s.id}. {s.title}
                                                    </b>
                                                    <span className="whitespace-nowrap rounded-full border border-[#efdfb6] bg-[#fff9e9] px-1.5 py-0.5 text-[8px] font-black text-[#875f16]">
                                                        {s.score}/{s.weight}
                                                    </span>
                                                </div>
                                                {s.good && (
                                                    <p className="mt-1.5 text-[8.6px] leading-relaxed text-[#315a57]">
                                                        <b>Highlight:</b> {s.good}
                                                    </p>
                                                )}
                                                <span className="mt-1.5 inline-block rounded-full bg-[#edf9f5] px-1.5 py-0.5 text-[7.5px] font-black text-[#287565]">
                                                    {confidenceLabel(s.score, s.weight)} confidence
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {data.bonus && (
                                <div className="mt-4 grid grid-cols-2 gap-2">
                                    <div className="rounded-lg bg-[#e9f8f0] p-2 text-center">
                                        <span className="text-[8px] font-black text-[#16865a]">BONUS</span>
                                        <div className="text-[12px] font-bold text-[#16865a]">+{(data.bonus.total ?? 0).toFixed(1)}</div>
                                    </div>
                                    <div className="rounded-lg bg-[#fff3dc] p-2 text-center">
                                        <span className="text-[8px] font-black text-[#8b600a]">PENALTY</span>
                                        <div className="text-[12px] font-bold text-[#8b600a]">-{data.integrityPenalty ?? 0}</div>
                                    </div>
                                </div>
                            )}

                            {data.evidence && data.evidence.length > 0 && (
                                <>
                                    <h4 className="mb-2 mt-5 text-[10px] font-black uppercase tracking-[0.1em] text-[#70808a]">
                                        Evidence checked
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                        {data.evidence.map((e) => (
                                            <div key={e.id} className="rounded-[12px] border border-[#dde5ea] bg-[#fbfdfd] p-2.5 text-center">
                                                <b className="block text-[8px] leading-tight text-[#16313d]">{e.type}</b>
                                                <span
                                                    className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[7px] font-black ${
                                                        e.verdict === "MATCH"
                                                            ? "bg-[#e7f7ef] text-[#176b5e]"
                                                            : e.verdict === "PARTIAL"
                                                              ? "bg-[#fff3dc] text-[#886210]"
                                                              : "bg-[#fff0f2] text-[#a34758]"
                                                    }`}
                                                >
                                                    {e.verdict === "MATCH" ? "Verified" : e.verdict === "PARTIAL" ? "Partial" : "Needs review"}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
