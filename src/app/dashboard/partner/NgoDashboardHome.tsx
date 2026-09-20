"use client";

import Link from "next/link";
import PendingAttendanceModal from "@/components/engagement/PendingAttendanceModal";
import { COMMAND_HERO, MOCKUP_GRADIENTS, MockupActionCard, MockupHero, MockupSectionHead } from "@/components/ciel/dashboard/MockupChrome";
import { FacultyCsInbox } from "@/components/ciel/community-service/FacultyCsInbox";
import { NGO_CS_BASE, NGO_CS_IMPACT, useNgoCommunityServiceData } from "./community-service/useNgoCommunityServiceData";

const TONE_CLASS = {
    default: "text-[#0e4d4e]",
    warn: "text-[#9a6410]",
    bad: "text-[#b34c4c]",
} as const;

export default function NgoDashboardHome() {
    const cs = useNgoCommunityServiceData();
    const dash = (n: number) => (cs.loading ? "—" : String(n));
    const tone = (n: number, kind: "bad" | "warn" = "bad") => (n ? kind : "default");

    return (
        <div className="mx-auto max-w-[1500px] pb-16">
            <PendingAttendanceModal variant="partner" />

            <MockupHero
                kicker="CIEL PK · NGO / Nonprofit Dashboard"
                title={cs.orgName}
                subtitle="Choose Community Service from the left to create opportunities, approve linked work, monitor projects and view verified impact."
                gradient={COMMAND_HERO}
                stats={[
                    { value: "1", label: "Active impact area" },
                    {
                        value: dash(cs.pendingApprovals.length),
                        label: "Community actions",
                        href: `${NGO_CS_BASE}?view=approvals`,
                    },
                    {
                        value: dash(cs.pipeline.length),
                        label: "Linked projects",
                        href: `${NGO_CS_BASE}?view=projects`,
                    },
                    {
                        value: dash(cs.deckCards.length),
                        label: "Verified impact",
                        href: `${NGO_CS_BASE}?view=impact`,
                    },
                ]}
                rightStat={{ value: "🌍", label: "NGO / Nonprofit" }}
            />

            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                {(
                    [
                        {
                            n: cs.pendingApprovals.length,
                            title: "Approvals waiting",
                            sub: `Opportunities naming ${cs.orgName}`,
                            href: `${NGO_CS_BASE}?view=approvals&tab=pending`,
                            tone: tone(cs.pendingApprovals.length),
                        },
                        {
                            n: cs.waiting.length,
                            title: "Linked reports in progress",
                            sub: "Monitor completion · send reminders",
                            href: `${NGO_CS_BASE}?view=projects&tab=active`,
                            tone: tone(cs.waiting.length, "warn"),
                        },
                        {
                            n: cs.applicationsOnMine,
                            title: "Applications on my opportunities",
                            sub: "Approved by supervising faculty",
                            href: `${NGO_CS_BASE}?view=create&tab=published`,
                            tone: "default" as const,
                        },
                        {
                            n: cs.deckCards.length,
                            title: "Verified impact records",
                            sub: "Linked to your organization",
                            href: `${NGO_CS_BASE}?view=impact`,
                            tone: "default" as const,
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
                <FacultyCsInbox items={cs.inboxItems} loading={cs.loading} hideEmpty />
            </div>

            <MockupSectionHead
                title="Impact Areas"
                subtitle="Home is only an overview. Open Community Service from the left navigation to access its complete workflow."
            />
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <MockupActionCard
                    href={NGO_CS_BASE}
                    emoji="🌱"
                    ghost="🌱"
                    title="Community Service"
                    subtitle="Create opportunities, approve linked records, monitor projects and showcase verified impact."
                    badge="OPEN AREA"
                    background={MOCKUP_GRADIENTS.teal}
                    hot={cs.pendingApprovals.length + cs.waiting.length > 0}
                />
                <MockupActionCard
                    href={NGO_CS_IMPACT}
                    emoji="🏆"
                    ghost="🏆"
                    title="Organization Impact Portfolio"
                    subtitle="A future combined view of your organization’s verified impact across CIEL PK areas."
                    badge="PORTFOLIO"
                    background={MOCKUP_GRADIENTS.green}
                />
            </div>
        </div>
    );
}
