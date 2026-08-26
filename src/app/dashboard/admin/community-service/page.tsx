"use client";

import { useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { CommunityCrumb, CommunityHero, HubBackButton, HubTile } from "@/components/ciel/community-service/CommunityServiceHubChrome";
import CommunityAwardPanel from "@/components/ciel/community-service/CommunityAwardPanel";
import CommunityAwardAnalytics from "@/components/ciel/community-service/CommunityAwardAnalytics";
import CommunityFlashCard from "@/components/ciel/community-service/CommunityFlashCard";
import CommunityQueueCard from "@/components/ciel/community-service/CommunityQueueCard";
import {
    mapCommunityPipelineRow,
    mergeCommunityLiveDeck,
    type CommunityAwardCard,
    type CommunityPipelineRow,
} from "@/utils/communityAwardModel";
import { isAdminCommunityLiveCard, isAdminCommunityWaiting } from "@/utils/reviewQueue";

type View = "home" | "pending" | "approved" | "run" | "analytics" | "hec";

function pipelineCta(r: CommunityPipelineRow) {
    const st = String(r.status || "").toLowerCase();
    const fac = String(r.faculty_status || "").toLowerCase();
    if (st === "draft") return "Draft →";
    if (fac === "approved") return "Approved →";
    if (st === "submitted" || st.includes("pending")) return "Open report →";
    return "Open report →";
}

export default function AdminCommunityServicePage() {
    const [view, setView] = useState<View>("home");
    const [cards, setCards] = useState<CommunityAwardCard[]>([]);
    const [pipeline, setPipeline] = useState<CommunityPipelineRow[]>([]);
    const [oppCount, setOppCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            authenticatedFetch("/api/v1/admin/community-service/award-cards", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
            authenticatedFetch("/api/v1/admin/reports?limit=200", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
            authenticatedFetch("/api/v1/admin/projects", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
        ])
            .then(([award, reports, projects]) => {
                if (cancelled) return;
                setCards(Array.isArray(award?.data) ? award.data : []);
                setPipeline(
                    (Array.isArray(reports?.data) ? reports.data : [])
                        .filter((item: unknown) => item && typeof item === "object")
                        .map((item: Record<string, unknown>) => mapCommunityPipelineRow(item))
                        .filter((r: CommunityPipelineRow | null): r is CommunityPipelineRow => Boolean(r?.id)),
                );
                const plist = Array.isArray(projects?.data) ? projects.data : Array.isArray(projects) ? projects : [];
                setOppCount(plist.length);
                setLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setCards([]);
                setPipeline([]);
                setOppCount(0);
                setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const liveRows = useMemo(() => pipeline.filter((r) => isAdminCommunityLiveCard(r)), [pipeline]);
    const inPipe = useMemo(() => pipeline.filter((r) => isAdminCommunityWaiting(r)), [pipeline]);
    const deckCards = useMemo(
        () => mergeCommunityLiveDeck(cards, liveRows, isAdminCommunityLiveCard),
        [cards, liveRows],
    );
    const hours = deckCards.reduce((s, c) => s + (c.hours || 0), 0);
    const unis = new Set(deckCards.map((c) => c.university)).size;
    const reportHref = (id: string) => `/dashboard/admin/reports/verify/${id}`;

    return (
        <div className="mx-auto max-w-[1040px] px-4 py-6 sm:px-6">
            <CommunityCrumb role="CIEL PK" view={view === "home" ? undefined : view} />
            {view === "home" ? (
                <CommunityHero
                    kicker="CIEL PK · COMMUNITY SERVICE · MASTER"
                    title="CIEL PK — The Master File 🌍"
                    subtitle="National pipeline, live flash cards, and the CIEL PK Medal — same rubric as faculty and universities."
                    gradient="linear-gradient(115deg,#04252b,#0e5f63 55%,#12a5a0 130%)"
                    stats={[
                        { value: String(inPipe.length), label: "IN THE PIPELINE" },
                        { value: String(deckCards.length), label: "APPROVED CARDS" },
                        { value: String(oppCount), label: "LIVE OPPORTUNITIES" },
                        { value: `${hours}h`, label: "NATIONAL HOURS" },
                    ]}
                />
            ) : (
                <div className="mt-4">
                    <HubBackButton onClick={() => setView("home")} label="← Back to Community service" />
                </div>
            )}

            {view === "home" && (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <HubTile
                        href="/dashboard/admin/projects"
                        badge="NATIONAL"
                        badgeClass="text-[#0e7d74]"
                        emoji="🚀"
                        title="Create an Opportunity"
                        subtitle="National campaigns live under All projects — existing create/approval flow is unchanged."
                        background="linear-gradient(135deg,#0e7d74,#2dd4bf)"
                    />
                    <HubTile
                        onClick={() => setView("pending")}
                        badge={`${inPipe.length} IN PIPELINE`}
                        badgeClass="text-[#b45309]"
                        emoji="🗂️"
                        title="Waiting for Approval — Status Board"
                        subtitle="In-progress reports only. Live cards stay on the national vault."
                        background="linear-gradient(135deg,#b45309,#fbbf24)"
                    />
                    <HubTile
                        onClick={() => setView("approved")}
                        badge={`${deckCards.length} CARDS`}
                        badgeClass="text-[#04252b]"
                        emoji="⭐"
                        title="Approved Opportunities"
                        subtitle="The national vault — every live faculty card in Pakistan."
                        background="linear-gradient(135deg,#04252b,#0e7d74)"
                    />
                    <HubTile
                        href="/dashboard/admin/projects"
                        badge={`${oppCount} OPEN`}
                        badgeClass="text-[#0369a1]"
                        emoji="📣"
                        title="Live Opportunities"
                        subtitle="Everything currently open for enrolment, nationwide."
                        background="linear-gradient(135deg,#0369a1,#38bdf8)"
                    />
                    <HubTile
                        onClick={() => setView("run")}
                        badge="HIGHEST BADGE"
                        badgeClass="text-[#6d28d9]"
                        emoji="🏆"
                        title="Run the AI Award Model"
                        subtitle="Same criteria, national scope — grant the CIEL PK Medal."
                        background="linear-gradient(135deg,#6d28d9,#a78bfa)"
                    />
                    <HubTile
                        onClick={() => setView("analytics")}
                        badge="MASTER"
                        badgeClass="text-[#9f1239]"
                        emoji="📊"
                        title="Analytics"
                        subtitle="The national picture — comparable because the rubric never changes."
                        background="linear-gradient(135deg,#9f1239,#fb7185)"
                    />
                    <HubTile
                        onClick={() => setView("hec")}
                        badge="READ-ONLY"
                        badgeClass="text-[#04252b]"
                        emoji="🇵🇰"
                        title="HEC / Government lens"
                        subtitle="Flash cards and analytics only — no award run, no edits."
                        background="linear-gradient(135deg,#04252b,#0e7d74)"
                        className="sm:col-span-2 lg:col-span-1"
                    />
                </div>
            )}

            {view === "pending" && (
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">National status board</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Draft → submitted → partner/admin → faculty. Open the existing report to act — this board does not
                        change that flow.
                    </p>
                    {loading ? (
                        <p className="mt-4 text-sm text-slate-500">Loading…</p>
                    ) : inPipe.length === 0 ? (
                        <p className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-6 text-sm text-emerald-800">
                            Nothing waiting — live cards are under Approved Opportunities.
                        </p>
                    ) : (
                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                            {inPipe.map((r) => (
                                <CommunityQueueCard
                                    key={r.id}
                                    href={reportHref(r.id)}
                                    title={r.project_title || "Report"}
                                    student={r.student_name || "Student"}
                                    org={r.organization_name}
                                    hours={r.hours}
                                    cta={pipelineCta(r)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {(view === "approved" || view === "hec") && (
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                        {view === "hec" ? "HEC / Government lens" : "Approved Opportunities"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        {view === "hec"
                            ? "Read-only view of the same live cards — one standard rubric, no new login role."
                            : "Every live flash card nationwide. Open a card to use the existing verify screen."}
                    </p>
                    {loading ? (
                        <p className="mt-4 text-sm text-slate-500">Loading…</p>
                    ) : deckCards.length === 0 ? (
                        <p className="mt-4 text-sm text-slate-500">No live cards yet.</p>
                    ) : (
                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                            {deckCards.map((c) => (
                                <CommunityFlashCard
                                    key={c.id}
                                    card={c}
                                    href={view === "hec" ? undefined : reportHref(c.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {view === "run" && (
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Run the AI Award Model</h2>
                    <p className="mt-1 mb-4 text-sm text-slate-500">
                        Rank the national live deck and grant the CIEL PK Medal. Notifications still use the existing award
                        endpoint.
                    </p>
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading…</p>
                    ) : deckCards.length === 0 ? (
                        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
                            No live cards to rank yet.
                        </p>
                    ) : (
                        <CommunityAwardPanel
                            cards={deckCards}
                            kind="ciel"
                            scopeName="CIEL PK"
                            notifyEndpoint="/api/v1/admin/community-service/award-notify"
                            filters={{ university: true, department: true, org: true, faculty: true }}
                        />
                    )}
                </div>
            )}

            {view === "analytics" && (
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold text-slate-900">Analytics</h2>
                    <p className="text-sm text-slate-500">
                        {unis} universities · PKR {(hours * 500).toLocaleString()} community dividend
                    </p>
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading…</p>
                    ) : (
                        <CommunityAwardAnalytics cards={deckCards} groupBy="university" />
                    )}
                    <a
                        href="/dashboard/admin/master-analytics"
                        className="inline-block text-[11px] font-semibold text-[#0e7d74] hover:underline"
                    >
                        Open CIEL Master analytics →
                    </a>
                </div>
            )}
        </div>
    );
}
