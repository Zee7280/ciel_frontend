export type AttendanceLoggingUnlockStatus = {
    unlocked?: boolean;
    status?: string;
    missing?: string[];
    admin_override?: boolean;
};

export type AdminEnrollmentAttendanceMeta = {
    participationId: string;
    adminAttendanceEditable: boolean;
    attendanceLocked: boolean;
    attendanceVerificationRequested: boolean;
    attendanceUnlock: AttendanceLoggingUnlockStatus | null;
};

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function participationAdminAttendanceEditable(row: unknown): boolean {
    const raw = asRecord(row);
    return raw.admin_attendance_editable === true || raw.adminAttendanceEditable === true;
}

export function participationAttendanceVerificationRequested(row: unknown): boolean {
    const raw = asRecord(row);
    return (
        raw.attendance_verification_requested === true || raw.attendanceVerificationRequested === true
    );
}

function sameTeamCohort(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
    const teamId = String(a.teamId ?? a.team_id ?? "").trim();
    const teamIdB = String(b.teamId ?? b.team_id ?? "").trim();
    if (teamId && teamIdB && teamId === teamIdB) return true;
    const appId = String(a.applicationId ?? a.application_id ?? "").trim();
    const appIdB = String(b.applicationId ?? b.application_id ?? "").trim();
    return Boolean(appId && appIdB && appId === appIdB);
}

/** True when this student's seat (or same-team lead) has CIEL admin attendance override. */
export function resolveStudentAdminAttendanceUnlock(
    myPart: unknown,
    teamRows?: unknown[] | null,
): boolean {
    if (participationAdminAttendanceEditable(myPart)) return true;
    if (!teamRows?.length) return false;

    const me = asRecord(myPart);
    const myId = String(me.id ?? "").trim();
    const myEmail = String(me.email ?? "").trim().toLowerCase();
    const myRow = teamRows.find((row) => {
        const r = asRecord(row);
        return (
            String(r.id ?? r.participantId ?? "").trim() === myId ||
            (!!myEmail && String(r.email ?? "").trim().toLowerCase() === myEmail)
        );
    });

    if (participationAdminAttendanceEditable(myRow)) return true;

    const isLead = me.isTeamLead === true || me.is_team_lead === true;
    if (isLead) return false;

    const leadRow = teamRows.find((row) => {
        const r = asRecord(row);
        return r.isTeamLead === true || r.is_team_lead === true;
    });
    if (!leadRow || !participationAdminAttendanceEditable(leadRow)) return false;

    const anchor = asRecord(myRow ?? me);
    return sameTeamCohort(anchor, asRecord(leadRow));
}

export type AdminEnrollmentAttendanceIndex = {
    byParticipationId: Map<string, AdminEnrollmentAttendanceMeta>;
    studentIdsByParticipation: Map<string, string>;
    emailsByParticipation: Map<string, string>;
};

export function parseAdminEnrollmentAttendanceRows(body: unknown): AdminEnrollmentAttendanceIndex {
    const byParticipationId = new Map<string, AdminEnrollmentAttendanceMeta>();
    const studentIdsByParticipation = new Map<string, string>();
    const emailsByParticipation = new Map<string, string>();
    const root = asRecord(body);
    const data = asRecord(root.data);
    const enrollments = Array.isArray(data.enrollments) ? data.enrollments : [];

    for (const row of enrollments) {
        const raw = asRecord(row);
        const participationId = String(raw.participation_id ?? raw.participationId ?? "").trim();
        if (!participationId) continue;

        const studentId = String(raw.student_id ?? raw.studentId ?? "").trim();
        const email = String(raw.email ?? "").trim().toLowerCase();
        if (studentId) studentIdsByParticipation.set(participationId, studentId);
        if (email) emailsByParticipation.set(participationId, email);

        const unlockRaw = asRecord(raw.attendance_logging_unlock_status ?? raw.attendanceLoggingUnlockStatus);
        byParticipationId.set(participationId, {
            participationId,
            adminAttendanceEditable: raw.admin_attendance_editable === true || raw.adminAttendanceEditable === true,
            attendanceLocked: raw.attendance_locked === true || raw.attendanceLocked === true,
            attendanceVerificationRequested:
                raw.attendance_verification_requested === true || raw.attendanceVerificationRequested === true,
            attendanceUnlock: Object.keys(unlockRaw).length
                ? {
                      unlocked: unlockRaw.unlocked === true,
                      status: typeof unlockRaw.status === "string" ? unlockRaw.status : undefined,
                      missing: Array.isArray(unlockRaw.missing)
                          ? unlockRaw.missing.map((v) => String(v))
                          : undefined,
                      admin_override: unlockRaw.admin_override === true,
                  }
                : null,
        });
    }

    return { byParticipationId, studentIdsByParticipation, emailsByParticipation };
}

export function attendanceUnlockLabel(meta: AdminEnrollmentAttendanceMeta | undefined): string {
    if (!meta) return "Unknown";
    if (meta.attendanceUnlock?.admin_override) return "Admin enabled";
    if (meta.attendanceUnlock?.unlocked || meta.attendanceUnlock?.status === "Unlocked") return "Unlocked";
    if (meta.attendanceLocked || meta.attendanceVerificationRequested) return "Locked";
    return meta.attendanceUnlock?.status?.trim() || "Locked";
}

export function attendanceUnlockTone(meta: AdminEnrollmentAttendanceMeta | undefined): "enabled" | "unlocked" | "locked" | "unknown" {
    if (!meta) return "unknown";
    if (meta.attendanceUnlock?.admin_override || meta.adminAttendanceEditable) return "enabled";
    if (meta.attendanceUnlock?.unlocked || meta.attendanceUnlock?.status === "Unlocked") return "unlocked";
    return "locked";
}
