/** Shared Email/WhatsApp reminder-link builders — no server-side messaging API exists in this
 * app, so every "remind X" action opens a prefilled mailto: or a wa.me share sheet client-side. */

export function mailtoHref(to: string, subject: string, body: string): string {
    return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function whatsappShareHref(text: string): string {
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Same sanitizers as the FYP/Coursework team-member WhatsApp fields — kept in sync by hand. */
function normalizeCountryCode(v?: string) {
    const d = String(v || "").replace(/\D/g, "").slice(0, 4);
    return d ? `+${d}` : "";
}
function normalizeLocalNumber(v?: string) {
    return String(v || "").replace(/\D/g, "").replace(/^0+/, "").slice(0, 15);
}

/** Targets a specific person's WhatsApp number (falls back to the generic share sheet when the
 * number is missing/invalid) — used for per-recipient reminder buttons that name who they reach. */
export function whatsappTargetedHref(whatsappCode: string | undefined, whatsappNumber: string | undefined, text: string): string {
    const code = normalizeCountryCode(whatsappCode || "+92");
    const local = normalizeLocalNumber(whatsappNumber);
    if (!code || local.length < 6) return whatsappShareHref(text);
    return `https://wa.me/${code.replace("+", "")}${local}?text=${encodeURIComponent(text)}`;
}
