/**
 * What the evidence preview dialog can show inline for an attachment. Extensions mirror
 * `REPORT_ATTACHMENT_ACCEPT` (utils/reportAttachmentAccept.ts) so every upload the form accepts
 * is classified.
 *
 * Detection order (first definite answer wins):
 *   1. a real MIME type (image/…, video/…, audio/…, application/pdf) — `application/octet-stream`
 *      and other generic types are ignored;
 *   2. the extension of the file name;
 *   3. the extension of the URL path — evidence collected from earlier sections (attendance
 *      "Field visit — 2026-10-10") is shown under a caption, not its file name, so the stored URL
 *      (`…/attendance-evidence/<uuid>.png?X-Amz-…`) is the only place the type is written;
 *   4. type hints inside a signed URL (`response-content-type=image%2Fpng`) or a `data:` URL.
 * Anything still unknown is "file"; the dialog then sniffs the live resource (see
 * `sniffEvidenceKind` in components/ui/EvidenceMediaPreview.tsx) before giving up.
 */
export type EvidencePreviewKind = "image" | "video" | "audio" | "pdf" | "file";

const IMAGE_EXT = /\.(jpe?g|jfif|pjpeg|png|gif|webp|heic|heif|bmp|avif|svg|tiff?)$/i;
// `.ogg` is an Ogg container that may hold video or audio; a <video> element plays either, so it sits with video.
const VIDEO_EXT = /\.(mp4|m4v|mov|qt|webm|ogv|ogg|mkv|avi|wmv|flv|mpe?g|mpg|mp2|mpe|mpv|3gp|3g2|mts|m2ts|vob|asf|rm|rmvb|f4v|divx)$/i;
const AUDIO_EXT = /\.(mp3|m4a|aac|wav|flac|oga|weba|wma|amr|opus)$/i;
const PDF_EXT = /\.pdf$/i;

/** Kind from a MIME type alone; generic / empty types give null. */
export function evidenceKindFromMime(mimeType: string | null | undefined): EvidencePreviewKind | null {
    const type = String(mimeType || "").trim().toLowerCase().split(";")[0];
    if (!type) return null;
    if (type.startsWith("image/")) return "image";
    if (type.startsWith("video/")) return "video";
    if (type.startsWith("audio/")) return "audio";
    if (type === "application/pdf" || type === "application/x-pdf") return "pdf";
    return null;
}

function kindFromExtension(pathLike: string): EvidencePreviewKind | null {
    const clean = String(pathLike || "").split(/[?#]/)[0];
    if (!clean) return null;
    if (IMAGE_EXT.test(clean)) return "image";
    if (VIDEO_EXT.test(clean)) return "video";
    if (AUDIO_EXT.test(clean)) return "audio";
    if (PDF_EXT.test(clean)) return "pdf";
    return null;
}

/** `response-content-type=` / `content-type=` / `mime=` hints that signed or proxied URLs carry. */
function kindFromUrlHints(url: string): EvidencePreviewKind | null {
    const raw = String(url || "");
    if (!raw) return null;
    const dataMatch = raw.match(/^data:([^;,]+)/i);
    if (dataMatch) return evidenceKindFromMime(dataMatch[1]);
    const query = raw.split("#")[0].split("?")[1] || "";
    if (!query) return null;
    for (const pair of query.split("&")) {
        const [key, value = ""] = pair.split("=");
        let name = (key || "").toLowerCase();
        try {
            name = decodeURIComponent(key || "").toLowerCase();
        } catch {
            // A malformed percent sequence in a pasted link must not break the whole section.
        }
        if (name === "response-content-type" || name === "content-type" || name === "contenttype" || name === "mime" || name === "mimetype") {
            let decoded = value;
            try {
                decoded = decodeURIComponent(value.replace(/\+/g, " "));
            } catch {
                decoded = value;
            }
            const kind = evidenceKindFromMime(decoded);
            if (kind) return kind;
        }
    }
    return null;
}

/**
 * Classifies an evidence item. `name` may be a display caption rather than a file name — pass the
 * stored `url` as well so the type is still read from the file itself.
 */
export function evidencePreviewKind(
    mimeType: string | null | undefined,
    name: string | null | undefined,
    url?: string | null,
): EvidencePreviewKind {
    const safeName = String(name || "");
    const safeUrl = String(url || "");
    return (
        evidenceKindFromMime(mimeType) ||
        kindFromExtension(safeName) ||
        // Older callers pass the URL as the name.
        (safeName !== safeUrl ? kindFromExtension(safeUrl) : null) ||
        kindFromUrlHints(safeName) ||
        kindFromUrlHints(safeUrl) ||
        "file"
    );
}

/** URL of an evidence item in any of the shapes the wizard stores (string, upload record, native File). */
export function evidenceItemUrl(item: unknown): string {
    if (typeof item === "string") return item.trim();
    if (!item || typeof item !== "object") return "";
    const rec = item as Record<string, unknown>;
    for (const key of ["url", "evidence_url", "file_url", "publicUrl", "location", "path"]) {
        const value = rec[key];
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
}

/** File name of an evidence item, if it carries one (never a caption). */
export function evidenceItemFileName(item: unknown): string {
    if (typeof item === "string") return item.split(/[?#]/)[0].split("/").pop() || "";
    if (!item || typeof item !== "object") return "";
    const rec = item as Record<string, unknown>;
    for (const key of ["name", "fileName", "filename", "originalName", "original_name"]) {
        const value = rec[key];
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    const nested = rec.file;
    if (nested && typeof nested === "object" && typeof (nested as { name?: unknown }).name === "string") {
        return String((nested as { name: string }).name);
    }
    const url = evidenceItemUrl(item);
    return url ? url.split(/[?#]/)[0].split("/").pop() || "" : "";
}

/** MIME type of an evidence item, if it carries one. */
export function evidenceItemMimeType(item: unknown): string {
    if (!item || typeof item !== "object") return "";
    const rec = item as Record<string, unknown>;
    for (const key of ["type", "mimeType", "mimetype", "mime_type", "contentType", "content_type"]) {
        const value = rec[key];
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    const nested = rec.file;
    if (nested && typeof nested === "object" && typeof (nested as { type?: unknown }).type === "string") {
        return String((nested as { type: string }).type);
    }
    return "";
}

/** One call for any stored evidence item: MIME, then file name, then the URL it points at. */
export function evidenceItemKind(item: unknown): EvidencePreviewKind {
    return evidencePreviewKind(evidenceItemMimeType(item), evidenceItemFileName(item), evidenceItemUrl(item));
}
