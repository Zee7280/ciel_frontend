/* Pure data model + response mappers for the admin Teams & enrollments modal. No React here. */

import type { AdminEnrollmentAttendanceMeta } from "@/utils/adminEnrollmentAttendance";
/** Matches backend Participation / patch DTO enums. */
export const YEAR_OF_STUDY_OPTIONS = [
    "1st Year",
    "2nd Year",
    "3rd Year",
    "4th Year",
    "Graduate",
    "Postgraduate",
] as const;

export const ACADEMIC_INTEGRATION_OPTIONS = [
    "Voluntary",
    "Course-Linked",
    "Credit-Bearing",
    "Capstone / Thesis",
    "Research-Integrated",
] as const;

export type TeamMemberRow = {
    id: string;
    name: string;
    email: string;
    role: string;
    reportStatus: string;
    reportAvailable: boolean;
    supportsAdminPatch: boolean;
    /** `pending_application` rows are not enrolled seats (their id can be an application id). */
    memberSource?: string;
    /** Pending-application rows: the application they belong to (not an enrolment id). */
    applicationId?: string;
    phoneNumber: string;
    cnicDisplay: string;
    universityId: string;
    universityName: string;
    academicProgram: string;
    department: string;
    yearOfStudy: string;
    academicIntegrationType: string;
    attendanceMeta?: AdminEnrollmentAttendanceMeta;
    studentUserId?: string;
    duplicateSeatCount?: number;
    studentIdMislinked?: boolean;
};

export type TeamMemberEditorDraft = {
    full_name: string;
    mobile: string;
    cnic: string;
    university_id: string;
    university_name: string;
    academic_program: string;
    department: string;
    year_of_study: string;
    academic_integration_type: string;
    sync_linked_user_profile: boolean;
};

export type TeamMemberEditorState = {
    teamId: string;
    memberId: string;
    headline: string;
    draft: TeamMemberEditorDraft;
};

export type ParticipationMode = "team" | "individual";

export type TeamOverviewRow = {
    id: string;
    teamName: string;
    leadName: string;
    reportStatus: string;
    reportAvailable: boolean;
    members: TeamMemberRow[];
    participationMode: ParticipationMode;
};

export function normalizeParticipationMode(raw: Record<string, unknown>): ParticipationMode {
    const v = lower(raw.participation_mode ?? raw.participationMode);
    if (v === "individual") return "individual";
    return "team";
}

/** Listing-only synthetic group key; DELETE .../teams/:teamId expects a persisted Participation.teamId. */
export function isSyntheticIndividualGroupId(teamId: string): boolean {
    const id = String(teamId).trim();
    return /^individual:/i.test(id) || /^pending-individual:/i.test(id);
}

export const PARTICIPATION_UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Enrolled participation seats only — excludes pending pipeline synthetic roster ids. */
export function isMergeableTeamMember(member: TeamMemberRow): boolean {
    if (!member.supportsAdminPatch) return false;
    if (/^pending:/i.test(member.id.trim())) return false;
    // A pending team lead is listed with the APPLICATION id as its id; the merge endpoint only
    // accepts enrolled participation ids and answers "Enrollment not found on this project".
    if (member.memberSource === "pending_application") return false;
    return PARTICIPATION_UUID_RE.test(member.id.trim());
}

export type MergeableEnrollmentOption = {
    participationId: string;
    name: string;
    email: string;
    groupLabel: string;
    participationMode: ParticipationMode;
};

export function flattenMergeableEnrollments(rows: TeamOverviewRow[]): MergeableEnrollmentOption[] {
    const out: MergeableEnrollmentOption[] = [];
    for (const team of rows) {
        for (const member of team.members) {
            if (!isMergeableTeamMember(member)) continue;
            out.push({
                participationId: member.id,
                name: member.name,
                email: member.email,
                groupLabel: team.teamName,
                participationMode: team.participationMode,
            });
        }
    }
    return out;
}

