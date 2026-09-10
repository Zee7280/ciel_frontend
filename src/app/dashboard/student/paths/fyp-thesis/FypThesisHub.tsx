"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { namedTimeGreeting } from "@/utils/timeGreeting";
import { CourseworkCrumb, CourseworkHero, HubBackButton, HubTile } from "@/components/ciel/coursework/CourseworkHubChrome";
import PathHubGuide from "@/components/ciel/PathHubGuide";
import EmptyState from "@/components/ciel/EmptyState";
import ThesisCard from "@/components/ciel/ThesisCard";
import Tabs from "@/components/ciel/Tabs";
import { WorkspaceSkeleton } from "@/components/ciel/Skeleton";
import { type FypEntry } from "@/utils/fypTypes";
import { isPathEntryApproved, isPathEntryWaiting } from "@/utils/reviewQueue";

const BASE = "/dashboard/student/paths/fyp-thesis";
const CREATE_HREF = `${BASE}?view=create`;
const GUIDE_HREF = `${BASE}?view=guide`;

const HUB_VIEW_LABEL: Record<string, string> = {
    guide: "Guidance",
    wall: "Impact",
    "in-progress": "In Progress",
    "under-review": "Under Review",
    create: "Create",
};

const FYP_GUIDE_STEPS = [
    { emoji: "🧭", title: "Route", blurb: "Title, university, discipline and the primary form of your FYP." },
    { emoji: "🎯", title: "Roadmap", blurb: "Brief, why it matters, deliverables and an editable stage plan." },
    { emoji: "🛠️", title: "Pathway", blurb: "Only the questions for your selected FYP route appear." },
    { emoji: "🔎", title: "Evidence", blurb: "How you tested or supported the work — quant, qual, or both." },
    { emoji: "✨", title: "Outcome", blurb: "Final output, headline findings and contribution." },
    { emoji: "🌍", title: "Sustainability", blurb: "Honest SDG link — or declare that none applies." },
    { emoji: "🪞", title: "Reflection", blurb: "What you learned, skills, and optional opportunity radar." },
    { emoji: "📦", title: "Review", blurb: "Accept the seven summaries, attach evidence, submit to your supervisor." },
];

function firstName() {
    const user = readStoredCurrentUser();
    const name = typeof user?.name === "string" ? user.name.split(" ")[0] : "";
    return name || "there";
}

