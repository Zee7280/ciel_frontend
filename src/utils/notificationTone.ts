/**
 * Rejections arrive with type "approval" or "update" (e.g. "Partner Rejected"), so the type alone
 * would draw them with the green success style. Read the title too.
 */
export function notificationDisplayType(n: { type?: string | null; title?: string | null }): string {
    if (/\b(reject|rejected|declined|not approved)\b/i.test(String(n.title ?? ""))) return "rejected";
    return String(n.type ?? "");
}
