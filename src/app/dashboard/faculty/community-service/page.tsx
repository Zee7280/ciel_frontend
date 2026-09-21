"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CommunityCrumb, HubBackButton, UserGuideBanner, ZoneRule } from "@/components/ciel/community-service/CommunityServiceHubChrome";
import {
    ApprovalPipelineMini,
    SummaryTiles,
    computeApprovalPipelineSteps,
    isApprovalLineDone,
    type ApprovalLineStatus,
    type ApprovalPipelineStepState,
} from "@/components/ciel/community-service/CommunityServiceHubChrome";
import { FacultyCsInbox } from "@/components/ciel/community-service/FacultyCsInbox";
import {
    FACULTY_CS_APPROVALS as APPROVALS,
    FACULTY_CS_BASE as CS_BASE,
    FACULTY_CS_HOURS as HOURS,
    FACULTY_CS_JOIN_APPS as JOIN_APPS,
    FACULTY_CS_REPORTS as REPORTS,
    useFacultyCommunityServiceData,
    type FacultyCsMineRow,
} from "./useFacultyCommunityServiceData";
import { mailtoHref, whatsappShareHref } from "@/utils/reminderLinks";
import { useFacultyHubView } from "@/components/ciel/coursework/CourseworkHubChrome";
import { FACULTY_HERO, MOCKUP_GRADIENTS, MockupActionCard, MockupHero, MockupSectionHead } from "@/components/ciel/dashboard/MockupChrome";
import CommunityAwardPanel from "@/components/ciel/community-service/CommunityAwardPanel";
import CommunityAwardAnalytics from "@/components/ciel/community-service/CommunityAwardAnalytics";
import CommunityFlashCard from "@/components/ciel/community-service/CommunityFlashCard";
import CommunityQueueCard from "@/components/ciel/community-service/CommunityQueueCard";
import StudentCommunityGuide from "@/components/report/StudentCommunityGuide";
import { isFacultyCommunityLiveCard, normalizeReviewStatus } from "@/utils/reviewQueue";
import { canEditReturnedOpportunity, isOpportunityPermanentlyRejected, isOpportunityPubliclyLive } from "@/utils/opportunityWorkflow";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { readFacultyScopeSession } from "@/utils/facultyScopeSession";
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

