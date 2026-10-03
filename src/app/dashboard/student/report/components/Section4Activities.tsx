import React, { useMemo, useRef, useEffect } from 'react';
import { useReportForm } from '../context/ReportContext';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { FieldError } from './ui/FieldError';
import {
    Target, ChevronDown, PlusCircle, Lock, Pencil, CheckCircle2, Calendar,
} from 'lucide-react';
import clsx from 'clsx';
import {
    OUTPUT_TYPES, UNIVERSAL_UNITS,
    BENEFICIARY_CATEGORIES,
    GEOGRAPHIC_REACH_OPTIONS,
    COUNTING_METHODS
} from '../utils/section4Constants';
import { ACTIVITY_FAMILY_OPTIONS, GLOBAL_ACTIVITY_TAXONOMY, isOtherTaxonomyChoice } from '../utils/globalActivityTaxonomy';
import { reportTextWordMeter } from '../utils/validation';
import { integerFieldInput } from '@/utils/integerFieldInput';
import { decimalFieldInput } from '@/utils/decimalFieldInput';
import { findSdgById } from '@/utils/sdgData';
import {
    LADDER_STEPS,
    OVERLAP_CHIPS,
    SHORT_NOTE_MIN_WORDS,
    SHORT_NOTE_MAX_WORDS,
    SURE_OPTIONS,
    FAM_OUTPUT_HINTS,
    FAM_BEN_HINTS,
    FAM_METRIC_HINTS,
    unitForOutputType,
    ladderWordCount,
    outputRowOk,
    step1Ok,
    step2Ok,
    step3Ok,
    step4Ok,
    stepNeedText,
    readLadderOpen,
    readLadderAllBen,
    stripFamilyEmoji,
    numValue,
    matchedProjectSdgs,
    outcomeDisplayName,
    outcomeLadderOk,
    metricPickPatch,
    isBlankUnattachedOutcome,
    isOtherLike,
    type LadderOutcome,
} from '../utils/section4Ladder';

const inputClasses =
    "h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)]";
const dateInputClasses =
    `${inputClasses} [color-scheme:light]`;
const selectClasses =
    "h-11 w-full min-w-0 appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm font-medium text-slate-800 shadow-sm outline-none transition-colors focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)]";
const textareaClasses =
    "min-h-[100px] w-full min-w-0 resize-y rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium leading-relaxed text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)]";
const fieldLabel =
    "text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500";
const badgeMandatory =
    "shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700";
const badgeAuto =
    "shrink-0 rounded-full bg-[var(--aqua-soft)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--aqua)]";

function parseActivityPeriod(raw?: string): { from: string; to: string; legacy: string } {
    const text = String(raw || "").trim();
    if (!text) return { from: "", to: "", legacy: "" };
    const range = text.match(
        /^(\d{4}-\d{2}-\d{2})\s*(?:–|—|-|to)\s*(\d{4}-\d{2}-\d{2})$/i,
    );
    if (range) return { from: range[1], to: range[2], legacy: "" };
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return { from: text, to: "", legacy: "" };
    return { from: "", to: "", legacy: text };
}

function formatActivityPeriod(from: string, to: string): string {
    const start = (from || "").trim();
    const end = (to || "").trim();
    if (start && end) return start === end ? start : `${start} – ${end}`;
    return start || end || "";
}

function emptyOutput(type = '') {
    return {
        title: type,
        type,
        type_other: '',
        quantity: '',
        unit: type ? unitForOutputType(type) : '',
        unit_other: '',
        verification_note: '',
        is_shared: false,
    };
}

function emptyActivity() {
    return {
        id: Math.random().toString(36).substr(2, 9),
        title: '',
        primary_category: '',
        sub_category: '',
        other_category_text: '',
        other_sub_category_text: '',
        activity_period: '',
        partner_host: '',
        description: '',
        status: 'Ongoing',
        delivery_mode: '',
        implementation_models: [],
        sessions_count: '',
        delivery_explanation: '',
        outputs: [],
        serves_beneficiaries: true,
        beneficiaries_reached: '',
        unique_beneficiaries: '',
        beneficiary_categories: [],
        other_beneficiary_text: '',
        relevance_types: [],
        overlap_status: '',
        overlap_note: '',
        reach_counting_method: '',
        reach_counting_method_other: '',
        beneficiary_description: '',
        geographic_reach: '',
        geographic_sub_category: '',
        site_note: '',
        sdgs: [] as number[],
        ladder_ui: { open: 1 },
    };
}

