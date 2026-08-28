"use client";

import { useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import { Search } from "lucide-react";
import CourseworkCard from "@/components/ciel/CourseworkCard";
import MeritModelPanel, { type MeritEntry } from "@/components/ciel/MeritModelPanel";
import { CourseworkCrumb, CourseworkHero, HubBackButton, HubTile } from "@/components/ciel/coursework/CourseworkHubChrome";
import CourseworkFacultyReviewInbox from "@/components/ciel/coursework/CourseworkFacultyReviewInbox";
import { isFacultyApproved, pendingFacultyReview } from "@/utils/courseworkSectionReview";

type FacView = "home" | "review" | "rank" | "deck";

export default function FacultyCourseworkProjectsPage() {
    const [entries, setEntries] = useState<MeritEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [reviewingId, setReviewingId] = useState<string | null>(null);
    const [view, setView] = useState<FacView>("home");

    useEffect(() => {
        void fetchEntries();
    }, []);

    const fetchEntries = async () => {
        try {
            setLoading(true);
            const response = await authenticatedFetch("/api/v1/paths/course-projects/supervised");
            if (response?.ok) {
                const data = await response.json();
                setEntries(Array.isArray(data.data) ? data.data : []);
            } else {
                toast.error("Failed to load coursework reports");
                setEntries([]);
            }
        } catch {
            toast.error("Failed to load coursework reports");
            setEntries([]);
        } finally {
            setLoading(false);
        }
    };

    const reviewEntry = async (id: string, action: "approve" | "reject" | "revision", note?: string) => {
        setReviewingId(id);
        try {
            const response = await authenticatedFetch(`/api/v1/paths/course-projects/${id}/faculty-review`, {
                method: "PATCH",
                body: JSON.stringify({ action, note }),
            });
            if (response?.ok) {
                const data = await response.json();
                setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...data.data } : e)));
                toast.success(
                    action === "approve"
                        ? "Approved — reflected on student, university and CIEL decks. No score given."
                        : action === "revision"
                          ? "Sent back for revision — student can fix and resubmit."
                          : "Rejected — student can fix and resubmit if allowed.",
                );
            } else {
                toast.error("Could not save your review");
            }
        } catch {
            toast.error("Could not save your review");
        } finally {
            setReviewingId(null);
        }
    };

    const pending = useMemo(() => entries.filter(pendingFacultyReview), [entries]);
    const approved = useMemo(() => entries.filter(isFacultyApproved), [entries]);

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
    const filteredApproved = approved.filter((entry) => filtered.includes(entry));

    return (
        <div className="min-h-screen bg-[#f8fcfd] px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[1040px] space-y-4">
                <CourseworkCrumb role="Faculty" view={view === "home" ? undefined : view} />
                <CourseworkHero
                    kicker="FACULTY · COURSEWORK"
                    title="Your cohort, your call 🧑‍🏫"
                    subtitle="Flash cards arrive with evidence; each section is analysed — no scores. You approve, then run the Analyzer."
                    gradient="linear-gradient(115deg,#04252b,#0e5f63 55%,#0e7d74 115%)"
                    stats={[
                        { value: String(pending.length), label: "TO REVIEW" },
                        { value: String(approved.length), label: "APPROVED" },
                        { value: "🧠", label: "ASSISTS — NEVER SCORES" },
                    ]}
                />

                {view !== "home" && <HubBackButton onClick={() => setView("home")} />}

                {view === "home" && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <HubTile
                            onClick={() => setView("review")}
                            badge={pending.length ? `${pending.length} TO REVIEW` : "INBOX"}
                            emoji="⭐"
                            title="Review flash cards"
                            subtitle="Full card + evidence + section-by-section analysis. No scores — you decide."
                            background="linear-gradient(135deg,#0e7d74,#2dd4bf)"
                        />
                        <HubTile
                            onClick={() => setView("rank")}
                            badge="STANDARD RUBRIC"
                            emoji="🧠"
                            title="AI Analyzer — my cohort"
                            subtitle="Rank your approved cards best → least, reasons included."
                            background="linear-gradient(135deg,#6d28d9,#a78bfa)"
                        />
                        <HubTile
                            onClick={() => setView("deck")}
                            badge={`${approved.length} CARDS`}
                            emoji="🗂"
                            title="My approved dashboard"
                            subtitle="Approved cards — reflected onward to university & CIEL PK automatically."
                            background="linear-gradient(135deg,#04252b,#0e7d74)"
                        />
                    </div>
                )}

                {view === "review" && (
                    loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
                            ))}
                        </div>
                    ) : (
                        <CourseworkFacultyReviewInbox entries={entries} reviewingId={reviewingId} onReview={reviewEntry} />
                    )
                )}

                {view === "rank" && (
                    loading ? (
                        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
                    ) : approved.length === 0 ? (
                        <EmptyDeck message="Approve at least one submitted card to run the Analyzer." />
                    ) : (
                        <MeritModelPanel entries={approved} meritEndpoint="/api/v1/paths/course-projects/merit-model" scopeName="Your cohort" />
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
                        ) : filteredApproved.length === 0 ? (
                            <EmptyDeck message={approved.length === 0 ? "Approved cards will appear here after you review them." : "No reports match your search."} />
                        ) : (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {filteredApproved.map((entry) => (
                                    <CourseworkCard key={entry.id} entry={entry} studentName={entry.student?.name} />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function EmptyDeck({ message = "Students who list your email as their supervisor will appear here once they submit." }: { message?: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
            <p className="text-base font-bold text-slate-800">No coursework reports yet</p>
            <p className="mt-1.5 text-sm text-slate-500">{message}</p>
        </div>
    );
}
