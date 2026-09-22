"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authenticatedFetch } from "@/utils/api";
import { CommunityCrumb, HubBackButton } from "@/components/ciel/community-service/CommunityServiceHubChrome";
import { useFacultyHubView } from "@/components/ciel/coursework/CourseworkHubChrome";
import { COMMAND_HERO, MOCKUP_GRADIENTS, MockupActionCard, MockupHero, MockupSectionHead } from "@/components/ciel/dashboard/MockupChrome";
import CommunityAwardPanel from "@/components/ciel/community-service/CommunityAwardPanel";
import CommunityAwardAnalytics from "@/components/ciel/community-service/CommunityAwardAnalytics";
import CommunityFlashCard from "@/components/ciel/community-service/CommunityFlashCard";
import CommunityCiiBreakdownModal from "@/components/ciel/community-service/CommunityCiiBreakdownModal";
import CommunityQueueCard from "@/components/ciel/community-service/CommunityQueueCard";
import {
    mapCommunityPipelineRow,
    mergeCommunityLiveDeck,
    type CommunityAwardCard,
    type CommunityPipelineRow,
} from "@/utils/communityAwardModel";
import { getStoredCurrentUserId, readStoredCurrentUser } from "@/utils/currentUser";
import { isCommunityReportRejected, isFacultyCommunityLiveCard, isFacultyCommunityWaiting, normalizeReviewStatus } from "@/utils/reviewQueue";
import {
    canEditReturnedOpportunity,
    isOpportunityPermanentlyRejected,
    isOpportunityPubliclyLive,
    resolveStudentOpportunityWorkflow,
} from "@/utils/opportunityWorkflow";
import { formatDisplayId } from "@/utils/displayIds";

const CS_VIEWS = ["home", "create", "approvals", "projects", "impact", "files", "run", "analytics", "pending", "approved"] as const;
type CsView = (typeof CS_VIEWS)[number];

