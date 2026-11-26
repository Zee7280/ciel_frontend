"use client";

import React, { useEffect, useState } from "react";
import clsx from "clsx";
import { ChevronDown, ExternalLink, FileText, ImageIcon, MusicIcon, VideoIcon, X } from "lucide-react";
import { evidenceItemFileName, evidenceItemUrl, evidencePreviewKind, type EvidencePreviewKind } from "../../utils/evidencePreviewKind";

/**
 * Evidence already attached elsewhere in the report, offered for reuse on an activity. `value` is the
 * exact label the report has always stored in `evidence_ref`, so saved reports read back unchanged.
 */
export type ExistingEvidenceChoice = {
    value: string;
    source: "Attendance" | "Evidence" | "Resource";
    /** What the tile shows under the source chip (date · place, or the file name). */
    caption: string;
    /** The stored item: a URL string, an upload record ({ url, name, type }) or a not-yet-uploaded File. */
    item?: unknown;
};

function nativeFileOf(item: unknown): File | null {
    if (typeof File === "undefined" || !item || typeof item !== "object") return null;
    if (item instanceof File) return item;
    const nested = (item as { file?: unknown }).file;
    return nested instanceof File ? nested : null;
}

function mimeOf(item: unknown): string {
    const file = nativeFileOf(item);
    if (file) return file.type || "";
    if (!item || typeof item !== "object") return "";
    const rec = item as Record<string, unknown>;
    for (const key of ["type", "mimeType", "mimetype"]) {
        if (typeof rec[key] === "string") return rec[key] as string;
    }
    return "";
}

export function evidenceChoiceKind(choice: Pick<ExistingEvidenceChoice, "item" | "caption">): EvidencePreviewKind {
    const file = nativeFileOf(choice.item);
    const name = file?.name || evidenceItemFileName(choice.item) || choice.caption;
    return evidencePreviewKind(mimeOf(choice.item), name, evidenceItemUrl(choice.item));
}

