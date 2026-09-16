"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import { CourseworkCrumb, useFacultyHubView } from "@/components/ciel/coursework/CourseworkHubChrome";
import { MOCKUP_GRADIENTS, MockupActionCard, MockupHero } from "@/components/ciel/dashboard/MockupChrome";
import { namedTimeGreeting } from "@/utils/timeGreeting";
import { isPathEntryApproved, isPathEntryWaiting } from "@/utils/reviewQueue";
import { ventureStatusLabel } from "@/utils/pathReviewStatus";
import { mailtoHref, whatsappShareHref } from "@/utils/reminderLinks";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { SDG_COLORS, SDG_SHORT, V11_STAGES, V11_STEPS, hubProgressIndex } from "@/utils/ventureStudioV11";
import { computeVentureMeritScorecard, type VentureMeritEntry } from "@/utils/ventureMeritModel";
import VentureMeritPanel, { type VentureMeritPanelEntry } from "@/components/ciel/VentureMeritPanel";

export type VentureHubVariant = "university" | "ciel";

const UNI_VIEWS = ["home", "pipeline", "wall", "rank", "facventures", "record", "process", "review"] as const;
const CIEL_VIEWS = [...UNI_VIEWS, "showcase", "activity"] as const;
type HubView = (typeof CIEL_VIEWS)[number];
type PipeTab = "all" | "just" | "process" | "under_review" | "revision" | "approved" | "rejected";
type HubSort = "updated" | "completion" | "score" | "interest" | "name";
const PIPE_TABS: { key: PipeTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "just", label: "Just Started" },
    { key: "process", label: "In Process" },
    { key: "under_review", label: "Under Review" },
    { key: "revision", label: "Revision" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
];
const SECTION_SHORT = ["Venture", "Problem", "Business", "SDG", "Next step", "Review"] as const;

type HubVenture = Omit<VentureMeritEntry, "team" | "sdgMapping"> & {
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
        facultyRole?: string;
        founderRole?: string;
        courseCode?: string;
        courseRef?: string;
        faculty?: string;
    }) | null;
    ideaInfo?: (VentureMeritEntry["ideaInfo"] & { sector?: string; city?: string; pitch?: string; problem?: string }) | null;
    solutionInfo?: { solution?: string; revenue?: string; revenueModels?: string[] } | null;
    reviewPipeline?: (VentureMeritEntry["reviewPipeline"] & { supervisorNote?: string | null; studentDeclaredAt?: string }) | null;
    student?: { id?: string; name?: string; email?: string; institution?: string; department?: string; role?: string } | null;
    team?: { name?: string; email?: string; inviteStatus?: "pending" | "accepted" }[] | null;
    publishSettings?: { audience?: string; acceptIntros?: boolean; featured?: boolean } | null;
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