export function mergeTeamRowsWithEnrollmentAttendance(
    rows: TeamOverviewRow[],
    attendanceByParticipation: Map<string, AdminEnrollmentAttendanceMeta>,
    enrollmentStudentIdsByParticipation: Map<string, string>,
    enrollmentEmailsByParticipation: Map<string, string>,
): TeamOverviewRow[] {
    return rows.map((team) => ({
        ...team,
        members: team.members.map((member) => {
            const participationId = member.id.trim();
            let attendanceMeta = attendanceByParticipation.get(participationId);
            if (!attendanceMeta) {
                const studentUserId = member.studentUserId?.trim();
                const email = member.email.trim().toLowerCase();
                for (const [enrollmentParticipationId, meta] of attendanceByParticipation) {
                    const enrollmentStudentId = enrollmentStudentIdsByParticipation
                        .get(enrollmentParticipationId)
                        ?.trim();
                    const enrollmentEmail = enrollmentEmailsByParticipation
                        .get(enrollmentParticipationId)
                        ?.trim()
                        .toLowerCase();
                    if (
                        (studentUserId && enrollmentStudentId && studentUserId === enrollmentStudentId) ||
                        (email && enrollmentEmail && email === enrollmentEmail)
                    ) {
                        attendanceMeta = meta;
                        break;
                    }
                }
            }
            return attendanceMeta ? { ...member, attendanceMeta } : member;
        }),
    }));
}

export function teamOverviewRemoveGroupDisabled(team: TeamOverviewRow): boolean {
    return isSyntheticIndividualGroupId(team.id);
}

export type OpportunityPipelineSummary = {
    title: string | null;
    status: string | null;
    adminApproved: boolean;
    facultyVerificationStatus: string | null;
    facultyVerified: boolean;
    executionVerificationStatus: string | null;
    executionVerified: boolean;
    awaitingPartnerOrFaculty: string | null;
};

export type TeamOverviewSummary = {
    registeredTeams: number;
    completedReports: number;
    reportsAvailable: number;
    pipeline: OpportunityPipelineSummary | null;
    applicationsByInternalStatus: Record<string, number>;
    applicationsPipelineTotalNonWithdrawn: number;
};

export const EMPTY_TEAM_OVERVIEW_SUMMARY: TeamOverviewSummary = {
    registeredTeams: 0,
    completedReports: 0,
    reportsAvailable: 0,
    pipeline: null,
    applicationsByInternalStatus: {
        pending_faculty: 0,
        pending_partner: 0,
        pending_admin: 0,
        approved: 0,
        faculty_rejected: 0,
        partner_rejected: 0,
        admin_rejected: 0,
    },
    applicationsPipelineTotalNonWithdrawn: 0,
};

export function pickString(raw: Record<string, unknown>, keys: string[], fallback = ""): string {
    for (const key of keys) {
        const value = raw[key];
        if (typeof value === "string" && value.trim()) return value.trim();
        if (typeof value === "number" && Number.isFinite(value)) return String(value);
    }
    return fallback;
}

export function pickBoolean(raw: Record<string, unknown>, keys: string[], fallback = false): boolean {
    for (const key of keys) {
        const value = raw[key];
        if (typeof value === "boolean") return value;
        if (typeof value === "number") return value > 0;
        if (typeof value === "string") {
            const s = value.trim().toLowerCase();
            if (["true", "1", "yes", "available", "completed"].includes(s)) return true;
            if (["false", "0", "no", "unavailable"].includes(s)) return false;
        }
    }
    return fallback;
}

export function pickLooseString(raw: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
        const value = raw[key];
        if (value === null || value === undefined) continue;
        if (typeof value === "string") return value.trim();
        if (typeof value === "number" && Number.isFinite(value)) return String(value);
    }
    return "";
}

export function normalizeApplicationsByInternalStatus(summaryRaw: Record<string, unknown>): {
    counts: Record<string, number>;
    pipelineTotalNonWithdrawnFromApi: number | null;
} {
    const keys = [
        "pending_faculty",
        "pending_partner",
        "pending_admin",
        "approved",
        "faculty_rejected",
        "partner_rejected",
        "admin_rejected",
    ] as const;

    const counts = {
        pending_faculty: 0,
        pending_partner: 0,
        pending_admin: 0,
        approved: 0,
        faculty_rejected: 0,
        partner_rejected: 0,
        admin_rejected: 0,
    } satisfies Record<(typeof keys)[number], number>;

    const block =
        (summaryRaw.applications_by_internal_status as unknown) ??
        (summaryRaw.applicationsByInternalStatus as unknown);

    if (block && typeof block === "object" && !Array.isArray(block)) {
        for (const k of keys) {
            const n = Number((block as Record<string, unknown>)[k]);
            counts[k] = Number.isFinite(n) ? n : 0;
        }
    }

    const totalRaw =
        summaryRaw.applications_pipeline_total_non_withdrawn ?? summaryRaw.applicationsPipelineTotalNonWithdrawn;
    const totalParsed = Number(totalRaw);
    return {
        counts,
        pipelineTotalNonWithdrawnFromApi: Number.isFinite(totalParsed) ? totalParsed : null,
    };
}

