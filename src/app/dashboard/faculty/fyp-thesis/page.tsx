"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { type FypMeritEntry } from "@/components/ciel/FypMeritPanel";
import FypRankingStudio, { currentAcademicYear } from "@/components/ciel/FypRankingStudio";
import FacultyFypFlashcardModal, {
    FacultyFypReviewCard,
    FacultyFypProgressCard,
    FacultyFypApprovedCard,
    fypAiFlagCount,
} from "@/components/ciel/FacultyFypFlashcard";
import FacultyFypDetailedReview from "@/components/ciel/FacultyFypDetailedReview";
import { CourseworkCrumb, HubBackButton, PathSectionHead, ActionKpiGrid, WorkflowSteps, PathFilterBar, useFacultyHubView } from "@/components/ciel/coursework/CourseworkHubChrome";
import { FACULTY_HERO, MOCKUP_GRADIENTS, MockupActionCard, MockupHero } from "@/components/ciel/dashboard/MockupChrome";
import { isPathEntryApproved, isPathEntryWaiting, normalizeReviewStatus } from "@/utils/reviewQueue";

const FYP_VIEWS = ["home", "progress", "pending", "approved", "rank"] as const;
type FacView = (typeof FYP_VIEWS)[number];
const FYP_BASE = "/dashboard/faculty/fyp-thesis";
const VIEW_CRUMB: Record<Exclude<FacView, "home">, string> = {
    progress: "FYP in Progress",
    pending: "FYP Review",
    approved: "Approved FYP Impact",
    rank: "Approved FYP + AI Ranking",
};
type ReviewTab = "pending" | "revision" | "rejected" | "all";

function fypGate(entry: FypMeritEntry) {
    return entry.supervisorApprovalStatus;
}
function isFypRevision(entry: FypMeritEntry) {
    const gate = normalizeReviewStatus(fypGate(entry));
    return gate === "revision_requested" || gate === "revisions_requested" || gate === "changes_requested";
}
function isFypRejected(entry: FypMeritEntry) {
    const gate = normalizeReviewStatus(fypGate(entry));
    return gate === "rejected" || gate === "declined";
}

export default function FacultyFypThesisPage() {
    return (
        <Suspense fallback={<div className="mx-auto max-w-[1240px] py-16 text-center text-sm text-[#71828e]">Loading FYP…</div>}>
            <FacultyFypThesisHub />
        </Suspense>
    );
}

