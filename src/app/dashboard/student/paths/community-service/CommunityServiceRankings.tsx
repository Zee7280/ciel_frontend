"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authenticatedFetch } from "@/utils/api";
import { MockupSectionHead } from "@/components/ciel/dashboard/MockupChrome";
import {
    CommunityCrumb,
    EmptyPanel,
    UserGuideBanner,
} from "@/components/ciel/community-service/CommunityServiceHubChrome";
import EmptyState from "@/components/ciel/EmptyState";
import { Loader2 } from "lucide-react";
import type { CommunityAwardBadge, CommunityAwardKind } from "@/utils/communityAwardModel";
import { formatDisplayId } from "@/utils/displayIds";

const HUB = "/dashboard/student/paths/community-service";

const KIND_ICON: Record<CommunityAwardKind, string> = { fac: "🎓", par: "🤝", uni: "🏛️", ciel: "⚙️" };
const KIND_NAME: Record<CommunityAwardKind, string> = {
    fac: "Faculty",
    par: "Partner / NGO",
    uni: "University",
    ciel: "CIEL PK Network",
};

type RankBand = { rank: number; of: number } | null;

type RankingRow = {
    id: string;
    opportunityId: string | null;
    title: string;
    cii: number;
    facultyRank: RankBand;
    universityRank: RankBand;
    networkRank: RankBand;
    awardBadges: CommunityAwardBadge[];
    awardBadgeHistory: CommunityAwardBadge[];
};

type ReportRow = {
    id: string;
    project_id?: string | null;
    opportunity_id?: string | null;
    project_title?: string;
    cii_score?: number | null;
    level?: string | null;
};

function reportHref(row: { id: string; project_id?: string | null; opportunity_id?: string | null; opportunityId?: string | null }): string {
    const id = row.project_id || row.opportunity_id || row.opportunityId || row.id;
    return `/dashboard/student/report?projectId=${encodeURIComponent(String(id))}`;
}

function badgeKey(b: CommunityAwardBadge): string {
    return `${b.kind}|${b.scope}`;
}

/** Same cohort signature (kind + scope) across time → best rank ever held, and how many days it
 * was held at that best rank. Mirrors how the official mockup computes trend/best-rank history
 * from a per-project ranking log, adapted to this app's awardBadgeHistory shape. */
function cohortStats(history: CommunityAwardBadge[], badge: CommunityAwardBadge) {
    const hist = history
        .filter((h) => badgeKey(h) === badgeKey(badge))
        .slice()
        .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    const idx = hist.findIndex((h) => h.at === badge.at && h.rank === badge.rank);
    const prev = idx > 0 ? hist[idx - 1] : null;
    const move = prev ? prev.rank - badge.rank : null;
    const best = hist.length ? Math.min(...hist.map((h) => h.rank)) : badge.rank;
    let heldDays = 0;
    for (let i = 0; i < hist.length; i++) {
        if (hist[i].rank !== best) continue;
        const start = new Date(hist[i].at).getTime();
        const end = i + 1 < hist.length ? new Date(hist[i + 1].at).getTime() : Date.now();
        if (end > start) heldDays += Math.floor((end - start) / 86400000);
    }
    return { move, best, heldDays };
}

function TrendChip({ move }: { move: number | null }) {
    if (move == null) return <span className="text-[#8ba29d]">● first</span>;
    if (move > 0) return <span className="text-[#1d765d]">▲ {move}</span>;
    if (move < 0) return <span className="text-[#b34c4c]">▼ {Math.abs(move)}</span>;
    return <span className="text-[#6b7c86]">▬ same</span>;
}

