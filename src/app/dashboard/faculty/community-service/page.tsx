"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CommunityCrumb, HubBackButton, UserGuideBanner } from "@/components/ciel/community-service/CommunityServiceHubChrome";
import {
    ApprovalPipelineMini,
    SummaryTiles,
    computeApprovalPipelineSteps,
    isApprovalLineDone,
    type ApprovalLineStatus,
    type ApprovalPipelineStepState,
} from "@/components/ciel/community-service/CommunityServiceHubChrome";
import {
    FACULTY_CS_BASE as CS_BASE,
    FACULTY_CS_HOURS as HOURS,
    FACULTY_CS_JOIN_APPS as JOIN_APPS,
    FACULTY_CS_REPORTS as REPORTS,
    useFacultyCommunityServiceData,
    type FacultyCsMineRow,
    type FacultyCsReportRow,
} from "./useFacultyCommunityServiceData";
import ProjectMonitorCard, { RemindButtons, projectReportHref } from "@/components/ciel/community-service/ProjectMonitorCard";
import { describeRemindNowResult, postRemindNow } from "@/utils/projectTracking";
import { toast } from "sonner";
import { useFacultyHubView } from "@/components/ciel/coursework/CourseworkHubChrome";
import { FACULTY_HERO, MOCKUP_GRADIENTS, MockupActionCard, MockupHero, MockupSectionHead } from "@/components/ciel/dashboard/MockupChrome";
import CommunityAwardAnalytics from "@/components/ciel/community-service/CommunityAwardAnalytics";
import CommunityFlashCard from "@/components/ciel/community-service/CommunityFlashCard";
import ReportProgressCard from "@/components/ciel/community-service/ReportProgressCard";
import CommunityQueueCard from "@/components/ciel/community-service/CommunityQueueCard";
import OpportunityApprovalCard, {
    approvalActionClass,
    buildOpportunityApprovalModel,
} from "@/components/ciel/community-service/OpportunityApprovalCard";
import {
    FacultyPendingReviewButtons,
    useFacultyOpportunityReviewActions,
} from "@/components/faculty/FacultyOpportunityReviewActions";
import StudentCommunityGuide from "@/components/report/StudentCommunityGuide";
import { normalizeReviewStatus } from "@/utils/reviewQueue";
import { canEditReturnedOpportunity, isOpportunityPermanentlyRejected, isOpportunityPubliclyLive } from "@/utils/opportunityWorkflow";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { readFacultyScopeSession } from "@/utils/facultyScopeSession";
import { formatOpportunityCode } from "@/utils/displayIds";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { FACULTY_QUICK_WORK_HREF } from "@/utils/quickWorkApi";

const CS_VIEWS = [
    "home",
    "create",
    "review",
    "projects",
    "reports",
    "impact",
    "analytics",
    "guide",
    "pending",
    "approved",
] as const;

const CREATE_FORM = "/dashboard/faculty/create-opportunity";
const MY_OPPS = "/dashboard/faculty/my-opportunities";
const IMPACT = "/dashboard/faculty/impact?tab=community";
const CREATE_PAGE_SIZE = 8;

type CsView = (typeof CS_VIEWS)[number];

