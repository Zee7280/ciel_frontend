"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { awardPartnerLabel, type CommunityAwardCard } from "@/utils/communityAwardModel";
import { IMPACT_WALL_PACKAGE, type ImpactWallPackageHrefs, type ImpactWallViewer } from "@/utils/impactWallDistribution";
import ImpactWallCiiRing from "@/components/ciel/community-service/ImpactWallCiiRing";

export default function CommunityFlashCard({
    card,
    rank,
    href,
    actions,
    viewer,
    packageHrefs,
}: {
    card: CommunityAwardCard;
    rank?: number;
    href?: string;
    /** Optional extra action row (e.g. "View CII breakdown", "Run AI Analyzer") rendered below
     * the badges — only Super Admin's dashboard passes this today; every other caller is
     * unaffected. */
    actions?: ReactNode;
    viewer?: ImpactWallViewer;
    packageHrefs?: ImpactWallPackageHrefs;
}) {
    const pack = viewer ? IMPACT_WALL_PACKAGE[viewer] : null;
    const packageHref = (pack?.combinedPdf && packageHrefs?.combinedPdf) || href;
    const reportHref = (pack?.detailedPdf && packageHrefs?.detailedPdf) || packageHrefs?.detailedPdf;
    const nationalRank =
        card.npeStanding?.nationalRank ??
        card.awardBadges?.find((b) => b.kind === "ciel")?.rank ??
        rank ??
        null;
    const year = card.year || "";
    const hours = Number(card.hours || 0);
    const uni = card.university || awardPartnerLabel(card.organization_name) || "Community Service";
    const badge = card.level || "Verified";
    const sdg = card.sdg?.trim() || "—";

    return (
        <article className="flex flex-col overflow-hidden rounded-[22px] border border-[#dde8e5] bg-white shadow-[0_8px_24px_rgba(20,63,59,.06)]">
            <div className="relative bg-[linear-gradient(135deg,#0e4d4e,#117669)] px-5 py-4 text-white">
                <span className="absolute right-3.5 top-3.5 rounded-full border border-white/25 bg-white/12 px-2.5 py-1 text-[8px] font-black tracking-wide">
                    ✓ VERIFIED & PUBLISHED
                </span>
                <p className="pr-28 text-[8.5px] font-black tracking-[0.1em] text-[#9fe2d7]">
                    COMMUNITY SERVICE · {year || "—"}
                </p>
                <h4 className="mt-1.5 break-words text-[17px] font-semibold leading-tight [overflow-wrap:anywhere]">
                    {card.project_title || "Community service"}
                </h4>
                <p className="mt-1 text-[11px] text-[#d7eeea]">
                    {[card.student_name, uni, hours ? `${Math.round(hours)} verified hours` : null].filter(Boolean).join(" · ")}
                </p>
            </div>
            <div className="flex flex-1 flex-col px-5 py-4">
                <div className="flex items-center gap-3">
                    <ImpactWallCiiRing score={card.cii ?? null} />
                    <div className="min-w-0">
                        <p className="text-[8px] font-black uppercase tracking-[0.12em] text-[#7a919a]">Composite Impact Index</p>
                        <p className="mt-0.5 text-[15px] font-semibold leading-tight text-[#16313d]">{badge}</p>
                        <p className="mt-0.5 text-[11px] text-[#7a919a]">Verified CII score</p>
                    </div>
                    {nationalRank != null || rank != null ? (
                        <div className="ml-auto rounded-xl border border-[#efdfb6] bg-[#fff9e9] px-2.5 py-2 text-center">
                            <p className="text-[7.5px] font-black uppercase tracking-wide text-[#875f16]">
                                {nationalRank != null ? "National rank" : "Rank"}
                            </p>
                            <p className="text-[16px] font-black text-[#875f16]">#{nationalRank ?? rank}</p>
                        </div>
                    ) : null}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#eef2f1] pt-3 text-center">
                    <div>
                        <p className="text-[8px] font-black uppercase tracking-wide text-[#7a919a]">Hours</p>
                        <p className="mt-1 text-[13px] font-semibold text-[#16313d]">{hours ? `${Math.round(hours)} verified` : "—"}</p>
                    </div>
                    <div>
                        <p className="text-[8px] font-black uppercase tracking-wide text-[#7a919a]">Year</p>
                        <p className="mt-1 text-[13px] font-semibold text-[#16313d]">{year || "—"}</p>
                    </div>
                    <div>
                        <p className="text-[8px] font-black uppercase tracking-wide text-[#7a919a]">SDG link</p>
                        <p className="mt-1 text-[13px] font-semibold text-[#16313d]">{sdg}</p>
                    </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-[#e8f5ef] px-2.5 py-1 text-[10px] font-bold text-[#1d765d]">✓ Accepted</span>
                </div>
                {packageHref || reportHref ? (
                <div className="mt-auto flex gap-2 border-t border-[#eef2f1] pt-3">
                    {packageHref ? (
                        <Link
                            href={packageHref}
                            className="flex-1 rounded-full bg-[#0e4d4e] px-4 py-2.5 text-center text-[12px] font-bold text-white"
                        >
                            View package →
                        </Link>
                    ) : (
                        <button
                            type="button"
                            onClick={() => toast.message("Package is not available yet")}
                            className="flex-1 rounded-full bg-[#0e4d4e] px-4 py-2.5 text-[12px] font-bold text-white"
                        >
                            View package →
                        </button>
                    )}
                    {reportHref ? (
                        <Link
                            href={reportHref}
                            className="rounded-full border border-[#d7e4e1] bg-white px-4 py-2.5 text-[12px] font-bold text-[#174b43]"
                        >
                            Report
                        </Link>
                    ) : null}
                </div>
                ) : null}
                {actions ? <div className="mt-2 flex flex-wrap gap-3">{actions}</div> : null}
            </div>
        </article>
    );
}
