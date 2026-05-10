import type { ReportData } from "@/app/dashboard/student/report/context/ReportContext";
import {
    buildIndividualRosterFromSection1,
    calculateEngagementMetrics,
    type IndividualMetric,
} from "@/app/dashboard/student/report/utils/engagementMetrics";

function printObject(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
}

function firstNonBlank(...values: unknown[]): string {
    for (const value of values) {
        if (value === null || value === undefined) continue;
        if (Array.isArray(value)) {
            const joined = value.map((item) => String(item).trim()).filter(Boolean).join(", ");
            if (joined) return joined;
            continue;
        }
        const text = String(value).trim();
        if (text && text.toLowerCase() !== "undefined" && text.toLowerCase() !== "null") return text;
    }
    return "";
}

function pickPrintValue(records: Record<string, unknown>[], keys: string[]): unknown {
    for (const record of records) {
        for (const key of keys) {
            const value = record[key];
            if (printObject(value)) return value;
            if (typeof value === "boolean") return value ? "Yes" : "No";
            const normalized = firstNonBlank(value);
            if (normalized) return normalized;
        }
    }
    return "";
}

export function friendlyAttendanceVerificationStatus(raw: string): string {
    const t = raw.trim().toLowerCase().replace(/-/g, "_");
    if (!t) return "";
    const labels: Record<string, string> = {
        pending_approval: "Pending partner / faculty approval",
        verified: "Verified",
        approved: "Approved",
        partner_verified: "Partner verified",
        complete: "Complete",
        completed: "Complete",
        rejected: "Rejected",
        declined: "Declined",
    };
    return labels[t] ?? raw.trim().replace(/_/g, " ");
}

/**
 * Faculty email for verify/dossier UIs when `section1.faculty_supervisor_email` was not copied from the opportunity blueprint.
 */
export function resolveFacultySupervisorEmailForVerify(
    report: Pick<ReportData, "section1"> & { opportunity?: unknown },
    projectData?: unknown,
): string {
    const s1 = report.section1 as ReportData["section1"] & Record<string, unknown>;
    const primary = firstNonBlank(s1.faculty_supervisor_email, s1.facultySupervisorEmail);
    if (primary) return primary;

    const root = printObject(report as unknown as Record<string, unknown>) ?? {};
    const proj = printObject(projectData) ?? {};
    const opportunity = printObject(root.opportunity) ?? printObject(report.opportunity) ?? proj;
    const supervision = printObject(pickPrintValue([opportunity, proj, root], ["supervision"])) ?? {};
    return firstNonBlank(
        supervision.contact,
        supervision.facultyOfficialEmail,
        supervision.officialEmail,
        supervision.supervisor_email,
        supervision.faculty_email,
        supervision.facultySupervisorEmail,
    );
}

export function coalesceIndividualMetricsForPrint(
    recalc: { individual_metrics?: IndividualMetric[] },
    stored: unknown,
): IndividualMetric[] {
    if (recalc.individual_metrics && recalc.individual_metrics.length > 0) {
        return recalc.individual_metrics;
    }
    if (!Array.isArray(stored)) return [];
    return stored.filter(
        (row): row is IndividualMetric =>
            Boolean(row && typeof row === "object" && typeof (row as IndividualMetric).student_id === "string"),
    );
}

export type Section1ParticipationDisplay = {
    facultySupervisorEmail: string;
    attendanceVerificationStatus: string;
    teamLeadRole: string;
    teamLeadHours: string;
    memberHoursLine: (memberIndex: number, memberStoredHours: unknown) => string;
};

export type ReportAuthorParticipationSnapshot = {
    /** True when the report student matches `section1.team_lead` identity. */
    isTeamLeadAuthor: boolean;
    /** Index in `team_members` when author matched a member row; -1 if lead/unknown. */
    memberIndex: number;
    displayName: string;
    cnic: string;
    mobile: string;
    email: string;
    university: string;
    /** Degree · year (lead) or program line (member), dossier-ready. */
    degreeProgramYearLine: string;
};

function normEmail(v: unknown): string {
    return typeof v === "string" ? v.trim().toLowerCase() : "";
}

/**
 * The dossier / verify UIs used to show `team_lead` for every report, but the **filing student**
 * may be a team member. That mixed `team_lead.email` with another participant's degree/program.
 * This resolves **one consistent profile** for the report owner (`student`).
 */
