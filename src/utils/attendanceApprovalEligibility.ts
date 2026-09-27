/**
 * Aligns client-side hour/session calculations with backend attendance:
 * rejected rows never count. Pending/logged rows count until Faculty (or CIEL PK)
 * locks the flash-card score; after that they are `approved`.
 */

export type AttendanceApprovalLike = {
    approval_status?: string | null;
    approvalStatus?: string | null;
};

export function isAttendanceLogCountedForVerifiedMetrics(
    log: AttendanceApprovalLike | null | undefined,
): boolean {
    if (!log) return true;
    const raw = log.approval_status ?? log.approvalStatus;
    if (raw == null) return true;
    const s = String(raw).trim();
    if (s === "") return true;
    return ["approved", "verified"].includes(s.toLowerCase());
}

export function filterAttendanceLogsForVerifiedMetrics<T extends AttendanceApprovalLike>(logs: T[] | null | undefined): T[] {
    if (!logs?.length) return [];
    return logs.filter((l) => isAttendanceLogCountedForVerifiedMetrics(l));
}
