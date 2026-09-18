"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import clsx from "clsx";
import { authenticatedFetch } from "@/utils/api";
import { type FypEntry, fypRouteFor, type FypRoute, normalizeFypTeamMembers } from "@/utils/fypTypes";
import {
    FYP_MERIT_RUBRIC,
    computeFypMeritScorecard,
    whyFypLeads,
    fypPotential,
    fypMeritGrade,
    type FypMeritScorecard,
    type FypMeritCriterionResult,
    type FypMeritConsistencyFlag,
} from "@/utils/fypMeritModel";
import type { FypMeritEntry } from "@/components/ciel/FypMeritPanel";

interface BackendFypMeritCard {
    id: string;
    route: FypRoute;
    scorecard: Record<FypMeritCriterionResult["key"], { pts: number; max: number; note: string; flag?: string }> & { total: number };
}

const ROUTE_META: Record<FypRoute, { emoji: string; label: string; color: string; soft: string }> = {
    scholar: { emoji: "📜", label: "Scholar", color: "#2563eb", soft: "#e8effe" },
    maker: { emoji: "🎨", label: "Maker", color: "#c98a04", soft: "#fdf3dd" },
    builder: { emoji: "🖥️", label: "Builder", color: "#0f766e", soft: "#e0f3f1" },
    storyteller: { emoji: "🎬", label: "Storyteller", color: "#db2777", soft: "#fdeaf3" },
    consultant: { emoji: "📊", label: "Consultant", color: "#7c3aed", soft: "#f1eafe" },
};

const RUBRIC_VERSION = "CIEL-PK-FYP-COMP-2.0";
const QUOTA = 3;

type Stakeholder = "FACULTY" | "UNIVERSITY" | "CIEL_PK";
type StudioMode = "PREVIEW" | "PUBLISHED_FINAL" | "LIVE";

interface PubLog {
    id: string;
    on: string;
    mode: StudioMode;
    cohortName: string;
    cohortDef: string;
    size: number;
}

function asKnownFypRoute(route: string): FypRoute {
    return route in ROUTE_META ? (route as FypRoute) : "scholar";
}

function fypScorecardFromBackend(card: BackendFypMeritCard): FypMeritScorecard {
    const criteria: FypMeritCriterionResult[] = FYP_MERIT_RUBRIC.map((rubric) => {
        const crit = card.scorecard[rubric.key];
        return { ...rubric, points: crit?.pts ?? 0, note: crit?.note ?? "" };
    });
    const honestyFlag = card.scorecard.honesty?.flag;
    const consistency: FypMeritConsistencyFlag = honestyFlag
        ? { ok: honestyFlag.startsWith("✅"), message: honestyFlag.replace(/^[✅⚠️]\s*/u, "") }
        : { ok: true, message: "Consistency: claims match declared evidence." };
    const total = card.scorecard.total;
    const [grade, gradeColor] = fypMeritGrade(total);
    return { route: asKnownFypRoute(card.route), criteria, total, grade, gradeColor, consistency, eligible: true };
}

