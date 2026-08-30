"use client";

import { useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import CommunityFlashCard from "@/components/ciel/community-service/CommunityFlashCard";
import CourseworkCard from "@/components/ciel/CourseworkCard";
import ThesisCard from "@/components/ciel/ThesisCard";
import {
    CourseworkCrumb,
    CourseworkHero,
    PathFilterBar,
    PathSectionHead,
} from "@/components/ciel/coursework/CourseworkHubChrome";
import { type CommunityAwardCard, reportRowToAwardCard } from "@/utils/communityAwardModel";
import { isFacultyApproved } from "@/utils/courseworkSectionReview";
import { isFacultyCommunityLiveCard } from "@/utils/reviewQueue";
import { isPathEntryApproved } from "@/utils/reviewQueue";
import { type MeritEntry } from "@/components/ciel/MeritModelPanel";
import { type FypMeritEntry } from "@/components/ciel/FypMeritPanel";

type WallTab = "all" | "community" | "coursework" | "fyp" | "startup";

type VentureRow = {
    id?: string;
    ventureName?: string | null;
    ideaInfo?: { sector?: string; pitch?: string } | null;
    student?: { name?: string } | null;
};

export default function FacultyImpactWallPage() {
    const [community, setCommunity] = useState<CommunityAwardCard[]>([]);
    const [coursework, setCoursework] = useState<MeritEntry[]>([]);
    const [fyp, setFyp] = useState<FypMeritEntry[]>([]);
    const [ventures, setVentures] = useState<VentureRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<WallTab>("all");

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            authenticatedFetch("/api/v1/faculty/community-service/award-cards", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
            authenticatedFetch("/api/v1/faculty/reports", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
            authenticatedFetch("/api/v1/paths/course-projects/supervised", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
            authenticatedFetch("/api/v1/paths/fyp-thesis/supervised", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
            authenticatedFetch("/api/v1/paths/startup-business/supervised", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
        ])
            .then(([award, reports, courses, theses, startups]) => {
                if (cancelled) return;
                const awardCards: CommunityAwardCard[] = Array.isArray(award?.data) ? award.data : [];
                const reportRows = (Array.isArray(reports?.data) ? reports.data : [])
                    .filter((item: unknown) => item && typeof item === "object")
                    .map((item: Record<string, unknown>) => ({
                        id: String(item.id || ""),
                        student_name: String(item.student_name || item.studentName || "Student"),
                        project_title: String(item.project_title || item.projectTitle || "Report"),
                        organization_name: typeof item.organization_name === "string" ? item.organization_name : undefined,
                        faculty_status: typeof item.faculty_status === "string" ? item.faculty_status : undefined,
                        status: typeof item.status === "string" ? item.status : undefined,
                        hours: Number((item.metrics as { total_verified_hours?: number } | undefined)?.total_verified_hours || item.hours || 0),
                    }))
                    .filter((r: { id: string }) => r.id);
                const live = reportRows.filter((r: { faculty_status?: string; status?: string }) => isFacultyCommunityLiveCard(r));
                const byId = new Map<string, CommunityAwardCard>();
                for (const card of awardCards) {
                    if (isFacultyCommunityLiveCard(card) || live.some((r: { id: string }) => r.id === card.id)) {
                        byId.set(card.id, card);
                    }
                }
                for (const row of live) {
                    if (!byId.has(row.id)) byId.set(row.id, reportRowToAwardCard(row));
                }
                setCommunity(Array.from(byId.values()));
                setCoursework((Array.isArray(courses?.data) ? courses.data : []).filter(isFacultyApproved));
                setFyp((Array.isArray(theses?.data) ? theses.data : []).filter(isPathEntryApproved));
                setVentures((Array.isArray(startups?.data) ? startups.data : []).filter(isPathEntryApproved));
                setLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setCommunity([]);
                setCoursework([]);
                setFyp([]);
                setVentures([]);
                setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const total = community.length + coursework.length + fyp.length + ventures.length;
    const filters = ["All Impact", "Community Service", "Coursework", "FYP / Thesis", "Startup / Business"];
    const filterToTab: Record<string, WallTab> = {
        "All Impact": "all",
        "Community Service": "community",
        Coursework: "coursework",
        "FYP / Thesis": "fyp",
        "Startup / Business": "startup",
    };
    const tabToFilter: Record<WallTab, string> = {
        all: "All Impact",
        community: "Community Service",
        coursework: "Coursework",
        fyp: "FYP / Thesis",
        startup: "Startup / Business",
    };

    const showCommunity = tab === "all" || tab === "community";
    const showCoursework = tab === "all" || tab === "coursework";
    const showFyp = tab === "all" || tab === "fyp";
    const showStartup = tab === "all" || tab === "startup";
    const empty = useMemo(() => {
        const n =
            (showCommunity ? community.length : 0) +
            (showCoursework ? coursework.length : 0) +
            (showFyp ? fyp.length : 0) +
            (showStartup ? ventures.length : 0);
        return n === 0;
    }, [showCommunity, showCoursework, showFyp, showStartup, community, coursework, fyp, ventures]);

    return (
        <div className="mx-auto max-w-[1240px]">
            <CourseworkCrumb role="Faculty" pathLabel="My Impact Wall" />
            <CourseworkHero
                kicker="UNIFIED FACULTY IMPACT PORTFOLIO"
                title="My Impact Wall 🏅"
                subtitle="One faculty-level impact wall combining every verified project you supervise or approve across all four pathways."
                stats={[
                    { value: String(total), label: "Total Verified Records" },
                    { value: String(coursework.length + fyp.length), label: "Academic Records" },
                    { value: String(community.length + ventures.length), label: "Service & Ventures" },
                ]}
            />

            <PathSectionHead
                title="Faculty Impact Wall"
                subtitle="Filter your approved impact by pathway. The underlying flashcard remains one verified record across stakeholder dashboards."
                pill="ALL VERIFIED IMPACT"
            />
            <PathFilterBar
                filters={filters}
                active={tabToFilter[tab]}
                onChange={(filter) => setTab(filterToTab[filter] ?? "all")}
            />

            {loading ? (
                <p className="mt-4 text-sm text-[#71828e]">Loading verified records…</p>
            ) : empty ? (
                <p className="rounded-[20px] border border-[#dce6ea] bg-white px-5 py-10 text-sm text-[#71828e]">
                    Approved records appear here after you sign them off in each path.
                </p>
            ) : (
                <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
                    {showCommunity &&
                        community.map((card) => (
                            <CommunityFlashCard key={`c-${card.id}`} card={card} href={`/dashboard/faculty/reports/${card.id}`} />
                        ))}
                    {showCoursework &&
                        coursework.map((entry) => (
                            <CourseworkCard key={`cw-${entry.id}`} entry={entry} studentName={entry.student?.name} />
                        ))}
                    {showFyp &&
                        fyp.map((entry) => (
                            <ThesisCard key={`fyp-${entry.id}`} entry={entry} studentName={entry.student?.name} />
                        ))}
                    {showStartup &&
                        ventures.map((entry) => (
                            <article
                                key={`st-${entry.id || entry.ventureName}`}
                                className="rounded-[20px] border border-[#dce6ea] bg-white p-[17px] shadow-[0_10px_24px_rgba(18,48,65,.05)]"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <span className="text-[9px] font-black uppercase text-[#71828e]">Startup / Business</span>
                                    <span className="rounded-full bg-[#e8f8f1] px-2 py-1 text-[9px] font-black text-[#0a7f5a]">✓ Verified</span>
                                </div>
                                <h4 className="mt-3 text-[15px] font-semibold text-[#183140]">{entry.ventureName || "Untitled venture"}</h4>
                                <p className="mt-1.5 text-[11px] leading-relaxed text-[#71828e]">
                                    {entry.ideaInfo?.pitch || entry.student?.name || "Verified student venture."}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {entry.ideaInfo?.sector ? (
                                        <span className="rounded-full border border-[#e4eaee] bg-[#f3f6f8] px-2 py-1 text-[9px]">{entry.ideaInfo.sector}</span>
                                    ) : null}
                                    <span className="rounded-full border border-[#e4eaee] bg-[#f3f6f8] px-2 py-1 text-[9px]">
                                        {entry.student?.name || "Student"}
                                    </span>
                                </div>
                            </article>
                        ))}
                </div>
            )}

            <div className="mt-4 rounded-[15px] border border-[#d5eee8] bg-[#eef8f6] px-4 py-3.5 text-[11px] text-[#4b6f68]">
                <b>Unified Impact Wall rule:</b> once any project is faculty-approved and verified, its flashcard appears here
                and synchronizes to the relevant Student, University, CIEL PK and authorized HEC / UN Impact Walls.
            </div>
        </div>
    );
}
