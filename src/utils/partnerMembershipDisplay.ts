/** Must match backend `PARTNER_MEMBERSHIP_REQUIRED_KEY`. */
export const PARTNER_MEMBERSHIP_REQUIRED_KEY = "PARTNER_MEMBERSHIP_REQUIRED";

/** Must match backend `MEMBERSHIP_FEE_PARTNER_PKR_KEY`. */
export const MEMBERSHIP_FEE_PARTNER_PKR_KEY = "MEMBERSHIP_FEE_PARTNER_PKR";

export function parsePartnerMembershipRequiredSettingValue(
    value: string | null | undefined,
    defaultEnabled = false,
): boolean {
    if (value == null || String(value).trim() === "") return defaultEnabled;
    const normalized = String(value).trim().toLowerCase();
    if (["false", "0", "no", "off", "disabled"].includes(normalized)) return false;
    if (["true", "1", "yes", "on", "enabled"].includes(normalized)) return true;
    return defaultEnabled;
}

export function parseMembershipFeePkrSettingValue(
    value: string | null | undefined,
    defaultPkr = 1000,
): number {
    const raw = String(value ?? "").replace(/[^\d]/g, "");
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultPkr;
}

/** Must match backend `PLATFORM_SETTING_KEYS`. */
export const MEMBERSHIP_FEE_UNIVERSITY_PKR_KEY = "MEMBERSHIP_FEE_UNIVERSITY_PKR";
export const MEMBERSHIP_FEE_CORPORATE_PKR_KEY = "MEMBERSHIP_FEE_CORPORATE_PKR";
export const REPORTING_FEE_PKR_KEY = "REPORTING_FEE_PKR";

/** Fee limits enforced by the backend (whole PKR). */
export const FEE_PKR_MIN = 1;
export const FEE_PKR_MAX = 1_000_000;

/** True for a plain whole-number string within [min, max] (no decimals, no signs, no separators). */
export function isValidWholeNumberInRange(value: string | null | undefined, min: number, max: number): boolean {
    const v = String(value ?? "").trim();
    if (!/^\d+$/.test(v)) return false;
    const n = Number(v);
    return Number.isSafeInteger(n) && n >= min && n <= max;
}
