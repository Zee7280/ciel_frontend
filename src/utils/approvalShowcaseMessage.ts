/**
 * WhatsApp message CIEL PK sends a student once Super Admin approves their report (certificate issued),
 * asking permission to showcase the project on social media. No messaging API exists in this app, so the
 * Admin verify page opens a prefilled WhatsApp chat per participant. Pure module (no imports), so
 * node:test can load it directly.
 */

export const APPROVAL_SHOWCASE_WHATSAPP_TEXT = [
    "Dear Student,",
    "",
    "Congratulations on successfully completing your community service project and receiving your certificate! 🎉",
    "",
    "We would love to *showcase your inspiring work on CIEL PK’s Instagram and social media platforms*, celebrating your contribution and inspiring others to make a difference.",
    "",
    "We would appreciate your permission to feature your project. If you would also like us to tag your personal Instagram profile, please share your handle with us.",
    "",
    "Together, let’s inspire a culture of community impact! 🌍💙",
].join("\n");

export type ApprovalWhatsappRecipient = {
    key: string;
    name: string;
    role: string;
    /** Stored phone as entered (+92…, 03…); the caller turns it into wa.me digits. "" when none. */
    phone: string;
};

function text(value: unknown): string {
    return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function personName(person: Record<string, unknown>): string {
    return text(person.fullName) || text(person.name) || text(person.full_name);
}

function personPhone(person: Record<string, unknown>): string {
    return text(person.mobile) || text(person.phone) || text(person.whatsapp);
}

/**
 * The report's participants in certificate order (lead first, then members), one entry per person:
 * a member repeating the lead (same id, email or phone) is dropped.
 */
export function approvalWhatsappRecipients(section1: unknown, fallbackName = ""): ApprovalWhatsappRecipient[] {
    const s1 = section1 && typeof section1 === "object" ? (section1 as Record<string, unknown>) : {};
    const lead = s1.team_lead && typeof s1.team_lead === "object" ? (s1.team_lead as Record<string, unknown>) : {};
    const isTeam = s1.participation_type === "team";
    const out: ApprovalWhatsappRecipient[] = [];
    const seen = new Set<string>();
    const remember = (person: Record<string, unknown>) => {
        const keys = [text(person.id), text(person.email).toLowerCase(), personPhone(person).replace(/\D/g, "").slice(-10)].filter(
            (k) => k.length >= 3,
        );
        const dup = keys.some((k) => seen.has(k));
        keys.forEach((k) => seen.add(k));
        return dup;
    };

    remember(lead);
    out.push({
        key: "lead",
        name: personName(lead) || fallbackName || "Student",
        role: isTeam ? "Team Lead" : "Student",
        phone: personPhone(lead),
    });
    if (!isTeam) return out;

    const members = Array.isArray(s1.team_members) ? s1.team_members : [];
    members.forEach((raw, index) => {
        if (!raw || typeof raw !== "object") return;
        const member = raw as Record<string, unknown>;
        if (remember(member)) return;
        out.push({
            key: text(member.id) || `member-${index}`,
            name: personName(member) || `Team member ${index + 1}`,
            role: text(member.role) || "Team member",
            phone: personPhone(member),
        });
    });
    return out;
}
