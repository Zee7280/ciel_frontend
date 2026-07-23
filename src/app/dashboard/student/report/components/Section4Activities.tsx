import React, { useMemo } from 'react';
import { useReportForm } from '../context/ReportContext';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { FieldError } from './ui/FieldError';
import {
    Plus, Trash2, Globe, Target, Info, Layers, Users, MapPin, BarChart3,
    ChevronDown, ChevronUp, PlusCircle, Truck
} from 'lucide-react';
import clsx from 'clsx';
import {
    PRIMARY_CATEGORIES, SUB_CATEGORIES, DELIVERY_MODES,
    IMPLEMENTATION_MODELS, OUTPUT_TYPES, UNIVERSAL_UNITS,
    BENEFICIARY_CATEGORIES, RELEVANCE_TYPES, OVERLAP_STATUSES,
    GEOGRAPHIC_REACH_OPTIONS, GEOGRAPHIC_SUB_CATEGORIES,
    COUNTING_METHODS
} from '../utils/section4Constants';

const inputClasses =
    "h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100";
const selectClasses =
    "h-11 w-full min-w-0 appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm font-medium text-slate-800 shadow-sm outline-none transition-colors focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100";
const textareaClasses =
    "min-h-[100px] w-full min-w-0 resize-y rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium leading-relaxed text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100";
const fieldLabel =
    "text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500";