function emptyOutcome(activityId: string | null): LadderOutcome {
    return {
        id: `oc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        activity_id: activityId,
        outcome_area: '',
        outcome_sub_category: '',
        metric_category: '',
        metric: '',
        metric_other: '',
        baseline: '',
        endline: '',
        unit: '',
        confidence_level: [],
        measurement_explanation: '',
        sure: 0,
    };
}

/** Keeps a previously saved value selectable after an option list changes. */
function withCurrent(list: string[], current: unknown): string[] {
    const cur = String(current ?? '').trim();
    return cur && !list.includes(cur) ? [...list, cur] : list;
}

function WordMeterBar({
    count,
    min,
    max,
    extra,
}: {
    count: number;
    min: number;
    max: number;
    extra?: string;
}) {
    const meter = reportTextWordMeter(count, min, max);
    return (
        <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-100 sm:w-48">
                <div
                    className={clsx("h-full rounded-full transition-all", meter.barClass)}
                    style={{ width: `${meter.widthPct}%` }}
                />
            </div>
            <p className={clsx("text-[11px] tabular-nums", meter.textClass)}>
                {count} / {min}–{max} words{extra ? ` · ${extra}` : ""}
            </p>
        </div>
    );
}

export default function Section4Activities() {
    const { data, updateSection, getFieldError } = useReportForm();
    const section3 = data.section3 || {};
    const section4 = data.section4 || { activity_blocks: [], project_summary: {} };
    const section5 = data.section5 || { measurable_outcomes: [] };

    const update = (field: string, val: any) => updateSection('section4', { [field]: val });

    const projectSdgs = useMemo(() => {
        const nums: number[] = [];
        const primary = Number(section3?.primary_sdg?.goal_number);
        if (primary >= 1 && primary <= 17) nums.push(primary);
        for (const row of section3?.secondary_sdgs || []) {
            const n = Number(row?.goal_number);
            if (n >= 1 && n <= 17) nums.push(n);
        }
        return [...new Set(nums)].sort((a, b) => a - b);
    }, [section3?.primary_sdg?.goal_number, section3?.secondary_sdgs]);

    const outcomes: LadderOutcome[] = Array.isArray(section5.measurable_outcomes)
        ? section5.measurable_outcomes
        : [];

    const setOutcomes = (next: LadderOutcome[]) => {
        updateSection('section5', { measurable_outcomes: next });
    };

    const syncSummary = (blocks: any[]) => {
        const uniqueSum = blocks.reduce((sum, a) => {
            const n = parseInt(String(a.unique_beneficiaries ?? a.beneficiaries_reached ?? ''), 10);
            return sum + (Number.isFinite(n) ? n : 0);
        }, 0);
        const method = blocks.map((a) => a.reach_counting_method).find(Boolean) || '';
        updateSection('section4', {
            activity_blocks: blocks,
            project_summary: {
                ...(section4.project_summary || {}),
                distinct_total_beneficiaries: uniqueSum ? String(uniqueSum) : '',
                counting_method: method || section4.project_summary?.counting_method || '',
            },
        });
    };

    const addActivity = () => {
        const blocks = (section4.activity_blocks || []).map((block: any) => ({
            ...block,
            ladder_ui: { ...(block.ladder_ui || {}), open: 0 },
        }));
        syncSummary([...blocks, emptyActivity()]);
    };

    const removeActivity = (index: number) => {
        const target = section4.activity_blocks[index];
        if (
            target?.id &&
            outcomes.some((o) => o.activity_id === target.id && !isBlankUnattachedOutcome({ ...o, activity_id: null })) &&
            typeof window !== 'undefined' &&
            !window.confirm('This activity has before → after results attached. Delete them too?')
        ) {
            return;
        }
        const nextBlocks = section4.activity_blocks.filter((_: any, i: number) => i !== index);
        syncSummary(nextBlocks);
        if (target?.id) {
            setOutcomes(outcomes.filter((o) => o.activity_id !== target.id));
        }
    };

    const updateActivity = (index: number, updates: Record<string, any>) => {
        const blocks = (section4.activity_blocks || []).map((block: any, i: number) => (
            i === index ? { ...block, ...updates } : block
        ));
        syncSummary(blocks);
    };

    const activities: any[] = section4.activity_blocks || [];
    // The ladder never writes sessions_count — fall back to delivered outputs counted in Sessions.
    const sessionsTotal = activities.reduce((sum, a) => {
        const own = parseInt(a.sessions_count) || 0;
        if (own) return sum + own;
        const fromOutputs = (a.outputs || []).reduce(
            (n: number, o: any) => (/session/i.test(String(o?.unit || '')) ? n + (Number(o?.quantity) || 0) : n),
            0,
        );
        return sum + fromOutputs;
    }, 0);
    const scaleActivities = activities.length;
    const scaleOutputs = activities.reduce(
        (sum, a) => sum + (a.outputs || []).filter((o: any) => Number(o?.quantity) > 0).length,
        0,
    );
    const scaleReached = activities.reduce(
        (sum, a) => sum + (parseInt(String(a.unique_beneficiaries ?? a.beneficiaries_reached ?? ''), 10) || 0),
        0,
    );
    const scaleBroadest = activities.reduce((best: string, a) => {
        const geo = String(a.geographic_reach || '').trim();
        if (!geo) return best;
        return GEOGRAPHIC_REACH_OPTIONS.indexOf(geo) >= GEOGRAPHIC_REACH_OPTIONS.indexOf(best) ? geo : best;
    }, '') || '—';
    const outputsTotal = activities.reduce((sum, a) => sum + (a.outputs?.length || 0), 0);
    const distinctPeople = section4.project_summary?.distinct_total_beneficiaries || '';
    const countingMethod = section4.project_summary?.counting_method || '';
    const primaryCategoryLabel = useMemo(() => {
        const cats = Array.from(new Set(activities.map((a) => a.primary_category).filter(Boolean)));
        return cats.join(' · ');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [section4.activity_blocks]);
    const canFinalizeSection4 = activities.length > 0;
    const isSection4Finalized = !!section4.finalized;

    const section4Snapshot = useMemo(
        () => JSON.stringify({ activities, project_summary: section4.project_summary }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [section4.activity_blocks, section4.project_summary],
    );
    const lastFinalizedSection4SnapshotRef = useRef('');
    useEffect(() => {
        if (!isSection4Finalized) return;
        if (!lastFinalizedSection4SnapshotRef.current) {
            lastFinalizedSection4SnapshotRef.current = section4Snapshot;
            return;
        }
        if (section4Snapshot !== lastFinalizedSection4SnapshotRef.current) {
            update('finalized', false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [section4Snapshot, isSection4Finalized]);
    const handleFinalizeSection4 = () => {
        lastFinalizedSection4SnapshotRef.current = section4Snapshot;
        update('finalized', true);
    };
    const handleUnfinalizeSection4 = () => update('finalized', false);

    return (
        <div className="mx-auto max-w-6xl space-y-3 pb-10">
            <div className="ladderIntro" id="ladderIntro">
                <b>How this section works:</b> one card per activity, four small steps. Finish a step, press <b>Looks good</b>, the next one opens. You can always tap a finished step to edit it.
                <div className="steps">
                    <span>1 · Did — what &amp; who</span>
                    <span>2 · Delivered — what you can count</span>
                    <span>3 · Who — how many, counted once</span>
                    <span>4 · Changed — before → after (optional per activity)</span>
                </div>
            </div>

            <section className="space-y-4 rounded-[18px] border border-[#dcebee] bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2.5">
                    <span className="cer-secn">4.1</span>
                    <h3 className="text-base font-semibold text-slate-900">Activity cards — one per major effort</h3>
                    <span className={badgeMandatory}>Mandatory</span>
                </div>
                <p className="ladWhy">
                    <b>Why four steps?</b> Reviewers score three different things — what you <b>did</b>, what you can <b>count</b>, and what <b>changed</b>. Keeping them apart is what makes a report believable. Every activity needs steps 1–3; step 4 is optional per activity, but the whole project needs at least one measured change.
                </p>

                {section4.activity_blocks.length === 0 ? (
                    <div className="rollEmpty">
                        No activity yet. Tap <b>＋ Add new activity</b> — one card per major effort.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {section4.activity_blocks.map((activity: any, index: number) => (
                            <ActivityLadderCard
                                key={activity.id}
                                activity={activity}
                                index={index}
                                projectSdgs={projectSdgs}
                                outcomes={outcomes.filter((o) => o.activity_id === activity.id)}
                                updateActivity={updateActivity}
                                removeActivity={removeActivity}
                                setOutcomes={(nextForAct: LadderOutcome[]) => {
                                    const result: LadderOutcome[] = [];
                                    let inserted = false;
                                    for (const row of outcomes) {
                                        if (row.activity_id === activity.id) {
                                            if (!inserted) {
                                                result.push(...nextForAct);
                                                inserted = true;
                                            }
                                            continue;
                                        }
                                        if (!inserted && nextForAct.length && isBlankUnattachedOutcome(row)) {
                                            result.push({ ...nextForAct[0], id: row.id || nextForAct[0].id });
                                            result.push(...nextForAct.slice(1));
                                            inserted = true;
                                            continue;
                                        }
                                        result.push(row);
                                    }
                                    if (!inserted) result.push(...nextForAct);
                                    setOutcomes(result);
                                }}
                                getFieldError={getFieldError}
                            />
                        ))}
                    </div>
                )}

                <button
                    type="button"
                    onClick={addActivity}
                    className="cer-addbig flex items-center justify-center gap-2"
                >
                    <PlusCircle className="h-4 w-4" />
                    Add new activity
                </button>
            </section>

            <section className="space-y-4 rounded-[18px] border border-[#dcebee] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2.5">
                    <span className="cer-secn">4.2</span>
                    <h3 className="text-base font-semibold text-slate-900">Implementation scale</h3>
                    <span className={clsx(badgeAuto, "ml-auto")}>Auto — nothing to fill</span>
                </div>

                <div className="flex flex-wrap gap-2">
                    {[
                        { emoji: '🛠️', label: 'Activities', value: String(scaleActivities) },
                        { emoji: '📦', label: 'Outputs', value: String(scaleOutputs) },
                        { emoji: '🫶', label: 'Reached', value: String(scaleReached) },
                        { emoji: '🗺️', label: 'Broadest reach', value: scaleBroadest },
                    ].map((card) => (
                        <div key={card.label} className="s4-scale">
                            <div className="text-base leading-none">{card.emoji}</div>
                            <b className="mt-1 block text-sm text-[#0d2b33]">{card.value}</b>
                            <div className="mt-1 text-[7px] font-extrabold uppercase tracking-[0.1em] text-[#7a919a]">{card.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="space-y-3 border-t border-slate-200 pt-8">
                {!isSection4Finalized ? (
                    <>
                        <button
                            type="button"
                            onClick={handleFinalizeSection4}
                            disabled={!canFinalizeSection4}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Finalise Section 4 →
                        </button>
                        <p className="text-center text-xs text-slate-500">
                            {canFinalizeSection4
                                ? 'Ready ✨'
                                : 'Add at least one activity to finalise.'}
                        </p>
                    </>
                ) : (
                    <>
                        <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 px-5 py-5 text-white sm:px-6">
                                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                    Section 4 · The effort — finalised
                                </p>
                                <h3 className="mt-2 text-lg font-bold">
                                    🛠️ {activities.length} activit{activities.length === 1 ? 'y' : 'ies'} → 📦 {outputsTotal} verified output{outputsTotal === 1 ? '' : 's'} → {distinctPeople} distinct people
                                </h3>
                                {(primaryCategoryLabel || countingMethod) ? (
                                    <p className="mt-1 text-sm text-slate-300">
                                        {primaryCategoryLabel}{primaryCategoryLabel && countingMethod ? ' · ' : ''}
                                        {countingMethod ? `counted via ${countingMethod.toLowerCase()}` : ''}
                                    </p>
                                ) : null}
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {[
                                        { label: 'Activities', value: String(activities.length) },
                                        { label: 'Sessions', value: String(sessionsTotal) },
                                        { label: 'Outputs', value: String(outputsTotal) },
                                        { label: 'Distinct people', value: distinctPeople || '—' },
                                    ].map((stat) => (
                                        <span key={stat.label} className="rounded-lg bg-white/10 px-4 py-2.5 text-center">
                                            <span className="block text-lg font-bold leading-none">{stat.value}</span>
                                            <span className="mt-1 block text-[9px] font-semibold uppercase tracking-wide text-slate-300">{stat.label}</span>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="divide-y divide-slate-100 bg-white">
                                {activities.map((a, i) => {
                                    const statusEmoji = a.status === 'Completed' ? '✅' : a.status === 'Ongoing' ? '⏳' : a.status ? '🔶' : '';
                                    return (
                                        <div key={a.id || i} className="flex gap-4 p-5 sm:px-6">
                                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                                <Target className="h-5 w-5" />
                                            </span>
                                            <div className="min-w-0 flex-1 space-y-1.5">
                                                <h4 className="text-sm font-bold text-slate-900">
                                                    {i + 1}. {a.title || 'Untitled activity'} {statusEmoji}
                                                </h4>
                                                <p className="text-xs text-slate-500">
                                                    {a.primary_category}{a.sub_category ? ` → ${a.sub_category}` : ''}
                                                    {a.site_note ? ` · 📍 ${a.site_note}` : ''}
                                                    {a.sessions_count ? ` · ${a.sessions_count} sessions` : ''}
                                                </p>
                                                {a.description ? (
                                                    <p className="text-sm leading-relaxed text-slate-700">{a.description}</p>
                                                ) : null}
                                                {(a.outputs || []).filter((o: any) => o.title || o.quantity).map((o: any, oi: number) => (
                                                    <p key={oi} className="text-xs font-medium text-indigo-700">
                                                        📦 Produced: {o.quantity} {o.unit} {o.title}{o.verification_note ? ` (${o.verification_note})` : ''}
                                                    </p>
                                                ))}
                                            </div>
                                            {a.serves_beneficiaries && (a.unique_beneficiaries || a.beneficiaries_reached) ? (
                                                <div className="shrink-0 text-right">
                                                    <p className="text-lg font-bold text-indigo-700">~{a.unique_beneficiaries || a.beneficiaries_reached}</p>
                                                    <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">People</p>
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-slate-500 sm:px-6">
                                <span className="inline-flex items-center gap-1.5">
                                    <Lock className="h-3.5 w-3.5" /> Locked into your report
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <Pencil className="h-3.5 w-3.5" /> Edit any activity above to update
                                </span>
                                <button
                                    type="button"
                                    onClick={handleUnfinalizeSection4}
                                    className="ml-auto shrink-0 text-xs font-semibold text-[var(--teal)] hover:underline"
                                >
                                    Edit shortlist
                                </button>
                            </div>
                        </div>

                        <p className="flex items-center justify-center gap-1.5 text-center text-sm font-semibold text-emerald-600">
                            <CheckCircle2 className="h-4 w-4" />
                            Section 4 saved — your effort summary above travels with your report.
                        </p>
                    </>
                )}
            </section>
        </div>
    );
}

function ActivityLadderCard({
    activity,
    index,
    projectSdgs,
    outcomes,
    updateActivity,
    removeActivity,
    setOutcomes,
    getFieldError,
}: any) {
    const open = readLadderOpen(activity);
    const allBen = readLadderAllBen(activity);
    const descWords = ladderWordCount(activity.description);
    const overlapWords = ladderWordCount(activity.overlap_note);
    const ok1 = step1Ok(activity);
    const ok2 = step2Ok(activity);
    const ok3 = step3Ok(activity);
    const ok4 = step4Ok(outcomes);
    const done4 = ok4 && outcomes.length > 0;
    const stepOk = [ok1, ok2, ok3, done4];

    const setUi = (patch: Record<string, unknown>) => {
        updateActivity(index, { ladder_ui: { ...(activity.ladder_ui || {}), ...patch } });
    };
    const setOpen = (n: number) => setUi({ open: n });

    const update = (fieldOrUpdates: string | Record<string, any>, val?: any) => {
        if (typeof fieldOrUpdates === 'string') {
            updateActivity(index, { [fieldOrUpdates]: val });
        } else {
            updateActivity(index, fieldOrUpdates);
        }
    };

    const linkedSdgs = matchedProjectSdgs(activity, projectSdgs);

    const setFamily = (family: string) => {
        const next = {
            primary_category: family,
            sub_category: '',
            other_category_text: '',
            other_sub_category_text: '',
        };
        update({ ...next, sdgs: matchedProjectSdgs({ ...activity, ...next }, projectSdgs) });
    };
    const setSub = (sub: string) => {
        update({ sub_category: sub, sdgs: matchedProjectSdgs({ ...activity, sub_category: sub }, projectSdgs) });
    };

    const addOutput = (type = '') => {
        update('outputs', [...(activity.outputs || []), emptyOutput(type)]);
    };
    const removeOutput = (idx: number) => update('outputs', activity.outputs.filter((_: any, i: number) => i !== idx));
    const updateOutput = (idx: number, field: string, val: any) => {
        const next = [...(activity.outputs || [])];
        next[idx] = { ...next[idx], [field]: val };
        if (field === 'type') {
            next[idx].title = /other/i.test(val) ? (next[idx].type_other || next[idx].title) : val;
            if (val && !next[idx].unit) next[idx].unit = unitForOutputType(val);
        }
        update('outputs', next);
    };

    const toggleBeneficiaryCategory = (cat: string) => {
        const current = activity.beneficiary_categories || [];
        if (current.includes(cat)) update('beneficiary_categories', current.filter((c: string) => c !== cat));
        else update('beneficiary_categories', [...current, cat]);
    };

    const setPeople = (yes: boolean) => {
        if (yes) {
            update({
                serves_beneficiaries: true,
                overlap_status: /not known/i.test(String(activity.overlap_status || '')) ? '' : activity.overlap_status,
            });
        } else {
            update({
                serves_beneficiaries: false,
                unique_beneficiaries: '',
                beneficiaries_reached: '',
                overlap_status: 'Not Known',
            });
        }
    };

    const updateOutcome = (idx: number, patch: Record<string, unknown>) => {
        const next = outcomes.map((row: LadderOutcome, i: number) => (i === idx ? { ...row, ...patch } : row));
        setOutcomes(next);
    };
    const addOutcome = () => setOutcomes([...outcomes, emptyOutcome(activity.id)]);
    const removeOutcome = (idx: number) => setOutcomes(outcomes.filter((_: LadderOutcome, i: number) => i !== idx));

    const pickMetric = (idx: number, label: string) => {
        updateOutcome(idx, metricPickPatch(label, String(activity.primary_category || '')));
    };

    const usedTypes = new Set((activity.outputs || []).map((o: any) => o.type).filter(Boolean));
    const outHints = (FAM_OUTPUT_HINTS[activity.primary_category] || OUTPUT_TYPES.slice(0, 8))
        .filter((t) => !usedTypes.has(t))
        .slice(0, 10);

    const people = activity.serves_beneficiaries !== false;
    const benQuick = FAM_BEN_HINTS[activity.primary_category] || BENEFICIARY_CATEGORIES.slice(0, 8);
    const selectedCats: string[] = activity.beneficiary_categories || [];
    const benList = allBen
        ? [...new Set([...BENEFICIARY_CATEGORIES, ...selectedCats])]
        : [...new Set([...benQuick, ...selectedCats])];

    const stepSummary = (n: number) => {
        if (n === 1) {
            return [stripFamilyEmoji(activity.primary_category), activity.sub_category, linkedSdgs.length ? `↔ SDG ${linkedSdgs.join(', ')}` : '']
                .filter(Boolean).join(' · ');
        }
        if (n === 2) {
            return (activity.outputs || []).filter(outputRowOk).map((o: any) => (
                `${o.quantity} ${isOtherLike(o.unit) ? o.unit_other : o.unit} · ${isOtherLike(o.type) ? (o.type_other || o.title) : (o.type || o.title)}`
            )).join(' · ');
        }
        if (n === 3) {
            if (!people) return 'Environment / systems only';
            return [
                activity.unique_beneficiaries ? `${activity.unique_beneficiaries} people` : '',
                activity.reach_counting_method ? `· ${activity.reach_counting_method}` : '',
                activity.geographic_reach ? `· ${activity.geographic_reach}` : '',
            ].join(' ');
        }
        if (!outcomes.length) return 'none yet';
        return outcomes.map((o: LadderOutcome) => `${outcomeDisplayName(o) || '?'} ${o.baseline || '—'}→${o.endline || '—'}`).join(' · ');
    };

    const parsed = parseActivityPeriod(activity.activity_period);
    const setPeriod = (from: string, to: string) => {
        let nextTo = to;
        if (from && nextTo && nextTo < from) nextTo = from;
        update('activity_period', formatActivityPeriod(from, nextTo));
    };

    return (
        <div className="ladBlk">
            <div className="ladBlkHead">
                <span className="an">{index + 1}</span>
                <input
                    className="at"
                    value={activity.title || ''}
                    onChange={(e) => update('title', e.target.value)}
                    placeholder="New activity"
                    aria-label="Activity name"
                />
                <button
                    type="button"
                    onClick={() => removeActivity(index)}
                    className="rounded-lg border border-[#f6cfd8] bg-[#fdf1f4] px-2 py-1 text-[8.5px] font-extrabold text-[#e11d48]"
                    aria-label="Remove activity"
                >
                    Delete
                </button>
            </div>

            <div className="ladBlkBody">
                <div className="ladStrip">
                    {LADDER_STEPS.map((step, k) => (
                        <button
                            key={step.id}
                            type="button"
                            className={clsx('st', stepOk[k] && 'ok', open === step.id && 'cur', step.id === 4 && 'opt')}
                            onClick={() => setOpen(step.id)}
                        >
                            <i>{stepOk[k] ? '✓' : step.id}</i>
                            {step.label}
                        </button>
                    ))}
                </div>

                {LADDER_STEPS.map((step, k) => {
                    const n = step.id;
                    const done = stepOk[k];
                    const isOpen = open === n;
                    return (
                        <div key={n} className={clsx('ladStep', isOpen && 'open', done && 'ok')}>
                            <button type="button" className="ladHead w-full text-left" onClick={() => setOpen(isOpen ? 0 : n)}>
                                <span className="num">{done ? '✓' : n}</span>
                                <span>
                                    {n} · {step.label}{' '}
                                    <span style={{ fontWeight: 600, color: '#5b6f78' }}>— {step.hint}</span>
                                </span>
                                <span className="sum">{stepSummary(n)}</span>
                                <span className="chev">{isOpen ? '▴' : '▾'}</span>
                            </button>
                            {isOpen ? (
                                <div className="ladBody">
                                    {n === 1 && (
                                        <>
                                            <div className="g2">
                                                <div className="space-y-1.5">
                                                    <Label className={fieldLabel}>Activity family <span className="reqstar">*</span></Label>
                                                    <div className="relative">
                                                        <select
                                                            value={activity.primary_category || ''}
                                                            onChange={(e) => setFamily(e.target.value)}
                                                            className={selectClasses}
                                                        >
                                                            <option value="">Choose the closest family…</option>
                                                            {ACTIVITY_FAMILY_OPTIONS.map((family) => (
                                                                <option key={family} value={family}>{family}</option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                    </div>
                                                    <FieldError message={getFieldError(`section4.activity_blocks.${index}.primary_category`)} />
                                                    {isOtherTaxonomyChoice(activity.primary_category) ? (
                                                        <Input
                                                            placeholder="Name your activity family…"
                                                            value={activity.other_category_text || ''}
                                                            onChange={(e) => update('other_category_text', e.target.value)}
                                                            className={inputClasses}
                                                        />
                                                    ) : null}
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className={fieldLabel}>
                                                        Sub-category {(GLOBAL_ACTIVITY_TAXONOMY[activity.primary_category] || []).length > 0 ? <span className="reqstar">*</span> : null}
                                                    </Label>
                                                    <div className="relative">
                                                        <select
                                                            value={activity.sub_category || ''}
                                                            disabled={!activity.primary_category}
                                                            onChange={(e) => setSub(e.target.value)}
                                                            className={selectClasses}
                                                        >
                                                            <option value="">Choose closest sub-category…</option>
                                                            {(GLOBAL_ACTIVITY_TAXONOMY[activity.primary_category] || []).map((sub) => (
                                                                <option key={sub} value={sub}>{sub}</option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                    </div>
                                                    <FieldError message={getFieldError(`section4.activity_blocks.${index}.sub_category`)} />
                                                    {isOtherTaxonomyChoice(activity.sub_category) ? (
                                                        <Input
                                                            placeholder="Describe your sub-category…"
                                                            value={activity.other_sub_category_text || ''}
                                                            onChange={(e) => update('other_sub_category_text', e.target.value)}
                                                            className={inputClasses}
                                                        />
                                                    ) : null}
                                                </div>
                                            </div>
                                            <p className="ladHint">Global library · 23 families · covers every discipline and all 17 SDGs. Can&apos;t find it? Choose <b>Other / Custom</b> — it is never penalised.</p>

                                            <div className="g2" style={{ marginTop: 8 }}>
                                                <div className="space-y-1.5">
                                                    <Label className={fieldLabel}>Activity title <span className="reqstar">*</span></Label>
                                                    <Input
                                                        placeholder="The real activity, not the project name — e.g. Digital-safety workshops"
                                                        value={activity.title}
                                                        onChange={(e) => update('title', e.target.value)}
                                                        className={inputClasses}
                                                    />
                                                    <FieldError message={getFieldError(`section4.activity_blocks.${index}.title`)} />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className={fieldLabel}>Status <span className="reqstar">*</span></Label>
                                                    <div className="relative">
                                                        <select
                                                            value={activity.status || 'Ongoing'}
                                                            onChange={(e) => update('status', e.target.value)}
                                                            className={selectClasses}
                                                        >
                                                            {['Completed', 'Partially Completed', 'Ongoing', 'Cancelled / Not Delivered'].map((status) => (
                                                                <option key={status} value={status}>{status}</option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="ladQ">
                                                In one or two lines — what was done, and who on the team did what? <span className="reqstar">*</span>
                                                <small>15–60 words. Example: “Sara ran four sessions, Ali built the slides, the school arranged the lab.”</small>
                                            </div>
                                            <Textarea
                                                placeholder="What happened, and who did what…"
                                                value={activity.description}
                                                onChange={(e) => update('description', e.target.value)}
                                                className={textareaClasses}
                                            />
                                            <div className={clsx('wc', descWords > 60 && 'warn')}>
                                                {descWords} WORDS · TARGET 15–60{descWords > 60 ? ' — TRIM IT' : ''}
                                            </div>
                                            <WordMeterBar count={descWords} min={15} max={60} extra="15–60 words required" />
                                            <FieldError message={getFieldError(`section4.activity_blocks.${index}.description`)} />

                                            {activity.primary_category ? (
                                                linkedSdgs.length ? (
                                                    <div className="sdgNote">
                                                        🎯 <b>Links to your Section 3 goals:</b>{' '}
                                                        {linkedSdgs.map((n) => {
                                                            const sdg = findSdgById(n);
                                                            return (
                                                                <span
                                                                    key={n}
                                                                    style={{
                                                                        display: 'inline-block',
                                                                        background: sdg?.color || '#1d4ed8',
                                                                        color: '#fff',
                                                                        borderRadius: 99,
                                                                        padding: '2px 8px',
                                                                        fontSize: 10.5,
                                                                        fontWeight: 800,
                                                                        margin: '2px 3px 0 0',
                                                                    }}
                                                                >
                                                                    {sdg?.title || `SDG ${n}`} · SDG {n}
                                                                </span>
                                                            );
                                                        })}
                                                        <span style={{ display: 'block', marginTop: 3 }}>
                                                            Nothing to pick here — SDGs were set in Section 3. This just confirms the activity fits them.
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="sdgNote warn">
                                                        ⚠️ This sub-category does not obviously connect to your Section 3 goals
                                                        {projectSdgs.length ? ` (${(projectSdgs as number[]).map((n: number) => `SDG ${n}`).join(', ')})` : ''}.
                                                        That can be fine — just make sure Section 3 explains the link, or choose a closer sub-category.
                                                    </div>
                                                )
                                            ) : null}

                                            <div className="g2" style={{ marginTop: 10 }}>
                                                <div className="space-y-1.5">
                                                    <Label className={fieldLabel}>
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <Calendar className="h-3 w-3 text-slate-400" aria-hidden />
                                                            When
                                                        </span>{' '}
                                                        <span className="optional">OPTIONAL</span>
                                                    </Label>
                                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">From</p>
                                                            <Input
                                                                type="date"
                                                                value={parsed.from}
                                                                onChange={(e) => setPeriod(e.target.value, parsed.to)}
                                                                className={dateInputClasses}
                                                                aria-label="Activity start date"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">To</p>
                                                            <Input
                                                                type="date"
                                                                value={parsed.to}
                                                                min={parsed.from || undefined}
                                                                onChange={(e) => setPeriod(parsed.from, e.target.value)}
                                                                className={dateInputClasses}
                                                                aria-label="Activity end date"
                                                            />
                                                        </div>
                                                    </div>
                                                    {parsed.legacy ? (
                                                        <p className="text-[11px] text-slate-500">
                                                            Previous note: <span className="font-medium text-slate-700">{parsed.legacy}</span>
                                                            {" — "}pick dates above to replace it.
                                                        </p>
                                                    ) : (
                                                        <p className="text-[11px] text-slate-400">Single day: set From only. Period: set From and To.</p>
                                                    )}
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className={fieldLabel}>Partner / host involved <span className="optional">OPTIONAL</span></Label>
                                                    <Input
                                                        placeholder="Organization / department / community group"
                                                        value={activity.partner_host || ''}
                                                        onChange={(e) => update('partner_host', e.target.value)}
                                                        className={inputClasses}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {n === 2 && (
                                        <>
                                            <div className="ladQ">
                                                What did this activity deliver? <span className="reqstar">*</span>
                                                <small>Tap a suggestion — or add your own. Only things you could count on the day. People you served come in step 3.</small>
                                            </div>
                                            <div className="quickPicks">
                                                {outHints.map((hint) => (
                                                    <button key={hint} type="button" className="qp" onClick={() => addOutput(hint)}>
                                                        ＋ {hint}
                                                    </button>
                                                ))}
                                                <button type="button" className="qp more" onClick={() => addOutput('')}>
                                                    ＋ Something else (full list)
                                                </button>
                                            </div>
                                            {(activity.outputs || []).length === 0 ? (
                                                <div className="rollEmpty">Nothing added yet. Tap a suggestion above — e.g. “Sessions Conducted → 4 Sessions”.</div>
                                            ) : (
                                                (activity.outputs || []).map((out: any, idx: number) => {
                                                    const custom = isOtherLike(out.type);
                                                    return (
                                                        <div key={idx} className="outRowV13">
                                                            {out.type ? (
                                                                <div className="lbl" title={out.type}>
                                                                    {custom ? `✏️ ${out.type_other || 'Custom output'}` : out.type}
                                                                </div>
                                                            ) : (
                                                                <div className="relative">
                                                                    <select
                                                                        value={out.type}
                                                                        onChange={(e) => updateOutput(idx, 'type', e.target.value)}
                                                                        className={selectClasses}
                                                                    >
                                                                        <option value="">Choose what you delivered…</option>
                                                                        {OUTPUT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                                                    </select>
                                                                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                                </div>
                                                            )}
                                                            <Input
                                                                inputMode="decimal"
                                                                placeholder="How many"
                                                                value={out.quantity}
                                                                onChange={(e) => updateOutput(idx, 'quantity', decimalFieldInput(e.target.value))}
                                                                className={clsx(inputClasses, 'px-2 text-center')}
                                                            />
                                                            <div className="relative">
                                                                <select
                                                                    value={out.unit}
                                                                    onChange={(e) => updateOutput(idx, 'unit', e.target.value)}
                                                                    className={clsx(selectClasses, 'px-2')}
                                                                >
                                                                    <option value="">Unit</option>
                                                                    {UNIVERSAL_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                                                                </select>
                                                                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                            </div>
                                                            <button type="button" className="delMini" title="Remove" onClick={() => removeOutput(idx)}>✕</button>
                                                            {custom ? (
                                                                <Input
                                                                    placeholder="Name your output — e.g. Bird-nest boxes installed"
                                                                    value={out.type_other || ''}
                                                                    onChange={(e) => {
                                                                        const next = [...activity.outputs];
                                                                        next[idx] = { ...next[idx], type_other: e.target.value, title: e.target.value };
                                                                        update('outputs', next);
                                                                    }}
                                                                    className={inputClasses}
                                                                    style={{ gridColumn: '1 / -1' }}
                                                                />
                                                            ) : null}
                                                            {isOtherLike(out.unit) ? (
                                                                <Input
                                                                    placeholder="Custom unit…"
                                                                    value={out.unit_other || ''}
                                                                    onChange={(e) => updateOutput(idx, 'unit_other', e.target.value)}
                                                                    className={inputClasses}
                                                                    style={{ gridColumn: '1 / -1' }}
                                                                />
                                                            ) : null}
                                                            {out.type && !custom ? (
                                                                <button type="button" className="showAllLink" style={{ gridColumn: '1 / -1', textAlign: 'left' }} onClick={() => updateOutput(idx, 'type', '')}>
                                                                    change type
                                                                </button>
                                                            ) : null}
                                                        </div>
                                                    );
                                                })
                                            )}
                                            <FieldError message={getFieldError(`section4.activity_blocks.${index}.outputs`)} />
                                            <p className="ladHint" style={{ marginTop: 8 }}>
                                                Units fill in automatically — change them if ours is wrong. ❌ “Children learn better” is a change, not a delivery — that goes in step 4.
                                            </p>
                                        </>
                                    )}

                                    {n === 3 && (
                                        <>
                                            <div className="ladQ">
                                                Did this activity directly serve people?
                                                <small>Choose “No” for environment-only or systems-only work (e.g. a tree plantation with no community session).</small>
                                            </div>
                                            <div className="chips">
                                                <button type="button" className={clsx('s4-chip rounded-full border px-3 py-1.5 text-[10.5px] font-bold', people ? 'on' : 'border-[#dcebee] bg-white text-[#3c5a5c]')} onClick={() => setPeople(true)}>
                                                    Yes — people took part or received something
                                                </button>
                                                <button type="button" className={clsx('s4-chip rounded-full border px-3 py-1.5 text-[10.5px] font-bold', !people ? 'on' : 'border-[#dcebee] bg-white text-[#3c5a5c]')} onClick={() => setPeople(false)}>
                                                    No — environment / systems only
                                                </button>
                                            </div>

                                            {people ? (
                                                <>
                                                    <div className="ladQ">
                                                        How many <u>different</u> people did it directly serve? <span className="reqstar">*</span>
                                                        <small>Count each person once, even if they came to every session.</small>
                                                    </div>
                                                    <Input
                                                        inputMode="numeric"
                                                        placeholder="e.g. 120"
                                                        value={activity.unique_beneficiaries || ''}
                                                        onChange={(e) => {
                                                            const v = integerFieldInput(e.target.value, 7);
                                                            update({ unique_beneficiaries: v, beneficiaries_reached: v });
                                                        }}
                                                        className={inputClasses}
                                                    />
                                                    <FieldError message={getFieldError(`section4.activity_blocks.${index}.beneficiaries_reached`)} />

                                                    <div className="ladQ">
                                                        Did the same people also take part in another activity of this project? <span className="reqstar">*</span>
                                                        <small>This stops anyone being counted twice in your project total — honesty here is scored.</small>
                                                    </div>
                                                    <div className="chips">
                                                        {OVERLAP_CHIPS.map((chip) => (
                                                            <button
                                                                key={chip.value}
                                                                type="button"
                                                                className={clsx('s4-chip rounded-full border px-3 py-1.5 text-[10.5px] font-bold', activity.overlap_status === chip.value ? 'on' : 'border-[#dcebee] bg-white text-[#3c5a5c]')}
                                                                onClick={() => update('overlap_status', chip.value)}
                                                            >
                                                                {chip.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {activity.overlap_status && !/mostly unique/i.test(activity.overlap_status) ? (
                                                        <div className="mt-1.5 space-y-1.5">
                                                            <Textarea
                                                                placeholder="Who overlaps? e.g. the same children attended literacy sessions and the weekend club."
                                                                value={activity.overlap_note || ''}
                                                                onChange={(e) => update('overlap_note', e.target.value)}
                                                                className={textareaClasses}
                                                            />
                                                            <WordMeterBar
                                                                count={overlapWords}
                                                                min={SHORT_NOTE_MIN_WORDS}
                                                                max={SHORT_NOTE_MAX_WORDS}
                                                            />
                                                            <FieldError message={getFieldError(`section4.activity_blocks.${index}.overlap_note`)} />
                                                        </div>
                                                    ) : null}

                                                    <div className="ladQ">How did you count them? <span className="reqstar">*</span></div>
                                                    <div className="relative">
                                                        <select
                                                            value={activity.reach_counting_method || ''}
                                                            onChange={(e) => update('reach_counting_method', e.target.value)}
                                                            className={selectClasses}
                                                        >
                                                            <option value="">Choose a method…</option>
                                                            {withCurrent(COUNTING_METHODS, activity.reach_counting_method).map((m) => <option key={m} value={m}>{m}</option>)}
                                                        </select>
                                                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                    </div>
                                                    {isOtherLike(activity.reach_counting_method) ? (
                                                        <Input
                                                            placeholder="Describe the counting method…"
                                                            value={activity.reach_counting_method_other || ''}
                                                            onChange={(e) => update('reach_counting_method_other', e.target.value)}
                                                            className={clsx(inputClasses, 'mt-2')}
                                                        />
                                                    ) : null}
                                                </>
                                            ) : null}

                                            <div className="ladQ">
                                                Who {people ? 'were they' : 'or what benefited'}? <span className="reqstar">*</span>
                                                <small>Tap all that apply.</small>
                                            </div>
                                            <div className="chips">
                                                {benList.map((cat) => (
                                                    <button
                                                        key={cat}
                                                        type="button"
                                                        className={clsx('s4-chip rounded-full border px-3 py-1.5 text-[10.5px] font-bold', selectedCats.includes(cat) ? 'on' : 'border-[#dcebee] bg-white text-[#3c5a5c]')}
                                                        onClick={() => toggleBeneficiaryCategory(cat)}
                                                    >
                                                        {cat}
                                                    </button>
                                                ))}
                                            </div>
                                            <button type="button" className="showAllLink" onClick={() => setUi({ allBen: !allBen })}>
                                                {allBen ? 'Show fewer' : 'Show all groups'}
                                            </button>
                                            {selectedCats.some((item) => isOtherLike(item)) ? (
                                                <Input
                                                    placeholder="Specify who or what…"
                                                    value={activity.other_beneficiary_text || ''}
                                                    onChange={(e) => update('other_beneficiary_text', e.target.value)}
                                                    className={inputClasses}
                                                />
                                            ) : null}

                                            <div className="g2" style={{ marginTop: 10 }}>
                                                <div className="space-y-1.5">
                                                    <Label className={fieldLabel}>Where did it happen? <span className="reqstar">*</span></Label>
                                                    <div className="relative">
                                                        <select
                                                            value={activity.geographic_reach || ''}
                                                            onChange={(e) => update('geographic_reach', e.target.value)}
                                                            className={selectClasses}
                                                        >
                                                            <option value="">Choose scale…</option>
                                                            {withCurrent(GEOGRAPHIC_REACH_OPTIONS, activity.geographic_reach).map((opt) => (
                                                                <option key={opt} value={opt}>{opt}</option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className={fieldLabel}>Site / community name <span className="optional">OPTIONAL</span></Label>
                                                    <Input
                                                        placeholder="e.g. Classroom 4, SOS Village Lahore"
                                                        value={activity.site_note || ''}
                                                        onChange={(e) => update('site_note', e.target.value)}
                                                        className={inputClasses}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {n === 4 && (
                                        <>
                                            <div className="ladQ">
                                                Did a number move because of this activity? <span className="opt">OPTIONAL HERE · AT LEAST 1 IN THE PROJECT</span>
                                                <small>Before → after. If you only have one measured change for the whole project, add it under the activity that caused it.</small>
                                            </div>
                                            {outcomes.map((o: LadderOutcome, idx: number) => {
                                                const b = numValue(o.baseline);
                                                const e = numValue(o.endline);
                                                const d = (b !== null && e !== null) ? e - b : null;
                                                const pct = (d !== null && b && b > 0) ? ` (${d >= 0 ? '+' : ''}${Math.round((d / b) * 100)}%)` : '';
                                                const chosen = outcomeDisplayName(o);
                                                const hints = FAM_METRIC_HINTS[activity.primary_category] || FAM_METRIC_HINTS['📚 Education & Learning'];
                                                return (
                                                    <div key={o.id || idx} className="ocCardV13">
                                                        <div className="ocHead">
                                                            <span>Result {idx + 1}</span>
                                                            <span style={{ fontWeight: 700, color: '#5b6f78' }}>{chosen}</span>
                                                            <button type="button" className="del ml-auto text-[11px] font-extrabold text-rose-500" onClick={() => removeOutcome(idx)}>🗑</button>
                                                        </div>
                                                        <div className="ladQ" style={{ marginTop: 4 }}>Which number moved? <span className="reqstar">*</span></div>
                                                        {chosen ? (
                                                            <div className="outRowV13" style={{ gridTemplateColumns: '1fr auto' }}>
                                                                <div className="lbl">📈 {chosen}</div>
                                                                <button type="button" className="showAllLink" onClick={() => updateOutcome(idx, { metric: '', metric_other: '', outcome_area: '', outcome_sub_category: '', metric_category: '', unit: '' })}>
                                                                    change
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="quickPicks">
                                                                    {hints.map((hint) => (
                                                                        <button key={hint} type="button" className="qp" onClick={() => pickMetric(idx, hint)}>{hint}</button>
                                                                    ))}
                                                                    <button type="button" className="qp more" onClick={() => pickMetric(idx, 'My own metric')}>✏️ My own metric</button>
                                                                </div>
                                                            </>
                                                        )}
                                                        {isOtherLike(o.metric) || !chosen ? (
                                                            <Input
                                                                placeholder="Name the number — e.g. Usable storage units (out of 6)"
                                                                value={o.metric_other || ''}
                                                                onChange={(e) => updateOutcome(idx, o.outcome_area
                                                                    ? { metric_other: e.target.value, metric: o.metric || 'Other' }
                                                                    : { ...metricPickPatch('My own metric', String(activity.primary_category || '')), metric_other: e.target.value })}
                                                                className={clsx(inputClasses, 'mt-2')}
                                                            />
                                                        ) : null}
                                                        <div className="g2" style={{ marginTop: 8 }}>
                                                            <div className="space-y-1.5">
                                                                <Label className={fieldLabel}>Before <span className="reqstar">*</span></Label>
                                                                <Input
                                                                    inputMode="decimal"
                                                                    placeholder="e.g. 55"
                                                                    value={o.baseline || ''}
                                                                    onChange={(e) => updateOutcome(idx, { baseline: decimalFieldInput(e.target.value) })}
                                                                    className={inputClasses}
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label className={fieldLabel}>After <span className="reqstar">*</span></Label>
                                                                <Input
                                                                    inputMode="decimal"
                                                                    placeholder="e.g. 82"
                                                                    value={o.endline || ''}
                                                                    onChange={(e) => updateOutcome(idx, { endline: decimalFieldInput(e.target.value) })}
                                                                    className={inputClasses}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="changeBox">
                                                            {d === null ? '📈 Change computes itself' : (d < 0 ? '📉 Change' : '📈 Change')}
                                                            <span style={{ marginLeft: 'auto' }}>{d === null ? '—' : `${d >= 0 ? '+' : ''}${d}${pct}`}</span>
                                                        </div>
                                                        <div className="ladQ">
                                                            How sure are we? <span className="reqstar">*</span>
                                                            <small>Pick the honest one. One directly-measured result beats five estimates.</small>
                                                        </div>
                                                        <div className="sureList">
                                                            {SURE_OPTIONS.map((s) => (
                                                                <button
                                                                    key={s.n}
                                                                    type="button"
                                                                    className={clsx('su text-left', Number(o.sure) === s.n && 'on')}
                                                                    onClick={() => updateOutcome(idx, { sure: s.n, confidence_level: [s.cf] })}
                                                                >
                                                                    <b>{s.n}</b>{s.t}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <div className="ladQ">
                                                            Proof — where do these two numbers come from? <span className="reqstar">*</span>
                                                            <small>{SHORT_NOTE_MIN_WORDS}–{SHORT_NOTE_MAX_WORDS} words. A short note is enough — a register, a record, a partner confirmation.</small>
                                                        </div>
                                                        <Textarea
                                                            placeholder="e.g. attendance register kept for four weeks before vs after, with photos in Section 7"
                                                            value={o.measurement_explanation || ''}
                                                            onChange={(e) => updateOutcome(idx, { measurement_explanation: e.target.value })}
                                                            className={textareaClasses}
                                                        />
                                                        <WordMeterBar
                                                            count={ladderWordCount(o.measurement_explanation || '')}
                                                            min={SHORT_NOTE_MIN_WORDS}
                                                            max={SHORT_NOTE_MAX_WORDS}
                                                        />
                                                        {!outcomeLadderOk(o) ? (
                                                            <p className="ladHint" style={{ color: '#b42318' }}>Incomplete — finish the number, how sure, and proof, or delete this result.</p>
                                                        ) : null}
                                                    </div>
                                                );
                                            })}
                                            <button type="button" className="cer-aibtn" onClick={addOutcome}>
                                                ＋ Add a before → after result
                                            </button>
                                        </>
                                    )}

                                    <div className="ladNext">
                                        {n < 4 ? (
                                            <>
                                                <button type="button" disabled={! [ok1, ok2, ok3][n - 1]} onClick={() => setOpen(n + 1)}>
                                                    Looks good → step {n + 1}
                                                </button>
                                                {![ok1, ok2, ok3][n - 1] ? <span className="why">{stepNeedText(activity, n)}</span> : null}
                                            </>
                                        ) : (
                                            <>
                                                <button type="button" className="ghost" onClick={() => setOpen(0)}>
                                                    Done with this activity ✓
                                                </button>
                                                {!ok4 ? <span className="why">Finish or delete the incomplete result above.</span> : null}
                                            </>
                                        )}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
