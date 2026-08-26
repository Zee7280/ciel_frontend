"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import clsx from "clsx";
import { authenticatedFetch } from "@/utils/api";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { namedTimeGreeting } from "@/utils/timeGreeting";
import { CourseworkCrumb, CourseworkHero, HubBackButton, HubTile } from "@/components/ciel/coursework/CourseworkHubChrome";
import PathHubGuide from "@/components/ciel/PathHubGuide";
import EmptyState from "@/components/ciel/EmptyState";
import { WorkspaceSkeleton } from "@/components/ciel/Skeleton";

const BASE = "/dashboard/student/paths/startup-business";
const WORKSPACE_HREF = `${BASE}?view=workspace`;
const GUIDE_HREF = `${BASE}?view=guide`;
const WALL_HREF = `${BASE}?view=wall`;

const STARTUP_GUIDE_STEPS = [
    { emoji: "🎓", title: "Who you are", blurb: "University, programme, supervisor, and how this venture sits in your degree." },
    { emoji: "📄", title: "Upload plan", blurb: "Business plan, deck, or summary — optional to start, required for the academic gate." },
    { emoji: "💡", title: "Your idea", blurb: "The problem, who pays, who uses it, and a short pitch." },
    { emoji: "⚙️", title: "How it works", blurb: "Solution, advantage, and how it makes money." },
    { emoji: "🌍", title: "Who it helps", blurb: "SDG links and the impact you can actually defend." },
    { emoji: "📈", title: "Your proof", blurb: "Interviews, pilots, revenue — evidence that matches your stage." },
    { emoji: "🧑‍🏫", title: "Supervisor", blurb: "Declarations and the review pipeline before you go public." },
    { emoji: "🚀", title: "Go public", blurb: "Who can see the card, then submit for showcase approval." },
];

type HubVenture = {
    ventureName?: string | null;
    status?: "draft" | "submitted";
    stepCompleted?: number;
    isVisible?: boolean;
    isOwner?: boolean;
    stage?: string | null;
    ideaInfo?: { sector?: string; city?: string } | null;
    sectionSummaries?: Record<string, string | undefined> | null;
    gates?: { academicOk: boolean; showcaseOk: boolean; investmentReadyOk: boolean };
};

function firstName() {
    const user = readStoredCurrentUser();
    const name = typeof user?.name === "string" ? user.name.split(" ")[0] : "";
    return name || "there";
}

function VenturePreview({ entry }: { entry: HubVenture }) {
    const gates = entry.gates || { academicOk: false, showcaseOk: false, investmentReadyOk: false };
    const summaries = entry.sectionSummaries || {};
    return (
        <div className="space-y-4 rounded-ciel-lg border border-ciel-border bg-white p-6 shadow-sm">
            {entry.status === "submitted" && (
                <div className="flex items-center gap-2 text-sm font-bold text-ciel-green-deep">
                    <CheckCircle2 className="h-5 w-5" /> Submitted — awaiting supervisor sign-off
                </div>
            )}
            <p className="text-lg font-black text-ciel-text">{entry.ventureName || "Untitled venture"}</p>
            <p className="text-sm text-ciel-text-mid">
                {entry.stage || ""} {entry.ideaInfo?.sector ? `· ${entry.ideaInfo.sector}` : ""} {entry.ideaInfo?.city ? `· ${entry.ideaInfo.city}` : ""}
            </p>
            <div className="flex flex-wrap gap-2">
                <span className={clsx("rounded-full px-2.5 py-1 text-[11px] font-bold", gates.academicOk ? "bg-ciel-green-soft text-ciel-green-deep" : "bg-ciel-border text-ciel-text-mid")}>
                    {gates.academicOk ? "✓ Academic submission complete" : "Academic submission incomplete"}
                </span>
                <span className={clsx("rounded-full px-2.5 py-1 text-[11px] font-bold", gates.showcaseOk ? "bg-ciel-indigo-soft text-ciel-indigo" : "bg-ciel-border text-ciel-text-mid")}>
                    {gates.showcaseOk ? "✓ Showcase Ready" : "Showcase locked"}
                </span>
                <span className={clsx("rounded-full px-2.5 py-1 text-[11px] font-bold", gates.investmentReadyOk ? "bg-ciel-navy text-white" : "bg-ciel-border text-ciel-text-mid")}>
                    {gates.investmentReadyOk ? "★ Investment Ready" : "Not investment-ready yet"}
                </span>
            </div>
            {Object.values(summaries).some((t) => t?.trim()) && (
                <div className="space-y-2 border-t border-ciel-border pt-4">
                    {Object.entries(summaries)
                        .filter(([, text]) => text?.trim())
                        .slice(0, 4)
                        .map(([key, text]) => (
                            <p key={key} className="line-clamp-2 text-sm leading-relaxed text-ciel-text">
                                {text}
                            </p>
                        ))}
                </div>
            )}
        </div>
    );
}

