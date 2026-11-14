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

/** Phone number (digits) and prefilled text of a WhatsApp link; null for a non-WhatsApp link. */
export function parseWhatsAppHref(href: string): { digits: string; text: string } | null {
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
    return { digits, text };
}

/**
 * Rewrites any WhatsApp link (`wa.me/…`, `api.whatsapp.com/send…`, `web.whatsapp.com/send…`) to the
 * form that works on THIS device — see `whatsappOpenHref`. Returns null for a non-WhatsApp link, and the
 * same string when nothing needs to change. Pure, so the page can keep its static `href` (no hydration
 * mismatch) and only swap at click time.
 */
export function rewriteWhatsAppHrefForDevice(href: string, nav?: NavigatorLike | null): string | null {
    const parts = parseWhatsAppHref(href);
    if (!parts) return null;
    if (!parts.digits && !parts.text) return href; // e.g. the bare support link: nothing to prefill, leave it alone
    return whatsappOpenHref(parts.text, parts.digits, nav);
}

/** The installed WhatsApp desktop app's own link (opens the chat, or the contact picker without a number). */
export function whatsappAppHref(text: string, digits = ""): string {
    return `whatsapp://send?${digits ? `phone=${digits}&` : ""}text=${encodeURIComponent(text)}`;
}

/**
 * Opens a URL in a new tab and reports whether it opened. `window.open(…, "noopener")` returns null
 * even when the tab DID open, which made callers think a popup blocker fired and also navigate the
 * current page — so the opener link is cut by hand instead.
 */
export function openInNewTab(url: string): boolean {
    if (typeof window === "undefined") return false;
    const opened = window.open(url, "_blank");
    if (!opened) return false;
    try {
        opened.opener = null;
    } catch {
        /* cross-origin: nothing to cut */
    }
    return true;
}

/** How long the desktop app gets to take focus before WhatsApp Web opens instead. */
export const WHATSAPP_APP_FALLBACK_MS = 1500;

/**
 * Opens WhatsApp for this device. A phone opens the WhatsApp app (wa.me). A computer first asks the
 * installed WhatsApp desktop app (`whatsapp://`); when nothing takes focus in time (no app, or the
 * browser ignored the link), WhatsApp Web opens in ONE new tab. The current page never navigates away
 * unless a popup blocker stops that tab.
 */
export function openWhatsApp(text: string, digits = ""): void {
    if (typeof window === "undefined") return;
    const fallback = whatsappOpenHref(text, digits);
    if (isMobileBrowser()) {
        if (!openInNewTab(fallback)) window.location.href = fallback;
        return;
    }
    let handedOff = false;
    const mark = () => {
        handedOff = true;
    };
    const onVisibility = () => {
        if (document.visibilityState === "hidden") mark();
    };
    window.addEventListener("blur", mark);
    document.addEventListener("visibilitychange", onVisibility);
    window.location.href = whatsappAppHref(text, digits);
    window.setTimeout(() => {
        window.removeEventListener("blur", mark);
        document.removeEventListener("visibilitychange", onVisibility);
        if (handedOff) return;
        if (!openInNewTab(fallback)) window.location.href = fallback;
    }, WHATSAPP_APP_FALLBACK_MS);
}

export type MailtoParts = { to: string; cc: string; bcc: string; subject: string; body: string };

/** Pull recipient / subject / body back out of a `mailto:` href (null for any other link). */
export function parseMailtoHref(href: string): MailtoParts | null {
    if (!/^mailto:/i.test(href || "")) return null;
    const rest = href.slice(7);
    const q = rest.indexOf("?");
    const dec = (v: string) => {
        try {
            return decodeURIComponent(v.replace(/\+/g, "%2B"));
        } catch {
            return v;
        }
    };
    const params = new URLSearchParams(q >= 0 ? rest.slice(q + 1) : "");
    return {
        to: dec(q >= 0 ? rest.slice(0, q) : rest).trim(),
        cc: (params.get("cc") || "").trim(),
        bcc: (params.get("bcc") || "").trim(),
        subject: params.get("subject") || "",
        body: params.get("body") || "",
    };
}

/** Gmail's web compose window, prefilled — the fallback when no desktop mail app answers `mailto:`. */
export function gmailComposeHref(p: Pick<MailtoParts, "to" | "subject" | "body"> & Partial<MailtoParts>): string {
    const u = new URLSearchParams({ view: "cm", fs: "1" });
    if (p.to) u.set("to", p.to);
    if (p.cc) u.set("cc", p.cc);
    if (p.bcc) u.set("bcc", p.bcc);
    if (p.subject) u.set("su", p.subject);
    if (p.body) u.set("body", p.body);
    return `https://mail.google.com/mail/?${u.toString()}`;
}

/** Outlook.com / Microsoft 365 web compose, prefilled. */
export function outlookComposeHref(p: Pick<MailtoParts, "to" | "subject" | "body"> & Partial<MailtoParts>): string {
    const u = new URLSearchParams({ path: "/mail/action/compose" });
    if (p.to) u.set("to", p.to);
    if (p.cc) u.set("cc", p.cc);
    if (p.subject) u.set("subject", p.subject);
    if (p.body) u.set("body", p.body);
    return `https://outlook.office.com/mail/deeplink/compose?${u.toString()}`;
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

/**
 * wa.me digits for a user account's stored contact: the signup form keeps a dial code (`+92`) and a
 * national number (`3001234567` / `03001234567`) in two columns, while older rows hold one
 * international string. "" when nothing usable is on file.
 */
export function contactWhatsappDigits(countryCode: unknown, phone: unknown): string {
    const raw = typeof phone === "string" ? phone.trim() : "";
    if (!raw) return "";
    const cc = typeof countryCode === "string" ? countryCode.replace(/\D/g, "") : "";
    if (raw.startsWith("+") || raw.startsWith("00") || !cc) return whatsappDigits(raw);
    const national = raw.replace(/\D/g, "").replace(/^0+/, "");
    if (!national) return "";
    // A national number that already repeats the dial code ("923001234567" under +92).
    const digits = national.startsWith(cc) && national.length > cc.length + 6 ? national : `${cc}${national}`;
    return digits.length >= 10 && digits.length <= 15 ? digits : "";
}

/** Like whatsappHrefFromE164, but also accepts Pakistani local formats (03…). Null when unusable. */
export function whatsappHrefForPhone(phone: string | null | undefined, text: string): string | null {
    const digits = whatsappDigits(phone);
    return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : null;
}
