import {
    Handshake, Plus, Trash2, ShieldCheck, Save, Info, AlertCircle,
    Building2, Users2, CheckCircle2, BarChart3, Globe, Activity
} from "lucide-react";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import React, { useMemo, useEffect } from "react";
import clsx from "clsx";

// ─── Static data ──────────────────────────────────────────────────────────────
const partnerTypes = [
    "NGO",
    "School / University",
    "Government Department",
    "Private Company",
    "Public Limited Company",
    "Community Group",
    "Non-profit Organization / Charity",
    "Social Enterprise",
    "Local Business / Small Enterprise",
    "Hospital / Healthcare Organization",
    "Religious Organization (Mosque, Church, Temple etc.)",
    "International Organization (UN agencies, INGOs etc.)",
    "Volunteer Network",
    "Environmental Organization",
    "Youth Organization",
    "Local Council / Municipal Authority",
    "Foundation / Trust",
    "Research Institute / Think Tank",
    "Others (please specify)"
];

const roleOptions = [
    "Project Host",
    "Venue Provider",
    "Technical Support",
    "Funding Partner",
    "Beneficiary Coordinator",
    "Implementation Partner",
    "Verification Authority",
    "Content / Expert Support",
    "Policy / Advisory Support"
];

const contributionOptions = [
    "Financial Support",
    "In-kind Materials",
    "Human Resources",
    "Venue / Infrastructure",
    "Equipment / Technical Support",
    "Access to Beneficiaries",
    "Data / Research Support",
    "Monitoring & Verification",
    "Other"
];

const verificationOptions = [
    "Attendance Verified",
    "Activity Verified",
    "Output Verified",
    "Outcome Verified",
    "Resource Support Verified",
    "Self-Reported (No External Confirmation)"
];

const formalizationOptions = [
    "Memorandum of Understanding (MOU)",
    "Letter of Collaboration",
    "Official Email Confirmation",
    "Government Approval / Notification",
    "None of the above"
];

// ─── SDG 17 Classification helper ─────────────────────────────────────────────
function classifyEngagement(partnerCount: number, verifiedCount: number, formalCount: number): {
    label: string; color: string; desc: string;
} {
    if (partnerCount >= 3 && formalCount >= 1 && verifiedCount >= 2) {
        return { label: "Strategic Partnership", color: "text-indigo-700 bg-indigo-50 border-indigo-200", desc: "Multi-sector collaboration, formalized, high verification" };
    }
    if (partnerCount >= 2 || verifiedCount >= 2) {
        return { label: "Collaborative Engagement", color: "text-blue-700 bg-blue-50 border-blue-200", desc: "Multiple partners, shared roles, verified outputs" };
    }
    return { label: "Basic Engagement", color: "text-slate-600 bg-slate-50 border-slate-200", desc: "One partner, limited role, low verification" };
}

