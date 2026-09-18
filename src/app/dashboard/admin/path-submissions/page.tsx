"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Briefcase, ExternalLink, GraduationCap, Loader2, Search } from "lucide-react";
import { authenticatedFetch, resolveSameOriginApiPath } from "@/utils/api";
import { Badge } from "@/app/dashboard/student/report/components/ui/badge";
import { Card } from "@/app/dashboard/student/report/components/ui/card";
import { sdgData } from "@/utils/sdgData";
import MeritModelPanel, { type MeritEntry } from "@/components/ciel/MeritModelPanel";
import { type FypMeritEntry } from "@/components/ciel/FypMeritPanel";
import FypRankingStudio from "@/components/ciel/FypRankingStudio";
import FacultyFypFlashcardModal, {
    FacultyFypProgressCard,
    FacultyFypApprovedCard,
    UniversityFypReviewCard,
    AdminFypFacultyWorkPanel,
} from "@/components/ciel/FacultyFypFlashcard";
import FacultyFypDetailedReview from "@/components/ciel/FacultyFypDetailedReview";
import CourseworkCard from "@/components/ciel/CourseworkCard";
import Tabs from "@/components/ciel/Tabs";
import CourseworkAnalyticsPanel from "@/components/ciel/coursework/CourseworkAnalyticsPanel";
import { CourseworkCrumb, HubBackButton, PathSectionHead } from "@/components/ciel/coursework/CourseworkHubChrome";
import { MOCKUP_GRADIENTS, MockupActionCard, MockupHero, MockupSectionHead } from "@/components/ciel/dashboard/MockupChrome";
import { namedTimeGreeting } from "@/utils/timeGreeting";
import { isFacultyApproved } from "@/utils/courseworkSectionReview";
import { isPathEntryApproved, isPathEntryWaiting } from "@/utils/reviewQueue";

type PathTab = "course-project" | "fyp-thesis" | "startup-business";

interface AdminStudent {
    id: string;
    name: string;
    email: string;
    institution?: string | null;
    department?: string | null;
}

interface AdminGroupMember {
    name: string;
    email?: string;
    rollNumber?: string;
    role?: string;
    inviteStatus?: "pending" | "accepted";
}

interface AdminCourseProjectRow {
    id: string;
    course: string | null;
    projectTitle: string | null;
    projectDescription: string | null;
    sdgs: number[] | null;
    evidenceUrls: string[] | null;
    assignmentFileUrl?: string | null;
    stepCompleted: number;
    status: "draft" | "submitted";
    facultyApprovalStatus?: "pending" | "approved" | "rejected" | "revision_requested" | null;
    updatedAt: string;
    student: AdminStudent | null;
    studentInfo?: { groupMembers?: (string | AdminGroupMember)[] } | null;
}

interface FypMilestone {
    label: string;
    status: "pending" | "in_progress" | "complete";
    dueDate?: string | null;
    completedAt?: string | null;
}

interface FypDeliverable {
    version: number;
    label: string;
    fileUrl: string;
    uploadedAt: string;
}

interface FypSectionSummaries {
    project?: string;
    background?: string;
    objectives?: string;
    literature?: string;
    methodology?: string;
    findings?: string;
    sdg?: string;
    reflection?: string;
}

interface AdminFypRow {
    id: string;
    projectTitle: string | null;
    overview: string | null;
    milestones: FypMilestone[];
    deliverables: FypDeliverable[];
    communityLinkage: {
        orgName?: string;
        contactName?: string;
        contactEmail?: string;
        description?: string;
    } | null;
    milestonesComplete: number;
    milestonesTotal: number;
    deliverablesCount: number;
    progressStatus: "complete" | "in_progress";
    /** Present only once a student has used the 9-step guided wizard — takes priority over the legacy milestone timeline above. */
    wizardStepsComplete: number | null;
    wizardStepsTotal: number | null;
    status?: "draft" | "submitted";
    supervisorApprovalStatus?: "pending" | "approved" | "rejected" | "revision_requested" | null;
    supervisorApprovalNote?: string | null;
    sectionSummaries?: FypSectionSummaries | null;
    updatedAt: string;
    student: AdminStudent | null;
    projectInfo?: { teamMembers?: (string | AdminGroupMember)[] } | null;
}

interface VentureTractionRow {
    date: string;
    metric: string;
    value: string;
    note?: string;
}

interface VentureTeamMember {
    name: string;
    role: string;
    email?: string;
    inviteStatus?: "pending" | "accepted";
}

interface VentureSectionSummaries {
    opportunity?: string;
    advantage?: string;
    business?: string;
    traction?: string;
    impact?: string;
    ask?: string;
    founder?: string;
}

interface VentureGates {
    academicOk: boolean;
    showcaseOk: boolean;
    investmentReadyOk: boolean;
}

interface AdminVentureRow {
    id: string;
    ventureName: string | null;
    description: string | null;
    stage: string | null;
    tractionRows: VentureTractionRow[];
    team: VentureTeamMember[];
    materialUrls: string[] | null;
    isVisible: boolean;
    completenessPercent: number;
    status?: "draft" | "submitted";
    stepCompleted?: number;
    sectionSummaries?: VentureSectionSummaries | null;
    gates?: VentureGates;
    updatedAt: string;
    student: AdminStudent | null;
}

const PATH_TABS: { id: PathTab; label: string; icon: typeof BookOpen }[] = [
    { id: "course-project", label: "Course projects", icon: BookOpen },
    { id: "fyp-thesis", label: "FYP / Thesis", icon: GraduationCap },
    { id: "startup-business", label: "Startups", icon: Briefcase },
];

function studentLine(student: AdminStudent | null) {
    if (!student) return "Unknown student";
    return [student.name, student.email, student.institution].filter(Boolean).join(" · ");
}

function normalizeMembers(raw: (string | AdminGroupMember)[] | undefined): AdminGroupMember[] {
    return (raw ?? []).map((m) => (typeof m === "string" ? { name: m } : m)).filter((m) => m.name?.trim());
}

function memberStatusLabel(member: { email?: string; inviteStatus?: "pending" | "accepted" }) {
    if (!member.email) return null;
    return member.inviteStatus === "accepted" ? "✅ confirmed" : "✉️ invited, unconfirmed";
}