export function extractOpportunityPipelineSummary(summaryRaw: Record<string, unknown>): OpportunityPipelineSummary | null {
    const oRaw = summaryRaw.opportunity ?? summaryRaw.opportunitySnapshot;
    if (!oRaw || typeof oRaw !== "object" || Array.isArray(oRaw)) return null;
    const o = oRaw as Record<string, unknown>;

    const statusPick =
        typeof o.status === "string" && o.status.trim()
            ? o.status.trim()
            : typeof (o.workflowStage ?? o.workflow_stage) === "string" &&
                String(o.workflowStage ?? o.workflow_stage).trim()
              ? String(o.workflowStage ?? o.workflow_stage).trim()
              : null;

    return {
        title: typeof o.title === "string" && o.title.trim() ? o.title.trim() : null,
        status: statusPick,
        adminApproved: typeof o.admin_approved === "boolean" ? o.admin_approved : Boolean(o.adminApproved),
        facultyVerificationStatus: pickLooseString(o, ["faculty_verification_status", "facultyVerificationStatus"]),
        facultyVerified: typeof o.faculty_verified === "boolean" ? o.faculty_verified : Boolean(o.facultyVerified),
        executionVerificationStatus: pickLooseString(o, [
            "execution_verification_status",
            "executionVerificationStatus",
        ]),
        executionVerified:
            typeof o.execution_verified === "boolean" ? o.execution_verified : Boolean(o.executionVerified),
        awaitingPartnerOrFaculty: pickLooseString(o, [
            "awaiting_partner_or_faculty",
            "awaitingPartnerOrFaculty",
        ]),
    };
}

export function mapTeamMember(raw: Record<string, unknown>): TeamMemberRow | null {
    const id = pickString(raw, ["id", "member_id", "memberId", "student_id", "studentId", "application_id", "applicationId"]);
    if (!id) return null;
    let supportsAdminPatch: boolean;
    if (typeof raw.supports_admin_patch === "boolean") {
        supportsAdminPatch = raw.supports_admin_patch;
    } else if (typeof raw.supportsAdminPatch === "boolean") {
        supportsAdminPatch = raw.supportsAdminPatch;
    } else {
        supportsAdminPatch = true;
    }
    return {
        id,
        name: pickString(raw, ["name", "student_name", "studentName", "full_name", "fullName"], "—"),
        email: pickString(raw, ["email", "student_email", "studentEmail"], ""),
        role: pickString(raw, ["role", "member_role", "memberRole"], "Member"),
        reportStatus: pickString(raw, ["report_status", "reportStatus", "status"], "not_started").replace(/_/g, " "),
        reportAvailable: pickBoolean(raw, ["report_available", "reportAvailable", "is_report_available", "isReportAvailable"]),
        supportsAdminPatch,
        memberSource: pickLooseString(raw, ["member_source", "memberSource"]) || undefined,
        applicationId: pickLooseString(raw, ["application_id", "applicationId"]) || undefined,
        phoneNumber: pickLooseString(raw, ["phone_number", "phoneNumber", "mobile", "phone"]),
        cnicDisplay: pickLooseString(raw, ["cnic_display", "cnicDisplay", "cnic"]),
        universityId: pickLooseString(raw, ["university_id", "universityId"]),
        universityName: pickLooseString(raw, ["university_name", "universityName"]),
        academicProgram: pickLooseString(raw, ["academic_program", "academicProgram", "major"]),
        department: pickLooseString(raw, ["department"]),
        yearOfStudy: pickLooseString(raw, ["year_of_study", "yearOfStudy"]),
        academicIntegrationType: pickLooseString(raw, ["academic_integration_type", "academicIntegrationType"]),
        studentUserId: pickLooseString(raw, ["student_user_id", "studentUserId", "student_id", "studentId"]),
        duplicateSeatCount: Math.max(
            0,
            Number(raw.duplicate_seat_count ?? raw.duplicateSeatCount) || 0,
        ) || undefined,
        studentIdMislinked:
            raw.student_id_mislinked === true || raw.studentIdMislinked === true,
    };
}