export default function StartupBusinessHub({ view }: { view: "home" | "guide" | "wall" }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [entry, setEntry] = useState<HubVenture | null>(null);
    const [name, setName] = useState("there");

    useEffect(() => {
        setName(firstName());
        authenticatedFetch("/api/v1/paths/startup-business", {}, { redirectToLogin: false })
            .then((res) => (res?.ok ? res.json() : null))
            .then((result) => {
                if (result?.data) setEntry(result.data as HubVenture);
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <WorkspaceSkeleton />;

    const submitted = entry?.status === "submitted";
    const showcaseReady = !!entry?.gates?.showcaseOk;
    const inProgress = !!entry && entry.status !== "submitted" && (entry.stepCompleted ?? 0) > 0;
    const formTitle = submitted ? "View & edit venture" : inProgress ? `Continue · step ${entry?.stepCompleted ?? 0}/8` : "Start your venture";

    return (
        <div className="mx-auto max-w-[1040px] pb-16">
            <CourseworkCrumb role="Student" pathLabel="Startup / Business" view={view === "home" ? undefined : view} />
            <CourseworkHero
                kicker="MY PATHS · STARTUP / BUSINESS"
                title={namedTimeGreeting(name, "💼")}
                subtitle="Three doors: build your venture record, learn every section, and visit the wall where approved work hangs."
                gradient="linear-gradient(115deg,#04252b,#b45309 55%,#f59e0b 110%)"
                stats={[
                    { value: showcaseReady ? "1" : "0", label: "SHOWCASE READY" },
                    { value: submitted ? "1" : "0", label: "SUBMITTED" },
                    { value: inProgress ? "1" : "0", label: "IN PROGRESS" },
                ]}
            />

            {view === "guide" && (
                <div className="mt-4">
                    <HubBackButton href={BASE} label="← Startup / Business hub" />
                    <PathHubGuide kicker="HOW TO FILL YOUR VENTURE RECORD — EIGHT STEPS" steps={STARTUP_GUIDE_STEPS} />
                </div>
            )}

            {view === "wall" && (
                <div className="mt-4">
                    <HubBackButton href={BASE} label="← Startup / Business hub" />
                    {submitted && entry ? (
                        <div className="mx-auto max-w-[480px]">
                            <VenturePreview entry={entry} />
                        </div>
                    ) : (
                        <EmptyState
                            emoji="🏅"
                            heading="Your impact wall is waiting"
                            line="Submit the venture record and it hangs here once it is showcase-ready."
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
                            subtitle="Eight steps — pitch, proof, and a public card at the end."
                            background="linear-gradient(135deg,#b45309,#f59e0b)"
                        />
                        <HubTile
                            href={GUIDE_HREF}
                            badge="GUIDE INSIDE"
                            emoji="📖"
                            title="Section guidelines"
                            subtitle="How to fill all 8 steps — who you are through go public."
                            background="linear-gradient(135deg,#6d28d9,#a78bfa)"
                        />
                        <HubTile
                            href={WALL_HREF}
                            badge={submitted ? "1 HANGING" : "THE WALL"}
                            emoji="🏅"
                            title="My Impact Wall"
                            subtitle="Submitted ventures hang here — academic, showcase, and investment gates."
                            background="linear-gradient(135deg,#04252b,#0e7d74)"
                        />
                    </div>

                    {!entry || (!inProgress && !submitted) ? (
                        <div className="mt-4">
                            <EmptyState
                                emoji="💼"
                                heading="No venture record yet"
                                line="Turn a business idea, FYP startup, or operating venture into a verified impact record."
                                actionLabel="Start your venture"
                                onAction={() => router.push(WORKSPACE_HREF)}
                            />
                        </div>
                    ) : (
                        <div className="mt-5 space-y-3">
                            <p className="text-[8.5px] font-extrabold tracking-[0.14em] text-[#7a919a]">
                                MY VENTURE · {entry.stepCompleted ?? 0}/8 STEPS
                            </p>
                            <button
                                type="button"
                                onClick={() => router.push(WORKSPACE_HREF)}
                                className="w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-gold"
                            >
                                <VenturePreview entry={entry} />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
