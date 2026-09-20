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
import type { CommunityAwardBadge } from "@/utils/communityAwardModel";
import { formatDisplayId } from "@/utils/displayIds";

const HUB = "/dashboard/student/paths/community-service";

type RankBand = { rank: number; of: number } | null;

type RankingRow = {
    id: string;
    opportunityId: string | null;
    title: string;
    cii: number;
    facultyRank: RankBand;
    universityRank: RankBand;
    networkRank: RankBand;
};

type ReportRow = {
    id: string;
    project_id?: string | null;
    opportunity_id?: string | null;
    project_title?: string;
    cii_score?: number | null;
    level?: string | null;
    awardBadges?: CommunityAwardBadge[];
};

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

function reportHref(row: { id: string; project_id?: string | null; opportunity_id?: string | null; opportunityId?: string | null }): string {
    const id = row.project_id || row.opportunity_id || row.opportunityId || row.id;
    return `/dashboard/student/report?projectId=${encodeURIComponent(String(id))}`;
}

export default function CommunityServiceRankings() {
    const [rows, setRows] = useState<RankingRow[]>([]);
    const [reports, setReports] = useState<ReportRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

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
    const official = reports.filter((row) => (row.awardBadges || []).length > 0);

    return (
        <div className="mx-auto max-w-[1500px] pb-16">
            <CommunityCrumb role="Student" view="AI Analyzer & Rankings" />
            <MockupSectionHead
                title="AI Analyzer & My Rankings"
                subtitle="Official ranking snapshots are dated and permanent. Dynamic positions may still move on university and CIEL PK dashboards."
                action={
                    <Link href={HUB} className="border-0 bg-transparent text-xs font-black text-[#087c75] hover:underline">
                        ← Back to module buttons
                    </Link>
                }
            />
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
                        <strong className="mt-1 block text-lg text-[#16313d]">{official.length}</strong>
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
            ) : rows.length === 0 && official.length === 0 ? (
                <EmptyPanel
                    title="No rankings yet"
                    text="Only approved reports become eligible; Faculty, NGOs, Partners, Universities and CIEL PK run rankings."
                />
            ) : (
                <div className="space-y-4">
                    {official.flatMap((row) =>
                        (row.awardBadges || []).map((badge, i) => (
                            <div key={`${row.id}-${badge.kind}-${i}`} className="rounded-[20px] border border-[#dde5ea] bg-white p-5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h4 className="m-0 text-[15px] font-bold text-[#16313d]">{row.project_title || "Community Service project"}</h4>
                                    <span className="rounded-full bg-[#e6f6f4] px-3 py-1 text-[11px] font-extrabold text-[#0e7d74]">
                                        Official ranking
                                    </span>
                                </div>
                                <p className="mt-2 text-[12px] text-[#6b7c86]">
                                    #{badge.rank} of {badge.of} · {badge.scope || badge.label}
                                    {badge.at ? ` · ${new Date(badge.at).toLocaleDateString()}` : ""}
                                </p>
                                <Link href={reportHref(row)} className="mt-3 inline-block text-[11px] font-extrabold text-[#0e7d74] hover:underline">
                                    Open record →
                                </Link>
                            </div>
                        )),
                    )}
                    {rows.map((r) => (
                        <div key={r.id} className="rounded-[20px] border border-[#dde5ea] bg-white p-5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h4 className="m-0 text-[15px] font-bold text-[#16313d]">{r.title}</h4>
                                <span className="rounded-full bg-[#e6f6f4] px-3 py-1 text-[11px] font-extrabold text-[#0e7d74]">
                                    Verified CII {r.cii}
                                </span>
                            </div>
                            <p className="mt-1.5 text-[11px] text-[#6b7c86]">Current position — may still move; it does not overwrite official awards.</p>
                            <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
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
        </div>
    );
}
