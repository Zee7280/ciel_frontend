/** Shared Email/WhatsApp reminder-link builders — no server-side messaging API exists in this
 * app, so every "remind X" action opens a prefilled mailto: or a wa.me share sheet client-side. */

export function mailtoHref(to: string, subject: string, body: string): string {
    return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function whatsappShareHref(text: string): string {
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
