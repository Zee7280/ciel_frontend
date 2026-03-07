import {
    ShieldCheck, Camera, FileUp, Globe, FileText, Lock, CheckCircle2,
    Save, Info, AlertCircle, Activity, Image as ImageIcon, Users, BookOpen, Trash2
} from "lucide-react";
import { Label } from "./ui/label";
import { FileUpload } from "./ui/file-upload";
import { Button } from "./ui/button";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import React, { useMemo, useEffect } from "react";
import clsx from "clsx";

// ─── Static configuration ───────────────────────────────────────────────────
const evidenceOptions = [
    { id: "Activity photos (with consent)", icon: ImageIcon },
    { id: "Attendance sheet", icon: Users },
    { id: "Training materials / presentations", icon: BookOpen },
    { id: "Partner confirmation letter or email", icon: FileText },
    { id: "Survey results / feedback data", icon: Activity },
    { id: "Media coverage", icon: Globe },
    { id: "Resource delivery proof", icon: ShieldCheck },
    { id: "Other supporting document", icon: FileUp }
];

const ethicalOptions = [
    { key: "authentic", label: "Authentic & Relevant", desc: "The evidence is authentic and directly related to this project" },
    { key: "informed_consent", label: "Informed Consent", desc: "Informed consent was obtained where required" },
    { key: "no_harm", label: "Non-Maleficence", desc: "No harm, exploitation, or misrepresentation is shown" },
    { key: "privacy_respected", label: "Privacy & Dignity", desc: "Privacy and dignity of beneficiaries were respected" }
];

const visibilityOptions = [
    { id: "public", label: "Public", desc: "May be used on website, social media, and public reports", icon: Globe, color: "text-emerald-600 border-emerald-200 bg-emerald-50" },
    { id: "limited", label: "Limited", desc: "Institutional reports and presentations only", icon: Users, color: "text-blue-600 border-blue-200 bg-blue-50" },
    { id: "internal", label: "Internal", desc: "Verification purposes only", icon: Lock, color: "text-slate-600 border-slate-200 bg-slate-50" }
];

const verificationTypes = [
    "Signed letter",
    "Official email confirmation",
    "Attendance verification",
    "Institutional stamp or seal"
];

