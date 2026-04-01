import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import clsx from "clsx";
import React, { useMemo } from "react";
import {
    Activity, Target, Users, MapPin, CheckCircle2,
    Save, Plus, Trash2, PlusCircle, AlertCircle, Lock, 
    Truck, GraduationCap, Megaphone, Search, Building, Smartphone, Gavel, 
    Handshake, Globe, Info
} from "lucide-react";

export default function Section4Activities() {
    const { data, updateSection, getFieldError, saveReport } = useReportForm();
    const section1 = data.section1 || {};
    const section4 = data.section4 || {};

    // ─── Constants ────────────────────────────────────────────────────────────
    const primaryActivityTypes = [
        { id: "Resource Distribution", label: "Resource Distribution", icon: Truck, context: "e.g., ration kits, supplies" },
        { id: "Service Delivery", label: "Service Delivery", icon: Activity, context: "e.g., healthcare, tutoring, support services" },
        { id: "Training / Capacity Building", label: "Training / Capacity Building", icon: GraduationCap, context: "e.g., workshops, skill sessions" },
        { id: "Awareness / Advocacy", label: "Awareness / Advocacy", icon: Megaphone, context: "e.g., campaigns, sessions" },
        { id: "Research / Data Collection", label: "Research / Data Collection", icon: Search, context: "e.g., surveys, studies" },
        { id: "Infrastructure Development", label: "Infrastructure Development", icon: Building, context: "e.g., building, renovation" },
        { id: "Digital / Technology Solution", label: "Digital / Technology Solution", icon: Smartphone, context: "e.g., app, platform" },
        { id: "Policy / Governance Engagement", label: "Policy / Governance Engagement", icon: Gavel, context: "e.g., policy work" },
        { id: "Community Mobilization", label: "Community Mobilization", icon: Users, context: "e.g., outreach, volunteering" },
        { id: "Partnership Development", label: "Partnership Development", icon: Handshake, context: "e.g., collaboration building" },
        { id: "Other", label: "Other", icon: Plus, context: "Please specify below" }
    ];

    const deliveryModes = ["Field-Based (on-ground)", "Online (digital)", "Hybrid (both)"];
    const implementationModels = ["Individual", "Team-Based", "Partner-Led", "Multi-Stakeholder"];

    const outputTypes = [
        "Individuals Reached", "Households Supported", "Sessions Conducted",
        "Trainings Delivered", "Resources Distributed", "Services Delivered",
        "Systems Developed", "Facilities Improved", "Reports / Data Generated",
        "Partnerships Formed", "Other"
    ];

    const beneficiaryGroups = [
        "Children", "Youth", "Women", "Elderly", "Persons with Disabilities",
        "Low-Income Households", "Students", "Workers / Laborers",
        "Institutions / Organizations", "General Community", "Other"
    ];

    const geographicReachOptions = [
        "Single Site", "Local Community", "Multi-Community", "City-Wide",
        "District-Wide", "Province / State", "National", "International",
        "Digital", "Hybrid"
    ];

    const subCategoryMap: Record<string, string[]> = {
        "Single Site": ["School / College", "NGO / Organization", "Hospital", "Village", "Neighborhood", "Other"],
        "Local Community": ["Village", "Union Council", "Neighborhood", "Campus", "Workplace", "Partner Organization Community"],
        "Multi-Community": ["Multiple villages", "Multiple neighborhoods", "Multiple institutions"],
        "City-Wide": ["Multi-area coverage"],
        "District-Wide": ["Multi-area coverage"],
        "Province / State": ["Multi-area coverage"],
        "Digital": ["Online platform", "Remote users"]
    };

    // ─── Handlers ─────────────────────────────────────────────────────────────
    const update = (field: string, val: any) => updateSection('section4', { [field]: val });

    const toggleSecondary = (id: string) => {
        const types = section4.activity_secondary_types || [];
        if (types.includes(id)) {
            update('activity_secondary_types', types.filter(t => t !== id));
        } else {
            update('activity_secondary_types', [...types, id]);
        }
    };

    const toggleModel = (id: string) => {
        const models = section4.implementation_model || [];
        if (models.includes(id)) {
            update('implementation_model', models.filter(m => m !== id));
        } else {
            update('implementation_model', [...models, id]);
        }
    };

    const addOutput = () => update('outputs', [...(section4.outputs || []), { type: '', quantity: '', unit: '' }]);
    const removeOutput = (i: number) => update('outputs', section4.outputs.filter((_, idx) => idx !== i));
    const updateOutput = (i: number, field: string, val: string) => {
        const next = [...section4.outputs];
        next[i] = { ...next[i], [field]: val };
        update('outputs', next);
    };

    const toggleBeneficiary = (cat: string) => {
        const current = section4.beneficiary_categories || [];
        if (current.includes(cat)) {
            update('beneficiary_categories', current.filter(c => c !== cat));
        } else {
            update('beneficiary_categories', [...current, cat]);
        }
    };

    const activityDescWords = (section4.activity_description || '').trim().split(/\s+/).filter(w => w.length > 0).length;
    const deliveryDescWords = (section4.delivery_explanation || '').trim().split(/\s+/).filter(w => w.length > 0).length;

    return (
        <div className="space-y-12 pb-16">
            {/* Header */}
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-report-primary text-white flex items-center justify-center shadow-sm">
                        <Globe className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="report-h2">Section 4 — Activities, Outputs & Scale</h2>
                        <p className="report-label text-slate-500">What Was Done, Delivered, and the Magnitude of Effort</p>
                    </div>
                </div>

                {/* Purpose Note */}
                <div className="p-6 bg-report-primary-soft border border-report-primary-border rounded-3xl space-y-4">
                    <div className="flex items-center gap-3 text-report-primary">
                        <Target className="w-5 h-5" />
                        <h3 className="report-h3 !text-sm">Purpose of This Section</h3>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                        This section explains what you did in your project, how you did it, and what you produced.
                        This forms the foundation for measuring impact in Section 5.
                    </p>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-xs font-semibold text-report-primary/70">
                        <li className="flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-current" /> Describe your activities
                        </li>
                        <li className="flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-current" /> Record measurable outputs
                        </li>
                        <li className="flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-current" /> Identify who benefited
                        </li>
                        <li className="flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-current" /> Show how large and intensive your project was
                        </li>
                    </ul>
                </div>
            </div>

            {/* 4.1 Activity Type */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">4.1</div>
                    <h3 className="report-h3">Activity Type & Design</h3>
                </div>

                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-sm space-y-8">
                    <div className="space-y-4">
                        <Label className="report-label">Primary Activity Type (Required — Select One)</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {primaryActivityTypes.map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => update('activity_primary_type', opt.id)}
                                    className={clsx(
                                        "p-4 rounded-xl border-2 text-left transition-all relative group",
                                        section4.activity_primary_type === opt.id
                                            ? "border-report-primary bg-report-primary-soft text-report-primary"
                                            : "border-slate-50 bg-slate-50 text-slate-500 hover:border-slate-200"
                                    )}
                                >
                                    <div className="flex items-center gap-3 mb-1">
                                        <opt.icon className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-wider">{opt.label}</span>
                                    </div>
                                    <p className="text-[9px] font-medium opacity-80">{opt.context}</p>
                                    {section4.activity_primary_type === opt.id && (
                                        <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-report-primary text-white flex items-center justify-center">
                                            <CheckCircle2 className="w-2.5 h-2.5" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 pt-8 border-t-2 border-slate-50">
                        <Label className="report-label">Secondary Activity Type (Optional — Select Multiple)</Label>
                        <div className="flex flex-wrap gap-2">
                            {primaryActivityTypes.filter(o => o.id !== 'Other' && o.id !== section4.activity_primary_type).map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => toggleSecondary(opt.id)}
                                    className={clsx(
                                        "px-4 py-2 rounded-lg border-2 text-[10px] font-bold transition-all",
                                        (section4.activity_secondary_types || []).includes(opt.id)
                                            ? "border-slate-900 bg-slate-900 text-white"
                                            : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3 pt-8 border-t-2 border-slate-50">
                        <div className="flex justify-between items-center">
                            <Label className="report-label">Activity Description (Required — 50–100 words)</Label>
                            <span className={clsx("text-[10px] font-bold", activityDescWords >= 50 && activityDescWords <= 100 ? "text-report-primary" : "text-amber-500")}>
                                {activityDescWords} / 100 Words
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium italic mb-2">Briefly explain: What was done? Who was involved? How it was carried out?</p>
                        <Textarea
                            placeholder="Describe your activity in detail..."
                            value={section4.activity_description}
                            onChange={e => update('activity_description', e.target.value)}
                            className="min-h-[120px] rounded-2xl border-2 border-slate-50 bg-slate-50 p-6 text-xs font-bold text-slate-700 focus:bg-white focus:border-report-primary-border outline-none transition-all resize-none"
                        />
                        <FieldError message={getFieldError('section4.activity_description')} />
                    </div>
                </div>
            </div>

            {/* 4.2 Delivery Mechanism */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">4.2</div>
                    <h3 className="report-h3">Delivery Mechanism</h3>
                </div>

                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-sm space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                            <Label className="report-label">Mode of Delivery (Select One)</Label>
                            <div className="grid grid-cols-1 gap-2">
                                {deliveryModes.map(mode => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => update('delivery_mode', mode)}
                                        className={clsx(
                                            "px-4 py-3 rounded-xl border-2 text-left text-[10px] font-black uppercase tracking-wider transition-all",
                                            section4.delivery_mode === mode
                                                ? "border-report-primary bg-report-primary-soft text-report-primary"
                                                : "border-slate-50 bg-slate-50 text-slate-500 hover:bg-slate-100"
                                        )}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="report-label">Implementation Model (Select One or More)</Label>
                            <div className="grid grid-cols-1 gap-2">
                                {implementationModels.map(model => (
                                    <button
                                        key={model}
                                        type="button"
                                        onClick={() => toggleModel(model)}
                                        className={clsx(
                                            "px-4 py-3 rounded-xl border-2 text-left text-[10px] font-black uppercase tracking-wider transition-all",
                                            (section4.implementation_model || []).includes(model)
                                                ? "border-slate-900 bg-slate-100 text-slate-900"
                                                : "border-slate-50 bg-slate-50 text-slate-500 hover:bg-slate-100"
                                        )}
                                    >
                                        {model}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 pt-8 border-t-2 border-slate-50">
                        <div className="flex justify-between items-center">
                            <Label className="report-label">Delivery Explanation (Optional — 50–100 words)</Label>
                            <span className="text-[10px] font-bold text-slate-400">{deliveryDescWords} / 100 Words</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium italic mb-2">Explain how the project was executed (e.g., with NGO support, volunteers, etc.)</p>
                        <Textarea
                            placeholder="Explain the execution process..."
                            value={section4.delivery_explanation}
                            onChange={e => update('delivery_explanation', e.target.value)}
                            className="min-h-[100px] rounded-2xl border-2 border-slate-50 bg-slate-50 p-6 text-xs font-bold text-slate-700 focus:bg-white focus:border-report-primary-border outline-none transition-all resize-none"
                        />
                    </div>
                </div>
            </div>

            {/* 4.3 Outputs */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">4.3</div>
                        <h3 className="report-h3">Outputs (Measurable Results)</h3>
                    </div>
                    <Button
                        type="button"
                        onClick={addOutput}
                        variant="outline"
                        className="h-10 px-6 rounded-xl border-2 border-slate-900 text-slate-900 font-black text-[10px] uppercase tracking-wider hover:bg-slate-900 hover:text-white transition-all shadow-md shadow-slate-100"
                    >
                        <PlusCircle className="w-4 h-4 mr-2" /> Add Output
                    </Button>
                </div>

                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-sm space-y-6">
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-4">
                        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[10px] font-black text-amber-900 uppercase mb-1">Guidelines</p>
                            <p className="text-[9px] font-medium text-amber-800 leading-relaxed uppercase">
                                Outputs must be numeric and verifiable. They should be delivered or produced things.
                                ✗ Do not write descriptions here.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {section4.outputs.map((out, i) => (
                            <div key={i} className="flex flex-col md:flex-row gap-4 p-6 bg-slate-50/50 rounded-3xl border-2 border-slate-50 relative group">
                                <div className="flex-1 space-y-2">
                                    <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Output Type</Label>
                                    <select
                                        value={out.type}
                                        onChange={e => updateOutput(i, 'type', e.target.value)}
                                        className="w-full h-12 bg-white border-2 border-slate-100 rounded-xl px-4 text-xs font-bold text-slate-700 outline-none focus:border-report-primary-border"
                                    >
                                        <option value="">Select Type...</option>
                                        {outputTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="w-full md:w-32 space-y-2">
                                    <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Quantity</Label>
                                    <Input
                                        type="number"
                                        placeholder="300"
                                        value={out.quantity}
                                        onChange={e => updateOutput(i, 'quantity', e.target.value)}
                                        className="h-12 bg-white border-2 border-slate-100 rounded-xl font-black text-lg text-report-primary"
                                    />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Unit</Label>
                                    <Input
                                        placeholder="Individuals / Kits / Sessions"
                                        value={out.unit}
                                        onChange={e => updateOutput(i, 'unit', e.target.value)}
                                        className="h-12 bg-white border-2 border-slate-100 rounded-xl font-bold"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeOutput(i)}
                                    className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-red-100 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-200"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 4.4 Beneficiary Reach */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">4.4</div>
                    <h3 className="report-h3">Beneficiary Reach & Segmentation</h3>
                </div>

                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-sm space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-2">
                            <Label className="report-label">Total Beneficiaries (Required)</Label>
                            <p className="text-[10px] text-slate-400 font-medium mb-3">Total distinct people receiving benefit.</p>
                            <Input
                                type="number"
                                placeholder="e.g. 500"
                                value={section4.total_beneficiaries}
                                onChange={e => update('total_beneficiaries', e.target.value)}
                                className="h-14 bg-slate-50 border-2 border-slate-50 rounded-2xl font-black text-2xl text-slate-900 px-6"
                            />
                        </div>

                        <div className="space-y-4">
                            <Label className="report-label">Beneficiary Categories (Select All That Apply)</Label>
                            <div className="flex flex-wrap gap-2">
                                {beneficiaryGroups.map(cat => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => toggleBeneficiary(cat)}
                                        className={clsx(
                                            "px-4 py-2 rounded-xl border-2 text-[10px] font-bold transition-all",
                                            (section4.beneficiary_categories || []).includes(cat)
                                                ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                                                : "border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200"
                                        )}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 pt-8 border-t-2 border-slate-50">
                        <Label className="report-label">Optional Description (50–100 words)</Label>
                        <p className="text-[10px] text-slate-400 font-medium italic mb-2">Explain: Who these people are and why they were selected.</p>
                        <Textarea
                            placeholder="Describe your beneficiaries..."
                            value={section4.beneficiary_description}
                            onChange={e => update('beneficiary_description', e.target.value)}
                            className="min-h-[100px] rounded-2xl border-2 border-slate-50 bg-slate-50 p-6 text-xs font-bold text-slate-700 focus:bg-white focus:border-report-primary-border outline-none transition-all resize-none"
                        />
                    </div>
                </div>
            </div>

            {/* 4.5 Scale */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">4.5</div>
                    <h3 className="report-h3">Scale of Implementation</h3>
                </div>

                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-sm space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-2">
                            <Label className="report-label">4.5.1 Number of Sessions</Label>
                            <p className="text-[10px] text-slate-400 font-medium mb-3">Total specific activities or events conducted.</p>
                            <Input
                                type="number"
                                value={section4.total_sessions}
                                onChange={e => update('total_sessions', e.target.value)}
                                className="h-14 bg-slate-50 border-2 border-slate-50 rounded-2xl font-black text-2xl text-slate-900 px-6"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="report-label">4.5.2 Duration & Intensity (Auto-Generated)</Label>
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Hours</p>
                                    <p className="text-sm font-black text-slate-900">{section1.metrics?.total_verified_hours || 0}h</p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active Days</p>
                                    <p className="text-sm font-black text-slate-900">{section1.metrics?.total_active_days || 0}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-10 border-t-2 border-slate-50">
                        <div className="space-y-4">
                            <Label className="report-label">4.5.3 Geographic Reach (Select One)</Label>
                            <select
                                value={section4.geographic_reach}
                                onChange={e => {
                                    update('geographic_reach', e.target.value);
                                    update('geographic_sub_category', '');
                                }}
                                className="w-full h-14 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-bold text-slate-700 text-sm outline-none focus:border-report-primary-border"
                            >
                                <option value="">Select Reach...</option>
                                {geographicReachOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>

                        {section4.geographic_reach && subCategoryMap[section4.geographic_reach] && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <Label className="report-label">4.5.4 Geographic Sub-Category (Select One)</Label>
                                <div className="flex flex-wrap gap-2">
                                    {subCategoryMap[section4.geographic_reach].map(sub => (
                                        <button
                                            key={sub}
                                            type="button"
                                            onClick={() => update('geographic_sub_category', sub)}
                                            className={clsx(
                                                "px-4 py-2 rounded-xl border-2 text-[10px] font-bold transition-all",
                                                section4.geographic_sub_category === sub
                                                    ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-200"
                                                    : "border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200"
                                            )}
                                        >
                                            {sub}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Scale Analytics */}
                    <div className="p-8 bg-slate-900 rounded-[2rem] text-white space-y-6 relative overflow-hidden">
                        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Session Frequency</p>
                                <p className="text-xl font-black">{((parseInt(section4.total_sessions) || 0) / (section1.metrics?.engagement_span || 1)).toFixed(1)} <span className="text-[10px] text-slate-400 font-bold tracking-normal">/ day</span></p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Engagement Intensity</p>
                                <p className="text-xl font-black">{section1.metrics?.eis_score || 0}%</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">HEC Compliance</p>
                                <p className="text-xl font-black uppercase text-emerald-400">{section1.metrics?.hec_compliance || 'Recognized'}</p>
                            </div>
                        </div>
                        <div className="absolute -bottom-10 -right-10 opacity-10">
                            <Activity className="w-64 h-64" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-center pt-10">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => saveReport(false)}
                    className="h-16 px-12 rounded-2xl border-2 border-slate-100 bg-white text-slate-500 font-extrabold uppercase tracking-widest hover:border-slate-900 hover:text-slate-900 hover:shadow-xl transition-all flex items-center gap-4 group"
                >
                    <Save className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                    <span>Save Activities Section</span>
                </Button>
            </div>
        </div>
    );
}
