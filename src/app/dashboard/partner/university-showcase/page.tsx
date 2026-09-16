"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import clsx from "clsx";
import CourseworkCard from "@/components/ciel/CourseworkCard";
import MeritModelPanel, { type MeritEntry, entryDepartment, entryFaculty, entryFormat } from "@/components/ciel/MeritModelPanel";
import ThesisCard from "@/components/ciel/ThesisCard";
import FypMeritPanel, { type FypMeritEntry } from "@/components/ciel/FypMeritPanel";
import { CourseworkCrumb, HubBackButton, PathFilterBar, PathSectionHead } from "@/components/ciel/coursework/CourseworkHubChrome";
import { MOCKUP_GRADIENTS, MockupActionCard, MockupHero, MockupSectionHead } from "@/components/ciel/dashboard/MockupChrome";
import { namedTimeGreeting } from "@/utils/timeGreeting";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { isPathEntryApproved, isPathEntryWaiting, normalizeReviewStatus } from "@/utils/reviewQueue";

type DeckMode = "course-project" | "fyp-thesis";
type UniView = "home" | "progress" | "pending" | "deck" | "rank";
const UNI_VIEWS: readonly UniView[] = ["home", "progress", "pending", "deck", "rank"];
const FYP_VIEW_CRUMB: Record<Exclude<UniView, "home">, string> = {
    progress: "FYP in Progress",
    pending: "FYP Under Review",
    deck: "FYP Impact Wall",
    rank: "FYP AI Rankings",
};

function fypGate(entry: FypMeritEntry) {
    return entry.supervisorApprovalStatus;
}
function isUniFypRevision(entry: FypMeritEntry) {
    const gate = normalizeReviewStatus(fypGate(entry));
    return gate === "revision_requested" || gate === "revisions_requested" || gate === "changes_requested";
}
function isUniFypRejected(entry: FypMeritEntry) {
    const gate = normalizeReviewStatus(fypGate(entry));
    return gate === "rejected" || gate === "declined";
}

export default function UniversityShowcasePage() {
    return (
        <Suspense fallback={<div className="mx-auto max-w-[1240px] py-16 text-center text-sm text-[#71828e]">Loading…</div>}>
            <UniversityShowcaseHub />
        </Suspense>
    );
}

