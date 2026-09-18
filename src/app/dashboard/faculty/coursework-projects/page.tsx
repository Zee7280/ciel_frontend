"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import CourseworkCard from "@/components/ciel/CourseworkCard";
import MeritModelPanel, { type MeritEntry } from "@/components/ciel/MeritModelPanel";
import {
    CourseworkCrumb,
    HubBackButton,
    PathFilterBar,
    PathSectionHead,
    WorkflowSteps,
    useFacultyHubView,
} from "@/components/ciel/coursework/CourseworkHubChrome";
import CourseworkFacultyBenchmark, {
    benchmarkHealthy,
    courseworkDistribution,
    meanApprovedScore,
} from "@/components/ciel/coursework/CourseworkFacultyBenchmark";
import { MOCKUP_GRADIENTS, MockupActionCard, MockupHero } from "@/components/ciel/dashboard/MockupChrome";
import CourseworkFacultyReviewInbox from "@/components/ciel/coursework/CourseworkFacultyReviewInbox";
import { currentAcademicYear } from "@/components/ciel/FypRankingStudio";
import { isFacultyApproved, pendingFacultyReview, reviewCourseProjectSections } from "@/utils/courseworkSectionReview";
import { mergeCourseProjectEntry } from "@/utils/courseProjectTypes";
import { namedTimeGreeting } from "@/utils/timeGreeting";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { normalizeReviewStatus } from "@/utils/reviewQueue";

const BASE = "/dashboard/faculty/coursework-projects";
const VIEWS = ["home", "progress", "review", "approved", "rank", "bench"] as const;
type FacView = (typeof VIEWS)[number];
type ReviewTab = "pending" | "revision" | "rejected" | "all";

const VIEW_CRUMB: Record<Exclude<FacView, "home">, string> = {
    progress: "Coursework in progress",
    review: "Review & moderate",
    approved: "Approved coursework & AI ranking",
    rank: "Approved coursework & AI ranking",
    bench: "Benchmark",
};

