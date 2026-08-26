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
import { isFacultyApproved } from "@/utils/courseworkSectionReview";
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
    const view = searchParams.get("view") === "guide" || searchParams.get("view") === "wall" ? searchParams.get("view")! : "home";
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

    const submitted = entries.filter((e) => e.status === "submitted");
    const drafts = entries.filter((e) => e.status !== "submitted");
    const ownedCount = entries.filter((e) => e.isOwner !== false).length;
    const ownedSubmittedCount = submitted.filter((e) => e.isOwner !== false).length;
    const approved = entries.filter(isFacultyApproved);
    const inProgress = drafts.filter((e) => e.isOwner !== false).length;

    return (
        <div className="mx-auto max-w-[1040px] pb-16">
            <CourseworkCrumb role="Student" view={view === "home" ? undefined : view} />
            <CourseworkHero
                kicker="MY PATHS · COURSEWORK"
                title={`Salaam, ${name} 📘`}
                subtitle="Three doors: start new coursework, learn every section, and visit the wall where approved work hangs."
                gradient="linear-gradient(115deg,#04252b,#0e5f63 55%,#12a5a0 110%)"
                stats={[
                    { value: String(approved.filter((e) => e.isOwner !== false).length), label: "APPROVED" },
                    { value: String(ownedSubmittedCount), label: "SUBMITTED" },
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

            {view === "home" && (
                <>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <HubTile
                            onClick={creating ? undefined : createNew}
                            disabled={creating}
                            badge="THE FORM"
                            emoji="📝"
                            title={creating ? "Creating…" : "Create new coursework"}
                            subtitle="8 friendly steps — your flash card builds itself at the end."
                            background="linear-gradient(135deg,#0e7d74,#2dd4bf)"
                        />
                        <HubTile
                            href="/dashboard/student/paths/course-project?view=guide"
                            badge="GUIDE INSIDE"
                            emoji="📖"
                            title="Section guidelines"
                            subtitle="How to fill all 8 sections — steps, examples, one don’t and a tip each."
                            background="linear-gradient(135deg,#6d28d9,#a78bfa)"
                        />
                        <HubTile
                            href="/dashboard/student/paths/course-project?view=wall"
                            badge={approved.length ? `${approved.length} HANGING` : "THE WALL"}
                            emoji="🏅"
                            title="My Impact Wall"
                            subtitle="Approved coursework hangs here forever — rank, score and story."
                            background="linear-gradient(135deg,#04252b,#0e7d74)"
                        />
                    </div>

                    {entries.length === 0 ? (
                        <div className="mt-4">
                            <EmptyState
                                emoji="📚"
                                heading="No coursework reports yet"
                                line="Turn any assignment — essay, project, lab report, presentation — into a verified impact record."
                                actionLabel={creating ? "Creating…" : "+ New coursework report"}
                                onAction={creating ? undefined : createNew}
                            />
                        </div>
                    ) : (
                        <div className="mt-5 space-y-4">
                            <p className="text-[8.5px] font-extrabold tracking-[0.14em] text-[#7a919a]">
                                MY REPORTS · {ownedCount} TOTAL
                            </p>
                            {drafts.length > 0 && (
                                <div className="space-y-3">
                                    {drafts.map((entry) => (
                                        <div key={entry.id} className="relative">
                                            <CardOpenTarget entryId={entry.id!} router={router}>
                                                <CourseworkCard entry={entry} />
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
                            {submitted.length > 0 && (
                                <div className="space-y-3">
                                    {submitted.map((entry) => (
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
                                </div>
                            )}
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