const ADMIN_PATH = "/dashboard/admin/path-submissions";
const COURSE_VIEWS = ["home", "progress", "review", "approved", "rank", "stats", "submissions", "hec"] as const;
const FYP_HUB_VIEWS = ["home", "progress", "review", "approved", "rank", "faculty-work"] as const;
type CourseView = (typeof COURSE_VIEWS)[number];
type FypHubView = (typeof FYP_HUB_VIEWS)[number];
const COURSE_VIEW_CRUMB: Record<Exclude<CourseView, "home">, string> = {
    progress: "Coursework in Progress",
    review: "Coursework Under Review",
    approved: "Approved Coursework Impact",
    rank: "Coursework AI Rankings",
    stats: "Analytics",
    submissions: "All submissions",
    hec: "HEC / Government lens",
};
const FYP_VIEW_CRUMB: Record<Exclude<FypHubView, "home">, string> = {
    progress: "FYP in Progress",
    review: "FYP Under Review",
    approved: "Approved FYP + AI Ranking",
    rank: "Approved FYP + AI Ranking",
    "faculty-work": "Faculty Work — all universities",
};

function tabFromSearch(tab: string | null): PathTab {
    return tab === "fyp-thesis" || tab === "startup-business" || tab === "course-project" ? tab : "course-project";
}

function tabHref(tab: PathTab, view?: string, pane?: string) {
    const q = new URLSearchParams({ tab });
    if (view && view !== "home") q.set("view", view);
    if (pane) q.set("pane", pane);
    return `${ADMIN_PATH}?${q.toString()}`;
}

export default function AdminPathSubmissionsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>}>
            <AdminPathSubmissionsHub />
        </Suspense>
    );
}

