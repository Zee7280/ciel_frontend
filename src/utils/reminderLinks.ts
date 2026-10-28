/** Shared Email/WhatsApp reminder-link builders — no server-side messaging API exists in this
 * app, so every "remind X" action opens a prefilled mailto: or a wa.me share sheet client-side. */

export function mailtoHref(to: string, subject: string, body: string): string {
    return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function whatsappShareHref(text: string): string {
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function formatSentWaiting(iso?: string | null): string {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    const sent = date.toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
    const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
    const waiting = days < 1 ? "today" : days === 1 ? "1 day" : `${days} days`;
    return `Sent: ${sent} · Waiting ${waiting}`;
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

/** Direct wa.me link for a stored E.164 (or digits) number. Returns null when unusable. */
export function whatsappHrefFromE164(phone: string | null | undefined, text: string): string | null {
    const digits = String(phone || "").replace(/\D/g, "");
    if (digits.length < 10) return null;
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** wa.me digits for a stored phone (+92…, 0092…, 03…, 3…); "" when the number is unusable. */
export function whatsappDigits(value: unknown): string {
    if (typeof value !== "string") return "";
    let digits = value.trim().replace(/\D/g, "");
    if (digits.startsWith("00")) digits = digits.slice(2);
    else if (digits.startsWith("0") && digits.length === 11) digits = `92${digits.slice(1)}`;
    // "+92 0300 1234567": the trunk 0 after the country code is not dialled.
    if (digits.startsWith("920") && digits.length === 13) digits = `92${digits.slice(3)}`;
    else if (digits.startsWith("3") && digits.length === 10) digits = `92${digits}`;
    return digits.length >= 10 && digits.length <= 15 ? digits : "";
}

/** Like whatsappHrefFromE164, but also accepts Pakistani local formats (03…). Null when unusable. */
export function whatsappHrefForPhone(phone: string | null | undefined, text: string): string | null {
    const digits = whatsappDigits(phone);
    return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : null;
}
