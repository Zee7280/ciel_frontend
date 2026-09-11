"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authenticatedFetch } from "@/utils/api";
import { CommunityCrumb, HubBackButton } from "@/components/ciel/community-service/CommunityServiceHubChrome";
import { useFacultyHubView } from "@/components/ciel/coursework/CourseworkHubChrome";
import { FACULTY_HERO, MOCKUP_GRADIENTS, MockupActionCard, MockupHero, MockupSectionHead } from "@/components/ciel/dashboard/MockupChrome";
import CommunityAwardPanel from "@/components/ciel/community-service/CommunityAwardPanel";
import CommunityAwardAnalytics from "@/components/ciel/community-service/CommunityAwardAnalytics";
import CommunityFlashCard from "@/components/ciel/community-service/CommunityFlashCard";
import CommunityQueueCard from "@/components/ciel/community-service/CommunityQueueCard";
import StudentCommunityGuide from "@/components/report/StudentCommunityGuide";
import {
    reportRowToAwardCard,
    type CommunityAwardCard,
} from "@/utils/communityAwardModel";
import { isFacultyCommunityLiveCard, isFacultyCommunityWaiting } from "@/utils/reviewQueue";
import { extractFacultyMineOpportunityRows } from "@/utils/facultyMineOpportunities";
import { isOpportunityPubliclyLive } from "@/utils/opportunityWorkflow";
import { getStoredCurrentUserEmail, readStoredCurrentUser } from "@/utils/currentUser";
import { readFacultyScopeSession } from "@/utils/facultyScopeSession";
import { normalizeFacultyApprovalsResponse } from "@/utils/facultyApprovals";
import { normalizeOpportunityApplicationsListResponse } from "@/utils/opportunityApplicationsAdmin";

const CS_VIEWS = ["home", "pending", "approved", "run", "analytics", "guide"] as const;
const CS_BASE = "/dashboard/faculty/community-service";

/**
 * Mockup `Page.open(module, tab)` → live routes.
 * create / myopps / review / projects / reports / impact / rankings / analytics
 */
const HUB = {
    create: "/dashboard/faculty/create-opportunity",
    myOpps: "/dashboard/faculty/my-opportunities?tab=all",
    reviewOpps: "/dashboard/faculty/approvals?tab=pending",
    reviewApps: "/dashboard/faculty/join-applications?tab=pending",
    projects: "/dashboard/faculty/reports?tab=all",
    reports: "/dashboard/faculty/reports?tab=waiting",
    hours: "/dashboard/faculty/attendance-review",
    impact: "/dashboard/faculty/impact?tab=community",
    rankings: `${CS_BASE}?view=run`,
    analytics: `${CS_BASE}?view=analytics`,
} as const;

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

const TONE_CLASS = {
    default: "text-[#0e4d4e]",
    warn: "text-[#9a6410]",
    bad: "text-[#b34c4c]",
} as const;

type AttentionItem = {
    key: string;
    n: number;
    title: string;
    sub: string;
    href: string;
    tone?: keyof typeof TONE_CLASS;
};

function AttentionRow({ items }: { items: AttentionItem[] }) {
    return (
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
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
    );
}

export default function FacultyCommunityServicePage() {
    return (
        <Suspense fallback={<div className="mx-auto max-w-[1240px] py-16 text-center text-sm text-[#71828e]">Loading community service…</div>}>
            <FacultyCommunityServiceHub />
        </Suspense>
    );
}

