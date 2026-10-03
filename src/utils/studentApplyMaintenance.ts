export const STUDENT_APPLY_MAINTENANCE_ENABLED_KEY =
    "STUDENT_APPLY_MAINTENANCE_ENABLED";
export const STUDENT_APPLY_MAINTENANCE_MESSAGE_KEY =
    "STUDENT_APPLY_MAINTENANCE_MESSAGE";
export const STUDENT_APPLY_CLOSED_BEFORE_KEY = "STUDENT_APPLY_CLOSED_BEFORE";
export const STUDENT_APPLY_EXPIRED_MESSAGE_KEY = "STUDENT_APPLY_EXPIRED_MESSAGE";

/** Sentinel the backend accepts to switch the "close listings created before" cutoff OFF. Never send "". */
export const STUDENT_APPLY_CLOSED_BEFORE_DISABLED = "disabled";

export const DEFAULT_STUDENT_APPLY_MAINTENANCE_MESSAGE =
    "Student applications are temporarily paused for maintenance. Existing reports, attendance, and reviews continue as usual.";

export const DEFAULT_STUDENT_APPLY_EXPIRED_MESSAGE =
    "This opportunity has expired. Enrolled students can continue reports and attendance.";

export function parseStudentApplyMaintenanceEnabled(
    value: string | null | undefined,
    fallback = false,
): boolean {
    if (value == null || String(value).trim() === "") return fallback;
    const v = String(value).trim().toLowerCase();
    if (["true", "1", "yes", "on", "enabled"].includes(v)) return true;
    if (["false", "0", "no", "off", "disabled"].includes(v)) return false;
    return fallback;
}

/** Returns the active cutoff date, or null when expiry is off (blank / "disabled" / unparsable). */
export function parseStudentApplyClosedBefore(value: string | null | undefined): Date | null {
    const v = String(value ?? "").trim();
    if (!v || v.toLowerCase() === STUDENT_APPLY_CLOSED_BEFORE_DISABLED) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
}

export function applyClosedCtaLabel(reason: string | null | undefined): string {
    if (reason === "maintenance") return "Temporarily paused";
    if (reason === "catalog_closed") return "Expired";
    return "Applications Closed";
}

export function applyClosedBannerTitle(reason: string | null | undefined): string {
    if (reason === "maintenance") return "Applications temporarily paused";
    if (reason === "catalog_closed") return "Opportunity expired";
    return "Applications closed";
}

export function applicationsOpenFromPayload(raw: Record<string, unknown> | null | undefined): boolean {
    if (!raw) return true;
    if (raw.applications_open === false) return false;
    const nested = raw.apply_maintenance;
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
        const enabled = (nested as { enabled?: unknown }).enabled;
        if (enabled === true) return false;
    }
    return true;
}

export function applyBlockedMessageFromPayload(
    raw: Record<string, unknown> | null | undefined,
): string | null {
    if (!raw) return null;
    const direct = raw.apply_blocked_message;
    if (typeof direct === "string" && direct.trim()) return direct.trim();
    const nested = raw.apply_maintenance;
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
        const message = (nested as { message?: unknown }).message;
        if (typeof message === "string" && message.trim()) return message.trim();
    }
    return null;
}

/** Copy root `apply_maintenance` onto a listing record so Join/Apply UI can read one object. */
export function attachApplyMaintenanceFromEnvelope<T extends Record<string, unknown>>(
    data: T,
    envelope: Record<string, unknown> | null | undefined,
): T {
    const fromEnvelope = envelope?.apply_maintenance;
    if (!fromEnvelope || typeof fromEnvelope !== "object" || Array.isArray(fromEnvelope)) {
        return data;
    }
    const existing = data.apply_maintenance;
    const nested =
        existing && typeof existing === "object" && !Array.isArray(existing)
            ? { ...(existing as Record<string, unknown>), ...(fromEnvelope as Record<string, unknown>) }
            : fromEnvelope;
    return { ...data, apply_maintenance: nested };
}