// ─── Partner Card ──────────────────────────────────────────────────────────────
function PartnerCard({
    p, idx, canRemove, onUpdate, onRemove, getFieldError
}: {
    p: any; idx: number; canRemove: boolean;
    onUpdate: (field: string, val: any) => void;
    onRemove: () => void;
    getFieldError: (key: string) => string | undefined;
}) {
    const contribution: string[] = p.contribution || [];

    const toggleContribution = (opt: string) => {
        onUpdate('contribution', contribution.includes(opt)
            ? contribution.filter(c => c !== opt)
            : [...contribution, opt]);
    };

    return (
        <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-sm space-y-8 relative">
            {/* Card header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-[10px]">
                        {idx + 1}
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Partner Entry</span>
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

            {/* Partner Name */}
            <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Partner Name (Official Registered Name) — Required</Label>
                <input
                    type="text"
                    placeholder="e.g. XYZ Welfare Trust, District Health Office..."
                    value={p.name}
                    onChange={e => onUpdate('name', e.target.value)}
                    className="w-full h-13 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-bold text-slate-700 text-sm outline-none focus:border-indigo-200 transition-all"
                />
                {p.name && (
                    <p className="text-[9px] text-slate-400 font-semibold px-1">Avoid abbreviations unless officially registered.</p>
                )}
                <FieldError message={getFieldError(`partners.${idx}.name`)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: Type + Role */}
                <div className="space-y-6">
                    {/* Partner Type */}
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Partner Type</Label>
                        <select
                            value={p.type}
                            onChange={e => onUpdate('type', e.target.value)}
                            className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 font-bold text-slate-700 text-xs outline-none focus:border-indigo-200"
                        >
                            <option value="">Select Partner Type...</option>
                            {partnerTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        {p.type === 'Others (please specify)' && (
                            <input
                                type="text" placeholder="Specify partner type..."
                                value={p.type_other || ''}
                                onChange={e => onUpdate('type_other', e.target.value)}
                                className="w-full h-10 bg-slate-50 border-2 border-indigo-100 rounded-xl px-4 text-xs font-bold text-slate-700 outline-none"
                            />
                        )}
                    </div>

                    {/* Role in Project */}
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Role in Project (Primary Role)</Label>
                        <div className="grid grid-cols-1 gap-1.5">
                            {roleOptions.map(role => (
                                <button
                                    key={role} type="button"
                                    onClick={() => onUpdate('role', role)}
                                    className={clsx(
                                        "px-3 py-2.5 rounded-xl border-2 text-[9px] font-black uppercase tracking-wider text-left transition-all",
                                        p.role === role
                                            ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                                            : "border-slate-50 bg-slate-50 text-slate-500 hover:bg-slate-100"
                                    )}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Contribution + Verification */}
                <div className="space-y-6">
                    {/* Contribution Type — multi-select */}
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contribution Type (Select All That Apply)</Label>
                        <p className="text-[9px] text-slate-400 font-semibold">At least one must be selected.</p>
                        <div className="grid grid-cols-1 gap-1.5">
                            {contributionOptions.map(opt => (
                                <button
                                    key={opt} type="button"
                                    onClick={() => toggleContribution(opt)}
                                    className={clsx(
                                        "flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-[9px] font-black uppercase tracking-wider text-left transition-all",
                                        contribution.includes(opt)
                                            ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                                            : "border-slate-50 bg-slate-50 text-slate-500 hover:bg-slate-100"
                                    )}
                                >
                                    <div className={clsx(
                                        "w-3 h-3 rounded-sm border-2 flex items-center justify-center flex-shrink-0",
                                        contribution.includes(opt) ? "border-indigo-600 bg-indigo-600" : "border-slate-300"
                                    )}>
                                        {contribution.includes(opt) && <CheckCircle2 className="w-2 h-2 text-white" />}
                                    </div>
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Verification Level */}
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Verification Level</Label>
                        <p className="text-[9px] text-slate-400 font-semibold">Higher verification strengthens partnership credibility.</p>
                        <div className="grid grid-cols-1 gap-1.5">
                            {verificationOptions.map(v => (
                                <button
                                    key={v} type="button"
                                    onClick={() => onUpdate('verification', v)}
                                    className={clsx(
                                        "flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-[9px] font-black uppercase tracking-wider text-left transition-all",
                                        p.verification === v
                                            ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                                            : "border-slate-50 bg-slate-50 text-slate-500 hover:bg-slate-100"
                                    )}
                                >
                                    {p.verification === v
                                        ? <ShieldCheck className="w-3 h-3 text-indigo-600 flex-shrink-0" />
                                        : <div className="w-3 h-3 rounded-full border-2 border-slate-300 flex-shrink-0" />
                                    }
                                    {v}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Section7Partnerships() {
    const { data, updateSection, getFieldError, saveReport } = useReportForm();
    const { has_partners, partners, formalization_status, formalization_files } = data.section7;

    const update = (field: string, val: any) => updateSection('section7', { [field]: val });

    const addPartner = () =>
        update('partners', [...partners, { name: '', type: '', role: '', contribution: [], verification: '' }]);
    const removePartner = (i: number) =>
        update('partners', partners.filter((_, idx) => idx !== i));
    const updatePartner = (i: number, field: string, val: any) => {
        const next = [...partners];
        next[i] = { ...next[i], [field]: val };
        update('partners', next);
    };
    const toggleFormalization = (opt: string) => {
        const cur = formalization_status || [];
        if (opt === "None of the above") {
            // If selecting "None of the above", clear everything else and just set this
            update('formalization_status', cur.includes(opt) ? [] : [opt]);
        } else {
            // If selecting a document, remove "None of the above" from the list
            let next = cur.includes(opt) ? cur.filter(x => x !== opt) : [...cur, opt];
            next = next.filter(x => x !== "None of the above");
            update('formalization_status', next);
        }
    };

    // ── Analytics ─────────────────────────────────────────────────────────────
    const govPartners = partners.filter(p => p.type?.toLowerCase().includes('government') || p.type?.toLowerCase().includes('local council'));
    const privatePartners = partners.filter(p => p.type?.toLowerCase().includes('private') || p.type?.toLowerCase().includes('corporate') || p.type?.toLowerCase().includes('csr'));
    const academicPartners = partners.filter(p => p.type?.toLowerCase().includes('school') || p.type?.toLowerCase().includes('university') || p.type?.toLowerCase().includes('research'));
    const intlPartners = partners.filter(p => p.type?.toLowerCase().includes('international'));
    const verifiedPartners = partners.filter(p => p.verification && !p.verification.includes('Self-Reported'));
    const selfReportedPartners = partners.filter(p => p.verification?.includes('Self-Reported'));
    const formalCount = formalization_status?.filter(s => s !== 'No Formal Documentation').length || 0;
    const classification = classifyEngagement(partners.length, verifiedPartners.length, formalCount);

    // ── Auto narrative ────────────────────────────────────────────────────────
    const autoNarrative = useMemo(() => {
        if (has_partners === 'no') return "No formal partnerships reported. Project was executed independently.";
        if (!partners.length) return "Partnership summary will appear once partner details are entered.";
        const govCount = govPartners.length;
        const types = [...new Set(partners.map(p => p.type).filter(Boolean))].slice(0, 2);
        return `The project engaged ${partners.length} active ${partners.length === 1 ? 'partner' : 'partners'}${types.length ? ` including ${types.slice(0, 2).join(' and ').toLowerCase()} ${types.length === 1 ? 'organization' : 'organizations'}` : ''}. ${verifiedPartners.length > 0 ? `Partnerships were verified at the ${[...new Set(verifiedPartners.map(p => p.verification))].slice(0, 2).join(' and ').toLowerCase()} level.` : ''} ${formalCount > 0 ? `${formalCount} ${formalCount === 1 ? 'collaboration was' : 'collaborations were'} supported by formal documentation.` : ''}`;
    }, [has_partners, partners, verifiedPartners, govPartners, formalCount]);

    useEffect(() => {
        if (data.section7.summary_text !== autoNarrative) {
            updateSection('section7', { summary_text: autoNarrative });
        }
    }, [autoNarrative, data.section7.summary_text]);

    return (
        <div className="space-y-12 pb-16">
            {/* ─── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-100 ring-4 ring-indigo-50">
                    <Handshake className="w-7 h-7" />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Section 7 — Partnerships & Collaboration</h2>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.15em] text-[10px]">Measurable Multi-Stakeholder Engagement (SDG 17)</p>
                </div>
            </div>

            {/* ─── Purpose note ────────────────────────────────────────────── */}
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-3">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-[9px] font-black text-indigo-800 uppercase tracking-widest">⚠ Only include partners who actively contributed</p>
                    <p className="text-[9px] text-indigo-700 font-semibold">
                        Do not list organizations that were only informed, mentioned, or tagged.
                        Include only those who provided support, coordination, expertise, resources, hosting, or verification.
                    </p>
                </div>
            </div>

            {/* ─── Step 1: Partnership Confirmation ────────────────────────── */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">7.0</div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Step 1 — Partnership Confirmation</h3>
                </div>
                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-sm space-y-4">
                    <Label className="text-sm font-black text-slate-900 uppercase tracking-tight">Did This Project Involve Any Active Partners?</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => update('has_partners', 'no')}
                            className={clsx(
                                "p-6 rounded-2xl border-2 text-left transition-all space-y-2",
                                has_partners === 'no'
                                    ? "border-slate-900 bg-slate-900 text-white shadow-xl"
                                    : "border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-300"
                            )}
                        >
                            <p className="text-xs font-black uppercase tracking-widest">⭕ No — Students Worked Independently</p>
                            <p className={clsx("text-[9px] font-semibold", has_partners === 'no' ? "text-slate-300" : "text-slate-400")}>
                                System records: "No formal partnerships reported."
                            </p>
                        </button>
                        <button
                            type="button"
                            onClick={() => update('has_partners', 'yes')}
                            className={clsx(
                                "p-6 rounded-2xl border-2 text-left transition-all space-y-2",
                                has_partners === 'yes'
                                    ? "border-indigo-600 bg-indigo-600 text-white shadow-xl shadow-indigo-100"
                                    : "border-slate-100 bg-slate-50 text-slate-600 hover:border-indigo-100"
                            )}
                        >
                            <p className="text-xs font-black uppercase tracking-widest">⭕ Yes — One or More Partners Were Actively Involved</p>
                            <p className={clsx("text-[9px] font-semibold", has_partners === 'yes' ? "text-indigo-100" : "text-slate-400")}>
                                Continue to Step 2 to enter partner details.
                            </p>
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── Step 2: Partner Details ──────────────────────────────────── */}
            {has_partners === 'yes' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">7.1</div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Step 2 — Enter Partner Details</h3>
                        </div>
                        <Button
                            type="button" variant="ghost" onClick={addPartner}
                            className="h-8 px-3 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100"
                        >
                            <Plus className="w-3 h-3 mr-1.5" /> Add Another Partner
                        </Button>
                    </div>

                    {partners.length === 0 ? (
                        <div className="py-16 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 space-y-3">
                            <Users2 className="w-10 h-10 text-slate-200 mx-auto" />
                            <p className="text-sm font-black text-slate-300 uppercase tracking-widest">No partners added yet</p>
                            <Button type="button" onClick={addPartner} variant="ghost" className="h-9 px-5 bg-slate-900 text-white text-[10px] font-black rounded-xl">
                                <Plus className="w-3 h-3 mr-2" /> Add First Partner
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {partners.map((p, idx) => (
                                <PartnerCard
                                    key={idx} p={p} idx={idx}
                                    canRemove={partners.length > 1}
                                    onUpdate={(field, val) => updatePartner(idx, field, val)}
                                    onRemove={() => removePartner(idx)}
                                    getFieldError={getFieldError}
                                />
                            ))}
                        </div>
                    )}

                    {/* ─── Step 3: Formalization Status ─────────────────────── */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">7.2</div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Step 3 — Formalization Status</h3>
                        </div>
                        <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-sm space-y-6">
                            <div className="space-y-2">
                                <Label className="text-sm font-black text-slate-900 uppercase tracking-tight">Was This Partnership Supported by Formal Documentation?</Label>
                                <p className="text-[9px] text-slate-400 font-semibold">Select all that apply. Formalized partnerships increase SDG 17 classification strength.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {formalizationOptions.map(opt => (
                                    <button
                                        key={opt} type="button"
                                        onClick={() => toggleFormalization(opt)}
                                        className={clsx(
                                            "flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all",
                                            formalization_status?.includes(opt)
                                                ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100"
                                                : "bg-slate-50 border-slate-50 text-slate-600 hover:border-indigo-100 hover:bg-indigo-50"
                                        )}
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-widest text-left">{opt}</span>
                                        {formalization_status?.includes(opt)
                                            ? <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                                            : <div className="w-4 h-4 rounded border-2 border-slate-300 flex-shrink-0" />
                                        }
                                    </button>
                                ))}
                            </div>

                            {/* Evidence upload */}
                            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 space-y-3 hover:border-indigo-200 transition-colors">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Info className="w-3.5 h-3.5" /> Upload Supporting Documentation (Optional but recommended)
                                </p>
                                <p className="text-[9px] text-slate-400 font-semibold">MOUs, Letters of Collaboration, Official Emails, Government Approvals</p>
                                <input
                                    type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    className="text-xs text-slate-500 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[9px] file:font-black file:uppercase file:bg-indigo-50 file:text-indigo-700"
                                    onChange={e => {
                                        if (e.target.files) {
                                            updateSection('section7', { formalization_files: [...(formalization_files || []), ...Array.from(e.target.files)] });
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ─── Auto-Generated Analytics ─────────────────────────── */}
                    <div className="pt-8 border-t-2 border-slate-100 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">System-Generated Partnership Analytics</h3>
                            </div>
                            <span className="px-3 py-1.5 bg-slate-100 rounded-xl text-[9px] font-black text-slate-500 uppercase tracking-widest">Read-Only</span>
                        </div>

                        {/* Partnership Overview grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: "Total Active Partners", val: partners.length, color: "bg-indigo-50 text-indigo-700" },
                                { label: "Government Partners", val: govPartners.length, color: "bg-slate-100 text-slate-700" },
                                { label: "Private / CSR Partners", val: privatePartners.length, color: "bg-blue-50 text-blue-700" },
                                { label: "Academic Institutions", val: academicPartners.length, color: "bg-emerald-50 text-emerald-700" },
                            ].map(({ label, val, color }) => (
                                <div key={label} className={clsx("rounded-2xl p-4 space-y-1", color)}>
                                    <p className="text-2xl font-black">{val}</p>
                                    <p className="text-[8px] font-black uppercase tracking-widest opacity-70">{label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Verification Strength */}
                        <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 space-y-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verification Strength</p>
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { label: "Fully Verified", val: verifiedPartners.filter(p => p.verification?.includes('Output') || p.verification?.includes('Outcome')).length, color: "text-emerald-600" },
                                    { label: "Partially Verified", val: verifiedPartners.filter(p => p.verification?.includes('Attendance') || p.verification?.includes('Activity') || p.verification?.includes('Resource')).length, color: "text-blue-600" },
                                    { label: "Self-Reported", val: selfReportedPartners.length, color: "text-amber-600" },
                                ].map(({ label, val, color }) => (
                                    <div key={label} className="text-center space-y-1">
                                        <p className={clsx("text-2xl font-black", color)}>{val}</p>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* SDG 17 Classification */}
                        <div className={clsx("rounded-2xl border-2 p-5 flex items-center justify-between", classification.color)}>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-widest opacity-60">SDG 17 Engagement Classification</p>
                                <p className="text-sm font-black uppercase tracking-wider">{classification.label}</p>
                                <p className="text-[9px] font-semibold opacity-60">{classification.desc}</p>
                            </div>
                            <Globe className="w-8 h-8 opacity-40" />
                        </div>

                        {/* Auto narrative */}
                        <div className="bg-indigo-900 rounded-[2.5rem] p-8 relative overflow-hidden">
                            <div className="absolute right-0 top-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
                            <span className="absolute -top-4 -left-2 text-6xl font-serif text-white/10 select-none">"</span>
                            <p className="relative z-10 text-base font-bold text-white leading-relaxed font-serif">
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
                    <span>Save Section 7 Progress</span>
                </Button>
            </div>
        </div>
    );
}
