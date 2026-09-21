"use client";

import { useEffect, useState } from "react";
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
import { useFacultyHubView } from "@/components/ciel/coursework/CourseworkHubChrome";
import { COMMAND_HERO, MOCKUP_GRADIENTS, MockupActionCard, MockupHero, MockupSectionHead } from "@/components/ciel/dashboard/MockupChrome";
import CommunityAwardPanel from "@/components/ciel/community-service/CommunityAwardPanel";
import CommunityAwardAnalytics from "@/components/ciel/community-service/CommunityAwardAnalytics";
import CommunityFlashCard from "@/components/ciel/community-service/CommunityFlashCard";
import CommunityQueueCard from "@/components/ciel/community-service/CommunityQueueCard";
import CommunityCiiBreakdownModal from "@/components/ciel/community-service/CommunityCiiBreakdownModal";
import { isFacultyCommunityLiveCard } from "@/utils/reviewQueue";
import { formatDisplayId } from "@/utils/displayIds";
import { mailtoHref, whatsappShareHref } from "@/utils/reminderLinks";
import {
    NGO_CS_ANALYTICS as ANALYTICS,
    NGO_CS_APPROVALS as APPROVALS,
    NGO_CS_BASE as CS_BASE,
    NGO_CS_CREATE_FORM as CREATE_FORM,
    NGO_CS_HOME as HOME,
    NGO_CS_HOURS as HOURS,
    NGO_CS_IMPACT as IMPACT,
    NGO_CS_MY_OPPS as MY_OPPS,
    NGO_CS_REPORTS as REPORTS,
    ngoMineBucket as mineBucket,
    ngoPickNum as pickNum,
    ngoPickStr as pickStr,
    useNgoCommunityServiceData,
    type OppRow,
} from "./useNgoCommunityServiceData";

const CS_VIEWS = ["home", "create", "approvals", "projects", "impact", "files", "run", "analytics", "pending", "approved"] as const;
type CsView = (typeof CS_VIEWS)[number];

const VIEW_CRUMB: Partial<Record<CsView, string>> = {
    create: "Create Opportunity",
    approvals: "Approvals",
    projects: "Community Service Projects",
    impact: "My Impact",
    files: "Shared Analysis Files",
    run: "AI Analyzer & Rankings",
    analytics: "Analytics",
    pending: "Approvals",
    approved: "My Impact",
};

