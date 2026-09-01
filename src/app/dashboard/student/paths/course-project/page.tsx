"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Trash2 } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { WorkspaceSkeleton } from "@/components/ciel/Skeleton";
import EmptyState from "@/components/ciel/EmptyState";
import CourseworkCard from "@/components/ciel/CourseworkCard";
import Tabs from "@/components/ciel/Tabs";
import { type CourseProjectEntry } from "@/utils/courseProjectTypes";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { namedTimeGreeting } from "@/utils/timeGreeting";
import { isFacultyApproved } from "@/utils/courseworkSectionReview";
import { isPathEntryWaiting } from "@/utils/reviewQueue";
import { CourseworkCrumb, CourseworkHero, HubBackButton, HubTile } from "@/components/ciel/coursework/CourseworkHubChrome";
import CourseworkSectionGuide from "@/components/ciel/coursework/CourseworkSectionGuide";
import CourseworkFlashCardModal from "@/components/ciel/coursework/CourseworkFlashCardModal";
import CourseworkImpactListCard from "@/components/ciel/coursework/CourseworkImpactListCard";

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
        rawView === "guide" ||
        rawView === "wall" ||
        rawView === "in-progress" ||
        rawView === "under-review" ||
        rawView === "create"
            ? rawView
            : "home";
    const hubHref = "/dashboard/student/paths/course-project";
    const createHref = `${hubHref}?view=create`;
    const goCreate = () => router.push(createHref);
    const openParam = searchParams.get("open");
    const [loading, setLoading] = useState(true);
    const [entries, setEntries] = useState<CourseProjectEntry[]>([]);
    const [creating, setCreating] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [name, setName] = useState("there");
    const [reviewTab, setReviewTab] = useState<"all" | "pending" | "revision" | "rejected">("all");
    const [flashId, setFlashId] = useState<string | null>(null);

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

    useEffect(() => {
        if (view === "wall" && openParam) setFlashId(openParam);
    }, [view, openParam]);

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
    const flashEntry = flashId ? approved.find((e) => e.id === flashId) ?? null : null;

    return (
        <div className="mx-auto max-w-[1040px] pb-16">
            <CourseworkCrumb
                role="Student"
                view={view === "home" ? undefined : view === "create" ? "Create" : view === "wall" ? "Impact" : view}
            />
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

            {view === "create" && (
                <div className="mt-[23px]">
                    <div className="mb-3.5 flex flex-wrap items-end justify-between gap-5">
                        <div>
                            <h2 className="m-0 text-[21px] font-semibold text-[#16313d]">Create Coursework Record</h2>
                            <p className="mt-1 text-[12.5px] text-[#70808a]">
                                Your draft saves automatically; faculty only sees it after you submit.
                            </p>
                        </div>
                        <Link
                            href={hubHref}
                            className="border-0 bg-transparent text-xs font-black text-[#087c75] hover:underline"
                        >
                            ← Back to module buttons
                        </Link>
                    </div>
                    <section className="overflow-hidden rounded-[22px] border border-[#dde5ea] bg-white shadow-[0_8px_22px_rgba(24,52,64,.05)]">
                        <div className="p-5">
                            <div className="mb-3.5 rounded-xl border border-[#ead8b8] bg-[#fff8ec] p-3 text-[11.5px] leading-[1.5] text-[#715a2d]">
                                No pre-approval is required. The form has <b>seven short sections</b> (Course → Format → Aims → Process → Results → SDG map → Reflection) and an <b>AI summary writes itself under each one</b>, in your voice. When you submit, the summaries become your faculty flashcard. Your instructor decides; you receive the approved file.
                            </div>
                            <div className="flex flex-wrap items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={creating ? undefined : createNew}
                                    disabled={creating}
                                    className="inline-flex items-center gap-1.5 rounded-[9px] bg-[#174b43] px-4 py-3 text-xs font-black text-white disabled:cursor-wait disabled:opacity-70"
                                >
                                    📚 {creating ? "Opening…" : "OPEN THE COURSEWORK FORM"}
                                </button>
                                <Link
                                    href={`${hubHref}?view=in-progress`}
                                    className="inline-flex items-center gap-1.5 rounded-[9px] bg-[#eef2f3] px-4 py-3 text-xs font-black text-[#29454f]"
                                >
                                    🧩 Continue an existing record
                                </Link>
                            </div>
                            <div className="mt-4 rounded-xl border border-[#d5eee8] bg-[#eef8f6] px-3.5 py-2.5 text-[11px] leading-[1.5] text-[#4b6f68]">
                                Once you start, the record appears under <b>Coursework → Coursework in Progress</b> with a completion bar. Your faculty, university and CIEL PK can see progress and send reminders — never your unfinished text.
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {view === "guide" && (
                <div className="mt-4">
                    <HubBackButton href={hubHref} />
                    <CourseworkSectionGuide />
                </div>
            )}

            {view === "wall" && (
                <div className="mt-[23px]">
                    <div className="mb-3.5 flex flex-wrap items-end justify-between gap-5">
                        <div>
                            <h2 className="m-0 text-[21px] font-semibold text-[#16313d]">My Coursework Impact</h2>
                            <p className="mt-1 text-[12.5px] text-[#70808a]">
                                Approved coursework only. These flashcards are also on your Impact Portfolio, your University&apos;s Coursework Impact Wall and CIEL PK.
                            </p>
                        </div>
                        <Link
                            href={hubHref}
                            className="border-0 bg-transparent text-xs font-black text-[#087c75] hover:underline"
                        >
                            ← Back to module buttons
                        </Link>
                    </div>
                    {approved.length === 0 ? (
                        <EmptyState
                            emoji="🏅"
                            heading="Your impact wall is waiting"
                            line="Submit coursework and it hangs here on faculty approval — rank, score and story."
                            actionLabel="+ New coursework report"
                            onAction={goCreate}
                        />
                    ) : (
                        <section className="overflow-hidden rounded-[22px] border border-[#dde5ea] bg-white shadow-[0_8px_22px_rgba(24,52,64,.05)]">
                            <div className="flex flex-wrap items-center justify-between gap-3.5 border-b border-[#dde5ea] px-5 py-[18px]">
                                <div>
                                    <h3 className="m-0 text-lg font-semibold text-[#16313d]">My Coursework Impact</h3>
                                    <p className="mt-1 text-xs text-[#70808a]">
                                        {approved.length} approved record{approved.length === 1 ? "" : "s"} · You receive the approved file; scores and rankings stay with faculty.
                                    </p>
                                </div>
                            </div>
                            <div className="grid gap-3 p-4">
                                {approved.map((entry) => (
                                    <div key={entry.id}>
                                        {entry.isOwner === false && (
                                            <p className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wide text-ciel-indigo">
                                                👥 Team project — led by {entry.studentInfo?.studentName || "a teammate"}
                                            </p>
                                        )}
                                        <CourseworkImpactListCard
                                            entry={entry}
                                            onOpenFlashcard={() => setFlashId(entry.id || null)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                    {flashEntry ? (
                        <CourseworkFlashCardModal
                            entry={flashEntry}
                            onClose={() => {
                                setFlashId(null);
                                if (openParam) router.replace(`${hubHref}?view=wall`);
                            }}
                        />
                    ) : null}
                </div>
            )}

            {view === "in-progress" && (
                <div className="mt-4">
                    <HubBackButton href={hubHref} />
                    {drafts.length === 0 ? (
                        <EmptyState
                            emoji="🧩"
                            heading="Nothing in progress"
                            line="Create a coursework record to start — your draft saves automatically as you go."
                            actionLabel="+ New coursework report"
                            onAction={goCreate}
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

            {view === "under-review" && (() => {
                const byTab = {
                    pending: underReview.filter((e) => e.facultyApprovalStatus === "pending"),
                    revision: underReview.filter((e) => e.facultyApprovalStatus === "revision_requested"),
                    rejected: underReview.filter((e) => e.facultyApprovalStatus === "rejected"),
                };
                const visible = reviewTab === "all" ? underReview : byTab[reviewTab];
                return (
                    <div className="mt-4">
                        <HubBackButton href={hubHref} />
                        {underReview.length === 0 ? (
                            <EmptyState
                                emoji="📤"
                                heading="Nothing under review"
                                line="Submit a completed coursework record and it lands here while faculty reviews it."
                                actionLabel="+ New coursework report"
                                onAction={goCreate}
                            />
                        ) : (
                            <>
                                <Tabs
                                    tabs={[
                                        { key: "all", label: `All · ${underReview.length}` },
                                        { key: "pending", label: `Pending faculty · ${byTab.pending.length}` },
                                        { key: "revision", label: `Revision required · ${byTab.revision.length}` },
                                        { key: "rejected", label: `Not accepted · ${byTab.rejected.length}` },
                                    ]}
                                    active={reviewTab}
                                    onChange={(key) => setReviewTab(key as typeof reviewTab)}
                                />
                                <div className="mt-3 space-y-3">
                                    {visible.length === 0 ? (
                                        <p className="px-1 text-sm text-ciel-text-mid">Nothing in this tab right now.</p>
                                    ) : (
                                        visible.map((entry) => (
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
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                );
            })()}

            {view === "home" && (
                <>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <HubTile
                            href={createHref}
                            badge="START"
                            badgeClass="text-[#15988b]"
                            emoji="📚"
                            title="Create Coursework Record"
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
                                actionLabel="+ New coursework report"
                                onAction={goCreate}
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
