"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Trash2 } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { WorkspaceSkeleton } from "@/components/ciel/Skeleton";
import EmptyState from "@/components/ciel/EmptyState";
import CourseworkCard from "@/components/ciel/CourseworkCard";
import { type CourseProjectEntry } from "@/utils/courseProjectTypes";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { namedTimeGreeting } from "@/utils/timeGreeting";
import { isFacultyApproved } from "@/utils/courseworkSectionReview";
import { isPathEntryWaiting } from "@/utils/reviewQueue";
import { CourseworkCrumb, CourseworkHero, HubBackButton, HubTile } from "@/components/ciel/coursework/CourseworkHubChrome";
import CourseworkSectionGuide from "@/components/ciel/coursework/CourseworkSectionGuide";

function firstName() {
    const user = readStoredCurrentUser();
    const name = typeof user?.name === "string" ? user.name.split(" ")[0] : "";
    return name || "there";
}

function CourseProjectHub() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const rawView = searchParams.get("view");
    const view =
        rawView === "guide" || rawView === "wall" || rawView === "in-progress" || rawView === "under-review"
            ? rawView
            : "home";
    const [loading, setLoading] = useState(true);
    const [entries, setEntries] = useState<CourseProjectEntry[]>([]);
    const [creating, setCreating] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [name, setName] = useState("there");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await authenticatedFetch("/api/v1/paths/course-projects", {}, { redirectToLogin: false });
            const result = res?.ok ? await res.json() : null;
            setEntries(Array.isArray(result?.data) ? result.data : []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        setName(firstName());
    }, [load]);

    const createNew = async () => {
        setCreating(true);
        try {
            const res = await authenticatedFetch("/api/v1/paths/course-projects", { method: "POST" }, { redirectToLogin: false });
            const result = res?.ok ? await res.json() : null;
            if (result?.data?.id) {
                router.push(`/dashboard/student/paths/course-project/${result.data.id}`);
                return;
            }
        } finally {
            setCreating(false);
        }
    };

    const deleteDraft = async (id: string) => {
        setDeletingId(id);
        try {
            const res = await authenticatedFetch(`/api/v1/paths/course-projects/${id}`, { method: "DELETE" }, { redirectToLogin: false });
            if (res?.ok) setEntries((prev) => prev.filter((e) => e.id !== id));
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) return <WorkspaceSkeleton />;

    const drafts = entries.filter((e) => e.status !== "submitted");
    const approved = entries.filter(isFacultyApproved);
    const inProgress = drafts.filter((e) => e.isOwner !== false).length;
    const underReview = entries.filter((e) => e.isOwner !== false && isPathEntryWaiting(e));

    return (
        <div className="mx-auto max-w-[1040px] pb-16">
            <CourseworkCrumb role="Student" view={view === "home" ? undefined : view} />
            <CourseworkHero
                kicker="MY PATHS · COURSEWORK"
                title={namedTimeGreeting(name, "📘")}
                subtitle="Fill the coursework form section by section, submit your flashcard to faculty, and collect your approved coursework here."
                gradient="linear-gradient(115deg,#04252b,#0e5f63 55%,#12a5a0 110%)"
                stats={[
                    { value: String(approved.filter((e) => e.isOwner !== false).length), label: "APPROVED" },
                    { value: String(underReview.length), label: "UNDER REVIEW" },
                    { value: String(inProgress), label: "IN PROGRESS" },
                ]}
            />

            {view === "guide" && (
                <div className="mt-4">
                    <HubBackButton href="/dashboard/student/paths/course-project" />
                    <CourseworkSectionGuide />
                </div>
            )}

            {view === "wall" && (
                <div className="mt-4">
                    <HubBackButton href="/dashboard/student/paths/course-project" />
                    {approved.length === 0 ? (
                        <EmptyState
                            emoji="🏅"
                            heading="Your impact wall is waiting"
                            line="Submit coursework and it hangs here on faculty approval — rank, score and story."
                            actionLabel={creating ? "Creating…" : "+ New coursework report"}
                            onAction={creating ? undefined : createNew}
                        />
                    ) : (
                        <div className="mx-auto max-w-[400px] space-y-3">
                            {approved.map((entry) => (
                                <div key={entry.id} className="space-y-1.5">
                                    {entry.isOwner === false && (
                                        <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-ciel-indigo">
                                            👥 Team project — led by {entry.studentInfo?.studentName || "a teammate"}
                                        </p>
                                    )}
                                    <CardOpenTarget entryId={entry.id!} router={router}>
                                        <CourseworkCard entry={entry} />
                                    </CardOpenTarget>
                                </div>
                            ))}
                            <p className="text-center text-[10.5px] text-[#7a919a]">
                                🖼️ Your next frame is waiting — submit new coursework and it hangs here on approval.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {view === "in-progress" && (
                <div className="mt-4">
                    <HubBackButton href="/dashboard/student/paths/course-project" />
                    {drafts.length === 0 ? (
                        <EmptyState
                            emoji="🧩"
                            heading="Nothing in progress"
                            line="Create a coursework record to start — your draft saves automatically as you go."
                            actionLabel={creating ? "Creating…" : "+ New coursework report"}
                            onAction={creating ? undefined : createNew}
                        />
                    ) : (
                        <div className="space-y-3">
                            {drafts.map((entry) => (
                                <div key={entry.id} className="relative">
                                    <CardOpenTarget entryId={entry.id!} router={router}>
                                        <CourseworkCard entry={entry} studentReminder="team" />
                                    </CardOpenTarget>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteDraft(entry.id!);
                                        }}
                                        disabled={deletingId === entry.id}
                                        aria-label="Delete draft"
                                        className="ciel-transition absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full border border-ciel-border bg-white text-ciel-text-soft shadow-md hover:border-red-200 hover:text-red-600 disabled:opacity-50"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {view === "under-review" && (
                <div className="mt-4">
                    <HubBackButton href="/dashboard/student/paths/course-project" />
                    {underReview.length === 0 ? (
                        <EmptyState
                            emoji="📤"
                            heading="Nothing under review"
                            line="Submit a completed coursework record and it lands here while faculty reviews it."
                            actionLabel={creating ? "Creating…" : "+ New coursework report"}
                            onAction={creating ? undefined : createNew}
                        />
                    ) : (
                        <div className="space-y-3">
                            {underReview.map((entry) => (
                                <div key={entry.id} className="space-y-1.5">
                                    {entry.isOwner === false && (
                                        <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-ciel-indigo">
                                            👥 Team project — led by {entry.studentInfo?.studentName || "a teammate"}
                                        </p>
                                    )}
                                    <CardOpenTarget entryId={entry.id!} router={router}>
                                        <CourseworkCard entry={entry} studentReminder="faculty" />
                                    </CardOpenTarget>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {view === "home" && (
                <>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <HubTile
                            onClick={creating ? undefined : createNew}
                            disabled={creating}
                            badge="START"
                            badgeClass="text-[#15988b]"
                            emoji="📚"
                            title={creating ? "Creating…" : "Create Coursework Record"}
                            subtitle="Open the Coursework Sustainability & SDG form. Seven short sections — each writes its own AI summary; no pre-approval needed."
                            background="linear-gradient(135deg,#15988b,#2ec8bd)"
                        />
                        <HubTile
                            href="/dashboard/student/paths/course-project?view=in-progress"
                            badge={`${inProgress} IN PROGRESS`}
                            badgeClass="text-[#c76000]"
                            emoji="🧩"
                            title="Coursework in Progress"
                            subtitle="Records you're still filling in — completion bar, and Email / WhatsApp reminders for your team or your faculty."
                            background="linear-gradient(135deg,#c76000,#f59a00)"
                        />
                        <HubTile
                            href="/dashboard/student/paths/course-project?view=under-review"
                            badge={`${underReview.length} UNDER REVIEW`}
                            badgeClass="text-[#16798c]"
                            emoji="📤"
                            title="Coursework Under Review"
                            subtitle="Submitted flashcards waiting for faculty approval — with Email / WhatsApp buttons to remind your faculty."
                            background="linear-gradient(135deg,#16798c,#38b8e6)"
                        />
                        <HubTile
                            href="/dashboard/student/paths/course-project?view=wall"
                            badge={`${approved.length} APPROVED`}
                            badgeClass="text-[#0e4d4e]"
                            emoji="🏅"
                            title="My Coursework Impact"
                            subtitle="Your approved coursework files. Approved flashcards also appear on your University's Impact Wall and CIEL PK."
                            background="linear-gradient(135deg,#0e4d4e,#117669)"
                        />
                        <HubTile
                            href="/dashboard/student/paths/course-project?view=guide"
                            badge="GUIDE INSIDE"
                            badgeClass="text-[#6b2bd9]"
                            emoji="📘"
                            title="Coursework Guidance"
                            subtitle="What to fill in, what evidence helps, and what happens after you submit."
                            background="linear-gradient(135deg,#6b2bd9,#9f78ef)"
                            className="sm:col-span-2"
                        />
                    </div>

                    {entries.length === 0 && (
                        <div className="mt-4">
                            <EmptyState
                                emoji="📚"
                                heading="No coursework reports yet"
                                line="Turn any assignment — essay, project, lab report, presentation — into a verified impact record."
                                actionLabel={creating ? "Creating…" : "+ New coursework report"}
                                onAction={creating ? undefined : createNew}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

/**
 * Makes a card open the wizard on click without wrapping it in a real <button> —
 * CourseworkCard already renders its own "View all" button internally, and a
 * <button> can't legally contain another <button> (breaks click handling in the browser).
 */
function CardOpenTarget({
    entryId,
    router,
    children,
}: {
    entryId: string;
    router: ReturnType<typeof useRouter>;
    children: React.ReactNode;
}) {
    const open = () => router.push(`/dashboard/student/paths/course-project/${entryId}`);
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={open}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    open();
                }
            }}
            className="cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-gold"
        >
            {children}
        </div>
    );
}

export default function CourseProjectDeckPage() {
    return (
        <Suspense fallback={<WorkspaceSkeleton />}>
            <CourseProjectHub />
        </Suspense>
    );
}