const FACULTY_CS_GUIDES: Record<string, { desc: string; items?: [string, string][]; rule?: string }> = {
    home: {
        desc: "Your academic Community Service work lives here: create, review, supervise, verify and analyse.",
        rule: "Home stays a faculty overview; Community Service operations stay inside this hub.",
    },
    create: {
        desc: "Create and manage Faculty-created opportunities through publication.",
        items: [
            ["Create New Opportunity", "Open the Faculty Opportunity Form. Your signed-in faculty identity is the academic owner."],
            ["Drafts", "Saved Faculty-created opportunities not yet submitted."],
            ["Under Approval", "Submitted opportunities waiting on partner acknowledgement if named and/or CIEL PK final review."],
            ["Action Required", "Creator-side revisions requested before publication."],
            ["Published", "Approved opportunities visible to eligible students in Browse Opportunities."],
            ["Closed", "Rejected, expired or closed creator records retained for history."],
        ],
        rule: "Faculty-created opportunities do not require a second faculty approver.",
    },
    review: {
        desc: "Academic approval area for student-created opportunities and participation requests.",
        items: [
            ["Linked Drafts", "Named to you but not submitted yet. View the same Opportunity ID."],
            ["Pending My Approval", "Student-created proposals waiting for your decision."],
            ["Revision with Student", "Proposals you returned for correction; status remains visible."],
            ["Participation Requests", "Students asking to join published opportunities under your supervision."],
            ["Decided", "Completed approval decisions retained for audit history."],
        ],
        rule: "Opportunity review and participation approval are separate decisions.",
    },
    projects: {
        desc: "Monitor approved projects connected to you as faculty.",
        items: [
            ["Active", "Projects delivering service or completing reports."],
            ["Verified", "Projects whose reports are approved and impact is verified."],
            ["All", "Complete supervised project history."],
            ["View Progress", "See report %, last activity and permitted member-hour status."],
            ["Send Reminder", "System-generated Email/WhatsApp follow-up; communication is logged."],
        ],
        rule: "Monitoring does not expose raw private student phone numbers.",
    },
    reports: {
        desc: "Read-only faculty review and analysis of submitted Community Service Reports.",
        items: [
            ["Pending Review", "Reports awaiting CIEL PK Admin analysis / decision. Open the Impact Package to view the flashcard and detailed report."],
            ["Revision with Student", "Reports returned for correction."],
            ["Decided", "Approved or rejected report decisions retained for history."],
            ["CII Breakdown", "Review any provisional AI assessment and evidence logic when available."],
            ["Approve / Revise / Reject", "Final report decision is CIEL PK-only in this build; faculty analysis remains available as view-only."],
        ],
        rule: "AI CII is provisional until CIEL PK final acceptance.",
    },
    impact: {
        desc: "Verified impact from projects you supervised.",
        items: [
            ["Impact Wall", "Verified visible records under the permitted visibility setting."],
            ["Flashcard & package", "Open the verified flashcard, CII, badge, ranking + trend, detailed report and PDF. QR is on the Impact Package."],
        ],
        rule: "Rejected work never appears as verified impact.",
    },
    analytics: {
        desc: "See performance patterns across your supervised Community Service projects.",
        items: [
            ["Projects & Students", "Counts and participation coverage."],
            ["Person-hours", "Verified student service contribution."],
            ["Community Dividend", "Verified volunteer contribution value + verified student out-of-pocket investment."],
            ["Reach & SDGs", "Beneficiaries, outcomes and SDG distribution."],
            ["CII Distribution", "Verified impact-quality profile across projects."],
        ],
        rule: "Analytics aggregate verified/authorised information only.",
    },
};

const VIEW_CRUMB: Partial<Record<CsView, string>> = {
    create: "Create Opportunity",
    review: "Review Opportunities",
    projects: "Community Service Projects",
    reports: "Reports for Review",
    impact: "Community Service Impact",
    analytics: "Analytics",
    guide: "Guide",
    pending: "Reports for Review",
    approved: "Community Service Impact",
};

type MineRow = FacultyCsMineRow;

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
        <div className="mb-3.5 flex flex-wrap gap-1.5">
            {tabs.map((tab) => {
                const on = active === tab.id;
                return (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => onChange(tab.id)}
                        className={
                            "inline-flex items-center gap-1.5 rounded-[18px] border px-3 py-1.5 text-[12px] font-extrabold " +
                            (on
                                ? "border-[#153f47] bg-[#153f47] text-white"
                                : "border-[#dce6ea] bg-white text-[#5c6d76]")
                        }
                    >
                        {tab.label}
                        {typeof tab.count === "number" ? (
                            <span
                                className={
                                    "rounded-[10px] px-1.5 py-0.5 text-[10.5px] font-black " +
                                    (on ? "bg-white/20 text-white" : "bg-[#eef1f2] text-[#5c6d76]")
                                }
                            >
                                {tab.count}
                            </span>
                        ) : null}
                    </button>
                );
            })}
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

