"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authenticatedFetch } from "@/utils/api";
import { CommunityCrumb, HubBackButton } from "@/components/ciel/community-service/CommunityServiceHubChrome";
import { useFacultyHubView } from "@/components/ciel/coursework/CourseworkHubChrome";
import { FACULTY_HERO, MOCKUP_GRADIENTS, MockupActionCard, MockupHero, MockupSectionHead } from "@/components/ciel/dashboard/MockupChrome";
import CommunityAwardPanel from "@/components/ciel/community-service/CommunityAwardPanel";
import CommunityAwardAnalytics from "@/components/ciel/community-service/CommunityAwardAnalytics";
import CommunityFlashCard from "@/components/ciel/community-service/CommunityFlashCard";
import CommunityQueueCard from "@/components/ciel/community-service/CommunityQueueCard";
import StudentCommunityGuide from "@/components/report/StudentCommunityGuide";
import { reportRowToAwardCard, type CommunityAwardCard } from "@/utils/communityAwardModel";
import { isFacultyCommunityLiveCard, isFacultyCommunityWaiting, isCommunityReportRejected, normalizeReviewStatus } from "@/utils/reviewQueue";
import { extractFacultyMineOpportunityRows } from "@/utils/facultyMineOpportunities";
import { canEditReturnedOpportunity, isOpportunityPermanentlyRejected, isOpportunityPubliclyLive } from "@/utils/opportunityWorkflow";
import { getStoredCurrentUserEmail, readStoredCurrentUser } from "@/utils/currentUser";
import { readFacultyScopeSession } from "@/utils/facultyScopeSession";
import { normalizeFacultyApprovalsResponse, type FacultyApprovalRow } from "@/utils/facultyApprovals";
import { extractPendingAttendanceRows } from "@/utils/engagementPendingAttendanceResponse";
import {
    fetchJoinApplicationsHistoryRows,
    normalizeOpportunityApplicationsListResponse,
    type OpportunityApplicationListRow,
} from "@/utils/opportunityApplicationsAdmin";
import { formatDisplayId } from "@/utils/displayIds";

const CS_VIEWS = [
    "home",
    "create",
    "review",
    "projects",
    "reports",
    "impact",
    "files",
    "run",
    "analytics",
    "guide",
    "pending",
    "approved",
] as const;

const CS_BASE = "/dashboard/faculty/community-service";
const CREATE_FORM = "/dashboard/faculty/create-opportunity";
const MY_OPPS = "/dashboard/faculty/my-opportunities";
const APPROVALS = "/dashboard/faculty/approvals";
const JOIN_APPS = "/dashboard/faculty/join-applications";
const REPORTS = "/dashboard/faculty/reports";
const IMPACT = "/dashboard/faculty/impact?tab=community";
const HOURS = "/dashboard/faculty/attendance-review";

type CsView = (typeof CS_VIEWS)[number];

const VIEW_CRUMB: Partial<Record<CsView, string>> = {
    create: "Create Opportunity",
    review: "Review Opportunities",
    projects: "Community Service Projects",
    reports: "Reports for Review",
    impact: "Community Service Impact",
    files: "Shared Analysis Files",
    run: "AI Analyzer & Rankings",
    analytics: "Analytics",
    guide: "Guide",
    pending: "Reports for Review",
    approved: "Community Service Impact",
};

type FacultyReportRow = {
    id: string;
    student_name: string;
    project_title: string;
    organization_name?: string;
    faculty_status?: string;
    status?: string;
    hours?: number;
    submission_date?: string;
    report_submitted_at?: string;
};

type MineRow = {
    id: string;
    title: string;
    status?: string;
    workflow_stage?: string | null;
    created_at?: string;
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

function HubTabs({
    tabs,
    active,
    onChange,
}: {
    tabs: { id: string; label: string; count?: number }[];
    active: string;
    onChange: (id: string) => void;
}) {
    return (
        <div className="mb-3.5 flex flex-wrap gap-2">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    onClick={() => onChange(tab.id)}
                    className={
                        "rounded-[10px] border px-3 py-2 text-[11px] font-extrabold " +
                        (active === tab.id
                            ? "border-[#cbece4] bg-[#e8f7f3] text-[#08756b]"
                            : "border-[#dce6ea] bg-white text-[#52636e]")
                    }
                >
                    {tab.label}
                    {typeof tab.count === "number" ? <span className="ml-1.5 text-[10px] opacity-70">{tab.count}</span> : null}
                </button>
            ))}
        </div>
    );
}

function EmptyPanel({ title, text }: { title: string; text: string }) {
    return (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center">
            <p className="text-sm font-extrabold text-slate-800">{title}</p>
            <p className="mt-1 text-[12.5px] text-slate-500">{text}</p>
        </div>
    );
}

