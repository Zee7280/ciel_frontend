"use client";

import { useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import { Search } from "lucide-react";
import clsx from "clsx";
import CourseworkCard from "@/components/ciel/CourseworkCard";
import MeritModelPanel, { type MeritEntry } from "@/components/ciel/MeritModelPanel";
import ThesisCard from "@/components/ciel/ThesisCard";
import FypMeritPanel, { type FypMeritEntry } from "@/components/ciel/FypMeritPanel";
import { CourseworkCrumb, CourseworkHero, HubBackButton, HubTile } from "@/components/ciel/coursework/CourseworkHubChrome";
import { isFacultyApproved } from "@/utils/courseworkSectionReview";
import { computeMeritScorecard } from "@/utils/courseworkMeritModel";

type DeckMode = "course-project" | "fyp-thesis";
type UniView = "home" | "deck" | "rank";

export default function UniversityShowcasePage() {
    const [mode, setMode] = useState<DeckMode>("course-project");
    const [entries, setEntries] = useState<MeritEntry[]>([]);
    const [fypEntries, setFypEntries] = useState<FypMeritEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [fypLoading, setFypLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [showMeritModel, setShowMeritModel] = useState(false);
    const [view, setView] = useState<UniView>("home");

    useEffect(() => {
        void fetchEntries();
        void fetchFypEntries();
    }, []);

    const fetchEntries = async () => {
        try {
            setLoading(true);
            const response = await authenticatedFetch("/api/v1/paths/course-projects/university");
            if (response?.ok) {
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

    const filtered = entries.filter((entry) => {
        const q = searchQuery.toLowerCase();
        if (!q) return true;
        return (
            entry.student?.name?.toLowerCase().includes(q) ||
            entry.student?.email?.toLowerCase().includes(q) ||
            entry.projectTitle?.toLowerCase().includes(q) ||
            entry.course?.toLowerCase().includes(q)
        );
    });

    const filteredFyp = fypEntries.filter((entry) => {
        const q = searchQuery.toLowerCase();
        if (!q) return true;
        return (
            entry.student?.name?.toLowerCase().includes(q) ||
            entry.student?.email?.toLowerCase().includes(q) ||
            entry.projectInfo?.title?.toLowerCase().includes(q) ||
            entry.projectTitle?.toLowerCase().includes(q)
        );
    });

    const approved = useMemo(() => entries.filter(isFacultyApproved), [entries]);
    const depts = useMemo(
        () => [...new Set(approved.map((e) => e.student?.department || e.studentInfo?.department).filter(Boolean))].length,
        [approved],
    );
    const avg = useMemo(() => {
        if (!approved.length) return 0;
        return Math.round(approved.reduce((s, e) => s + computeMeritScorecard(e).total, 0) / approved.length);
    }, [approved]);

    const activeCount = mode === "course-project" ? entries.length : fypEntries.length;
    const activeLoading = mode === "course-project" ? loading : fypLoading;

    return (
        <div className="min-h-screen bg-[#f8fcfd] px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[1040px] space-y-4">
                <CourseworkCrumb role="University" view={mode === "fyp-thesis" ? "FYP / Thesis" : view === "home" ? undefined : view} />
                {mode === "course-project" ? (
                    <CourseworkHero
                        kicker="UNIVERSITY · COURSEWORK"
                        title="Your coursework, verified & rankable 🏛️"
                        subtitle="Every submitted card from your students, filterable — then the same Analyzer everyone uses."
                        gradient="linear-gradient(115deg,#1e1b4b,#4338ca 60%,#818cf8 115%)"
                        stats={[
                            { value: String(approved.length), label: "APPROVED CARDS" },
                            { value: String(depts || "—"), label: "DEPARTMENTS" },
                            { value: approved.length ? String(avg) : "—", label: "AVG /100" },
                        ]}
                    />
                ) : (
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600">University</p>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">University showcase deck</h1>
                        <p className="mt-1.5 max-w-3xl text-sm text-slate-500">
                            Every submitted FYP / thesis record from students linked to your university, assembled automatically.
                        </p>
                    </div>
                )}

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
                                    setShowMeritModel(false);
                                    setView("home");
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
                    {mode === "fyp-thesis" && (
                        <button
                            type="button"
                            onClick={() => setShowMeritModel((v) => !v)}
                            disabled={!activeCount}
                            className="ciel-transition inline-flex shrink-0 items-center gap-2 rounded-xl bg-ciel-purple px-5 py-2.5 text-sm font-bold text-white hover:bg-ciel-purple/90 disabled:opacity-50"
                        >
                            🧮 {showMeritModel ? "Hide merit model" : "Merit model — rank this deck"}
                        </button>
                    )}
                </div>

                {mode === "course-project" ? (
                    <>
                        {view !== "home" && <HubBackButton onClick={() => setView("home")} />}
                        {view === "home" && (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <HubTile
                                    onClick={() => setView("deck")}
                                    badge="FILTERS OPEN"
                                    emoji="⭐"
                                    title="All flash cards"
                                    subtitle="Department, faculty, format, timeline — the whole institutional deck."
                                    background="linear-gradient(135deg,#0e7d74,#2dd4bf)"
                                />
                                <HubTile
                                    onClick={() => setView("rank")}
                                    badge="SAME FORMULA"
                                    emoji="🧠"
                                    title="AI Analyzer — rank this university"
                                    subtitle="Identical rubric to every level. Reasons for every position."
                                    background="linear-gradient(135deg,#6d28d9,#a78bfa)"
                                />
                            </div>
                        )}
                        {view === "rank" && (
                            loading ? (
                                <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
                            ) : entries.length === 0 ? (
                                <EmptyUni />
                            ) : (
                                <MeritModelPanel entries={entries} showDepartmentFilter showFacultyFilter meritEndpoint="/api/v1/paths/course-projects/merit-model" scopeName="This university" />
                            )
                        )}
                        {view === "deck" && (
                            <>
                                <div className="relative max-w-sm">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by student, course, or title…"
                                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-blue-400"
                                    />
                                </div>
                                {loading ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
                                        ))}
                                    </div>
                                ) : filtered.length === 0 ? (
                                    <EmptyUni match={entries.length > 0} />
                                ) : (
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        {filtered.map((entry) => (
                                            <CourseworkCard key={entry.id} entry={entry} studentName={entry.student?.name} />
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </>
                ) : (
                    <>
                        {showMeritModel && !activeLoading && activeCount > 0 && (
                            <FypMeritPanel entries={fypEntries} showSchoolFilter meritEndpoint="/api/v1/paths/fyp-thesis/merit-model" />
                        )}
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
                        {fypLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
                                ))}
                            </div>
                        ) : filteredFyp.length === 0 ? (
                            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
                                <p className="text-base font-bold text-slate-800">No FYP / thesis cards yet</p>
                                <p className="mt-1.5 text-sm text-slate-500">
                                    {fypEntries.length === 0
                                        ? "Submitted FYP / thesis records from your university's students will appear here."
                                        : "No records match your search."}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredFyp.map((entry) => (
                                    <ThesisCard key={entry.id} entry={entry} studentName={entry.student?.name} />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function EmptyUni({ match = false }: { match?: boolean }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
            <p className="text-base font-bold text-slate-800">No showcase cards yet</p>
            <p className="mt-1.5 text-sm text-slate-500">
                {match ? "No reports match your search." : "Submitted coursework reports from your university's students will appear here."}
            </p>
        </div>
    );
}
