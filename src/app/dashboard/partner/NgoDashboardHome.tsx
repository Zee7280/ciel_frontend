"use client";

import Link from "next/link";
import PendingAttendanceModal from "@/components/engagement/PendingAttendanceModal";
import { COMMAND_HERO, MOCKUP_GRADIENTS, MockupActionCard, MockupHero, MockupSectionHead } from "@/components/ciel/dashboard/MockupChrome";
import { FacultyCsInbox } from "@/components/ciel/community-service/FacultyCsInbox";
import { usePartnerOpportunityReview } from "@/components/faculty/FacultyOpportunityReviewActions";
import {
    NGO_CS_APPROVALS,
    NGO_CS_BASE,
    NGO_CS_CREATE_FORM,
    NGO_CS_IMPACT,
    NGO_CS_MY_OPPS,
    useNgoCommunityServiceData,
} from "./community-service/useNgoCommunityServiceData";

const TONE_CLASS = {
    default: "text-[#0e4d4e]",
    warn: "text-[#9a6410]",
    bad: "text-[#b34c4c]",
} as const;

export default function NgoDashboardHome() {
    const cs = useNgoCommunityServiceData();
    const partnerReview = usePartnerOpportunityReview(cs.reload);
    const dash = (n: number) => (cs.loading ? "—" : String(n));
    const tone = (n: number, kind: "bad" | "warn" = "bad") => (n ? kind : "default");

    return (
        <div className="mx-auto min-w-0 max-w-[1500px] pb-16">
            <PendingAttendanceModal variant="partner" />

            <MockupHero
                kicker={`CIEL PK · ${cs.orgLabel}`}
                title={cs.orgName}
                subtitle="Post community service opportunities, approve work that names your organization and track verified impact."
                gradient={COMMAND_HERO}
                stats={[
                    {
                        value: dash(cs.createCounts.published),
                        label: "Live opportunities",
                        href: `${NGO_CS_MY_OPPS}?tab=live`,
                    },
                    {
                        value: dash(cs.applicationsOnMine),
                        label: "Applications",
                        href: NGO_CS_MY_OPPS,
                    },
                    {
                        value: dash(cs.pipeline.length),
                        label: "Linked projects",
                        href: `${NGO_CS_BASE}?view=projects`,
                    },
                    {
                        value: dash(cs.deckCards.length),
                        label: "Verified impact",
                        href: NGO_CS_IMPACT,
                    },
                ]}
                rightStat={{ value: cs.orgLabel === "HEC / Government" ? "🏛️" : cs.orgLabel === "Corporate Partner" ? "💼" : "🌍", label: cs.orgLabel }}
            />

            <MockupSectionHead title="Needs your attention" />
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                {(
                    [
                        {
                            n: cs.pendingApprovals.length,
                            title: "Approvals waiting",
                            sub: "Opportunities that name your organization",
                            href: `${NGO_CS_APPROVALS}?tab=pending`,
                            tone: tone(cs.pendingApprovals.length),
                        },
                        {
                            n: cs.createCounts.action,
                            title: "Changes requested",
                            sub: "Your opportunities sent back by reviewers",
                            href: `${NGO_CS_MY_OPPS}?tab=action`,
                            tone: tone(cs.createCounts.action),
                        },
                        {
                            n: cs.createCounts.drafts,
                            title: "Unfinished drafts",
                            sub: "Finish and submit for review",
                            href: `${NGO_CS_MY_OPPS}?tab=drafts`,
                            tone: tone(cs.createCounts.drafts, "warn"),
                        },
                        {
                            n: cs.waiting.length,
                            title: "Reports in progress",
                            sub: "Student reports on your projects",
                            href: `${NGO_CS_BASE}?view=projects&tab=active`,
                            tone: tone(cs.waiting.length, "warn"),
                        },
                    ] as const
                ).map((item) => (
                    <Link
                        key={item.title}
                        href={item.href}
                        className="flex items-center gap-3 rounded-2xl border border-[#dde5ea] bg-white px-4 py-3.5 shadow-[0_8px_22px_rgba(24,52,64,.04)] transition hover:-translate-y-0.5 hover:border-[#bcd4d8]"
                    >
                        <span
                            className={`min-w-[36px] text-[26px] font-black leading-none ${TONE_CLASS[item.tone === "bad" || item.tone === "warn" ? item.tone : "default"]}`}
                        >
                            {cs.loading ? "—" : item.n}
                        </span>
                        <span className="min-w-0">
                            <b className="block text-[13px] font-extrabold leading-snug text-[#16313d]">{item.title}</b>
                            <small className="mt-0.5 block text-[11.5px] leading-relaxed text-[#6b7c86]">{item.sub}</small>
                        </span>
                    </Link>
                ))}
            </div>

            <div className="mt-4">
                <FacultyCsInbox
                    items={cs.inboxItems}
                    loading={cs.loading}
                    hideEmpty
                    onOpportunityReview={partnerReview.review}
                    busyOpportunityId={partnerReview.approveSubmittingId}
                />
            </div>

            <MockupSectionHead title="Quick actions" />
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
                <MockupActionCard
                    href={NGO_CS_CREATE_FORM}
                    emoji="🚀"
                    title="Create opportunity"
                    subtitle="Post a new community service opportunity for students."
                    badge="NEW"
                    background={MOCKUP_GRADIENTS.teal}
                />
                <MockupActionCard
                    href={NGO_CS_MY_OPPS}
                    emoji="📋"
                    title="My opportunities"
                    subtitle="Drafts, reviews, live listings and applicants."
                    badge={cs.loading ? "…" : `${cs.mine.length} TOTAL`}
                    background={MOCKUP_GRADIENTS.navy}
                    hot={cs.createCounts.action > 0}
                />
                <MockupActionCard
                    href={`${NGO_CS_APPROVALS}?tab=pending`}
                    emoji="✅"
                    title="Verify work"
                    subtitle="Approve opportunities that name your organization."
                    badge={cs.loading ? "…" : `${cs.pendingApprovals.length} WAITING`}
                    background={MOCKUP_GRADIENTS.orange}
                    hot={cs.pendingApprovals.length > 0}
                />
                <MockupActionCard
                    href={NGO_CS_IMPACT}
                    emoji="🏆"
                    title="Impact wall"
                    subtitle="Verified community service linked to your organization."
                    badge={cs.loading ? "…" : `${cs.deckCards.length} VERIFIED`}
                    background={MOCKUP_GRADIENTS.green}
                />
            </div>
            {partnerReview.dialogs}
        </div>
    );
}