function isCourseworkRevision(entry: MeritEntry) {
    return entry.status === "submitted" && normalizeReviewStatus(entry.facultyApprovalStatus) === "revision_requested";
}
function isCourseworkRejected(entry: MeritEntry) {
    return entry.status === "submitted" && (normalizeReviewStatus(entry.facultyApprovalStatus) === "rejected" || normalizeReviewStatus(entry.facultyApprovalStatus) === "declined");
}

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
    const [reviewTab, setReviewTab] = useState<ReviewTab>("pending");
    const [firstName, setFirstName] = useState("");
    const [graderRuns, setGraderRuns] = useState<{ unlimited: boolean; used: number; limit: number } | null>(null);

    useEffect(() => {
        const name = readStoredCurrentUser()?.name;
        setFirstName(typeof name === "string" ? name.trim().split(/\s+/)[0] : "");
    }, []);

    useEffect(() => {
        void fetchEntries();
        void fetchInProgress();
        authenticatedFetch("/api/v1/paths/course-projects/merit-model")
            .then((res) => (res?.ok ? res.json() : null))
            .then((result) => {
                if (result?.data?.graderRuns) setGraderRuns(result.data.graderRuns);
            })
            .catch(() => {});
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

    const reviewEntry = async (
        id: string,
        action: "approve" | "reject" | "revision",
        note?: string,
        moderation?: { levels: Record<string, number>; notes?: Record<string, string>; facultyScore: number; band?: string; lockHash?: string },
    ) => {
        setReviewingId(id);
        try {
            const response = await authenticatedFetch(`/api/v1/paths/course-projects/${id}/faculty-review`, {
                method: "PATCH",
                body: JSON.stringify({ action, note, moderation }),
            });
            if (response?.ok) {
                const data = await response.json();
                setEntries((prev) =>
                    prev.map((e) =>
                        e.id === id
                            ? { ...mergeCourseProjectEntry(e, data.data as Partial<typeof e>), student: (data.data as { student?: typeof e.student })?.student ?? e.student }
                            : e,
                    ),
                );
                toast.success(
                    action === "approve"
                        ? "Approved — final score, analysis and your comment are now on the student's flashcard and Impact Wall, your wall, the university and CIEL PK."
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
    const revision = useMemo(() => entries.filter(isCourseworkRevision), [entries]);
    const rejected = useMemo(() => entries.filter(isCourseworkRejected), [entries]);
    const underReview = useMemo(() => [...pending, ...revision, ...rejected], [pending, revision, rejected]);
    const readyNotSubmitted = inProgress.filter((e) => (e.stepCompleted ?? 0) >= 7);
    const gateHeld = underReview.filter((e) => reviewCourseProjectSections(e).some((c) => !c.ok)).length;
    const scoredDist = useMemo(() => courseworkDistribution(entries), [entries]);
    const meanScore = meanApprovedScore(approved);
    const benchOk = benchmarkHealthy(approved);
    const studioView = view === "rank" || view === "approved";
    const ay = currentAcademicYear();
    const pubsLeft = graderRuns?.unlimited ? "∞" : String(Math.max(0, (graderRuns?.limit ?? 3) - (graderRuns?.used ?? 0)));

    const matchesSearch = (entry: MeritEntry) => {
        const q = searchQuery.toLowerCase();
        if (!q) return true;
        return (
            entry.student?.name?.toLowerCase().includes(q) ||
            entry.student?.email?.toLowerCase().includes(q) ||
            entry.projectTitle?.toLowerCase().includes(q) ||
            entry.course?.toLowerCase().includes(q)
        );
    };
    const filteredApproved = approved.filter(matchesSearch);
    const reviewPool =
        reviewTab === "pending" ? pending
            : reviewTab === "revision" ? revision
              : reviewTab === "rejected" ? rejected
                : underReview;

    const reviewFilters = [
        `Pending · ${pending.length}`,
        `Revision requested · ${revision.length}`,
        `Rejected · ${rejected.length}`,
        `All · ${underReview.length}`,
    ];
    const activeReviewFilter =
        reviewTab === "pending" ? reviewFilters[0]
            : reviewTab === "revision" ? reviewFilters[1]
              : reviewTab === "rejected" ? reviewFilters[2]
                : reviewFilters[3];

    return (
        <div className={view === "home" || view === "review" || studioView || view === "bench" ? "mx-auto max-w-[1500px] space-y-4 pb-16" : "mx-auto max-w-[1240px] space-y-4 pb-16"}>
            <CourseworkCrumb role="Faculty" view={view === "home" ? undefined : VIEW_CRUMB[view]} pathLabel="Coursework Project" />
            {view === "home" ? (
                <MockupHero
                    kicker="FACULTY · COURSEWORK"
                    title={namedTimeGreeting(firstName, "📘")}
                    subtitle="Students' coursework arrives as flashcards with the AI analysis already run. You keep final academic authority: edit any criterion level (reason required), add your comment, approve — and the final score, analysis and comment go to the student's flashcard and Impact Wall, your wall, the university and CIEL PK in one transaction."
                    stats={[
                        { value: String(pending.length), label: "AWAITING MY REVIEW", href: `${BASE}?view=review` },
                        { value: String(inProgress.length), label: "IN PROGRESS (STUDENTS)", href: `${BASE}?view=progress` },
                        { value: String(revision.length), label: "REVISION WITH STUDENT", href: `${BASE}?view=review` },
                        { value: String(approved.length), label: "APPROVED", href: `${BASE}?view=rank` },
                        { value: meanScore, label: "MEAN APPROVED SCORE", href: `${BASE}?view=bench` },
                    ]}
                />
            ) : view === "progress" ? (
                <MockupHero
                    kicker="PIPELINE"
                    title="Coursework in progress"
                    subtitle="Records students have created but not submitted. They were replicated to you the moment they were created."
                    stats={[
                        { value: String(inProgress.length), label: "IN PROGRESS" },
                        { value: String(readyNotSubmitted.length), label: "READY, NOT SUBMITTED" },
                    ]}
                />
            ) : view === "review" ? (
                <MockupHero
                    kicker="REVIEW QUEUE"
                    title="Coursework review"
                    subtitle="Each card already carries the AI analysis (auto-run on submission). Open it to read the criterion reasoning, what went well, what to improve, evidence and SDG-accuracy checks and the benchmark position — then moderate and decide."
                    stats={[
                        { value: String(pending.length), label: "PENDING" },
                        { value: String(revision.length), label: "REVISION" },
                        { value: String(gateHeld), label: "GATE-HELD SCORES" },
                    ]}
                />
            ) : studioView ? (
                <MockupHero
                    kicker="APPROVED · RANKING STUDIO"
                    title="Approved coursework & AI ranking"
                    subtitle="Only approved flashcards are ranked. Filter by course, semester, level or SDG; run the analyser to see the benchmark and the reason behind every rank; publish a fixed ranking at most 3 times per academic year."
                    stats={[
                        { value: String(approved.length), label: "APPROVED" },
                        { value: `${pubsLeft} / ${graderRuns?.unlimited ? "∞" : graderRuns?.limit ?? 3}`, label: `FINAL PUBLICATIONS LEFT · AY ${ay}` },
                        { value: "Unlimited", label: "PREVIEWS" },
                    ]}
                />
            ) : view === "bench" ? (
                <MockupHero
                    kicker="BENCHMARK"
                    title="Is my marking realistic?"
                    subtitle="Distribution of all AI-analysed and approved records in my courses against the calibrated reference. If most students sit at 90+, the rubric is not discriminating — that is a flaw in the system, not a strength of the cohort."
                    stats={[
                        { value: String(scoredDist.n), label: "SCORED RECORDS" },
                        { value: scoredDist.n ? String(scoredDist.mean) : "—", label: "MEAN" },
                    ]}
                />
            ) : null}

            {view !== "home" ? <HubBackButton href={homeHref} label="← Back to Coursework Project" /> : null}

            {view === "home" && (
                <>
                    <WorkflowSteps
                        title="Coursework review loop"
                        subtitle="Student builds the record. You moderate the AI analysis. Approval publishes the same file everywhere."
                        steps={["Student creates", "Student submits", "I review", "I moderate", "Approve", "Rank"]}
                        captions={[
                            "Appears in my pipeline",
                            "AI analyser auto-runs",
                            "Reasoning, evidence, SDG accuracy, benchmark",
                            "Change levels with reasons + final comment",
                            "Published to all stakeholders",
                            "Preview anytime · publish fixed ranking ≤3/yr",
                        ]}
                        activeIndex={2}
                    />
                    <PathSectionHead title="Action required" subtitle="Review, nudge stalled drafts, rank approved cohorts, or check calibration." />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <MockupActionCard
                            href={`${BASE}?view=review`}
                            emoji="✅"
                            ghost="✅"
                            title="Review & moderate"
                            subtitle="AI-analysed submissions waiting for your decision."
                            badge={`${pending.length} PENDING`}
                            background={MOCKUP_GRADIENTS.teal}
                        />
                        <MockupActionCard
                            href={`${BASE}?view=progress`}
                            emoji="🧩"
                            ghost="🧩"
                            title="Coursework in progress"
                            subtitle="Nudge students who have stalled."
                            badge={`${inProgress.length} IN PROGRESS`}
                            background={MOCKUP_GRADIENTS.blue}
                        />
                        <MockupActionCard
                            href={`${BASE}?view=rank`}
                            emoji="🏆"
                            ghost="🏆"
                            title="Ranking studio"
                            subtitle="Run the analyser on my cohorts; publish a fixed ranking."
                            badge={`${approved.length} APPROVED`}
                            background={MOCKUP_GRADIENTS.purple}
                        />
                        <MockupActionCard
                            href={`${BASE}?view=bench`}
                            emoji="📊"
                            ghost="📊"
                            title="Benchmark"
                            subtitle="Is my marking distribution realistic?"
                            badge={benchOk ? "HEALTHY" : "CHECK"}
                            background={MOCKUP_GRADIENTS.gold}
                        />
                    </div>
                </>
            )}

            {view === "progress" && (
                <div>
                    <PathSectionHead
                        title="Coursework in Progress"
                        subtitle="Live completion from each student's form. Reminders open Email / WhatsApp with a prefilled message."
                    />
                    {loading && inProgress.length === 0 ? (
                        <DeckSkeleton />
                    ) : inProgress.length === 0 ? (
                        <EmptyDeck message="Nothing in progress. Students still filling out the coursework form will appear here — nudge anyone who's stalled." />
                    ) : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {inProgress.map((entry) => (
                                <div key={entry.id}>
                                    <CourseworkCard
                                        entry={entry}
                                        studentName={entry.student?.name}
                                        remindDraftOwner
                                        studentEmail={entry.student?.email || entry.studentInfo?.studentEmail}
                                        hideScore={false}
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
                <div>
                    <PathSectionHead
                        title="Coursework submissions"
                        subtitle="Open the AI Coursework Score + Global Benchmark workspace: flashcard, primary file, evidence, 7-criterion rubric, then approve, request revision or reject."
                    />
                    <PathFilterBar
                        filters={reviewFilters}
                        active={activeReviewFilter}
                        onChange={(label) => {
                            if (label.startsWith("Pending")) setReviewTab("pending");
                            else if (label.startsWith("Revision")) setReviewTab("revision");
                            else if (label.startsWith("Rejected")) setReviewTab("rejected");
                            else setReviewTab("all");
                        }}
                    />
                    <div className="mb-4 rounded-[15px] border border-[#d5eee8] bg-[#eef8f6] px-4 py-3 text-[11px] leading-relaxed text-[#4b6f68]">
                        🔒 The AI score is visible to you, the university and CIEL PK at review stage — <b>not to the student</b>. Approval publishes the <b>final</b> score with your comment to everyone.
                    </div>
                    {loading ? (
                        <DeckSkeleton />
                    ) : (
                        <CourseworkFacultyReviewInbox
                            entries={reviewPool}
                            reviewingId={reviewingId}
                            onReview={reviewEntry}
                            emptyMessage={
                                reviewPool.length === 0 && underReview.length === 0
                                    ? "No submitted cards waiting for your approval."
                                    : "Nothing here."
                            }
                        />
                    )}
                </div>
            )}

            {studioView && (
                <div>
                    <PathSectionHead
                        title="Ranking Studio — Comparative AI Grader"
                        subtitle="Rubric CIEL-PK-CW-COMP-1.0 · the same rubric as University and CIEL PK; only the cohort changes."
                        pill="SYNCED TO ALL DASHBOARDS"
                    />
                    {loading ? (
                        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
                    ) : (
                        <>
                            {approved.length === 0 ? (
                                <EmptyDeck message="Approve at least one submitted card to run the Analyzer." />
                            ) : (
                                <MeritModelPanel entries={approved} meritEndpoint="/api/v1/paths/course-projects/merit-model" scopeName="Your cohort" />
                            )}
                            <div className="mt-8">
                                <PathSectionHead
                                    title="Approved flashcards"
                                    subtitle="Live on the student's wall, your wall, the university and CIEL PK."
                                    pill="SYNCED TO ALL DASHBOARDS"
                                />
                                <div className="relative mb-3 max-w-sm">
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
                                    <EmptyDeck message={approved.length === 0 ? "Approve at least one submitted card to see it here." : "No reports match your search."} />
                                ) : (
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        {filteredApproved.map((entry) => (
                                            <CourseworkCard key={entry.id} entry={entry} studentName={entry.student?.name} hideScore={false} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {view === "bench" && (
                <div>
                    <PathSectionHead
                        title="Benchmark · my courses"
                        subtitle="Scored records against the calibrated reference. Black tick = expected share for a healthy cohort."
                    />
                    {loading ? <DeckSkeleton /> : <CourseworkFacultyBenchmark entries={entries} />}
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
