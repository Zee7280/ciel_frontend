"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";
import {
    CommunityCrumb,
    EmptyPanel,
    HubBackButton,
    HubTabs,
    UserGuideBanner,
    ZoneRule,
} from "@/components/ciel/community-service/CommunityServiceHubChrome";
import { useFacultyHubView } from "@/components/ciel/coursework/CourseworkHubChrome";
import {
    COMMAND_HERO,
    MOCKUP_GRADIENTS,
    MockupActionCard,
    MockupHero,
    MockupSectionHead,
} from "@/components/ciel/dashboard/MockupChrome";
import AdminNationalRankingStudio from "@/components/ciel/community-service/AdminNationalRankingStudio";
import CommunityAwardAnalytics from "@/components/ciel/community-service/CommunityAwardAnalytics";
import CommunityFlashCard from "@/components/ciel/community-service/CommunityFlashCard";
import CommunityQueueCard from "@/components/ciel/community-service/CommunityQueueCard";
import CommunityCiiBreakdownModal from "@/components/ciel/community-service/CommunityCiiBreakdownModal";
import OpportunityListFlashHead from "@/components/opportunities/OpportunityListFlashHead";
import {
    DIVIDEND_HOURLY_RATE_PKR,
    mapCommunityPipelineRow,
    mergeCommunityLiveDeck,
    type CommunityAwardCard,
    type CommunityPipelineRow,
} from "@/utils/communityAwardModel";
import {
    isAdminCommunityLiveCard,
    isAdminCommunityWaiting,
    isCommunityReportFacultyApproved,
    isCommunityReportRejected,
} from "@/utils/reviewQueue";
import { getStoredCurrentUserId } from "@/utils/currentUser";
import { formatDisplayId } from "@/utils/displayIds";
import { uniMineBucket, type UniOppRow } from "@/app/dashboard/partner/community-service/useUniversityCommunityServiceData";

const CS_BASE = "/dashboard/admin/community-service";
const CS_VIEWS = [
    "home",
    "create",
    "projects",
    "approved",
    "wall",
    "run",
    "analytics",
    "exports",
    "pending",
    "hec",
] as const;
type CsView = (typeof CS_VIEWS)[number];
const CREATE_FORM = "/dashboard/admin/create-opportunity";
const CREATE_TABS = ["drafts", "review", "action", "published", "closed"] as const;
type CreateTab = (typeof CREATE_TABS)[number];
const PROJECT_TABS = ["approval", "active", "verified", "closed"] as const;
type ProjectTab = (typeof PROJECT_TABS)[number];