function AdminPathSubmissionsHub() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathTab = tabFromSearch(searchParams.get("tab"));
    const rawView = searchParams.get("view");
    const courseView: CourseView =
        pathTab === "course-project" && rawView && (COURSE_VIEWS as readonly string[]).includes(rawView) ? (rawView as CourseView) : "home";
    const fypView: FypHubView =
        pathTab === "fyp-thesis" && rawView && (FYP_HUB_VIEWS as readonly string[]).includes(rawView) ? (rawView as FypHubView) : "home";
    const pane = searchParams.get("pane");
    const fypApprovedTab: "studio" | "list" = pane === "list" ? "list" : "studio";
    const fypReviewTab: "all" | "pending" | "revision" | "rejected" =
        pane === "pending" || pane === "revision" || pane === "rejected" ? pane : "all";
    const setPathTab = (tab: PathTab) => router.push(tabHref(tab));

    const [courseRows, setCourseRows] = useState<AdminCourseProjectRow[]>([]);
    const [fypRows, setFypRows] = useState<AdminFypRow[]>([]);
    const [ventureRows, setVentureRows] = useState<AdminVentureRow[]>([]);
    const [courseFilter, setCourseFilter] = useState<"all" | "waiting" | "approved" | "draft">("all");
    const [ventureFilter, setVentureFilter] = useState<"all" | "waiting" | "submitted" | "visible" | "private">("all");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [reviewTab, setReviewTab] = useState<"all" | "pending" | "revision" | "rejected">("all");
    const [openFlashcardId, setOpenFlashcardId] = useState<string | null>(null);
    const [openReviewId, setOpenReviewId] = useState<string | null>(null);
    const [hubStats, setHubStats] = useState<{ active: number; attention: number; hub: number; completion: number } | null>(null);
    const [meritEntries, setMeritEntries] = useState<MeritEntry[]>([]);
    const [meritLoading, setMeritLoading] = useState(false);
    const [approvedMeritEntries, setApprovedMeritEntries] = useState<MeritEntry[]>([]);
    const [fypMeritEntries, setFypMeritEntries] = useState<FypMeritEntry[]>([]);
    const [fypMeritLoading, setFypMeritLoading] = useState(false);

    useEffect(() => {
        if (pathTab !== "course-project") return;
        if (courseView !== "approved" && courseView !== "rank" && courseView !== "stats" && courseView !== "hec") return;
        let cancelled = false;
        setMeritLoading(true);
        authenticatedFetch("/api/v1/admin/paths/course-projects")
            .then((res) => (res?.ok ? res.json() : null))
            .then((payload) => {
                if (!cancelled) setMeritEntries(Array.isArray(payload?.data) ? payload.data : []);
            })
            .finally(() => {
                if (!cancelled) setMeritLoading(false);
            });
        // The "Approved Coursework" wall — backed by a query that only ever returns approved
        // records (enforced server-side), kept separate from meritEntries above since that list
        // stays unfiltered for the analytics panel's full status breakdown.
        authenticatedFetch("/api/v1/admin/paths/course-projects?approvalStatus=approved")
            .then((res) => (res?.ok ? res.json() : null))
            .then((payload) => {
                if (!cancelled) setApprovedMeritEntries(Array.isArray(payload?.data) ? payload.data : []);
            });
        return () => {
            cancelled = true;
        };
    }, [pathTab, courseView]);

    useEffect(() => {
        if (pathTab !== "fyp-thesis" || (fypView !== "approved" && fypView !== "rank")) return;
        let cancelled = false;
        setFypMeritLoading(true);
        // The "Approved FYP" wall — backed by a query that only ever returns approved records
        // (enforced server-side), never left to client-side filtering.
        authenticatedFetch("/api/v1/admin/paths/fyp-thesis?approvalStatus=approved")
            .then((res) => (res?.ok ? res.json() : null))
            .then((payload) => {
                if (!cancelled) setFypMeritEntries(Array.isArray(payload?.data) ? payload.data : []);
            })
            .finally(() => {
                if (!cancelled) setFypMeritLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [pathTab, fypView]);

    useEffect(() => {
        if (pathTab !== "fyp-thesis" || fypView !== "home") return;
        let cancelled = false;
        authenticatedFetch(resolveSameOriginApiPath("/api/v1/admin/dashboard"), {}, { redirectToLogin: false, timeoutMs: 60_000 })
            .then((res) => (res?.ok ? res.json() : null))
            .then((result) => {
                if (cancelled) return;
                const metrics = result?.data?.metrics as
                    | { opportunities?: number; pendingApprovals?: number; totalReports?: number; totalUsers?: { total?: number } }
                    | undefined;
                if (!metrics) return;
                const pending = metrics.pendingApprovals ?? 0;
                const reports = metrics.totalReports ?? 0;
                const active = metrics.opportunities ?? metrics.totalUsers?.total ?? 0;
                setHubStats({
                    active,
                    attention: pending,
                    hub: reports,
                    completion: reports + pending > 0 ? Math.round((reports / (reports + pending)) * 100) : 0,
                });
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [pathTab, fypView]);

    useEffect(() => {
        setExpandedId(null);
    }, [pathTab, courseFilter, ventureFilter]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        const load = async () => {
            try {
                if (pathTab === "course-project") {
                    const res = await authenticatedFetch(`/api/v1/admin/paths/course-projects`);
                    const payload = res?.ok ? await res.json() : null;
                    if (!cancelled) setCourseRows(Array.isArray(payload?.data) ? payload.data : []);
                    return;
                }
                if (pathTab === "fyp-thesis") {
                    const res = await authenticatedFetch(`/api/v1/admin/paths/fyp-thesis`);
                    const payload = res?.ok ? await res.json() : null;
                    if (!cancelled) setFypRows(Array.isArray(payload?.data) ? payload.data : []);
                    return;
                }
                const res = await authenticatedFetch(`/api/v1/admin/paths/startup-business`);
                const payload = res?.ok ? await res.json() : null;
                if (!cancelled) setVentureRows(Array.isArray(payload?.data) ? payload.data : []);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void load();
        return () => {
            cancelled = true;
        };
    }, [pathTab]);

    const q = search.trim().toLowerCase();

    const filteredCourse = useMemo(() => {
        return courseRows.filter((row) => {
            if (courseFilter === "waiting" && !isPathEntryWaiting(row)) return false;
            if (courseFilter === "approved" && !isPathEntryApproved(row)) return false;
            if (courseFilter === "draft" && row.status !== "draft") return false;
            if (!q) return true;
            return [row.projectTitle, row.course, row.projectDescription, row.student?.name, row.student?.email, row.student?.institution]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(q);
        });
    }, [courseRows, courseFilter, q]);

    const filteredVentures = useMemo(() => {
        return ventureRows.filter((row) => {
            if (ventureFilter === "waiting" && row.status === "submitted") return false;
            if (ventureFilter === "submitted" && row.status !== "submitted") return false;
            if (ventureFilter === "visible" && !row.isVisible) return false;
            if (ventureFilter === "private" && row.isVisible) return false;
            if (!q) return true;
            return [row.ventureName, row.description, row.stage, row.student?.name, row.student?.email, row.student?.institution]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(q);
        });
    }, [ventureRows, ventureFilter, q]);

    const sdgTitle = (num: number) => sdgData.find((s) => s.number === num)?.title ?? `SDG ${num}`;

    const emptyMessage =
        pathTab === "course-project"
            ? `No course project entries${courseFilter !== "all" ? ` with status “${courseFilter}”.` : "."}`
            : `No startup entries${ventureFilter !== "all" ? ` marked “${ventureFilter}”.` : "."}`;

    const activeCount = pathTab === "course-project" ? filteredCourse.length : filteredVentures.length;

    const courseRowsAsMerit = useMemo(() => courseRows as unknown as MeritEntry[], [courseRows]);
    const approvedCourse = useMemo(
        () => courseRowsAsMerit.filter(isFacultyApproved),
        [courseRowsAsMerit],
    );
    const waitingCourse = useMemo(
        () => courseRowsAsMerit.filter(isPathEntryWaiting),
        [courseRowsAsMerit],
    );
    const draftCourse = useMemo(
        () => courseRowsAsMerit.filter((r) => r.status === "draft"),
        [courseRowsAsMerit],
    );

    const fypRowsAsMerit = useMemo(() => fypRows as unknown as FypMeritEntry[], [fypRows]);
    const approvedFyp = useMemo(
        () => fypRowsAsMerit.filter(isPathEntryApproved),
        [fypRowsAsMerit],
    );
    const waitingFyp = useMemo(
        () => fypRowsAsMerit.filter(isPathEntryWaiting),
        [fypRowsAsMerit],
    );
    const revisionFyp = useMemo(
        () => fypRowsAsMerit.filter((r) => r.status === "submitted" && r.supervisorApprovalStatus === "revision_requested"),
        [fypRowsAsMerit],
    );
    const rejectedFyp = useMemo(
        () => fypRowsAsMerit.filter((r) => r.status === "submitted" && r.supervisorApprovalStatus === "rejected"),
        [fypRowsAsMerit],
    );
    const underReviewFyp = useMemo(
        () => fypRowsAsMerit.filter((r) => r.status === "submitted" && !isPathEntryApproved(r)),
        [fypRowsAsMerit],
    );
    const underReviewFypBadge = underReviewFyp.filter((r) => r.supervisorApprovalStatus !== "rejected").length;
    const draftFyp = useMemo(
        () => fypRowsAsMerit.filter((r) => r.status === "draft"),
        [fypRowsAsMerit],
    );
    const fypUniverse = useMemo(() => {
        const m = new Map<string, FypMeritEntry>();
        for (const e of [...fypRowsAsMerit, ...fypMeritEntries]) {
            if (e.id) m.set(e.id, e);
        }
        return [...m.values()];
    }, [fypRowsAsMerit, fypMeritEntries]);
    const openFlashcard = fypUniverse.find((e) => e.id === openFlashcardId) || null;
    const openReview = fypUniverse.find((e) => e.id === openReviewId) || null;
    const updateFypEntry = (id: string, patch: Partial<FypMeritEntry>) => {
        const merge = (prev: FypMeritEntry[]) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e));
        setFypRows((prev) => merge(prev as unknown as FypMeritEntry[]) as unknown as AdminFypRow[]);
        setFypMeritEntries(merge);
    };

    return (
        <div className="space-y-6 p-6">
            {pathTab === "course-project" ? (
                <div className="mx-auto max-w-[1500px] space-y-4">
                    <CourseworkCrumb
                        role="CIEL PK"
                        view={courseView === "home" ? undefined : COURSE_VIEW_CRUMB[courseView]}
                        pathLabel="Coursework"
                    />
                    {courseView === "home" ? (
                    <>
                    <MockupHero
                        kicker="CIEL PK · COURSEWORK"
                        title={namedTimeGreeting("CIEL PK", "📘")}
                        subtitle="Track coursework records from first draft to faculty verification across every university."
                        stats={[
                            { value: String(approvedCourse.length), label: "APPROVED" },
                            { value: String(waitingCourse.length), label: "UNDER REVIEW" },
                            { value: String(draftCourse.length), label: "IN PROGRESS" },
                        ]}
                    />
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <MockupActionCard
                            href={tabHref("course-project", "progress")}
                            emoji="🧩"
                            ghost="🧩"
                            title="Coursework in Progress"
                            subtitle="Live completion percentage, sections completed and student delays — with Email / WhatsApp reminders on each record."
                            badge={`${draftCourse.length} IN PROGRESS`}
                            background={MOCKUP_GRADIENTS.teal}
                        />
                        <MockupActionCard
                            href={tabHref("course-project", "review")}
                            emoji="📤"
                            ghost="📤"
                            title="Coursework Under Review"
                            subtitle="Submitted flashcards waiting for faculty approval or returned for student revision. Remind whoever holds the workflow."
                            badge={`${waitingCourse.length} UNDER REVIEW`}
                            background={MOCKUP_GRADIENTS.blue}
                        />
                        <MockupActionCard
                            href={tabHref("course-project", "approved")}
                            emoji="🏅"
                            ghost="🏅"
                            title="Approved Coursework Impact"
                            subtitle="Every faculty-approved flashcard across universities — the same record the student, faculty and university see."
                            badge={`${approvedCourse.length} APPROVED`}
                            background={MOCKUP_GRADIENTS.green}
                        />
                        <MockupActionCard
                            href={tabHref("course-project", "rank")}
                            emoji="🧮"
                            ghost="🧮"
                            title="Coursework AI Rankings"
                            subtitle="Rank approved coursework nationwide. Waiting submissions stay out of the live picks."
                            badge="RANKINGS"
                            background={MOCKUP_GRADIENTS.purple}
                        />
                        <MockupActionCard
                            href={tabHref("course-project", "stats")}
                            emoji="📊"
                            ghost="📊"
                            title="Analytics"
                            subtitle="Universities, criteria and formats — the intelligence layer only CIEL PK sees."
                            badge="MASTER ONLY"
                            background={MOCKUP_GRADIENTS.navy}
                        />
                        <MockupActionCard
                            href={tabHref("course-project", "submissions")}
                            emoji="🗂️"
                            ghost="🗂️"
                            title="All submissions"
                            subtitle="Drafts, waiting, and approved — search across every status in one list."
                            badge={`${courseRows.length} ENTRIES`}
                            background={MOCKUP_GRADIENTS.gold}
                        />
                        <MockupActionCard
                            href={tabHref("course-project", "hec")}
                            emoji="🎓"
                            ghost="🎓"
                            title="HEC / Government lens"
                            subtitle="Flash cards and analytics only — no review actions, no edits."
                            badge="READ-ONLY"
                            background={MOCKUP_GRADIENTS.navy}
                            full
                        />
                    </div>
                    </>
                    ) : null}
                </div>
            ) : pathTab === "fyp-thesis" ? (
                <div className="mx-auto max-w-[1500px] space-y-4">
                    <CourseworkCrumb
                        role="CIEL PK"
                        view={fypView === "home" ? undefined : FYP_VIEW_CRUMB[fypView]}
                        pathLabel="Final Year Project (FYP)"
                    />
                    {fypView === "home" ? (
                    <>
                    <MockupHero
                        title="Final Year Project (FYP)"
                        subtitle="Track Final Year Projects from initial draft through faculty approval and final EI analysis."
                        stats={[
                            { value: String(hubStats?.active ?? fypRows.length), label: "Active Records" },
                            { value: String(hubStats?.attention ?? underReviewFypBadge), label: "Need Attention" },
                            { value: String(hubStats?.hub ?? approvedFyp.length), label: "On Impact Hub" },
                        ]}
                        rightStat={{
                            value: `${hubStats?.completion ?? (approvedFyp.length + underReviewFypBadge > 0 ? Math.round((approvedFyp.length / (approvedFyp.length + underReviewFypBadge)) * 100) : 0)}%`,
                            label: "approval completion this semester",
                        }}
                    />
                    <MockupSectionHead
                        title="Final Year Project (FYP)"
                        subtitle="No pre-approval. CIEL PK sees each Final Year Project the moment the student starts, follows it through supervisor review, and receives every approved flashcard automatically."
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <MockupActionCard
                            href={tabHref("fyp-thesis", "progress")}
                            emoji="🔬"
                            ghost="🔬"
                            title="FYP in Progress"
                            subtitle="Live completion percentage, sections completed and student delays — with Email / WhatsApp reminders on each record."
                            badge={`${draftFyp.length} IN PROGRESS`}
                            background={MOCKUP_GRADIENTS.teal}
                        />
                        <MockupActionCard
                            href={tabHref("fyp-thesis", "review")}
                            emoji="📝"
                            ghost="📝"
                            title="FYP Under Review"
                            subtitle="Submitted flashcards waiting for supervisor approval or returned for student revision. Remind whoever holds the workflow."
                            badge={`${underReviewFypBadge} UNDER REVIEW`}
                            background={MOCKUP_GRADIENTS.blue}
                        />
                        <MockupActionCard
                            href={tabHref("fyp-thesis", "approved")}
                            emoji="🏅"
                            ghost="🏅"
                            title="Approved FYP + CIEL PK AI Analyser"
                            subtitle="Every supervisor-approved FYP across all universities and disciplines, each with its Detailed Review and badges. Run the CIEL PK AI Analyser any day, any time — benchmarked against excellent work per discipline, ranked best → less best with rationale; the live badge moves like a stock (▲ green / ▼ red) on every student's flashcard."
                            badge={`${approvedFyp.length} APPROVED`}
                            background={MOCKUP_GRADIENTS.green}
                        />
                    </div>
                    </>
                    ) : null}
                </div>
            ) : (
                <header className="space-y-2">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Admin · Student paths</p>
                    <h1 className="text-2xl font-black text-slate-900">Path submissions</h1>
                    <p className="max-w-3xl text-sm text-slate-600">
                        Review student work from Course Project, FYP / Thesis, and Startup / Business workspaces. Community service
                        opportunities stay under All projects and Applications.
                    </p>
                </header>
            )}

            {pathTab === "startup-business" ? (
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
                {PATH_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const active = pathTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setPathTab(tab.id)}
                            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                                active ? "bg-emerald-700 text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-emerald-300"
                            }`}
                        >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>
            ) : null}

            {pathTab === "course-project" && courseView === "home" ? null : pathTab === "course-project" && courseView === "hec" ? (
                <>
                    <HubBackButton href={tabHref("course-project")} label="← Back to Coursework" />
                    {meritLoading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <CourseworkAnalyticsPanel entries={meritEntries} />
                            {approvedMeritEntries.length === 0 ? (
                                <Card className="border-dashed p-10 text-center text-slate-500">No faculty-approved coursework cards yet.</Card>
                            ) : (
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {approvedMeritEntries.map((entry) => (
                                        <CourseworkCard key={entry.id} entry={entry} studentName={entry.student?.name} hideScore={false} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            ) : pathTab === "course-project" && courseView === "stats" ? (
                <>
                    <HubBackButton href={tabHref("course-project")} label="← Back to Coursework" />
                    {meritLoading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                        </div>
                    ) : (
                        <CourseworkAnalyticsPanel entries={meritEntries} />
                    )}
                </>
            ) : pathTab === "course-project" && courseView === "progress" ? (
                <>
                    <HubBackButton href={tabHref("course-project")} label="← Back to Coursework" />
                    <p className="text-sm text-slate-500">Live workspace-linked completion status across all universities.</p>
                    {draftCourse.length === 0 ? (
                        <Card className="border-dashed p-10 text-center text-slate-500">Nothing in progress right now.</Card>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {draftCourse.map((entry) => (
                                <CourseworkCard
                                    key={entry.id}
                                    entry={entry}
                                    studentName={entry.student?.name}
                                    remindDraftOwner
                                    studentEmail={entry.student?.email || entry.studentInfo?.studentEmail}
                                />
                            ))}
                        </div>
                    )}
                </>
            ) : pathTab === "course-project" && courseView === "review" ? (
                (() => {
                    const byTab = {
                        pending: waitingCourse.filter((e) => e.facultyApprovalStatus === "pending"),
                        revision: waitingCourse.filter((e) => e.facultyApprovalStatus === "revision_requested"),
                        rejected: waitingCourse.filter((e) => e.facultyApprovalStatus === "rejected"),
                    };
                    const visible = reviewTab === "all" ? waitingCourse : byTab[reviewTab];
                    return (
                        <>
                            <HubBackButton href={tabHref("course-project")} label="← Back to Coursework" />
                            <p className="text-sm text-slate-500">
                                Faculty decides; while a submission is waiting on faculty, the AI review score is visible only to that
                                faculty member — CIEL PK sees status, owner and waiting time here. Once approved, scores and rankings
                                become visible to CIEL PK and the university under Ranking Studio, for cross-university benchmarking.
                            </p>
                            <Tabs
                                tabs={[
                                    { key: "all", label: `All · ${waitingCourse.length}` },
                                    { key: "pending", label: `Waiting faculty · ${byTab.pending.length}` },
                                    { key: "revision", label: `Revision with student · ${byTab.revision.length}` },
                                    { key: "rejected", label: `Rejected · ${byTab.rejected.length}` },
                                ]}
                                active={reviewTab}
                                onChange={(key) => setReviewTab(key as typeof reviewTab)}
                            />
                            {visible.length === 0 ? (
                                <Card className="border-dashed p-10 text-center text-slate-500">Nothing in this tab right now.</Card>
                            ) : (
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {visible.map((entry) => (
                                        <CourseworkCard
                                            key={entry.id}
                                            entry={entry}
                                            studentName={entry.student?.name}
                                            studentReminder={entry.facultyApprovalStatus === "pending" ? "faculty" : undefined}
                                            remindDraftOwner={entry.facultyApprovalStatus === "revision_requested"}
                                            studentEmail={entry.student?.email || entry.studentInfo?.studentEmail}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    );
                })()
            ) : pathTab === "course-project" && courseView === "approved" ? (
                <>
                    <HubBackButton href={tabHref("course-project")} label="← Back to Coursework" />
                    {meritLoading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                        </div>
                    ) : approvedMeritEntries.length === 0 ? (
                        <Card className="border-dashed p-10 text-center text-slate-500">No faculty-approved coursework cards yet.</Card>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {approvedMeritEntries.map((entry) => (
                                <CourseworkCard key={entry.id} entry={entry} studentName={entry.student?.name} hideScore={false} />
                            ))}
                        </div>
                    )}
                </>
            ) : pathTab === "course-project" && courseView === "rank" ? (
                <>
                    <HubBackButton href={tabHref("course-project")} label="← Back to Coursework" />
                    {meritLoading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                        </div>
                    ) : (
                        <MeritModelPanel entries={approvedMeritEntries} showDepartmentFilter showFacultyFilter showUniversityFilter meritEndpoint="/api/v1/paths/course-projects/merit-model" scopeName="CIEL PK — all universities" />
                    )}
                </>
            ) : pathTab === "fyp-thesis" && fypView === "progress" ? (
                <>
                    <HubBackButton href={tabHref("fyp-thesis")} label="← Back to module buttons" />
                    <PathSectionHead
                        title="FYP in Progress"
                        subtitle={`${draftFyp.length} record${draftFyp.length === 1 ? "" : "s"} · Super Admin rule: wherever a student is holding the workflow, Email + WhatsApp reminder actions sit on that exact record.`}
                        pill="READ ONLY"
                    />
                    <p className="text-sm text-slate-500">Live workspace-linked completion status across all universities.</p>
                    {draftFyp.length === 0 ? (
                        <Card className="border-dashed p-10 text-center text-slate-500">No Final Year Projects in progress.</Card>
                    ) : (
                        <div className="space-y-4">
                            {draftFyp.map((entry) => (
                                <FacultyFypProgressCard
                                    key={entry.id}
                                    entry={entry}
                                    onOpenDraft={() => setOpenFlashcardId(entry.id || null)}
                                />
                            ))}
                        </div>
                    )}
                </>
            ) : pathTab === "fyp-thesis" && fypView === "review" ? (
                (() => {
                    const visible =
                        fypReviewTab === "pending" ? waitingFyp
                            : fypReviewTab === "revision" ? revisionFyp
                              : fypReviewTab === "rejected" ? rejectedFyp
                                : underReviewFyp;
                    return (
                        <>
                            <HubBackButton href={tabHref("fyp-thesis")} label="← Back to module buttons" />
                            <PathSectionHead
                                title="FYP Under Review"
                                subtitle="Student has submitted. Supervisor review is pending, or a revision has been returned to the student. CIEL PK cannot skip the supervisor."
                                pill="SUPERVISOR DECIDES"
                            />
                            <p className="text-sm text-slate-500">
                                A Detailed Review is generated automatically on each submission; the supervisor decides and may amend it. CIEL PK sees status, owner and waiting time — and the released review once approved.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {([
                                    ["all", "All", underReviewFyp.length],
                                    ["pending", "Waiting supervisor", waitingFyp.length],
                                    ["revision", "Revision with student", revisionFyp.length],
                                    ["rejected", "Rejected", rejectedFyp.length],
                                ] as const).map(([key, label, n]) => (
                                    <Link
                                        key={key}
                                        href={tabHref("fyp-thesis", "review", key === "all" ? undefined : key)}
                                        className={`rounded-[18px] border px-2.5 py-[7px] text-[11px] font-extrabold ${
                                            fypReviewTab === key
                                                ? "border-[#153f47] bg-[#153f47] text-white"
                                                : "border-[#dde5ea] bg-white text-[#5c6d76]"
                                        }`}
                                    >
                                        {label} <span className="ml-1 opacity-80">{n}</span>
                                    </Link>
                                ))}
                            </div>
                            {visible.length === 0 ? (
                                <Card className="border-dashed p-10 text-center text-slate-500">Nothing under review.</Card>
                            ) : (
                                <div className="space-y-4">
                                    {visible.map((entry) => (
                                        <UniversityFypReviewCard
                                            key={entry.id}
                                            entry={entry}
                                            audience="admin"
                                            onOpenFlashcard={() => setOpenFlashcardId(entry.id || null)}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    );
                })()
            ) : pathTab === "fyp-thesis" && (fypView === "approved" || fypView === "rank") ? (
                <>
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 className="text-[22px] font-semibold text-[#183140]">Approved FYP + AI Ranking</h2>
                            <p className="mt-1 max-w-3xl text-xs text-[#71828e]">
                                Every supervisor-approved Final Year Project flashcard, and the CIEL PK live FYP ranking on top of it. Locked faculty and university badges are never changed by the live run. Only supervisor-approved records are ranked.
                            </p>
                        </div>
                        <HubBackButton href={tabHref("fyp-thesis")} label="← Back to module buttons" />
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-[#dde5ea] bg-white">
                        <div className="flex flex-wrap items-center justify-between gap-3.5 border-b border-[#dde5ea] px-5 py-[18px]">
                            <div>
                                <h3 className="m-0 text-lg font-semibold text-[#14202b]">Approved FYP + AI Ranking</h3>
                                <p className="mt-1 text-xs text-[#71828e]">
                                    {fypMeritEntries.length} approved flashcard{fypMeritEntries.length === 1 ? "" : "s"} across all universities · CIEL PK may run the live AI Analyser anytime — every run re-ranks the national cohort (same standard formula, discipline benchmark) and updates each student&apos;s live badge with a ▲/▼ trend; locked faculty and university badges are never changed by it.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Link
                                    href={tabHref("fyp-thesis", fypView === "rank" ? "rank" : "approved")}
                                    className={`rounded-[18px] border px-2.5 py-[7px] text-[11px] font-extrabold ${
                                        fypApprovedTab !== "list"
                                            ? "border-[#153f47] bg-[#153f47] text-white"
                                            : "border-[#dde5ea] bg-white text-[#5c6d76]"
                                    }`}
                                >
                                    🏆 FYP Ranking Studio (live)
                                </Link>
                                <Link
                                    href={tabHref("fyp-thesis", fypView === "rank" ? "rank" : "approved", "list")}
                                    className={`rounded-[18px] border px-2.5 py-[7px] text-[11px] font-extrabold ${
                                        fypApprovedTab === "list"
                                            ? "border-[#153f47] bg-[#153f47] text-white"
                                            : "border-[#dde5ea] bg-white text-[#5c6d76]"
                                    }`}
                                >
                                    🃏 Approved list
                                </Link>
                            </div>
                        </div>
                        <div className="p-4">
                    {fypMeritLoading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                        </div>
                    ) : fypApprovedTab === "studio" ? (
                        <FypRankingStudio
                            entries={fypMeritEntries}
                            meritEndpoint="/api/v1/paths/fyp-thesis/merit-model"
                            stakeholder="CIEL_PK"
                            byLabel="CIEL PK"
                            scopeLabel="All universities · approved Final Year Projects"
                            onOpenCard={(entry) => setOpenFlashcardId(entry.id || null)}
                            onOpenReview={(entry) => setOpenReviewId(entry.id || null)}
                        />
                    ) : fypMeritEntries.length === 0 ? (
                        <Card className="border-dashed p-10 text-center text-slate-500">No approved Final Year Projects yet.</Card>
                    ) : (
                        <div className="space-y-4">
                            {fypMeritEntries.map((entry) => (
                                <FacultyFypApprovedCard
                                    key={entry.id}
                                    entry={entry}
                                    audience="admin"
                                    onOpenFlashcard={() => setOpenFlashcardId(entry.id || null)}
                                    onOpenReview={() => setOpenReviewId(entry.id || null)}
                                />
                            ))}
                        </div>
                    )}
                        </div>
                    </div>
                </>
            ) : pathTab === "fyp-thesis" && fypView === "faculty-work" ? (
                <>
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 className="text-[22px] font-semibold text-[#183140]">Faculty Work — all universities</h2>
                            <p className="mt-1 max-w-3xl text-xs text-[#71828e]">
                                Every faculty member&apos;s Final Year Project work, cumulatively: each project&apos;s flashcard, its Detailed Review and every badge — the same records the student, the faculty and the university see, updated live.
                            </p>
                        </div>
                        <HubBackButton href={tabHref("fyp-thesis")} label="← Back to module buttons" />
                    </div>
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                        </div>
                    ) : (
                        <AdminFypFacultyWorkPanel
                            entries={fypRowsAsMerit}
                            onOpenFlashcard={(id) => setOpenFlashcardId(id)}
                            onOpenReview={(id) => setOpenReviewId(id)}
                        />
                    )}
                </>
            ) : pathTab === "fyp-thesis" ? null : (
            <>
            {pathTab === "course-project" && <HubBackButton href={tabHref("course-project")} label="← Back to Coursework" />}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                    {pathTab === "course-project"
                        ? (["waiting", "approved", "draft", "all"] as const).map((tab) => (
                              <button
                                  key={tab}
                                  type="button"
                                  onClick={() => setCourseFilter(tab)}
                                  className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize transition ${
                                      courseFilter === tab
                                          ? "bg-slate-900 text-white"
                                          : "border border-slate-200 bg-white text-slate-600"
                                  }`}
                              >
                                  {tab === "waiting" ? "Waiting for approval" : tab}
                              </button>
                          ))
                        : null}
                    {pathTab === "startup-business"
                        ? (["waiting", "submitted", "visible", "private", "all"] as const).map((tab) => (
                              <button
                                  key={tab}
                                  type="button"
                                  onClick={() => setVentureFilter(tab)}
                                  className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize transition ${
                                      ventureFilter === tab ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600"
                                  }`}
                              >
                                  {tab === "waiting" ? "Waiting (draft)" : tab}
                              </button>
                          ))
                        : null}
                </div>
                <label className="relative block w-full sm:max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search student, title, course..."
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-500"
                    />
                </label>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
            ) : activeCount === 0 ? (
                <Card className="border-dashed p-10 text-center text-slate-500">{emptyMessage}</Card>
            ) : (
                <div className="grid gap-4">
                    {pathTab === "course-project"
                        ? filteredCourse.map((row) => {
                              const expanded = expandedId === row.id;
                              return (
                                  <Card key={row.id} className="overflow-hidden border-slate-200">
                                      <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
                                          <div className="min-w-0 flex-1 space-y-2">
                                              <div className="flex flex-wrap items-center gap-2">
                                                  <BookOpen className="h-4 w-4 text-emerald-700" />
                                                  <h2 className="text-lg font-bold text-slate-900">{row.projectTitle || "Untitled project"}</h2>
                                                  <Badge
                                                      variant="outline"
                                                      className={
                                                          row.status === "submitted"
                                                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                                              : "border-amber-200 bg-amber-50 text-amber-900"
                                                      }
                                                  >
                                                      {row.status}
                                                  </Badge>
                                                  {row.status === "submitted" ? (
                                                      <Badge
                                                          variant="outline"
                                                          className={
                                                              isPathEntryApproved(row)
                                                                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                                                  : "border-amber-200 bg-amber-50 text-amber-900"
                                                          }
                                                      >
                                                          {isPathEntryApproved(row) ? "Faculty approved" : "Waiting for approval"}
                                                      </Badge>
                                                  ) : null}
                                                  <Badge variant="outline" className="border-slate-200 text-slate-600">
                                                      Step {row.stepCompleted}/8
                                                  </Badge>
                                              </div>
                                              <p className="text-sm font-semibold text-slate-700">{row.course || "Course not set"}</p>
                                              <p className="text-sm text-slate-600 break-words">{studentLine(row.student)}</p>
                                              <p className="line-clamp-2 text-sm text-slate-500">{row.projectDescription || "No description yet."}</p>
                                              <p className="text-xs text-slate-400">Updated {new Date(row.updatedAt).toLocaleString()}</p>
                                          </div>
                                          <button
                                              type="button"
                                              onClick={() => setExpandedId(expanded ? null : row.id)}
                                              className="h-10 shrink-0 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
                                          >
                                              {expanded ? "Hide details" : "View details"}
                                          </button>
                                      </div>
                                      {expanded ? (
                                          <div className="space-y-4 border-t border-slate-100 bg-slate-50/70 px-5 py-4">
                                              {row.sdgs?.length ? (
                                                  <div>
                                                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">SDGs</p>
                                                      <div className="mt-2 flex flex-wrap gap-2">
                                                          {row.sdgs.map((num) => (
                                                              <span key={num} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                                                                  {sdgTitle(num)}
                                                              </span>
                                                          ))}
                                                      </div>
                                                  </div>
                                              ) : (
                                                  <p className="text-sm text-slate-500">No SDGs selected.</p>
                                              )}
                                              {row.assignmentFileUrl || row.evidenceUrls?.length ? (
                                                  <div>
                                                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Files</p>
                                                      <ul className="mt-2 space-y-2">
                                                          {row.assignmentFileUrl ? (
                                                              <li>
                                                                  <a href={row.assignmentFileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline break-all">
                                                                      Assignment · {row.assignmentFileUrl.split("/").pop() || row.assignmentFileUrl}
                                                                      <ExternalLink className="h-3.5 w-3.5" />
                                                                  </a>
                                                              </li>
                                                          ) : null}
                                                          {(row.evidenceUrls || []).filter(Boolean).map((url) => (
                                                              <li key={url}>
                                                                  <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline break-all">
                                                                      {url.split("/").pop() || url}
                                                                      <ExternalLink className="h-3.5 w-3.5" />
                                                                  </a>
                                                              </li>
                                                          ))}
                                                      </ul>
                                                  </div>
                                              ) : (
                                                  <p className="text-sm text-slate-500">No files uploaded.</p>
                                              )}
                                              {(() => {
                                                  const members = normalizeMembers(row.studentInfo?.groupMembers);
                                                  return members.length ? (
                                                      <div>
                                                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Team members</p>
                                                          <ul className="mt-2 space-y-1 text-sm text-slate-700">
                                                              {members.map((member, i) => (
                                                                  <li key={`${member.name}-${i}`}>
                                                                      {member.name}
                                                                      {member.email ? ` · ${member.email}` : ""}
                                                                      {memberStatusLabel(member) ? ` · ${memberStatusLabel(member)}` : ""}
                                                                  </li>
                                                              ))}
                                                          </ul>
                                                      </div>
                                                  ) : null;
                                              })()}
                                          </div>
                                      ) : null}
                                  </Card>
                              );
                          })
                        : null}

                    {pathTab === "startup-business"
                        ? filteredVentures.map((row) => {
                              const expanded = expandedId === row.id;
                              return (
                                  <Card key={row.id} className="overflow-hidden border-slate-200">
                                      <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
                                          <div className="min-w-0 flex-1 space-y-2">
                                              <div className="flex flex-wrap items-center gap-2">
                                                  <Briefcase className="h-4 w-4 text-emerald-700" />
                                                  <h2 className="text-lg font-bold text-slate-900">{row.ventureName || "Untitled venture"}</h2>
                                                  <Badge
                                                      variant="outline"
                                                      className={
                                                          row.isVisible
                                                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                                              : "border-slate-200 bg-slate-50 text-slate-700"
                                                      }
                                                  >
                                                      {row.isVisible ? "Visible" : "Private"}
                                                  </Badge>
                                                  {row.gates?.investmentReadyOk ? (
                                                      <Badge variant="outline" className="border-slate-900 bg-slate-900 text-white">★ Investment Ready</Badge>
                                                  ) : row.gates?.showcaseOk ? (
                                                      <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-800">Showcase Ready</Badge>
                                                  ) : null}
                                                  {row.stepCompleted != null ? (
                                                      <Badge variant="outline" className="border-slate-200 text-slate-600">Step {row.stepCompleted}/8</Badge>
                                                  ) : (
                                                      <Badge variant="outline" className="border-slate-200 text-slate-600">{row.completenessPercent}% complete</Badge>
                                                  )}
                                              </div>
                                              <p className="text-sm font-semibold text-slate-700">{row.stage || "Stage not set"}</p>
                                              <p className="text-sm text-slate-600 break-words">{studentLine(row.student)}</p>
                                              <p className="line-clamp-2 text-sm text-slate-500">{row.sectionSummaries?.opportunity || row.description || "No description yet."}</p>
                                              <p className="text-xs text-slate-500">
                                                  {row.tractionRows.length} traction row(s) · {row.team.length} team member(s) ·{" "}
                                                  {row.materialUrls?.length ?? 0} material(s)
                                              </p>
                                              <p className="text-xs text-slate-400">Updated {new Date(row.updatedAt).toLocaleString()}</p>
                                          </div>
                                          <button
                                              type="button"
                                              onClick={() => setExpandedId(expanded ? null : row.id)}
                                              className="h-10 shrink-0 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
                                          >
                                              {expanded ? "Hide details" : "View details"}
                                          </button>
                                      </div>
                                      {expanded ? (
                                          <div className="space-y-4 border-t border-slate-100 bg-slate-50/70 px-5 py-4">
                                              {row.sectionSummaries && Object.values(row.sectionSummaries).some(Boolean) ? (
                                                  <div>
                                                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Guided wizard summary</p>
                                                      <ul className="mt-2 space-y-2">
                                                          {(Object.entries(row.sectionSummaries) as [string, string | undefined][])
                                                              .filter(([, text]) => !!text)
                                                              .map(([key, text]) => (
                                                                  <li key={key} className="text-sm text-slate-700">
                                                                      <span className="font-semibold capitalize">{key}:</span> {text}
                                                                  </li>
                                                              ))}
                                                      </ul>
                                                  </div>
                                              ) : null}
                                              {row.tractionRows.length ? (
                                                  <div>
                                                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Traction</p>
                                                      <ul className="mt-2 space-y-1 text-sm text-slate-700">
                                                          {row.tractionRows.map((t, i) => (
                                                              <li key={`${t.date}-${t.metric}-${i}`}>
                                                                  {t.date}: {t.metric} = {t.value}
                                                                  {t.note ? ` (${t.note})` : ""}
                                                              </li>
                                                          ))}
                                                      </ul>
                                                  </div>
                                              ) : null}
                                              {row.team.length ? (
                                                  <div>
                                                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Team</p>
                                                      <ul className="mt-2 space-y-1 text-sm text-slate-700">
                                                          {row.team.map((member, i) => (
                                                              <li key={`${member.name}-${i}`}>
                                                                  {member.name} · {member.role}
                                                                  {member.email ? ` · ${member.email}` : ""}
                                                                  {memberStatusLabel(member) ? ` · ${memberStatusLabel(member)}` : ""}
                                                              </li>
                                                          ))}
                                                      </ul>
                                                  </div>
                                              ) : null}
                                              {row.materialUrls?.length ? (
                                                  <div>
                                                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Materials</p>
                                                      <ul className="mt-2 space-y-2">
                                                          {row.materialUrls.map((url) => (
                                                              <li key={url}>
                                                                  <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline break-all">
                                                                      {url.split("/").pop() || url}
                                                                      <ExternalLink className="h-3.5 w-3.5" />
                                                                  </a>
                                                              </li>
                                                          ))}
                                                      </ul>
                                                  </div>
                                              ) : null}
                                          </div>
                                      ) : null}
                                  </Card>
                              );
                          })
                        : null}
                </div>
            )}
            </>
            )}
            {pathTab === "fyp-thesis" && openFlashcard ? (
                <FacultyFypFlashcardModal
                    entry={openFlashcard}
                    onClose={() => setOpenFlashcardId(null)}
                    onUpdate={updateFypEntry}
                    onOpenReview={
                        isPathEntryApproved(openFlashcard) && openFlashcard.id
                            ? () => {
                                setOpenFlashcardId(null);
                                setOpenReviewId(openFlashcard.id || null);
                            }
                            : undefined
                    }
                />
            ) : null}
            {pathTab === "fyp-thesis" && openReview ? (
                <FacultyFypDetailedReview
                    entry={openReview}
                    onClose={() => setOpenReviewId(null)}
                    onUpdate={updateFypEntry}
                    onOpenFlashcard={() => {
                        setOpenReviewId(null);
                        setOpenFlashcardId(openReview.id || null);
                    }}
                />
            ) : null}
        </div>
    );
}
