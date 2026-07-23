import React, { useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
    ShieldCheck, Camera, FileUp, Globe, FileText, Lock, CheckCircle2,
    Info, AlertCircle, Activity, Image as ImageIcon, Users, BookOpen, Trash2,
} from "lucide-react";
import { Label } from "./ui/label";
import { FileUpload } from "./ui/file-upload";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import clsx from "clsx";
import { MAX_REPORT_UPLOAD_LABEL, splitReportFilesByImageSize } from "../utils/fileUploadLimits";
import { REPORT_ATTACHMENT_ACCEPT } from "@/utils/reportAttachmentAccept";

// ─── Static configuration ───────────────────────────────────────────────────
const evidenceOptions = [
    { id: "Activity photos (with consent)", icon: ImageIcon },
    { id: "Attendance sheet", icon: Users },
    { id: "Training materials / presentations", icon: BookOpen },
    { id: "Partner confirmation letter or email", icon: FileText },
    { id: "Survey results / feedback data", icon: Activity },
    { id: "Media coverage", icon: Globe },
    { id: "Resource delivery proof", icon: ShieldCheck },
    { id: "Other supporting document", icon: FileUp },
];

const ethicalOptions = [
    { key: "authentic", label: "Authentic & Relevant", desc: "The evidence is authentic and directly related to this project" },
    { key: "informed_consent", label: "Informed Consent", desc: "Informed consent was obtained where required" },
    { key: "no_harm", label: "Non-Maleficence", desc: "No harm, exploitation, or misrepresentation is shown" },
    { key: "privacy_respected", label: "Privacy & Dignity", desc: "Privacy and dignity of beneficiaries were respected" },
];

const visibilityOptions = [
    {
        id: "public",
        label: "Public",
        desc: "May be used on website, social media, and public reports",
        icon: Globe,
    },
    {
        id: "limited",
        label: "Limited",
        desc: "Institutional reports and presentations only",
        icon: Users,
    },
    {
        id: "internal",
        label: "Internal",
        desc: "Verification purposes only",
        icon: Lock,
    },
];

const verificationTypes = [
    "Signed letter",
    "Official email confirmation",
    "Attendance verification",
    "Institutional stamp or seal",
];

const textareaClasses =
    "min-h-[140px] w-full min-w-0 resize-y rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium leading-relaxed text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100";
const fieldLabel =
    "text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500";

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
    lastModified: file.lastModified,
});

function filterOversizedImages(files: File[], input: HTMLInputElement): File[] {
    const { accepted, rejected } = splitReportFilesByImageSize(files);
    if (rejected.length > 0) {
        toast.error(`Each file must be ${MAX_REPORT_UPLOAD_LABEL} or smaller: ${rejected.map((file) => file.name).join(", ")}`);
        input.value = "";
    }
    return accepted;
}

const isNativeFile = (file: EvidenceFileItem): file is File => (
    typeof File !== "undefined" && file instanceof File
);

const isEvidenceFileRecord = (
    file: EvidenceFileItem
): file is Exclude<EvidenceFileItem, File | string> => (
    typeof file === "object" && file !== null && !isNativeFile(file)
);

const getFileName = (file: EvidenceFileItem, index: number) => {
    if (typeof file === "string") return file.split("/").pop() || `Evidence file ${index + 1}`;
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
    if (typeof file === "string") return undefined;
    if (isNativeFile(file)) return Number.isFinite(file.size) ? file.size : undefined;
    if (!isEvidenceFileRecord(file)) return undefined;
    const size = file?.size ?? file?.bytes ?? file?.file_size ?? file?.size_bytes ?? file?.file?.size;
    return typeof size === "number" && Number.isFinite(size) ? size : undefined;
};

const formatFileSize = (file: EvidenceFileItem) => {
    const size = getFileSize(file);
    return typeof size === "number" ? `${(size / (1024 * 1024)).toFixed(2)} MB` : "Size unavailable";
};

const getFileType = (file: EvidenceFileItem) => {
    if (typeof file === "string") return "";
    if (isNativeFile(file)) return file.type || "";
    if (!isEvidenceFileRecord(file)) return "";
    return file?.type || file?.mimeType || file?.mimetype || file?.file?.type || "";
};

