import { authenticatedFetch } from "@/utils/api";
import { MAX_REPORT_UPLOAD_BYTES, MAX_REPORT_UPLOAD_LABEL } from "@/app/dashboard/student/report/utils/fileUploadLimits";

/** Shared presign → direct-S3-PUT upload, generalized from attendanceEvidenceUpload.ts's proven
 * implementation. Use this for any "POST presign, PUT to S3" flow instead of hand-rolling the
 * fetch calls again — the naive version (presign + raw fetch PUT with no fallback Content-Type and
 * a swallowed catch) has repeatedly shipped bugs: an empty `file.type` (common for HEIC/some mobile
 * photos) makes the PUT's Content-Type header not match what was presigned, S3 then rejects the
 * request with a signature/policy error, and a blind `catch { setError("Upload failed") }` hides
 * that reason from both the student and whoever has to debug the report. */

const PRESIGN_TIMEOUT_MS = 30_000;
const S3_PUT_TIMEOUT_MS = 60 * 60 * 1000;

type PresignResponse = {
    uploadUrl?: string;
    publicUrl?: string;
    url?: string;
};

function pickPresignPayload(json: unknown): PresignResponse | null {
    if (!json || typeof json !== "object") return null;
    const root = json as Record<string, unknown>;
    const data = root.data;
    const row =
        data && typeof data === "object" && !Array.isArray(data)
            ? (data as PresignResponse)
            : (root as PresignResponse);
    if (!row.uploadUrl) return null;
    return row;
}

/** Presigns `file` against `presignPath` (a POST endpoint accepting {filename, contentType, size}
 * and returning {data: {uploadUrl, publicUrl}}), then PUTs the file straight to S3. Throws an
 * `Error` with a real, user-showable reason on any failure — never swallow it into a generic
 * "upload failed" message; surface `(err as Error).message` to the student instead. */
export async function uploadFileViaPresign(presignPath: string, file: File): Promise<string> {
    if (file.size > MAX_REPORT_UPLOAD_BYTES) {
        throw new Error(`File exceeds ${MAX_REPORT_UPLOAD_LABEL}. Use a smaller file or compress it.`);
    }

    const contentType = file.type || "application/octet-stream";
    const res = await authenticatedFetch(
        presignPath,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: file.name, contentType, size: file.size }),
        },
        { timeoutMs: PRESIGN_TIMEOUT_MS, redirectToLogin: true },
    );

    if (!res) {
        throw new Error("Could not reach the server to prepare the upload — check your connection and try again.");
    }
    if (!res.ok) {
        const text = (await res.text().catch(() => "")) || "";
        let detail = text.trim();
        try {
            const parsed = JSON.parse(text) as { message?: string | string[] };
            if (typeof parsed.message === "string") detail = parsed.message;
            else if (Array.isArray(parsed.message)) detail = parsed.message.join(" ");
        } catch {
            /* not JSON — use the raw text above */
        }
        if (res.status === 413 || /payload too large/i.test(detail)) {
            throw new Error(`File is too large for the server (max ${MAX_REPORT_UPLOAD_LABEL}). Use a smaller file.`);
        }
        throw new Error(detail.slice(0, 240) || `Could not prepare the upload (HTTP ${res.status}).`);
    }

    const json = await res.json().catch(() => ({}));
    const signed = pickPresignPayload(json);
    const publicUrl = signed?.publicUrl || signed?.url;
    if (!signed?.uploadUrl || !publicUrl) {
        throw new Error("Upload URL missing from the server's response. Try again.");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), S3_PUT_TIMEOUT_MS);
    let putRes: Response;
    try {
        putRes = await fetch(signed.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": contentType },
            body: file,
            signal: controller.signal,
        });
    } catch (err) {
        clearTimeout(timeoutId);
        throw new Error(`Network error while uploading "${file.name}" — check your connection and try again.${err instanceof Error ? ` (${err.message})` : ""}`);
    }
    clearTimeout(timeoutId);

    if (!putRes.ok) {
        const detail = (await putRes.text().catch(() => "")).trim();
        throw new Error(`Upload of "${file.name}" failed (HTTP ${putRes.status})${detail ? `: ${detail.slice(0, 200)}` : ". Check the file type and try again."}`);
    }

    return publicUrl;
}
