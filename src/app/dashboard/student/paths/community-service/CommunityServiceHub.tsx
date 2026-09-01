"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readStoredCurrentUser } from "@/utils/currentUser";
import type { ActiveProject } from "@/app/dashboard/student/types";
import { MOCKUP_GRADIENTS, MockupActionCard, MockupHero, MockupSectionHead } from "@/components/ciel/dashboard/MockupChrome";
import DraftsLandingView from "@/app/dashboard/student/create-opportunity/DraftsLandingView";

const HUB = "/dashboard/student/paths/community-service";
const CREATE_VIEW = `${HUB}?view=create`;
const BROWSE_HREF = "/dashboard/student/browse";
const WORKSPACE_HREF = `${HUB}?view=workspace`;
const LOG_HOURS_HREF = `${HUB}?tab=log-hours`;
const GUIDE_HREF = `${HUB}?view=guide`;
const PORTFOLIO_HREF = "/dashboard/student/impact";
const CS_IMPACT_HREF = "/dashboard/student/impact?area=Community%20Service";

export default function CommunityServiceHub({
    projects,
    verifiedHours,
    wallCount,
    completion,
}: {
    projects: ActiveProject[];
    verifiedHours: number;
    wallCount: number;
    completion: number;
}) {
    const [helpOpen, setHelpOpen] = useState(false);
    const [name, setName] = useState("");

    useEffect(() => {
        const user = readStoredCurrentUser();
        setName(typeof user?.name === "string" ? user.name.split(" ")[0] : "");
    }, []);

    return (
        <div className="mx-auto max-w-[1500px] pb-16">
            <MockupHero
                title="Community Service"
                subtitle="Create opportunities, save drafts, follow Faculty → Partner → CIEL PK approvals, complete your 9-section report and build a verified Community Service impact record."
                stats={[
                    { value: String(projects.length), label: "Active Records" },
                    { value: verifiedHours ? `${Math.round(verifiedHours)}h` : "0h", label: "Verified Service" },
                    { value: String(wallCount), label: "Impact Portfolio" },
                ]}
                rightStat={{ value: `${completion}%`, label: "overall current-work completion" }}
            />

            <MockupSectionHead
                title="Community Service"
                subtitle="Create an opportunity, track sequential approvals, complete your report and build a verified Community Service record."
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <MockupActionCard
                    href={CREATE_VIEW}
                    emoji="🚀"
                    ghost="🚀"
                    title="Create Opportunity"
                    subtitle="Start a new Community Service opportunity or continue an unfinished draft."
                    badge="CREATE / CONTINUE"
                    background={MOCKUP_GRADIENTS.teal}
                />
                <MockupActionCard
                    href={BROWSE_HREF}
                    emoji="🔎"
                    ghost="🔎"
                    title="Browse Opportunities"
                    subtitle="Browse approved/live Community Service opportunities you can join."
                    badge="BROWSE"
                    background={MOCKUP_GRADIENTS.blue}
                />
                <MockupActionCard
                    href={WORKSPACE_HREF}
                    emoji="🛠️"
                    ghost="🛠️"
                    title="Community Service Workspace"
                    subtitle="Track Faculty → Partner → CIEL PK approvals, report progress, faculty decisions and revisions."
                    badge="TRACK YOUR WORK"
                    background={MOCKUP_GRADIENTS.orange}
                />
                <MockupActionCard
                    href={CS_IMPACT_HREF}
                    emoji="🏅"
                    ghost="🏅"
                    title="My Community Service Impact"
                    subtitle="Open approved impact flashcards with score, evidence, certificate, QR code, badges and rankings."
                    badge="VERIFIED IMPACT"
                    background={MOCKUP_GRADIENTS.green}
                />
                <MockupActionCard
                    href={PORTFOLIO_HREF}
                    emoji="🏆"
                    ghost="🏆"
                    title="My Impact Portfolio"
                    subtitle="View the permanent consolidated portfolio where every approved impact record is transferred automatically."
                    badge="MY PORTFOLIO"
                    background={MOCKUP_GRADIENTS.navy}
                />
                <MockupActionCard
                    href={GUIDE_HREF}
                    emoji="📖"
                    ghost="📖"
                    title="Report Guidance — Section by Section"
                    subtitle="Get detailed guidance, examples, evidence requirements and checks for all 9 report sections."
                    badge="OPEN GUIDANCE"
                    background={MOCKUP_GRADIENTS.purple}
                    full
                />
            </div>

            <p className="mt-4 text-center text-[11px] text-[#7a919a]">
                Already in a project?{" "}
                <Link href={LOG_HOURS_HREF} className="font-extrabold text-[#0e7d74] hover:underline">
                    Log hours
                </Link>
                {" · "}
                <Link href={BROWSE_HREF} className="font-extrabold text-[#0e7d74] hover:underline">
                    Browse opportunities
                </Link>
                {" · "}
                <Link href={CREATE_VIEW} className="font-extrabold text-[#0e7d74] hover:underline">
                    Create opportunity
                </Link>
            </p>

            <button
                type="button"
                onClick={() => setHelpOpen(true)}
                title="How community service works"
                className="fixed bottom-[88px] right-5 z-50 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[linear-gradient(135deg,#0e5f63,#12a5a0)] text-[21px] text-white shadow-[0_10px_26px_rgba(14,125,116,0.35)] transition hover:scale-105 lg:bottom-6"
            >
                ❓
            </button>

            {helpOpen ? (
                <div
                    className="fixed inset-0 z-[100] overflow-auto bg-[rgba(4,37,43,0.55)] p-5"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setHelpOpen(false);
                    }}
                >
                    <div className="mx-auto mt-6 w-full max-w-[520px] overflow-hidden rounded-[22px] bg-white">
                        <div className="flex items-center gap-2.5 bg-[linear-gradient(115deg,#04252b,#0e5f63_60%,#12a5a0_120%)] px-5 py-4 text-white">
                            <span className="text-lg">🗺️</span>
                            <b className="text-[13.5px]">How Community Service works</b>
                            <button
                                type="button"
                                onClick={() => setHelpOpen(false)}
                                className="ml-auto h-7 w-7 rounded-full bg-white/20 text-[13px] text-white"
                                aria-label="Close"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="space-y-3 px-5 py-4">
                            <p className="rounded-[11px] bg-[#e3f4fa] px-3.5 py-2.5 text-[11.5px] leading-relaxed text-[#0f5e57]">
                                <b>Create</b> your own opportunity or <b>browse</b> and join one → do the work, logging hours as you go →
                                fill the 9 report sections → faculty approves → it hangs on your Impact Wall.
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1">
                                <Link href={CREATE_VIEW} className="rounded-full bg-[#0e7d74] px-4 py-2 text-[11px] font-extrabold text-white">
                                    Create opportunity
                                </Link>
                                <Link href={BROWSE_HREF} className="rounded-full bg-[#e6f6f4] px-4 py-2 text-[11px] font-extrabold text-[#0e7d74]">
                                    Browse opportunities
                                </Link>
                            </div>
                            {name ? <p className="text-[10px] text-[#7a919a]">Hi {name} — drafts save automatically.</p> : null}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export function CommunityCreateOpportunityView({
    projects,
    verifiedHours,
    wallCount,
    completion,
}: {
    projects: ActiveProject[];
    verifiedHours: number;
    wallCount: number;
    completion: number;
}) {
    return (
        <div className="mx-auto max-w-[1500px] pb-16">
            <MockupHero
                title="Community Service"
                subtitle="Create opportunities, save drafts, follow Faculty → Partner → CIEL PK approvals, complete your 9-section report and build a verified Community Service impact record."
                stats={[
                    { value: String(projects.length), label: "Active Records" },
                    { value: verifiedHours ? `${Math.round(verifiedHours)}h` : "0h", label: "Verified Service" },
                    { value: String(wallCount), label: "Impact Portfolio" },
                ]}
                rightStat={{ value: `${completion}%`, label: "overall current-work completion" }}
            />
            <MockupSectionHead
                title="Create Opportunity"
                subtitle="Start a new opportunity or continue a saved draft. Drafts remain here until submission."
                action={
                    <Link href={HUB} className="border-0 bg-transparent text-xs font-black text-[#087c75] hover:underline">
                        ← Back to module buttons
                    </Link>
                }
            />
            <DraftsLandingView embedded />
        </div>
    );
}
