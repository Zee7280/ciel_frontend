import React, { useEffect } from "react";
import { generateAISummary } from "../utils/aiSummarizer";
import { toast } from "sonner";
import {
    ShieldCheck, Camera, FileUp, Globe, FileText, Lock, CheckCircle2,
    Save, Info, AlertCircle, Activity, Image as ImageIcon, Users, BookOpen, Trash2,
    Sparkles, Loader2
} from "lucide-react";
import { Label } from "./ui/label";
import { FileUpload } from "./ui/file-upload";
import { Button } from "./ui/button";
import { useReportForm } from "../context/ReportContext";
import { useDebounce } from "@/hooks/useDebounce";
import { FieldError } from "./ui/FieldError";
import clsx from "clsx";
import { MAX_REPORT_IMAGE_UPLOAD_LABEL, splitReportFilesByImageSize } from "../utils/fileUploadLimits";

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
    { id: "public", label: "Public", desc: "May be used on website, social media, and public reports", icon: Globe, color: "text-report-primary border-report-primary-border bg-report-primary-soft" },
    { id: "limited", label: "Limited", desc: "Institutional reports and presentations only", icon: Users, color: "text-blue-600 border-blue-200 bg-blue-50" },
    { id: "internal", label: "Internal", desc: "Verification purposes only", icon: Lock, color: "text-slate-600 border-slate-200 bg-slate-50" }
];

const verificationTypes = [
    "Signed letter",
    "Official email confirmation",
    "Attendance verification",
    "Institutional stamp or seal"
];

type EvidenceFileItem = File | {
    file?: File;
    name?: string;
    fileName?: string;
    filename?: string;
    originalName?: string;
    size?: number;
    bytes?: number;
    file_size?: number;
    size_bytes?: number;
    type?: string;
    mimeType?: string;
    mimetype?: string;
    url?: string;
    path?: string;
    lastModified?: number;
} | string;

const toEvidenceFileItem = (file: File): EvidenceFileItem => ({
    file,
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified
});

function filterOversizedImages(files: File[], input: HTMLInputElement): File[] {
    const { accepted, rejected } = splitReportFilesByImageSize(files);
    if (rejected.length > 0) {
        toast.error(`Images must be ${MAX_REPORT_IMAGE_UPLOAD_LABEL} or smaller: ${rejected.map((file) => file.name).join(", ")}`);
        input.value = "";
    }
    return accepted;
}

const isNativeFile = (file: EvidenceFileItem): file is File => (
    typeof File !== 'undefined' && file instanceof File
);

const isEvidenceFileRecord = (
    file: EvidenceFileItem
): file is Exclude<EvidenceFileItem, File | string> => (
    typeof file === 'object' && file !== null && !isNativeFile(file)
);

const getFileName = (file: EvidenceFileItem, index: number) => {
    if (typeof file === 'string') return file.split('/').pop() || `Evidence file ${index + 1}`;
    if (isNativeFile(file)) return file.name || `Evidence file ${index + 1}`;
    return (
        file?.name ||
        file?.fileName ||
        file?.filename ||
        file?.originalName ||
        file?.file?.name ||
        `Evidence file ${index + 1}`
    );
};

const getFileSize = (file: EvidenceFileItem) => {
    if (typeof file === 'string') return undefined;
    if (isNativeFile(file)) return Number.isFinite(file.size) ? file.size : undefined;
    if (!isEvidenceFileRecord(file)) return undefined;
    const size = file?.size ?? file?.bytes ?? file?.file_size ?? file?.size_bytes ?? file?.file?.size;
    return typeof size === 'number' && Number.isFinite(size) ? size : undefined;
};

const formatFileSize = (file: EvidenceFileItem) => {
    const size = getFileSize(file);
    return typeof size === 'number' ? `${(size / (1024 * 1024)).toFixed(2)} MB` : 'Size unavailable';
};

const getFileType = (file: EvidenceFileItem) => {
    if (typeof file === 'string') return '';
    if (isNativeFile(file)) return file.type || '';
    if (!isEvidenceFileRecord(file)) return '';
    return file?.type || file?.mimeType || file?.mimetype || file?.file?.type || '';
};

