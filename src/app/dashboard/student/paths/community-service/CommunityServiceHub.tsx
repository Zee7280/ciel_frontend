"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { namedTimeGreeting } from "@/utils/timeGreeting";
import type { ActiveProject } from "@/app/dashboard/student/types";

const CREATE_HREF = "/dashboard/student/create-opportunity";
const BROWSE_HREF = "/dashboard/student/browse";
const PROJECTS_HREF = "/dashboard/student/paths/community-service?tab=engagements";
const LOG_HOURS_HREF = "/dashboard/student/paths/community-service?tab=log-hours";
const WALL_HREF = "/dashboard/student/paths/community-service?view=wall";
const GUIDE_HREF = "/dashboard/student/paths/community-service?view=guide";
const PORTFOLIO_HREF = "/dashboard/student/impact";

export default function CommunityServiceHub({
    projects,
    verifiedHours,
    wallCount,
}: {
    projects: ActiveProject[];
    verifiedHours: number;
    wallCount: number;
}) {
    const [name, setName] = useState("");
    const [helpOpen, setHelpOpen] = useState(false);

    useEffect(() => {
        const user = readStoredCurrentUser();
        setName(typeof user?.name === "string" ? user.name.split(" ")[0] : "");
    }, []);

    const hoursTarget = projects.reduce((max, p) => {
        const h = p.required_hours_per_student;
        return typeof h === "number" && h > max ? h : max;
    }, 0);
    const hoursLabel = hoursTarget > 0 ? `${Math.round(verifiedHours)} / ${hoursTarget}h` : `${Math.round(verifiedHours)}h`;
    const greeting = namedTimeGreeting(name);

    return (
        <div className="mx-auto max-w-[980px] pb-16">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7a919a]">
                Student Dashboard → <span className="text-[#0e7d74]">Community Service</span>
            </p>

            <div className="relative mt-4 overflow-hidden rounded-[26px] bg-[linear-gradient(115deg,#04252b,#0e5f63_55%,#12a5a0_110%)] px-7 py-6 text-white">
                <div className="pointer-events-none absolute right-2 top-2 text-[40px] tracking-[10px] opacity-[0.13]" aria-hidden>
                    🌍 🤝 🌱 ⭐
                </div>
                <p className="text-[9.5px] font-extrabold tracking-[0.22em] text-[#99f6e4]">MY PATHS · COMMUNITY SERVICE</p>
                <h1 className="mt-1.5 text-[23px] font-extrabold leading-tight">
                    {greeting} 🌍
                </h1>
                <p className="mt-1 max-w-[560px] text-xs leading-relaxed text-[#cdf5f0]">
                    Create opportunities, save drafts, follow Faculty → Partner → CIEL PK approvals, complete your
                    9-section report and build a verified Community Service record.
                </p>
                <div className="mt-3.5 flex flex-wrap gap-2.5">
                    <HubStat value={String(projects.length)} label="ACTIVE PROJECT" />
                    <HubStat value={hoursLabel} label="VERIFIED HOURS" />
                    <HubStat value={`🏅 ${wallCount}`} label="ON YOUR IMPACT WALL" />
                </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <HubTile
                    href={CREATE_HREF}
                    badge="CREATE / CONTINUE"
                    emoji="🚀"
                    title="Create Opportunity"
                    subtitle="Start a new Community Service opportunity or continue an unfinished draft."
                    background="linear-gradient(135deg,#15988b,#2ec8bd)"
                    badgeClass="text-[#0e7d74]"
                />
                <HubTile
                    href={PROJECTS_HREF}
                    badge="TRACK YOUR WORK"
                    emoji="🛠️"
                    title="Community Service Workspace"
                    subtitle="Track Faculty → Partner → CIEL PK approvals, report progress, faculty decisions and revisions."
                    background="linear-gradient(135deg,#c76000,#f59a00)"
                    badgeClass="text-[#b45309]"
                />
                <HubTile
                    href={WALL_HREF}
                    badge="VERIFIED IMPACT"
                    emoji="🏅"
                    title="My Community Service Impact"
                    subtitle="Open approved impact flashcards with score, evidence, certificate, QR code, badges and rankings."
                    background="linear-gradient(135deg,#0e4d4e,#117669)"
                    badgeClass="text-[#0e7d74]"
                />
                <HubTile
                    href={PORTFOLIO_HREF}
                    badge="MY PORTFOLIO"
                    emoji="🏆"
                    title="My Impact Portfolio"
                    subtitle="View the permanent consolidated portfolio where every approved impact record is transferred automatically."
                    background="linear-gradient(135deg,#183b56,#286786)"
                    badgeClass="text-[#183b56]"
                />
                <HubTile
                    href={GUIDE_HREF}
                    badge="OPEN GUIDANCE"
                    emoji="📖"
                    title="Report Guidance — Section by Section"
                    subtitle="Get detailed guidance, examples, evidence requirements and checks for all 9 report sections."
                    background="linear-gradient(135deg,#6b2bd9,#9f78ef)"
                    className="sm:col-span-2"
                    badgeClass="text-[#6d28d9]"
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
                <Link href={CREATE_HREF} className="font-extrabold text-[#0e7d74] hover:underline">
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

            {helpOpen && (
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
                            <p className="text-[8.5px] font-extrabold tracking-[0.13em] text-[#0891b2]">📋 THE JOURNEY</p>
                            <p className="rounded-[11px] bg-[#e3f4fa] px-3.5 py-2.5 text-[11.5px] leading-relaxed text-[#0f5e57]">
                                <b>Create</b> your own opportunity or <b>browse</b> and join one → do the work,{" "}
                                <b>logging hours inside My Projects</b> as you go → fill the <b>9 report sections plus flash card</b> →
                                your flash card goes to faculty, the <b>AI scores it</b>, faculty approves → it hangs on
                                your <b>Impact Wall</b> forever.
                            </p>
                            <p className="text-[8.5px] font-extrabold tracking-[0.13em] text-[#0e7d74]">✅ THE GOLDEN RULE</p>
                            <p className="rounded-[11px] border-l-[3px] border-[#0e7d74] bg-[#e6f6f4] px-3.5 py-2.5 text-[11.5px] italic leading-relaxed text-[#0f5e57]">
                                Honesty scores higher than perfection — numbers you can defend, photos as you go, limits named openly.
                            </p>
                            <p className="text-[8.5px] font-extrabold tracking-[0.13em] text-[#b45309]">💡 START NOW</p>
                            <p className="rounded-[11px] bg-[#fbf0d7] px-3.5 py-2.5 text-[11.5px] leading-relaxed text-[#8a5a06]">
                                {projects.length > 0
                                    ? `You have ${projects.length} active project${projects.length === 1 ? "" : "s"}. Open My Projects and log a session, or continue your report.`
                                    : "Create an opportunity or browse one that's already open — then log your first session."}
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1">
                                <Link
                                    href={CREATE_HREF}
                                    className="rounded-full bg-[#0e7d74] px-4 py-2 text-[11px] font-extrabold text-white"
                                >
                                    Create opportunity
                                </Link>
                                <Link
                                    href={BROWSE_HREF}
                                    className="rounded-full bg-[#e6f6f4] px-4 py-2 text-[11px] font-extrabold text-[#0e7d74]"
                                >
                                    Browse opportunities
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function HubStat({ value, label }: { value: string; label: string }) {
    return (
        <div className="rounded-[14px] border border-white/22 bg-white/10 px-4 py-2.5">
            <div className="text-[15px] font-extrabold">{value}</div>
            <div className="mt-0.5 text-[7px] font-extrabold tracking-[0.13em] text-[#a5e8de]">{label}</div>
        </div>
    );
}

function HubTile({
    href,
    badge,
    emoji,
    title,
    subtitle,
    background,
    className = "",
    badgeClass = "text-[#0d2b33]",
}: {
    href: string;
    badge: string;
    emoji: string;
    title: string;
    subtitle: string;
    background: string;
    className?: string;
    badgeClass?: string;
}) {
    return (
        <Link
            href={href}
            style={{ background }}
            className={`relative flex min-h-[140px] flex-col overflow-hidden rounded-[22px] p-5 text-left text-white shadow-sm transition duration-150 hover:-translate-y-1 hover:scale-[1.015] hover:shadow-[0_16px_36px_rgba(13,43,51,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0e7d74] focus-visible:ring-offset-2 ${className}`}
        >
            <span
                className={`absolute right-3.5 top-3 z-10 rounded-full bg-white px-2.5 py-1 text-[8px] font-extrabold tracking-wide shadow-sm ${badgeClass}`}
            >
                {badge}
            </span>
            <span className="text-[32px] leading-none">{emoji}</span>
            <span className="mt-2 pr-24 text-[15.5px] font-extrabold">{title}</span>
            <span className="mt-1 text-[10.5px] leading-relaxed opacity-85">{subtitle}</span>
            <span className="pointer-events-none absolute -bottom-5 -right-3 text-[80px] opacity-15" aria-hidden>
                {emoji}
            </span>
        </Link>
    );
}