/** A URL the browser can show: the stored URL, or a short-lived object URL for a file not uploaded yet. */
function useEvidenceUrl(item: unknown): string {
    const file = nativeFileOf(item);
    const [objectUrl, setObjectUrl] = useState("");
    useEffect(() => {
        if (!file) return undefined;
        const url = URL.createObjectURL(file);
        setObjectUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);
    return file ? objectUrl : evidenceItemUrl(item);
}

function KindIcon({ kind, className }: { kind: EvidencePreviewKind; className?: string }) {
    const cls = clsx("text-[var(--teal,#0e7d74)]", className);
    if (kind === "image") return <ImageIcon className={cls} aria-hidden />;
    if (kind === "video") return <VideoIcon className={cls} aria-hidden />;
    if (kind === "audio") return <MusicIcon className={cls} aria-hidden />;
    return <FileText className={cls} aria-hidden />;
}

/** An image that falls back to the kind icon if it cannot load (keyed by URL, so a new URL retries). */
function ThumbImage({ url, alt, fit, className }: { url: string; alt: string; fit: "cover" | "contain"; className?: string }) {
    const [broken, setBroken] = useState(false);
    if (broken) {
        return (
            <span className={clsx("flex h-full w-full items-center justify-center bg-slate-50", className)}>
                <KindIcon kind="image" className="h-7 w-7" />
            </span>
        );
    }
    return (
        // eslint-disable-next-line @next/next/no-img-element -- evidence lives on S3 / object URLs, not next/image
        <img
            src={url}
            alt={alt}
            loading="lazy"
            onError={() => setBroken(true)}
            className={clsx("h-full w-full", fit === "cover" ? "object-cover" : "object-contain", className)}
        />
    );
}

/** The picture of one choice: the image itself when it is one, otherwise an icon for its kind. */
function EvidenceThumb({ choice, fit = "cover", className }: { choice: ExistingEvidenceChoice; fit?: "cover" | "contain"; className?: string }) {
    const kind = evidenceChoiceKind(choice);
    const url = useEvidenceUrl(choice.item);
    if (kind === "image" && url) {
        return <ThumbImage key={url} url={url} alt={choice.caption} fit={fit} className={className} />;
    }
    return (
        <span className={clsx("flex h-full w-full items-center justify-center bg-slate-50", className)}>
            <KindIcon kind={kind} className="h-7 w-7" />
        </span>
    );
}

const SOURCE_TONE: Record<ExistingEvidenceChoice["source"], string> = {
    Attendance: "bg-sky-50 text-sky-700 border-sky-100",
    Evidence: "bg-emerald-50 text-emerald-700 border-emerald-100",
    Resource: "bg-amber-50 text-amber-800 border-amber-100",
};

function SourceChip({ source }: { source: ExistingEvidenceChoice["source"] }) {
    return (
        <span className={clsx("inline-block rounded-full border px-2 py-0.5 text-[9.5px] font-black uppercase tracking-[0.06em]", SOURCE_TONE[source])}>
            {source === "Attendance" ? "Session evidence" : source === "Resource" ? "Resource proof" : "Evidence file"}
        </span>
    );
}

function SelectedEvidence({ choice, onChange, onRemove }: { choice: ExistingEvidenceChoice; onChange: () => void; onRemove: () => void }) {
    const url = useEvidenceUrl(choice.item);
    const kind = evidenceChoiceKind(choice);
    return (
        <div data-ciel-evidence-selected className="overflow-hidden rounded-xl border border-teal-200 bg-white shadow-sm">
            <div className="grid gap-0 sm:grid-cols-[minmax(0,260px)_1fr]">
                <a
                    href={url || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${choice.caption}`}
                    className={clsx("block h-48 bg-slate-50 sm:h-full sm:min-h-[150px]", !url && "pointer-events-none")}
                >
                    <EvidenceThumb choice={choice} fit={kind === "image" ? "contain" : "cover"} />
                </a>
                <div className="flex flex-col gap-2 p-3.5">
                    <div className="flex items-center gap-2">
                        <SourceChip source={choice.source} />
                        <span className="text-[10.5px] font-bold text-teal-700">✓ Linked to this activity</span>
                    </div>
                    <p className="break-words text-[12.5px] font-semibold leading-snug text-slate-800">{choice.caption}</p>
                    <div className="mt-auto flex flex-wrap gap-2">
                        {url ? (
                            <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                            >
                                <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Open
                            </a>
                        ) : null}
                        <button
                            type="button"
                            onClick={onChange}
                            className="rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-[11px] font-bold text-teal-800 hover:bg-teal-100"
                        >
                            Change
                        </button>
                        <button
                            type="button"
                            onClick={onRemove}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50"
                        >
                            <X className="h-3.5 w-3.5" aria-hidden /> Remove
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Picture tiles of the evidence already in the report (session evidence, evidence files, resource
 * proofs). Choosing one stores its label in `evidence_ref` (as the old dropdown did) and shows the
 * image right here.
 */
export function ExistingEvidencePicker({
    choices,
    value,
    onChange,
}: {
    choices: ExistingEvidenceChoice[];
    value: string;
    onChange: (value: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const selected = value ? choices.find((c) => c.value === value) : undefined;

    const pick = (next: string) => {
        onChange(next);
        setOpen(false);
    };

    return (
        <div data-ciel-evidence-picker className="space-y-2">
            {selected ? (
                <SelectedEvidence choice={selected} onChange={() => setOpen((o) => !o)} onRemove={() => pick("")} />
            ) : value ? (
                // A label saved earlier that no longer matches any file in the report.
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <span className="text-[12px] font-semibold text-slate-700">Previously linked: {value}</span>
                    <span className="flex gap-2">
                        <button type="button" onClick={() => setOpen((o) => !o)} className="text-[11px] font-bold text-teal-700 hover:underline">
                            Change
                        </button>
                        <button type="button" onClick={() => pick("")} className="text-[11px] font-bold text-rose-600 hover:underline">
                            Remove
                        </button>
                    </span>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    aria-expanded={open}
                    disabled={!choices.length}
                    className="flex w-full items-center justify-between rounded-xl border border-dashed border-slate-300 bg-white px-3.5 py-3 text-left text-[12.5px] font-semibold text-slate-600 hover:border-teal-300 hover:bg-teal-50/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <span>
                        {choices.length
                            ? `Choose existing evidence (optional) · ${choices.length} available`
                            : "No evidence in the report yet — add it in Participation or Evidence"}
                    </span>
                    <ChevronDown className={clsx("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden />
                </button>
            )}

            {open && choices.length ? (
                <div role="listbox" aria-label="Existing evidence" className="grid grid-cols-2 gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 sm:grid-cols-3 lg:grid-cols-4">
                    {choices.map((choice) => {
                        const active = choice.value === value;
                        return (
                            <button
                                key={choice.value}
                                type="button"
                                role="option"
                                aria-selected={active}
                                onClick={() => pick(choice.value)}
                                title={choice.value}
                                className={clsx(
                                    "group overflow-hidden rounded-lg border bg-white text-left transition hover:-translate-y-0.5 hover:shadow-md",
                                    active ? "border-teal-500 ring-2 ring-teal-400" : "border-slate-200",
                                )}
                            >
                                <span className="block aspect-[4/3] overflow-hidden bg-slate-100">
                                    <EvidenceThumb choice={choice} className="transition group-hover:scale-[1.03]" />
                                </span>
                                <span className="block space-y-1 p-2">
                                    <SourceChip source={choice.source} />
                                    <span className="line-clamp-2 block break-words text-[11px] font-semibold leading-snug text-slate-700">{choice.caption}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}
