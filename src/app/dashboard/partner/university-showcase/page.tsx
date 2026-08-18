"use client";

import { useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import { Search, Sparkles, Trophy } from "lucide-react";
import clsx from "clsx";
import CourseworkCard from "@/components/ciel/CourseworkCard";
import { type CourseProjectEntry, resolveSectionSummaries } from "@/utils/courseProjectTypes";

interface ShowcaseEntry extends CourseProjectEntry {
    student?: { id: string; name: string; email: string; institution?: string; department?: string } | null;
}

interface CuratorResult {
    ranking: { id: string; score: number }[];
    top3: { id: string; reason: string }[];
    pattern: string;
}

/** Deck-level evidence/initiative/impact/reflection flags — same weights the AI Curator scores on,
 * computed here so the prompt gets a compact, consistent signal instead of the raw report. */
function cardSignals(entry: ShowcaseEntry) {
    const rm = entry.resultsInfo || {};
    const sm = entry.sdgMapping || {};
    const summaries = resolveSectionSummaries(entry);
    return {
        id: entry.id,
        title: entry.projectTitle || "Untitled",
        one: summaries.results || summaries.aims || "",
        proof: rm.findings?.[0] || rm.measurableImpact || "",
        evidenceAttached: (entry.evidenceUrls?.length ?? 0) > 0,
        studentInitiated: sm.origin?.includes("own idea") ?? false,
        impactShown: !!rm.measurableImpact,
        reflectionDepth: entry.reflectionInfo?.lessonLearned ? (entry.reflectionInfo?.sdgLinkHonesty?.includes("Real —") ? 3 : 2) : 1,
    };
}

export default function UniversityShowcasePage() {
    const [entries, setEntries] = useState<ShowcaseEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [curating, setCurating] = useState(false);
    const [curator, setCurator] = useState<CuratorResult | null>(null);
    const [curatorError, setCuratorError] = useState<string | null>(null);

    useEffect(() => {
        void fetchEntries();
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

    const rankMap = useMemo(() => new Map((curator?.ranking ?? []).map((r) => [r.id, r.score])), [curator]);
    const top3Map = useMemo(() => new Map((curator?.top3 ?? []).map((t) => [t.id, t.reason])), [curator]);
    const ranked = useMemo(() => {
        if (!curator) return filtered;
        return [...filtered].sort((a, b) => (rankMap.get(b.id ?? "") ?? 0) - (rankMap.get(a.id ?? "") ?? 0));
    }, [filtered, curator, rankMap]);

    const runCurator = async () => {
        if (!entries.length) return;
        setCurating(true);
        setCuratorError(null);
        try {
            const res = await authenticatedFetch("/api/ai/summarize", {
                method: "POST",
                body: JSON.stringify({ section: "course_project_curator", data: { cards: entries.map(cardSignals) } }),
            });
            const result = res?.ok ? await res.json() : null;
            if (!result?.summary) throw new Error("Curator did not return a result");
            const parsed = JSON.parse(result.summary) as CuratorResult;
            setCurator(parsed);
        } catch {
            setCuratorError("Could not rank the deck right now. Try again in a moment.");
        } finally {
            setCurating(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f7f9fc] px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600">University</p>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                            University showcase deck
                        </h1>
                        <p className="mt-1.5 max-w-3xl text-sm text-slate-500">
                            Every submitted coursework report from students linked to your university, assembled automatically — nothing uploaded twice.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={runCurator}
                        disabled={curating || !entries.length}
                        className="ciel-transition inline-flex shrink-0 items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-50"
                    >
                        <Sparkles className="h-4 w-4" /> {curating ? "Ranking…" : "Rank this deck — AI Curator"}
                    </button>
                </div>

                {curatorError && <p className="text-xs font-semibold text-red-600">{curatorError}</p>}

                {curator && (
                    <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4 text-sm text-purple-900">
                        <p className="font-bold">🧮 Curated with public criteria:</p>
                        <p className="mt-1 text-xs leading-relaxed">
                            Evidence attached &amp; verifiable <b>30%</b> · Student-initiated SDG link <b>25%</b> · Impact shown, not claimed <b>25%</b> · Reflection depth &amp; honesty <b>20%</b>. Never ranked on writing style or English fluency.
                        </p>
                        <p className="mt-2 text-xs leading-relaxed">🤖 <b>Pattern the Curator sees:</b> {curator.pattern}</p>
                    </div>
                )}

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
                    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
                        <p className="text-base font-bold text-slate-800">No showcase cards yet</p>
                        <p className="mt-1.5 text-sm text-slate-500">
                            {entries.length === 0
                                ? "Submitted coursework reports from your university's students will appear here."
                                : "No reports match your search."}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {ranked.map((entry, i) => {
                            const score = rankMap.get(entry.id ?? "");
                            const reason = top3Map.get(entry.id ?? "");
                            return (
                                <div key={entry.id} className={clsx("relative rounded-2xl", reason && "ring-2 ring-purple-300")}>
                                    {reason && (
                                        <div className="absolute -top-2.5 left-4 z-10 flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-600 to-purple-400 px-3 py-1 text-[10px] font-black text-white shadow">
                                            <Trophy className="h-3 w-3" /> AI PICK #{i + 1}
                                        </div>
                                    )}
                                    <CourseworkCard entry={entry} studentName={entry.student?.name} />
                                    {reason && (
                                        <p className="mt-1 rounded-b-2xl border border-t-0 border-purple-200 bg-purple-50 px-4 py-2 text-xs font-semibold text-purple-800">
                                            🤖 AI Pick because: {reason}
                                        </p>
                                    )}
                                    {score != null && !reason && (
                                        <p className="mt-1 text-right text-[11px] font-bold text-purple-600">🧮 {score}/100</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
