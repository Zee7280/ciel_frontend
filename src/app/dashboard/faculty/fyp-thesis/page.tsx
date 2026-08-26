"use client";

import { useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import { Search } from "lucide-react";
import ThesisCard from "@/components/ciel/ThesisCard";
import FypMeritPanel, { type FypMeritEntry } from "@/components/ciel/FypMeritPanel";
import { CourseworkCrumb, CourseworkHero, HubBackButton, HubTile } from "@/components/ciel/coursework/CourseworkHubChrome";
import { isPathEntryApproved, isPathEntryWaiting } from "@/utils/reviewQueue";

type FacView = "home" | "pending" | "approved" | "rank";

export default function FacultyFypThesisPage() {
    const [entries, setEntries] = useState<FypMeritEntry[]>([]);
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
            const response = await authenticatedFetch("/api/v1/paths/fyp-thesis/supervised");
            if (response?.ok) {
                const data = await response.json();
                setEntries(Array.isArray(data.data) ? data.data : []);
            } else {
                toast.error("Failed to load FYP / thesis records");
                setEntries([]);
            }
        } catch {
            toast.error("Failed to load FYP / thesis records");
            setEntries([]);
        } finally {
            setLoading(false);
        }
    };

    const reviewEntry = async (id: string, action: "approve" | "reject") => {
        setReviewingId(id);
        try {
            const response = await authenticatedFetch(`/api/v1/paths/fyp-thesis/${id}/supervisor-review`, {
                method: "PATCH",
                body: JSON.stringify({ action }),
            });
            if (response?.ok) {
                const data = await response.json();
                setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...data.data } : e)));
                toast.success(action === "approve" ? "Approved — now live in Merit Model rankings" : "Changes requested — student will see this on their draft");
            } else {
                toast.error("Could not save your review");
            }
        } catch {
            toast.error("Could not save your review");
        } finally {
            setReviewingId(null);
        }
    };

    const waiting = useMemo(() => entries.filter(isPathEntryWaiting), [entries]);
    const approved = useMemo(() => entries.filter(isPathEntryApproved), [entries]);

    const matchesSearch = (entry: FypMeritEntry) => {
        const q = searchQuery.toLowerCase();
        if (!q) return true;
        return (
            entry.student?.name?.toLowerCase().includes(q) ||
            entry.student?.email?.toLowerCase().includes(q) ||
            entry.projectInfo?.title?.toLowerCase().includes(q) ||
            entry.projectTitle?.toLowerCase().includes(q)
        );
    };
    const filteredWaiting = waiting.filter(matchesSearch);
    const filteredApproved = approved.filter(matchesSearch);

    return (
        <div className="min-h-screen bg-[#f7f9fc] px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[1040px] space-y-4">
                <CourseworkCrumb role="Faculty" view={view === "home" ? undefined : view} pathLabel="FYP / Thesis" />
                <CourseworkHero
                    kicker="FACULTY · FYP / THESIS"
                    title="Supervise, then make it live 🧑‍🎓"
                    subtitle="Submitted records wait here until you approve. Approved cards move to the live deck and merit rankings."
                    gradient="linear-gradient(115deg,#04252b,#0e5f63 55%,#0e7d74 115%)"
                    stats={[
                        { value: String(waiting.length), label: "WAITING FOR YOU" },
                        { value: String(approved.length), label: "APPROVED & LIVE" },
                        { value: String(entries.length), label: "ALL RECORDS" },
                    ]}
                />

                {view !== "home" && <HubBackButton onClick={() => setView("home")} />}

                {view === "home" && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <HubTile
                            onClick={() => setView("pending")}
                            badge={waiting.length ? `${waiting.length} IN QUEUE` : "INBOX"}
                            emoji="⏳"
                            title="Waiting for Approval"
                            subtitle="Submitted FYP / thesis records that still need your supervisor sign-off."
                            background="linear-gradient(135deg,#b45309,#fbbf24)"
                        />
                        <HubTile
                            onClick={() => setView("approved")}
                            badge={`${approved.length} LIVE`}
                            emoji="✅"
                            title="Approved FYP / Thesis"
                            subtitle="Records you already approved — live on student, university and CIEL decks."
                            background="linear-gradient(135deg,#04252b,#0e7d74)"
                        />
                        <HubTile
                            onClick={() => setView("rank")}
                            badge="STANDARD RUBRIC"
                            emoji="🧮"
                            title="Merit model — my supervisees"
                            subtitle="Rank approved records. Waiting submissions stay out of the live picks."
                            background="linear-gradient(135deg,#6d28d9,#a78bfa)"
                        />
                    </div>
                )}

                {(view === "pending" || view === "approved") && (
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
                )}

                {view === "pending" &&
                    (loading ? (
                        <SkeletonList />
                    ) : filteredWaiting.length === 0 ? (
                        <EmptyFyp
                            message={
                                waiting.length === 0
                                    ? "Nothing waiting. Submitted records appear here until you approve them."
                                    : "No records match your search."
                            }
                        />
                    ) : (
                        <div className="space-y-4">
                            {filteredWaiting.map((entry) => (
                                <ThesisCard
                                    key={entry.id}
                                    entry={entry}
                                    studentName={entry.student?.name}
                                    onSupervisorReview={entry.id ? (action) => reviewEntry(entry.id!, action) : undefined}
                                    reviewing={reviewingId === entry.id}
                                />
                            ))}
                        </div>
                    ))}

                {view === "approved" &&
                    (loading ? (
                        <SkeletonList />
                    ) : filteredApproved.length === 0 ? (
                        <EmptyFyp
                            message={
                                approved.length === 0
                                    ? "Approved records appear here after you sign them off."
                                    : "No records match your search."
                            }
                        />
                    ) : (
                        <div className="space-y-4">
                            {filteredApproved.map((entry) => (
                                <ThesisCard key={entry.id} entry={entry} studentName={entry.student?.name} />
                            ))}
                        </div>
                    ))}

                {view === "rank" &&
                    (loading ? (
                        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
                    ) : approved.length === 0 ? (
                        <EmptyFyp message="Approve at least one submitted record to run the merit model." />
                    ) : (
                        <FypMeritPanel entries={approved} meritEndpoint="/api/v1/paths/fyp-thesis/merit-model" />
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

function EmptyFyp({ message }: { message: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
            <p className="text-base font-bold text-slate-800">No FYP / thesis records yet</p>
            <p className="mt-1.5 text-sm text-slate-500">{message}</p>
        </div>
    );
}
