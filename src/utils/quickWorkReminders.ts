/**
 * Quick Community Impact reminder messages. Like the other reminders in the app (see reminderLinks),
 * they open as a prefilled email or WhatsApp message on the sender's own device; CIEL PK sends nothing.
 */

export type ReminderMessage = { subject: string; body: string };

const FACULTY_QUEUE = "/dashboard/faculty/quick-work";
const STUDENT_LOG = "/dashboard/student/paths/community-service/quick-work";

function origin(): string {
    return typeof window !== "undefined" && window.location?.origin ? window.location.origin : "https://cielpk.com";
}

/** Sign in, then land on `path` (the same return the emailed links use). */
function signInLink(path: string): string {
    return `${origin()}/login?next=${encodeURIComponent(path)}`;
}

function activity(title: string | null | undefined): string {
    return title?.trim() ? `"${title.trim()}"` : "our Quick Community Impact activity";
}

function firstName(name: string | null | undefined, fallback: string): string {
    const n = (name ?? "").trim();
    return n ? n.split(/\s+/)[0] : fallback;
}

/** Lead → a teammate who has not confirmed yet. */
export function teammateReminder(p: { teammateName?: string | null; title?: string | null; leadName?: string | null }): ReminderMessage {
    return {
        subject: `Please confirm your participation: ${p.title?.trim() || "Quick Community Impact"}`,
        body:
            `Hi ${firstName(p.teammateName, "there")},\n\n` +
            `I added you to ${activity(p.title)} under Quick Community Impact on CIEL PK. ` +
            `Please confirm your participation so I can submit it for faculty review. ` +
            `Use the Approve button in the email from CIEL PK, or sign in here: ${signInLink(STUDENT_LOG)}\n\n` +
            `Thanks,\n${p.leadName?.trim() || "Your activity lead"}`,
    };
}

/** Lead or CIEL PK → the faculty member a submitted log is waiting on. */
export function facultyReminder(p: {
    facultyName?: string | null;
    title?: string | null;
    leadName?: string | null;
    submittedOn?: string | null;
    from: "student" | "admin";
}): ReminderMessage {
    const opening =
        p.from === "student"
            ? `This is a gentle reminder that I submitted ${activity(p.title)} under Quick Community Impact on CIEL PK and named you as the supervising faculty member.`
            : `${activity(p.title)}, submitted by ${p.leadName?.trim() || "a student"}${p.submittedOn ? ` on ${p.submittedOn}` : ""} under Quick Community Impact, is waiting for your review on CIEL PK.`;
    return {
        subject: `Reminder: Quick Community Impact awaiting your review: ${p.title?.trim() || "student activity"}`,
        body:
            `Dear ${p.facultyName?.trim() || "Faculty Member"},\n\n` +
            `${opening} Please review it and choose Approve, Request Revision or Reject. ` +
            `You can use the buttons in the email from CIEL PK, or sign in here: ${signInLink(FACULTY_QUEUE)}\n\n` +
            (p.from === "student" ? `Thank you,\n${p.leadName?.trim() || "Student"}` : "Best regards,\nCIEL PK Team"),
    };
}

/** Faculty or CIEL PK → the lead of a log returned for changes. */
export function revisionReminder(p: { leadName?: string | null; title?: string | null; note?: string | null; from: "faculty" | "admin"; senderName?: string | null }): ReminderMessage {
    return {
        subject: `Reminder: please revise ${p.title?.trim() || "your Quick Community Impact log"}`,
        body:
            `Dear ${firstName(p.leadName, "Student")},\n\n` +
            `${activity(p.title)} was returned for changes on CIEL PK${p.note?.trim() ? `: ${p.note.trim()}` : "."}\n` +
            `Please update it and submit it again here: ${signInLink(STUDENT_LOG)}\n\n` +
            (p.from === "admin" ? "Best regards,\nCIEL PK Team" : `Best regards,\n${p.senderName?.trim() || "Your faculty reviewer"}`),
    };
}

/** Faculty → the lead of a log they are reviewing (a question before deciding). */
export function facultyQuestion(p: { leadName?: string | null; title?: string | null; facultyName?: string | null }): ReminderMessage {
    return {
        subject: `About your Quick Community Impact log: ${p.title?.trim() || "activity"}`,
        body:
            `Dear ${firstName(p.leadName, "Student")},\n\n` +
            `I am reviewing ${activity(p.title)} on CIEL PK and have a question before I decide:\n\n` +
            `[Write your question here]\n\n` +
            `Best regards,\n${p.facultyName?.trim() || "Your faculty reviewer"}`,
    };
}