const GUIDES: Record<string, { desc: string; items?: [string, string][]; rule?: string }> = {
    home: {
        desc: "National Community Service command. CIEL PK publishes unlimited opportunities and oversees verified impact across Pakistan.",
        rule: "CIEL PK publishes directly. Partner or faculty acknowledgement is required only when those stakeholders are named.",
    },
    create: {
        desc: "Publish unlimited CIEL PK-created opportunities. Released directly by admin unless a partner or faculty is named.",
        items: [
            ["Create New Opportunity", "Open the CIEL PK Opportunity Form. CIEL PK is creator and sponsor."],
            ["Drafts", "Saved opportunities not yet submitted."],
            ["Under Approval", "Waiting on partner or faculty acknowledgement only if those stakeholders are named."],
            ["Action Required", "Revisions returned to CIEL Admin."],
            ["Published", "Live in Browse Opportunities for eligible students."],
            ["Closed", "Rejected, expired or closed records retained for history."],
        ],
        rule: "There is no cap on the number of opportunities CIEL PK can publish. CIEL Admin does not need a second admin approval — partner or faculty acknowledgement only if named.",
    },
    projects: {
        desc: "Nationwide monitoring of Community Service work.",
        items: [
            ["Projects", "View opportunity/report stage, student/team, faculty and partner."],
            ["Progress", "Report completion and member hours where authorised."],
            ["In approval", "Opportunities still waiting on a named partner or faculty."],
            ["Verified / Closed", "National vault and rejected history."],
        ],
        rule: "Academic report approval remains with Faculty; CIEL PK signs off the national record.",
    },
    approved: {
        desc: "Verified Community Service records nationwide.",
        items: [
            ["Verified Records", "Projects with final approved reports and Verified CII."],
            ["Credentials", "Badges, certificates and QR verification IDs."],
            ["Visibility", "Public/institutional/confidential access is respected."],
        ],
        rule: "Only verified impact belongs here.",
    },
    wall: {
        desc: "Showcase verified Community Service work from the national vault.",
        items: [
            ["Public Records", "Approved records whose visibility permits public display."],
            ["National Records", "Live faculty cards from every participating institution."],
            ["Open report", "Use the existing verify screen — this wall does not change the flow."],
        ],
        rule: "Rejected records never appear as verified impact.",
    },
    run: {
        desc: "Analyse and rank verified national projects in meaningful cohorts.",
        items: [
            ["Preview", "Dynamic ranking analysis."],
            ["Official Run", "Dated permanent national cohort snapshot."],
            ["Cohort Filters", "Define university, semester, SDG or other comparison group."],
            ["Explanation", "Shows why each project ranks where it does."],
        ],
        rule: "Faculty CII stays locked. Avoid misleading micro-cohorts such as “#1 of 1”.",
    },
    analytics: {
        desc: "National Community Service performance dashboard.",
        items: [
            ["Projects / Students", "Scale and participation."],
            ["Person-hours", "Verified service contribution."],
            ["Community Dividend", "Verified contribution value."],
            ["Universities / SDGs", "Distribution across Pakistan."],
        ],
        rule: "Use aggregate analytics for national planning and reporting.",
    },
    exports: {
        desc: "Generate authorised outputs from verified Community Service data.",
        items: [
            ["HEC-ready Summary", "Structured national Community Service reporting."],
            ["University Report", "Filtered reporting by institution."],
            ["Certificate Register", "Credential and verification register."],
            ["CSV / Data Export", "Structured data export for authorised use."],
        ],
        rule: "Exports must obey privacy and visibility permissions.",
    },
};

const VIEW_LABEL: Record<string, string> = {
    create: "Create Opportunity",
    projects: "Community Service Projects",
    approved: "Approved Impact",
    wall: "Impact Wall",
    run: "AI Analyzer & Rankings",
    analytics: "Analytics",
    exports: "Reports / Exports",
};

function downloadText(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        URL.revokeObjectURL(a.href);
        a.remove();
    }, 800);
}

function csvEscape(value: string) {
    return `"${value.replace(/"/g, '""')}"`;
}

function normalizeAdminCsView(view: CsView): Exclude<CsView, "pending" | "hec"> {
    if (view === "pending") return "projects";
    if (view === "hec") return "exports";
    return view;
}

export default function AdminCommunityServicePage() {
    return (
        <Suspense fallback={<div className="mx-auto max-w-[1040px] py-16 text-center text-sm text-[#71828e]">Loading community service…</div>}>
            <AdminCommunityServiceHub />
        </Suspense>
    );
}

/** Every row here already failed isAdminCommunityLiveCard (still in `inPipe`), so none of
 * these are actually "Approved" yet from the admin's own perspective — the one real distinction
 * worth surfacing is whether Faculty has already cleared it (this admin's own action is now
 * the only thing outstanding) versus it still being earlier in the pipeline. Do not call this
 * "Approved →" — a faculty-approved-but-admin-pending row still belongs on THIS board. */
function pipelineCta(r: CommunityPipelineRow) {
    const st = String(r.status || "").toLowerCase();
    if (st === "draft") return "Draft →";
    if (isCommunityReportFacultyApproved(r)) return "Review & approve →";
    return "Open report →";
}

function pipelineTone(r: CommunityPipelineRow): "waiting" | "ready" {
    return isCommunityReportFacultyApproved(r) ? "ready" : "waiting";
}