function mineBucket(row: MineRow): "drafts" | "review" | "action" | "published" | "closed" {
    const rec = row as unknown as Record<string, unknown>;
    if (normalizeReviewStatus(row.status) === "draft") return "drafts";
    if (canEditReturnedOpportunity(rec)) return "action";
    if (isOpportunityPermanentlyRejected(rec) || ["rejected", "closed"].includes(normalizeReviewStatus(row.status))) return "closed";
    if (isOpportunityPubliclyLive(rec) || normalizeReviewStatus(row.status) === "live") return "published";
    return "review";
}

/** Faculty self-approves at creation, so the visible chain is just Partner (if linked) → CIEL PK → Decision. */
function facultyOwnPipeline(row: MineRow, bucket: ReturnType<typeof mineBucket>) {
    const lines: { label: string; status: ApprovalLineStatus }[] = [
        ...(row.requires_partner_approval
            ? [{ label: "Partner / NGO", status: row.partner_approval_status as ApprovalLineStatus }]
            : []),
        { label: "CIEL PK", status: row.admin_approval_status as ApprovalLineStatus },
    ];
    const decisionState: ApprovalPipelineStepState = bucket === "closed" ? "bad" : bucket === "published" ? "done" : "locked";
    return computeApprovalPipelineSteps(lines, decisionState);
}

