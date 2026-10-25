/**
 * Quick Community Work — pure types and rules shared by the student log, My Quick Work and the
 * faculty review page. Mirrors Nest `quick-work.util.ts`; the server re-checks everything on submit.
 * No imports, so `node --test` can load it directly.
 */

export type QuickWorkStatus = "draft" | "submitted" | "changes" | "approved" | "rejected";

export type QuickWorkParticipant = {
    id: string;
    userId: string;
    isLead: boolean;
    name: string;
    email: string;
    studentId: string;
    /** Optional phone number the lead gave for a teammate. */
    contact?: string | null;
    joinStatus: "joined" | "invited" | "declined" | string;
    present: boolean;
    startTime: string | null;
    endTime: string | null;
    breakMinutes: number;
    minutes: number;
};

export type QuickWorkEvidence = { url: string; name: string; type: string; size: number; caption: string };

export type QuickWorkLog = {
    id: string;
    status: QuickWorkStatus;
    mode: "solo" | "team" | string;
    university: string;
    department: string;
    facultyName: string;
    facultyEmail: string;
    title: string;
    activityType: string;
    activityTypeOther: string | null;
    activityDate: string | null;
    startTime: string | null;
    endTime: string | null;
    location: string;
    /** Optional Google Maps pin for the venue (`lat,lng`). */
    locationPin: string | null;
    host: string | null;
    /** Host organisation's optional email and phone (+92...). */
    hostEmail?: string | null;
    hostContact?: string | null;
    /** Optional partner organisations (names). */
    partners: string[];
    /** Partners with optional email / contact (newer API); `partners` holds just the names. */
    partnerDetails?: { name: string; email: string | null; contact: string | null }[];
    sdg: number | null;
    summary: string;
    peopleReached: number | null;
    visibility: string;
    evidence: QuickWorkEvidence[];
    consent: boolean;
    honest: boolean;
    reviewNote: string | null;
    reviewedAt: string | null;
    submittedAt: string | null;
    createdAt: string;
    updatedAt: string;
    isLead: boolean;
    /** The viewing student's own participant row; null on the faculty side. */
    viewerParticipantId: string | null;
    participants: QuickWorkParticipant[];
};

export function viewerRow(log: QuickWorkLog): QuickWorkParticipant | undefined {
    return log.participants.find((p) => p.id === log.viewerParticipantId);
}

export const QUICK_WORK_ACTIVITY_TYPES = [
    "Tree plantation drive",
    "Awareness campaign",
    "Pinktober event",
    "Community clean-up",
    "Donation drive",
    "Community outreach",
    "Other service activity",
] as const;

export const QUICK_WORK_OTHER_ACTIVITY = "Other service activity";
export const QUICK_WORK_MAX_PARTNERS = 10;

/** A partner as edited in the form: blank strings for unknown email / contact. */
export type QuickWorkPartnerForm = { name: string; email: string; contact: string };

/** Activity type as shown to people: the student's own wording for “Other”. */
export function activityLabel(log: { activityType: string; activityTypeOther?: string | null }): string {
    const other = log.activityTypeOther?.trim();
    return log.activityType === QUICK_WORK_OTHER_ACTIVITY && other ? `Other: ${other}` : log.activityType;
}

/** One-click starters: activity type plus a suggested SDG. */
export const QUICK_WORK_TEMPLATES: { label: string; type: string; sdg: number | null }[] = [
    { label: "Tree drive", type: "Tree plantation drive", sdg: 15 },
    { label: "Awareness campaign", type: "Awareness campaign", sdg: null },
    { label: "Pinktober", type: "Pinktober event", sdg: 3 },
    { label: "Clean-up", type: "Community clean-up", sdg: 11 },
    { label: "Donation drive", type: "Donation drive", sdg: 1 },
    { label: "Other", type: QUICK_WORK_OTHER_ACTIVITY, sdg: null },
];

export const QUICK_WORK_VISIBILITY = ["Faculty, University & CIEL PK only", "Public with consent"] as const;

export const SDG_NAMES = [
    "No Poverty",
    "Zero Hunger",
    "Good Health and Well-being",
    "Quality Education",
    "Gender Equality",
    "Clean Water and Sanitation",
    "Affordable and Clean Energy",
    "Decent Work and Economic Growth",
    "Industry, Innovation and Infrastructure",
    "Reduced Inequalities",
    "Sustainable Cities and Communities",
    "Responsible Consumption and Production",
    "Climate Action",
    "Life Below Water",
    "Life on Land",
    "Peace, Justice and Strong Institutions",
    "Partnerships for the Goals",
] as const;

