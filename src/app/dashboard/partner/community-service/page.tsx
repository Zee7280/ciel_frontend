"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { CommunityCrumb, CommunityHero, HubBackButton } from "@/components/ciel/community-service/CommunityServiceHubChrome";
import { ActionKpiGrid, PathSectionHead, WorkflowSteps, useFacultyHubView } from "@/components/ciel/coursework/CourseworkHubChrome";
import { MOCKUP_GRADIENTS, MockupActionCard } from "@/components/ciel/dashboard/MockupChrome";
import CommunityAwardPanel from "@/components/ciel/community-service/CommunityAwardPanel";
import CommunityAwardAnalytics from "@/components/ciel/community-service/CommunityAwardAnalytics";
import CommunityFlashCard from "@/components/ciel/community-service/CommunityFlashCard";
import CommunityQueueCard from "@/components/ciel/community-service/CommunityQueueCard";
import StudentCommunityGuide from "@/components/report/StudentCommunityGuide";
import UniversityCommunityServiceHub from "./UniversityCommunityServiceHub";
import {
    mapCommunityPipelineRow,
    mergeCommunityLiveDeck,
    type CommunityAwardCard,
    type CommunityPipelineRow,
} from "@/utils/communityAwardModel";
import { getStoredCurrentUserId, readStoredCurrentUser } from "@/utils/currentUser";
import { isFacultyCommunityLiveCard, isFacultyCommunityWaiting } from "@/utils/reviewQueue";
import { isOpportunityPubliclyLive, resolveStudentOpportunityWorkflow } from "@/utils/opportunityWorkflow";

const CS_VIEWS = ["home", "pending", "approved", "run", "analytics", "guide"] as const;
const CS_BASE = "/dashboard/partner/community-service";
const PARTNER_HERO = "linear-gradient(120deg,#073a42,#118d84)";

function lower(value: unknown): string {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}

function isOwnedByCurrentPartner(record: Record<string, unknown>, currentUserId: string) {
    if (lower(record.created_by_role ?? record.creator_role) === "partner") return true;
    const creatorId = record.creatorId ?? record.creator_id ?? record.created_by ?? record.owner_id;
    return Boolean(currentUserId && creatorId != null && String(creatorId).trim() === currentUserId);
}

function isUniversityAccount(user: { orgType?: string; organization_type?: string; type?: string } | null) {
    return String(user?.orgType || user?.organization_type || user?.type || "")
        .toLowerCase()
        .includes("university");
}

export default function PartnerCommunityServicePage() {
    return (
        <Suspense fallback={<div className="mx-auto max-w-[1240px] py-16 text-center text-sm text-[#71828e]">Loading community service…</div>}>
            <CommunityServiceRoleSwitch />
        </Suspense>
    );
}

function CommunityServiceRoleSwitch() {
    const [ready, setReady] = useState(false);
    const [isUni, setIsUni] = useState(false);

    useEffect(() => {
        const user = readStoredCurrentUser() as { orgType?: string; organization_type?: string; type?: string } | null;
        setIsUni(isUniversityAccount(user));
        setReady(true);
    }, []);

    if (!ready) {
        return <div className="mx-auto max-w-[1240px] py-16 text-center text-sm text-[#71828e]">Loading community service…</div>;
    }
    return isUni ? <UniversityCommunityServiceHub /> : <PartnerCommunityServiceHub />;
}

