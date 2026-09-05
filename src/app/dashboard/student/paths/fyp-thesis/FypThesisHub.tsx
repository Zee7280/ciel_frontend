"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authenticatedFetch } from "@/utils/api";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { namedTimeGreeting } from "@/utils/timeGreeting";
import { CourseworkCrumb, CourseworkHero, HubBackButton, HubTile } from "@/components/ciel/coursework/CourseworkHubChrome";
import PathHubGuide from "@/components/ciel/PathHubGuide";
import EmptyState from "@/components/ciel/EmptyState";
import ThesisCard from "@/components/ciel/ThesisCard";
import { WorkspaceSkeleton } from "@/components/ciel/Skeleton";
import { type FypEntry, EMPTY_FYP, mergeFypEntry } from "@/utils/fypTypes";
import { isPathEntryApproved, isPathEntryWaiting } from "@/utils/reviewQueue";

const BASE = "/dashboard/student/paths/fyp-thesis";
const WORKSPACE_HREF = `${BASE}?view=workspace`;
const GUIDE_HREF = `${BASE}?view=guide`;

const HUB_VIEW_LABEL: Record<string, string> = {
    guide: "Guidance",
    wall: "Impact",
    "in-progress": "In Progress",
    "under-review": "Under Review",
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

export default function FypThesisHub({
    view,
}: {
    view: "home" | "guide" | "wall" | "in-progress" | "under-review";
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [entry, setEntry] = useState<FypEntry>(EMPTY_FYP);
    const [hasEntry, setHasEntry] = useState(false);
    const [name, setName] = useState("there");

    useEffect(() => {
        setName(firstName());
        authenticatedFetch("/api/v1/paths/fyp-thesis", {}, { redirectToLogin: false })
            .then((res) => (res?.ok ? res.json() : null))
            .then((result) => {
                if (result?.data) {
                    setEntry(mergeFypEntry(EMPTY_FYP, result.data as Partial<FypEntry>));
                    setHasEntry(true);
                }
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <WorkspaceSkeleton />;

    const submitted = hasEntry && entry.status === "submitted";
    const approved = hasEntry && isPathEntryApproved(entry);
    const underReview = hasEntry && submitted && isPathEntryWaiting(entry);
    const inProgress = hasEntry && entry.status !== "submitted" && (entry.stepCompleted > 0 || !!entry.projectTitle);
    const formTitle = submitted
        ? "View & edit record"
        : inProgress
          ? `Continue · step ${Math.min(entry.stepCompleted, 8)}/8`
          : "Start FYP record";

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
                subtitle="Build your Final Year Project record from first draft to faculty / supervisor verification."
                gradient="linear-gradient(115deg,#04252b,#0e5f63 55%,#12a5a0 110%)"
                stats={[
                    { value: approved ? "1" : "0", label: "APPROVED" },
                    { value: underReview ? "1" : "0", label: "UNDER REVIEW" },
                    { value: inProgress ? "1" : "0", label: "IN PROGRESS" },
                ]}
            />

            {view === "guide" && (
                <div className="mt-4">
                    <HubBackButton href={BASE} label="← FYP hub" />
                    <PathHubGuide kicker="HOW TO FILL YOUR FYP — EIGHT STEPS" steps={FYP_GUIDE_STEPS} />
                </div>
            )}

            {view === "wall" && (
                <div className="mt-4">
                    <HubBackButton href={BASE} label="← FYP hub" />
                    {approved ? (
                        <div className="mx-auto max-w-[400px]">
                            <ThesisCard entry={entry} />
                        </div>
                    ) : (
                        <EmptyState
                            emoji="🏅"
                            heading="Your FYP impact is waiting"
                            line="Submit your FYP and it hangs here on supervisor approval — rank, score and story. Same card as My Impact Portfolio → FYP."
                            actionLabel={formTitle}
                            onAction={() => router.push(WORKSPACE_HREF)}
                        />
                    )}
                </div>
            )}

            {view === "in-progress" && (
                <div className="mt-4">
                    <HubBackButton href={BASE} label="← FYP hub" />
                    <div className="mb-3">
                        <h2 className="m-0 text-[21px] font-semibold text-[#16313d]">FYP in Progress</h2>
                        <p className="mt-1 text-[12.5px] text-[#70808a]">
                            Live completion from your form. Open the record to continue — drafts save as you go.
                        </p>
                    </div>
                    {inProgress ? (
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => router.push(WORKSPACE_HREF)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    router.push(WORKSPACE_HREF);
                                }
                            }}
                            className="w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d4aff]"
                        >
                            <ThesisCard entry={entry} />
                        </div>
                    ) : (
                        <EmptyState
                            emoji="🔬"
                            heading="Nothing in progress"
                            line="Open the FYP form to start — your draft saves as you go."
                            actionLabel="Create FYP Record"
                            onAction={() => router.push(WORKSPACE_HREF)}
                        />
                    )}
                </div>
            )}

            {view === "under-review" && (
                <div className="mt-4">
                    <HubBackButton href={BASE} label="← FYP hub" />
                    <div className="mb-3">
                        <h2 className="m-0 text-[21px] font-semibold text-[#16313d]">FYP Under Review</h2>
                        <p className="mt-1 text-[12.5px] text-[#70808a]">
                            Your submitted flashcard is with your supervisor. You&apos;ll receive the outcome after they review it.
                        </p>
                    </div>
                    {underReview ? (
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => router.push(WORKSPACE_HREF)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    router.push(WORKSPACE_HREF);
                                }
                            }}
                            className="w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d4aff]"
                        >
                            <ThesisCard entry={entry} />
                        </div>
                    ) : (
                        <EmptyState
                            emoji="📤"
                            heading="Nothing under review"
                            line="Submit your completed FYP flashcard and it lands here while your supervisor reviews it."
                            actionLabel="Open FYP form"
                            onAction={() => router.push(WORKSPACE_HREF)}
                        />
                    )}
                </div>
            )}

            {view === "home" && (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <HubTile
                        href={WORKSPACE_HREF}
                        badge="START"
                        badgeClass="text-[#c76000]"
                        emoji="🎓"
                        title="Create FYP Record"
                        subtitle="Open the CIEL PK Final Year Projects Form. Saving Section 1 creates your master FYP record with a unique FYP ID and auto-connects you, your team, your supervisor, your university and CIEL PK."
                        background="linear-gradient(135deg,#c76000,#f59a00)"
                    />
                    <HubTile
                        href={`${BASE}?view=in-progress`}
                        badge={inProgress ? "1 IN PROGRESS" : "0 IN PROGRESS"}
                        badgeClass="text-[#16798c]"
                        emoji="🔬"
                        title="FYP in Progress"
                        subtitle="Records you're still writing — completion bar, and Email / WhatsApp lines to your team or supervisor."
                        background="linear-gradient(135deg,#16798c,#38b8e6)"
                    />
                    <HubTile
                        href={`${BASE}?view=under-review`}
                        badge={underReview ? "1 UNDER REVIEW" : "0 UNDER REVIEW"}
                        badgeClass="text-[#16798c]"
                        emoji="📤"
                        title="FYP Under Review"
                        subtitle="Submitted flashcards waiting for supervisor approval — with Email / WhatsApp buttons to remind your supervisor."
                        background="linear-gradient(135deg,#16798c,#38b8e6)"
                    />
                    <HubTile
                        href="/dashboard/student/impact?area=FYP"
                        badge={approved ? "1 APPROVED" : "0 APPROVED"}
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
