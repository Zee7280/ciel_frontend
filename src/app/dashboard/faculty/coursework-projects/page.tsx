"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import CourseworkCard from "@/components/ciel/CourseworkCard";
import MeritModelPanel, { type MeritEntry } from "@/components/ciel/MeritModelPanel";
import {
    ActionKpiGrid,
    CourseworkCrumb,
    CourseworkHero,
    HubBackButton,
    HubTile,
    PathSectionHead,
    WorkflowSteps,
    useFacultyHubView,
} from "@/components/ciel/coursework/CourseworkHubChrome";
import CourseworkFacultyReviewInbox from "@/components/ciel/coursework/CourseworkFacultyReviewInbox";
import { isFacultyApproved, pendingFacultyReview, reviewCourseProjectSections } from "@/utils/courseworkSectionReview";

const BASE = "/dashboard/faculty/coursework-projects";
const VIEWS = ["home", "progress", "review", "rank"] as const;
type FacView = (typeof VIEWS)[number];

const VIEW_CRUMB: Record<Exclude<FacView, "home">, string> = {
    progress: "Coursework in Progress",
    review: "Coursework Review",
    rank: "Approved Coursework + AI Ranking",
};

export default function FacultyCourseworkProjectsPage() {
    return (
        <Suspense fallback={<div className="mx-auto max-w-[1240px] py-16 text-center text-sm text-[#71828e]">Loading coursework…</div>}>
            <FacultyCourseworkHub />
        </Suspense>
    );
}

