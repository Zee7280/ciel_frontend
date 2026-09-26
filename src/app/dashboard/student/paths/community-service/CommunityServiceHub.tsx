"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readStoredCurrentUser } from "@/utils/currentUser";
import type { ActiveProject } from "@/app/dashboard/student/types";
import { MOCKUP_GRADIENTS, MockupActionCard, MockupHero, MockupSectionHead } from "@/components/ciel/dashboard/MockupChrome";
import { CommunityCrumb, UserGuideBanner, ZoneRule } from "@/components/ciel/community-service/CommunityServiceHubChrome";

const HUB = "/dashboard/student/paths/community-service";
const CREATE_VIEW = `${HUB}?view=create`;
const BROWSE_HREF = "/dashboard/student/browse";
const WORKSPACE_HREF = `${HUB}?view=workspace`;
const LOG_HOURS_HREF = `${HUB}?tab=log-hours`;
const GUIDE_HREF = `${HUB}?view=guide`;
const CS_IMPACT_HREF = `${HUB}?view=wall`;
const RANKINGS_HREF = `${HUB}?view=rankings`;
const FILES_HREF = `${HUB}?view=files`;

export type CommunityServiceAttentionItem = {
    key: string;
    n: number;
    title: string;
    sub: string;
    href: string;
    urgent: boolean;
    tone?: "default" | "warn" | "bad";
};

const TONE_CLASS = {
    default: "text-[#0e4d4e]",
    warn: "text-[#9a6410]",
    bad: "text-[#b34c4c]",
} as const;

