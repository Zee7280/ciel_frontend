/**
 * Super Admin, User Management "Passwords" view: live OTP codes from the backend
 * (`active_otps` on each user row, and GET /admin/otps/active). Pure module (no imports).
 */
export type AdminOtpPurpose = "signup" | "team_verification";

export interface AdminActiveOtp {
    email: string;
    code: string;
    purpose: AdminOtpPurpose;
    expiresAt: string;
    verified: boolean;
    projectTitle: string | null;
    /** List endpoint only: the email already has a CIEL account. */
    hasAccount?: boolean;
}

export function normalizeActiveOtps(raw: unknown): AdminActiveOtp[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((item) => {
            const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
            const code = typeof row.code === "string" ? row.code.trim() : "";
            if (!code) return null;
            const otp: AdminActiveOtp = {
                email: typeof row.email === "string" ? row.email : "",
                code,
                purpose: row.purpose === "team_verification" ? "team_verification" : "signup",
                expiresAt: typeof row.expiresAt === "string" ? row.expiresAt : "",
                verified: row.verified === true,
                projectTitle: typeof row.projectTitle === "string" && row.projectTitle.trim() ? row.projectTitle : null,
            };
            if (typeof row.hasAccount === "boolean") otp.hasAccount = row.hasAccount;
            return otp;
        })
        .filter((otp): otp is AdminActiveOtp => otp !== null);
}

export function otpPurposeLabel(otp: Pick<AdminActiveOtp, "purpose" | "projectTitle">): string {
    if (otp.purpose === "signup") return "Signup";
    return otp.projectTitle ? `Team verification · ${otp.projectTitle}` : "Team verification";
}

/** "4 min left", "under 1 min left", or "expired" relative to `now`. */
export function otpExpiryLabel(expiresAt: string, now: number = Date.now()): string {
    const at = Date.parse(expiresAt);
    if (!Number.isFinite(at)) return "";
    const ms = at - now;
    if (ms <= 0) return "expired";
    const minutes = Math.floor(ms / 60_000);
    return minutes < 1 ? "under 1 min left" : `${minutes} min left`;
}
