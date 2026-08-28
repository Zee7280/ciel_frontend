"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import clsx from "clsx";
import CourseworkCard from "@/components/ciel/CourseworkCard";
import MeritModelPanel, { type MeritEntry } from "@/components/ciel/MeritModelPanel";
import ThesisCard from "@/components/ciel/ThesisCard";
import FypMeritPanel, { type FypMeritEntry } from "@/components/ciel/FypMeritPanel";
import { CourseworkCrumb, CourseworkHero, HubBackButton, HubTile } from "@/components/ciel/coursework/CourseworkHubChrome";
import { isFacultyApproved } from "@/utils/courseworkSectionReview";
import { computeMeritScorecard } from "@/utils/courseworkMeritModel";
import { isPathEntryApproved, isPathEntryWaiting } from "@/utils/reviewQueue";

type DeckMode = "course-project" | "fyp-thesis";
type UniView = "home" | "pending" | "deck" | "rank";

export default function UniversityShowcasePage() {
    const [mode, setMode] = useState<DeckMode>("course-project");
    const [entries, setEntries] = useState<MeritEntry[]>([]);
    const [fypEntries, setFypEntries] = useState<FypMeritEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [fypLoading, setFypLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [view, setView] = useState<UniView>("home");
    const [forbidden, setForbidden] = useState(false);

    useEffect(() => {
        void fetchEntries();
        void fetchFypEntries();
    }, []);

    const fetchEntries = async () => {
        try {
            setLoading(true);
            const response = await authenticatedFetch("/api/v1/paths/course-projects/university");
            if (response?.status === 403) {
                setForbidden(true);
                setEntries([]);
            } else if (response?.ok) {
                const data = await response.json();
                setEntries(Array.isArray(data.data) ? data.data : []);
            } else {
                toast.error("Failed to load the university showcase");
                setEntries([]);
            }
        } catch {
            toast.error("Failed to load the university showcase");
            setEntries([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchFypEntries = async () => {
        try {
            setFypLoading(true);
            const response = await authenticatedFetch("/api/v1/paths/fyp-thesis/university");
            if (response?.ok) {
                const data = await response.json();
                setFypEntries(Array.isArray(data.data) ? data.data : []);
            } else {
                setFypEntries([]);
            }
        } catch {
            setFypEntries([]);
        } finally {
            setFypLoading(false);
        }
    };

    const approved = useMemo(() => entries.filter(isFacultyApproved), [entries]);
    const waiting = useMemo(() => entries.filter(isPathEntryWaiting), [entries]);
    const approvedFyp = useMemo(() => fypEntries.filter(isPathEntryApproved), [fypEntries]);
    const waitingFyp = useMemo(() => fypEntries.filter(isPathEntryWaiting), [fypEntries]);
    const fypSchools = useMemo(
        () => [...new Set(approvedFyp.map((e) => e.projectInfo?.school || e.student?.department).filter(Boolean))].length,
        [approvedFyp],
    );
    const avg = useMemo(() => {
        if (!approved.length) return 0;
        return Math.round(approved.reduce((s, e) => s + computeMeritScorecard(e).total, 0) / approved.length);
    }, [approved]);

    const q = searchQuery.toLowerCase();
    const coursePool = view === "pending" ? waiting : approved;
    const filteredCourse = coursePool.filter((entry) => {
        if (!q) return true;
        return (
            entry.student?.name?.toLowerCase().includes(q) ||
            entry.student?.email?.toLowerCase().includes(q) ||
            entry.projectTitle?.toLowerCase().includes(q) ||
            entry.course?.toLowerCase().includes(q)
        );
    });
    const fypPool = view === "pending" ? waitingFyp : approvedFyp;
    const filteredFyp = fypPool.filter((entry) => {
        if (!q) return true;
        return (
            entry.student?.name?.toLowerCase().includes(q) ||
            entry.student?.email?.toLowerCase().includes(q) ||
            entry.projectInfo?.title?.toLowerCase().includes(q) ||
            entry.projectTitle?.toLowerCase().includes(q)
        );
    });

    const crumbView = mode === "fyp-thesis" ? (view === "home" ? "FYP / Thesis" : `FYP / Thesis · ${view}`) : view === "home" ? undefined : view;
    const activeLoading = mode === "course-project" ? loading : fypLoading;

    if (forbidden) {
        return (
            <div className="mx-auto max-w-2xl space-y-4 p-4">
                <Link
                    href="/dashboard/partner"
                    className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Partner dashboard
                </Link>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
                    The university showcase is only available for university partner accounts.
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fcfd] px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[1040px] space-y-4">
                <CourseworkCrumb role="University" view={crumbView} pathLabel={mode === "fyp-thesis" ? "FYP / Thesis" : "Coursework"} />
                {view === "home" && (mode === "course-project" ? (
                    <CourseworkHero
                        kicker="UNIVERSITY · COURSEWORK"
                        title="Your coursework, verified & rankable 🏛️"
                        subtitle="Submitted cards wait for faculty. Approved cards are the live institutional deck."
                        gradient="linear-gradient(115deg,#1e1b4b,#4338ca 60%,#818cf8 115%)"
                        stats={[
                            { value: String(waiting.length), label: "WAITING" },
                            { value: String(approved.length), label: "APPROVED CARDS" },
                            { value: approved.length ? String(avg) : "—", label: "AVG /100" },
                        ]}
                    />
                ) : (
                    <CourseworkHero
                        kicker="UNIVERSITY · FYP / THESIS"
                        title="Your theses, verified & rankable 🏛️"
                        subtitle="Submitted records wait for supervisor sign-off. Approved cards are the live university deck."
                        gradient="linear-gradient(115deg,#1e1b4b,#4338ca 60%,#818cf8 115%)"
                        stats={[
                            { value: String(waitingFyp.length), label: "WAITING" },
                            { value: String(approvedFyp.length), label: "APPROVED & LIVE" },
                            { value: String(fypSchools || "—"), label: "SCHOOLS" },
                        ]}
                    />
                ))}

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex gap-2">
                        {([
                            { key: "course-project" as const, label: "Course Projects" },
                            { key: "fyp-thesis" as const, label: "FYP / Thesis" },
                        ]).map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => {
                                    setMode(tab.key);
                                    setView("home");
                                    setSearchQuery("");
                                }}
                                className={clsx(
                                    "rounded-full border-2 px-4 py-2 text-xs font-bold transition-colors",
                                    mode === tab.key ? "border-ciel-navy bg-ciel-navy text-white" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300",
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {view !== "home" && <HubBackButton onClick={() => setView("home")} label="← Back to showcase" />}

                {view === "home" && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <HubTile
                            onClick={() => setView("pending")}
                            badge={`${mode === "course-project" ? waiting.length : waitingFyp.length} IN QUEUE`}
                            badgeClass="text-[#b45309]"
                            emoji="⏳"
                            title="Waiting for Approval"
                            subtitle={
                                mode === "course-project"
                                    ? "Submitted coursework still waiting for faculty approval."
                                    : "Submitted FYP / thesis records still waiting for supervisor sign-off."
                            }
                            background="linear-gradient(135deg,#b45309,#fbbf24)"
                        />
                        <HubTile
                            onClick={() => setView("deck")}
                            badge={`${mode === "course-project" ? approved.length : approvedFyp.length} LIVE`}
                            badgeClass="text-[#0e7d74]"
                            emoji="⭐"
                            title="Approved flash cards"
                            subtitle="Faculty-approved cards only — the live institutional deck."
                            background="linear-gradient(135deg,#0e7d74,#2dd4bf)"
                        />
                        <HubTile
                            onClick={() => setView("rank")}
                            badge="SAME FORMULA"
                            badgeClass="text-[#6d28d9]"
                            emoji="🧠"
                            title={mode === "course-project" ? "AI Analyzer — rank this university" : "Merit model — rank this deck"}
                            subtitle="Approved cards only. Waiting submissions stay out of the live ranking."
                            background="linear-gradient(135deg,#6d28d9,#a78bfa)"
                        />
                    </div>
                )}

                {(view === "pending" || view === "deck") && (
                    <div className="relative max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={mode === "course-project" ? "Search by student, course, or title…" : "Search by student or title…"}
                            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-blue-400"
                        />
                    </div>
                )}

                {mode === "course-project" && view === "rank" &&
                    (loading ? (
                        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
                    ) : approved.length === 0 ? (
                        <EmptyUni />
                    ) : (
                        <MeritModelPanel entries={approved} showDepartmentFilter showFacultyFilter meritEndpoint="/api/v1/paths/course-projects/merit-model" scopeName="This university" />
                    ))}

                {mode === "fyp-thesis" && view === "rank" &&
                    (fypLoading ? (
                        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
                    ) : approvedFyp.length === 0 ? (
                        <EmptyUni message="Approved FYP / thesis cards will appear here after supervisor sign-off." />
                    ) : (
                        <FypMeritPanel entries={approvedFyp} showSchoolFilter meritEndpoint="/api/v1/paths/fyp-thesis/merit-model" />
                    ))}

                {mode === "course-project" && (view === "pending" || view === "deck") &&
                    (loading ? (
                        <SkeletonList />
                    ) : filteredCourse.length === 0 ? (
                        <EmptyUni
                            match={coursePool.length > 0}
                            message={
                                view === "pending"
                                    ? "No submitted coursework is waiting for faculty approval."
                                    : "Approved coursework cards will appear here after faculty review."
                            }
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {filteredCourse.map((entry) => (
                                <CourseworkCard key={entry.id} entry={entry} studentName={entry.student?.name} />
                            ))}
                        </div>
                    ))}

                {mode === "fyp-thesis" && (view === "pending" || view === "deck") &&
                    (activeLoading ? (
                        <SkeletonList />
                    ) : filteredFyp.length === 0 ? (
                        <EmptyUni
                            match={fypPool.length > 0}
                            message={
                                view === "pending"
                                    ? "No submitted FYP / thesis records are waiting for supervisor approval."
                                    : "Approved FYP / thesis cards will appear here after supervisor sign-off."
                            }
                        />
                    ) : (
                        <div className="space-y-4">
                            {filteredFyp.map((entry) => (
                                <ThesisCard key={entry.id} entry={entry} studentName={entry.student?.name} />
                            ))}
                        </div>
                    ))}
            </div>
        </div>
    );
}

function SkeletonList() {
    return (
        <div className="space-y-4">
            {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
            ))}
        </div>
    );
}

function EmptyUni({ match = false, message }: { match?: boolean; message?: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
            <p className="text-base font-bold text-slate-800">No showcase cards yet</p>
            <p className="mt-1.5 text-sm text-slate-500">
                {match ? "No reports match your search." : message || "Submitted reports from your university's students will appear here."}
            </p>
        </div>
    );
}
