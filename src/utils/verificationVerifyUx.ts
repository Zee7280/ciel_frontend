import { verificationUsePost } from "@/config/verification";

/**
 * Backend: GET `/verifications/verify?token=…` or POST body `{ token }` (see env below).
 * Verify pages only call after login — send `Authorization: Bearer …` (proxy forwards it).
 * Optional POST when `NEXT_PUBLIC_VERIFICATION_VERIFY_USE_POST=true`.
 *
 * Partner verify may return 400 until faculty has approved (sequential gate).
 */
/** Faculty / partner project verification (Next proxy → backend). */
export function fetchVerificationVerify(token: string, bearerToken: string | null): Promise<Response> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;

    if (verificationUsePost()) {
        headers["Content-Type"] = "application/json";
        return fetch("/api/v1/verifications/verify", {
            method: "POST",
            headers,
            body: JSON.stringify({ token }),
        });
    }

    return fetch(`/api/v1/verifications/verify?token=${encodeURIComponent(token)}`, {
        method: "GET",
        headers,
    });
}

export function friendlyVerificationVerifyMessage(apiMessage: string | undefined, httpStatus: number): string {
    const raw = (apiMessage || "").trim();
    const m = raw.toLowerCase();
    if (
        httpStatus === 400 &&
        m &&
        (m.includes("partner verification") || m.includes("only available after")) &&
        (m.includes("faculty") || m.includes("supervisor"))
    ) {
        return "Partner confirmation is not available yet. The supervising faculty must approve this opportunity first; then open the partner email link again.";
    }
    return raw;
}

/** English defaults; backend `message` wins when present (403). */
export function resolveVerificationVerifyUserMessage(apiMessage: string | undefined, httpStatus: number): string {
    const trimmed = (apiMessage || "").trim();
    if (httpStatus === 401) {
        return trimmed || "Please sign in first.";
    }
    if (httpStatus === 403) {
        return (
            trimmed ||
            "This link is not linked to your account. Sign in with the same email address that received this verification link."
        );
    }
    if (httpStatus === 404) {
        return trimmed || "This link is invalid or has expired.";
    }
    const friendly = friendlyVerificationVerifyMessage(trimmed, httpStatus);
    if (friendly) return friendly;
    return trimmed || "Verification failed.";
}

export function outcomeFromVerificationResponse(
    response: Response,
    data: { success?: boolean; message?: string },
    defaultSuccessMessage: string,
): { kind: "success" | "error" | "auth_required"; message: string } {
    if (response.ok && data.success === true) {
        const m = typeof data.message === "string" && data.message.trim() ? data.message.trim() : "";
        return { kind: "success", message: m || defaultSuccessMessage };
    }
    if (response.status === 401) {
        return {
            kind: "auth_required",
            message: resolveVerificationVerifyUserMessage(data.message, 401),
        };
    }
    if (response.status === 403) {
        return {
            kind: "auth_required",
            message: resolveVerificationVerifyUserMessage(data.message, 403),
        };
    }
    return {
        kind: "error",
        message: resolveVerificationVerifyUserMessage(data.message, response.status),
    };
}
