import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FileText, Image as ImageIcon, Music as MusicIcon, Trash2, Video as VideoIcon } from "lucide-react";
import { EvidenceMediaPreview } from "./ui/EvidenceMediaPreview";
import { evidenceItemFileName, evidenceItemUrl, evidencePreviewKind } from "../utils/evidencePreviewKind";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import clsx from "clsx";
import { MAX_REPORT_UPLOAD_LABEL, splitReportFilesByImageSize } from "../utils/fileUploadLimits";
import { REPORT_ATTACHMENT_ACCEPT } from "@/utils/reportAttachmentAccept";
import { EVIDENCE_ETHICS_FLAGS, countWords, evidenceEthicsConfirmed } from "../utils/validation";
import {
    DEFAULT_MEDIA_VISIBILITY,
    hasPublicSharePermission,
    isPublicMediaVisibility,
    normalizeMediaVisibility,
    type MediaVisibility,
} from "../utils/mediaVisibility";

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

const visibilityOptions: Array<{
    id: MediaVisibility;
    label: string;
    recommended?: boolean;
    desc: string;
}> = [
    {
        id: "public",
        label: "Public",
        desc: "Student, assigned Faculty, authorized University and CIEL PK Super Admin can view this evidence. Associated Partners/NGOs and the public can view it once public-sharing consent is confirmed below. Original files can be downloaded.",
    },
    {
        id: "restricted",
        label: "Restricted",
        recommended: true,
        desc: "Student, assigned Faculty, authorized University and CIEL PK Super Admin can view this evidence. Associated Partners/NGOs and the public cannot. Only CIEL PK Super Admin can download the originals.",
    },
    {
        id: "private",
        label: "Private",
        desc: "Student, assigned Faculty, authorized University and CIEL PK Super Admin can view this evidence, for internal verification only. Associated Partners/NGOs and the public cannot, and it is never published. Only CIEL PK Super Admin can download the originals.",
    },
];

/** Who can see / download evidence at each privacy level — mirrors backend evidence-access.util. */
const EVIDENCE_ACCESS_ROWS: Array<{ who: string; access: Record<MediaVisibility, boolean> }> = [
    { who: "Submitting Student", access: { public: true, restricted: true, private: true } },
    { who: "Assigned Faculty", access: { public: true, restricted: true, private: true } },
    { who: "Authorized University", access: { public: true, restricted: true, private: true } },
    { who: "CIEL PK Super Admin", access: { public: true, restricted: true, private: true } },
    { who: "Associated Partner Organization / NGO", access: { public: true, restricted: false, private: false } },
    { who: "General Public", access: { public: true, restricted: false, private: false } },
    { who: "Original downloads — CIEL PK Super Admin", access: { public: true, restricted: true, private: true } },
    { who: "Original downloads — everyone else", access: { public: true, restricted: false, private: false } },
    { who: "Privacy status shown to associated stakeholders", access: { public: true, restricted: true, private: true } },
];

