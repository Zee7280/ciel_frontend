"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Briefcase, Calculator, ExternalLink, GraduationCap, Loader2, Search } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { Badge } from "@/app/dashboard/student/report/components/ui/badge";
import { Card } from "@/app/dashboard/student/report/components/ui/card";
import { sdgData } from "@/utils/sdgData";
import MeritModelPanel, { type MeritEntry } from "@/components/ciel/MeritModelPanel";
import FypMeritPanel, { type FypMeritEntry } from "@/components/ciel/FypMeritPanel";
import CourseworkCard from "@/components/ciel/CourseworkCard";
import CourseworkAnalyticsPanel from "@/components/ciel/coursework/CourseworkAnalyticsPanel";
import { CourseworkCrumb, CourseworkHero, HubBackButton, HubTile } from "@/components/ciel/coursework/CourseworkHubChrome";
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
    stepCompleted: number;
    status: "draft" | "submitted";
    facultyApprovalStatus?: "pending" | "approved" | "rejected" | null;
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
    supervisorApprovalStatus?: "pending" | "approved" | "rejected" | null;
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

export default function AdminPathSubmissionsPage() {
    const [pathTab, setPathTab] = useState<PathTab>("course-project");
    const [courseRows, setCourseRows] = useState<AdminCourseProjectRow[]>([]);
    const [fypRows, setFypRows] = useState<AdminFypRow[]>([]);
    const [ventureRows, setVentureRows] = useState<AdminVentureRow[]>([]);
    const [courseFilter, setCourseFilter] = useState<"all" | "waiting" | "approved" | "draft">("all");
    const [fypFilter, setFypFilter] = useState<"all" | "waiting" | "approved" | "in_progress" | "complete">("waiting");
    const [ventureFilter, setVentureFilter] = useState<"all" | "waiting" | "submitted" | "visible" | "private">("all");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [meritView, setMeritView] = useState(false);
    const [courseView, setCourseView] = useState<"home" | "deck" | "rank" | "stats" | "submissions">("home");
    const [meritEntries, setMeritEntries] = useState<MeritEntry[]>([]);
    const [meritLoading, setMeritLoading] = useState(false);
    const [fypMeritEntries, setFypMeritEntries] = useState<FypMeritEntry[]>([]);
    const [fypMeritLoading, setFypMeritLoading] = useState(false);

    useEffect(() => {
        if (pathTab !== "course-project") setCourseView("home");
        if (pathTab !== "course-project" && pathTab !== "fyp-thesis") setMeritView(false);
    }, [pathTab]);

    useEffect(() => {
        if (pathTab !== "course-project") return;
        if (courseView !== "rank" && courseView !== "deck" && courseView !== "stats") return;
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
        return () => {
            cancelled = true;
        };
    }, [pathTab, courseView]);

    useEffect(() => {
        if (pathTab !== "fyp-thesis" || !meritView) return;
        let cancelled = false;
        setFypMeritLoading(true);
        authenticatedFetch("/api/v1/admin/paths/fyp-thesis")
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
    }, [pathTab, meritView]);

    useEffect(() => {
        setExpandedId(null);
    }, [pathTab, courseFilter, fypFilter, ventureFilter]);

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

    const filteredFyp = useMemo(() => {
        return fypRows.filter((row) => {
            if (fypFilter === "waiting" && !isPathEntryWaiting(row)) return false;
            if (fypFilter === "approved" && !isPathEntryApproved(row)) return false;
            if (fypFilter === "in_progress" && row.progressStatus !== "in_progress") return false;
            if (fypFilter === "complete" && row.progressStatus !== "complete") return false;
            if (!q) return true;
            return [
                row.projectTitle,
                row.overview,
                row.communityLinkage?.orgName,
                row.student?.name,
                row.student?.email,
                row.student?.institution,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(q);
        });
    }, [fypRows, fypFilter, q]);

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
            : pathTab === "fyp-thesis"
              ? `No FYP entries${fypFilter !== "all" ? ` with progress “${fypFilter.replace("_", " ")}”.` : "."}`
              : `No startup entries${ventureFilter !== "all" ? ` marked “${ventureFilter}”.` : "."}`;

    const activeCount =
        pathTab === "course-project"
            ? filteredCourse.length
            : pathTab === "fyp-thesis"
              ? filteredFyp.length
              : filteredVentures.length;

    const approvedCourse = useMemo(
        () => (courseRows as unknown as MeritEntry[]).filter(isFacultyApproved),
        [courseRows],
    );
    const waitingCourse = useMemo(
        () => courseRows.filter(isPathEntryWaiting),
        [courseRows],
    );
    const uniCount = useMemo(
        () => new Set(approvedCourse.map((e) => e.student?.institution || e.studentInfo?.universityName).filter(Boolean)).size,
        [approvedCourse],
    );

    return (
        <div className="space-y-6 p-6">
            {pathTab === "course-project" ? (
                <div className="mx-auto max-w-[1040px] space-y-4">
                    <CourseworkCrumb role="CIEL PK Master" view={courseView === "home" ? undefined : courseView} />
                    {courseView === "home" && (
                    <CourseworkHero
                        kicker="CIEL PK MASTER · COURSEWORK"
                        title="The national deck 🌍"
                        subtitle="Every university, every filter, the standard Analyzer — plus the analytics only the Master sees."
                        gradient="linear-gradient(115deg,#04252b,#0e7d74 55%,#2dd4bf 115%)"
                        stats={[
                            { value: String(waitingCourse.length), label: "WAITING" },
                            { value: String(approvedCourse.length), label: "APPROVED CARDS" },
                            { value: String(uniCount || "—"), label: "UNIVERSITIES" },
                        ]}
                    />
                    )}
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
                {pathTab === "fyp-thesis" ? (
                    <button
                        type="button"
                        onClick={() => setMeritView((v) => !v)}
                        className={`ml-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                            meritView ? "bg-purple-700 text-white" : "border border-purple-200 bg-white text-purple-700 hover:border-purple-400"
                        }`}
                    >
                        <Calculator className="h-4 w-4" />
                        {meritView ? "Back to submissions" : "🧮 Merit model — CIEL wide"}
                    </button>
                ) : null}
            </div>

            {pathTab === "course-project" && courseView === "home" ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <HubTile
                        onClick={() => {
                            setCourseFilter("waiting");
                            setCourseView("submissions");
                        }}
                        badge={`${waitingCourse.length} IN QUEUE`}
                        badgeClass="text-[#b45309]"
                        emoji="⏳"
                        title="Waiting for Approval"
                        subtitle="Submitted reports still waiting for faculty — not on the national deck yet."
                        background="linear-gradient(135deg,#b45309,#fbbf24)"
                    />
                    <HubTile
                        onClick={() => setCourseView("deck")}
                        badge={`${approvedCourse.length} LIVE`}
                        badgeClass="text-[#0e7d74]"
                        emoji="⭐"
                        title="National deck"
                        subtitle="Every faculty-approved card, every filter."
                        background="linear-gradient(135deg,#0e7d74,#2dd4bf)"
                    />
                    <HubTile
                        onClick={() => setCourseView("rank")}
                        badge="STANDARD RUBRIC"
                        badgeClass="text-[#6d28d9]"
                        emoji="🧠"
                        title="AI Analyzer — rank the nation"
                        subtitle="Approved cards only — reasons no one can question."
                        background="linear-gradient(135deg,#6d28d9,#a78bfa)"
                    />
                    <HubTile
                        onClick={() => setCourseView("stats")}
                        badge="MASTER ONLY"
                        badgeClass="text-[#04252b]"
                        emoji="📊"
                        title="Analytics"
                        subtitle="Universities, criteria and formats — the intelligence layer."
                        background="linear-gradient(135deg,#04252b,#0e7d74)"
                    />
                    <HubTile
                        onClick={() => {
                            setCourseFilter("all");
                            setCourseView("submissions");
                        }}
                        badge={`${courseRows.length} ENTRIES`}
                        badgeClass="text-[#b45309]"
                        emoji="🗂️"
                        title="All submissions"
                        subtitle="Drafts, waiting, and approved — the existing admin list."
                        background="linear-gradient(135deg,#b45309,#f59e0b)"
                    />
                </div>
            ) : pathTab === "course-project" && courseView === "rank" ? (
                <>
                    <HubBackButton onClick={() => setCourseView("home")} label="← Back to path submissions" />
                    {meritLoading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                        </div>
                    ) : (
                        <MeritModelPanel entries={meritEntries.filter(isFacultyApproved)} showDepartmentFilter showFacultyFilter showUniversityFilter meritEndpoint="/api/v1/paths/course-projects/merit-model" scopeName="CIEL PK — all universities" />
                    )}
                </>
            ) : pathTab === "course-project" && courseView === "stats" ? (
                <>
                    <HubBackButton onClick={() => setCourseView("home")} label="← Back to path submissions" />
                    {meritLoading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                        </div>
                    ) : (
                        <CourseworkAnalyticsPanel entries={meritEntries} />
                    )}
                </>
            ) : pathTab === "course-project" && courseView === "deck" ? (
                <>
                    <HubBackButton onClick={() => setCourseView("home")} label="← Back to path submissions" />
                    {meritLoading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                        </div>
                    ) : meritEntries.filter(isFacultyApproved).length === 0 ? (
                        <Card className="border-dashed p-10 text-center text-slate-500">No faculty-approved coursework cards yet.</Card>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {meritEntries.filter(isFacultyApproved).map((entry) => (
                                <CourseworkCard key={entry.id} entry={entry} studentName={entry.student?.name} />
                            ))}
                        </div>
                    )}
                </>
            ) : pathTab === "fyp-thesis" && meritView ? (
                fypMeritLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                    </div>
                ) : (
                    <FypMeritPanel entries={fypMeritEntries.filter(isPathEntryApproved)} showSchoolFilter showUniversityFilter meritEndpoint="/api/v1/paths/fyp-thesis/merit-model" />
                )
            ) : (
            <>
            {pathTab === "course-project" && <HubBackButton onClick={() => setCourseView("home")} label="← Back to path submissions" />}
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
                    {pathTab === "fyp-thesis"
                        ? (["waiting", "approved", "in_progress", "complete", "all"] as const).map((tab) => (
                              <button
                                  key={tab}
                                  type="button"
                                  onClick={() => setFypFilter(tab)}
                                  className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize transition ${
                                      fypFilter === tab ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600"
                                  }`}
                              >
                                  {tab === "waiting" ? "Waiting for approval" : tab.replace("_", " ")}
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
                                                      Step {row.stepCompleted}/4
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
                                              {row.evidenceUrls?.length ? (
                                                  <div>
                                                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Evidence</p>
                                                      <ul className="mt-2 space-y-2">
                                                          {row.evidenceUrls.map((url) => (
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
                                                  <p className="text-sm text-slate-500">No evidence uploaded.</p>
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

                    {pathTab === "fyp-thesis"
                        ? filteredFyp.map((row) => {
                              const expanded = expandedId === row.id;
                              return (
                                  <Card key={row.id} className="overflow-hidden border-slate-200">
                                      <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
                                          <div className="min-w-0 flex-1 space-y-2">
                                              <div className="flex flex-wrap items-center gap-2">
                                                  <GraduationCap className="h-4 w-4 text-emerald-700" />
                                                  <h2 className="text-lg font-bold text-slate-900">{row.projectTitle || "Untitled FYP"}</h2>
                                                  <Badge
                                                      variant="outline"
                                                      className={
                                                          row.progressStatus === "complete"
                                                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                                              : "border-blue-200 bg-blue-50 text-blue-800"
                                                      }
                                                  >
                                                      {row.wizardStepsTotal != null
                                                          ? row.status === "submitted"
                                                              ? "Submitted for sign-off"
                                                              : "In progress"
                                                          : row.progressStatus === "complete"
                                                            ? "All milestones done"
                                                            : "In progress"}
                                                  </Badge>
                                                  <Badge variant="outline" className="border-slate-200 text-slate-600">
                                                      {row.wizardStepsTotal != null
                                                          ? `Step ${row.wizardStepsComplete}/${row.wizardStepsTotal}`
                                                          : `${row.milestonesComplete}/${row.milestonesTotal} milestones`}
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
                                                          {isPathEntryApproved(row) ? "Supervisor approved" : "Waiting for approval"}
                                                      </Badge>
                                                  ) : null}
                                              </div>
                                              <p className="text-sm text-slate-600 break-words">{studentLine(row.student)}</p>
                                              <p className="line-clamp-2 text-sm text-slate-500">
                                                  {row.sectionSummaries?.project || row.overview || "No overview yet."}
                                              </p>
                                              <p className="text-xs text-slate-500">{row.deliverablesCount} deliverable(s) uploaded</p>
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
                                              <div>
                                                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Milestones</p>
                                                  <ul className="mt-2 space-y-2">
                                                      {row.milestones.map((m) => (
                                                          <li key={m.label} className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                                                              <span className="font-semibold">{m.label}</span>
                                                              <Badge variant="outline" className="border-slate-200 capitalize">
                                                                  {m.status.replace("_", " ")}
                                                              </Badge>
                                                              {m.dueDate ? <span className="text-xs text-slate-500">Due {m.dueDate}</span> : null}
                                                          </li>
                                                      ))}
                                                  </ul>
                                              </div>
                                              {row.deliverables.length ? (
                                                  <div>
                                                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Deliverables</p>
                                                      <ul className="mt-2 space-y-2">
                                                          {row.deliverables.map((d) => (
                                                              <li key={`${d.version}-${d.fileUrl}`} className="text-sm text-slate-700">
                                                                  <span className="font-semibold">{d.label}</span>
                                                                  {" · "}
                                                                  <a href={d.fileUrl} target="_blank" rel="noreferrer" className="font-semibold text-emerald-700 hover:underline">
                                                                      v{d.version}
                                                                      <ExternalLink className="ml-1 inline h-3.5 w-3.5" />
                                                                  </a>
                                                              </li>
                                                          ))}
                                                      </ul>
                                                  </div>
                                              ) : null}
                                              {row.communityLinkage?.orgName || row.communityLinkage?.description ? (
                                                  <div>
                                                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Community linkage</p>
                                                      <p className="mt-1 text-sm text-slate-700">{row.communityLinkage.orgName || "—"}</p>
                                                      {row.communityLinkage.description ? (
                                                          <p className="mt-1 text-sm text-slate-600">{row.communityLinkage.description}</p>
                                                      ) : null}
                                                  </div>
                                              ) : null}
                                              {(() => {
                                                  const members = normalizeMembers(row.projectInfo?.teamMembers);
                                                  return members.length ? (
                                                      <div>
                                                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Co-authors</p>
                                                          <ul className="mt-2 space-y-1 text-sm text-slate-700">
                                                              {members.map((member, i) => (
                                                                  <li key={`${member.name}-${i}`}>
                                                                      {member.role?.trim() ? `${member.name} (${member.role})` : member.name}
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
        </div>
    );
}
