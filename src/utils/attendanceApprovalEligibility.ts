/**
 * Aligns client-side hour/session calculations with backend attendance approval:
 * legacy rows (approval_status null/empty) count; only explicit `approved` counts otherwise.
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
    return s.toLowerCase() === "approved";
}

export function filterAttendanceLogsForVerifiedMetrics<T extends AttendanceApprovalLike>(logs: T[] | null | undefined): T[] {
    if (!logs?.length) return [];
    return logs.filter((l) => isAttendanceLogCountedForVerifiedMetrics(l));
}
