import React, { useMemo, useEffect, useRef } from "react";
import { Target, Info, Trash2, AlertCircle, CheckCircle2, Lock, Plus, Layers, ChevronDown, Pencil, Globe2 } from "lucide-react";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import { sdgData } from "@/utils/sdgData";
import clsx from "clsx";
import { listOpportunityReportSdgs } from "../utils/reportSdgMerge";

interface Section3Props {
    projectData: any;
}

// All 17 SDGs with official UN colors (for the read-only grid)
const ALL_SDGS = [
    { num: 1, color: "#E5243B", name: "No Poverty" },
    { num: 2, color: "#DDA63A", name: "Zero Hunger" },
    { num: 3, color: "#4C9F38", name: "Good Health & Well-Being" },
    { num: 4, color: "#C5192D", name: "Quality Education" },
    { num: 5, color: "#FF3A21", name: "Gender Equality" },
    { num: 6, color: "#26BDE2", name: "Clean Water & Sanitation" },
    { num: 7, color: "#FCC30B", name: "Affordable & Clean Energy" },
    { num: 8, color: "#A21942", name: "Decent Work & Economic Growth" },
    { num: 9, color: "#FD6925", name: "Industry, Innovation & Infrastructure" },
    { num: 10, color: "#DD1367", name: "Reduced Inequalities" },
    { num: 11, color: "#FD9D24", name: "Sustainable Cities & Communities" },
    { num: 12, color: "#BF8B2E", name: "Responsible Consumption & Production" },
    { num: 13, color: "#3F7E44", name: "Climate Action" },
    { num: 14, color: "#0A97D9", name: "Life Below Water" },
    { num: 15, color: "#56C02B", name: "Life on Land" },
    { num: 16, color: "#00689D", name: "Peace, Justice & Strong Institutions" },
    { num: 17, color: "#19486A", name: "Partnerships for the Goals" },
];

/** First sentence (or a clipped lead-in) of free text, used to quote the student's own wording in the finalized shortlist card. */
function firstSentence(text: string, maxLen = 220): string {
    const trimmed = (text || "").trim();
    if (!trimmed) return "";
    const match = trimmed.match(/^[^.!?]*[.!?]/);
    const candidate = (match ? match[0] : trimmed).trim();
    return candidate.length <= maxLen ? candidate : `${candidate.slice(0, maxLen).trim()}…`;
}

const dropdownClass =
    "h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm font-medium text-slate-800 shadow-sm outline-none transition-colors focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50";

const fieldLabelClass =
    "text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500";

function WordCountBar({ count, max = 200, text }: { count: number; max?: number; text?: string }) {
    const ok = count >= 100 && count <= max;
    const over = count > max;
    return (
        <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-100 sm:w-48">
                <div
                    className={clsx(
                        "h-full rounded-full transition-all",
                        count < 100 ? "bg-amber-400" : over ? "bg-red-500" : "bg-emerald-500",
                    )}
                    style={{ width: `${Math.min((count / max) * 100, 100)}%` }}
                />
            </div>
            <span
                className={clsx(
                    "text-[11px] tabular-nums",
                    ok ? "text-emerald-600" : over ? "text-red-500" : "text-slate-400",
                )}
            >
                {count} / {max} words{typeof text === "string" ? ` · ${text.length} characters` : ""}
            </span>
        </div>
    );
}

