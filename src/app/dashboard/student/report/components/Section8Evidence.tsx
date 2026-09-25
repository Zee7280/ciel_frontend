import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FileText, Image as ImageIcon, Trash2 } from "lucide-react";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import clsx from "clsx";
import { MAX_REPORT_UPLOAD_LABEL, splitReportFilesByImageSize } from "../utils/fileUploadLimits";
import { REPORT_ATTACHMENT_ACCEPT } from "@/utils/reportAttachmentAccept";
import { countWords } from "../utils/validation";

const EVIDENCE_TYPES = [
    { id: "Activity photos (with consent)", label: "📸 Activity photos (with consent)" },
    { id: "Attendance sheet", label: "📋 Attendance sheet" },
    { id: "Training materials / presentations", label: "🎓 Training materials" },
    { id: "Partner confirmation letter or email", label: "🤝 Partner confirmation letter" },
    { id: "Survey results / feedback data", label: "📊 Survey results / feedback" },
    { id: "Media coverage", label: "📰 Media coverage" },
    { id: "Resource delivery proof", label: "📦 Resource delivery proof" },
    { id: "Other supporting document", label: "✏️ Other supporting document" },
];

const OTHER_EVIDENCE_TYPE = "Other supporting document";

const visibilityOptions = [
    {
        id: "public" as const,
        label: "Public",
        emoji: "🌐",
        desc: "Website & public reports — only when consent and institutional policy permit.",
    },
    {
        id: "limited" as const,
        label: "Institutional",
        emoji: "🏛️",
        desc: "University & HEC only.",
    },
    {
        id: "internal" as const,
        label: "Private",
        emoji: "🔒",
        desc: "Verification only.",
    },
];

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

/** Resolves the raw `File`/`Blob` backing an evidence item, if any (covers both native File
 *  selections and the `{ file, name, ... }` records produced by `toEvidenceFileItem`). */
const getNativeFile = (file: EvidenceFileItem): File | Blob | undefined => {
    if (isNativeFile(file)) return file;
    if (isEvidenceFileRecord(file) && file.file instanceof File) return file.file;
    return undefined;
};

function useEvidencePreviewUrl(file: EvidenceFileItem, isImage: boolean): string | null {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!isImage) {
            setPreviewUrl(null);
            return;
        }
        const nativeFile = getNativeFile(file);
        if (nativeFile) {
            const url = URL.createObjectURL(nativeFile);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        }
        if (typeof file === "string") {
            setPreviewUrl(file);
            return;
        }
        if (isEvidenceFileRecord(file) && (file.url || file.path)) {
            setPreviewUrl(file.url || file.path || null);
            return;
        }
        setPreviewUrl(null);
    }, [file, isImage]);

    return previewUrl;
}

/** Renders the contents of a `.cer-ph` tile: the real image thumbnail when one is available,
 *  otherwise a generic icon — evidence is always shown as a picture tile, never a file-list row. */
function EvidenceFilePreview({ file, name }: { file: EvidenceFileItem; name: string }) {
    const isImage = getFileType(file).startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(name);
    const previewUrl = useEvidencePreviewUrl(file, isImage);

    if (isImage && previewUrl) {
        return <img src={previewUrl} alt={name} />;
    }

    if (isImage) {
        return <ImageIcon className="h-7 w-7 text-[var(--teal)]" />;
    }

    return <FileText className="h-7 w-7 text-[var(--teal)]" />;
}

function EvidenceFullFilePreview({ file, name }: { file: EvidenceFileItem; name: string }) {
    const isImage = getFileType(file).startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(name);
    const previewUrl = useEvidencePreviewUrl(file, isImage);

    if (isImage && previewUrl) {
        return (
            <img src={previewUrl} alt={name} className="max-h-[70vh] max-w-full rounded-lg object-contain" />
        );
    }

    return (
        <div className="flex flex-col items-center justify-center space-y-4 p-12 text-slate-400">
            <FileText className="h-16 w-16 text-slate-200" />
            <p className="text-sm font-semibold">Preview not available for this file type</p>
            <p className="text-xs text-slate-400">({name})</p>
        </div>
    );
}

