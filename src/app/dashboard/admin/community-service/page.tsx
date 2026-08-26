"use client";

import { useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { CommunityCrumb, CommunityHero, HubBackButton, HubTile } from "@/components/ciel/community-service/CommunityServiceHubChrome";
import CommunityAwardPanel from "@/components/ciel/community-service/CommunityAwardPanel";
import CommunityAwardAnalytics from "@/components/ciel/community-service/CommunityAwardAnalytics";
import CommunityFlashCard from "@/components/ciel/community-service/CommunityFlashCard";
import type { CommunityAwardCard } from "@/utils/communityAwardModel";

type View = "home" | "pending" | "approved" | "live" | "run" | "analytics" | "hec";

type PipelineRow = {
    id: string;
    project_title?: string;
    student_name?: string;
    organization_name?: string;
    status?: string;
    faculty_status?: string;
    partner_status?: string;
    admin_status?: string;
};

function pipelineLabel(r: PipelineRow) {
    const st = String(r.status || "").toLowerCase();
    const fac = String(r.faculty_status || "").toLowerCase();
    if (st === "draft") return { cls: "bg-slate-100 text-slate-600", t: "📝 DRAFT" };
    if (fac === "approved") return { cls: "bg-[#e6f6f4] text-[#0e7d74]", t: "✅ APPROVED" };
    if (st === "submitted" || st.includes("pending")) return { cls: "bg-[#fbf0d7] text-[#b45309]", t: "⏳ IN PIPELINE" };
    return { cls: "bg-slate-100 text-slate-600", t: st.replace(/_/g, " ").toUpperCase() || "—" };
}

export default function AdminCommunityServicePage() {
    const [view, setView] = useState<View>("home");
    const [cards, setCards] = useState<CommunityAwardCard[]>([]);
    const [pipeline, setPipeline] = useState<PipelineRow[]>([]);
    const [oppCount, setOppCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            authenticatedFetch("/api/v1/admin/community-service/award-cards", {}, { redirectToLogin: false }).then((r) => (r?.ok ? r.json() : null)),
            authenticatedFetch("/api/v1/admin/reports?limit=100", {}, { redirectToLogin: false }).then((r) => (r?.ok ? r.json() : null)),
            authenticatedFetch("/api/v1/admin/projects", {}, { redirectToLogin: false }).then((r) => (r?.ok ? r.json() : null)),
        ]).then(([award, reports, projects]) => {
            if (cancelled) return;
            setCards(Array.isArray(award?.data) ? award.data : []);
            setPipeline(Array.isArray(reports?.data) ? reports.data : []);
            const plist = Array.isArray(projects?.data) ? projects.data : Array.isArray(projects) ? projects : [];
            setOppCount(plist.length);
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const hours = cards.reduce((s, c) => s + (c.hours || 0), 0);
    const unis = new Set(cards.map((c) => c.university)).size;
    const inPipe = useMemo(
        () => pipeline.filter((r) => String(r.faculty_status || "").toLowerCase() !== "approved"),
        [pipeline],
    );

    return (
        <div className="mx-auto max-w-[1040px] px-4 py-6 sm:px-6">
            <CommunityCrumb role="CIEL PK" view={view === "home" ? undefined : view} />
            <CommunityHero
                kicker="CIEL PK · COMMUNITY SERVICE · MASTER"
                title="CIEL PK — The Master File 🌍"
                subtitle="Every opportunity, every report status, every approved card in Pakistan. Your medal is the highest badge a wall can carry."
                gradient="linear-gradient(115deg,#04252b,#0e5f63 55%,#12a5a0 130%)"
                stats={[
                    { value: String(cards.length), label: "APPROVED CARDS" },
                    { value: String(inPipe.length), label: "IN THE PIPELINE" },
                    { value: String(oppCount), label: "LIVE OPPORTUNITIES" },
                    { value: `${hours}h`, label: "NATIONAL HOURS" },
                ]}
            />

            {view !== "home" && (
                <div className="mt-3">
                    <HubBackButton onClick={() => setView("home")} label="← Back to CIEL PK dashboard" />
                </div>
            )}

            {view === "home" && (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <HubTile href="/dashboard/admin/projects" badge="NATIONAL" emoji="🚀" title="Create an Opportunity" subtitle="National campaigns live under All projects — existing create/approval flow is unchanged." background="linear-gradient(135deg,#0e7d74,#2dd4bf)" />
                    <HubTile onClick={() => setView("pending")} badge={`${inPipe.length} IN PIPELINE`} emoji="🗂️" title="Waiting for Approval — Status Board" subtitle="Every in-progress report and exactly what stage it sits at." background="linear-gradient(135deg,#b45309,#fbbf24)" />
                    <HubTile onClick={() => setView("approved")} badge={`${cards.length} CARDS`} emoji="⭐" title="Approved Opportunities" subtitle="The national vault — every faculty-approved card in Pakistan." background="linear-gradient(135deg,#04252b,#0e7d74)" />
                    <HubTile href="/dashboard/admin/projects" badge={`${oppCount} OPEN`} emoji="📣" title="Live Opportunities" subtitle="Everything currently open for enrolment, nationwide." background="linear-gradient(135deg,#0369a1,#38bdf8)" />
                    <HubTile onClick={() => setView("run")} badge="HIGHEST BADGE" emoji="🏆" title="Run the AI Award Model" subtitle="Same criteria, national scope — grant the CIEL PK Medal." background="linear-gradient(135deg,#7c3aed,#c084fc)" />
                    <HubTile onClick={() => setView("analytics")} badge="MASTER" emoji="📊" title="Analytics" subtitle="The national picture — comparable because the rubric never changes." background="linear-gradient(135deg,#9f1239,#fb7185)" />
                    <HubTile onClick={() => setView("hec")} badge="READ-ONLY" emoji="🇵🇰" title="HEC / Government lens" subtitle="Flash cards and analytics only — no award run, no edits." background="linear-gradient(135deg,#04252b,#0e7d74)" className="sm:col-span-2 lg:col-span-1" />
                </div>
            )}

            {view === "pending" && (
                <div className="mt-4 rounded-[17px] border border-[#dcebee] bg-white px-4 py-4">
                    <p className="text-[9px] font-extrabold tracking-[0.12em] text-[#0e7d74]">🗂️ THE NATIONAL STATUS BOARD</p>
                    <p className="mt-1 text-[9.5px] text-[#7a919a]">Draft → submitted → partner/admin → faculty. Open the existing report to act — this board does not change that flow.</p>
                    {loading ? <p className="mt-3 text-sm text-slate-500">Loading…</p> : pipeline.length === 0 ? <p className="mt-3 text-sm text-slate-500">No reports yet.</p> : pipeline.map((r) => {
                        const st = pipelineLabel(r);
                        return (
                            <a key={r.id} href={`/dashboard/admin/reports/verify/${r.id}`} className="mt-2 flex flex-wrap items-center gap-2 rounded-[14px] border border-[#dcebee] px-3.5 py-3">
                                <b className="text-[11px]">{r.project_title || "Report"}</b>
                                <span className="flex-1 text-[8.5px] text-[#7a919a]">{r.student_name} · {r.organization_name || "—"}</span>
                                <span className={`rounded-full px-2.5 py-1 text-[7.5px] font-extrabold ${st.cls}`}>{st.t}</span>
                            </a>
                        );
                    })}
                </div>
            )}

            {(view === "approved" || view === "hec") && (
                <div className="mt-4">
                    {view === "hec" && (
                        <p className="mb-3 text-[10px] leading-relaxed text-[#7a919a]">
                            HEC / Government is a read-only lens on the same faculty-approved cards — one standard rubric, no new login role.
                        </p>
                    )}
                    {cards.length === 0 ? <p className="text-sm text-slate-500">No faculty-approved cards yet.</p> : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {cards.map((c) => <CommunityFlashCard key={c.id} card={c} />)}
                        </div>
                    )}
                </div>
            )}

            {view === "run" && (
                <div className="mt-4">
                    <CommunityAwardPanel
                        cards={cards}
                        kind="ciel"
                        scopeName="CIEL PK"
                        notifyEndpoint="/api/v1/admin/community-service/award-notify"
                        filters={{ university: true, department: true, org: true, faculty: true }}
                    />
                </div>
            )}

            {view === "analytics" && (
                <div className="mt-4 space-y-3">
                    <CommunityAwardAnalytics cards={cards} groupBy="university" />
                    <p className="text-[10px] text-[#7a919a]">{unis} universities · PKR {(hours * 500).toLocaleString()} community dividend</p>
                    <a href="/dashboard/admin/master-analytics" className="inline-block text-[11px] font-extrabold text-[#0e7d74] hover:underline">Open CIEL Master analytics →</a>
                </div>
            )}
        </div>
    );
}
