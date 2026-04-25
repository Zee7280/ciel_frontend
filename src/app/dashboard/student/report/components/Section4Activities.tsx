import React, { useMemo } from 'react';
import { useReportForm } from '../context/ReportContext';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { FieldError } from './ui/FieldError';
import { MultiSelect } from './ui/MultiSelect';
import { 
    Plus, Trash2, Globe, Target, Info, CheckCircle2, 
    Layers, Users, MapPin, BarChart3, AlertCircle, Save,
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

// Unified UI Tokens (compact density for Section 4)
const inputClasses =
    "w-full min-w-0 h-10 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm font-semibold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all";
const selectClasses =
    "w-full min-w-0 h-10 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg px-3 pr-9 text-sm font-semibold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all appearance-none";
const textareaClasses =
    "w-full min-h-[88px] min-w-0 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all resize-y";

export default function Section4Activities() {
    const { data, updateSection, getFieldError, saveReport } = useReportForm();
    const section1 = data.section1 || {};
    const section4 = data.section4 || { activity_blocks: [], project_summary: {} };

    const update = (field: string, val: any) => updateSection('section4', { [field]: val });

    // --- Helpers ---
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

    // --- Stats ---
    const totalSessions = useMemo(() => {
        return (section4.activity_blocks || []).reduce((acc: number, b: any) => acc + (parseInt(b.sessions_count) || 0), 0);
    }, [section4.activity_blocks]);

    const totalOutputs = useMemo(() => {
        return (section4.activity_blocks || []).reduce((acc: number, b: any) => acc + (b.outputs?.length || 0), 0);
    }, [section4.activity_blocks]);

    const scaleClassification = useMemo(() => {
        const count = section4.activity_blocks?.length || 0;
        const beneficiaries = parseInt(section4.project_summary?.distinct_total_beneficiaries) || 0;
        if (count >= 5 || beneficiaries >= 500) return 'Large-Scale / Wide-Reach';
        if (count >= 3 || beneficiaries >= 150) return 'Moderate-Scale';
        return 'Small-Scale / Targeted';
    }, [section4.activity_blocks, section4.project_summary]);

    return (
        <div className="space-y-5 pb-10">
            {/* Header */}
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-200/60">
                        <Layers className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="report-h2 report-h3 !text-base md:!text-lg font-black leading-tight">
                            Section 4 — Activities, Outputs & Scale
                        </h2>
                        <p className="report-label text-slate-500 font-medium tracking-wide mt-0.5 !text-[9px]">
                            What Was Done, What It Produced, and the Scope of Impact
                        </p>
                    </div>
                </div>

                <div className="p-4 bg-indigo-50/40 border border-indigo-100 rounded-xl shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-[0.06] group-hover:opacity-[0.1] transition-opacity pointer-events-none">
                        <Target className="w-20 h-20 text-indigo-600" />
                    </div>
                    <div className="relative z-10 space-y-2 max-w-3xl">
                        <div className="flex items-center gap-2 text-indigo-700">
                            <Info className="w-4 h-4 shrink-0" />
                            <h3 className="text-[11px] font-black uppercase tracking-wider text-indigo-900">Section Guidelines</h3>
                        </div>
                        <p className="text-xs text-slate-600 leading-snug font-medium">
                            Complete this section activity by activity. Each block represents a major effort within your project.
                            This data forms the operational foundation for reporting and SDG validation.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide pt-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <div className="w-1 h-1 rounded-full bg-indigo-500 shrink-0" />
                                <span className="truncate">Numeric & Measurable Outputs</span>
                            </div>
                            <div className="flex items-center gap-1.5 min-w-0">
                                <div className="w-1 h-1 rounded-full bg-indigo-500 shrink-0" />
                                <span className="truncate">Verified Beneficiary Reach</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4.1 Activity Blocks */}
            <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 shrink-0 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">
                            4.1
                        </div>
                        <h3 className="report-h3 !text-xs">Activity Blocks</h3>
                    </div>
                    <Button
                        type="button"
                        onClick={addActivity}
                        className="h-9 px-4 rounded-lg bg-indigo-600 text-white font-bold text-[10px] uppercase tracking-wide hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-1.5 shrink-0"
                    >
                        <PlusCircle className="w-4 h-4" /> Add New Activity
                    </Button>
                </div>

                {section4.activity_blocks.length === 0 ? (
                    <div className="p-8 border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-center space-y-3 bg-slate-50/80">
                        <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100">
                            <Plus className="w-7 h-7 text-slate-300" />
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-sm font-bold text-slate-900">No activities added yet</p>
                            <p className="text-xs text-slate-500">Click the button above to record your first major project activity.</p>
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
            </div>

            {/* 4.6 Project Summary */}
            <div className="space-y-4 pt-6 border-t border-slate-200">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                        4.6
                    </div>
                    <h3 className="report-h3 !text-xs">Project-Level Summary</h3>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5 shadow-sm space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 items-start">
                        <div className="space-y-2 min-w-0">
                            <div>
                                <Label className="report-label text-slate-900 block mb-1">Distinct Total Beneficiaries (Required)</Label>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    Total unique individuals reached across all activities.
                                </p>
                            </div>
                            <Input
                                type="number"
                                placeholder="e.g. 250"
                                value={section4.project_summary?.distinct_total_beneficiaries || ''}
                                onChange={e => updateProjectSummary('distinct_total_beneficiaries', e.target.value)}
                                className={clsx(inputClasses, "font-bold text-lg text-indigo-600")}
                            />
                            <FieldError message={getFieldError('section4.project_summary.distinct_total_beneficiaries')} />
                        </div>

                        <div className="space-y-2 min-w-0">
                            <Label className="report-label text-slate-900">Beneficiary Counting Method</Label>
                            <div className="relative">
                                <select
                                    value={section4.project_summary?.counting_method || ''}
                                    onChange={e => updateProjectSummary('counting_method', e.target.value)}
                                    className={selectClasses}
                                >
                                    <option value="">Select Method...</option>
                                    {COUNTING_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 items-start pt-4 border-t border-slate-100">
                        <div className="space-y-2 min-w-0">
                            <Label className="report-label text-slate-900">Overall Beneficiary Overlap</Label>
                            <div className="relative">
                                <select
                                    value={section4.project_summary?.overall_overlap || ''}
                                    onChange={e => updateProjectSummary('overall_overlap', e.target.value)}
                                    className={selectClasses}
                                >
                                    <option value="">Select Overlap...</option>
                                    {OVERLAP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-2 min-w-0">
                            <div>
                                <Label className="report-label text-slate-900 block mb-1">Project Implementation Explanation (50–100 words)</Label>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    Summarize how activities integrated to achieve goals.
                                </p>
                            </div>
                            <Textarea
                                placeholder="Explain the project synergy..."
                                value={section4.project_summary?.project_implementation_explanation || ''}
                                onChange={e => updateProjectSummary('project_implementation_explanation', e.target.value)}
                                className={textareaClasses}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* 4.7 Scale Dashboard */}
            <div className="space-y-4 pt-6 border-t border-slate-200">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                        4.7
                    </div>
                    <h2 className="report-h3 !text-xs font-black">Implementation Scale Summary</h2>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5 text-slate-900 relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.04] pointer-events-none">
                        <BarChart3 className="w-40 h-40 text-indigo-600" />
                    </div>

                    <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 min-w-0">
                            <p className="text-[9px] font-bold uppercase text-slate-500 tracking-wide mb-1">Total Activities</p>
                            <p className="report-h3 !text-lg font-black tabular-nums">{section4.activity_blocks?.length || 0}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 min-w-0">
                            <p className="text-[9px] font-bold uppercase text-slate-500 tracking-wide mb-1">Total Sessions</p>
                            <p className="report-h3 !text-lg font-black tabular-nums">{totalSessions}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 min-w-0">
                            <p className="text-[9px] font-bold uppercase text-slate-500 tracking-wide mb-1">Outputs Recorded</p>
                            <p className="report-h3 !text-lg font-black tabular-nums">{totalOutputs}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 min-w-0">
                            <p className="text-[9px] font-bold uppercase text-slate-500 tracking-wide mb-1">Verified Hours</p>
                            <p className="report-h3 !text-lg font-black tabular-nums">
                                {section1.metrics?.total_verified_hours || 0}
                                <span className="text-xs font-semibold text-slate-400 ml-0.5">h</span>
                            </p>
                        </div>
                    </div>

                    <div className="relative z-10 mt-4 p-3 md:p-4 bg-indigo-50 border border-indigo-100 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 shrink-0 rounded-lg bg-white shadow-sm border border-indigo-100 flex items-center justify-center">
                                <Globe className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[9px] font-bold uppercase text-indigo-500 tracking-wide mb-0.5">Scale Classification</p>
                                <p className="text-xs font-bold uppercase text-indigo-800 truncate">{scaleClassification}</p>
                            </div>
                        </div>
                        <div className="text-left sm:text-right shrink-0">
                            <p className="text-[9px] font-bold uppercase text-indigo-500 tracking-wide mb-0.5">Project Status</p>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Ready for Evidence Review</p>
                        </div>
                    </div>
                </div>
            </div>

            
        </div>
    );
}

// --- Sub-Components ---

function ActivityBlockComponent({ activity, index, updateActivity, removeActivity, getFieldError }: any) {
    const [isExpanded, setIsExpanded] = React.useState(true);
    
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm relative overflow-hidden transition-shadow hover:shadow-md">
            {/* Block Header */}
            <div
                className={clsx(
                    "px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 transition-colors",
                    isExpanded ? "border-b border-slate-100" : "",
                )}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 shrink-0 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm border border-indigo-100">
                        {index + 1}
                    </div>
                    <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 truncate">{activity.title || `Unnamed Activity`}</h4>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wide">
                                {activity.primary_category || "No Category Selected"}
                            </span>
                            {activity.status && (
                                <div className="px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[8px] font-bold uppercase">
                                    {activity.status}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            removeActivity(activity.id);
                        }}
                        className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all group border border-red-100 hover:border-red-500"
                    >
                        <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    </button>
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-200">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div className="px-4 py-4 md:px-5 space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* 4.1.1 Add Activity */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 items-start">
                        <div className="space-y-2 min-w-0">
                            <Label className="report-label">Activity Title (Required)</Label>
                            <Input
                                placeholder="e.g. Hygiene Awareness Session"
                                value={activity.title}
                                onChange={e => update('title', e.target.value)}
                                className={inputClasses}
                            />
                            <FieldError message={getFieldError(`section4.activity_blocks.${index}.title`)} />
                        </div>
                        <div className="space-y-2 min-w-0">
                            <Label className="report-label">Activity Status</Label>
                            <div className="relative">
                                <select
                                    value={activity.status || ''}
                                    onChange={e => update('status', e.target.value)}
                                    className={selectClasses}
                                >
                                    <option value="">Select Status...</option>
                                    {['Completed', 'Partially Completed', 'Ongoing'].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 items-start">
                        <div className="space-y-2 min-w-0">
                            <Label className="report-label">Primary Activity Category (Select One)</Label>
                            <div className="relative">
                                <select
                                    value={activity.primary_category}
                                    onChange={e => update({ primary_category: e.target.value, sub_category: '' })}
                                    className={selectClasses}
                                >
                                    <option value="">Select Category...</option>
                                    {PRIMARY_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                        {activity.primary_category && (
                            <div className="space-y-2 min-w-0 animate-in slide-in-from-left-4 duration-300">
                                <Label className="report-label">Activity Sub-Category (Select One)</Label>
                                <div className="relative">
                                    <select
                                        value={activity.sub_category}
                                        onChange={e => update('sub_category', e.target.value)}
                                        className={selectClasses}
                                    >
                                        <option value="">Select Sub-Category...</option>
                                        {(SUB_CATEGORIES[activity.primary_category] || []).map(sub => <option key={sub} value={sub}>{sub}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        )}
                    </div>

                    {activity.primary_category === 'Other' && (
                        <div className="space-y-2">
                            <Label className="report-label">Please Specify Category</Label>
                            <Input
                                placeholder="Other activity category..."
                                value={activity.other_category_text}
                                onChange={e => update('other_category_text', e.target.value)}
                                className={inputClasses}
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <div className="flex justify-between items-center gap-2">
                            <Label className="report-label block">Activity Description (50–100 words)</Label>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide italic hidden md:block shrink-0">
                                What, Who, How, Why
                            </span>
                        </div>
                        <Textarea
                            placeholder="Describe what was done and the role of those involved..."
                            value={activity.description}
                            onChange={e => update('description', e.target.value)}
                            className={textareaClasses}
                        />
                        <FieldError message={getFieldError(`section4.activity_blocks.${index}.description`)} />
                    </div>

                    {/* 4.2 Delivery */}
                    <div className="pt-4 border-t border-slate-200 space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-md bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
                                <Truck className="w-3.5 h-3.5" />
                            </div>
                            <h5 className="text-[11px] font-black uppercase tracking-wide text-slate-900">4.2 Delivery Execution</h5>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 items-start">
                            <div className="space-y-2 min-w-0">
                                <Label className="report-label">Mode of Delivery</Label>
                                <div className="relative">
                                    <select
                                        value={activity.delivery_mode || ''}
                                        onChange={e => update('delivery_mode', e.target.value)}
                                        className={selectClasses}
                                    >
                                        <option value="">Select Mode...</option>
                                        {DELIVERY_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="space-y-2 min-w-0">
                                <Label className="report-label">Implementation Model (Select Multiple)</Label>
                                <MultiSelect
                                    compact
                                    placeholder="Select Models..."
                                    options={IMPLEMENTATION_MODELS}
                                    selected={activity.implementation_models || []}
                                    onChange={vals => update('implementation_models', vals)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 items-start">
                            <div className="space-y-2 min-w-0">
                                <Label className="report-label">Number of Sessions / Events / Drives</Label>
                                <Input
                                    type="number"
                                    placeholder="e.g. 5"
                                    value={activity.sessions_count}
                                    onChange={e => update('sessions_count', e.target.value)}
                                    className={clsx(inputClasses, "text-indigo-600")}
                                />
                            </div>
                            <div className="space-y-2 min-w-0">
                                <Label className="report-label">Delivery Explanation (Optional)</Label>
                                <Textarea
                                    placeholder="Briefly explain implementation roles..."
                                    value={activity.delivery_explanation}
                                    onChange={e => update('delivery_explanation', e.target.value)}
                                    className={clsx(textareaClasses, "min-h-[72px]")}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 4.3 Outputs */}
                    <div className="pt-4 border-t border-slate-200 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-md bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
                                    <BarChart3 className="w-3.5 h-3.5" />
                                </div>
                                <h5 className="text-[11px] font-black uppercase tracking-wide text-slate-900">4.3 Measurable Outputs</h5>
                            </div>
                            <Button
                                type="button"
                                onClick={addOutput}
                                variant="outline"
                                className="h-8 px-3 rounded-lg border border-slate-900 text-slate-900 font-bold text-[9px] uppercase transition-all hover:bg-slate-900 hover:text-white shrink-0"
                            >
                                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Output
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {activity.outputs?.map((out: any, idx: number) => (
                                <div
                                    key={idx}
                                    className="p-4 bg-slate-50/80 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors space-y-3 relative group"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-3 items-start">
                                        <div className="space-y-1.5 md:col-span-5 min-w-0">
                                            <Label className="text-[9px] font-bold uppercase text-slate-500 tracking-wide">Output Title</Label>
                                            <Input
                                                placeholder="e.g. Hygiene Kits"
                                                value={out.title}
                                                onChange={e => updateOutput(idx, 'title', e.target.value)}
                                                className={inputClasses}
                                            />
                                        </div>
                                        <div className="space-y-1.5 md:col-span-4 min-w-0">
                                            <Label className="text-[9px] font-bold uppercase text-slate-500 tracking-wide">Type</Label>
                                            <div className="relative">
                                                <select
                                                    value={out.type}
                                                    onChange={e => updateOutput(idx, 'type', e.target.value)}
                                                    className={selectClasses}
                                                >
                                                    <option value="">Select Type...</option>
                                                    {OUTPUT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 md:col-span-3 min-w-0">
                                            <div className="space-y-1.5 min-w-0">
                                                <Label className="text-[9px] font-bold uppercase text-slate-500 tracking-wide">Qty</Label>
                                                <Input
                                                    type="number"
                                                    value={out.quantity}
                                                    onChange={e => updateOutput(idx, 'quantity', e.target.value)}
                                                    className={clsx(inputClasses, "text-indigo-600 text-center px-2")}
                                                />
                                            </div>
                                            <div className="space-y-1.5 min-w-0">
                                                <Label className="text-[9px] font-bold uppercase text-slate-500 tracking-wide">Unit</Label>
                                                <div className="relative">
                                                    <select
                                                        value={out.unit}
                                                        onChange={e => updateOutput(idx, 'unit', e.target.value)}
                                                        className={clsx(selectClasses, "px-2")}
                                                    >
                                                        <option value="">...</option>
                                                        {UNIVERSAL_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                                    </select>
                                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                                        <div className="flex-1 space-y-1.5 min-w-0">
                                            <Label className="text-[9px] font-bold uppercase text-slate-500 tracking-wide">Verification Note</Label>
                                            <Input
                                                placeholder="e.g. Verified by attendance registry"
                                                value={out.verification_note}
                                                onChange={e => updateOutput(idx, 'verification_note', e.target.value)}
                                                className={inputClasses}
                                            />
                                        </div>
                                        <div className="flex flex-row sm:flex-col items-center sm:items-center gap-2 sm:pb-0.5 shrink-0">
                                            <Label className="text-[9px] font-bold uppercase text-slate-400 sm:text-center">Shared?</Label>
                                            <input
                                                type="checkbox"
                                                checked={out.is_shared}
                                                onChange={e => updateOutput(idx, 'is_shared', e.target.checked)}
                                                className="w-7 h-7 rounded-md bg-white border border-slate-200 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeOutput(idx)}
                                        className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-red-50 border border-red-100 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-500 hover:text-white shadow-lg"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 4.4 Beneficiaries */}
                    <div className="pt-4 border-t border-slate-200 space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-md bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
                                <Users className="w-3.5 h-3.5" />
                            </div>
                            <h5 className="text-[11px] font-black uppercase tracking-wide text-slate-900">4.4 Beneficiary Reach</h5>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 items-end">
                            <Label className="report-label md:pb-2.5">Did this activity directly serve beneficiaries?</Label>
                            <div className="relative w-full min-w-0">
                                <select
                                    value={activity.serves_beneficiaries === true ? 'Yes' : activity.serves_beneficiaries === false ? 'No' : ''}
                                    onChange={e => update('serves_beneficiaries', e.target.value === 'Yes')}
                                    className={selectClasses}
                                >
                                    <option value="">Select...</option>
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        {activity.serves_beneficiaries && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 items-start">
                                    <div className="space-y-2 min-w-0">
                                        <Label className="report-label">Number of People Reached</Label>
                                        <Input
                                            type="number"
                                            value={activity.beneficiaries_reached}
                                            onChange={e => update('beneficiaries_reached', e.target.value)}
                                            className={clsx(inputClasses, "text-indigo-600")}
                                        />
                                    </div>
                                    <div className="space-y-2 min-w-0">
                                        <Label className="report-label">Overlap with Other Activities</Label>
                                        <div className="relative">
                                            <select
                                                value={activity.overlap_status}
                                                onChange={e => update('overlap_status', e.target.value)}
                                                className={selectClasses}
                                            >
                                                <option value="">Select Status...</option>
                                                {OVERLAP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="report-label">Beneficiary Categories (Select All That Apply)</Label>
                                    <MultiSelect
                                        compact
                                        placeholder="Select Categories..."
                                        options={BENEFICIARY_CATEGORIES}
                                        selected={activity.beneficiary_categories || []}
                                        onChange={vals => update('beneficiary_categories', vals)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="report-label">Relevance Types</Label>
                                    <MultiSelect
                                        compact
                                        placeholder="Select Relevance..."
                                        options={RELEVANCE_TYPES}
                                        selected={activity.relevance_types || []}
                                        onChange={vals => update('relevance_types', vals)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div>
                                        <Label className="report-label block mb-0.5">Target Population Description (Optional)</Label>
                                        <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide">
                                            Briefly explain who these people are and why they were reached.
                                        </p>
                                    </div>
                                    <Textarea
                                        placeholder="Explain here..."
                                        value={activity.beneficiary_description}
                                        onChange={e => update('beneficiary_description', e.target.value)}
                                        className={clsx(textareaClasses, "min-h-[72px]")}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 4.5 Location */}
                    <div className="pt-4 border-t border-slate-200 space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-md bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
                                <MapPin className="w-3.5 h-3.5" />
                            </div>
                            <h5 className="text-[11px] font-black uppercase tracking-wide text-slate-900">4.5 Where It Happened</h5>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 items-start">
                            <div className="space-y-2 min-w-0">
                                <Label className="report-label">Geographic Reach</Label>
                                <div className="relative">
                                    <select
                                        value={activity.geographic_reach}
                                        onChange={e => update({ geographic_reach: e.target.value, geographic_sub_category: '' })}
                                        className={selectClasses}
                                    >
                                        <option value="">Select Reach...</option>
                                        {GEOGRAPHIC_REACH_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            {GEOGRAPHIC_SUB_CATEGORIES[activity.geographic_reach] && (
                                <div className="space-y-2 min-w-0 animate-in slide-in-from-right-4">
                                    <Label className="report-label">Specific Setting / Sub-Category</Label>
                                    <div className="relative">
                                        <select
                                            value={activity.geographic_sub_category}
                                            onChange={e => update('geographic_sub_category', e.target.value)}
                                            className={selectClasses}
                                        >
                                            <option value="">Select Sub-Category...</option>
                                            {GEOGRAPHIC_SUB_CATEGORIES[activity.geographic_reach].map(sub => <option key={sub} value={sub}>{sub}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="report-label">Site / Community Note (Optional)</Label>
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