function EvidenceFilePreview({ file, name }: { file: EvidenceFileItem; name: string }) {
    const directUrl = typeof file === "string" ? file : isEvidenceFileRecord(file) ? file?.url || file?.path : undefined;
    const isImage = getFileType(file).startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(name);
    const previewUrl = isImage ? directUrl : null;

    if (isImage && previewUrl) {
        return (
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                <img src={previewUrl} alt={name} className="h-full w-full object-cover" />
            </div>
        );
    }

    return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
            <ImageIcon className="h-4 w-4" />
        </div>
    );
}

function classifyVerification(filesCount: number, typesCount: number, partnerAssessed: boolean): {
    label: string; color: string; desc: string;
} {
    if (partnerAssessed) {
        return {
            label: "Verified by Partner",
            color: "border-indigo-200 bg-indigo-50 text-indigo-800",
            desc: "External confirmation included",
        };
    }
    if (filesCount > 1 && typesCount > 1) {
        return {
            label: "Structured Verification",
            color: "border-blue-200 bg-blue-50 text-blue-800",
            desc: "Multiple evidence types, documented outputs",
        };
    }
    return {
        label: "Basic Verification",
        color: "border-amber-200 bg-amber-50 text-amber-800",
        desc: "Single file, limited documentation",
    };
}

