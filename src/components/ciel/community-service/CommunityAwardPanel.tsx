"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { authenticatedFetch } from "@/utils/api";
import CommunityFlashCard from "@/components/ciel/community-service/CommunityFlashCard";
import {
    AWARD_PHRASE,
    COMMUNITY_AWARD_CRITERIA,
    COMMUNITY_LEVEL_CLASS,
    COMMUNITY_LEVEL_LABEL,
    awardTier,
    awardTopN,
    whyThisCommunityRank,
    type CommunityAwardCard,
    type CommunityAwardKind,
} from "@/utils/communityAwardModel";

const MEDALS = ["🥇", "🥈", "🥉"];
const BAND = ["#0e7d74", "#d97706", "#e11d48"];

export default function CommunityAwardPanel({
    cards,
    kind,
    scopeName,
    notifyEndpoint,
    filters,
}: {
    cards: CommunityAwardCard[];
    kind: CommunityAwardKind;
    scopeName: string;
    notifyEndpoint: string;
    filters?: { university?: boolean; department?: boolean; org?: boolean; faculty?: boolean };
}) {
    const [ranked, setRanked] = useState(false);
    const [notifyState, setNotifyState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
    const lastNotified = useRef("");
    const [uni, setUni] = useState("all");
    const [dept, setDept] = useState("all");
    const [org, setOrg] = useState("all");
    const [fac, setFac] = useState("all");
    const [year, setYear] = useState("all");
    const [dfrom, setDfrom] = useState("");
    const [dto, setDto] = useState("");

    const pool = useMemo(() => {
        return cards.filter((c) => {
            if (filters?.university && uni !== "all" && c.university !== uni) return false;
            if (filters?.department && dept !== "all" && c.department !== dept) return false;
            if (filters?.org && org !== "all" && c.organization_name !== org) return false;
            if (filters?.faculty && fac !== "all" && c.faculty_name !== fac) return false;
            if (year !== "all" && c.year !== year) return false;
            if (dfrom && c.month && c.month < dfrom) return false;
            if (dto && c.month && c.month > dto) return false;
            return true;
        });
    }, [cards, filters, uni, dept, org, fac, year, dfrom, dto]);

    const scored = useMemo(() => {
        const rows = [...pool];
        if (ranked) rows.sort((a, b) => b.total - a.total || b.evidenceCount - a.evidenceCount);
        return rows;
    }, [pool, ranked]);

    const avg = scored.length ? Math.round(scored.reduce((s, c) => s + c.total, 0) / scored.length) : 0;
    const topN = awardTopN(kind);
    const top = ranked ? scored.slice(0, topN) : [];
    const selectClass = "min-w-[118px] rounded-[10px] border border-[#dcebee] bg-[#f5fbfa] px-2.5 py-1.5 text-[10px] font-bold text-[#0d2b33]";

    const unique = (key: keyof CommunityAwardCard) =>
        Array.from(new Set(cards.map((c) => String(c[key] || "")).filter((v) => v && v !== "—"))).sort();

    const notify = (picks: { reportId: string; rank: number; of: number; total: number }[]) => {
        if (!picks.length) return;
        setNotifyState("sending");
        authenticatedFetch(notifyEndpoint, {
            method: "POST",
            body: JSON.stringify({
                kind,
                scopeLabel: scopeName,
                picks,
                reportIds: picks.map((p) => p.reportId),
            }),
        })
            .then((res) => (res?.ok ? res.json() : null))
            .then((result) => setNotifyState(result?.success ? "sent" : "failed"))
            .catch(() => setNotifyState("failed"));
    };

    const pickKey = top.map((c) => c.id).join(",");
    useEffect(() => {
        if (!ranked || !top.length || notifyState !== "idle") return;
        if (lastNotified.current === pickKey) return;
        lastNotified.current = pickKey;
        notify(top.map((c, i) => ({ reportId: c.id, rank: i + 1, of: scored.length, total: c.total })));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ranked, pickKey, notifyState]);

    return (
        <div className="space-y-3">
            <div className="rounded-[16px] border-2 border-[#e2d9f7] bg-white px-4 py-3.5">
                <p className="text-[9px] font-extrabold tracking-[0.12em] text-[#6d28d9]">📐 THE AWARD CRITERIA — IDENTICAL FOR EVERY STAKEHOLDER</p>
                <p className="mt-1 text-[9.5px] leading-relaxed text-[#7a919a]">
                    Weighted, normalized, interdisciplinary. Total <b className="text-[#0d2b33]">/100</b>. Ties break on evidence integrity.
                </p>
                <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
                    {COMMUNITY_AWARD_CRITERIA.map((c) => (
                        <div key={c.key} className="rounded-[12px] border-[1.5px] border-[#e2d9f7] bg-white px-2 py-2 text-center">
                            <div className="text-[15px] font-extrabold text-[#6d28d9]">{c.max}</div>
                            <div className="mt-0.5 text-[7.5px] font-extrabold leading-tight tracking-wide text-[#7a919a]">{c.title.toUpperCase()}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="rounded-[16px] border border-[#dcebee] bg-white px-4 py-3">
                <div className="mb-2 flex items-center gap-2 text-[8.5px] font-extrabold tracking-[0.13em] text-[#6d28d9]">
                    🔍 FILTERS
                    <button
                        type="button"
                        onClick={() => {
                            setUni("all");
                            setDept("all");
                            setOrg("all");
                            setFac("all");
                            setYear("all");
                            setDfrom("");
                            setDto("");
                            setRanked(false);
                            setNotifyState("idle");
                            lastNotified.current = "";
                        }}
                        className="ml-auto rounded-full bg-[#fbf0d7] px-2.5 py-1 text-[8px] font-extrabold text-[#b45309]"
                    >
                        ✕ CLEAR
                    </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {filters?.university && unique("university").length > 0 && (
                        <select value={uni} onChange={(e) => setUni(e.target.value)} className={selectClass}>
                            <option value="all">University: All</option>
                            {unique("university").map((v) => (
                                <option key={v} value={v}>{v}</option>
                            ))}
                        </select>
                    )}
                    {filters?.department && unique("department").length > 0 && (
                        <select value={dept} onChange={(e) => setDept(e.target.value)} className={selectClass}>
                            <option value="all">Department: All</option>
                            {unique("department").map((v) => (
                                <option key={v} value={v}>{v}</option>
                            ))}
                        </select>
                    )}
                    {filters?.org && unique("organization_name").length > 0 && (
                        <select value={org} onChange={(e) => setOrg(e.target.value)} className={selectClass}>
                            <option value="all">Partner: All</option>
                            {unique("organization_name").map((v) => (
                                <option key={v} value={v}>{v}</option>
                            ))}
                        </select>
                    )}
                    {filters?.faculty && unique("faculty_name").length > 0 && (
                        <select value={fac} onChange={(e) => setFac(e.target.value)} className={selectClass}>
                            <option value="all">Faculty: All</option>
                            {unique("faculty_name").map((v) => (
                                <option key={v} value={v}>{v}</option>
                            ))}
                        </select>
                    )}
                    <select value={year} onChange={(e) => setYear(e.target.value)} className={selectClass}>
                        <option value="all">Year: All</option>
                        {unique("year").map((v) => (
                            <option key={v} value={v}>{v}</option>
                        ))}
                    </select>
                    <label className="text-[8px] font-extrabold text-[#7a919a]">
                        FROM <input type="month" value={dfrom} onChange={(e) => setDfrom(e.target.value)} className={selectClass} />
                    </label>
                    <label className="text-[8px] font-extrabold text-[#7a919a]">
                        TO <input type="month" value={dto} onChange={(e) => setDto(e.target.value)} className={selectClass} />
                    </label>
                </div>
                <p className="mt-2 text-[10px] text-[#7a919a]">
                    <b className="text-[#6d28d9]">{pool.length}</b> faculty-approved card{pool.length === 1 ? "" : "s"} in scope.
                </p>
            </div>

            <button
                type="button"
                disabled={!pool.length}
                onClick={() => {
                    setRanked(true);
                    setNotifyState("idle");
                    lastNotified.current = "";
                }}
                className="rounded-[12px] bg-[#6d28d9] px-6 py-3 text-[12.5px] font-extrabold text-white disabled:opacity-50"
            >
                ▶ Run the award model on {pool.length} card{pool.length === 1 ? "" : "s"} — best → least, badges issued
            </button>

            {ranked && (
                <div className="rounded-[13px] border border-[#e2d9f7] bg-[#f1ebfd] px-3.5 py-2.5 text-[10px] leading-relaxed text-[#4c3a78]">
                    🧮 <b>Run complete</b> — {scored.length} cards · cohort average <b>{avg}/100</b> · evidence re-checked before any rank.{" "}
                    {notifyState === "sent"
                        ? "Badges are pinned to the students' Impact Walls."
                        : notifyState === "failed"
                          ? "Ranking is on this screen — notifications did not send."
                          : "Notifying top-ranked students…"}
                    {notifyState === "failed" && (
                        <button
                            type="button"
                            className="ml-2 rounded-full bg-[#fdf1f4] px-2 py-0.5 text-[8px] font-extrabold text-[#e11d48]"
                            onClick={() => {
                                lastNotified.current = "";
                                setNotifyState("idle");
                            }}
                        >
                            Retry
                        </button>
                    )}
                </div>
            )}

            {ranked &&
                scored.map((c, i) => (
                    <div key={c.id} className={clsx("rounded-[16px] border bg-white px-4 py-3.5", i < 3 ? "border-[#e2d9f7] shadow-[0_10px_26px_rgba(109,40,217,.08)]" : "border-[#dcebee]")}>
                        <div className="flex items-start gap-2.5">
                            <span className="w-7 text-center text-[21px]">{MEDALS[i] || `#${i + 1}`}</span>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <b className="text-[12.5px] text-[#0d2b33]">{c.project_title}</b>
                                    {c.level && (
                                        <span className={clsx("rounded-full px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide", COMMUNITY_LEVEL_CLASS[c.level])}>
                                            {COMMUNITY_LEVEL_LABEL[c.level]}
                                        </span>
                                    )}
                                </div>
                                <p className="mt-0.5 text-[9px] text-[#7a919a]">
                                    {c.student_name} · {c.university} · {c.organization_name} · {c.semester} {c.year}
                                </p>
                                <p className="mt-2.5 text-[8.5px] font-extrabold tracking-[0.1em] text-[#6d28d9]">📐 SCORED ON THE CRITERIA</p>
                                {(Array.isArray(c.pts) ? c.pts : []).map((p, j) => {
                                    const criterion = COMMUNITY_AWARD_CRITERIA[j];
                                    if (!criterion) return null;
                                    const w = criterion.max;
                                    const t = awardTier(p / w);
                                    return (
                                        <div key={COMMUNITY_AWARD_CRITERIA[j].key} className="flex items-center gap-2 border-b border-dashed border-[#dcebee] py-1 text-[9px] last:border-0">
                                            <span className="w-[120px] shrink-0 font-extrabold">{COMMUNITY_AWARD_CRITERIA[j].title.split(" (")[0]}</span>
                                            <span className="h-[6px] w-20 shrink-0 overflow-hidden rounded-full bg-[#eef4f6]">
                                                <span className="block h-full rounded-full" style={{ width: `${Math.round((p / w) * 100)}%`, background: BAND[t] }} />
                                            </span>
                                            <span className="w-10 font-extrabold text-[#6d28d9]">{p}/{w}</span>
                                            <span className="min-w-0 flex-1 truncate text-[#4c5f66]">{AWARD_PHRASE[j][t]}</span>
                                        </div>
                                    );
                                })}
                                <p className="mt-2.5 text-[8.5px] font-extrabold tracking-[0.1em] text-[#6d28d9]">🧠 THE VERDICT — WHY THIS RANK</p>
                                <p className="mt-1.5 border-l-[3px] border-[#e2d9f7] pl-2.5 text-[10.5px] italic leading-relaxed text-[#4c3a78]">{whyThisCommunityRank(c, i, scored, avg)}</p>
                                {i < topN && notifyState === "sent" && (
                                    <span className="mt-2 inline-block rounded-full bg-[#fbf0d7] px-2.5 py-1 text-[8px] font-extrabold text-[#b45309]">
                                        🏅 Badge issued to {c.student_name.split(" ")[0]}&apos;s Impact Wall
                                    </span>
                                )}
                                <div className="mt-2 max-w-[370px]">
                                    <CommunityFlashCard card={c} rank={i + 1} />
                                </div>
                            </div>
                            <span className="shrink-0 text-[16px] font-extrabold text-[#6d28d9]">
                                {c.total}
                                <span className="text-[8px] text-[#7a919a]"> /100</span>
                            </span>
                        </div>
                    </div>
                ))}
        </div>
    );
}
