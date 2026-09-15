"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ThesisCard from "@/components/ciel/ThesisCard";
import FypAiAnalysisPanel from "@/components/ciel/FypAiAnalysisPanel";
import FypMeritPanel, { type FypMeritEntry } from "@/components/ciel/FypMeritPanel";
import { CourseworkCrumb, HubBackButton, useFacultyHubView } from "@/components/ciel/coursework/CourseworkHubChrome";
import { MOCKUP_GRADIENTS, MockupActionCard, MockupHero } from "@/components/ciel/dashboard/MockupChrome";
import { namedTimeGreeting } from "@/utils/timeGreeting";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { isPathEntryApproved, isPathEntryWaiting } from "@/utils/reviewQueue";

const FYP_VIEWS = ["home", "progress", "pending", "approved", "rank"] as const;
type FacView = (typeof FYP_VIEWS)[number];
const FYP_BASE = "/dashboard/faculty/fyp-thesis";
const VIEW_CRUMB: Record<Exclude<FacView, "home">, string> = {
    progress: "FYP in Progress",
    pending: "FYP Under Review",
    approved: "Approved FYP Impact",
    rank: "FYP AI Rankings",
};

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
                        ? "Approved — now live in Merit Model rankings"
                        : action === "revision"
                          ? "Revision requested — student can fix and resubmit."
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

    /** Bubbles an aiAnalysis/aiAnalysisLock (or any other) patch from FypAiAnalysisPanel back into
     * the list state — same merge shape reviewEntry already uses for supervisor-review responses. */
    const updateEntry = (id: string, patch: Partial<FypMeritEntry>) => {
        setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    };

    const waiting = useMemo(() => entries.filter(isPathEntryWaiting), [entries]);
    const approved = useMemo(() => entries.filter(isPathEntryApproved), [entries]);

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
    const filteredWaiting = waiting.filter(matchesSearch);
    const filteredApproved = approved.filter(matchesSearch);
    const filteredInProgress = inProgress.filter(matchesSearch);

    return (
        <div className="mx-auto max-w-[1500px] space-y-4 pb-16">
                <CourseworkCrumb role="Faculty" view={view === "home" ? undefined : VIEW_CRUMB[view]} pathLabel="Final Year Project (FYP)" />
                {view === "home" ? (
                    <MockupHero
                        kicker="FACULTY · FYP / FINAL YEAR PROJECT"
                        title={namedTimeGreeting(firstName, "🎓")}
                        subtitle="Supervise Final Year Project records from first draft to faculty / supervisor verification."
                        stats={[
                            { value: String(approved.length), label: "APPROVED" },
                            { value: String(waiting.length), label: "UNDER REVIEW" },
                            { value: String(inProgress.length), label: "IN PROGRESS" },
                        ]}
                    />
                ) : (
                    <HubBackButton href={homeHref} label="← Back to FYP / Thesis" />
                )}

                {view === "home" && (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <MockupActionCard
                            href={`${FYP_BASE}?view=progress`}
                            emoji="🔬"
                            ghost="🔬"
                            title="FYP in Progress"
                            subtitle="Students who named you as supervisor and are still writing — completion bar, last activity, Email + WhatsApp reminders."
                            badge={`${inProgress.length} IN PROGRESS`}
                            background={MOCKUP_GRADIENTS.teal}
                        />
                        <MockupActionCard
                            href={`${FYP_BASE}?view=pending`}
                            emoji="📤"
                            ghost="📤"
                            title="FYP Under Review"
                            subtitle="Submitted flashcards waiting for your supervisor sign-off — with Email / WhatsApp buttons to remind the student."
                            badge={`${waiting.length} UNDER REVIEW`}
                            background={MOCKUP_GRADIENTS.blue}
                        />
                        <MockupActionCard
                            href={`${FYP_BASE}?view=approved`}
                            emoji="🏅"
                            ghost="🏅"
                            title="Approved FYP Impact"
                            subtitle="Records you already approved — the same flashcard the student, university and CIEL PK see."
                            badge={`${approved.length} APPROVED`}
                            background={MOCKUP_GRADIENTS.green}
                        />
                        <MockupActionCard
                            href={`${FYP_BASE}?view=rank`}
                            emoji="🧮"
                            ghost="🧮"
                            title="FYP AI Rankings"
                            subtitle="Rank approved supervisees. Waiting submissions stay out of the live picks."
                            badge="RANKINGS"
                            background={MOCKUP_GRADIENTS.purple}
                        />
                    </div>
                )}

                {(view === "progress" || view === "pending" || view === "approved") && (
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

                {view === "progress" &&
                    (loading && inProgress.length === 0 ? (
                        <SkeletonList />
                    ) : filteredInProgress.length === 0 ? (
                        <EmptyFyp
                            message={
                                inProgress.length === 0
                                    ? "Students still filling out the FYP form will appear here — nudge anyone who's stalled."
                                    : "No records match your search."
                            }
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {filteredInProgress.map((entry) => (
                                <div key={entry.id}>
                                    <ThesisCard
                                        entry={entry}
                                        studentName={entry.student?.name}
                                        remindDraftOwner
                                        studentEmail={entry.student?.email || entry.projectInfo?.studentEmail}
                                    />
                                    {entry.updatedAt ? (
                                        <p className="mt-1.5 px-1 text-[10px] text-slate-400">
                                            Last activity {formatDistanceToNow(new Date(entry.updatedAt), { addSuffix: true })}
                                        </p>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    ))}

                {view === "pending" &&
                    (loading ? (
                        <SkeletonList />
                    ) : filteredWaiting.length === 0 ? (
                        <EmptyFyp
                            message={
                                waiting.length === 0
                                    ? "Nothing waiting. Submitted records appear here until you approve them."
                                    : "No records match your search."
                            }
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {filteredWaiting.map((entry) => (
                                <div key={entry.id} className="space-y-2">
                                    {entry.id ? <FypAiAnalysisPanel entry={entry} onUpdate={updateEntry} /> : null}
                                    <ThesisCard
                                        entry={entry}
                                        studentName={entry.student?.name}
                                        onSupervisorReview={entry.id ? (action, note) => reviewEntry(entry.id!, action, note) : undefined}
                                        reviewing={reviewingId === entry.id}
                                    />
                                </div>
                            ))}
                        </div>
                    ))}

                {view === "approved" &&
                    (loading ? (
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
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {filteredApproved.map((entry) => (
                                <ThesisCard key={entry.id} entry={entry} studentName={entry.student?.name} />
                            ))}
                        </div>
                    ))}

                {view === "rank" &&
                    (loading ? (
                        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
                    ) : approved.length === 0 ? (
                        <EmptyFyp message="Approve at least one submitted record to run the merit model." />
                    ) : (
                        <FypMeritPanel entries={approved} meritEndpoint="/api/v1/paths/fyp-thesis/merit-model" />
                    ))}
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
