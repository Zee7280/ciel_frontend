"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import { CourseworkCrumb, HubBackButton, useFacultyHubView } from "@/components/ciel/coursework/CourseworkHubChrome";
import { MOCKUP_GRADIENTS, MockupActionCard, MockupHero } from "@/components/ciel/dashboard/MockupChrome";
import { isPathEntryApproved, isPathEntryWaiting } from "@/utils/reviewQueue";
import { ventureStatusLabel } from "@/utils/pathReviewStatus";
import { mailtoHref, whatsappShareHref } from "@/utils/reminderLinks";
import { getStoredCurrentUserId, readStoredCurrentUser } from "@/utils/currentUser";
import { SDG_COLORS, SDG_SHORT, V11_STEPS, hubProgressIndex } from "@/utils/ventureStudioV11";
import { computeVentureMeritScorecard, type VentureMeritEntry } from "@/utils/ventureMeritModel";
import VentureMeritPanel, { type VentureMeritPanelEntry } from "@/components/ciel/VentureMeritPanel";
import StartupBusinessWorkspace from "@/app/dashboard/student/paths/startup-business/StartupBusinessWorkspace";
import VentureAiCriticalReviewPanel from "@/components/ciel/venture/VentureAiCriticalReviewPanel";
import { analyseVentureCriticalReview } from "@/utils/ventureCriticalReview";

const VENTURE_VIEWS = ["home", "pipeline", "wall", "rank", "myventures", "create", "record", "pending", "approved", "aireview", "aireport", "assessment"] as const;
type FacView = (typeof VENTURE_VIEWS)[number];
const VENTURE_BASE = "/dashboard/faculty/startup-business";
const SECTION_SHORT = ["Venture", "Problem", "Business", "SDG", "Next step", "Review"] as const;
type PipeTab = "all" | "just" | "process" | "under_review" | "revision" | "approved" | "rejected";
const PIPE_TABS: { key: PipeTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "just", label: "Just Started" },
    { key: "process", label: "In Process" },
    { key: "under_review", label: "Under Review" },
    { key: "revision", label: "Revision" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
];

type FacultyVenture = Omit<VentureMeritEntry, "team" | "sdgMapping"> & {
    id?: string;
    userId?: string;
    status?: "draft" | "submitted";
    stepCompleted?: number;
    completenessPercent?: number;
    ventureName?: string | null;
    createdAt?: string;
    updatedAt?: string;
    academicSetup?: (VentureMeritEntry["academicSetup"] & {
        supervisorName?: string;
        supervisorEmail?: string;
        university?: string;
        department?: string;
        founderName?: string;
        courseCode?: string;
        courseRef?: string;
    }) | null;
    ideaInfo?: (VentureMeritEntry["ideaInfo"] & { sector?: string; city?: string; pitch?: string; problem?: string }) | null;
    solutionInfo?: { solution?: string; revenue?: string; revenueModels?: string[] } | null;
    reviewPipeline?: (VentureMeritEntry["reviewPipeline"] & { supervisorNote?: string | null; studentDeclaredAt?: string }) | null;
    gates?: { academicOk: boolean; showcaseOk: boolean; investmentReadyOk: boolean };
    student?: { id?: string; name?: string; email?: string; institution?: string; department?: string } | null;
    team?: { name?: string; email?: string; inviteStatus?: "pending" | "accepted" }[] | null;
    publishSettings?: { audience?: string; acceptIntros?: boolean } | null;
    sectionSummaries?: Record<string, string | undefined> | null;
    sdgMapping?: { entries?: { goalNumber: number }[]; howImpact?: string; indicators?: { indicator?: string; forGoal?: string; target12mo?: string; verifiedBy?: string }[] } | null;
    tractionRows?: { metric?: string; value?: string }[] | null;
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

type TimelineState = "done" | "now" | "warn" | "bad" | "";

function facultyFirstName() {
    const user = readStoredCurrentUser();
    const name = typeof user?.name === "string" ? user.name.trim() : "";
    return name || "Faculty";
}

function isRevision(entry: FacultyVenture) {
    return entry.reviewPipeline?.supervisorStatus === "revisions_requested";
}
function isRejected(entry: FacultyVenture) {
    return entry.status === "submitted" && entry.reviewPipeline?.supervisorStatus === "rejected";
}
function isInvestorOpen(entry: FacultyVenture) {
    return entry.publishSettings?.acceptIntros === true || entry.publishSettings?.audience === "investors";
}
function displayVentureId(entry: FacultyVenture) {
    const year = entry.createdAt ? new Date(entry.createdAt).getFullYear() : new Date().getFullYear();
    const tail = (entry.id || "").replace(/-/g, "").slice(-5).toUpperCase() || "00000";
    return `VEN-${year}-${tail}`;
}
function formatDay(value?: string | null) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
    return d.toISOString().slice(0, 10);
}
function sectionPercents(entry: FacultyVenture) {
    if (entry.status === "submitted" && !isRevision(entry)) return SECTION_SHORT.map(() => 100);
    const unlocked = Math.max(0, Math.min(6, hubProgressIndex(entry.stepCompleted ?? 0, (entry as { academicSetup?: { formVersion?: number } }).academicSetup?.formVersion)));
    return SECTION_SHORT.map((_, i) => (i < unlocked ? 100 : i === unlocked && unlocked < 6 ? 30 : 0));
}
function overallPct(entry: FacultyVenture) {
    if (typeof entry.completenessPercent === "number") return Math.max(0, Math.min(100, entry.completenessPercent));
    const secs = sectionPercents(entry);
    return Math.round(secs.reduce((sum, n) => sum + n, 0) / secs.length);
}
function pipeTabOf(entry: FacultyVenture): PipeTab {
    if (entry.status !== "submitted") return overallPct(entry) <= 25 ? "just" : "process";
    if (isRevision(entry)) return "revision";
    if (isRejected(entry)) return "rejected";
    if (isPathEntryApproved(entry)) return "approved";
    return "under_review";
}
function sdgNumbers(entry: FacultyVenture) {
    return (entry.sdgMapping?.entries || []).map((e) => e.goalNumber).filter((n) => n >= 1 && n <= 17);
}
function studentName(entry: FacultyVenture) {
    return entry.student?.name || entry.academicSetup?.founderName || "Student";
}
function isMine(entry: FacultyVenture, myId: string) {
    return !!myId && entry.userId === myId;
}

