"use client";

import { useEffect, useMemo, useState } from "react";

export type ReportEvidenceGalleryKind = "image" | "pdf" | "video" | "file";

export type ReportEvidenceGalleryItem = {
    url: string;
    name: string;
    kind?: string;
    source?: string;
    previewable?: boolean;
};

function extOf(url: string, name: string): string {
    const blob = `${name} ${url.split("?")[0]}`.toLowerCase();
    const match = blob.match(/\.([a-z0-9]{2,5})(?:$|[#?])/);
    return match?.[1] || "";
}

export function classifyEvidenceGalleryKind(url: string, name: string): ReportEvidenceGalleryKind {
    const ext = extOf(url, name);
    if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "avif"].includes(ext)) return "image";
    if (ext === "pdf") return "pdf";
    if (["mp4", "webm", "mov", "m4v"].includes(ext)) return "video";
    if (/image\//i.test(url) || /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url)) return "image";
    if (/\.pdf(\?|$)/i.test(url)) return "pdf";
    return "file";
}

function kindLabel(kind: ReportEvidenceGalleryKind): string {
    if (kind === "image") return "Photo";
    if (kind === "pdf") return "PDF";
    if (kind === "video") return "Video";
    return "File";
}

export default function ReportEvidenceGallery({
    files,
    emptyLabel = "No evidence files in this package.",
}: {
    files: ReportEvidenceGalleryItem[];
    emptyLabel?: string;
}) {
    const items = useMemo(
        () =>
            files
                .filter((file) => file?.url)
                .map((file) => {
                    const kind = (file.kind as ReportEvidenceGalleryKind) || classifyEvidenceGalleryKind(file.url, file.name || "");
                    return {
                        ...file,
                        name: file.name || file.url.split("?")[0].split("/").pop() || "Evidence file",
                        kind,
                    };
                }),
        [files],
    );
    const [open, setOpen] = useState<(typeof items)[number] | null>(null);

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(null);
        };
        window.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [open]);

    if (!items.length) {
        return <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">{emptyLabel}</p>;
    }

    return (
        <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((file) => (
                    <button
                        key={file.url}
                        type="button"
                        onClick={() => setOpen(file)}
                        className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-[#0e7d74] hover:shadow-md"
                    >
                        <div className="relative aspect-[4/3] w-full bg-slate-100">
                            {file.kind === "image" ? (
                                <img src={file.url} alt={file.name} className="h-full w-full object-cover" />
                            ) : file.kind === "pdf" ? (
                                <iframe title={file.name} src={file.url} className="pointer-events-none h-full w-full bg-white" />
                            ) : file.kind === "video" ? (
                                <video src={file.url} className="h-full w-full object-cover" muted playsInline />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-[#eef6f4] text-3xl font-black text-[#0e7d74]">
                                    {kindLabel(file.kind as ReportEvidenceGalleryKind)}
                                </div>
                            )}
                            <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#0e7d74]">
                                {kindLabel(file.kind as ReportEvidenceGalleryKind)}
                            </span>
                        </div>
                        <div className="px-4 py-3">
                            <p className="truncate text-sm font-bold text-slate-900 group-hover:text-[#0e7d74]">{file.name}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">Click to view file</p>
                        </div>
                    </button>
                ))}
            </div>
            {open ? (
                <div
                    className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label={open.name}
                    onClick={() => setOpen(null)}
                >
                    <div
                        className="relative max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-black text-slate-900">{open.name}</p>
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                    {kindLabel(open.kind as ReportEvidenceGalleryKind)} · click outside to close
                                </p>
                            </div>
                            <button
                                type="button"
                                className="rounded-lg px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-100"
                                onClick={() => setOpen(null)}
                            >
                                Close
                            </button>
                        </div>
                        <div className="max-h-[80vh] bg-slate-50 p-3">
                            {open.kind === "image" ? (
                                <img src={open.url} alt={open.name} className="mx-auto max-h-[76vh] w-auto max-w-full object-contain" />
                            ) : open.kind === "pdf" ? (
                                <iframe title={open.name} src={open.url} className="h-[76vh] w-full rounded-lg bg-white" />
                            ) : open.kind === "video" ? (
                                <video src={open.url} className="mx-auto max-h-[76vh] w-full" controls autoPlay />
                            ) : (
                                <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 p-8 text-center">
                                    <p className="text-sm font-semibold text-slate-600">This file type opens in a new tab.</p>
                                    <a
                                        href={open.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rounded-lg bg-[#0e7d74] px-4 py-2 text-sm font-bold text-white"
                                    >
                                        Open file
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
