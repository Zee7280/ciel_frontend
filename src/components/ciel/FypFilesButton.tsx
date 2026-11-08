"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { groupFypDeliverablesByLabel, type FypDeliverable } from "@/utils/fypTypes";

/** File name from a stored URL (never the signed query string). */
export function fypFileNameFromUrl(url: string | undefined | null): string {
    if (!url) return "";
    try {
        const path = new URL(url, "https://cielpk.com").pathname;
        return decodeURIComponent(path.split("/").filter(Boolean).pop() || "");
    } catch {
        return String(url).split("?")[0].split("/").pop() || "";
    }
}

function formatUploaded(iso?: string): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Every deliverable attached to an FYP record, in one list: the current version of each label plus
 * its earlier uploads, each openable. Replaces the old "N FILES" buttons that opened only the last
 * file (browsers block the rest of a burst of window.open calls, so 3 files looked like 1).
 */
export function FypFilesDialog({
    files,
    title,
    onClose,
}: {
    files: FypDeliverable[];
    title?: string | null;
    onClose: () => void;
}) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    if (typeof document === "undefined") return null;
    const groups = groupFypDeliverablesByLabel(files);
    const total = files.length;

    return createPortal(
        <div
            className="fixed inset-0 z-[130] flex items-center justify-center bg-[rgba(7,28,35,.55)] p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Attached files"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="w-full max-w-[560px] overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_rgba(0,0,0,.3)]">
                <div className="flex items-start justify-between gap-3 border-b border-[#e6ecf0] px-4 py-3">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#71828e]">
                            📎 {total} file{total === 1 ? "" : "s"} attached
                        </p>
                        {title ? <h3 className="mt-0.5 truncate text-[13px] font-extrabold text-[#14202b]">{title}</h3> : null}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#eef2f3] text-[15px] font-black text-[#29454f]"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>
                <ul className="max-h-[60vh] overflow-auto px-4 py-2" data-testid="fyp-files-list">
                    {groups.map(({ label, latest, earlier }) => (
                        <li key={label} className="border-b border-dashed border-[#e6ecf0] py-2.5 last:border-b-0">
                            <FileRow file={latest} label={label} current />
                            {earlier.map((f) => (
                                <FileRow key={`${label}-${f.version}-${f.uploadedAt}`} file={f} label={label} />
                            ))}
                        </li>
                    ))}
                    {total === 0 ? <li className="py-6 text-center text-[12px] text-[#70808a]">No files attached.</li> : null}
                </ul>
                <div className="border-t border-[#e6ecf0] px-4 py-2 text-[10px] text-[#70808a]">
                    Each file opens in a new tab. Re-uploads are kept as earlier versions under the same label.
                </div>
            </div>
        </div>,
        document.body,
    );
}

function FileRow({ file, label, current = false }: { file: FypDeliverable; label: string; current?: boolean }) {
    const name = fypFileNameFromUrl(file.fileUrl);
    const when = formatUploaded(file.uploadedAt);
    return (
        <div className={`flex items-center justify-between gap-3 ${current ? "" : "mt-1 pl-3 opacity-80"}`}>
            <div className="min-w-0">
                <p className="truncate text-[12px] font-bold text-[#14202b]">
                    {current ? label || "Attachment" : `Earlier version · v${file.version}`}
                </p>
                <p className="truncate text-[10.5px] text-[#70808a]">
                    {[name, when ? `Uploaded ${when}` : "", current && file.version > 1 ? `v${file.version}` : ""].filter(Boolean).join(" · ")}
                </p>
            </div>
            {file.fileUrl ? (
                <a
                    href={file.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-[9px] bg-[#174b43] px-2.5 py-1.5 text-[10px] font-black text-white"
                >
                    Open ↗
                </a>
            ) : (
                <span className="shrink-0 rounded-[9px] bg-[#eef2f3] px-2.5 py-1.5 text-[10px] font-black text-[#70808a]">No link</span>
            )}
        </div>
    );
}

/**
 * "📎 N FILES" button for FYP cards (student, faculty, university, admin): one click lists every
 * attached file; a single file still opens straight away.
 */
export default function FypFilesButton({
    files,
    title,
    className,
    label,
}: {
    files: FypDeliverable[] | undefined | null;
    title?: string | null;
    className?: string;
    /** Override the button text; default "📎 N FILE(S)". */
    label?: string;
}) {
    const [open, setOpen] = useState(false);
    const list = Array.isArray(files) ? files : [];
    const count = list.length;
    if (!count) return null;
    const single = count === 1 && list[0]?.fileUrl ? list[0] : null;
    const text = label ?? `📎 ${count} FILE${count === 1 ? "" : "S"}`;
    const cls =
        className ??
        "mt-1 inline-flex w-full items-center justify-center gap-1 rounded-[9px] bg-[#eef2f3] px-2.5 py-2 text-[10px] font-black text-[#29454f]";
    if (single) {
        return (
            <a href={single.fileUrl} target="_blank" rel="noopener noreferrer" className={cls} data-testid="fyp-files-button">
                {text}
            </a>
        );
    }
    return (
        <>
            <button type="button" onClick={() => setOpen(true)} className={cls} data-testid="fyp-files-button">
                {text}
            </button>
            {open ? <FypFilesDialog files={list} title={title} onClose={() => setOpen(false)} /> : null}
        </>
    );
}
