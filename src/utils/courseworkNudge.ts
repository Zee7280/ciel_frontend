/** The fields a coursework row needs for a faculty → student nudge; every list endpoint returns them. */
export interface CourseworkNudgeEntry {
    projectTitle?: string | null;
    course?: string | null;
    status?: string;
    facultyApprovalStatus?: string | null;
    facultyApprovalNote?: string | null;
    stepCompleted?: number;
    studentInfo?: { teacherName?: string | null } | null;
}

export interface CourseworkNudgeMessage {
    subject: string;
    body: string;
    /** Subject + body in one block for WhatsApp / copy. */
    text: string;
}

function firstName(name?: string | null) {
    return (name || "").trim().split(/\s+/)[0] || "there";
}

type NudgeTone = "draft" | "under_review" | "revision_requested" | "rejected" | "approved";

/** Same stage rule as `courseworkStatusLabel` (pathReviewStatus.reviewStatusLabel), kept inline so
 * this module stays free of runtime imports and loads under node:test as well as in the app. */
export function courseworkNudgeTone(entry: Pick<CourseworkNudgeEntry, "status" | "facultyApprovalStatus">): NudgeTone {
    if (entry.status !== "submitted") return "draft";
    switch (entry.facultyApprovalStatus) {
        case "approved":
            return "approved";
        case "rejected":
            return "rejected";
        case "revision_requested":
            return "revision_requested";
        default:
            return "under_review";
    }
}

/**
 * One prefilled message per stage of a coursework record, written from the supervising teacher to
 * the student: a draft is nudged to continue, an under-review record is told the review is open, a
 * revision/rejection points at the faculty note, an approved record gets the congratulation. The
 * same text goes into Email, WhatsApp and "Copy message" so every channel says the same thing.
 */
export function courseworkStudentNudge(entry: CourseworkNudgeEntry, studentName?: string | null, teacherName?: string | null): CourseworkNudgeMessage {
    const title = entry.projectTitle?.trim() || "your coursework";
    const course = entry.course?.trim() || "coursework";
    const hi = `Hi ${firstName(studentName)},`;
    const signoff = `Thanks,\n${(teacherName || entry.studentInfo?.teacherName || "").trim() || "Your instructor"}`;
    const tone = courseworkNudgeTone(entry);
    const note = entry.facultyApprovalNote?.trim();

    let subject: string;
    let middle: string;
    if (tone === "draft") {
        const pct = Math.round((Math.min(entry.stepCompleted ?? 0, 7) / 7) * 100);
        subject = `Reminder: continue "${title}" on CIEL PK`;
        middle = `Your coursework record "${title}" (${course}) is ${pct}% complete on CIEL PK. Please continue and submit it for faculty review when it's ready.`;
    } else if (tone === "revision_requested") {
        subject = `Revision requested: "${title}" on CIEL PK`;
        middle = `I have sent your coursework record "${title}" (${course}) back for revision on CIEL PK. Please read my note on the record, update it and resubmit.${note ? `\n\nMy note: ${note}` : ""}`;
    } else if (tone === "rejected") {
        subject = `"${title}" was not approved on CIEL PK`;
        middle = `Your coursework record "${title}" (${course}) was not approved on CIEL PK. Please read my note on the record and resubmit a corrected version if your course allows it.${note ? `\n\nMy note: ${note}` : ""}`;
    } else if (tone === "approved") {
        subject = `Approved: "${title}" on CIEL PK`;
        middle = `Your coursework record "${title}" (${course}) has been approved on CIEL PK and is now on your Impact Wall. Well done.${note ? `\n\nMy comment: ${note}` : ""}`;
    } else {
        subject = `About your coursework "${title}" on CIEL PK`;
        middle = `I am reviewing your coursework record "${title}" (${course}) on CIEL PK. Please make sure your evidence files open and keep an eye on your dashboard in case I send it back with a note.`;
    }
    const body = `${hi}\n\n${middle}\n\n${signoff}`;
    return { subject, body, text: `${subject}\n\n${body}` };
}
