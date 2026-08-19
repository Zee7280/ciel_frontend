"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import PathWorkspaceShell from "@/components/ciel/PathWorkspaceShell";
import { WorkspaceSkeleton } from "@/components/ciel/Skeleton";
import EmptyState from "@/components/ciel/EmptyState";
import CourseworkCard from "@/components/ciel/CourseworkCard";
import { type CourseProjectEntry } from "@/utils/courseProjectTypes";

export default function CourseProjectDeckPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [entries, setEntries] = useState<CourseProjectEntry[]>([]);
    const [creating, setCreating] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

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
    // Team-shared entries (isOwner === false) don't count toward this student's own report/impact
    // tally — that credit belongs to whoever owns and submitted the report.
    const ownedCount = entries.filter((e) => e.isOwner !== false).length;
    const ownedSubmittedCount = submitted.filter((e) => e.isOwner !== false).length;

    return (
        <PathWorkspaceShell
            title="Course Project"
            primaryActionLabel={creating ? "Creating…" : "+ New coursework report"}
            onPrimaryAction={creating ? undefined : createNew}
            stats={[
                { label: "Reports", value: String(ownedCount) },
                { label: "Verified", value: String(ownedSubmittedCount), hint: "Contributes to sections 2, 3 of your impact score" },
            ]}
            tabs={[{ key: "deck", label: "My coursework" }]}
            activeTab="deck"
            onTabChange={() => {}}
        >
            {entries.length === 0 ? (
                <EmptyState
                    emoji="📚"
                    heading="No coursework reports yet"
                    line="Turn any assignment — essay, project, lab report, presentation — into a verified impact record."
                    actionLabel={creating ? "Creating…" : "+ New coursework report"}
                    onAction={creating ? undefined : createNew}
                />
            ) : (
                <div className="space-y-4">
                    {drafts.length > 0 && (
                        <div className="space-y-3">
                            {drafts.map((entry) => (
                                <div key={entry.id} className="relative">
                                    <CardOpenTarget entryId={entry.id!} router={router}>
                                        <CourseworkCard entry={entry} />
                                    </CardOpenTarget>
                                    {/* Floats on the card's outer corner (not inside the header) so it never
                                        overlaps the Draft/Verified status pill CourseworkCard renders there. */}
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
        </PathWorkspaceShell>
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