export function currentAcademicYear(d = new Date()) {
    const y = d.getFullYear();
    const m = d.getMonth();
    return m >= 7 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`;
}

function academicYearOf(iso?: string | null) {
    if (!iso) return currentAcademicYear();
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return currentAcademicYear();
    return currentAcademicYear(d);
}

function todayLabel() {
    return new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function entrySchool(e: FypMeritEntry) {
    return e.projectInfo?.school || e.student?.department || "Unspecified";
}
function entryUniversity(e: FypMeritEntry) {
    return e.projectInfo?.university || e.student?.institution || "Unspecified";
}
function entryDisplayName(e: FypMeritEntry) {
    return e.projectInfo?.studentName || e.student?.name || "Student";
}
function entryProg(e: FypMeritEntry) {
    return e.projectInfo?.degree || e.projectInfo?.officialProgram || "Unspecified";
}
function entryLevel(e: FypMeritEntry) {
    return e.projectInfo?.academicLevel || "Unspecified";
}
function entrySem(e: FypMeritEntry) {
    return e.projectInfo?.span || "Unspecified";
}
function entryBatch(e: FypMeritEntry) {
    return e.projectInfo?.graduationYear || "Unspecified";
}
function entrySupervisor(e: FypMeritEntry) {
    return e.projectInfo?.supervisorName || "Unspecified";
}
function entryProjectType(e: FypMeritEntry) {
    return ROUTE_META[fypRouteFor(e.projectInfo)].label;
}
function entryFormat(e: FypMeritEntry) {
    return normalizeFypTeamMembers(e.projectInfo?.teamMembers).some((m) => m.name?.trim()) ? "Group" : "Individual";
}
function entrySdgKey(e: FypMeritEntry) {
    const n = e.sdgMapping?.entries?.[0]?.goalNumber;
    return n ? String(n) : "none";
}
function entryAy(e: FypMeritEntry) {
    return academicYearOf(e.supervisorApprovalAt || e.createdAt);
}

function studioClass(total: number) {
    if (total >= 90) return "Exceptional / Benchmark";
    if (total >= 80) return "Advanced";
    if (total >= 70) return "Strong";
    if (total >= 60) return "Proficient";
    if (total >= 50) return "Developing";
    if (total >= 40) return "Foundational";
    return "Limited / Insufficiently Demonstrated";
}

function unique(values: string[]) {
    return Array.from(new Set(values.filter(Boolean))).sort();
}

function logKey(stakeholder: Stakeholder) {
    return `ciel-fyp-studio-log-${stakeholder}`;
}
function loadLog(stakeholder: Stakeholder): PubLog[] {
    try {
        const raw = sessionStorage.getItem(logKey(stakeholder));
        return raw ? (JSON.parse(raw) as PubLog[]) : [];
    } catch {
        return [];
    }
}
function saveLog(stakeholder: Stakeholder, rows: PubLog[]) {
    try {
        sessionStorage.setItem(logKey(stakeholder), JSON.stringify(rows.slice(-20)));
    } catch {
        /* ignore quota */
    }
}

function Field({
    label,
    value,
    onChange,
    options,
    sdg,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: string[];
    sdg?: boolean;
}) {
    return (
        <div>
            <label className="mb-1 block text-[8.5px] font-black uppercase tracking-[0.08em] text-[#71828e]">{label}</label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-[10px] border border-[#dde5ea] bg-white px-[9px] py-[9px] text-[11px] text-[#4c5d65] outline-none"
            >
                <option value="">All</option>
                {options.map((o) => (
                    <option key={o} value={o}>
                        {sdg ? (o === "none" ? "No SDG (declared N/A)" : `SDG ${o}`) : o}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default function FypRankingStudio({
    entries,
    meritEndpoint,
    stakeholder = "FACULTY",
    byLabel = "Faculty",
    uniLabel = "University",
    scopeLabel = "My approved Final Year Projects",
    onOpenCard,
    onOpenReview,
    onQuotaChange,
}: {
    entries: FypMeritEntry[];
    meritEndpoint?: string;
    stakeholder?: Stakeholder;
    byLabel?: string;
    uniLabel?: string;
    scopeLabel?: string;
    onOpenCard?: (entry: FypEntry) => void;
    onOpenReview?: (entry: FypEntry) => void;
    onQuotaChange?: (runs: { unlimited: boolean; used: number; limit: number }) => void;
}) {
    const AY = currentAcademicYear();
    const [ranked, setRanked] = useState(false);
    const [mode, setMode] = useState<StudioMode | null>(null);
    const [filters, setFilters] = useState({
        uni: "",
        dept: "",
        faculty: "",
        course: "",
        prog: "",
        level: "",
        sem: "",
        ay: "",
        batch: "",
        sdg: "",
        format: "",
    });
    const [cohortName, setCohortName] = useState("");
    const [openId, setOpenId] = useState<string | null>(null);
    const [backendCards, setBackendCards] = useState<Map<string, BackendFypMeritCard>>(new Map());
    const [meritLoading, setMeritLoading] = useState(false);
    const [notifiedIds, setNotifiedIds] = useState<string[]>([]);
    const [notifyState, setNotifyState] = useState<"idle" | "sending" | "sent" | "failed" | "exhausted">("idle");
    const [notifyErrorMessage, setNotifyErrorMessage] = useState<string | null>(null);
    const [graderRuns, setGraderRunsState] = useState<{ unlimited: boolean; used: number; limit: number } | null>(null);
    const [pubLog, setPubLog] = useState<PubLog[]>([]);
    const [runOn, setRunOn] = useState("");
    const requestIdRef = useRef(0);
    const pendingPublishRef = useRef(false);
    const applyQuota = (runs: { unlimited: boolean; used: number; limit: number }) => {
        setGraderRunsState(runs);
        onQuotaChange?.(runs);
    };

    useEffect(() => {
        setPubLog(loadLog(stakeholder));
    }, [stakeholder]);

    useEffect(() => {
        if (!meritEndpoint) return;
        authenticatedFetch(meritEndpoint)
            .then((res) => (res?.ok ? res.json() : null))
            .then((result) => {
                if (result?.data?.graderRuns) applyQuota(result.data.graderRuns);
            })
            .catch(() => {});
    }, [meritEndpoint]);

    const setF = (key: keyof typeof filters, value: string) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setRanked(false);
        setMode(null);
        setNotifyState("idle");
        setNotifiedIds([]);
    };

    const pool = useMemo(() => {
        return entries.filter((e) => {
            if (filters.uni && entryUniversity(e) !== filters.uni) return false;
            if (filters.dept && entrySchool(e) !== filters.dept) return false;
            if (filters.faculty && entrySupervisor(e) !== filters.faculty) return false;
            if (filters.course && entryProjectType(e) !== filters.course) return false;
            if (filters.prog && entryProg(e) !== filters.prog) return false;
            if (filters.level && entryLevel(e) !== filters.level) return false;
            if (filters.sem && entrySem(e) !== filters.sem) return false;
            if (filters.ay && entryAy(e) !== filters.ay) return false;
            if (filters.batch && entryBatch(e) !== filters.batch) return false;
            if (filters.sdg && entrySdgKey(e) !== filters.sdg) return false;
            if (filters.format && entryFormat(e) !== filters.format) return false;
            return true;
        });
    }, [entries, filters]);

    const runMeritModel = (nextMode: StudioMode) => {
        setRanked(true);
        setMode(nextMode);
        setRunOn(todayLabel());
        setOpenId(null);
        setNotifiedIds([]);
        setNotifyState("idle");
        setNotifyErrorMessage(null);
        const requestId = ++requestIdRef.current;
        if (!meritEndpoint) {
            pushLog(nextMode);
            return;
        }
        setMeritLoading(true);
        authenticatedFetch(meritEndpoint)
            .then((res) => (res?.ok ? res.json() : null))
            .then((result) => {
                if (requestId !== requestIdRef.current) return;
                const cards: BackendFypMeritCard[] = Array.isArray(result?.data?.entries) ? result.data.entries : [];
                setBackendCards(new Map(cards.filter((c) => c.id).map((c) => [c.id, c])));
                if (result?.data?.graderRuns) applyQuota(result.data.graderRuns);
            })
            .catch(() => {})
            .finally(() => {
                if (requestId === requestIdRef.current) setMeritLoading(false);
            });
        if (nextMode === "PREVIEW") {
            pushLog("PREVIEW");
            toast.success(`Preview ranked ${pool.length} records — no badges issued. Open any row for section-by-section reasoning.`);
        }
    };

    const scored = useMemo(() => {
        const withScores = pool.map((e) => {
            const backendCard = e.id ? backendCards.get(e.id) : undefined;
            const scorecard = backendCard ? fypScorecardFromBackend(backendCard) : computeFypMeritScorecard(e);
            return { entry: e, scorecard };
        });
        if (ranked) {
            withScores.sort(
                (a, b) => Number(b.scorecard.eligible) - Number(a.scorecard.eligible) || b.scorecard.total - a.scorecard.total,
            );
        }
        return withScores;
    }, [pool, ranked, backendCards]);

    const eligibleRanked = useMemo(() => scored.filter((x) => x.scorecard.eligible), [scored]);
    const n = eligibleRanked.length;
    const mixedLevel = new Set(pool.map(entryLevel)).size > 1;
    const isC = stakeholder === "CIEL_PK";
    const used = graderRuns?.unlimited ? 0 : graderRuns?.used ?? 0;
    const limit = graderRuns?.unlimited ? 0 : graderRuns?.limit ?? QUOTA;
    const left = graderRuns?.unlimited ? 99 : Math.max(0, limit - used);
    const runsExhausted = !!graderRuns && !graderRuns.unlimited && graderRuns.used >= graderRuns.limit;

    const filterParts = [
        filters.dept && `Department / School: ${filters.dept}`,
        filters.faculty && `Faculty / Supervisor: ${filters.faculty}`,
        filters.course && `Project type: ${filters.course}`,
        filters.prog && `Programme: ${filters.prog}`,
        filters.level && `Academic level: ${filters.level}`,
        filters.sem && `Semester: ${filters.sem}`,
        filters.ay && `Academic year: ${filters.ay}`,
        filters.batch && `Batch: ${filters.batch}`,
        filters.sdg && `Primary SDG: ${filters.sdg === "none" ? "no SDG" : `SDG ${filters.sdg}`}`,
        filters.format && `Format: ${filters.format}`,
        filters.uni && `University: ${filters.uni}`,
    ].filter(Boolean);
    const cohortDef = `${scopeLabel}${filterParts.length ? ` · ${filterParts.join(" · ")}` : " · all approved Final Year Projects"}`;
    const resolvedName =
        cohortName.trim() ||
        (stakeholder === "FACULTY"
            ? `${byLabel} · FYP cohort · ${filters.prog || "all programmes"} · ${filters.ay || AY}`
            : stakeholder === "UNIVERSITY"
              ? `${uniLabel} Final Year Projects · ${filters.dept || "all departments"} · ${filters.ay || AY}`
              : "CIEL PK National FYP · Live");

    const pushLog = (logMode: StudioMode) => {
        const row: PubLog = {
            id: `RUN-${Date.now().toString(36).toUpperCase()}`,
            on: todayLabel(),
            mode: logMode,
            cohortName: resolvedName,
            cohortDef,
            size: pool.length,
        };
        setPubLog((prev) => {
            const next = [...prev, row].slice(-20);
            saveLog(stakeholder, next);
            return next;
        });
    };

    const notifyTop = (ids: string[], picks: { entryId: string; rank: number; of: number; total: number }[]) => {
        if (!meritEndpoint || !ids.length) return;
        setNotifyState("sending");
        setNotifyErrorMessage(null);
        authenticatedFetch(`${meritEndpoint.replace(/\/merit-model\/?$/, "")}/merit-model/notify`, {
            method: "POST",
            body: JSON.stringify({ entryIds: ids, picks, scopeLabel: resolvedName }),
        })
            .then(async (res) => {
                if (!res) {
                    setNotifyState("failed");
                    return;
                }
                const body = await res.json().catch(() => null);
                if (res.ok && body?.success) {
                    setNotifiedIds(ids);
                    setNotifyState("sent");
                    if (body?.data?.graderRuns) applyQuota(body.data.graderRuns);
                    pushLog(isC ? "LIVE" : "PUBLISHED_FINAL");
                    toast.success(
                        isC
                            ? "Live ranking updated — 🌐 CIEL PK badges refreshed on every student's impact wall."
                            : `Official ranking published — 🏅 Supervisor Cohort badges issued, dated today and fixed. ${Math.max(0, (body?.data?.graderRuns?.limit ?? QUOTA) - (body?.data?.graderRuns?.used ?? used + 1))} official publication(s) left this year.`,
                    );
                    return;
                }
                if (res.status === 403 && body?.code === "GRADER_RUNS_EXHAUSTED") {
                    setNotifyState("exhausted");
                    setNotifyErrorMessage(typeof body?.message === "string" ? body.message : "No official publications remaining this academic year.");
                    applyQuota({ unlimited: false, used: body.used ?? 3, limit: body.limit ?? 3 });
                    toast.error("No official publications remaining this academic year (3 of 3 used). You can still run the analysis in preview.");
                    return;
                }
                setNotifyState("failed");
                toast.error("Ranking is saved on this screen — student notifications did not send.");
            })
            .catch(() => {
                setNotifyState("failed");
                toast.error("Ranking is saved on this screen — student notifications did not send.");
            });
    };

    const preview = () => {
        if (pool.length < 2) return;
        pendingPublishRef.current = false;
        runMeritModel("PREVIEW");
    };

    const publish = () => {
        if (pool.length < 2) return;
        if (!isC) {
            if (left <= 0) {
                toast.error("No official publications remaining this academic year (3 of 3 used). You can still run the analysis in preview — unofficially and confidentially — anytime.");
                return;
            }
            const ok = window.confirm(
                `Publish FINAL ranking for "${resolvedName}" (${pool.length} records)?\n\nThis uses 1 of your ${left} remaining publications for AY ${AY}, issues a LOCKED, dated ${stakeholder === "FACULTY" ? "Faculty AI Analyser" : "University AI Analyser"} badge to every student in the cohort (visible on the student, university and CIEL PK dashboards), and cannot be undone.\n\nCIEL PK guidance: publish at the end of a semester, once every Final Year Project in the cohort is approved.`,
            );
            if (!ok) return;
        }
        pendingPublishRef.current = true;
        runMeritModel(isC ? "LIVE" : "PUBLISHED_FINAL");
    };

    useEffect(() => {
        if (!pendingPublishRef.current || !ranked || meritLoading) return;
        pendingPublishRef.current = false;
        const top = eligibleRanked.slice(0, 3);
        const ids = top.map((x) => x.entry.id).filter(Boolean) as string[];
        if (!ids.length) return;
        const picks = top
            .filter((x) => x.entry.id)
            .map((x, i) => ({ entryId: x.entry.id as string, rank: i + 1, of: eligibleRanked.length, total: x.scorecard.total }));
        notifyTop(ids, picks);
        // Publish once after scores settle — do not re-fire when the ranked list identity changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ranked, meritLoading]);

    const visibleUni = stakeholder === "CIEL_PK";
    const visibleFaculty = stakeholder !== "FACULTY";

    const step2hot = !ranked;
    const step3hot = ranked && mode === "PREVIEW";
    const step3done = ranked && mode !== "PREVIEW";
    const step4done = mode === "PUBLISHED_FINAL" || mode === "LIVE";

    return (
        <div className="grid gap-3.5">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
                <div className="relative rounded-[13px] border border-[#cceee4] bg-[#ebf8f4] px-3 py-[11px] text-[10.5px] leading-[1.45] text-[#5c6d76]">
                    <span className="absolute -top-2 left-2.5 rounded-full bg-[#153f47] px-[7px] py-0.5 text-[8.5px] font-black text-white">1</span>
                    <b className="mb-0.5 block text-[11.5px] text-[#16313d]">Supervisor approves</b>
                    Only supervisor-approved Final Year Projects are eligible. Drafts and pending records are never ranked.
                </div>
                <div className={clsx("relative rounded-[13px] border px-3 py-[11px] text-[10.5px] leading-[1.45] text-[#5c6d76]", step2hot ? "border-[#dccfff] bg-[#f3edff]" : "border-[#cceee4] bg-[#ebf8f4]")}>
                    <span className="absolute -top-2 left-2.5 rounded-full bg-[#153f47] px-[7px] py-0.5 text-[8.5px] font-black text-white">2</span>
                    <b className="mb-0.5 block text-[11.5px] text-[#16313d]">Define the cohort</b>
                    Filter before you run — programme, department, supervisor, semester, year, level, SDG. Rank always carries its cohort.
                </div>
                <div className={clsx("relative rounded-[13px] border px-3 py-[11px] text-[10.5px] leading-[1.45] text-[#5c6d76]", step3hot ? "border-[#dccfff] bg-[#f3edff]" : step3done ? "border-[#cceee4] bg-[#ebf8f4]" : "border-[#dde5ea] bg-white")}>
                    <span className="absolute -top-2 left-2.5 rounded-full bg-[#153f47] px-[7px] py-0.5 text-[8.5px] font-black text-white">3</span>
                    <b className="mb-0.5 block text-[11.5px] text-[#16313d]">Preview — unlimited</b>
                    Unofficial & confidential: only you see it. Same rubric, same scores, full reasoning. No badge is issued from a preview.
                </div>
                <div className={clsx("relative rounded-[13px] border px-3 py-[11px] text-[10.5px] leading-[1.45] text-[#5c6d76]", step4done ? "border-[#cceee4] bg-[#ebf8f4]" : "border-[#dde5ea] bg-white")}>
                    <span className="absolute -top-2 left-2.5 rounded-full bg-[#153f47] px-[7px] py-0.5 text-[8.5px] font-black text-white">4</span>
                    <b className="mb-0.5 block text-[11.5px] text-[#16313d]">{isC ? "Run live — anytime" : "Publish official — 3 / year"}</b>
                    {isC
                        ? "CIEL PK live rank moves like a stock as the cohort changes; the quality score never moves with it."
                        : "Preferably at the end of the semester. Publishing is official and final: badges are dated and fixed that day, on every stakeholder dashboard."}
                </div>
                <div className="relative rounded-[13px] border border-[#dde5ea] bg-white px-3 py-[11px] text-[10.5px] leading-[1.45] text-[#5c6d76]">
                    <span className="absolute -top-2 left-2.5 rounded-full bg-[#153f47] px-[7px] py-0.5 text-[8.5px] font-black text-white">5</span>
                    <b className="mb-0.5 block text-[11.5px] text-[#16313d]">Badge on student wall</b>
                    {isC
                        ? "🌐 CIEL PK Live badge updates with every run (▲▼), best rank is kept."
                        : `${stakeholder === "FACULTY" ? "🏅 Supervisor Cohort" : "🏛️ University FYP"} badge lands on My Final Year Project Impact with rank, cohort size and top-%.`}
                </div>
            </div>

            {isC ? (
                <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#dde5ea] bg-[linear-gradient(120deg,#f7f3ff,#fff)] px-4 py-3.5">
                    <div>
                        <div className="text-[9px] font-black tracking-[0.08em] text-[#6d3df5]">CIEL PK LIVE RANKING</div>
                        <div className="text-[26px] font-[950] leading-none text-[#6d3df5]">∞</div>
                    </div>
                    <div className="min-w-[260px] flex-1 text-[11px] leading-[1.55] text-[#4b4f66]">
                        <b className="text-[#16313d]">Run anytime.</b> Every live run re-ranks the whole eligible cohort and updates each student&apos;s 🌐 live badge with a trend arrow (▲ up, ▼ down, ▬ same, ✦ new) and best-ever rank. Supervisor and University badges are never touched by a live run. Quality scores are absolute against the rubric and do not change because the cohort changed.
                    </div>
                    <div>
                        <div className="text-[9px] font-black tracking-[0.08em] text-[#6d3df5]">LIVE RUNS SO FAR</div>
                        <div className="text-[26px] font-[950] leading-none text-[#c92a5b]">{pubLog.filter((x) => x.mode === "LIVE").length}</div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#dde5ea] bg-[linear-gradient(120deg,#f7f3ff,#fff)] px-4 py-3.5">
                    <div>
                        <div className="text-[9px] font-black tracking-[0.08em] text-[#6d3df5]">OFFICIAL PUBLICATIONS · AY {AY}</div>
                        <div className="text-[26px] font-[950] leading-none text-[#6d3df5]">
                            {used} <span className="text-[13px] text-[#84939c]">of {limit || QUOTA} used</span>
                        </div>
                        <div className="mt-1.5 flex gap-[5px]">
                            {[0, 1, 2].map((i) => (
                                <i key={i} className={clsx("inline-block h-2.5 w-[34px] rounded-full", i < used ? "bg-[#6d3df5]" : "bg-[#e8e2f8]")} />
                            ))}
                        </div>
                    </div>
                    <div className="min-w-[260px] flex-1 text-[11px] leading-[1.55] text-[#4b4f66]">
                        <b className="text-[#16313d]">Preview as often as you like — previews are unofficial and confidential, visible only to you.</b> Official publication is limited to <b>{QUOTA} runs per academic year</b> — run the analysis as often as you like, but publish (badge the students) at most three times a year, typically at the <b>end of a semester</b> once every Final Year Project in the cohort has been approved, so no student is ranked before their record exists. A published ranking is <b>final and fixed</b>: it issues a permanent {stakeholder === "FACULTY" ? "🏅 Supervisor Cohort" : "🏛️ University FYP"} badge to every student in the cohort. {stakeholder === "FACULTY" ? "Your university has the same rights on its own FYP cohorts; CIEL PK runs a live ranking on top." : "Supervisors have the same rights on their own cohorts; CIEL PK runs a live ranking on top."}
                    </div>
                    <div>
                        <div className="text-[9px] font-black tracking-[0.08em] text-[#6d3df5]">REMAINING</div>
                        <div className="text-[26px] font-[950] leading-none" style={{ color: left ? "#15966d" : "#cc5260" }}>
                            {graderRuns?.unlimited ? "∞" : left}
                        </div>
                    </div>
                </div>
            )}

            <div className="rounded-2xl border border-[#dde5ea] bg-white px-4 py-3.5">
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                    <b>🎯 Cohort filters — set these before you run</b>
                    <span className="text-[10.5px] text-[#70808a]">
                        {entries.length} approved Final Year Project{entries.length === 1 ? "" : "s"} in scope
                    </span>
                </div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                    {visibleUni ? <Field label="University" value={filters.uni} onChange={(v) => setF("uni", v)} options={unique(entries.map(entryUniversity))} /> : null}
                    <Field label="Department / School" value={filters.dept} onChange={(v) => setF("dept", v)} options={unique(entries.map(entrySchool))} />
                    {visibleFaculty ? <Field label="Faculty / Supervisor" value={filters.faculty} onChange={(v) => setF("faculty", v)} options={unique(entries.map(entrySupervisor))} /> : null}
                    <Field label="Project type" value={filters.course} onChange={(v) => setF("course", v)} options={unique(entries.map(entryProjectType))} />
                    <Field label="Programme" value={filters.prog} onChange={(v) => setF("prog", v)} options={unique(entries.map(entryProg))} />
                    <Field label="Academic level" value={filters.level} onChange={(v) => setF("level", v)} options={unique(entries.map(entryLevel))} />
                    <Field label="Semester" value={filters.sem} onChange={(v) => setF("sem", v)} options={unique(entries.map(entrySem))} />
                    <Field label="Academic year" value={filters.ay} onChange={(v) => setF("ay", v)} options={unique([AY, ...entries.map(entryAy)])} />
                    <Field label="Batch" value={filters.batch} onChange={(v) => setF("batch", v)} options={unique(entries.map(entryBatch))} />
                    <Field label="Primary SDG" value={filters.sdg} onChange={(v) => setF("sdg", v)} options={unique(entries.map(entrySdgKey))} sdg />
                    <Field label="Format" value={filters.format} onChange={(v) => setF("format", v)} options={unique(entries.map(entryFormat))} />
                    <div className="col-span-2">
                        <label className="mb-1 block text-[8.5px] font-black uppercase tracking-[0.08em] text-[#71828e]">Cohort name (shown on every badge)</label>
                        <input
                            value={cohortName}
                            onChange={(e) => setCohortName(e.target.value)}
                            placeholder={stakeholder === "FACULTY" ? "e.g. BBA Final Year Projects · Class of 2026" : stakeholder === "UNIVERSITY" ? "e.g. BNU Final Year Projects · 2026" : "CIEL PK National FYP · Live"}
                            className="w-full rounded-[10px] border border-[#dde5ea] bg-white px-[9px] py-[9px] text-[11px] text-[#4c5d65] outline-none"
                        />
                    </div>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-2.5 text-[11.5px]">
                    <span className="rounded-full border border-[#cbece4] bg-[#eef7f5] px-[11px] py-1.5 font-black text-[#16313d]">
                        {pool.length} Final Year Project{pool.length === 1 ? "" : "s"} in this cohort
                    </span>
                    <span className="text-[#70808a]">{cohortDef}</span>
                    {mixedLevel ? (
                        <span className="rounded-full bg-[#fff2dc] px-2.5 py-1 text-[10px] font-black text-[#9b6700]">⚠ MIXED_LEVEL_COHORT — undergraduate and postgraduate records; ranking continues, level earns no points</span>
                    ) : null}
                    {pool.length < 2 ? (
                        <span className="rounded-full bg-[#fff2dc] px-2.5 py-1 text-[10px] font-black text-[#9b6700]">Need at least 2 approved records to rank</span>
                    ) : null}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={preview}
                        disabled={pool.length < 2}
                        className="rounded-[11px] bg-[#eef2f3] px-[15px] py-[11px] text-[11px] font-black text-[#29454f] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        👁 Preview ranking (unlimited · unofficial & confidential)
                    </button>
                    {isC ? (
                        <button
                            type="button"
                            onClick={publish}
                            disabled={pool.length < 2}
                            className="rounded-[11px] bg-[#c92a5b] px-[15px] py-[11px] text-[11px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            🔴 Run live ranking → update student badges
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={publish}
                            disabled={pool.length < 2 || (!graderRuns?.unlimited && left <= 0) || notifyState === "sending"}
                            className="rounded-[11px] bg-[#6d3df5] px-[15px] py-[11px] text-[11px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            📣 Publish official ranking ({graderRuns?.unlimited ? "unlimited" : `${left} of ${limit || QUOTA} left this semester`}) → issue badges
                        </button>
                    )}
                    <span className="text-[10.5px] text-[#70808a]">
                        {isC ? "Live runs never consume a quota." : "Publishing asks you to confirm — it cannot be undone."}
                    </span>
                </div>
            </div>

            {ranked ? (
                <div className="overflow-hidden rounded-2xl border border-[#dde5ea] bg-white">
                    <div className="flex flex-wrap items-center gap-2.5 px-3.5 py-3">
                        <span
                            className={clsx(
                                "rounded-full px-2.5 py-1.5 text-[9.5px] font-black tracking-[0.08em]",
                                mode === "PREVIEW" ? "bg-[#eef2f3] text-[#5c6d76]" : mode === "LIVE" ? "bg-[#fdeaf0] text-[#c92a5b]" : "bg-[#ede6ff] text-[#6d3df5]",
                            )}
                        >
                            {mode === "PREVIEW"
                                ? "UNOFFICIAL PREVIEW · CONFIDENTIAL · NO BADGES ISSUED"
                                : mode === "LIVE"
                                  ? "LIVE · BADGES UPDATED"
                                  : "PUBLISHED OFFICIAL · BADGES ISSUED & DATED TODAY"}
                        </span>
                        <b className="text-xs">{resolvedName}</b>
                        <span className="text-[10.5px] text-[#70808a]">
                            {n} records · {runOn} · rubric {RUBRIC_VERSION}
                            {meritLoading ? " · syncing official scores…" : ""}
                        </span>
                        <span className="ml-auto text-[10px] text-[#70808a]">Click a row for section-by-section reasoning</span>
                    </div>
                    <div className="hidden grid-cols-[64px_1.8fr_.7fr_.9fr_.8fr_1.2fr_150px] gap-2.5 bg-[#f8fafb] px-3.5 py-2.5 text-[9px] font-black uppercase tracking-[0.06em] text-[#84939c] md:grid">
                        <div>Rank</div>
                        <div>Project · discipline</div>
                        <div>Std score</div>
                        <div>Class</div>
                        <div>Top %</div>
                        <div>Badge / trend</div>
                        <div />
                    </div>
                    {eligibleRanked.map((x, i) => {
                        const rank = i + 1;
                        const top = n ? +((rank / n) * 100).toFixed(1) : 0;
                        const pct = n ? Math.round(((n - rank) / n) * 100) : 0;
                        const open = openId === x.entry.id;
                        const title = x.entry.projectInfo?.title || x.entry.projectTitle || "Untitled thesis";
                        const student = entryDisplayName(x.entry);
                        const team = normalizeFypTeamMembers(x.entry.projectInfo?.teamMembers).filter((m) => m.name?.trim());
                        const prev = eligibleRanked[i - 1];
                        const next = eligibleRanked[i + 1];
                        const strongest = [...x.scorecard.criteria].sort((a, b) => b.points / b.max - a.points / a.max)[0];
                        const weaker = [...x.scorecard.criteria].sort((a, b) => a.points / a.max - b.points / a.max)[0];
                        const pluses = x.scorecard.criteria.filter((c) => c.points / c.max >= 0.7).map((c) => c.label);
                        const limits = x.scorecard.criteria.filter((c) => c.points / c.max <= 0.6).map((c) => c.note || c.label);
                        const gaps = x.scorecard.criteria.filter((c) => c.points < c.max).slice(0, 3).map((c) => `${c.label}: ${Math.round(c.points * 10) / 10}/${c.max}`);
                        return (
                            <div key={x.entry.id || i}>
                                <button
                                    type="button"
                                    onClick={() => setOpenId(open ? null : (x.entry.id ?? null))}
                                    className="grid w-full grid-cols-1 items-center gap-2 border-t border-[#edf1f3] px-3.5 py-3 text-left hover:bg-[#fbfcfd] md:grid-cols-[64px_1.8fr_.7fr_.9fr_.8fr_1.2fr_150px] md:gap-2.5"
                                >
                                    <div className="text-[20px] font-[950] leading-none text-[#16313d]">
                                        #{rank}
                                        <small className="mt-0.5 block text-[8.5px] font-extrabold text-[#84939c]">of {n}</small>
                                    </div>
                                    <div>
                                        <b className="block text-xs text-[#16313d]">{title}</b>
                                        <span className="text-[9.5px] text-[#70808a]">
                                            {student}
                                            {team.length ? " + team" : ""} · {entryProg(x.entry)} · {entryLevel(x.entry)} · {entryUniversity(x.entry)}
                                        </span>
                                        <span className="mt-0.5 block text-[9.5px] font-extrabold text-[#9b6700]">
                                            📚 {x.entry.projectInfo?.academicArea || entrySchool(x.entry)}
                                            {x.entry.aiAnalysis && typeof x.entry.aiAnalysis.final === "number" ? ` · faculty score ${x.entry.aiAnalysis.final}` : ""}
                                        </span>
                                    </div>
                                    <div className="text-[18px] font-[950] leading-none text-[#6d3df5]">
                                        {x.scorecard.total}
                                        <small className="mt-0.5 block text-[8.5px] font-extrabold text-[#84939c]">rubric {x.scorecard.total} / 100</small>
                                    </div>
                                    <div>
                                        <span className="inline-block rounded-full bg-[#ede6ff] px-2 py-1 text-[9px] font-black text-[#6d3df5]">{studioClass(x.scorecard.total)}</span>
                                    </div>
                                    <div className="text-[11px]">
                                        <b>Top {top}%</b>
                                        <br />
                                        <span className="text-[9.5px] text-[#84939c]">{pct}th percentile</span>
                                    </div>
                                    <div className="text-[10px]">
                                        {mode === "PREVIEW" || !mode ? (
                                            <span className="inline-block rounded-full bg-[#f1f2f7] px-2 py-1 text-[9px] font-black text-[#596971]">no badge (preview)</span>
                                        ) : isC ? (
                                            <span className="inline-block rounded-full bg-[#f3edff] px-2 py-1 text-[9px] font-black text-[#5a2fd1]">🌐 #{rank} of {n} · CIEL PK FYP Live</span>
                                        ) : (
                                            <span className="inline-block rounded-full px-2 py-1 text-[9px] font-black" style={{ background: stakeholder === "FACULTY" ? "#fff6df" : "#eef3ff", color: stakeholder === "FACULTY" ? "#7a5a08" : "#2b3f8f" }}>
                                                {stakeholder === "FACULTY" ? "🏅" : "🏛️"} #{rank} of {n} · {stakeholder === "FACULTY" ? "Supervisor Cohort" : "University FYP"}
                                                {x.entry.id && notifiedIds.includes(x.entry.id) ? " · sent" : ""}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span
                                            role="link"
                                            tabIndex={0}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onOpenCard?.(x.entry);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.stopPropagation();
                                                    onOpenCard?.(x.entry);
                                                }
                                            }}
                                            className="inline-flex justify-center rounded-[9px] bg-[#eef2f3] px-2.5 py-2 text-[10px] font-black text-[#29454f]"
                                        >
                                            🃏 Card
                                        </span>
                                        {onOpenReview && x.entry.aiAnalysis ? (
                                            <span
                                                role="link"
                                                tabIndex={0}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpenReview(x.entry);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        e.stopPropagation();
                                                        onOpenReview(x.entry);
                                                    }
                                                }}
                                                className="inline-flex justify-center rounded-[9px] bg-[#6d3df5] px-2.5 py-2 text-[10px] font-black text-white"
                                            >
                                                📋 Review
                                            </span>
                                        ) : null}
                                    </div>
                                </button>
                                {open ? (
                                    <div className="border-t border-dashed border-[#dde5ea] bg-[#fbfaff] px-4 py-4">
                                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                            <b>Section-by-section AI reasoning</b>
                                            {onOpenReview && x.entry.aiAnalysis ? (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onOpenReview(x.entry);
                                                    }}
                                                    className="rounded-[9px] bg-[#6d3df5] px-2.5 py-1.5 text-[10px] font-black text-white"
                                                >
                                                    📋 DETAILED REVIEW
                                                </button>
                                            ) : null}
                                            <span className="rounded-full bg-[#f1f2f7] px-2 py-1 text-[9px] font-black text-[#596971]">
                                                Pathway: {ROUTE_META[x.scorecard.route].label}
                                            </span>
                                            <span className="rounded-full bg-[#f1f2f7] px-2 py-1 text-[9px] font-black text-[#596971]">{x.scorecard.grade}</span>
                                            {!x.scorecard.consistency.ok ? (
                                                <span className="rounded-full bg-[#fff2dc] px-2 py-1 text-[9px] font-black text-[#9b6700]">🚩 {x.scorecard.consistency.message}</span>
                                            ) : null}
                                        </div>
                                        <div className="mt-2 grid gap-1.5">
                                            {x.scorecard.criteria.map((c, j) => (
                                                <div key={c.key} className="grid grid-cols-1 items-start gap-3 rounded-[11px] border border-[#ece7fb] bg-white px-2.5 py-2 text-[11px] leading-relaxed md:grid-cols-[230px_90px_1fr]">
                                                    <div className="text-[10.5px] font-black text-[#16313d]">
                                                        D{j + 1} · {c.label}
                                                        <small className="mt-0.5 block text-[9px] font-bold text-[#84939c]">max {c.max}</small>
                                                    </div>
                                                    <div className="text-center">
                                                        <b className="block text-[15px] text-[#6d3df5]">{Math.round(c.points * 10) / 10}</b>
                                                        <small className="text-[8.5px] font-black text-[#84939c]">{c.note ? "" : `of ${c.max}`}</small>
                                                    </div>
                                                    <div className="text-[#31405a]">
                                                        {c.note || c.description}
                                                        <i className="mt-0.5 block not-italic text-[9.5px] text-[#84939c]">Evidence used: flashcard record</i>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-2.5 rounded-[11px] border border-[#f1d68a] bg-[#fffbef] px-3 py-2 text-[10.5px] leading-[1.55] text-[#5c4a12]">
                                            <b className="text-[#9b6700]">📚 DISCIPLINE BENCHMARK · {x.entry.projectInfo?.academicArea || entrySchool(x.entry)} · {entryLevel(x.entry)} bands</b> Measured against excellent, complete work in this discipline. Standard formula {RUBRIC_VERSION}. Strongest: {strongest?.label}. Weaker: {weaker?.label}.
                                        </div>
                                        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                                            <div className="rounded-[11px] border border-[#bfe8cc] bg-[#e8f5ef] px-2.5 py-2 text-[10.5px] leading-relaxed text-[#0f5f4b]">
                                                <b className="mb-1 block text-[8.5px] tracking-[0.1em]">✅ PLUSES</b>
                                                {pluses.length ? <ul className="ml-4 list-disc">{pluses.map((p) => <li key={p}>{p}</li>)}</ul> : <i>none at level 3.5+</i>}
                                            </div>
                                            <div className="rounded-[11px] border border-[#f1d68a] bg-[#fff2dc] px-2.5 py-2 text-[10.5px] leading-relaxed text-[#7a5a08]">
                                                <b className="mb-1 block text-[8.5px] tracking-[0.1em]">⚠️ LIMITATIONS</b>
                                                {limits.length ? <ul className="ml-4 list-disc">{limits.slice(0, 4).map((p) => <li key={p}>{p}</li>)}</ul> : <i>no dimension at level 3 or below</i>}
                                            </div>
                                            <div className="rounded-[11px] border border-[#dccfff] bg-[#f3edff] px-2.5 py-2 text-[10.5px] leading-relaxed text-[#3b2f6b]">
                                                <b className="mb-1 block text-[8.5px] tracking-[0.1em]">📏 GAP TO THE DISCIPLINE BENCHMARK</b>
                                                {gaps.length ? <ul className="ml-4 list-disc">{gaps.map((p) => <li key={p}>{p}</li>)}</ul> : <i>at benchmark on every dimension</i>}
                                            </div>
                                        </div>
                                        <div className="mt-2.5 grid grid-cols-1 gap-2 md:grid-cols-2">
                                            <div className="rounded-[11px] border border-[#dccfff] bg-[#f3edff] px-3 py-2.5 text-[11px] leading-[1.55] text-[#3b2f6b] md:col-span-2">
                                                <b className="mb-1 block text-[8.5px] tracking-[0.1em]">{rank === 1 ? "🏆 WHY IT IS THE BEST PIECE" : "WHY THIS RANK"}</b>
                                                {whyFypLeads(x.entry, x.scorecard)} {fypPotential(x.entry, x.scorecard)}
                                            </div>
                                            <div className="rounded-[11px] border border-[#c9d6ff] bg-[#eef3ff] px-3 py-2.5 text-[11px] leading-[1.55] text-[#2b3f8f]">
                                                <b className="mb-1 block text-[8.5px] tracking-[0.1em]">
                                                    {prev ? `WHY IT SITS BELOW #${rank - 1} — ${prev.entry.projectInfo?.title || prev.entry.projectTitle || "Untitled"}` : "TOP OF COHORT"}
                                                </b>
                                                {prev
                                                    ? `${title.split(" ").slice(0, 4).join(" ")}… scored ${x.scorecard.total} vs ${prev.scorecard.total} for the project above.`
                                                    : "No project ranks above this one in the defined cohort."}
                                            </div>
                                            <div className="rounded-[11px] border border-[#f1d68a] bg-[#fff6df] px-3 py-2.5 text-[11px] leading-[1.55] text-[#7a5a08]">
                                                <b className="mb-1 block text-[8.5px] tracking-[0.1em]">
                                                    {next ? `WHY IT SITS ABOVE #${rank + 1} — ${next.entry.projectInfo?.title || next.entry.projectTitle || "Untitled"}` : "BOTTOM OF COHORT"}
                                                </b>
                                                {next
                                                    ? `${title.split(" ").slice(0, 4).join(" ")}… scored ${x.scorecard.total} vs ${next.scorecard.total} for the project below.`
                                                    : "Ranked last in this cohort — lower ranks describe less extensively demonstrated quality, never weaker students."}
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                    {notifyState === "sending" ? <p className="px-3.5 py-2 text-[11px] text-[#6d3df5]">Publishing to top-ranked students…</p> : null}
                    {notifyState === "failed" ? <p className="px-3.5 py-2 text-[11px] text-red-700">Ranking is saved on this screen — student notifications did not send.</p> : null}
                    {notifyErrorMessage ? <p className="px-3.5 py-2 text-[11px] text-amber-700">{notifyErrorMessage}</p> : null}
                    {runsExhausted && mode === "PREVIEW" ? <p className="px-3.5 py-2 text-[11px] text-amber-700">No publishes left this year. This run is a free preview only.</p> : null}
                </div>
            ) : (
                <div className="rounded-[14px] border border-dashed border-[#dde5ea] px-6 py-6 text-center text-xs text-[#70808a]">
                    Set your cohort filters and press <b>Preview ranking</b>. One standard analysing formula ({RUBRIC_VERSION}) for Faculty, University and CIEL PK: every project is scored against the benchmark of excellent work in its own discipline, weighted by discipline, then ranked best → less best with pluses, limitations and rationale — only the cohort changes.
                </div>
            )}

            <div className="rounded-2xl border border-[#dde5ea] bg-white px-4 py-3 text-[11px]">
                <b className="text-xs">📜 {isC ? "Live run history" : "Publication log"} — {stakeholder === "FACULTY" ? byLabel : stakeholder === "UNIVERSITY" ? uniLabel : "CIEL PK"}</b>
                <div className="mt-1.5">
                    {pubLog.length ? (
                        [...pubLog].reverse().slice(0, 8).map((x) => (
                            <div key={x.id} className="grid grid-cols-[110px_90px_1fr_60px_90px] items-center gap-2.5 border-t border-[#edf1f3] py-2 first:border-t-0">
                                <span>{x.on}</span>
                                <span className={clsx("rounded-full px-2 py-1 text-[9.5px] font-black tracking-[0.08em]", x.mode === "PREVIEW" ? "bg-[#eef2f3] text-[#5c6d76]" : x.mode === "LIVE" ? "bg-[#fdeaf0] text-[#c92a5b]" : "bg-[#ede6ff] text-[#6d3df5]")}>
                                    {x.mode.replace("_", " ")}
                                </span>
                                <span>
                                    {x.cohortName} <span className="text-[#84939c]">· {x.cohortDef}</span>
                                </span>
                                <span>{x.size} rec.</span>
                                <span className="text-[#84939c]">{x.id}</span>
                            </div>
                        ))
                    ) : (
                        <div className="py-1.5 text-[#70808a]">No runs yet.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
