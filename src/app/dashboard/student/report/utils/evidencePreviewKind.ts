/**
 * What the evidence preview dialog can show inline for an attachment. Extensions mirror
 * `REPORT_ATTACHMENT_ACCEPT` (utils/reportAttachmentAccept.ts) so every upload the form accepts
 * is classified; the MIME type wins when the browser / server supplied one.
 */
export type EvidencePreviewKind = "image" | "video" | "audio" | "pdf" | "file";

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|heic|heif|bmp|avif)$/i;
// `.ogg` is an Ogg container that may hold video or audio; a <video> element plays either, so it sits with video.
const VIDEO_EXT = /\.(mp4|m4v|mov|qt|webm|ogv|ogg|mkv|avi|wmv|flv|mpe?g|mpg|mp2|mpe|mpv|3gp|3g2|mts|m2ts|vob|asf|rm|rmvb|f4v|divx)$/i;
const AUDIO_EXT = /\.(mp3|m4a|aac|wav|flac|oga|weba|wma|amr|opus)$/i;

export function evidencePreviewKind(mimeType: string | null | undefined, name: string | null | undefined): EvidencePreviewKind {
    const type = String(mimeType || "").toLowerCase();
    const fileName = String(name || "").split(/[?#]/)[0];
    if (type.startsWith("image/") || IMAGE_EXT.test(fileName)) return "image";
    if (type.startsWith("video/") || VIDEO_EXT.test(fileName)) return "video";
    if (type.startsWith("audio/") || AUDIO_EXT.test(fileName)) return "audio";
    if (type === "application/pdf" || /\.pdf$/i.test(fileName)) return "pdf";
    return "file";
}
