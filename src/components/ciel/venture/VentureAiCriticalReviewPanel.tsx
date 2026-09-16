"use client";

import { useMemo, useState } from "react";
import { analyseVentureCriticalReview, type SharkVote } from "@/utils/ventureCriticalReview";
import type { VentureMeritEntry } from "@/utils/ventureMeritModel";

type ReviewEntry = VentureMeritEntry & { ventureName?: string | null };

const VOTE_CLASS: Record<SharkVote, string> = {
    IN: "bg-[#e6f6ee] text-[#1c6b42]",
    CONDITIONAL: "bg-[#fff5df] text-[#8a5a00]",
    OUT: "bg-[#fdecec] text-[#9b2c2c]",
};

function gchip(grade: string) {
    const letter = grade[0];
    if (letter === "A") return "bg-[#e6f6ee] text-[#1c6b42]";
    if (letter === "B") return "bg-[#e8f3fb] text-[#1f5f9a]";
    if (letter === "C") return "bg-[#fff5df] text-[#8a5a00]";
    return "bg-[#fdecec] text-[#9b2c2c]";
}

export default function VentureAiCriticalReviewPanel({
    entry,
    onPrefill,
}: {
    entry: ReviewEntry;
    onPrefill?: (draft: string) => void;
}) {
    const review = useMemo(() => analyseVentureCriticalReview(entry), [entry]);
    const [openKey, setOpenKey] = useState(review.sections[0]?.key || "");
    const vcls = review.overall >= 72 ? "bg-[#e6f6ee] text-[#1c6b42] border-[#b9e4cb]" : review.overall >= 50 ? "bg-[#fff5df] text-[#8a5a00] border-[#f1d799]" : "bg-[#fdecec] text-[#9b2c2c] border-[#f2c4c4]";
    const recLabel = review.rec === "approved" ? "✔ Approve & publish" : review.rec === "revision" ? "↩ Request revision" : "✖ Flag / reject";

    const copyDraft = async () => {
        try {
            await navigator.clipboard.writeText(review.facultyDraft);
        } catch {
            /* ignore */
        }
    };

    return (
        <div className="mt-4 overflow-hidden rounded-[22px] border-[1.5px] border-[#0f8f8a] bg-white shadow-[0_8px_30px_rgba(10,30,40,.08)]">
            <div className="flex flex-wrap items-center gap-5 bg-[radial-gradient(120%_140%_at_100%_0%,#0d8e88_0%,#0b4b57_45%,#0a2f3d_100%)] px-6 py-[18px] text-white">
                <div className="min-w-0 flex-1">
                    <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#bfe8e4]">CIEL AI Critical Review · Shark-Tank / VC lens · 30% academic · 70% practical</p>
                    <h3 className="m-0 mt-1 text-[22px] font-bold">{entry.ventureName || "Untitled venture"}</h3>
                    <p className="mt-1 max-w-[760px] text-sm leading-relaxed text-[#e6f2f1]">{review.summary}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="grid h-[78px] w-[78px] place-items-center rounded-full text-[18px] font-extrabold" style={{ background: `conic-gradient(#0f8f8a ${review.overall}%, #e6ebef 0)` }}>
                        <span className="grid h-[64px] w-[64px] place-items-center rounded-full bg-white text-[#0b4b57]">{review.overall}</span>
                    </div>
                    <div className="min-w-[96px] rounded-2xl border border-white/20 bg-white/12 px-4 py-2.5 text-center">
                        <b className="block text-[30px] leading-none">{review.grade}</b>
                        <small className="mt-1 block text-[10.5px] font-bold tracking-wide text-[#cfe8e6]">GRADE · {review.gpa.toFixed(2)} GPA</small>
                    </div>
                    <div className="min-w-[96px] rounded-2xl border border-white/20 bg-white/12 px-4 py-2.5 text-center">
                        <b className="block text-base leading-tight">{review.tier}</b>
                        <small className="mt-1 block text-[10.5px] font-bold tracking-wide text-[#cfe8e6]">IVY TIER</small>
                    </div>
                </div>
            </div>

            <div className="px-6 py-[18px]">
                <div className={`mb-3.5 flex flex-wrap items-center gap-3 rounded-[14px] border px-4 py-3.5 text-[15px] font-bold ${vcls}`}>
                    🦈 Shark verdict: {review.verdict}
                    <span className="ml-auto text-[12.5px] font-semibold opacity-80">Decision support only — AI never approves or rejects</span>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-[#e3e9ee] px-3 py-2.5">
                        <small className="block text-xs text-[#5d6c78]">Academic rigour · 30% of blend</small>
                        <b className="text-xl">{review.acad}/100</b>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#e8eef1]"><i className="block h-full rounded-full bg-gradient-to-r from-[#7d4ddb] to-[#a98af0]" style={{ width: `${review.acad}%` }} /></div>
                    </div>
                    <div className="rounded-xl border border-[#e3e9ee] px-3 py-2.5">
                        <small className="block text-xs text-[#5d6c78]">Real-world practicality · 70% of blend</small>
                        <b className="text-xl">{review.prac}/100</b>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#e8eef1]"><i className="block h-full rounded-full bg-gradient-to-r from-[#0f8f8a] to-[#19c6b8]" style={{ width: `${review.prac}%` }} /></div>
                    </div>
                </div>

                <h4 className="mb-1.5 mt-3.5 text-[15px] font-bold">🦈 The panel votes</h4>
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                    {review.votes.map((v) => (
                        <div key={v.who} className="rounded-[14px] border border-[#e3e9ee] bg-[#fbfcfd] px-3.5 py-3">
                            <div className="flex items-center justify-between text-[13.5px] font-extrabold">
                                <span>{v.who}</span>
                                <span className={`rounded-full px-2.5 py-1 text-[11px] font-black tracking-wide ${VOTE_CLASS[v.vote]}`}>{v.vote}</span>
                            </div>
                            <p className="mt-2 text-[13.5px] italic leading-relaxed text-[#2b3a44]">“{v.say}”</p>
                        </div>
                    ))}
                </div>

                <h4 className="mb-1.5 mt-3.5 text-[15px] font-bold">🔎 Reality checks</h4>
                {review.checks.length ? (
                    <div className="grid gap-1.5">
                        {review.checks.map((c) => (
                            <div key={c.text} className="flex items-center gap-2.5 rounded-[10px] border border-[#e3e9ee] px-3 py-2 text-[13.5px]">
                                <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-black uppercase tracking-wide ${c.level === "critical" ? "bg-[#fdecec] text-[#9b2c2c]" : c.level === "high" ? "bg-[#fff0e0] text-[#a4530a]" : "bg-[#fff5df] text-[#8a5a00]"}`}>{c.level}</span>
                                {c.text}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="m-0 text-[13.5px] text-[#5d6c78]">No reality-check flags — the numbers and claims reconcile.</p>
                )}

                <h4 className="mb-1.5 mt-4 text-[15px] font-bold">
                    📑 Section-by-section analysis <small className="font-medium text-[#5d6c78]">— academic /10, practical /10, blended /100</small>
                </h4>
                <div className="space-y-2">
                    {review.sections.map((s, ix) => {
                        const open = openKey === s.key;
                        return (
                            <div key={s.key} className="rounded-[14px] border border-[#e3e9ee] bg-white">
                                <button type="button" onClick={() => setOpenKey(open ? "" : s.key)} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left">
                                    <span className={`min-w-[44px] rounded-[10px] px-2 py-1 text-center text-[13px] font-black ${gchip(s.grade)}`}>{s.grade}</span>
                                    <span className="flex-1 text-[14.5px] font-extrabold">
                                        {ix + 1}. {s.name} <small className="font-medium text-[#5d6c78]">· weight {s.weight}% · {s.ivy}</small>
                                    </span>
                                    <span className="text-[11.5px] text-[#5d6c78]">
                                        Academic {s.acad}/10 · Practical {s.prac}/10 · <b className="text-[#14212b]">{s.score}/100</b>
                                    </span>
                                </button>
                                {open ? (
                                    <div className="grid grid-cols-1 gap-3.5 px-4 pb-3.5 md:grid-cols-2">
                                        <div>
                                            <h5 className="mb-1.5 mt-0 text-[11.5px] font-bold uppercase tracking-wide text-[#5d6c78]">What works</h5>
                                            <ul className="m-0 list-disc pl-[18px] text-[13.5px] leading-relaxed">{s.strengths.map((x) => <li key={x}>{x}</li>)}</ul>
                                            <h5 className="mb-1.5 mt-2.5 text-[11.5px] font-bold uppercase tracking-wide text-[#5d6c78]">Gaps a VC would flag</h5>
                                            <ul className="m-0 list-disc pl-[18px] text-[13.5px] leading-relaxed">{s.gaps.map((x) => <li key={x}>{x}</li>)}</ul>
                                            <h5 className="mb-1.5 mt-2.5 text-[11.5px] font-bold uppercase tracking-wide text-[#5d6c78]">Actions before resubmission</h5>
                                            <ul className="m-0 list-disc pl-[18px] text-[13.5px] leading-relaxed">{s.actions.map((x) => <li key={x}>{x}</li>)}</ul>
                                        </div>
                                        <div>
                                            <h5 className="mb-1.5 mt-0 text-[11.5px] font-bold uppercase tracking-wide text-[#5d6c78]">Ask the student (viva)</h5>
                                            {s.questions.map((q) => (
                                                <div key={q} className="mt-1.5 rounded-[10px] bg-[#f4f7f9] px-3 py-2 text-[13px]">{q}</div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>

                <div className="mt-3 rounded-[14px] border border-[#cfe0d6] bg-[#f3faf6] px-4 py-3.5">
                    <h4 className="m-0 text-[15px] font-bold text-[#1c6b42]">👩‍🏫 Faculty guidance</h4>
                    <p className="mt-1.5 text-[13.5px]">
                        <b>AI-suggested decision:</b> {recLabel}{" "}
                        <span className="text-[#5d6c78]">(score {review.overall}, {review.checks.filter((c) => c.level === "critical").length} critical flags). The decision is yours; the AI never approves or rejects.</span>
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                        {onPrefill ? (
                            <button type="button" onClick={() => onPrefill(review.facultyDraft)} className="rounded-[10px] bg-[#0f8f8a] px-3 py-1.5 text-[12.5px] font-bold text-white">
                                Prefill decision remarks
                            </button>
                        ) : null}
                        <button type="button" onClick={() => void copyDraft()} className="rounded-[10px] bg-[#eef3f6] px-3 py-1.5 text-[12.5px] font-bold text-[#0b4b57]">
                            Copy student feedback draft
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function VentureAiReviewChip({ entry }: { entry: ReviewEntry }) {
    const review = useMemo(() => analyseVentureCriticalReview(entry), [entry]);
    return (
        <span className="inline-flex items-center rounded-full bg-[#eef3f6] px-2.5 py-1 text-[12px] font-bold text-[#0b4b57]" title="CIEL AI Critical Review — 30% academic / 70% practical">
            🦈 AI {review.overall} · {review.grade} · {review.tier}
        </span>
    );
}