function evidenceTypeOn(selected: string[], id: string) {
    return selected.some((value) => value === id || value.replace(/^✏️\s*/, "") === id);
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Section8Evidence() {
    const { data, updateSection, getFieldError } = useReportForm();
    const [previewFile, setPreviewFile] = useState<{ file: EvidenceFileItem; name: string } | null>(null);
    const section8 = data.section8 || {};
    const {
        evidence_types = [],
        evidence_files = [],
        description = "",
        ethical_compliance = {},
        media_visible = "",
    } = section8;
    const evidenceTypeOther = section8.evidence_type_other || "";
    const descriptionWords = countWords(description);
    const captionInRange = descriptionWords >= 10 && descriptionWords <= 45;

    const update = (field: string, val: unknown) => updateSection("section8", { [field]: val });
    const toggleEvidenceType = (type: string) => {
        const cur = evidence_types || [];
        const on = evidenceTypeOn(cur, type);
        const next = cur.filter((value) => value !== type && value.replace(/^✏️\s*/, "") !== type);
        update("evidence_types", on ? next : [...next, type]);
    };
    /** One combined confirmation drives all four ethics keys at once — the checks themselves are unchanged. */
    const setAllEthics = (checked: boolean) => {
        update("ethical_compliance", {
            authentic: checked,
            informed_consent: checked,
            no_harm: checked,
            privacy_respected: checked,
        });
    };

    /** Evidence already attached in earlier sections — nothing to re-upload or re-describe. */
    const collectedElsewhere = useMemo(() => {
        const items: { file: EvidenceFileItem; label: string; source: string }[] = [];
        (data.section1?.attendance_logs || []).forEach((log) => {
            if (log.evidence_file) {
                items.push({
                    file: log.evidence_file,
                    label: log.date ? `Field visit — ${log.date}` : (log.activity_type || "Attendance evidence"),
                    source: "Attendance (Sec 1)",
                });
            }
        });
        (data.section6?.evidence_files || []).forEach((f, i) => {
            items.push({ file: f, label: getFileName(f, i), source: "Resources (Sec 6)" });
        });
        (data.section7?.formalization_files || []).forEach((f, i) => {
            items.push({ file: f, label: getFileName(f, i), source: "Partnerships (Sec 7)" });
        });
        return items;
    }, [data.section1?.attendance_logs, data.section6?.evidence_files, data.section7?.formalization_files]);

    const allEthicalChecked =
        Object.values(ethical_compliance || {}).every((v) => v === true) &&
        Object.keys(ethical_compliance || {}).length === 4;

    const legacyTypes = (evidence_types || []).filter(
        (value) => !EVIDENCE_TYPES.some((type) => evidenceTypeOn([value], type.id)),
    );
    const otherTypeOn = evidenceTypeOn(evidence_types || [], OTHER_EVIDENCE_TYPE);

    const autoNarrative = (() => {
        const onFile = collectedElsewhere.length;
        const added = evidence_files?.length || 0;
        const total = onFile + added;
        const consent = allEthicalChecked ? "Ethical consent is confirmed." : "Ethical consent is pending.";
        const visibility =
            media_visible === "public" ? "Visibility: public."
            : media_visible === "limited" ? "Visibility: institutional."
            : media_visible === "internal" ? "Visibility: private."
            : "Visibility is still pending.";
        if (!total) return `Evidence already on file will appear here as pictures. ${consent} ${visibility}`;
        return `${total} evidence file${total === 1 ? "" : "s"} sit on record — ${onFile} from earlier sections${added ? ` and ${added} added here` : ""}. ${consent} ${visibility}`;
    })();

    useEffect(() => {
        if (section8.summary_text !== autoNarrative) {
            updateSection("section8", { summary_text: autoNarrative });
        }
    }, [autoNarrative, section8.summary_text, updateSection]);

    return (
        <div className="mx-auto max-w-6xl space-y-3 pb-10">
            <section className="cer-card space-y-4">
                <div className="cer-secl">
                    <span className="cer-secn">7.1</span>
                    <h3>Evidence already on file</h3>
                    <span className="cer-tag auto">Auto-collected · always pictures</span>
                </div>
                <p className="cer-sub">
                    Every file uploaded anywhere in this report lands here automatically — shown as images, never file lists.
                    Saved session evidence is included. A resource entry is not counted unless a supporting file is attached.
                </p>
                {collectedElsewhere.length ? (
                    <div className="cer-gal">
                        {collectedElsewhere.map((item, i) => (
                            <div key={`${item.source}-${i}`} className="space-y-1">
                                <button
                                    type="button"
                                    onClick={() => setPreviewFile({ file: item.file, name: item.label })}
                                    className="cer-ph w-full cursor-pointer border-0 p-0"
                                    title={item.label}
                                >
                                    <EvidenceFilePreview file={item.file} name={item.label} />
                                </button>
                                <p className="truncate text-[10px] font-semibold text-[var(--ink)]" title={item.label}>
                                    {item.label}
                                </p>
                                <p className="truncate text-[9px] font-semibold text-[var(--teal)]">{item.source}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500">No pictures on file yet. Session photos appear here as soon as they are saved.</p>
                )}
            </section>

            <section className="cer-card space-y-4">
                <div className="cer-secl">
                    <span className="cer-secn">7.2</span>
                    <h3>Anything else to add?</h3>
                    <span className="cer-tag">Mandatory</span>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => update("has_evidence", "no")}
                        className={clsx(
                            "rounded-xl border-2 p-5 text-center transition-colors",
                            section8.has_evidence === "no"
                                ? "border-[#25b8d8] bg-[#eefbfe] shadow-sm"
                                : "border-slate-200 bg-white hover:border-[#25b8d8]/40",
                        )}
                    >
                        <p className="text-2xl">✅</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">No — it&apos;s all on file above</p>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">The report relies on auto-collected evidence.</p>
                    </button>
                    <button
                        type="button"
                        onClick={() => update("has_evidence", "yes")}
                        className={clsx(
                            "rounded-xl border-2 p-5 text-center transition-colors",
                            section8.has_evidence === "yes"
                                ? "border-[#25b8d8] bg-[#eefbfe] shadow-sm"
                                : "border-slate-200 bg-white hover:border-[#25b8d8]/40",
                        )}
                    >
                        <p className="text-2xl">📎</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">Yes — I have more</p>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">Upload &amp; classify below.</p>
                    </button>
                </div>
                <FieldError message={getFieldError("section8.has_evidence")} />

                {section8.has_evidence === "yes" ? (
                    <div className="space-y-4">
                        <div>
                            <Label className={fieldLabel}>Classify · select all that apply</Label>
                            <div className="cer-chips mt-2">
                                {EVIDENCE_TYPES.map((opt) => {
                                    const active = evidenceTypeOn(evidence_types || [], opt.id);
                                    return (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => toggleEvidenceType(opt.id)}
                                            className={clsx("cer-chip", active && "on")}
                                        >
                                            {opt.label}
                                        </button>
                                    );
                                })}
                                {legacyTypes.map((value) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => toggleEvidenceType(value)}
                                        className="cer-chip on"
                                    >
                                        {value}
                                    </button>
                                ))}
                            </div>
                            <FieldError message={getFieldError("section8.evidence_types")} />
                        </div>

                        {otherTypeOn ? (
                            <input
                                className="cer-input"
                                value={evidenceTypeOther}
                                placeholder="What kind of document?"
                                onChange={(e) => update("evidence_type_other", e.target.value)}
                            />
                        ) : null}
                        <FieldError message={getFieldError("section8.evidence_type_other")} />

                        <label className="cer-aibtn inline-flex cursor-pointer">
                            ⬆️ Add files (JPG, PNG, PDF, Word)
                            <input
                                type="file"
                                multiple
                                accept={REPORT_ATTACHMENT_ACCEPT}
                                className="sr-only"
                                onChange={(e) => {
                                    if (!e.target.files) return;
                                    const acceptedFiles = filterOversizedImages(Array.from(e.target.files), e.currentTarget);
                                    if (!acceptedFiles.length) return;
                                    update("evidence_files", [
                                        ...(evidence_files || []),
                                        ...acceptedFiles.map(toEvidenceFileItem),
                                    ]);
                                }}
                            />
                        </label>
                        <p className="text-[11px] text-slate-500">Max {MAX_REPORT_UPLOAD_LABEL} per file.</p>
                        <FieldError message={getFieldError("section8.evidence_files")} />

                        {evidence_files && evidence_files.length > 0 ? (
                            <div className="cer-gal">
                                {evidence_files.map((file: EvidenceFileItem, fIdx: number) => {
                                    const fileName = getFileName(file, fIdx);
                                    return (
                                        <div key={`${fileName}-${fIdx}`} className="space-y-1">
                                            <div
                                                className="cer-ph cursor-pointer"
                                                onClick={() => setPreviewFile({ file, name: fileName })}
                                            >
                                                <EvidenceFilePreview file={file} name={fileName} />
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        update("evidence_files", evidence_files.filter((_: EvidenceFileItem, i: number) => i !== fIdx));
                                                    }}
                                                    className="cer-ph-badge transition hover:bg-[var(--red)]"
                                                    title="Remove file"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                            <p className="truncate text-[10px] font-semibold text-[var(--ink)]" title={fileName}>{fileName}</p>
                                            <p className="truncate text-[9px] text-[var(--muted)]">{formatFileSize(file)}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : null}

                        <div>
                            <Label className={fieldLabel}>What does your evidence show?</Label>
                            <input
                                className="cer-input mt-2"
                                value={description}
                                placeholder="e.g. the attendance sheet confirms 40 participants across three sessions"
                                onChange={(e) => update("description", e.target.value)}
                            />
                            <p className={clsx("cer-wc", captionInRange && "ok")}>
                                {descriptionWords} WORDS · TARGET 10–45
                            </p>
                            <FieldError message={getFieldError("section8.description")} />
                        </div>
                    </div>
                ) : null}

                <label
                    className={clsx(
                        "flex cursor-pointer items-start gap-3 rounded-xl border border-dashed px-4 py-3",
                        allEthicalChecked ? "border-[#0e7d74] bg-[#fbfefd]" : "border-[#cbe7e3] bg-[#fbfefd]",
                    )}
                >
                    <input
                        type="checkbox"
                        checked={allEthicalChecked}
                        onChange={(e) => setAllEthics(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[#0e7d74]"
                    />
                    <span className="text-[11px] leading-relaxed text-[var(--ink)]">
                        <b>I confirm this evidence is genuine and gathered responsibly</b> — from this project, with photo consent, privacy and dignity respected.{" "}
                        <span className="text-[var(--gold)]">False submissions may result in rejection and institutional action.</span>
                    </span>
                </label>
                <FieldError message={getFieldError("section8.ethical_compliance")} />

                <div>
                    <Label className={fieldLabel}>Default media visibility</Label>
                    <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
                        {visibilityOptions.map((opt) => {
                            const active = media_visible === opt.id;
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => update("media_visible", opt.id)}
                                    className={clsx(
                                        "rounded-xl border-2 p-5 text-center transition-colors",
                                        active
                                            ? "border-[#25b8d8] bg-[#eefbfe] shadow-sm"
                                            : "border-slate-200 bg-white hover:border-[#25b8d8]/40",
                                    )}
                                >
                                    <p className="text-2xl">{opt.emoji}</p>
                                    <p className="mt-2 text-sm font-semibold text-slate-900">{opt.label}</p>
                                    <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{opt.desc}</p>
                                </button>
                            );
                        })}
                    </div>
                    <p className="cer-hint mt-2">
                        Privacy does not reduce verification quality. Choose Public only when consent and institutional policy permit it. Institutional or Private evidence can still be fully verified. Blur or redact identifying details whenever needed.
                    </p>
                    <FieldError message={getFieldError("section8.media_visible")} />
                </div>
            </section>

            <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
                <DialogContent className="flex max-w-4xl flex-col items-center bg-white p-6">
                    <DialogHeader className="mb-4 flex w-full flex-col items-start justify-start">
                        <DialogTitle className="w-full truncate break-all pr-8 text-sm font-bold text-slate-800">
                            {previewFile?.name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex max-h-[80vh] w-full items-center justify-center overflow-auto rounded-xl border border-slate-100 bg-slate-50 p-2">
                        {previewFile ? (
                            <EvidenceFullFilePreview file={previewFile.file} name={previewFile.name} />
                        ) : null}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
