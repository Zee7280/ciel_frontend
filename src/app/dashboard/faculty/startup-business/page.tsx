"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { ActionKpiGrid, CourseworkCrumb, CourseworkHero, HubBackButton, HubTile, PathSectionHead, WorkflowSteps, useFacultyHubView } from "@/components/ciel/coursework/CourseworkHubChrome";
import { isPathEntryApproved, isPathEntryWaiting } from "@/utils/reviewQueue";
import VentureMeritPanel, { type VentureMeritPanelEntry } from "@/components/ciel/VentureMeritPanel";
import { rankMovement } from "@/utils/courseProjectTypes";
import type { VentureMeritEntry } from "@/utils/ventureMeritModel";

const VENTURE_VIEWS = ["home", "pending", "approved", "rank"] as const;
type FacView = (typeof VENTURE_VIEWS)[number];
const VENTURE_BASE = "/dashboard/faculty/startup-business";

const BADGE_EMOJI: Record<string, string> = { Gold: "🥇", Silver: "🥈", Bronze: "🥉", Participant: "🎖️" };

type FacultyVenture = VentureMeritEntry & {
    status?: "draft" | "submitted";
    stepCompleted?: number;
    academicSetup?: (VentureMeritEntry["academicSetup"] & { supervisorName?: string; supervisorEmail?: string; university?: string; department?: string }) | null;
    ideaInfo?: (VentureMeritEntry["ideaInfo"] & { sector?: string; city?: string; pitch?: string }) | null;
    reviewPipeline?: (VentureMeritEntry["reviewPipeline"] & { supervisorNote?: string | null }) | null;
    gates?: { academicOk: boolean; showcaseOk: boolean; investmentReadyOk: boolean };
    student?: { id?: string; name?: string; email?: string; institution?: string; department?: string } | null;
    meritRibbon?: {
        rank: number;
        of: number;
        scope: string;
        total?: number;
        badgeLevel?: "Gold" | "Silver" | "Bronze" | "Participant";
        previousRank?: number | null;
        at: string;
    } | null;
};

export default function FacultyStartupBusinessPage() {
    return (
        <Suspense fallback={<div className="mx-auto max-w-[1240px] py-16 text-center text-sm text-[#71828e]">Loading ventures…</div>}>
            <FacultyStartupBusinessHub />
        </Suspense>
    );
}

