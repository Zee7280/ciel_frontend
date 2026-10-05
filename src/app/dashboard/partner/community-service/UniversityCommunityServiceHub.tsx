"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CommunityCrumb, HubBackButton, UserGuideBanner, ZoneRule } from "@/components/ciel/community-service/CommunityServiceHubChrome";
import { useFacultyHubView } from "@/components/ciel/coursework/CourseworkHubChrome";
import { COMMAND_HERO, MOCKUP_GRADIENTS, MockupActionCard, MockupHero, MockupSectionHead } from "@/components/ciel/dashboard/MockupChrome";
import CommunityAwardPanel from "@/components/ciel/community-service/CommunityAwardPanel";
import CommunityAwardAnalytics from "@/components/ciel/community-service/CommunityAwardAnalytics";
import CommunityFlashCard from "@/components/ciel/community-service/CommunityFlashCard";
import CommunityQueueCard from "@/components/ciel/community-service/CommunityQueueCard";
import ReportProgressCard from "@/components/ciel/community-service/ReportProgressCard";
import OpportunityApprovalCard, {
    approvalActionClass,
    buildOpportunityApprovalModel,
} from "@/components/ciel/community-service/OpportunityApprovalCard";
import { ApprovalFollowUpActions, ContactStudentActions } from "@/components/ciel/community-service/ApprovalFollowUpActions";
import { isFacultyCommunityLiveCard } from "@/utils/reviewQueue";
import { formatDisplayId, formatOpportunityCode } from "@/utils/displayIds";
import { resolveStudentOpportunityWorkflow } from "@/utils/opportunityWorkflow";
import OpportunityListFlashHead from "@/components/opportunities/OpportunityListFlashHead";
import { mailtoHref, whatsappShareHref } from "@/utils/reminderLinks";
import { authenticatedFetch } from "@/utils/api";
import {
    UNI_CS_ANALYTICS as ANALYTICS,
    UNI_CS_BASE as CS_BASE,
    UNI_CS_CREATE_FORM as CREATE_FORM,
    UNI_CS_HOME as HOME,
    UNI_CS_MY_OPPS as MY_OPPS,
    UNI_CS_REPORTS as REPORTS,
    UNI_CS_REPS,
    uniMineBucket as mineBucket,
    uniPickStr as pickStr,
    useUniversityCommunityServiceData,
    type UniFacultyRep,
    type UniOppRow,
    type UniPipelineRow,
} from "./useUniversityCommunityServiceData";

const CS_VIEWS = [
    "home",
    "create",
    "allocation",
    "reps",
    "projects",
    "reports",
    "approved",
    "wall",
    "run",
    "analytics",
    "exports",
] as const;
type CsView = (typeof CS_VIEWS)[number];

const GUIDES: Record<string, { desc: string; items?: [string, string][]; rule?: string }> = {
    home: {
        desc: "Institution-level Community Service oversight. The University publishes opportunities directly (unlimited) and allocates faculty who publish on its behalf.",
        rule: "University publishes directly or through allocated Faculty; CIEL PK gives final platform approval.",
    },
    create: {
        desc: "Publish unlimited University-created opportunities through CIEL PK review.",
        items: [
            ["Create New Opportunity", "Open the University Opportunity Form. Your institution is creator and sponsor."],
            ["Drafts", "Saved opportunities not yet submitted."],
            ["Under Approval", "Waiting on partner acknowledgement (if named) and CIEL PK review."],
            ["Action Required", "Revisions returned to the University."],
            ["Published", "Live in Browse Opportunities for eligible students."],
            ["Closed", "Rejected, expired or closed records retained for history."],
        ],
        rule: "There is no cap on the number of opportunities the University can publish.",
    },
    allocation: {
        desc: "Control who is authorised to represent the University operationally in Community Service.",
        items: [
            ["Requested", "Faculty access/authority requests waiting for institutional action."],
            ["Authorised", "Faculty currently allowed to create/manage Community Service opportunities."],
            ["Revoked / History", "Past authority changes retained for governance."],
            ["Authorise / Revoke", "Institutional control over faculty operational access."],
        ],
        rule: "Allocation complements — it does not replace — direct University publishing.",
    },
    projects: {
        desc: "Institution-wide monitoring of Community Service work.",
        items: [
            ["Projects", "All named opportunities, university-created listings, Opportunity Monitor, and join applications."],
            ["All / University", "Read-only lists. University does not approve or reject the opportunity chain."],
            ["Opportunity Monitor", "Drafts, Pending Faculty, in-approval, active reports, verified and closed."],
            ["Applications", "Join applications on this institution’s listings. Monitor only."],
        ],
        rule: "University oversight is institutional; report approval stays with CIEL PK Admin.",
    },
    reports: {
        desc: "Read-only review of submitted Community Service report packages for your institution.",
        items: [
            ["Pending review", "Submitted reports waiting for CIEL PK Admin's final verification."],
            ["Approved", "Verified reports. Evidence unlocks for the University after super-admin approval."],
            ["Revision / rejected", "Returned to the student for fixes."],
        ],
        rule: "Reports open here only after the student submits. Approve / Revise / Reject stay with CIEL PK Admin.",
    },
    approved: {
        desc: "Verified Community Service records from the University.",
        items: [
            ["Verified Records", "Projects with final approved reports and Verified CII."],
            ["Credentials", "Badges, certificates and QR verification IDs."],
            ["Visibility", "Public/institutional/confidential access is respected."],
        ],
        rule: "Only verified impact belongs here.",
    },
    wall: {
        desc: "Showcase permitted verified Community Service work from the University.",
        items: [
            ["Public Records", "Approved records whose visibility permits public display."],
            ["Institutional Records", "Records visible inside authorised University/CIEL views."],
            ["Filters", "Explore by department, SDG, semester, partner or impact level."],
        ],
        rule: "Rejected and confidential records are never shown publicly.",
    },
    run: {
        desc: "Run University Ruberix Ranking on eligible accepted projects from this institution only.",
        items: [
            ["Select Filters", "Academic year, department, faculty, SDG and other cohort filters within your university."],
            ["Run AI Ranking Analyzer", "Loads eligible projects and generates a Ranking Preview (not published)."],
            ["Publish Ranking", "Creates the official University ranking run, history, ranks, trends and badges."],
            ["CII locked", "Ranking never changes Verified CII."],
        ],
        rule: "Only this University’s eligible accepted projects enter the University ranking pool.",
    },
    analytics: {
        desc: "Institution-wide Community Service performance dashboard.",
        items: [
            ["Projects / Students", "Scale and participation."],
            ["Person-hours", "Verified service contribution."],
            ["Community Dividend", "Verified contribution value."],
            ["Reach / Outcomes", "Beneficiaries and measured change."],
            ["SDGs / Departments / Partners", "Distribution across the University."],
        ],
        rule: "Use aggregate analytics for institutional planning and reporting.",
    },
    exports: {
        desc: "Generate institutional outputs from verified/authorised Community Service data.",
        items: [
            ["HEC-ready Summary", "Structured institutional Community Service reporting."],
            ["Department Report", "Filtered reporting by school/department."],
            ["Certificate Register", "Credential and verification register."],
            ["CSV / Data Export", "Structured data export for authorised institutional use."],
        ],
        rule: "Exports must obey privacy and visibility permissions.",
    },
};