function FacultyCourseworkHub() {
    const { view, homeHref } = useFacultyHubView(VIEWS, "home");
    const [entries, setEntries] = useState<MeritEntry[]>([]);
    const [inProgress, setInProgress] = useState<MeritEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [reviewingId, setReviewingId] = useState<string | null>(null);

    useEffect(() => {
        void fetchEntries();
        void fetchInProgress();
    }, []);

    const fetchEntries = async () => {
        try {
            setLoading(true);
            const response = await authenticatedFetch("/api/v1/paths/course-projects/supervised");
            if (response?.ok) {
                const data = await response.json();
                setEntries(Array.isArray(data.data) ? data.data : []);
            } else {
                toast.error("Failed to load coursework reports");
                setEntries([]);
            }
        } catch {
            toast.error("Failed to load coursework reports");
            setEntries([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchInProgress = async () => {
        try {
            const response = await authenticatedFetch("/api/v1/paths/course-projects/in-progress");
            if (response?.ok) {
                const data = await response.json();
                setInProgress(Array.isArray(data.data) ? data.data : []);
            }
        } catch {
            // Non-fatal — the tile just shows 0 until the next load.
        }
    };

    const reviewEntry = async (id: string, action: "approve" | "reject" | "revision", note?: string) => {
        setReviewingId(id);
        try {
            const response = await authenticatedFetch(`/api/v1/paths/course-projects/${id}/faculty-review`, {
                method: "PATCH",
                body: JSON.stringify({ action, note }),
            });
            if (response?.ok) {
                const data = await response.json();
                setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...data.data } : e)));
                toast.success(
                    action === "approve"
                        ? "Approved — reflected on student, university and CIEL decks. No score given."
                        : action === "revision"
                          ? "Sent back for revision — student can fix and resubmit."
                          : "Rejected — student can fix and resubmit if allowed.",
                );
            } else {
                toast.error("Could not save your review");
            }
        } catch {
            toast.error("Could not save your review");
        } finally {
            setReviewingId(null);
        }
    };

    const pending = useMemo(() => entries.filter(pendingFacultyReview), [entries]);
    const approved = useMemo(() => entries.filter(isFacultyApproved), [entries]);
    const revision = useMemo(
        () => entries.filter((e) => e.facultyApprovalStatus === "revision_requested"),
        [entries],
    );
    const readyNotSubmitted = useMemo(
        () => inProgress.filter((e) => (e.stepCompleted ?? 0) >= 7),
        [inProgress],
    );
    const aiFlags = useMemo(
        () => pending.filter((e) => reviewCourseProjectSections(e).some((c) => !c.ok)).length,
        [pending],
    );

    const filteredApproved = approved.filter((entry) => {
        const q = searchQuery.toLowerCase();
        if (!q) return true;
        return (
            entry.student?.name?.toLowerCase().includes(q) ||
            entry.student?.email?.toLowerCase().includes(q) ||
            entry.projectTitle?.toLowerCase().includes(q) ||
            entry.course?.toLowerCase().includes(q)
        );
    });

    const hero =
        view === "progress"
            ? {
                  title: "Coursework in Progress",
                  subtitle: "Students in your courses who have started but not yet submitted. Nudge anyone who has stalled.",
                  stats: [
                      { value: String(inProgress.length), label: "In Progress" },
                      { value: String(readyNotSubmitted.length), label: "Ready, not submitted" },
                      { value: String(revision.length), label: "Revision with student" },
                  ],
              }
            : view === "review"
              ? {
                    title: "Coursework Review",
                    subtitle:
                        "Each submission arrives as the student's flashcard. The AI runs the CIEL PK Universal Coursework Rubric for your assistance only — you decide, and the student never sees the score.",
                    stats: [
                        { value: String(pending.length), label: "Pending your review" },
                        { value: String(revision.length), label: "Revision with student" },
                        { value: String(aiFlags), label: "AI flags to check" },
                    ],
                }
              : view === "rank"
                ? {
                      title: "Approved Coursework + AI Ranking",
                      subtitle:
                          "Only approved flashcards can be ranked. Preview as often as you like; publish a final ranking at most 3 times per academic year — ideally at the end of each semester.",
                      stats: [
                          { value: String(approved.length), label: "Approved Records" },
                          { value: "3 / year", label: "Final publications cap" },
                          { value: "Unlimited", label: "Preview runs" },
                      ],
                  }
                : {
                      title: "Coursework Project",
                      subtitle: "Review course-linked impact projects, approve completion and run semester rankings after approval.",
                      stats: [
                          { value: String(pending.length), label: "Awaiting Review" },
                          { value: String(approved.length), label: "Approved Coursework" },
                          { value: String(approved.length), label: "On Impact Walls" },
                      ],
                  };

    return (
        <div className="mx-auto max-w-[1240px]">
            <CourseworkCrumb role="Faculty" view={view === "home" ? undefined : VIEW_CRUMB[view]} pathLabel="Coursework Project" />
            <CourseworkHero kicker="FACULTY IMPACT DASHBOARD" title={hero.title} subtitle={hero.subtitle} stats={hero.stats} />

            {view !== "home" && (
                <div className="mt-4">
                    <HubBackButton href={homeHref} label="← Back to Coursework Project" />
                </div>
            )}

            {view === "home" && (
                <>
                    <PathSectionHead
                        title="Coursework Management"
                        subtitle="Students' coursework flows in as flashcards. The AI score assists you only — you give the final academic decision."
                        pill="FACULTY VIEW"
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <HubTile
                            href={`${BASE}?view=progress`}
                            badge={`${inProgress.length} IN PROGRESS`}
                            emoji="🧩"
                            title="Coursework in Progress"
                            subtitle="Students still filling the form — completion bar, last activity, Email + WhatsApp reminders."
                            background="linear-gradient(135deg,#18859b,#34b2e7)"
                        />
                        <HubTile
                            href={`${BASE}?view=review`}
                            badge={pending.length ? `${pending.length} PENDING` : "INBOX"}
                            emoji="✅"
                            title="Coursework Review"
                            subtitle="Submitted flashcards with AI score & per-section comments (faculty-only). Approve, request revision or reject."
                            background="linear-gradient(135deg,#149f8f,#2bcbb8)"
                        />
                        <HubTile
                            href={`${BASE}?view=rank`}
                            badge={`${approved.length} APPROVED`}
                            emoji="🏅"
                            title="Approved Coursework + AI Ranking"
                            subtitle="Approved flashcards published everywhere. Preview rankings anytime; publish a final ranking up to 3× a year to badge your students."
                            background="linear-gradient(135deg,#7233da,#9b6df3)"
                        />
                    </div>
                    <ActionKpiGrid
                        subtitle="Current coursework project items that need faculty attention."
                        items={[
                            { value: String(pending.length), label: "Submitted for Review" },
                            { value: String(revision.length), label: "Revision Requested" },
                            { value: String(inProgress.length), label: "In Progress (students)" },
                            { value: String(approved.length), label: "Approved This Semester" },
                        ]}
                    />
                    <WorkflowSteps
                        title="Coursework Project Workflow"
                        subtitle="Approved work flows into the same unified Faculty Impact Wall."
                        activeIndex={2}
                        captions={["Student side", "Student side", "You are here", "After your decision", "After your decision"]}
                        steps={[
                            "Student fills form (in progress)",
                            "Student submits flashcard",
                            "Faculty review + AI assist",
                            "Approve / Revise / Reject",
                            "Approved → all impact walls + AI Grader",
                        ]}
                    />
                </>
            )}

            {view === "progress" && (
                <div className="mt-2">
                    <PathSectionHead
                        title="Coursework in Progress"
                        subtitle="Live completion from each student's form. Reminders open Email / WhatsApp with a prefilled message."
                    />
                    {loading ? (
                        <DeckSkeleton />
                    ) : inProgress.length === 0 ? (
                        <EmptyDeck message="Students still filling out the coursework form will appear here — nudge anyone who's stalled." />
                    ) : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {inProgress.map((entry) => (
                                <div key={entry.id}>
                                    <CourseworkCard
                                        entry={entry}
                                        studentName={entry.student?.name}
                                        remindDraftOwner
                                        studentEmail={entry.student?.email}
                                    />
                                    <p className="mt-1.5 px-1 text-[10px] text-slate-400">
                                        Last activity {formatDistanceToNow(new Date(entry.updatedAt ?? entry.createdAt ?? Date.now()), { addSuffix: true })}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {view === "review" && (
                <div className="mt-2">
                    <PathSectionHead
                        title="Coursework submissions"
                        subtitle="Open the flashcard to read all seven summaries with the AI score and comment beside each one, then approve, request revision or reject."
                    />
                    <div className="mb-4 rounded-[15px] border border-[#d5eee8] bg-[#eef8f6] px-4 py-3 text-[11px] leading-relaxed text-[#4b6f68]">
                        🔒 <b>AI score = faculty assistance only.</b> It helps you mark a grade; it is never shown to the student, the university or CIEL PK at review stage. Approving publishes the flashcard (not the score) to the student&apos;s My Coursework Impact, your Approved Coursework, the University Coursework Impact Wall and CIEL PK.
                    </div>
                    {loading ? <DeckSkeleton /> : <CourseworkFacultyReviewInbox entries={entries} reviewingId={reviewingId} onReview={reviewEntry} />}
                </div>
            )}

            {view === "rank" && (
                <div className="mt-2">
                    <PathSectionHead
                        title="Ranking Studio — Comparative AI Grader"
                        subtitle="Rubric CIEL-PK-CW-COMP-1.0 · the same rubric as University and CIEL PK; only the cohort changes."
                        pill="SYNCED TO ALL DASHBOARDS"
                    />
                    {loading ? (
                        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
                    ) : approved.length === 0 ? (
                        <EmptyDeck message="Approve at least one submitted card to run the Analyzer." />
                    ) : (
                        <>
                            <MeritModelPanel entries={approved} meritEndpoint="/api/v1/paths/course-projects/merit-model" scopeName="Your cohort" />
                            <div className="mt-6 space-y-3">
                                <PathSectionHead
                                    title="Approved coursework flashcards"
                                    subtitle="Live on your Faculty Impact Wall, the student's My Coursework Impact, the University Coursework Impact Wall and CIEL PK."
                                />
                                <div className="relative max-w-sm">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by student, course, or title…"
                                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-blue-400"
                                    />
                                </div>
                                {filteredApproved.length === 0 ? (
                                    <EmptyDeck message="No reports match your search." />
                                ) : (
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        {filteredApproved.map((entry) => (
                                            <CourseworkCard key={entry.id} entry={entry} studentName={entry.student?.name} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

function DeckSkeleton() {
    return (
        <div className="space-y-4">
            {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
            ))}
        </div>
    );
}

function EmptyDeck({ message }: { message: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
            <p className="text-base font-bold text-slate-800">No coursework reports yet</p>
            <p className="mt-1.5 text-sm text-slate-500">{message}</p>
        </div>
    );
}
