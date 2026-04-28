import {
    Package, Plus, Trash2, FileText, Save, Info, AlertCircle,
    Banknote, CheckCircle2, Activity, Users, BarChart3
} from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import React, { useMemo, useEffect, useState } from "react";
import clsx from "clsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

function countWords(str: string): number {
    return (str || "").trim().split(/\s+/).filter(w => w.length > 0).length;
}

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
    sources: [] as string[], source_other: '', purpose: '', verification: [] as string[]
});

// ─── File Preview ──────────────────────────────────────────────────────────────
function FilePreview({ file }: { file: any }) {
    const isImage = file?.type?.startsWith('image/') || file?.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

    useEffect(() => {
        if (isImage) {
            if (file instanceof File || file instanceof Blob) {
                const url = URL.createObjectURL(file);
                setPreviewUrl(url);
                return () => URL.revokeObjectURL(url);
            } else if (typeof file === 'string') {
                setPreviewUrl(file);
            } else if (file?.url) {
                setPreviewUrl(file.url);
            }
        }
    }, [file, isImage]);

    if (isImage && previewUrl) {
        return (
            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                <img src={previewUrl} alt={file?.name || 'Preview'} className="w-full h-full object-cover" />
            </div>
        );
    }

    return (
        <div className="w-10 h-10 rounded-lg bg-report-primary-soft text-report-primary flex items-center justify-center shrink-0 border border-slate-100">
            <FileText className="w-5 h-5" />
        </div>
    );
}