const CS_BASE = "/dashboard/partner/community-service";
const CREATE_FORM = "/dashboard/partner/requests/new";
const MY_OPPS = "/dashboard/partner/requests";
const APPROVALS = "/dashboard/partner/verify";
const REPORTS = "/dashboard/partner/reports";
const IMPACT = "/dashboard/partner/impact";
const HOURS = "/dashboard/partner/attendance-review";
const ANALYTICS = "/dashboard/partner/analytics";
const HOME = "/dashboard/partner";

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
        title: "Partner Organization Community Service Hub",
        desc: "Everything your partner organization does in Community Service is grouped here: create, approve, monitor, verify impact and analyse.",
        rule: "Home stays an organization overview; Community Service operations stay inside this hub.",
    },
    create: {
        title: "Create Opportunity",
        desc: "Create and manage Partner Organization-created opportunities through CIEL PK review and publication.",
        items: [
            ["Create New Opportunity", "Open the Partner Organization Opportunity Form. Faculty linkage is optional."],
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
        desc: "Review opportunities created by others that name Partner Organization as a linked organization.",
        items: [
            ["Pending Approval / Acknowledgement", "Records waiting for your organization’s consent or decision."],
            ["Open Flashcard", "Review the opportunity students will eventually see."],
            ["Approve / Acknowledge", "Confirm organizational participation and route the record onward."],
            ["Request Revision", "Return the opportunity with a clear required correction."],
            ["Reject", "Decline the organization’s involvement."],
            ["Secure Link + OTP", "External approval path for non-dashboard stakeholders where applicable."],
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
        desc: "Verified Community Service impact linked to your organization.",
        items: [
            ["Impact Wall", "Permitted verified projects connected to the organization."],
            ["Flashcards", "Public/institutional project summaries."],
            ["CII / Badges / Certificates", "Verified impact credentials from linked projects."],
        ],
        rule: "Only verified linked impact appears here.",
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
        desc: "Analyse/rank verified projects linked to your organization.",
        items: [
            ["Preview", "Dynamic ranking analysis."],
            ["Official Run", "Dated official organization-linked cohort ranking, subject to role limits."],
            ["Why It Ranks", "Evidence-backed explanation."],
            ["History", "Previous official ranking snapshots."],
        ],
        rule: "Organization ranking scope is limited to linked projects.",
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

type OppRow = Record<string, unknown> & { id: string; title: string };

function pickStr(item: Record<string, unknown>, ...keys: string[]): string | undefined {
    for (const key of keys) {
        const value = item[key];
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    return undefined;
}

function pickNum(item: Record<string, unknown>, ...keys: string[]): number {
    for (const key of keys) {
        const value = item[key];
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (typeof value === "string" && value.trim()) {
            const n = Number(value);
            if (Number.isFinite(n)) return n;
        }
    }
    return 0;
}

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

function hasPartnerSignal(record: Record<string, unknown>) {
    const supervision =
        record.supervision && typeof record.supervision === "object"
            ? (record.supervision as Record<string, unknown>)
            : null;
    return (
        record.requires_partner_approval === true ||
        Boolean(lower(record.partner_approval_status ?? record.partner_status)) ||
        lower(record.workflow_stage ?? record.approval_stage).includes("partner") ||
        Boolean(record.external_partner_collaboration && typeof record.external_partner_collaboration === "object") ||
        Boolean(record.partner_organization && typeof record.partner_organization === "object") ||
        Boolean(pickStr(supervision || {}, "partner_org_name", "external_partner_org_name", "partner_email"))
    );
}

function mineBucket(row: OppRow): "drafts" | "review" | "action" | "published" | "closed" {
    if (normalizeReviewStatus(row.status) === "draft") return "drafts";
    if (canEditReturnedOpportunity(row)) return "action";
    if (isOpportunityPermanentlyRejected(row) || normalizeReviewStatus(row.status) === "rejected") return "closed";
    if (isOpportunityPubliclyLive(row) || normalizeReviewStatus(row.status) === "live") return "published";
    return "review";
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

function UserGuide({ view }: { view: string }) {
    const guide = GUIDES[view] || GUIDES.home;
    return (
        <div className="mt-4 rounded-[18px] border border-[#cfe8e4] bg-[linear-gradient(135deg,#f3fbf8,#fff)] p-4">
            <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#e8f7f3] text-lg">🧭</div>
                <div>
                    <b className="block text-[13.5px] text-[#16313d]">What is inside this button?</b>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-[#4f6068]">{guide.desc}</p>
                </div>
            </div>
            {guide.items?.length ? (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {guide.items.map(([title, text]) => (
                        <div key={title} className="rounded-[12px] border border-[#dde8e6] bg-white px-3 py-2.5">
                            <b className="block text-[12px] text-[#126b60]">{title}</b>
                            <span className="mt-0.5 block text-[11.5px] leading-relaxed text-[#52636e]">{text}</span>
                        </div>
                    ))}
                </div>
            ) : null}
            <p className="mt-3 rounded-[12px] bg-[#eef9f6] px-3 py-2 text-[11.5px] text-[#4d6d6b]">
                <b className="text-[#126b60]">Simple rule:</b> {guide.rule}
            </p>
        </div>
    );
}

export default function PartnerCommunityServiceHub() {
    const { view, homeHref } = useFacultyHubView(CS_VIEWS, "home");
    const searchParams = useSearchParams();
    const tabParam = searchParams.get("tab") || "";
    const user = readStoredCurrentUser() as { name?: string; orgName?: string } | null;
    const orgName =
        (typeof user?.orgName === "string" && user.orgName.trim()) ||
        (typeof user?.name === "string" && user.name.trim()) ||
        "Partner Organization";

    const [oppRows, setOppRows] = useState<OppRow[]>([]);
    const [pipeline, setPipeline] = useState<CommunityPipelineRow[]>([]);
    const [cards, setCards] = useState<CommunityAwardCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [innerTab, setInnerTab] = useState("");
    const [breakdownFor, setBreakdownFor] = useState<{ id: string; title: string } | null>(null);
    const [helpOpen, setHelpOpen] = useState(false);

    useEffect(() => {
        setInnerTab(tabParam);
    }, [tabParam, view]);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            authenticatedFetch("/api/v1/opportunities?partner_id=me", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
            authenticatedFetch("/api/v1/partner/reports?limit=200", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
            authenticatedFetch("/api/v1/partners/community-service/award-cards", {}, { redirectToLogin: false }).then(
                (r) => (r?.ok ? r.json() : null),
            ),
        ])
            .then(([list, reports, award]) => {
                if (cancelled) return;
                const rawList: unknown[] = Array.isArray(list?.data) ? list.data : [];
                const rows = rawList.filter(
                    (item: unknown): item is Record<string, unknown> => Boolean(item && typeof item === "object"),
                );
                setOppRows(
                    rows
                        .map((raw: Record<string, unknown>) => {
                            const id = String(raw.id ?? raw._id ?? raw.opportunity_id ?? "").trim();
                            return {
                                ...raw,
                                id,
                                title: pickStr(raw, "title", "name", "opportunity_title", "project_title") || "Opportunity",
                            } as OppRow;
                        })
                        .filter((row: OppRow) => row.id),
                );
                setPipeline(
                    (Array.isArray(reports?.data) ? reports.data : [])
                        .filter((item: unknown) => item && typeof item === "object")
                        .map((item: Record<string, unknown>) => mapCommunityPipelineRow(item))
                        .filter((r: CommunityPipelineRow | null): r is CommunityPipelineRow => Boolean(r?.id)),
                );
                setCards(Array.isArray(award?.data) ? award.data : []);
                setLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setOppRows([]);
                setPipeline([]);
                setCards([]);
                setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const currentUserId = getStoredCurrentUserId();
    const mine = useMemo(() => oppRows.filter((row) => isOwnedByCurrentPartner(row, currentUserId)), [oppRows, currentUserId]);
    const pendingApprovals = useMemo(
        () =>
            oppRows.filter((row) => {
                if (isOwnedByCurrentPartner(row, currentUserId)) return false;
                if (!hasPartnerSignal(row)) return false;
                return resolveStudentOpportunityWorkflow(row).stage === "pending_partner";
            }),
        [oppRows, currentUserId],
    );
    const revisionApprovals = useMemo(
        () =>
            oppRows.filter((row) => {
                if (isOwnedByCurrentPartner(row, currentUserId)) return false;
                if (!hasPartnerSignal(row)) return false;
                if (resolveStudentOpportunityWorkflow(row).stage === "pending_partner") return false;
                const key = `${normalizeReviewStatus(row.status)} ${lower(row.workflow_stage)} ${lower(row.revision_with ?? row.revisionWith)}`;
                return key.includes("revision") || key.includes("returned") || canEditReturnedOpportunity(row);
            }),
        [oppRows, currentUserId],
    );
    const decidedApprovals = useMemo(
        () =>
            oppRows.filter((row) => {
                if (isOwnedByCurrentPartner(row, currentUserId)) return false;
                if (!hasPartnerSignal(row)) return false;
                if (resolveStudentOpportunityWorkflow(row).stage === "pending_partner") return false;
                const key = `${normalizeReviewStatus(row.status)} ${lower(row.workflow_stage)} ${lower(row.revision_with ?? row.revisionWith)}`;
                return !(key.includes("revision") || key.includes("returned") || canEditReturnedOpportunity(row));
            }),
        [oppRows, currentUserId],
    );
    const publishedMine = useMemo(() => mine.filter((row) => mineBucket(row) === "published"), [mine]);
    const createCounts = useMemo(() => {
        const counts = { drafts: 0, review: 0, action: 0, published: 0, closed: 0 };
        for (const row of mine) counts[mineBucket(row)] += 1;
        return counts;
    }, [mine]);
    const applicationsOnMine = useMemo(
        () => publishedMine.reduce((sum, row) => sum + pickNum(row, "applicants_count", "applicantsCount", "pending_applications"), 0),
        [publishedMine],
    );

    const liveRows = useMemo(() => pipeline.filter((r) => isFacultyCommunityLiveCard(r)), [pipeline]);
    const waiting = useMemo(() => pipeline.filter((r) => isFacultyCommunityWaiting(r)), [pipeline]);
    const decidedReports = useMemo(
        () => pipeline.filter((r) => isFacultyCommunityLiveCard(r) || isCommunityReportRejected(r)),
        [pipeline],
    );
    const deckCards = useMemo(
        () => mergeCommunityLiveDeck(cards, liveRows, isFacultyCommunityLiveCard),
        [cards, liveRows],
    );

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
        <div className="mx-auto min-w-0 max-w-[1500px] pb-16">
            <CommunityCrumb role="Partner Organization" view={crumb} />

            {view === "home" ? (
                <MockupHero
                    kicker={`Community Service · Partner Organization`}
                    title={`${orgName} · Community Service`}
                    subtitle="Create opportunities, approve records that name your organization, monitor linked projects and showcase verified impact."
                    gradient={COMMAND_HERO}
                    stats={[
                        { value: String(pendingApprovals.length), label: "Pending approvals", href: `${CS_BASE}?view=approvals` },
                        { value: String(publishedMine.length), label: "Published opportunities", href: `${CS_BASE}?view=create&tab=published` },
                        { value: String(pipeline.length), label: "Linked projects", href: `${CS_BASE}?view=projects` },
                        { value: String(deckCards.length), label: "Verified impact", href: `${CS_BASE}?view=impact` },
                    ]}
                    rightStat={{ value: "🤝", label: "Community Service hub" }}
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
                            <h2 className="m-0 text-[21px] font-semibold text-[#16313d]">Partner Organization Community Service</h2>
                            <p className="mt-1 max-w-[820px] text-[12.5px] text-[#70808a]">
                                Everything your organization does in Community Service is grouped here. Creator lifecycle stays in Create
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

                    <UserGuide view="home" />

                    <p className="mt-4 rounded-[15px] border border-[#cee3e0] bg-[linear-gradient(135deg,#eef9f6,#fff)] px-3.5 py-3 text-[12.5px] leading-relaxed text-[#4d6d6b]">
                        <b className="text-[#126b60]">Navigation rule:</b> You entered Community Service from the left. Everything
                        below belongs to this impact area; Home remains a clean overview.
                    </p>

                    <div className="mt-4 rounded-[18px] border border-[#cfe3de] bg-[linear-gradient(135deg,#f2fbf7,#fff)] p-4 shadow-[0_8px_24px_rgba(23,75,67,.06)]">
                        <h3 className="m-0 flex items-center gap-2 text-[15px] font-semibold text-[#16313d]">
                            Approvals waiting for you
                            <span className="rounded-full bg-[#174b43] px-2 py-0.5 text-[11px] font-bold text-white">
                                {pendingApprovals.length}
                            </span>
                        </h3>
                        <p className="mt-1 text-[11.5px] text-[#4f6068]">
                            Open the Flashcard and approve in one click. Revision and rejection ask for a short comment.
                        </p>
                        {loading ? (
                            <p className="mt-3 text-sm text-slate-500">Loading approvals…</p>
                        ) : pendingApprovals.length === 0 ? (
                            <div className="mt-3 rounded-[14px] border border-[#dde8e6] bg-white px-3 py-6 text-center text-sm text-slate-600">
                                <b>Nothing waiting</b>
                                <p className="mt-1 text-[12px] text-slate-500">
                                    New Flashcards appear here when a student or faculty names your organization.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-2 space-y-2.5">
                                {pendingApprovals.map((row) => (
                                    <div
                                        key={row.id}
                                        className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#dde8e6] bg-white px-3 py-2.5"
                                    >
                                        <div className="min-w-[240px] flex-1">
                                            <b className="block text-[13.5px] text-[#16313d]">{row.title}</b>
                                            <small className="mt-0.5 block text-[11px] text-[#4f6068]">
                                                {formatDisplayId(row.id, "OPP")} · {resolveStudentOpportunityWorkflow(row).badgeLabel}
                                            </small>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Link
                                                href={`${APPROVALS}?tab=pending&opportunity=${encodeURIComponent(row.id)}`}
                                                className="rounded-full bg-[#0e7d74] px-3.5 py-1.5 text-[11px] font-extrabold text-white"
                                            >
                                                View Flashcard & Approve
                                            </Link>
                                            <Link
                                                href={`${APPROVALS}?tab=pending&opportunity=${encodeURIComponent(row.id)}`}
                                                className="rounded-full bg-[#f4e3b8] px-3 py-1.5 text-[11px] font-extrabold text-[#7a4b00]"
                                            >
                                                ✏ Revision
                                            </Link>
                                            <Link
                                                href={`${APPROVALS}?tab=pending&opportunity=${encodeURIComponent(row.id)}`}
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
                            subtitle="Create a Partner opportunity and manage Drafts, Under Approval, Action Required, Published and Closed."
                            badge="CREATE + TRACK"
                            background={MOCKUP_GRADIENTS.teal}
                        />
                        <MockupActionCard
                            href={`${CS_BASE}?view=approvals`}
                            emoji="✅"
                            ghost="✅"
                            title="Approvals"
                            subtitle="Approve or acknowledge opportunities created by others that name your organization."
                            badge="ACTION"
                            background={MOCKUP_GRADIENTS.orange}
                            hot={pendingApprovals.length > 0}
                        />
                        <MockupActionCard
                            href={`${CS_BASE}?view=projects`}
                            emoji="📈"
                            ghost="📈"
                            title="Community Service Projects"
                            subtitle="Monitor approved projects linked to your organization, including progress and reminders."
                            badge="TRACK"
                            background={MOCKUP_GRADIENTS.navy}
                        />
                        <MockupActionCard
                            href={`${CS_BASE}?view=impact`}
                            emoji="🏅"
                            ghost="🏅"
                            title="My Impact"
                            subtitle="Verified Community Service impact linked to your organization."
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
                            subtitle="Analyse/rank verified projects linked to your organization within permitted cohorts."
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

            {view !== "home" ? <UserGuide view={guideKey} /> : null}

            {view === "create" && (
                <div className="mt-4">
                    <MockupSectionHead
                        title="Create & manage your opportunities"
                        subtitle="One button owns the complete creator journey: Draft → Submit → Review → Revision if needed → Published / Closed."
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
                                        href={`${MY_OPPS}/${encodeURIComponent(row.id)}`}
                                        className="block rounded-2xl border border-[#dde5ea] bg-white px-4 py-3.5 transition hover:border-[#bcd4d8]"
                                    >
                                        <b className="block text-[14px] text-[#16313d]">{row.title}</b>
                                        <small className="mt-1 block text-[11.5px] text-[#6b7c86]">
                                            {formatDisplayId(row.id, "OPP")} · {String(row.status || "in review")}
                                            {pickNum(row, "applicants_count", "applicantsCount") > 0
                                                ? ` · ${pickNum(row, "applicants_count", "applicantsCount")} applications`
                                                : ""}
                                        </small>
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
                        subtitle={`You only review opportunities where ${orgName} is explicitly named. Registered profile → approve here; unregistered organizations receive a secure token + OTP link instead of a public URL.`}
                    />
                    <p className="mb-4 rounded-[14px] border border-[#dce6ea] bg-[#f7fafb] px-3.5 py-3 text-[12.5px] leading-relaxed text-[#52636e]">
                        <b className="text-[#16313d]">Partner acknowledgement rule:</b> if any creator names an external NGO or
                        Partner Organization, acknowledgement is obtained before publication or final activation. All approvals
                        are tied to the same opportunity version.
                    </p>
                    <HubTabs
                        tabs={[
                            { id: "pending", label: "Pending", count: pendingApprovals.length },
                            { id: "rev", label: "Revision requested", count: revisionApprovals.length },
                            { id: "done", label: "Decided", count: decidedApprovals.length },
                        ]}
                        active={view === "pending" ? "pending" : approvalTab}
                        onChange={setInnerTab}
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
                                        title={
                                            tab === "done"
                                                ? "No decided records yet"
                                                : tab === "rev"
                                                  ? "None"
                                                  : "Nothing pending"
                                        }
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
                                            href={`${APPROVALS}?tab=${tab === "done" || tab === "rev" ? "history" : "pending"}&opportunity=${encodeURIComponent(row.id)}`}
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
                        onChange={setInnerTab}
                    />
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading projects…</p>
                    ) : (
                        (() => {
                            const list = projectTab === "verified" ? liveRows : projectTab === "all" ? pipeline : waiting;
                            if (!list.length) {
                                return <EmptyPanel title="No linked projects" text="Approved engagements linked to your organization appear here." />;
                            }
                            return (
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {list.map((row) => (
                                        <CommunityQueueCard
                                            key={row.id}
                                            href={reportHref(row.id)}
                                            title={row.project_title || "Report"}
                                            student={row.student_name || "Student"}
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
                        onChange={setInnerTab}
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
                    title="How partner community service works"
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
                            <b className="text-[13.5px]">Partner Organization Community Service</b>
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
                                <b>Create</b> — your own opportunities. <b>Approvals</b> — only records that name your organization.{" "}
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