/** "Pending Partner" / "Pending CIEL PK" for the Under Approval row status line. */
function facultyPendingStageLabel(row: MineRow): string {
    if (row.requires_partner_approval && !isApprovalLineDone(row.partner_approval_status as ApprovalLineStatus)) {
        const name = row.partner_contact_name?.trim();
        return name ? `Pending Partner — Waiting for ${name}` : "Pending Partner";
    }
    return "Pending CIEL PK — Waiting for final platform approval";
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
    const router = useRouter();
    const tabParam = searchParams.get("tab") || "";
    const {
        loading,
        draftRows,
        mineRows,
        pendingOppRows,
        linkedDraftRows,
        historyOppRows,
        pendingAppRows,
        historyAppRows,
        hoursProjectCount,
        projectRows,
        projectLiveRows,
        activeProjects,
        revisionOpps,
        deckCards,
        pendingOppReviews,
        pendingApps,
        reload,
    } = useFacultyCommunityServiceData();
    const reviewActions = useFacultyOpportunityReviewActions(reload);
    const [remindingId, setRemindingId] = useState<string | null>(null);
    /** "Remind now" on a project card: CIEL PK sends the standard "Complete your report ASAP" message. */
    const remindNow = async (row: FacultyCsReportRow) => {
        if (!row.project_id || remindingId) return;
        setRemindingId(row.id);
        try {
            const result = await postRemindNow("faculty", row.project_id, row.team_members?.length ? null : row.student_email);
            const { ok, message } = describeRemindNowResult(result);
            if (ok) toast.success(message);
            else toast.error(message);
            reload();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Reminder could not be sent.");
        } finally {
            setRemindingId(null);
        }
    };
    const autoOpenedIdRef = useRef<string | null>(null);
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

    // Report review is Admin / University only. Old faculty links land on Projects instead.
    useEffect(() => {
        if (view === "reports" || view === "pending") router.replace(`${CS_BASE}?view=projects`);
    }, [view, router]);

    const opportunityParam = searchParams.get("opportunity") || searchParams.get("id") || "";
    const openOpportunityDetail = reviewActions.openOpportunityDetail;
    useEffect(() => {
        if (!opportunityParam || loading) return;
        if (autoOpenedIdRef.current === opportunityParam) return;
        const inPending = pendingOppRows.some((row) => row.id === opportunityParam);
        autoOpenedIdRef.current = opportunityParam;
        const action = pendingOppRows.find((row) => row.id === opportunityParam)?.approvalAction ?? "faculty_review";
        void openOpportunityDetail(opportunityParam, {
            showActions: inPending,
            approvalAction: action,
        });
    }, [loading, opportunityParam, pendingOppRows, openOpportunityDetail]);

    const setHubTab = (id: string) => {
        setInnerTab(id);
        const params = new URLSearchParams(searchParams.toString());
        params.set("view", view);
        params.set("tab", id);
        params.delete("page");
        router.replace(`${CS_BASE}?${params.toString()}`, { scroll: false });
    };

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
            key: "hours",
            n: hoursProjectCount,
            title: "Projects with members below hours",
            sub: "Send a system reminder",
            href: HOURS,
            tone: hoursProjectCount ? "warn" : "default",
        },
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
    const createRows = useMemo(
        () => mineRows.filter((row) => mineBucket(row) === createTab),
        [mineRows, createTab],
    );
    const createPageCount = Math.max(1, Math.ceil(createRows.length / CREATE_PAGE_SIZE));
    const createPage = Math.min(Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1), createPageCount);
    const pagedCreateRows = createRows.slice((createPage - 1) * CREATE_PAGE_SIZE, createPage * CREATE_PAGE_SIZE);
    const setCreatePage = (next: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("view", "create");
        params.set("tab", createTab);
        if (next <= 1) params.delete("page");
        else params.set("page", String(next));
        router.replace(`${CS_BASE}?${params.toString()}`, { scroll: false });
        requestAnimationFrame(() => {
            document.getElementById("faculty-create-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    };
    const reviewTab = ["linked", "opps", "revision", "apps", "done"].includes(innerTab) ? innerTab : "opps";
    const projectTab = ["active", "progress", "verified", "all"].includes(innerTab) ? innerTab : "active";

    const crumb = VIEW_CRUMB[view];
    const showHomeHero = view === "home";

    return (
        <div className="mx-auto min-w-0 max-w-[1500px] pb-16">
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
                        { value: String(draftRows.length), label: "Reports in progress", href: `${CS_BASE}?view=projects&tab=progress` },
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
                    <UserGuideBanner {...FACULTY_CS_GUIDES.home} />
                    <AttentionRow items={attention} />
                    <MockupSectionHead
                        title="Community Service tools"
                        subtitle="Pick what you want to work on."
                        action={
                            <button
                                type="button"
                                onClick={() => setHelpOpen(true)}
                                className="rounded-full border border-[#dcebee] bg-white px-4 py-2 text-[11px] font-extrabold text-[#0e7d74] hover:border-[#0e7d74]"
                            >
                                How it works
                            </button>
                        }
                    />
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
                            href="/dashboard/faculty/browse"
                            emoji="🔎"
                            ghost="🔎"
                            title="Browse Opportunities"
                            subtitle="Every published Community Service opportunity on CIEL PK — from Faculty, NGOs, Partners, Universities and students. View only."
                            badge="DISCOVER"
                            background={MOCKUP_GRADIENTS.blue}
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
                            alertCount={pendingApprovalsHero}
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
                            href={`${CS_BASE}?view=impact`}
                            emoji="🏅"
                            ghost="🏅"
                            title="Community Service Impact"
                            subtitle="Verified impact from projects you supervised: Flashcards, CII, badges and credentials."
                            badge="VERIFIED"
                            background={MOCKUP_GRADIENTS.green}
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

                    <MockupSectionHead
                        title="Quick Community Impact"
                        subtitle="Short university activities, recorded separately. They do not fulfil the 16-hour requirement."
                    />
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                        <MockupActionCard
                            href={FACULTY_QUICK_WORK_HREF}
                            emoji="⚡"
                            ghost="⚡"
                            title="Quick Community Impact"
                            subtitle="Logs that name you as faculty: review the flashcard, each student's attendance and the evidence, then approve, request revision or reject."
                            badge="FACULTY REVIEW"
                            background={MOCKUP_GRADIENTS.pink}
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
                    <UserGuideBanner {...FACULTY_CS_GUIDES.create} />
                    <p className="mb-4 rounded-[14px] border border-[#dce6ea] bg-[#f7fafb] px-3.5 py-3 text-[12.5px] leading-relaxed text-[#52636e]">
                        <b className="text-[#16313d]">Simple rule:</b> If you created the opportunity, its creator status stays
                        here. Once students are assigned, their service/report progress appears under Community Service Projects.
                    </p>
                    <SummaryTiles
                        tiles={[
                            [String(createCounts.drafts + createCounts.review + createCounts.action), "Active proposal records"],
                            [String(createCounts.review), "Waiting on reviewer"],
                            [String(createCounts.action), "Need your action"],
                            [String(createCounts.published), "Live for students"],
                        ]}
                    />
                    <HubTabs
                        tabs={[
                            { id: "drafts", label: "Drafts", count: createCounts.drafts },
                            { id: "review", label: "Under Approval", count: createCounts.review },
                            { id: "action", label: "Action Required", count: createCounts.action },
                            { id: "published", label: "Published", count: createCounts.published },
                            { id: "closed", label: "Closed", count: createCounts.closed },
                        ]}
                        active={createTab}
                        onChange={setHubTab}
                    />
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading your opportunities…</p>
                    ) : createRows.length === 0 ? (
                        <EmptyPanel
                            title="Nothing here"
                            text={
                                createTab === "drafts"
                                    ? "Faculty drafts are saved on the Create Opportunity form until you submit them to Partner/CIEL PK."
                                    : `No records under ${createTab}.`
                            }
                        />
                    ) : (
                        <div
                            id="faculty-create-list"
                            className="flex min-h-[52vh] flex-col overflow-hidden rounded-[18px] border border-[#dde5ea] bg-white shadow-[0_8px_22px_rgba(24,52,64,.05)]"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e8edef] px-4 py-3">
                                <p className="text-[12.5px] font-semibold text-[#16313d]">
                                    {createRows.length}{" "}
                                    {createTab === "review"
                                        ? "under approval"
                                        : createTab === "action"
                                          ? "action required"
                                          : createTab}
                                </p>
                                <p className="text-[11.5px] text-[#70808a]">
                                    Page {createPage} of {createPageCount}
                                </p>
                            </div>
                            <div className="flex-1 divide-y divide-[#e8edef]">
                                {pagedCreateRows.map((row) => {
                                    const href =
                                        createTab === "drafts" || createTab === "action"
                                            ? `${CREATE_FORM}?edit=${encodeURIComponent(row.id)}${createTab === "drafts" ? "&draft=1" : ""}`
                                            : `${MY_OPPS}?tab=${createTab === "published" ? "live" : createTab === "closed" ? "rejected" : "review"}`;
                                    return (
                                        <div key={row.id} className="relative">
<Link
                                            href={href}
                                            className="flex min-w-0 gap-0 transition hover:bg-[#f7fafb]"
                                        >
                                            <span
                                                aria-hidden
                                                className="w-1.5 shrink-0 bg-[linear-gradient(180deg,#102f3d_0%,#126a67_62%,#a67817_150%)]"
                                            />
                                            <div className="min-w-0 flex-1 px-4 py-3.5 sm:px-5">
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <h3 className="m-0 min-w-0 flex-1 text-[14.5px] font-extrabold leading-snug tracking-tight text-[#16313d]">
                                                        {row.title || "Untitled opportunity"}
                                                    </h3>
                                                    <span className="shrink-0 rounded-full border border-[#dce6ea] bg-[#f7fafb] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#52636e]">
                                                        {createTab === "review"
                                                            ? "Under approval"
                                                            : createTab === "action"
                                                              ? "Action required"
                                                              : createTab === "drafts"
                                                                ? "Draft"
                                                                : createTab === "published"
                                                                  ? "Published"
                                                                  : "Closed"}
                                                    </span>
                                                </div>
                                                <small className="mt-1 block text-[11.5px] text-[#6b7c86]">
                                                    {formatOpportunityCode(row)} ·{" "}
                                                    {createTab === "review" ? facultyPendingStageLabel(row) : row.status || "in review"}
                                                    {row.workflow_stage ? ` · ${row.workflow_stage.replace(/_/g, " ")}` : ""}
                                                </small>
                                                {createTab === "review" || createTab === "published" ? (
                                                    <ApprovalPipelineMini steps={facultyOwnPipeline(row, createTab)} />
                                                ) : null}
                                            </div>
                                        </Link>
                                        {createTab !== "drafts" ? (
                                            <Link
                                                href={`${CREATE_FORM}?duplicate=${encodeURIComponent(row.id)}`}
                                                title="Duplicate — create a new opportunity from this one"
                                                className="absolute bottom-3 right-4 rounded-full border border-[#d9e3e7] bg-white px-3 py-1 text-[11px] font-extrabold text-[#126a67] shadow-sm hover:bg-[#f7fafb]"
                                            >
                                                Duplicate
                                            </Link>
                                        ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                            {createPageCount > 1 ? (
                                <div className="border-t border-[#e8edef] px-4 py-2">
                                    <PaginationControls
                                        currentPage={createPage}
                                        totalPages={createPageCount}
                                        onPageChange={setCreatePage}
                                        totalItems={createRows.length}
                                        itemsPerPage={CREATE_PAGE_SIZE}
                                    />
                                </div>
                            ) : null}
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
                    <UserGuideBanner {...FACULTY_CS_GUIDES.review} />
                    <HubTabs
                        tabs={[
                            { id: "linked", label: "Linked Drafts", count: linkedDraftRows.length },
                            { id: "opps", label: "Pending my approval", count: pendingOppReviews },
                            { id: "revision", label: "Revision with student", count: revisionOpps.length },
                            { id: "apps", label: "Participation requests", count: pendingApps },
                            { id: "done", label: "Decided", count: historyOppRows.length + historyAppRows.length },
                        ]}
                        active={reviewTab}
                        onChange={setHubTab}
                    />
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading reviews…</p>
                    ) : reviewTab === "linked" ? (
                        linkedDraftRows.length === 0 ? (
                            <EmptyPanel title="No linked drafts" text="When a student names you on an unsaved draft, the same Opportunity ID appears here. Approve is locked until they submit." />
                        ) : (
                            <div className="grid gap-3">
                                {linkedDraftRows.map((row) => {
                                    const model = buildOpportunityApprovalModel(
                                        {
                                            id: row.id,
                                            title: row.projectTitle,
                                            student_name: row.studentName,
                                            version: row.version,
                                            faculty_approval_status: row.facultyApprovalStatus,
                                            partner_approval_status: row.partnerApprovalStatus,
                                            admin_approval_status: row.adminApprovalStatus,
                                            requires_partner_approval: row.requiresPartnerApproval,
                                            created_by_role: row.createdByRole,
                                            status: row.opportunityStatus,
                                            workflow_stage: row.workflowStage,
                                            public_code: row.publicCode,
                                            currently_with: row.currentlyWith,
                                            currently_with_role: row.currentlyWithRole,
                                            next_step: row.nextStep,
                                            waiting_since: row.waitingSince,
                                            linked_draft: true,
                                            isStudentCreated: true,
                                        },
                                        "faculty",
                                        { mode: "waiting" },
                                    );
                                    return (
                                        <OpportunityApprovalCard
                                            key={row.id}
                                            {...model}
                                            actions={
                                                <button
                                                    type="button"
                                                    className={approvalActionClass.soft}
                                                    onClick={() =>
                                                        void reviewActions.openOpportunityDetail(row.id, { showActions: false })
                                                    }
                                                >
                                                    View same record
                                                </button>
                                            }
                                        />
                                    );
                                })}
                            </div>
                        )
                    ) : reviewTab === "opps" ? (
                        pendingOppRows.length === 0 ? (
                            <EmptyPanel title="No opportunities pending" text="New student submissions appear here with their Flashcard." />
                        ) : (
                            <div className="grid gap-3">
                                {pendingOppRows.map((row) => {
                                    const model = buildOpportunityApprovalModel(
                                        {
                                            id: row.id,
                                            title: row.projectTitle,
                                            student_name: row.studentName,
                                            version: row.version,
                                            faculty_approval_status: row.facultyApprovalStatus,
                                            partner_approval_status: row.partnerApprovalStatus,
                                            admin_approval_status: row.adminApprovalStatus,
                                            requires_partner_approval: row.requiresPartnerApproval,
                                            created_by_role: row.createdByRole,
                                            status: row.opportunityStatus,
                                            workflow_stage: row.workflowStage,
                                            total_hours: row.totalHours,
                                            submitted_at: row.submittedDate,
                                            public_code: row.publicCode,
                                            currently_with: row.currentlyWith,
                                            currently_with_role: row.currentlyWithRole,
                                            next_step: row.nextStep,
                                            waiting_since: row.waitingSince,
                                            isStudentCreated: true,
                                        },
                                        "faculty",
                                        { mode: "pending" },
                                    );
                                    return (
                                        <OpportunityApprovalCard
                                            key={row.id}
                                            {...model}
                                            actions={
                                                <FacultyPendingReviewButtons
                                                    opportunityId={row.id}
                                                    approvalAction={row.approvalAction ?? "faculty_review"}
                                                    approveSubmittingId={reviewActions.approveSubmittingId}
                                                    onOpenFlashcard={(id, action) =>
                                                        void reviewActions.openOpportunityDetail(id, {
                                                            showActions: true,
                                                            approvalAction: action,
                                                        })
                                                    }
                                                    onRevise={(id, action) =>
                                                        reviewActions.openRejectDialog(id, action, "revise")
                                                    }
                                                    onReject={(id, action) =>
                                                        reviewActions.openRejectDialog(id, action, "reject_permanent")
                                                    }
                                                />
                                            }
                                        />
                                    );
                                })}
                            </div>
                        )
                    ) : reviewTab === "revision" ? (
                        revisionOpps.length === 0 ? (
                            <EmptyPanel title="None" text="Proposals you returned for correction stay visible here." />
                        ) : (
                            <div className="grid gap-3">
                                {revisionOpps.map((row) => {
                                    const model = buildOpportunityApprovalModel(
                                        {
                                            id: row.id,
                                            title: row.projectTitle,
                                            student_name: row.studentName,
                                            version: row.version,
                                            faculty_approval_status: row.facultyApprovalStatus,
                                            partner_approval_status: row.partnerApprovalStatus,
                                            admin_approval_status: row.adminApprovalStatus,
                                            requires_partner_approval: row.requiresPartnerApproval,
                                            status: row.opportunityStatus,
                                            workflow_stage: row.workflowStage,
                                            isStudentCreated: true,
                                        },
                                        "faculty",
                                        { mode: "revision" },
                                    );
                                    return (
                                        <div key={row.id}>
                                            <OpportunityApprovalCard
                                                {...model}
                                                actions={
                                                    <button
                                                        type="button"
                                                        className={approvalActionClass.soft}
                                                        onClick={() =>
                                                            void reviewActions.openOpportunityDetail(row.id, {
                                                                showActions: false,
                                                            })
                                                        }
                                                    >
                                                        View Flashcard
                                                    </button>
                                                }
                                            />
                                            <RemindButtons email={row.studentEmail} title={row.projectTitle} roleLabel="your faculty supervisor" />
                                        </div>
                                    );
                                })}
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
                        <div className="grid gap-3">
                            {historyOppRows.map((row) => {
                                const model = buildOpportunityApprovalModel(
                                    {
                                        id: row.id,
                                        title: row.projectTitle,
                                        student_name: row.studentName,
                                        version: row.version,
                                        faculty_approval_status: row.facultyApprovalStatus,
                                        partner_approval_status: row.partnerApprovalStatus,
                                        admin_approval_status: row.adminApprovalStatus,
                                        requires_partner_approval: row.requiresPartnerApproval,
                                        status: row.opportunityStatus,
                                        workflow_stage: row.workflowStage,
                                        isStudentCreated: true,
                                    },
                                    "faculty",
                                    { mode: "decided" },
                                );
                                return (
                                    <OpportunityApprovalCard
                                        key={`opp-${row.id}`}
                                        {...model}
                                        actions={
                                            <button
                                                type="button"
                                                className={approvalActionClass.soft}
                                                onClick={() =>
                                                    void reviewActions.openOpportunityDetail(row.id, { showActions: false })
                                                }
                                            >
                                                View Flashcard
                                            </button>
                                        }
                                    />
                                );
                            })}
                            {historyAppRows.map((row) => (
                                <CommunityQueueCard
                                    key={`app-${row.id}`}
                                    href={`${JOIN_APPS}?tab=history`}
                                    title={`${row.studentName} → ${row.opportunityTitle}`}
                                    student={row.studentEmail || row.studentName}
                                    tone="approved"
                                    cta="History →"
                                />
                            ))}
                        </div>
                    )}
                    <p className="mt-4 text-[11px] text-[#7a919a]">
                        Opportunity review and participation approval are separate decisions.{" "}
                        <Link href={`${CS_BASE}?view=review&tab=apps`} className="font-extrabold text-[#0e7d74] hover:underline">
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
                    <UserGuideBanner {...FACULTY_CS_GUIDES.projects} />
                    <HubTabs
                        tabs={[
                            { id: "active", label: "Active", count: activeProjects.length },
                            { id: "progress", label: "In progress", count: draftRows.length },
                            { id: "verified", label: "Verified", count: projectLiveRows.length },
                            { id: "all", label: "All", count: projectRows.length },
                        ]}
                        active={projectTab}
                        onChange={setHubTab}
                    />
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading projects…</p>
                    ) : projectTab === "progress" ? (
                        draftRows.length === 0 ? (
                            <EmptyPanel title="Nothing in progress" text="Reports your students have started but not submitted appear here with how much is filled. A report opens for you only after the student submits it." />
                        ) : (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {draftRows.map((row) => (
                                    <ReportProgressCard
                                        key={row.id}
                                        title={row.project_title}
                                        student={row.student_name}
                                        org={row.organization_name}
                                        hours={row.hours}
                                        progressPct={row.progress_pct}
                                        sectionsComplete={row.sections_complete}
                                        sectionsTotal={row.sections_total}
                                    />
                                ))}
                            </div>
                        )
                    ) : (
                        (() => {
                            const list =
                                projectTab === "verified"
                                    ? projectLiveRows
                                    : projectTab === "all"
                                      ? projectRows
                                      : activeProjects;
                            if (!list.length) {
                                return <EmptyPanel title="Nothing here" text="Approved engagements appear here once students are assigned." />;
                            }
                            return (
                                <div className="grid grid-cols-1 gap-4">
                                    {list.map((row) => (
                                        <ProjectMonitorCard
                                            key={row.id}
                                            row={row}
                                            reportHrefFor={(r) => projectReportHref(r, REPORTS)}
                                            hoursHrefFor={(projectId) => `${HOURS}?projectId=${encodeURIComponent(projectId)}`}
                                            onViewFlashcard={(projectId) =>
                                                void reviewActions.openOpportunityDetail(projectId, { showActions: false })
                                            }
                                            remind={{ roleLabel: "your faculty supervisor", onRemindNow: remindNow, busy: remindingId === row.id }}
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


            {(view === "impact" || view === "approved") && (
                <div>
                    <MockupSectionHead
                        title="My Impact Wall"
                        subtitle="Published records after CIEL PK Admin approval: flashcard, CII, detailed report, PDF, combined package. QR is on the Impact Package. No certificate download."
                        action={
                            <Link href={IMPACT} className="text-xs font-black text-[#087c75] hover:underline">
                                Open Impact Wall →
                            </Link>
                        }
                    />
                    <UserGuideBanner {...FACULTY_CS_GUIDES.impact} />
                    {loading ? (
                        <p className="mt-4 text-sm text-slate-500">Loading…</p>
                    ) : deckCards.length === 0 ? (
                        <p className="mt-4 text-sm text-slate-500">Rejected work never appears as verified impact. Approved cards appear here after CIEL PK publishes the package.</p>
                    ) : (
                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {deckCards.map((c) => (
                                            <CommunityFlashCard
                                                key={c.id}
                                                card={c}
                                                href={`${REPORTS}/${c.id}`}
                                                viewer="faculty"
                                                packageHrefs={{
                                    detailedPdf: `${REPORTS}/${c.id}?view=dossier&doc=report`,
                                    combinedPdf: `${REPORTS}/${c.id}?view=dossier`,
                                                    verify: c.impact_verify_url || undefined,
                                                }}
                                            />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {view === "analytics" && (
                <div className="space-y-3">
                    <MockupSectionHead
                        title={`Analytics · ${facultyName}'s projects`}
                        subtitle="Person-hours, Community Dividend, reach, SDGs and CII patterns from the live deck."
                    />
                    <UserGuideBanner {...FACULTY_CS_GUIDES.analytics} />
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

            {/* Opportunity flashcard / decision dialogs: mounted once so Review AND Projects can open them. */}
            {reviewActions.dialogs}

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
                                <b>Reports</b> — System CII is provisional until Faculty approval. The Analyzer runs only when Faculty triggers it.
                            </p>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