function FacultyStartupBusinessHub() {
    const { view, homeHref } = useFacultyHubView(VENTURE_VIEWS, "home");
    const [entries, setEntries] = useState<FacultyVenture[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [reviewingId, setReviewingId] = useState<string | null>(null);

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

    const reviewEntry = async (id: string, action: "approve" | "reject" | "revision", note?: string) => {
        setReviewingId(id);
        try {
            const response = await authenticatedFetch(`/api/v1/paths/startup-business/${id}/supervisor-review`, {
                method: "PATCH",
                body: JSON.stringify({ action, note }),
            });
            if (response?.ok) {
                const data = await response.json();
                setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...data.data } : e)));
                toast.success(
                    action === "approve"
                        ? "Approved — the venture can now clear the supervisor gate."
                        : action === "revision"
                          ? "Revision requested — the student can fix and resubmit."
                          : "Rejected — the student can fix and resubmit if allowed.",
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
        <div>
            <div className="mx-auto max-w-[1240px] space-y-4">
                <CourseworkCrumb role="Faculty" view={view === "home" ? undefined : view} pathLabel="Startup / Business" />
                <CourseworkHero
                    kicker="FACULTY IMPACT DASHBOARD"
                    title="Startup / Business"
                    subtitle="Monitor student ventures, business plans, sustainability evidence and verified entrepreneurial impact."
                    stats={[
                        { value: String(waiting.length), label: "Awaiting Review" },
                        { value: String(approved.length), label: "Approved Ventures" },
                        { value: String(approved.length), label: "On Impact Wall" },
                    ]}
                />

                {view !== "home" && <HubBackButton href={homeHref} label="← Back to Startup / Business" />}

                {view === "home" && (
                    <>
                    <PathSectionHead
                        title="Startup / Business Management"
                        subtitle="Review business plans, venture evidence, student contribution, SDG linkage and impact outcomes."
                        pill="FACULTY VIEW"
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <HubTile
                            href={`${VENTURE_BASE}?view=pending`}
                            badge={waiting.length ? `${waiting.length} IN QUEUE` : "INBOX"}
                            emoji="⏳"
                            title="Waiting for Approval"
                            subtitle="Submitted ventures that still need your supervisor sign-off."
                            background="linear-gradient(135deg,#b45309,#fbbf24)"
                        />
                        <HubTile
                            href={`${VENTURE_BASE}?view=approved`}
                            badge={`${approved.length} LIVE`}
                            emoji="✅"
                            title="Approved ventures"
                            subtitle="Records you already approved — live on student, university and CIEL decks."
                            background="linear-gradient(135deg,#04252b,#0e7d74)"
                        />
                        <HubTile
                            href="/dashboard/faculty/impact"
                            badge={`${approved.length} VERIFIED`}
                            emoji="🏅"
                            title="Approved Ventures"
                            subtitle="View verified startups already published to your unified Faculty Impact Wall."
                            background="linear-gradient(135deg,#073f47,#0b766d)"
                        />
                        <HubTile
                            href={`${VENTURE_BASE}?view=rank`}
                            badge="STANDARD RUBRIC"
                            emoji="🧮"
                            title="Merit model — my supervisees"
                            subtitle="Rank approved ventures. Waiting submissions stay out of the live picks."
                            background="linear-gradient(135deg,#6d28d9,#a78bfa)"
                        />
                    </div>
                    <ActionKpiGrid
                        items={[
                            { value: String(waiting.length), label: "Awaiting Review" },
                            { value: String(approved.length), label: "Approved Ventures" },
                            { value: String(entries.length), label: "All Records" },
                            { value: String(approved.length), label: "On Impact Wall" },
                        ]}
                    />
                    <WorkflowSteps
                        title="Startup / Business Workflow"
                        subtitle="Approved work flows into the same unified Faculty Impact Wall."
                        steps={["Venture Submitted", "Faculty Reviews", "Verification / Approval", "AI Ranking", "Impact Wall + Badge"]}
                    />
                    </>
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
                                    onReview={entry.id ? (action, note) => reviewEntry(entry.id!, action, note) : undefined}
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

                {view === "rank" &&
                    (loading ? (
                        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
                    ) : approved.length === 0 ? (
                        <EmptyVenture message="Approve at least one submitted venture to run the merit model." />
                    ) : (
                        <VentureMeritPanel
                            entries={approved as VentureMeritPanelEntry[]}
                            meritEndpoint="/api/v1/paths/startup-business/merit-model"
                            scopeName="my supervisees"
                        />
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
    onReview?: (action: "approve" | "reject" | "revision", note?: string) => void;
    reviewing?: boolean;
}) {
    const [note, setNote] = useState("");
    const gates = entry.gates || { academicOk: false, showcaseOk: false, investmentReadyOk: false };
    const student = entry.student?.name || "Student";
    const meta = [student, entry.stage, entry.ideaInfo?.sector, entry.ideaInfo?.city].filter(Boolean).join(" · ");
    const waiting = isPathEntryWaiting(entry);
    const status = entry.reviewPipeline?.supervisorStatus;
    const ribbon = entry.meritRibbon;
    const movement = rankMovement(ribbon);

    return (
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {ribbon && status === "approved" ? (
                <div className="bg-[linear-gradient(90deg,#f59e0b,#fbbf24)] px-4 py-2 text-[10px] font-black uppercase tracking-wide text-[#3b2202]">
                    {ribbon.rank === 1 ? "🥇" : ribbon.rank === 2 ? "🥈" : ribbon.rank === 3 ? "🥉" : "🏅"}{" "}
                    Ranked #{ribbon.rank} of {ribbon.of}
                    {ribbon.scope ? ` · ${ribbon.scope}` : ""}
                    {ribbon.total != null ? ` · ${ribbon.total}/100` : ""}
                    {ribbon.badgeLevel ? ` · ${BADGE_EMOJI[ribbon.badgeLevel]} ${ribbon.badgeLevel}` : ""}
                    {movement ? ` · ${movement.symbol} ${movement.label}` : ""}
                </div>
            ) : null}
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
                <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        status === "rejected" ? "bg-red-50 text-red-700" : waiting ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"
                    }`}
                >
                    {status === "rejected" ? "Rejected" : status === "revisions_requested" ? "Revision requested" : waiting ? "Waiting for you" : "Supervisor approved"}
                </span>
            </div>
            {onReview && waiting ? (
                <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3">
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Optional note for the student (visible on reject / request revision)…"
                        rows={2}
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:border-ciel-purple/50 focus:outline-none"
                    />
                    <div className="flex flex-wrap justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => onReview("reject", note.trim() || undefined)}
                            disabled={reviewing}
                            className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                            ❌ Reject
                        </button>
                        <button
                            type="button"
                            onClick={() => onReview("revision", note.trim() || undefined)}
                            disabled={reviewing}
                            className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                        >
                            🔁 Request revision
                        </button>
                        <button
                            type="button"
                            onClick={() => onReview("approve", note.trim() || undefined)}
                            disabled={reviewing}
                            className="rounded-lg bg-[#0e7d74] px-3 py-2 text-xs font-bold text-white hover:bg-[#0c6b64] disabled:opacity-50"
                        >
                            ✓ Approve — make live
                        </button>
                    </div>
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