const TONE_CLASS = {
    default: "text-[#0e4d4e]",
    warn: "text-[#9a6410]",
    bad: "text-[#b34c4c]",
} as const;

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

function UniRemindButtons({
    email,
    title,
    opportunityId,
    currentlyWith,
    currentlyWithRole,
    nextStep,
    publicCode,
}: {
    email?: string | null;
    title: string;
    opportunityId?: string;
    currentlyWith?: string | null;
    currentlyWithRole?: string | null;
    nextStep?: string | null;
    publicCode?: string | null;
}) {
    const role = String(currentlyWithRole || "").toLowerCase();
    if (opportunityId && ["faculty", "partner", "admin"].includes(role)) {
        return (
            <div className="mt-1.5">
                <ApprovalFollowUpActions
                    opportunityId={opportunityId}
                    currentlyWithRole={currentlyWithRole}
                    currentlyWith={currentlyWith}
                    title={title}
                    publicCode={publicCode}
                    nextStep={nextStep}
                />
            </div>
        );
    }
    const to = email && email.includes("@") ? email : "";
    const subject = `Community Service reminder — ${title}`;
    const body = `A reminder from your university about “${title}”. Please continue the pending Community Service step in your signed-in CIEL PK dashboard.`;
    return (
        <div className="mt-1.5 flex flex-wrap gap-2">
            <a href={mailtoHref(to, subject, body)} className="rounded-full bg-[#edf4fb] px-3 py-1.5 text-[11px] font-extrabold text-[#376d9f]">
                ✉ Send Reminder
            </a>
            <a href={whatsappShareHref(body)} className="rounded-full bg-[#e8f8ee] px-3 py-1.5 text-[11px] font-extrabold text-[#1f7a46]">
                WhatsApp
            </a>
        </div>
    );
}

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

function universityMonitorMode(row: UniOppRow): "pending" | "revision" | "decided" | "waiting" {
    const stage = resolveStudentOpportunityWorkflow(row).stage;
    if (stage === "revision") return "revision";
    if (String(row.status || "").toLowerCase() === "draft") return "waiting";
    if (stage === "live" || stage === "rejected") return "decided";
    return "pending";
}

function isPendingFacultyRow(row: UniOppRow): boolean {
    return resolveStudentOpportunityWorkflow(row).stage === "pending_faculty";
}