function StepHeader({ n, title }: { n: string; title: string }) {
    return (
        <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                {n}
            </span>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Section8Evidence() {
    const { data, updateSection, getFieldError } = useReportForm();
    const section8 = data.section8 || {};
    const {
        evidence_types = [],
        evidence_files = [],
        description = "",
        linked_items = [],
        ethical_compliance = {},
        media_visible = "",
        partner_verification = false,
        partner_verification_type = "",
        partner_verification_files = [],
    } = section8;

    const update = (field: string, val: unknown) => updateSection("section8", { [field]: val });
    const toggleEvidenceType = (type: string) => {
        const cur = evidence_types || [];
        update("evidence_types", cur.includes(type) ? cur.filter((t) => t !== type) : [...cur, type]);
    };
    const updateEthical = (key: string, val: boolean) => {
        update("ethical_compliance", { ...ethical_compliance, [key]: val });
    };
    const toggleLinkedItem = (item: string) => {
        const cur = linked_items || [];
        update("linked_items", cur.includes(item) ? cur.filter((t) => t !== item) : [...cur, item]);
    };

    const wordCount = (description || "").trim().split(/\s+/).filter((w) => w.length > 0).length;
    const allEthicalChecked =
        Object.values(ethical_compliance || {}).every((v) => v === true) &&
        Object.keys(ethical_compliance || {}).length === 4;

    const linkOptions = useMemo(() => {
        const activityTitles = (data.section4?.activity_blocks || [])
            .map((b) => (b.title || "").trim())
            .filter(Boolean);
        const outcomeLabels = (data.section5?.measurable_outcomes || [])
            .map((o) => {
                const area = (o.outcome_area_other || o.outcome_area || "").trim();
                const metric = (o.metric_other || o.metric || "").trim();
                if (area && metric) return `${area}: ${metric}`;
                return area || metric;
            })
            .filter(Boolean);
        return Array.from(new Set([...activityTitles, ...outcomeLabels]));
    }, [data.section4?.activity_blocks, data.section5?.measurable_outcomes]);

    const classification = classifyVerification(
        evidence_files?.length || 0,
        evidence_types?.length || 0,
        partner_verification && !!partner_verification_type,
    );

    const autoNarrative = (() => {
        if (section8.summary_text && (section8.summary_text.length > 50 || !section8.summary_text.includes("The report includes"))) {
            return section8.summary_text;
        }

        const filesCount = evidence_files?.length || 0;
        if (filesCount === 0) return "Evidence statement will be generated once files are uploaded and classified.";
        const typeNames = evidence_types?.map((t: string) => t.split(" ")[0].toLowerCase()) || [];
        const typesStr = typeNames.length > 0 ? ` including ${typeNames.slice(0, 2).join(" and ")} documentation` : "";
        const ethicalStr = allEthicalChecked ? "Ethical compliance was fully confirmed." : "Ethical compliance checks are pending.";
        const partnerStr = partner_verification
            ? `External partner verification was provided via ${partner_verification_type || "documentation"}.`
            : "External partner verification was not provided.";
        return `The report includes ${filesCount} supporting evidence ${filesCount === 1 ? "file" : "files"}${typesStr}. ${ethicalStr} ${partnerStr}`;
    })();

    useEffect(() => {
        if (section8.summary_text !== autoNarrative) {
            updateSection("section8", { summary_text: autoNarrative });
        }
    }, [autoNarrative, section8.summary_text, updateSection]);

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="space-y-4">
                <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm">
                        <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                            <span className="text-indigo-600">SECTION 8:</span> Evidence &amp; verification
                        </h2>
                    </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3.5 sm:px-5">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                    <div>
                        <p className="text-sm font-semibold text-indigo-900">
                            This section confirms that your reported work is verifiable, ethical, and audit-ready.
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-indigo-900/80">
                            It strengthens your report for university documentation, HEC audit, QS impact submissions,
                            government reporting, and SDG contribution validation. This is the credibility layer of your project.
                        </p>
                    </div>
                </div>
            </div>

            {/* 8.1 Upload evidence */}
            <section className="space-y-4">
                <StepHeader n="8.1" title="Step 1 — Upload evidence (mandatory)" />

                <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div>
                        <Label className={fieldLabel}>Do you have evidence to upload?</Label>
                        <p className="mt-1.5 text-sm text-slate-500">
                            Selecting &ldquo;No&rdquo; will bypass evidence requirements, but may affect report credibility.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <button
                            type="button"
                            onClick={() => update("has_evidence", "no")}
                            className={clsx(
                                "rounded-xl border p-5 text-left transition-colors",
                                section8.has_evidence === "no"
                                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                            )}
                        >
                            <p className="text-sm font-semibold">No — I do not have evidence</p>
                            <p className={clsx(
                                "mt-1.5 text-xs leading-relaxed",
                                section8.has_evidence === "no" ? "text-slate-300" : "text-slate-500",
                            )}>
                                Evidence requirements will be skipped for this report.
                            </p>
                        </button>

                        <button
                            type="button"
                            onClick={() => update("has_evidence", "yes")}
                            className={clsx(
                                "rounded-xl border p-5 text-left transition-colors",
                                section8.has_evidence === "yes"
                                    ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40",
                            )}
                        >
                            <p className="text-sm font-semibold">Yes — I have evidence to upload</p>
                            <p className={clsx(
                                "mt-1.5 text-xs leading-relaxed",
                                section8.has_evidence === "yes" ? "text-indigo-100" : "text-slate-500",
                            )}>
                                Continue below to upload and classify your files.
                            </p>
                        </button>
                    </div>

                    {section8.has_evidence === "yes" && (
                        <>
                            <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:grid-cols-2 sm:p-5">
                                <div className="space-y-2">
                                    <p className={fieldLabel}>Accepted formats</p>
                                    <ul className="space-y-1 text-sm text-slate-600">
                                        <li>JPG, PNG, WebP, HEIC — phone photos supported</li>
                                        <li>PDF — attendance sheets and scans</li>
                                        <li>Video — MP4, MOV, WebM (up to 500 MB)</li>
                                        <li>Word (.doc/.docx) — letters and confirmations</li>
                                    </ul>
                                </div>
                                <div className="space-y-2">
                                    <p className={fieldLabel}>Evidence should show</p>
                                    <ul className="space-y-1 text-sm text-slate-600">
                                        <li>The activity took place</li>
                                        <li>You participated</li>
                                        <li>Beneficiaries were engaged</li>
                                        <li>Outputs were delivered</li>
                                    </ul>
                                    <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-red-500">
                                        <AlertCircle className="h-3.5 w-3.5" /> Do not upload unrelated material
                                    </p>
                                </div>
                            </div>

                            <FileUpload
                                label={`Drag & drop files or click to browse (max ${MAX_REPORT_UPLOAD_LABEL} per file)`}
                                multiple
                                accept={REPORT_ATTACHMENT_ACCEPT}
                                onChange={(e) => {
                                    if (e.target.files) {
                                        const acceptedFiles = filterOversizedImages(Array.from(e.target.files), e.currentTarget);
                                        if (!acceptedFiles.length) return;
                                        update("evidence_files", [
                                            ...(evidence_files || []),
                                            ...acceptedFiles.map(toEvidenceFileItem),
                                        ]);
                                    }
                                }}
                            />

                            <FieldError message={getFieldError("section8.evidence_files")} />

                            {evidence_files && evidence_files.length > 0 && (
                                <div className="space-y-3">
                                    <Label className={fieldLabel}>
                                        Attached evidence ({evidence_files.length})
                                    </Label>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        {evidence_files.map((file: EvidenceFileItem, fIdx: number) => {
                                            const fileName = getFileName(file, fIdx);
                                            return (
                                                <div
                                                    key={`${fileName}-${fIdx}`}
                                                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3"
                                                >
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <EvidenceFilePreview file={file} name={fileName} />
                                                        <div className="overflow-hidden">
                                                            <p className="truncate text-sm font-semibold text-slate-700">
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
                                                            const kept = evidence_files.filter((_: EvidenceFileItem, i: number) => i !== fIdx);
                                                            update("evidence_files", kept);
                                                        }}
                                                        className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                                <span className="text-xs text-slate-500">Upload status</span>
                                {evidence_files?.length ? (
                                    <span className="flex items-center gap-1 rounded-md bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        {evidence_files.length} files attached
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 rounded-md bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                        <Camera className="h-3.5 w-3.5" />
                                        No files yet
                                    </span>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </section>

            {/* 8.2 Classify */}
            <section className="space-y-4">
                <StepHeader n="8.2" title="Step 2 — Classify the evidence (required)" />

                <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div>
                        <Label className={fieldLabel}>Evidence type</Label>
                        <p className="mt-1.5 text-sm text-slate-500">
                            Select all categories that apply (at least one required).
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {evidenceOptions.map((opt) => {
                            const active = (evidence_types || []).includes(opt.id);
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => toggleEvidenceType(opt.id)}
                                    className={clsx(
                                        "flex items-center gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors",
                                        active
                                            ? "border-indigo-200 bg-indigo-50 text-indigo-800"
                                            : "border-slate-200 bg-white text-slate-600 hover:border-indigo-100 hover:bg-slate-50",
                                    )}
                                >
                                    <opt.icon className="h-4 w-4 shrink-0 opacity-70" />
                                    <span className="flex-1 text-sm font-medium">{opt.id}</span>
                                    <span
                                        className={clsx(
                                            "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                                            active
                                                ? "border-indigo-600 bg-indigo-600 text-white"
                                                : "border-slate-300 bg-white",
                                        )}
                                    >
                                        {active ? <CheckCircle2 className="h-3 w-3" /> : null}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <FieldError message={getFieldError("section8.evidence_types")} />

                    {linkOptions.length > 0 && (
                        <div className="space-y-3 border-t border-slate-100 pt-5">
                            <div>
                                <Label className={fieldLabel}>Link to activity / outcome (optional)</Label>
                                <p className="mt-1.5 text-sm text-slate-500">
                                    Tag this evidence to items from Sections 4 and 5.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {linkOptions.map((item) => {
                                    const active = (linked_items || []).includes(item);
                                    return (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => toggleLinkedItem(item)}
                                            className={clsx(
                                                "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                                                active
                                                    ? "border-indigo-600 bg-indigo-600 text-white"
                                                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/50",
                                            )}
                                        >
                                            {item}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* 8.3 Describe */}
            <section className="space-y-4">
                <StepHeader n="8.3" title="Step 3 — Describe the evidence" />

                <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div>
                        <Label className={fieldLabel}>Evidence description (mandatory)</Label>
                        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
                            Briefly explain what this evidence shows, how it relates to your activity,
                            and what it verifies (attendance, outputs, outcomes, resource use).
                        </p>
                    </div>

                    <textarea
                        spellCheck={true}
                        placeholder="Example: The uploaded photos show students conducting hygiene awareness sessions at a community school. The attendance sheet confirms 60 participants across three sessions. The presentation slides demonstrate the structured content delivered."
                        value={description}
                        onChange={(e) => update("description", e.target.value)}
                        rows={4}
                        className={textareaClasses}
                    />

                    <div className="flex items-center justify-between">
                        <span
                            className={clsx(
                                "text-xs font-medium",
                                wordCount >= 100 && wordCount <= 200
                                    ? "text-indigo-600"
                                    : wordCount > 200
                                        ? "text-red-500"
                                        : "text-amber-600",
                            )}
                        >
                            {wordCount} / 200 words (min 100)
                        </span>
                        {wordCount >= 100 && wordCount <= 200 && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-indigo-600">
                                <CheckCircle2 className="h-3 w-3" /> Valid length
                            </span>
                        )}
                    </div>

                    <FieldError message={getFieldError("section8.description")} />
                </div>
            </section>

            {/* 8.4 Ethical */}
            <section className="space-y-4">
                <StepHeader n="8.4" title="Step 4 — Ethical & consent confirmation" />

                <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div>
                        <Label className={fieldLabel}>Ethical declaration (all required)</Label>
                        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                            <p className="text-sm leading-relaxed text-amber-900">
                                False or misleading submissions may result in rejection and institutional action.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-2.5">
                        {ethicalOptions.map((opt) => {
                            const isChecked = !!ethical_compliance?.[opt.key as keyof typeof ethical_compliance];
                            return (
                                <button
                                    key={opt.key}
                                    type="button"
                                    onClick={() => updateEthical(opt.key, !isChecked)}
                                    className={clsx(
                                        "flex items-start gap-3.5 rounded-lg border px-4 py-3.5 text-left transition-colors",
                                        isChecked
                                            ? "border-indigo-200 bg-indigo-50"
                                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                                    )}
                                >
                                    <span
                                        className={clsx(
                                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                                            isChecked
                                                ? "border-indigo-600 bg-indigo-600 text-white"
                                                : "border-slate-300 bg-white",
                                        )}
                                    >
                                        {isChecked ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                                    </span>
                                    <p className="text-sm font-medium text-slate-800">{opt.desc}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* 8.5 Visibility */}
            <section className="space-y-4">
                <StepHeader n="8.5" title="Step 5 — Media visibility preference" />

                <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <Label className={fieldLabel}>Evidence usage permission</Label>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        {visibilityOptions.map((opt) => {
                            const active = media_visible === opt.id;
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => update("media_visible", opt.id)}
                                    className={clsx(
                                        "rounded-xl border p-5 text-left transition-colors",
                                        active
                                            ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                                            : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40",
                                    )}
                                >
                                    <div className="mb-2 flex items-center gap-2.5">
                                        <opt.icon className="h-5 w-5" />
                                        <p className="text-sm font-semibold">{opt.label}</p>
                                    </div>
                                    <p className={clsx(
                                        "text-xs leading-relaxed",
                                        active ? "text-indigo-100" : "text-slate-500",
                                    )}>
                                        {opt.desc}
                                    </p>
                                </button>
                            );
                        })}
                    </div>

                    <FieldError message={getFieldError("section8.media_visible")} />
                </div>
            </section>

            {/* 8.6 Partner verification */}
            <section className="space-y-4">
                <StepHeader n="8.6" title="Step 6 — Partner verification (optional)" />

                <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                        <div>
                            <Label className={fieldLabel}>Did a partner verify this project?</Label>
                            <p className="mt-1.5 text-sm text-slate-500">
                                External verification significantly strengthens credibility.
                            </p>
                        </div>

                        <div className="flex min-w-[200px] gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                            <button
                                type="button"
                                onClick={() => update("partner_verification", false)}
                                className={clsx(
                                    "flex-1 rounded-md py-2 text-xs font-semibold transition-colors",
                                    !partner_verification
                                        ? "bg-indigo-600 text-white shadow-sm"
                                        : "text-slate-400 hover:text-slate-600",
                                )}
                            >
                                No
                            </button>
                            <button
                                type="button"
                                onClick={() => update("partner_verification", true)}
                                className={clsx(
                                    "flex-1 rounded-md py-2 text-xs font-semibold transition-colors",
                                    partner_verification
                                        ? "bg-indigo-600 text-white shadow-sm"
                                        : "text-slate-400 hover:text-slate-600",
                                )}
                            >
                                Yes
                            </button>
                        </div>
                    </div>

                    {partner_verification && (
                        <div className="space-y-5 border-t border-slate-100 pt-5">
                            <div className="space-y-2">
                                <Label className={fieldLabel}>Verification type</Label>
                                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                                    {verificationTypes.map((v) => (
                                        <button
                                            key={v}
                                            type="button"
                                            onClick={() => update("partner_verification_type", v)}
                                            className={clsx(
                                                "rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors",
                                                partner_verification_type === v
                                                    ? "border-indigo-200 bg-indigo-50 text-indigo-800"
                                                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-100 hover:bg-slate-50",
                                            )}
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <FileUpload
                                label={`Upload partner verification (max ${MAX_REPORT_UPLOAD_LABEL} per file)`}
                                multiple
                                accept={REPORT_ATTACHMENT_ACCEPT}
                                onChange={(e) => {
                                    if (e.target.files) {
                                        const acceptedFiles = filterOversizedImages(Array.from(e.target.files), e.currentTarget);
                                        if (!acceptedFiles.length) return;
                                        update(
                                            "partner_verification_files",
                                            [...(partner_verification_files || []), ...acceptedFiles.map(toEvidenceFileItem)],
                                        );
                                    }
                                }}
                            />

                            {partner_verification_files && partner_verification_files.length > 0 && (
                                <div className="space-y-3">
                                    <Label className={fieldLabel}>
                                        Partner documents ({partner_verification_files.length})
                                    </Label>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        {partner_verification_files.map((file: EvidenceFileItem, fIdx: number) => {
                                            const fileName = getFileName(file, fIdx);
                                            return (
                                                <div
                                                    key={`${fileName}-${fIdx}`}
                                                    className="flex items-center justify-between rounded-lg border border-indigo-100 bg-indigo-50/70 p-3"
                                                >
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-indigo-600">
                                                            <FileText className="h-4 w-4" />
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <p className="truncate text-sm font-semibold text-indigo-900">
                                                                {fileName}
                                                            </p>
                                                            <p className="text-xs text-indigo-600/70">
                                                                {formatFileSize(file)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const kept = partner_verification_files.filter((_: EvidenceFileItem, i: number) => i !== fIdx);
                                                            update("partner_verification_files", kept);
                                                        }}
                                                        className="flex h-7 w-7 items-center justify-center rounded-md border border-indigo-100 bg-white text-slate-400 hover:bg-red-50 hover:text-red-500"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
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
            </section>

            {/* System evidence status */}
            <section className="space-y-4 border-t border-slate-200 pt-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
                            <ShieldCheck className="h-4 w-4" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-900">
                            System-generated evidence status
                        </h3>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Read-only
                    </span>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-8 sm:p-6">
                        <p className={fieldLabel}>Evidence profile</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg border border-indigo-100 bg-indigo-50/70 p-4">
                                <p className="text-2xl font-semibold text-indigo-700">{evidence_files?.length || 0}</p>
                                <p className="mt-1 text-xs text-indigo-600/80">Files submitted</p>
                            </div>
                            <div className="rounded-lg border border-indigo-100 bg-indigo-50/70 p-4">
                                <p className="text-2xl font-semibold text-indigo-700">{evidence_types?.length || 0}</p>
                                <p className="mt-1 text-xs text-indigo-600/80">Types covered</p>
                            </div>
                            <div className={clsx(
                                "rounded-lg border p-4",
                                allEthicalChecked
                                    ? "border-indigo-100 bg-indigo-50/70"
                                    : "border-amber-200 bg-amber-50",
                            )}>
                                <p className={clsx(
                                    "text-2xl font-semibold",
                                    allEthicalChecked ? "text-indigo-700" : "text-amber-700",
                                )}>
                                    {allEthicalChecked ? "Yes" : "No"}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">Ethical confirmed</p>
                            </div>
                            <div className={clsx(
                                "rounded-lg border p-4",
                                partner_verification
                                    ? "border-indigo-100 bg-indigo-50/70"
                                    : "border-slate-200 bg-slate-50",
                            )}>
                                <p className={clsx(
                                    "text-2xl font-semibold",
                                    partner_verification ? "text-indigo-700" : "text-slate-900",
                                )}>
                                    {partner_verification ? "Verified" : "None"}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">Partner status</p>
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-4">
                        <div className={clsx("space-y-2 rounded-xl border p-6 text-center", classification.color)}>
                            <ShieldCheck className="mx-auto h-7 w-7 opacity-70" />
                            <p className="text-xs opacity-60">Verification strength</p>
                            <p className="text-lg font-semibold uppercase">{classification.label}</p>
                            <p className="text-xs opacity-70">{classification.desc}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Auto summary */}
            <section className="space-y-4 border-t border-slate-200 pt-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
                            <ShieldCheck className="h-4 w-4" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-900">Evidence summary</h3>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Auto-generated
                    </span>
                </div>

                <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="absolute -bottom-10 -right-10 rotate-12 opacity-5">
                        <ShieldCheck className="h-64 w-64 text-slate-900" />
                    </div>
                    <p className="relative z-10 text-sm leading-relaxed text-slate-700">
                        {autoNarrative}
                    </p>
                </div>
            </section>
        </div>
    );
}