const CREATE_FORM = "/dashboard/faculty/create-opportunity";
const MY_OPPS = "/dashboard/faculty/my-opportunities";
const IMPACT = "/dashboard/faculty/impact?tab=community";

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
        desc: "Final academic review of submitted Community Service Reports.",
        items: [
            ["Pending Review", "Reports where AI analysis is complete and your decision is required."],
            ["Revision with Student", "Reports returned for correction."],
            ["Decided", "Approved or rejected report decisions retained for history."],
            ["CII Breakdown", "Review the provisional AI assessment and evidence logic."],
            ["Approve / Revise / Reject", "Your final academic report decision; moderation requires a recorded reason."],
        ],
        rule: "AI CII is provisional until Faculty approval.",
    },
    impact: {
        desc: "Verified impact from projects you supervised.",
        items: [
            ["Impact Wall", "Verified visible records under the permitted visibility setting."],
            ["Flashcard & Credentials", "Open the verified project summary, CII, badge, certificate and QR."],
        ],
        rule: "Rejected work never appears as verified impact.",
    },
    run: {
        desc: "Analyse and rank verified projects in your permitted faculty cohort.",
        items: [
            ["Ranking Preview", "Run dynamic analysis without creating a permanent award."],
            ["Official Run", "Create a dated official cohort ranking, subject to role limits."],
            ["Why It Ranks", "Evidence-backed explanation for each position."],
            ["Ranking History", "Preserves previous official runs."],
        ],
        rule: "Faculty scope is limited to projects connected to the faculty member.",
    },
    files: {
        desc: "One place for every analysis file shared across stakeholders.",
        items: [
            ["Faculty Analysis", "The faculty decision file for each submitted report: decision, CII accepted or moderated, reason, comments."],
            ["AI Analyzer reports", "The latest dated AI Analyzer badge and run history for each project."],
            ["Open / Download", "View inside the dashboard, print, or download the file."],
        ],
        rule: "Files are shared automatically — nobody has to send them.",
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
    files: "Shared Analysis Files",
    run: "AI Analyzer & Rankings",
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

function FacultyRemindButtons({ email, title }: { email?: string | null; title: string }) {
    const to = email && email.includes("@") ? email : "";
    const subject = `Community Service reminder — ${title}`;
    const body = `A reminder from your faculty supervisor about “${title}”. Please continue the pending Community Service step in your signed-in CIEL PK dashboard.`;
    return (
        <div className="mt-1.5 flex flex-wrap gap-2">
            <a href={mailtoHref(to, subject, body)} className="rounded-full bg-[#edf4fb] px-3 py-1.5 text-[11px] font-extrabold text-[#376d9f]">
                ✉ Remind
            </a>
            <a href={whatsappShareHref(body)} className="rounded-full bg-[#e8f8ee] px-3 py-1.5 text-[11px] font-extrabold text-[#1f7a46]">
                WhatsApp
            </a>
        </div>
    );
}

function mineBucket(row: MineRow): "drafts" | "review" | "action" | "published" | "closed" {
    const rec = row as unknown as Record<string, unknown>;
    if (normalizeReviewStatus(row.status) === "draft") return "drafts";
    if (canEditReturnedOpportunity(rec)) return "action";
    if (isOpportunityPermanentlyRejected(rec) || normalizeReviewStatus(row.status) === "rejected") return "closed";
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
        rows,
        mineRows,
        pendingOppRows,
        historyOppRows,
        pendingAppRows,
        historyAppRows,
        hoursProjectCount,
        liveRows,
        pendingReports,
        revisionReports,
        decidedReports,
        activeProjects,
        revisionOpps,
        deckCards,
        inboxItems,
        pendingOppReviews,
        pendingApps,
    } = useFacultyCommunityServiceData();
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

    const setHubTab = (id: string) => {
        setInnerTab(id);
        const params = new URLSearchParams(searchParams.toString());
        params.set("view", view);
        params.set("tab", id);
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
                    <UserGuideBanner {...FACULTY_CS_GUIDES.home} />
                    <ZoneRule title="Navigation rule">
                        You entered Community Service from the left. Everything below belongs to this impact area; Home remains a
                        clean overview. Create and creator-statuses stay in Create Opportunity; student approvals stay in Review;
                        approved work stays in Projects/Reports.
                    </ZoneRule>
                    <div className="mt-4">
                        <FacultyCsInbox items={inboxItems} loading={loading} />
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
                                    .map((row) => {
                                        const href =
                                            createTab === "drafts" || createTab === "action"
                                                ? `${CREATE_FORM}?edit=${encodeURIComponent(row.id)}`
                                                : `${MY_OPPS}?tab=${createTab === "published" ? "live" : createTab === "closed" ? "rejected" : "review"}`;
                                        return (
                                        <Link
                                            key={row.id}
                                            href={href}
                                            className="block rounded-2xl border border-[#dde5ea] bg-white px-4 py-3.5 transition hover:border-[#bcd4d8]"
                                        >
                                            <b className="block text-[14px] text-[#16313d]">{row.title}</b>
                                            <small className="mt-1 block text-[11.5px] text-[#6b7c86]">
                                                {formatDisplayId(row.id, "OPP")} ·{" "}
                                                {createTab === "review" ? facultyPendingStageLabel(row) : row.status || "in review"}
                                                {row.workflow_stage ? ` · ${row.workflow_stage.replace(/_/g, " ")}` : ""}
                                            </small>
                                            {createTab === "review" || createTab === "published" ? (
                                                <ApprovalPipelineMini steps={facultyOwnPipeline(row, createTab)} />
                                            ) : null}
                                        </Link>
                                        );
                                    })
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
                    <UserGuideBanner {...FACULTY_CS_GUIDES.review} />
                    <HubTabs
                        tabs={[
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
                                    <div key={row.id}>
                                        <CommunityQueueCard
                                            href={`${APPROVALS}?tab=history&opportunity=${encodeURIComponent(row.id)}`}
                                            title={row.projectTitle}
                                            student={row.studentName}
                                            cta="Open record →"
                                        />
                                        <FacultyRemindButtons email={row.studentEmail} title={row.projectTitle} />
                                    </div>
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
                                    key={`opp-${row.id}`}
                                    href={`${APPROVALS}?tab=history&opportunity=${encodeURIComponent(row.id)}`}
                                    title={row.projectTitle}
                                    student={row.studentName}
                                    tone="approved"
                                    cta="History →"
                                />
                            ))}
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
                    <UserGuideBanner {...FACULTY_CS_GUIDES.projects} />
                    <HubTabs
                        tabs={[
                            { id: "active", label: "Active", count: activeProjects.length },
                            { id: "verified", label: "Verified", count: liveRows.length },
                            { id: "all", label: "All", count: rows.length },
                        ]}
                        active={projectTab}
                        onChange={setHubTab}
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
                                        <div key={row.id}>
                                            <CommunityQueueCard
                                                href={`${REPORTS}/${row.id}`}
                                                title={row.project_title}
                                                student={row.student_name}
                                                org={row.organization_name}
                                                hours={row.hours}
                                                tone={isFacultyCommunityLiveCard(row) ? "approved" : "waiting"}
                                                cta="View progress →"
                                            />
                                            {isFacultyCommunityLiveCard(row) ? null : (
                                                <FacultyRemindButtons email={row.student_email} title={row.project_title} />
                                            )}
                                        </div>
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
                    <UserGuideBanner {...FACULTY_CS_GUIDES.reports} />
                    <HubTabs
                        tabs={[
                            { id: "pending", label: "Pending review", count: pendingReports.length },
                            { id: "rev", label: "Revision with student", count: revisionReports.length },
                            { id: "done", label: "Decided", count: decidedReports.length },
                        ]}
                        active={view === "pending" ? "pending" : reportTab}
                        onChange={setHubTab}
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
                                        <div key={row.id}>
                                            <CommunityQueueCard
                                                href={`${REPORTS}/${row.id}`}
                                                title={row.project_title}
                                                student={row.student_name}
                                                org={row.organization_name}
                                                hours={row.hours}
                                                tone={isFacultyCommunityLiveCard(row) ? "approved" : "waiting"}
                                                cta="Open report →"
                                            />
                                            {reportTab === "rev" ? (
                                                <FacultyRemindButtons email={row.student_email} title={row.project_title} />
                                            ) : null}
                                        </div>
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
                    <UserGuideBanner {...FACULTY_CS_GUIDES.impact} />
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
                    <UserGuideBanner {...FACULTY_CS_GUIDES.files} />
                    <HubTabs
                        tabs={[
                            { id: "faculty", label: "Faculty Analysis files", count: decidedReports.length },
                            { id: "ai", label: "AI Analyzer reports", count: deckCards.filter((c) => c.cii != null).length },
                        ]}
                        active={filesTab}
                        onChange={setHubTab}
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
                    <UserGuideBanner {...FACULTY_CS_GUIDES.run} />
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
