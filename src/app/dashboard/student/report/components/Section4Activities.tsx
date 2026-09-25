import React, { useMemo, useRef, useEffect } from 'react';
import { useReportForm } from '../context/ReportContext';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { FieldError } from './ui/FieldError';
import {
    Plus, Trash2, Target, Info, Layers,
    ChevronDown, PlusCircle, Lock, Pencil, CheckCircle2,
} from 'lucide-react';
import clsx from 'clsx';
import {
    OUTPUT_TYPES, UNIVERSAL_UNITS,
    BENEFICIARY_CATEGORIES, OVERLAP_STATUSES,
    GEOGRAPHIC_REACH_OPTIONS,
    COUNTING_METHODS
} from '../utils/section4Constants';
import { ACTIVITY_FAMILY_OPTIONS, GLOBAL_ACTIVITY_TAXONOMY, isOtherTaxonomyChoice } from '../utils/globalActivityTaxonomy';
import { reportTextWordMeter } from '../utils/validation';

const inputClasses =
    "h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)]";
const selectClasses =
    "h-11 w-full min-w-0 appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm font-medium text-slate-800 shadow-sm outline-none transition-colors focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)]";
const textareaClasses =
    "min-h-[100px] w-full min-w-0 resize-y rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium leading-relaxed text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)]";
const fieldLabel =
    "text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500";
const badgeMandatory =
    "shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700";
const badgeRequired =
    "shrink-0 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-600";
const badgeAuto =
    "shrink-0 rounded-full bg-[var(--aqua-soft)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--aqua)]";

function isOtherChoice(value: unknown): boolean {
    return /other/i.test(String(value ?? ""));
}