function EvidenceAccessMatrix({ selected }: { selected: MediaVisibility }) {
    const levels: MediaVisibility[] = ["public", "restricted", "private"];
    return (
        <div data-ciel-evidence-access-matrix className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[520px] border-collapse text-left text-[12.5px]">
                <caption className="px-3.5 pb-1 pt-3 text-left">
                    <span className="block text-[13px] font-bold text-slate-900">Stakeholder access matrix</span>
                    <span className="block text-[11.5px] font-normal text-slate-500">Who can view each privacy level. Your choice is highlighted.</span>
                </caption>
                <thead>
                    <tr className="bg-[#f7fafb] text-[11px] font-semibold text-slate-500">
                        <th className="px-3.5 py-2">Stakeholder / permission</th>
                        {levels.map((level) => (
                            <th key={level} className={clsx("px-3 py-2 text-center", level === selected && "bg-[#eefbfe] text-[#0e7490]")}>
                                {level === "public" ? "Public" : level === "restricted" ? "Restricted" : "Private"}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {EVIDENCE_ACCESS_ROWS.map((row) => (
                        <tr key={row.who} className="border-t border-slate-100">
                            <td className="px-3.5 py-2 text-slate-700">{row.who}</td>
                            {levels.map((level) => (
                                <td
                                    key={level}
                                    className={clsx(
                                        "px-3 py-2 text-center",
                                        level === selected && "bg-[#f3fcfe]",
                                        row.access[level] ? "font-bold text-[#16734c]" : "text-slate-400",
                                    )}
                                >
                                    {row.access[level] ? "✓ Yes" : "— No"}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            <p className="border-t border-slate-100 px-3.5 py-2 text-[11px] leading-relaxed text-slate-500">
                Public needs the public-sharing consent above; until it is confirmed, evidence is treated as Restricted. Faculty and
                University access is limited to the academic stakeholders associated with this project. Blocking downloads does not
                prevent screenshots.
            </p>
        </div>
    );
}

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

function useEvidencePreviewUrl(file: EvidenceFileItem, wanted: boolean): string | null {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!wanted) {
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
    }, [file, wanted]);

    return previewUrl;
}

/** Renders the contents of a `.cer-ph` tile: the real image thumbnail when one is available,
 *  otherwise a generic icon — evidence is always shown as a picture tile, never a file-list row. */
/** The stored file's own name (never the caption shown on the tile) and the URL it lives at. */
const getStoredFileName = (file: EvidenceFileItem) => (isNativeFile(file) ? file.name || "" : evidenceItemFileName(file));
const getStoredUrl = (file: EvidenceFileItem) => (isNativeFile(file) ? "" : evidenceItemUrl(file));

/** Items from earlier sections are shown under a caption ("Field visit — 2026-10-10"), so the kind
 *  must be read from the file's MIME type, its real name or its URL — not from that caption. */
const getEvidenceKind = (file: EvidenceFileItem, fallbackName: string) =>
    evidencePreviewKind(getFileType(file), getStoredFileName(file) || fallbackName, getStoredUrl(file));

function EvidenceFilePreview({ file, name }: { file: EvidenceFileItem; name: string }) {
    const kind = getEvidenceKind(file, name);
    const previewUrl = useEvidencePreviewUrl(file, kind === "image");

    if (kind === "image" && previewUrl) {
        return <img src={previewUrl} alt={name} />;
    }

    if (kind === "image") {
        return <ImageIcon className="h-7 w-7 text-[var(--teal)]" />;
    }

    if (kind === "video") {
        return <VideoIcon className="h-7 w-7 text-[var(--teal)]" />;
    }

    if (kind === "audio") {
        return <MusicIcon className="h-7 w-7 text-[var(--teal)]" />;
    }

    return <FileText className="h-7 w-7 text-[var(--teal)]" />;
}

function EvidenceFullFilePreview({ file, name }: { file: EvidenceFileItem; name: string }) {
    const mimeType = getFileType(file);
    const kind = getEvidenceKind(file, name);
    // Images, video, audio and PDFs show inline; other files still get their open link (and the
    // dialog sniffs an unknown stored file before giving up).
    const previewUrl = useEvidencePreviewUrl(file, kind !== "file" || !isNativeFile(file));
    return <EvidenceMediaPreview url={previewUrl} name={name} mimeType={mimeType} fileName={getStoredFileName(file) || null} />;
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
        media_visible = "",
        public_share_permission = false,
    } = section8;
    const selectedVisibility = normalizeMediaVisibility(media_visible) || DEFAULT_MEDIA_VISIBILITY;
    const evidenceTypeOther = section8.evidence_type_other || "";
    const descriptionWords = countWords(description);
    // V19 8.2 "Optional evidence explanation" — no minimum, up to 45 words.
    const captionInRange = descriptionWords > 0 && descriptionWords <= 45;

    const update = (field: string, val: unknown) => updateSection("section8", { [field]: val });
    const toggleEvidenceType = (type: string) => {
        const cur = evidence_types || [];
        const on = evidenceTypeOn(cur, type);
        const next = cur.filter((value) => value !== type && value.replace(/^✏️\s*/, "") !== type);
        update("evidence_types", on ? next : [...next, type]);
    };
    /** Evidence already attached in earlier sections — nothing to re-upload or re-describe. */
    const collectedElsewhere = useMemo(() => {
        const items: { file: EvidenceFileItem; label: string; source: string }[] = [];
        (data.section1?.attendance_logs || []).forEach((log) => {
            // Saved logs come back with `evidence_url`; unsaved ones hold the File (or the uploaded URL)
            // in `evidence_file`. A bare `true` marker carries nothing to show, so fall back to the URL.
            const stored = log.evidence_file as unknown;
            const file: EvidenceFileItem | null =
                typeof stored === "string" && stored.trim()
                    ? stored
                    : stored && typeof stored === "object"
                        ? (stored as EvidenceFileItem)
                        : typeof log.evidence_url === "string" && log.evidence_url.trim()
                            ? log.evidence_url
                            : null;
            if (file) {
                items.push({
                    file,
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

    const legacyTypes = (evidence_types || []).filter(
        (value) => !EVIDENCE_TYPES.some((type) => evidenceTypeOn([value], type.id)),
    );
    const otherTypeOn = evidenceTypeOn(evidence_types || [], OTHER_EVIDENCE_TYPE);

    const autoNarrative = (() => {
        const onFile = collectedElsewhere.length;
        const added = evidence_files?.length || 0;
        const total = onFile + added;
        const publicOk = !isPublicMediaVisibility(selectedVisibility) || hasPublicSharePermission(section8);
        // One status, not two: a public choice without the share permission *is* restricted for now.
        const visibility =
            selectedVisibility === "public"
                ? (publicOk ? "Visibility: public." : "Visibility: public requested — treated as restricted until public-share permission is confirmed.")
            : selectedVisibility === "restricted" ? "Visibility: restricted."
            : "Visibility: private.";
        const shareNote = selectedVisibility === "public"
            ? (publicOk ? "Public share permission is confirmed." : "Tick the public-share permission below to publish it.")
            : "Not shown publicly.";
        if (!total) return `Evidence already on file will appear here as pictures. ${visibility} ${shareNote}`;
        return `${total} evidence file${total === 1 ? "" : "s"} sit on record — ${onFile} from earlier sections${added ? ` and ${added} added here` : ""}. ${visibility} ${shareNote}`;
    })();

    useEffect(() => {
        if (!normalizeMediaVisibility(media_visible)) {
            update("media_visible", DEFAULT_MEDIA_VISIBILITY);
        }
    }, [media_visible]);

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
                <FieldError message={getFieldError("has_evidence")} />

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
                            <FieldError message={getFieldError("evidence_types")} />
                        </div>

                        {otherTypeOn ? (
                            <input
                                className="cer-input"
                                value={evidenceTypeOther}
                                placeholder="What kind of document?"
                                onChange={(e) => update("evidence_type_other", e.target.value)}
                            />
                        ) : null}
                        <FieldError message={getFieldError("evidence_type_other")} />

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
                        <FieldError message={getFieldError("evidence_files")} />

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
                            <div className="flex items-end justify-between gap-3">
                                <Label className={fieldLabel}>What does your evidence show?</Label>
                                <span className="cer-tag auto">Optional · up to 45 words</span>
                            </div>
                            <input
                                className="cer-input mt-2"
                                value={description}
                                placeholder="e.g. the attendance sheet confirms 40 participants across three sessions"
                                onChange={(e) => update("description", e.target.value)}
                            />
                            <p className={clsx("cer-wc", captionInRange && "ok")}>
                                {descriptionWords} WORDS · MAX 45
                            </p>
                            <FieldError message={getFieldError("description")} />
                        </div>
                    </div>
                ) : null}

                {/* V19 8.2 — one consolidated authenticity / consent / privacy confirmation (mandatory). */}
                <div data-testid="evidence-ethics-confirmation">
                    <Label className={fieldLabel}>
                        Authenticity, consent &amp; privacy confirmation <span className="text-rose-500">*</span>
                    </Label>
                    <label
                        className={clsx(
                            "mt-2 flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-[12.5px] leading-relaxed text-slate-700",
                            evidenceEthicsConfirmed(section8.ethical_compliance) ? "border-[#0e7d74] bg-[#fbfefd]" : "border-[#cbe7e3] bg-white",
                        )}
                    >
                        <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 accent-[#0e7d74]"
                            checked={evidenceEthicsConfirmed(section8.ethical_compliance)}
                            onChange={(e) =>
                                update(
                                    "ethical_compliance",
                                    Object.fromEntries(EVIDENCE_ETHICS_FLAGS.map((flag) => [flag, e.target.checked])),
                                )
                            }
                        />
                        <span>
                            I/We confirm that the submitted evidence is authentic, relates to this project and has been collected with
                            appropriate consent. I/We understand that the evidence remains accessible to the assigned Faculty, authorized
                            University representatives and CIEL PK Super Admin regardless of the selected privacy level. The selected
                            privacy level determines access for Partner Organizations, NGOs and the general public.
                        </span>
                    </label>
                    <FieldError message={getFieldError("ethical_compliance")} />
                </div>

                <div>
                    <Label className={fieldLabel}>Who can see this evidence?</Label>
                    <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
                        {visibilityOptions.map((opt) => {
                            const active = selectedVisibility === opt.id;
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => {
                                        updateSection("section8", {
                                            media_visible: opt.id,
                                            public_share_permission: opt.id === "public" ? public_share_permission : false,
                                        });
                                    }}
                                    className={clsx(
                                        "rounded-xl border-2 p-5 text-left transition-colors",
                                        active
                                            ? "border-[#25b8d8] bg-[#eefbfe] shadow-sm"
                                            : "border-slate-200 bg-white hover:border-[#25b8d8]/40",
                                    )}
                                >
                                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                        <span className={clsx(
                                            "inline-flex h-4 w-4 items-center justify-center rounded-full border",
                                            active ? "border-[#25b8d8]" : "border-slate-300",
                                        )}>
                                            {active ? <span className="h-2 w-2 rounded-full bg-[#25b8d8]" /> : null}
                                        </span>
                                        {opt.label}
                                        {opt.recommended ? (
                                            <span className="rounded-full bg-[#eefbfe] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#0e7d74]">
                                                Default
                                            </span>
                                        ) : null}
                                    </p>
                                    <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{opt.desc}</p>
                                </button>
                            );
                        })}
                    </div>
                    <FieldError message={getFieldError("media_visible")} />
                    <p className="cer-hint mt-2">
                        One choice applies to every evidence file in this project.
                        {selectedVisibility === "public" && !public_share_permission
                            ? " Until you confirm public-share permission below, evidence stays Restricted."
                            : ""}
                    </p>
                    {selectedVisibility === "public" ? (
                        <label
                            className={clsx(
                                "mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-dashed px-4 py-3",
                                public_share_permission ? "border-[#0e7d74] bg-[#fbfefd]" : "border-[#cbe7e3] bg-[#fbfefd]",
                            )}
                        >
                            <input
                                type="checkbox"
                                checked={Boolean(public_share_permission)}
                                onChange={(e) => update("public_share_permission", e.target.checked)}
                                className="mt-0.5 h-4 w-4 shrink-0 accent-[#0e7d74]"
                            />
                            <span className="text-[11px] leading-relaxed text-[var(--ink)]">
                                <b>I/We confirm that appropriate informed consent has been obtained for public publication of this evidence,
                                including applicable permissions for identifiable individuals and minors.</b>
                            </span>
                        </label>
                    ) : null}
                    <FieldError message={getFieldError("public_share_permission")} />
                    <p className="mt-3 rounded-lg bg-[#f4f8fa] px-3.5 py-2.5 text-[12px] leading-relaxed text-[#476277]">
                        <b className="text-slate-900">Academic access stays the same at every level.</b> Every associated stakeholder can
                        see this evidence&apos;s privacy status, even when they cannot open the file. Restricted and Private originals can
                        be downloaded by CIEL PK Super Admin only.
                    </p>
                    <EvidenceAccessMatrix selected={selectedVisibility} />
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
