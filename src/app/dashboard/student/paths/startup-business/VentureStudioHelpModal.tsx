"use client";

import { useState } from "react";
import { DATA_SOURCES, GLOSSARY } from "@/utils/ventureStudioV13";

export type VsHelpInitial = { kind: "term"; key: string } | { kind: "glossary" } | { kind: "help"; tab: "data" | "how" | "score" };

export function VsHelpModal({
    open,
    onClose,
    initial,
}: {
    open: boolean;
    onClose: () => void;
    initial: VsHelpInitial | null;
}) {
    const [filter, setFilter] = useState("");
    const [tab, setTab] = useState<"data" | "how" | "score">(initial?.kind === "help" ? initial.tab : "data");
    const [showGlossary, setShowGlossary] = useState(initial?.kind === "glossary");
    const [termKey, setTermKey] = useState<string | null>(initial?.kind === "term" ? initial.key : null);
    const term = termKey ? GLOSSARY[termKey] : null;
    const items = Object.entries(GLOSSARY)
        .filter(([k, g]) => k !== "jargon" && `${g.t} ${g.cat} ${g.d}`.toLowerCase().includes(filter.toLowerCase()))
        .sort((a, b) => a[1].cat.localeCompare(b[1].cat) || a[1].t.localeCompare(b[1].t));
    const glossaryOpen = showGlossary || (!term && initial?.kind !== "help");

    if (!open || !initial) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(30,20,40,.45)] p-4" onClick={onClose}>
            <div className="max-h-[85vh] w-full max-w-[640px] overflow-auto rounded-[18px] bg-white p-[22px] shadow-[0_30px_80px_rgba(0,0,0,.3)]" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="float-right h-[30px] w-[30px] rounded-full bg-[#f0edf0] text-base" onClick={onClose}>
                    ×
                </button>
                {term && !showGlossary ? (
                    <>
                        <div className="text-[10px] font-black uppercase tracking-[0.1em] text-[#a63d65]">{term.cat}</div>
                        <h3 className="mb-1 mt-1 text-[19px] font-black text-[#32133a]">{term.t}</h3>
                        <p className="text-[13.5px] leading-relaxed text-[#3f3644]">{term.d}</p>
                        <div className="mt-2 rounded-lg border-l-[3px] border-[#a63d65] bg-[#fdf7fa] px-3 py-2.5 text-[13px] leading-relaxed text-[#5b3d50]">
                            <b className="text-[#7d2b4d]">Student example:</b> {term.e}
                        </div>
                        {term.src ? (
                            <div className="mt-2 rounded-[11px] border border-[#d3e2f1] bg-[#eaf2fb] px-3 py-2.5 text-xs leading-relaxed text-[#1f3b57]">
                                <b>📍 Where to get this:</b> {term.src}
                            </div>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                            <button type="button" className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-xs font-extrabold text-[#6b7280]" onClick={() => setShowGlossary(true)}>
                                📖 See all terms
                            </button>
                        </div>
                    </>
                ) : glossaryOpen ? (
                    <>
                        <div className="text-[10px] font-black uppercase tracking-[0.1em] text-[#a63d65]">Jargon buster</div>
                        <h3 className="mb-1 mt-1 text-[19px] font-black text-[#32133a]">Every business term in this form, explained</h3>
                        <input
                            className="mt-3 w-full rounded-[12px] border border-[#d3cdd6] px-3 py-2.5 text-sm"
                            placeholder="Search e.g. burn, CAC, valuation…"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                        <div className="mt-3 grid gap-1.5">
                            {items.map(([k, g]) => (
                                <button
                                    key={k}
                                    type="button"
                                    className="rounded-[11px] border border-[#e4e2e8] bg-white px-3 py-2.5 text-left hover:border-[#a63d65] hover:bg-[#fdf7fa]"
                                    onClick={() => { setTermKey(k); setShowGlossary(false); }}
                                >
                                    <b className="block text-[13px] text-[#32133a]">{g.t}</b>
                                    <span className="text-[11.5px] text-[#6b7280]">{g.cat} · {g.d.slice(0, 90)}…</span>
                                </button>
                            ))}
                            {!items.length ? <p className="text-xs text-[#6b7280]">No term matches.</p> : null}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="text-[10px] font-black uppercase tracking-[0.1em] text-[#a63d65]">Help</div>
                        <h3 className="mb-2 mt-1 text-[19px] font-black text-[#32133a]">Help centre</h3>
                        <div className="mb-3 flex flex-wrap gap-1.5">
                            {([["data", "📍 Where to get data"], ["how", "🧭 How this form works"], ["score", "📊 How scoring works"]] as const).map(([k, l]) => (
                                <button key={k} type="button" className={`rounded-full px-3 py-1.5 text-[11px] font-extrabold ${tab === k ? "bg-[#a63d65] text-white" : "border border-[#e5e7eb] bg-white text-[#6b7280]"}`} onClick={() => setTab(k)}>
                                    {l}
                                </button>
                            ))}
                        </div>
                        {tab === "data" ? (
                            <div className="grid gap-2">
                                {DATA_SOURCES.map(([t, d]) => (
                                    <div key={t} className="rounded-[12px] border border-[#e4e2e8] px-3 py-2.5">
                                        <b className="block text-[12.5px] text-[#32133a]">{t}</b>
                                        <span className="text-[12px] leading-relaxed text-[#6b7280]">{d}</span>
                                    </div>
                                ))}
                            </div>
                        ) : tab === "how" ? (
                            <div className="space-y-2 text-[13.5px] leading-relaxed text-[#3f3644]">
                                <p>Nine short steps. <b>Core</b> fields create your university record; everything marked <b>optional</b> can stay blank if you do not know it yet — an honest blank scores better than an invented number.</p>
                                <p>Every <b>?</b> icon and dotted word opens a plain-language definition with a student example. Each step starts with an explained panel.</p>
                                <p>Green calculators appear when you enter numbers. Step 9 assembles a business plan from your answers.</p>
                            </div>
                        ) : (
                            <div className="space-y-2 text-[13.5px] leading-relaxed text-[#3f3644]">
                                <p><b>Venture Potential Score</b> (0–100) is a stage-adjusted pre-screen of problem, evidence, market, business model, marketing, finance, defensibility, and team health.</p>
                                <p><b>SDG status never affects the commercial score.</b> Investor-Ready also requires your opt-in, a later stage, and real traction.</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