const GUIDES: Record<string, { title: string; desc: string; items?: [string, string][]; rule: string }> = {
    home: {
        title: "NGO / Nonprofit Community Service Hub",
        desc: "Everything your NGO / nonprofit does in Community Service is grouped here: create, approve, monitor, verify impact and analyse.",
        rule: "Home stays an organization overview; Community Service operations stay inside this hub.",
    },
    create: {
        title: "Create Opportunity",
        desc: "Create and manage NGO / Nonprofit-created opportunities through CIEL PK review and publication.",
        items: [
            ["Create New Opportunity", "Open the NGO / Nonprofit Opportunity Form. Faculty linkage is optional."],
            ["Drafts", "Saved opportunities not yet submitted."],
            ["Under Approval", "Submitted opportunities waiting for CIEL PK review."],
            ["Action Required", "Revisions returned to your organization for correction."],
            ["Published", "Approved opportunities visible to eligible students."],
            ["Closed", "Expired/rejected/closed creator records retained for history."],
        ],
        rule: "Your own creator lifecycle stays inside Create Opportunity.",
    },
    approvals: {
        title: "Approvals",
        desc: "Review opportunities created by others that name your NGO as a linked organization.",
        items: [
            ["Pending Approval / Acknowledgement", "Records waiting for your organization’s consent or decision."],
            ["Open Flashcard", "Review the opportunity students will eventually see."],
            ["Approve / Acknowledge", "Confirm organizational participation and route the record onward."],
            ["Request Revision", "Return the opportunity with a clear required correction."],
            ["Reject", "Decline the organization’s involvement."],
        ],
        rule: "Nothing should use the organization’s name without authorization.",
    },
    projects: {
        title: "Community Service Projects",
        desc: "Monitor approved projects linked to your organization.",
        items: [
            ["Active", "Projects currently delivering service or completing reports."],
            ["Verified", "Completed verified impact records."],
            ["All", "Complete linked project history."],
            ["View Progress", "Report %, last activity and authorised member-hour status."],
            ["Send Reminder", "System-generated follow-up without exposing raw private student contact data."],
        ],
        rule: "The supervising Faculty remains responsible for academic report approval.",
    },
    impact: {
        title: "My Impact",
        desc: "Verified Community Service impact linked to your NGO.",
        items: [
            ["Impact Wall", "Verified visible records under the permitted visibility setting."],
            ["Flashcard & Credentials", "Open the verified project summary, CII, badge, certificate and QR."],
        ],
        rule: "Rejected work never appears as verified impact.",
    },
    files: {
        title: "Shared Analysis Files",
        desc: "One place for every analysis file shared across stakeholders.",
        items: [
            ["Faculty Analysis", "The faculty decision file for each submitted report: decision, CII accepted or moderated, reason, comments."],
            ["AI Analyzer reports", "The latest dated AI Analyzer badge and run history for each project."],
            ["Open / Download", "View inside the dashboard, print, or download the file."],
        ],
        rule: "Files are shared automatically — nobody has to send them.",
    },
    run: {
        title: "AI Analyzer & Rankings",
        desc: "Analyse/rank verified projects linked to your NGO within permitted cohorts.",
        items: [
            ["Ranking Preview", "Run dynamic analysis without creating a permanent award."],
            ["Official Run", "Create a dated official cohort ranking, subject to role limits."],
            ["Why It Ranks", "Evidence-backed explanation for each position."],
        ],
        rule: "Faculty remains the academic report approver; rankings use verified records only.",
    },
    analytics: {
        title: "Analytics",
        desc: "Understand the Community Service contribution associated with your organization.",
        items: [
            ["Projects / Students", "Linked participation."],
            ["Person-hours", "Verified service contribution."],
            ["Community Dividend", "Verified contribution value."],
            ["Reach / SDGs", "Beneficiaries and SDG alignment."],
            ["CII / Impact Levels", "Quality profile of linked verified work."],
        ],
        rule: "Analytics respect record visibility and authorization.",
    },
};

