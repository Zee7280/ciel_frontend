"use client";

import { useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { CommunityCrumb, CommunityHero, HubBackButton, HubTile } from "@/components/ciel/community-service/CommunityServiceHubChrome";
import CommunityAwardPanel from "@/components/ciel/community-service/CommunityAwardPanel";
import CommunityAwardAnalytics from "@/components/ciel/community-service/CommunityAwardAnalytics";
import CommunityFlashCard from "@/components/ciel/community-service/CommunityFlashCard";
import type { CommunityAwardCard } from "@/utils/communityAwardModel";
import { readStoredCurrentUser } from "@/utils/currentUser";

type FacView = "home" | "pending" | "approved" | "run" | "analytics";

type FacultyReportRow = {
    id: string;
    student_name: string;
    project_title: string;
    organization_name?: string;
    faculty_status?: string;
    status?: string;
};

export default function FacultyCommunityServicePage() {
    const [view, setView] = useState<FacView>("home");
    const [rows, setRows] = useState<FacultyReportRow[]>([]);
    const [cards, setCards] = useState<CommunityAwardCard[]>([]);
    const [loading, setLoading] = useState(true);
    const name = (typeof readStoredCurrentUser()?.name === "string" ? String(readStoredCurrentUser()?.name).split(" ")[0] : "") || "there";

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            authenticatedFetch("/api/v1/faculty/reports", {}, { redirectToLogin: false }).then((r) => (r?.ok ? r.json() : null)),
            authenticatedFetch("/api/v1/faculty/community-service/award-cards", {}, { redirectToLogin: false }).then((r) => (r?.ok ? r.json() : null)),
        ]).then(([list, award]) => {
            if (cancelled) return;
            setRows(Array.isArray(list?.data) ? list.data : []);
            setCards(Array.isArray(award?.data) ? award.data : []);
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const pending = useMemo(
        () => rows.filter((r) => String(r.faculty_status || "").toLowerCase() !== "approved"),
        [rows],
    );
    const hours = cards.reduce((s, c) => s + (c.hours || 0), 0);

    return (
        <div className="mx-auto max-w-[1040px] px-4 py-6 sm:px-6">
            <CommunityCrumb role="Faculty" view={view === "home" ? undefined : view} />
            <CommunityHero
                kicker="FACULTY · COMMUNITY SERVICE"
                title={`Salaam, ${name} 🧑‍🏫`}
                subtitle="Supervise, approve once, and the card goes live everywhere. Your award run grants the Faculty Choice badge."
                gradient="linear-gradient(115deg,#3b1c00,#b45309 60%,#f59e0b 115%)"
                stats={[
                    { value: String(pending.length), label: "WAITING FOR YOU" },
                    { value: String(cards.length), label: "APPROVED & LIVE" },
                    { value: `${hours}h`, label: "COHORT HOURS" },
                ]}
            />

            {view !== "home" && <div className="mt-3"><HubBackButton onClick={() => setView("home")} label="← Back to Faculty dashboard" /></div>}

            {view === "home" && (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <HubTile href="/dashboard/faculty/create-opportunity" badge="FOR YOUR COHORT" emoji="🚀" title="Create an Opportunity" subtitle="Publish a supervised opportunity — students enrol with OTP team links." background="linear-gradient(135deg,#0e7d74,#2dd4bf)" />
                    <HubTile onClick={() => setView("pending")} badge={`${pending.length} IN QUEUE`} emoji="⏳" title="Waiting for Your Approval" subtitle="Completed reports queued for your one-time approval." background="linear-gradient(135deg,#b45309,#fbbf24)" />
                    <HubTile onClick={() => setView("approved")} badge={`${cards.length} LIVE`} emoji="✅" title="Approved Community Service" subtitle="Every card you approved — live on all dashboards." background="linear-gradient(135deg,#04252b,#0e7d74)" />
                    <HubTile onClick={() => setView("run")} badge="BADGE ISSUER" emoji="🏆" title="Run & Grant the Award Model" subtitle="Rank your cohort on the standard criteria — grant Faculty Choice." background="linear-gradient(135deg,#7c3aed,#c084fc)" />
                    <HubTile onClick={() => setView("analytics")} badge="LIVE" emoji="📊" title="Analytics" subtitle="Your cohort in numbers — hours, dividend, SDGs." background="linear-gradient(135deg,#0369a1,#38bdf8)" />
                </div>
            )}

            {view === "pending" && (
                <div className="mt-4 rounded-[17px] border border-[#dcebee] bg-white px-4 py-4">
                    <p className="text-[9px] font-extrabold tracking-[0.12em] text-[#0e7d74]">⏳ WAITING FOR YOUR APPROVAL</p>
                    <p className="mt-1 text-[9.5px] text-[#7a919a]">You approve the whole report once — that single click puts the flash card on every dashboard. Existing review screen is unchanged.</p>
                    {loading ? <p className="mt-4 text-sm text-slate-500">Loading…</p> : pending.length === 0 ? <p className="mt-4 text-sm text-slate-500">Nothing waiting.</p> : pending.map((r) => (
                        <a key={r.id} href={`/dashboard/faculty/reports/${r.id}`} className="mt-2 flex flex-wrap items-center gap-2 rounded-[14px] border border-[#dcebee] px-3.5 py-3 hover:border-[#0e7d74]">
                            <b className="text-[11px]">{r.project_title || "Report"}</b>
                            <span className="flex-1 text-[8.5px] text-[#7a919a]">{r.student_name} · {r.organization_name || "—"}</span>
                            <span className="rounded-full bg-[#fbf0d7] px-2.5 py-1 text-[7.5px] font-extrabold text-[#b45309]">⏳ AWAITING FACULTY</span>
                            <span className="rounded-full bg-[#e6f6f4] px-2.5 py-1 text-[7.5px] font-extrabold text-[#0e7d74]">OPEN FULL REPORT →</span>
                        </a>
                    ))}
                </div>
            )}

            {view === "approved" && (
                <div className="mt-4">
                    {cards.length === 0 ? <p className="text-sm text-slate-500">Approved cards appear here after you review them.</p> : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {cards.map((c) => <CommunityFlashCard key={c.id} card={c} />)}
                        </div>
                    )}
                </div>
            )}

            {view === "run" && (
                <div className="mt-4">
                    <CommunityAwardPanel cards={cards} kind="fac" scopeName="Your cohort" notifyEndpoint="/api/v1/faculty/community-service/award-notify" />
                </div>
            )}

            {view === "analytics" && (
                <div className="mt-4 space-y-3">
                    <CommunityAwardAnalytics cards={cards} groupBy="department" />
                    <a href="/dashboard/faculty/analytics" className="inline-block text-[11px] font-extrabold text-[#0e7d74] hover:underline">Open full faculty analytics →</a>
                </div>
            )}
        </div>
    );
}
