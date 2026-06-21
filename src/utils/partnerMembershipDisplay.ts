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