function PartnerCommunityServiceHub() {
    const { view, homeHref } = useFacultyHubView(CS_VIEWS, "home");
    const user = readStoredCurrentUser() as { name?: string; orgName?: string } | null;
    const orgName =
        (typeof user?.orgName === "string" && user.orgName) ||
        (typeof user?.name === "string" ? user.name : "Partner");
    const [cards, setCards] = useState<CommunityAwardCard[]>([]);
    const [pipeline, setPipeline] = useState<CommunityPipelineRow[]>([]);
    const [pendingReviewCount, setPendingReviewCount] = useState(0);
    const [liveOpportunityCount, setLiveOpportunityCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            authenticatedFetch("/api/v1/partners/community-service/award-cards", {}, { redirectToLogin: false }).then(
                (r) => (r?.ok ? r.json() : null),
            ),
            authenticatedFetch("/api/v1/opportunities?partner_id=me", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
            authenticatedFetch("/api/v1/partner/reports?limit=200", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
        ])
            .then(([award, list, reports]) => {
                if (cancelled) return;
                setCards(Array.isArray(award?.data) ? award.data : []);
                setPipeline(
                    (Array.isArray(reports?.data) ? reports.data : [])
                        .filter((item: unknown) => item && typeof item === "object")
                        .map((item: Record<string, unknown>) => mapCommunityPipelineRow(item))
                        .filter((r: CommunityPipelineRow | null): r is CommunityPipelineRow => Boolean(r?.id)),
                );
                const rawList: unknown[] = Array.isArray(list?.data) ? list.data : [];
                const rows = rawList.filter(
                    (item): item is Record<string, unknown> => Boolean(item && typeof item === "object"),
                );
                const currentUserId = getStoredCurrentUserId();
                setLiveOpportunityCount(rows.filter((row) => isOpportunityPubliclyLive(row)).length);
                setPendingReviewCount(
                    rows.filter((row) => {
                        if (isOwnedByCurrentPartner(row, currentUserId)) return false;
                        return resolveStudentOpportunityWorkflow(row).stage === "pending_partner";
                    }).length,
                );
                setLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setCards([]);
                setPipeline([]);
                setLiveOpportunityCount(0);
                setPendingReviewCount(0);
                setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const liveRows = useMemo(() => pipeline.filter((r) => isFacultyCommunityLiveCard(r)), [pipeline]);
    const waiting = useMemo(() => pipeline.filter((r) => isFacultyCommunityWaiting(r)), [pipeline]);
    const deckCards = useMemo(
        () => mergeCommunityLiveDeck(cards, liveRows, isFacultyCommunityLiveCard),
        [cards, liveRows],
    );
    const hours = deckCards.reduce((s, c) => s + (c.hours || 0), 0);
    const analyticsHref = "/dashboard/partner/analytics";

    return (
        <div className="mx-auto max-w-[1500px]">
            <CommunityCrumb role="Partner" view={view === "home" ? undefined : view} />

            {view === "home" ? (
                <CommunityHero
                    kicker="CIEL PK · PARTNER"
                    title="Community Service"
                    subtitle="Create opportunities, approve partner-linked student projects and showcase verified community impact."
                    gradient={PARTNER_HERO}
                    stats={[
                        { value: String(pendingReviewCount), label: "Pending Reviews" },
                        { value: String(liveOpportunityCount), label: "Live Opportunities" },
                        { value: String(deckCards.length), label: "Impact Records" },
                        { value: "3", label: "AI Runs / Year" },
                    ]}
                />
            ) : (
                <div className="mt-4">
                    <HubBackButton href={homeHref} label="← Back to Community Service buttons" />
                </div>
            )}

            {view === "guide" && <StudentCommunityGuide showHero />}

            {view === "home" && (
                <>
                    <PathSectionHead
                        title="Community Service Workspace"
                        subtitle="Choose a function below. Each card opens the existing partner tool for that step."
                        pill="PARTNER VIEW"
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <MockupActionCard
                            href="/dashboard/partner/requests/new"
                            emoji="🚀"
                            ghost="🚀"
                            title="Create Opportunity"
                            subtitle="Create a Partner Organization Community Service opportunity or continue a draft."
                            badge="CREATE"
                            background={MOCKUP_GRADIENTS.teal}
                        />
                        <MockupActionCard
                            href="/dashboard/partner/requests"
                            emoji="🔎"
                            ghost="🔎"
                            title="Browse Opportunities"
                            subtitle="Browse approved/live Community Service opportunities associated with your organization."
                            badge="BROWSE"
                            background={MOCKUP_GRADIENTS.blue}
                        />
                        <MockupActionCard
                            href="/dashboard/partner/verify"
                            emoji="✅"
                            ghost="✅"
                            title="Opportunity Reviews"
                            subtitle="Review flashcards where your organization is an approval-required external stakeholder."
                            badge={pendingReviewCount ? `${pendingReviewCount} ACTION` : "ACTION"}
                            background={MOCKUP_GRADIENTS.orange}
                        />
                        <MockupActionCard
                            href="/dashboard/partner/reports"
                            emoji="📈"
                            ghost="📈"
                            title="Community Service Progress"
                            subtitle="Monitor report start, section progress and completion for connected projects."
                            badge="TRACK"
                            background="linear-gradient(135deg,#2f6b78,#4aa0a2)"
                        />
                        <MockupActionCard
                            href="/dashboard/partner/reports?status=Submitted"
                            emoji="📝"
                            ghost="📝"
                            title="Submitted Reports"
                            subtitle="Monitor reports submitted to Faculty for approval; view status only."
                            badge="REPORTS"
                            background={MOCKUP_GRADIENTS.navy}
                        />
                        <MockupActionCard
                            href="/dashboard/partner/requests?tab=live"
                            emoji="🌿"
                            ghost="🌿"
                            title="Approved Opportunities"
                            subtitle="View fully approved opportunities associated with your organization."
                            badge="LIVE"
                            background={MOCKUP_GRADIENTS.green}
                        />
                        <MockupActionCard
                            href={`${CS_BASE}?view=guide`}
                            emoji="📖"
                            ghost="📖"
                            title="Report Guidance"
                            subtitle="Understand report sections, evidence requirements and verification expectations."
                            badge="GUIDANCE"
                            background={MOCKUP_GRADIENTS.purple}
                        />
                        <MockupActionCard
                            href="/dashboard/partner/impact"
                            emoji="🏆"
                            ghost="🏆"
                            title="My Impact Wall"
                            subtitle="Verified flashcards, reports, authorized evidence, score, certificate and ranking badges."
                            badge="IMPACT"
                            background={MOCKUP_GRADIENTS.gold}
                        />
                        <MockupActionCard
                            href={`${CS_BASE}?view=run`}
                            emoji="🧠"
                            ghost="🧠"
                            title="AI Rankings"
                            subtitle="Preview freely; run three formal organization cohort rankings per year."
                            badge="3 RUNS"
                            background={MOCKUP_GRADIENTS.pink}
                        />
                        <MockupActionCard
                            href={analyticsHref}
                            emoji="📊"
                            ghost="📊"
                            title="Analytics"
                            subtitle="Analyse universities, projects, beneficiaries, SDGs, scores and outcomes within your organization scope."
                            badge="ANALYTICS"
                            background="linear-gradient(135deg,#3d5966,#6b8995)"
                        />
                    </div>
                    <ActionKpiGrid
                        items={[
                            { value: String(pendingReviewCount), label: "Opportunity Reviews Waiting" },
                            { value: String(waiting.length), label: "Reports In Pipeline" },
                            { value: `${hours}h`, label: "Verified Hours" },
                            { value: String(deckCards.length), label: "On Impact Wall" },
                        ]}
                    />
                    <WorkflowSteps
                        title="Community Service Workflow"
                        subtitle="Faculty is the only academic report approver. Partner reviews opportunities where Approval Required is marked."
                        steps={[
                            "Opportunity Submitted",
                            "Faculty Approval",
                            "Partner Review",
                            "Faculty Report Decision",
                            "Impact Wall + AI Ranking",
                        ]}
                    />
                </>
            )}

            {view === "pending" && (
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Submitted reports in the pipeline</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Faculty is the only final report approver. You can monitor status here; opportunity decisions stay on
                        Opportunity Reviews.
                    </p>
                    {loading ? (
                        <p className="mt-4 text-sm text-slate-500">Loading…</p>
                    ) : waiting.length === 0 ? (
                        <p className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-6 text-sm text-emerald-800">
                            Nothing waiting — open My Impact Wall for verified records.
                        </p>
                    ) : (
                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                            {waiting.map((r) => (
                                <CommunityQueueCard
                                    key={r.id}
                                    href="/dashboard/partner/reports?status=Submitted"
                                    title={r.project_title || "Report"}
                                    student={r.student_name || "Student"}
                                    org={r.organization_name}
                                    hours={r.hours}
                                    cta="View status →"
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {view === "approved" && (
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Verified Community Service</h2>
                    <p className="mt-1 text-sm text-slate-500">Live flashcards associated with your organization.</p>
                    {loading ? (
                        <p className="mt-4 text-sm text-slate-500">Loading…</p>
                    ) : deckCards.length === 0 ? (
                        <p className="mt-4 text-sm text-slate-500">Live cards appear here after a report is signed off.</p>
                    ) : (
                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                            {deckCards.map((c) => (
                                <CommunityFlashCard key={c.id} card={c} href="/dashboard/partner/impact" />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {view === "run" && (
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">AI Rankings</h2>
                    <p className="mt-1 mb-4 text-sm text-slate-500">
                        Preview freely. A formal run uses one of three annual ranking credits and only includes Faculty-approved
                        verified records.
                    </p>
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading…</p>
                    ) : deckCards.length === 0 ? (
                        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
                            No live cards to rank yet. Approved Community Service fills this run.
                        </p>
                    ) : (
                        <CommunityAwardPanel
                            cards={deckCards}
                            kind="par"
                            scopeName={orgName}
                            notifyEndpoint="/api/v1/partners/community-service/award-notify"
                            filters={{ university: true }}
                        />
                    )}
                </div>
            )}

            {view === "analytics" && (
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold text-slate-900">Analytics</h2>
                    <p className="text-sm text-slate-500">Hours, dividend, and SDGs from the live deck only.</p>
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading…</p>
                    ) : (
                        <CommunityAwardAnalytics cards={deckCards} groupBy="university" />
                    )}
                    <a href={analyticsHref} className="inline-block text-[11px] font-semibold text-[#0e7d74] hover:underline">
                        Open full analytics →
                    </a>
                </div>
            )}
        </div>
    );
}
