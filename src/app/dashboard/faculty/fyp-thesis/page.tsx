"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ThesisCard from "@/components/ciel/ThesisCard";
import FypMeritPanel, { type FypMeritEntry } from "@/components/ciel/FypMeritPanel";
import { ActionKpiGrid, CourseworkCrumb, CourseworkHero, HubBackButton, HubTile, PathSectionHead, WorkflowSteps, useFacultyHubView } from "@/components/ciel/coursework/CourseworkHubChrome";
import { isPathEntryApproved, isPathEntryWaiting } from "@/utils/reviewQueue";

const FYP_VIEWS = ["home", "progress", "pending", "approved", "rank"] as const;
type FacView = (typeof FYP_VIEWS)[number];
const FYP_BASE = "/dashboard/faculty/fyp-thesis";
const VIEW_CRUMB: Record<Exclude<FacView, "home">, string> = {
    progress: "FYP in Progress",
    pending: "Waiting for Approval",
    approved: "Approved FYP / Thesis",
    rank: "Merit model",
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

    const waiting = useMemo(() => entries.filter(isPathEntryWaiting), [entries]);
    const approved = useMemo(() => entries.filter(isPathEntryApproved), [entries]);
    const revision = useMemo(
        () => entries.filter((e) => e.supervisorApprovalStatus === "revision_requested"),
        [entries],
    );

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

    const hero =
        view === "progress"
            ? {
                  title: "FYP in Progress",
                  subtitle: "Students who named you as supervisor and have started but not yet submitted. Nudge anyone who has stalled.",
                  stats: [
                      { value: String(inProgress.length), label: "In Progress" },
                      { value: String(revision.length), label: "Revision with student" },
                      { value: String(waiting.length), label: "Awaiting Review" },
                  ],
              }
            : view === "pending"
              ? {
                    title: "Waiting for Approval",
                    subtitle: "Submitted FYP / thesis records that still need your supervisor sign-off.",
                    stats: [
                        { value: String(waiting.length), label: "Awaiting Review" },
                        { value: String(revision.length), label: "Revision requested" },
                        { value: String(approved.length), label: "Approved" },
                    ],
                }
              : view === "approved"
                ? {
                      title: "Approved FYP / Thesis",
                      subtitle: "Records you already approved — live on student, university and CIEL decks.",
                      stats: [
                          { value: String(approved.length), label: "Approved FYPs" },
                          { value: String(approved.length), label: "On Impact Wall" },
                          { value: String(entries.length), label: "All submitted" },
                      ],
                  }
                : view === "rank"
                  ? {
                        title: "Merit model — my supervisees",
                        subtitle: "Rank approved records. Waiting submissions stay out of the live picks.",
                        stats: [
                            { value: String(approved.length), label: "Approved Records" },
                            { value: String(waiting.length), label: "Still waiting" },
                            { value: String(inProgress.length), label: "In Progress" },
                        ],
                    }
                  : {
                        title: "FYP / Thesis",
                        subtitle: "Monitor final-year projects, research evidence, supervisor review and verified impact outcomes.",
                        stats: [
                            { value: String(waiting.length), label: "Awaiting Review" },
                            { value: String(approved.length), label: "Approved FYPs" },
                            { value: String(inProgress.length), label: "In Progress" },
                        ],
                    };

    return (
        <div>
            <div className="mx-auto max-w-[1240px] space-y-4">
                <CourseworkCrumb role="Faculty" view={view === "home" ? undefined : VIEW_CRUMB[view]} pathLabel="FYP / Thesis" />
                <CourseworkHero
                    kicker="FACULTY IMPACT DASHBOARD"
                    title={hero.title}
                    subtitle={hero.subtitle}
                    stats={hero.stats}
                />

                {view !== "home" && <HubBackButton href={homeHref} label="← Back to FYP / Thesis" />}

                {view === "home" && (
                    <>
                    <PathSectionHead
                        title="FYP / Thesis Management"
                        subtitle="Review final-year research impact records, evidence, SDG linkage and supervisor/faculty verification."
                        pill="FACULTY VIEW"
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <HubTile
                            href={`${FYP_BASE}?view=progress`}
                            badge={`${inProgress.length} IN PROGRESS`}
                            emoji="🔬"
                            title="FYP in Progress"
                            subtitle="Students still filling the form — completion bar, last activity, Email + WhatsApp reminders."
                            background="linear-gradient(135deg,#16798c,#38b8e6)"
                        />
                        <HubTile
                            href={`${FYP_BASE}?view=pending`}
                            badge={waiting.length ? `${waiting.length} IN QUEUE` : "INBOX"}
                            emoji="⏳"
                            title="Waiting for Approval"
                            subtitle="Submitted FYP / thesis records that still need your supervisor sign-off."
                            background="linear-gradient(135deg,#b45309,#fbbf24)"
                        />
                        <HubTile
                            href={`${FYP_BASE}?view=approved`}
                            badge={`${approved.length} LIVE`}
                            emoji="✅"
                            title="Approved FYP / Thesis"
                            subtitle="Records you already approved — live on student, university and CIEL decks."
                            background="linear-gradient(135deg,#04252b,#0e7d74)"
                        />
                        <HubTile
                            href={`${FYP_BASE}?view=rank`}
                            badge="STANDARD RUBRIC"
                            emoji="🧮"
                            title="Merit model — my supervisees"
                            subtitle="Rank approved records. Waiting submissions stay out of the live picks."
                            background="linear-gradient(135deg,#6d28d9,#a78bfa)"
                        />
                    </div>
                    <ActionKpiGrid
                        items={[
                            { value: String(waiting.length), label: "Awaiting Review" },
                            { value: String(revision.length), label: "Revision Requested" },
                            { value: String(inProgress.length), label: "In Progress (students)" },
                            { value: String(approved.length), label: "Approved This Year" },
                        ]}
                    />
                    <WorkflowSteps
                        title="FYP / Thesis Workflow"
                        subtitle="Approved work flows into the same unified Faculty Impact Wall."
                        steps={["Student fills form", "FYP Record Submitted", "Faculty / Supervisor Review", "Verified Approval", "Impact Wall + Badge"]}
                    />
                    </>
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
                                <ThesisCard
                                    key={entry.id}
                                    entry={entry}
                                    studentName={entry.student?.name}
                                    onSupervisorReview={entry.id ? (action, note) => reviewEntry(entry.id!, action, note) : undefined}
                                    reviewing={reviewingId === entry.id}
                                />
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