function wordCount(text: string): number {
    return (text || "").trim().split(/\s+/).filter(Boolean).length;
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
                            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                            active
                                ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                                : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/50",
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
            description: '',
            status: 'Ongoing',
            delivery_mode: '',
            implementation_models: [],
            sessions_count: '',
            delivery_explanation: '',
            outputs: [{ title: '', type: '', quantity: '', unit: '', verification_note: '', is_shared: false }],
            serves_beneficiaries: true,
            beneficiaries_reached: '',
            beneficiary_categories: [],
            relevance_types: [],
            overlap_status: '',
            beneficiary_description: '',
            geographic_reach: '',
            geographic_sub_category: '',
            site_note: ''
        };
        update('activity_blocks', [...(section4.activity_blocks || []), newActivity]);
    };

    const removeActivity = (id: string) => {
        update('activity_blocks', section4.activity_blocks.filter((a: any) => a.id !== id));
    };

    const updateActivity = (id: string, updates: Record<string, any>) => {
        const blocks = [...section4.activity_blocks];
        const idx = blocks.findIndex((a: any) => a.id === id);
        if (idx > -1) {
            blocks[idx] = { ...blocks[idx], ...updates };
            update('activity_blocks', blocks);
        }
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

    return (
        <div className="mx-auto max-w-4xl space-y-8 pb-10">
            {/* Header */}
            <div className="space-y-5">
                <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm">
                        <Layers className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                            <span className="text-indigo-600">SECTION 4:</span> Activities, outputs &amp; scale
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
            <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                            4.1
                        </span>
                        <h3 className="text-base font-semibold text-slate-900">Activity blocks</h3>
                    </div>
                    <Button
                        type="button"
                        onClick={addActivity}
                        className="h-10 shrink-0 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                    >
                        <PlusCircle className="mr-1.5 h-4 w-4" />
                        Add new activity
                    </Button>
                </div>

                {section4.activity_blocks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center space-y-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-10 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-100 bg-white shadow-sm">
                            <Plus className="h-6 w-6 text-slate-300" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-900">No activities added yet</p>
                            <p className="mt-1 text-xs text-slate-500">
                                Click the button above to record your first major project activity.
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
            </section>

            {/* 4.6 Project Summary */}
            <section className="space-y-4 border-t border-slate-200 pt-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                            4.6
                        </span>
                        <h3 className="text-base font-semibold text-slate-900">Project-level summary</h3>
                    </div>
                    <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                        Auto-computed from activities above · editable
                    </span>
                </div>

                <div className="space-y-5 rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 shadow-sm sm:p-6">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label className={fieldLabel}>Distinct total beneficiaries</Label>
                            <p className="text-xs text-slate-500">
                                Total unique individuals reached across all activities.
                            </p>
                            <Input
                                type="number"
                                placeholder="e.g. 250"
                                value={section4.project_summary?.distinct_total_beneficiaries || ''}
                                onChange={e => updateProjectSummary('distinct_total_beneficiaries', e.target.value)}
                                className={inputClasses}
                            />
                            <FieldError message={getFieldError('section4.project_summary.distinct_total_beneficiaries')} />
                        </div>

                        <div className="space-y-2">
                            <Label className={fieldLabel}>Beneficiary counting method</Label>
                            <div className="relative">
                                <select
                                    value={section4.project_summary?.counting_method || ''}
                                    onChange={e => updateProjectSummary('counting_method', e.target.value)}
                                    className={selectClasses}
                                >
                                    <option value="">Select method...</option>
                                    {COUNTING_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 border-t border-indigo-100/80 pt-5 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label className={fieldLabel}>Overall beneficiary overlap</Label>
                            <div className="relative">
                                <select
                                    value={section4.project_summary?.overall_overlap || ''}
                                    onChange={e => updateProjectSummary('overall_overlap', e.target.value)}
                                    className={selectClasses}
                                >
                                    <option value="">Select overlap...</option>
                                    {OVERLAP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className={fieldLabel}>Project implementation explanation</Label>
                            <p className="text-xs text-slate-500">50–100 words · how activities integrated to achieve goals.</p>
                            <Textarea
                                placeholder="Explain the project synergy…"
                                value={section4.project_summary?.project_implementation_explanation || ''}
                                onChange={e => updateProjectSummary('project_implementation_explanation', e.target.value)}
                                className={textareaClasses}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* 4.7 Scale Dashboard */}
            <section className="space-y-4 border-t border-slate-200 pt-8">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                        4.7
                    </span>
                    <h3 className="text-base font-semibold text-slate-900">Implementation scale summary</h3>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {[
                        { label: 'Scale tier', value: scaleClassification, icon: Globe },
                        { label: 'Categories touched', value: String(categoriesTouched), icon: Target },
                        { label: 'SDG mix', value: sdgMixLabel, icon: Layers },
                        { label: 'Partners involved', value: String(partnersCount), icon: Users },
                    ].map((card) => (
                        <div
                            key={card.label}
                            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                <card.icon className="h-4 w-4" />
                            </div>
                            <p className={clsx(fieldLabel, "mb-1")}>{card.label}</p>
                            <p className="text-sm font-semibold leading-snug text-slate-900">{card.value}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}

function ActivityBlockComponent({ activity, index, updateActivity, removeActivity, getFieldError }: any) {
    const [isExpanded, setIsExpanded] = React.useState(true);
    const descWords = wordCount(activity.description);

    const update = (fieldOrUpdates: string | Record<string, any>, val?: any) => {
        if (typeof fieldOrUpdates === 'string') {
            updateActivity(activity.id, { [fieldOrUpdates]: val });
        } else {
            updateActivity(activity.id, fieldOrUpdates);
        }
    };

    const toggleImplementationModel = (model: string) => {
        const current = activity.implementation_models || [];
        if (current.includes(model)) update('implementation_models', current.filter((m: string) => m !== model));
        else update('implementation_models', [...current, model]);
    };

    const addOutput = () => update('outputs', [...(activity.outputs || []), { title: '', type: '', quantity: '', unit: '', verification_note: '', is_shared: false }]);
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

    const toggleRelevanceType = (type: string) => {
        const current = activity.relevance_types || [];
        if (current.includes(type)) update('relevance_types', current.filter((t: string) => t !== type));
        else update('relevance_types', [...current, type]);
    };

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div
                className={clsx(
                    "flex cursor-pointer items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50/80 sm:px-5",
                    isExpanded && "border-b border-slate-100",
                )}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-sm font-bold text-indigo-700">
                        {index + 1}
                    </div>
                    <div className="min-w-0">
                        <h4 className="truncate text-sm font-semibold text-slate-900">
                            {activity.title || 'Unnamed activity'}
                        </h4>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                            <span className="text-[11px] text-slate-500">
                                {activity.primary_category || 'No category selected'}
                            </span>
                            {activity.status ? (
                                <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                                    {activity.status}
                                </span>
                            ) : null}
                        </div>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            removeActivity(activity.id);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-500 transition-colors hover:bg-red-500 hover:text-white"
                        aria-label="Remove activity"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div className="space-y-6 px-4 py-5 sm:px-5">
                    {/* 4.1 fields */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label className={fieldLabel}>Activity title</Label>
                            <Input
                                placeholder="e.g. Hygiene Awareness Session"
                                value={activity.title}
                                onChange={e => update('title', e.target.value)}
                                className={inputClasses}
                            />
                            <FieldError message={getFieldError(`section4.activity_blocks.${index}.title`)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className={fieldLabel}>Activity status</Label>
                            <div className="relative">
                                <select
                                    value={activity.status || ''}
                                    onChange={e => update('status', e.target.value)}
                                    className={selectClasses}
                                >
                                    <option value="">Select status...</option>
                                    {['Completed', 'Partially Completed', 'Ongoing'].map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label className={fieldLabel}>Primary activity category</Label>
                            <div className="relative">
                                <select
                                    value={activity.primary_category}
                                    onChange={e => update({ primary_category: e.target.value, sub_category: '' })}
                                    className={selectClasses}
                                >
                                    <option value="">Select category...</option>
                                    {PRIMARY_CATEGORIES.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>
                        {activity.primary_category ? (
                            <div className="space-y-1.5">
                                <Label className={fieldLabel}>Activity sub-category</Label>
                                <div className="relative">
                                    <select
                                        value={activity.sub_category}
                                        onChange={e => update('sub_category', e.target.value)}
                                        className={selectClasses}
                                    >
                                        <option value="">Select sub-category...</option>
                                        {(SUB_CATEGORIES[activity.primary_category] || []).map(sub => (
                                            <option key={sub} value={sub}>{sub}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {activity.primary_category === 'Other' ? (
                        <div className="space-y-1.5">
                            <Label className={fieldLabel}>Please specify category</Label>
                            <Input
                                placeholder="Other activity category..."
                                value={activity.other_category_text}
                                onChange={e => update('other_category_text', e.target.value)}
                                className={inputClasses}
                            />
                        </div>
                    ) : null}

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                            <Label className={fieldLabel}>Activity description</Label>
                            <span
                                className={clsx(
                                    "text-[11px] tabular-nums",
                                    descWords >= 50 && descWords <= 100
                                        ? "text-emerald-600"
                                        : descWords > 100
                                          ? "text-red-500"
                                          : "text-slate-400",
                                )}
                            >
                                {descWords} / 100 words · 50–100 required
                            </span>
                        </div>
                        <Textarea
                            placeholder="Describe what was done and the role of those involved…"
                            value={activity.description}
                            onChange={e => update('description', e.target.value)}
                            className={textareaClasses}
                        />
                        <FieldError message={getFieldError(`section4.activity_blocks.${index}.description`)} />
                    </div>

                    {/* 4.2 Delivery */}
                    <div className="space-y-4 border-t border-slate-100 pt-5">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
                                <Truck className="h-3.5 w-3.5" />
                            </div>
                            <h5 className="text-sm font-semibold text-slate-900">4.2 Delivery execution</h5>
                        </div>

                        <div className="space-y-1.5">
                            <Label className={fieldLabel}>Mode of delivery</Label>
                            <div className="relative max-w-md">
                                <select
                                    value={activity.delivery_mode || ''}
                                    onChange={e => update('delivery_mode', e.target.value)}
                                    className={selectClasses}
                                >
                                    <option value="">Select mode...</option>
                                    {DELIVERY_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className={fieldLabel}>Implementation model</Label>
                            <PillToggle
                                options={IMPLEMENTATION_MODELS}
                                selected={activity.implementation_models || []}
                                onToggle={toggleImplementationModel}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label className={fieldLabel}>Number of sessions / events / drives</Label>
                                <Input
                                    type="number"
                                    placeholder="e.g. 5"
                                    value={activity.sessions_count}
                                    onChange={e => update('sessions_count', e.target.value)}
                                    className={inputClasses}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className={fieldLabel}>Delivery explanation</Label>
                                <Textarea
                                    placeholder="Briefly explain implementation roles…"
                                    value={activity.delivery_explanation}
                                    onChange={e => update('delivery_explanation', e.target.value)}
                                    className={clsx(textareaClasses, "min-h-[88px]")}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 4.3 Outputs */}
                    <div className="space-y-4 border-t border-slate-100 pt-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
                                    <BarChart3 className="h-3.5 w-3.5" />
                                </div>
                                <h5 className="text-sm font-semibold text-slate-900">4.3 Measurable outputs</h5>
                            </div>
                            <Button
                                type="button"
                                onClick={addOutput}
                                variant="outline"
                                className="h-9 rounded-lg border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                Add output
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {activity.outputs?.map((out: any, idx: number) => (
                                <div
                                    key={idx}
                                    className="relative space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4"
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
                                                    <option value="">Select type...</option>
                                                    {OUTPUT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            </div>
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
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                        <div className="min-w-0 flex-1 space-y-1.5">
                                            <Label className={fieldLabel}>Verification note</Label>
                                            <Input
                                                placeholder="e.g. Verified by attendance registry"
                                                value={out.verification_note}
                                                onChange={e => updateOutput(idx, 'verification_note', e.target.value)}
                                                className={inputClasses}
                                            />
                                        </div>
                                        <label className="flex shrink-0 items-center gap-2 pb-2 text-xs font-medium text-slate-600">
                                            <input
                                                type="checkbox"
                                                checked={out.is_shared}
                                                onChange={e => updateOutput(idx, 'is_shared', e.target.checked)}
                                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
                                            />
                                            Shared output
                                        </label>
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
                    </div>

                    {/* 4.4 Beneficiaries */}
                    <div className="space-y-4 border-t border-slate-100 pt-5">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
                                <Users className="h-3.5 w-3.5" />
                            </div>
                            <h5 className="text-sm font-semibold text-slate-900">4.4 Beneficiary reach</h5>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <Label className="text-sm font-medium text-slate-700">
                                Did this activity directly serve beneficiaries?
                            </Label>
                            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                                {(['Yes', 'No'] as const).map((opt) => {
                                    const active =
                                        opt === 'Yes'
                                            ? activity.serves_beneficiaries === true
                                            : activity.serves_beneficiaries === false;
                                    return (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => update('serves_beneficiaries', opt === 'Yes')}
                                            className={clsx(
                                                "rounded-md px-4 py-1.5 text-xs font-semibold transition-colors",
                                                active
                                                    ? "bg-indigo-600 text-white shadow-sm"
                                                    : "text-slate-500 hover:text-slate-700",
                                            )}
                                        >
                                            {opt}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {activity.serves_beneficiaries ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label className={fieldLabel}>Number of people reached</Label>
                                        <Input
                                            type="number"
                                            value={activity.beneficiaries_reached}
                                            onChange={e => update('beneficiaries_reached', e.target.value)}
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
                                </div>

                                <div className="space-y-2">
                                    <Label className={fieldLabel}>Beneficiary categories</Label>
                                    <PillToggle
                                        options={BENEFICIARY_CATEGORIES}
                                        selected={activity.beneficiary_categories || []}
                                        onToggle={toggleBeneficiaryCategory}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className={fieldLabel}>Relevance types</Label>
                                    <PillToggle
                                        options={RELEVANCE_TYPES}
                                        selected={activity.relevance_types || []}
                                        onToggle={toggleRelevanceType}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className={fieldLabel}>Target population description</Label>
                                    <p className="text-xs text-slate-500">
                                        Briefly explain who these people are and why they were reached.
                                    </p>
                                    <Textarea
                                        placeholder="Explain here…"
                                        value={activity.beneficiary_description}
                                        onChange={e => update('beneficiary_description', e.target.value)}
                                        className={clsx(textareaClasses, "min-h-[88px]")}
                                    />
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {/* 4.5 Location */}
                    <div className="space-y-4 border-t border-slate-100 pt-5">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
                                <MapPin className="h-3.5 w-3.5" />
                            </div>
                            <h5 className="text-sm font-semibold text-slate-900">4.5 Where it happened</h5>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label className={fieldLabel}>Geographic reach</Label>
                                <div className="relative">
                                    <select
                                        value={activity.geographic_reach}
                                        onChange={e => update({ geographic_reach: e.target.value, geographic_sub_category: '' })}
                                        className={selectClasses}
                                    >
                                        <option value="">Select reach...</option>
                                        {GEOGRAPHIC_REACH_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                </div>
                                <p className="text-[11px] text-slate-400">
                                    Choose the broadest area where this activity took place.
                                </p>
                            </div>
                            {GEOGRAPHIC_SUB_CATEGORIES[activity.geographic_reach] ? (
                                <div className="space-y-1.5">
                                    <Label className={fieldLabel}>Specific setting / sub-category</Label>
                                    <div className="relative">
                                        <select
                                            value={activity.geographic_sub_category}
                                            onChange={e => update('geographic_sub_category', e.target.value)}
                                            className={selectClasses}
                                        >
                                            <option value="">Select sub-category...</option>
                                            {GEOGRAPHIC_SUB_CATEGORIES[activity.geographic_reach].map(sub => (
                                                <option key={sub} value={sub}>{sub}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        <div className="space-y-1.5">
                            <Label className={fieldLabel}>Site / community note</Label>
                            <Input
                                placeholder="e.g. Conducted at Govt. Boys High School, Model Town"
                                value={activity.site_note}
                                onChange={e => update('site_note', e.target.value)}
                                className={inputClasses}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
