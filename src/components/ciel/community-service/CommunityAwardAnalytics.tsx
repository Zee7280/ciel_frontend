"use client";

import type { CommunityAwardCard } from "@/utils/communityAwardModel";

export default function CommunityAwardAnalytics({ cards, groupBy }: { cards: CommunityAwardCard[]; groupBy: "university" | "department" }) {
    const hrs = cards.reduce((s, c) => s + (c.hours || 0), 0);
    const avg = cards.length ? Math.round(cards.reduce((s, c) => s + c.total, 0) / cards.length) : 0;
    const key = groupBy === "university" ? "university" : "department";
    const groups = [...new Set(cards.map((c) => c[key] || "Unspecified"))]
        .map((g) => ({
            g,
            h: cards.filter((c) => (c[key] || "Unspecified") === g).reduce((s, c) => s + c.hours, 0),
            n: cards.filter((c) => (c[key] || "Unspecified") === g).length,
        }))
        .sort((a, b) => b.h - a.h);
    const maxH = groups[0]?.h || 1;
    const sdgs = new Set(cards.map((c) => c.sdg).filter((s) => s && s !== "—"));
    const ev = cards.reduce((s, c) => s + c.evidenceCount, 0);

    const stat = (v: string, k: string) => (
        <div key={k} className="min-w-[96px] rounded-[14px] border border-[#dcebee] bg-[#f8fcfd] px-3 py-2">
            <div className="text-[15px] font-extrabold text-[#0d2b33]">{v}</div>
            <div className="mt-0.5 text-[7px] font-extrabold tracking-[0.13em] text-[#7a919a]">{k}</div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-[17px] border border-[#dcebee] bg-white px-4 py-3.5">
                <p className="text-[9px] font-extrabold tracking-[0.12em] text-[#0e7d74]">📊 THE NUMBERS THAT MATTER</p>
                <p className="mt-1 text-[9.5px] text-[#7a919a]">Extracted from the {cards.length} approved flash cards in scope.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                    {stat(String(cards.length), "PROJECTS")}
                    {stat(String(hrs), "VERIFIED HOURS")}
                    {stat(`PKR ${(hrs * 500).toLocaleString()}`, "DIVIDEND @500/H")}
                    {stat(`${avg}/100`, "AVG AWARD SCORE")}
                    {stat(String(sdgs.size), "SDGs")}
                    {stat(String(ev), "EVIDENCE")}
                </div>
                <p className="mt-3 rounded-r-[10px] border-l-[3px] border-[#6d28d9] bg-[#f1ebfd] px-3 py-2 text-[10px] leading-relaxed text-[#4c3a78]">
                    💡 The Community Dividend converts verified hours into rupee value — the line that turns a report into a budget argument.
                </p>
            </div>
            <div className="rounded-[17px] border border-[#dcebee] bg-white px-4 py-3.5">
                <p className="text-[9px] font-extrabold tracking-[0.12em] text-[#0e7d74]">⏱️ VERIFIED HOURS BY {groupBy === "university" ? "UNIVERSITY" : "DEPARTMENT"}</p>
                <div className="mt-3 space-y-1">
                    {groups.map((x) => (
                        <div key={x.g} className="flex items-center gap-2 text-[9.5px]">
                            <span className="w-[130px] shrink-0 truncate font-extrabold">{x.g}</span>
                            <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#eef4f6]">
                                <span className="block h-full rounded-full bg-[linear-gradient(90deg,#0e7d74,#2dd4bf)]" style={{ width: `${Math.round((x.h / maxH) * 100)}%` }} />
                            </span>
                            <span className="w-[70px] text-right font-extrabold text-[#0e7d74]">
                                {x.h}h · {x.n}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
