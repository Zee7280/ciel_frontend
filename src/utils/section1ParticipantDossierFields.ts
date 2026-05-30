import { buildParticipationProgramLine, normalizeParticipationRowForDossier } from "@/utils/reportTeamScope";

export type Section1DossierField = {
    label: string;
    value: unknown;
    fullWidth?: boolean;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function firstNonBlank(...values: unknown[]): string {
    for (const value of values) {
        if (value === null || value === undefined) continue;
        const text = String(value).trim();
        if (text && text.toLowerCase() !== "undefined" && text.toLowerCase() !== "null") return text;
    }
    return "";
}

function isPlaceholderLabel(value: string): boolean {
    const t = value.trim().toLowerCase();
    return !t || t === "other" || t === "n/a" || t === "na" || t === "general" || t === "unspecified";
}

function isUuid(value: string): boolean {
    return UUID_RE.test(value.trim());
}

/** True when `universityId` column holds a name (legacy rows) instead of student roll / registration. */
function looksLikeUniversityNameToken(value: string, universityName: string): boolean {
    const v = value.trim();
    if (!v) return true;
    if (universityName && v.toLowerCase() === universityName.trim().toLowerCase()) return true;
    if (isUuid(v)) return true;
    const lower = v.toLowerCase();
    if (lower.includes("university") || lower.includes("institute") || lower.includes("college")) return true;
    if (v.length > 36) return true;
    return false;
}

export function formatPakistaniCnicDisplay(raw: unknown): string {
    const digits = String(raw ?? "").replace(/\D/g, "").slice(0, 13);
    if (digits.length !== 13) return firstNonBlank(raw);
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

export function formatVerifiedHoursDisplay(raw: unknown): string {
    const fromField = firstNonBlank(raw);
    if (!fromField) return "";
    if (/\bhr(s)?\b/i.test(fromField)) return fromField.replace(/\s+/g, " ").trim();
    const n = parseFloat(fromField);
    if (Number.isFinite(n) && n > 0) {
        const rounded = Number.isInteger(n) ? String(n) : n.toFixed(1);
        return `${rounded} ${n === 1 ? "hour" : "hours"} verified`;
    }
    return fromField;
}

export function formatParticipationStatusDisplay(raw: unknown): string {
    const t = firstNonBlank(raw).toLowerCase().replace(/-/g, "_");
    if (!t) return "";
    const labels: Record<string, string> = {
        approved: "Approved",
        verified: "Verified",
        accepted: "Accepted",
        finalized: "Finalized",
        pending: "Pending",
        pending_ciel_approval: "Pending CIEL approval",
        pending_faculty_approval: "Pending faculty approval",
        pending_payment_approval: "Pending payment approval",
        rejected: "Rejected",
    };
    return labels[t] ?? t.replace(/_/g, " ");
}

function resolveStudentRollNumber(row: Record<string, unknown>): string {
    const universityName = firstNonBlank(row.university, row.universityName);
    const storedRoll = firstNonBlank(row.universityId, row.university_id);
    const registration = firstNonBlank(row.registrationNumber, row.registration_number);

    if (storedRoll && !looksLikeUniversityNameToken(storedRoll, universityName)) {
        return storedRoll;
    }
    return registration;
}

function resolveDegreeProgram(row: Record<string, unknown>): string {
    const student =
        row.student && typeof row.student === "object" ? (row.student as Record<string, unknown>) : null;
    const direct = firstNonBlank(row.academicProgram, row.academic_program);
    if (!isPlaceholderLabel(direct)) return direct;

    const fromMajor = firstNonBlank(student?.major, row.degree);
    if (!isPlaceholderLabel(fromMajor)) return fromMajor;

    const line = buildParticipationProgramLine(row);
    const base = line.split("·")[0]?.trim() ?? line;
    if (!isPlaceholderLabel(base)) return base;
    return "";
}

function resolveDepartment(row: Record<string, unknown>): string {
    const student =
        row.student && typeof row.student === "object" ? (row.student as Record<string, unknown>) : null;
    const dept = firstNonBlank(row.department, student?.department);
    if (isPlaceholderLabel(dept)) return "";
    return dept;
}

function pushField(
    list: Section1DossierField[],
    label: string,
    value: unknown,
    fullWidth = false,
): void {
    if (value === null || value === undefined) return;
    if (typeof value === "string" && !value.trim()) return;
    list.push({ label, value, fullWidth });
}

/** Normalize identity-verification / participation row for read-only dossiers. */
export function normalizeSection1ParticipantRow(row: unknown): Record<string, unknown> {
    if (!row || typeof row !== "object") return {};
    const base = normalizeParticipationRowForDossier(row);
    const r = row as Record<string, unknown>;
    const student = r.student && typeof r.student === "object" ? (r.student as Record<string, unknown>) : null;
    const universityName = firstNonBlank(base.university, r.universityName);
    const rollNumber = resolveStudentRollNumber({ ...base, ...r, university: universityName, universityName });
    const degreeProgram = resolveDegreeProgram({ ...base, ...r, student: student ?? undefined });
    const department = resolveDepartment({ ...base, ...r, student: student ?? undefined });

    return {
        ...base,
        university: universityName,
        universityName,
        studentRollNumber: rollNumber,
        department,
        academicProgram: degreeProgram,
        academic_program: degreeProgram,
        academicIntegrationType: firstNonBlank(
            r.academicIntegrationType,
            r.academic_integration_type,
            r.academicIntegration,
        ),
        yearOfStudy: firstNonBlank(base.year, r.yearOfStudy, r.year_of_study),
        emailVerified: r.emailVerified ?? r.email_verified,
        mobileVerified: r.mobileVerified ?? r.mobile_verified,
        facultySupervisorEmail: firstNonBlank(
            r.facultySupervisorEmail,
            r.faculty_supervisor_email,
            r.facultyEmail,
            r.faculty_email,
        ),
        primaryFacultyEmail: firstNonBlank(r.primaryFacultyEmail, r.primary_faculty_email),
        secondaryFacultyEmail: firstNonBlank(r.secondaryFacultyEmail, r.secondary_faculty_email),
        status: firstNonBlank(r.status, base.status),
        participationMode: firstNonBlank(r.participationMode, r.participation_mode),
        registrationNumber: rollNumber,
        program: degreeProgram
            ? [degreeProgram, firstNonBlank(base.year, r.yearOfStudy)].filter(Boolean).join(" · ")
            : buildParticipationProgramLine({ ...base, ...r, student: student ?? undefined }),
        cnicDisplay: formatPakistaniCnicDisplay(r.cnic ?? base.cnic),
    };
}

export function buildSection1ParticipantDossierFields(
    row: Record<string, unknown>,
    options?: { hoursDisplay?: string },
): {
    personal: Section1DossierField[];
    academic: Section1DossierField[];
    participation: Section1DossierField[];
} {
    const hours = formatVerifiedHoursDisplay(options?.hoursDisplay ?? row.hours);

    const personal: Section1DossierField[] = [];
    pushField(personal, "Full name", firstNonBlank(row.fullName, row.name));
    pushField(personal, "CNIC", row.cnicDisplay ?? formatPakistaniCnicDisplay(row.cnic));
    pushField(personal, "Mobile", row.mobile);
    pushField(personal, "Email", typeof row.email === "string" ? row.email.trim().toLowerCase() : row.email);
    pushField(personal, "Email verified", row.emailVerified);
    pushField(personal, "Mobile verified", row.mobileVerified);

    const academic: Section1DossierField[] = [];
    pushField(academic, "University / institution", firstNonBlank(row.university, row.universityName));
    pushField(academic, "Student ID / roll number", row.studentRollNumber ?? row.registrationNumber);
    pushField(academic, "Degree program", row.academicProgram ?? row.academic_program);
    pushField(academic, "Department", row.department);
    pushField(academic, "Year of study", firstNonBlank(row.yearOfStudy, row.year, row.year_of_study));
    pushField(academic, "Academic integration type", firstNonBlank(row.academicIntegrationType, row.academic_integration_type));

    const participation: Section1DossierField[] = [];
    pushField(participation, "Role", row.role);
    pushField(participation, "Verified hours", hours);
    pushField(participation, "Participation status", formatParticipationStatusDisplay(row.status));
    pushField(participation, "Identity verified", row.verified);
    pushField(participation, "Consent acknowledged", row.consent);
    pushField(participation, "Faculty supervisor email", row.facultySupervisorEmail, true);

    return { personal, academic, participation };
}

/** Team-level faculty emails captured during identity verification (lead row or section1). */
export function readSection1TeamFacultyEmails(section1: Record<string, unknown> | null | undefined): {
    primary: string;
    secondary: string;
    supervisor: string;
} {
    if (!section1) return { primary: "", secondary: "", supervisor: "" };
    const lead =
        section1.team_lead && typeof section1.team_lead === "object"
            ? (section1.team_lead as Record<string, unknown>)
            : {};
    const members = Array.isArray(section1.team_members) ? section1.team_members : [];
    const firstMember = members[0] && typeof members[0] === "object" ? (members[0] as Record<string, unknown>) : {};
    const pick = (keys: string[]) => {
        for (const src of [section1, lead, firstMember]) {
            for (const k of keys) {
                const v = firstNonBlank((src as Record<string, unknown>)[k]);
                if (v) return v;
            }
        }
        return "";
    };
    return {
        primary: pick(["primaryFacultyEmail", "primary_faculty_email"]),
        secondary: pick(["secondaryFacultyEmail", "secondary_faculty_email"]),
        supervisor: pick(["faculty_supervisor_email", "facultySupervisorEmail"]),
    };
}
