/**
 * Section 9.5 → "Immediate notice": the advance partner nomination email the designer's prototype
 * shows as a separate event from the later verification questionnaire.
 *
 * Phase A (this file): preview only. These helpers build the subject, the plain-text body, the
 * production blockers, a personal calendar reminder (.ics) and a Google Calendar link so the
 * student can see exactly what the partner would receive. Nothing here sends anything; the
 * automatic dispatch is a later, feature-flagged backend step.
 *
 * Pure functions, no React: covered by tests/followupNotice.test.mjs.
 */

export type NoticeInput = {
    projectTitle: string;
    projectId: string;
    reportId?: string;
    organization: string;
    location: string;
    university: string;
    periodStart: string;
    periodEnd: string;
    objective: string;
    partnerName: string;
    partnerEmail: string;
    optedOut?: boolean;
    /** yyyy-mm-dd expected questionnaire date ("" when the end date is unknown). */
    dueDate: string;
    /** "3 months after project end" etc. */
    intervalLabel: string;
    /** Up to three tentative questions, already filtered to non-blank text. */
    questions: string[];
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEST_TITLE_RE = /\btest\d*\b|dont apply|don't apply|\bsample\b|\bdemo\b/i;

export function prettyNoticeDate(iso: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return "date pending";
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function noticeSubject(input: Pick<NoticeInput, "projectId" | "projectTitle">): string {
    return `CIEL PK | You have been nominated for an impact follow-up | ${input.projectId || "[PROJECT ID]"} | ${input.projectTitle}`;
}

/** What production must have before the automatic email may go out. Empty = eligible. */
export function noticeBlockers(input: NoticeInput): string[] {
    const missing: string[] = [];
    if (!input.projectId.trim()) missing.push("Official Project ID missing");
    if (TEST_TITLE_RE.test(input.projectTitle)) missing.push("Replace the sample / test project title");
    if (!input.organization.trim()) missing.push("Organization name missing");
    if (!EMAIL_RE.test(input.partnerEmail.trim())) missing.push("Confirmed partner email missing");
    if (!input.periodEnd) missing.push("Project end date missing");
    if (!input.dueDate) missing.push("Expected follow-up date cannot be computed");
    if (input.optedOut) missing.push("Partner has opted out");
    return missing;
}

/** The three tentative questions the notice previews (never more than three, never blank). */
export function noticeQuestions(questions: Array<{ include?: boolean; questionText?: string }>): string[] {
    return questions
        .filter((q) => q.include !== false && typeof q.questionText === "string" && q.questionText.trim())
        .slice(0, 3)
        .map((q) => (q.questionText as string).trim());
}

/** Plain-text body (what "Copy notice email" copies). */
export function noticeText(input: NoticeInput): string {
    const org = input.organization || "the partner organization";
    const due = prettyNoticeDate(input.dueDate);
    const qs = input.questions.length
        ? input.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")
        : "The final questions will be determined from the approved project report.";
    return [
        `Dear ${input.partnerName || "Partner Representative"},`,
        "",
        "Thank you for partnering with students to create meaningful community impact.",
        "",
        `A student team from ${input.university || "the university"} has listed ${org} as the partner organization and nominated you as the contact for a future sustainability follow-up through CIEL PK.`,
        "",
        "PROJECT REFERENCE",
        `Project: ${input.projectTitle}`,
        `Project ID: ${input.projectId || "[OFFICIAL PROJECT ID REQUIRED]"}`,
        `Report ID: ${input.reportId || "Pending / not yet provided"}`,
        `Organization: ${org}`,
        `Location: ${input.location || "—"}`,
        `University: ${input.university || "—"}`,
        `Project period: ${prettyNoticeDate(input.periodStart)} – ${prettyNoticeDate(input.periodEnd)}`,
        `Project objective: ${input.objective || "—"}`,
        `Expected follow-up: ${due} (${input.intervalLabel || "after the planned project end date"})`,
        "",
        "WHAT HAPPENS NEXT?",
        "After the scheduled interval, CIEL PK expects to send you a brief, project-specific questionnaire about whether the project's benefits have continued. Based on the activities and intended outcomes currently listed, we may ask:",
        qs,
        "",
        "These are tentative questions, not claims that any activity has already been completed. The final questions will be based on the approved report and may change. If the project end date changes, the planned follow-up date may also change.",
        "",
        "NO IMPACT ANSWERS ARE REQUIRED TODAY. Please reply to this message to confirm that you are the appropriate organization contact for this later follow-up. If you are not the right person or would prefer not to receive this request, please tell us by replying.",
        "",
        `You can optionally add ${due} to your calendar as a personal reminder. This is not a meeting invitation; the verification questionnaire will arrive by email when due, subject to the final report being approved.`,
        "",
        "Your feedback helps students learn accountability, develop sustainable community engagement practices and understand which benefits continue over time.",
        "",
        "Warm regards,",
        "CIEL PK – Community Impact Education Lab",
        "www.cielpk.com",
    ].join("\n");
}

function addDaysIso(iso: string, days: number): string {
    const [y, m, d] = iso.split("-").map(Number);
    const t = new Date(Date.UTC(y, m - 1, d + days));
    return t.toISOString().slice(0, 10);
}

/** Pre-filled Google Calendar "all-day reminder" link, or "" when the date is unknown. */
export function googleCalendarUrl(input: Pick<NoticeInput, "dueDate" | "projectId" | "projectTitle">): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) return "";
    const start = input.dueDate.replace(/-/g, "");
    const end = addDaysIso(input.dueDate, 1).replace(/-/g, "");
    const p = new URLSearchParams({
        action: "TEMPLATE",
        text: `CIEL PK · Expected partner impact follow-up · ${input.projectId || "Project"}`,
        dates: `${start}/${end}`,
        details: `Expected email follow-up for project ${input.projectTitle} (ID: ${input.projectId || "pending"}). No meeting or response is required until the questionnaire arrives. This reminder was added manually.`,
        location: "Email follow-up · CIEL PK",
    });
    return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export function icsEscape(x: unknown): string {
    return String(x ?? "").replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

/** All-day, transparent (free) personal reminder on the expected date. `stamp` = DTSTAMP (UTC Date). */
export function buildNoticeIcs(input: Pick<NoticeInput, "dueDate" | "projectId" | "projectTitle">, stamp: Date): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) return "";
    const start = input.dueDate.replace(/-/g, "");
    const end = addDaysIso(input.dueDate, 1).replace(/-/g, "");
    const dtstamp = stamp.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const project = (input.projectId || "unassigned").replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 48);
    return (
        [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//CIEL PK//Partner Follow-up Reminder//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            "BEGIN:VEVENT",
            `UID:cielpk-${project}-${start}@cielpk.com`,
            `DTSTAMP:${dtstamp}`,
            `DTSTART;VALUE=DATE:${start}`,
            `DTEND;VALUE=DATE:${end}`,
            `SUMMARY:${icsEscape("CIEL PK - Expected impact follow-up")}`,
            `DESCRIPTION:${icsEscape(`A CIEL PK follow-up email is expected for project ${input.projectTitle} (Project ID: ${input.projectId || "pending"}). This is a personal reminder, not a meeting or confirmed invitation. The date may change if the project end date changes.`)}`,
            "TRANSP:TRANSPARENT",
            "END:VEVENT",
            "END:VCALENDAR",
        ].join("\r\n") + "\r\n"
    );
}
