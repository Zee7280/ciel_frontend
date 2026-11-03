"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type ReportEvidenceGalleryKind = "image" | "pdf" | "video" | "file";

/** Viewer-only kind: audio files are classified as "file" for callers but get a player here. */
type ViewerKind = ReportEvidenceGalleryKind | "audio";

export type ReportEvidenceGalleryItem = {
    url: string;
    name: string;
    kind?: string;
    source?: string;
    previewable?: boolean;
    /** Optional one-line note under the file name, e.g. "section3 · Restricted". */
    meta?: string;
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

const AUDIO_EXT = ["mp3", "m4a", "ogg", "wav", "aac"];

function viewerKindOf(file: ReportEvidenceGalleryItem): ViewerKind {
    const kind = (file.kind as ReportEvidenceGalleryKind) || classifyEvidenceGalleryKind(file.url, file.name || "");
    if (kind === "file" && AUDIO_EXT.includes(extOf(file.url, file.name || ""))) return "audio";
    return kind;
}

function kindLabel(kind: ViewerKind): string {
    if (kind === "image") return "Photo";
    if (kind === "pdf") return "PDF";
    if (kind === "video") return "Video";
    if (kind === "audio") return "Audio";
    return "File";
}

type Filter = "all" | ViewerKind;

const FILTERS: Array<{ value: Filter; label: string }> = [
    { value: "all", label: "All evidence" },
    { value: "image", label: "Photos" },
    { value: "video", label: "Videos" },
    { value: "pdf", label: "PDFs" },
    { value: "audio", label: "Audio" },
    { value: "file", label: "Other files" },
];

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
                .map((file) => ({
                    ...file,
                    name: file.name || file.url.split("?")[0].split("/").pop() || "Evidence file",
                    kind: viewerKindOf(file),
                })),
        [files],
    );
    const kindsPresent = useMemo(() => new Set(items.map((item) => item.kind)), [items]);
    const [filter, setFilter] = useState<Filter>("all");
    const visible = useMemo(() => (filter === "all" ? items : items.filter((item) => item.kind === filter)), [items, filter]);
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const [zoomed, setZoomed] = useState(false);
    const lightboxRef = useRef<HTMLDivElement | null>(null);
    const stripRef = useRef<HTMLDivElement | null>(null);

    const open = openIndex != null ? visible[openIndex] ?? null : null;
    const count = visible.length;
    const go = (delta: number) => {
        if (!count) return;
        setOpenIndex((current) => ((((current ?? 0) + delta) % count) + count) % count);
        setZoomed(false);
    };

    useEffect(() => {
        if (openIndex == null) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
                setOpenIndex(null);
            } else if (event.key === "ArrowLeft") go(-1);
            else if (event.key === "ArrowRight") go(1);
        };
        window.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openIndex != null, count]);

    useEffect(() => {
        if (openIndex == null) return;
        const active = stripRef.current?.querySelector<HTMLElement>("[data-active='true']");
        active?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }, [openIndex]);

    // Keep the open slide valid when the filter changes under it.
    useEffect(() => {
        if (openIndex != null && openIndex >= visible.length) setOpenIndex(visible.length ? visible.length - 1 : null);
    }, [visible.length, openIndex]);

    const close = () => {
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
        setOpenIndex(null);
        setZoomed(false);
    };

    const toggleFullscreen = async () => {
        const el = lightboxRef.current;
        if (!el) return;
        try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else await el.requestFullscreen();
        } catch {
            /* full screen not available in this browser — the viewer still works */
        }
    };

    if (!items.length) {
        return <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">{emptyLabel}</p>;
    }

    const showFilter = kindsPresent.size > 1;

    return (
        <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-500">
                    {items.length} file{items.length === 1 ? "" : "s"}
                    {filter !== "all" ? ` · ${visible.length} shown` : ""} · read-only student evidence
                </p>
                <div className="flex flex-wrap items-center gap-2">
                    {showFilter ? (
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                            <span>View</span>
                            <select
                                value={filter}
                                onChange={(event) => setFilter(event.target.value as Filter)}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                                aria-label="Filter evidence by type"
                            >
                                {FILTERS.filter((f) => f.value === "all" || kindsPresent.has(f.value as ViewerKind)).map((f) => (
                                    <option key={f.value} value={f.value}>
                                        {f.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    ) : null}
                    <button
                        type="button"
                        onClick={() => {
                            if (visible.length) {
                                setOpenIndex(0);
                                setZoomed(false);
                            }
                        }}
                        disabled={!visible.length}
                        className="rounded-lg bg-[#0e7d74] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                    >
                        ▶ Open slideshow
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visible.length ? (
                    visible.map((file, index) => (
                        <button
                            key={`${file.url}-${index}`}
                            type="button"
                            onClick={() => {
                                setOpenIndex(index);
                                setZoomed(false);
                            }}
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
                                        {kindLabel(file.kind)}
                                    </div>
                                )}
                                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#0e7d74]">
                                    {kindLabel(file.kind)}
                                </span>
                            </div>
                            <div className="px-4 py-3">
                                <p className="truncate text-sm font-bold text-slate-900 group-hover:text-[#0e7d74]">{file.name}</p>
                                <p className="mt-1 truncate text-xs font-semibold text-slate-500">{file.meta || "Click to view file"}</p>
                            </div>
                        </button>
                    ))
                ) : (
                    <p className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                        No files match this filter. Select “All evidence”.
                    </p>
                )}
            </div>
            {open ? (
                <div
                    ref={lightboxRef}
                    className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/85 p-2 sm:p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label={open.name}
                    onClick={close}
                >
                    <div
                        className="relative flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-black text-slate-900">{open.name}</p>
                                <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                    {openIndex! + 1} of {count} · {kindLabel(open.kind)}
                                    {open.meta ? <span className="normal-case tracking-normal"> · {open.meta}</span> : null}
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                                {open.kind === "image" ? (
                                    <button
                                        type="button"
                                        className="rounded-lg px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-100"
                                        onClick={() => setZoomed((z) => !z)}
                                    >
                                        {zoomed ? "Fit" : "Zoom"}
                                    </button>
                                ) : null}
                                <button
                                    type="button"
                                    className="hidden rounded-lg px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-100 sm:inline-block"
                                    onClick={() => void toggleFullscreen()}
                                >
                                    Full screen
                                </button>
                                <a
                                    href={open.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded-lg px-3 py-1.5 text-sm font-bold text-[#0e7d74] hover:bg-[#eef6f4]"
                                >
                                    Open original
                                </a>
                                <button
                                    type="button"
                                    className="rounded-lg px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-100"
                                    onClick={close}
                                    aria-label="Close viewer"
                                >
                                    ✕ Close
                                </button>
                            </div>
                        </div>
                        <div className={`relative min-h-0 flex-1 bg-slate-50 ${zoomed ? "overflow-auto" : "overflow-hidden"}`}>
                            <div className={zoomed ? "min-h-full p-2" : "flex h-full max-h-[76vh] items-center justify-center p-3"}>
                                {open.kind === "image" ? (
                                    <img
                                        src={open.url}
                                        alt={open.name}
                                        onClick={() => setZoomed((z) => !z)}
                                        className={zoomed ? "mx-auto max-w-none cursor-zoom-out" : "max-h-[74vh] w-auto max-w-full cursor-zoom-in object-contain"}
                                    />
                                ) : open.kind === "pdf" ? (
                                    <iframe title={open.name} src={open.url} className="h-[76vh] w-full rounded-lg bg-white" />
                                ) : open.kind === "video" ? (
                                    <video key={open.url} src={open.url} className="max-h-[74vh] w-full" controls autoPlay playsInline />
                                ) : open.kind === "audio" ? (
                                    <div className="flex w-full max-w-xl flex-col items-center gap-4 p-8">
                                        <span className="text-5xl" aria-hidden>
                                            ♫
                                        </span>
                                        <audio key={open.url} src={open.url} controls className="w-full" />
                                    </div>
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
                            {count > 1 ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => go(-1)}
                                        aria-label="Previous file"
                                        className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-xl font-black text-slate-800 shadow hover:bg-white"
                                    >
                                        ‹
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => go(1)}
                                        aria-label="Next file"
                                        className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-xl font-black text-slate-800 shadow hover:bg-white"
                                    >
                                        ›
                                    </button>
                                </>
                            ) : null}
                        </div>
                        {count > 1 ? (
                            <div ref={stripRef} className="flex gap-2 overflow-x-auto border-t border-slate-100 bg-white px-3 py-2">
                                {visible.map((file, index) => (
                                    <button
                                        key={`${file.url}-${index}`}
                                        type="button"
                                        data-active={index === openIndex ? "true" : "false"}
                                        onClick={() => {
                                            setOpenIndex(index);
                                            setZoomed(false);
                                        }}
                                        title={file.name}
                                        aria-label={`Show ${file.name}`}
                                        className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-slate-100 ${index === openIndex ? "border-[#0e7d74]" : "border-transparent hover:border-slate-300"}`}
                                    >
                                        {file.kind === "image" ? (
                                            <img src={file.url} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <span className="grid h-full w-full place-items-center text-[10px] font-black uppercase text-[#0e7d74]">{kindLabel(file.kind)}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </>
    );
}
