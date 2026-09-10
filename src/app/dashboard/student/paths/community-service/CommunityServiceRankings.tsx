"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { MockupSectionHead } from "@/components/ciel/dashboard/MockupChrome";
import EmptyState from "@/components/ciel/EmptyState";
import { Loader2 } from "lucide-react";

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
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        authenticatedFetch("/api/v1/students/community-service/rankings", {}, { redirectToLogin: false })
            .then((res) => (res?.ok ? res.json() : null))
            .then((result) => {
                if (cancelled) return;
                // A failed/expired-session call must not masquerade as "you have no rankings" —
                // that reads as verified work having silently disappeared.
                if (!result?.success) {
                    setFailed(true);
                    return;
                }
                setRows(Array.isArray(result.data) ? result.data : []);
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

    return (
        <div>
            <MockupSectionHead
                title="My Rankings"
                subtitle="Where each of your verified Community Service projects currently stands against your faculty's students, your university, and the whole CIEL PK network — computed live from Verified CII, not a dated snapshot."
            />

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
                <EmptyState
                    emoji="🧠"
                    heading="No rankings yet"
                    line="Only verified Community Service reports become eligible for ranking. Once faculty approves a report, it appears here."
                />
            ) : (
                <div className="space-y-4">
                    {rows.map((r) => (
                        <div key={r.id} className="rounded-[20px] border border-[#dde5ea] bg-white p-5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h4 className="m-0 text-[15px] font-bold text-[#16313d]">{r.title}</h4>
                                <span className="rounded-full bg-[#e6f6f4] px-3 py-1 text-[11px] font-extrabold text-[#0e7d74]">
                                    Verified CII {r.cii}
                                </span>
                            </div>
                            <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                                <RankCard label="Faculty cohort" band={r.facultyRank} />
                                <RankCard label="University cohort" band={r.universityRank} />
                                <RankCard label="CIEL PK network" band={r.networkRank} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