function timelineSteps(entry: FacultyVenture): { label: string; state: TimelineState }[] {
    if (entry.status !== "submitted") return [{ label: "Draft", state: "now" }, { label: "Submitted", state: "" }, { label: "Faculty Review", state: "" }, { label: "Decision", state: "" }, { label: "Published to Impact Walls", state: "" }];
    if (isRevision(entry)) return [{ label: "Revising", state: "now" }, { label: "Submitted", state: "done" }, { label: "Faculty Review", state: "done" }, { label: "Revision Requested", state: "warn" }, { label: "Published to Impact Walls", state: "" }];
    if (isRejected(entry)) return [{ label: "Draft", state: "done" }, { label: "Submitted", state: "done" }, { label: "Faculty Review", state: "done" }, { label: "Rejected", state: "bad" }, { label: "Not Published", state: "" }];
    if (isPathEntryApproved(entry)) return ["Draft", "Submitted", "Faculty Review", "Approved", "Published to Impact Walls"].map((label) => ({ label, state: "done" as TimelineState }));
    return [{ label: "Draft", state: "done" }, { label: "Submitted", state: "done" }, { label: "Faculty Review", state: "now" }, { label: "Decision", state: "" }, { label: "Published to Impact Walls", state: "" }];
}
function timelineDot(state: TimelineState) {
    if (state === "done") return "bg-[#2e9e5b] shadow-[0_0_0_2px_#2e9e5b]";
    if (state === "now") return "bg-[#0f8f8a] shadow-[0_0_0_4px_#b5e5e1]";
    if (state === "warn") return "bg-[#f39c12] shadow-[0_0_0_2px_#f39c12]";
    if (state === "bad") return "bg-[#d64545] shadow-[0_0_0_2px_#d64545]";
    return "bg-[#dbe3e8] shadow-[0_0_0_2px_#dbe3e8]";
}
function timelineText(state: TimelineState) {
    if (state === "done") return "text-[#1c8a52]";
    if (state === "now") return "text-[#0b6f6c]";
    if (state === "warn") return "text-[#c65b00]";
    if (state === "bad") return "text-[#b3261e]";
    return "text-[#9aa8b2]";
}
function timelineLine(state: TimelineState) {
    if (state === "done") return "bg-[#2e9e5b]";
    if (state === "warn") return "bg-[#f39c12]";
    if (state === "bad") return "bg-[#d64545]";
    return "bg-[#dbe3e8]";
}

function StatusChip({ entry }: { entry: FacultyVenture }) {
    const { tone, label } = ventureStatusLabel(entry);
    const cls =
        tone === "approved" ? "bg-[#e6f6ec] text-[#1c8a52]"
            : tone === "rejected" ? "bg-[#eceff1] text-[#455a64]"
              : tone === "revision_requested" ? "bg-[#fdecea] text-[#b3261e]"
                : tone === "under_review" ? "bg-[#e5f1fb] text-[#1f6fc2]"
                  : "bg-[#fff3e0] text-[#c65b00]";
    return <span className={`inline-block rounded-full px-2.5 py-1 text-[11.5px] font-extrabold uppercase tracking-wide ${cls}`}>{isRevision(entry) ? "Revision requested" : label}</span>;
}

function PanelBack({ href }: { href: string }) {
    return (
        <a href={href} className="rounded-full bg-[#eef3f6] px-4 py-2 text-[13.5px] font-bold text-[#0b4b57] hover:bg-[#e1eaef]">
            ← Back
        </a>
    );
}

function VentureTimeline({ entry }: { entry: FacultyVenture }) {
    const steps = timelineSteps(entry);
    return (
        <div className="mt-4 flex items-start">
            {steps.map((s, i) => (
                <div key={`${s.label}-${i}`} className="relative min-w-0 flex-1 text-center">
                    {i < steps.length - 1 ? <span className={`absolute left-1/2 top-[7px] z-0 h-0.5 w-full ${timelineLine(s.state)}`} /> : null}
                    <span className={`relative z-[1] mx-auto block h-3.5 w-3.5 rounded-full border-[3px] border-white ${timelineDot(s.state)}`} />
                    <span className={`mt-1.5 block text-[12px] font-bold leading-tight ${timelineText(s.state)}`}>{s.label}</span>
                </div>
            ))}
        </div>
    );
}

function CompletionBar({ entry }: { entry: FacultyVenture }) {
    const pct = overallPct(entry);
    const secs = sectionPercents(entry);
    const rev = isRevision(entry);
    return (
        <div className="mt-2">
            <div className="h-2.5 overflow-hidden rounded-full bg-[#e9eef2]">
                <i className="block h-full rounded-full" style={{ width: `${pct}%`, background: rev ? "linear-gradient(90deg,#f6a021,#e57a0f)" : "linear-gradient(90deg,#19b8a8,#0b8b86)" }} />
            </div>
            <div className="mt-1 flex justify-between text-[12.5px] font-semibold text-[#5d6c78]">
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11.5px] font-extrabold uppercase ${pct >= 100 ? "bg-[#e6f6ec] text-[#1c8a52]" : pct <= 25 ? "bg-[#eceff1] text-[#455a64]" : "bg-[#fff3e0] text-[#c65b00]"}`}>
                    {pct >= 100 ? "COMPLETE" : pct <= 25 ? "JUST STARTED" : "IN PROCESS"} · {pct}%
                </span>
                <span>Updated {formatDay(entry.updatedAt) || "—"}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
                {SECTION_SHORT.map((label, i) => {
                    const v = secs[i];
                    const cls = v >= 100 ? "bg-[#e6f6ec] text-[#1c8a52]" : v > 0 ? "bg-[#fff3e0] text-[#c65b00]" : "bg-[#eef3f6] text-[#5d6c78]";
                    return (
                        <span key={label} title={`${V11_STEPS[i].label} — ${v}%`} className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${cls}`}>
                            {label} {v}%
                        </span>
                    );
                })}
            </div>
        </div>
    );
}

function remindStudent(entry: FacultyVenture) {
    const name = studentName(entry).split(" ")[0];
    const title = entry.ventureName?.trim() || "your venture";
    const subject = `Reminder: continue ${title} on CIEL PK`;
    const body = `Hi ${name},\n\nYour venture "${title}" is still in progress on CIEL PK. Please open Startup / Venture → Startup Workspace and keep filling it in.\n`;
    return { to: entry.student?.email || "", subject, body };
}

export default function FacultyStartupBusinessPage() {
    return (
        <Suspense fallback={<div className="mx-auto max-w-[1240px] py-16 text-center text-sm text-[#71828e]">Loading ventures…</div>}>
            <FacultyStartupBusinessHub />
        </Suspense>
    );
}

