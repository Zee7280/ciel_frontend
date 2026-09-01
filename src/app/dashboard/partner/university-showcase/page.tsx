"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import clsx from "clsx";
import CourseworkCard from "@/components/ciel/CourseworkCard";
import MeritModelPanel, { type MeritEntry, entryDepartment, entryFaculty, entryFormat } from "@/components/ciel/MeritModelPanel";
import ThesisCard from "@/components/ciel/ThesisCard";
import FypMeritPanel, { type FypMeritEntry } from "@/components/ciel/FypMeritPanel";
import { ActionKpiGrid, CourseworkCrumb, CourseworkHero, HubBackButton, HubTile, PathSectionHead, WorkflowSteps } from "@/components/ciel/coursework/CourseworkHubChrome";
import { isFacultyApproved } from "@/utils/courseworkSectionReview";
import { computeMeritScorecard } from "@/utils/courseworkMeritModel";
import { isPathEntryApproved, isPathEntryWaiting } from "@/utils/reviewQueue";

type DeckMode = "course-project" | "fyp-thesis";
type UniView = "home" | "progress" | "pending" | "deck" | "rank";

export default function UniversityShowcasePage() {
    const [mode, setMode] = useState<DeckMode>("course-project");

    useEffect(() => {
        const modeFromUrl = new URLSearchParams(window.location.search).get("mode");
        if (modeFromUrl === "fyp-thesis" || modeFromUrl === "course-project") {
            setMode(modeFromUrl);
        }
    }, []);
    const [entries, setEntries] = useState<MeritEntry[]>([]);
    const [inProgress, setInProgress] = useState<MeritEntry[]>([]);
    const [fypEntries, setFypEntries] = useState<FypMeritEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [fypLoading, setFypLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [view, setView] = useState<UniView>("home");
    const [forbidden, setForbidden] = useState(false);

    const [fDept, setFDept] = useState("all");
    const [fFaculty, setFFaculty] = useState("all");
    const [fFormat, setFFormat] = useState("all");
    const [fSemester, setFSemester] = useState("all");
    const [fYear, setFYear] = useState("all");

    useEffect(() => {
        void fetchEntries();
        void fetchInProgress();
        void fetchFypEntries();
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

    const approved = useMemo(() => entries.filter(isFacultyApproved), [entries]);
    const waiting = useMemo(() => entries.filter(isPathEntryWaiting), [entries]);
    const approvedFyp = useMemo(() => fypEntries.filter(isPathEntryApproved), [fypEntries]);
    const waitingFyp = useMemo(() => fypEntries.filter(isPathEntryWaiting), [fypEntries]);
    const fypSchools = useMemo(
        () => [...new Set(approvedFyp.map((e) => e.projectInfo?.school || e.student?.department).filter(Boolean))].length,
        [approvedFyp],
    );
    const avg = useMemo(() => {
        if (!approved.length) return 0;
        return Math.round(approved.reduce((s, e) => s + computeMeritScorecard(e).total, 0) / approved.length);
    }, [approved]);

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
    const fypPool = view === "pending" ? waitingFyp : approvedFyp;
    const filteredFyp = fypPool.filter((entry) => {
        if (!q) return true;
        return (
            entry.student?.name?.toLowerCase().includes(q) ||
            entry.student?.email?.toLowerCase().includes(q) ||
            entry.projectInfo?.title?.toLowerCase().includes(q) ||
            entry.projectTitle?.toLowerCase().includes(q)
        );
    });

    const crumbView = mode === "fyp-thesis" ? (view === "home" ? "FYP / Thesis" : `FYP / Thesis · ${view}`) : view === "home" ? undefined : view;
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
            <div className="mx-auto max-w-[1240px] space-y-4">
                <CourseworkCrumb role="University" view={crumbView} pathLabel={mode === "fyp-thesis" ? "FYP / Thesis" : "Coursework"} />
                {mode === "course-project" ? (
                    <CourseworkHero
                        kicker="UNIVERSITY IMPACT DASHBOARD"
                        title="Coursework"
                        subtitle="See approved sustainability-linked coursework from all departments and run AI Rankings."
                        stats={[
                            { value: String(inProgress.length), label: "In Progress" },
                            { value: String(waiting.length), label: "Under Review" },
                            { value: String(approved.length), label: "Approved Projects" },
                        ]}
                    />
                ) : (
                    <CourseworkHero
                        kicker="UNIVERSITY IMPACT DASHBOARD"
                        title="FYP / Thesis"
                        subtitle="Monitor final-year research evidence, supervisor review and verified impact outcomes."
                        stats={[
                            { value: String(waitingFyp.length), label: "Awaiting Review" },
                            { value: String(approvedFyp.length), label: "Approved FYPs" },
                            { value: String(fypSchools || "—"), label: "Schools" },
                        ]}
                    />
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex gap-2">
                        {([
                            { key: "course-project" as const, label: "Course Projects" },
                            { key: "fyp-thesis" as const, label: "FYP / Thesis" },
                        ]).map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => {
                                    setMode(tab.key);
                                    setView("home");
                                    setSearchQuery("");
                                }}
                                className={clsx(
                                    "rounded-full border-2 px-4 py-2 text-xs font-bold transition-colors",
                                    mode === tab.key ? "border-ciel-navy bg-ciel-navy text-white" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300",
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {mode === "course-project" && view !== "rank" && (
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

                {view !== "home" && <HubBackButton onClick={() => setView("home")} label="← Back to showcase" />}

                {view === "home" && (
                    <>
                    <PathSectionHead
                        title={mode === "course-project" ? "Coursework Management" : "FYP / Thesis Management"}
                        subtitle="Faculty approval confirms completion; ranking and badges are generated later."
                        pill="UNIVERSITY VIEW"
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        {mode === "course-project" && (
                            <HubTile
                                onClick={() => setView("progress")}
                                badge={`${inProgress.length} IN PROGRESS`}
                                badgeClass="text-[#c76000]"
                                emoji="🧩"
                                title="Coursework in Progress"
                                subtitle="Students still filling the form across departments — completion bar, last activity, Email / WhatsApp reminders."
                                background="linear-gradient(135deg,#15988b,#2ec8bd)"
                            />
                        )}
                        <HubTile
                            onClick={() => setView("pending")}
                            badge={`${mode === "course-project" ? waiting.length : waitingFyp.length} ${mode === "course-project" ? "UNDER REVIEW" : "IN QUEUE"}`}
                            badgeClass="text-[#b45309]"
                            emoji={mode === "course-project" ? "📝" : "⏳"}
                            title={mode === "course-project" ? "Coursework Under Review" : "Waiting for Approval"}
                            subtitle={
                                mode === "course-project"
                                    ? "Submitted flashcards waiting for faculty approval, or returned for revision — remind the faculty member or the student."
                                    : "Submitted FYP / thesis records still waiting for supervisor sign-off."
                            }
                            background="linear-gradient(135deg,#b45309,#fbbf24)"
                        />
                        <HubTile
                            onClick={() => setView("deck")}
                            badge={`${mode === "course-project" ? approved.length : approvedFyp.length} APPROVED`}
                            badgeClass="text-[#0e7d74]"
                            emoji={mode === "course-project" ? "📚" : "⭐"}
                            title={mode === "course-project" ? "Coursework Impact Wall" : "Approved flash cards"}
                            subtitle={
                                mode === "course-project"
                                    ? "Faculty-approved coursework flashcards from every department — the same record the student, faculty and CIEL PK see."
                                    : "Faculty-approved cards only — the live institutional deck."
                            }
                            background="linear-gradient(135deg,#0e7d74,#2dd4bf)"
                        />
                        <HubTile
                            onClick={() => setView("rank")}
                            badge={mode === "course-project" ? "AI RANKINGS" : "SAME FORMULA"}
                            badgeClass="text-[#6d28d9]"
                            emoji="🤖"
                            title={mode === "course-project" ? "AI Rankings" : "Merit model — rank this deck"}
                            subtitle={
                                mode === "course-project"
                                    ? "Ranking Studio — filter a cohort, preview anytime, publish a final ranking up to 3× a year (3 left) to badge students."
                                    : "Approved cards only. Waiting submissions stay out of the live ranking."
                            }
                            background="linear-gradient(135deg,#6d28d9,#a78bfa)"
                        />
                        {mode === "course-project" && (
                            <HubTile
                                href="/dashboard/partner/university-analytics"
                                badge="LOCKED"
                                badgeClass="text-[#0f172a]"
                                emoji="🔒"
                                title="Coursework Analytics"
                                subtitle="Department comparisons, rubric trends and downloadable institutional reports — CIEL PK Analytics."
                                background="linear-gradient(135deg,#334155,#64748b)"
                            />
                        )}
                    </div>
                    <ActionKpiGrid
                        items={
                            mode === "course-project"
                                ? [
                                      { value: String(waiting.length), label: "Submitted for Review" },
                                      { value: String(approved.length), label: "Approved This Semester" },
                                      { value: approved.length ? String(avg) : "—", label: "Avg /100" },
                                      { value: String(entries.length), label: "All Records" },
                                  ]
                                : [
                                      { value: String(waitingFyp.length), label: "Awaiting Review" },
                                      { value: String(approvedFyp.length), label: "Approved This Year" },
                                      { value: String(fypSchools || "—"), label: "Schools" },
                                      { value: String(fypEntries.length), label: "All Records" },
                                  ]
                        }
                    />
                    <WorkflowSteps
                        title={mode === "course-project" ? "Coursework Project Workflow" : "FYP / Thesis Workflow"}
                        subtitle="Approved work flows into the same university Impact Wall."
                        steps={
                            mode === "course-project"
                                ? ["Student Submits", "Faculty Reviews", "Faculty Approval = Complete", "Semester AI Grader", "Badge + Impact Wall Update"]
                                : ["FYP Record Submitted", "Faculty / Supervisor Review", "Verified Approval", "AI Ranking", "Impact Wall + Badge"]
                        }
                    />
                    </>
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

                {mode === "fyp-thesis" && view === "rank" &&
                    (fypLoading ? (
                        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
                    ) : approvedFyp.length === 0 ? (
                        <EmptyUni message="Approved FYP / thesis cards will appear here after supervisor sign-off." />
                    ) : (
                        <FypMeritPanel entries={approvedFyp} showSchoolFilter meritEndpoint="/api/v1/paths/fyp-thesis/merit-model" />
                    ))}

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
                                    studentEmail={entry.student?.email}
                                />
                            ))}
                        </div>
                    ))}

                {mode === "fyp-thesis" && (view === "pending" || view === "deck") &&
                    (activeLoading ? (
                        <SkeletonList />
                    ) : filteredFyp.length === 0 ? (
                        <EmptyUni
                            match={fypPool.length > 0}
                            message={
                                view === "pending"
                                    ? "No submitted FYP / thesis records are waiting for supervisor approval."
                                    : "Approved FYP / thesis cards will appear here after supervisor sign-off."
                            }
                        />
                    ) : (
                        <div className="space-y-4">
                            {filteredFyp.map((entry) => (
                                <ThesisCard key={entry.id} entry={entry} studentName={entry.student?.name} />
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
