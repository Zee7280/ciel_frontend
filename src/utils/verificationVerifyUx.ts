/**
 * Backend: faculty and partner both use GET /api/v1/verifications/verify?token=…
 * (same proxy path in this app). Role is encoded in the token only.
 *
 * Partner verify may return 400 until faculty has approved (sequential gate).
 */
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
