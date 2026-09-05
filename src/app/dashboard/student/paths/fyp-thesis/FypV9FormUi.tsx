"use client";

import { useState } from "react";
import clsx from "clsx";
import RichSummaryText from "@/components/ciel/RichSummaryText";
import { type FypEntry } from "@/utils/fypTypes";
import {
    type FypV9FormState,
    type FypV9RoadStage,
    type FypV9TableRow,
    EMPTY_FYP_V9,
    isFypV9RouteKey,
} from "@/utils/fypV9Catalog";

export const fieldClass =
    "w-full rounded-[10px] border-[1.5px] border-[#e7eaf1] bg-[#fbfcfe] px-3 py-[11px] text-[13.5px] font-medium text-[#172033] outline-none transition focus:border-[#6d4aff] focus:bg-white focus:shadow-[0_0_0_3px_#f1edff]";

const labelClass = "text-[10.5px] font-black uppercase tracking-[0.055em] text-[#71809b]";

export function Field({
    label,
    hint,
    required,
    children,
}: {
    label: string;
    hint?: string;
    required?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label className={labelClass}>
                {label}
                {required ? <span className="text-[#d44b62]"> *</span> : null}
            </label>
            {hint ? <p className="text-[11px] leading-relaxed text-[#71809b]">{hint}</p> : null}
            {children}
        </div>
    );
}

export function ChipGroup({
    options,
    selected,
    onToggle,
    otherValue,
    onOtherChange,
    otherPlaceholder,
    single,
}: {
    options: string[];
    selected: string[];
    onToggle: (value: string) => void;
    otherValue?: string;
    onOtherChange?: (value: string) => void;
    otherPlaceholder?: string;
    single?: boolean;
}) {
    const hasOther = onOtherChange !== undefined;
    const [otherOn, setOtherOn] = useState(() => !!otherValue?.trim());
    const showOther = hasOther && (otherOn || !!otherValue?.trim());
    return (
        <div className="space-y-2.5">
            <div className="flex flex-wrap gap-[7px]">
                {options.map((opt) => {
                    const isSel = selected.includes(opt);
                    return (
                        <button
                            key={opt}
                            type="button"
                            onClick={() => onToggle(opt)}
                            className={clsx(
                                "rounded-full border-[1.5px] px-[13px] py-2 text-xs font-bold transition hover:-translate-y-px",
                                isSel
                                    ? "border-[#6d4aff] bg-[#f1edff] text-[#5736d6]"
                                    : "border-[#e7eaf1] bg-[#fbfcfe] text-[#60708a] hover:border-[#c7befd]",
                            )}
                        >
                            {opt}
                        </button>
                    );
                })}
                {hasOther && !single ? (
                    <button
                        type="button"
                        onClick={() => {
                            if (showOther) {
                                setOtherOn(false);
                                onOtherChange!("");
                            } else {
                                setOtherOn(true);
                            }
                        }}
                        className={clsx(
                            "rounded-full border-[1.5px] border-dashed px-[13px] py-2 text-xs font-bold transition",
                            showOther
                                ? "border-[#6d4aff] bg-[#f1edff] text-[#5736d6]"
                                : "border-[#e7eaf1] bg-[#fbfcfe] text-[#60708a] hover:border-[#c7befd]",
                        )}
                    >
                        ＋ Other
                    </button>
                ) : null}
            </div>
            {showOther ? (
                <input
                    type="text"
                    value={otherValue ?? ""}
                    onChange={(e) => onOtherChange!(e.target.value)}
                    placeholder={otherPlaceholder || "Type your own…"}
                    className={fieldClass}
                />
            ) : null}
        </div>
    );
}

export function SummaryBox({ text, placeholder }: { text?: string; placeholder?: string }) {
    const filled = Boolean(text?.trim());
    return (
        <div className="mt-4 rounded-xl border border-dashed border-[#b8a9ff] bg-[#fbfaff] px-3.5 py-3 text-[12.3px] leading-relaxed text-[#34405a]">
            <span className="mb-1 block text-[9px] font-black tracking-[0.10em] text-[#6d4aff]">✨ AI SECTION SUMMARY</span>
            {filled ? <RichSummaryText text={text!} /> : <span className="text-[#a4afc1]">{placeholder || "Fills as you type…"}</span>}
        </div>
    );
}

