"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { CheckCircle2, ChevronDown, Lock, Pencil, PlusCircle, RefreshCw, Trash2 } from "lucide-react";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import { ACTIVITY_FAMILY_OPTIONS, GLOBAL_ACTIVITY_TAXONOMY } from "../utils/globalActivityTaxonomy";
import { reportTextWordMeter } from "../utils/validation";
import {
    ACTIVITY_STATUS_OPTIONS,
    CHALLENGE_TAG_OPTIONS,
    EVIDENCE_BASIS_OPTIONS,
    NO_CHALLENGES_TAG,
    NO_OUTCOME_EVIDENCE_TAG,
    OUTPUT_GROUPS,
    OUTPUT_UNIT_OPTIONS,
    REACH_MODE_OPTIONS,
    SIMPLE_MEASURE_UNITS,
    activityIssues,
    baselineFromSection2,
    buildSection4Summary,
    challengeTagIssues,
    effectiveReachMode,
    reachIssues,
    reachStatusLine,
    simpleMeasureChangeLine,
    simpleMeasureIssues,
    suggestedUnitForOutput,
    wordCount,
    type ReachMode,
    type SimpleMeasure,
    type V19Activity,
    type V19Output,
} from "../utils/section4Streamlined";

const inputCls =
    "h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)]";
const selectCls =
    "h-11 w-full min-w-0 appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm font-medium text-slate-800 shadow-sm outline-none transition-colors focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)]";
const textareaCls =
    "min-h-[88px] w-full min-w-0 resize-y rounded-xl border border-slate-200 bg-white p-3.5 text-sm font-medium leading-relaxed text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)]";
const labelCls = "mb-1 block text-[11px] font-bold text-slate-700";
const kickerCls = "text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500";
const badgeRequired =
    "ml-auto shrink-0 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-600";

function Select({
    value,
    onChange,
    children,
    id,
    className,
}: {
    value: string;
    onChange: (v: string) => void;
    children: React.ReactNode;
    id?: string;
    className?: string;
}) {
    return (
        <div className={clsx("relative", className)}>
            <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={selectCls}>
                {children}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
    );
}

function newId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function emptyOutput(): V19Output & { title: string; verification_note: string; is_shared: boolean } {
    return { title: "", type: "", type_other: "", quantity: "", unit: "", unit_other: "", verification_note: "", is_shared: false };
}

/** New activities carry only the V19 fields; per-activity reach / delivery stay empty (reach is project-level now). */
function emptyActivity(): V19Activity {
    return {
        id: newId("act"),
        title: "",
        primary_category: "",
        sub_category: "",
        other_category_text: "",
        other_sub_category_text: "",
        activity_period: "",
        partner_host: "",
        description: "",
        status: "Ongoing",
        delivery_mode: "",
        implementation_models: [],
        sessions_count: "",
        delivery_explanation: "",
        outputs: [],
        no_output: false,
        no_output_reason: "",
        evidence_ref: "",
        serves_beneficiaries: false,
        beneficiaries_reached: "",
        unique_beneficiaries: "",
        beneficiary_categories: [],
        relevance_types: [],
        overlap_status: "",
        overlap_note: "",
        reach_counting_method: "",
        beneficiary_description: "",
        geographic_reach: "",
        geographic_sub_category: "",
        site_note: "",
        sdgs: [],
        v19: true,
    };
}

function subsFor(category: string): string[] {
    return GLOBAL_ACTIVITY_TAXONOMY[category] || [];
}

function WordMeter({ count, min, max }: { count: number; min: number; max: number }) {
    const meter = reportTextWordMeter(count, min, max);
    return (
        <p className={clsx("mt-1 text-right text-[10.5px] tabular-nums", meter.textClass)}>
            {count} / {min}–{max} words{count < min ? ` · add ${min - count}` : ""}
        </p>
    );
}

/**
 * V19 streamlined Section 4: 4.1 activities & outputs (name, status, category, what we did, what we
 * delivered or "no countable output", optional evidence link), 4.2 one project-level community reach,
 * 4.3 results (baseline read from Section 2, what changed, how we know, one optional before/after
 * measure), 4.4 challenges, and the field-generated section summary. Writes onto the existing report
 * keys so older drafts, scoring and the impact package keep working.
 */
