import {
    Package, Plus, Trash2, FileText, Save, Info, AlertCircle,
    Banknote, CheckCircle2, Activity, Users, BarChart3
} from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import React, { useMemo, useEffect } from "react";
import clsx from "clsx";

// ─── Static data ──────────────────────────────────────────────────────────────
const resourceTypes = [
    "Financial (Cash Funding)",
    "In-kind Materials (Food / Books / Supplies / Kits)",
    "Equipment / Tools (Medical, Digital, Technical)",
    "Infrastructure Access (Venue / Lab / Clinic / Classroom)",
    "Digital Platform / Software Access",
    "Human Resources (Trainers / Experts / Volunteers)",
    "Transport Support",
    "Energy / Utility Support",
    "Communication / Media Support",
    "Policy / Legal Support",
    "Research / Data Access",
    "Community Mobilization Support",
    "Corporate / CSR Sponsorship",
    "Government Program Support",
    "International Development Support",
    "Other (Specify)"
];

const unitOptions = [
    "PKR", "USD", "Number (#)", "Hours", "Units", "Kg", "Liters",
    "Sessions", "Licenses", "Devices", "Kits", "Other (Specify)"
];

const sourceOptions = [
    "Students (Personal Contribution)",
    "Partner Organization",
    "University / Institution",
    "Government Body",
    "Private Sponsor / Donor",
    "Corporate / CSR",
    "Community Members",
    "International Organization",
    "Self-Funded",
    "Other (Specify)"
];

const verificationOptions = [
    "Evidence Uploaded",
    "Partner Confirmed",
    "University Confirmed",
    "Official Documentation",
    "Self-Reported",
    "Pending Verification"
];

const evidenceDocTypes = [
    "Receipts", "Sponsorship Letters", "Official Emails", "Photos",
    "Venue Confirmation", "Partner Letter", "Government Approval"
];

// ─── Empty resource factory ────────────────────────────────────────────────────
const emptyResource = () => ({
    type: '', type_other: '', amount: '', unit: '', unit_other: '',
    sources: [] as string[], source_other: '', purpose: '', verification: ''
});