export function extractTeamRows(body: unknown): TeamOverviewRow[] {
    const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
    const listCandidate = payload ? payload.data ?? payload.teams ?? payload.items ?? payload.rows : body;
    const list = Array.isArray(listCandidate) ? listCandidate : [];
    return list
        .map((item) => {
            if (!item || typeof item !== "object") return null;
            const raw = item as Record<string, unknown>;
            const id = pickString(raw, ["id", "team_id", "teamId", "application_id", "applicationId"]);
            if (!id) return null;
            const participationMode = normalizeParticipationMode(raw);
            const membersCandidate = raw.members ?? raw.team_members ?? raw.teamMembers ?? raw.students;
            const members = Array.isArray(membersCandidate)
                ? membersCandidate.map((m) => (m && typeof m === "object" ? mapTeamMember(m as Record<string, unknown>) : null)).filter(Boolean) as TeamMemberRow[]
                : [];
            return {
                id,
                teamName: pickString(
                    raw,
                    ["team_display_name", "teamDisplayName", "team_name", "teamName", "name"],
                    "Untitled team",
                ),
                leadName: pickString(raw, ["lead_name", "leadName", "student_name", "studentName"], members[0]?.name || "—"),
                reportStatus: pickString(raw, ["report_status", "reportStatus", "status"], "not_started").replace(/_/g, " "),
                reportAvailable: pickBoolean(raw, ["report_available", "reportAvailable", "is_report_available", "isReportAvailable"]),
                members,
                participationMode,
            };
        })
        .filter(Boolean) as TeamOverviewRow[];
}

export function extractTeamSummary(body: unknown, rows: TeamOverviewRow[]): TeamOverviewSummary {
    const baseApps: Record<string, number> = {
        pending_faculty: 0,
        pending_partner: 0,
        pending_admin: 0,
        approved: 0,
        faculty_rejected: 0,
        partner_rejected: 0,
        admin_rejected: 0,
    };

    const deriveFromRows = () => ({
        registeredTeams: rows.length,
        completedReports: rows.filter((team) => lower(team.reportStatus) === "completed").length,
        reportsAvailable: rows.filter((team) => team.reportAvailable).length,
    });

    const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
    const summaryRaw = payload && typeof payload.summary === "object" ? (payload.summary as Record<string, unknown>) : null;

    if (!summaryRaw) {
        const derived = deriveFromRows();
        return {
            ...derived,
            pipeline: null,
            applicationsByInternalStatus: baseApps,
            applicationsPipelineTotalNonWithdrawn: 0,
        };
    }

    const { counts, pipelineTotalNonWithdrawnFromApi } = normalizeApplicationsByInternalStatus(summaryRaw);

    const reg = Number(summaryRaw.registered_teams ?? summaryRaw.registeredTeams);
    const cmp = Number(summaryRaw.completed_reports ?? summaryRaw.completedReports);
    const rpt = Number(summaryRaw.reports_available ?? summaryRaw.reportsAvailable);
    const rowDerived = deriveFromRows();

    const registeredTeams = Number.isFinite(reg) && reg >= 0 ? reg : rowDerived.registeredTeams;
    const completedReports = Number.isFinite(cmp) && cmp >= 0 ? cmp : rowDerived.completedReports;
    const reportsAvailable = Number.isFinite(rpt) && rpt >= 0 ? rpt : rowDerived.reportsAvailable;

    const summed = Object.values(counts).reduce((a, b) => a + b, 0);

    return {
        registeredTeams,
        completedReports,
        reportsAvailable,
        pipeline: extractOpportunityPipelineSummary(summaryRaw),
        applicationsByInternalStatus: counts,
        applicationsPipelineTotalNonWithdrawn: pipelineTotalNonWithdrawnFromApi ?? summed,
    };
}

export function lower(v: unknown): string {
    if (v == null) return "";
    return String(v).trim().toLowerCase();
}