export default function Section4Streamlined() {
    const { data, updateSection, getFieldError } = useReportForm();
    const section2 = (data.section2 || {}) as Record<string, unknown>;
    const section4 = data.section4 || { activity_blocks: [], project_summary: {} };
    const section5 = data.section5 || { observed_change: "", measurable_outcomes: [], challenges: "" };
    const activities: V19Activity[] = Array.isArray(section4.activity_blocks) ? (section4.activity_blocks as V19Activity[]) : [];
    const projectSummary = (section4.project_summary || {}) as Record<string, unknown>;

    const setActivities = (next: V19Activity[]) => updateSection("section4", { activity_blocks: next });
    const updateActivity = (index: number, patch: Partial<V19Activity>) =>
        setActivities(activities.map((a, i) => (i === index ? { ...a, ...patch } : a)));
    const setSummary = (patch: Record<string, unknown>) =>
        updateSection("section4", { project_summary: { ...projectSummary, ...patch } });

    // ----- evidence already attached elsewhere in the report (reused, never re-uploaded) -----
    const evidenceOptions = useMemo(() => {
        const out: string[] = [];
        const logs = Array.isArray(data.section1?.attendance_logs) ? data.section1.attendance_logs : [];
        logs.forEach((log, i) => {
            if (log?.evidence_file) out.push(`Attendance evidence · ${log.date || `session ${i + 1}`}${log.location ? ` · ${log.location}` : ""}`);
        });
        const files = (data.section8?.evidence_files || []) as Array<{ name?: string }>;
        files.forEach((f, i) => out.push(`Evidence file · ${f?.name || `file ${i + 1}`}`));
        const resourceFiles = ((data.section6 as { evidence_files?: Array<{ name?: string }> } | undefined)?.evidence_files || []) as Array<{ name?: string }>;
        resourceFiles.forEach((f, i) => out.push(`Resource evidence · ${f?.name || `file ${i + 1}`}`));
        return Array.from(new Set(out));
    }, [data.section1?.attendance_logs, data.section8?.evidence_files, data.section6]);

    // ----- 4.2 reach -----
    const reachMode = effectiveReachMode(projectSummary, activities);
    const reachErrors = reachIssues(projectSummary, activities);

    // ----- 4.3 results -----
    const baseline = baselineFromSection2(section2);
    const outcomes = Array.isArray(section5.measurable_outcomes) ? section5.measurable_outcomes : [];
    const simpleIndex = outcomes.findIndex((o) => (o as SimpleMeasure).simple === true);
    const simple = simpleIndex >= 0 ? (outcomes[simpleIndex] as SimpleMeasure) : null;
    const legacyOutcomeCount = outcomes.filter((o) => (o as SimpleMeasure).simple !== true).length;
    const [measureOpen, setMeasureOpen] = useState<boolean>(Boolean(simple));
    useEffect(() => {
        if (simple) setMeasureOpen(true);
    }, [simple]);

    const setSimple = (patch: Partial<SimpleMeasure>) => {
        const base: SimpleMeasure = simple || {
            id: newId("oc"),
            simple: true,
            outcome_area: "Observed result",
            outcome_sub_category: "",
            metric_category: "Measured result",
            metric: "",
            metric_other: "",
            baseline: "",
            endline: "",
            unit: "",
            unit_other: "",
            confidence_level: ["Student-reported"],
            measurement_explanation: "",
            activity_id: null,
        };
        const next = { ...base, ...patch };
        if (patch.metric !== undefined) next.outcome_sub_category = String(patch.metric || "");
        const list = simpleIndex >= 0 ? outcomes.map((o, i) => (i === simpleIndex ? next : o)) : [next, ...outcomes];
        updateSection("section5", { measurable_outcomes: list });
    };
    const clearSimple = () => {
        updateSection("section5", { measurable_outcomes: outcomes.filter((o) => (o as SimpleMeasure).simple !== true) });
        setMeasureOpen(false);
    };
    const measureErrors = simpleMeasureIssues(simple);
    const measureLine = simpleMeasureChangeLine(simple);

    // ----- 4.3 evidence basis chips ("How do you know?") -----
    const basisTags: string[] = Array.isArray(section5.evidence_basis_tags) ? section5.evidence_basis_tags : [];
    const toggleBasis = (tag: string) => {
        let next: string[];
        if (tag === NO_OUTCOME_EVIDENCE_TAG) next = basisTags.includes(tag) ? [] : [tag];
        else next = basisTags.includes(tag) ? basisTags.filter((t) => t !== tag) : [...basisTags.filter((t) => t !== NO_OUTCOME_EVIDENCE_TAG), tag];
        // Chips compose the "how we know" line when the student has not typed their own.
        const typed = String(section5.story_because || "").trim();
        const composed = next.join("; ");
        const wasComposed = !typed || typed === basisTags.join("; ");
        updateSection("section5", { evidence_basis_tags: next, ...(wasComposed ? { story_because: composed } : {}) });
    };

    // ----- 4.4 challenges -----
    const tags: string[] = Array.isArray(section5.challenge_tags) ? section5.challenge_tags : [];
    const toggleTag = (tag: string) => {
        let next: string[];
        if (tag === NO_CHALLENGES_TAG) next = tags.includes(tag) ? [] : [tag];
        else next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags.filter((t) => t !== NO_CHALLENGES_TAG), tag];
        updateSection("section5", { challenge_tags: next });
    };
    const challengeWords = wordCount(section5.challenges);

    // ----- summary + finalise -----
    const summary = useMemo(
        () =>
            buildSection4Summary({
                activities,
                projectSummary,
                observedChange: section5.observed_change,
                howWeKnow: section5.story_because,
                measure: simple,
                legacyOutcomeCount,
                challenges: section5.challenges,
                challengeTags: tags,
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [section4.activity_blocks, section4.project_summary, section5.observed_change, section5.story_because, section5.measurable_outcomes, section5.challenges, section5.challenge_tags],
    );
    const [summaryStamp, setSummaryStamp] = useState<string>("");
    const refreshSummary = () => {
        updateSection("section4", { summary_text: summary.text });
        setSummaryStamp(new Date().toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" }));
    };

    const activityErrors = activities.flatMap((a, i) => activityIssues(a, i, subsFor));
    const tagErrors = challengeTagIssues(tags);
    const changeWords = wordCount(section5.observed_change);
    const canFinalize =
        activities.length > 0 &&
        activityErrors.length === 0 &&
        reachErrors.length === 0 &&
        changeWords >= 8 &&
        measureErrors.length === 0 &&
        tagErrors.length === 0 &&
        challengeWords >= 15 &&
        challengeWords <= 60;
    const finalized = section4.finalized === true;
    const snapshot = useMemo(
        () => JSON.stringify({ a: activities, p: projectSummary, c: section5.observed_change, k: section5.story_because, m: simple, t: tags, ch: section5.challenges }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [section4.activity_blocks, section4.project_summary, section5.observed_change, section5.story_because, section5.measurable_outcomes, section5.challenge_tags, section5.challenges],
    );
    const finalizedSnapshotRef = useRef("");
    useEffect(() => {
        if (!finalized) return;
        if (!finalizedSnapshotRef.current) {
            finalizedSnapshotRef.current = snapshot;
            return;
        }
        if (snapshot !== finalizedSnapshotRef.current) updateSection("section4", { finalized: false });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [snapshot, finalized]);
    const finalise = () => {
        finalizedSnapshotRef.current = snapshot;
        updateSection("section4", { finalized: true, summary_text: summary.text });
    };

    const err = (field: string) => getFieldError(field);

    return (
        <div className="mx-auto max-w-6xl space-y-4 pb-10" data-ciel-section4-v19>
            {/* 4.1 Activities & outputs */}
            <section className="space-y-4 rounded-[18px] border border-[#dcebee] bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2.5">
                    <span className="cer-secn">4.1</span>
                    <h3 className="text-base font-semibold text-slate-900">Activities &amp; outputs</h3>
                    <span className={badgeRequired}>Required</span>
                </div>

                {activities.length === 0 ? (
                    <div className="rollEmpty">No activities added. Select “Add another activity” to begin.</div>
                ) : (
                    <div className="space-y-4">
                        {activities.map((a, index) => (
                            <ActivityCard
                                key={a.id || index}
                                activity={a}
                                index={index}
                                evidenceOptions={evidenceOptions}
                                err={err}
                                onChange={(patch) => updateActivity(index, patch)}
                                onRemove={() => {
                                    if (typeof window !== "undefined" && !window.confirm(`Remove activity ${index + 1}?`)) return;
                                    setActivities(activities.filter((_, i) => i !== index));
                                }}
                            />
                        ))}
                    </div>
                )}
                <FieldError message={activities.length ? undefined : err("activity_blocks")} />

                <button
                    type="button"
                    onClick={() => setActivities([...activities, emptyActivity()])}
                    className="cer-addbig flex items-center justify-center gap-2"
                >
                    <PlusCircle className="h-4 w-4" />
                    Add another activity
                </button>
            </section>

            {/* 4.2 Community reach */}
            <section className="space-y-3 rounded-[18px] border border-[#dcebee] bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2.5">
                    <span className="cer-secn">4.2</span>
                    <h3 className="text-base font-semibold text-slate-900">Community reach</h3>
                    <span className={badgeRequired}>Required</span>
                </div>
                <p className="text-[12px] text-slate-500">
                    Count the same person once across the entire project, even if they attend several activities. Record a defensible count, not the potential audience.
                </p>
                <div>
                    <p className={kickerCls}>Did the project directly reach people?</p>
                    <Select
                        value={reachMode}
                        onChange={(v) => {
                            const mode = v as ReachMode;
                            setSummary({
                                reach_mode: mode,
                                ...(mode === "none" ? { distinct_total_beneficiaries: "", counting_method: "" } : {}),
                            });
                        }}
                        className="mt-1.5"
                    >
                        <option value="">Choose one</option>
                        {REACH_MODE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </Select>
                    <FieldError message={err("project_summary.reach_mode")} />
                </div>
                {reachMode === "counted" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className={labelCls} htmlFor="v19-unique">
                                Unique people reached <span className="text-rose-500">*</span>
                            </label>
                            <input
                                id="v19-unique"
                                type="number"
                                min={1}
                                inputMode="numeric"
                                className={inputCls}
                                value={String(projectSummary.distinct_total_beneficiaries ?? "")}
                                onChange={(e) => setSummary({ distinct_total_beneficiaries: e.target.value.replace(/[^\d]/g, "") })}
                                placeholder="e.g. 30"
                            />
                            <FieldError message={err("project_summary.distinct_total_beneficiaries")} />
                        </div>
                        <div>
                            <label className={labelCls} htmlFor="v19-counting">
                                How was this unique count established? <span className="text-rose-500">*</span>
                            </label>
                            <input
                                id="v19-counting"
                                className={inputCls}
                                value={String(projectSummary.counting_method ?? "")}
                                onChange={(e) => setSummary({ counting_method: e.target.value })}
                                placeholder="e.g. Attendance register, names de-duplicated"
                            />
                            <FieldError message={err("project_summary.counting_method")} />
                        </div>
                    </div>
                ) : null}
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800" data-ciel-reach-status>
                    {reachStatusLine(projectSummary, activities)}
                </div>
            </section>

            {/* 4.3 Results */}
            <section className="space-y-3 rounded-[18px] border border-[#dcebee] bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2.5">
                    <span className="cer-secn">4.3</span>
                    <h3 className="text-base font-semibold text-slate-900">Results — what changed?</h3>
                    <span className={badgeRequired}>Required</span>
                </div>
                <p className="text-[12px] text-slate-500">Describe only what you observed or verified. If no change could be measured yet, say so.</p>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" data-ciel-baseline-auto>
                    <p className={kickerCls}>Baseline · automatically from Section 2</p>
                    <p className="mt-1 text-sm text-slate-800">{baseline || "Complete the problem and baseline in Section 2; it will appear here automatically."}</p>
                    <p className="mt-1 text-[11px] text-slate-500">Change the baseline in Section 2; no need to type it again here.</p>
                </div>

                <div>
                    <p className={kickerCls}>
                        What changed as a result of the work (if anything)? <span className="text-rose-500">*</span>
                    </p>
                    <textarea
                        className={clsx(textareaCls, "mt-1.5 min-h-[72px]")}
                        value={section5.observed_change || ""}
                        onChange={(e) => updateSection("section5", { observed_change: e.target.value })}
                        placeholder="e.g. Working lights were installed; learning improvement has not been assessed"
                    />
                    <WordMeter count={changeWords} min={8} max={100} />
                    <FieldError message={err("observed_change")} />
                </div>
                <div>
                    <p className={kickerCls}>How do you know?</p>
                    <div className="mt-1.5 flex flex-wrap gap-2" data-ciel-evidence-basis>
                        {EVIDENCE_BASIS_OPTIONS.map((tag) => {
                            const on = basisTags.includes(tag);
                            return (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => toggleBasis(tag)}
                                    aria-pressed={on}
                                    className={clsx(
                                        "rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition",
                                        on ? "border-[var(--teal)] bg-[var(--teal-soft)] text-[var(--teal)]" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                                    )}
                                >
                                    {tag}
                                </button>
                            );
                        })}
                    </div>
                    <input
                        className={clsx(inputCls, "mt-2")}
                        value={section5.story_because || ""}
                        onChange={(e) => updateSection("section5", { story_because: e.target.value })}
                        placeholder="e.g. Before/after photos in Section 7 or partner feedback; no outcome evidence yet"
                    />
                    <FieldError message={getFieldError("story_because")} />
                </div>

                <div className="rounded-xl border border-slate-200">
                    <button
                        type="button"
                        onClick={() => setMeasureOpen((v) => !v)}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[12px] font-bold text-[var(--teal)]"
                        aria-expanded={measureOpen}
                    >
                        <span>{measureOpen ? "▾" : "▸"}</span> ＋ One optional measurable result (before / after)
                    </button>
                    {measureOpen ? (
                        <div className="space-y-3 border-t border-slate-100 px-4 py-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label className={labelCls}>What was measured?</label>
                                    <input className={inputCls} value={String(simple?.metric || "")} onChange={(e) => setSimple({ metric: e.target.value })} placeholder="e.g. Reading assessment score" />
                                    <FieldError message={err("measurable_outcomes.0.metric")} />
                                </div>
                                <div>
                                    <label className={labelCls}>Unit</label>
                                    <Select value={String(simple?.unit || "")} onChange={(v) => setSimple({ unit: v })}>
                                        <option value="">Select…</option>
                                        {SIMPLE_MEASURE_UNITS.map((u) => (
                                            <option key={u} value={u}>
                                                {u}
                                            </option>
                                        ))}
                                    </Select>
                                    <FieldError message={err("measurable_outcomes.0.unit")} />
                                </div>
                                <div>
                                    <label className={labelCls}>Before (if measured)</label>
                                    <input type="number" step="any" className={inputCls} value={String(simple?.baseline ?? "")} onChange={(e) => setSimple({ baseline: e.target.value })} />
                                    <FieldError message={err("measurable_outcomes.0.baseline")} />
                                </div>
                                <div>
                                    <label className={labelCls}>After (same unit)</label>
                                    <input type="number" step="any" className={inputCls} value={String(simple?.endline ?? "")} onChange={(e) => setSimple({ endline: e.target.value })} />
                                    <FieldError message={err("measurable_outcomes.0.endline")} />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className={labelCls}>Source of these figures</label>
                                    <input className={inputCls} value={String(simple?.measurement_explanation || "")} onChange={(e) => setSimple({ measurement_explanation: e.target.value })} placeholder="e.g. Before/after assessment sheets" />
                                    <FieldError message={err("measurable_outcomes.0.measurement_explanation")} />
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-[11.5px] text-slate-600">{measureLine || (measureErrors[0]?.message ?? "Attribution not established")}</p>
                                {simple ? (
                                    <button type="button" onClick={clearSimple} className="text-[11px] font-bold text-rose-600 hover:underline">
                                        Clear this result
                                    </button>
                                ) : null}
                            </div>
                            {legacyOutcomeCount ? (
                                <p className="text-[11px] text-slate-500">
                                    {legacyOutcomeCount} earlier before/after comparison{legacyOutcomeCount === 1 ? "" : "s"} from the previous report version stay saved with this report.
                                </p>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </section>

            {/* 4.4 Challenges */}
            <section className="space-y-3 rounded-[18px] border border-[#dcebee] bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2.5">
                    <span className="cer-secn">4.4</span>
                    <h3 className="text-base font-semibold text-slate-900">Challenges &amp; limitations</h3>
                    <span className={badgeRequired}>Required · 15–60 words</span>
                </div>
                <p className={kickerCls}>What was hard? (select all that apply)</p>
                <p className="text-[12px] text-slate-500">Honest limitations help reviewers understand what your project could and could not achieve.</p>
                <div className="flex flex-wrap gap-2" data-ciel-challenge-tags>
                    {[...CHALLENGE_TAG_OPTIONS, NO_CHALLENGES_TAG].map((tag) => {
                        const on = tags.includes(tag);
                        return (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => toggleTag(tag)}
                                className={clsx(
                                    "rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition",
                                    on ? "border-[var(--teal)] bg-[var(--teal-soft)] text-[var(--teal)]" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                                )}
                                aria-pressed={on}
                            >
                                {tag}
                            </button>
                        );
                    })}
                </div>
                <FieldError message={err("challenge_tags")} />
                <div>
                    <p className={kickerCls}>What challenges did you face and how did they affect your work or results?</p>
                    <p className="text-[11.5px] text-slate-500">
                        In 15–60 words, describe delivery barriers, what could not be achieved or measured, and any alternative explanations for the change. If there were no significant challenges, explain what was and was not assessed.
                    </p>
                    <textarea
                        className={clsx(textareaCls, "mt-1.5")}
                        value={section5.challenges || ""}
                        onChange={(e) => updateSection("section5", { challenges: e.target.value })}
                        placeholder="e.g. Limited time meant we could not give every child individual support. We measured progress at the end of the workshops, but could not assess whether it lasted."
                    />
                    <WordMeter count={challengeWords} min={15} max={60} />
                    <FieldError message={err("challenges")} />
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] text-amber-900">
                    Evidence: link supporting records to these activities and results in Section 7 (Evidence). An observed change does not establish that the project alone caused it.
                </div>
            </section>

            {/* Summary */}
            <section className="overflow-hidden rounded-[18px] border border-[#0b2a33] bg-white shadow-sm" data-ciel-section4-summary>
                <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0b2a33] px-5 py-3 text-white">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em]">✦ Auto-generated Section 4 summary</p>
                    <p className="text-[10px] text-white/70">{summaryStamp ? `Updated ${summaryStamp}` : "Updated from form fields · AI-ready"}</p>
                </div>
                <div className="space-y-4 px-5 py-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {[
                            [String(summary.majorActivities), "Major activities"],
                            [String(summary.outputRecords), "Output records"],
                            [summary.uniqueLabel, "Unique beneficiaries"],
                        ].map(([v, l]) => (
                            <div key={l} className="rounded-xl border border-[#dcebee] bg-[#f8fcfd] px-4 py-3">
                                <b className="block text-xl font-black text-[#0e7d74]">{v}</b>
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{l}</span>
                            </div>
                        ))}
                    </div>
                    {[
                        ["Activities and deliverables", summary.activitiesText],
                        ["Community reach", summary.reachText],
                        ["Results and evidence", summary.resultsText],
                        ["Challenges and limitations", summary.challengesText],
                    ].map(([h, t]) => (
                        <div key={h}>
                            <p className="text-[11.5px] font-bold text-slate-900">{h}</p>
                            <p className="whitespace-pre-line text-[12px] leading-relaxed text-slate-700">{t}</p>
                        </div>
                    ))}
                    <p className="text-[10.5px] text-slate-500">
                        Generated from student-entered data; not independently verified. The detailed report and Impact Flash Card reuse the same stored activity and outcome records.
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={refreshSummary}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--teal)] bg-[var(--teal-soft)] px-3.5 py-1.5 text-[11px] font-bold text-[var(--teal)]"
                        >
                            <RefreshCw className="h-3.5 w-3.5" /> Refresh summary
                        </button>
                        <span className="text-[11px] text-slate-500">No student-written analytical summary required.</span>
                    </div>
                </div>
            </section>

            {/* Finalise */}
            <section className="space-y-2">
                {!finalized ? (
                    <>
                        <button
                            type="button"
                            onClick={finalise}
                            disabled={!canFinalize}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--teal)] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Finalise Section 4 →
                        </button>
                        {!canFinalize ? (
                            <p className="text-center text-xs text-slate-500">Complete the required fields listed in the section summary before finalising.</p>
                        ) : (
                            <p className="text-center text-xs text-emerald-600">Ready ✨</p>
                        )}
                    </>
                ) : (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
                        <span className="inline-flex items-center gap-1.5 font-semibold">
                            <CheckCircle2 className="h-4 w-4" /> Section 4 finalised — the summary above travels with your report.
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <Lock className="h-3.5 w-3.5" /> Editing any field above re-opens it.
                        </span>
                        <button type="button" onClick={() => updateSection("section4", { finalized: false })} className="ml-auto inline-flex items-center gap-1 font-semibold text-[var(--teal)] hover:underline">
                            <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
}

function ActivityCard({
    activity: a,
    index,
    evidenceOptions,
    err,
    onChange,
    onRemove,
}: {
    activity: V19Activity;
    index: number;
    evidenceOptions: string[];
    err: (field: string) => string | undefined;
    onChange: (patch: Partial<V19Activity>) => void;
    onRemove: () => void;
}) {
    const f = (k: string) => `activity_blocks.${index}.${k}`;
    const category = String(a.primary_category || "");
    const subs = subsFor(category);
    const catOther = /other/i.test(category);
    const subOther = /other/i.test(String(a.sub_category || ""));
    const outputs: V19Output[] = Array.isArray(a.outputs) ? a.outputs : [];
    const descWords = wordCount(a.description);

    const setOutput = (i: number, patch: Partial<V19Output>) => {
        const next = outputs.map((o, k) => {
            if (k !== i) return o;
            const merged = { ...o, ...patch };
            if (patch.type !== undefined) {
                merged.title = patch.type;
                if (!/other/i.test(String(patch.type))) merged.type_other = "";
                merged.unit = suggestedUnitForOutput(String(patch.type || ""));
            }
            return merged;
        });
        onChange({ outputs: next, no_output: false });
    };

    return (
        <div className="rounded-2xl border border-[#dcebee] bg-[#fbfdfd]" data-ciel-activity-card>
            <div className="flex items-center justify-between gap-3 rounded-t-2xl border-b border-[#e6f0f2] bg-[#eef7f6] px-4 py-2.5">
                <p className="text-[12px] font-black text-slate-800">
                    Activity {index + 1}
                    {a.title ? <span className="font-semibold text-slate-500"> · {a.title}</span> : null}
                </p>
                <button type="button" onClick={onRemove} className="inline-flex items-center gap-1 text-[10.5px] font-bold text-rose-600 hover:underline">
                    <Trash2 className="h-3.5 w-3.5" /> Remove activity
                </button>
            </div>
            <div className="space-y-4 px-4 py-4">
                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <label className={labelCls}>
                            Activity name <span className="text-rose-500">*</span>
                        </label>
                        <input className={inputCls} value={String(a.title || "")} onChange={(e) => onChange({ title: e.target.value })} placeholder="e.g. English language workshops" />
                        <FieldError message={err(f("title"))} />
                    </div>
                    <div>
                        <label className={labelCls}>
                            Activity status <span className="text-rose-500">*</span>
                        </label>
                        <Select value={String(a.status || "")} onChange={(v) => onChange({ status: v })}>
                            <option value="">Choose status</option>
                            {ACTIVITY_STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </Select>
                        <FieldError message={err(f("status"))} />
                    </div>
                    <div>
                        <label className={labelCls}>
                            Activity category <span className="text-rose-500">*</span> <span className="font-normal text-slate-400">— select manually</span>
                        </label>
                        <Select value={category} onChange={(v) => onChange({ primary_category: v, sub_category: "", other_sub_category_text: "", ...(/other/i.test(v) ? {} : { other_category_text: "" }) })}>
                            <option value="">Choose activity category</option>
                            {ACTIVITY_FAMILY_OPTIONS.map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                        </Select>
                        <FieldError message={err(f("primary_category"))} />
                        {catOther ? (
                            <div className="mt-2">
                                <label className={labelCls}>
                                    Specify category <span className="text-rose-500">*</span>
                                </label>
                                <input className={inputCls} value={String(a.other_category_text || "")} onChange={(e) => onChange({ other_category_text: e.target.value })} placeholder="Name the category" />
                                <FieldError message={err(f("other_category_text"))} />
                            </div>
                        ) : null}
                    </div>
                    <div>
                        <label className={labelCls}>
                            Activity subcategory <span className="text-rose-500">*</span> <span className="font-normal text-slate-400">— select manually</span>
                        </label>
                        <Select value={String(a.sub_category || "")} onChange={(v) => onChange({ sub_category: v, ...(/other/i.test(v) ? {} : { other_sub_category_text: "" }) })}>
                            <option value="">{category && !catOther ? "Choose subcategory" : catOther ? "Not needed for a custom category" : "Choose a category first"}</option>
                            {subs.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                            {!catOther && subs.length && !subs.some((s) => /other/i.test(s)) ? <option value="Other">Other</option> : null}
                        </Select>
                        <FieldError message={err(f("sub_category"))} />
                        {subOther ? (
                            <div className="mt-2">
                                <label className={labelCls}>
                                    Specify subcategory <span className="text-rose-500">*</span>
                                </label>
                                <input className={inputCls} value={String(a.other_sub_category_text || "")} onChange={(e) => onChange({ other_sub_category_text: e.target.value })} placeholder="Name the subcategory" />
                                <FieldError message={err(f("other_sub_category_text"))} />
                            </div>
                        ) : null}
                    </div>
                </div>

                <div>
                    <label className={labelCls}>
                        What did I/we actually do? <span className="text-rose-500">*</span>
                    </label>
                    <textarea className={textareaCls} value={String(a.description || "")} onChange={(e) => onChange({ description: e.target.value })} placeholder="Briefly describe the activity and the work completed." />
                    <WordMeter count={descWords} min={15} max={60} />
                    <FieldError message={err(f("description"))} />
                </div>

                <div>
                    <label className={labelCls}>
                        What did I/we deliver? <span className="text-rose-500">*</span>
                    </label>
                    <p className="text-[11.5px] text-slate-500">
                        Enter concrete outputs with quantities; for example, 4 sessions or 30 learning kits. Do not describe future impact as an output.
                    </p>
                    <div className="mt-2 space-y-2">
                        {outputs.map((o, i) => (
                            <div key={i} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)_minmax(0,0.9fr)_auto] sm:items-end" data-ciel-output-row>
                                <div>
                                    <label className={labelCls}>Output</label>
                                    <Select value={String(o.type || o.title || "")} onChange={(v) => setOutput(i, { type: v })}>
                                        <option value="">Choose output…</option>
                                        {OUTPUT_GROUPS.map(([g, values]) => (
                                            <optgroup key={g} label={g}>
                                                {values.map((v) => (
                                                    <option key={v} value={v}>
                                                        {v}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </Select>
                                    {/other/i.test(String(o.type || "")) ? (
                                        <input className={clsx(inputCls, "mt-2")} value={String(o.type_other || "")} onChange={(e) => setOutput(i, { type_other: e.target.value })} placeholder="Specify the output" />
                                    ) : null}
                                </div>
                                <div>
                                    <label className={labelCls}>
                                        Quantity <span className="text-rose-500">*</span>
                                    </label>
                                    <input type="number" min={0} step="any" inputMode="decimal" className={inputCls} value={String(o.quantity ?? "")} onChange={(e) => setOutput(i, { quantity: e.target.value })} />
                                </div>
                                <div>
                                    <label className={labelCls}>
                                        Unit <span className="text-rose-500">*</span>
                                    </label>
                                    <Select value={String(o.unit || "")} onChange={(v) => setOutput(i, { unit: v })}>
                                        <option value="">Select…</option>
                                        {OUTPUT_UNIT_OPTIONS.map((u) => (
                                            <option key={u} value={u}>
                                                {u}
                                            </option>
                                        ))}
                                    </Select>
                                    {/other/i.test(String(o.unit || "")) ? (
                                        <input className={clsx(inputCls, "mt-2")} value={String(o.unit_other || "")} onChange={(e) => setOutput(i, { unit_other: e.target.value })} placeholder="Specify the unit" />
                                    ) : null}
                                </div>
                                <button type="button" onClick={() => onChange({ outputs: outputs.filter((_, k) => k !== i) })} className="h-11 rounded-lg px-2 text-[11px] font-bold text-rose-600 hover:bg-rose-50" aria-label="Remove output">
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => onChange({ outputs: [...outputs, emptyOutput()], no_output: false, no_output_reason: "" })}
                        className="mt-2 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-100"
                    >
                        + Add an output
                    </button>
                    <label className="mt-3 flex items-start gap-2 text-[11.5px] font-semibold text-slate-700">
                        <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={a.no_output === true}
                            onChange={(e) => onChange({ no_output: e.target.checked, ...(e.target.checked ? { outputs: [] } : { no_output_reason: "" }) })}
                        />
                        No countable output is applicable to this activity
                    </label>
                    {a.no_output === true ? (
                        <input className={clsx(inputCls, "mt-2")} value={String(a.no_output_reason || "")} onChange={(e) => onChange({ no_output_reason: e.target.value })} placeholder="Briefly explain why" />
                    ) : null}
                    <FieldError message={err(f("outputs"))} />
                </div>

                <div>
                    <label className={labelCls}>Supporting evidence (optional here)</label>
                    <Select value={String(a.evidence_ref || "")} onChange={(v) => onChange({ evidence_ref: v })}>
                        <option value="">Choose existing evidence (optional)</option>
                        {evidenceOptions.map((e) => (
                            <option key={e} value={e}>
                                {e}
                            </option>
                        ))}
                        {a.evidence_ref && !evidenceOptions.includes(String(a.evidence_ref)) ? <option value={String(a.evidence_ref)}>Previously linked: {String(a.evidence_ref)}</option> : null}
                    </Select>
                    <p className="mt-1 text-[11px] text-slate-500">Evidence already attached in Participation or Evidence can be reused; no repeated uploads or activity location required.</p>
                </div>
            </div>
        </div>
    );
}
