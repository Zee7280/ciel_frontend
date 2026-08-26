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
import { isPathEntryApproved } from "@/utils/reviewQueue";

const BASE = "/dashboard/student/paths/fyp-thesis";
const WORKSPACE_HREF = `${BASE}?view=workspace`;
const GUIDE_HREF = `${BASE}?view=guide`;
const WALL_HREF = `${BASE}?view=wall`;

const FYP_GUIDE_STEPS = [
    { emoji: "📌", title: "Project", blurb: "School, supervisor, span, and what kind of final project this is." },
    { emoji: "🧩", title: "Background", blurb: "The problem, why it is urgent, and who it is for." },
    { emoji: "🎯", title: "Objectives", blurb: "Your aim, what you will do, and what you leave out." },
    { emoji: "📚", title: "Literature", blurb: "What you read and the gap your work fills." },
    { emoji: "🔬", title: "Method", blurb: "How you did the work — approach, tools, and scale." },
    { emoji: "📈", title: "Findings", blurb: "What you found, with numbers if you have them." },
    { emoji: "🌍", title: "SDG links", blurb: "Which goals this work serves — honesty over stretch." },
    { emoji: "🪞", title: "Reflection", blurb: "What you learned and what happens next." },
    { emoji: "📦", title: "Publish", blurb: "Review the flash card and send it to your supervisor." },
];

function firstName() {
    const user = readStoredCurrentUser();
    const name = typeof user?.name === "string" ? user.name.split(" ")[0] : "";
    return name || "there";
}

export default function FypThesisHub({ view }: { view: "home" | "guide" | "wall" }) {
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
    const inProgress = hasEntry && entry.status !== "submitted" && (entry.stepCompleted > 0 || !!entry.projectTitle);
    const formTitle = submitted ? "View & edit record" : inProgress ? `Continue · step ${entry.stepCompleted}/9` : "Start FYP / thesis";

    return (
        <div className="mx-auto max-w-[1040px] pb-16">
            <CourseworkCrumb role="Student" pathLabel="FYP / Thesis" view={view === "home" ? undefined : view} />
            <CourseworkHero
                kicker="MY PATHS · FYP / THESIS"
                title={namedTimeGreeting(name, "🎓")}
                subtitle="Three doors: build your record, learn every section, and visit the wall where approved work hangs."
                gradient="linear-gradient(115deg,#1e1b4b,#5b21b6 55%,#a78bfa 110%)"
                stats={[
                    { value: approved ? "1" : "0", label: "APPROVED" },
                    { value: submitted ? "1" : "0", label: "SUBMITTED" },
                    { value: inProgress ? "1" : "0", label: "IN PROGRESS" },
                ]}
            />

            {view === "guide" && (
                <div className="mt-4">
                    <HubBackButton href={BASE} label="← FYP / Thesis hub" />
                    <PathHubGuide kicker="HOW TO FILL YOUR FYP / THESIS — NINE STEPS" steps={FYP_GUIDE_STEPS} />
                </div>
            )}

            {view === "wall" && (
                <div className="mt-4">
                    <HubBackButton href={BASE} label="← FYP / Thesis hub" />
                    {approved ? (
                        <div className="mx-auto max-w-[400px]">
                            <ThesisCard entry={entry} />
                        </div>
                    ) : (
                        <EmptyState
                            emoji="🏅"
                            heading="Your impact wall is waiting"
                            line="Submit your FYP / thesis and it hangs here on supervisor approval — rank, score and story."
                            actionLabel={formTitle}
                            onAction={() => router.push(WORKSPACE_HREF)}
                        />
                    )}
                </div>
            )}

            {view === "home" && (
                <>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <HubTile
                            href={WORKSPACE_HREF}
                            badge="THE FORM"
                            emoji="📝"
                            title={formTitle}
                            subtitle="Nine steps — your flash card builds itself at the end."
                            background="linear-gradient(135deg,#5b21b6,#a78bfa)"
                        />
                        <HubTile
                            href={GUIDE_HREF}
                            badge="GUIDE INSIDE"
                            emoji="📖"
                            title="Section guidelines"
                            subtitle="How to fill all 9 steps — project through publish."
                            background="linear-gradient(135deg,#6d28d9,#c4b5fd)"
                        />
                        <HubTile
                            href={WALL_HREF}
                            badge={approved ? "1 HANGING" : "THE WALL"}
                            emoji="🏅"
                            title="My Impact Wall"
                            subtitle="Approved FYP / thesis hangs here forever — rank, score and story."
                            background="linear-gradient(135deg,#1e1b4b,#5b21b6)"
                        />
                    </div>

                    {!hasEntry || (!inProgress && !submitted) ? (
                        <div className="mt-4">
                            <EmptyState
                                emoji="🎓"
                                heading="No FYP / thesis record yet"
                                line="Turn your final-year project or thesis into a verified impact record."
                                actionLabel="Start FYP / thesis"
                                onAction={() => router.push(WORKSPACE_HREF)}
                            />
                        </div>
                    ) : (
                        <div className="mt-5 space-y-3">
                            <p className="text-[8.5px] font-extrabold tracking-[0.14em] text-[#7a919a]">
                                MY RECORD · {entry.stepCompleted}/9 STEPS
                            </p>
                            <button
                                type="button"
                                onClick={() => router.push(WORKSPACE_HREF)}
                                className="w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-purple"
                            >
                                <ThesisCard entry={entry} />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