/**
 * Makes a card open its own FYP workspace on click without wrapping it in a real <button> —
 * ThesisCard already renders its own "View" button internally, and a <button> can't legally
 * contain another <button> (breaks click handling in the browser). Same pattern as Coursework's
 * CardOpenTarget.
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
    const open = () => router.push(`${BASE}/${entryId}`);
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
            className="cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-purple"
        >
            {children}
        </div>
    );
}

export default function FypThesisHub({
    view,
}: {
    view: "home" | "guide" | "wall" | "in-progress" | "under-review" | "create";
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [entries, setEntries] = useState<FypEntry[]>([]);
    const [creating, setCreating] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [name, setName] = useState("there");
    const [reviewTab, setReviewTab] = useState<"all" | "pending" | "revision" | "rejected">("all");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await authenticatedFetch("/api/v1/paths/fyp-theses", {}, { redirectToLogin: false });
            const result = res?.ok ? await res.json() : null;
            setEntries(Array.isArray(result?.data) ? result.data : []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setName(firstName());
        load();
    }, [load]);

    const createNew = async () => {
        setCreating(true);
        try {
            const res = await authenticatedFetch("/api/v1/paths/fyp-theses", { method: "POST" }, { redirectToLogin: false });
            const result = res?.ok ? await res.json() : null;
            if (result?.data?.id) {
                router.push(`${BASE}/${result.data.id}`);
                return;
            }
        } finally {
            setCreating(false);
        }
    };

    const deleteDraft = async (id: string) => {
        setDeletingId(id);
        try {
            const res = await authenticatedFetch(`/api/v1/paths/fyp-theses/${id}`, { method: "DELETE" }, { redirectToLogin: false });
            if (res?.ok) setEntries((prev) => prev.filter((e) => e.id !== id));
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) return <WorkspaceSkeleton />;

    const drafts = entries.filter((e) => e.status !== "submitted");
    const approved = entries.filter(isPathEntryApproved);
    const underReview = entries.filter(isPathEntryWaiting);

    return (
        <div className="mx-auto max-w-[1040px] pb-16">
            <CourseworkCrumb
                role="Student"
                pathLabel="Final Year Project (FYP)"
                view={view === "home" ? undefined : HUB_VIEW_LABEL[view] ?? view}
            />
            <CourseworkHero
                kicker="MY PATHS · FINAL YEAR PROJECT (FYP)"
                title={namedTimeGreeting(name, "🎓")}
                subtitle="Build your Final Year Project records from first draft to faculty / supervisor verification."
                gradient="linear-gradient(115deg,#04252b,#0e5f63 55%,#12a5a0 110%)"
                stats={[
                    { value: String(approved.length), label: "APPROVED" },
                    { value: String(underReview.length), label: "UNDER REVIEW" },
                    { value: String(drafts.length), label: "IN PROGRESS" },
                ]}
            />

            {view === "create" && (
                <div className="mt-4">
                    <div className="mb-3.5 flex flex-wrap items-end justify-between gap-5">
                        <div>
                            <h2 className="m-0 text-[21px] font-semibold text-ciel-text">Create FYP Record</h2>
                            <p className="mt-1 text-[12.5px] text-ciel-text-soft">
                                Your draft saves automatically; your supervisor only sees it after you submit.
                            </p>
                        </div>
                        <HubBackButton href={BASE} label="← Back to module buttons" />
                    </div>
                    <section className="overflow-hidden rounded-[22px] border border-ciel-border bg-white shadow-[0_8px_22px_rgba(24,52,64,.05)]">
                        <div className="p-5">
                            <div className="mb-3.5 rounded-xl border border-ciel-amber/30 bg-ciel-amber-soft p-3 text-[11.5px] leading-[1.5] text-ciel-amber">
                                No pre-approval is required. Each record opens the <b>CIEL PK Final Year Projects Form</b> — 8 steps
                                (Route → Roadmap → Pathway → Evidence → Outcome → Sustainability → Reflection → Review). Saving Section 1
                                creates that record&apos;s own unique FYP ID and automatically connects you, your team, your supervisor, your
                                university and CIEL PK — every keystroke after that is auto-saved continuously.
                            </div>
                            <div className="flex flex-wrap items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={creating ? undefined : createNew}
                                    disabled={creating}
                                    className="inline-flex items-center gap-1.5 rounded-[9px] bg-ciel-purple px-4 py-3 text-xs font-black text-white disabled:cursor-wait disabled:opacity-70"
                                >
                                    🎓 {creating ? "Opening…" : "OPEN FYP FORM"}
                                </button>
                            </div>
                            <div className="mt-4 rounded-xl border border-ciel-green/25 bg-ciel-green-soft px-3.5 py-2.5 text-[11px] leading-[1.5] text-ciel-green-deep">
                                Once you start, the record appears under <b>Final Year Project (FYP) → FYP in Progress</b> with a live
                                completion bar. Your supervisor, university and CIEL PK see the same progress and can send reminders — never
                                your unfinished text.
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {view === "guide" && (
                <div className="mt-4">
                    <HubBackButton href={BASE} label="← FYP hub" />
                    <PathHubGuide kicker="HOW TO FILL YOUR FYP — EIGHT STEPS" steps={FYP_GUIDE_STEPS} />
                </div>
            )}

            {view === "wall" && (
                <div className="mt-4">
                    <HubBackButton href={BASE} label="← FYP hub" />
                    <div className="mb-3">
                        <h2 className="m-0 text-[21px] font-semibold text-ciel-text">My Final Year Project Impact</h2>
                        <p className="mt-1 text-[12.5px] text-ciel-text-soft">
                            Approved records only — these also hang on your University&apos;s FYP Impact Wall and CIEL PK.
                        </p>
                    </div>
                    {approved.length === 0 ? (
                        <EmptyState
                            emoji="🏅"
                            heading="Your FYP impact is waiting"
                            line="Submit an FYP and it hangs here on supervisor approval — rank, score and story."
                            actionLabel="+ New FYP record"
                            onAction={() => router.push(CREATE_HREF)}
                        />
                    ) : (
                        <div className="space-y-3">
                            {approved.map((entry) => (
                                <ThesisCard key={entry.id} entry={entry} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {view === "in-progress" && (
                <div className="mt-4">
                    <HubBackButton href={BASE} label="← FYP hub" />
                    <div className="mb-3">
                        <h2 className="m-0 text-[21px] font-semibold text-ciel-text">FYP in Progress</h2>
                        <p className="mt-1 text-[12.5px] text-ciel-text-soft">
                            Live completion from your form. Open a record to continue — drafts save as you go.
                        </p>
                    </div>
                    {drafts.length === 0 ? (
                        <EmptyState
                            emoji="🔬"
                            heading="Nothing in progress"
                            line="Create an FYP record to start — your draft saves as you go."
                            actionLabel="+ New FYP record"
                            onAction={() => router.push(CREATE_HREF)}
                        />
                    ) : (
                        <div className="space-y-3">
                            {drafts.map((entry) => (
                                <div key={entry.id} className="relative">
                                    <CardOpenTarget entryId={entry.id!} router={router}>
                                        <ThesisCard entry={entry} studentReminder="team" />
                                    </CardOpenTarget>
                                    {entry.isOwner !== false && (
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
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {view === "under-review" && (() => {
                const byTab = {
                    pending: underReview.filter((e) => e.supervisorApprovalStatus === "pending" || !e.supervisorApprovalStatus),
                    revision: underReview.filter((e) => e.supervisorApprovalStatus === "revision_requested"),
                    rejected: underReview.filter((e) => e.supervisorApprovalStatus === "rejected"),
                };
                const visible = reviewTab === "all" ? underReview : byTab[reviewTab];
                return (
                    <div className="mt-4">
                        <HubBackButton href={BASE} label="← FYP hub" />
                        <div className="mb-3">
                            <h2 className="m-0 text-[21px] font-semibold text-ciel-text">FYP Under Review</h2>
                            <p className="mt-1 text-[12.5px] text-ciel-text-soft">
                                Submitted records are with your supervisor. You&apos;ll receive the outcome after they review.
                            </p>
                        </div>
                        {underReview.length === 0 ? (
                            <EmptyState
                                emoji="📤"
                                heading="Nothing under review"
                                line="Submit a completed FYP flashcard and it lands here while your supervisor reviews it."
                                actionLabel="+ New FYP record"
                                onAction={() => router.push(CREATE_HREF)}
                            />
                        ) : (
                            <>
                                <Tabs
                                    tabs={[
                                        { key: "all", label: `All · ${underReview.length}` },
                                        { key: "pending", label: `Pending supervisor · ${byTab.pending.length}` },
                                        { key: "revision", label: `Revision required · ${byTab.revision.length}` },
                                        { key: "rejected", label: `Not accepted · ${byTab.rejected.length}` },
                                    ]}
                                    active={reviewTab}
                                    onChange={(key) => setReviewTab(key as typeof reviewTab)}
                                />
                                <div className="mt-3 space-y-3">
                                    {visible.length === 0 ? (
                                        <p className="px-1 text-sm text-ciel-text-soft">Nothing in this tab right now.</p>
                                    ) : (
                                        visible.map((entry) => (
                                            <CardOpenTarget key={entry.id} entryId={entry.id!} router={router}>
                                                <ThesisCard entry={entry} studentReminder="faculty" />
                                            </CardOpenTarget>
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                );
            })()}

            {view === "home" && (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <HubTile
                        href={CREATE_HREF}
                        badge="START"
                        badgeClass="text-[#c76000]"
                        emoji="🎓"
                        title="Create FYP Record"
                        subtitle="Open the CIEL PK Final Year Projects Form. Saving Section 1 creates a new master FYP record with its own unique FYP ID, auto-connected to your team, supervisor, university and CIEL PK."
                        background="linear-gradient(135deg,#c76000,#f59a00)"
                    />
                    <HubTile
                        href={`${BASE}?view=in-progress`}
                        badge={`${drafts.length} IN PROGRESS`}
                        badgeClass="text-[#16798c]"
                        emoji="🔬"
                        title="FYP in Progress"
                        subtitle="Records you're still writing — completion bar, and Email / WhatsApp lines to your team or supervisor."
                        background="linear-gradient(135deg,#16798c,#38b8e6)"
                    />
                    <HubTile
                        href={`${BASE}?view=under-review`}
                        badge={`${underReview.length} UNDER REVIEW`}
                        badgeClass="text-[#16798c]"
                        emoji="📤"
                        title="FYP Under Review"
                        subtitle="Submitted flashcards waiting for supervisor approval — with Email / WhatsApp buttons to remind your supervisor."
                        background="linear-gradient(135deg,#16798c,#38b8e6)"
                    />
                    <HubTile
                        href="/dashboard/student/impact?area=FYP"
                        badge={`${approved.length} APPROVED`}
                        badgeClass="text-[#0e4d4e]"
                        emoji="🏅"
                        title="My Final Year Project Impact"
                        subtitle="Your approved Final Year Projects — every team member sees the same approved record here, and it also appears on your University's FYP Impact Wall and CIEL PK."
                        background="linear-gradient(135deg,#0e4d4e,#117669)"
                    />
                    <HubTile
                        href={GUIDE_HREF}
                        badge="GUIDE INSIDE"
                        badgeClass="text-[#6b2bd9]"
                        emoji="📖"
                        title="FYP Guidance"
                        subtitle="Eight sections: route, roadmap, pathway, evidence, outcome, sustainability, reflection, review."
                        background="linear-gradient(135deg,#6b2bd9,#9f78ef)"
                        className="sm:col-span-2"
                    />
                </div>
            )}
        </div>
    );
}
