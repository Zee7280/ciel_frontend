"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import CourseworkCard from "@/components/ciel/CourseworkCard";
import MeritModelPanel, { type MeritEntry } from "@/components/ciel/MeritModelPanel";
import { CourseworkCrumb, HubBackButton, PathSectionHead, useFacultyHubView } from "@/components/ciel/coursework/CourseworkHubChrome";
import { MOCKUP_GRADIENTS, MockupActionCard, MockupHero } from "@/components/ciel/dashboard/MockupChrome";
import CourseworkFacultyReviewInbox from "@/components/ciel/coursework/CourseworkFacultyReviewInbox";
import { isFacultyApproved, pendingFacultyReview } from "@/utils/courseworkSectionReview";
import { mergeCourseProjectEntry } from "@/utils/courseProjectTypes";
import { namedTimeGreeting } from "@/utils/timeGreeting";
import { readStoredCurrentUser } from "@/utils/currentUser";

const BASE = "/dashboard/faculty/coursework-projects";
const VIEWS = ["home", "progress", "review", "approved", "rank"] as const;
type FacView = (typeof VIEWS)[number];

const VIEW_CRUMB: Record<Exclude<FacView, "home">, string> = {
    progress: "Coursework in Progress",
    review: "Coursework Under Review",
    approved: "Approved Coursework Impact",
    rank: "Coursework AI Rankings",
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
    const [firstName, setFirstName] = useState("");

    useEffect(() => {
        const name = readStoredCurrentUser()?.name;
        setFirstName(typeof name === "string" ? name.trim().split(/\s+/)[0] : "");
    }, []);

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

    return (
        <div className={view === "home" ? "mx-auto max-w-[1500px] space-y-4 pb-16" : view === "review" ? "mx-auto max-w-[1380px]" : "mx-auto max-w-[1240px]"}>
            <CourseworkCrumb role="Faculty" view={view === "home" ? undefined : VIEW_CRUMB[view]} pathLabel="Coursework Project" />
            {view === "home" ? (
                <MockupHero
                    kicker="FACULTY · COURSEWORK"
                    title={namedTimeGreeting(firstName, "📘")}
                    subtitle="Review course-linked impact projects from first draft to faculty verification."
                    stats={[
                        { value: String(approved.length), label: "APPROVED" },
                        { value: String(pending.length), label: "UNDER REVIEW" },
                        { value: String(inProgress.length), label: "IN PROGRESS" },
                    ]}
                />
            ) : (
                <div className="mt-4">
                    <HubBackButton href={homeHref} label="← Back to Coursework Project" />
                </div>
            )}

            {view === "home" && (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <MockupActionCard
                        href={`${BASE}?view=progress`}
                        emoji="🧩"
                        ghost="🧩"
                        title="Coursework in Progress"
                        subtitle="Students still filling the form — completion bar, last activity, Email + WhatsApp reminders."
                        badge={`${inProgress.length} IN PROGRESS`}
                        background={MOCKUP_GRADIENTS.teal}
                    />
                    <MockupActionCard
                        href={`${BASE}?view=review`}
                        emoji="📤"
                        ghost="📤"
                        title="Coursework Under Review"
                        subtitle="Submitted flashcards with AI score, evidence map and faculty moderation. Approve, request revision or reject."
                        badge={`${pending.length} UNDER REVIEW`}
                        background={MOCKUP_GRADIENTS.blue}
                    />
                    <MockupActionCard
                        href={`${BASE}?view=approved`}
                        emoji="🏅"
                        ghost="🏅"
                        title="Approved Coursework Impact"
                        subtitle="Approved flashcards published everywhere — the same record the student, university and CIEL PK see."
                        badge={`${approved.length} APPROVED`}
                        background={MOCKUP_GRADIENTS.green}
                    />
                    <MockupActionCard
                        href={`${BASE}?view=rank`}
                        emoji="🧮"
                        ghost="🧮"
                        title="Coursework AI Rankings"
                        subtitle="Rank approved coursework. Waiting submissions stay out of the live picks."
                        badge="RANKINGS"
                        background={MOCKUP_GRADIENTS.purple}
                    />
                </div>
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
                <div className="mt-2">
                    <PathSectionHead
                        title="Coursework submissions"
                        subtitle="Open the AI Coursework Score + Global Benchmark workspace: flashcard, primary file, evidence, 7-criterion rubric, then approve, request revision or reject."
                    />
                    <div className="mb-4 rounded-[15px] border border-[#d5eee8] bg-[#eef8f6] px-4 py-3 text-[11px] leading-relaxed text-[#4b6f68]">
                        🔒 <b>AI score = faculty assistance only.</b> It helps you mark a grade; it is never shown to the student, the university or CIEL PK at review stage. Approving publishes the flashcard (not the score) to the student&apos;s My Coursework Impact, your Approved Coursework, the University Coursework Impact Wall and CIEL PK.
                    </div>
                    {loading ? <DeckSkeleton /> : <CourseworkFacultyReviewInbox entries={entries} reviewingId={reviewingId} onReview={reviewEntry} />}
                </div>
            )}

            {view === "approved" && (
                <div className="mt-2">
                    <PathSectionHead
                        title="Approved coursework flashcards"
                        subtitle="Live on your Faculty Impact Wall, the student's My Coursework Impact, the University Coursework Impact Wall and CIEL PK."
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
                        <MeritModelPanel entries={approved} meritEndpoint="/api/v1/paths/course-projects/merit-model" scopeName="Your cohort" />
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