function FacultyFypThesisHub() {
    const { view, homeHref } = useFacultyHubView(FYP_VIEWS, "home");
    const [entries, setEntries] = useState<FypMeritEntry[]>([]);
    const [inProgress, setInProgress] = useState<FypMeritEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [reviewingId, setReviewingId] = useState<string | null>(null);
    const [reviewTab, setReviewTab] = useState<ReviewTab>("pending");
    const [openFlashcardId, setOpenFlashcardId] = useState<string | null>(null);
    const [openReviewId, setOpenReviewId] = useState<string | null>(null);
    const [graderRuns, setGraderRuns] = useState<{ unlimited: boolean; used: number; limit: number } | null>(null);

    useEffect(() => {
        void fetchEntries();
        void fetchInProgress();
        authenticatedFetch("/api/v1/paths/fyp-thesis/merit-model")
            .then((res) => (res?.ok ? res.json() : null))
            .then((result) => {
                if (result?.data?.graderRuns) setGraderRuns(result.data.graderRuns);
            })
            .catch(() => {});
    }, []);

    const fetchEntries = async () => {
        try {
            setLoading(true);
            const response = await authenticatedFetch("/api/v1/paths/fyp-thesis/supervised");
            if (response?.ok) {
                const data = await response.json();
                setEntries(Array.isArray(data.data) ? data.data : []);
            } else {
                toast.error("Failed to load FYP / thesis records");
                setEntries([]);
            }
        } catch {
            toast.error("Failed to load FYP / thesis records");
            setEntries([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchInProgress = async () => {
        try {
            const response = await authenticatedFetch("/api/v1/paths/fyp-thesis/in-progress");
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
            const response = await authenticatedFetch(`/api/v1/paths/fyp-thesis/${id}/supervisor-review`, {
                method: "PATCH",
                body: JSON.stringify({ action, note }),
            });
            if (response?.ok) {
                const data = await response.json();
                setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...data.data } : e)));
                toast.success(
                    action === "approve"
                        ? "Approved ✓ — flashcard, the score you allotted and your section comments are now on the student's impact wall, your Approved FYP, the University FYP Impact Wall and CIEL PK."
                        : action === "revision"
                          ? "Revision requested — returned to the student with your comments (Email + WhatsApp notification)."
                          : "Rejected — Final Year Project not accepted; the student has been notified with your reason.",
                );
                setOpenFlashcardId(null);
                setOpenReviewId(null);
            } else {
                toast.error("Could not save your review");
            }
        } catch {
            toast.error("Could not save your review");
        } finally {
            setReviewingId(null);
        }
    };

    /** Bubbles an aiAnalysis/aiAnalysisLock (or any other) patch from FypAiAnalysisPanel back into
     * the list state — same merge shape reviewEntry already uses for supervisor-review responses. */
    const updateEntry = (id: string, patch: Partial<FypMeritEntry>) => {
        setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    };

    const waiting = useMemo(() => entries.filter(isPathEntryWaiting), [entries]);
    const approved = useMemo(() => entries.filter(isPathEntryApproved), [entries]);
    const revision = useMemo(() => entries.filter(isFypRevision), [entries]);
    const rejected = useMemo(() => entries.filter(isFypRejected), [entries]);
    const readyNotSubmitted = inProgress.filter((e) => (e.stepCompleted ?? 0) >= 8);
    const ay = currentAcademicYear();
    const pubsLeft = graderRuns?.unlimited ? "∞" : String(Math.max(0, (graderRuns?.limit ?? 3) - (graderRuns?.used ?? 0)));

    const matchesSearch = (entry: FypMeritEntry) => {
        const q = searchQuery.toLowerCase();
        if (!q) return true;
        return (
            entry.student?.name?.toLowerCase().includes(q) ||
            entry.student?.email?.toLowerCase().includes(q) ||
            entry.projectInfo?.title?.toLowerCase().includes(q) ||
            entry.projectTitle?.toLowerCase().includes(q)
        );
    };
    const filteredApproved = approved.filter(matchesSearch);
    const filteredInProgress = inProgress.filter(matchesSearch);
    const reviewPool =
        reviewTab === "pending" ? waiting
            : reviewTab === "revision" ? revision
              : reviewTab === "rejected" ? rejected
                : [...waiting, ...revision, ...rejected];
    const filteredReview = reviewPool.filter(matchesSearch);
    const openFlashcard =
        entries.find((e) => e.id === openFlashcardId) ||
        inProgress.find((e) => e.id === openFlashcardId) ||
        null;
    const openReview =
        entries.find((e) => e.id === openReviewId) ||
        inProgress.find((e) => e.id === openReviewId) ||
        null;
    const aiFlagsToCheck = waiting.filter((e) => fypAiFlagCount(e) > 0).length;

    return (
        <div className="mx-auto max-w-[1500px] space-y-4 pb-16">
                <CourseworkCrumb role="Faculty" view={view === "home" ? undefined : VIEW_CRUMB[view]} pathLabel="Final Year Project (FYP)" />
                {view === "home" ? (
                    <MockupHero
                        kicker="FACULTY IMPACT DASHBOARD"
                        title="FYP"
                        subtitle="Monitor final-year projects, research evidence, supervisor review and verified impact outcomes."
                        gradient={FACULTY_HERO}
                        stats={[
                            { value: String(waiting.length), label: "AWAITING REVIEW", href: `${FYP_BASE}?view=pending` },
                            { value: String(approved.length), label: "APPROVED FYPS", href: `${FYP_BASE}?view=rank` },
                            { value: String(approved.length), label: "ON IMPACT WALLS", href: `${FYP_BASE}?view=rank` },
                        ]}
                    />
                ) : view === "pending" || view === "rank" || view === "progress" ? null : (
                    <HubBackButton href={homeHref} label="← Back to module buttons" />
                )}

                {view === "home" && (
                    <>
                        <PathSectionHead
                            title="FYP Management"
                            subtitle="Your supervisees' Final Year Projects flow in as flashcards. The FYP AI Analyser has already scored each one against excellent work in the student's discipline (level-aware) — edit anything you disagree with, then approve to release the score and comments to the student."
                            pill="FACULTY VIEW"
                        />
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                            <MockupActionCard
                                href={`${FYP_BASE}?view=progress`}
                                emoji="🔬"
                                ghost="🔬"
                                title="FYP in Progress"
                                subtitle="Supervisees still building their record — completion bar, last activity, Email + WhatsApp reminders."
                                badge={`${inProgress.length} IN PROGRESS`}
                                background={MOCKUP_GRADIENTS.blue}
                            />
                            <MockupActionCard
                                href={`${FYP_BASE}?view=pending`}
                                emoji="✅"
                                ghost="✅"
                                title="FYP Review"
                                subtitle="Submitted FYP Flashcards — the AI Analyser has run automatically on each (measured against excellent work in the student's discipline, at their level). Edit any section score or comment, then approve (releases the score to the student), request revision or reject."
                                badge={`${waiting.length} PENDING`}
                                background={MOCKUP_GRADIENTS.teal}
                            />
                            <MockupActionCard
                                href={`${FYP_BASE}?view=rank`}
                                emoji="🏅"
                                ghost="🏅"
                                title="Approved FYP + AI Analyser Ranking"
                                subtitle="Run the AI Analyser across all your approved projects anytime (unofficial preview). Publish up to 3× per academic year — each student gets a locked, dated “Faculty AI Analyser” badge on their flashcard, synced to the university and CIEL PK."
                                badge={`${approved.length} APPROVED`}
                                background={MOCKUP_GRADIENTS.purple}
                            />
                        </div>
                        <ActionKpiGrid
                            subtitle="Current FYP items that need faculty attention."
                            items={[
                                { value: String(waiting.length), label: "Submitted for Review" },
                                { value: String(revision.length), label: "Revision Requested" },
                                { value: String(inProgress.length), label: "In Progress (students)" },
                                { value: String(approved.length), label: "Approved This Year" },
                            ]}
                        />
                        <WorkflowSteps
                            title="FYP review loop"
                            subtitle="Student builds the record. You review the flashcard. Approval publishes the same file everywhere."
                            steps={[
                                "Student builds FYP record (in progress)",
                                "Student submits flashcard → AI Analyser runs automatically",
                                "Supervisor reviews & may edit score / comments",
                                "Approve → score & comments released to student, university, CIEL PK",
                                "AI Analyser cohort ranking (publish 3× / year → locked badges)",
                            ]}
                            captions={["Student side", "Student side", "You are here", "After your decision", "After your decision"]}
                            activeIndex={2}
                        />
                    </>
                )}

                {(view === "progress" || view === "approved") && (
                    <div className="relative max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by student or title…"
                            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-blue-400"
                        />
                    </div>
                )}

                {view === "progress" && (
                    <>
                        <MockupHero
                            kicker="FACULTY IMPACT DASHBOARD"
                            title="FYP in Progress"
                            subtitle="Supervisees who have started their Final Year Project record but not yet submitted. Nudge anyone who has stalled."
                            gradient={FACULTY_HERO}
                            stats={[
                                { value: String(inProgress.length), label: "IN PROGRESS" },
                                { value: String(readyNotSubmitted.length), label: "READY, NOT SUBMITTED" },
                                { value: String(revision.length), label: "REVISION WITH STUDENT" },
                            ]}
                        />
                        <HubBackButton href={homeHref} label="← Back to module buttons" />
                        <PathSectionHead
                            title="Final Year Projects in Progress"
                            subtitle="Live completion from each student's FYP record. Reminders open Email / WhatsApp with a prefilled message."
                        />
                    {loading && inProgress.length === 0 ? (
                        <SkeletonList />
                    ) : filteredInProgress.length === 0 ? (
                        <EmptyFyp
                            message={
                                inProgress.length === 0
                                    ? "No Final Year Projects in progress."
                                    : "No records match your search."
                            }
                        />
                    ) : (
                        <div className="grid gap-3">
                            {filteredInProgress.map((entry) => (
                                <FacultyFypProgressCard
                                    key={entry.id}
                                    entry={entry}
                                    onOpenDraft={() => setOpenFlashcardId(entry.id || null)}
                                />
                            ))}
                        </div>
                    )}
                    </>
                )}

                {view === "pending" && (
                    <>
                        <MockupHero
                            kicker="FACULTY REVIEW QUEUE"
                            title="FYP Review"
                            subtitle="Each submission arrives as the student's FYP Flashcard plus a separate, system-generated Detailed Review — preliminary score and section-by-section strengths, limitations and improvements, measured against excellent work in the same discipline at the student's level. You may amend every score and comment; your approval releases the CIEL PK score and the review to the student, the university and CIEL PK."
                            gradient={FACULTY_HERO}
                            stats={[
                                { value: String(waiting.length), label: "PENDING YOUR REVIEW" },
                                { value: String(revision.length), label: "REVISION WITH STUDENT" },
                                { value: String(aiFlagsToCheck), label: "AI FLAGS TO CHECK" },
                            ]}
                        />
                        <HubBackButton href={homeHref} label="← Back to module buttons" />
                        <PathSectionHead
                            title="Final Year Project submissions"
                            subtitle="Open the Detailed Review: every section shows the preliminary score, the review comment, strengths, limitations and how to improve, with a box to amend the score and add your own comment. Then approve, request revision or reject."
                            pill="AI SCORE SUPPORTS — FACULTY DECIDES"
                        />
                        <div className="mb-4 rounded-[15px] border border-[#d5eee8] bg-[#eef8f6] px-4 py-3 text-[11px] leading-relaxed text-[#4b6f68]">
                            🧾 <b>A Detailed Review is generated automatically the moment a student submits</b> — no button. It is separate from the flashcard and measures every section against excellent work in the student's discipline, at the student's level: what is good, what is missing, how to make it better. <b>You can amend any score or comment</b> inside the review. <b>Approving releases the CIEL PK score + the review</b> beside the flashcard on the student's My Final Year Project Impact, your Approved FYP, the University FYP Impact Wall and CIEL PK — the student sees exactly what was scored and why. The student sees it as a CIEL PK review confirmed by you.
                        </div>
                        <PathFilterBar
                            filters={[
                                `Pending review · ${waiting.length}`,
                                `Revision requested · ${revision.length}`,
                                `Rejected · ${rejected.length}`,
                                `All · ${waiting.length + revision.length + rejected.length}`,
                            ]}
                            active={
                                reviewTab === "pending" ? `Pending review · ${waiting.length}`
                                    : reviewTab === "revision" ? `Revision requested · ${revision.length}`
                                      : reviewTab === "rejected" ? `Rejected · ${rejected.length}`
                                        : `All · ${waiting.length + revision.length + rejected.length}`
                            }
                            onChange={(label) => {
                                if (label.startsWith("Pending")) setReviewTab("pending");
                                else if (label.startsWith("Revision")) setReviewTab("revision");
                                else if (label.startsWith("Rejected")) setReviewTab("rejected");
                                else setReviewTab("all");
                            }}
                        />
                    {loading ? (
                        <SkeletonList />
                    ) : filteredReview.length === 0 ? (
                        <EmptyFyp
                            message={
                                reviewPool.length === 0
                                    ? "Nothing here. Submitted records appear until you approve them."
                                    : "No records match your search."
                            }
                        />
                    ) : (
                        <div className="grid gap-3">
                            {filteredReview.map((entry) => (
                                <FacultyFypReviewCard
                                    key={entry.id}
                                    entry={entry}
                                    onOpenFlashcard={() => setOpenFlashcardId(entry.id || null)}
                                    onOpenReview={() => setOpenReviewId(entry.id || null)}
                                />
                            ))}
                        </div>
                    )}
                    </>
                )}

                {view === "approved" && (
                    <>
                        <PathSectionHead
                            title="Approved Final Year Project flashcards"
                            subtitle="Live on your Faculty Impact Wall, the student's My Final Year Project Impact, the University FYP Impact Wall and CIEL PK — each with the score you allotted."
                            pill="SYNCED TO ALL DASHBOARDS"
                        />
                    {loading ? (
                        <SkeletonList />
                    ) : filteredApproved.length === 0 ? (
                        <EmptyFyp
                            message={
                                approved.length === 0
                                    ? "Approved records appear here after you sign them off."
                                    : "No records match your search."
                            }
                        />
                    ) : (
                        <div className="grid gap-3">
                            {filteredApproved.map((entry) => (
                                <FacultyFypApprovedCard
                                    key={entry.id}
                                    entry={entry}
                                    onOpenFlashcard={() => setOpenFlashcardId(entry.id || null)}
                                    onOpenReview={() => setOpenReviewId(entry.id || null)}
                                />
                            ))}
                        </div>
                    )}
                    </>
                )}

                {view === "rank" && (
                    <>
                        <MockupHero
                            kicker="AI IMPACT RANKING"
                            title="Approved FYP + AI Ranking"
                            subtitle="Run the AI Analyser across all your approved Final Year Projects whenever you like — every run measures each project against the benchmark of excellent work in its discipline and ranks best → less best with pluses, limitations and rationale. Publish at most 3 times per academic year: that day every student in the cohort receives a locked “Faculty AI Analyser” badge (rank, cohort, score, date) on their flashcard, synced to the university and CIEL PK."
                            gradient={FACULTY_HERO}
                            stats={[
                                { value: String(approved.length), label: "APPROVED FYPS" },
                                { value: `${pubsLeft} / ${graderRuns?.unlimited ? "∞" : graderRuns?.limit ?? 3}`, label: `PUBLICATIONS LEFT · AY ${ay}` },
                                { value: "Unlimited", label: "CONFIDENTIAL PREVIEWS" },
                            ]}
                        />
                        <HubBackButton href={homeHref} label="← Back to module buttons" />
                        <PathSectionHead
                            title="FYP Ranking Studio — Comparative AI Grader"
                            subtitle="Standard formula CIEL-PK-FYP-COMP-2.0 · discipline-weighted, benchmarked against excellent work in each discipline · the same formula the University and CIEL PK use — only the cohort changes."
                            pill="TOP AI PICKS"
                        />
                    {loading ? (
                        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
                    ) : (
                        <>
                            <FypRankingStudio
                                entries={approved}
                                meritEndpoint="/api/v1/paths/fyp-thesis/merit-model"
                                stakeholder="FACULTY"
                                byLabel="Faculty"
                                scopeLabel="My approved Final Year Projects"
                                onOpenCard={(entry) => setOpenFlashcardId(entry.id || null)}
                                onOpenReview={(entry) => setOpenReviewId(entry.id || null)}
                                onQuotaChange={setGraderRuns}
                            />
                            <div className="mt-8">
                                <PathSectionHead
                                    title="Approved Final Year Project flashcards"
                                    subtitle="Live on your Faculty Impact Wall, the student's My Final Year Project Impact, the University FYP Impact Wall and CIEL PK — each with the score you allotted and every AI Analyser badge (faculty, university, CIEL PK live)."
                                    pill="SYNCED TO ALL DASHBOARDS"
                                />
                                {approved.length === 0 ? (
                                    <EmptyFyp message="Approved records appear here after you sign them off." />
                                ) : (
                                    <div className="grid gap-3">
                                        {approved.map((entry) => (
                                            <FacultyFypApprovedCard
                                                key={entry.id}
                                                entry={entry}
                                                onOpenFlashcard={() => setOpenFlashcardId(entry.id || null)}
                                                onOpenReview={() => setOpenReviewId(entry.id || null)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                    </>
                )}
                {openFlashcard ? (
                    <FacultyFypFlashcardModal
                        entry={openFlashcard}
                        onClose={() => setOpenFlashcardId(null)}
                        onUpdate={updateEntry}
                        onSupervisorReview={
                            isPathEntryWaiting(openFlashcard) && openFlashcard.id
                                ? (action, note) => void reviewEntry(openFlashcard.id!, action, note)
                                : undefined
                        }
                        reviewing={reviewingId === openFlashcard.id}
                        onOpenReview={
                            openFlashcard.id
                                ? () => {
                                    setOpenFlashcardId(null);
                                    setOpenReviewId(openFlashcard.id || null);
                                }
                                : undefined
                        }
                    />
                ) : null}
                {openReview ? (
                    <FacultyFypDetailedReview
                        entry={openReview}
                        onClose={() => setOpenReviewId(null)}
                        onUpdate={updateEntry}
                        onSupervisorReview={
                            isPathEntryWaiting(openReview) && openReview.id
                                ? (action, note) => void reviewEntry(openReview.id!, action, note)
                                : undefined
                        }
                        reviewing={reviewingId === openReview.id}
                        onOpenFlashcard={() => {
                            setOpenReviewId(null);
                            setOpenFlashcardId(openReview.id || null);
                        }}
                    />
                ) : null}
        </div>
    );
}

function SkeletonList() {
    return (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
            ))}
        </div>
    );
}

function EmptyFyp({ message }: { message: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
            <p className="text-base font-bold text-slate-800">No FYP / thesis records yet</p>
            <p className="mt-1.5 text-sm text-slate-500">{message}</p>
        </div>
    );
}