function FacultyCommunityServiceHub() {
    const { view, homeHref } = useFacultyHubView(CS_VIEWS, "home");
    const [rows, setRows] = useState<FacultyReportRow[]>([]);
    const [cards, setCards] = useState<CommunityAwardCard[]>([]);
    const [liveOpportunityCount, setLiveOpportunityCount] = useState(0);
    const [pendingOppReviews, setPendingOppReviews] = useState(0);
    const [pendingApps, setPendingApps] = useState(0);
    const [loading, setLoading] = useState(true);
    const [facultyName, setFacultyName] = useState("Faculty");
    const [department, setDepartment] = useState("");

    useEffect(() => {
        const user = readStoredCurrentUser();
        const name = typeof user?.name === "string" ? user.name.trim() : "";
        setFacultyName(name || "Faculty");
        const scope = readFacultyScopeSession()?.organization_name?.trim();
        const fromUser =
            pickStr(user ?? {}, "department", "school", "university", "institution", "organization_name") || "";
        setDepartment(scope || fromUser);
    }, []);

    useEffect(() => {
        let cancelled = false;
        const facultyEmail = getStoredCurrentUserEmail();
        const approvalQs = new URLSearchParams({ status: "pending" });
        if (facultyEmail) approvalQs.set("faculty_email", facultyEmail);

        Promise.all([
            authenticatedFetch("/api/v1/faculty/reports", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
            authenticatedFetch("/api/v1/faculty/community-service/award-cards", {}, { redirectToLogin: false }).then(
                (r) => (r?.ok ? r.json() : null),
            ),
            authenticatedFetch("/api/v1/opportunities/faculty/mine", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
            authenticatedFetch(`/api/v1/faculty/approvals?${approvalQs.toString()}`, {}, { redirectToLogin: false }).then(
                (r) => (r?.ok ? r.json() : null),
            ),
            authenticatedFetch("/api/v1/faculty/applications?status=pending", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
        ])
            .then(([list, award, mine, approvals, apps]) => {
                if (cancelled) return;
                const mineRows = extractFacultyMineOpportunityRows(mine);
                setLiveOpportunityCount(mineRows.filter((row) => isOpportunityPubliclyLive(row)).length);
                setPendingOppReviews(normalizeFacultyApprovalsResponse(approvals).length);
                setPendingApps(normalizeOpportunityApplicationsListResponse(apps).length);
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
                setLiveOpportunityCount(0);
                setPendingOppReviews(0);
                setPendingApps(0);
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

    const pendingApprovalsHero = pendingOppReviews + pendingApps;
    const kicker = department
        ? `CIEL PK · FACULTY · ${department.toUpperCase()}`
        : "CIEL PK · FACULTY";

    const attention: AttentionItem[] = [
        {
            key: "opps",
            n: pendingOppReviews,
            title: "Opportunities to review",
            sub: "Student-created · your approval is first",
            href: HUB.reviewOpps,
            tone: pendingOppReviews ? "bad" : "default",
        },
        {
            key: "apps",
            n: pendingApps,
            title: "Participation requests",
            sub: "Students applying to published opportunities",
            href: HUB.reviewApps,
            tone: pendingApps ? "warn" : "default",
        },
        {
            key: "reports",
            n: pending.length,
            title: "Reports for review",
            sub: "AI Review complete · CII provisional",
            href: HUB.reports,
            tone: pending.length ? "bad" : "default",
        },
        {
            key: "hours",
            n: 0,
            title: "Projects with members below hours",
            sub: "Send a system reminder",
            href: HUB.hours,
            tone: "warn",
        },
    ];

    return (
        <div className="mx-auto max-w-[1500px] pb-16">
            <CommunityCrumb role="Faculty" view={view === "home" ? undefined : view} />

            {view === "home" ? (
                <MockupHero
                    kicker={kicker}
                    title={facultyName}
                    subtitle="Create opportunities, approve student projects, monitor report progress, verify CII and run cohort rankings — with academic accountability preserved on every record."
                    gradient={FACULTY_HERO}
                    stats={[
                        { value: String(pendingApprovalsHero), label: "Pending approvals" },
                        { value: String(liveOpportunityCount), label: "Active projects" },
                        { value: String(pending.length), label: "Reports to review" },
                        { value: String(deckCards.length), label: "Verified impact" },
                    ]}
                    rightStat={{ value: "👩‍🏫", label: "" }}
                />
            ) : (
                <div className="mt-4">
                    <HubBackButton href={homeHref} label="← Back to Community Service buttons" />
                </div>
            )}

            {view === "guide" && <StudentCommunityGuide showHero />}

            {view === "home" && (
                <>
                    <AttentionRow items={attention} />
                    <MockupSectionHead
                        title="Community Service"
                        subtitle="Eight buttons. Every card shows status, who has it and your next action."
                    />
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                        <MockupActionCard
                            href={HUB.create}
                            emoji="🚀"
                            ghost="🚀"
                            title="Create Opportunity"
                            subtitle="Publish an opportunity for students to apply to. Partner acknowledgement required when an organization is named."
                            badge="CREATE"
                            background={MOCKUP_GRADIENTS.teal}
                        />
                        <MockupActionCard
                            href={HUB.myOpps}
                            emoji="📋"
                            ghost="📋"
                            title="My Opportunities"
                            subtitle="Drafts, opportunities under review, published lifecycle and capacity."
                            badge="MINE"
                            background={MOCKUP_GRADIENTS.blue}
                        />
                        <MockupActionCard
                            href={HUB.reviewOpps}
                            emoji="✅"
                            ghost="✅"
                            title="Review Opportunities"
                            subtitle="Student-created opportunities awaiting your approval, plus participation requests on published opportunities."
                            badge="ACTION"
                            background={MOCKUP_GRADIENTS.orange}
                            hot={pendingApprovalsHero > 0}
                        />
                        <MockupActionCard
                            href={HUB.projects}
                            emoji="📈"
                            ghost="📈"
                            title="Community Service Projects"
                            subtitle="Monitor approved projects: report completion, member hours, last activity — send email or WhatsApp reminders."
                            badge="TRACK"
                            background={MOCKUP_GRADIENTS.navy}
                        />
                        <MockupActionCard
                            href={HUB.reports}
                            emoji="📝"
                            ghost="📝"
                            title="Reports for Review"
                            subtitle="Flashcard, AI Summary, evidence, PDF and provisional CII. Approve, request revision or reject."
                            badge="REVIEW"
                            background={MOCKUP_GRADIENTS.red}
                            hot={pending.length > 0}
                        />
                        <MockupActionCard
                            href={HUB.impact}
                            emoji="🏅"
                            ghost="🏅"
                            title="Community Service Impact"
                            subtitle="Verified records supervised by you: CII, badges, certificates and QR."
                            badge="VERIFIED"
                            background={MOCKUP_GRADIENTS.green}
                        />
                        <MockupActionCard
                            href={HUB.rankings}
                            emoji="🧠"
                            ghost="🧠"
                            title="AI Analyzer & Rankings"
                            subtitle="Unlimited previews · 4 official runs per year on your cohort of verified projects."
                            badge="4 RUNS / YEAR"
                            background={MOCKUP_GRADIENTS.purple}
                        />
                        <MockupActionCard
                            href={HUB.analytics}
                            emoji="📊"
                            ghost="📊"
                            title="Analytics"
                            subtitle="Person-hours, Community Dividend, reach, SDGs and CII distribution across your projects."
                            badge="ANALYTICS"
                            background={MOCKUP_GRADIENTS.gold}
                        />
                    </div>
                </>
            )}

            {view === "pending" && (
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Waiting for your approval</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Only reports that still need your sign-off. Signed-off cards appear on My Impact Wall.
                    </p>
                    {loading ? (
                        <p className="mt-4 text-sm text-slate-500">Loading…</p>
                    ) : pending.length === 0 ? (
                        <p className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-6 text-sm text-emerald-800">
                            Nothing waiting — open My Impact Wall to see live cards.
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