function UniversityShowcaseHub() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const mode: DeckMode = searchParams.get("mode") === "fyp-thesis" ? "fyp-thesis" : "course-project";
    const rawView = searchParams.get("view");
    const view: UniView = rawView && UNI_VIEWS.includes(rawView as UniView) ? (rawView as UniView) : "home";
    const hrefFor = (nextMode: DeckMode, nextView: UniView = "home") => {
        const q = new URLSearchParams({ mode: nextMode });
        if (nextView !== "home") q.set("view", nextView);
        return `${pathname}?${q.toString()}`;
    };

    const [entries, setEntries] = useState<MeritEntry[]>([]);
    const [approvedEntries, setApprovedEntries] = useState<MeritEntry[]>([]);
    const [inProgress, setInProgress] = useState<MeritEntry[]>([]);
    const [fypEntries, setFypEntries] = useState<FypMeritEntry[]>([]);
    const [approvedFypEntries, setApprovedFypEntries] = useState<FypMeritEntry[]>([]);
    const [inProgressFyp, setInProgressFyp] = useState<FypMeritEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [fypLoading, setFypLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [forbidden, setForbidden] = useState(false);
    const [firstName, setFirstName] = useState("");

    useEffect(() => {
        const name = readStoredCurrentUser()?.name;
        setFirstName(typeof name === "string" ? name.trim().split(/\s+/)[0] : "");
    }, []);

    const [fDept, setFDept] = useState("all");
    const [fFaculty, setFFaculty] = useState("all");
    const [fFormat, setFFormat] = useState("all");
    const [fSemester, setFSemester] = useState("all");
    const [fYear, setFYear] = useState("all");

    const [fFypDept, setFFypDept] = useState("all");
    const [fFypSupervisor, setFFypSupervisor] = useState("all");
    const [fFypRoute, setFFypRoute] = useState("all");
    const [fFypYear, setFFypYear] = useState("all");
    const [fypReviewTab, setFypReviewTab] = useState<"all" | "pending" | "revision" | "rejected">("all");

    useEffect(() => {
        void fetchEntries();
        void fetchApprovedEntries();
        void fetchInProgress();
        void fetchFypEntries();
        void fetchApprovedFypEntries();
        void fetchInProgressFyp();
    }, []);

    const fetchEntries = async () => {
        try {
            setLoading(true);
            const response = await authenticatedFetch("/api/v1/paths/course-projects/university");
            if (response?.status === 403) {
                setForbidden(true);
                setEntries([]);
            } else if (response?.ok) {
                const data = await response.json();
                setEntries(Array.isArray(data.data) ? data.data : []);
            } else {
                toast.error("Failed to load the university showcase");
                setEntries([]);
            }
        } catch {
            toast.error("Failed to load the university showcase");
            setEntries([]);
        } finally {
            setLoading(false);
        }
    };

    /** The Coursework Impact Wall — backed by a query that only ever returns approved records
     * (enforced server-side), so this list is never at risk of a client-side filtering bug
     * surfacing a pending/revision/rejected record on the wall. */
    const fetchApprovedEntries = async () => {
        try {
            const response = await authenticatedFetch("/api/v1/paths/course-projects/university?approvalStatus=approved");
            if (response?.ok) {
                const data = await response.json();
                setApprovedEntries(Array.isArray(data.data) ? data.data : []);
            }
        } catch {
            // Non-fatal — the wall just shows 0 until the next load.
        }
    };

    const fetchInProgress = async () => {
        try {
            const response = await authenticatedFetch("/api/v1/paths/course-projects/university?status=draft");
            if (response?.ok) {
                const data = await response.json();
                setInProgress(Array.isArray(data.data) ? data.data : []);
            }
        } catch {
            // Non-fatal — the "Coursework in Progress" tile just shows 0 until the next load.
        }
    };

    const fetchFypEntries = async () => {
        try {
            setFypLoading(true);
            const response = await authenticatedFetch("/api/v1/paths/fyp-thesis/university");
            if (response?.ok) {
                const data = await response.json();
                setFypEntries(Array.isArray(data.data) ? data.data : []);
            } else {
                setFypEntries([]);
            }
        } catch {
            setFypEntries([]);
        } finally {
            setFypLoading(false);
        }
    };

    /** The FYP Impact Wall — backed by a query that only ever returns approved records (enforced
     * server-side), so this list is never at risk of a client-side filtering bug surfacing a
     * pending/revision/rejected record on the wall. */
    const fetchApprovedFypEntries = async () => {
        try {
            const response = await authenticatedFetch("/api/v1/paths/fyp-thesis/university?approvalStatus=approved");
            if (response?.ok) {
                const data = await response.json();
                setApprovedFypEntries(Array.isArray(data.data) ? data.data : []);
            }
        } catch {
            // Non-fatal — the wall just shows 0 until the next load.
        }
    };

    const fetchInProgressFyp = async () => {
        try {
            const response = await authenticatedFetch("/api/v1/paths/fyp-thesis/university?status=draft");
            if (response?.ok) {
                const data = await response.json();
                setInProgressFyp(Array.isArray(data.data) ? data.data : []);
            }
        } catch {
            // Non-fatal — the "FYP in Progress" tile just shows 0 until the next load.
        }
    };

    const approved = approvedEntries;
    const waiting = useMemo(() => entries.filter(isPathEntryWaiting), [entries]);
    const approvedFyp = approvedFypEntries;
    const waitingFyp = useMemo(() => fypEntries.filter(isPathEntryWaiting), [fypEntries]);
    const revisionFyp = useMemo(() => fypEntries.filter(isUniFypRevision), [fypEntries]);
    const rejectedFyp = useMemo(() => fypEntries.filter(isUniFypRejected), [fypEntries]);
    const underReviewFyp = useMemo(
        () => fypEntries.filter((e) => e.status === "submitted" && !isPathEntryApproved(e)),
        [fypEntries],
    );
    const underReviewFypBadge = underReviewFyp.filter((e) => !isUniFypRejected(e)).length;
    const pendingFypPool =
        fypReviewTab === "pending" ? waitingFyp
            : fypReviewTab === "revision" ? revisionFyp
              : fypReviewTab === "rejected" ? rejectedFyp
                : underReviewFyp;

    const q = searchQuery.toLowerCase();
    const coursePool = view === "progress" ? inProgress : view === "pending" ? waiting : approved;
    const courseYear = (e: MeritEntry) => {
        const d = e.updatedAt || e.createdAt;
        return d ? String(new Date(d).getFullYear()) : "";
    };
    const courseDepartments = useMemo(() => [...new Set(coursePool.map(entryDepartment))].sort(), [coursePool]);
    const courseFaculties = useMemo(() => [...new Set(coursePool.map(entryFaculty))].sort(), [coursePool]);
    const courseFormats = useMemo(() => [...new Set(coursePool.map(entryFormat))].sort(), [coursePool]);
    const courseSemesters = useMemo(
        () => [...new Set(coursePool.map((e) => e.studentInfo?.semester).filter(Boolean))].sort() as string[],
        [coursePool],
    );
    const courseYears = useMemo(() => [...new Set(coursePool.map(courseYear).filter(Boolean))].sort().reverse(), [coursePool]);
    const filteredCourse = coursePool.filter((entry) => {
        if (fDept !== "all" && entryDepartment(entry) !== fDept) return false;
        if (fFaculty !== "all" && entryFaculty(entry) !== fFaculty) return false;
        if (fFormat !== "all" && entryFormat(entry) !== fFormat) return false;
        if (fSemester !== "all" && entry.studentInfo?.semester !== fSemester) return false;
        if (fYear !== "all" && courseYear(entry) !== fYear) return false;
        if (!q) return true;
        return (
            entry.student?.name?.toLowerCase().includes(q) ||
            entry.student?.email?.toLowerCase().includes(q) ||
            entry.projectTitle?.toLowerCase().includes(q) ||
            entry.course?.toLowerCase().includes(q)
        );
    });
    const fypDepartment = (e: FypMeritEntry) => e.projectInfo?.school || e.student?.department || "Unspecified";
    const fypSupervisor = (e: FypMeritEntry) => e.projectInfo?.supervisorName || "Unassigned";
    const fypRoute = (e: FypMeritEntry) => e.projectInfo?.leadRoute || e.projectInfo?.projectTypes?.[0] || "Unspecified";
    const fypYear = (e: FypMeritEntry) => {
        const d = e.updatedAt || e.createdAt;
        return d ? String(new Date(d).getFullYear()) : "";
    };
    const fypPool = view === "progress" ? inProgressFyp : view === "pending" ? pendingFypPool : approvedFyp;
    const fypDepartments = useMemo(() => [...new Set(fypPool.map(fypDepartment))].sort(), [fypPool]);
    const fypSupervisors = useMemo(() => [...new Set(fypPool.map(fypSupervisor))].sort(), [fypPool]);
    const fypRoutes = useMemo(() => [...new Set(fypPool.map(fypRoute))].sort(), [fypPool]);
    const fypYears = useMemo(() => [...new Set(fypPool.map(fypYear).filter(Boolean))].sort().reverse(), [fypPool]);
    const filteredFyp = fypPool.filter((entry) => {
        if (fFypDept !== "all" && fypDepartment(entry) !== fFypDept) return false;
        if (fFypSupervisor !== "all" && fypSupervisor(entry) !== fFypSupervisor) return false;
        if (fFypRoute !== "all" && fypRoute(entry) !== fFypRoute) return false;
        if (fFypYear !== "all" && fypYear(entry) !== fFypYear) return false;
        if (!q) return true;
        return (
            entry.student?.name?.toLowerCase().includes(q) ||
            entry.student?.email?.toLowerCase().includes(q) ||
            entry.projectInfo?.title?.toLowerCase().includes(q) ||
            entry.projectTitle?.toLowerCase().includes(q)
        );
    });

    const crumbView =
        mode === "fyp-thesis"
            ? view === "home"
                ? undefined
                : FYP_VIEW_CRUMB[view]
            : view === "home"
              ? undefined
              : view;
    const activeLoading = mode === "course-project" ? loading : fypLoading;

    if (forbidden) {
        return (
            <div className="mx-auto max-w-2xl space-y-4 p-4">
                <Link
                    href="/dashboard/partner"
                    className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Partner dashboard
                </Link>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
                    The university showcase is only available for university partner accounts.
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="mx-auto max-w-[1500px] space-y-4 pb-16">
                <CourseworkCrumb role="University" view={crumbView} pathLabel={mode === "fyp-thesis" ? "Final Year Project (FYP)" : "Coursework"} />
                {view === "home" ? (
                    mode === "course-project" ? (
                    <MockupHero
                        kicker="UNIVERSITY · COURSEWORK"
                        title={namedTimeGreeting(firstName, "📘")}
                        subtitle="See approved sustainability-linked coursework from all departments and run AI Rankings."
                        stats={[
                            { value: String(approved.length), label: "APPROVED" },
                            { value: String(waiting.length), label: "UNDER REVIEW" },
                            { value: String(inProgress.length), label: "IN PROGRESS" },
                        ]}
                    />
                ) : (
                    <MockupHero
                        title="Final Year Project (FYP)"
                        subtitle="Review university Final Year Project impact and run FYP-specific AI Rankings."
                        stats={[
                            { value: String(approvedFyp.length), label: "APPROVED" },
                            { value: String(underReviewFypBadge), label: "UNDER REVIEW" },
                            { value: String(inProgressFyp.length), label: "IN PROGRESS" },
                        ]}
                    />
                )
                ) : null}

                {view !== "home" ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex gap-2">
                        {([
                            { key: "course-project" as const, label: "Course Projects" },
                            { key: "fyp-thesis" as const, label: "FYP / Thesis" },
                        ]).map((tab) => (
                            <Link
                                key={tab.key}
                                href={hrefFor(tab.key, "home")}
                                onClick={() => setSearchQuery("")}
                                className={clsx(
                                    "rounded-full border-2 px-4 py-2 text-xs font-bold transition-colors",
                                    mode === tab.key ? "border-ciel-navy bg-ciel-navy text-white" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300",
                                )}
                            >
                                {tab.label}
                            </Link>
                        ))}
                    </div>
                </div>
                ) : null}

                {mode === "course-project" && view !== "home" && view !== "rank" && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Coursework Filters</p>
                            <p className="text-[11px] text-slate-400">Use one or more filters to refine the institutional view.</p>
                        </div>
                        <div className="mt-2.5 flex flex-wrap gap-2">
                            <select value={fDept} onChange={(e) => setFDept(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                                <option value="all">All Departments</option>
                                {courseDepartments.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                            <select value={fFaculty} onChange={(e) => setFFaculty(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                                <option value="all">All Faculty Members</option>
                                {courseFaculties.map((f) => (
                                    <option key={f} value={f}>{f}</option>
                                ))}
                            </select>
                            <select value={fFormat} onChange={(e) => setFFormat(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                                <option value="all">All Project Types</option>
                                {courseFormats.map((f) => (
                                    <option key={f} value={f}>{f}</option>
                                ))}
                            </select>
                            <select value={fSemester} onChange={(e) => setFSemester(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                                <option value="all">All Semesters</option>
                                {courseSemesters.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                            <select value={fYear} onChange={(e) => setFYear(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                                <option value="all">All Academic Years</option>
                                {courseYears.map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => {
                                    setFDept("all");
                                    setFFaculty("all");
                                    setFFormat("all");
                                    setFSemester("all");
                                    setFYear("all");
                                }}
                                className="ml-auto rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 hover:border-slate-300"
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                )}

                {mode === "fyp-thesis" && view !== "home" && view !== "rank" && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Final Year Project (FYP) Filters</p>
                            <p className="text-[11px] text-slate-400">Use one or more filters to refine the institutional view.</p>
                        </div>
                        <div className="mt-2.5 flex flex-wrap gap-2">
                            <select value={fFypDept} onChange={(e) => setFFypDept(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                                <option value="all">All Departments</option>
                                {fypDepartments.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                            <select value={fFypSupervisor} onChange={(e) => setFFypSupervisor(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                                <option value="all">All Faculty Members</option>
                                {fypSupervisors.map((f) => (
                                    <option key={f} value={f}>{f}</option>
                                ))}
                            </select>
                            <select value={fFypRoute} onChange={(e) => setFFypRoute(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                                <option value="all">All Project Types</option>
                                {fypRoutes.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                            <select value={fFypYear} onChange={(e) => setFFypYear(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                                <option value="all">All Academic Years</option>
                                {fypYears.map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => {
                                    setFFypDept("all");
                                    setFFypSupervisor("all");
                                    setFFypRoute("all");
                                    setFFypYear("all");
                                }}
                                className="ml-auto rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 hover:border-slate-300"
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                )}

                {view !== "home" && <HubBackButton href={hrefFor(mode, "home")} label="← Back to module buttons" />}

                {view === "home" && mode === "fyp-thesis" && (
                    <>
                    <MockupSectionHead
                        title="Final Year Project (FYP)"
                        subtitle="Every Final Year Project record is visible from the moment a student starts. The supervisor approves; approved flashcards land on the FYP Impact Wall automatically."
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <MockupActionCard
                            href={hrefFor("fyp-thesis", "progress")}
                            emoji="🔬"
                            ghost="🔬"
                            title="FYP in Progress"
                            subtitle="Students still building their Final Year Project across departments — completion bar, last activity, Email / WhatsApp reminders."
                            badge={`${inProgressFyp.length} IN PROGRESS`}
                            background={MOCKUP_GRADIENTS.teal}
                        />
                        <MockupActionCard
                            href={hrefFor("fyp-thesis", "pending")}
                            emoji="📤"
                            ghost="📤"
                            title="FYP Under Review"
                            subtitle="Submitted flashcards waiting for supervisor approval, or returned for revision — remind the supervisor or the student."
                            badge={`${underReviewFypBadge} UNDER REVIEW`}
                            background={MOCKUP_GRADIENTS.blue}
                        />
                        <MockupActionCard
                            href={hrefFor("fyp-thesis", "deck")}
                            emoji="🎓"
                            ghost="🎓"
                            title="FYP Impact Wall"
                            subtitle="Supervisor-approved Final Year Project flashcards from every department — with the score allotted by faculty and every AI Analyser badge, the same record the student, supervisor and CIEL PK see."
                            badge={`${approvedFyp.length} APPROVED`}
                            background={MOCKUP_GRADIENTS.green}
                        />
                        <MockupActionCard
                            href={hrefFor("fyp-thesis", "rank")}
                            emoji="🤖"
                            ghost="🤖"
                            title="FYP AI Analyser · University Rankings"
                            subtitle="Run the AI Analyser across every department: one standard formula measures each project against excellent work in its own discipline (level-aware), then ranks the university. Preview anytime; publish up to 3× per academic year — locked, dated University badges land on each student's flashcard and CIEL PK."
                            badge="AI RANKINGS"
                            background={MOCKUP_GRADIENTS.orange}
                        />
                        <MockupActionCard
                            href="/dashboard/partner/university-analytics"
                            emoji="🔒"
                            ghost="🔒"
                            title="FYP Analytics"
                            subtitle="Unlock supervisor, department, programme, research-theme, SDG and batch trends."
                            badge="LOCKED"
                            background={MOCKUP_GRADIENTS.purple}
                            locked
                            full
                        />
                    </div>
                    </>
                )}

                {view === "home" && mode === "course-project" && (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <MockupActionCard
                            href={hrefFor("course-project", "progress")}
                            emoji="🧩"
                            ghost="🧩"
                            title="Coursework in Progress"
                            subtitle="Students still filling the form across departments — completion bar, last activity, Email / WhatsApp reminders."
                            badge={`${inProgress.length} IN PROGRESS`}
                            background={MOCKUP_GRADIENTS.teal}
                        />
                        <MockupActionCard
                            href={hrefFor("course-project", "pending")}
                            emoji="📤"
                            ghost="📤"
                            title="Coursework Under Review"
                            subtitle="Submitted flashcards waiting for faculty approval, or returned for revision — remind the faculty member or the student."
                            badge={`${waiting.length} UNDER REVIEW`}
                            background={MOCKUP_GRADIENTS.blue}
                        />
                        <MockupActionCard
                            href={hrefFor("course-project", "deck")}
                            emoji="🏅"
                            ghost="🏅"
                            title="Approved Coursework Impact"
                            subtitle="Faculty-approved coursework flashcards from every department — the same record the student, faculty and CIEL PK see."
                            badge={`${approved.length} APPROVED`}
                            background={MOCKUP_GRADIENTS.green}
                        />
                        <MockupActionCard
                            href={hrefFor("course-project", "rank")}
                            emoji="🧮"
                            ghost="🧮"
                            title="Coursework AI Rankings"
                            subtitle="Rank approved coursework. Waiting submissions stay out of the live picks."
                            badge="RANKINGS"
                            background={MOCKUP_GRADIENTS.purple}
                        />
                    </div>
                )}

                {mode === "fyp-thesis" && view === "progress" && (
                    <PathSectionHead
                        title="FYP in Progress"
                        subtitle="Live completion from each student's Final Year Project record. Intervene early with an Email or WhatsApp reminder. The university sees the record as soon as the student starts."
                        pill="READ ONLY"
                    />
                )}
                {mode === "fyp-thesis" && view === "pending" && (
                    <>
                        <PathSectionHead
                            title="FYP Under Review"
                            subtitle="Student has submitted. The supervisor owns the next action unless a revision was returned to the student. University cannot skip the supervisor."
                            pill="SUPERVISOR DECIDES"
                        />
                        <div className="mb-4 rounded-[15px] border border-[#d5eee8] bg-[#eef8f6] px-4 py-3 text-[11px] leading-relaxed text-[#4b6f68]">
                            Reminder buttons target whoever is holding the workflow on that exact record. The AI Analyser has run automatically; the score is released here once the supervisor approves.
                        </div>
                        <PathFilterBar
                            filters={[
                                `All · ${underReviewFyp.length}`,
                                `Waiting supervisor · ${waitingFyp.length}`,
                                `Revision with student · ${revisionFyp.length}`,
                                `Rejected · ${rejectedFyp.length}`,
                            ]}
                            active={
                                fypReviewTab === "pending" ? `Waiting supervisor · ${waitingFyp.length}`
                                    : fypReviewTab === "revision" ? `Revision with student · ${revisionFyp.length}`
                                      : fypReviewTab === "rejected" ? `Rejected · ${rejectedFyp.length}`
                                        : `All · ${underReviewFyp.length}`
                            }
                            onChange={(label) => {
                                if (label.startsWith("Waiting")) setFypReviewTab("pending");
                                else if (label.startsWith("Revision")) setFypReviewTab("revision");
                                else if (label.startsWith("Rejected")) setFypReviewTab("rejected");
                                else setFypReviewTab("all");
                            }}
                        />
                    </>
                )}
                {mode === "fyp-thesis" && view === "deck" && (
                    <PathSectionHead
                        title="FYP Impact Wall"
                        subtitle={`${approvedFyp.length} supervisor-approved Final Year Project flashcard${approvedFyp.length === 1 ? "" : "s"} — each with the score allotted by faculty and all AI Analyser badges, synchronised with Student, Faculty / Supervisor and CIEL PK dashboards.`}
                        pill="SYNCED TO ALL DASHBOARDS"
                    />
                )}

                {(view === "progress" || view === "pending" || view === "deck") && (
                    <div className="relative max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={mode === "course-project" ? "Search by student, course, or title…" : "Search by student or title…"}
                            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-blue-400"
                        />
                    </div>
                )}

                {mode === "course-project" && view === "rank" &&
                    (loading ? (
                        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
                    ) : approved.length === 0 ? (
                        <EmptyUni />
                    ) : (
                        <MeritModelPanel entries={approved} showDepartmentFilter showFacultyFilter meritEndpoint="/api/v1/paths/course-projects/merit-model" scopeName="This university" />
                    ))}

                {mode === "fyp-thesis" && view === "rank" && (
                    <>
                        <PathSectionHead
                            title="FYP AI Rankings — Ranking Studio"
                            subtitle="University AI Analyser: all departments, all disciplines — every project is measured against excellent work in its own discipline (level-aware). Unlimited previews; 3 official publications per academic year — each issues locked, dated University badges. University cannot skip faculty approval: only supervisor-approved records are ranked."
                            pill="UNIVERSITY COHORT"
                        />
                    {(fypLoading ? (
                        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
                    ) : approvedFyp.length === 0 ? (
                        <EmptyUni message="Approved FYP / thesis cards will appear here after supervisor sign-off." />
                    ) : (
                        <FypMeritPanel entries={approvedFyp} showSchoolFilter meritEndpoint="/api/v1/paths/fyp-thesis/merit-model" />
                    ))}
                    </>
                )}

                {mode === "course-project" && (view === "progress" || view === "pending" || view === "deck") &&
                    (loading ? (
                        <SkeletonList />
                    ) : filteredCourse.length === 0 ? (
                        <EmptyUni
                            match={coursePool.length > 0}
                            message={
                                view === "progress"
                                    ? "Students still filling out the coursework form will appear here."
                                    : view === "pending"
                                      ? "No submitted coursework is waiting for faculty approval."
                                      : "Approved coursework cards will appear here after faculty review."
                            }
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {filteredCourse.map((entry) => (
                                <CourseworkCard
                                    key={entry.id}
                                    entry={entry}
                                    studentName={entry.student?.name}
                                    remindDraftOwner={view === "progress" || entry.facultyApprovalStatus === "revision_requested"}
                                    studentReminder={view === "pending" && entry.facultyApprovalStatus === "pending" ? "faculty" : undefined}
                                    studentEmail={entry.student?.email || entry.studentInfo?.studentEmail}
                                    hideScore={view !== "deck"}
                                />
                            ))}
                        </div>
                    ))}

                {mode === "fyp-thesis" && (view === "progress" || view === "pending" || view === "deck") &&
                    (activeLoading ? (
                        <SkeletonList />
                    ) : filteredFyp.length === 0 ? (
                        <EmptyUni
                            match={fypPool.length > 0}
                            message={
                                view === "progress"
                                    ? "Students still filling out the FYP form will appear here."
                                    : view === "pending"
                                      ? "No submitted FYP / thesis records are waiting for supervisor approval."
                                      : "Approved FYP / thesis cards will appear here after supervisor sign-off."
                            }
                        />
                    ) : (
                        <div className="space-y-4">
                            {filteredFyp.map((entry) => (
                                <ThesisCard
                                    key={entry.id}
                                    entry={entry}
                                    studentName={entry.student?.name}
                                    remindDraftOwner={view === "progress" || entry.supervisorApprovalStatus === "revision_requested"}
                                    studentReminder={view === "pending" && entry.supervisorApprovalStatus === "pending" ? "faculty" : undefined}
                                    studentEmail={entry.student?.email}
                                />
                            ))}
                        </div>
                    ))}
            </div>
        </div>
    );
}

function SkeletonList() {
    return (
        <div className="space-y-4">
            {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
            ))}
        </div>
    );
}

function EmptyUni({ match = false, message }: { match?: boolean; message?: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
            <p className="text-base font-bold text-slate-800">No showcase cards yet</p>
            <p className="mt-1.5 text-sm text-slate-500">
                {match ? "No reports match your search." : message || "Submitted reports from your university's students will appear here."}
            </p>
        </div>
    );
}
