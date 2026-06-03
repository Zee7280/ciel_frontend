import { authenticatedFetch } from "@/utils/api";
import { MAX_REPORT_UPLOAD_BYTES, MAX_REPORT_UPLOAD_LABEL } from "@/app/dashboard/student/report/utils/fileUploadLimits";

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

/**
 * Upload attendance evidence via presigned S3 PUT (small JSON to API only).
 * Avoids Vercel `FUNCTION_PAYLOAD_TOO_LARGE` when posting multipart through the BFF.
 */
export async function uploadAttendanceEvidenceViaPresign(file: File): Promise<string> {
    if (file.size > MAX_REPORT_UPLOAD_BYTES) {
        throw new Error(`Photo exceeds ${MAX_REPORT_UPLOAD_LABEL}. Use a smaller image or compress it.`);
    }

    const res = await authenticatedFetch(
        "/api/v1/engagement/attendance/evidence/presign",
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                filename: file.name,
                contentType: file.type || "application/octet-stream",
                size: file.size,
            }),
        },
        { timeoutMs: PRESIGN_TIMEOUT_MS },
    );

    if (!res?.ok) {
        const text = (await res?.text().catch(() => "")) || "";
        if (res?.status === 413 || text.includes("PAYLOAD_TOO_LARGE") || text.includes("Too Large")) {
            throw new Error(
                "Photo is too large for the app gateway. Try a smaller JPG, or update the app — a fix is deploying that uploads directly to storage.",
            );
        }
        throw new Error(
            text.trim().slice(0, 200) || `Could not prepare upload (HTTP ${res?.status ?? "unknown"}).`,
        );
    }

    const json = await res.json().catch(() => ({}));
    const signed = pickPresignPayload(json);
    const publicUrl = signed?.publicUrl || signed?.url;
    if (!signed?.uploadUrl || !publicUrl) {
        throw new Error("Upload URL missing from server. Try again or save without a photo.");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), S3_PUT_TIMEOUT_MS);
    let putRes: Response;
    try {
        putRes = await fetch(signed.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type || "application/octet-stream" },
            body: file,
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timeoutId);
    }

    if (!putRes.ok) {
        throw new Error(`Photo upload failed (${putRes.status}). Check connection and try again.`);
    }

    return publicUrl;
}
