import {
    DEFAULT_PHONE_COUNTRY_KEY,
    composeE164FromDialCode,
    composeInternationalPhone,
    parsePhoneForDisplay,
} from "@/utils/countryCallingCodes";

/**
 * Section 7 "Pakistan contact" phone for read-only dossier / print surfaces.
 * Coerces bare national mobiles and `92…` digits into +E.164 when unambiguous — does not change stored payloads.
 */
export function formatSection7PakistanDialForDisplay(raw: unknown): string {
    const trimmed = typeof raw === "string" ? raw.trim() : raw != null ? String(raw).trim() : "";
    if (!trimmed) return "";

    if (trimmed.startsWith("+")) {
        const { phoneCountryKey, national } = parsePhoneForDisplay(trimmed);
        return composeInternationalPhone(phoneCountryKey, national) || trimmed;
    }

    let d = trimmed.replace(/\D/g, "");
    if (!d) return trimmed;

    if (d.startsWith("92") && d.length >= 12) {
        return composeE164FromDialCode("+92", d.slice(2)) || `+${d}`;
    }

    if (d.length >= 11 && d.startsWith("0")) {
        d = d.slice(1);
    }

    return composeInternationalPhone(DEFAULT_PHONE_COUNTRY_KEY, d) || trimmed;
}