function attendanceProjectId(row: Record<string, unknown>): string {
    const nested = row.project && typeof row.project === "object" ? (row.project as Record<string, unknown>) : null;
    for (const value of [row.projectId, row.project_id, row.opportunityId, row.opportunity_id, nested?.id, nested?._id]) {
        if (value == null) continue;
        const text = String(value).trim();
        if (text) return text;
    }
    return "";
}

function mineBucket(row: MineRow): "drafts" | "review" | "action" | "published" | "closed" {
    const rec = row as unknown as Record<string, unknown>;
    if (normalizeReviewStatus(row.status) === "draft") return "drafts";
    if (canEditReturnedOpportunity(rec)) return "action";
    if (isOpportunityPermanentlyRejected(rec) || normalizeReviewStatus(row.status) === "rejected") return "closed";
    if (isOpportunityPubliclyLive(rec) || normalizeReviewStatus(row.status) === "live") return "published";
    return "review";
}

function isReportRevision(row: FacultyReportRow): boolean {
    const key = normalizeReviewStatus(row.faculty_status);
    return key === "revision_requested" || key === "revisions_requested" || key === "changes_requested" || key === "returned";
}

function isOppRevision(row: FacultyApprovalRow): boolean {
    const key = normalizeReviewStatus(row.opportunityStatus || row.workflowStage);
    return key === "revision_requested" || key === "revisions_requested" || key === "returned" || key.includes("revision");
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
    const searchParams = useSearchParams();
    const tabParam = searchParams.get("tab") || "";
    const [rows, setRows] = useState<FacultyReportRow[]>([]);
    const [cards, setCards] = useState<CommunityAwardCard[]>([]);
    const [mineRows, setMineRows] = useState<MineRow[]>([]);
    const [pendingOppRows, setPendingOppRows] = useState<FacultyApprovalRow[]>([]);
    const [historyOppRows, setHistoryOppRows] = useState<FacultyApprovalRow[]>([]);
    const [pendingAppRows, setPendingAppRows] = useState<OpportunityApplicationListRow[]>([]);
    const [historyAppRows, setHistoryAppRows] = useState<OpportunityApplicationListRow[]>([]);
    const [hoursProjectCount, setHoursProjectCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [facultyName, setFacultyName] = useState("Faculty");
    const [department, setDepartment] = useState("");
    const [helpOpen, setHelpOpen] = useState(false);
    const [innerTab, setInnerTab] = useState("");

    useEffect(() => {
        const user = readStoredCurrentUser();
        const name = typeof user?.name === "string" ? user.name.trim() : "";
        setFacultyName(name || "Faculty");
        const scope = readFacultyScopeSession()?.organization_name?.trim();
        const fromUser = pickStr(user ?? {}, "department", "school", "university", "institution", "organization_name") || "";
        setDepartment(scope || fromUser);
    }, []);

    useEffect(() => {
        setInnerTab(tabParam);
    }, [tabParam, view]);

    useEffect(() => {
        let cancelled = false;
        const facultyEmail = getStoredCurrentUserEmail();
        const approvalQs = new URLSearchParams({ status: "pending" });
        const historyQs = new URLSearchParams({ status: "history" });
        if (facultyEmail) {
            approvalQs.set("faculty_email", facultyEmail);
            historyQs.set("faculty_email", facultyEmail);
        }

        Promise.all([
            authenticatedFetch("/api/v1/faculty/reports", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
            authenticatedFetch("/api/v1/faculty/community-service/award-cards", {}, { redirectToLogin: false }).then(
                (r) => (r?.ok ? r.json() : null),
            ),
            authenticatedFetch("/api/v1/opportunities/faculty/mine?scope=authored", {}, { redirectToLogin: false }).then(
                (r) => (r?.ok ? r.json() : null),
            ),
            authenticatedFetch(`/api/v1/faculty/approvals?${approvalQs.toString()}`, {}, { redirectToLogin: false }).then(
                (r) => (r?.ok ? r.json() : null),
            ),
            authenticatedFetch(`/api/v1/faculty/approvals?${historyQs.toString()}`, {}, { redirectToLogin: false }).then(
                (r) => (r?.ok ? r.json() : null),
            ),
            authenticatedFetch("/api/v1/faculty/applications?status=pending", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
            fetchJoinApplicationsHistoryRows("/api/v1/faculty/applications"),
            authenticatedFetch("/api/v1/engagement/attendance/pending", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
        ])
            .then(([list, award, mine, approvals, history, apps, appHistory, attendance]) => {
                if (cancelled) return;
                const mappedMine = extractFacultyMineOpportunityRows(mine)
                    .map((raw) => {
                        const id = String(raw.id ?? raw._id ?? raw.opportunity_id ?? "").trim();
                        return {
                            id,
                            title: pickStr(raw, "title", "name", "opportunity_title") || "Opportunity",
                            status: pickStr(raw, "status"),
                            workflow_stage: pickStr(raw, "workflow_stage", "workflowStage", "approval_stage") || null,
                            created_at: pickStr(raw, "created_at", "createdAt"),
                            ...raw,
                        } as MineRow;
                    })
                    .filter((row) => row.id);
                setMineRows(mappedMine);
                setPendingOppRows(normalizeFacultyApprovalsResponse(approvals));
                setHistoryOppRows(normalizeFacultyApprovalsResponse(history));
                setPendingAppRows(normalizeOpportunityApplicationsListResponse(apps));
                setHistoryAppRows(appHistory.rows);
                const hourIds = new Set(
                    extractPendingAttendanceRows(attendance)
                        .map(attendanceProjectId)
                        .filter(Boolean),
                );
                setHoursProjectCount(hourIds.size);
                setRows(
                    (Array.isArray(list?.data) ? list.data : [])
                        .filter((item: unknown) => item && typeof item === "object")
                        .map((item: Record<string, unknown>) => {
                            const metrics =
                                item.metrics && typeof item.metrics === "object"
                                    ? (item.metrics as Record<string, unknown>)
                                    : {};
                            const hoursRaw = metrics.total_verified_hours ?? metrics.total_hours ?? item.hours;
                            const hours = typeof hoursRaw === "number" ? hoursRaw : Number(hoursRaw || 0);
                            return {
                                id: String(item.id || ""),
                                student_name: pickStr(item, "student_name", "studentName") || "Student",
                                project_title: pickStr(item, "project_title", "projectTitle") || "Report",
                                organization_name: pickStr(item, "organization_name", "organizationName"),
                                faculty_status: pickStr(item, "faculty_status", "facultyStatus"),
                                status: pickStr(item, "status"),
                                hours: Number.isFinite(hours) ? hours : 0,
                                submission_date: pickStr(item, "submission_date", "submissionDate"),
                                report_submitted_at: pickStr(item, "report_submitted_at", "reportSubmittedAt"),
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
                setMineRows([]);
                setPendingOppRows([]);
                setHistoryOppRows([]);
                setPendingAppRows([]);
                setHistoryAppRows([]);
                setHoursProjectCount(0);
                setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const liveRows = useMemo(() => rows.filter((r) => isFacultyCommunityLiveCard(r)), [rows]);
    const pendingReports = useMemo(() => rows.filter((r) => isFacultyCommunityWaiting(r)), [rows]);
    const revisionReports = useMemo(() => rows.filter(isReportRevision), [rows]);
    const decidedReports = useMemo(
        () => rows.filter((r) => isFacultyCommunityLiveCard(r) || isCommunityReportRejected(r)),
        [rows],
    );
    const activeProjects = useMemo(
        () => rows.filter((r) => !isFacultyCommunityLiveCard(r) && !isCommunityReportRejected(r)),
        [rows],
    );
    const revisionOpps = useMemo(() => historyOppRows.filter(isOppRevision), [historyOppRows]);

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

    const pendingOppReviews = pendingOppRows.length;
    const pendingApps = pendingAppRows.length;
    const pendingApprovalsHero = pendingOppReviews + pendingApps;
    const kicker = department ? `Community Service · Faculty · ${department}` : "Community Service · Faculty";

    const attention: AttentionItem[] = [
        {
            key: "opps",
            n: pendingOppReviews,
            title: "Opportunities to review",
            sub: "Student-created · your approval is first",
            href: `${CS_BASE}?view=review&tab=opps`,
            tone: pendingOppReviews ? "bad" : "default",
        },
        {
            key: "apps",
            n: pendingApps,
            title: "Participation requests",
            sub: "Students applying to published opportunities",
            href: `${CS_BASE}?view=review&tab=apps`,
            tone: pendingApps ? "warn" : "default",
        },
        {
            key: "reports",
            n: pendingReports.length,
            title: "Reports for review",
            sub: "AI Review complete · CII provisional",
            href: `${CS_BASE}?view=reports&tab=pending`,
            tone: pendingReports.length ? "bad" : "default",
        },
        {
            key: "hours",
            n: hoursProjectCount,
            title: "Projects with members below hours",
            sub: "Send a system reminder",
            href: HOURS,
            tone: hoursProjectCount ? "warn" : "default",
        },
    ];

    const inboxItems = [
        ...pendingOppRows.map((row) => ({
            key: `opp-${row.id}`,
            title: row.projectTitle,
            meta: `${formatDisplayId(row.id, "OPP")} · ${row.studentName} · submitted ${row.submittedDate}`,
            href: `${APPROVALS}?tab=pending&opportunity=${encodeURIComponent(row.id)}`,
            cta: "View Flashcard & Approve",
        })),
        ...pendingReports.map((row) => ({
            key: `rep-${row.id}`,
            title: row.project_title,
            meta: `${formatDisplayId(row.id, "RPT")} · ${row.student_name}${row.hours ? ` · ${row.hours}h` : ""} · AI CII provisional`,
            href: `${REPORTS}/${row.id}`,
            cta: "View Report & Approve",
        })),
    ];

    const createCounts = useMemo(() => {
        const counts = { drafts: 0, review: 0, action: 0, published: 0, closed: 0 };
        for (const row of mineRows) counts[mineBucket(row)] += 1;
        return counts;
    }, [mineRows]);

    const defaultCreateTab =
        createCounts.action ? "action" : createCounts.review ? "review" : createCounts.drafts ? "drafts" : "published";
    const createTab = (["drafts", "review", "action", "published", "closed"].includes(innerTab) ? innerTab : defaultCreateTab) as
        | "drafts"
        | "review"
        | "action"
        | "published"
        | "closed";
    const reviewTab = ["opps", "revision", "apps", "done"].includes(innerTab) ? innerTab : "opps";
    const projectTab = ["active", "verified", "all"].includes(innerTab) ? innerTab : "active";
    const reportTab = ["pending", "rev", "done"].includes(innerTab) ? innerTab : "pending";
    const filesTab = innerTab === "ai" ? "ai" : "faculty";

    const crumb = VIEW_CRUMB[view];
    const showHomeHero = view === "home";

    return (
        <div className="mx-auto max-w-[1500px] pb-16">
            <CommunityCrumb role="Faculty" view={crumb} />

            {showHomeHero ? (
                <MockupHero
                    kicker={kicker}
                    title="Faculty Community Service Hub"
                    subtitle="Create opportunities, review student proposals, supervise approved work, verify reports and analyse impact — all inside Community Service."
                    gradient={FACULTY_HERO}
                    stats={[
                        { value: String(pendingApprovalsHero), label: "Pending approvals", href: `${CS_BASE}?view=review` },
                        { value: String(activeProjects.length), label: "Active projects", href: `${CS_BASE}?view=projects` },
                        { value: String(pendingReports.length), label: "Reports to review", href: `${CS_BASE}?view=reports` },
                        { value: String(deckCards.length), label: "Verified impact", href: `${CS_BASE}?view=impact` },
                    ]}
                    rightStat={{ value: "🌱", label: "Academic Community Service workflow" }}
                />
            ) : (
                <div className="mt-4">
                    <HubBackButton href={homeHref} label="← Back to Community Service" />
                </div>
            )}

            {view === "guide" && <StudentCommunityGuide showHero />}

            {view === "home" && (
                <>
                    <p className="mt-4 rounded-[15px] border border-[#cee3e0] bg-[linear-gradient(135deg,#eef9f6,#fff)] px-3.5 py-3 text-[12.5px] leading-relaxed text-[#4d6d6b]">
                        <b className="text-[#126b60]">Navigation rule:</b> You entered Community Service from the left. Everything
                        below belongs to this impact area. Create and creator-statuses stay in Create Opportunity; student
                        approvals stay in Review; approved work stays in Projects/Reports.
                    </p>

                    <div className="mt-4 rounded-[18px] border border-[#cfe3de] bg-[linear-gradient(135deg,#f2fbf7,#fff)] p-4 shadow-[0_8px_24px_rgba(23,75,67,.06)]">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                                <h3 className="m-0 flex items-center gap-2 text-[15px] font-semibold text-[#16313d]">
                                    Approvals waiting for you
                                    <span className="rounded-full bg-[#174b43] px-2 py-0.5 text-[11px] font-bold text-white">
                                        {inboxItems.length}
                                    </span>
                                </h3>
                                <p className="mt-1 text-[11.5px] text-[#4f6068]">
                                    Open the Flashcard and approve in one click. Revision and rejection ask for a short comment.
                                </p>
                            </div>
                        </div>
                        {loading ? (
                            <p className="mt-3 text-sm text-slate-500">Loading approvals…</p>
                        ) : inboxItems.length === 0 ? (
                            <div className="mt-3 rounded-[14px] border border-[#dde8e6] bg-white px-3 py-6 text-center text-sm text-slate-600">
                                <b>Nothing waiting</b>
                                <p className="mt-1 text-[12px] text-slate-500">
                                    New Flashcards appear here the moment a student submits an opportunity or a report.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-2 space-y-2.5">
                                {inboxItems.map((item) => (
                                    <div
                                        key={item.key}
                                        className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#dde8e6] bg-white px-3 py-2.5"
                                    >
                                        <div className="min-w-[240px] flex-1">
                                            <b className="block text-[13.5px] text-[#16313d]">{item.title}</b>
                                            <small className="mt-0.5 block text-[11px] text-[#4f6068]">{item.meta}</small>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Link
                                                href={item.href}
                                                className="rounded-full bg-[#0e7d74] px-3.5 py-1.5 text-[11px] font-extrabold text-white"
                                            >
                                                {item.cta}
                                            </Link>
                                            <Link
                                                href={item.href}
                                                className="rounded-full bg-[#f4e3b8] px-3 py-1.5 text-[11px] font-extrabold text-[#7a4b00]"
                                            >
                                                ✏ Revision
                                            </Link>
                                            <Link
                                                href={item.href}
                                                className="rounded-full bg-[#f8d4d4] px-3 py-1.5 text-[11px] font-extrabold text-[#9a2b2b]"
                                            >
                                                ✕ Reject
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <AttentionRow items={attention} />
                    <MockupSectionHead title="Community Service tools" subtitle="Choose the responsibility you need to work on." />
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                        <MockupActionCard
                            href={`${CS_BASE}?view=create`}
                            emoji="🚀"
                            ghost="🚀"
                            title="Create Opportunity"
                            subtitle="Publish unlimited Faculty opportunities and manage the full creator lifecycle: Drafts, Under Approval, Action Required, Published and Closed."
                            badge="UNLIMITED PUBLISHING"
                            background={MOCKUP_GRADIENTS.teal}
                        />
                        <MockupActionCard
                            href={`${CS_BASE}?view=review`}
                            emoji="✅"
                            ghost="✅"
                            title="Review Opportunities"
                            subtitle="Review student-created proposals and participation requests that require your academic decision."
                            badge="ACTION"
                            background={MOCKUP_GRADIENTS.orange}
                            hot={pendingApprovalsHero > 0}
                        />
                        <MockupActionCard
                            href={`${CS_BASE}?view=projects`}
                            emoji="📈"
                            ghost="📈"
                            title="Community Service Projects"
                            subtitle="Monitor approved projects, report progress, member hours, last activity and reminders."
                            badge="TRACK"
                            background={MOCKUP_GRADIENTS.navy}
                        />
                        <MockupActionCard
                            href={`${CS_BASE}?view=reports`}
                            emoji="📝"
                            ghost="📝"
                            title="Reports for Review"
                            subtitle="Review submitted reports, evidence and provisional CII; approve, revise or reject."
                            badge="ACADEMIC REVIEW"
                            background={MOCKUP_GRADIENTS.red}
                            hot={pendingReports.length > 0}
                        />
                        <MockupActionCard
                            href={`${CS_BASE}?view=impact`}
                            emoji="🏅"
                            ghost="🏅"
                            title="Community Service Impact"
                            subtitle="Verified impact from projects you supervised: Flashcards, CII, badges and credentials."
                            badge="VERIFIED"
                            background={MOCKUP_GRADIENTS.green}
                        />
                        <MockupActionCard
                            href={`${CS_BASE}?view=run`}
                            emoji="🧠"
                            ghost="🧠"
                            title="AI Analyzer & Rankings"
                            subtitle="Run the AI Analyzer on any supervised project (dated badge + trend shared with every stakeholder) and run permitted ranking cohorts."
                            badge="ANALYZE"
                            background={MOCKUP_GRADIENTS.purple}
                        />
                        <MockupActionCard
                            href={`${CS_BASE}?view=files`}
                            emoji="📁"
                            ghost="📁"
                            title="Shared Analysis Files"
                            subtitle="Faculty Analysis files and AI Analyzer reports shared with every stakeholder on the record — same file, same version, every dashboard."
                            badge="SHARED"
                            background={MOCKUP_GRADIENTS.purple}
                        />
                        <MockupActionCard
                            href={`${CS_BASE}?view=analytics`}
                            emoji="📊"
                            ghost="📊"
                            title="Analytics"
                            subtitle="See person-hours, Community Dividend, reach, SDGs and CII patterns across your projects."
                            badge="INSIGHTS"
                            background={MOCKUP_GRADIENTS.gold}
                        />
                    </div>
                </>
            )}

            {view === "create" && (
                <div>
                    <MockupSectionHead
                        title="Create Opportunity"
                        subtitle="Faculty-created opportunities stay here from draft to publication. Partner acknowledgement is required only when a partner is named; CIEL PK gives final platform approval."
                        action={
                            <Link
                                href={CREATE_FORM}
                                className="rounded-full bg-[#0e7d74] px-4 py-2 text-[12px] font-extrabold text-white"
                            >
                                + Create New Opportunity
                            </Link>
                        }
                    />
                    <p className="mb-4 rounded-[14px] border border-[#dce6ea] bg-[#f7fafb] px-3.5 py-3 text-[12.5px] leading-relaxed text-[#52636e]">
                        <b className="text-[#16313d]">Simple rule:</b> If you created the opportunity, its creator status stays
                        here. Once students are assigned, their service/report progress appears under Community Service Projects.
                    </p>
                    <HubTabs
                        tabs={[
                            { id: "drafts", label: "Drafts", count: createCounts.drafts },
                            { id: "review", label: "Under Approval", count: createCounts.review },
                            { id: "action", label: "Action Required", count: createCounts.action },
                            { id: "published", label: "Published", count: createCounts.published },
                            { id: "closed", label: "Closed", count: createCounts.closed },
                        ]}
                        active={createTab}
                        onChange={setInnerTab}
                    />
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading your opportunities…</p>
                    ) : (
                        <div className="space-y-2.5">
                            {mineRows.filter((row) => mineBucket(row) === createTab).length === 0 ? (
                                <EmptyPanel
                                    title="Nothing here"
                                    text={
                                        createTab === "drafts"
                                            ? "Faculty drafts are saved on the Create Opportunity form until you submit them to Partner/CIEL PK."
                                            : `No records under ${createTab}.`
                                    }
                                />
                            ) : (
                                mineRows
                                    .filter((row) => mineBucket(row) === createTab)
                                    .map((row) => (
                                        <Link
                                            key={row.id}
                                            href={`${MY_OPPS}?tab=${createTab === "published" ? "live" : createTab === "closed" ? "rejected" : "review"}`}
                                            className="block rounded-2xl border border-[#dde5ea] bg-white px-4 py-3.5 transition hover:border-[#bcd4d8]"
                                        >
                                            <b className="block text-[14px] text-[#16313d]">{row.title}</b>
                                            <small className="mt-1 block text-[11.5px] text-[#6b7c86]">
                                                {formatDisplayId(row.id, "OPP")} · {row.status || "in review"}
                                                {row.workflow_stage ? ` · ${row.workflow_stage.replace(/_/g, " ")}` : ""}
                                            </small>
                                        </Link>
                                    ))
                            )}
                            <Link href={MY_OPPS} className="inline-block text-[11px] font-semibold text-[#0e7d74] hover:underline">
                                Open full creator list →
                            </Link>
                        </div>
                    )}
                </div>
            )}

            {view === "review" && (
                <div>
                    <MockupSectionHead
                        title="Review Opportunities"
                        subtitle="Student → Faculty → Partner/NGO (if named) → CIEL PK. Every decision is versioned and audited."
                    />
                    <HubTabs
                        tabs={[
                            { id: "opps", label: "Pending my approval", count: pendingOppReviews },
                            { id: "revision", label: "Revision with student", count: revisionOpps.length },
                            { id: "apps", label: "Participation requests", count: pendingApps },
                            { id: "done", label: "Decided", count: historyOppRows.length },
                        ]}
                        active={reviewTab}
                        onChange={setInnerTab}
                    />
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading reviews…</p>
                    ) : reviewTab === "opps" ? (
                        pendingOppRows.length === 0 ? (
                            <EmptyPanel title="No opportunities pending" text="New student submissions appear here with their Flashcard." />
                        ) : (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {pendingOppRows.map((row) => (
                                    <CommunityQueueCard
                                        key={row.id}
                                        href={`${APPROVALS}?tab=pending&opportunity=${encodeURIComponent(row.id)}`}
                                        title={row.projectTitle}
                                        student={row.studentName}
                                        hours={row.totalHours}
                                        cta="View Flashcard & Approve →"
                                    />
                                ))}
                            </div>
                        )
                    ) : reviewTab === "revision" ? (
                        revisionOpps.length === 0 ? (
                            <EmptyPanel title="None" text="Proposals you returned for correction stay visible here." />
                        ) : (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {revisionOpps.map((row) => (
                                    <CommunityQueueCard
                                        key={row.id}
                                        href={`${APPROVALS}?tab=history&opportunity=${encodeURIComponent(row.id)}`}
                                        title={row.projectTitle}
                                        student={row.studentName}
                                        cta="Open record →"
                                    />
                                ))}
                            </div>
                        )
                    ) : reviewTab === "apps" ? (
                        pendingAppRows.length === 0 ? (
                            <EmptyPanel title="No applications name you as faculty" text="Students applying to published opportunities appear here." />
                        ) : (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {pendingAppRows.map((row) => (
                                    <CommunityQueueCard
                                        key={row.id}
                                        href={`${JOIN_APPS}?tab=pending`}
                                        title={`${row.studentName} → ${row.opportunityTitle}`}
                                        student={row.studentEmail || row.studentName}
                                        cta="Review participation →"
                                    />
                                ))}
                            </div>
                        )
                    ) : historyOppRows.length === 0 && historyAppRows.length === 0 ? (
                        <EmptyPanel title="No decided records yet" text="Completed approval decisions stay here for audit history." />
                    ) : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {historyOppRows.map((row) => (
                                <CommunityQueueCard
                                    key={row.id}
                                    href={`${APPROVALS}?tab=history&opportunity=${encodeURIComponent(row.id)}`}
                                    title={row.projectTitle}
                                    student={row.studentName}
                                    tone="approved"
                                    cta="History →"
                                />
                            ))}
                        </div>
                    )}
                    <p className="mt-4 text-[11px] text-[#7a919a]">
                        Opportunity review and participation approval are separate decisions.{" "}
                        <Link href={APPROVALS} className="font-extrabold text-[#0e7d74] hover:underline">
                            Open full approvals
                        </Link>
                        {" · "}
                        <Link href={JOIN_APPS} className="font-extrabold text-[#0e7d74] hover:underline">
                            Open participation requests
                        </Link>
                    </p>
                </div>
            )}

            {(view === "projects") && (
                <div>
                    <MockupSectionHead
                        title="Community Service Projects"
                        subtitle="Connected stakeholders see completion, last activity and member hours. Reminders are system-generated and logged."
                    />
                    <HubTabs
                        tabs={[
                            { id: "active", label: "Active", count: activeProjects.length },
                            { id: "verified", label: "Verified", count: liveRows.length },
                            { id: "all", label: "All", count: rows.length },
                        ]}
                        active={projectTab}
                        onChange={setInnerTab}
                    />
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading projects…</p>
                    ) : (
                        (() => {
                            const list =
                                projectTab === "verified"
                                    ? liveRows
                                    : projectTab === "all"
                                      ? rows
                                      : activeProjects;
                            if (!list.length) {
                                return <EmptyPanel title="Nothing here" text="Approved engagements appear here once students are assigned." />;
                            }
                            return (
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {list.map((row) => (
                                        <CommunityQueueCard
                                            key={row.id}
                                            href={`${REPORTS}/${row.id}`}
                                            title={row.project_title}
                                            student={row.student_name}
                                            org={row.organization_name}
                                            hours={row.hours}
                                            tone={isFacultyCommunityLiveCard(row) ? "approved" : "waiting"}
                                            cta="View progress →"
                                        />
                                    ))}
                                </div>
                            );
                        })()
                    )}
                    <p className="mt-4 text-[11px] text-[#7a919a]">
                        Monitoring does not expose raw private student phone numbers.{" "}
                        <Link href={HOURS} className="font-extrabold text-[#0e7d74] hover:underline">
                            Review member hours
                        </Link>
                    </p>
                </div>
            )}

            {(view === "reports" || view === "pending") && (
                <div>
                    <MockupSectionHead
                        title="Reports for Review"
                        subtitle="Faculty-only academic approval. AI score is provisional until you approve; overrides need a recorded reason."
                    />
                    <HubTabs
                        tabs={[
                            { id: "pending", label: "Pending review", count: pendingReports.length },
                            { id: "rev", label: "Revision with student", count: revisionReports.length },
                            { id: "done", label: "Decided", count: decidedReports.length },
                        ]}
                        active={view === "pending" ? "pending" : reportTab}
                        onChange={setInnerTab}
                    />
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading reports…</p>
                    ) : (
                        (() => {
                            const list = reportTab === "rev" ? revisionReports : reportTab === "done" ? decidedReports : pendingReports;
                            if (!list.length) {
                                return (
                                    <EmptyPanel
                                        title={reportTab === "pending" ? "No reports waiting" : "None"}
                                        text={
                                            reportTab === "pending"
                                                ? "Submitted reports arrive here after the AI Review."
                                                : "Decided reports stay here for history."
                                        }
                                    />
                                );
                            }
                            return (
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {list.map((row) => (
                                        <CommunityQueueCard
                                            key={row.id}
                                            href={`${REPORTS}/${row.id}`}
                                            title={row.project_title}
                                            student={row.student_name}
                                            org={row.organization_name}
                                            hours={row.hours}
                                            tone={isFacultyCommunityLiveCard(row) ? "approved" : "waiting"}
                                            cta="Open report →"
                                        />
                                    ))}
                                </div>
                            );
                        })()
                    )}
                    <Link href={`${REPORTS}?tab=waiting`} className="mt-4 inline-block text-[11px] font-semibold text-[#0e7d74] hover:underline">
                        Open full reports table →
                    </Link>
                </div>
            )}

            {(view === "impact" || view === "approved") && (
                <div>
                    <MockupSectionHead
                        title="Community Service Impact"
                        subtitle="Approved records only; visibility permissions respected."
                        action={
                            <Link href={IMPACT} className="text-xs font-black text-[#087c75] hover:underline">
                                Open Impact Wall →
                            </Link>
                        }
                    />
                    {loading ? (
                        <p className="mt-4 text-sm text-slate-500">Loading…</p>
                    ) : deckCards.length === 0 ? (
                        <p className="mt-4 text-sm text-slate-500">Rejected work never appears as verified impact. Approved cards appear here after sign-off.</p>
                    ) : (
                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                            {deckCards.map((c) => (
                                <CommunityFlashCard key={c.id} card={c} href={`${REPORTS}/${c.id}`} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {view === "files" && (
                <div>
                    <MockupSectionHead
                        title="Shared Analysis Files"
                        subtitle="Faculty Analysis files and AI Analyzer reports are shared automatically with every stakeholder linked to a record — the same file, the same version, on every dashboard."
                    />
                    <HubTabs
                        tabs={[
                            { id: "faculty", label: "Faculty Analysis files", count: decidedReports.length },
                            { id: "ai", label: "AI Analyzer reports", count: deckCards.filter((c) => c.cii != null).length },
                        ]}
                        active={filesTab}
                        onChange={setInnerTab}
                    />
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading files…</p>
                    ) : filesTab === "ai" ? (
                        deckCards.filter((c) => c.cii != null).length === 0 ? (
                            <EmptyPanel
                                title="No AI Analyzer runs yet"
                                text="Run it from any report record. The dated CII badge is the shared file every stakeholder sees."
                            />
                        ) : (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {deckCards
                                    .filter((c) => c.cii != null)
                                    .map((card) => (
                                        <Link
                                            key={card.id}
                                            href={`${REPORTS}/${card.id}`}
                                            className="rounded-2xl border border-[#dde5ea] bg-white px-4 py-3.5 transition hover:border-[#bcd4d8]"
                                        >
                                            <div className="text-[22px]">🧠</div>
                                            <b className="mt-1 block text-[14px] text-[#16313d]">{card.project_title}</b>
                                            <small className="mt-1 block text-[11.5px] text-[#6b7c86]">
                                                {card.level || "CII"} · {card.cii}/100 · {card.student_name}
                                            </small>
                                        </Link>
                                    ))}
                            </div>
                        )
                    ) : decidedReports.length === 0 ? (
                        <EmptyPanel
                            title="No Faculty Analysis yet"
                            text="A file is created the moment faculty decides on a submitted report."
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {decidedReports.map((row) => (
                                <Link
                                    key={row.id}
                                    href={`${REPORTS}/${row.id}`}
                                    className="rounded-2xl border border-[#dde5ea] bg-white px-4 py-3.5 transition hover:border-[#bcd4d8]"
                                >
                                    <div className="text-[22px]">📄</div>
                                    <b className="mt-1 block text-[14px] text-[#16313d]">{row.project_title}</b>
                                    <small className="mt-1 block text-[11.5px] text-[#6b7c86]">
                                        {formatDisplayId(row.id, "RPT")} · {row.faculty_status || row.status} · {row.student_name}
                                    </small>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {view === "run" && (
                <div>
                    <MockupSectionHead
                        title="AI Analyzer & Rankings"
                        subtitle="Faculty scope is limited to projects you supervised. Preview freely; an official run creates a dated cohort ranking."
                    />
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
                            scopeName="Faculty Community Service Cohort"
                            notifyEndpoint="/api/v1/faculty/community-service/award-notify"
                        />
                    )}
                </div>
            )}

            {view === "analytics" && (
                <div className="space-y-3">
                    <MockupSectionHead
                        title={`Analytics · ${facultyName}'s projects`}
                        subtitle="Person-hours, Community Dividend, reach, SDGs and CII patterns from the live deck."
                    />
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading…</p>
                    ) : (
                        <CommunityAwardAnalytics cards={deckCards} groupBy="department" />
                    )}
                    <a href="/dashboard/faculty/analytics" className="inline-block text-[11px] font-semibold text-[#0e7d74] hover:underline">
                        Open full faculty analytics →
                    </a>
                </div>
            )}

            {view === "home" ? (
                <button
                    type="button"
                    onClick={() => setHelpOpen(true)}
                    title="How faculty community service works"
                    className="fixed bottom-[88px] right-5 z-50 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[linear-gradient(135deg,#0e5f63,#12a5a0)] text-[21px] text-white shadow-[0_10px_26px_rgba(14,125,116,0.35)] transition hover:scale-105 lg:bottom-6"
                >
                    ❓
                </button>
            ) : null}

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
                            <b className="text-[13.5px]">Faculty Community Service Hub</b>
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
                                Your academic Community Service work lives here: create, review, supervise, verify and analyse. Home
                                stays a faculty overview; operations stay inside this hub.
                            </p>
                            <p>
                                <b>Create</b> — Faculty-created opportunities do not need a second faculty approver. Partner
                                acknowledgement is only required when a partner is named.
                            </p>
                            <p>
                                <b>Review</b> — Opportunity review and participation approval are separate decisions.
                            </p>
                            <p>
                                <b>Reports</b> — AI CII is provisional until Faculty approval.
                            </p>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
