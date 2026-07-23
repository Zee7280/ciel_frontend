import React, { useMemo, useEffect } from "react";
import { Target, Info, Trash2, AlertCircle, CheckCircle2, Lock, Plus, Layers } from "lucide-react";
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

const dropdownClass =
    "h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm font-medium text-slate-800 shadow-sm outline-none transition-colors focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50";

const fieldLabelClass =
    "text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500";

function WordCountBar({ count, max = 200 }: { count: number; max?: number }) {
    const ok = count >= 100 && count <= max;
    const over = count > max;
    return (
        <div className="flex items-center justify-end gap-2.5">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
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
                {count} / {max} words
            </span>
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
        <div className="mx-auto max-w-4xl space-y-8 pb-10">

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

                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-indigo-600">
                            <Target className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-3">
                            <div>
                                <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                    Purpose of this section
                                </h3>
                                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                                    This section establishes technical and moral alignment of your project with
                                    the Global Goals. It provides a structured framework for:
                                </p>
                            </div>
                            <div className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
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
                                        className="flex items-center gap-2 text-sm text-slate-600"
                                    >
                                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
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
                                1
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
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
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
                    <WordCountBar count={primaryWordCount} />
                    <FieldError message={getFieldError("contribution_intent_statement")} />
                </div>
            </section>

            {/* ── 2. Optional Student SDG Mapping ──────────────────────── */}
            <section className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                                2
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

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="space-y-1.5">
                            <label className={fieldLabelClass}>
                                C1. Select Primary SDG <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <select
                                    className={dropdownClass}
                                    value={studentPrimaryId}
                                    onChange={(e) => {
                                        updateSection("section3", {
                                            primary_sdg: {
                                                ...data.section3.primary_sdg,
                                                goal_number: e.target.value,
                                                target_id: "",
                                                indicator_id: "",
                                            },
                                        });
                                    }}
                                >
                                    <option value="">Select SDG...</option>
                                    {sdgData.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            SDG {s.number} — {s.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <FieldError message={getFieldError("primary_sdg")} />
                        </div>

                        <div
                            className={clsx(
                                "space-y-1.5",
                                !studentPrimaryId && "pointer-events-none opacity-50",
                            )}
                        >
                            <label className={fieldLabelClass}>C2. Select SDG Target</label>
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
                            <FieldError message={getFieldError("target_code")} />
                        </div>

                        <div
                            className={clsx(
                                "space-y-1.5",
                                !studentTargetId && "pointer-events-none opacity-50",
                            )}
                        >
                            <label className={fieldLabelClass}>C3. SDG Indicator</label>
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
                            <p className="text-[11px] text-slate-400">
                                Selecting an indicator improves reporting quality.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3 border-t border-slate-100 pt-6">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <Label className="text-sm font-semibold text-slate-900">
                                3.2.1 Contribution logic statement
                            </Label>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
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
                        <WordCountBar count={studentWordCount} />
                        <FieldError message={getFieldError("student_contribution_intent_statement")} />
                    </div>

                    {/* 3.2.2 Secondary */}
                    <div className="space-y-4 border-t border-slate-100 pt-6">
                        <div>
                            <Label className="text-sm font-semibold text-slate-900">
                                3.2.2 Secondary SDG mapping (optional)
                            </Label>
                            <p className="mt-1 text-sm text-slate-500">
                                Map additional goals impacted by this project — up to two.
                            </p>
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

                                    <select
                                        className={dropdownClass}
                                        value={sdgId}
                                        onChange={(e) =>
                                            updateSecondary(index, {
                                                goal_number: e.target.value,
                                                target_id: "",
                                                indicator_id: "",
                                            })
                                        }
                                    >
                                        <option value="">Choose SDG goal...</option>
                                        {sdgData
                                            .filter((s) => s.id !== studentPrimaryId)
                                            .map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    SDG {s.number} — {s.title}
                                                </option>
                                            ))}
                                    </select>

                                    {sdgRecord ? (
                                        <div className="space-y-4">
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div className="space-y-1.5">
                                                    <p className={fieldLabelClass}>UN Target</p>
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
                                                </div>
                                                <div className="space-y-1.5">
                                                    <p className={fieldLabelClass}>UN Indicator</p>
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
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className={fieldLabelClass}>
                                                        Alignment justification
                                                    </p>
                                                    <span className="text-[11px] text-slate-400">
                                                        {justWords} / 200 words
                                                    </span>
                                                </div>
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

            {/* ── Preliminary Summary ──────────────────────────────────── */}
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
        </div>
    );
}