function FacultyStartupBusinessHub() {
    const { view, homeHref } = useFacultyHubView(VENTURE_VIEWS, "home");
    const searchParams = useSearchParams();
    const recordId = searchParams.get("id");
    const tabParam = searchParams.get("tab") as PipeTab | null;
    const screen: FacView =
        view === "pending" || view === "aireview" ? "pipeline"
            : view === "approved" ? "wall"
              : view === "assessment" ? "aireport"
                : view;
    const initialTab: PipeTab = view === "pending" || view === "aireview" || tabParam === "under_review" ? "under_review" : tabParam && PIPE_TABS.some((t) => t.key === tabParam) ? tabParam : "all";

    const [entries, setEntries] = useState<FacultyVenture[]>([]);
    const [drafts, setDrafts] = useState<FacultyVenture[]>([]);
    const [own, setOwn] = useState<FacultyVenture | null>(null);
    const [loading, setLoading] = useState(true);
    const [reviewingId, setReviewingId] = useState<string | null>(null);
    const [pipeTab, setPipeTab] = useState<PipeTab>(initialTab);
    const [query, setQuery] = useState("");
    const [certifying, setCertifying] = useState(false);

    const myId = getStoredCurrentUserId();
    const greetName = facultyFirstName();

    useEffect(() => {
        void loadAll();
    }, []);

    useEffect(() => {
        setPipeTab(initialTab);
    }, [initialTab]);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [sup, prog, mine] = await Promise.all([
                authenticatedFetch("/api/v1/paths/startup-business/supervised"),
                authenticatedFetch("/api/v1/paths/startup-business/in-progress"),
                authenticatedFetch("/api/v1/paths/startup-business", {}, { redirectToLogin: false }),
            ]);
            const supJson = sup?.ok ? await sup.json() : null;
            const progJson = prog?.ok ? await prog.json() : null;
            const mineJson = mine?.ok ? await mine.json() : null;
            setEntries(Array.isArray(supJson?.data) ? supJson.data : []);
            setDrafts(Array.isArray(progJson?.data) ? progJson.data : []);
            setOwn(mineJson?.data?.id ? (mineJson.data as FacultyVenture) : null);
        } catch {
            toast.error("Failed to load startup / venture records");
        } finally {
            setLoading(false);
        }
    };

    const reviewEntry = async (id: string, action: "approve" | "reject" | "revision", note?: string) => {
        if ((action === "reject" || action === "revision") && !note?.trim()) {
            toast.error("A reason is required so the student knows what to fix.");
            return;
        }
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
                        ? "Approved — published to student, faculty, university and CIEL PK impact walls."
                        : action === "revision"
                          ? "Revision requested — returned to the student's Startup Workspace."
                          : "Rejected — record kept, never published.",
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

    const selfCertify = async () => {
        setCertifying(true);
        try {
            const res = await authenticatedFetch("/api/v1/paths/startup-business/self-certify", { method: "POST", body: JSON.stringify({}) });
            if (res?.ok) {
                const data = await res.json();
                setOwn(data.data as FacultyVenture);
                toast.success("Published — your faculty venture is live on the impact walls.");
            } else {
                toast.error("Could not self-certify this record");
            }
        } catch {
            toast.error("Could not self-certify this record");
        } finally {
            setCertifying(false);
        }
    };

    const waiting = useMemo(() => entries.filter(isPathEntryWaiting), [entries]);
    const approved = useMemo(() => entries.filter(isPathEntryApproved), [entries]);
    const rejected = useMemo(() => entries.filter(isRejected), [entries]);
    const pipelineAll = useMemo(() => {
        const map = new Map<string, FacultyVenture>();
        for (const e of [...drafts, ...entries]) {
            if (e.id) map.set(e.id, e);
        }
        if (own?.id) map.set(own.id, own);
        return [...map.values()];
    }, [drafts, entries, own]);
    const inProcess = pipelineAll.filter((e) => pipeTabOf(e) === "just" || pipeTabOf(e) === "process" || pipeTabOf(e) === "revision");

    const matchesQuery = (entry: FacultyVenture) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return [entry.ventureName, studentName(entry), entry.student?.email, entry.ideaInfo?.sector, displayVentureId(entry)].join(" ").toLowerCase().includes(q);
    };
    const pipeRows = pipelineAll
        .filter((e) => (pipeTab === "all" ? true : pipeTabOf(e) === pipeTab))
        .filter(matchesQuery)
        .sort((a, b) => {
            const order: Record<string, number> = { under_review: 0, revision: 1, just: 2, process: 3, approved: 4, rejected: 5 };
            return (order[pipeTabOf(a)] ?? 9) - (order[pipeTabOf(b)] ?? 9) || overallPct(b) - overallPct(a);
        });
    const tabCount = (key: PipeTab) => (key === "all" ? pipelineAll.length : pipelineAll.filter((e) => pipeTabOf(e) === key).length);
    const wallApproved = [...approved, ...(own && isPathEntryApproved(own) && !approved.some((e) => e.id === own.id) ? [own] : [])];
    const openRecord = (id?: string) => `${VENTURE_BASE}?view=record&id=${encodeURIComponent(id || "")}`;
    const recordEntry = pipelineAll.find((e) => e.id === recordId) || null;

    const crumbView =
        screen === "home" ? undefined
            : screen === "pipeline" ? "Startup Pipeline"
              : screen === "wall" ? "Impact Wall"
                : screen === "rank" ? "Startup Ranking"
                  : screen === "aireport" ? "AI Analysis Report"
                    : screen === "myventures" || screen === "create" ? "My Faculty Ventures"
                    : screen === "record" ? "Venture Card"
                      : screen;
    const heroStats = [
        { value: String(inProcess.length), label: "IN PROCESS", href: `${VENTURE_BASE}?view=pipeline&tab=process` },
        { value: String(waiting.length), label: "TO REVIEW", href: `${VENTURE_BASE}?view=pipeline&tab=under_review` },
        { value: String(wallApproved.length), label: "APPROVED", href: `${VENTURE_BASE}?view=wall` },
        { value: String(own ? 1 : 0), label: "MY VENTURES", href: `${VENTURE_BASE}?view=myventures` },
    ];
    const openAiReport = (id?: string) => `${VENTURE_BASE}?view=aireport&id=${encodeURIComponent(id || "")}`;

    return (
        <div>
            <div className="mx-auto max-w-[1500px] space-y-4 pb-16">
                <CourseworkCrumb role="Faculty" view={crumbView} pathLabel="Startup / Venture" />
                {screen !== "create" ? (
                    <MockupHero
                        kicker="MY PATHS · STARTUP / VENTURE"
                        title={greetName === "Faculty" ? "Welcome" : `Welcome, ${greetName}`}
                        subtitle="One pipeline for every venture you supervise. Each submission arrives as two separate documents: the student's Venture Card (flashcard) and the CIEL AI Analysis Report — a Shark-Tank / VC-lens review shared only with you, your university and CIEL PK."
                        badge="👩‍🏫 FACULTY"
                        gradient="radial-gradient(120% 140% at 100% 0%, #0d8e88 0%, #0b4b57 45%, #0a2f3d 100%)"
                        stats={heroStats}
                    />
                ) : null}

                {screen === "home" && (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <MockupActionCard
                            href={`${VENTURE_BASE}?view=pipeline&tab=under_review`}
                            emoji="📬"
                            ghost="📬"
                            title="Ventures to Review"
                            subtitle="Each submission arrives with its Startup Flashcard and an automatically generated Startup Assessment (100-point investment rubric, market benchmark, investor verdict). Review both on one screen, change section or overall scores, add comments, then return for revision or approve. Your approved score becomes the official published score."
                            badge={`${waiting.length} AWAITING DECISION`}
                            background={MOCKUP_GRADIENTS.navy}
                        />
                        <MockupActionCard
                            href={`${VENTURE_BASE}?view=pipeline`}
                            emoji="🧩"
                            ghost="🧩"
                            title="Startup Pipeline"
                            subtitle="One platform for all your students' ventures: percentage completion from Just Started to In Process, then Under Review, Revision, Approved, Rejected — with reminders, the pure Venture Card and the review rubric inside each record."
                            badge={`${inProcess.length} IN PROCESS · ${waiting.length} TO REVIEW`}
                            background={MOCKUP_GRADIENTS.orange}
                        />
                        <MockupActionCard
                            href={`${VENTURE_BASE}?view=myventures`}
                            emoji="💡"
                            ghost="💡"
                            title="Create Faculty Venture"
                            subtitle="Your own startup or opportunity, linked to you as founder. Self-certified — no student loop — and pitched to the university and, if you opt in, to investors in the CIEL Investor Hub."
                            badge={`${own ? 1 : 0} MINE`}
                            background={MOCKUP_GRADIENTS.teal}
                        />
                        <MockupActionCard
                            href={`${VENTURE_BASE}?view=wall`}
                            emoji="🏅"
                            ghost="🏅"
                            title="Ventures Impact Wall"
                            subtitle="Approved student ventures and your certified faculty ventures, published automatically to the student, university and CIEL PK walls and — if opted in — the CIEL Investor Hub."
                            badge={`${wallApproved.length} APPROVED`}
                            background={MOCKUP_GRADIENTS.green}
                        />
                        <MockupActionCard
                            href={`${VENTURE_BASE}?view=rank`}
                            emoji="🏆"
                            ghost="🏆"
                            title="Run Startup Ranking"
                            subtitle="Rank approved ventures best → least with analytical, critical and factual reasoning. Preview freely; publish up to 3 finals per year."
                            badge="RANKING"
                            background={MOCKUP_GRADIENTS.purple}
                        />
                    </div>
                )}

                {screen === "create" && (
                    <div>
                        <div className="mx-auto max-w-[1240px] px-[18px]">
                            <HubBackButton href={`${VENTURE_BASE}?view=myventures`} label="← My Faculty Ventures" />
                        </div>
                        <StartupBusinessWorkspace />
                    </div>
                )}

                {screen === "pipeline" && (
                    <div className="rounded-[22px] bg-white p-[26px_30px] shadow-[0_8px_30px_rgba(10,30,40,.08)]">
                        <div className="mb-[18px] flex flex-wrap items-start gap-3.5">
                            <PanelBack href={homeHref} />
                            <div className="min-w-0 flex-1">
                                <h3 className="m-0 text-[22px] font-bold text-[#14212b]">🧩 Startup Pipeline — {pipelineAll.length}</h3>
                                <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#5d6c78]">
                                    Every venture you supervise on one screen. Each record shows its percentage completion and category — Just Started, In Process, Complete — then Under Review, Revision, Approved or Rejected. Remind students by Email / WhatsApp; open a submitted card to read the flashcard, open its separate AI Analysis Report and decide with the rubric.
                                </p>
                            </div>
                            <a href={`${VENTURE_BASE}?view=rank`} className="rounded-xl bg-[#7d4ddb] px-4 py-2.5 text-[13.5px] font-bold text-white">
                                🏆 Run Startup Ranking
                            </a>
                        </div>
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search my ventures…"
                            className="mb-3 min-w-[170px] w-full rounded-xl border border-[#e3e9ee] px-3 py-2.5 text-sm"
                        />
                        <div className="mb-4 flex flex-wrap gap-2">
                            {PIPE_TABS.map((t) => (
                                <button
                                    key={t.key}
                                    type="button"
                                    onClick={() => setPipeTab(t.key)}
                                    className={`rounded-full border px-3.5 py-2 text-[13px] font-bold ${pipeTab === t.key ? "border-[#0b4b57] bg-[#0b4b57] text-white" : "border-[#e3e9ee] bg-white text-[#5d6c78]"}`}
                                >
                                    {t.label} · {tabCount(t.key)}
                                </button>
                            ))}
                        </div>
                        {loading ? (
                            <SkeletonList />
                        ) : pipeRows.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-[#e3e9ee] px-8 py-8 text-center text-[#5d6c78]">Nothing here.</div>
                        ) : (
                            <div className="flex flex-col gap-3.5">
                                {pipeRows.map((entry) => (
                                    <PipelineRow
                                        key={entry.id}
                                        entry={entry}
                                        mine={isMine(entry, myId)}
                                        onOpen={() => { window.location.href = openRecord(entry.id); }}
                                        onContinue={() => { window.location.href = `${VENTURE_BASE}?view=create`; }}
                                        onCertify={() => void selfCertify()}
                                        certifying={certifying}
                                        aiHref={entry.status === "submitted" ? openAiReport(entry.id) : undefined}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {screen === "wall" && (
                    <div className="rounded-[22px] bg-white p-[26px_30px] shadow-[0_8px_30px_rgba(10,30,40,.08)]">
                        <div className="mb-[18px] flex flex-wrap items-start gap-3.5">
                            <PanelBack href={homeHref} />
                            <div className="min-w-0 flex-1">
                                <h3 className="m-0 text-[22px] font-bold text-[#14212b]">🏅 Ventures Impact Wall (Faculty) — {wallApproved.length}</h3>
                                <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#5d6c78]">
                                    Every venture you approved plus your own certified faculty ventures — the same cards students, the university, CIEL PK and (for consented ventures) investors see. Each card carries its separate 📊 AI report button (not shown to students or investors).
                                </p>
                            </div>
                            <a href={`${VENTURE_BASE}?view=rank`} className="rounded-xl bg-[#7d4ddb] px-4 py-2.5 text-[13.5px] font-bold text-white">
                                🏆 Run Startup Ranking
                            </a>
                            <a href={`${VENTURE_BASE}?view=rank`} className="rounded-xl bg-[#eef3f6] px-4 py-2.5 text-[13.5px] font-bold text-[#0b4b57]">
                                👁 View Ranking
                            </a>
                        </div>
                        {loading ? (
                            <SkeletonList />
                        ) : wallApproved.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-[#e3e9ee] px-8 py-8 text-center text-[#5d6c78]">No approved ventures yet.</div>
                        ) : (
                            <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
                                {wallApproved.filter(matchesQuery).map((entry) => (
                                    <WallCard key={entry.id} entry={entry} onOpen={() => { window.location.href = openRecord(entry.id); }} aiHref={openAiReport(entry.id)} />
                                ))}
                            </div>
                        )}
                        {rejected.length ? (
                            <>
                                <h3 className="mt-[26px] text-[17px] font-bold text-[#5d6c78]">Rejected — preserved, never published ({rejected.length})</h3>
                                <div className="mt-2.5 flex flex-col gap-3">
                                    {rejected.map((row) => (
                                        <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#e3e9ee] p-5">
                                            <div>
                                                <p className="m-0 text-[17px] font-extrabold">{row.ventureName || "Untitled venture"} <StatusChip entry={row} /></p>
                                                <p className="mt-1 text-[13px] text-[#5d6c78]">
                                                    <b>{displayVentureId(row)}</b> · {studentName(row)}
                                                    {row.reviewPipeline?.supervisorNote ? ` · ${row.reviewPipeline.supervisorNote}` : ""}
                                                </p>
                                            </div>
                                            <a href={openRecord(row.id)} className="rounded-[10px] bg-[#eef3f6] px-3 py-1.5 text-[12.5px] font-bold text-[#0b4b57]">Details</a>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : null}
                    </div>
                )}

                {screen === "myventures" && (
                    <div className="rounded-[22px] bg-white p-[26px_30px] shadow-[0_8px_30px_rgba(10,30,40,.08)]">
                        <div className="mb-[18px] flex flex-wrap items-start gap-3.5">
                            <PanelBack href={homeHref} />
                            <div className="min-w-0 flex-1">
                                <h3 className="m-0 text-[22px] font-bold text-[#14212b]">💡 My Faculty Ventures — {own ? 1 : 0}</h3>
                                <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#5d6c78]">
                                    Ventures and opportunities you own as founder. Drafts sit here with a completion bar; complete ones you self-certify and publish. Ventures with a recorded investor-track consent are listed in the CIEL Investor Hub; CIEL PK may spot-check using the AI Analysis Report.
                                </p>
                            </div>
                            <a href={`${VENTURE_BASE}?view=create`} className="rounded-xl bg-[#0f8f8a] px-4 py-2.5 text-[13.5px] font-bold text-white">
                                ＋ Create New Opportunity
                            </a>
                        </div>
                        {!own ? (
                            <div className="rounded-2xl border border-dashed border-[#e3e9ee] px-8 py-8 text-center text-[#5d6c78]">No faculty ventures yet.</div>
                        ) : (
                            <PipelineRow
                                entry={own}
                                mine
                                onOpen={() => { window.location.href = openRecord(own.id); }}
                                onContinue={() => { window.location.href = `${VENTURE_BASE}?view=create`; }}
                                onCertify={() => void selfCertify()}
                                certifying={certifying}
                                aiHref={own.status === "submitted" ? openAiReport(own.id) : undefined}
                            />
                        )}
                    </div>
                )}

                {screen === "rank" && (
                    <div className="rounded-[22px] bg-white p-[26px_30px] shadow-[0_8px_30px_rgba(10,30,40,.08)]">
                        <div className="mb-[18px] flex flex-wrap items-start gap-3.5">
                            <PanelBack href={homeHref} />
                            <div className="min-w-0 flex-1">
                                <h3 className="m-0 text-[22px] font-bold text-[#14212b]">🏆 Run Startup Ranking — Faculty cohort</h3>
                                <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#5d6c78]">
                                    Compares the approved startups in your course / section / cohort with the standardised investment framework and explains every position. Publish to stamp “Faculty Cohort #n of N” on each student&apos;s flashcard. Preview freely; publish up to 3 finals per year.
                                </p>
                            </div>
                        </div>
                        {loading ? (
                            <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
                        ) : wallApproved.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-[#e3e9ee] px-8 py-8 text-center text-[#5d6c78]">Approve at least one submitted venture to run the merit model.</div>
                        ) : (
                            <VentureMeritPanel
                                entries={wallApproved as VentureMeritPanelEntry[]}
                                meritEndpoint="/api/v1/paths/startup-business/merit-model"
                                scopeName="my supervisees"
                            />
                        )}
                    </div>
                )}

                {screen === "record" && (
                    <RecordView
                        entry={recordEntry}
                        loading={loading}
                        reviewing={reviewingId === recordEntry?.id}
                        onBack={homeHref}
                        onReview={recordEntry?.id && isPathEntryWaiting(recordEntry) && !isMine(recordEntry, myId) ? (action, note) => reviewEntry(recordEntry.id!, action, note) : undefined}
                        aiHref={recordEntry?.id ? openAiReport(recordEntry.id) : undefined}
                    />
                )}

                {screen === "aireport" && (
                    <AiReportView
                        entry={recordEntry}
                        loading={loading}
                        recordHref={openRecord(recordEntry?.id)}
                        onBack={homeHref}
                    />
                )}
            </div>
        </div>
    );
}

function PipelineRow({
    entry,
    mine,
    onOpen,
    onContinue,
    onCertify,
    certifying,
    aiHref,
}: {
    entry: FacultyVenture;
    mine?: boolean;
    onOpen: () => void;
    onContinue: () => void;
    onCertify: () => void;
    certifying?: boolean;
    aiHref?: string;
}) {
    const waiting = isPathEntryWaiting(entry);
    const draftish = entry.status !== "submitted" || isRevision(entry);
    const remind = remindStudent(entry);
    const complete = overallPct(entry) >= 100;
    const ai = entry.status === "submitted" ? analyseVentureCriticalReview(entry) : null;
    const meta = [
        displayVentureId(entry),
        studentName(entry),
        entry.team && entry.team.length > 1 ? `+${entry.team.length}` : null,
        entry.academicSetup?.university || entry.student?.institution,
        entry.ideaInfo?.sector,
        entry.stage,
    ].filter(Boolean).join(" · ");
    return (
        <div className="grid grid-cols-1 items-center gap-[18px] rounded-[18px] border border-[#e3e9ee] bg-white p-[18px_20px] md:grid-cols-[1.6fr_1fr]">
            <div>
                <div className="flex flex-wrap items-center gap-2.5">
                    <p className="m-0 text-[17px] font-extrabold text-[#14212b]">{entry.ventureName || "Untitled venture"}</p>
                    <StatusChip entry={entry} />
                    {mine ? <span className="rounded-full bg-[#fff8e1] px-2.5 py-1 text-[11.5px] font-extrabold uppercase text-[#a06a00]">Faculty venture</span> : null}
                    {isInvestorOpen(entry) ? <span className="rounded-full bg-[#ede7f6] px-2.5 py-1 text-[11.5px] font-extrabold uppercase text-[#5e35b1]">Investor opt-in</span> : null}
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-[#5d6c78]"><b className="font-semibold text-[#14212b]">{displayVentureId(entry)}</b>{meta.replace(displayVentureId(entry), "")}</p>
                {isRevision(entry) && entry.reviewPipeline?.supervisorNote ? (
                    <div className="mt-2 rounded-[14px] border border-[#f5c2be] bg-[#fdecea] px-4 py-3 text-[13.5px]">
                        <b>Revision requested:</b> {entry.reviewPipeline.supervisorNote}
                    </div>
                ) : null}
                <CompletionBar entry={entry} />
                <VentureTimeline entry={entry} />
            </div>
            <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
                <span className="rounded-full bg-[#eef3f6] px-2.5 py-1 text-[12px] font-bold text-[#0b4b57]">
                    Action with: {waiting ? "Faculty" : isPathEntryApproved(entry) ? "None — Approved" : mine ? "Faculty founder" : "Student"}
                </span>
                {ai && aiHref ? (
                    <a href={aiHref} className="rounded-[10px] bg-[#0f8f8a] px-3 py-1.5 text-[12.5px] font-bold text-white" title="Separate CIEL AI Analysis Report (not part of the flashcard)">
                        📊 AI report · {ai.overall}/100 · {ai.grade}
                    </a>
                ) : null}
                {draftish && !mine && remind.to ? (
                    <>
                        <a href={mailtoHref(remind.to, remind.subject, remind.body)} className="rounded-[10px] bg-[#3b5ba9] px-3 py-1.5 text-[12.5px] font-bold text-white">Email {studentName(entry).split(" ")[0]}</a>
                        <a href={whatsappShareHref(`${remind.subject}\n\n${remind.body}`)} target="_blank" rel="noreferrer" className="rounded-[10px] bg-[#25d366] px-3 py-1.5 text-[12.5px] font-bold text-white">WhatsApp {studentName(entry).split(" ")[0]}</a>
                    </>
                ) : null}
                {draftish && mine ? (
                    <>
                        <button type="button" onClick={onContinue} className="rounded-[10px] bg-[#0f8f8a] px-3 py-1.5 text-[12.5px] font-bold text-white">Continue</button>
                        {complete ? (
                            <button type="button" onClick={onCertify} disabled={certifying} className="rounded-[10px] bg-[#2e9e5b] px-3 py-1.5 text-[12.5px] font-bold text-white disabled:opacity-50">Self-certify & publish</button>
                        ) : null}
                    </>
                ) : null}
                {waiting && mine && complete ? (
                    <button type="button" onClick={onCertify} disabled={certifying} className="rounded-[10px] bg-[#2e9e5b] px-3 py-1.5 text-[12.5px] font-bold text-white disabled:opacity-50">Self-certify & publish</button>
                ) : null}
                {waiting && !mine ? (
                    <button type="button" onClick={onOpen} className="rounded-[10px] bg-[#0f8f8a] px-3 py-1.5 text-[12.5px] font-bold text-white">Review & Decide</button>
                ) : (
                    <button type="button" onClick={onOpen} className="rounded-[10px] bg-[#eef3f6] px-3 py-1.5 text-[12.5px] font-bold text-[#0b4b57]">Details</button>
                )}
            </div>
        </div>
    );
}

function WallCard({ entry, onOpen, aiHref }: { entry: FacultyVenture; onOpen: () => void; aiHref?: string }) {
    const ribbon = entry.meritRibbon;
    const pitch = entry.solutionInfo?.solution || entry.ideaInfo?.pitch || entry.sectionSummaries?.opportunity || "Approved venture record.";
    const traction = (entry.tractionRows || []).filter((r) => r.metric || r.value).slice(0, 3).map((r) => [r.metric, r.value].filter(Boolean).join(" ")).join("; ");
    const ai = analyseVentureCriticalReview(entry);
    return (
        <div className="flex flex-col overflow-hidden rounded-[20px] border border-[#e3e9ee] bg-white">
            <div className="bg-[linear-gradient(120deg,#0b4b57,#0f8f8a)] px-[18px] py-4 text-white">
                <small className="text-[11px] font-bold tracking-wide text-[#bfe8e4]">{displayVentureId(entry)} · {entry.academicSetup?.university || entry.student?.institution || "Venture"}</small>
                <h4 className="m-0 mt-1 text-[17px] font-bold">{entry.ventureName || "Untitled venture"}</h4>
                <div className="mt-1 text-[12.5px] text-[#dff3f1]">{[studentName(entry), entry.ideaInfo?.sector, entry.stage].filter(Boolean).join(" · ")}</div>
            </div>
            <div className="flex-1 px-[18px] py-3.5 text-[13.5px] leading-relaxed">
                <div>
                    {sdgNumbers(entry).map((n) => (
                        <span key={n} title={SDG_SHORT[n]} className="mr-1.5 mb-1 inline-block rounded-lg px-2 py-0.5 text-[11.5px] font-extrabold text-white" style={{ background: SDG_COLORS[n] }}>SDG {n}</span>
                    ))}
                </div>
                <p className="my-2 line-clamp-3">{pitch}</p>
                {traction ? <p className="m-0 text-[#5d6c78]"><b>Traction:</b> {traction}</p> : null}
                {ribbon ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="rounded-lg border border-[#b7d8f5] bg-[#e5f1fb] px-2 py-0.5 text-[11px] font-extrabold text-[#1f6fc2]">🎓 Rank #{ribbon.rank} · {ribbon.scope}</span>
                    </div>
                ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-[#e3e9ee] px-[18px] py-3">
                <span className="rounded-full bg-[#e6f6ec] px-2.5 py-1 text-[11.5px] font-extrabold uppercase text-[#1c8a52]">Approved {formatDay(entry.updatedAt)}</span>
                {ribbon?.total != null ? <span className="rounded-full bg-[#e0f2f1] px-2.5 py-1 text-[11.5px] font-extrabold uppercase text-[#0b6f6c]">Faculty score {ribbon.total}</span> : null}
                {isInvestorOpen(entry) ? <span className="rounded-full bg-[#ede7f6] px-2.5 py-1 text-[11.5px] font-extrabold uppercase text-[#5e35b1]">Investor opt-in</span> : null}
                <span className="flex-1" />
                {aiHref ? (
                    <a href={aiHref} className="rounded-[10px] bg-[#0f8f8a] px-3 py-1.5 text-[12.5px] font-bold text-white" title="Separate CIEL AI Analysis Report (not part of the flashcard)">
                        📊 AI report · {ai.overall}/100
                    </a>
                ) : null}
                <button type="button" onClick={onOpen} className="rounded-[10px] bg-[#eef3f6] px-3 py-1.5 text-[12.5px] font-bold text-[#0b4b57]">Open</button>
            </div>
        </div>
    );
}

function downloadVentureCard(entry: FacultyVenture) {
    const title = entry.ventureName || "Venture Card";
    const id = displayVentureId(entry);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${id} · Venture Card</title>
<style>body{font-family:Georgia,serif;max-width:820px;margin:24px auto;color:#14212b;padding:0 18px}h1{font-size:22px}p{line-height:1.5}small{color:#5d6c78}</style></head>
<body><p><small>CIEL PK Venture Studio · Venture Card (flashcard) · ${id} · generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} · no AI content</small></p>
<h1>${escHtml(title)}</h1>
<p><b>${id}</b> · ${escHtml(entry.academicSetup?.university || entry.student?.institution || "")} · ${escHtml(ventureStatusLabel(entry).label)}</p>
<p><b>Problem</b><br>${escHtml(entry.ideaInfo?.problem || "—")}</p>
<p><b>Solution</b><br>${escHtml(entry.solutionInfo?.solution || "—")}</p>
<p><b>Team</b><br>${escHtml((entry.team || []).map((m) => m.name).filter(Boolean).join(", ") || studentName(entry))}</p>
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${id}_Venture_Card.html`;
    a.click();
    URL.revokeObjectURL(url);
}

function escHtml(value: string) {
    return value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] || ch));
}

function deriveActivity(entry: FacultyVenture) {
    const rows: { at: string; who: string; action: string }[] = [];
    if (entry.createdAt) rows.push({ at: entry.createdAt, who: studentName(entry), action: "Venture record created" });
    if (entry.status === "submitted" || isPathEntryApproved(entry) || isRejected(entry) || isRevision(entry)) {
        rows.push({
            at: entry.reviewPipeline?.studentDeclaredAt || entry.updatedAt || entry.createdAt || "",
            who: studentName(entry),
            action: "Submitted for faculty review — flashcard generated; CIEL AI Analysis Report queued (faculty, university & CIEL PK only)",
        });
    }
    if (isRevision(entry)) rows.push({ at: entry.updatedAt || "", who: entry.academicSetup?.supervisorName || "Faculty", action: "Revision requested — returned to student workspace" });
    if (isRejected(entry)) rows.push({ at: entry.updatedAt || "", who: entry.academicSetup?.supervisorName || "Faculty", action: "Rejected — record preserved, not published" });
    if (isPathEntryApproved(entry)) rows.push({ at: entry.updatedAt || "", who: entry.academicSetup?.supervisorName || "Faculty", action: "Approved — published to student, faculty, university and CIEL PK impact walls" });
    return rows.filter((r) => r.at).sort((a, b) => a.at.localeCompare(b.at));
}

function RecordView({
    entry,
    loading,
    reviewing,
    onBack,
    onReview,
    aiHref,
}: {
    entry: FacultyVenture | null;
    loading: boolean;
    reviewing?: boolean;
    onBack: string;
    onReview?: (action: "approve" | "reject" | "revision", note?: string) => void;
    aiHref?: string;
}) {
    const [note, setNote] = useState("");
    if (loading && !entry) return <div className="h-40 animate-pulse rounded-[22px] bg-slate-100" />;
    if (!entry) {
        return (
            <div className="rounded-[22px] bg-white p-8 text-center text-[#5d6c78] shadow-[0_8px_30px_rgba(10,30,40,.08)]">
                <PanelBack href={onBack} />
                <p className="mt-4">This venture card is not in your supervised deck.</p>
            </div>
        );
    }
    const waiting = isPathEntryWaiting(entry);
    const submitted = entry.status === "submitted" || waiting || isPathEntryApproved(entry) || isRejected(entry);
    const scorecard = computeVentureMeritScorecard(entry);
    const ribbon = entry.meritRibbon;
    const ai = submitted ? analyseVentureCriticalReview(entry) : null;
    const logs = deriveActivity(entry);
    const model = entry.solutionInfo?.revenue || (entry.solutionInfo?.revenueModels || []).join(" + ");
    return (
        <div className="rounded-[22px] bg-white p-[26px_30px] shadow-[0_8px_30px_rgba(10,30,40,.08)]">
            <div className="mb-[18px] flex flex-wrap items-start gap-3.5">
                <PanelBack href={onBack} />
                <div className="min-w-0 flex-1">
                    <h3 className="m-0 text-[22px] font-bold">{entry.ventureName || "Untitled venture"}</h3>
                    <p className="mt-1.5 text-[14.5px] text-[#5d6c78]">
                        {displayVentureId(entry)} · {ventureStatusLabel(entry).label} · Action with: {waiting ? "Faculty" : isPathEntryApproved(entry) ? "None — Approved" : "Student"}
                        {waiting ? " · Review the flashcard (left) and the assessment (right); then decide." : ""}
                    </p>
                </div>
            </div>
            <VentureTimeline entry={entry} />
            <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                <div>
                    <div className="overflow-hidden rounded-[22px] border border-[#e3e9ee]">
                        <div className="flex flex-wrap items-start justify-between gap-3.5 bg-[linear-gradient(120deg,#0b4b57,#0f8f8a)] px-6 py-5 text-white">
                            <div>
                                <div className="text-[12px] font-bold tracking-wide text-[#bfe8e4]">{displayVentureId(entry)} · {entry.academicSetup?.university || entry.student?.institution || "Venture"}</div>
                                <h4 className="m-0 mt-1 text-[22px] font-bold">{entry.ventureName || "Untitled venture"}</h4>
                                <div className="mt-1.5 text-[13px] text-[#dff3f1]">{studentName(entry)} {entry.academicSetup?.supervisorName ? ` · Faculty: ${entry.academicSetup.supervisorName}` : ""}</div>
                            </div>
                            <div className="text-right">
                                <StatusChip entry={entry} />
                                <div className="mt-2 text-[12px]">{isInvestorOpen(entry) ? "🤝 Investor track" : "🔒 Not on investor track"}</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2.5 p-6 sm:grid-cols-2">
                            {[
                                { k: "Sector · Stage", v: [entry.ideaInfo?.sector, entry.stage].filter(Boolean).join(" · ") },
                                { k: "Problem", v: entry.ideaInfo?.problem || entry.ideaInfo?.pitch },
                                { k: "Solution", v: entry.solutionInfo?.solution },
                                { k: "Business model", v: model },
                                { k: "Team", v: (entry.team || []).map((m) => m.name).filter(Boolean).join(", ") || studentName(entry) },
                            ].filter((x) => x.v).map((x) => (
                                <div key={x.k} className="rounded-xl bg-[#f6f8fa] px-3 py-2.5 text-[13px]">
                                    <b className="mb-0.5 block text-[11px] font-bold uppercase tracking-wide text-[#5d6c78]">{x.k}</b>
                                    {x.v}
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e3e9ee] px-6 py-3">
                            <div>
                                {sdgNumbers(entry).map((n) => (
                                    <span key={n} title={SDG_SHORT[n]} className="mr-1.5 inline-block rounded-lg px-2 py-0.5 text-[11.5px] font-extrabold text-white" style={{ background: SDG_COLORS[n] }}>SDG {n}</span>
                                ))}
                            </div>
                            <span className="text-[11.5px] text-[#5d6c78]">Venture Card · student-authored flashcard · no AI scoring on this card</span>
                        </div>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                        <button type="button" onClick={() => downloadVentureCard(entry)} className="rounded-[10px] bg-[#eef3f6] px-3 py-1.5 text-[12.5px] font-bold text-[#0b4b57]">⬇ Download flashcard</button>
                        {submitted && aiHref ? (
                            <a href={aiHref} className="rounded-[10px] bg-[#0f8f8a] px-3 py-1.5 text-[12.5px] font-bold text-white">📈 View Assessment (full page)</a>
                        ) : null}
                    </div>
                    <div className="mt-3 rounded-[18px] border border-[#e3e9ee] p-5">
                        <b>Investor track & consent</b>
                        <p className="mt-1.5 mb-0 text-[13.5px] text-[#5d6c78]">
                            {isInvestorOpen(entry)
                                ? `Investor track is on${entry.reviewPipeline?.studentDeclaredAt ? ` · consented ${formatDay(entry.reviewPipeline.studentDeclaredAt)}` : ""}.`
                                : "Not on investor track — investors cannot see this venture."}
                        </p>
                        {isInvestorOpen(entry) ? (
                            <div className="mt-3 grid grid-cols-3 gap-2">
                                {[["0", "Card views"], ["0", "Interest received"], ["0", "Founder-contact requests"]].map(([n, l]) => (
                                    <div key={l} className="rounded-xl bg-[#f6f8fa] px-3 py-2 text-center">
                                        <b className="block text-lg">{n}</b>
                                        <small className="text-[11px] font-bold uppercase tracking-wide text-[#5d6c78]">{l}</small>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>
                    {entry.status !== "submitted" || isRevision(entry) ? (
                        <div className="mt-3 rounded-[18px] border border-[#e3e9ee] p-5">
                            <b>Completion</b>
                            <CompletionBar entry={entry} />
                        </div>
                    ) : null}
                    {isPathEntryApproved(entry) ? (
                        <div className="mt-3 rounded-[18px] border border-[#e3e9ee] p-5">
                            <b>Recognition & investor activity</b>
                            <p className="mt-2 mb-0 text-[13.5px] text-[#5d6c78]">
                                {ribbon ? `Ranked #${ribbon.rank} of ${ribbon.of}${ribbon.total != null ? ` · ${ribbon.total}/100` : ""}.` : "No ranking badges yet."}
                            </p>
                        </div>
                    ) : null}
                    {entry.reviewPipeline?.supervisorNote && !waiting && !isPathEntryApproved(entry) ? (
                        <div className="mt-3 rounded-[18px] border border-[#e3e9ee] p-5">
                            <b>Faculty decision — {ventureStatusLabel(entry).label}</b>
                            <p className="mt-2 mb-0 text-sm leading-relaxed">{entry.reviewPipeline.supervisorNote}</p>
                        </div>
                    ) : null}
                </div>
                <div>
                    {submitted ? (
                        <div className="rounded-[18px] border border-[#cfe3e1] p-5">
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="grid h-[78px] w-[78px] place-items-center rounded-full text-[18px] font-extrabold" style={{ background: `conic-gradient(#0f8f8a ${scorecard.total}%, #e6ebef 0)` }}>
                                    <span className="grid h-[64px] w-[64px] place-items-center rounded-full bg-white text-[#0b4b57]">{scorecard.total}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <b>Startup Investment & Growth Assessment</b>
                                    <p className="mt-1 mb-0 text-[13px] text-[#5d6c78]">{scorecard.grade} · decision support only. The student sees your remarks, not this internal breakdown.</p>
                                </div>
                            </div>
                            <div className="mt-3 space-y-2">
                                {scorecard.criteria.map((c) => (
                                    <div key={c.key}>
                                        <div className="flex justify-between text-[12.5px]"><span>{c.label}</span><b>{c.points}/{c.max}</b></div>
                                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#e9eef2]"><i className="block h-full rounded-full" style={{ width: `${(c.points / c.max) * 100}%`, background: c.color }} /></div>
                                    </div>
                                ))}
                            </div>
                            {ai && aiHref ? (
                                <div className="mt-4 rounded-[14px] border border-[#0f8f8a] bg-[#fbfdfd] p-3.5">
                                    <b>📊 CIEL AI Analysis Report</b>
                                    <p className="mt-1 mb-2 text-[13px] leading-relaxed text-[#5d6c78]">
                                        {ai.overall}/100 · {ai.grade} · {ai.tier}. 🔒 Visible to Faculty · University · CIEL PK only. Separate from the Venture Card; never shown to the student or investors.
                                    </p>
                                    <a href={aiHref} className="inline-block rounded-[10px] bg-[#0f8f8a] px-3 py-1.5 text-[12.5px] font-bold text-white">📊 Open full report</a>
                                </div>
                            ) : (
                                <p className="mt-3 mb-0 text-[13.5px] text-[#5d6c78]">Generated automatically the moment the student submits. Nothing to assess yet — record is still a draft.</p>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-[18px] border border-[#e3e9ee] p-5">
                            <b>Startup Assessment</b>
                            <p className="mt-2 mb-0 text-[13.5px] text-[#5d6c78]">Generated automatically the moment the student submits. Nothing to assess yet — record is still in the workspace.</p>
                        </div>
                    )}
                    {waiting && onReview ? (
                        <div className="mt-4 rounded-[18px] border border-[#0f8f8a] p-5">
                            <h3 className="m-0 text-[19px] font-bold">Faculty decision</h3>
                            <p className="mt-1 text-[14.5px] text-[#5d6c78]">Score and remarks go to the student. The CIEL AI Analysis Report is your assistant only — the decision is yours.</p>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="What the student will read… required for revision or reject."
                                rows={3}
                                className="mt-3 w-full rounded-xl border border-[#e3e9ee] px-3 py-2 text-sm"
                            />
                            <div className="mt-3.5 flex flex-wrap justify-end gap-2">
                                <button type="button" disabled={reviewing} onClick={() => onReview("reject", note.trim())} className="rounded-xl bg-[#d64545] px-4 py-2 text-[13.5px] font-bold text-white disabled:opacity-50">✖ Reject</button>
                                <button type="button" disabled={reviewing} onClick={() => onReview("revision", note.trim())} className="rounded-xl bg-[#f39c12] px-4 py-2 text-[13.5px] font-bold text-white disabled:opacity-50">↩ Request Revision</button>
                                <button type="button" disabled={reviewing} onClick={() => onReview("approve", note.trim() || undefined)} className="rounded-xl bg-[#2e9e5b] px-4 py-2 text-[13.5px] font-bold text-white disabled:opacity-50">
                                    ✔ Accept & Publish to Impact Walls
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
            <div className="mt-4 rounded-[18px] border border-[#e3e9ee] p-5">
                <b>Activity log</b>
                <div className="mt-2 border-t border-[#e3e9ee]">
                    {logs.length ? logs.map((row, i) => (
                        <div key={`${row.at}-${i}`} className="grid grid-cols-1 gap-1 border-b border-[#e3e9ee] py-2.5 text-[13px] sm:grid-cols-[150px_minmax(0,1fr)_170px] sm:gap-3">
                            <span><b>{row.who}</b></span>
                            <span>{row.action}</span>
                            <span className="text-[#5d6c78] sm:text-right">{formatDay(row.at)}</span>
                        </div>
                    )) : <p className="mt-2 mb-0 text-[13.5px] text-[#5d6c78]">No activity yet.</p>}
                </div>
            </div>
        </div>
    );
}

function AiReportView({
    entry,
    loading,
    recordHref,
    onBack,
}: {
    entry: FacultyVenture | null;
    loading: boolean;
    recordHref: string;
    onBack: string;
}) {
    if (loading && !entry) return <div className="h-40 animate-pulse rounded-[22px] bg-slate-100" />;
    if (!entry) {
        return (
            <div className="rounded-[22px] bg-white p-8 text-center text-[#5d6c78] shadow-[0_8px_30px_rgba(10,30,40,.08)]">
                <PanelBack href={onBack} />
                <p className="mt-4">No AI report yet — reports are generated only for submitted ventures.</p>
            </div>
        );
    }
    const submitted = entry.status === "submitted" || isPathEntryWaiting(entry) || isPathEntryApproved(entry) || isRejected(entry) || isRevision(entry);
    const ai = submitted ? analyseVentureCriticalReview(entry) : null;
    return (
        <div className="rounded-[22px] bg-white p-[26px_30px] shadow-[0_8px_30px_rgba(10,30,40,.08)]">
            <div className="mb-[18px] flex flex-wrap items-start gap-3.5">
                <PanelBack href={onBack} />
                <div className="min-w-0 flex-1">
                    <h3 className="m-0 text-[22px] font-bold">📊 CIEL AI Analysis Report — {entry.ventureName || "Untitled venture"}</h3>
                    <p className="mt-1.5 text-[14.5px] text-[#5d6c78]">
                        Separate from the Venture Card. Shark-Tank / VC-lens · 30% academic · 70% practical.
                    </p>
                </div>
                <a href={recordHref} className="rounded-[10px] bg-[#eef3f6] px-3 py-1.5 text-[12.5px] font-bold text-[#0b4b57]">🗂 Open venture record</a>
                <button type="button" onClick={() => window.print()} className="rounded-[10px] bg-[#eef3f6] px-3 py-1.5 text-[12.5px] font-bold text-[#0b4b57]">🖨 Print / PDF</button>
            </div>
            <div className="mb-3 rounded-[14px] border border-[#b7d8f5] bg-[#e5f1fb] px-4 py-3 text-[13.5px] leading-relaxed">
                🔒 <b>Restricted report.</b> Audience: Faculty (decision), University (oversight), CIEL PK (network). Not shown to the student or to investors. Decision support only — the faculty decision is human.
            </div>
            {ai ? (
                <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                    <div className="rounded-[14px] bg-[#f6f8fa] px-4 py-3.5"><b className="block text-2xl">{ai.overall}</b><small className="text-[11px] font-bold uppercase tracking-wide text-[#5d6c78]">Overall /100 · {ai.grade} · {ai.tier}</small></div>
                    <div className="rounded-[14px] bg-[#f6f8fa] px-4 py-3.5"><b className="block text-2xl">{ai.acad} / {ai.prac}</b><small className="text-[11px] font-bold uppercase tracking-wide text-[#5d6c78]">Academic 30% · Practical 70%</small></div>
                    <div className="rounded-[14px] bg-[#f6f8fa] px-4 py-3.5"><b className="block text-2xl">{ai.verdict}</b><small className="text-[11px] font-bold uppercase tracking-wide text-[#5d6c78]">Shark verdict</small></div>
                </div>
            ) : null}
            {submitted ? (
                <VentureAiCriticalReviewPanel entry={entry} />
            ) : (
                <p className="text-[14.5px] text-[#5d6c78]">No AI report yet — reports are generated only for submitted ventures.</p>
            )}
        </div>
    );
}

function SkeletonList() {
    return (
        <div className="grid grid-cols-1 gap-3">
            {[1, 2, 3].map((i) => (
                <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-100" />
            ))}
        </div>
    );
}
