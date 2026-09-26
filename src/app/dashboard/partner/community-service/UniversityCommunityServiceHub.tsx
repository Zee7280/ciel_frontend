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
import OpportunityApprovalCard, {
    approvalActionClass,
    buildOpportunityApprovalModel,
} from "@/components/ciel/community-service/OpportunityApprovalCard";
import CommunityCiiBreakdownModal from "@/components/ciel/community-service/CommunityCiiBreakdownModal";
import { isFacultyCommunityLiveCard } from "@/utils/reviewQueue";
import { formatDisplayId } from "@/utils/displayIds";
import OpportunityListFlashHead from "@/components/opportunities/OpportunityListFlashHead";
import { mailtoHref, whatsappShareHref } from "@/utils/reminderLinks";
import { authenticatedFetch } from "@/utils/api";
import {
    UNI_CS_ANALYTICS as ANALYTICS,
    UNI_CS_BASE as CS_BASE,
    UNI_CS_CREATE_FORM as CREATE_FORM,
    UNI_CS_HOME as HOME,
    UNI_CS_IMPACT as IMPACT,
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
    "approved",
    "wall",
    "run",
    "analytics",
    "files",
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
            ["Projects", "View opportunity/report stage, student/team, faculty and partner."],
            ["Progress", "Report completion %, last activity and member hours where authorised."],
            ["Reminders", "System follow-up to the responsible stakeholder."],
            ["Filters", "Review by department, faculty, partner, semester or status."],
        ],
        rule: "University oversight is institutional; academic report approval remains with Faculty.",
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
        desc: "Analyse and rank verified University projects in meaningful cohorts.",
        items: [
            ["Preview", "Dynamic ranking analysis."],
            ["Official Run", "Dated permanent University cohort snapshot, subject to role limits."],
            ["Cohort Filters", "Define semester, department, SDG or other meaningful comparison group."],
            ["Explanation", "Shows why each project ranks where it does."],
        ],
        rule: "Avoid misleading micro-cohorts such as “#1 of 1”.",
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
    files: {
        desc: "One place for every analysis file shared across stakeholders.",
        items: [
            ["Faculty Analysis", "The faculty decision file for each submitted report: decision, CII accepted or moderated, reason, comments."],
            ["AI Analyzer reports", "The latest dated AI Analyzer badge and run history for each project."],
            ["Open / Download", "View inside the dashboard, print, or download the file."],
        ],
        rule: "Files are shared automatically — nobody has to send them.",
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

function UniRemindButtons({ email, title }: { email?: string | null; title: string }) {
    const to = email && email.includes("@") ? email : "";
    const subject = `Community Service reminder — ${title}`;
    const body = `A reminder from your university about “${title}”. Please continue the pending Community Service step in your signed-in CIEL PK dashboard.`;
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

export default function UniversityCommunityServiceHub() {
    const { view, homeHref } = useFacultyHubView(CS_VIEWS, "home");
    const searchParams = useSearchParams();
    const router = useRouter();
    const tabParam = searchParams.get("tab") || "";
    const {
        loading,
        orgName,
        mine,
        approvalOpps,
        createCounts,
        pipeline,
        waiting,
        liveRows,
        closedReports,
        decidedReports,
        deckCards,
        reps,
        reloadReps,
        approvedProjects,
    } = useUniversityCommunityServiceData();
    const [innerTab, setInnerTab] = useState("");
    const [breakdownFor, setBreakdownFor] = useState<{ id: string; title: string } | null>(null);
    const [rerunningId, setRerunningId] = useState<string | null>(null);
    const [deptFilter, setDeptFilter] = useState("");
    const [facFilter, setFacFilter] = useState("");
    const [query, setQuery] = useState("");
    const [allocEmail, setAllocEmail] = useState("");
    const [allocOpen, setAllocOpen] = useState(false);
    const [allocBusy, setAllocBusy] = useState(false);

    useEffect(() => {
        setInnerTab(tabParam);
    }, [tabParam, view]);

    const setHubTab = (id: string) => {
        setInnerTab(id);
        const params = new URLSearchParams(searchParams.toString());
        params.set("view", view === "reps" ? "allocation" : view);
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
    const allocTab = ["requested", "authorized", "history"].includes(innerTab) ? innerTab : "authorized";
    const projectTab = ["approval", "active", "verified", "closed"].includes(innerTab) ? innerTab : "active";
    const filesTab = innerTab === "ai" ? "ai" : "faculty";
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
            n: waiting.length,
            title: "Reports in progress",
            sub: "Institution-wide",
            href: `${CS_BASE}?view=projects&tab=active`,
            tone: waiting.length ? ("warn" as const) : ("default" as const),
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

    /** Backend already permits universities to run an extra AI pass on an already faculty-approved
     * report (never overwrites the faculty-approved score/level) — this just wires a button to it. */
    const runIndependentAnalysis = async (reportId: string) => {
        setRerunningId(reportId);
        try {
            const res = await authenticatedFetch(
                `/api/v1/partners/community-service/reports/${encodeURIComponent(reportId)}/independent-analysis`,
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
                              : effectiveView === "approved"
                                ? "Approved Impact"
                                : effectiveView === "wall"
                                  ? "Impact Wall"
                                  : effectiveView === "run"
                                    ? "AI Analyzer & Rankings"
                                    : effectiveView === "analytics"
                                      ? "Analytics"
                                      : effectiveView === "files"
                                        ? "Shared Analysis Files"
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
                        <MockupActionCard href={`${CS_BASE}?view=approved`} emoji="✅" ghost="✅" title="Approved Impact" subtitle="Verified reports with CII, badges, certificates and QR verification." badge="VERIFIED" background={MOCKUP_GRADIENTS.green} />
                        <MockupActionCard href={`${CS_BASE}?view=wall`} emoji="🏆" ghost="🏆" title="Impact Wall" subtitle="Permission-aware University showcase of verified Community Service work." badge="SHOWCASE" background={MOCKUP_GRADIENTS.orange} />
                        <MockupActionCard href={`${CS_BASE}?view=run`} emoji="🧠" ghost="🧠" title="AI Analyzer & Rankings" subtitle="Run permitted institutional ranking previews and official cohort snapshots." badge="ANALYZE" background={MOCKUP_GRADIENTS.purple} />
                        <MockupActionCard href={`${CS_BASE}?view=analytics`} emoji="📊" ghost="📊" title="Analytics" subtitle="Institution-wide hours, dividend, reach, SDGs, departments, partners and CII distribution." badge="INSIGHTS" background={MOCKUP_GRADIENTS.gold} />
                        <MockupActionCard href={`${CS_BASE}?view=files`} emoji="📁" ghost="📁" title="Shared Analysis Files" subtitle="Faculty Analysis files and AI Analyzer reports shared with every stakeholder on the record — same file, same version, every dashboard." badge="SHARED" background={MOCKUP_GRADIENTS.purple} />
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
                                                {formatDisplayId(row.id, "OPP")} · {String(row.status || "in review")}
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
                    <MockupSectionHead title="Community Service Projects" subtitle="Institution-wide view. Draft answers remain private; you see stage, completion, last activity and member hours." />
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
                            { id: "approval", label: "In approval", count: approvalOpps.filter(filterOpp).length },
                            { id: "active", label: "Active reports", count: waiting.filter(filterProject).length },
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
                                            <UniRemindButtons email={pickStr(row, "creator_email", "faculty_email")} title={row.title} />
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
                </div>
            )}

            {effectiveView === "approved" && (
                <div className="mt-4">
                    <MockupSectionHead title={`Approved Impact · ${orgName}`} subtitle="Verified reports only. Rejected work never appears here." />
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading…</p>
                    ) : deckCards.length === 0 ? (
                        <EmptyPanel title="None yet" text="Verified cards appear here after Faculty sign-off." />
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
                                                <Link href={IMPACT} className="rounded-full bg-[#0e7d74] px-3 py-1.5 text-[11px] font-extrabold text-white">Open</Link>
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
                    <MockupSectionHead title={`${orgName} Impact Wall`} subtitle="After faculty approval: flashcard, badge, ranking + trend, CII, detailed report, PDF and combined package. QR stays on the flashcard. No certificate download." action={<Link href={IMPACT} className="text-xs font-black text-[#087c75] hover:underline">Open Impact Wall →</Link>} />
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
                                    href={`/dashboard/partner/verify/${encodeURIComponent(c.id)}`}
                                    viewer="university"
                                    packageHrefs={{
                                        detailedPdf: `/dashboard/partner/verify/${encodeURIComponent(c.id)}`,
                                        combinedPdf: `/dashboard/partner/verify/${encodeURIComponent(c.id)}`,
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
                    <MockupSectionHead title="AI Analyzer & Rankings" subtitle={`${orgName} University Cohort. Preview freely; an official run creates a dated snapshot. Avoid #1 of 1.`} />
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

            {effectiveView === "files" && (
                <div className="mt-4">
                    <MockupSectionHead title={`Shared files · ${orgName}`} subtitle="Faculty Analysis files and AI Analyzer reports are shared automatically." />
                    <HubTabs
                        tabs={[
                            { id: "faculty", label: "Faculty Analysis files", count: decidedReports.length },
                            { id: "ai", label: "AI Analyzer reports", count: deckCards.filter((c) => c.cii != null).length },
                        ]}
                        active={filesTab}
                        onChange={setHubTab}
                    />
                    {filesTab === "ai" ? (
                        deckCards.filter((c) => c.cii != null).length === 0 ? (
                            <EmptyPanel title="No AI Analyzer runs yet" text="The dated CII badge is the shared file every stakeholder sees." />
                        ) : (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {deckCards.filter((c) => c.cii != null).map((card) => (
                                    <div key={card.id} className="rounded-2xl border border-[#dde5ea] bg-white px-4 py-3.5">
                                        <div className="text-[22px]">🧠</div>
                                        <b className="mt-1 block text-[14px] text-[#16313d]">{card.project_title}</b>
                                        <small className="mt-1 block text-[11.5px] text-[#6b7c86]">{card.level || "CII"} · {card.cii}/100 · {card.student_name}</small>
                                        <div className="mt-2 flex flex-wrap items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setBreakdownFor({ id: card.id, title: card.project_title })}
                                                className="text-[10.5px] font-black text-[#0e7d74] hover:underline"
                                            >
                                                View CII breakdown →
                                            </button>
                                            <button
                                                type="button"
                                                disabled={rerunningId === card.id}
                                                onClick={() => void runIndependentAnalysis(card.id)}
                                                className="text-[10.5px] font-black text-[#6d28d9] hover:underline disabled:opacity-50"
                                            >
                                                {rerunningId === card.id ? "Running…" : "Run AI Analyzer →"}
                                            </button>
                                            <Link href={IMPACT} className="text-[10.5px] font-black text-[#6b7c86] hover:underline">
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
                                <Link key={row.id} href={REPORTS} className="rounded-2xl border border-[#dde5ea] bg-white px-4 py-3.5">
                                    <div className="text-[22px]">📄</div>
                                    <b className="mt-1 block text-[14px] text-[#16313d]">{row.project_title}</b>
                                    <small className="mt-1 block text-[11.5px] text-[#6b7c86]">{formatDisplayId(row.id, "RPT")} · {row.faculty_status || row.status} · {row.student_name}</small>
                                </Link>
                            ))}
                        </div>
                    )}
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