function AttentionRow({ items }: { items: CommunityServiceAttentionItem[] }) {
    return (
        <div className="mt-3.5 rounded-[20px] border border-[#dce6ea] bg-[#f7fafb] p-3">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
                {items.map((item) => (
                    <Link
                        key={item.key}
                        href={item.href}
                        className="flex items-center gap-3 rounded-2xl border border-[#dde5ea] bg-white px-4 py-3.5 shadow-[0_8px_22px_rgba(24,52,64,.04)] transition hover:-translate-y-0.5 hover:border-[#bcd4d8] hover:shadow-[0_8px_18px_rgba(23,49,57,.08)]"
                    >
                        <span className={`min-w-[36px] text-[26px] font-black leading-none ${TONE_CLASS[item.tone ?? "default"]}`}>
                            {item.n}
                        </span>
                        <span className="min-w-0">
                            <b className="block text-[13px] font-extrabold leading-snug text-[#16313d]">{item.title}</b>
                            <small className="mt-0.5 block text-[11.5px] leading-relaxed text-[#6b7c86]">{item.sub}</small>
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    );
}

export default function CommunityServiceHub({
    projects,
    verifiedHours,
    wallCount,
    completion,
    attention,
    displayName,
    bestCii,
    reportInProgress,
    recordCount,
    pendingApplications = 0,
}: {
    projects: ActiveProject[];
    verifiedHours: number;
    wallCount: number;
    completion: number;
    attention?: CommunityServiceAttentionItem[];
    displayName?: string;
    bestCii?: number | null;
    reportInProgress?: boolean;
    recordCount?: number;
    pendingApplications?: number;
}) {
    const [helpOpen, setHelpOpen] = useState(false);
    const [name, setName] = useState(displayName ?? "");

    useEffect(() => {
        if (displayName) {
            setName(displayName);
            return;
        }
        const user = readStoredCurrentUser();
        setName(typeof user?.name === "string" ? user.name.trim() : "");
    }, [displayName]);

    const firstName = name.split(/\s+/)[0] ?? "";
    const createHot = Boolean(attention?.some((item) => item.key === "oppAction" && item.n > 0));
    const workspaceHot = Boolean(attention?.find((item) => item.key === "reportAction")?.n);
    const browseHot = pendingApplications > 0;

    return (
        <div className="mx-auto min-w-0 max-w-[1500px] pb-16">
            <CommunityCrumb role="Student" />
            <MockupHero
                kicker={name ? `Community Service · ${name}` : "Community Service"}
                title="Your Community Service Hub 🏕️"
                subtitle="Create or apply, follow approvals, complete the work, submit the report and build verified impact — all inside this one area."
                stats={[
                    { value: String(recordCount ?? projects.length), label: "Community records" },
                    { value: verifiedHours ? `${Math.round(verifiedHours)}h` : "0h", label: "Verified service" },
                    { value: String(wallCount), label: "Verified impact" },
                    { value: bestCii != null ? String(bestCii) : "—", label: "Best CII" },
                ]}
                rightStat={
                    reportInProgress
                        ? { value: `${completion}%`, label: "current report completion" }
                        : { value: "🌱", label: "community service journey" }
                }
            />

            <div className="mb-1 mt-6">
                <h2 className="m-0 text-[21px] font-semibold text-[#16313d]">Community Service</h2>
                <p className="mt-1 text-[12.5px] text-[#70808a]">
                    One contained area. Proposal approval stays in Create Opportunity; applications stay in Browse; only approved work moves into Workspace.
                </p>
            </div>

            <UserGuideBanner
                desc="Everything for Community Service is grouped here. Choose the stage of your journey; Home stays an overview."
                rule="Create/Apply happens before Workspace; Workspace starts after approval."
            />

            <ZoneRule title="Where am I?">
                You entered Community Service from the left navigation. Everything below belongs to this impact area; Home remains a clean overview.
            </ZoneRule>

            {attention?.length ? <AttentionRow items={attention} /> : null}

            <MockupSectionHead title="Community Service tools" subtitle="Choose what you need to do next." />

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                <MockupActionCard
                    href={CREATE_VIEW}
                    emoji="🚀"
                    ghost="🚀"
                    title="Create Opportunity"
                    subtitle="Create your own proposal, save drafts, submit it, and track Faculty → Partner/NGO (if linked) → CIEL PK approval here until the final decision."
                    badge="PROPOSAL LOOP"
                    background={MOCKUP_GRADIENTS.teal}
                    hot={createHot}
                />
                <MockupActionCard
                    href={BROWSE_HREF}
                    emoji="🔎"
                    ghost="🔎"
                    title="Browse Opportunities"
                    subtitle="Discover published opportunities created by Faculty, NGOs, Partners and CIEL PK. Apply here; once participation is approved, the project moves to Workspace."
                    badge="DISCOVER + APPLY"
                    background={MOCKUP_GRADIENTS.blue}
                    hot={browseHot}
                />
                <MockupActionCard
                    href={WORKSPACE_HREF}
                    emoji="🛠️"
                    ghost="🛠️"
                    title="Community Service Workspace"
                    subtitle="Only approved engagements live here: Ready to Start → Report in Progress → Review → Revision → Completed."
                    badge="APPROVED WORK"
                    background={MOCKUP_GRADIENTS.orange}
                    hot={workspaceHot}
                />
                <MockupActionCard
                    href={GUIDE_HREF}
                    emoji="📄"
                    ghost="📄"
                    title="Report Guidance"
                    subtitle="A coach for the 9-section report — one section at a time, with strong examples, what to avoid and what helps your CII."
                    badge="GUIDE INSIDE"
                    background={MOCKUP_GRADIENTS.purple}
                />
                <MockupActionCard
                    href={CS_IMPACT_HREF}
                    emoji="🏅"
                    ghost="🏅"
                    title="My Impact Wall"
                    subtitle="Verified records after faculty approval: flashcard, badge, ranking + trend, CII, detailed report, PDF, certificate and QR."
                    badge="MY IMPACT"
                    background={MOCKUP_GRADIENTS.green}
                />
                <MockupActionCard
                    href={RANKINGS_HREF}
                    emoji="🧠"
                    ghost="🧠"
                    title="AI Analyzer & My Rankings"
                    subtitle="Run the AI Analyzer on your projects (dated badge + trend shared with faculty, partners, university and CIEL PK) and see official ranking snapshots."
                    badge="ANALYZE"
                    background={MOCKUP_GRADIENTS.navy}
                />
                <MockupActionCard
                    href={FILES_HREF}
                    emoji="📁"
                    ghost="📁"
                    title="Shared Analysis Files"
                    subtitle="Faculty Analysis files and AI Analyzer reports shared with every stakeholder on the record — same file, same version, every dashboard."
                    badge="SHARED"
                    background={MOCKUP_GRADIENTS.purple}
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
                    <div className="mx-auto mt-6 w-full max-w-[560px] overflow-hidden rounded-[22px] bg-white">
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
                        <div className="space-y-3 px-5 py-4 text-[12.5px] leading-relaxed text-[#3f5661]">
                            <p className="rounded-[11px] bg-[#e3f4fa] px-3.5 py-2.5 text-[11.5px] text-[#0f5e57]">
                                Everything for Community Service is grouped here. Create or apply first; Workspace starts only after approval. Home stays an overview.
                            </p>
                            <p>
                                <b>Create Opportunity</b> — your own proposal until Faculty → Partner/NGO (if linked) → CIEL PK decides.
                            </p>
                            <p>
                                <b>Browse</b> — published opportunities. A pending application stays here until participation is approved.
                            </p>
                            <p>
                                <b>Workspace</b> — approved work only: start the report, log hours, submit, revise, complete.
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1">
                                <Link href={CREATE_VIEW} className="rounded-full bg-[#0e7d74] px-4 py-2 text-[11px] font-extrabold text-white">
                                    Create opportunity
                                </Link>
                                <Link href={BROWSE_HREF} className="rounded-full bg-[#e6f6f4] px-4 py-2 text-[11px] font-extrabold text-[#0e7d74]">
                                    Browse opportunities
                                </Link>
                                <Link href={WORKSPACE_HREF} className="rounded-full bg-[#e6f6f4] px-4 py-2 text-[11px] font-extrabold text-[#0e7d74]">
                                    Open workspace
                                </Link>
                            </div>
                            {firstName ? <p className="text-[10px] text-[#7a919a]">Hi {firstName} — drafts save automatically.</p> : null}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
