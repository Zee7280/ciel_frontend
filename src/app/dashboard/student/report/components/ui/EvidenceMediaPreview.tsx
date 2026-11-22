"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { evidenceKindFromMime, evidencePreviewKind, type EvidencePreviewKind } from "../../utils/evidencePreviewKind";

const SNIFF_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
    return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(fallback), ms);
        promise.then(
            (value) => { clearTimeout(timer); resolve(value); },
            () => { clearTimeout(timer); resolve(fallback); },
        );
    });
}

function probeImage(url: string): Promise<boolean> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img.naturalWidth > 0 || img.naturalHeight > 0);
        img.onerror = () => resolve(false);
        img.src = url;
    });
}

function probeVideo(url: string): Promise<boolean> {
    return new Promise((resolve) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        video.onloadedmetadata = () => resolve(true);
        video.onerror = () => resolve(false);
        video.src = url;
    });
}

/**
 * Works out what a stored file really is when neither its MIME type, its name nor its URL says so
 * (a proxied download link, a key without an extension, a caption shown instead of a file name).
 * HEAD first (Content-Type), then the browser itself: an <img> that decodes is an image, a <video>
 * that reads metadata is a video. Returns null when nothing can be told.
 */
export async function sniffEvidenceKind(url: string): Promise<EvidencePreviewKind | null> {
    if (!/^(https?:|blob:)/i.test(url)) return null;
    try {
        const res = await withTimeout(fetch(url, { method: "HEAD", mode: "cors", credentials: "same-origin" }), SNIFF_TIMEOUT_MS, null);
        if (res && res.ok) {
            const kind = evidenceKindFromMime(res.headers.get("content-type"));
            if (kind) return kind;
        }
    } catch {
        // CORS / 405 on HEAD: fall through to the element probes, which do not need CORS.
    }
    if (await withTimeout(probeImage(url), SNIFF_TIMEOUT_MS, false)) return "image";
    if (await withTimeout(probeVideo(url), SNIFF_TIMEOUT_MS, false)) return "video";
    return null;
}

function OpenOriginal({ url, name }: { url: string; name: string }) {
    return (
        <a href={url} download={name} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[var(--teal)] underline">
            Open the file in a new tab
        </a>
    );
}

/**
 * Body of the evidence preview dialog (Sections 6, 7 and 8): images, video, audio and PDFs show
 * inline; anything else gets a clear notice plus a link to open the original.
 *
 * `name` is what the dialog shows (it may be a caption such as "Field visit — 2026-10-10");
 * `fileName` is the stored file's own name when the caller has it. The kind is read from the MIME
 * type, the file name, the URL, and finally from the resource itself, so a PNG linked from an
 * earlier section previews as a PNG instead of "Preview not available for this file type".
 */
export function EvidenceMediaPreview({
    url,
    name,
    mimeType,
    fileName,
}: {
    url: string | null;
    name: string;
    mimeType?: string | null;
    fileName?: string | null;
}) {
    const declared = evidencePreviewKind(mimeType, fileName || name, url);
    const [sniffed, setSniffed] = useState<{ url: string; kind: EvidencePreviewKind | null } | null>(null);
    const [renderFailed, setRenderFailed] = useState<string | null>(null);

    // Both results are keyed by the URL they belong to, so a new URL simply does not match them.
    const needsSniff = Boolean(url) && declared === "file";
    useEffect(() => {
        if (!url || !needsSniff) return;
        let cancelled = false;
        sniffEvidenceKind(url).then((kind) => {
            if (!cancelled) setSniffed({ url, kind });
        });
        return () => { cancelled = true; };
    }, [url, needsSniff]);

    const sniffing = needsSniff && (!sniffed || sniffed.url !== url);
    const kind: EvidencePreviewKind = declared !== "file" ? declared : (sniffed && sniffed.url === url && sniffed.kind) || "file";
    const failed = renderFailed === url;

    if (url && sniffing) {
        return (
            <div className="flex flex-col items-center justify-center space-y-3 p-12 text-slate-400" data-testid="evidence-preview-sniffing">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--teal)]" />
                <p className="text-xs font-semibold">Checking the file type…</p>
            </div>
        );
    }

    if (url && kind === "image" && !failed) {
        return (
            <img
                src={url}
                alt={name}
                className="max-h-[70vh] max-w-full rounded-lg object-contain"
                onError={() => setRenderFailed(url)}
            />
        );
    }

    if (url && kind === "video" && !failed) {
        return (
            <div className="flex w-full flex-col items-center gap-2">
                <video
                    key={url}
                    src={url}
                    controls
                    playsInline
                    preload="metadata"
                    className="max-h-[70vh] w-full max-w-full rounded-lg bg-black"
                    onError={() => setRenderFailed(url)}
                >
                    Your browser cannot play this video here.
                </video>
                <p className="text-xs text-slate-400">
                    If the video does not play in this browser,{" "}
                    <a href={url} download={name} target="_blank" rel="noreferrer" className="font-semibold text-[var(--teal)] underline">
                        download it
                    </a>{" "}
                    to watch it.
                </p>
            </div>
        );
    }

    if (url && kind === "audio" && !failed) {
        return (
            <div className="flex w-full flex-col items-center gap-2 py-8">
                <audio key={url} src={url} controls preload="metadata" className="w-full max-w-md" onError={() => setRenderFailed(url)}>
                    Your browser cannot play this audio here.
                </audio>
                <p className="text-xs text-slate-400">{name}</p>
            </div>
        );
    }

    if (url && kind === "pdf" && !failed) {
        return (
            <div className="flex w-full flex-col items-center gap-2">
                <iframe key={url} src={url} title={name} className="h-[70vh] w-full rounded-lg border border-slate-200 bg-white" />
                <OpenOriginal url={url} name={name} />
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center space-y-4 p-12 text-slate-400" data-testid="evidence-preview-unavailable">
            <FileText className="h-16 w-16 text-slate-200" />
            <p className="text-sm font-semibold">
                {failed ? "This file could not be displayed here" : "Preview not available for this file type"}
            </p>
            <p className="text-xs text-slate-400">({fileName && fileName !== name ? `${name} · ${fileName}` : name})</p>
            {url ? <OpenOriginal url={url} name={name} /> : null}
        </div>
    );
}