export function StepNav({
    onBack,
    onNext,
    nextLabel,
    saving,
    disabled,
    hideBack,
}: {
    onBack?: () => void;
    onNext: () => void;
    nextLabel: string;
    saving?: boolean;
    disabled?: boolean;
    hideBack?: boolean;
}) {
    return (
        <div className={clsx("mt-4 flex gap-[9px]", hideBack ? "justify-end" : "justify-between")}>
            {!hideBack ? (
                <button
                    type="button"
                    onClick={onBack}
                    className="rounded-[11px] border-[1.5px] border-[#e7eaf1] bg-white px-[18px] py-3 text-[13px] font-black text-[#71809b] hover:border-[#c7befd]"
                >
                    ← Back
                </button>
            ) : null}
            <button
                type="button"
                disabled={saving || disabled}
                onClick={onNext}
                className="rounded-[11px] bg-[#6d4aff] px-[18px] py-3 text-[13px] font-black text-white hover:bg-[#5b3ee6] disabled:cursor-not-allowed disabled:opacity-40"
            >
                {saving ? "Saving…" : nextLabel}
            </button>
        </div>
    );
}

export function toggleIn(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

function asString(v: unknown, fallback = ""): string {
    return typeof v === "string" ? v : fallback;
}
function asStringList(v: unknown, fallback: string[] = []): string[] {
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : fallback;
}
function asBool(v: unknown, fallback = false): boolean {
    return typeof v === "boolean" ? v : fallback;
}
function asRows(v: unknown, fallback: FypV9TableRow[]): FypV9TableRow[] {
    if (!Array.isArray(v) || !v.length) return fallback;
    return v.map((row) => {
        if (!row || typeof row !== "object") return { a: "", b: "", c: "" };
        const r = row as Record<string, unknown>;
        return { a: asString(r.a), b: asString(r.b), c: asString(r.c) };
    });
}
function asRoadmap(v: unknown, fallback: FypV9RoadStage[]): FypV9RoadStage[] {
    if (!Array.isArray(v) || !v.length) return fallback;
    return v.map((row) => {
        if (!row || typeof row !== "object") return { stage: "", goal: "" };
        const r = row as Record<string, unknown>;
        return { stage: asString(r.stage), goal: asString(r.goal) };
    });
}
function asPathway(v: unknown): Record<string, string | string[]> {
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    const out: Record<string, string | string[]> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        if (typeof val === "string") out[k] = val;
        else if (Array.isArray(val)) out[k] = val.filter((x): x is string => typeof x === "string");
    }
    return out;
}