function NgoRemindButtons({ email, title }: { email?: string | null; title: string }) {
    const to = email && email.includes("@") ? email : "";
    const subject = `Community Service reminder — ${title}`;
    const body = `A reminder from your linked NGO / nonprofit about “${title}”. Please continue the pending Community Service step in your signed-in CIEL PK dashboard.`;
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

function reportHref(id: string) {
    return `/dashboard/partner/verify/${encodeURIComponent(id)}`;
}

const TONE_CLASS = {
    default: "text-[#0e4d4e]",
    warn: "text-[#9a6410]",
    bad: "text-[#b34c4c]",
} as const;

function AttentionRow({
    items,
}: {
    items: { key: string; n: number; title: string; sub: string; href: string; tone?: keyof typeof TONE_CLASS }[];
}) {
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

/**
 * The NGO/org itself is the creator (not an approval line against itself), so the visible chain
 * is just an optional external co-host acknowledgement → CIEL PK → Decision.
 */
function ngoOwnPipeline(row: OppRow, bucket: "drafts" | "review" | "action" | "published" | "closed") {
    const requiresPartner = Boolean(row.requires_partner_approval);
    const lines: { label: string; status: ApprovalLineStatus }[] = [
        ...(requiresPartner
            ? [{ label: "Co-host org", status: (row.partner_approval_status ?? row.partner_status) as ApprovalLineStatus }]
            : []),
        { label: "CIEL PK", status: row.admin_approval_status as ApprovalLineStatus },
    ];
    const decisionState: ApprovalPipelineStepState = bucket === "closed" ? "bad" : bucket === "published" ? "done" : "locked";
    return computeApprovalPipelineSteps(lines, decisionState);
}

/** Same contact resolution the backend uses for the student "mine" list — read here straight off
 * the raw `partner_organization`/`supervision` JSON `findAll` already returns on every row. */
function resolveNgoCoHostContactName(row: OppRow): string | null {
    const po = row.partner_organization && typeof row.partner_organization === "object" ? (row.partner_organization as Record<string, unknown>) : null;
    const sup = row.supervision && typeof row.supervision === "object" ? (row.supervision as Record<string, unknown>) : null;
    const candidates = [po?.contact_person, po?.contact_person_name, sup?.partner_contact_person];
    for (const c of candidates) {
        if (typeof c === "string" && c.trim()) return c.trim();
    }
    return null;
}

function ngoPendingStageLabel(row: OppRow): string {
    const requiresPartner = Boolean(row.requires_partner_approval);
    const partnerStatus = (row.partner_approval_status ?? row.partner_status) as ApprovalLineStatus;
    if (requiresPartner && !isApprovalLineDone(partnerStatus)) {
        const name = resolveNgoCoHostContactName(row);
        return name ? `Pending co-host acknowledgement — Waiting for ${name}` : "Pending co-host acknowledgement";
    }
    return "Pending CIEL PK — Waiting for final platform approval";
}

export default function NgoCommunityServiceHub() {
    const { view, homeHref } = useFacultyHubView(CS_VIEWS, "home");
    const searchParams = useSearchParams();
    const router = useRouter();
    const tabParam = searchParams.get("tab") || "";
    const {
        loading,
        orgName,
        mine,
        pendingApprovals,
        revisionApprovals,
        decidedApprovals,
        publishedMine,
        createCounts,
        applicationsOnMine,
        pipeline,
        waiting,
        liveRows,
        decidedReports,
        deckCards,
        inboxItems,
    } = useNgoCommunityServiceData();
    const [innerTab, setInnerTab] = useState("");
    const [helpOpen, setHelpOpen] = useState(false);
    const [breakdownFor, setBreakdownFor] = useState<{ id: string; title: string } | null>(null);

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

    const defaultCreateTab =
        createCounts.action ? "action" : createCounts.review ? "review" : createCounts.drafts ? "drafts" : "published";
    const createTab = (["drafts", "review", "action", "published", "closed"].includes(innerTab) ? innerTab : defaultCreateTab) as
        | "drafts"
        | "review"
        | "action"
        | "published"
        | "closed";
    const approvalTab = ["pending", "rev", "done"].includes(innerTab) ? innerTab : "pending";
    const projectTab = ["active", "verified", "all"].includes(innerTab) ? innerTab : "active";
    const filesTab = innerTab === "ai" ? "ai" : "faculty";
    const crumb = VIEW_CRUMB[view];
    const guideKey = view === "pending" ? "approvals" : view === "approved" ? "impact" : view;
    const guide = GUIDES[guideKey] || GUIDES.home;


    const attention = [
        {
            key: "approvals",
            n: pendingApprovals.length,
            title: "Approvals waiting",
            sub: `Opportunities naming ${orgName}`,
            href: `${CS_BASE}?view=approvals&tab=pending`,
            tone: pendingApprovals.length ? ("bad" as const) : ("default" as const),
        },
        {
            key: "progress",
            n: waiting.length,
            title: "Linked reports in progress",
            sub: "Monitor completion · send reminders",
            href: `${CS_BASE}?view=projects&tab=active`,
            tone: waiting.length ? ("warn" as const) : ("default" as const),
        },
        {
            key: "apps",
            n: applicationsOnMine,
            title: "Applications on my opportunities",
            sub: "Approved by supervising faculty",
            href: `${CS_BASE}?view=create&tab=published`,
            tone: "default" as const,
        },
        {
            key: "impact",
            n: deckCards.length,
            title: "Verified impact records",
            sub: "Linked to your organization",
            href: `${CS_BASE}?view=impact`,
            tone: "default" as const,
        },
    ];

    return (
        <div className="mx-auto max-w-[1500px] pb-16">
            <CommunityCrumb role="NGO / Nonprofit" view={crumb} />

            {view === "home" ? (
                <MockupHero
                    kicker={`Community Service · NGO / Nonprofit`}
                    title={`${orgName} · Community Service`}
                    subtitle="Create opportunities, approve records that name your organization, monitor linked projects and showcase verified impact."
                    gradient={COMMAND_HERO}
                    stats={[
                        { value: String(pendingApprovals.length), label: "Pending approvals", href: `${CS_BASE}?view=approvals` },
                        { value: String(publishedMine.length), label: "Published opportunities", href: `${CS_BASE}?view=create&tab=published` },
                        { value: String(pipeline.length), label: "Linked projects", href: `${CS_BASE}?view=projects` },
                        { value: String(deckCards.length), label: "Verified impact", href: `${CS_BASE}?view=impact` },
                    ]}
                    rightStat={{ value: "🌍", label: "Community Service hub" }}
                />
            ) : (
                <div className="mt-4">
                    <HubBackButton href={homeHref} label="← Back to Community Service" />
                </div>
            )}

            {view === "home" && (
                <>
                    <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <h2 className="m-0 text-[21px] font-semibold text-[#16313d]">Community Service</h2>
                            <p className="mt-1 max-w-[820px] text-[12.5px] text-[#70808a]">
                                Everything your NGO does in Community Service is grouped here. Creator lifecycle stays in Create
                                Opportunity; external approvals stay in Approvals; execution stays in Projects.
                            </p>
                        </div>
                        <Link
                            href={HOME}
                            className="rounded-full border border-[#dcebee] bg-white px-4 py-2 text-[11px] font-extrabold text-[#0e7d74] hover:border-[#0e7d74]"
                        >
                            ← Back to Home
                        </Link>
                    </div>

                    <UserGuideBanner desc={GUIDES.home.desc} rule={GUIDES.home.rule} />
                    <ZoneRule title="Navigation rule">
                        You entered Community Service from the left. Everything below belongs to this impact area; Home remains a
                        clean overview.
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
                            subtitle="Create an NGO opportunity and manage Drafts, Under Approval, Action Required, Published and Closed."
                            badge="CREATE + TRACK"
                            background={MOCKUP_GRADIENTS.teal}
                        />
                        <MockupActionCard
                            href={`${CS_BASE}?view=approvals`}
                            emoji="✅"
                            ghost="✅"
                            title="Approvals"
                            subtitle="Approve or acknowledge opportunities created by others that name your NGO."
                            badge="ACTION"
                            background={MOCKUP_GRADIENTS.orange}
                            hot={pendingApprovals.length > 0}
                        />
                        <MockupActionCard
                            href={`${CS_BASE}?view=projects`}
                            emoji="📈"
                            ghost="📈"
                            title="Community Service Projects"
                            subtitle="Monitor approved projects linked to your NGO, including progress and reminders."
                            badge="TRACK"
                            background={MOCKUP_GRADIENTS.navy}
                        />
                        <MockupActionCard
                            href={`${CS_BASE}?view=impact`}
                            emoji="🏅"
                            ghost="🏅"
                            title="My Impact"
                            subtitle="Verified Community Service impact linked to your NGO."
                            badge="VERIFIED"
                            background={MOCKUP_GRADIENTS.green}
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
                            href={`${CS_BASE}?view=run`}
                            emoji="🧠"
                            ghost="🧠"
                            title="AI Analyzer & Rankings"
                            subtitle="Analyse/rank verified projects linked to your NGO within permitted cohorts."
                            badge="ANALYZE"
                            background={MOCKUP_GRADIENTS.purple}
                        />
                        <MockupActionCard
                            href={`${CS_BASE}?view=analytics`}
                            emoji="📊"
                            ghost="📊"
                            title="Analytics"
                            subtitle="See hours, Community Dividend, reach, SDGs and impact quality across linked projects."
                            badge="INSIGHTS"
                            background={MOCKUP_GRADIENTS.gold}
                        />
                    </div>
                </>
            )}

            {view !== "home" ? <UserGuideBanner desc={guide.desc} items={guide.items} rule={guide.rule} /> : null}

            {view === "create" && (
                <div className="mt-4">
                    <MockupSectionHead
                        title="Create Opportunity"
                        subtitle="Your organization’s creator lifecycle stays here from draft to publication. Faculty linkage is optional; CIEL PK provides platform review."
                        action={
                            <Link href={CREATE_FORM} className="rounded-full bg-[#0e7d74] px-4 py-2 text-[12px] font-extrabold text-white">
                                + Create New Opportunity
                            </Link>
                        }
                    />
                    <p className="mb-4 rounded-[14px] border border-[#dce6ea] bg-[#f7fafb] px-3.5 py-3 text-[12.5px] leading-relaxed text-[#52636e]">
                        <b className="text-[#16313d]">Simple rule:</b> If you created the opportunity, its creator status stays
                        here. Once students are assigned, their service/report progress appears under Community Service Projects.
                        Participation is approved by the student’s faculty; you see assigned students under Projects.
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
                    ) : mine.filter((row) => mineBucket(row) === createTab).length === 0 ? (
                        <EmptyPanel
                            title="Nothing here"
                            text={
                                createTab === "drafts"
                                    ? "Drafts save on the Create Opportunity form until you submit them to CIEL PK."
                                    : `No records under ${createTab}.`
                            }
                        />
                    ) : (
                        <div className="space-y-2.5">
                            {mine
                                .filter((row) => mineBucket(row) === createTab)
                                .map((row) => (
                                    <Link
                                        key={row.id}
                                        href={
                                            createTab === "drafts" || createTab === "action"
                                                ? `${MY_OPPS}/${encodeURIComponent(row.id)}?edit=true`
                                                : `${MY_OPPS}/${encodeURIComponent(row.id)}`
                                        }
                                        className="block rounded-2xl border border-[#dde5ea] bg-white px-4 py-3.5 transition hover:border-[#bcd4d8]"
                                    >
                                        <b className="block text-[14px] text-[#16313d]">{row.title}</b>
                                        <small className="mt-1 block text-[11.5px] text-[#6b7c86]">
                                            {formatDisplayId(row.id, "OPP")} ·{" "}
                                            {createTab === "review" ? ngoPendingStageLabel(row) : String(row.status || "in review")}
                                            {pickNum(row, "applicants_count", "applicantsCount") > 0
                                                ? ` · ${pickNum(row, "applicants_count", "applicantsCount")} applications`
                                                : ""}
                                        </small>
                                        {createTab === "review" || createTab === "published" ? (
                                            <ApprovalPipelineMini steps={ngoOwnPipeline(row, createTab)} />
                                        ) : null}
                                    </Link>
                                ))}
                        </div>
                    )}
                    <Link href={MY_OPPS} className="mt-4 inline-block text-[11px] font-semibold text-[#0e7d74] hover:underline">
                        Open full creator list →
                    </Link>
                </div>
            )}

            {(view === "approvals" || view === "pending") && (
                <div className="mt-4">
                    <MockupSectionHead
                        title="Approvals"
                        subtitle={`You only review opportunities where ${orgName} is explicitly named. Registered profile → approve here.`}
                    />
                    <p className="mb-4 rounded-[14px] border border-[#dce6ea] bg-[#f7fafb] px-3.5 py-3 text-[12.5px] leading-relaxed text-[#52636e]">
                        <b className="text-[#16313d]">Partner acknowledgement rule:</b> if any creator names an external NGO or
                        Partner Organization, acknowledgement is obtained before publication. Faculty still approves the academic
                        report.
                    </p>
                    <HubTabs
                        tabs={[
                            { id: "pending", label: "Pending", count: pendingApprovals.length },
                            { id: "rev", label: "Revision requested", count: revisionApprovals.length },
                            { id: "done", label: "Decided", count: decidedApprovals.length },
                        ]}
                        active={view === "pending" ? "pending" : approvalTab}
                        onChange={setHubTab}
                    />
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading approvals…</p>
                    ) : (
                        (() => {
                            const tab = view === "pending" ? "pending" : approvalTab;
                            const list = tab === "done" ? decidedApprovals : tab === "rev" ? revisionApprovals : pendingApprovals;
                            if (!list.length) {
                                return (
                                    <EmptyPanel
                                        title={tab === "done" ? "No decided records yet" : tab === "rev" ? "None" : "No approvals waiting"}
                                        text={
                                            tab === "pending"
                                                ? "Opportunities naming your organization appear here once Faculty has approved them."
                                                : "When an opportunity lists your organisation as partner, it will appear here."
                                        }
                                    />
                                );
                            }
                            return (
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {list.map((row) => (
                                        <CommunityQueueCard
                                            key={row.id}
                                            href={`${APPROVALS}?tab=${tab === "pending" ? "pending" : "history"}&opportunity=${encodeURIComponent(row.id)}`}
                                            title={row.title}
                                            student={pickStr(row, "creator_name", "student_name", "submitted_by_name") || "Creator"}
                                            cta={tab === "done" ? "Open record →" : tab === "rev" ? "View Flashcard →" : "View Flashcard & Approve →"}
                                            tone={tab === "done" ? "approved" : "waiting"}
                                        />
                                    ))}
                                </div>
                            );
                        })()
                    )}
                    <Link href={APPROVALS} className="mt-4 inline-block text-[11px] font-semibold text-[#0e7d74] hover:underline">
                        Open full approvals →
                    </Link>
                </div>
            )}

            {view === "projects" && (
                <div className="mt-4">
                    <MockupSectionHead
                        title="Community Service Projects"
                        subtitle="Linked projects. You can monitor and remind; the academic report is approved by Faculty only."
                    />
                    <HubTabs
                        tabs={[
                            { id: "active", label: "Active", count: waiting.length },
                            { id: "verified", label: "Verified", count: liveRows.length },
                            { id: "all", label: "All", count: pipeline.length },
                        ]}
                        active={projectTab}
                        onChange={setHubTab}
                    />
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading projects…</p>
                    ) : (
                        (() => {
                            const list = projectTab === "verified" ? liveRows : projectTab === "all" ? pipeline : waiting;
                            if (!list.length) {
                                return <EmptyPanel title="No linked projects" text="Approved engagements linked to your NGO appear here." />;
                            }
                            return (
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {list.map((row) => (
                                        <div key={row.id}>
                                            <CommunityQueueCard
                                                href={reportHref(row.id)}
                                                title={row.project_title || "Report"}
                                                student={row.student_name || "Student"}
                                                org={row.organization_name}
                                                hours={row.hours}
                                                tone={isFacultyCommunityLiveCard(row) ? "approved" : "waiting"}
                                                cta="View progress →"
                                            />
                                            {isFacultyCommunityLiveCard(row) ? null : (
                                                <NgoRemindButtons email={row.student_email} title={row.project_title || "Report"} />
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
                        {" · "}
                        <Link href={REPORTS} className="font-extrabold text-[#0e7d74] hover:underline">
                            Open reports
                        </Link>
                    </p>
                </div>
            )}

            {(view === "impact" || view === "approved") && (
                <div className="mt-4">
                    <MockupSectionHead
                        title={`Impact linked to ${orgName}`}
                        subtitle="Approved records only. Confidential records show restricted placeholders."
                        action={
                            <Link href={IMPACT} className="text-xs font-black text-[#087c75] hover:underline">
                                Open Impact Wall →
                            </Link>
                        }
                    />
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading…</p>
                    ) : deckCards.length === 0 ? (
                        <p className="mt-4 text-sm text-slate-500">Rejected work never appears as verified impact.</p>
                    ) : (
                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                            {deckCards.map((c) => (
                                <CommunityFlashCard key={c.id} card={c} href={reportHref(c.id)} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {view === "files" && (
                <div className="mt-4">
                    <MockupSectionHead
                        title={`Shared files · ${orgName}`}
                        subtitle="Faculty Analysis files and AI Analyzer reports are shared automatically with every stakeholder linked to a record."
                    />
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
                            <EmptyPanel title="No AI Analyzer runs yet" text="The dated CII badge is the shared file every stakeholder sees once Faculty runs analysis." />
                        ) : (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {deckCards
                                    .filter((c) => c.cii != null)
                                    .map((card) => (
                                        <div
                                            key={card.id}
                                            className="rounded-2xl border border-[#dde5ea] bg-white px-4 py-3.5 transition hover:border-[#bcd4d8]"
                                        >
                                            <div className="text-[22px]">🧠</div>
                                            <b className="mt-1 block text-[14px] text-[#16313d]">{card.project_title}</b>
                                            <small className="mt-1 block text-[11.5px] text-[#6b7c86]">
                                                {card.level || "CII"} · {card.cii}/100 · {card.student_name}
                                            </small>
                                            <div className="mt-2 flex flex-wrap gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setBreakdownFor({ id: card.id, title: card.project_title })}
                                                    className="text-[10.5px] font-black text-[#0e7d74] hover:underline"
                                                >
                                                    View CII breakdown →
                                                </button>
                                                <Link href={reportHref(card.id)} className="text-[10.5px] font-black text-[#6b7c86] hover:underline">
                                                    Open report →
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )
                    ) : decidedReports.length === 0 ? (
                        <EmptyPanel title="No Faculty Analysis yet" text="A file is created the moment faculty decides on a submitted report." />
                    ) : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {decidedReports.map((row) => (
                                <Link
                                    key={row.id}
                                    href={reportHref(row.id)}
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
                <div className="mt-4">
                    <MockupSectionHead
                        title="AI Analyzer & Rankings"
                        subtitle={`${orgName}-linked projects. Preview freely; an official run creates a dated cohort ranking.`}
                    />
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading…</p>
                    ) : deckCards.length === 0 ? (
                        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
                            No live cards to rank yet. Faculty-approved Community Service fills this run.
                        </p>
                    ) : (
                        <CommunityAwardPanel
                            cards={deckCards}
                            kind="par"
                            scopeName={`${orgName}-linked projects`}
                            notifyEndpoint="/api/v1/partners/community-service/award-notify"
                            filters={{ university: true }}
                        />
                    )}
                </div>
            )}

            {view === "analytics" && (
                <div className="mt-4 space-y-3">
                    <MockupSectionHead
                        title={`Analytics · ${orgName}`}
                        subtitle="Hours, Community Dividend, reach, SDGs and CII from the live deck."
                    />
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading…</p>
                    ) : (
                        <CommunityAwardAnalytics cards={deckCards} groupBy="university" />
                    )}
                    <a href={ANALYTICS} className="inline-block text-[11px] font-semibold text-[#0e7d74] hover:underline">
                        Open full analytics →
                    </a>
                </div>
            )}

            {view === "home" ? (
                <button
                    type="button"
                    onClick={() => setHelpOpen(true)}
                    title="How NGO community service works"
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
                            <b className="text-[13.5px]">NGO / Nonprofit Community Service</b>
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
                                Find/Create → Get Approved → Do the Work → Log → Story → Prove → Verify → Impact Record. Faculty
                                is the only academic report approver.
                            </p>
                            <p>
                                <b>Create</b> — your own opportunities. <b>Approvals</b> — only records that name your NGO.{" "}
                                <b>Projects</b> — monitor linked work. <b>Impact</b> — verified flashcards.
                            </p>
                        </div>
                    </div>
                </div>
            ) : null}

            {breakdownFor && (
                <CommunityCiiBreakdownModal
                    fetchUrl={`/api/v1/partners/community-service/reports/${encodeURIComponent(breakdownFor.id)}/cii-v2`}
                    title={breakdownFor.title}
                    onClose={() => setBreakdownFor(null)}
                />
            )}
        </div>
    );
}