function isRevision(entry: HubVenture) {
    return entry.reviewPipeline?.supervisorStatus === "revisions_requested";
}
function isRejected(entry: HubVenture) {
    return entry.status === "submitted" && entry.reviewPipeline?.supervisorStatus === "rejected";
}
function isInvestorOpen(entry: HubVenture) {
    return entry.publishSettings?.acceptIntros === true || entry.publishSettings?.audience === "investors";
}
function isFeatured(entry: HubVenture) {
    return entry.publishSettings?.featured === true;
}
function isFacultyVenture(entry: HubVenture) {
    const role = String(entry.student?.role || "").toLowerCase();
    if (role === "faculty") return true;
    const hay = [
        entry.academicSetup?.facultyRole,
        entry.academicSetup?.founderRole,
        entry.academicSetup?.courseCode,
        entry.academicSetup?.courseRef,
    ]
        .join(" ")
        .toLowerCase();
    return hay.includes("faculty");
}
function displayVentureId(entry: HubVenture) {
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
function sectionPercents(entry: HubVenture) {
    if (entry.status === "submitted" && !isRevision(entry)) return SECTION_SHORT.map(() => 100);
    const unlocked = Math.max(0, Math.min(6, hubProgressIndex(entry.stepCompleted ?? 0, (entry.academicSetup as { formVersion?: number } | undefined)?.formVersion)));
    return SECTION_SHORT.map((_, i) => (i < unlocked ? 100 : i === unlocked && unlocked < 6 ? 30 : 0));
}
function overallPct(entry: HubVenture) {
    if (typeof entry.completenessPercent === "number") return Math.max(0, Math.min(100, entry.completenessPercent));
    const secs = sectionPercents(entry);
    return Math.round(secs.reduce((sum, n) => sum + n, 0) / secs.length);
}
function pipeTabOf(entry: HubVenture): PipeTab {
    if (entry.status !== "submitted") return overallPct(entry) <= 25 ? "just" : "process";
    if (isRevision(entry)) return "revision";
    if (isRejected(entry)) return "rejected";
    if (isPathEntryApproved(entry)) return "approved";
    return "under_review";
}
function sdgNumbers(entry: HubVenture) {
    return (entry.sdgMapping?.entries || []).map((e) => e.goalNumber).filter((n) => n >= 1 && n <= 17);
}
function ownerName(entry: HubVenture) {
    return entry.student?.name || entry.academicSetup?.founderName || "Founder";
}
function facultyName(entry: HubVenture) {
    return entry.academicSetup?.supervisorName || entry.academicSetup?.faculty || "";
}
function universityNameOf(entry: HubVenture) {
    return entry.academicSetup?.university || entry.student?.institution || "University";
}
function shortName(n: string) {
    const t = n.trim();
    if (!t) return "them";
    if (t.startsWith("Dr.")) return t.split(" ").slice(0, 2).join(" ");
    return t.split(" ")[0];
}
function timelineSteps(entry: HubVenture): { label: string; state: TimelineState }[] {
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
function storedOrgName() {
    const user = readStoredCurrentUser();
    const nested = user?.organization && typeof user.organization === "object" ? (user.organization as { name?: unknown }).name : "";
    const picks = [user?.orgName, user?.institution, user?.university, nested, user?.name];
    for (const p of picks) {
        if (typeof p === "string" && p.trim()) return p.trim();
    }
    return "University";
}

function StatusChip({ entry }: { entry: HubVenture }) {
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

function VentureTimeline({ entry }: { entry: HubVenture }) {
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

function CompletionBar({ entry }: { entry: HubVenture }) {
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

function remindStudent(entry: HubVenture) {
    const name = shortName(ownerName(entry));
    const title = entry.ventureName?.trim() || "your venture";
    const subject = `Reminder: continue ${title} on CIEL PK`;
    const body = `Hi ${name},\n\nYour venture "${title}" is still in progress on CIEL PK. Please open Startup / Venture → Startup Workspace and keep filling it in.\n`;
    return { to: entry.student?.email || "", subject, body, label: name };
}
function remindFaculty(entry: HubVenture) {
    const name = shortName(facultyName(entry) || "Faculty");
    const title = entry.ventureName?.trim() || "a venture";
    const subject = `Reminder: faculty review for ${title}`;
    const body = `Hi ${name},\n\n"${title}" is waiting on faculty review in CIEL PK. Please open Startup / Venture → Startup Pipeline to continue.\n`;
    return { to: entry.academicSetup?.supervisorEmail || "", subject, body, label: name };
}
function meritScore(entry: HubVenture) {
    return entry.meritRibbon?.total ?? computeVentureMeritScorecard(entry).total;
}
function tractionLine(entry: HubVenture) {
    const rows = (entry.tractionRows || []).filter((r) => r.metric || r.value).slice(0, 3);
    if (!rows.length) return "no traction logged";
    return rows.map((r) => [r.metric, r.value].filter(Boolean).join(" ")).join("; ");
}
function analyserNotes(entry: HubVenture) {
    const scorecard = computeVentureMeritScorecard(entry);
    const ranked = [...scorecard.criteria].sort((a, b) => b.points / b.max - a.points / a.max);
    const best = ranked[0];
    const worst = ranked[ranked.length - 1];
    const traction = scorecard.criteria.find((c) => c.key === "traction");
    const ratio = traction ? traction.points / traction.max : 0;
    const analytical = `Analytical: weighted VEN-RANK 1.0 score ${scorecard.total}/100 — strongest on ${best?.label.toLowerCase() || "the rubric"} (${best?.points ?? 0}/${best?.max ?? 0}), weakest on ${worst?.label.toLowerCase() || "the rubric"} (${worst?.points ?? 0}/${worst?.max ?? 0}).`;
    const critical =
        (ratio >= 0.8
            ? "Critical: traction claims are evidence-backed and consistent with the stated model."
            : ratio >= 0.5
              ? "Critical: traction is real but early; scale-up assumptions remain untested."
              : "Critical: traction evidence is thin — ranking is capped until independent evidence is provided.") +
        ((entry.team?.length || 1) <= 1 ? " Solo-founder execution risk noted." : "");
    const factual = `Factual: ${entry.stage || "stage not set"} · ${tractionLine(entry)} · ${isInvestorOpen(entry) ? "opted in to investors" : "not seeking investment"}.`;
    return { scorecard, analytical, critical, factual, band: scorecard.grade };
}
function activityLog(entry: HubVenture) {
    const rows: { who: string; action: string; t: string }[] = [];
    if (entry.createdAt) rows.push({ who: ownerName(entry), action: "Venture record created", t: formatDay(entry.createdAt) });
    if (entry.reviewPipeline?.studentDeclaredAt) {
        rows.push({
            who: ownerName(entry),
            action: "Submitted for faculty review — record locked, venture card generated, AI pre-screen run",
            t: formatDay(entry.reviewPipeline.studentDeclaredAt),
        });
    }
    const faculty = facultyName(entry) || "Faculty";
    if (isRevision(entry)) rows.push({ who: faculty, action: "Revision requested — returned to student workspace", t: formatDay(entry.updatedAt) });
    else if (isRejected(entry)) rows.push({ who: faculty, action: "Rejected — record preserved, not published", t: formatDay(entry.updatedAt) });
    else if (isPathEntryApproved(entry)) {
        rows.push({
            who: isFacultyVenture(entry) ? ownerName(entry) : faculty,
            action: isFacultyVenture(entry)
                ? `Faculty venture self-certified and published to impact walls${isInvestorOpen(entry) ? " and CIEL Investor Hub" : ""}`
                : `Approved — published to all Ventures Impact Walls${isInvestorOpen(entry) ? " and CIEL Investor Hub" : ""}`,
            t: formatDay(entry.updatedAt),
        });
    } else if (isPathEntryWaiting(entry)) {
        rows.push({ who: faculty, action: "Awaiting faculty decision — university cannot skip faculty review", t: formatDay(entry.updatedAt) });
    }
    if (entry.meritRibbon?.at) {
        rows.push({
            who: "University AI Grader",
            action: `Ranked #${entry.meritRibbon.rank} of ${entry.meritRibbon.of}${entry.meritRibbon.scope ? ` · ${entry.meritRibbon.scope}` : ""}`,
            t: formatDay(entry.meritRibbon.at),
        });
    }
    return rows.reverse();
}

export default function VentureStakeholderHub({ variant }: { variant: VentureHubVariant }) {
    return (
        <Suspense fallback={<div className="mx-auto max-w-[1240px] py-16 text-center text-sm text-[#71828e]">Loading ventures…</div>}>
            <VentureStakeholderHubInner variant={variant} />
        </Suspense>
    );
}

function VentureStakeholderHubInner({ variant }: { variant: VentureHubVariant }) {
    const isCiel = variant === "ciel";
    const allowed = isCiel ? CIEL_VIEWS : UNI_VIEWS;
    const { view, homeHref } = useFacultyHubView(allowed, "home");
    const searchParams = useSearchParams();
    const recordId = searchParams.get("id");
    const tabParam = searchParams.get("tab") as PipeTab | null;
    const screen: HubView = view === "process" || view === "review" ? "pipeline" : view;
    const initialTab: PipeTab =
        view === "review" || tabParam === "under_review" ? "under_review"
            : view === "process" || tabParam === "process" ? "process"
              : tabParam && PIPE_TABS.some((t) => t.key === tabParam) ? tabParam
                : "all";

    const [entries, setEntries] = useState<HubVenture[]>([]);
    const [approvedEntries, setApprovedEntries] = useState<HubVenture[]>([]);
    const [loading, setLoading] = useState(true);
    const [pipeTab, setPipeTab] = useState<PipeTab>(initialTab);
    const [query, setQuery] = useState("");
    const [uniFilter, setUniFilter] = useState("");
    const [facultyFilter, setFacultyFilter] = useState("");
    const [deptFilter, setDeptFilter] = useState("");
    const [ownerFilter, setOwnerFilter] = useState("");
    const [investorFilter, setInvestorFilter] = useState("");
    const [sectorFilter, setSectorFilter] = useState("");
    const [stageFilter, setStageFilter] = useState("");
    const [sdgFilter, setSdgFilter] = useState("");
    const [sortBy, setSortBy] = useState<HubSort>("updated");
    const [spotlightId, setSpotlightId] = useState<string | null>(null);

    const base = isCiel ? "/dashboard/admin/startup-business" : "/dashboard/partner/startup-business";
    const orgTitle = storedOrgName();

    useEffect(() => {
        void loadAll();
        void loadApproved();
    }, [variant]);

    useEffect(() => {
        setPipeTab(initialTab);
    }, [initialTab]);

    const loadAll = async () => {
        setLoading(true);
        try {
            if (isCiel) {
                const res = await authenticatedFetch("/api/v1/admin/paths/startup-business");
                const json = res?.ok ? await res.json() : null;
                setEntries(Array.isArray(json?.data) ? json.data : []);
            } else {
                const [sub, draft] = await Promise.all([
                    authenticatedFetch("/api/v1/paths/startup-business/university"),
                    authenticatedFetch("/api/v1/paths/startup-business/university?status=draft"),
                ]);
                const subJson = sub?.ok ? await sub.json() : null;
                const draftJson = draft?.ok ? await draft.json() : null;
                const map = new Map<string, HubVenture>();
                for (const e of [...(Array.isArray(draftJson?.data) ? draftJson.data : []), ...(Array.isArray(subJson?.data) ? subJson.data : [])]) {
                    if (e?.id) map.set(e.id, e);
                }
                setEntries([...map.values()]);
            }
        } catch {
            toast.error("Failed to load startup / venture records");
        } finally {
            setLoading(false);
        }
    };

    /** The approved-only impact wall — backed by a query that only ever returns approved records
     * (enforced server-side), so it's never at risk of a client-side filtering bug surfacing a
     * pending/revision/rejected venture on the wall. */
    const loadApproved = async () => {
        try {
            const url = isCiel
                ? "/api/v1/admin/paths/startup-business?approvalStatus=approved"
                : "/api/v1/paths/startup-business/university?approvalStatus=approved";
            const res = await authenticatedFetch(url);
            const json = res?.ok ? await res.json() : null;
            setApprovedEntries(Array.isArray(json?.data) ? json.data : []);
        } catch {
            // Non-fatal — the wall just shows 0 until the next load.
        }
    };

    const toggleSpotlight = async (entry: HubVenture) => {
        if (!entry.id) return;
        setSpotlightId(entry.id);
        try {
            const next = !isFeatured(entry);
            const res = await authenticatedFetch(`/api/v1/admin/paths/startup-business/${entry.id}/spotlight`, {
                method: "PATCH",
                body: JSON.stringify({ featured: next }),
            });
            if (res?.ok) {
                const data = await res.json();
                setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, ...data.data } : e)));
                toast.success(next ? "Spotlighted in the CIEL Investor Hub" : "Removed from spotlight");
            } else {
                toast.error("Could not update spotlight");
            }
        } catch {
            toast.error("Could not update spotlight");
        } finally {
            setSpotlightId(null);
        }
    };

    const waiting = useMemo(() => entries.filter(isPathEntryWaiting), [entries]);
    const approved = approvedEntries;
    const rejected = useMemo(() => entries.filter(isRejected), [entries]);
    const inProcess = entries.filter((e) => pipeTabOf(e) === "just" || pipeTabOf(e) === "process" || pipeTabOf(e) === "revision");
    const investorReady = approved.filter(isInvestorOpen);
    const facultyOwned = entries.filter(isFacultyVenture);
    const universities = useMemo(() => [...new Set(entries.map(universityNameOf).filter(Boolean))].sort(), [entries]);
    const faculties = useMemo(() => [...new Set(entries.map(facultyName).filter(Boolean))].sort(), [entries]);
    const departments = useMemo(() => [...new Set(entries.map((e) => e.academicSetup?.department || e.student?.department).filter(Boolean) as string[])].sort(), [entries]);
    const sectors = useMemo(() => [...new Set(entries.map((e) => e.ideaInfo?.sector).filter(Boolean) as string[])].sort(), [entries]);
    const stages = useMemo(() => {
        const fromData = [...new Set(entries.map((e) => e.stage).filter(Boolean) as string[])];
        return [...new Set([...V11_STAGES.map((s) => s.id), ...fromData])];
    }, [entries]);
    const sdgOptions = useMemo(() => [...new Set(entries.flatMap(sdgNumbers))].sort((a, b) => a - b), [entries]);

    const matchesFilters = (entry: HubVenture) => {
        if (uniFilter && universityNameOf(entry) !== uniFilter) return false;
        if (facultyFilter && facultyName(entry) !== facultyFilter) return false;
        if (deptFilter && (entry.academicSetup?.department || entry.student?.department) !== deptFilter) return false;
        if (ownerFilter === "faculty" && !isFacultyVenture(entry)) return false;
        if (ownerFilter === "student" && isFacultyVenture(entry)) return false;
        if (investorFilter === "yes" && !isInvestorOpen(entry)) return false;
        if (investorFilter === "no" && isInvestorOpen(entry)) return false;
        if (sectorFilter && entry.ideaInfo?.sector !== sectorFilter) return false;
        if (stageFilter && entry.stage !== stageFilter) return false;
        if (sdgFilter && !sdgNumbers(entry).includes(Number(sdgFilter))) return false;
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return [entry.ventureName, ownerName(entry), entry.student?.email, entry.ideaInfo?.sector, displayVentureId(entry), universityNameOf(entry)].join(" ").toLowerCase().includes(q);
    };

    const sortEntries = (list: HubVenture[]) => {
        const interestOf = (e: HubVenture) => (isFeatured(e) ? 2 : 0) + (isInvestorOpen(e) ? 1 : 0);
        return list.slice().sort((a, b) => {
            if (sortBy === "completion") return overallPct(b) - overallPct(a);
            if (sortBy === "score") return meritScore(b) - meritScore(a);
            if (sortBy === "interest") return interestOf(b) - interestOf(a);
            if (sortBy === "name") return (a.ventureName || "").localeCompare(b.ventureName || "");
            return (b.updatedAt || "").localeCompare(a.updatedAt || "");
        });
    };

    const pipeRows = sortEntries(
        entries
            .filter((e) => (pipeTab === "all" ? true : pipeTabOf(e) === pipeTab))
            .filter(matchesFilters),
    ).sort((a, b) => {
        const order: Record<string, number> = { under_review: 0, revision: 1, just: 2, process: 3, approved: 4, rejected: 5 };
        return (order[pipeTabOf(a)] ?? 9) - (order[pipeTabOf(b)] ?? 9) || overallPct(b) - overallPct(a);
    });
    const tabCount = (key: PipeTab) => (key === "all" ? entries.length : entries.filter((e) => pipeTabOf(e) === key).length);
    const openRecord = (id?: string) => `${base}?view=record&id=${encodeURIComponent(id || "")}`;
    const recordEntry = entries.find((e) => e.id === recordId) || null;
    const deptCount = departments.length;
    const facCount = faculties.length;
    const wallRows = sortEntries(approved.filter(matchesFilters));
    const facultyRows = sortEntries(facultyOwned.filter(matchesFilters));
    const rankPool = sortEntries(approved.filter(matchesFilters));
    const lastBadgeAt = approved
        .map((e) => e.meritRibbon?.at)
        .filter(Boolean)
        .sort()
        .at(-1);
    const activeFilterCount = [uniFilter, facultyFilter, deptFilter, investorFilter, ownerFilter, sectorFilter, stageFilter, sdgFilter, query].filter(Boolean).length;
    const clearFilters = () => {
        setUniFilter("");
        setFacultyFilter("");
        setDeptFilter("");
        setOwnerFilter("");
        setInvestorFilter("");
        setSectorFilter("");
        setStageFilter("");
        setSdgFilter("");
        setQuery("");
        setSortBy("updated");
    };
    const selectCls = "min-w-[170px] rounded-xl border border-[#e3e9ee] px-3 py-2 text-sm";

    const crumbView =
        screen === "home" ? undefined
            : screen === "pipeline" ? (isCiel ? "Network Pipeline" : "University Startup Pipeline")
              : screen === "wall" ? (isCiel ? "Approved Ventures" : "Impact Wall")
                : screen === "rank" ? "AI Rankings"
                  : screen === "facventures" ? "Faculty Ventures"
                    : screen === "showcase" ? "Investor Hub Control"
                      : screen === "activity" ? "Investor Activity"
                        : screen === "record" ? "Venture Card"
                          : screen;

    const filterBar = (showUni: boolean) => (
        <div className="mb-4 flex flex-wrap gap-2.5">
            {showUni ? (
                <select value={uniFilter} onChange={(e) => setUniFilter(e.target.value)} className={selectCls}>
                    <option value="">All universities</option>
                    {universities.map((u) => (
                        <option key={u} value={u}>{u}</option>
                    ))}
                </select>
            ) : null}
            <select value={facultyFilter} onChange={(e) => setFacultyFilter(e.target.value)} className={selectCls}>
                <option value="">All faculty</option>
                {faculties.map((f) => (
                    <option key={f} value={f}>{f}</option>
                ))}
            </select>
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className={selectCls}>
                <option value="">All departments</option>
                {departments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                ))}
            </select>
            <select value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)} className={selectCls}>
                <option value="">All sectors</option>
                {sectors.map((s) => (
                    <option key={s} value={s}>{s}</option>
                ))}
            </select>
            <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className={selectCls}>
                <option value="">All stages</option>
                {stages.map((s) => (
                    <option key={s} value={s}>{s}</option>
                ))}
            </select>
            <select value={sdgFilter} onChange={(e) => setSdgFilter(e.target.value)} className={selectCls}>
                <option value="">All SDGs</option>
                {sdgOptions.map((n) => (
                    <option key={n} value={String(n)}>SDG {n} — {SDG_SHORT[n]}</option>
                ))}
            </select>
            <select value={investorFilter} onChange={(e) => setInvestorFilter(e.target.value)} className={selectCls}>
                <option value="">Investor opt-in: any</option>
                <option value="yes">Opted in to investors</option>
                <option value="no">Not seeking investment</option>
            </select>
            <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} className={selectCls}>
                <option value="">Student + faculty ventures</option>
                <option value="student">Student ventures</option>
                <option value="faculty">Faculty ventures</option>
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as HubSort)} className={selectCls}>
                <option value="updated">Recently updated</option>
                <option value="completion">Completion %</option>
                <option value="score">Score</option>
                <option value="interest">Investor interest</option>
                <option value="name">Name A–Z</option>
            </select>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search venture, student, ID…" className="min-w-[170px] flex-1 rounded-xl border border-[#e3e9ee] px-3 py-2 text-sm" />
            {activeFilterCount ? (
                <button type="button" onClick={clearFilters} className="rounded-xl border border-[#e3e9ee] bg-white px-3 py-2 text-[13px] font-bold text-[#0b4b57]">
                    ✕ Clear {activeFilterCount}
                </button>
            ) : null}
        </div>
    );

    return (
        <div className="mx-auto max-w-[1500px] space-y-4 pb-16">
            <CourseworkCrumb role={isCiel ? "CIEL PK" : "University"} view={crumbView} pathLabel="Startup / Venture" />
            {screen === "home" ? (
            <MockupHero
                badge={isCiel ? "CIEL PK · SUPER ADMIN" : "UNIVERSITY"}
                kicker={isCiel ? "NETWORK · STARTUP / VENTURE" : "Impact Areas · Startup / Venture"}
                title={isCiel ? "CIEL PK Venture Network" : orgTitle}
                subtitle={
                    isCiel
                        ? "Master view of every student venture across all partner universities — in process, under review, approved, ranked live, and showcased to investors through the CIEL Investor Hub."
                        : "Every venture your students are building, across all departments and faculty — in process, under faculty review, and approved on your Ventures Impact Wall."
                }
                stats={
                    isCiel
                        ? [
                            { value: String(universities.length), label: "UNIVERSITIES", href: `${base}?view=pipeline` },
                            { value: String(inProcess.length), label: "IN PROCESS", href: `${base}?view=process` },
                            { value: String(waiting.length), label: "UNDER REVIEW", href: `${base}?view=review` },
                            { value: String(approved.length), label: "APPROVED", href: `${base}?view=wall` },
                            { value: String(investorReady.length), label: "IN INVESTOR HUB", href: `${base}?view=showcase` },
                        ]
                        : [
                            { value: String(inProcess.length), label: "IN PROCESS", href: `${base}?view=process` },
                            { value: String(waiting.length), label: "UNDER REVIEW", href: `${base}?view=review` },
                            { value: String(approved.length), label: "APPROVED", href: `${base}?view=wall` },
                            { value: String(investorReady.length), label: "INVESTOR-READY", href: `${base}?view=wall` },
                        ]
                }
            />
            ) : null}

            {screen === "home" && (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {isCiel ? (
                        <>
                            <MockupActionCard
                                href={`${base}?view=pipeline`}
                                emoji="🧩"
                                ghost="🧩"
                                title="Network Startup Pipeline"
                                subtitle="Every student and faculty venture across all universities on one platform — percentage completion and category from Just Started to In Process, then Under Review, Revision, Approved, Rejected. Filter by university; remind students or faculty."
                                badge={`${inProcess.length} IN PROCESS · ${waiting.length} UNDER REVIEW`}
                                background={MOCKUP_GRADIENTS.teal}
                            />
                            <MockupActionCard
                                href={`${base}?view=facventures`}
                                emoji="💡"
                                ghost="💡"
                                title="Faculty Ventures"
                                subtitle="Self-certified faculty ventures and opportunities network-wide — spot-check, and route to investors."
                                badge={`${facultyOwned.length} FACULTY VENTURES`}
                                background={MOCKUP_GRADIENTS.navy}
                            />
                            <MockupActionCard
                                href={`${base}?view=wall`}
                                emoji="🏅"
                                ghost="🏅"
                                title="CIEL PK Approved Ventures"
                                subtitle="The master impact wall: every approved venture from every university, with scores, badges and investor interest."
                                badge={`${approved.length} APPROVED`}
                                background={MOCKUP_GRADIENTS.orange}
                            />
                            <MockupActionCard
                                href={`${base}?view=rank`}
                                emoji="🤖"
                                ghost="🤖"
                                title="Live AI Rankings"
                                subtitle="Run the comparative AI grader across the whole network or one university, any time. The CIEL PK badge updates live."
                                badge="LIVE"
                                background={MOCKUP_GRADIENTS.purple}
                            />
                            <MockupActionCard
                                href={`${base}?view=showcase`}
                                emoji="🤝"
                                ghost="🤝"
                                title="Investor Hub Control"
                                subtitle="Approved + opted-in ventures flow to the CIEL Investor Hub automatically. Spotlight the best and track expressions of interest."
                                badge={`${investorReady.length} INVESTMENT-READY`}
                                background={MOCKUP_GRADIENTS.pink}
                            />
                            <MockupActionCard
                                href={`${base}?view=activity`}
                                emoji="🕵️"
                                ghost="🕵️"
                                title="Investor Activity Log"
                                subtitle="Who is viewing which venture, who expressed interest, and who is trying to reach a founder — approve or decline founder-contact requests here."
                                badge="CONTACT REQUESTS"
                                background={MOCKUP_GRADIENTS.slate}
                            />
                        </>
                    ) : (
                        <>
                            <MockupActionCard
                                href={`${base}?view=pipeline`}
                                emoji="🧩"
                                ghost="🧩"
                                title="University Startup Pipeline"
                                subtitle={`All student and faculty ventures across ${deptCount || 1} department${deptCount === 1 ? "" : "s"} and ${facCount || 1} faculty on one platform — percentage completion, category, status, and Email / WhatsApp reminders to students or their reviewing faculty.`}
                                badge={`${inProcess.length} in process · ${waiting.length} under review`}
                                background={MOCKUP_GRADIENTS.orange}
                            />
                            <MockupActionCard
                                href={`${base}?view=facventures`}
                                emoji="💡"
                                ghost="💡"
                                title="Faculty Ventures"
                                subtitle="Self-certified ventures and opportunities owned by your faculty, pitched to the university and — if opted in — to investors."
                                badge={`${facultyOwned.length} faculty ventures`}
                                background={MOCKUP_GRADIENTS.blue}
                            />
                            <MockupActionCard
                                href={`${base}?view=wall`}
                                emoji="🏅"
                                ghost="🏅"
                                title="University Ventures Impact Wall"
                                subtitle={`Every approved venture from ${orgTitle} with faculty score, badges and investor interest. Showcase-ready for ORIC, visitors and accreditation.`}
                                badge={`${approved.length} approved`}
                                background={MOCKUP_GRADIENTS.green}
                            />
                            <MockupActionCard
                                href={`${base}?view=rank`}
                                emoji="🤖"
                                ghost="🤖"
                                title="Run AI Rankings"
                                subtitle={`Rank ${orgTitle}'s approved ventures best → least with analytical, critical and factual reasoning. Preview freely; publish up to 3 finals per year.`}
                                badge="AI grader"
                                background={MOCKUP_GRADIENTS.purple}
                            />
                        </>
                    )}
                </div>
            )}

            {screen === "pipeline" && (
                <div className="rounded-[22px] bg-white p-[26px_30px] shadow-[0_8px_30px_rgba(10,30,40,.08)]">
                    <div className="mb-[18px] flex flex-wrap items-start gap-3.5">
                        <PanelBack href={homeHref} />
                        <div className="min-w-0 flex-1">
                            <h3 className="m-0 text-[22px] font-bold text-[#14212b]">🧩 {isCiel ? "Network Startup Pipeline" : "University Startup Pipeline"} — {entries.length}</h3>
                            <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#5d6c78]">
                                {isCiel
                                    ? "Every student and faculty venture across all partner universities on one platform. Remind students or faculty by Email / WhatsApp. University cannot be skipped — faculty still decides."
                                    : "Every venture across all departments on one screen — percentage completion and category, then Under Review, Revision, Approved, Rejected. Remind students or faculty by Email / WhatsApp. University does not approve; faculty does."}
                            </p>
                        </div>
                    </div>
                    {filterBar(isCiel)}
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
                    {loading ? <SkeletonList /> : pipeRows.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#e3e9ee] px-8 py-8 text-center text-[#5d6c78]">Nothing here.</div>
                    ) : (
                        <div className="flex flex-col gap-3.5">
                            {pipeRows.map((entry) => (
                                <PipelineRow
                                    key={entry.id}
                                    entry={entry}
                                    onOpen={() => { window.location.href = openRecord(entry.id); }}
                                    showUniversity={isCiel}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {screen === "facventures" && (
                <div className="rounded-[22px] bg-white p-[26px_30px] shadow-[0_8px_30px_rgba(10,30,40,.08)]">
                    <div className="mb-[18px] flex flex-wrap items-start gap-3.5">
                        <PanelBack href={homeHref} />
                        <div className="min-w-0 flex-1">
                            <h3 className="m-0 text-[22px] font-bold text-[#14212b]">💡 Faculty Ventures — {facultyRows.length}</h3>
                            <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#5d6c78]">
                                {isCiel
                                    ? "Self-certified ventures owned by faculty founders across the network. CIEL PK may spot-check any record and spotlight investor-opted ones."
                                    : `Ventures owned by ${orgTitle} faculty as founders. These are self-certified by the faculty member; the university sees their completion and status here.`}
                            </p>
                        </div>
                    </div>
                    {filterBar(isCiel)}
                    {loading ? <SkeletonList /> : facultyRows.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#e3e9ee] px-8 py-8 text-center text-[#5d6c78]">No faculty ventures yet.</div>
                    ) : (
                        <div className="flex flex-col gap-3.5">
                            {facultyRows.map((entry) => (
                                <PipelineRow key={entry.id} entry={entry} onOpen={() => { window.location.href = openRecord(entry.id); }} showUniversity={isCiel} />
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
                            <h3 className="m-0 text-[22px] font-bold text-[#14212b]">🏅 {isCiel ? "CIEL PK Approved Ventures" : "University Ventures Impact Wall"} — {wallRows.length}</h3>
                            <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#5d6c78]">
                                {isCiel
                                    ? "Network-wide impact wall of every faculty-approved venture. Rejected records are preserved below but never published."
                                    : `All faculty-approved ventures from ${orgTitle}, published here automatically. Investor-opt-in ventures are also live in the CIEL Investor Hub.`}
                            </p>
                        </div>
                        <a href={`${base}?view=rank`} className="rounded-xl bg-[#7d4ddb] px-4 py-2.5 text-[13.5px] font-bold text-white">🤖 Run AI Grader</a>
                    </div>
                    {filterBar(isCiel)}
                    {loading ? <SkeletonList /> : wallRows.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#e3e9ee] px-8 py-8 text-center text-[#5d6c78]">No approved ventures yet.</div>
                    ) : (
                        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
                            {wallRows.map((entry) => (
                                <WallCard
                                    key={entry.id}
                                    entry={entry}
                                    variant={variant}
                                    spotlighting={spotlightId === entry.id}
                                    onOpen={() => { window.location.href = openRecord(entry.id); }}
                                    onSpotlight={isCiel && isInvestorOpen(entry) ? () => void toggleSpotlight(entry) : undefined}
                                />
                            ))}
                        </div>
                    )}
                    {isCiel && rejected.filter(matchesFilters).length ? (
                        <>
                            <h3 className="mt-[26px] text-[17px] font-bold text-[#5d6c78]">Rejected — preserved, never published ({rejected.filter(matchesFilters).length})</h3>
                            <div className="mt-2.5 flex flex-col gap-3">
                                {rejected.filter(matchesFilters).map((row) => (
                                    <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#e3e9ee] p-5">
                                        <div>
                                            <p className="m-0 text-[17px] font-extrabold">{row.ventureName || "Untitled venture"} <StatusChip entry={row} /></p>
                                            <p className="mt-1 text-[13px] text-[#5d6c78]">
                                                <b>{displayVentureId(row)}</b> · {ownerName(row)} · {universityNameOf(row)}
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

            {screen === "rank" && (
                <div className="rounded-[22px] bg-white p-[26px_30px] shadow-[0_8px_30px_rgba(10,30,40,.08)]">
                    <div className="mb-[18px] flex flex-wrap items-start gap-3.5">
                        <PanelBack href={homeHref} />
                        <div className="min-w-0 flex-1">
                            <h3 className="m-0 text-[22px] font-bold text-[#14212b]">🤖 {isCiel ? "AI Grader — CIEL PK Live Rankings" : "AI Grader — University Rankings"}</h3>
                            <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#5d6c78]">
                                {isCiel
                                    ? "CIEL PK runs live any time; the CIEL PK badge moves with every published run, while faculty and university badges stay on the same student card. Filter the cohort first if you want one university."
                                    : "Same rights as faculty: unlimited previews, 3 published finals per academic year. Published finals put a University badge on the top 5 Impact Wall cards."}
                            </p>
                        </div>
                    </div>
                    {filterBar(isCiel)}
                    <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                        <div className="rounded-[14px] bg-[#f6f8fa] px-4 py-3.5"><b className="block text-2xl">{rankPool.length}</b><small className="text-[11px] font-bold uppercase tracking-wide text-[#5d6c78]">Approved ventures in cohort</small></div>
                        <div className="rounded-[14px] bg-[#f6f8fa] px-4 py-3.5"><b className="block text-2xl">{isCiel ? "∞" : "3"}</b><small className="text-[11px] font-bold uppercase tracking-wide text-[#5d6c78]">{isCiel ? "Live runs — unlimited" : "Published finals per academic year"}</small></div>
                        <div className="rounded-[14px] bg-[#f6f8fa] px-4 py-3.5"><b className="block text-2xl">{lastBadgeAt ? formatDay(lastBadgeAt) : "—"}</b><small className="text-[11px] font-bold uppercase tracking-wide text-[#5d6c78]">Last published badge</small></div>
                    </div>
                    {loading ? (
                        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
                    ) : rankPool.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#e3e9ee] px-8 py-8 text-center text-[#5d6c78]">Approve at least one submitted venture to run the merit model.</div>
                    ) : (
                        <VentureMeritPanel
                            entries={rankPool as VentureMeritPanelEntry[]}
                            meritEndpoint="/api/v1/paths/startup-business/merit-model"
                            scopeName={isCiel ? "CIEL PK network" : orgTitle}
                        />
                    )}
                </div>
            )}

            {screen === "showcase" && isCiel && (
                <div className="rounded-[22px] bg-white p-[26px_30px] shadow-[0_8px_30px_rgba(10,30,40,.08)]">
                    <div className="mb-[18px] flex flex-wrap items-start gap-3.5">
                        <PanelBack href={homeHref} />
                        <div className="min-w-0 flex-1">
                            <h3 className="m-0 text-[22px] font-bold text-[#14212b]">🤝 Investor Hub Control — {investorReady.filter(matchesFilters).length} investment-ready ventures</h3>
                            <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#5d6c78]">
                                Ventures that are faculty-approved and opted in by the student appear in the CIEL Investor Hub automatically. Spotlight the strongest. Faculty review is unchanged.
                            </p>
                        </div>
                    </div>
                    <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                        <div className="rounded-[14px] bg-[#f6f8fa] px-4 py-3.5"><b className="block text-2xl">{investorReady.length}</b><small className="text-[11px] font-bold uppercase tracking-wide text-[#5d6c78]">Live in Investor Hub</small></div>
                        <div className="rounded-[14px] bg-[#f6f8fa] px-4 py-3.5"><b className="block text-2xl">{investorReady.filter(isFeatured).length}</b><small className="text-[11px] font-bold uppercase tracking-wide text-[#5d6c78]">Spotlighted</small></div>
                        <div className="rounded-[14px] bg-[#f6f8fa] px-4 py-3.5"><b className="block text-2xl">0</b><small className="text-[11px] font-bold uppercase tracking-wide text-[#5d6c78]">Investor interests received</small></div>
                    </div>
                    {filterBar(true)}
                    {investorReady.filter(matchesFilters).length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#e3e9ee] px-8 py-8 text-center text-[#5d6c78]">No investment-ready ventures yet.</div>
                    ) : (
                        <div className="flex flex-col gap-3.5">
                            {investorReady.filter(matchesFilters).map((entry) => (
                                <div key={entry.id} className="grid grid-cols-1 items-center gap-[18px] rounded-[18px] border border-[#e3e9ee] bg-white p-[18px_20px] md:grid-cols-[1.6fr_1fr]">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2.5">
                                            <p className="m-0 text-[17px] font-extrabold">{entry.ventureName || "Untitled venture"}</p>
                                            {isFeatured(entry) ? <span className="rounded-full bg-[#fff8e1] px-2.5 py-1 text-[11.5px] font-extrabold uppercase text-[#a06a00]">Spotlight</span> : null}
                                        </div>
                                        <p className="mt-1 text-[13px] text-[#5d6c78]">
                                            <b>{displayVentureId(entry)}</b> · {ownerName(entry)} · {universityNameOf(entry)} · {entry.ideaInfo?.sector || "—"} · {entry.stage || "—"}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap justify-end gap-2">
                                        <button
                                            type="button"
                                            disabled={spotlightId === entry.id}
                                            onClick={() => void toggleSpotlight(entry)}
                                            className={`rounded-[10px] px-3 py-1.5 text-[12.5px] font-bold ${isFeatured(entry) ? "bg-[#eef3f6] text-[#0b4b57]" : "bg-[#f39c12] text-white"} disabled:opacity-50`}
                                        >
                                            {isFeatured(entry) ? "Remove spotlight" : "Spotlight"}
                                        </button>
                                        <a href={openRecord(entry.id)} className="rounded-[10px] bg-[#eef3f6] px-3 py-1.5 text-[12.5px] font-bold text-[#0b4b57]">Details</a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {screen === "activity" && isCiel && (
                <div className="rounded-[22px] bg-white p-[26px_30px] shadow-[0_8px_30px_rgba(10,30,40,.08)]">
                    <div className="mb-[18px] flex flex-wrap items-start gap-3.5">
                        <PanelBack href={homeHref} />
                        <div className="min-w-0 flex-1">
                            <h3 className="m-0 text-[22px] font-bold text-[#14212b]">🕵️ Investor Activity Log</h3>
                            <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#5d6c78]">
                                Who is looking at which venture, who expressed interest, and who is trying to reach a founder. Founder contact is never shared until CIEL PK approves the request here.
                            </p>
                        </div>
                    </div>
                    <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                        <div className="rounded-[14px] bg-[#f6f8fa] px-4 py-3.5"><b className="block text-2xl">0</b><small className="text-[11px] font-bold uppercase tracking-wide text-[#5d6c78]">Investor actions</small></div>
                        <div className="rounded-[14px] bg-[#f6f8fa] px-4 py-3.5"><b className="block text-2xl">0</b><small className="text-[11px] font-bold uppercase tracking-wide text-[#5d6c78]">Investor organisations active</small></div>
                        <div className="rounded-[14px] bg-[#f6f8fa] px-4 py-3.5"><b className="block text-2xl">0</b><small className="text-[11px] font-bold uppercase tracking-wide text-[#5d6c78]">Contact requests awaiting CIEL PK</small></div>
                    </div>
                    <div className="rounded-2xl border border-dashed border-[#e3e9ee] px-8 py-8 text-center text-[#5d6c78]">
                        No investor activity yet. When investors view or request founder contact from the Investor Hub, those events will appear here for CIEL PK to approve or decline — without changing student or faculty records.
                    </div>
                </div>
            )}

            {screen === "record" && (
                <RecordView
                    entry={recordEntry}
                    loading={loading}
                    variant={variant}
                    onBack={homeHref}
                    onSpotlight={isCiel && recordEntry && isInvestorOpen(recordEntry) ? () => void toggleSpotlight(recordEntry) : undefined}
                    spotlighting={spotlightId === recordEntry?.id}
                />
            )}
        </div>
    );
}

function PipelineRow({
    entry,
    onOpen,
    showUniversity,
}: {
    entry: HubVenture;
    onOpen: () => void;
    showUniversity?: boolean;
}) {
    const waiting = isPathEntryWaiting(entry);
    const draftish = entry.status !== "submitted" || isRevision(entry);
    const student = remindStudent(entry);
    const faculty = remindFaculty(entry);
    const meta = [
        displayVentureId(entry),
        ownerName(entry),
        entry.team && entry.team.length > 1 ? `+${entry.team.length}` : null,
        showUniversity ? universityNameOf(entry) : null,
        entry.academicSetup?.department,
        isFacultyVenture(entry) ? null : facultyName(entry) ? `Faculty: ${facultyName(entry)}` : null,
        entry.ideaInfo?.sector,
        entry.stage,
    ].filter(Boolean).join(" · ");
    return (
        <div className="grid grid-cols-1 items-center gap-[18px] rounded-[18px] border border-[#e3e9ee] bg-white p-[18px_20px] md:grid-cols-[1.6fr_1fr]">
            <div>
                <div className="flex flex-wrap items-center gap-2.5">
                    <p className="m-0 text-[17px] font-extrabold text-[#14212b]">{entry.ventureName || "Untitled venture"}</p>
                    <StatusChip entry={entry} />
                    {isFacultyVenture(entry) ? <span className="rounded-full bg-[#fff8e1] px-2.5 py-1 text-[11.5px] font-extrabold uppercase text-[#a06a00]">Faculty venture</span> : null}
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
                    Action with: {waiting ? "Faculty" : isPathEntryApproved(entry) ? "None — Approved" : isRejected(entry) ? "None — Rejected" : isFacultyVenture(entry) ? "Faculty founder" : "Student"}
                </span>
                {waiting ? (
                    <span className="rounded-full bg-[#ede7f6] px-2.5 py-1 text-[12px] font-bold text-[#5e35b1]">
                        AI pre-screen {meritScore(entry)} · {computeVentureMeritScorecard(entry).grade}
                    </span>
                ) : null}
                {draftish && student.to ? (
                    <>
                        <a href={mailtoHref(student.to, student.subject, student.body)} className="rounded-[10px] bg-[#3b5ba9] px-3 py-1.5 text-[12.5px] font-bold text-white">Email {student.label}</a>
                        <a href={whatsappShareHref(`${student.subject}\n\n${student.body}`)} target="_blank" rel="noreferrer" className="rounded-[10px] bg-[#25d366] px-3 py-1.5 text-[12.5px] font-bold text-white">WhatsApp {student.label}</a>
                    </>
                ) : null}
                {(draftish || waiting) && faculty.to ? (
                    <>
                        <a href={mailtoHref(faculty.to, faculty.subject, faculty.body)} className="rounded-[10px] bg-[#3b5ba9] px-3 py-1.5 text-[12.5px] font-bold text-white">Email {faculty.label}</a>
                        <a href={whatsappShareHref(`${faculty.subject}\n\n${faculty.body}`)} target="_blank" rel="noreferrer" className="rounded-[10px] bg-[#25d366] px-3 py-1.5 text-[12.5px] font-bold text-white">WhatsApp {faculty.label}</a>
                    </>
                ) : null}
                <button type="button" onClick={onOpen} className={`rounded-[10px] px-3 py-1.5 text-[12.5px] font-bold ${waiting ? "bg-[#eef3f6] text-[#0b4b57]" : "bg-[#eef3f6] text-[#0b4b57]"}`}>
                    {waiting ? "View Venture Card" : "Details"}
                </button>
            </div>
        </div>
    );
}

function WallCard({
    entry,
    variant,
    onOpen,
    onSpotlight,
    spotlighting,
}: {
    entry: HubVenture;
    variant: VentureHubVariant;
    onOpen: () => void;
    onSpotlight?: () => void;
    spotlighting?: boolean;
}) {
    const ribbon = entry.meritRibbon;
    const pitch = entry.solutionInfo?.solution || entry.ideaInfo?.pitch || entry.sectionSummaries?.opportunity || "Approved venture record.";
    const traction = (entry.tractionRows || []).filter((r) => r.metric || r.value).slice(0, 3).map((r) => [r.metric, r.value].filter(Boolean).join(" ")).join("; ");
    return (
        <div className="flex flex-col overflow-hidden rounded-[20px] border border-[#e3e9ee] bg-white">
            <div className="bg-[linear-gradient(120deg,#0b4b57,#0f8f8a)] px-[18px] py-4 text-white">
                <small className="text-[11px] font-bold tracking-wide text-[#bfe8e4]">{displayVentureId(entry)} · {universityNameOf(entry)}</small>
                <h4 className="m-0 mt-1 text-[17px] font-bold">{entry.ventureName || "Untitled venture"}</h4>
                <div className="mt-1 text-[12.5px] text-[#dff3f1]">{[ownerName(entry), entry.ideaInfo?.sector, entry.stage].filter(Boolean).join(" · ")}</div>
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
                        <span className={`rounded-lg border px-2 py-0.5 text-[11px] font-extrabold ${variant === "ciel" ? "border-[#d1c4e9] bg-[#ede7f6] text-[#5e35b1]" : "border-[#d1c4e9] bg-[#ede7f6] text-[#5e35b1]"}`}>
                            {variant === "ciel" ? "🌐" : "🏛️"} Rank #{ribbon.rank} · {ribbon.scope}
                        </span>
                    </div>
                ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-[#e3e9ee] px-[18px] py-3">
                <span className="rounded-full bg-[#e6f6ec] px-2.5 py-1 text-[11.5px] font-extrabold uppercase text-[#1c8a52]">Approved {formatDay(entry.updatedAt)}</span>
                {ribbon?.total != null ? <span className="rounded-full bg-[#e0f2f1] px-2.5 py-1 text-[11.5px] font-extrabold uppercase text-[#0b6f6c]">Faculty score {ribbon.total}</span> : null}
                {isInvestorOpen(entry) ? <span className="rounded-full bg-[#ede7f6] px-2.5 py-1 text-[11.5px] font-extrabold uppercase text-[#5e35b1]">Investor opt-in</span> : null}
                <span className="flex-1" />
                {onSpotlight ? (
                    <button type="button" disabled={spotlighting} onClick={onSpotlight} className={`rounded-[10px] px-3 py-1.5 text-[12.5px] font-bold ${isFeatured(entry) ? "bg-[#eef3f6] text-[#0b4b57]" : "bg-[#f39c12] text-white"} disabled:opacity-50`}>
                        {isFeatured(entry) ? "Spotlighted" : "Spotlight"}
                    </button>
                ) : null}
                <button type="button" onClick={onOpen} className="rounded-[10px] bg-[#eef3f6] px-3 py-1.5 text-[12.5px] font-bold text-[#0b4b57]">Open</button>
            </div>
        </div>
    );
}

function RecordView({
    entry,
    loading,
    variant,
    onBack,
    onSpotlight,
    spotlighting,
}: {
    entry: HubVenture | null;
    loading: boolean;
    variant: VentureHubVariant;
    onBack: string;
    onSpotlight?: () => void;
    spotlighting?: boolean;
}) {
    if (loading && !entry) return <div className="h-40 animate-pulse rounded-[22px] bg-slate-100" />;
    if (!entry) {
        return (
            <div className="rounded-[22px] bg-white p-8 text-center text-[#5d6c78] shadow-[0_8px_30px_rgba(10,30,40,.08)]">
                <PanelBack href={onBack} />
                <p className="mt-4">This venture card is not in this network deck.</p>
            </div>
        );
    }
    const waiting = isPathEntryWaiting(entry);
    const notes = analyserNotes(entry);
    const scorecard = notes.scorecard;
    const ribbon = entry.meritRibbon;
    const decided = entry.reviewPipeline?.supervisorStatus && entry.reviewPipeline.supervisorStatus !== "pending" && entry.reviewPipeline.supervisorStatus !== "not_started";
    const log = activityLog(entry);
    return (
        <div className="rounded-[22px] bg-white p-[26px_30px] shadow-[0_8px_30px_rgba(10,30,40,.08)]">
            <div className="mb-[18px] flex flex-wrap items-start gap-3.5">
                <PanelBack href={onBack} />
                <div className="min-w-0 flex-1">
                    <h3 className="m-0 text-[22px] font-bold">{entry.ventureName || "Untitled venture"}</h3>
                    <p className="mt-1.5 text-[14.5px] text-[#5d6c78]">
                        {displayVentureId(entry)} · {ventureStatusLabel(entry).label} · Action with: {waiting ? "Faculty" : isPathEntryApproved(entry) ? "None — Approved" : ownerName(entry)}
                    </p>
                </div>
            </div>
            <VentureTimeline entry={entry} />
            <div className="mt-4 overflow-hidden rounded-[22px] border border-[#e3e9ee]">
                <div className="flex flex-wrap items-start justify-between gap-4 bg-[linear-gradient(120deg,#0b4b57,#0f8f8a)] px-6 py-5 text-white">
                    <div>
                        <div className="text-[12px] font-bold tracking-wide text-[#bfe8e4]">{displayVentureId(entry)} · {universityNameOf(entry)}</div>
                        <h4 className="m-0 mt-1 text-[22px] font-bold">{entry.ventureName || "Untitled venture"}</h4>
                        <div className="mt-1.5 text-[13px] text-[#dff3f1]">
                            {isFacultyVenture(entry) ? "Faculty venture · " : ""}
                            {ownerName(entry)}
                            {(entry.team || []).length > 1 ? ` + ${(entry.team || []).length - 1} team` : ""}
                            {entry.academicSetup?.courseCode ? ` · ${entry.academicSetup.courseCode}` : ""}
                            {!isFacultyVenture(entry) && facultyName(entry) ? ` · Faculty: ${facultyName(entry)}` : ""}
                        </div>
                    </div>
                    <div className="text-right">
                        <StatusChip entry={entry} />
                        <div className="mt-2 text-[12px] text-[#dff3f1]">
                            {isInvestorOpen(entry) ? "🤝 Open to investors" : "🔒 Not seeking investment"}
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-2.5 p-6 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                        { k: "Sector · Stage", v: [entry.ideaInfo?.sector, entry.stage].filter(Boolean).join(" · ") },
                        { k: "Problem", v: entry.ideaInfo?.problem || entry.ideaInfo?.pitch },
                        { k: "Solution", v: entry.solutionInfo?.solution },
                        { k: "Business model", v: entry.solutionInfo?.revenue || (entry.solutionInfo?.revenueModels || []).join(", ") },
                        { k: "Traction & evidence", v: tractionLine(entry) === "no traction logged" ? "" : tractionLine(entry) },
                        { k: "Team", v: (entry.team || []).map((m) => m.name).filter(Boolean).join(", ") || ownerName(entry) },
                    ].filter((x) => x.v).map((x) => (
                        <div key={x.k} className="rounded-xl bg-[#f6f8fa] px-3 py-2.5 text-[13px]">
                            <b className="mb-0.5 block text-[11px] font-bold uppercase tracking-wide text-[#5d6c78]">{x.k}</b>
                            {x.v}
                        </div>
                    ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e3e9ee] px-6 py-4">
                    <div>
                        {sdgNumbers(entry).map((n) => (
                            <span key={n} title={SDG_SHORT[n]} className="mr-1.5 mb-1 inline-block rounded-lg px-2 py-0.5 text-[11.5px] font-extrabold text-white" style={{ background: SDG_COLORS[n] }}>SDG {n}</span>
                        ))}
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="max-w-[220px] text-right text-[12px] text-[#5d6c78]">AI pre-screen (decision support only — never shown to the student)</span>
                        <ScoreRing value={scorecard.total} label={notes.band} />
                    </div>
                </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-[18px] md:grid-cols-2">
                <div className="rounded-[18px] border border-[#e3e9ee] p-5">
                    <b>AI Analyser — section-by-section (decision support only; AI never approves or rejects)</b>
                    <div className="mt-3 space-y-2">
                        {scorecard.criteria.map((c) => (
                            <div key={c.key}>
                                <div className="flex justify-between text-[12.5px]"><span>{c.label}</span><b>{c.points}/{c.max}</b></div>
                                <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#e9eef2]"><i className="block h-full rounded-full" style={{ width: `${(c.points / c.max) * 100}%`, background: c.color }} /></div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="rounded-[18px] border border-[#e3e9ee] p-5">
                    <b>AI notes</b>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-[#5d6c78]"><b>Analytical:</b> {notes.analytical.replace(/^Analytical:\s*/, "")}</p>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-[#5d6c78]"><b>Critical:</b> {notes.critical.replace(/^Critical:\s*/, "")}</p>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-[#5d6c78]"><b>Factual:</b> {notes.factual.replace(/^Factual:\s*/, "")}</p>
                    {variant !== "ciel" && waiting ? (
                        <p className="mt-3 text-[13px] text-[#5d6c78]">University can view this card and remind faculty. Only the named faculty member can approve, request revision, or reject.</p>
                    ) : null}
                    {entry.status !== "submitted" || isRevision(entry) ? (
                        <div className="mt-3 rounded-[14px] bg-[#fff8e1] px-4 py-3 text-[13.5px]">
                            Record still in the student workspace — completion {overallPct(entry)}%.
                            <CompletionBar entry={entry} />
                        </div>
                    ) : null}
                </div>
            </div>
            {decided ? (
                <div className="mt-4 grid grid-cols-1 gap-[18px] md:grid-cols-2">
                    <div className="rounded-[18px] border border-[#e3e9ee] p-5">
                        <div className="flex items-center gap-4">
                            {ribbon?.total != null || scorecard.total ? <ScoreRing value={ribbon?.total ?? scorecard.total} label="FACULTY SCORE" /> : null}
                            <div>
                                <b>Faculty decision — {ventureStatusLabel(entry).label}</b>
                                <p className="mt-2 text-[14px] leading-relaxed">{entry.reviewPipeline?.supervisorNote || "No overall remarks."}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-[18px] border border-[#e3e9ee] p-5">
                        <b>Section remarks</b>
                        <p className="mt-2 text-[13.5px] text-[#5d6c78]">No section-level remarks.</p>
                    </div>
                </div>
            ) : null}
            {isPathEntryApproved(entry) ? (
                <div className="mt-4 rounded-[18px] border border-[#e3e9ee] p-5">
                    <b>Recognition & investor activity</b>
                    {ribbon ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="rounded-lg border border-[#d1c4e9] bg-[#ede7f6] px-2 py-0.5 text-[11px] font-extrabold text-[#5e35b1]">
                                {variant === "ciel" ? "🌐" : "🏛️"} Rank #{ribbon.rank} · {ribbon.scope}
                            </span>
                        </div>
                    ) : (
                        <p className="mt-2 text-[13.5px] text-[#5d6c78]">No ranking badges yet.</p>
                    )}
                    {isInvestorOpen(entry) ? (
                        <div className="mt-3 rounded-[14px] bg-[#e8f7ef] px-4 py-3">
                            <b>🤝 Investor activity via CIEL Investor Hub</b>
                            <div className="mt-2 grid grid-cols-3 gap-2">
                                <div className="rounded-[12px] bg-white px-3 py-2"><b className="block text-lg">0</b><small className="text-[11px] text-[#5d6c78]">Card views</small></div>
                                <div className="rounded-[12px] bg-white px-3 py-2"><b className="block text-lg">0</b><small className="text-[11px] text-[#5d6c78]">Interest received</small></div>
                                <div className="rounded-[12px] bg-white px-3 py-2"><b className="block text-lg">0</b><small className="text-[11px] text-[#5d6c78]">Founder-contact requests</small></div>
                            </div>
                            {variant === "ciel" && onSpotlight ? (
                                <button type="button" disabled={spotlighting} onClick={onSpotlight} className={`mt-3 rounded-[10px] px-3 py-1.5 text-[12.5px] font-bold ${isFeatured(entry) ? "bg-[#eef3f6] text-[#0b4b57]" : "bg-[#f39c12] text-white"} disabled:opacity-50`}>
                                    {isFeatured(entry) ? "Remove Investor Hub spotlight" : "Spotlight in Investor Hub"}
                                </button>
                            ) : null}
                        </div>
                    ) : (
                        <p className="mt-2 text-[13.5px] text-[#5d6c78]">Not opted in to investors — impact walls only.</p>
                    )}
                </div>
            ) : null}
            <div className="mt-4 rounded-[18px] border border-[#e3e9ee] p-5">
                <b>Activity log</b>
                {log.length === 0 ? (
                    <p className="mt-2 text-[13.5px] text-[#5d6c78]">No activity recorded yet.</p>
                ) : (
                    <div className="mt-3 divide-y divide-[#eef2f5]">
                        {log.map((row, i) => (
                            <div key={`${row.t}-${i}`} className="grid grid-cols-1 gap-1 py-2.5 text-[13px] sm:grid-cols-[160px_1fr_110px]">
                                <span className="font-bold text-[#14212b]">{row.who}</span>
                                <span className="text-[#5d6c78]">{row.action}</span>
                                <span className="text-[#9aa8b2] sm:text-right">{row.t}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
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

function ScoreRing({ value, label }: { value: number; label: string }) {
    const pct = Math.max(0, Math.min(100, value));
    return (
        <div className="flex h-[72px] w-[72px] shrink-0 flex-col items-center justify-center rounded-full border-[5px] border-[#0f8f8a] bg-white text-center">
            <b className="text-[16px] leading-none text-[#0b4b57]">{Math.round(pct)}</b>
            <small className="mt-0.5 max-w-[58px] text-[8px] font-extrabold uppercase leading-tight tracking-wide text-[#5d6c78]">{label}</small>
        </div>
    );
}
