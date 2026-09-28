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
    CourseworkHero,
    HubBackButton,
    HubTile,
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
import { MOCKUP_GRADIENTS } from "@/components/ciel/dashboard/MockupChrome";
import CourseworkFacultyReviewInbox from "@/components/ciel/coursework/CourseworkFacultyReviewInbox";
import { currentAcademicYear } from "@/components/ciel/FypRankingStudio";
import { isFacultyApproved, pendingFacultyReview, reviewCourseProjectSections } from "@/utils/courseworkSectionReview";
import { mergeCourseProjectEntry } from "@/utils/courseProjectTypes";
import { mailtoHref, whatsappShareHref } from "@/utils/reminderLinks";
import { namedTimeGreeting } from "@/utils/timeGreeting";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { normalizeReviewStatus } from "@/utils/reviewQueue";

const BASE = "/dashboard/faculty/coursework-projects";
const VIEWS = ["home", "review", "drafts", "wall", "ranker", "bench"] as const;
type FacView = (typeof VIEWS)[number];
type ReviewTab = "pending" | "revision" | "rejected" | "all";

const VIEW_CRUMB: Record<Exclude<FacView, "home">, string> = {
    review: "Review Queue",
    drafts: "Live Drafts",
    wall: "Faculty Impact Wall",
    ranker: "Run AI Ranker",
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

    const wide = view === "home" || view === "review" || view === "wall" || view === "ranker" || view === "bench";

    return (
        <div className={wide ? "mx-auto max-w-[1500px] space-y-4 pb-16" : "mx-auto max-w-[1240px] space-y-4 pb-16"}>
            <CourseworkCrumb role="Faculty" view={view === "home" ? undefined : VIEW_CRUMB[view]} pathLabel="Coursework Project" />
            {view === "home" ? (
                <CourseworkHero
                    kicker="FACULTY · COURSEWORK"
                    title={namedTimeGreeting(firstName, "📘")}
                    subtitle="Students' coursework arrives as flashcards with the AI analysis already run. You keep final academic authority: edit any criterion level, add your comment, approve — and the final score, analysis and comment go to the student's flashcard and Impact Wall, your wall, the university and CIEL PK in one transaction."
                    stats={[
                        { value: String(pending.length), label: "AWAITING DECISION", href: `${BASE}?view=review` },
                        { value: String(inProgress.length), label: "DRAFTS IN PROGRESS", href: `${BASE}?view=drafts` },
                        { value: String(approved.length), label: "APPROVED", href: `${BASE}?view=wall` },
                        { value: `${pubsLeft}`, label: `RANKINGS LEFT · AY ${ay}`, href: `${BASE}?view=ranker` },
                        { value: meanScore, label: "MEAN APPROVED SCORE", href: `${BASE}?view=bench` },
                    ]}
                />
            ) : view === "review" ? (
                <CourseworkHero
                    kicker="REVIEW QUEUE"
                    title="Review Queue"
                    subtitle="Submitted coursework with the AI proposed score. Open a card to read the criterion reasoning and evidence, edit any level, then approve, request revision or reject."
                    stats={[
                        { value: String(pending.length), label: "PENDING" },
                        { value: String(revision.length), label: "REVISION" },
                        { value: String(gateHeld), label: "GATE-HELD SCORES" },
                    ]}
                />
            ) : view === "drafts" ? (
                <CourseworkHero
                    kicker="LIVE DRAFTS"
                    title="Live Drafts"
                    subtitle="Every student draft connected to you, with its live progress bar. Nudge a stalled student by WhatsApp or Email."
                    stats={[
                        { value: String(inProgress.length), label: "IN PROGRESS" },
                        { value: String(readyNotSubmitted.length), label: "READY, NOT SUBMITTED" },
                    ]}
                />
            ) : view === "wall" ? (
                <CourseworkHero
                    kicker="FACULTY IMPACT WALL"
                    title="Faculty Impact Wall"
                    subtitle="Everything you approved, with final scores and ranking badges — mirrored on the student, university and CIEL PK walls."
                    stats={[
                        { value: String(approved.length), label: "APPROVED" },
                        { value: meanScore, label: "MEAN SCORE" },
                    ]}
                />
            ) : view === "ranker" ? (
                <CourseworkHero
                    kicker="RUN AI RANKER"
                    title="Run AI Ranker"
                    subtitle="Ranks approved coursework in the chosen scope by final score. Publishing writes a Faculty rank badge onto each record — visible on every Impact Wall. A rank never changes a score."
                    stats={[
                        { value: String(approved.length), label: "APPROVED, ELIGIBLE" },
                        { value: `${pubsLeft}`, label: `PUBLICATIONS LEFT · AY ${ay}` },
                    ]}
                />
            ) : view === "bench" ? (
                <CourseworkHero
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
                            "Reasoning, evidence, benchmark",
                            "Change levels + final comment",
                            "Published to all stakeholders",
                            "Preview anytime · publish fixed ranking ≤3/yr",
                        ]}
                        activeIndex={2}
                    />
                    <PathSectionHead
                        title="Action required"
                        subtitle="Decide on submitted work, follow live drafts, see your approved impact and rank your cohorts."
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <HubTile
                            href={`${BASE}?view=review`}
                            emoji="✓"
                            title="Review Queue"
                            subtitle="Submitted coursework with the AI proposed score. Approve, edit the score, request revision or reject."
                            badge="YOUR WORK"
                            background={MOCKUP_GRADIENTS.orange}
                        />
                        <HubTile
                            href={`${BASE}?view=drafts`}
                            emoji="👁"
                            title="Live Drafts"
                            subtitle="Every student draft connected to you, with its live progress bar. Nudge by WhatsApp or Email."
                            badge="LIVE"
                            background={MOCKUP_GRADIENTS.blue}
                        />
                        <HubTile
                            href={`${BASE}?view=wall`}
                            emoji="🏅"
                            title="Faculty Impact Wall"
                            subtitle="Everything you approved, with final scores and ranking badges."
                            badge="IMPACT"
                            background={MOCKUP_GRADIENTS.green}
                        />
                        <HubTile
                            href={`${BASE}?view=ranker`}
                            emoji="📊"
                            title="Run AI Ranker"
                            subtitle="Rank your approved coursework by course or semester and publish Faculty badges."
                            badge="RANK"
                            background={MOCKUP_GRADIENTS.purple}
                        />
                    </div>
                </>
            )}

            {view === "review" && (
                <div>
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

            {view === "drafts" && (
                <div>
                    <PathSectionHead
                        title="Live Drafts"
                        subtitle="Read-only mirror of what your students are writing right now. Reminders open Email / WhatsApp with a prefilled message."
                    />
                    {loading && inProgress.length === 0 ? (
                        <DeckSkeleton />
                    ) : inProgress.length === 0 ? (
                        <EmptyDeck message="No drafts in progress. New student records appear here the moment they start typing." />
                    ) : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {inProgress.map((entry) => (
                                <LiveDraftCard key={entry.id} entry={entry} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {view === "wall" && (
                <div>
                    <PathSectionHead
                        title="Faculty Impact Wall"
                        subtitle="Live on the student's wall, your wall, the university and CIEL PK."
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
                    {loading ? (
                        <DeckSkeleton />
                    ) : filteredApproved.length === 0 ? (
                        <EmptyDeck message={approved.length === 0 ? "Approve at least one submitted card to see it here." : "No reports match your search."} />
                    ) : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {filteredApproved.map((entry) => (
                                <CourseworkCard key={entry.id} entry={entry} studentName={entry.student?.name} hideScore={false} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {view === "ranker" && (
                <div>
                    <PathSectionHead
                        title="Ranking Studio — Comparative AI Grader"
                        subtitle="Rubric CIEL-PK-CW-COMP-1.0 · the same rubric as University and CIEL PK; only the cohort changes."
                        pill="SYNCED TO ALL DASHBOARDS"
                    />
                    {loading ? (
                        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
                    ) : approved.length === 0 ? (
                        <EmptyDeck message="Approve at least one submitted card to run the Ranker." />
                    ) : (
                        <MeritModelPanel entries={approved} meritEndpoint="/api/v1/paths/course-projects/merit-model" scopeName="Your cohort" />
                    )}
                </div>
            )}

            {view === "bench" && (
                <div>
                    <PathSectionHead
                        title="Benchmark · my courses"
                        subtitle="Scored records against the calibrated reference. Black tick = expected share for a healthy cohort."
                        pill={benchOk ? "HEALTHY" : "CHECK"}
                    />
                    {loading ? <DeckSkeleton /> : <CourseworkFacultyBenchmark entries={entries} />}
                </div>
            )}
        </div>
    );
}

/** Mockup's compact `recordCard` shape for a live draft: title/progress, an owner card (who it is),
 * a "Missing" box (from the same field checks faculty review uses) and one WhatsApp+Email nudge row —
 * lighter than the full flashcard, which is what CourseworkCard is built for. */
function LiveDraftCard({ entry }: { entry: MeritEntry }) {
    const missing = reviewCourseProjectSections(entry)
        .filter((c) => !c.ok)
        .map((c) => c.label.replace(/^§\d+\s/, ""));
    const stepsDone = Math.min(entry.stepCompleted ?? 0, 7);
    const pct = Math.round((stepsDone / 7) * 100);
    const title = entry.projectTitle || (entry.status === "draft" ? "New coursework report — not yet titled" : "Untitled coursework");
    const studentName = entry.student?.name || entry.studentInfo?.studentName || "Student";
    const programme = entry.studentInfo?.programme || entry.studentInfo?.disciplineName || entry.course || "Programme not set";
    const email = entry.student?.email || entry.studentInfo?.studentEmail;
    const updated = entry.updatedAt ?? entry.createdAt;
    const isRevision = entry.status === "submitted";
    const subject = `Reminder: continue "${entry.projectTitle || "your coursework"}" on CIEL PK`;
    const body = `Hi ${studentName.split(" ")[0]},\n\nYour coursework record "${entry.projectTitle || "coursework"}" (${entry.course || "coursework"}) is ${pct}% complete on CIEL PK. Please continue and submit it for faculty review when it's ready.\n\nThanks`;

    return (
        <div className="rounded-[17px] border border-[#dde5ea] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h4 className="truncate text-[15px] font-bold text-[#183140]">{title}</h4>
                    <p className="mt-0.5 text-[10.5px] text-[#70808a]">
                        {entry.course || "Course not set"} {entry.studentInfo?.semester ? `· ${entry.studentInfo.semester}` : ""}
                        {updated ? ` · updated ${formatDistanceToNow(new Date(updated), { addSuffix: true })}` : ""}
                    </p>
                </div>
                <span
                    className={
                        isRevision
                            ? "shrink-0 rounded-full bg-[#fef3e2] px-2.5 py-1 text-[9.5px] font-black text-[#b45309]"
                            : "shrink-0 rounded-full bg-[#edf1f2] px-2.5 py-1 text-[9.5px] font-black text-[#596971]"
                    }
                >
                    {isRevision ? "REVISION" : "DRAFT"}
                </span>
            </div>

            <div className="mt-2.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-[#4c5d65]">
                    <span>{stepsDone} of 7 sections complete</span>
                    <span>{pct}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#e6ecee]">
                    <span className="block h-full rounded-full bg-[linear-gradient(90deg,#15a08e,#e4a73e)]" style={{ width: `${pct}%` }} />
                </div>
            </div>

            <div className="mt-3 grid gap-2.5 sm:grid-cols-[1fr_190px]">
                <div className="rounded-[13px] border border-[#e8edef] bg-[#fafbfb] p-2.5">
                    <p className="text-[9px] font-black uppercase tracking-wide text-[#7a919a]">Missing</p>
                    <p className="mt-1 text-[10.5px] leading-snug text-[#4c5d65]">{missing.length ? missing.join(", ") : "Nothing — ready to submit"}</p>
                </div>
                <div className="rounded-[13px] border border-[#dde5ea] bg-[#f8fafb] p-2.5">
                    <b className="block text-[11px] text-[#183140]">{studentName}</b>
                    <small className="mt-0.5 block text-[10px] text-[#70808a]">{programme}</small>
                </div>
            </div>

            {email ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold text-[#70808a]">Nudge student:</span>
                    <a
                        href={whatsappShareHref(`${subject}\n\n${body}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-[9px] bg-[#f8f2e7] px-2.5 py-1.5 text-[10px] font-black text-[#765b25]"
                    >
                        💬 WhatsApp
                    </a>
                    <a href={mailtoHref(email, subject, body)} className="rounded-[9px] bg-[#edf4fb] px-2.5 py-1.5 text-[10px] font-black text-[#376d9f]">
                        ✉️ Email
                    </a>
                </div>
            ) : null}
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
