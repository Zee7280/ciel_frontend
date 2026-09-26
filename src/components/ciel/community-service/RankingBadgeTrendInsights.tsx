"use client";

import {
    rankingTrendInsight,
    type CommunityAwardBadge,
    type CommunityAwardKind,
} from "@/utils/communityAwardModel";

const KIND_NAME: Record<CommunityAwardKind, string> = {
    fac: "Faculty",
    par: "Partner / NGO",
    uni: "University",
    ciel: "SEED PK / National",
};

function TrendChip({ move }: { move: number | null }) {
    if (move == null) return <span className="text-[#8ba29d]">→ 0 first</span>;
    if (move > 0) return <span className="text-[#1d765d]">▲ +{move}</span>;
    if (move < 0) return <span className="text-[#b34c4c]">▼ {move}</span>;
    return <span className="text-[#6b7c86]">→ 0</span>;
}

function Last6Spark({ ranks }: { ranks: number[] }) {
    if (!ranks.length) return null;
    const max = Math.max(...ranks, 1);
    return (
        <span className="inline-flex h-4 items-end gap-px" title="Rank history (last 6 runs)">
            {ranks.map((rank, i) => (
                <span
                    key={`${rank}-${i}`}
                    className="w-[3px] rounded-sm bg-[#0e7d74]"
                    style={{ height: `${Math.max(20, ((max + 1 - rank) / (max + 1)) * 100)}%` }}
                />
            ))}
        </span>
    );
}

export default function RankingBadgeTrendInsights({
    badges,
    history,
    partnerLabel,
}: {
    badges?: CommunityAwardBadge[];
    history?: CommunityAwardBadge[];
    /** NGO dashboards keep kind=par on the backend; relabel only. */
    partnerLabel?: string;
}) {
    const current = badges && badges.length > 0 ? badges : [];
    if (!current.length) return null;

    return (
        <div className="space-y-1.5">
            {current.map((badge) => {
                const insight = rankingTrendInsight(history, badge);
                const name = badge.kind === "par" && partnerLabel ? partnerLabel : KIND_NAME[badge.kind];
                return (
                    <div
                        key={`${badge.kind}-${badge.scope}-${badge.at}`}
                        className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[12px] border border-[#e3ecec] bg-[#fbfefd] px-2.5 py-1.5 text-[9px] font-semibold text-[#41545d]"
                    >
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-[#0e4d4e] text-[10px] font-black text-white">
                            {badge.rank}
                        </span>
                        <span className="font-black text-[#16313d]">{name} ranking</span>
                        <span>Current #{insight.currentRank}</span>
                        <span>Best #{insight.bestRank}</span>
                        <TrendChip move={insight.trend} />
                        <Last6Spark ranks={insight.last6} />
                    </div>
                );
            })}
        </div>
    );
}