export const QUICK_WORK_MAX_PARTICIPANTS = 500;
export const QUICK_WORK_MAX_DAILY_MINUTES = 9 * 60;
export const QUICK_WORK_MAX_EVIDENCE = 10;
export const QUICK_WORK_MAX_EVIDENCE_BYTES = 100 * 1024 * 1024;

/** Extension → accepted type. Same list as the API; no HTML, SVG, scripts, archives or executables. */
const EVIDENCE_TYPE_BY_EXT: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    jfif: "image/jpeg",
    pjpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    heic: "image/heic",
    heif: "image/heif",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain",
    csv: "text/csv",
    mp4: "video/mp4",
    m4v: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    wav: "audio/wav",
};

export const QUICK_WORK_EVIDENCE_TYPES = [
    ...Array.from(new Set(Object.values(EVIDENCE_TYPE_BY_EXT))),
    "audio/x-m4a",
    "audio/x-wav",
] as readonly string[];

/** For the file picker: every accepted type plus its extensions (some phones send no type). */
export const QUICK_WORK_EVIDENCE_ACCEPT = [...QUICK_WORK_EVIDENCE_TYPES, ...Object.keys(EVIDENCE_TYPE_BY_EXT).map((e) => `.${e}`)].join(",");

export const QUICK_WORK_EVIDENCE_HINT = "Photos (JPG, JPEG, PNG, WEBP, GIF, HEIC), PDF, Word, Excel, PowerPoint, TXT/CSV, video (MP4, MOV, WEBM) or audio (MP3, M4A, WAV)";

/** The accepted type for a picked file, from its extension when the browser reports none or an alias. */
export function evidenceTypeOf(file: { name: string; type: string }): string | null {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const byExt = EVIDENCE_TYPE_BY_EXT[ext];
    const type = file.type.toLowerCase();
    if (type && QUICK_WORK_EVIDENCE_TYPES.includes(type)) return type;
    return byExt ?? null;
}

/** What kind of evidence a stored file is, for its preview tile. */
export function evidenceKind(type: string): "image" | "video" | "audio" | "pdf" | "document" {
    if (["image/jpeg", "image/png", "image/webp", "image/gif"].includes(type)) return "image";
    if (type.startsWith("video/")) return "video";
    if (type.startsWith("audio/")) return "audio";
    if (type === "application/pdf") return "pdf";
    return "document";
}
export const QUICK_WORK_SUMMARY_MAX = 1000;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function minutesOfDay(value: string | null | undefined): number {
    const hhmm = String(value ?? "").slice(0, 5);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm)) return NaN;
    return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
}

export type AttendanceLike = { present: boolean; startTime: string | null; endTime: string | null; breakMinutes: number | string };

export function attendanceMinutes(a: AttendanceLike): number {
    if (!a.present) return 0;
    const start = minutesOfDay(a.startTime);
    const end = minutesOfDay(a.endTime);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
    return Math.max(0, end - start - (Number(a.breakMinutes) || 0));
}

