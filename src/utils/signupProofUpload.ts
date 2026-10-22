/** File types the backend accepts on `POST /auth/signup-proof` (images or PDF). */
export const SIGNUP_PROOF_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp";
/** The backend allows 10 MB, but Vercel rejects request bodies over ~4.5 MB before they reach it. */
export const SIGNUP_PROOF_MAX_BYTES = 4 * 1024 * 1024;

const ALLOWED_EXT = /\.(pdf|jpe?g|png|webp)$/i;

export type SignupProofDocument = { label: string; url: string; fileName: string };

/** Message to show for a file the backend would refuse, or null when it's fine. */
export function signupProofFileError(file: { name: string; size: number } | null | undefined): string | null {
    if (!file) return null;
    if (!ALLOWED_EXT.test(file.name)) return "Upload a PDF, JPG, PNG or WebP file.";
    if (file.size > SIGNUP_PROOF_MAX_BYTES) return "That file is over 4 MB. Upload a smaller copy or a photo of it.";
    return null;
}

/** Thrown when the API doesn't have the upload endpoint yet (frontend deployed before backend). */
export class SignupProofUnavailableError extends Error {}

/**
 * Uploads one proof file for an account that doesn't exist yet. Only works right after the email
 * OTP is verified and before signup completes (the backend checks that window).
 */
export async function uploadSignupProof(email: string, label: string, file: File): Promise<SignupProofDocument> {
    const fd = new FormData();
    fd.append("email", email);
    fd.append("file", file);
    const res = await fetch("/api/v1/auth/signup-proof", { method: "POST", body: fd });
    const json = (await res.json().catch(() => null)) as { data?: { url?: string; fileName?: string }; message?: unknown } | null;
    const url = json?.data?.url;
    if (res.status === 404) throw new SignupProofUnavailableError("Document upload is not available yet.");
    if (!res.ok || !url) {
        const msg = typeof json?.message === "string" ? json.message : Array.isArray(json?.message) ? json.message.join(" ") : "";
        throw new Error(msg || `Could not upload "${file.name}". Please try again.`);
    }
    return { label, url, fileName: json?.data?.fileName || file.name };
}
