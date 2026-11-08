/** Shared Email/WhatsApp reminder-link builders — no server-side messaging API exists in this
 * app, so every "remind X" action opens a prefilled mailto: or a wa.me share sheet client-side. */

export function mailtoHref(to: string, subject: string, body: string): string {
    return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function whatsappShareHref(text: string): string {
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Phones and tablets (where the WhatsApp app handles `api.whatsapp.com`), as opposed to a desktop browser. */
type NavigatorLike = { userAgent?: string; maxTouchPoints?: number; userAgentData?: { mobile?: boolean } };

export function isMobileBrowser(nav?: NavigatorLike | null): boolean {
    const n: NavigatorLike | null = nav === undefined ? (typeof navigator === "undefined" ? null : (navigator as NavigatorLike)) : nav;
    if (!n) return false;
    // Either signal is enough: the Client Hints flag, or a phone / tablet in the user agent.
    if (n.userAgentData?.mobile === true) return true;
    const ua = n.userAgent ?? "";
    // iPadOS reports itself as a Mac but has a touch screen.
    return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (/Macintosh/.test(ua) && (n.maxTouchPoints ?? 0) > 1);
}

/**
 * The WhatsApp link to open on THIS device. A bare `wa.me/?text=` link is unreliable on a desktop browser
 * (it needs WhatsApp's landing page and often ends on a blank or error page), so a desktop opens WhatsApp Web
 * directly (into the person's chat when the number is known, else to pick a contact) and a phone opens the app.
 */
export function whatsappOpenHref(text: string, digits = "", nav?: NavigatorLike | null): string {
    const encoded = encodeURIComponent(text);
    if (isMobileBrowser(nav)) {
        return digits ? `https://wa.me/${digits}?text=${encoded}` : `https://api.whatsapp.com/send?text=${encoded}`;
    }
    return digits ? `https://web.whatsapp.com/send?phone=${digits}&text=${encoded}` : `https://web.whatsapp.com/send?text=${encoded}`;
}

/**
 * Rewrites any WhatsApp link (`wa.me/…`, `api.whatsapp.com/send…`, `web.whatsapp.com/send…`) to the
 * form that works on THIS device — see `whatsappOpenHref`. Returns null for a non-WhatsApp link, and the
 * same string when nothing needs to change. Pure, so the page can keep its static `href` (no hydration
 * mismatch) and only swap at click time.
 */
export function rewriteWhatsAppHrefForDevice(href: string, nav?: NavigatorLike | null): string | null {
    let url: URL;
    try {
        url = new URL(href);
    } catch {
        return null;
    }
    const host = url.hostname.toLowerCase();
    if (!["wa.me", "www.wa.me", "api.whatsapp.com", "web.whatsapp.com", "whatsapp.com", "www.whatsapp.com"].includes(host)) return null;
    const text = url.searchParams.get("text") ?? "";
    let digits = (url.searchParams.get("phone") ?? "").replace(/\D/g, "");
    if (!digits && host.endsWith("wa.me")) digits = url.pathname.replace(/\D/g, "");
    if (!digits && !text) return href; // e.g. the bare support link: nothing to prefill, leave it alone
    return whatsappOpenHref(text, digits, nav);
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