/** Minutes → "1.5" style hours (max two decimals). */
export function formatHours(minutes: number): string {
    if (!Number.isFinite(minutes)) return "0";
    return Number((minutes / 60).toFixed(2)).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function pktNow(now: Date = new Date()): { date: string; time: string } {
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
    const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
    return { date, time };
}

export function shortDate(value: string | null | undefined): string {
    if (!value) return "Date not set";
    const d = new Date(`${value}T12:00:00`);
    if (Number.isNaN(d.getTime())) return "Date not set";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export const STATUS_LABEL: Record<QuickWorkStatus, string> = {
    draft: "Draft",
    submitted: "Pending faculty review",
    changes: "Changes requested",
    approved: "Approved",
    rejected: "Not approved",
};

/** The form's editable state (what the lead types), kept separate from the saved server view. */
export type QuickWorkForm = {
    mode: "solo" | "team";
    leadName: string;
    leadEmail: string;
    leadStudentId: string;
    university: string;
    department: string;
    facultyName: string;
    facultyEmail: string;
    teammates: { email: string; studentId: string; name: string; contact: string; joinStatus: string }[];
    title: string;
    activityType: string;
    activityTypeOther: string;
    activityDate: string;
    startTime: string;
    endTime: string;
    location: string;
    locationPin: string;
    host: string;
    hostEmail: string;
    /** Full number with country code (+923001234567), or empty. */
    hostContact: string;
    partners: QuickWorkPartnerForm[];
    sdg: string;
    attendance: Record<string, { present: boolean; startTime: string; endTime: string; breakMinutes: string }>;
    summary: string;
    peopleReached: string;
    visibility: string;
    evidence: QuickWorkEvidence[];
    consent: boolean;
    honest: boolean;
};

export function emptyAttendance() {
    return { present: true, startTime: "", endTime: "", breakMinutes: "0" };
}

/** Everyone on the log, lead first, as the attendance table shows them. */
export function formPeople(f: QuickWorkForm): { email: string; name: string; isLead: boolean; joinStatus: string; studentId: string }[] {
    return [
        { email: f.leadEmail.toLowerCase(), name: f.leadName, isLead: true, joinStatus: "joined", studentId: f.leadStudentId },
        ...(f.mode === "team"
            ? f.teammates.map((t) => ({ email: t.email.toLowerCase(), name: t.name || t.email, isLead: false, joinStatus: t.joinStatus, studentId: t.studentId }))
            : []),
    ];
}

export function attendanceFor(f: QuickWorkForm, email: string) {
    return f.attendance[email.toLowerCase()] ?? emptyAttendance();
}

export function teamErrors(f: QuickWorkForm): string[] {
    const e: string[] = [];
    if (!f.leadName.trim() || !f.leadStudentId.trim()) e.push("Enter your full name and student ID.");
    if (!f.university.trim() || !f.department.trim()) e.push("Enter your university and department / programme.");
    if (!f.facultyName.trim() || !EMAIL_RE.test(f.facultyEmail.trim())) e.push("Enter a coordinating faculty name and valid email.");
    const people = formPeople(f);
    if (people.some((p) => p.email === f.facultyEmail.trim().toLowerCase())) {
        e.push("The coordinating faculty email cannot be a participant’s email.");
    }
    if (people.length > QUICK_WORK_MAX_PARTICIPANTS) e.push(`Maximum ${QUICK_WORK_MAX_PARTICIPANTS} participants per log.`);
    if (f.mode === "team" && people.length < 2) e.push("Add a teammate or select “Just me”.");
    for (const p of people) if (!p.isLead && !p.studentId.trim()) e.push(`Enter a student ID for ${p.name}.`);
    const ids = people.map((p) => p.studentId.trim().toLowerCase()).filter(Boolean);
    if (new Set(ids).size !== ids.length) e.push("Each participant must have a unique student ID.");
    return e;
}

export function activityErrors(f: QuickWorkForm): string[] {
    const e: string[] = [];
    if (!f.title.trim() || !f.activityType || !f.location.trim() || !f.activityDate) e.push("Enter the activity title, type, date and venue.");
    if (f.activityType === QUICK_WORK_OTHER_ACTIVITY && !f.activityTypeOther.trim()) e.push("Describe the activity type for “Other”.");
    const s = minutesOfDay(f.startTime);
    const en = minutesOfDay(f.endTime);
    if (!Number.isFinite(s) || !Number.isFinite(en) || en <= s) e.push("Choose an end time after the start time on the same day.");
    return e;
}

export function attendanceErrors(f: QuickWorkForm, now: Date = new Date()): string[] {
    const e: string[] = [];
    const { date: today, time } = pktNow(now);
    if (f.activityDate > today) e.push("Attendance can only be submitted for today or a past activity.");
    else if (f.activityDate === today && minutesOfDay(f.endTime) > minutesOfDay(time)) e.push("Submit after the activity has finished (PKT).");
    const people = formPeople(f);
    if (!people.some((p) => attendanceFor(f, p.email).present)) e.push("Mark at least one participant as present.");
    const evStart = minutesOfDay(f.startTime);
    const evEnd = minutesOfDay(f.endTime);
    for (const p of people) {
        const a = attendanceFor(f, p.email);
        if (!a.present) continue;
        const mins = attendanceMinutes(a);
        const start = minutesOfDay(a.startTime);
        const end = minutesOfDay(a.endTime);
        if (!Number.isFinite(start) || !Number.isFinite(end) || mins <= 0) {
            e.push(`Check the arrival, departure and break for ${p.name}.`);
            continue;
        }
        const br = Number(a.breakMinutes);
        if (!Number.isInteger(br) || br < 0) e.push(`Break minutes must be a non-negative whole number for ${p.name}.`);
        if (start < evStart || end > evEnd) e.push(`${p.name}’s attendance must be inside the event time window.`);
        if (mins > QUICK_WORK_MAX_DAILY_MINUTES) e.push(`${p.name} exceeds the 9-hour daily service limit.`);
    }
    return e;
}

export function evidenceErrors(f: QuickWorkForm): string[] {
    const e: string[] = [];
    if (!f.summary.trim()) e.push("Briefly describe the activity conducted.");
    if (!f.evidence.length) e.push("Attach at least one photo or PDF.");
    if (f.evidence.some((x) => !x.caption.trim())) e.push("Add a short caption to each evidence file.");
    if (!f.consent || !f.honest) e.push("Confirm evidence consent and the attendance declaration.");
    if (f.peopleReached !== "" && (!Number.isInteger(Number(f.peopleReached)) || Number(f.peopleReached) < 0)) {
        e.push("People reached must be a non-negative whole number.");
    }
    return e;
}

/** Teammates who still have to confirm (or who declined): submit is blocked until resolved. */
export function joinErrors(f: QuickWorkForm): string[] {
    if (f.mode !== "team") return [];
    return f.teammates.flatMap((t) =>
        t.joinStatus === "declined"
            ? [`${t.name || t.email} declined to join. Remove them before submitting.`]
            : t.joinStatus !== "joined"
              ? [`${t.name || t.email} has not confirmed joining yet.`]
              : [],
    );
}

/** Server view → form state. */
export function formFromLog(log: QuickWorkLog): QuickWorkForm {
    const lead = log.participants.find((p) => p.isLead);
    const attendance: QuickWorkForm["attendance"] = {};
    for (const p of log.participants) {
        attendance[p.email.toLowerCase()] = {
            present: p.present,
            startTime: p.startTime ?? "",
            endTime: p.endTime ?? "",
            breakMinutes: String(p.breakMinutes ?? 0),
        };
    }
    return {
        mode: log.mode === "team" ? "team" : "solo",
        leadName: lead?.name ?? "",
        leadEmail: lead?.email ?? "",
        leadStudentId: lead?.studentId ?? "",
        university: log.university,
        department: log.department,
        facultyName: log.facultyName,
        facultyEmail: log.facultyEmail,
        teammates: log.participants
            .filter((p) => !p.isLead)
            .map((p) => ({ email: p.email, studentId: p.studentId, name: p.name, contact: p.contact ?? "", joinStatus: p.joinStatus })),
        title: log.title,
        activityType: log.activityType,
        activityTypeOther: log.activityTypeOther ?? "",
        activityDate: log.activityDate ?? "",
        startTime: log.startTime ?? "",
        endTime: log.endTime ?? "",
        location: log.location,
        locationPin: log.locationPin ?? "",
        host: log.host ?? "",
        hostEmail: log.hostEmail ?? "",
        hostContact: log.hostContact ?? "",
        partners: (log.partnerDetails ?? (log.partners ?? []).map((name) => ({ name, email: null, contact: null }))).map((p) => ({
            name: p.name,
            email: p.email ?? "",
            contact: p.contact ?? "",
        })),
        sdg: log.sdg ? String(log.sdg) : "",
        attendance,
        summary: log.summary,
        peopleReached: log.peopleReached == null ? "" : String(log.peopleReached),
        visibility: log.visibility,
        evidence: log.evidence,
        consent: log.consent,
        honest: log.honest,
    };
}

/** Form state → PATCH body (the server ignores nothing it does not know). */
export function payloadFromForm(f: QuickWorkForm) {
    return {
        mode: f.mode,
        university: f.university,
        department: f.department,
        leadStudentId: f.leadStudentId,
        facultyName: f.facultyName,
        facultyEmail: f.facultyEmail,
        teammates:
            f.mode === "team"
                ? f.teammates.map((t) => ({ email: t.email, studentId: t.studentId, name: t.name, contact: t.contact.trim() || null }))
                : [],
        title: f.title,
        activityType: f.activityType,
        activityTypeOther: f.activityType === QUICK_WORK_OTHER_ACTIVITY ? f.activityTypeOther.trim() || null : null,
        activityDate: f.activityDate || null,
        startTime: f.startTime || null,
        endTime: f.endTime || null,
        location: f.location,
        locationPin: f.locationPin || null,
        host: f.host || null,
        hostEmail: f.hostEmail.trim().toLowerCase() || null,
        hostContact: f.hostContact || null,
        // Names for an older API, details for this one (it prefers partnerDetails).
        partners: f.partners.map((p) => p.name),
        partnerDetails: f.partners.map((p) => ({ name: p.name, email: p.email.trim() || null, contact: p.contact.trim() || null })),
        sdg: f.sdg ? Number(f.sdg) : null,
        attendance: formPeople(f).map((p) => {
            const a = attendanceFor(f, p.email);
            const br = Number(a.breakMinutes);
            return {
                email: p.email,
                present: a.present,
                startTime: a.startTime || null,
                endTime: a.endTime || null,
                breakMinutes: Number.isInteger(br) && br >= 0 ? br : 0,
            };
        }),
        summary: f.summary,
        peopleReached: f.peopleReached === "" || !Number.isInteger(Number(f.peopleReached)) ? null : Number(f.peopleReached),
        visibility: f.visibility,
        evidence: f.evidence,
        consent: f.consent,
        honest: f.honest,
    };
}
