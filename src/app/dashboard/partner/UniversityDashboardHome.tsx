"use client";

import Link from "next/link";
import PendingAttendanceModal from "@/components/engagement/PendingAttendanceModal";
import { COMMAND_HERO, MOCKUP_GRADIENTS, MockupActionCard, MockupHero, MockupSectionHead } from "@/components/ciel/dashboard/MockupChrome";
import {
    UNI_CS_BASE,
    UNI_CS_COURSEWORK,
    UNI_CS_FYP,
    UNI_CS_STARTUP,
    useUniversityCommunityServiceData,
} from "./community-service/useUniversityCommunityServiceData";

const TONE_CLASS = {
    default: "text-[#0e4d4e]",
    warn: "text-[#9a6410]",
    bad: "text-[#b34c4c]",
} as const;

export default function UniversityDashboardHome() {
    const cs = useUniversityCommunityServiceData();
    const dash = (n: number) => (cs.loading ? "—" : String(n));

    return (
        <div className="mx-auto min-w-0 max-w-[1500px] pb-16">
            <PendingAttendanceModal variant="partner" />

            <MockupHero
                kicker="CIEL PK · University Dashboard"
                title={cs.orgName}
                subtitle="Choose an impact area from the left. Community Service contains faculty allocation, institution-wide project monitoring, verified impact, rankings, analytics and exports."
                gradient={COMMAND_HERO}
                stats={[
                    { value: "4", label: "Impact areas" },
                    {
                        value: dash(cs.reps.length),
                        label: "Authorised faculty",
                        href: `${UNI_CS_BASE}?view=allocation`,
                    },
                    {
                        value: dash(cs.approvedProjects),
                        label: "Community projects",
                        href: `${UNI_CS_BASE}?view=projects`,
                    },
                    {
                        value: dash(cs.deckCards.length),
                        label: "Verified records",
                        href: `${UNI_CS_BASE}?view=approved`,
                    },
                ]}
                rightStat={{ value: "🏛️", label: "Institutional impact oversight" }}
            />

            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                {(
                    [
                        {
                            n: 0,
                            title: "Faculty allocation requests",
                            sub: "Authorise opportunity-creation authority",
                            href: `${UNI_CS_BASE}?view=allocation&tab=requested`,
                            tone: "default" as const,
                        },
                        {
                            n: cs.approvalOpps.length,
                            title: "Opportunities in approval",
                            sub: "Faculty → Partner → CIEL PK",
                            href: `${UNI_CS_BASE}?view=projects&tab=approval`,
                            tone: cs.approvalOpps.length ? ("bad" as const) : ("default" as const),
                        },
                        {
                            n: cs.waiting.length,
                            title: "Reports in progress",
                            sub: "Institution-wide",
                            href: `${UNI_CS_BASE}?view=projects&tab=active`,
                            tone: cs.waiting.length ? ("warn" as const) : ("default" as const),
                        },
                        {
                            n: cs.deckCards.length,
                            title: "Verified impact records",
                            sub: "On the University Impact Wall",
                            href: `${UNI_CS_BASE}?view=approved`,
                            tone: "default" as const,
                        },
                    ] as const
                ).map((item) => (
                    <Link
                        key={item.title}
                        href={item.href}
                        className="flex items-center gap-3 rounded-2xl border border-[#dde5ea] bg-white px-4 py-3.5 shadow-[0_8px_22px_rgba(24,52,64,.04)] transition hover:-translate-y-0.5 hover:border-[#bcd4d8]"
                    >
                        <span className={`min-w-[36px] text-[26px] font-black leading-none ${TONE_CLASS[item.tone]}`}>
                            {cs.loading ? "—" : item.n}
                        </span>
                        <span className="min-w-0">
                            <b className="block text-[13px] font-extrabold leading-snug text-[#16313d]">{item.title}</b>
                            <small className="mt-0.5 block text-[11.5px] leading-relaxed text-[#6b7c86]">{item.sub}</small>
                        </span>
                    </Link>
                ))}
            </div>

            <MockupSectionHead
                title="Impact Areas"
                subtitle="Home is only an overview. Open Community Service from the left navigation to access its complete workflow."
            />
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <MockupActionCard
                    href={UNI_CS_BASE}
                    emoji="🌱"
                    ghost="🌱"
                    title="Community Service"
                    subtitle="Institution-level Community Service oversight, faculty allocation, projects and verified impact."
                    badge="OPEN AREA"
                    background={MOCKUP_GRADIENTS.teal}
                    hot={cs.approvalOpps.length + cs.waiting.length > 0}
                />
                <MockupActionCard
                    href={UNI_CS_COURSEWORK}
                    emoji="📚"
                    ghost="📚"
                    title="Coursework / SDG Projects"
                    subtitle="Institutional view of sustainability-linked academic projects."
                    badge="IMPACT AREA"
                    background={MOCKUP_GRADIENTS.blue}
                />
                <MockupActionCard
                    href={UNI_CS_FYP}
                    emoji="🎓"
                    ghost="🎓"
                    title="FYP / Thesis"
                    subtitle="Institutional FYP/Thesis sustainability repository and oversight."
                    badge="IMPACT AREA"
                    background={MOCKUP_GRADIENTS.purple}
                />
                <MockupActionCard
                    href={UNI_CS_STARTUP}
                    emoji="🚀"
                    ghost="🚀"
                    title="Startup / Venture"
                    subtitle="Institutional startup and venture impact portfolio."
                    badge="IMPACT AREA"
                    background={MOCKUP_GRADIENTS.orange}
                />
            </div>
        </div>
    );
}