// ─── Helper for Verification Strength ───────────────────────────────────────
function classifyVerification(filesCount: number, typesCount: number, partnerAssessed: boolean): {
    label: string; color: string; desc: string;
} {
    if (partnerAssessed) {
        return { label: "Verified by Partner", color: "text-emerald-700 bg-emerald-50 border-emerald-200", desc: "External confirmation included" };
    }
    if (filesCount > 1 && typesCount > 1) {
        return { label: "Structured Verification", color: "text-blue-700 bg-blue-50 border-blue-200", desc: "Multiple evidence types, documented outputs" };
    }
    return { label: "Basic Verification", color: "text-amber-700 bg-amber-50 border-amber-200", desc: "Single file, limited documentation" };
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Section8Evidence() {
    const { data, updateSection, getFieldError, saveReport } = useReportForm();
    const section8 = data.section8 || {};
    const {
        evidence_types = [],
        evidence_files = [],
        description = '',
        ethical_compliance = {},
        media_visible = '',
        partner_verification = false,
        partner_verification_type = '',
        partner_verification_files = []
    } = section8;

    const update = (field: string, val: any) => updateSection('section8', { [field]: val });
    const toggleEvidenceType = (type: string) => {
        const cur = evidence_types || [];
        update('evidence_types', cur.includes(type) ? cur.filter(t => t !== type) : [...cur, type]);
    };
    const updateEthical = (key: string, val: boolean) => {
        update('ethical_compliance', { ...ethical_compliance, [key]: val });
    };

    const wordCount = (description || '').trim().split(/\s+/).filter(w => w.length > 0).length;
    const allEthicalChecked = Object.values(ethical_compliance || {}).every(v => v === true) && Object.keys(ethical_compliance || {}).length === 4;

    // ── Content generation ────────────────────────────────────────────────────
    const classification = classifyVerification(evidence_files?.length || 0, evidence_types?.length || 0, partner_verification && !!partner_verification_type);

    const autoNarrative = useMemo(() => {
        const filesCount = evidence_files?.length || 0;
        if (filesCount === 0) return "Evidence statement will be generated once files are uploaded and classified.";
        const typeNames = evidence_types?.map(t => t.split(' ')[0].toLowerCase()) || [];
        const typesStr = typeNames.length > 0 ? ` including ${typeNames.slice(0, 2).join(' and ')} documentation` : '';
        const ethicalStr = allEthicalChecked ? "Ethical compliance was fully confirmed." : "Ethical compliance checks are pending.";
        const partnerStr = partner_verification ? `External partner verification was provided via ${partner_verification_type || 'documentation'}.` : "External partner verification was not provided.";
        return `The report includes ${filesCount} supporting evidence ${filesCount === 1 ? 'file' : 'files'}${typesStr}. ${ethicalStr} ${partnerStr}`;
    }, [evidence_files, evidence_types, allEthicalChecked, partner_verification, partner_verification_type]);

    useEffect(() => {
        if (section8.summary_text !== autoNarrative) {
            updateSection('section8', { summary_text: autoNarrative });
        }
    }, [autoNarrative, section8.summary_text]);


    return (
        <div className="space-y-12 pb-16">
            {/* ─── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-xl shadow-amber-100 ring-4 ring-amber-50">
                    <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Section 8 — Evidence & Verification</h2>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.15em] text-[10px]">Proof of Activity & Credibility Layer</p>
                </div>
            </div>

            {/* ─── Purpose note ────────────────────────────────────────────── */}
            <div className="p-5 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-4">
                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-2">
                    <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest leading-relaxed">
                        This section confirms that your reported work is Verifiable, Ethical, Traceable, and Audit-ready.
                    </p>
                    <p className="text-[10px] text-amber-700 font-semibold leading-relaxed">
                        It strengthens your report for University documentation, HEC audit, QS impact submissions, Government reporting, and SDG contribution validation. This is the credibility layer of your project.
                    </p>
                </div>
            </div>

            {/* ─── Step 1: Evidence Submission (Upload) ──────────────────────── */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">8.1</div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Step 1 — Upload Evidence (Mandatory)</h3>
                </div>
                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-sm space-y-6">
                    <div className="space-y-1">
                        <Label className="text-sm font-black text-slate-900 uppercase tracking-tight">Evidence Submission</Label>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            You must upload at least one valid evidence file before submitting this section.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Accepted Formats</p>
                            <ul className="text-xs font-semibold text-slate-500 space-y-1 list-disc list-inside">
                                <li>JPG / PNG (Photos)</li>
                                <li>MP4 (Short videos)</li>
                                <li>PDF (Attendance sheets, reports, structured documents)</li>
                                <li>Official letters & Email confirmations</li>
                                <li>Media coverage links (can be included in description)</li>
                            </ul>
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">What Your Evidence Should Show</p>
                            <ul className="text-xs font-semibold text-slate-500 space-y-1 list-disc list-inside">
                                <li>The activity took place</li>
                                <li>You participated</li>
                                <li>Beneficiaries were engaged</li>
                                <li>Outputs were delivered</li>
                            </ul>
                            <p className="text-[9px] font-black text-red-500 uppercase flex items-center gap-1 mt-2">
                                <AlertCircle className="w-3 h-3" /> Do not upload unrelated or misleading material
                            </p>
                        </div>
                    </div>
                    <FileUpload
                        label="Drag & Drop Files or Click to Browse"
                        onChange={(e) => {
                            if (e.target.files) {
                                update('evidence_files', [...(evidence_files || []), ...Array.from(e.target.files)]);
                            }
                        }}
                    />

                    {/* Evidence Files List */}
                    {evidence_files && evidence_files.length > 0 && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attached Evidence ({evidence_files.length})</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {evidence_files.map((file: File, fIdx: number) => (
                                    <div key={fIdx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl group/file">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                                                <ImageIcon className="w-4 h-4" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-xs font-bold text-slate-700 truncate">{file.name}</p>
                                                <p className="text-[9px] font-medium text-slate-400 uppercase">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const kept = evidence_files.filter((_: any, i: number) => i !== fIdx);
                                                update('evidence_files', kept);
                                            }}
                                            className="w-7 h-7 rounded-lg bg-white text-slate-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all border border-slate-100"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="flex items-center justify-between px-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Upload Status</span>
                        {evidence_files?.length ? (
                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" /> {evidence_files.length} Files Attached
                            </span>
                        ) : (
                            <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-lg border border-amber-100 flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5" /> Missing Evidence
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── Step 2: Classify Evidence ─────────────────────────────────── */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">8.2</div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Step 2 — Classify the Evidence (Required)</h3>
                </div>
                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-sm space-y-6">
                    <div className="space-y-1">
                        <Label className="text-sm font-black text-slate-900 uppercase tracking-tight">Evidence Type</Label>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Select all categories that apply (At least one required).</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {evidenceOptions.map(opt => (
                            <button
                                key={opt.id} type="button"
                                onClick={() => toggleEvidenceType(opt.id)}
                                className={clsx(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left",
                                    (evidence_types || []).includes(opt.id)
                                        ? "border-amber-500 bg-amber-50 text-amber-900 shadow-sm"
                                        : "border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                                )}
                            >
                                <div className={clsx(
                                    "w-4 h-4 rounded-sm border-2 flex items-center justify-center flex-shrink-0",
                                    (evidence_types || []).includes(opt.id) ? "border-amber-500 bg-amber-500" : "border-slate-300 bg-white"
                                )}>
                                    {(evidence_types || []).includes(opt.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                                </div>
                                <opt.icon className="w-4 h-4 opacity-50 flex-shrink-0" />
                                <span className="text-[10px] font-black uppercase tracking-widest">{opt.id}</span>
                            </button>
                        ))}
                    </div>
                    <FieldError message={getFieldError('section8.evidence_types')} />
                </div>
            </div>

            {/* ─── Step 3: Describe Evidence ─────────────────────────────────── */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">8.3</div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Step 3 — Describe the Evidence</h3>
                </div>
                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-sm space-y-4">
                    <div className="space-y-1">
                        <Label className="text-sm font-black text-slate-900 uppercase tracking-tight">Evidence Description (Mandatory)</Label>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider max-w-2xl leading-relaxed">
                            Briefly explain what this evidence shows, how it relates to your activity, and what it verifies (attendance, outputs, outcomes, resource use).
                        </p>
                    </div>
                    <textarea
                        placeholder="Example: The uploaded photos show students conducting hygiene awareness sessions at a community school. The attendance sheet confirms 60 participants across three sessions. The presentation slides demonstrate the structured content delivered."
                        value={description}
                        onChange={e => update('description', e.target.value)}
                        rows={4}
                        className="w-full h-32 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-medium text-slate-700 text-sm outline-none focus:border-amber-200 transition-all resize-none"
                    />
                    <div className="flex items-center justify-between px-2">
                        <span className={clsx(
                            "text-[10px] font-black uppercase tracking-widest",
                            wordCount >= 50 && wordCount <= 80 ? "text-emerald-600" : wordCount > 80 ? "text-red-500" : "text-amber-500"
                        )}>
                            {wordCount} / 80 words (Min 50)
                        </span>
                        {wordCount >= 50 && wordCount <= 80 && (
                            <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Valid length
                            </span>
                        )}
                    </div>
                    <FieldError message={getFieldError('section8.description')} />
                </div>
            </div>

            {/* ─── Step 4: Ethical Compliance ────────────────────────────────── */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">8.4</div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Step 4 — Ethical & Consent Confirmation</h3>
                </div>
                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-sm space-y-6">
                    <div className="space-y-1">
                        <Label className="text-sm font-black text-slate-900 uppercase tracking-tight">Ethical Declaration (All required)</Label>
                        <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> False or misleading submissions may result in rejection and institutional action.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        {ethicalOptions.map(opt => {
                            const isChecked = !!ethical_compliance?.[opt.key as keyof typeof ethical_compliance];
                            return (
                                <button
                                    key={opt.key} type="button"
                                    onClick={() => updateEthical(opt.key, !isChecked)}
                                    className={clsx(
                                        "flex items-start gap-4 px-5 py-4 rounded-xl border-2 transition-all text-left",
                                        isChecked ? "border-amber-500 bg-amber-50 shadow-sm" : "border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-300"
                                    )}
                                >
                                    <div className={clsx(
                                        "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                                        isChecked ? "border-amber-500 bg-amber-500" : "border-slate-300 bg-white"
                                    )}>
                                        {isChecked && <CheckCircle2 className="w-4 h-4 text-white" />}
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-black text-slate-900 uppercase tracking-widest">{opt.desc}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ─── Step 5: Visibility Preference ─────────────────────────────── */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">8.5</div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Step 5 — Media Visibility Preference</h3>
                </div>
                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-sm space-y-6">
                    <Label className="text-sm font-black text-slate-900 uppercase tracking-tight">Evidence Usage Permission</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {visibilityOptions.map(opt => (
                            <button
                                key={opt.id} type="button"
                                onClick={() => update('media_visible', opt.id)}
                                className={clsx(
                                    "p-6 rounded-2xl border-2 text-left transition-all relative overflow-hidden",
                                    media_visible === opt.id ? opt.color : "bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-300"
                                )}
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <opt.icon className="w-5 h-5" />
                                    <p className="text-xs font-black uppercase tracking-widest">{opt.label}</p>
                                </div>
                                <p className="text-[9px] font-bold opacity-80 leading-relaxed uppercase pr-6">{opt.desc}</p>
                                {media_visible === opt.id && (
                                    <div className="absolute top-6 right-6 w-2 h-2 rounded-full bg-current animate-pulse" />
                                )}
                            </button>
                        ))}
                    </div>
                    <FieldError message={getFieldError('section8.media_visible')} />
                </div>
            </div>

            {/* ─── Step 6: External Confirmation ─────────────────────────────── */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">8.6</div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Step 6 — Partner Verification (Optional)</h3>
                </div>
                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-sm space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <Label className="text-sm font-black text-slate-900 uppercase tracking-tight">Did a partner verify this project?</Label>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">External verification significantly strengthens credibility.</p>
                        </div>
                        <div className="flex bg-slate-50 p-1.5 rounded-2xl border-2 border-slate-100 gap-1.5 min-w-[200px]">
                            <button
                                type="button" onClick={() => update('partner_verification', false)}
                                className={clsx("flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", !partner_verification ? "bg-white shadow-md text-slate-900" : "text-slate-400 hover:text-slate-600")}
                            >
                                No
                            </button>
                            <button
                                type="button" onClick={() => update('partner_verification', true)}
                                className={clsx("flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", partner_verification ? "bg-emerald-600 shadow-md shadow-emerald-100 text-white" : "text-slate-400 hover:text-slate-600")}
                            >
                                Yes
                            </button>
                        </div>
                    </div>

                    {partner_verification && (
                        <div className="pt-6 border-t-2 border-slate-50 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Verification Type</Label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {verificationTypes.map(v => (
                                        <button
                                            key={v} type="button"
                                            onClick={() => update('partner_verification_type', v)}
                                            className={clsx(
                                                "px-3 py-3 rounded-xl border-2 text-[9px] font-black uppercase tracking-widest text-center transition-all",
                                                partner_verification_type === v ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-white"
                                            )}
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <FileUpload
                                label="Upload Partner Verification Letter / Document"
                                onChange={(e) => {
                                    if (e.target.files) {
                                        update('partner_verification_files', [...(partner_verification_files || []), ...Array.from(e.target.files)]);
                                    }
                                }}
                            />

                            {/* Partner Files List */}
                            {partner_verification_files && partner_verification_files.length > 0 && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Partner Documents ({partner_verification_files.length})</Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {partner_verification_files.map((file: File, fIdx: number) => (
                                            <div key={fIdx} className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl group/file">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-8 h-8 rounded-lg bg-white text-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
                                                        <FileText className="w-4 h-4" />
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <p className="text-xs font-bold text-emerald-900 truncate">{file.name}</p>
                                                        <p className="text-[9px] font-medium text-emerald-500 uppercase">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const kept = partner_verification_files.filter((_: any, i: number) => i !== fIdx);
                                                        update('partner_verification_files', kept);
                                                    }}
                                                    className="w-7 h-7 rounded-lg bg-white text-slate-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all border border-emerald-100"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Auto-Generated System Analytics ────────────────────────────── */}
            <div className="pt-8 border-t-2 border-slate-100 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-200">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">System-Generated Evidence Status</h3>
                    </div>
                    <span className="px-3 py-1.5 bg-slate-100 rounded-xl text-[9px] font-black text-slate-500 uppercase tracking-widest">Read-Only</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Evidence Profile Grid */}
                    <div className="md:col-span-8 bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 space-y-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Evidence Profile</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 rounded-2xl p-5 space-y-1">
                                <p className="text-2xl font-black text-slate-900">{evidence_files?.length || 0}</p>
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Files Submitted</p>
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-5 space-y-1">
                                <p className="text-2xl font-black text-slate-900">{evidence_types?.length || 0}</p>
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Types Covered</p>
                            </div>
                            <div className={clsx("rounded-2xl p-5 space-y-1", allEthicalChecked ? "bg-emerald-50" : "bg-amber-50")}>
                                <p className={clsx("text-2xl font-black", allEthicalChecked ? "text-emerald-700" : "text-amber-700")}>{allEthicalChecked ? "Yes" : "No"}</p>
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Ethical Confirmed</p>
                            </div>
                            <div className={clsx("rounded-2xl p-5 space-y-1", partner_verification ? "bg-emerald-50" : "bg-slate-50")}>
                                <p className={clsx("text-2xl font-black", partner_verification ? "text-emerald-700" : "text-slate-900")}>{partner_verification ? "Verified" : "None"}</p>
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Partner Status</p>
                            </div>
                        </div>
                    </div>

                    {/* Verification Strength */}
                    <div className="md:col-span-4 flex flex-col gap-6">
                        <div className={clsx("rounded-[2.5rem] p-8 border-2 flex-1 flex flex-col items-center justify-center text-center space-y-3", classification.color)}>
                            <ShieldCheck className="w-8 h-8 opacity-80" />
                            <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Verification Strength</p>
                                <p className="text-lg font-black uppercase tracking-tight">{classification.label}</p>
                                <p className="text-[9px] font-semibold opacity-80 uppercase pt-2">{classification.desc}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Auto narrative */}
                <div className="bg-slate-900 rounded-[2.5rem] p-8 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
                    <span className="absolute -top-4 -left-2 text-6xl font-serif text-white/10 select-none">"</span>
                    <p className="relative z-10 text-base font-bold text-white leading-relaxed font-serif">
                        {autoNarrative}
                    </p>
                </div>
            </div>

            {/* ─── Save ─────────────────────────────────────────────────────── */}
            <div className="flex justify-center pt-10">
                <Button
                    type="button" variant="outline" onClick={() => saveReport(false)}
                    className="h-16 px-12 rounded-2xl border-2 border-slate-100 bg-white text-slate-500 font-extrabold uppercase tracking-widest hover:border-slate-900 hover:text-slate-900 hover:shadow-2xl transition-all flex items-center gap-4 group"
                >
                    <Save className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                    <span>Save Evidence Record</span>
                </Button>
            </div>
        </div>
    );
}
