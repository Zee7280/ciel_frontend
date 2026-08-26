"use client";

import { useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { CourseworkCrumb, CourseworkHero, HubBackButton, HubTile } from "@/components/ciel/coursework/CourseworkHubChrome";
import { isPathEntryApproved, isPathEntryWaiting } from "@/utils/reviewQueue";

type FacView = "home" | "pending" | "approved";

type FacultyVenture = {
    id?: string;
    ventureName?: string | null;
    stage?: string | null;
    status?: "draft" | "submitted";
    stepCompleted?: number;
    academicSetup?: { supervisorName?: string; supervisorEmail?: string; university?: string; department?: string } | null;
    ideaInfo?: { sector?: string; city?: string; pitch?: string } | null;
    reviewPipeline?: { supervisorStatus?: string | null; supervisorNote?: string | null } | null;
    gates?: { academicOk: boolean; showcaseOk: boolean; investmentReadyOk: boolean };
    student?: { name?: string; email?: string } | null;
};

export default function FacultyStartupBusinessPage() {
    const [entries, setEntries] = useState<FacultyVenture[]>([]);
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
            const response = await authenticatedFetch("/api/v1/paths/startup-business/supervised");
            if (response?.ok) {
                const data = await response.json();
                setEntries(Array.isArray(data.data) ? data.data : []);
            } else {
                toast.error("Failed to load startup / business records");
                setEntries([]);
            }
        } catch {
            toast.error("Failed to load startup / business records");
            setEntries([]);
        } finally {
            setLoading(false);
        }
    };

    const reviewEntry = async (id: string, action: "approve" | "reject") => {
        setReviewingId(id);
        try {
            const response = await authenticatedFetch(`/api/v1/paths/startup-business/${id}/supervisor-review`, {
                method: "PATCH",
                body: JSON.stringify({ action }),
            });
            if (response?.ok) {
                const data = await response.json();
                setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...data.data } : e)));
                toast.success(
                    action === "approve"
                        ? "Approved — the venture can now clear the supervisor gate."
                        : "Changes requested — the student will see this on their draft.",
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

    const waiting = useMemo(() => entries.filter(isPathEntryWaiting), [entries]);
    const approved = useMemo(() => entries.filter(isPathEntryApproved), [entries]);

    const matchesSearch = (entry: FacultyVenture) => {
        const q = searchQuery.toLowerCase();
        if (!q) return true;
        return (
            entry.student?.name?.toLowerCase().includes(q) ||
            entry.student?.email?.toLowerCase().includes(q) ||
            entry.ventureName?.toLowerCase().includes(q) ||
            entry.ideaInfo?.sector?.toLowerCase().includes(q)
        );
    };
    const filteredWaiting = waiting.filter(matchesSearch);
    const filteredApproved = approved.filter(matchesSearch);

    return (
        <div className="min-h-screen bg-[#f8fcfd] px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[1040px] space-y-4">
                <CourseworkCrumb role="Faculty" view={view === "home" ? undefined : view} pathLabel="Startup / Business" />
                <CourseworkHero
                    kicker="FACULTY · STARTUP / BUSINESS"
                    title="Supervise, then make it live 💼"
                    subtitle="Submitted ventures wait here until you approve. Approved cards move to the live deck."
                    gradient="linear-gradient(115deg,#04252b,#b45309 55%,#f59e0b 110%)"
                    stats={[
                        { value: String(waiting.length), label: "WAITING FOR YOU" },
                        { value: String(approved.length), label: "APPROVED & LIVE" },
                        { value: String(entries.length), label: "ALL RECORDS" },
                    ]}
                />

                {view !== "home" && <HubBackButton onClick={() => setView("home")} />}

                {view === "home" && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <HubTile
                            onClick={() => setView("pending")}
                            badge={waiting.length ? `${waiting.length} IN QUEUE` : "INBOX"}
                            emoji="⏳"
                            title="Waiting for Approval"
                            subtitle="Submitted ventures that still need your supervisor sign-off."
                            background="linear-gradient(135deg,#b45309,#fbbf24)"
                        />
                        <HubTile
                            onClick={() => setView("approved")}
                            badge={`${approved.length} LIVE`}
                            emoji="✅"
                            title="Approved ventures"
                            subtitle="Records you already approved — live on student, university and CIEL decks."
                            background="linear-gradient(135deg,#04252b,#0e7d74)"
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
                            placeholder="Search by student or venture…"
                            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-blue-400"
                        />
                    </div>
                )}

                {view === "pending" &&
                    (loading ? (
                        <SkeletonList />
                    ) : filteredWaiting.length === 0 ? (
                        <EmptyVenture
                            message={
                                waiting.length === 0
                                    ? "Nothing waiting. Submitted ventures appear here until you approve them."
                                    : "No records match your search."
                            }
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {filteredWaiting.map((entry) => (
                                <VentureFacultyCard
                                    key={entry.id}
                                    entry={entry}
                                    onReview={entry.id ? (action) => reviewEntry(entry.id!, action) : undefined}
                                    reviewing={reviewingId === entry.id}
                                />
                            ))}
                        </div>
                    ))}

                {view === "approved" &&
                    (loading ? (
                        <SkeletonList />
                    ) : filteredApproved.length === 0 ? (
                        <EmptyVenture
                            message={
                                approved.length === 0
                                    ? "Approved ventures appear here after you sign them off."
                                    : "No records match your search."
                            }
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {filteredApproved.map((entry) => (
                                <VentureFacultyCard key={entry.id} entry={entry} />
                            ))}
                        </div>
                    ))}
            </div>
        </div>
    );
}

