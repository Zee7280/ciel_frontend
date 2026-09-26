"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import clsx from "clsx";
import { COMMUNITY_LEVEL_CLASS, COMMUNITY_LEVEL_LABEL, type CommunityAwardCard } from "@/utils/communityAwardModel";
import { IMPACT_WALL_PACKAGE, type ImpactWallPackageHrefs, type ImpactWallViewer } from "@/utils/impactWallDistribution";
import RankingBadgeTrendInsights from "@/components/ciel/community-service/RankingBadgeTrendInsights";
import ReportVerificationQr from "@/components/ReportVerificationQr";

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
     * unaffected. Rendered outside the <Link> wrapper so buttons inside don't trigger navigation. */
    actions?: ReactNode;
    viewer?: ImpactWallViewer;
    packageHrefs?: ImpactWallPackageHrefs;
}) {
    const pack = viewer ? IMPACT_WALL_PACKAGE[viewer] : null;
    const verifyUrl = packageHrefs?.verify || card.impact_verify_url || undefined;
    const partnerLabel = viewer === "ngo" ? "NGO" : viewer === "partner" ? "Partner" : undefined;

    const body = (
        <div className="overflow-hidden rounded-[17px] border border-[#dcebee] bg-white">
            <div className="relative bg-[linear-gradient(130deg,#04252b,#0e5f63_55%,#12a5a0_120%)] px-4 py-3 text-white">
                <span className="absolute right-2.5 top-2.5 rounded-full bg-[linear-gradient(90deg,#6d28d9,#a78bfa)] px-2 py-0.5 text-[8px] font-extrabold">
                    {rank ? `#${rank} · ` : ""}
                    {card.total}/100
                </span>
                <div className="pr-16 text-[7px] font-extrabold tracking-[0.13em] text-[#99f6e4]">
                    {card.university} · {(card.organization_name || "Partner").toUpperCase()} · {card.semester} {card.year}
                </div>
                <b className="mt-1 block text-[11.5px] leading-snug">{card.project_title}</b>
                <div className="mt-0.5 text-[9px] text-[#cdf5f0]">
                    {card.student_name} {card.teamSize > 1 ? `+${card.teamSize - 1}` : ""} · {card.hours} verified hrs · {card.sdg} · supervised by {card.faculty_name}
                </div>
            </div>
            {card.story ? (
                <p className="border-b border-[#dcebee] bg-[#f6fcfb] px-3 py-2 text-[9.5px] italic leading-relaxed text-[#1d3a3d]">
                    “{card.story}”
                </p>
            ) : null}
            <div className="flex flex-wrap gap-1 px-3 py-2">
                {card.level && (
                    <span className={clsx("rounded-full px-2 py-0.5 text-[7px] font-extrabold uppercase tracking-wide", COMMUNITY_LEVEL_CLASS[card.level])}>
                        {COMMUNITY_LEVEL_LABEL[card.level]}
                    </span>
                )}
                {card.faculty_status === "approved" || card.faculty_status === "verified" ? (
                    <span className="rounded-full bg-[#e6f6f4] px-2 py-0.5 text-[7px] font-extrabold text-[#0e7d74]">✅ FACULTY-APPROVED</span>
                ) : (
                    <span className="rounded-full bg-[#fbf0d7] px-2 py-0.5 text-[7px] font-extrabold text-[#9b6700]">⏳ AWAITING FACULTY</span>
                )}
                {card.cii != null ? (
                    <span className="rounded-full bg-[#f1ebfd] px-2 py-0.5 text-[7px] font-extrabold text-[#6d28d9]">🧠 CII {card.cii}</span>
                ) : null}
                <span className="rounded-full bg-[#e3f4fa] px-2 py-0.5 text-[7px] font-extrabold text-[#0891b2]">📸 {card.evidenceCount} EVIDENCE</span>
            </div>
        </div>
    );
    const linked = href ? (
        <Link href={href} className="block transition hover:-translate-y-0.5 hover:shadow-md">
            {body}
        </Link>
    ) : (
        body
    );

    const hasRanking = Boolean(card.awardBadges && card.awardBadges.length);
    const showQr = Boolean(verifyUrl);
    const showPack =
        pack &&
        (pack.detailedPdf || pack.combinedPdf || pack.certificate || pack.qrDownload) &&
        (packageHrefs?.detailedPdf || packageHrefs?.combinedPdf || packageHrefs?.certificate || verifyUrl);

    if (!actions && !hasRanking && !showQr && !showPack) return linked;

    return (
        <div>
            {linked}
            <div className="-mt-px space-y-2 rounded-b-[17px] border border-t-0 border-[#dcebee] bg-[#fbfdfd] px-3 py-2">
                {hasRanking ? (
                    <RankingBadgeTrendInsights
                        badges={card.awardBadges}
                        history={card.awardBadgeHistory}
                        partnerLabel={partnerLabel}
                    />
                ) : null}
                {showQr ? (
                    <div className="flex items-center gap-2">
                        <ReportVerificationQr impactVerifyUrl={verifyUrl} size={56} caption="Verify" />
                        <p className="text-[9px] leading-snug text-[#6b7c86]">
                            QR stays on the approved flashcard for verification
                            {pack?.qrDownload ? "" : " — no separate QR download."}
                        </p>
                    </div>
                ) : null}
                {showPack ? (
                    <div className="flex flex-wrap gap-2">
                        {pack.detailedPdf && packageHrefs?.detailedPdf ? (
                            <Link href={packageHrefs.detailedPdf} className="text-[10.5px] font-black text-[#0e7d74] hover:underline">
                                Detailed PDF
                            </Link>
                        ) : null}
                        {pack.combinedPdf && packageHrefs?.combinedPdf ? (
                            <Link href={packageHrefs.combinedPdf} className="text-[10.5px] font-black text-[#0e7d74] hover:underline">
                                Combined package
                            </Link>
                        ) : null}
                        {pack.certificate && packageHrefs?.certificate ? (
                            <Link href={packageHrefs.certificate} className="text-[10.5px] font-black text-[#0e7d74] hover:underline">
                                Certificate
                            </Link>
                        ) : null}
                        {pack.qrDownload && verifyUrl ? (
                            <Link href={verifyUrl} className="text-[10.5px] font-black text-[#0e7d74] hover:underline">
                                QR / verify
                            </Link>
                        ) : null}
                    </div>
                ) : null}
                {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
            </div>
        </div>
    );
}