// ─── Resource Card ─────────────────────────────────────────────────────────────
function ResourceCard({
    res, idx, onUpdate, onRemove, canRemove, getFieldError
}: {
    res: any; idx: number; canRemove: boolean;
    onUpdate: (field: string, val: any) => void;
    onRemove: () => void;
    getFieldError: (key: string) => string | undefined;
}) {
    const purposeWords = (res.purpose || '').trim().split(/\s+/).filter((w: string) => w.length > 0).length;
    const sources: string[] = res.sources || [];

    const toggleSource = (s: string) => {
        onUpdate('sources', sources.includes(s) ? sources.filter(x => x !== s) : [...sources, s]);
    };

    return (
        <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-sm space-y-8 relative group">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-black text-[10px]">
                        {idx + 1}
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resource Entry</span>
                </div>
                {canRemove && (
                    <button
                        type="button" onClick={onRemove}
                        className="w-8 h-8 rounded-full bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-all"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left column */}
                <div className="space-y-6">
                    {/* 6.2.1 Resource Type */}
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">6.2.1 — Resource Type (Required)</Label>
                        <select
                            value={res.type}
                            onChange={e => onUpdate('type', e.target.value)}
                            className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 font-bold text-slate-700 text-xs outline-none focus:border-blue-200"
                        >
                            <option value="">Select Resource Type...</option>
                            {resourceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        {res.type === 'Other (Specify)' && (
                            <input
                                type="text" placeholder="Specify resource type..."
                                value={res.type_other || ''}
                                onChange={e => onUpdate('type_other', e.target.value)}
                                className="w-full h-10 bg-slate-50 border-2 border-blue-100 rounded-xl px-4 text-xs font-bold text-slate-700 outline-none"
                            />
                        )}
                    </div>

                    {/* 6.2.2 + 6.2.3 Amount & Unit */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">6.2.2 — Amount</Label>
                            <Input
                                type="number" placeholder="0"
                                value={res.amount}
                                onChange={e => onUpdate('amount', e.target.value)}
                                className="h-12 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-slate-700"
                            />
                            <FieldError message={getFieldError(`resources.${idx}.amount`)} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">6.2.3 — Unit</Label>
                            <select
                                value={res.unit}
                                onChange={e => onUpdate('unit', e.target.value)}
                                className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-3 font-bold text-slate-700 text-xs outline-none"
                            >
                                <option value="">Unit...</option>
                                {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>
                    {res.unit === 'Other (Specify)' && (
                        <input
                            type="text" placeholder="Specify unit..."
                            value={res.unit_other || ''}
                            onChange={e => onUpdate('unit_other', e.target.value)}
                            className="w-full h-10 bg-slate-50 border-2 border-blue-100 rounded-xl px-4 text-xs font-bold text-slate-700 outline-none"
                        />
                    )}

                    {/* 6.2.6 Verification */}
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">6.2.6 — Verification Status</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {verificationOptions.map(v => (
                                <button
                                    key={v} type="button"
                                    onClick={() => onUpdate('verification', v)}
                                    className={clsx(
                                        "px-3 py-2 rounded-xl border-2 text-[9px] font-black uppercase tracking-wider text-left transition-all",
                                        res.verification === v
                                            ? "border-blue-600 bg-blue-50 text-blue-900"
                                            : "border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100"
                                    )}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right column */}
                <div className="space-y-6">
                    {/* 6.2.4 Source — multi-select */}
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">6.2.4 — Source of Resource (Select All That Apply)</Label>
                        <div className="grid grid-cols-1 gap-1.5">
                            {sourceOptions.map(s => (
                                <button
                                    key={s} type="button"
                                    onClick={() => toggleSource(s)}
                                    className={clsx(
                                        "flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-[9px] font-black uppercase tracking-wider text-left transition-all",
                                        sources.includes(s)
                                            ? "border-blue-600 bg-blue-50 text-blue-900"
                                            : "border-slate-50 bg-slate-50 text-slate-500 hover:bg-slate-100"
                                    )}
                                >
                                    <div className={clsx(
                                        "w-3 h-3 rounded-sm border-2 flex items-center justify-center flex-shrink-0",
                                        sources.includes(s) ? "border-blue-600 bg-blue-600" : "border-slate-300"
                                    )}>
                                        {sources.includes(s) && <CheckCircle2 className="w-2 h-2 text-white" />}
                                    </div>
                                    {s}
                                </button>
                            ))}
                        </div>
                        {sources.includes('Other (Specify)') && (
                            <input
                                type="text" placeholder="Specify source..."
                                value={res.source_other || ''}
                                onChange={e => onUpdate('source_other', e.target.value)}
                                className="w-full h-10 bg-slate-50 border-2 border-blue-100 rounded-xl px-4 text-xs font-bold text-slate-700 outline-none"
                            />
                        )}
                    </div>

                    {/* 6.2.5 Purpose — 20-40 words */}
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">6.2.5 — Purpose of Resource (20–40 Words)</Label>
                        <textarea
                            placeholder="Explain what exactly this resource enabled (e.g. 'Used to purchase hygiene kits for 45 participants')"
                            value={res.purpose}
                            onChange={e => onUpdate('purpose', e.target.value)}
                            rows={3}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-200 resize-none"
                        />
                        <div className="flex items-center justify-between px-1">
                            <p className={clsx(
                                "text-[9px] font-black uppercase tracking-widest",
                                purposeWords >= 20 && purposeWords <= 40 ? "text-blue-600" : purposeWords > 40 ? "text-red-500" : "text-slate-400"
                            )}>
                                {purposeWords} / 40 words
                            </p>
                            {purposeWords >= 20 && purposeWords <= 40 && (
                                <span className="text-[9px] text-blue-600 font-black flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Within range
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Section6Resources() {
    const { data, updateSection, getFieldError, saveReport } = useReportForm();
    const { section1, section3, section4, section6 } = data;
    const { use_resources, resources } = section6;

    const update = (field: string, val: any) => updateSection('section6', { [field]: val });

    const addResource = () => update('resources', [...resources, emptyResource()]);
    const removeResource = (i: number) => update('resources', resources.filter((_, idx) => idx !== i));
    const updateResource = (i: number, field: string, val: any) => {
        const next = [...resources];
        next[i] = { ...next[i], [field]: val };
        update('resources', next);
    };

    // ── Auto-generated narrative ──────────────────────────────────────────────
    const autoNarrative = useMemo(() => {
        if (use_resources === 'no' || use_resources === '') {
            return `Resource Model: Volunteer-Based Implementation. Total Verified Hours: ${section1.metrics.total_verified_hours}h. Financial Mobilization: 0.`;
        }
        if (resources.length === 0) return "Resource narrative will appear once entries are added.";
        const typesUsed = [...new Set(resources.map(r => r.type).filter(Boolean))];
        const allSources = [...new Set(resources.flatMap(r => r.sources || []).filter(Boolean))];
        return `The project mobilized ${typesUsed.length > 0 ? typesUsed.slice(0, 2).join(' and ').toLowerCase() : 'resources'} from ${allSources.length > 0 ? allSources.slice(0, 2).join(' and ').toLowerCase() : 'contributing sources'}, enabling structured delivery of activities and beneficiary engagement. A total of ${resources.length} resource ${resources.length === 1 ? 'category was' : 'categories were'} recorded to support implementation.`;
    }, [use_resources, resources, section1.metrics.total_verified_hours]);

    useEffect(() => {
        if (section6.summary_text !== autoNarrative) {
            updateSection('section6', { summary_text: autoNarrative });
        }
    }, [autoNarrative, section6.summary_text]);

    // ── Analytics ─────────────────────────────────────────────────────────────
    const financialTypes = resources.filter(r =>
        r.type?.toLowerCase().includes('financial') || r.unit === 'PKR' || r.unit === 'USD'
    );
    const inKindTypes = resources.filter(r => !financialTypes.includes(r));
    const uniqueSources = new Set(resources.flatMap(r => r.sources || [])).size;

    return (
        <div className="space-y-12 pb-16">
            {/* ─── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xl shadow-slate-100 ring-4 ring-slate-50">
                    <Package className="w-7 h-7" />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Section 6 — Resources & Implementation Support</h2>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.15em] text-[10px]">How Your Project Was Enabled</p>
                </div>
            </div>

            {/* ─── 6.0 Project Snapshot ────────────────────────────────────── */}
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">6.0</div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Project Snapshot</h3>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">Auto-Generated · Read-Only</span>
                </div>
                <div className="p-6 bg-slate-900 rounded-[2rem] text-white relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/20 rounded-full -mr-16 -mt-16 blur-3xl" />
                    <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                        {[
                            { label: "Primary SDG", val: section3.primary_sdg.goal_title || "—" },
                            { label: "SDG Target", val: section3.primary_sdg.target_code || "—" },
                            { label: "Beneficiaries", val: `${section4.total_beneficiaries || "0"} Reached` },
                            { label: "Verified Hours", val: `${section1.metrics.total_verified_hours}h` },
                            { label: "Activity Types", val: `${section4.activities.filter(a => a.type).length} Recorded` },
                            { label: "Outputs", val: `${section4.outputs.filter(o => o.type).length} Recorded` },
                        ].map(({ label, val }) => (
                            <div key={label} className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                                <p className="text-xs font-black truncate">{val}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[9px] font-bold text-amber-800">This information is automatically pulled from previous sections and cannot be edited.</p>
                </div>
            </div>

            {/* ─── Step 1: Resource Confirmation ───────────────────────────── */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">6.1</div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Step 1 — Resource Confirmation</h3>
                </div>

                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-sm space-y-4">
                    <Label className="text-sm font-black text-slate-900 uppercase tracking-tight">Did This Project Use Additional Resources?</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => update('use_resources', 'no')}
                            className={clsx(
                                "p-6 rounded-2xl border-2 text-left transition-all space-y-2",
                                use_resources === 'no'
                                    ? "border-slate-900 bg-slate-900 text-white shadow-xl"
                                    : "border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-300"
                            )}
                        >
                            <p className="text-xs font-black uppercase tracking-widest">⭕ Time & Volunteer Effort Only</p>
                            <p className={clsx("text-[9px] font-semibold", use_resources === 'no' ? "text-slate-300" : "text-slate-400")}>
                                No financial, material, or external resources were used.
                            </p>
                        </button>
                        <button
                            type="button"
                            onClick={() => update('use_resources', 'yes')}
                            className={clsx(
                                "p-6 rounded-2xl border-2 text-left transition-all space-y-2",
                                use_resources === 'yes'
                                    ? "border-blue-600 bg-blue-600 text-white shadow-xl shadow-blue-100"
                                    : "border-slate-100 bg-slate-50 text-slate-600 hover:border-blue-200"
                            )}
                        >
                            <p className="text-xs font-black uppercase tracking-widest">⭕ Yes — Financial, Material, or Other Resources Were Used</p>
                            <p className={clsx("text-[9px] font-semibold", use_resources === 'yes' ? "text-blue-100" : "text-slate-400")}>
                                Continue to Step 2 to record each resource.
                            </p>
                        </button>
                    </div>

                    {/* Time-only confirmation */}
                    {use_resources === 'no' && (
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 animate-in fade-in duration-300">
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">System Records:</p>
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { label: "Resource Model", val: "Volunteer-Based" },
                                    { label: "Verified Hours", val: `${section1.metrics.total_verified_hours}h` },
                                    { label: "Financial Mobilization", val: "0" }
                                ].map(({ label, val }) => (
                                    <div key={label} className="space-y-1">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                                        <p className="text-xs font-black text-slate-700">{val}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Step 2: Resource Entries ─────────────────────────────────── */}
            {use_resources === 'yes' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">6.2</div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Step 2 — Resource Contribution Details</h3>
                        </div>
                        <Button
                            type="button" variant="ghost" onClick={addResource}
                            className="h-8 px-3 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest hover:bg-blue-100"
                        >
                            <Plus className="w-3 h-3 mr-1.5" /> Add Resource Entry
                        </Button>
                    </div>

                    {resources.length === 0 ? (
                        <div className="py-16 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 space-y-3">
                            <Package className="w-10 h-10 text-slate-200 mx-auto" />
                            <p className="text-sm font-black text-slate-300 uppercase tracking-widest">No resources added yet</p>
                            <Button type="button" onClick={addResource} variant="ghost" className="h-9 px-5 bg-slate-900 text-white text-[10px] font-black rounded-xl">
                                <Plus className="w-3 h-3 mr-2" /> Add First Resource
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {resources.map((res, idx) => (
                                <ResourceCard
                                    key={idx} res={res} idx={idx}
                                    canRemove={resources.length > 1}
                                    onUpdate={(field, val) => updateResource(idx, field, val)}
                                    onRemove={() => removeResource(idx)}
                                    getFieldError={getFieldError}
                                />
                            ))}
                        </div>
                    )}

                    {/* ─── Step 3: Optional Evidence Upload ─────────────────── */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">6.3</div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Step 3 — Optional Evidence Upload</h3>
                        </div>
                        <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-sm space-y-6">
                            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                <p className="text-[9px] font-bold text-blue-800 uppercase leading-relaxed">
                                    Upload supporting documentation. Max 5 files per resource entry. Max 10MB per file.
                                </p>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accepted Document Types</Label>
                                <div className="flex flex-wrap gap-2">
                                    {evidenceDocTypes.map(doc => (
                                        <span key={doc} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                            <FileText className="w-3 h-3" /> {doc}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-3 hover:border-blue-200 transition-colors cursor-pointer">
                                <FileText className="w-8 h-8 text-slate-200 mx-auto" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Drag & drop or click to upload</p>
                                <input
                                    type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    className="opacity-0 absolute"
                                    onChange={e => {
                                        if (e.target.files) {
                                            updateSection('section6', { evidence_files: [...(section6.evidence_files || []), ...Array.from(e.target.files)] });
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ─── Auto-Generated Summary ───────────────────────────── */}
                    <div className="pt-8 border-t-2 border-slate-100 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">System-Generated Resource Summary</h3>
                            </div>
                            <span className="px-3 py-1.5 bg-slate-100 rounded-xl text-[9px] font-black text-slate-500 uppercase tracking-widest">Read-Only</span>
                        </div>

                        {/* Analytics cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { icon: Banknote, label: "Financial Entries", val: financialTypes.length, color: "bg-emerald-50 text-emerald-700" },
                                { icon: Package, label: "In-Kind Entries", val: inKindTypes.length, color: "bg-blue-50 text-blue-700" },
                                { icon: Users, label: "Unique Sources", val: uniqueSources, color: "bg-purple-50 text-purple-700" },
                                { icon: BarChart3, label: "Total Entries", val: resources.length, color: "bg-slate-100 text-slate-700" },
                            ].map(({ icon: Icon, label, val, color }) => (
                                <div key={label} className={clsx("rounded-2xl p-4 space-y-1", color)}>
                                    <Icon className="w-5 h-5 opacity-70" />
                                    <p className="text-2xl font-black">{val}</p>
                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-70">{label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Narrative */}
                        <div className="bg-white border-2 border-slate-200 rounded-[2.5rem] p-8 relative overflow-hidden">
                            <span className="absolute -top-6 -left-3 text-7xl font-serif text-slate-100 select-none">"</span>
                            <p className="relative z-10 text-lg font-bold text-slate-700 leading-relaxed font-serif">
                                {autoNarrative}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Save ─────────────────────────────────────────────────────── */}
            <div className="flex justify-center pt-10">
                <Button
                    type="button" variant="outline" onClick={() => saveReport(false)}
                    className="h-16 px-12 rounded-2xl border-2 border-slate-100 bg-white text-slate-500 font-extrabold uppercase tracking-widest hover:border-slate-900 hover:text-slate-900 hover:shadow-2xl transition-all flex items-center gap-4 group"
                >
                    <Save className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                    <span>Save Section 6 Progress</span>
                </Button>
            </div>
        </div>
    );
}