function FullFilePreview({ file }: { file: any }) {
    const isImage = file?.type?.startsWith('image/') || file?.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

    useEffect(() => {
        if (!file) return;
        if (isImage) {
            if (file instanceof File || file instanceof Blob) {
                const url = URL.createObjectURL(file);
                setPreviewUrl(url);
                return () => URL.revokeObjectURL(url);
            } else if (typeof file === 'string') {
                setPreviewUrl(file);
            } else if (file?.url) {
                setPreviewUrl(file.url);
            }
        }
    }, [file, isImage]);

    if (!file) return null;

    if (isImage && previewUrl) {
        return (
            <img src={previewUrl} alt={file?.name || 'Preview'} className="max-w-full max-h-[70vh] object-contain rounded-lg" />
        );
    }

    return (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-4">
            <FileText className="w-16 h-16 text-slate-200" />
            <p className="text-sm font-semibold">Preview not available for this file type</p>
            <p className="text-xs text-slate-400">({file?.name})</p>
        </div>
    );
}

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
    const verifications: string[] = Array.isArray(res.verification)
        ? res.verification
        : typeof res.verification === 'string' && res.verification
            ? [res.verification]
            : [];

    const toggleSource = (s: string) => {
        onUpdate('sources', sources.includes(s) ? sources.filter(x => x !== s) : [...sources, s]);
    };

    const toggleVerification = (v: string) => {
        onUpdate('verification', verifications.includes(v) ? verifications.filter(x => x !== v) : [...verifications, v]);
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4 relative group">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-black text-[10px]">
                        {idx + 1}
                    </div>
                    <span className="report-label">Resource Entry</span>
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
                        <Label className="report-label">6.2.1 — Resource Type (Required)</Label>
                        <select
                            value={res.type}
                            onChange={e => onUpdate('type', e.target.value)}
                            className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 font-bold text-slate-700 text-xs outline-none focus:border-report-primary-border"
                        >
                            <option value="">Select Resource Type...</option>
                            {resourceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        {res.type === 'Other (Specify)' && (
                            <div className="space-y-2 mt-2">
                                <Textarea
                                    placeholder="Specify resource type (50-200 Words)..."
                                    value={res.type_other || ''}
                                    onChange={e => onUpdate('type_other', e.target.value)}
                                    className="w-full h-24 bg-slate-50 border-2 border-report-primary-border rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-report-primary resize-none"
                                />
                                <div className="flex items-center justify-between px-1">
                                    <p className={clsx(
                                        "report-label !text-[9px]",
                                        countWords(res.type_other || '') >= 50 && countWords(res.type_other || '') <= 200 ? "text-blue-600" : "text-amber-500"
                                    )}>
                                        {countWords(res.type_other || '')} / 200 words (Min 50)
                                    </p>
                                    <FieldError message={getFieldError(`resources.${idx}.type_other`)} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 6.2.2 + 6.2.3 Amount & Unit */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="report-label">6.2.2 — Amount</Label>
                            <Input
                                type="number" placeholder="0"
                                value={res.amount}
                                onChange={e => onUpdate('amount', e.target.value)}
                                className="h-12 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-slate-700"
                            />
                            <FieldError message={getFieldError(`resources.${idx}.amount`)} />
                        </div>
                        <div className="space-y-2">
                            <Label className="report-label">6.2.3 — Unit</Label>
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
                        <div className="space-y-2 mt-2">
                            <Textarea
                                placeholder="Specify unit (50-200 Words)..."
                                value={res.unit_other || ''}
                                onChange={e => onUpdate('unit_other', e.target.value)}
                                className="w-full h-24 bg-slate-50 border-2 border-report-primary-border rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-report-primary resize-none"
                            />
                            <div className="flex items-center justify-between px-1">
                                <p className={clsx(
                                    "report-label !text-[9px]",
                                    countWords(res.unit_other || '') >= 50 && countWords(res.unit_other || '') <= 200 ? "text-blue-600" : "text-amber-500"
                                )}>
                                    {countWords(res.unit_other || '')} / 200 words (Min 50)
                                </p>
                                <FieldError message={getFieldError(`resources.${idx}.unit_other`)} />
                            </div>
                        </div>
                    )}

                    {/* 6.2.6 Verification — multi-select */}
                    <div className="space-y-3">
                        <Label className="report-label">6.2.6 — Verification Status (Select All That Apply)</Label>
                        <div className="grid grid-cols-1 gap-1.5">
                            {verificationOptions.map(v => (
                                <button
                                    key={v} type="button"
                                    onClick={() => toggleVerification(v)}
                                    className={clsx(
                                        "flex items-center gap-2 px-3 py-2 rounded-xl border-2 report-label !text-[9px] text-left transition-all",
                                        verifications.includes(v)
                                            ? "border-report-primary bg-report-primary-soft text-report-primary"
                                            : "border-slate-50 bg-slate-50 text-slate-500 hover:bg-slate-100"
                                    )}
                                >
                                    <div className={clsx(
                                        "w-3 h-3 rounded-sm border-2 flex items-center justify-center flex-shrink-0",
                                        verifications.includes(v) ? "border-report-primary bg-report-primary" : "border-slate-300"
                                    )}>
                                        {verifications.includes(v) && <CheckCircle2 className="w-2 h-2 text-white" />}
                                    </div>
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
                        <Label className="report-label">6.2.4 — Source of Resource (Select All That Apply)</Label>
                        <div className="grid grid-cols-1 gap-1.5">
                            {sourceOptions.map(s => (
                                <button
                                    key={s} type="button"
                                    onClick={() => toggleSource(s)}
                                    className={clsx(
                                        "flex items-center gap-2 px-3 py-2 rounded-xl border-2 report-label !text-[9px] text-left transition-all",
                                        sources.includes(s)
                                            ? "border-report-primary bg-report-primary-soft text-report-primary"
                                            : "border-slate-50 bg-slate-50 text-slate-500 hover:bg-slate-100"
                                    )}
                                >
                                    <div className={clsx(
                                        "w-3 h-3 rounded-sm border-2 flex items-center justify-center flex-shrink-0",
                                        sources.includes(s) ? "border-report-primary bg-report-primary" : "border-slate-300"
                                    )}>
                                        {sources.includes(s) && <CheckCircle2 className="w-2 h-2 text-white" />}
                                    </div>
                                    {s}
                                </button>
                            ))}
                        </div>
                        {sources.includes('Other (Specify)') && (
                            <div className="space-y-2 mt-2">
                                <Textarea
                                    placeholder="Specify source (50-200 Words)..."
                                    value={res.source_other || ''}
                                    onChange={e => onUpdate('source_other', e.target.value)}
                                    className="w-full h-24 bg-slate-50 border-2 border-report-primary-border rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-report-primary resize-none"
                                />
                                <div className="flex items-center justify-between px-1">
                                    <p className={clsx(
                                        "report-label !text-[9px]",
                                        countWords(res.source_other || '') >= 50 && countWords(res.source_other || '') <= 200 ? "text-blue-600" : "text-amber-500"
                                    )}>
                                        {countWords(res.source_other || '')} / 200 words (Min 50)
                                    </p>
                                    <FieldError message={getFieldError(`resources.${idx}.source_other`)} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 6.2.5 Purpose — 20-40 words */}
                    <div className="space-y-3">
                        <Label className="report-label">6.2.5 — Purpose of Resource (50–200 Words)</Label>
                        <textarea spellCheck={true}
                            placeholder="Explain what exactly this resource enabled (e.g. 'Used to purchase hygiene kits for 45 participants')"
                            value={res.purpose}
                            onChange={e => onUpdate('purpose', e.target.value)}
                            rows={3}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-report-primary-border resize-none"
                        />
                        <div className="flex items-center justify-between px-1">
                            <p className={clsx(
                                "report-label !text-[9px]",
                                purposeWords >= 50 && purposeWords <= 200 ? "text-blue-600" : purposeWords > 200 ? "text-red-500" : "text-amber-500"
                            )}>
                                {purposeWords} / 200 words (Min 50)
                            </p>
                            <FieldError message={getFieldError(`resources.${idx}.purpose`)} />
                            {purposeWords >= 50 && purposeWords <= 200 && (
                                <span className="report-label !text-[9px] !text-report-primary !flex !items-center !gap-1">
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

    const [previewFile, setPreviewFile] = useState<any>(null);

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
        <div className="space-y-5 pb-10">
            {/* ─── Header ─────────────────────────────────────────────────── */}
            <div className="space-y-4">

                <div className="flex items-center gap-4">

                    <div className="w-14 h-14 rounded-2xl bg-report-primary text-white flex items-center justify-center shadow-xl shadow-report-primary-shadow ring-4 ring-report-primary-soft">
                        <Package className="w-7 h-7" />
                    </div>

                    <div className="space-y-0.5">
                        <h2 className="report-h2">
                            Section 6 — Resources & Implementation Support
                        </h2>

                        <p className="report-label">
                            How Your Project Was Enabled
                        </p>
                    </div>

                </div>

            </div>

            {/* ─── 6.0 Project Snapshot ────────────────────────────────────── */}
            <div className="space-y-6">

                <div className="flex items-center gap-3">

                    <div className="w-8 h-8 rounded-full bg-report-primary text-white flex items-center justify-center text-[11px] font-black">
                        6.0
                    </div>

                    <h3 className="report-h3">
                        Project Snapshot
                    </h3>

                    <span className="report-label !text-report-primary bg-report-primary-soft border border-report-primary-border px-3 py-1 rounded-full">
                        Auto-Generated · Read-Only
                    </span>

                </div>


                <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5 text-slate-900 relative overflow-hidden shadow-sm">

                    <div className="absolute top-0 right-0 p-6 opacity-[0.04] pointer-events-none">
                        <BarChart3 className="w-40 h-40 text-report-primary" />
                    </div>

                    <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">

                        {[
                            { label: "Primary SDG", val: section3.primary_sdg.goal_number ? `SDG ${section3.primary_sdg.goal_number}` : "—" },
                            { label: "SDG Target", val: section3.primary_sdg.target_id || "—" },
                            { label: "Beneficiaries", val: `${section4.project_summary?.distinct_total_beneficiaries || "0"} Reached` },
                            { label: "Verified Hours", val: `${section1.metrics.total_verified_hours}h` },
                            { label: "Activity Types", val: `${(section4.activity_blocks || []).filter((a: any) => a.type).length} Recorded` },
                            { label: "Outputs", val: `${(section4.activity_blocks || []).reduce((acc: number, b: any) => acc + (b.outputs?.length || 0), 0)} Recorded` },
                        ].map(({ label, val }) => (

                            <div key={label} className="bg-slate-50 rounded-lg p-3 border border-slate-100 min-w-0 space-y-1">

                                <p className="text-[9px] font-bold uppercase text-slate-500 tracking-wide">
                                    {label}
                                </p>

                                <p className="text-sm font-black text-slate-900 truncate">
                                    {val}
                                </p>

                            </div>

                        ))}

                    </div>

                </div>


                <div className="p-4 bg-report-primary-soft border border-report-primary-border rounded-xl flex items-start gap-3">

                    <AlertCircle className="w-4 h-4 text-report-primary mt-0.5 shrink-0" />

                    <p className="text-sm font-semibold text-report-primary">
                        This information is automatically pulled from previous sections and cannot be edited.
                    </p>

                </div>

            </div>

            {/* ─── Step 1: Resource Confirmation ───────────────────────────── */}
            <div className="space-y-6">

                <div className="flex items-center gap-3">

                    <div className="w-8 h-8 rounded-full bg-report-primary text-white flex items-center justify-center text-[11px] font-black">
                        6.1
                    </div>

                    <h3 className="report-h3">
                        Step 1 — Resource Confirmation
                    </h3>

                </div>


                <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-6">

                    <Label className="text-sm font-semibold text-slate-800">
                        Did This Project Use Additional Resources?
                    </Label>


                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* Option 1 */}
                        <button
                            type="button"
                            onClick={() => update('use_resources', 'no')}
                            className={clsx(
                                "p-6 rounded-lg border text-left transition space-y-2",
                                use_resources === 'no'
                                    ? "border-slate-900 bg-slate-900 text-white shadow-md"
                                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-400"
                            )}
                        >

                            <p className="text-sm font-semibold">
                                Time & Volunteer Effort Only
                            </p>

                            <p className={clsx(
                                "text-sm",
                                use_resources === 'no' ? "text-slate-300" : "text-slate-400"
                            )}>
                                No financial, material, or external resources were used.
                            </p>

                        </button>


                        {/* Option 2 */}
                        <button
                            type="button"
                            onClick={() => update('use_resources', 'yes')}
                            className={clsx(
                                "p-6 rounded-lg border text-left transition space-y-2",
                                use_resources === 'yes'
                                    ? "border-report-primary bg-report-primary text-white shadow-md"
                                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-report-primary"
                            )}
                        >

                            <p className="text-sm font-semibold">
                                Yes — Financial, Material, or Other Resources Were Used
                            </p>

                            <p className={clsx(
                                "text-sm",
                                use_resources === 'yes' ? "text-report-primary-soft" : "text-slate-400"
                            )}>
                                Continue to Step 2 to record each resource.
                            </p>

                        </button>

                    </div>



                    {/* Time-only confirmation */}
                    {use_resources === 'no' && (

                        <div className="p-5 bg-slate-50 rounded-lg border border-slate-200 space-y-3 animate-in fade-in duration-300">

                            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                System Records
                            </p>

                            <div className="grid grid-cols-3 gap-6">

                                {[
                                    { label: "Resource Model", val: "Volunteer-Based" },
                                    { label: "Verified Hours", val: `${section1.metrics.total_verified_hours}h` },
                                    { label: "Financial Mobilization", val: "0" }
                                ].map(({ label, val }) => (

                                    <div key={label} className="space-y-1">

                                        <p className="text-xs text-slate-400 uppercase tracking-wide">
                                            {label}
                                        </p>

                                        <p className="text-sm font-semibold text-slate-800">
                                            {val}
                                        </p>

                                    </div>

                                ))}

                            </div>

                        </div>

                    )}

                </div>

            </div>

            {/* ─── Step 2: Resource Entries ─────────────────────────────────── */}
            {use_resources === 'yes' && (

                <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">

                    {/* Header */}

                    <div className="flex items-center justify-between">

                        <div className="flex items-center gap-3">

                            <div className="w-8 h-8 rounded-full bg-report-primary text-white flex items-center justify-center text-[11px] font-semibold">
                                6.2
                            </div>

                            <h3 className="text-base font-semibold text-slate-900">
                                Step 2 — Resource Contribution Details
                            </h3>

                        </div>

                        <Button
                            type="button"
                            variant="ghost"
                            onClick={addResource}
                            className="h-9 px-4 rounded-lg bg-report-primary-soft text-report-primary text-xs font-semibold hover:bg-report-primary-border"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Resource Entry
                        </Button>

                    </div>



                    {/* Empty State */}

                    {resources.length === 0 ? (

                        <div className="py-16 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-4">

                            <Package className="w-10 h-10 text-slate-300 mx-auto" />

                            <p className="text-sm font-semibold text-slate-600">
                                No resources added yet
                            </p>

                            <Button
                                type="button"
                                onClick={addResource}
                                variant="ghost"
                                className="h-9 px-5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add First Resource
                            </Button>

                        </div>

                    ) : (

                        <div className="space-y-6">

                            {resources.map((res, idx) => (

                                <ResourceCard
                                    key={idx}
                                    res={res}
                                    idx={idx}
                                    canRemove={resources.length > 1}
                                    onUpdate={(field, val) => updateResource(idx, field, val)}
                                    onRemove={() => removeResource(idx)}
                                    getFieldError={getFieldError}
                                />

                            ))}

                        </div>

                    )}



                    {/* ─── Step 3: Evidence Upload ─────────────────── */}

                    <div className="space-y-6">

                        <div className="flex items-center gap-3">

                            <div className="w-8 h-8 rounded-full bg-report-primary text-white flex items-center justify-center text-[11px] font-semibold">
                                6.3
                            </div>

                            <h3 className="text-base font-semibold text-slate-900">
                                Step 3 — Optional Evidence Upload
                            </h3>

                        </div>



                        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-6">

                            {/* Info box */}

                            <div className="flex items-start gap-3 p-4 bg-report-primary-soft rounded-lg border border-report-primary-border">

                                <Info className="w-4 h-4 text-report-primary mt-0.5" />

                                <p className="text-sm text-report-primary">
                                    Upload supporting documentation. Max 5 files per resource entry. Max 10MB per file.
                                </p>

                            </div>



                            {/* Accepted docs */}

                            <div className="space-y-3">

                                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                    Accepted Document Types
                                </Label>

                                <div className="flex flex-wrap gap-2">

                                    {evidenceDocTypes.map(doc => (

                                        <span
                                            key={doc}
                                            className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center gap-1"
                                        >
                                            <FileText className="w-3 h-3" />
                                            {doc}
                                        </span>

                                    ))}

                                </div>

                            </div>



                            {/* Upload box */}

                            <div className="relative border border-dashed border-slate-300 rounded-lg p-8 text-center space-y-3 hover:border-report-primary transition">

                                <FileText className="w-8 h-8 text-slate-300 mx-auto" />

                                <p className="text-sm text-slate-500">
                                    Drag & drop or click to upload
                                </p>

                                <input
                                    type="file"
                                    multiple
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={e => {
                                        if (e.target.files) {
                                            const newFiles = Array.from(e.target.files);
                                            updateSection('section6', {
                                                evidence_files: [...(section6.evidence_files || []), ...newFiles]
                                            });
                                        }
                                    }}
                                />

                            </div>



                            {/* Selected files */}

                            {section6.evidence_files && section6.evidence_files.length > 0 && (

                                <div className="space-y-4">

                                    <Label className="text-xs font-semibold text-slate-600 uppercase">
                                        Selected Files ({section6.evidence_files.length})
                                    </Label>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                                        {section6.evidence_files.map((file, fIdx) => (

                                            <div
                                                key={fIdx}
                                                className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg"
                                            >

                                                <div
                                                    className="flex items-center gap-3 overflow-hidden cursor-pointer flex-1"
                                                    onClick={() => setPreviewFile(file)}
                                                >

                                                    <FilePreview file={file} />

                                                    <div className="overflow-hidden">

                                                        <p className="text-sm font-medium text-slate-700 truncate">
                                                            {file.name}
                                                        </p>

                                                        <p className="text-xs text-slate-400">
                                                            {file.size ? (file.size / (1024 * 1024)).toFixed(2) : 0} MB
                                                        </p>

                                                    </div>

                                                </div>

                                                <button
                                                    onClick={() => {
                                                        const kept = section6.evidence_files.filter((_, i) => i !== fIdx);
                                                        updateSection('section6', { evidence_files: kept });
                                                    }}
                                                    className="w-7 h-7 rounded-lg bg-white text-slate-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 border border-slate-200"
                                                >

                                                    <Trash2 className="w-3.5 h-3.5" />

                                                </button>

                                            </div>

                                        ))}

                                    </div>

                                </div>

                            )}

                        </div>

                    </div>



                    {/* ─── Auto Generated Summary ───────────────────────── */}

                    <div className="pt-10 border-t border-slate-200 space-y-6">

                        <div className="flex items-center justify-between">

                            <div className="flex items-center gap-3">

                                <div className="w-10 h-10 rounded-lg bg-report-primary text-white flex items-center justify-center">
                                    <Activity className="w-5 h-5" />
                                </div>

                                <h3 className="text-lg font-semibold text-slate-900">
                                    System-Generated Resource Summary
                                </h3>

                            </div>

                            <span className="text-xs font-semibold bg-slate-100 px-3 py-1 rounded-lg">
                                Read-Only
                            </span>

                        </div>



                        {/* Analytics cards */}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                            {[
                                { icon: Banknote, label: "Financial Entries", val: financialTypes.length, color: "bg-emerald-50 text-emerald-700" },
                                { icon: Package, label: "In-Kind Entries", val: inKindTypes.length, color: "bg-blue-50 text-blue-700" },
                                { icon: Users, label: "Unique Sources", val: uniqueSources, color: "bg-purple-50 text-purple-700" },
                                { icon: BarChart3, label: "Total Entries", val: resources.length, color: "bg-slate-100 text-slate-700" },
                            ].map(({ icon: Icon, label, val, color }) => (

                                <div key={label} className={`rounded-xl p-4 space-y-1 ${color}`}>

                                    <Icon className="w-5 h-5 opacity-70" />

                                    <p className="text-xl font-semibold">
                                        {val}
                                    </p>

                                    <p className="text-xs opacity-70">
                                        {label}
                                    </p>

                                </div>

                            ))}

                        </div>



                        {/* Narrative */}

                        <div className="bg-white border border-slate-200 rounded-xl p-8 relative">

                            <span className="absolute -top-5 -left-3 text-6xl text-slate-100">
                                "
                            </span>

                            <p className="report-ai-text text-lg">
                                {autoNarrative}
                            </p>

                        </div>

                    </div>

                </div>

            )}

            
            {/* ─── Full File Preview Dialog ─────────────────────────────────── */}
            <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
                <DialogContent className="max-w-4xl p-6 bg-white flex flex-col items-center">
                    <DialogHeader className="w-full flex flex-col justify-start items-start mb-4">
                        <DialogTitle className="text-sm font-bold truncate pr-8 text-slate-800 break-all w-full">{previewFile?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="w-full flex justify-center items-center overflow-auto max-h-[80vh] rounded-xl border border-slate-100 bg-slate-50 p-2">
                        <FullFilePreview file={previewFile} />
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
}