/** Rebuilds V9 wizard state from `projectInfo.v9Form`, falling back to the live JSON groups. */
export function hydrateV9(entry: FypEntry): FypV9FormState {
    const pi = entry.projectInfo || {};
    const raw = (pi.v9Form || {}) as Record<string, unknown>;
    const bg = entry.background || {};
    const oi = entry.objectivesInfo || {};
    const find = entry.findings || {};
    const rf = entry.reflectionInfo || {};
    const repo = entry.repository || {};
    const rd = entry.routeDetails || {};

    const v9: FypV9FormState = {
        ...EMPTY_FYP_V9,
        academicAreaKey: asString(raw.academicAreaKey, pi.academicAreaKey || ""),
        discipline: asString(raw.discipline, pi.discipline || ""),
        disciplineOther: asString(raw.disciplineOther),
        officialProgram: asString(raw.officialProgram, pi.officialProgram || ""),
        academicLevel: asString(raw.academicLevel, pi.academicLevel || ""),
        academicLevelOther: asString(raw.academicLevelOther),
        teamType: asString(raw.teamType, pi.teamType || "Individual") || "Individual",
        teamRole: asString(raw.teamRole, pi.teamRole || ""),
        v9Route: isFypV9RouteKey(asString(raw.v9Route, pi.v9Route || "")) ? asString(raw.v9Route, pi.v9Route || "") as FypV9FormState["v9Route"] : isFypV9RouteKey(pi.v9Route) ? pi.v9Route : "",
        v9RouteOther: asString(raw.v9RouteOther, pi.v9RouteOther || ""),
        focus: asString(raw.focus, bg.problem || ""),
        why: asStringList(raw.why, bg.whyUrgent || []),
        whyOther: asString(raw.whyOther, bg.whyUrgentOther || ""),
        objective: asString(raw.objective, oi.aim || ""),
        audience: asString(raw.audience, bg.audienceOther || bg.audience?.[0] || ""),
        deliverables: asStringList(raw.deliverables),
        deliverableOther: asString(raw.deliverableOther),
        roadmap: asRoadmap(raw.roadmap, (rd.v9Roadmap || []).map((r) => ({ stage: r.stage || "", goal: r.goal || "" }))),
        pathway: Object.keys(asPathway(raw.pathway)).length ? asPathway(raw.pathway) : asPathway(rd.v9Pathway),
        evidence: asStringList(raw.evidence),
        evidenceOther: asString(raw.evidenceOther),
        hasQuant: asBool(raw.hasQuant),
        hasQual: asBool(raw.hasQual),
        qPopulation: asString(raw.qPopulation),
        qSample: asString(raw.qSample),
        qSampling: asString(raw.qSampling),
        qSamplingOther: asString(raw.qSamplingOther),
        qVariables: asString(raw.qVariables),
        qSoftware: asString(raw.qSoftware),
        qAnalysis: asStringList(raw.qAnalysis),
        qAnalysisOther: asString(raw.qAnalysisOther),
        qRows: asRows(raw.qRows, EMPTY_FYP_V9.qRows),
        qSig: asString(raw.qSig),
        qEffect: asString(raw.qEffect),
        qPerf: asString(raw.qPerf),
        qualData: asString(raw.qualData),
        qualAnalysis: asString(raw.qualAnalysis),
        qualAnalysisOther: asString(raw.qualAnalysisOther),
        qualSampling: asString(raw.qualSampling),
        qualSamplingOther: asString(raw.qualSamplingOther),
        qualSoftware: asString(raw.qualSoftware),
        qualRows: asRows(raw.qualRows, EMPTY_FYP_V9.qualRows),
        qualInsight: asString(raw.qualInsight),
        mixedIntegration: asString(raw.mixedIntegration),
        validationSummary: asString(raw.validationSummary),
        outcome: asString(raw.outcome),
        finding1: asString(raw.finding1, find.findings?.[0] || ""),
        finding2: asString(raw.finding2, find.findings?.[1] || ""),
        contribution: asStringList(raw.contribution),
        contribOther: asString(raw.contribOther),
        qualityEvidence: asString(raw.qualityEvidence, find.measurableImpact || ""),
        limitation: asString(raw.limitation, find.limitation || find.limitationType || ""),
        limitationOther: asString(raw.limitationOther, find.limitationDetail || ""),
        future: asString(raw.future, rf.whatsNext || ""),
        sustain: asString(raw.sustain),
        sustainHow: asString(raw.sustainHow),
        sdgHow: asString(raw.sdgHow, entry.sdgMapping?.entries?.[0]?.how || ""),
        learned: asString(raw.learned, rf.biggestLesson || ""),
        challenge: asString(raw.challenge, rf.hardestMoment || ""),
        skills: asStringList(raw.skills, rf.skills || []),
        skillOther: asString(raw.skillOther),
        sustainReflection: asString(raw.sustainReflection, rf.sustainabilityShift || ""),
        opportunities: asStringList(raw.opportunities),
        opportunityOther: asString(raw.opportunityOther),
        readiness: asString(raw.readiness),
        readinessOther: asString(raw.readinessOther),
        valueOffer: asString(raw.valueOffer),
        ipStatus: asString(raw.ipStatus),
        links: asString(raw.links, repo.externalLinks || ""),
        visibility: asString(raw.visibility, repo.visibility || EMPTY_FYP_V9.visibility),
    };

    if (!v9.teamType) v9.teamType = "Individual";
    return v9;
}
