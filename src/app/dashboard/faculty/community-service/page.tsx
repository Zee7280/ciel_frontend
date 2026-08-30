"use client";

import { useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { CommunityCrumb, CommunityHero, HubBackButton, HubTile } from "@/components/ciel/community-service/CommunityServiceHubChrome";
import { ActionKpiGrid, PathSectionHead, WorkflowSteps } from "@/components/ciel/coursework/CourseworkHubChrome";
import CommunityAwardPanel from "@/components/ciel/community-service/CommunityAwardPanel";
import CommunityAwardAnalytics from "@/components/ciel/community-service/CommunityAwardAnalytics";
import CommunityFlashCard from "@/components/ciel/community-service/CommunityFlashCard";
import CommunityQueueCard from "@/components/ciel/community-service/CommunityQueueCard";
import {
    reportRowToAwardCard,
    type CommunityAwardCard,
} from "@/utils/communityAwardModel";
import { isFacultyCommunityLiveCard, isFacultyCommunityWaiting } from "@/utils/reviewQueue";

type FacView = "home" | "pending" | "approved" | "run" | "analytics";

type FacultyReportRow = {
    id: string;
    student_name: string;
    project_title: string;
    organization_name?: string;
    faculty_status?: string;
    status?: string;
    hours?: number;
};

function pickStr(item: Record<string, unknown>, ...keys: string[]): string | undefined {
    for (const key of keys) {
        const value = item[key];
        if (typeof value === "string" && value.trim()) return value;
    }
    return undefined;
}

const FACULTY_HERO = "linear-gradient(115deg,#04252b,#0e5f63 55%,#0e7d74 115%)";

export default function FacultyCommunityServicePage() {
    const [view, setView] = useState<FacView>("home");
    const [rows, setRows] = useState<FacultyReportRow[]>([]);
    const [cards, setCards] = useState<CommunityAwardCard[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            authenticatedFetch("/api/v1/faculty/reports", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
            authenticatedFetch("/api/v1/faculty/community-service/award-cards", {}, { redirectToLogin: false }).then(
                (r) => (r?.ok ? r.json() : null),
            ),
        ])
            .then(([list, award]) => {
                if (cancelled) return;
                setRows(
                    (Array.isArray(list?.data) ? list.data : [])
                        .filter((item: unknown) => item && typeof item === "object")
                        .map((item: Record<string, unknown>) => {
                            const metrics =
                                item.metrics && typeof item.metrics === "object"
                                    ? (item.metrics as Record<string, unknown>)
                                    : {};
                            const hoursRaw =
                                metrics.total_verified_hours ?? metrics.total_hours ?? item.hours;
                            const hours = typeof hoursRaw === "number" ? hoursRaw : Number(hoursRaw || 0);
                            return {
                                id: String(item.id || ""),
                                student_name: pickStr(item, "student_name", "studentName") || "Student",
                                project_title: pickStr(item, "project_title", "projectTitle") || "Report",
                                organization_name: pickStr(item, "organization_name", "organizationName"),
                                faculty_status: pickStr(item, "faculty_status", "facultyStatus"),
                                status: pickStr(item, "status"),
                                hours: Number.isFinite(hours) ? hours : 0,
                            };
                        })
                        .filter((r: FacultyReportRow) => r.id),
                );
                setCards(Array.isArray(award?.data) ? award.data : []);
                setLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setRows([]);
                setCards([]);
                setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const liveRows = useMemo(() => rows.filter((r) => isFacultyCommunityLiveCard(r)), [rows]);

    const pending = useMemo(() => rows.filter((r) => isFacultyCommunityWaiting(r)), [rows]);

    const deckCards = useMemo(() => {
        const liveIds = new Set(liveRows.map((r) => r.id));
        const byId = new Map<string, CommunityAwardCard>();
        for (const card of cards) {
            if (liveIds.has(card.id) || isFacultyCommunityLiveCard(card)) {
                byId.set(card.id, card);
            }
        }
        for (const row of liveRows) {
            if (!byId.has(row.id)) byId.set(row.id, reportRowToAwardCard(row));
        }
        return Array.from(byId.values());
    }, [cards, liveRows]);

    const hours = deckCards.reduce((s, c) => s + (c.hours || 0), 0);

    return (
        <div className="mx-auto max-w-[1240px]">
            <CommunityCrumb role="Faculty" view={view === "home" ? undefined : view} />

            {view === "home" ? (
                <CommunityHero
                    kicker="FACULTY IMPACT DASHBOARD"
                    title="Community Service"
                    subtitle="Monitor service opportunities, participation, reports and verified community impact."
                    gradient={FACULTY_HERO}
                    stats={[
                        { value: String(pending.length), label: "Pending Review" },
                        { value: String(deckCards.length), label: "Approved" },
                        { value: `${hours}h`, label: "In Impact Wall" },
                    ]}
                />
            ) : (
                <div className="mt-4">
                    <HubBackButton onClick={() => setView("home")} label="← Back to Community service" />
                </div>
            )}

            {view === "home" && (
                <>
                <PathSectionHead
                    title="Community Service Management"
                    subtitle="Approve student/community service submissions, monitor active reports and review verified evidence."
                    pill="FACULTY VIEW"
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <HubTile
                        href="/dashboard/faculty/create-opportunity"
                        badge="FOR YOUR COHORT"
                        badgeClass="text-[#0e7d74]"
                        emoji="🚀"
                        title="Create an Opportunity"
                        subtitle="Publish a supervised opportunity — students enrol with OTP team links."
                        background="linear-gradient(135deg,#0e7d74,#2dd4bf)"
                    />
                    <HubTile
                        onClick={() => setView("pending")}
                        badge={pending.length ? `${pending.length} IN QUEUE` : "CLEAR"}
                        badgeClass="text-[#b45309]"
                        emoji="⏳"
                        title="Waiting for Your Approval"
                        subtitle="Completed reports queued for your one-time approval."
                        background="linear-gradient(135deg,#b45309,#fbbf24)"
                    />
                    <HubTile
                        onClick={() => setView("approved")}
                        badge={`${deckCards.length} LIVE`}
                        badgeClass="text-[#04252b]"
                        emoji="✅"
                        title="Approved Community Service"
                        subtitle="Every card you approved — live on all dashboards."
                        background="linear-gradient(135deg,#04252b,#0e7d74)"
                    />
                    <HubTile
                        onClick={() => setView("run")}
                        badge="BADGE ISSUER"
                        badgeClass="text-[#6d28d9]"
                        emoji="🏆"
                        title="Run & Grant the Award Model"
                        subtitle="Rank your cohort on the standard criteria — grant Faculty Choice."
                        background="linear-gradient(135deg,#6d28d9,#a78bfa)"
                    />
                    <HubTile
                        onClick={() => setView("analytics")}
                        badge="LIVE"
                        badgeClass="text-[#0369a1]"
                        emoji="📊"
                        title="Analytics"
                        subtitle="Your cohort in numbers — hours, dividend, SDGs."
                        background="linear-gradient(135deg,#0369a1,#38bdf8)"
                    />
                </div>
                <ActionKpiGrid
                    items={[
                        { value: String(pending.length), label: "Reports Awaiting Review" },
                        { value: String(deckCards.length), label: "Approved This Term" },
                        { value: `${hours}h`, label: "Cohort Hours" },
                        { value: String(liveRows.length), label: "On Impact Wall" },
                    ]}
                />
                <WorkflowSteps
                    title="Community Service Workflow"
                    subtitle="Approved work flows into the same unified Faculty Impact Wall."
                    steps={["Opportunity Submitted", "Faculty Opportunity Approval", "Activity + Report", "Faculty Report Approval", "Impact Wall + AI Badge"]}
                />
                </>
            )}

            {view === "pending" && (
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Waiting for your approval</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Only reports that still need your sign-off. Live cards are under Approved Community Service.
                    </p>
                    {loading ? (
                        <p className="mt-4 text-sm text-slate-500">Loading…</p>
                    ) : pending.length === 0 ? (
                        <p className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-6 text-sm text-emerald-800">
                            Nothing waiting — open Approved Community Service to see live cards.
                        </p>
                    ) : (
                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                            {pending.map((r) => (
                                <CommunityQueueCard
                                    key={r.id}
                                    href={`/dashboard/faculty/reports/${r.id}`}
                                    title={r.project_title || "Report"}
                                    student={r.student_name}
                                    org={r.organization_name}
                                    hours={r.hours}
                                    cta="Open report →"
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {view === "approved" && (
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Approved Community Service</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Every live card from your cohort — same flash cards students see on their walls.
                    </p>
                    {loading ? (
                        <p className="mt-4 text-sm text-slate-500">Loading…</p>
                    ) : deckCards.length === 0 ? (
                        <p className="mt-4 text-sm text-slate-500">Approved cards appear here after a report is signed off.</p>
                    ) : (
                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                            {deckCards.map((c) => (
                                <CommunityFlashCard
                                    key={c.id}
                                    card={c}
                                    href={`/dashboard/faculty/reports/${c.id}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {view === "run" && (
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Run & Grant the Award Model</h2>
                    <p className="mt-1 mb-4 text-sm text-slate-500">
                        Rank this cohort on the standard criteria and grant Faculty Choice. Notifications still use the
                        existing award endpoint.
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
                            kind="fac"
                            scopeName="Your cohort"
                            notifyEndpoint="/api/v1/faculty/community-service/award-notify"
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
                        <CommunityAwardAnalytics cards={deckCards} groupBy="department" />
                    )}
                    <a
                        href="/dashboard/faculty/analytics"
                        className="inline-block text-[11px] font-semibold text-[#0e7d74] hover:underline"
                    >
                        Open full faculty analytics →
                    </a>
                </div>
            )}
        </div>
    );
}
