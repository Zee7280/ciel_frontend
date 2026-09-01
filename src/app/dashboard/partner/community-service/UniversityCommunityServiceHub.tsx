"use client";

import { useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { CommunityCrumb, CommunityHero, HubBackButton } from "@/components/ciel/community-service/CommunityServiceHubChrome";
import { ActionKpiGrid, PathSectionHead, WorkflowSteps, useFacultyHubView } from "@/components/ciel/coursework/CourseworkHubChrome";
import { MOCKUP_GRADIENTS, MockupActionCard } from "@/components/ciel/dashboard/MockupChrome";
import CommunityAwardPanel from "@/components/ciel/community-service/CommunityAwardPanel";
import CommunityAwardAnalytics from "@/components/ciel/community-service/CommunityAwardAnalytics";
import CommunityFlashCard from "@/components/ciel/community-service/CommunityFlashCard";
import StudentCommunityGuide from "@/components/report/StudentCommunityGuide";
import {
    mapCommunityPipelineRow,
    mergeCommunityLiveDeck,
    type CommunityAwardCard,
    type CommunityPipelineRow,
} from "@/utils/communityAwardModel";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { isFacultyCommunityLiveCard, isFacultyCommunityWaiting } from "@/utils/reviewQueue";
import { isOpportunityPubliclyLive } from "@/utils/opportunityWorkflow";

const CS_VIEWS = ["home", "approved", "run", "analytics", "guide", "reps"] as const;
const CS_BASE = "/dashboard/partner/community-service";
const UNI_HERO = "linear-gradient(120deg,#073a42,#118d84)";

type FacultyRep = {
    id: string;
    faculty_name?: string;
    faculty_email?: string;
    faculty_department?: string;
};

export default function UniversityCommunityServiceHub() {
    const { view, homeHref } = useFacultyHubView(CS_VIEWS, "home");
    const user = readStoredCurrentUser() as { name?: string; orgName?: string } | null;
    const orgName =
        (typeof user?.orgName === "string" && user.orgName) ||
        (typeof user?.name === "string" ? user.name : "University");
    const [cards, setCards] = useState<CommunityAwardCard[]>([]);
    const [pipeline, setPipeline] = useState<CommunityPipelineRow[]>([]);
    const [liveOpportunityCount, setLiveOpportunityCount] = useState(0);
    const [reps, setReps] = useState<FacultyRep[]>([]);
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
            authenticatedFetch(
                "/api/v1/partners/community-service/faculty-representatives",
                {},
                { redirectToLogin: false },
            ).then((r) => (r?.ok ? r.json() : null)),
        ])
            .then(([award, list, reports, faculty]) => {
                if (cancelled) return;
                setCards(Array.isArray(award?.data) ? award.data : []);
                setPipeline(
                    (Array.isArray(reports?.data) ? reports.data : [])
                        .filter((item: unknown) => item && typeof item === "object")
                        .map((item: Record<string, unknown>) => mapCommunityPipelineRow(item))
                        .filter((r: CommunityPipelineRow | null): r is CommunityPipelineRow => Boolean(r?.id)),
                );
                const rows = (Array.isArray(list?.data) ? list.data : []).filter(
                    (item: unknown): item is Record<string, unknown> => Boolean(item && typeof item === "object"),
                );
                setLiveOpportunityCount(rows.filter((row) => isOpportunityPubliclyLive(row)).length);
                setReps(
                    (Array.isArray(faculty?.data) ? faculty.data : []).filter(
                        (item: unknown): item is FacultyRep => Boolean(item && typeof item === "object" && (item as FacultyRep).id),
                    ),
                );
                setLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setCards([]);
                setPipeline([]);
                setLiveOpportunityCount(0);
                setReps([]);
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
    const visibleReps = useMemo(() => {
        if (reps.length) return reps;
        const seen = new Set<string>();
        const fallback: FacultyRep[] = [];
        for (const card of deckCards) {
            const name = (card.faculty_name || "").trim();
            if (!name || name === "Faculty" || seen.has(name.toLowerCase())) continue;
            seen.add(name.toLowerCase());
            fallback.push({
                id: `card-${card.id}`,
                faculty_name: name,
                faculty_department: card.department,
            });
        }
        return fallback;
    }, [reps, deckCards]);

    return (
        <div className="mx-auto max-w-[1500px]">
            <CommunityCrumb role="University" view={view === "home" ? undefined : view} />

            {view === "home" ? (
                <CommunityHero
                    kicker="CIEL PK · UNIVERSITY"
                    title="Community Service"
                    subtitle="Monitor university-wide Community Service, authorize Faculty representatives, track report progress and build a verified institutional Impact Wall."
                    gradient={UNI_HERO}
                    stats={[
                        { value: String(liveOpportunityCount), label: "Live Opportunities" },
                        { value: String(deckCards.length), label: "Approved Reports" },
                        { value: `${hours}h`, label: "Verified Service" },
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
                        subtitle="University does not create Community Service opportunities directly. Faculty representatives create them on the institution’s behalf."
                        pill="UNIVERSITY VIEW"
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <MockupActionCard
                            href="/dashboard/partner/requests?scope=institution"
                            emoji="🔎"
                            ghost="🔎"
                            title="Browse Opportunities"
                            subtitle="Browse approved/live opportunities available across the university."
                            badge="BROWSE"
                            background={MOCKUP_GRADIENTS.blue}
                        />
                        <MockupActionCard
                            href="/dashboard/partner/reports"
                            emoji="📈"
                            ghost="📈"
                            title="Community Service Progress"
                            subtitle="Monitor section-wise progress across connected student projects."
                            badge="TRACK"
                            background="linear-gradient(135deg,#2f6b78,#4aa0a2)"
                        />
                        <MockupActionCard
                            href="/dashboard/partner/reports?status=Submitted"
                            emoji="📝"
                            ghost="📝"
                            title="Submitted Reports"
                            subtitle="Monitor reports submitted for Faculty approval and pending action."
                            badge="REPORTS"
                            background={MOCKUP_GRADIENTS.navy}
                        />
                        <MockupActionCard
                            href="/dashboard/partner/requests?scope=institution&tab=live"
                            emoji="🌿"
                            ghost="🌿"
                            title="Approved Opportunities"
                            subtitle="View approved/live Community Service opportunities across the institution."
                            badge="LIVE"
                            background={MOCKUP_GRADIENTS.green}
                        />
                        <MockupActionCard
                            href={`${CS_BASE}?view=approved`}
                            emoji="✅"
                            ghost="✅"
                            title="Approved Reports"
                            subtitle="View Faculty-approved verified Community Service reports."
                            badge="VERIFIED"
                            background="linear-gradient(135deg,#156d65,#2da38b)"
                        />
                        <MockupActionCard
                            href={`${CS_BASE}?view=guide`}
                            emoji="📖"
                            ghost="📖"
                            title="Report Guidance"
                            subtitle="Section-by-section Community Service reporting guidance."
                            badge="GUIDANCE"
                            background={MOCKUP_GRADIENTS.purple}
                        />
                        <MockupActionCard
                            href="/dashboard/partner/impact"
                            emoji="🏆"
                            ghost="🏆"
                            title="My Impact Wall"
                            subtitle="Institution-wide verified impact flashcards and supporting records."
                            badge="IMPACT"
                            background={MOCKUP_GRADIENTS.gold}
                        />
                        <MockupActionCard
                            href={`${CS_BASE}?view=run`}
                            emoji="🧠"
                            ghost="🧠"
                            title="AI Rankings"
                            subtitle="Run three formal institutional ranking snapshots per year."
                            badge="3 RUNS"
                            background={MOCKUP_GRADIENTS.pink}
                        />
                        <MockupActionCard
                            href="/dashboard/partner/university-analytics"
                            emoji="📊"
                            ghost="📊"
                            title="Analytics"
                            subtitle="Filter by department, subject, Faculty, month, year, SDG, score and more."
                            badge="ANALYTICS"
                            background="linear-gradient(135deg,#3d5966,#6b8995)"
                        />
                        <MockupActionCard
                            href={`${CS_BASE}?view=reps`}
                            emoji="👩‍🏫"
                            ghost="👩‍🏫"
                            title="Faculty Representatives"
                            subtitle="Manage Faculty authorized to create Community Service opportunities on the University’s behalf."
                            badge="AUTHORITY"
                            background="linear-gradient(135deg,#455a78,#7088ad)"
                        />
                    </div>
                    <ActionKpiGrid
                        items={[
                            { value: String(liveOpportunityCount), label: "Live Opportunities" },
                            { value: String(waiting.length), label: "Reports In Pipeline" },
                            { value: `${hours}h`, label: "Verified Hours" },
                            { value: String(deckCards.length), label: "On Impact Wall" },
                        ]}
                    />
                    <WorkflowSteps
                        title="Community Service Workflow"
                        subtitle="Faculty is the only academic report approver. University monitors institution-wide progress."
                        steps={[
                            "Opportunity Submitted",
                            "Stakeholder Approvals",
                            "Student Report",
                            "Faculty Report Decision",
                            "Impact Wall + AI Ranking",
                        ]}
                    />
                </>
            )}

            {view === "approved" && (
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Approved Community Service Reports</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Faculty-approved verified reports. These also appear on My Impact Wall.
                    </p>
                    {loading ? (
                        <p className="mt-4 text-sm text-slate-500">Loading…</p>
                    ) : deckCards.length === 0 ? (
                        <p className="mt-4 text-sm text-slate-500">Verified cards appear here after Faculty sign-off.</p>
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
                            kind="uni"
                            scopeName={orgName}
                            notifyEndpoint="/api/v1/partners/community-service/award-notify"
                            filters={{ department: true, faculty: true }}
                        />
                    )}
                </div>
            )}

            {view === "analytics" && (
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold text-slate-900">Analytics</h2>
                    <p className="text-sm text-slate-500">Hours, dividend, and SDGs from the live institutional deck.</p>
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading…</p>
                    ) : (
                        <CommunityAwardAnalytics cards={deckCards} groupBy="department" />
                    )}
                    <a
                        href="/dashboard/partner/university-analytics"
                        className="inline-block text-[11px] font-semibold text-[#0e7d74] hover:underline"
                    >
                        Open full university analytics →
                    </a>
                </div>
            )}

            {view === "reps" && (
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Faculty Representatives</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        University-authorized Faculty create and manage Community Service opportunities on the institution’s
                        behalf.
                    </p>
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        <b>Locked rule:</b> the university does not create Community Service opportunities directly. Authorized
                        Faculty use the Faculty Opportunity Builder. New authorizations are assigned by CIEL PK Admin.
                    </div>
                    {loading ? (
                        <p className="mt-4 text-sm text-slate-500">Loading…</p>
                    ) : visibleReps.length === 0 ? (
                        <p className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
                            No authorized Faculty representatives are linked to this university yet.
                        </p>
                    ) : (
                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                            {visibleReps.map((rep) => (
                                <article
                                    key={rep.id}
                                    className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-900">
                                                {rep.faculty_name || "Faculty member"}
                                            </h3>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {[rep.faculty_department, rep.faculty_email].filter(Boolean).join(" · ") ||
                                                    "Authorized to create Community Service opportunities"}
                                            </p>
                                        </div>
                                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-800">
                                            Authorized
                                        </span>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