/** Clickable colored SDG tile grid — replaces a plain goal dropdown with the same visual picker used across the app's redesigned SDG UI. */
function SDGTileGrid({
    selectedId,
    disabledIds = [],
    onSelect,
}: {
    selectedId: string;
    disabledIds?: string[];
    onSelect: (id: string) => void;
}) {
    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-2">
            {ALL_SDGS.map((sdg) => {
                const id = String(sdg.num);
                const isSelected = id === selectedId;
                const isDisabled = !isSelected && disabledIds.includes(id);
                return (
                    <button
                        key={id}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => onSelect(isSelected ? "" : id)}
                        style={{ backgroundColor: sdg.color }}
                        className={clsx(
                            "relative flex min-h-[66px] flex-col gap-0.5 rounded-lg border-2 p-2 text-left text-[11px] font-bold leading-tight text-white transition-all",
                            isSelected
                                ? "border-slate-900 shadow-lg"
                                : isDisabled
                                  ? "cursor-not-allowed border-transparent opacity-15"
                                  : "border-transparent opacity-70 hover:-translate-y-0.5 hover:opacity-100",
                        )}
                    >
                        {isSelected ? (
                            <CheckCircle2 className="absolute right-1.5 top-1.5 h-3.5 w-3.5" />
                        ) : null}
                        <span className="text-base font-extrabold">{sdg.num}</span>
                        {sdg.name}
                    </button>
                );
            })}
        </div>
    );
}