function EvidenceFilePreview({ file, name }: { file: EvidenceFileItem; name: string }) {
    const directUrl = typeof file === 'string' ? file : isEvidenceFileRecord(file) ? file?.url || file?.path : undefined;
    const isImage = getFileType(file).startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
    const previewUrl = isImage ? directUrl : null;

    if (isImage && previewUrl) {
        return (
            <div className="w-8 h-8 rounded-md overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                <img src={previewUrl} alt={name} className="w-full h-full object-cover" />
            </div>
        );
    }

    return (
        <div className="w-8 h-8 rounded-md bg-report-primary-soft text-report-primary flex items-center justify-center shrink-0">
            <ImageIcon className="w-4 h-4" />
        </div>
    );
}

// ─── Helper for Verification Strength ───────────────────────────────────────
function classifyVerification(filesCount: number, typesCount: number, partnerAssessed: boolean): {
    label: string; color: string; desc: string;
} {
    if (partnerAssessed) {
        return { label: "Verified by Partner", color: "text-report-primary bg-report-primary-soft border-report-primary-border", desc: "External confirmation included" };
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

    const update = (field: string, val: unknown) => updateSection('section8', { [field]: val });
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

    const autoNarrative = (() => {
        if (section8.summary_text && (section8.summary_text.length > 50 || !section8.summary_text.includes("The report includes"))) {
            return section8.summary_text;
        }

        const filesCount = evidence_files?.length || 0;
        if (filesCount === 0) return "Evidence statement will be generated once files are uploaded and classified.";
        const typeNames = evidence_types?.map((t: string) => t.split(' ')[0].toLowerCase()) || [];
        const typesStr = typeNames.length > 0 ? ` including ${typeNames.slice(0, 2).join(' and ')} documentation` : '';
        const ethicalStr = allEthicalChecked ? "Ethical compliance was fully confirmed." : "Ethical compliance checks are pending.";
        const partnerStr = partner_verification ? `External partner verification was provided via ${partner_verification_type || 'documentation'}.` : "External partner verification was not provided.";
        return `The report includes ${filesCount} supporting evidence ${filesCount === 1 ? 'file' : 'files'}${typesStr}. ${ethicalStr} ${partnerStr}`;
    })();

    useEffect(() => {
        if (section8.summary_text !== autoNarrative) {
            updateSection('section8', { summary_text: autoNarrative });
        }
    }, [autoNarrative, section8.summary_text, updateSection]);





    return (
        <div className="space-y-5 pb-10">
            {/* ─── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-center gap-4">

                <div className="w-14 h-14 rounded-xl bg-report-primary text-white flex items-center justify-center shadow-md ring-4 ring-report-primary-soft">
                    <ShieldCheck className="w-7 h-7" />
                </div>

                <div className="space-y-0.5">

                    <h2 className="text-xl font-semibold text-slate-900">
                        Section 8 — Evidence & Verification
                    </h2>

                    <p className="text-sm text-slate-500">
                        Proof of Activity & Credibility Layer
                    </p>

                </div>

            </div>
            {/* ─── Purpose note ────────────────────────────────────────────── */}
            <div className="p-4 bg-report-primary-soft border border-report-primary-border rounded-xl flex items-start gap-3">
                <Info className="w-5 h-5 text-report-primary shrink-0 mt-0.5" />

                <div className="space-y-1">
                    <p className="text-sm font-semibold text-report-primary">
                        This section confirms that your reported work is Verifiable, Ethical, Traceable, and Audit-ready.
                    </p>

                    <p className="text-sm text-report-primary">
                        It strengthens your report for University documentation, HEC audit, QS impact submissions,
                        Government reporting, and SDG contribution validation. This is the credibility layer of your project.
                    </p>
                </div>
            </div>



            {/* ─── Step 1: Evidence Submission ───────────────────── */}
            <div className="space-y-6">

                <div className="flex items-center gap-3">

                    <div className="w-8 h-8 rounded-full bg-report-primary text-white flex items-center justify-center text-[11px] font-semibold">
                        8.1
                    </div>

                    <h3 className="text-base font-semibold text-slate-900">
                        Step 1 — Upload Evidence (Mandatory)
                    </h3>

                </div>



                <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-6">

                    <div className="space-y-1">
                        <Label className="text-sm font-semibold text-slate-800">
                            Do you have evidence to upload?
                        </Label>

                        <p className="text-sm text-slate-500">
                            Selecting &quot;No&quot; will bypass evidence requirements, but may affect report credibility.
                        </p>
                    </div>



                    {/* OPTION BUTTONS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        <button
                            type="button"
                            onClick={() => update('has_evidence', 'no')}
                            className={clsx(
                                "p-5 rounded-lg border text-left transition",
                                section8.has_evidence === 'no'
                                    ? "border-amber-500 bg-amber-50"
                                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-400"
                            )}
                        >
                            <p className={clsx(
                                "text-sm font-semibold",
                                section8.has_evidence === 'no'
                                    ? "text-amber-700"
                                    : "text-slate-700"
                            )}>
                                No — I do not have evidence
                            </p>
                        </button>



                        <button
                            type="button"
                            onClick={() => update('has_evidence', 'yes')}
                            className={clsx(
                                "p-5 rounded-lg border text-left transition",
                                section8.has_evidence === 'yes'
                                    ? "border-report-primary bg-report-primary-soft"
                                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-report-primary"
                            )}
                        >
                            <p className={clsx(
                                "text-sm font-semibold",
                                section8.has_evidence === 'yes'
                                    ? "text-report-primary"
                                    : "text-slate-700"
                            )}>
                                Yes — I have evidence to upload
                            </p>
                        </button>

                    </div>



                    {section8.has_evidence === 'yes' && (
                        <>

                            {/* GUIDELINES */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-slate-50 rounded-lg border border-slate-200">

                                <div className="space-y-2">

                                    <p className="text-xs font-semibold text-slate-600 uppercase">
                                        Accepted Formats
                                    </p>

                                    <ul className="text-sm text-slate-500 space-y-1 list-disc list-inside">
                                        <li>JPG / PNG (Photos)</li>
                                        <li>MP4 (Short videos)</li>
                                        <li>PDF (Attendance sheets, reports, documents)</li>
                                        <li>Official letters & email confirmations</li>
                                        <li>Media coverage links</li>
                                    </ul>

                                </div>



                                <div className="space-y-2">

                                    <p className="text-xs font-semibold text-slate-600 uppercase">
                                        Evidence Should Show
                                    </p>

                                    <ul className="text-sm text-slate-500 space-y-1 list-disc list-inside">
                                        <li>The activity took place</li>
                                        <li>You participated</li>
                                        <li>Beneficiaries were engaged</li>
                                        <li>Outputs were delivered</li>
                                    </ul>

                                    <p className="text-xs font-semibold text-red-500 flex items-center gap-1 mt-2">
                                        <AlertCircle className="w-3 h-3" /> Do not upload unrelated material
                                    </p>

                                </div>

                            </div>



                            {/* FILE UPLOAD */}
                            <FileUpload
                                label="Drag & drop files or click to browse (images max 5 MB)"
                                multiple
                                accept=".jpg,.jpeg,.png,.mp4,.pdf,.doc,.docx"
                                onChange={(e) => {
                                    if (e.target.files) {
                                        const acceptedFiles = filterOversizedImages(Array.from(e.target.files), e.currentTarget);
                                        if (!acceptedFiles.length) return;
                                        update('evidence_files', [
                                            ...(evidence_files || []),
                                            ...acceptedFiles.map(toEvidenceFileItem)
                                        ])
                                    }
                                }}
                            />

                            <FieldError message={getFieldError('section8.evidence_files')} />



                            {/* FILE LIST */}
                            {evidence_files && evidence_files.length > 0 && (
                                <div className="space-y-3">

                                    <Label className="text-sm font-semibold text-slate-700">
                                        Attached Evidence ({evidence_files.length})
                                    </Label>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                                        {evidence_files.map((file: EvidenceFileItem, fIdx: number) => {
                                            const fileName = getFileName(file, fIdx);

                                            return (
                                                <div
                                                    key={`${fileName}-${fIdx}`}
                                                    className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg"
                                                >

                                                    <div className="flex items-center gap-3 overflow-hidden">

                                                        <EvidenceFilePreview file={file} name={fileName} />

                                                        <div className="overflow-hidden">

                                                            <p className="text-sm font-semibold text-slate-700 truncate">
                                                                {fileName}
                                                            </p>

                                                            <p className="text-xs text-slate-400">
                                                                {formatFileSize(file)}
                                                            </p>

                                                        </div>

                                                    </div>



                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const kept = evidence_files.filter((_: EvidenceFileItem, i: number) => i !== fIdx)
                                                            update('evidence_files', kept)
                                                        }}
                                                        className="w-7 h-7 rounded-md bg-white border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-500 transition"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>

                                                </div>
                                            );
                                        })}

                                    </div>

                                </div>
                            )}



                            {/* STATUS */}
                            <div className="flex items-center justify-between pt-2">

                                <span className="text-xs text-slate-500">
                                    Upload Status
                                </span>

                                {evidence_files?.length ? (
                                    <span className="text-xs font-semibold text-report-primary bg-report-primary-soft px-3 py-1 rounded-md flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        {evidence_files.length} Files Attached
                                    </span>
                                ) : (
                                    <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1 rounded-md flex items-center gap-1">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        Missing Evidence
                                    </span>
                                )}

                            </div>

                        </>
                    )}

                </div>

            </div>

            {/* ─── Step 2: Classify Evidence ─────────────────────────────────── */}
            <div className="space-y-6">

                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-report-primary text-white flex items-center justify-center text-[11px] font-semibold">
                        8.2
                    </div>
                    <h3 className="text-base font-semibold text-slate-900">
                        Step 2 — Classify the Evidence (Required)
                    </h3>
                </div>


                <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-6">

                    <div className="space-y-1">
                        <Label className="text-sm font-semibold text-slate-800">
                            Evidence Type
                        </Label>

                        <p className="text-sm text-slate-500">
                            Select all categories that apply (at least one required).
                        </p>
                    </div>


                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                        {evidenceOptions.map(opt => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => toggleEvidenceType(opt.id)}
                                className={clsx(
                                    "flex items-center gap-3 px-4 py-3 rounded-lg border transition text-left",
                                    (evidence_types || []).includes(opt.id)
                                        ? "border-report-primary bg-report-primary-soft text-report-primary"
                                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-report-primary"
                                )}
                            >

                                <div
                                    className={clsx(
                                        "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                                        (evidence_types || []).includes(opt.id)
                                            ? "bg-report-primary border-report-primary"
                                            : "border-slate-300 bg-white"
                                    )}
                                >
                                    {(evidence_types || []).includes(opt.id) &&
                                        <CheckCircle2 className="w-3 h-3 text-white" />
                                    }
                                </div>

                                <opt.icon className="w-4 h-4 opacity-60 shrink-0" />

                                <span className="text-sm font-medium">
                                    {opt.id}
                                </span>

                            </button>
                        ))}

                    </div>

                    <FieldError message={getFieldError('section8.evidence_types')} />

                </div>

            </div>



            {/* ─── Step 3: Describe Evidence ─────────────────────────────────── */}
            <div className="space-y-6">

                <div className="flex items-center gap-3">

                    <div className="w-8 h-8 rounded-full bg-report-primary text-white flex items-center justify-center text-[11px] font-semibold">
                        8.3
                    </div>

                    <h3 className="text-base font-semibold text-slate-900">
                        Step 3 — Describe the Evidence
                    </h3>

                </div>



                <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-6">

                    <div className="space-y-1">

                        <Label className="text-sm font-semibold text-slate-800">
                            Evidence Description (Mandatory)
                        </Label>

                        <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
                            Briefly explain what this evidence shows, how it relates to your activity,
                            and what it verifies (attendance, outputs, outcomes, resource use).
                        </p>

                    </div>



                    <textarea spellCheck={true}
                        placeholder="Example: The uploaded photos show students conducting hygiene awareness sessions at a community school. The attendance sheet confirms 60 participants across three sessions. The presentation slides demonstrate the structured content delivered."
                        value={description}
                        onChange={e => update('description', e.target.value)}
                        rows={4}
                        className="w-full min-h-[140px] bg-slate-50 border border-slate-200 rounded-lg px-5 py-4 text-sm text-slate-700 outline-none focus:border-report-primary transition resize-none"
                    />



                    <div className="flex items-center justify-between">

                        <span
                            className={clsx(
                                "text-xs font-medium",
                                wordCount >= 100 && wordCount <= 200
                                    ? "text-report-primary"
                                    : wordCount > 200
                                        ? "text-red-500"
                                        : "text-amber-600"
                            )}
                        >
                            {wordCount} / 200 words (Min 100)
                        </span>


                        {wordCount >= 100 && wordCount <= 200 && (
                            <span className="text-xs font-semibold text-report-primary flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Valid length
                            </span>
                        )}

                    </div>



                    <FieldError message={getFieldError('section8.description')} />

                </div>

            </div>
            {/* ─── Step 4: Ethical Compliance ────────────────────────────────── */}
            <div className="space-y-6">

                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-report-primary text-white flex items-center justify-center text-[11px] font-semibold">
                        8.4
                    </div>
                    <h3 className="text-base font-semibold text-slate-900">
                        Step 4 — Ethical & Consent Confirmation
                    </h3>
                </div>


                <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-6">

                    <div className="space-y-1">

                        <Label className="text-sm font-semibold text-slate-800">
                            Ethical Declaration (All required)
                        </Label>

                        <p className="text-sm text-report-primary flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            False or misleading submissions may result in rejection and institutional action.
                        </p>

                    </div>



                    <div className="grid gap-3">

                        {ethicalOptions.map(opt => {

                            const isChecked = !!ethical_compliance?.[opt.key as keyof typeof ethical_compliance];

                            return (
                                <button
                                    key={opt.key}
                                    type="button"
                                    onClick={() => updateEthical(opt.key, !isChecked)}
                                    className={clsx(
                                        "flex items-start gap-4 px-5 py-4 rounded-lg border transition text-left",
                                        isChecked
                                            ? "border-report-primary bg-report-primary-soft"
                                            : "border-slate-200 bg-slate-50 hover:border-slate-400"
                                    )}
                                >

                                    <div
                                        className={clsx(
                                            "w-5 h-5 rounded border flex items-center justify-center mt-0.5",
                                            isChecked
                                                ? "bg-report-primary border-report-primary"
                                                : "border-slate-300 bg-white"
                                        )}
                                    >
                                        {isChecked && <CheckCircle2 className="w-4 h-4 text-white" />}
                                    </div>


                                    <p className="text-sm font-medium text-slate-800">
                                        {opt.desc}
                                    </p>

                                </button>
                            );

                        })}

                    </div>

                </div>

            </div>



            {/* ─── Step 5: Visibility Preference ─────────────────────────────── */}
            <div className="space-y-6">

                <div className="flex items-center gap-3">

                    <div className="w-8 h-8 rounded-full bg-report-primary text-white flex items-center justify-center text-[11px] font-semibold">
                        8.5
                    </div>

                    <h3 className="text-base font-semibold text-slate-900">
                        Step 5 — Media Visibility Preference
                    </h3>

                </div>



                <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-6">

                    <Label className="text-sm font-semibold text-slate-800">
                        Evidence Usage Permission
                    </Label>



                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                        {visibilityOptions.map(opt => (

                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => update('media_visible', opt.id)}
                                className={clsx(
                                    "p-5 rounded-lg border text-left transition relative overflow-hidden",
                                    media_visible === opt.id
                                        ? opt.color
                                        : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-400"
                                )}
                            >

                                <div className="flex items-center gap-3 mb-2">
                                    <opt.icon className="w-5 h-5" />
                                    <p className="text-sm font-semibold">
                                        {opt.label}
                                    </p>
                                </div>

                                <p className="text-xs opacity-80 leading-relaxed">
                                    {opt.desc}
                                </p>


                                {media_visible === opt.id && (
                                    <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-current animate-pulse" />
                                )}

                            </button>

                        ))}

                    </div>

                    <FieldError message={getFieldError('section8.media_visible')} />

                </div>

            </div>

            {/* ─── Step 6: External Confirmation ─────────────────────────────── */}
            <div className="space-y-6">

                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-report-primary text-white flex items-center justify-center text-[11px] font-semibold">
                        8.6
                    </div>

                    <h3 className="text-base font-semibold text-slate-900">
                        Step 6 — Partner Verification (Optional)
                    </h3>
                </div>


                <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-6">

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">

                        <div className="space-y-1">
                            <Label className="text-sm font-semibold text-slate-800">
                                Did a partner verify this project?
                            </Label>

                            <p className="text-sm text-slate-500">
                                External verification significantly strengthens credibility.
                            </p>
                        </div>


                        <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200 gap-1 min-w-[200px]">

                            <button
                                type="button"
                                onClick={() => update('partner_verification', false)}
                                className={clsx(
                                    "flex-1 py-2 text-xs font-semibold rounded-md transition",
                                    !partner_verification
                                        ? "bg-white text-slate-900 shadow"
                                        : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                No
                            </button>

                            <button
                                type="button"
                                onClick={() => update('partner_verification', true)}
                                className={clsx(
                                    "flex-1 py-2 text-xs font-semibold rounded-md transition",
                                    partner_verification
                                        ? "bg-report-primary text-white"
                                        : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                Yes
                            </button>

                        </div>

                    </div>



                    {partner_verification && (
                        <div className="pt-6 border-t border-slate-200 space-y-6">

                            <div className="space-y-2">

                                <Label className="text-sm font-semibold text-slate-700">
                                    Verification Type
                                </Label>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">

                                    {verificationTypes.map(v => (
                                        <button
                                            key={v}
                                            type="button"
                                            onClick={() => update('partner_verification_type', v)}
                                            className={clsx(
                                                "px-3 py-2 text-xs rounded-md border transition",
                                                partner_verification_type === v
                                                    ? "border-report-primary bg-report-primary-soft text-report-primary"
                                                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-400"
                                            )}
                                        >
                                            {v}
                                        </button>
                                    ))}

                                </div>

                            </div>



                            <FileUpload
                                label="Upload Partner Verification Letter / Document (images max 5 MB)"
                                multiple
                                accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                                onChange={(e) => {
                                    if (e.target.files) {
                                        const acceptedFiles = filterOversizedImages(Array.from(e.target.files), e.currentTarget);
                                        if (!acceptedFiles.length) return;
                                        update(
                                            'partner_verification_files',
                                            [...(partner_verification_files || []), ...acceptedFiles.map(toEvidenceFileItem)]
                                        );
                                    }
                                }}
                            />


                            {partner_verification_files && partner_verification_files.length > 0 && (

                                <div className="space-y-3">

                                    <Label className="text-sm font-semibold text-slate-700">
                                        Partner Documents ({partner_verification_files.length})
                                    </Label>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                                        {partner_verification_files.map((file: EvidenceFileItem, fIdx: number) => {
                                            const fileName = getFileName(file, fIdx);

                                            return (
                                                <div
                                                    key={`${fileName}-${fIdx}`}
                                                    className="flex items-center justify-between p-3 bg-report-primary-soft border border-report-primary-border rounded-lg"
                                                >

                                                    <div className="flex items-center gap-3 overflow-hidden">

                                                        <div className="w-8 h-8 rounded-md bg-white text-report-primary flex items-center justify-center shrink-0">
                                                            <FileText className="w-4 h-4" />
                                                        </div>

                                                        <div className="overflow-hidden">
                                                            <p className="text-sm font-semibold text-report-primary truncate">
                                                                {fileName}
                                                            </p>

                                                            <p className="text-xs text-report-primary-border">
                                                                {formatFileSize(file)}
                                                            </p>
                                                        </div>

                                                    </div>



                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const kept = partner_verification_files.filter((_: EvidenceFileItem, i: number) => i !== fIdx);
                                                            update('partner_verification_files', kept);
                                                        }}
                                                        className="w-7 h-7 rounded-md bg-white text-slate-400 hover:bg-red-50 hover:text-red-500 border border-report-primary-border flex items-center justify-center"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>

                                                </div>
                                            );
                                        })}


                                    </div>

                                </div>

                            )}

                        </div>
                    )}

                </div>

            </div>
            {/* ─── System Evidence Status ────────────────────────────── */}
            <div className="pt-10 border-t border-slate-200 space-y-6">

                <div className="flex items-center justify-between">

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-report-primary text-white flex items-center justify-center">
                            <ShieldCheck className="w-5 h-5" />
                        </div>

                        <h3 className="text-lg font-semibold text-slate-900">
                            System-Generated Evidence Status
                        </h3>
                    </div>

                    <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded">
                        Read-Only
                    </span>

                </div>



                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                    <div className="md:col-span-8 bg-white border border-slate-200 rounded-xl p-8 space-y-6">

                        <p className="text-xs text-slate-400 uppercase">
                            Evidence Profile
                        </p>

                        <div className="grid grid-cols-2 gap-4">

                            <div className="bg-report-primary-soft rounded-lg p-5">
                                <p className="report-h3 !text-2xl">
                                    {evidence_files?.length || 0}
                                </p>
                                <p className="text-xs text-report-primary-border">
                                    Files Submitted
                                </p>
                            </div>

                            <div className="bg-report-primary-soft rounded-lg p-5">
                                <p className="report-h3 !text-2xl">
                                    {evidence_types?.length || 0}
                                </p>
                                <p className="text-xs text-report-primary-border">
                                    Types Covered
                                </p>
                            </div>

                            <div className={clsx("rounded-lg p-5", allEthicalChecked ? "bg-report-primary-soft" : "bg-amber-50")}>
                                <p className={clsx("report-h3 !text-2xl", allEthicalChecked ? "text-report-primary" : "text-amber-700")}>
                                    {allEthicalChecked ? "Yes" : "No"}
                                </p>
                                <p className="text-xs text-slate-500">
                                    Ethical Confirmed
                                </p>
                            </div>

                            <div className={clsx("rounded-lg p-5", partner_verification ? "bg-report-primary-soft" : "bg-slate-50")}>
                                <p className={clsx("report-h3 !text-2xl", partner_verification ? "text-report-primary" : "text-slate-900")}>
                                    {partner_verification ? "Verified" : "None"}
                                </p>
                                <p className="text-xs text-slate-500">
                                    Partner Status
                                </p>
                            </div>

                        </div>

                    </div>



                    <div className="md:col-span-4">

                        <div className={clsx("rounded-xl border p-8 text-center space-y-2", classification.color)}>
                            <ShieldCheck className="w-7 h-7 mx-auto opacity-70" />

                            <p className="text-xs opacity-60">
                                Verification Strength
                            </p>

                            <p className="text-lg font-semibold uppercase">
                                {classification.label}
                            </p>

                            <p className="text-xs opacity-70">
                                {classification.desc}
                            </p>

                        </div>

                    </div>

                </div>

            </div>
            {/* ─── Auto-Generated Summary ────────────────────────────── */}
            <div className="pt-12 border-t border-slate-200">

                <div className="flex items-center justify-between mb-6">

                    <div className="flex items-center gap-3">

                        <div className="w-10 h-10 rounded-lg bg-report-primary text-white flex items-center justify-center">
                            <ShieldCheck className="w-5 h-5" />
                        </div>

                        <h3 className="text-lg font-semibold text-slate-900">
                            Evidence Summary
                        </h3>

                    </div>

                    <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded">
                        Auto-Generated
                    </span>

                </div>



                <div className="bg-white border border-slate-200 rounded-xl p-8 relative overflow-hidden">

                    <div className="absolute -bottom-10 -right-10 opacity-5 rotate-12">
                        <ShieldCheck className="w-64 h-64 text-slate-900" />
                    </div>


                    <div className="relative z-10">

                        <p className="text-sm text-slate-700 leading-relaxed">
                            {autoNarrative}
                        </p>

                    </div>

                </div>

            </div>
            
        </div>
    );
}