export function resolveReportAuthorParticipationSnapshot(
    section1: ReportData["section1"],
    student: { id?: string | null; email?: string | null; name?: string | null } | null | undefined,
): ReportAuthorParticipationSnapshot {
    const lead = section1?.team_lead;
    const members = section1?.team_members ?? [];

    const fromLead = (): ReportAuthorParticipationSnapshot => ({
        isTeamLeadAuthor: true,
        memberIndex: -1,
        displayName: firstNonBlank(lead?.fullName, lead?.name, student?.name),
        cnic: firstNonBlank(lead?.cnic),
        mobile: firstNonBlank(lead?.mobile),
        email: firstNonBlank(lead?.email, student?.email),
        university: firstNonBlank(lead?.university),
        degreeProgramYearLine: [firstNonBlank(lead?.degree), firstNonBlank(lead?.year)].filter(Boolean).join(" · "),
    });

    if (!student || (!student.email && !student.id)) {
        return fromLead();
    }

    const authorEmail = normEmail(student.email);
    const authorId = student.id != null && String(student.id).trim() ? String(student.id).trim() : "";

    const memberFromRow = (m: ReportData["section1"]["team_members"][number], i: number): ReportAuthorParticipationSnapshot => {
        const ext = m as ReportData["section1"]["team_members"][number] & { email?: string; participantId?: string };
        return {
            isTeamLeadAuthor: false,
            memberIndex: i,
            displayName: firstNonBlank(m.fullName, m.name, student.name),
            cnic: firstNonBlank(m.cnic),
            mobile: firstNonBlank(m.mobile),
            email: firstNonBlank(ext.email, student.email),
            university: firstNonBlank(m.university),
            degreeProgramYearLine: firstNonBlank(m.program),
        };
    };

    // Prefer roster row first: `team_lead.email` is sometimes synced to the filing student while
    // degree / university still describe the designated lead — matching members avoids that split.
    for (let i = 0; i < members.length; i++) {
        const m = members[i];
        const ext = m as ReportData["section1"]["team_members"][number] & { email?: string; participantId?: string };
        const rowId = firstNonBlank(m.id, ext.participantId);
        const memEmail = normEmail(ext.email);
        const hitByEmail = authorEmail && memEmail && memEmail === authorEmail;
        const hitById = authorId && rowId && String(rowId).trim() === authorId;
        if (hitByEmail || hitById) {
            return memberFromRow(m, i);
        }
    }

    if (authorEmail && normEmail(lead?.email) === authorEmail) {
        return fromLead();
    }

    if (authorId && lead?.id && String(lead.id).trim() === authorId) {
        return fromLead();
    }

    return fromLead();
}

/**
 * Shared participation display enrichments for print dossier, partner verify, and admin verify (Section 1).
 */
export function buildSection1ParticipationDisplay(args: {
    section1: ReportData["section1"];
    requiredHours?: number;
    reportForFaculty: Pick<ReportData, "section1"> & { opportunity?: unknown };
    projectData?: unknown;
}): Section1ParticipationDisplay {
    const { section1, requiredHours = 16, reportForFaculty, projectData } = args;

    const teamSize =
        (section1?.participation_type === "team" ? section1?.team_members?.length || 0 : 0) + 1;
    const rosterIds = buildIndividualRosterFromSection1(section1 ?? {}, section1?.team_lead?.id);
    const engagementRecalc = calculateEngagementMetrics(
        section1?.attendance_logs || [],
        requiredHours,
        teamSize,
        section1?.team_lead,
        rosterIds,
    );

    const mBase = section1?.metrics;
    const storedVerified = Number(mBase?.total_verified_hours);
    const verifiedHours =
        Number.isFinite(storedVerified) && storedVerified > 0
            ? Math.round(storedVerified)
            : engagementRecalc.total_verified_hours > 0
              ? Math.round(engagementRecalc.total_verified_hours)
              : Math.round(
                    (parseFloat(String(section1?.team_lead?.hours ?? "")) || 0) +
                        (section1?.team_members?.reduce(
                            (sum: number, m: ReportData["section1"]["team_members"][number]) =>
                                sum + (parseFloat(String(m.hours ?? "")) || 0),
                            0,
                        ) || 0),
                );

    const rosterIdsStable = rosterIds ?? [];
    const individualRowsForPrint = coalesceIndividualMetricsForPrint(
        engagementRecalc,
        mBase?.individual_metrics,
    );
    const leadRosterKey = rosterIdsStable[0] ?? "";
    const leadIndividualHit = leadRosterKey
        ? individualRowsForPrint.find((r) => r.student_id === leadRosterKey)
        : undefined;

    const teamLeadRole =
        firstNonBlank(section1.team_lead.role) ||
        (section1.participation_type === "team" ? "Team lead" : "Student lead");

    const teamLeadHours =
        firstNonBlank(section1.team_lead.hours) ||
        (leadIndividualHit && leadIndividualHit.individual_hours > 0
            ? `${leadIndividualHit.individual_hours} hours`
            : "") ||
        (section1.participation_type !== "team" &&
        verifiedHours > 0 &&
        !(section1.team_members ?? []).length
            ? `${verifiedHours} verified hours`
            : "");

    const s1loose = section1 as ReportData["section1"] & Record<string, unknown>;
    const dossierAttendanceStatusRaw = firstNonBlank(
        s1loose.attendance_verification_status,
        s1loose.attendanceVerificationStatus,
    );

    const sessionCountForAttendance =
        mBase?.verified_session_count && mBase.verified_session_count > 0
            ? mBase.verified_session_count
            : engagementRecalc.verified_session_count;

    const attendanceVerificationStatus =
        friendlyAttendanceVerificationStatus(dossierAttendanceStatusRaw) ||
        (verifiedHours > 0 || sessionCountForAttendance > 0
            ? `Verified — ${verifiedHours} hrs across ${sessionCountForAttendance} session(s)`
            : "");

    const facultySupervisorEmail = resolveFacultySupervisorEmailForVerify(reportForFaculty, projectData);

    const memberHoursLine = (memberIndex: number, memberStoredHours: unknown): string => {
        const fromField = firstNonBlank(memberStoredHours);
        if (fromField) {
            if (/\bhr\b/i.test(fromField)) return fromField;
            return `${fromField} hours`;
        }
        const rosterId = rosterIdsStable[memberIndex + 1];
        if (!rosterId || !individualRowsForPrint.length) return "";
        const hit = individualRowsForPrint.find((r) => r.student_id === rosterId);
        if (!hit || !(hit.individual_hours > 0)) return "";
        return `${hit.individual_hours} hours`;
    };

    return {
        facultySupervisorEmail,
        attendanceVerificationStatus,
        teamLeadRole,
        teamLeadHours,
        memberHoursLine,
    };
}