function wordCount(text: string): number {
    return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

function WordMeterBar({ count, extra }: { count: number; extra?: string }) {
    const meter = reportTextWordMeter(count, 15, 200);
    return (
        <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-100 sm:w-48">
                <div
                    className={clsx("h-full rounded-full transition-all", meter.barClass)}
                    style={{ width: `${meter.widthPct}%` }}
                />
            </div>
            <p className={clsx("text-[11px] tabular-nums", meter.textClass)}>
                {count} / 200 words{extra ? ` · ${extra}` : ""}
            </p>
        </div>
    );
}

function PillToggle({
    options,
    selected,
    onToggle,
}: {
    options: string[];
    selected: string[];
    onToggle: (value: string) => void;
}) {
    return (
        <div className="flex flex-wrap gap-2">
            {options.map((opt) => {
                const active = selected.includes(opt);
                return (
                    <button
                        key={opt}
                        type="button"
                        onClick={() => onToggle(opt)}
                        className={clsx(
                            "s4-chip rounded-full border px-3 py-1.5 text-[10.5px] font-bold transition-colors",
                            active
                                ? "on border-[#0e7d74] bg-[#0e7d74] text-white"
                                : "border-[#dcebee] bg-white text-[#3c5a5c] hover:border-[#0e7d74] hover:text-[#0e7d74]",
                        )}
                    >
                        {opt}
                    </button>
                );
            })}
        </div>
    );
}

function SingleChip({
    options,
    value,
    onChange,
}: {
    options: string[];
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="flex flex-wrap gap-2">
            {options.map((opt) => {
                const active = value === opt;
                return (
                    <button
                        key={opt}
                        type="button"
                        onClick={() => onChange(opt)}
                        className={clsx(
                            "s4-chip rounded-full border px-3 py-1.5 text-[10.5px] font-bold transition-colors",
                            active
                                ? "on border-[#0e7d74] bg-[#0e7d74] text-white"
                                : "border-[#dcebee] bg-white text-[#3c5a5c] hover:border-[#0e7d74] hover:text-[#0e7d74]",
                        )}
                    >
                        {opt}
                    </button>
                );
            })}
        </div>
    );
}

export default function Section4Activities() {
    const { data, updateSection, getFieldError } = useReportForm();
    const section3 = data.section3 || {};
    const section4 = data.section4 || { activity_blocks: [], project_summary: {} };
    const section7 = data.section7 || {};

    const update = (field: string, val: any) => updateSection('section4', { [field]: val });

    const addActivity = () => {
        const newActivity = {
            id: Math.random().toString(36).substr(2, 9),
            title: '',
            primary_category: '',
            sub_category: '',
            other_sub_category_text: '',
            activity_period: '',
            partner_host: '',
            description: '',
            status: 'Ongoing',
            delivery_mode: '',
            implementation_models: [],
            sessions_count: '',
            delivery_explanation: '',
            outputs: [{ title: '', type: '', quantity: '', unit: '', verification_note: '', is_shared: false }],
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
            site_note: ''
        };
        update('activity_blocks', [...(section4.activity_blocks || []), newActivity]);
    };

    const removeActivity = (index: number) => {
        update('activity_blocks', section4.activity_blocks.filter((_: any, i: number) => i !== index));
    };

    const updateActivity = (index: number, updates: Record<string, any>) => {
        const blocks = (section4.activity_blocks || []).map((block: any, i: number) => (
            i === index ? { ...block, ...updates } : block
        ));
        update('activity_blocks', blocks);
    };

    const updateProjectSummary = (field: string, val: any) => {
        update('project_summary', { ...section4.project_summary, [field]: val });
    };

    const categoriesTouched = useMemo(() => {
        const set = new Set(
            (section4.activity_blocks || [])
                .map((b: any) => b.primary_category)
                .filter(Boolean),
        );
        return set.size;
    }, [section4.activity_blocks]);

    const scaleClassification = useMemo(() => {
        const count = section4.activity_blocks?.length || 0;
        const beneficiaries = parseInt(section4.project_summary?.distinct_total_beneficiaries) || 0;
        if (count >= 5 || beneficiaries >= 500) return 'Large-Scale / Wide-Reach';
        if (count >= 3 || beneficiaries >= 150) return 'Moderate-Scale';
        return 'Small-Scale / Targeted';
    }, [section4.activity_blocks, section4.project_summary]);

    const sdgMixLabel = useMemo(() => {
        const goal = section3?.primary_sdg?.goal_number;
        if (goal != null && String(goal).trim()) {
            const n = String(goal).replace(/^SDG\s*/i, '');
            return `SDG ${n}`;
        }
        return '—';
    }, [section3?.primary_sdg?.goal_number]);

    const partnersCount = Array.isArray(section7?.partners) ? section7.partners.length : 0;

    // ── Finalise Section 4 — "the effort" shortlist card ────────────────────
    const activities: any[] = section4.activity_blocks || [];
    const sessionsTotal = activities.reduce((sum, a) => sum + (parseInt(a.sessions_count) || 0), 0);
    const outputsTotal = activities.reduce((sum, a) => sum + (a.outputs?.length || 0), 0);
    const distinctPeople = section4.project_summary?.distinct_total_beneficiaries || '';
    const countingMethod = section4.project_summary?.counting_method || '';
    const primaryCategoryLabel = useMemo(() => {
        const cats = Array.from(new Set(activities.map((a) => a.primary_category).filter(Boolean)));
        return cats.join(' · ');
        // `activities` is a plain `section4.activity_blocks || []` alias, not independent state.
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
        // First render after a finalized report loads — seed the baseline instead of comparing against an empty ref.
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
            {/* Header */}
            <div className="cer-dup-head space-y-5">
                <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm">
                        <Layers className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                            <span className="text-indigo-600">SECTION 4 · Part A:</span> Activities, outputs &amp; scale
                        </h2>
                    </div>
                </div>

                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-white text-indigo-600">
                            <Info className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-3">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600">
                                Section guidelines
                            </h3>
                            <p className="text-sm leading-relaxed text-slate-600">
                                Complete this section activity by activity. Each block represents a major effort
                                within your project. This data forms the operational foundation for reporting and
                                SDG validation.
                            </p>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {[
                                    'Numeric & measurable outputs',
                                    'Verified beneficiary reach',
                                ].map((item) => (
                                    <div key={item} className="flex items-center gap-2 text-sm text-slate-600">
                                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4.1 Activity Blocks */}
            <section className="space-y-4 rounded-[18px] border border-[#dcebee] bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0d2b33] text-[11px] font-bold text-white">
                        4.1
                    </span>
                    <h3 className="text-base font-semibold text-slate-900">Activity blocks</h3>
                    <span className={badgeMandatory}>Mandatory</span>
                </div>
                <p className="text-[12.5px] leading-relaxed text-[#3c5a5c]">
                    Activity integrity: every activity needs a title, status, category, responsibility statement, a countable output or beneficiary reach, counting method, geographic/site detail and an overlap/unique-reach declaration. This prevents double-counting.
                </p>

                {section4.activity_blocks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center space-y-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-10 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-100 bg-white shadow-sm">
                            <Plus className="h-6 w-6 text-slate-300" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-900">No activities added yet</p>
                            <p className="mt-1 text-xs text-slate-500">
                                Click the button below to record your first major project activity.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {section4.activity_blocks.map((activity: any, index: number) => (
                            <ActivityBlockComponent
                                key={activity.id}
                                activity={activity}
                                index={index}
                                updateActivity={updateActivity}
                                removeActivity={removeActivity}
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

            {/* 4.7 Scale Dashboard */}
            <section className="space-y-4 rounded-[18px] border border-[#dcebee] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0d2b33] text-[11px] font-bold text-white">
                        4.7
                    </span>
                    <h3 className="text-base font-semibold text-slate-900">Implementation scale summary</h3>
                    <span className={clsx(badgeAuto, "ml-auto")}>Auto-calculated</span>
                </div>

                <div className="flex flex-wrap gap-2">
                    {[
                        { emoji: '🛠️', label: 'Scale tier', value: scaleClassification },
                        { emoji: '🎯', label: 'Categories touched', value: String(categoriesTouched) },
                        { emoji: '🌍', label: 'SDG mix', value: sdgMixLabel },
                        { emoji: '🤝', label: 'Partners involved', value: String(partnersCount) },
                    ].map((card) => (
                        <div key={card.label} className="s4-scale">
                            <div className="text-base leading-none">{card.emoji}</div>
                            <b className="mt-1 block text-sm text-[#0d2b33]">{card.value}</b>
                            <div className="mt-1 text-[7px] font-extrabold uppercase tracking-[0.1em] text-[#7a919a]">{card.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Finalise Section 4 ────────────────────────────────────── */}
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
                                    const CatIcon = Target;
                                    const statusEmoji = a.status === 'Completed' ? '✅' : a.status === 'Ongoing' ? '⏳' : a.status ? '🔶' : '';
                                    return (
                                        <div key={a.id || i} className="flex gap-4 p-5 sm:px-6">
                                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                                <CatIcon className="h-5 w-5" />
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
                                            {a.serves_beneficiaries && a.beneficiaries_reached ? (
                                                <div className="shrink-0 text-right">
                                                    <p className="text-lg font-bold text-indigo-700">~{a.beneficiaries_reached}</p>
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

function ActivityBlockComponent({ activity, index, updateActivity, removeActivity, getFieldError }: any) {
    const [isExpanded, setIsExpanded] = React.useState(true);
    const descWords = wordCount(activity.description);

    const update = (fieldOrUpdates: string | Record<string, any>, val?: any) => {
        if (typeof fieldOrUpdates === 'string') {
            updateActivity(index, { [fieldOrUpdates]: val });
        } else {
            updateActivity(index, fieldOrUpdates);
        }
    };

    const addOutput = () => update('outputs', [...(activity.outputs || []), { title: '', type: '', type_other: '', quantity: '', unit: '', unit_other: '', verification_note: '', is_shared: false }]);
    const removeOutput = (idx: number) => update('outputs', activity.outputs.filter((_: any, i: number) => i !== idx));
    const updateOutput = (idx: number, field: string, val: any) => {
        const next = [...activity.outputs];
        next[idx] = { ...next[idx], [field]: val };
        update('outputs', next);
    };

    const toggleBeneficiaryCategory = (cat: string) => {
        const current = activity.beneficiary_categories || [];
        if (current.includes(cat)) update('beneficiary_categories', current.filter((c: string) => c !== cat));
        else update('beneficiary_categories', [...current, cat]);
    };

    return (
        <div className="mt-2.5 overflow-hidden rounded-[14px] border border-[#dcebee] bg-white">
            <div className="flex items-center gap-2 border-b border-[#dcebee] bg-[#f5fbfa] px-3.5 py-2">
                <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] bg-[#e6f6f4] text-[10px] font-extrabold text-[#0e7d74]">
                    {index + 1}
                </span>
                <input
                    value={activity.title || ''}
                    onChange={(e) => update('title', e.target.value)}
                    placeholder="Unnamed activity — click to name it"
                    aria-label="Activity name"
                    className="min-w-0 flex-1 border-0 bg-transparent px-1 text-[12px] font-extrabold text-[#0d2b33] outline-none placeholder:font-semibold placeholder:text-[#7a9498] focus:rounded-md focus:bg-white focus:ring-2 focus:ring-[#0e7d74]"
                />
                <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="rounded-lg border border-[#dcebee] bg-white px-2 py-1 text-[10px] font-extrabold text-[#0e7d74]"
                >
                    {isExpanded ? 'Hide' : 'Edit'}
                </button>
                <button
                    type="button"
                    onClick={() => removeActivity(index)}
                    className="rounded-lg border border-[#f6cfd8] bg-[#fdf1f4] px-2 py-1 text-[8.5px] font-extrabold text-[#e11d48]"
                    aria-label="Remove activity"
                >
                    Delete
                </button>
            </div>

            {isExpanded && (
                <div className="space-y-4 px-3.5 pb-3.5 pt-1">
                    {/* 4.1 fields */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label className={fieldLabel}>Activity title <span className="text-rose-500">*</span></Label>
                            <Input
                                placeholder="Describe the real activity, not the project title"
                                value={activity.title}
                                onChange={e => update('title', e.target.value)}
                                className={inputClasses}
                            />
                            <FieldError message={getFieldError(`section4.activity_blocks.${index}.title`)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className={fieldLabel}>Status <span className="text-rose-500">*</span></Label>
                            <div className="relative">
                                <select
                                    value={activity.status || 'Ongoing'}
                                    onChange={e => update('status', e.target.value)}
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

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label className={fieldLabel}>Activity family <span className="text-rose-500">*</span></Label>
                            <div className="relative">
                                <select
                                    value={activity.primary_category || ''}
                                    onChange={e => update({ primary_category: e.target.value, sub_category: '', other_category_text: '', other_sub_category_text: '' })}
                                    className={selectClasses}
                                >
                                    <option value="">Choose the closest family…</option>
                                    {ACTIVITY_FAMILY_OPTIONS.map((family) => (
                                        <option key={family} value={family}>{family}</option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            </div>
                            <p className="text-[11px] text-slate-500">Global library across all disciplines and all 17 SDGs.</p>
                            <FieldError message={getFieldError(`section4.activity_blocks.${index}.primary_category`)} />
                            {isOtherTaxonomyChoice(activity.primary_category) ? (
                                <Input
                                    placeholder="Name your activity family…"
                                    value={activity.other_category_text || ''}
                                    onChange={e => update('other_category_text', e.target.value)}
                                    className={clsx(inputClasses, "mt-2")}
                                />
                            ) : null}
                        </div>
                        <div className="space-y-1.5">
                            <Label className={fieldLabel}>
                                Sub-category {activity.primary_category && (GLOBAL_ACTIVITY_TAXONOMY[activity.primary_category] || []).length > 0 ? <span className="text-rose-500">*</span> : null}
                            </Label>
                            <div className="relative">
                                <select
                                    value={activity.sub_category || ''}
                                    disabled={!activity.primary_category}
                                    onChange={e => update('sub_category', e.target.value)}
                                    className={selectClasses}
                                >
                                    <option value="">Choose closest sub-category…</option>
                                    {(GLOBAL_ACTIVITY_TAXONOMY[activity.primary_category] || []).map((sub) => (
                                        <option key={sub} value={sub}>{sub}</option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            </div>
                            <p className="text-[11px] text-slate-500">Choose closest fit; use Other / Custom whenever needed.</p>
                            <FieldError message={getFieldError(`section4.activity_blocks.${index}.sub_category`)} />
                            {isOtherTaxonomyChoice(activity.sub_category) ? (
                                <Input
                                    placeholder="Describe your sub-category…"
                                    value={activity.other_sub_category_text || ''}
                                    onChange={e => update('other_sub_category_text', e.target.value)}
                                    className={clsx(inputClasses, "mt-2")}
                                />
                            ) : null}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label className={fieldLabel}>Activity date / period <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Optional if already in session log</span></Label>
                            <Input
                                placeholder="e.g. 12–18 Oct 2026"
                                value={activity.activity_period || ''}
                                onChange={e => update('activity_period', e.target.value)}
                                className={inputClasses}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className={fieldLabel}>Partner / host involved <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Optional</span></Label>
                            <Input
                                placeholder="Organization / department / community group"
                                value={activity.partner_host || ''}
                                onChange={e => update('partner_host', e.target.value)}
                                className={inputClasses}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className={fieldLabel}>What was done & who did what <span className="text-rose-500">*</span></Label>
                        <Textarea
                            placeholder="15–60 words. Mention the key action and team responsibilities."
                            value={activity.description}
                            onChange={e => update('description', e.target.value)}
                            className={textareaClasses}
                        />
                        <WordMeterBar count={descWords} extra="15–200 words required" />
                        <FieldError message={getFieldError(`section4.activity_blocks.${index}.description`)} />
                    </div>

                    <details className="s4-fold" open>
                        <summary>📦 Countable outputs — what was delivered?</summary>
                        <div className="space-y-4 px-3 pb-3">
                        <p className="rounded-[10px] bg-[#e6f6f4] px-3 py-2 text-[10px] leading-snug text-[#0f5e57]">
                            Choose from the global output library. Count delivery here; changes in knowledge, health, behaviour, environment or systems belong in Outcomes below.
                        </p>
                        <div className="space-y-3">
                            {activity.outputs?.map((out: any, idx: number) => (
                                <div
                                    key={idx}
                                    className="relative space-y-3 rounded-[11px] border border-[#dcebee] bg-white p-3"
                                >
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                                        <div className="space-y-1.5 md:col-span-5">
                                            <Label className={fieldLabel}>Output title</Label>
                                            <Input
                                                placeholder="e.g. Hygiene Kits"
                                                value={out.title}
                                                onChange={e => updateOutput(idx, 'title', e.target.value)}
                                                className={inputClasses}
                                            />
                                        </div>
                                        <div className="space-y-1.5 md:col-span-4">
                                            <Label className={fieldLabel}>Type</Label>
                                            <div className="relative">
                                                <select
                                                    value={out.type}
                                                    onChange={e => updateOutput(idx, 'type', e.target.value)}
                                                    className={selectClasses}
                                                >
                                                    <option value="">Choose output type…</option>
                                                    {OUTPUT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            </div>
                                            {isOtherChoice(out.type) ? (
                                                <Input
                                                    placeholder="Specify custom output…"
                                                    value={out.type_other || ''}
                                                    onChange={e => updateOutput(idx, 'type_other', e.target.value)}
                                                    className={inputClasses}
                                                />
                                            ) : null}
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 md:col-span-3">
                                            <div className="space-y-1.5">
                                                <Label className={fieldLabel}>Qty</Label>
                                                <Input
                                                    type="number"
                                                    value={out.quantity}
                                                    onChange={e => updateOutput(idx, 'quantity', e.target.value)}
                                                    className={clsx(inputClasses, "px-2 text-center")}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className={fieldLabel}>Unit</Label>
                                                <div className="relative">
                                                    <select
                                                        value={out.unit}
                                                        onChange={e => updateOutput(idx, 'unit', e.target.value)}
                                                        className={clsx(selectClasses, "px-2")}
                                                    >
                                                        <option value="">...</option>
                                                        {UNIVERSAL_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                                    </select>
                                                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                </div>
                                                {isOtherChoice(out.unit) ? (
                                                    <Input
                                                        placeholder="Custom unit…"
                                                        value={out.unit_other || ''}
                                                        onChange={e => updateOutput(idx, 'unit_other', e.target.value)}
                                                        className={clsx(inputClasses, "mt-2 px-2")}
                                                    />
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeOutput(idx)}
                                        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
                                        aria-label="Remove output"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <FieldError message={getFieldError(`section4.activity_blocks.${index}.outputs`)} />
                        <button
                            type="button"
                            onClick={addOutput}
                            className="cer-aibtn"
                        >
                            ＋ Add another countable output
                        </button>
                        </div>
                    </details>

                    <details className="s4-fold">
                        <summary>🫶 Direct beneficiaries / reach</summary>
                        <div className="space-y-4 px-3 pb-3">
                        <p className="rounded-[10px] border border-[#bfe6e2] bg-[#e3f4fa] px-3 py-2 text-[10px] leading-snug text-[#0f5e57]">
                            <b>Double-counting protection:</b> gross engagements may count repeat contacts; estimated unique reach should remove repeat beneficiaries where reasonably possible.
                        </p>

                        <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label className={fieldLabel}>Gross people reached</Label>
                                        <Input
                                            type="number"
                                            placeholder="e.g. 180 contacts"
                                            value={activity.beneficiaries_reached}
                                            onChange={e => update('beneficiaries_reached', e.target.value)}
                                            className={inputClasses}
                                        />
                                        <FieldError message={getFieldError(`section4.activity_blocks.${index}.beneficiaries_reached`)} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className={fieldLabel}>Estimated unique beneficiaries</Label>
                                        <Input
                                            type="number"
                                            placeholder="e.g. 120 different people"
                                            value={activity.unique_beneficiaries || ''}
                                            onChange={e => update('unique_beneficiaries', e.target.value)}
                                            className={inputClasses}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className={fieldLabel}>Overlap with other activities</Label>
                                        <div className="relative">
                                            <select
                                                value={activity.overlap_status}
                                                onChange={e => update('overlap_status', e.target.value)}
                                                className={selectClasses}
                                            >
                                                <option value="">Select status...</option>
                                                {OVERLAP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className={fieldLabel}>How was reach counted?</Label>
                                        <div className="relative">
                                            <select
                                                value={activity.reach_counting_method || ''}
                                                onChange={e => update('reach_counting_method', e.target.value)}
                                                className={selectClasses}
                                            >
                                                <option value="">Select method...</option>
                                                {COUNTING_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        </div>
                                        {isOtherChoice(activity.reach_counting_method) ? (
                                            <Input
                                                placeholder="Describe the counting method…"
                                                value={activity.reach_counting_method_other || ''}
                                                onChange={e => update('reach_counting_method_other', e.target.value)}
                                                className={clsx(inputClasses, "mt-2")}
                                            />
                                        ) : null}
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className={fieldLabel}>Overlap note</Label>
                                    <Input
                                        placeholder="e.g. the same 40 children attended three workshops"
                                        value={activity.overlap_note || ''}
                                        onChange={e => update('overlap_note', e.target.value)}
                                        className={inputClasses}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className={fieldLabel}>Who / what directly benefited? · choose all that apply</Label>
                                    <PillToggle
                                        options={BENEFICIARY_CATEGORIES}
                                        selected={activity.beneficiary_categories || []}
                                        onToggle={toggleBeneficiaryCategory}
                                    />
                                    {(activity.beneficiary_categories || []).some((item: string) => isOtherChoice(item)) ? (
                                        <Input
                                            placeholder="Specify the other beneficiary group…"
                                            value={activity.other_beneficiary_text || ''}
                                            onChange={e => update('other_beneficiary_text', e.target.value)}
                                            className={inputClasses}
                                        />
                                    ) : null}
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label className={fieldLabel}>Geographic reach</Label>
                                        <div className="relative">
                                            <select
                                                value={activity.geographic_reach}
                                                onChange={e => update('geographic_reach', e.target.value)}
                                                className={selectClasses}
                                            >
                                                <option value="">Select reach…</option>
                                                {GEOGRAPHIC_REACH_OPTIONS.map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className={fieldLabel}>Specific site / community / platform</Label>
                                        <Input
                                            placeholder="Specific site / community / platform"
                                            value={activity.site_note}
                                            onChange={e => update('site_note', e.target.value)}
                                            className={inputClasses}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </details>
                </div>
            )}
        </div>
    );
}
