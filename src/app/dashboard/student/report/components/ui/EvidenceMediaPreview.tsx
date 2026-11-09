"use client";

import { FileText } from "lucide-react";
import { evidencePreviewKind } from "../../utils/evidencePreviewKind";

/**
 * Body of the evidence preview dialog (Sections 6, 7 and 8): images, video and audio play inline;
 * anything else gets a clear notice plus a link to open the original. Before this the dialog only
 * knew images, so a `.mov` / `.mp4` showed "Preview not available for this file type".
 */
export function EvidenceMediaPreview({ url, name, mimeType }: { url: string | null; name: string; mimeType?: string | null }) {
    const kind = evidencePreviewKind(mimeType, name);

    if (url && kind === "image") {
        return <img src={url} alt={name} className="max-h-[70vh] max-w-full rounded-lg object-contain" />;
    }

    if (url && kind === "video") {
        return (
            <div className="flex w-full flex-col items-center gap-2">
                <video key={url} src={url} controls playsInline preload="metadata" className="max-h-[70vh] w-full max-w-full rounded-lg bg-black">
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

    if (url && kind === "audio") {
        return (
            <div className="flex w-full flex-col items-center gap-2 py-8">
                <audio key={url} src={url} controls preload="metadata" className="w-full max-w-md">
                    Your browser cannot play this audio here.
                </audio>
                <p className="text-xs text-slate-400">{name}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center space-y-4 p-12 text-slate-400">
            <FileText className="h-16 w-16 text-slate-200" />
            <p className="text-sm font-semibold">Preview not available for this file type</p>
            <p className="text-xs text-slate-400">({name})</p>
            {url ? (
                <a href={url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[var(--teal)] underline">
                    Open the file in a new tab
                </a>
            ) : null}
        </div>
    );
}