export function AdminCommunityServiceHub() {
    const { view } = useFacultyHubView(CS_VIEWS, "home");
    const effectiveView = normalizeAdminCsView(view);
    const searchParams = useSearchParams();
    const router = useRouter();
    const tabParam = searchParams.get("tab") || "";
    const [innerTab, setInnerTab] = useState("");
    const [query, setQuery] = useState("");
    const [cards, setCards] = useState<CommunityAwardCard[]>([]);
    const [pipeline, setPipeline] = useState<CommunityPipelineRow[]>([]);
    const [oppCount, setOppCount] = useState(0);
    const [mine, setMine] = useState<UniOppRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [breakdownFor, setBreakdownFor] = useState<{ id: string; title: string } | null>(null);
    const [rerunningId, setRerunningId] = useState<string | null>(null);

    /** Backend already permits Super Admin to run an extra AI pass on an already faculty-approved
     * report, platform-wide, never overwriting the faculty-approved score/level. */
    const runIndependentAnalysis = async (reportId: string) => {
        setRerunningId(reportId);
        try {
            const res = await authenticatedFetch(
                `/api/v1/admin/community-service/reports/${encodeURIComponent(reportId)}/independent-analysis`,
                { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) },
            );
            const json = await res?.json().catch(() => null);
            if (!res?.ok) {
                toast.error(json?.message || "Independent AI analysis failed.");
                return;
            }
            const score = json?.data?.score ?? json?.score;
            const levelName = json?.data?.level?.name ?? json?.level?.name;
            toast.success(
                score != null
                    ? `Independent analysis complete — ${Math.round(score)}/100${levelName ? ` (${levelName})` : ""}. The faculty-approved score is unchanged.`
                    : "Independent analysis complete. The faculty-approved score is unchanged.",
            );
        } finally {
            setRerunningId(null);
        }
    };

    const loadHub = useCallback(() => {
        return Promise.all([
            authenticatedFetch("/api/v1/admin/community-service/award-cards", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
            authenticatedFetch("/api/v1/admin/reports?limit=200", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
            authenticatedFetch("/api/v1/admin/projects", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
            authenticatedFetch("/api/v1/opportunities?created_by=me", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
        ])
            .then(([award, reports, projects, mineRes]) => {
                setCards(Array.isArray(award?.data) ? award.data : []);
                setPipeline(
                    (Array.isArray(reports?.data) ? reports.data : [])
                        .filter((item: unknown) => item && typeof item === "object")
                        .map((item: Record<string, unknown>) => mapCommunityPipelineRow(item))
                        .filter((r: CommunityPipelineRow | null): r is CommunityPipelineRow => Boolean(r?.id)),
                );
                const plist = Array.isArray(projects?.data) ? projects.data : Array.isArray(projects) ? projects : [];
                setOppCount(plist.length);
                const mineList = Array.isArray(mineRes?.data) ? mineRes.data : Array.isArray(mineRes) ? mineRes : [];
                const me = getStoredCurrentUserId();
                setMine(
                    mineList
                        .filter((row: unknown) => row && typeof row === "object")
                        .map((row: Record<string, unknown>) => {
                            const id = String(row.id ?? "").trim();
                            return {
                                id,
                                title: String(row.title || "Opportunity"),
                                status: typeof row.status === "string" ? row.status : undefined,
                                workflow_stage:
                                    typeof row.workflow_stage === "string"
                                        ? row.workflow_stage
                                        : typeof row.workflowStage === "string"
                                          ? row.workflowStage
                                          : null,
                                creatorId: typeof row.creatorId === "string" ? row.creatorId : undefined,
                                creator_id: typeof row.creator_id === "string" ? row.creator_id : undefined,
                                ...row,
                            } as UniOppRow;
                        })
                        .filter((row: UniOppRow) => {
                            if (!row.id) return false;
                            if (!me) return true;
                            const creator = String(row.creatorId || row.creator_id || "").trim();
                            return !creator || creator === me;
                        }),
                );
                setLoading(false);
            })
            .catch(() => {
                setCards([]);
                setPipeline([]);
                setOppCount(0);
                setMine([]);
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        void loadHub();
    }, [loadHub]);

    const liveRows = useMemo(() => pipeline.filter((r) => isAdminCommunityLiveCard(r)), [pipeline]);
    // Faculty-approved-and-ready-for-admin rows surface first — those are the only ones this
    // board can actually act on today; earlier-pipeline rows are still waiting on someone else.
    const inPipe = useMemo(
        () =>
            pipeline
                .filter((r) => isAdminCommunityWaiting(r))
                .sort((a, b) => Number(isCommunityReportFacultyApproved(b)) - Number(isCommunityReportFacultyApproved(a))),
        [pipeline],
    );
    const closedReports = useMemo(() => pipeline.filter((r) => isCommunityReportRejected(r)), [pipeline]);
    const deckCards = useMemo(
        () => mergeCommunityLiveDeck(cards, liveRows, isAdminCommunityLiveCard),
        [cards, liveRows],
    );
    const hours = deckCards.reduce((s, c) => s + (c.hours || 0), 0);
    const unis = new Set(deckCards.map((c) => c.university)).size;
    const reportHref = (id: string) => `/dashboard/admin/reports/verify/${id}`;

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

    const createCounts = useMemo(() => {
        const counts = { drafts: 0, review: 0, action: 0, published: 0, closed: 0 };
        for (const row of mine) counts[uniMineBucket(row)] += 1;
        return counts;
    }, [mine]);
    const defaultCreateTab: CreateTab = createCounts.action
        ? "action"
        : createCounts.review
          ? "review"
          : createCounts.drafts
            ? "drafts"
            : "published";
    const createTab = (CREATE_TABS.includes(innerTab as CreateTab) ? innerTab : defaultCreateTab) as CreateTab;
    const approvalOpps = useMemo(() => mine.filter((row) => uniMineBucket(row) === "review"), [mine]);
    const projectTab = (PROJECT_TABS.includes(innerTab as ProjectTab) ? innerTab : "approval") as ProjectTab;
    const q = query.trim().toLowerCase();
    const filterProject = (row: CommunityPipelineRow) => {
        if (!q) return true;
        const hay = `${row.project_title} ${row.student_name} ${row.organization_name || ""}`.toLowerCase();
        return hay.includes(q);
    };
    const filterOpp = (row: UniOppRow) => {
        if (!q) return true;
        return `${row.title}`.toLowerCase().includes(q);
    };

    const exportVerified = (kind: string) => {
        const rows = deckCards.map((c) =>
            [
                c.project_title,
                formatDisplayId(c.id, "RPT"),
                c.student_name,
                c.faculty_name,
                c.university,
                c.department,
                String(c.cii ?? ""),
                c.level || "",
                String(c.hours || 0),
                c.sdg,
            ].map((v) => csvEscape(String(v))),
        );
        const header = ["Project", "ID", "Student", "Faculty", "University", "Department", "CII", "Level", "Hours", "SDG"].join(",");
        if (kind.includes("HTML")) {
            const body = `<h1>CIEL PK Impact Wall</h1><p>Public-safe verified records only. No private contact data.</p><ul>${deckCards
                .map((c) => `<li>${c.project_title} · ${c.student_name} · CII ${c.cii ?? "—"}</li>`)
                .join("")}</ul>`;
            downloadText("CIEL_PK_impact_wall.html", `<!doctype html><title>CIEL PK</title>${body}`, "text/html");
        } else {
            downloadText(`CIEL_PK_${kind.replace(/\s+/g, "_")}.csv`, [header, ...rows.map((r) => r.join(","))].join("\n"), "text/csv");
        }
        toast.success("Export generated from live verified records.");
    };

    const guide = GUIDES[effectiveView] || GUIDES.home;
    const crumbView = effectiveView === "home" ? undefined : VIEW_LABEL[effectiveView] || effectiveView;

    return (
        <div className="mx-auto min-w-0 max-w-[1500px] px-4 py-6 sm:px-6">
            <CommunityCrumb role="CIEL PK" view={crumbView} />
            {effectiveView === "home" ? (
                <MockupHero
                    kicker="CIEL PK · COMMUNITY SERVICE · MASTER"
                    title="Community Service"
                    subtitle="National pipeline, verified impact, and the CIEL PK Medal — same rubric as faculty and universities."
                    gradient={COMMAND_HERO}
                    stats={[
                        { value: String(inPipe.length), label: "IN THE PIPELINE" },
                        { value: String(deckCards.length), label: "APPROVED CARDS" },
                        { value: String(oppCount), label: "LIVE OPPORTUNITIES" },
                        { value: `${hours}h`, label: "NATIONAL HOURS" },
                    ]}
                />
            ) : (
                <div className="mt-4">
                    <HubBackButton href={CS_BASE} label="← Back to Community Service" />
                </div>
            )}

            {effectiveView === "home" && (
                <>
                    <UserGuideBanner {...GUIDES.home} />
                    <ZoneRule title="Navigation rule">
                        You entered Community Service from the left. Everything below belongs to this impact area; Home remains a
                        clean overview. Create Opportunity publishes for CIEL PK; projects, impact, analytics and exports remain
                        separate for clarity.
                    </ZoneRule>
                    <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                        {[
                            {
                                key: "approval",
                                n: approvalOpps.length,
                                title: "Opportunities in approval",
                                sub: "Named partner or faculty only",
                                href: `${CS_BASE}?view=projects&tab=approval`,
                            },
                            {
                                key: "progress",
                                n: inPipe.length,
                                title: "Reports in progress",
                                sub: "National pipeline",
                                href: `${CS_BASE}?view=projects&tab=active`,
                            },
                            {
                                key: "impact",
                                n: deckCards.length,
                                title: "Verified impact records",
                                sub: "On the national Impact Wall",
                                href: `${CS_BASE}?view=approved`,
                            },
                            {
                                key: "live",
                                n: oppCount,
                                title: "Live opportunities",
                                sub: "Open for enrolment nationwide",
                                href: "/dashboard/admin/projects",
                            },
                        ].map((item) => (
                            <Link
                                key={item.key}
                                href={item.href}
                                className="flex items-center gap-3 rounded-2xl border border-[#dde5ea] bg-white px-4 py-3.5"
                            >
                                <span className="min-w-[36px] text-[26px] font-black leading-none text-[#0e4d4e]">
                                    {loading ? "—" : item.n}
                                </span>
                                <span className="min-w-0">
                                    <b className="block text-[13px] font-extrabold text-[#16313d]">{item.title}</b>
                                    <small className="mt-0.5 block text-[11.5px] text-[#6b7c86]">{item.sub}</small>
                                </span>
                            </Link>
                        ))}
                    </div>
                    <MockupSectionHead title="Community Service tools" subtitle="Choose the responsibility you need to work on." />
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                        <MockupActionCard
                            href={`${CS_BASE}?view=create`}
                            emoji="🚀"
                            ghost="🚀"
                            title="Create Opportunity"
                            subtitle="Publish unlimited CIEL PK opportunities directly and manage Drafts, Under Approval, Action Required, Published and Closed."
                            badge="UNLIMITED PUBLISHING"
                            background={MOCKUP_GRADIENTS.teal}
                        />
                        <MockupActionCard
                            href={`${CS_BASE}?view=projects`}
                            emoji="📈"
                            ghost="📈"
                            title="Community Service Projects"
                            subtitle="Monitor every Community Service project nationwide — progress, faculty, partners and student participation."
                            badge="TRACK"
                            background={MOCKUP_GRADIENTS.blue}
                        />
                        <MockupActionCard
                            href={`${CS_BASE}?view=approved`}
                            emoji="✅"
                            ghost="✅"
                            title="Approved Impact"
                            subtitle="Verified reports with CII, badges, certificates and QR verification."
                            badge="VERIFIED"
                            background={MOCKUP_GRADIENTS.green}
                        />
                        <MockupActionCard
                            href={`${CS_BASE}?view=wall`}
                            emoji="🏆"
                            ghost="🏆"
                            title="Impact Wall"
                            subtitle="National showcase of verified Community Service work."
                            badge="SHOWCASE"
                            background={MOCKUP_GRADIENTS.orange}
                        />
                        <MockupActionCard
                            href={`${CS_BASE}?view=run`}
                            emoji="🧠"
                            ghost="🧠"
                            title="AI Analyzer & Rankings"
                            subtitle="Run permitted institutional ranking previews and official cohort snapshots."
                            badge="ANALYZE"
                            background={MOCKUP_GRADIENTS.purple}
                        />
                        <MockupActionCard
                            href={`${CS_BASE}?view=analytics`}
                            emoji="📊"
                            ghost="📊"
                            title="Analytics"
                            subtitle="National hours, dividend, reach, SDGs, universities, departments, partners and CII distribution."
                            badge="INSIGHTS"
                            background={MOCKUP_GRADIENTS.gold}
                        />
                        <MockupActionCard
                            href={`${CS_BASE}?view=exports`}
                            emoji="📤"
                            ghost="📤"
                            title="Reports / Exports"
                            subtitle="HEC-ready summaries, department reports, certificate registers and authorised exports."
                            badge="EXPORT"
                            background="linear-gradient(135deg,#455a78,#7088ad)"
                        />
                    </div>
                </>
            )}

            {effectiveView !== "home" ? (
                <div className="mt-4">
                    <UserGuideBanner {...guide} />
                </div>
            ) : null}

            {effectiveView === "create" && (
                <div className="mt-4">
                    <MockupSectionHead
                        title="Create & manage CIEL PK opportunities"
                        subtitle="Unlimited publishing — create as many opportunities as you need. Creator: CIEL PK. No second admin approval. Partner or faculty acknowledgement only if named."
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
                        <b className="text-[#16313d]">Simple rule:</b> If CIEL PK created the opportunity, its creator
                        status stays here. Partner or faculty acknowledgement is required only when those stakeholders
                        are named. Once students are assigned, their service/report progress appears under Community
                        Service Projects.
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
                        onChange={setHubTab}
                    />
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading…</p>
                    ) : mine.filter((row) => uniMineBucket(row) === createTab).length === 0 ? (
                        <EmptyPanel title="Nothing here" text={`No records under ${createTab === "review" ? "Under Approval" : createTab}.`} />
                    ) : (
                        <div className="space-y-2.5">
                            {mine
                                .filter((row) => uniMineBucket(row) === createTab)
                                .map((row) => (
                                    <Link
                                        key={row.id}
                                        href={
                                            createTab === "drafts"
                                                ? `${CREATE_FORM}?edit=${encodeURIComponent(row.id)}&draft=1`
                                                : createTab === "action"
                                                  ? `${CREATE_FORM}?edit=${encodeURIComponent(row.id)}`
                                                  : `/dashboard/admin/projects`
                                        }
                                        className="block overflow-hidden rounded-[26px] border border-[#d9e3e7] bg-white shadow-[0_18px_50px_rgba(15,43,54,.08)]"
                                    >
                                        <OpportunityListFlashHead title={row.title} />
                                        <div className="px-4 py-3">
                                            <small className="block text-[11.5px] text-[#6b7c86]">
                                                {formatDisplayId(row.id, "OPP")} · {String(row.status || "in review")}
                                                {row.workflow_stage ? ` · ${String(row.workflow_stage).replace(/_/g, " ")}` : ""}
                                            </small>
                                        </div>
                                    </Link>
                                ))}
                        </div>
                    )}
                </div>
            )}

            {effectiveView === "projects" && (
                <div className="mt-4">
                    <MockupSectionHead
                        title="Community Service Projects"
                        subtitle="National view. Draft answers remain private; you see stage, last activity and member hours."
                        action={
                            <Link href="/dashboard/admin/projects" className="text-xs font-black text-[#087c75] hover:underline">
                                Open full project tracker →
                            </Link>
                        }
                    />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search project / student / partner…"
                        className="mb-3 w-full rounded-[10px] border border-[#dde5ea] bg-white px-2.5 py-2 text-[11px]"
                    />
                    <HubTabs
                        tabs={[
                            { id: "approval", label: "In approval", count: approvalOpps.filter(filterOpp).length },
                            { id: "active", label: "Active reports", count: inPipe.filter(filterProject).length },
                            { id: "verified", label: "Verified", count: liveRows.filter(filterProject).length },
                            { id: "closed", label: "Closed", count: closedReports.filter(filterProject).length },
                        ]}
                        active={projectTab}
                        onChange={setHubTab}
                    />
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading…</p>
                    ) : projectTab === "approval" ? (
                        approvalOpps.filter(filterOpp).length === 0 ? (
                            <EmptyPanel title="Nothing here" text="CIEL PK opportunities still waiting on a named partner or faculty appear here." />
                        ) : (
                            <div className="space-y-2.5">
                                {approvalOpps.filter(filterOpp).map((row) => (
                                    <Link
                                        key={row.id}
                                        href="/dashboard/admin/projects"
                                        className="block overflow-hidden rounded-[26px] border border-[#d9e3e7] bg-white shadow-[0_18px_50px_rgba(15,43,54,.08)]"
                                    >
                                        <OpportunityListFlashHead title={row.title} />
                                        <div className="px-4 py-3">
                                            <small className="block text-[11.5px] text-[#6b7c86]">
                                                {formatDisplayId(row.id, "OPP")} · {String(row.status || "in review")}
                                                {row.workflow_stage ? ` · ${String(row.workflow_stage).replace(/_/g, " ")}` : ""}
                                            </small>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )
                    ) : (
                        (() => {
                            const list = (projectTab === "verified" ? liveRows : projectTab === "closed" ? closedReports : inPipe).filter(
                                filterProject,
                            );
                            if (!list.length) {
                                return <EmptyPanel title="Nothing here" text="Approved engagements appear here once students are assigned." />;
                            }
                            return (
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {list.map((r) => (
                                        <CommunityQueueCard
                                            key={r.id}
                                            href={reportHref(r.id)}
                                            title={r.project_title || "Report"}
                                            student={r.student_name || "Student"}
                                            org={r.organization_name}
                                            hours={r.hours}
                                            cta={projectTab === "verified" ? "View progress →" : pipelineCta(r)}
                                            tone={
                                                projectTab === "verified"
                                                    ? "approved"
                                                    : projectTab === "closed"
                                                      ? "waiting"
                                                      : pipelineTone(r)
                                            }
                                        />
                                    ))}
                                </div>
                            );
                        })()
                    )}
                </div>
            )}

            {effectiveView === "approved" && (
                <div className="mt-4">
                    <MockupSectionHead title="Approved Impact · CIEL PK" subtitle="Verified reports only. Rejected work never appears here." />
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading…</p>
                    ) : deckCards.length === 0 ? (
                        <EmptyPanel title="None yet" text="Verified cards appear here after Faculty and CIEL PK sign-off." />
                    ) : (
                        <div className="overflow-x-auto rounded-2xl border border-[#dde5ea] bg-white">
                            <table className="min-w-[720px] w-full text-left text-[12px]">
                                <thead className="bg-[#f7fafb] text-[10px] uppercase tracking-wide text-[#70808a]">
                                    <tr>
                                        <th className="px-3 py-2">Project</th>
                                        <th className="px-3 py-2">Student · faculty</th>
                                        <th className="px-3 py-2">University</th>
                                        <th className="px-3 py-2">Verified CII</th>
                                        <th className="px-3 py-2">Hours</th>
                                        <th className="px-3 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {deckCards.map((c) => (
                                        <tr key={c.id} className="border-t border-[#edf2f4]">
                                            <td className="px-3 py-3">
                                                <b className="block text-[#16313d]">{c.project_title}</b>
                                                <span className="text-[11px] text-[#6b7c86]">
                                                    {formatDisplayId(c.id, "RPT")} · {c.department}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-[#4f6068]">
                                                {c.student_name}
                                                <br />
                                                <span className="text-[11px] text-[#6b7c86]">{c.faculty_name}</span>
                                            </td>
                                            <td className="px-3 py-3 text-[#4f6068]">{c.university || "—"}</td>
                                            <td className="px-3 py-3">
                                                <b>{c.cii ?? "—"}</b> {c.level ? <span className="ml-1 text-[10px]">{c.level}</span> : null}
                                            </td>
                                            <td className="px-3 py-3">{c.hours || 0}h</td>
                                            <td className="px-3 py-3">
                                                <Link href={reportHref(c.id)} className="rounded-full bg-[#0e7d74] px-3 py-1.5 text-[11px] font-extrabold text-white">
                                                    Open
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {effectiveView === "wall" && (
                <div className="mt-4">
                    <MockupSectionHead title="CIEL PK Impact Wall" subtitle="After faculty and CIEL PK approval: flashcard, badge, ranking + trend, CII, detailed report, PDF and combined package. QR stays on the flashcard." />
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading…</p>
                    ) : deckCards.length === 0 ? (
                        <EmptyPanel title="No verified records yet" text="Rejected work never appears as verified impact." />
                    ) : (
                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                            {deckCards.map((c) => (
                                <CommunityFlashCard
                                    key={c.id}
                                    card={c}
                                    href={reportHref(c.id)}
                                    viewer="admin"
                                    packageHrefs={{
                                        detailedPdf: reportHref(c.id),
                                        combinedPdf: reportHref(c.id),
                                        certificate: reportHref(c.id),
                                        verify: c.impact_verify_url || undefined,
                                    }}
                                    actions={
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => setBreakdownFor({ id: c.id, title: c.project_title })}
                                                className="text-[10.5px] font-black text-[#0e7d74] hover:underline"
                                            >
                                                View CII breakdown →
                                            </button>
                                            <button
                                                type="button"
                                                disabled={rerunningId === c.id}
                                                onClick={() => void runIndependentAnalysis(c.id)}
                                                className="text-[10.5px] font-black text-[#6d28d9] hover:underline disabled:opacity-50"
                                            >
                                                {rerunningId === c.id ? "Running…" : "Run AI Analyzer →"}
                                            </button>
                                        </>
                                    }
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {effectiveView === "run" && (
                <div className="mt-4">
                    <MockupSectionHead title="AI Analyzer & Rankings" subtitle="Filter the verified cohort, review every place, then publish badges. Faculty CII stays locked." />
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading…</p>
                    ) : cards.length === 0 ? (
                        <EmptyPanel
                            title="No verified cards to rank yet"
                            text="Faculty and admin both have to sign off before a project enters this cohort."
                        />
                    ) : (
                        <AdminNationalRankingStudio
                            cards={cards}
                            notifyEndpoint="/api/v1/admin/community-service/award-notify"
                            onPublished={() => {
                                void loadHub();
                            }}
                        />
                    )}
                </div>
            )}

            {effectiveView === "analytics" && (
                <div className="mt-4 space-y-3">
                    <MockupSectionHead
                        title="Analytics · CIEL PK"
                        subtitle={`${unis} universities · PKR ${Math.round(hours * DIVIDEND_HOURLY_RATE_PKR).toLocaleString()} community dividend`}
                    />
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading…</p>
                    ) : (
                        <CommunityAwardAnalytics cards={deckCards} groupBy="university" />
                    )}
                    <div className="flex flex-wrap gap-4">
                        <Link
                            href="/dashboard/admin/analytics"
                            className="inline-block text-[11px] font-semibold text-[#0e7d74] hover:underline"
                        >
                            Open Analytics & Impact →
                        </Link>
                        <Link
                            href="/dashboard/admin/master-analytics"
                            className="inline-block text-[11px] font-semibold text-[#0e7d74] hover:underline"
                        >
                            Open CIEL Master console →
                        </Link>
                    </div>
                </div>
            )}

            {effectiveView === "exports" && (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {(
                        [
                            ["📄", "National Community Service Summary", "Projects, students, verified person-hours, Community Dividend, reach, SDGs, CII distribution.", "CSV"],
                            ["🏛️", "HEC / Accreditation Pack", "Verified records with faculty accountability, certificates and QR verification IDs.", "CSV"],
                            ["📊", "University Report", "Per-institution breakdown with faculty representatives and partner list.", "CSV"],
                            ["🎓", "Certificate Register", "All issued certificates and verification IDs for the academic year.", "CSV"],
                            ["🌐", "Public Impact Wall export", "Public-safe records only — no private contact data or CNICs.", "HTML"],
                            ["🧾", "Ranking snapshots", "Official ranking runs with cohort definitions and dates.", "CSV"],
                        ] as const
                    ).map(([emoji, title, desc, kind]) => (
                        <div key={title} className="rounded-2xl border border-[#dde5ea] bg-white p-4">
                            <span className="text-[10px] font-black uppercase text-[#70808a]">{kind}</span>
                            <h4 className="mt-1 text-[14px] font-semibold text-[#16313d]">
                                {emoji} {title}
                            </h4>
                            <p className="mt-1 text-[12px] text-[#6b7c86]">{desc}</p>
                            <button
                                type="button"
                                onClick={() => exportVerified(`${title} ${kind}`)}
                                className="mt-3 rounded-full bg-[#0e7d74] px-3.5 py-1.5 text-[11px] font-extrabold text-white"
                            >
                                Generate
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {breakdownFor && (
                <CommunityCiiBreakdownModal
                    fetchUrl={`/api/v1/admin/community-service/reports/${encodeURIComponent(breakdownFor.id)}/cii-v2`}
                    title={breakdownFor.title}
                    onClose={() => setBreakdownFor(null)}
                />
            )}
        </div>
    );
}