export default function Section3SDGMapping({ projectData }: Section3Props) {
    const { data, updateSection, getFieldError, validationErrors } = useReportForm();
    const { section3 } = data;
    const {
        contribution_intent_statement,
        student_contribution_intent_statement,
        secondary_sdgs
    } = section3;

    const sectionErrors = validationErrors['section3'] || [];
    const hasErrors = sectionErrors.length > 0;

    // ── Opportunity SDGs (Part A – read-only display) ─────────────────────────
    const opportunitySdgRows = useMemo(() => listOpportunityReportSdgs(projectData), [projectData]);
    const oppPrimaryRow = opportunitySdgRows.find((row) => row.role === "primary");
    const oppPrimaryNum = oppPrimaryRow?.goalNumber || 0;
    const oppSecondaries = opportunitySdgRows.filter((row) => row.role === "secondary");

    // ── Student primary SDG state (Part B – dropdowns) ────────────────────────
    const studentPrimaryId = data.section3.primary_sdg.goal_number?.toString() || "";
    const studentTargetId = data.section3.primary_sdg.target_id || "";
    const studentIndicatorId = data.section3.primary_sdg.indicator_id || "";

    const selectedSDGRecord = sdgData.find(s => s.id === studentPrimaryId);
    const availableTargets = selectedSDGRecord?.targets || [];
    const availableIndicators = availableTargets.find(t => t.id === studentTargetId)?.indicators || [];

    const handleRemoveSecondary = (index: number) => {
        const updated = [...secondary_sdgs];
        updated.splice(index, 1);
        updateSection('section3', { secondary_sdgs: updated });
    };

    const updateSecondary = (index: number, payload: Partial<(typeof secondary_sdgs)[0]>) => {
        const updated = secondary_sdgs.map((item, i) =>
            i === index ? { ...item, ...payload } : item
        );
        updateSection('section3', { secondary_sdgs: updated });
    };

    // ── Finalize: "Finalise my SDGs" builds a shortlist card from whatever's been confirmed above ──
    const finalizedGoals = useMemo(() => {
        type FinalizedGoal = { num: number; isPrimary: boolean; targetId: string; quote: string };
        const goals: FinalizedGoal[] = [];
        const seen = new Set<number>();

        if (oppPrimaryNum > 0) {
            goals.push({ num: oppPrimaryNum, isPrimary: true, targetId: oppPrimaryRow?.targetId || "", quote: contribution_intent_statement || "" });
            seen.add(oppPrimaryNum);
        }

        const studentNum = Number(studentPrimaryId);
        if (studentNum && !seen.has(studentNum)) {
            goals.push({ num: studentNum, isPrimary: oppPrimaryNum === 0, targetId: studentTargetId, quote: student_contribution_intent_statement || "" });
            seen.add(studentNum);
        }

        (secondary_sdgs || []).forEach((sdg) => {
            const num = Number(sdg.goal_number);
            if (num && !seen.has(num)) {
                goals.push({ num, isPrimary: false, targetId: sdg.target_id || "", quote: sdg.justification_text || "" });
                seen.add(num);
            }
        });

        return goals;
    }, [oppPrimaryNum, oppPrimaryRow?.targetId, contribution_intent_statement, studentPrimaryId, studentTargetId, student_contribution_intent_statement, secondary_sdgs]);

    const canFinalize = finalizedGoals.length > 0 && finalizedGoals.some((g) => g.quote.trim());
    const isFinalized = section3.summary_stage === "validated";

    /** Editing any goal/statement after finalizing invalidates the shortlist snapshot — drop back to draft. */
    const lastFinalizedSnapshotRef = useRef("");
    const finalizeSnapshot = useMemo(
        () => JSON.stringify(finalizedGoals),
        [finalizedGoals],
    );
    useEffect(() => {
        if (!isFinalized) return;
        // First render after a finalized report loads (e.g. a fresh page load or session) — seed the
        // baseline from current data instead of comparing against an empty ref, which would never match.
        if (!lastFinalizedSnapshotRef.current) {
            lastFinalizedSnapshotRef.current = finalizeSnapshot;
            return;
        }
        if (finalizeSnapshot !== lastFinalizedSnapshotRef.current) {
            updateSection("section3", { summary_stage: "preliminary" });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [finalizeSnapshot, isFinalized]);

    const handleFinalize = () => {
        lastFinalizedSnapshotRef.current = finalizeSnapshot;
        updateSection("section3", { summary_stage: "validated" });
    };
    const handleUnfinalize = () => {
        updateSection("section3", { summary_stage: "preliminary" });
    };



    const autoSummary = useMemo(() => {
        const currentSummary = data.section3.summary_text || "";
        // If user already edited the summary significantly, don't overwrite it
        if (currentSummary && (currentSummary.length > 100 || !currentSummary.includes("This project is aligned with SDG"))) {
            return currentSummary;
        }

        const goalNum = oppPrimaryNum || studentPrimaryId || "X";
        const target = oppPrimaryRow?.targetId || studentTargetId || "X.X";
        const indicator = oppPrimaryRow?.indicatorId || studentIndicatorId || "X.X.X";
        return `This project is aligned with SDG ${goalNum}, Target ${target}, Indicator ${indicator}. The planned intervention focuses on the intended contribution pathway described above. Final validation of indicator-level contribution will be determined after measurable outputs and outcomes are submitted in Sections 4 and 5.`;
    }, [oppPrimaryNum, oppPrimaryRow?.targetId, oppPrimaryRow?.indicatorId, studentPrimaryId, studentTargetId, studentIndicatorId]);

    useEffect(() => {
        if (data.section3.summary_text !== autoSummary) {
            updateSection('section3', { summary_text: autoSummary });
        }
    }, [autoSummary, data.section3.summary_text]);



    const primaryWordCount = (contribution_intent_statement || "").trim().split(/\s+/).filter((w: string) => w).length;
    const studentWordCount = (student_contribution_intent_statement || "").trim().split(/\s+/).filter((w: string) => w).length;

    return (
        <div className="mx-auto max-w-6xl space-y-8 pb-10">

            {/* ── Section Header ───────────────────────────────────────── */}
            <div className="space-y-5">
                <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm">
                        <Target className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                            <span className="text-indigo-600">SECTION 3:</span> SDG contribution mapping
                        </h2>
                    </div>
                </div>

                <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3.5 sm:px-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-600">
                        Purpose of this section
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                        This section establishes{" "}
                        <span className="font-semibold text-slate-900">
                            technical and moral alignment of your project
                        </span>{" "}
                        with the Global Goals. It provides a structured framework for:
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
                        {[
                            "Reviewing opportunity-level SDGs",
                            "Selecting a project-specific primary SDG",
                            "Defining the contribution pathway",
                            "Mapping secondary goal alignments",
                            "Standardizing UN indicator reporting",
                            "Synthesizing your alignment logic",
                        ].map((item) => (
                            <div
                                key={item}
                                className="flex items-center gap-2 text-sm text-slate-700"
                            >
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                                {item}
                            </div>
                        ))}
                    </div>
                </div>

                {hasErrors && (
                    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                        <div>
                            <h4 className="text-sm font-semibold text-red-800">Validation errors</h4>
                            <ul className="mt-1.5 space-y-1">
                                {sectionErrors.slice(0, 5).map((error: { message?: string }, idx: number) => (
                                    <li key={idx} className="text-sm text-red-700">
                                        • {error.message}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            {/* ── 1. Opportunity's Registered SDGs ─────────────────────── */}
            <section className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                                3.1
                            </span>
                            <h3 className="text-base font-semibold text-slate-900">
                                Opportunity&apos;s registered SDGs
                            </h3>
                        </div>
                        <p className="pl-9 text-sm text-slate-500">
                            These SDGs were selected when the opportunity was created. You cannot change them.
                        </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        <Lock className="h-3 w-3" />
                        Locked · from admin
                    </span>
                </div>

                <div className="space-y-3">
                    {oppPrimaryNum > 0 &&
                        (() => {
                            const sdg = ALL_SDGS.find((s) => s.num === oppPrimaryNum);
                            const sdgRecord = sdgData.find((s) => s.number === oppPrimaryNum);
                            const targetId = oppPrimaryRow?.targetId || "";
                            const indicatorId = oppPrimaryRow?.indicatorId || "";
                            const targetDesc =
                                sdgRecord?.targets?.find((t) => t.id === targetId)?.description || "";
                            const indicatorDesc =
                                sdgRecord?.targets
                                    ?.flatMap((t) => t.indicators || [])
                                    .find((i) => i.id === indicatorId)?.description || "";

                            if (!sdg) return null;

                            return (
                                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
                                        <div
                                            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-xl font-bold text-white"
                                            style={{ backgroundColor: sdg.color }}
                                        >
                                            {sdg.num}
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-3">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p
                                                        className="text-[10px] font-bold uppercase tracking-[0.14em]"
                                                        style={{ color: sdg.color }}
                                                    >
                                                        Primary alignment
                                                    </p>
                                                    <h4 className="mt-0.5 text-base font-semibold text-slate-900">
                                                        SDG {sdg.num}: {sdg.name}
                                                    </h4>
                                                </div>
                                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Verified
                                                </span>
                                            </div>
                                            <div className="space-y-2 border-t border-slate-100 pt-3">
                                                {targetId ? (
                                                    <p className="text-sm text-slate-600">
                                                        <span className="font-semibold text-slate-800">
                                                            TARGET {targetId}:
                                                        </span>{" "}
                                                        {targetDesc || "Registered target"}
                                                    </p>
                                                ) : null}
                                                {indicatorId ? (
                                                    <p className="text-sm text-slate-600">
                                                        <span className="font-semibold text-slate-800">
                                                            INDICATOR {indicatorId}:
                                                        </span>{" "}
                                                        {indicatorDesc || "Registered indicator"}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                    {oppSecondaries.map((row, i) => {
                        const num = row.goalNumber;
                        const sdg = ALL_SDGS.find((s) => s.num === num);
                        const sdgRecord = sdgData.find((s) => s.number === num);
                        const secTargetId = row.targetId;
                        const secIndicatorId = row.indicatorId;
                        const secTargetDesc =
                            sdgRecord?.targets?.find((t) => t.id === secTargetId)?.description || "";
                        const secIndicatorDesc =
                            sdgRecord?.targets
                                ?.flatMap((t) => t.indicators || [])
                                .find((ind) => ind.id === secIndicatorId)?.description || "";

                        if (!sdg) return null;

                        return (
                            <div
                                key={`${num}-${row.targetId}-${i}`}
                                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:flex-row sm:items-center"
                            >
                                <div
                                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-base font-bold text-white"
                                    style={{ backgroundColor: sdg.color }}
                                >
                                    {sdg.num}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <h4 className="text-sm font-semibold text-slate-800">
                                            SDG {sdg.num}: {sdg.name}
                                        </h4>
                                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                            Secondary
                                        </span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                        {secTargetId ? (
                                            <span>
                                                <span className="font-semibold text-slate-700">
                                                    Target {secTargetId}:
                                                </span>{" "}
                                                {secTargetDesc || "Registered"}
                                            </span>
                                        ) : null}
                                        {secIndicatorId ? (
                                            <span>
                                                <span className="font-semibold text-slate-700">
                                                    Indicator {secIndicatorId}:
                                                </span>{" "}
                                                {secIndicatorDesc || "Registered"}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {oppPrimaryNum === 0 && (
                        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                            <p className="text-sm text-amber-800">
                                No SDGs registered on this opportunity yet.
                            </p>
                        </div>
                    )}
                </div>

                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <Label className="text-sm font-semibold text-slate-900">
                            3.1.1 Contribution logic statement
                        </Label>
                        <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-600">
                            Required
                        </span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-500">
                        Explain the &ldquo;pathway to change&rdquo; — how do your activities directly lead to
                        the selected SDG target? Consider who benefits and what specific shift occurs.
                    </p>
                    <Textarea
                        placeholder="Describe the planned contribution pathway…"
                        className={clsx(
                            "min-h-[140px] resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100",
                            getFieldError("contribution_intent_statement") && "border-red-300",
                        )}
                        value={contribution_intent_statement || ""}
                        onChange={(e) =>
                            updateSection("section3", {
                                contribution_intent_statement: e.target.value,
                            })
                        }
                    />
                    <WordCountBar count={primaryWordCount} text={contribution_intent_statement || ""} />
                    <FieldError message={getFieldError("contribution_intent_statement")} />
                </div>
            </section>

            {/* ── 2. Optional Student SDG Mapping ──────────────────────── */}
            <section className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                                3.2
                            </span>
                            <h3 className="text-base font-semibold text-slate-900">
                                Optional student SDG mapping
                            </h3>
                        </div>
                        <p className="pl-9 text-sm leading-relaxed text-slate-500">
                            If you wish to align your project with additional SDGs, you may select up to two.
                            Please briefly explain how your activities contribute to achieving each selected
                            SDG.
                        </p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Optional
                    </span>
                </div>

                <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800">
                                Important selection guidance
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-amber-900/90">
                                The SDG, target, and indicator selected here will be linked to your project&apos;s
                                accountability profile. Ensure they align with your planned activities in
                                Section 4.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className={fieldLabelClass}>
                            C1. Select Primary SDG <span className="text-red-500">*</span>
                        </label>
                        <SDGTileGrid
                            selectedId={studentPrimaryId}
                            onSelect={(id) =>
                                updateSection("section3", {
                                    primary_sdg: {
                                        ...data.section3.primary_sdg,
                                        goal_number: id,
                                        target_id: "",
                                        indicator_id: "",
                                    },
                                })
                            }
                        />
                        <FieldError message={getFieldError("primary_sdg")} />
                    </div>

                    {studentPrimaryId ? (
                        <div className="overflow-hidden rounded-xl border border-slate-200">
                            <div
                                className="px-4 py-3 text-sm font-bold text-white"
                                style={{
                                    backgroundColor:
                                        ALL_SDGS.find((s) => String(s.num) === studentPrimaryId)?.color ||
                                        "#5b5bf0",
                                }}
                            >
                                SDG {selectedSDGRecord?.number}: {selectedSDGRecord?.title}
                            </div>
                            <div className="grid grid-cols-1 gap-4 bg-white p-4 sm:p-5 md:grid-cols-2">
                                <div className="space-y-1.5">
                                    <label className={fieldLabelClass}>C2. Select SDG Target</label>
                                    <div className="relative">
                                        <select
                                            className={dropdownClass}
                                            value={studentTargetId}
                                            onChange={(e) => {
                                                updateSection("section3", {
                                                    primary_sdg: {
                                                        ...data.section3.primary_sdg,
                                                        target_id: e.target.value,
                                                        indicator_id: "",
                                                    },
                                                });
                                            }}
                                        >
                                            <option value="">Select target...</option>
                                            {availableTargets.map((t) => (
                                                <option key={t.id} value={t.id}>
                                                    Target {t.id} — {t.description}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    </div>
                                    <FieldError message={getFieldError("target_code")} />
                                </div>

                                <div
                                    className={clsx(
                                        "space-y-1.5",
                                        !studentTargetId && "pointer-events-none opacity-50",
                                    )}
                                >
                                    <label className={fieldLabelClass}>C3. SDG Indicator</label>
                                    <div className="relative">
                                        <select
                                            className={dropdownClass}
                                            value={studentIndicatorId}
                                            onChange={(e) => {
                                                updateSection("section3", {
                                                    primary_sdg: {
                                                        ...data.section3.primary_sdg,
                                                        indicator_id: e.target.value,
                                                    },
                                                });
                                            }}
                                        >
                                            <option value="">Select indicator...</option>
                                            {availableIndicators.map((ind) => (
                                                <option key={ind.id} value={ind.id}>
                                                    Indicator {ind.id} — {ind.description}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    </div>
                                    <p className="text-[11px] text-slate-400">
                                        Selecting an indicator improves reporting quality.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    <div className="space-y-3 border-t border-slate-100 pt-6">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <Label className="text-sm font-semibold text-slate-900">
                                3.2.1 Contribution logic statement
                            </Label>
                            <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-600">
                                Required
                            </span>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-500">
                            Explain the &ldquo;pathway to change&rdquo; — how do your activities directly lead
                            to the selected SDG target? Consider who benefits and what specific shift occurs.
                        </p>
                        <Textarea
                            placeholder="Describe the planned contribution pathway…"
                            className={clsx(
                                "min-h-[140px] resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100",
                                getFieldError("student_contribution_intent_statement") &&
                                    "border-red-300",
                            )}
                            value={student_contribution_intent_statement || ""}
                            onChange={(e) =>
                                updateSection("section3", {
                                    student_contribution_intent_statement: e.target.value,
                                })
                            }
                        />
                        <WordCountBar count={studentWordCount} text={student_contribution_intent_statement || ""} />
                        <FieldError message={getFieldError("student_contribution_intent_statement")} />
                    </div>

                    {/* 3.2.2 Secondary */}
                    <div className="space-y-4 border-t border-slate-100 pt-6">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <Label className="text-sm font-semibold text-slate-900">
                                    3.2.2 Secondary SDG mapping (optional)
                                </Label>
                                <p className="mt-1 text-sm text-slate-500">
                                    Map additional goals impacted by this project — up to two.
                                </p>
                            </div>
                            <span className="shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600">
                                {(secondary_sdgs || []).length} of 2 added
                            </span>
                        </div>

                        {(secondary_sdgs || []).map((sdg: {
                            goal_number?: string | number | null;
                            target_id?: string;
                            indicator_id?: string;
                            justification_text?: string;
                        }, index: number) => {
                            const sdgId = sdg.goal_number?.toString() || "";
                            const sdgRecord = sdgData.find((s) => s.id === sdgId);
                            const secTargets = sdgRecord?.targets || [];
                            const secTargetId = sdg.target_id || "";
                            const secIndicators =
                                secTargets.find((t) => t.id === secTargetId)?.indicators || [];
                            const justWords = (sdg.justification_text || "")
                                .trim()
                                .split(/\s+/)
                                .filter((w: string) => w).length;
                            const otherSelectedIds = (secondary_sdgs || [])
                                .filter((_: unknown, i: number) => i !== index)
                                .map((s: { goal_number?: string | number | null }) => s.goal_number?.toString())
                                .filter((v: string | undefined): v is string => Boolean(v));
                            const disabledIds = [studentPrimaryId, ...otherSelectedIds].filter(Boolean);

                            return (
                                <div
                                    key={index}
                                    className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/40 p-5"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                            Secondary SDG alignment #{index + 1}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveSecondary(index)}
                                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
                                            aria-label="Remove secondary SDG"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <SDGTileGrid
                                        selectedId={sdgId}
                                        disabledIds={disabledIds}
                                        onSelect={(id) =>
                                            updateSecondary(index, {
                                                goal_number: id,
                                                target_id: "",
                                                indicator_id: "",
                                            })
                                        }
                                    />

                                    {sdgRecord ? (
                                        <div className="overflow-hidden rounded-xl border border-slate-200">
                                            <div
                                                className="px-4 py-2.5 text-xs font-bold text-white"
                                                style={{
                                                    backgroundColor:
                                                        ALL_SDGS.find((s) => String(s.num) === sdgId)?.color ||
                                                        "#5b5bf0",
                                                }}
                                            >
                                                SDG {sdgRecord.number}: {sdgRecord.title}
                                            </div>
                                            <div className="space-y-4 bg-white p-4 sm:p-5">
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div className="space-y-1.5">
                                                    <p className={fieldLabelClass}>UN Target</p>
                                                    <div className="relative">
                                                        <select
                                                            className={dropdownClass}
                                                            value={secTargetId}
                                                            onChange={(e) =>
                                                                updateSecondary(index, {
                                                                    target_id: e.target.value,
                                                                    indicator_id: "",
                                                                })
                                                            }
                                                        >
                                                            <option value="">Select target...</option>
                                                            {secTargets.map((t) => (
                                                                <option key={t.id} value={t.id}>
                                                                    Target {t.id} — {t.description}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <p className={fieldLabelClass}>UN Indicator</p>
                                                    <div className="relative">
                                                        <select
                                                            className={dropdownClass}
                                                            value={sdg.indicator_id || ""}
                                                            onChange={(e) =>
                                                                updateSecondary(index, {
                                                                    indicator_id: e.target.value,
                                                                })
                                                            }
                                                        >
                                                            <option value="">Select indicator...</option>
                                                            {secIndicators.map((ind) => (
                                                                <option key={ind.id} value={ind.id}>
                                                                    Indicator {ind.id} — {ind.description}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <p className={fieldLabelClass}>
                                                    Alignment justification
                                                </p>
                                                <Textarea
                                                    className="min-h-[100px] w-full resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                                                    placeholder="Briefly explain how this project supports this secondary goal…"
                                                    value={sdg.justification_text || ""}
                                                    onChange={(e) =>
                                                        updateSection("section3", {
                                                            secondary_sdgs: (secondary_sdgs || []).map(
                                                                (s, i) =>
                                                                    i === index
                                                                        ? {
                                                                              ...s,
                                                                              justification_text:
                                                                                  e.target.value,
                                                                          }
                                                                        : s,
                                                            ),
                                                        })
                                                    }
                                                />
                                                <WordCountBar
                                                    count={justWords}
                                                    text={sdg.justification_text || ""}
                                                />
                                            </div>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}

                        {secondary_sdgs.length < 2 ? (
                            <button
                                type="button"
                                onClick={() => {
                                    updateSection("section3", {
                                        secondary_sdgs: [
                                            ...(secondary_sdgs || []),
                                            {
                                                goal_number: null,
                                                target_id: "",
                                                indicator_id: "",
                                                justification_text: "",
                                                status: "provisional",
                                            },
                                        ],
                                    });
                                }}
                                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-6 py-5 text-sm font-medium text-slate-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 hover:text-indigo-700"
                            >
                                <Plus className="h-4 w-4" />
                                Add secondary SDG alignment
                            </button>
                        ) : null}
                    </div>
                </div>
            </section>

            {/* ── Finalize SDGs ────────────────────────────────────────── */}
            <section className="space-y-3 border-t border-slate-200 pt-8">
                {!isFinalized ? (
                    <>
                        <button
                            type="button"
                            onClick={handleFinalize}
                            disabled={!canFinalize}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Finalise my SDGs →
                        </button>
                        <p className="text-center text-xs text-slate-500">
                            {canFinalize
                                ? "Changed your mind later? You can come back and edit this until final submission."
                                : "Add at least one SDG with a contribution statement above to finalise."}
                        </p>
                    </>
                ) : (
                    <>
                        <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                            <div className="bg-slate-900 px-5 py-5 text-white sm:px-6">
                                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                    Section 3 finalised · Your SDG footprint
                                </p>
                                <h3 className="mt-2 flex items-center gap-2 text-lg font-bold">
                                    <Globe2 className="h-5 w-5 text-indigo-300" />
                                    This project advances {finalizedGoals.length} Global Goal{finalizedGoals.length === 1 ? "" : "s"}
                                </h3>
                                <p className="mt-1 text-sm text-slate-300">
                                    Shortlist confirmed — each goal carries your own pathway-to-change, ready for
                                    your report, flash card and portfolio.
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {finalizedGoals.map((g) => {
                                        const sdg = ALL_SDGS.find((s) => s.num === g.num);
                                        return (
                                            <span
                                                key={g.num}
                                                style={{ backgroundColor: sdg?.color || "#5b5bf0" }}
                                                className="flex h-11 w-11 flex-col items-center justify-center rounded-lg text-sm font-extrabold leading-none text-white"
                                            >
                                                {g.num}
                                                <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-wide">SDG</span>
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="divide-y divide-slate-100 bg-white">
                                {finalizedGoals.map((g) => {
                                    const sdg = ALL_SDGS.find((s) => s.num === g.num);
                                    const sdgRecord = sdgData.find((s) => s.number === g.num);
                                    const targetDesc = sdgRecord?.targets?.find((t) => t.id === g.targetId)?.description || "";
                                    return (
                                        <div key={g.num} className="flex gap-4 p-5 sm:px-6">
                                            <span
                                                style={{ backgroundColor: sdg?.color || "#5b5bf0" }}
                                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-base font-extrabold text-white"
                                            >
                                                {g.num}
                                            </span>
                                            <div className="min-w-0 flex-1 space-y-1.5">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h4 className="text-sm font-bold text-slate-900">
                                                        SDG {g.num} — {sdg?.name}
                                                    </h4>
                                                    {g.isPrimary ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
                                                            ★ Primary — set by program
                                                        </span>
                                                    ) : null}
                                                </div>
                                                {g.targetId ? (
                                                    <p className="text-xs text-slate-500">
                                                        Target {g.targetId}{targetDesc ? ` — ${targetDesc}` : ""}
                                                    </p>
                                                ) : null}
                                                {g.quote.trim() ? (
                                                    <p className="border-l-2 border-slate-200 pl-3 text-sm italic leading-relaxed text-slate-600">
                                                        &ldquo;{firstSentence(g.quote, 220)}&rdquo;
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-slate-500 sm:px-6">
                                <span className="inline-flex items-center gap-1.5">
                                    <Lock className="h-3.5 w-3.5" /> Locked into your report
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <Pencil className="h-3.5 w-3.5" /> Tap any goal above to edit before final submission
                                </span>
                                <span>This summary feeds your flash card &amp; the university&apos;s SDG analytics</span>
                                <button
                                    type="button"
                                    onClick={handleUnfinalize}
                                    className="ml-auto shrink-0 text-xs font-semibold text-indigo-600 hover:underline"
                                >
                                    Edit shortlist
                                </button>
                            </div>
                        </div>

                        <p className="flex items-center justify-center gap-1.5 text-center text-sm font-semibold text-emerald-600">
                            <CheckCircle2 className="h-4 w-4" />
                            Section 3 saved — your SDG summary above travels with your report.
                        </p>
                    </>
                )}
            </section>

            {/* ── Preliminary Summary ──────────────────────────────────── */}
            {!isFinalized ? (
                <section className="space-y-4 border-t border-slate-200 pt-8">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-base font-semibold text-slate-900">
                            Preliminary SDG alignment statement
                        </h3>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            System synthesis
                        </span>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <p className="text-sm leading-relaxed text-slate-700">
                            {data.section3.summary_text}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                            {[
                                { label: "Standardized formatting", icon: CheckCircle2 },
                                { label: "No performance claims", icon: Info },
                                { label: "Structural validation only", icon: Layers },
                            ].map((tag) => (
                                <span
                                    key={tag.label}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                                >
                                    <tag.icon className="h-3 w-3 text-indigo-500" />
                                    {tag.label}
                                </span>
                            ))}
                        </div>
                        <p className="mt-3 text-xs leading-relaxed text-slate-400">
                            This statement is generated from your selections above and will be finalized with
                            measurable impact data once Sections 4 and 5 are completed.
                        </p>
                    </div>
                </section>
            ) : null}
        </div>
    );
}