function VentureFacultyCard({
    entry,
    onReview,
    reviewing = false,
}: {
    entry: FacultyVenture;
    onReview?: (action: "approve" | "reject") => void;
    reviewing?: boolean;
}) {
    const gates = entry.gates || { academicOk: false, showcaseOk: false, investmentReadyOk: false };
    const student = entry.student?.name || "Student";
    const meta = [student, entry.stage, entry.ideaInfo?.sector, entry.ideaInfo?.city].filter(Boolean).join(" · ");
    const waiting = isPathEntryWaiting(entry);

    return (
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-[linear-gradient(130deg,#04252b,#b45309_55%,#f59e0b_120%)] px-4 py-3 text-white">
                <p className="text-[9px] font-extrabold tracking-[0.14em] text-white/80">
                    {(entry.academicSetup?.university || "University").toUpperCase()}
                    {entry.academicSetup?.department ? ` · ${entry.academicSetup.department.toUpperCase()}` : ""}
                </p>
                <h3 className="mt-1 text-sm font-extrabold leading-snug">{entry.ventureName || "Untitled venture"}</h3>
                <p className="mt-1 text-[11px] text-white/85">{meta}</p>
            </div>
            {entry.ideaInfo?.pitch ? (
                <p className="border-b border-slate-100 bg-[#fbf8f1] px-4 py-2.5 text-[12px] italic leading-relaxed text-slate-700">
                    {entry.ideaInfo.pitch}
                </p>
            ) : null}
            <div className="flex flex-wrap gap-1.5 px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${gates.academicOk ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>
                    {gates.academicOk ? "Academic complete" : "Academic incomplete"}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${waiting ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>
                    {waiting ? "Waiting for you" : "Supervisor approved"}
                </span>
            </div>
            {onReview && waiting ? (
                <div className="flex gap-2 border-t border-slate-100 px-4 py-3">
                    <button
                        type="button"
                        onClick={() => onReview("reject")}
                        disabled={reviewing}
                        className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                        Request changes
                    </button>
                    <button
                        type="button"
                        onClick={() => onReview("approve")}
                        disabled={reviewing}
                        className="rounded-lg bg-[#0e7d74] px-3 py-2 text-xs font-bold text-white hover:bg-[#0c6b64] disabled:opacity-50"
                    >
                        ✓ Approve — make live
                    </button>
                </div>
            ) : null}
        </article>
    );
}

function SkeletonList() {
    return (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
            ))}
        </div>
    );
}

function EmptyVenture({ message }: { message: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
            <p className="text-base font-bold text-slate-800">No startup / business records yet</p>
            <p className="mt-1.5 text-sm text-slate-500">{message}</p>
        </div>
    );
}