export default function UniversityCommunityServiceHub() {
    const { view, homeHref } = useFacultyHubView(CS_VIEWS, "home");
    const searchParams = useSearchParams();
    const router = useRouter();
    const tabParam = searchParams.get("tab") || "";
    const monitorParam = searchParams.get("monitor") || "";
    const {
        loading,
        orgName,
        mine,
        approvalOpps,
        draftOpps,
        oppRows,
        createCounts,
        pipeline,
        waiting,
        draftRows,
        liveRows,
        closedReports,
        deckCards,
        reps,
        reloadReps,
        approvedProjects,
    } = useUniversityCommunityServiceData();
    const [innerTab, setInnerTab] = useState("");
    const [deptFilter, setDeptFilter] = useState("");
    const [facFilter, setFacFilter] = useState("");
    const [query, setQuery] = useState("");
    const [allocEmail, setAllocEmail] = useState("");
    const [allocOpen, setAllocOpen] = useState(false);
    const [allocBusy, setAllocBusy] = useState(false);
    const [joinApps, setJoinApps] = useState<Array<Record<string, unknown>>>([]);
    const [joinAppsLoading, setJoinAppsLoading] = useState(false);

    useEffect(() => {
        setInnerTab(tabParam);
    }, [tabParam, view]);

    const setHubTab = (id: string) => {
        setInnerTab(id);
        const params = new URLSearchParams(searchParams.toString());
        params.set("view", view === "reps" ? "allocation" : view);
        params.set("tab", id);
        params.set("monitor", "monitor");
        router.replace(`${CS_BASE}?${params.toString()}`, { scroll: false });
    };

    const setMonitorTab = (id: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("view", "projects");
        params.set("monitor", id);
        if (id !== "monitor") params.delete("tab");
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
    const allocTab = ["requested", "authorized", "history"].includes(innerTab) ? innerTab : "authorized";
    const monitorTab = ["all", "university", "monitor", "applications"].includes(monitorParam)
        ? monitorParam
        : tabParam === "all" || tabParam === "university" || tabParam === "applications"
          ? tabParam
          : "monitor";
    const projectTab = ["drafts", "approval", "faculty", "progress", "active", "verified", "closed"].includes(innerTab)
        ? innerTab
        : "active";
    const effectiveView: CsView = view === "reps" ? "allocation" : view;
    const guide = GUIDES[effectiveView] || GUIDES.home;
    const hours = deckCards.reduce((s, c) => s + (c.hours || 0), 0);

    const departments = useMemo(() => {
        const set = new Set<string>();
        for (const row of pipeline) if (row.department) set.add(row.department);
        for (const card of deckCards) if (card.department) set.add(card.department);
        return [...set].sort();
    }, [pipeline, deckCards]);
    const facultyNames = useMemo(() => {
        const set = new Set<string>();
        for (const row of pipeline) if (row.faculty_name) set.add(row.faculty_name);
        for (const card of deckCards) if (card.faculty_name) set.add(card.faculty_name);
        return [...set].sort();
    }, [pipeline, deckCards]);

    const filterProject = (row: UniPipelineRow) => {
        if (deptFilter && (row.department || "") !== deptFilter) return false;
        if (facFilter && (row.faculty_name || "") !== facFilter) return false;
        if (query) {
            const hay = `${row.project_title} ${row.student_name} ${row.organization_name || ""}`.toLowerCase();
            if (!hay.includes(query.toLowerCase())) return false;
        }
        return true;
    };
    const filterOpp = (row: UniOppRow) => {
        if (query && !`${row.title}`.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
    };

    useEffect(() => {
        if (effectiveView !== "projects" || monitorTab !== "applications") return;
        let cancelled = false;
        setJoinAppsLoading(true);
        Promise.all([
            authenticatedFetch("/api/v1/partner/opportunity-applications?status=pending", {}, { redirectToLogin: false }),
            authenticatedFetch("/api/v1/partner/opportunity-applications?status=history", {}, { redirectToLogin: false }),
        ])
            .then(async ([pendingRes, historyRes]) => {
                const pendingJson = pendingRes?.ok ? await pendingRes.json() : null;
                const historyJson = historyRes?.ok ? await historyRes.json() : null;
                const pending = Array.isArray(pendingJson?.data) ? pendingJson.data : [];
                const history = Array.isArray(historyJson?.data) ? historyJson.data : [];
                if (!cancelled) setJoinApps([...pending, ...history]);
            })
            .catch(() => {
                if (!cancelled) setJoinApps([]);
            })
            .finally(() => {
                if (!cancelled) setJoinAppsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [effectiveView, monitorTab]);

    const attention = [
        {
            key: "alloc",
            n: 0,
            title: "Faculty allocation requests",
            sub: "Authorise opportunity-creation authority",
            href: `${CS_BASE}?view=allocation&tab=requested`,
            tone: "default" as const,
        },
        {
            key: "approval",
            n: approvalOpps.length,
            title: "Opportunities in approval",
            sub: "Faculty → Partner → CIEL PK",
            href: `${CS_BASE}?view=projects&tab=approval`,
            tone: approvalOpps.length ? ("bad" as const) : ("default" as const),
        },
        {
            key: "progress",
            n: draftRows.length,
            title: "Reports in progress",
            sub: "Institution-wide · opens after submit",
            href: `${CS_BASE}?view=projects&tab=progress`,
            tone: draftRows.length ? ("warn" as const) : ("default" as const),
        },
        {
            key: "impact",
            n: deckCards.length,
            title: "Verified impact records",
            sub: "On the University Impact Wall",
            href: `${CS_BASE}?view=approved`,
            tone: "default" as const,
        },
    ];

    const allocateFaculty = async () => {
        setAllocBusy(true);
        try {
            const res = await authenticatedFetch(UNI_CS_REPS, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ faculty_email: allocEmail.trim() }),
            });
            const json = await res?.json().catch(() => null);
            if (!res?.ok) {
                toast.error(json?.message || "Could not authorise that faculty email.");
                return;
            }
            toast.success("Faculty authorised to create Community Service opportunities.");
            setAllocEmail("");
            setAllocOpen(false);
            await reloadReps();
        } finally {
            setAllocBusy(false);
        }
    };

    const revokeFaculty = async (rep: UniFacultyRep) => {
        if (!rep.faculty_user_id) {
            toast.error("This representative cannot be revoked from a fallback record.");
            return;
        }
        const res = await authenticatedFetch(`${UNI_CS_REPS}/${encodeURIComponent(rep.faculty_user_id)}`, {
            method: "DELETE",
        });
        if (!res?.ok) {
            const json = await res?.json().catch(() => null);
            toast.error(json?.message || "Could not revoke this faculty.");
            return;
        }
        toast.success("Authority revoked.");
        await reloadReps();
    };

    const exportVerified = (kind: string) => {
        const rows = deckCards.map((c) =>
            [
                c.project_title,
                formatDisplayId(c.id, "RPT"),
                c.student_name,
                c.faculty_name,
                c.department,
                String(c.cii ?? ""),
                c.level || "",
                String(c.hours || 0),
                c.sdg,
            ].map((v) => csvEscape(String(v))),
        );
        const header = ["Project", "ID", "Student", "Faculty", "Department", "CII", "Level", "Hours", "SDG"].join(",");
        if (kind.includes("HTML")) {
            const body = `<h1>${orgName} Impact Wall</h1><p>Public-safe verified records only. No private contact data.</p><ul>${deckCards
                .map((c) => `<li>${c.project_title} · ${c.student_name} · CII ${c.cii ?? "—"}</li>`)
                .join("")}</ul>`;
            downloadText(`${orgName.replace(/\s+/g, "_")}_impact_wall.html`, `<!doctype html><title>${orgName}</title>${body}`, "text/html");
        } else {
            downloadText(`${orgName.replace(/\s+/g, "_")}_${kind.replace(/\s+/g, "_")}.csv`, [header, ...rows.map((r) => r.join(","))].join("\n"), "text/csv");
        }
        toast.success("Export generated from live verified records.");
    };

    return (
        <div className="mx-auto min-w-0 max-w-[1500px] pb-16">
            <CommunityCrumb
                role="University"
                view={
                    effectiveView === "home"
                        ? undefined
                        : effectiveView === "create"
                          ? "Create Opportunity"
                          : effectiveView === "allocation"
                            ? "Faculty Allocation"
                            : effectiveView === "projects"
                              ? "Community Service Projects"
                              : effectiveView === "reports"
                                ? "Reports for Review"
                              : effectiveView === "approved"
                                ? "Approved Project Record"
                                : effectiveView === "wall"
                                  ? "My Impact Wall"
                                  : effectiveView === "run"
                                    ? "AI Ranking Analyzer"
                                    : effectiveView === "analytics"
                                      ? "Analytics"
                                      : "Reports / Exports"
                }
            />
            {effectiveView === "home" ? (
                <MockupHero
                    kicker="Community Service · University"
                    title={`${orgName} · Community Service`}
                    subtitle="Allocate faculty, monitor institution-wide projects, review verified impact and build evidence for institutional reporting."
                    gradient={COMMAND_HERO}
                    stats={[
                        { value: String(reps.length), label: "Authorised faculty", href: `${CS_BASE}?view=allocation` },
                        { value: String(approvedProjects), label: "Active projects", href: `${CS_BASE}?view=projects` },
                        { value: `${hours}h`, label: "Person-hours", href: `${CS_BASE}?view=analytics` },
                        { value: String(deckCards.length), label: "Verified records", href: `${CS_BASE}?view=approved` },
                    ]}
                    rightStat={{ value: "🌱", label: "University Community Service hub" }}
                />
            ) : (
                <div className="mt-4">
                    <HubBackButton href={homeHref} label="← Back to Community Service" />
                </div>
            )}

            {effectiveView === "home" && (
                <>
                    <UserGuideBanner {...GUIDES.home} />
                    <ZoneRule title="Navigation rule">
                        You entered Community Service from the left. Everything below belongs to this impact area; Home remains a
                        clean overview. Faculty Allocation controls authority; projects, impact, analytics and exports remain
                        separate for clarity.
                    </ZoneRule>
                    <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                        {attention.map((item) => (
                            <Link
                                key={item.key}
                                href={item.href}
                                className="flex items-center gap-3 rounded-2xl border border-[#dde5ea] bg-white px-4 py-3.5"
                            >
                                <span className={`min-w-[36px] text-[26px] font-black leading-none ${TONE_CLASS[item.tone]}`}>
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
                        <MockupActionCard href={`${CS_BASE}?view=create`} emoji="🚀" ghost="🚀" title="Create Opportunity" subtitle="Publish unlimited University opportunities directly and manage Drafts, Under Approval, Action Required, Published and Closed." badge="UNLIMITED PUBLISHING" background={MOCKUP_GRADIENTS.teal} />
                        <MockupActionCard href={`${CS_BASE}?view=allocation`} emoji="👩‍🏫" ghost="👩‍🏫" title="Faculty Allocation" subtitle="Authorise faculty representatives who publish on behalf of the University." badge="AUTHORITY" background="linear-gradient(135deg,#455a78,#7088ad)" />
                        <MockupActionCard href={`${CS_BASE}?view=projects`} emoji="📈" ghost="📈" title="Community Service Projects" subtitle="Monitor every University Community Service project, progress, faculty, partners and student participation." badge="TRACK" background={MOCKUP_GRADIENTS.blue} />
                        <MockupActionCard href={`${CS_BASE}?view=reports`} emoji="📝" ghost="📝" title="Reports for Review" subtitle="Read-only review of submitted report packages from your institution: score, flashcard, detailed report and evidence (unlocked after super-admin approval)." badge="READ ONLY" background={MOCKUP_GRADIENTS.red} hot={waiting.length > 0} />
                        <MockupActionCard href={`${CS_BASE}?view=approved`} emoji="✅" ghost="✅" title="Approved Project Record" subtitle="CIEL PK-published reports with CII, badges and QR verification." badge="VERIFIED" background={MOCKUP_GRADIENTS.green} />
                        <MockupActionCard href={`${CS_BASE}?view=wall`} emoji="🏆" ghost="🏆" title="My Impact Wall" subtitle="Published flash cards linked to the approved impact package." badge="SHOWCASE" background={MOCKUP_GRADIENTS.orange} />
                        <MockupActionCard href={`${CS_BASE}?view=run`} emoji="🧠" ghost="🧠" title="AI Ranking Analyzer" subtitle="Run University Ruberix Ranking on your institution’s eligible accepted projects only. Preview first; Publish Ranking creates the official run." badge="ANALYZE" background={MOCKUP_GRADIENTS.purple} />
                        <MockupActionCard href={`${CS_BASE}?view=analytics`} emoji="📊" ghost="📊" title="Analytics" subtitle="Institution-wide hours, dividend, reach, SDGs, departments, partners and CII distribution." badge="INSIGHTS" background={MOCKUP_GRADIENTS.gold} />
                        <MockupActionCard href={`${CS_BASE}?view=exports`} emoji="📤" ghost="📤" title="Reports / Exports" subtitle="HEC-ready summaries, department reports, certificate registers and authorised exports." badge="EXPORT" background="linear-gradient(135deg,#455a78,#7088ad)" />
                    </div>
                    <Link href={HOME} className="mt-4 inline-block text-[11px] font-semibold text-[#0e7d74] hover:underline">
                        ← Back to Home
                    </Link>
                </>
            )}

            {effectiveView !== "home" ? <div className="mt-4"><UserGuideBanner {...guide} /></div> : null}

            {effectiveView === "create" && (
                <div className="mt-4">
                    <MockupSectionHead
                        title="Create Opportunity"
                        subtitle="University-created opportunities stay here from draft to publication. Partner acknowledgement is required only when a partner is named; CIEL PK gives final platform approval. No publishing limit."
                        action={
                            <Link href={CREATE_FORM} className="rounded-full bg-[#0e7d74] px-4 py-2 text-[12px] font-extrabold text-white">
                                + Create New Opportunity
                            </Link>
                        }
                    />
                    <p className="mb-4 rounded-[14px] border border-[#dce6ea] bg-[#f7fafb] px-3.5 py-3 text-[12.5px] text-[#52636e]">
                        <b className="text-[#16313d]">Simple rule:</b> If the University created the opportunity, its creator status stays here. Once students are assigned, their service/report progress appears under Community Service Projects.
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
                    ) : mine.filter((row) => mineBucket(row) === createTab).length === 0 ? (
                        <EmptyPanel title="Nothing here" text={`No records under ${createTab}.`} />
                    ) : (
                        <div className="space-y-2.5">
                            {mine
                                .filter((row) => mineBucket(row) === createTab)
                                .map((row) => (
                                    <Link
                                        key={row.id}
                                        href={
                                            createTab === "drafts"
                                                ? `${CREATE_FORM}?edit=${encodeURIComponent(row.id)}&draft=1`
                                                : createTab === "action"
                                                  ? `${MY_OPPS}/${encodeURIComponent(row.id)}?edit=true`
                                                  : `${MY_OPPS}/${encodeURIComponent(row.id)}`
                                        }
                                        className="block overflow-hidden rounded-[26px] border border-[#d9e3e7] bg-white shadow-[0_18px_50px_rgba(15,43,54,.08)]"
                                    >
                                        <OpportunityListFlashHead title={row.title} />
                                        <div className="px-4 py-3">
                                            <small className="block text-[11.5px] text-[#6b7c86]">
                                                {formatOpportunityCode(row)} · {String(row.status || "in review")}
                                            </small>
                                        </div>
                                    </Link>
                                ))}
                        </div>
                    )}
                </div>
            )}

            {effectiveView === "allocation" && (
                <div className="mt-4">
                    <MockupSectionHead
                        title="Faculty Allocation"
                        subtitle="Locked rule: University → Allocate Faculty → Faculty creates opportunity. Direct University publishing remains available in Create Opportunity."
                        action={
                            <button type="button" onClick={() => setAllocOpen(true)} className="rounded-full bg-[#0e7d74] px-4 py-2 text-[12px] font-extrabold text-white">
                                + Allocate faculty
                            </button>
                        }
                    />
                    <HubTabs
                        tabs={[
                            { id: "requested", label: "Requested", count: 0 },
                            { id: "authorized", label: "Authorised", count: reps.length },
                            { id: "history", label: "Revoked / History", count: 0 },
                        ]}
                        active={allocTab}
                        onChange={setHubTab}
                    />
                    {allocTab !== "authorized" ? (
                        <EmptyPanel
                            title={allocTab === "requested" ? "No requests waiting" : "No revoked history in this list"}
                            text="Authorised faculty appear under Authorised. Incoming requests show here when a faculty account asks for institutional authority."
                        />
                    ) : loading ? (
                        <p className="text-sm text-slate-500">Loading…</p>
                    ) : reps.length === 0 ? (
                        <EmptyPanel title="No authorised faculty yet" text="Allocate a faculty email to let them publish Community Service opportunities on the University’s behalf." />
                    ) : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {reps.map((rep) => (
                                <article key={rep.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-900">{rep.faculty_name || "Faculty member"}</h3>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {[rep.faculty_department, rep.faculty_email].filter(Boolean).join(" · ") || "Authorised to create Community Service opportunities"}
                                            </p>
                                        </div>
                                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-800">Authorised</span>
                                    </div>
                                    {rep.faculty_user_id ? (
                                        <button type="button" onClick={() => void revokeFaculty(rep)} className="mt-3 rounded-full bg-[#f8d4d4] px-3 py-1.5 text-[11px] font-extrabold text-[#9a2b2b]">
                                            Revoke
                                        </button>
                                    ) : null}
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {effectiveView === "projects" && (
                <div className="mt-4">
                    <MockupSectionHead title="Opportunity Monitor" subtitle="Read-only institutional view of the same master opportunity. Live status and approval journey — no Approve/Reject on this chain." />
                    <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="rounded-[10px] border border-[#dde5ea] bg-white px-2.5 py-2 text-[11px]">
                            <option value="">All departments</option>
                            {departments.map((d) => (
                                <option key={d}>{d}</option>
                            ))}
                        </select>
                        <select value={facFilter} onChange={(e) => setFacFilter(e.target.value)} className="rounded-[10px] border border-[#dde5ea] bg-white px-2.5 py-2 text-[11px]">
                            <option value="">All faculty</option>
                            {facultyNames.map((d) => (
                                <option key={d}>{d}</option>
                            ))}
                        </select>
                        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search project / student / partner…" className="rounded-[10px] border border-[#dde5ea] bg-white px-2.5 py-2 text-[11px]" />
                    </div>
                    <HubTabs
                        tabs={[
                            { id: "all", label: "All opportunities", count: oppRows.filter(filterOpp).length },
                            { id: "university", label: "University opportunities", count: mine.filter(filterOpp).length },
                            { id: "monitor", label: "Opportunity Monitor", count: approvalOpps.filter(filterOpp).length + draftOpps.filter(filterOpp).length },
                            { id: "applications", label: "Applications", count: joinApps.length },
                        ]}
                        active={monitorTab}
                        onChange={setMonitorTab}
                    />
                    {monitorTab === "all" || monitorTab === "university" ? (
                        loading ? (
                            <p className="text-sm text-slate-500">Loading…</p>
                        ) : (monitorTab === "university" ? mine : oppRows).filter(filterOpp).length === 0 ? (
                            <EmptyPanel
                                title="Nothing here"
                                text={
                                    monitorTab === "university"
                                        ? "Opportunities created by this university appear here. Read-only — no Approve/Reject."
                                        : "Named opportunities for this institution appear here. Read-only — no Approve/Reject."
                                }
                            />
                        ) : (
                            <div className="grid gap-3">
                                {(monitorTab === "university" ? mine : oppRows).filter(filterOpp).map((row) => {
                                    const model = buildOpportunityApprovalModel(row, "university", { orgName, mode: universityMonitorMode(row) });
                                    return (
                                        <div key={row.id}>
                                            <OpportunityApprovalCard
                                                {...model}
                                                actions={
                                                    <Link href={`${MY_OPPS}/${encodeURIComponent(row.id)}`} className={approvalActionClass.soft}>
                                                        Open Flashcard
                                                    </Link>
                                                }
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ) : monitorTab === "applications" ? (
                        joinAppsLoading ? (
                            <p className="text-sm text-slate-500">Loading…</p>
                        ) : joinApps.length === 0 ? (
                            <EmptyPanel title="No join applications" text="Applications to this university’s listings appear here. University does not approve the opportunity chain from this tab." />
                        ) : (
                            <div className="grid gap-3">
                                {joinApps.map((row) => {
                                    const id = String(row.id || "");
                                    const oppId = String(row.opportunity_id || "");
                                    const title = String(row.opportunity_title || "Opportunity");
                                    const student = String(row.student_name || "Student");
                                    const stage = String(row.application_stage || row.internal_status || "—");
                                    return (
                                        <article key={id} className="rounded-2xl border border-[#dde5ea] bg-white p-4">
                                            <p className="text-[10px] font-black uppercase tracking-wide text-[#70808a]">{stage.replace(/_/g, " ")}</p>
                                            <b className="mt-1 block text-[13px] text-[#16313d]">{title}</b>
                                            <p className="mt-0.5 text-[12px] text-[#4f6068]">{student}{row.student_email ? ` · ${String(row.student_email)}` : ""}</p>
                                            {oppId ? (
                                                <Link href={`${MY_OPPS}/${encodeURIComponent(oppId)}`} className={`${approvalActionClass.soft} mt-3 inline-flex`}>
                                                    Open opportunity
                                                </Link>
                                            ) : null}
                                        </article>
                                    );
                                })}
                            </div>
                        )
                    ) : (
                    <>
                    <HubTabs
                        tabs={[
                            { id: "drafts", label: "Drafts", count: draftOpps.filter(filterOpp).length },
                            { id: "faculty", label: "Pending Faculty", count: approvalOpps.filter(isPendingFacultyRow).filter(filterOpp).length },
                            { id: "approval", label: "In approval", count: approvalOpps.filter(filterOpp).length },
                            { id: "progress", label: "In progress", count: draftRows.filter(filterProject).length },
                            { id: "active", label: "Active reports", count: waiting.filter(filterProject).length },
                            { id: "verified", label: "Verified", count: liveRows.filter(filterProject).length },
                            { id: "closed", label: "Closed", count: closedReports.filter(filterProject).length },
                        ]}
                        active={projectTab}
                        onChange={setHubTab}
                    />
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading…</p>
                    ) : projectTab === "progress" ? (
                        draftRows.filter(filterProject).length === 0 ? (
                            <EmptyPanel title="Nothing in progress" text="Reports students have started but not submitted appear here with how much is filled. A report opens for you only after the student submits it." />
                        ) : (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {draftRows.filter(filterProject).map((row) => (
                                    <ReportProgressCard
                                        key={row.id}
                                        title={row.project_title || "Report"}
                                        student={row.student_name || "Student"}
                                        org={row.organization_name}
                                        hours={row.hours}
                                        progressPct={row.progress_pct ?? 0}
                                        sectionsComplete={row.sections_complete}
                                        sectionsTotal={row.sections_total}
                                    />
                                ))}
                            </div>
                        )
                    ) : projectTab === "drafts" ? (
                        draftOpps.filter(filterOpp).length === 0 ? (
                            <EmptyPanel title="Nothing here" text="Student and institution drafts named to this university appear here. They cannot be approved until submitted." />
                        ) : (
                            <div className="grid gap-3">
                                {draftOpps.filter(filterOpp).map((row) => {
                                    const model = buildOpportunityApprovalModel(row, "university", { orgName, mode: "decided" });
                                    return (
                                        <div key={row.id}>
                                            <OpportunityApprovalCard
                                                {...model}
                                                actions={
                                                    <Link href={`${MY_OPPS}/${encodeURIComponent(row.id)}`} className={approvalActionClass.soft}>
                                                        Open Flashcard
                                                    </Link>
                                                }
                                            />
                                            <ContactStudentActions
                                                studentEmail={pickStr(row, "creator_email", "student_email", "email")}
                                                title={row.title}
                                                publicCode={pickStr(row, "public_code", "publicCode")}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ) : projectTab === "faculty" ? (
                        approvalOpps.filter(isPendingFacultyRow).filter(filterOpp).length === 0 ? (
                            <EmptyPanel title="Nothing pending Faculty" text="When a student from this institution is waiting on Faculty, the same Opportunity ID appears here. Read-only." />
                        ) : (
                            <div className="grid gap-3">
                                {approvalOpps
                                    .filter(isPendingFacultyRow)
                                    .filter(filterOpp)
                                    .map((row) => {
                                        const model = buildOpportunityApprovalModel(row, "university", { orgName, mode: "pending" });
                                        return (
                                            <div key={row.id}>
                                                <OpportunityApprovalCard
                                                    {...model}
                                                    actions={
                                                        <Link href={`${MY_OPPS}/${encodeURIComponent(row.id)}`} className={approvalActionClass.soft}>
                                                            Open Flashcard
                                                        </Link>
                                                    }
                                                />
                                                <UniRemindButtons
                                                    email={pickStr(row, "creator_email", "faculty_email")}
                                                    title={row.title}
                                                    opportunityId={row.id}
                                                    currentlyWith={pickStr(row, "currently_with", "currentlyWith")}
                                                    currentlyWithRole={pickStr(row, "currently_with_role", "currentlyWithRole")}
                                                    nextStep={pickStr(row, "next_step", "nextStep")}
                                                    publicCode={pickStr(row, "public_code", "publicCode")}
                                                />
                                            </div>
                                        );
                                    })}
                            </div>
                        )
                    ) : projectTab === "approval" ? (
                        approvalOpps.filter(filterOpp).length === 0 ? (
                            <EmptyPanel title="Nothing here" text="Opportunities still moving through Faculty → Partner → CIEL PK appear here." />
                        ) : (
                            <div className="grid gap-3">
                                {approvalOpps.filter(filterOpp).map((row) => {
                                    const model = buildOpportunityApprovalModel(row, "university", { orgName, mode: "pending" });
                                    return (
                                        <div key={row.id}>
                                            <OpportunityApprovalCard
                                                {...model}
                                                actions={
                                                    <Link href={`${MY_OPPS}/${encodeURIComponent(row.id)}`} className={approvalActionClass.soft}>
                                                        Open Flashcard
                                                    </Link>
                                                }
                                            />
                                            <UniRemindButtons
                                                email={pickStr(row, "creator_email", "faculty_email")}
                                                title={row.title}
                                                opportunityId={row.id}
                                                currentlyWith={pickStr(row, "currently_with", "currentlyWith")}
                                                currentlyWithRole={pickStr(row, "currently_with_role", "currentlyWithRole")}
                                                nextStep={pickStr(row, "next_step", "nextStep")}
                                                publicCode={pickStr(row, "public_code", "publicCode")}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ) : (
                        (() => {
                            const list = (projectTab === "verified" ? liveRows : projectTab === "closed" ? closedReports : waiting).filter(filterProject);
                            if (!list.length) return <EmptyPanel title="Nothing here" text="Approved engagements appear here once students are assigned." />;
                            return (
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {list.map((row) => (
                                        <div key={row.id}>
                                            <CommunityQueueCard href={`${REPORTS}`} title={row.project_title || "Report"} student={row.student_name || "Student"} org={row.organization_name} hours={row.hours} tone={isFacultyCommunityLiveCard(row) ? "approved" : "waiting"} cta="View progress →" />
                                            {isFacultyCommunityLiveCard(row) ? null : <UniRemindButtons email={row.student_email} title={row.project_title || "Report"} />}
                                        </div>
                                    ))}
                                </div>
                            );
                        })()
                    )}
                    </>
                    )}
                </div>
            )}

            {effectiveView === "reports" && (
                <div className="mt-4">
                    <MockupSectionHead title="Reports for Review" subtitle="Submitted reports only. Read-only for the University: CIEL PK Admin finalises verification." />
                    <HubTabs
                        tabs={[
                            { id: "pending", label: "Pending review", count: waiting.filter(filterProject).length },
                            { id: "done", label: "Approved", count: liveRows.filter(filterProject).length },
                            { id: "rejected", label: "Revision / rejected", count: closedReports.filter(filterProject).length },
                        ]}
                        active={["pending", "done", "rejected"].includes(innerTab) ? innerTab : "pending"}
                        onChange={setHubTab}
                    />
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading…</p>
                    ) : (
                        (() => {
                            const tab = ["pending", "done", "rejected"].includes(innerTab) ? innerTab : "pending";
                            const list = (tab === "done" ? liveRows : tab === "rejected" ? closedReports : waiting).filter(filterProject);
                            if (!list.length) return <EmptyPanel title="Nothing here" text="Submitted reports for your institution appear here." />;
                            return (
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {list.map((row) => (
                                        <CommunityQueueCard
                                            key={row.id}
                                            href={`/dashboard/partner/verify/${encodeURIComponent(row.id)}?package=1`}
                                            title={row.project_title || "Report"}
                                            student={row.student_name || "Student"}
                                            org={row.organization_name}
                                            hours={row.hours}
                                            tone={tab === "done" ? "approved" : "waiting"}
                                            cta="Open report (read-only) →"
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
                    <MockupSectionHead title={`Approved Project Record · ${orgName}`} subtitle="CIEL PK-published reports only. Rejected work never appears here." />
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading…</p>
                    ) : deckCards.length === 0 ? (
                        <EmptyPanel title="None yet" text="Verified cards appear here after CIEL PK Admin publishes the package." />
                    ) : (
                        <div className="overflow-x-auto rounded-2xl border border-[#dde5ea] bg-white">
                            <table className="min-w-[720px] w-full text-left text-[12px]">
                                <thead className="bg-[#f7fafb] text-[10px] uppercase tracking-wide text-[#70808a]">
                                    <tr>
                                        <th className="px-3 py-2">Project</th>
                                        <th className="px-3 py-2">Student · faculty</th>
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
                                                <span className="text-[11px] text-[#6b7c86]">{formatDisplayId(c.id, "RPT")} · {c.department}</span>
                                            </td>
                                            <td className="px-3 py-3 text-[#4f6068]">
                                                {c.student_name}
                                                <br />
                                                <span className="text-[11px] text-[#6b7c86]">{c.faculty_name}</span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <b>{c.cii ?? "—"}</b> {c.level ? <span className="ml-1 text-[10px]">{c.level}</span> : null}
                                            </td>
                                            <td className="px-3 py-3">{c.hours || 0}h</td>
                                            <td className="px-3 py-3">
                                                <Link href={`/dashboard/partner/verify/${encodeURIComponent(c.id)}?package=1`} className="rounded-full bg-[#0e7d74] px-3 py-1.5 text-[11px] font-extrabold text-white">Open</Link>
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
                    <MockupSectionHead title={`${orgName} · My Impact Wall`} subtitle="After CIEL PK Admin publishes: flashcard, CII, detailed report and combined package. QR stays on the flashcard. No certificate download." action={<Link href={ANALYTICS} className="text-xs font-black text-[#087c75] hover:underline">Open analytics →</Link>} />
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
                                    href={`/dashboard/partner/verify/${encodeURIComponent(c.id)}?package=1`}
                                    viewer="university"
                                    packageHrefs={{
                                        detailedPdf: `/dashboard/partner/verify/${encodeURIComponent(c.id)}?package=1&doc=report`,
                                        combinedPdf: `/dashboard/partner/verify/${encodeURIComponent(c.id)}?package=1`,
                                        verify: c.impact_verify_url || undefined,
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {effectiveView === "run" && (
                <div className="mt-4">
                    <MockupSectionHead title="AI Ranking Analyzer" subtitle={`${orgName} University Cohort only — other universities never enter this pool. Preview freely; Publish Ranking creates a dated official run. Avoid #1 of 1.`} />
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading…</p>
                    ) : deckCards.length === 0 ? (
                        <EmptyPanel title="No live cards to rank yet" text="Faculty-approved Community Service fills this run." />
                    ) : (
                        <CommunityAwardPanel cards={deckCards} kind="uni" scopeName={`${orgName} University Cohort`} notifyEndpoint="/api/v1/partners/community-service/award-notify" filters={{ department: true, faculty: true }} />
                    )}
                </div>
            )}

            {effectiveView === "analytics" && (
                <div className="mt-4 space-y-3">
                    <MockupSectionHead title={`Analytics · ${orgName}`} subtitle="Semester-level view. Community Dividend = verified volunteer contribution value + verified student out-of-pocket investment (not wages paid)." />
                    {loading ? <p className="text-sm text-slate-500">Loading…</p> : <CommunityAwardAnalytics cards={deckCards} groupBy="department" />}
                    <a href={ANALYTICS} className="inline-block text-[11px] font-semibold text-[#0e7d74] hover:underline">Open full university analytics →</a>
                </div>
            )}

            {effectiveView === "exports" && (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {(
                        [
                            ["📄", "Semester Community Service Summary", "Projects, students, verified person-hours, Community Dividend, reach, SDGs, CII distribution.", "CSV"],
                            ["🏛️", "HEC / Accreditation Pack", "Verified records with faculty accountability, certificates and QR verification IDs.", "CSV"],
                            ["📊", "Department Report", "Per-department breakdown with faculty representatives and partner list.", "CSV"],
                            ["🎓", "Certificate Register", "All issued certificates and verification IDs for the academic year.", "CSV"],
                            ["🌐", "Public Impact Wall export", "Public-safe records only — no private contact data or CNICs.", "HTML"],
                            ["🧾", "Ranking snapshots", "Official ranking runs with cohort definitions and dates.", "CSV"],
                        ] as const
                    ).map(([emoji, title, desc, kind]) => (
                        <div key={title} className="rounded-2xl border border-[#dde5ea] bg-white p-4">
                            <span className="text-[10px] font-black uppercase text-[#70808a]">{kind}</span>
                            <h4 className="mt-1 text-[14px] font-semibold text-[#16313d]">{emoji} {title}</h4>
                            <p className="mt-1 text-[12px] text-[#6b7c86]">{desc}</p>
                            <button type="button" onClick={() => exportVerified(`${title} ${kind}`)} className="mt-3 rounded-full bg-[#0e7d74] px-3.5 py-1.5 text-[11px] font-extrabold text-white">
                                Generate
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {allocOpen ? (
                <div className="fixed inset-0 z-[110] overflow-auto bg-[rgba(4,37,43,0.55)] p-5" onClick={(e) => { if (e.target === e.currentTarget) setAllocOpen(false); }}>
                    <div className="mx-auto mt-16 w-full max-w-[480px] overflow-hidden rounded-[22px] bg-white">
                        <div className="bg-[linear-gradient(115deg,#04252b,#0e5f63_60%,#12a5a0_120%)] px-5 py-4 text-white">
                            <b className="text-[13.5px]">Allocate faculty representative</b>
                        </div>
                        <div className="space-y-3 px-5 py-4 text-[12.5px] text-[#3f5661]">
                            <p>Authorise faculty who create through the Faculty Opportunity Builder; their opportunities show “Sponsored / Initiated by {orgName}”.</p>
                            <input value={allocEmail} onChange={(e) => setAllocEmail(e.target.value)} placeholder="Faculty email" className="w-full rounded-xl border border-[#dde5ea] px-3 py-2 text-[12px]" />
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setAllocOpen(false)} className="rounded-full bg-[#eef2f3] px-3 py-1.5 text-[11px] font-extrabold">Cancel</button>
                                <button type="button" disabled={allocBusy} onClick={() => void allocateFaculty()} className="rounded-full bg-[#0e7d74] px-3 py-1.5 text-[11px] font-extrabold text-white">
                                    Authorise
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