function RankMedallion({ rank }: { rank: number }) {
    const gold = rank === 1;
    const silver = rank > 1 && rank <= 3;
    return (
        <div
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-[3px] border-white text-[15px] font-black text-[#123f44] shadow-[0_0_0_2px_rgba(197,154,57,.55),0_6px_15px_rgba(17,82,77,.18)]"
            style={{
                background: gold
                    ? "radial-gradient(circle at 35% 30%,#fff 0 22%,#f7e8b3 23% 48%,#cfa845 49% 57%,#0f746c 58% 100%)"
                    : silver
                      ? "radial-gradient(circle at 35% 30%,#fff 0 22%,#e9f3f2 23% 48%,#a7bdbc 49% 57%,#0f746c 58% 100%)"
                      : "radial-gradient(circle at 35% 30%,#fff 0 22%,#eef1f2 23% 48%,#c7d2d6 49% 57%,#0f746c 58% 100%)",
            }}
        >
            <span className="text-center leading-none">
                #{rank}
                <br />
            </span>
        </div>
    );
}

function BadgeCard({ badge, history }: { badge: CommunityAwardBadge; history: CommunityAwardBadge[] }) {
    const [open, setOpen] = useState(false);
    const stats = cohortStats(history, badge);
    return (
        <div className="rounded-[16px] border border-[#dde5ea] bg-[linear-gradient(135deg,#fffdf6,#fbfcfd)] p-3.5">
            <div className="mb-1.5 text-[7.5px] font-black uppercase tracking-[0.12em] text-[#946f17]">
                CIEL PK · NATIONAL RANKING
            </div>
            <div className="flex items-center gap-2.5">
                <RankMedallion rank={badge.rank} />
                <div className="min-w-0">
                    <div className="text-[11px] font-bold leading-snug text-[#173e46]">
                        {KIND_ICON[badge.kind]} {badge.label} <span className="font-semibold text-[#6b7c86]">· of {badge.of}</span>
                    </div>
                    <div className="mt-0.5 text-[9.5px] text-[#687d84]">
                        {KIND_NAME[badge.kind]} cohort{badge.by ? ` · ${badge.by}` : ""} · {new Date(badge.at).toLocaleDateString()}
                    </div>
                </div>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-dashed border-[#e3ecec] pt-2 text-[9px] font-semibold text-[#41545d]">
                <span className="rounded-full border border-[#e3ecec] bg-white/70 px-2 py-0.5">
                    <TrendChip move={stats.move} />
                </span>
                <span className="rounded-full border border-[#e3ecec] bg-white/70 px-2 py-0.5">Best #{stats.best}</span>
                <span className="rounded-full border border-[#e3ecec] bg-white/70 px-2 py-0.5">{stats.heldDays}d at best</span>
                <span className="rounded-full border border-[#e3ecec] bg-white/70 px-2 py-0.5">Score {badge.score}/100</span>
            </div>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="mt-2 border-0 bg-transparent p-0 text-[9px] font-black text-[#0e746c]"
            >
                {open ? "▾" : "✦"} Why this project is #{badge.rank}
            </button>
            {open && (
                <p className="mt-1.5 text-[9px] leading-relaxed text-[#526870]">
                    Published from the {badge.scope} ranking run — rank #{badge.rank} of {badge.of} in the {KIND_NAME[badge.kind]} cohort,
                    National score {badge.score}/100. Positions can move only when a stakeholder publishes a new official run for this cohort;
                    your faculty-approved CII is never affected.
                </p>
            )}
        </div>
    );
}

function HistoryModal({ title, history, onClose }: { title: string; history: CommunityAwardBadge[]; onClose: () => void }) {
    const rows = history.slice().sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
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
            <div role="dialog" aria-modal="true" className="max-h-[92vh] w-[min(720px,96vw)] overflow-auto rounded-[22px] bg-white shadow-[0_28px_70px_rgba(0,0,0,.24)]">
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
                        NATIONAL RANKING · FULL HISTORY
                    </span>
                    <h3 className="mb-0.5 mt-1.5 text-lg font-semibold">{title}</h3>
                    <p className="text-[12px] text-[#d8efea]">Every published run is retained — nothing is silently overwritten.</p>
                </div>
                <div className="space-y-2 p-5 sm:p-6">
                    {rows.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No ranking has been published for this project yet.</p>}
                    {rows.map((r, i) => {
                        const stats = cohortStats(history, r);
                        return (
                            <div key={`${r.at}-${r.kind}-${i}`} className="rounded-[13px] border border-[#dde5ea] bg-[#fbfdfd] p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <b className="text-[12px] text-[#16313d]">
                                        #{r.rank} of {r.of} · {KIND_ICON[r.kind]} {r.label}
                                    </b>
                                    <span className="text-[10.5px] font-bold text-[#6b7c86]">
                                        <TrendChip move={stats.move} />
                                    </span>
                                </div>
                                <p className="mt-1 text-[10.5px] text-[#6b7c86]">
                                    Published {r.by ? `by ${r.by} · ` : ""}
                                    {new Date(r.at).toLocaleString()} · Best #{stats.best} · {stats.heldDays}d at best · Score {r.score}/100
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function RankCard({ label, band }: { label: string; band: RankBand }) {
    return (
        <div className="rounded-2xl border border-[#dde5ea] bg-[#fbfcfd] px-4 py-3.5">
            <p className="text-[9.5px] font-black uppercase tracking-[0.06em] text-[#70808a]">{label}</p>
            {band ? (
                <p className="mt-1 text-lg font-extrabold text-[#16313d]">
                    #{band.rank} <span className="text-[11px] font-semibold text-[#70808a]">of {band.of}</span>
                </p>
            ) : (
                <p className="mt-1 text-[11px] font-semibold text-[#8ba29d]">Not enough peers yet to rank</p>
            )}
        </div>
    );
}

export default function CommunityServiceRankings() {
    const [rows, setRows] = useState<RankingRow[]>([]);
    const [reports, setReports] = useState<ReportRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [historyFor, setHistoryFor] = useState<RankingRow | null>(null);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            authenticatedFetch("/api/v1/students/community-service/rankings", {}, { redirectToLogin: false }),
            authenticatedFetch("/api/v1/student/reports?limit=100", {}, { redirectToLogin: false }),
        ])
            .then(async ([rankRes, reportRes]) => {
                if (cancelled) return;
                const rankJson = rankRes?.ok ? await rankRes.json() : null;
                const reportJson = reportRes?.ok ? await reportRes.json() : null;
                if (!rankJson?.success) {
                    setFailed(true);
                    return;
                }
                setRows(Array.isArray(rankJson.data) ? rankJson.data : []);
                setReports(Array.isArray(reportJson?.data) ? reportJson.data : []);
            })
            .catch(() => {
                if (!cancelled) setFailed(true);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const analysed = reports.filter((row) => row.cii_score != null);
    const officialRows = rows.filter((r) => (r.awardBadges || []).length > 0);

    return (
        <div className="mx-auto max-w-[1500px] pb-16">
            <CommunityCrumb role="Student" view="AI Analyzer & Rankings" />
            <MockupSectionHead
                title="My National Ranking Badges & History"
                subtitle="You cannot run or publish the AI ranking analyzer. Every published National Ranking by Faculty, NGO/Partner, University or CIEL PK appears here and on your verified flashcard, with history preserved."
                action={
                    <Link href={HUB} className="border-0 bg-transparent text-xs font-black text-[#087c75] hover:underline">
                        ← Back to module buttons
                    </Link>
                }
            />
            <div className="mb-4 flex flex-wrap gap-2">
                {["Read-only", "Trend tracked", "Best rank retained", "Every batch auditable"].map((t) => (
                    <span key={t} className="rounded-full border border-[#dde5ea] bg-white px-3 py-1 text-[10.5px] font-bold text-[#3f5661]">
                        {t}
                    </span>
                ))}
            </div>
            <UserGuideBanner
                desc="View official ranking snapshots attached to your verified projects."
                items={[
                    ["Official Ranking", "A dated permanent cohort result."],
                    ["Cohort", "Shows who/what your project was compared against."],
                    ["Why It Ranked", "Explains the evidence and verified factors behind the position."],
                    ["Current Position", "May change on institutional dashboards; it does not overwrite official awards."],
                ]}
                rule="Students view rankings; they do not run them."
            />

            <div className="mb-5 rounded-[18px] border border-[#dde5ea] bg-white p-4">
                <h3 className="m-0 text-[16px] font-semibold text-[#16313d]">🧠 AI Analyzer</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-[#70808a]">
                    Any stakeholder can run the AI Analyzer on a project once its report has started. The result becomes a dated badge on every stakeholder dashboard. Students view the shared badge here; faculty, university and CIEL PK run official cohort rankings.
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    <div className="rounded-2xl border border-[#dde5ea] bg-[#fbfcfd] px-4 py-3">
                        <p className="text-[9.5px] font-black uppercase tracking-[0.06em] text-[#70808a]">Analysed</p>
                        <strong className="mt-1 block text-lg text-[#16313d]">{analysed.length}</strong>
                        <small className="text-[10.5px] text-[#6b7c86]">of {reports.length} report records</small>
                    </div>
                    <div className="rounded-2xl border border-[#dde5ea] bg-[#fbfcfd] px-4 py-3">
                        <p className="text-[9.5px] font-black uppercase tracking-[0.06em] text-[#70808a]">Official snapshots</p>
                        <strong className="mt-1 block text-lg text-[#16313d]">{officialRows.reduce((n, r) => n + r.awardBadges.length, 0)}</strong>
                        <small className="text-[10.5px] text-[#6b7c86]">dated awards that never overwrite</small>
                    </div>
                    <div className="rounded-2xl border border-[#dde5ea] bg-[#fbfcfd] px-4 py-3">
                        <p className="text-[9.5px] font-black uppercase tracking-[0.06em] text-[#70808a]">Live ranks</p>
                        <strong className="mt-1 block text-lg text-[#16313d]">{rows.length}</strong>
                        <small className="text-[10.5px] text-[#6b7c86]">faculty · university · network</small>
                    </div>
                </div>
                {analysed.length ? (
                    <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                        {analysed.map((row) => (
                            <Link
                                key={row.id}
                                href={reportHref(row)}
                                className="rounded-2xl border border-[#dde5ea] px-4 py-3 transition hover:border-[#bcd4d8]"
                            >
                                <b className="block text-[13px] text-[#16313d]">{row.project_title || "Community Service report"}</b>
                                <small className="mt-1 block text-[11px] text-[#6b7c86]">
                                    {formatDisplayId(row.id, "RPT")} · {row.level || "CII"} · {row.cii_score}/100
                                </small>
                            </Link>
                        ))}
                    </div>
                ) : null}
            </div>

            {loading ? (
                <div className="py-14 text-center text-[#7a919a]">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading rankings…
                </div>
            ) : failed ? (
                <EmptyState
                    emoji="⚠️"
                    heading="Rankings could not be loaded"
                    line="We could not reach the rankings service. Refresh the page — your verified reports and their scores are unaffected."
                />
            ) : rows.length === 0 ? (
                <EmptyPanel
                    title="No rankings yet"
                    text="Only approved reports become eligible; Faculty, NGOs, Partners, Universities and CIEL PK run rankings."
                />
            ) : (
                <div className="space-y-4">
                    {rows.map((r) => (
                        <div key={r.id} className="rounded-[20px] border border-[#dde5ea] bg-white p-5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <h4 className="m-0 text-[15px] font-bold text-[#16313d]">{r.title}</h4>
                                    <p className="mt-0.5 text-[11px] text-[#6b7c86]">{formatDisplayId(r.id, "RPT")} · Verified CII {r.cii}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="rounded-full bg-[#e6f6f4] px-3 py-1 text-[11px] font-extrabold text-[#0e7d74]">
                                        Verified CII {r.cii}
                                    </span>
                                    {(r.awardBadgeHistory || []).length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setHistoryFor(r)}
                                            className="rounded-full border border-[#dde5ea] bg-white px-3 py-1 text-[11px] font-extrabold text-[#3f5661] hover:border-[#bcd4d8]"
                                        >
                                            Full history
                                        </button>
                                    )}
                                </div>
                            </div>

                            {r.awardBadges.length > 0 ? (
                                <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {r.awardBadges.map((b, i) => (
                                        <BadgeCard key={`${r.id}-${b.kind}-${i}`} badge={b} history={r.awardBadgeHistory || []} />
                                    ))}
                                </div>
                            ) : (
                                <p className="mt-3 text-[11.5px] text-[#8ba29d]">
                                    No published National Ranking badge yet — it will appear automatically once an authorised stakeholder runs one for this project.
                                </p>
                            )}

                            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.06em] text-[#70808a]">Current position</p>
                            <p className="mt-1 text-[11px] text-[#6b7c86]">Live-computed — may still move; it does not overwrite official awards above.</p>
                            <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                                <RankCard label="Faculty cohort" band={r.facultyRank} />
                                <RankCard label="University cohort" band={r.universityRank} />
                                <RankCard label="CIEL PK network" band={r.networkRank} />
                            </div>
                            <Link href={reportHref(r)} className="mt-3 inline-block text-[11px] font-extrabold text-[#0e7d74] hover:underline">
                                Open record →
                            </Link>
                        </div>
                    ))}
                </div>
            )}

            {historyFor && (
                <HistoryModal title={historyFor.title} history={historyFor.awardBadgeHistory || []} onClose={() => setHistoryFor(null)} />
            )}
        </div>
    );
}
