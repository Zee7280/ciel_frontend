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

export function parseAdminEnrollmentAttendanceRows(body: unknown): Map<string, AdminEnrollmentAttendanceMeta> {
    const map = new Map<string, AdminEnrollmentAttendanceMeta>();
    const root = asRecord(body);
    const data = asRecord(root.data);
    const enrollments = Array.isArray(data.enrollments) ? data.enrollments : [];

    for (const row of enrollments) {
        const raw = asRecord(row);
        const participationId = String(raw.participation_id ?? raw.participationId ?? "").trim();
        if (!participationId) continue;

        const unlockRaw = asRecord(raw.attendance_logging_unlock_status ?? raw.attendanceLoggingUnlockStatus);
        map.set(participationId, {
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

    return map;
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
