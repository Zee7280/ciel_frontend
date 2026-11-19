/**
 * CIEL PK's own contact points, shown wherever a flow hands off to the CIEL PK review desk
 * (approval chain "CIEL PK" box, reminder buttons). Same numbers as the footer and the floating
 * support button, kept in one place so they cannot drift apart.
 */
export const CIEL_SUPPORT_EMAIL = "support@cielpk.com";
export const CIEL_SUPPORT_WHATSAPP_E164 = "923712243575";
export const CIEL_SUPPORT_WHATSAPP_DISPLAY = "+92 371 2243575";

/** Human-readable phone for a stored number: `+92 300 1234567` for `03001234567` / `+923001234567`. */
export function formatPhoneDisplay(value: unknown): string {
    if (typeof value !== "string") return "";
    const raw = value.trim();
    if (!raw) return "";
    let digits = raw.replace(/\D/g, "");
    if (digits.startsWith("00")) digits = digits.slice(2);
    else if (digits.startsWith("0") && digits.length === 11) digits = `92${digits.slice(1)}`;
    if (digits.startsWith("920") && digits.length === 13) digits = `92${digits.slice(3)}`;
    else if (digits.startsWith("3") && digits.length === 10) digits = `92${digits}`;
    if (digits.length < 10 || digits.length > 15) return raw;
    if (digits.startsWith("92") && digits.length === 12) return `+92 ${digits.slice(2, 5)} ${digits.slice(5)}`;
    return `+${digits}`;
}
