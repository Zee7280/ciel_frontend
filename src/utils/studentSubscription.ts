/**
 * Student subscription fee (students from universities that are not CIEL members).
 * Keys and status must match backend `student-subscription.util.ts`.
 */

export const STUDENT_SUBSCRIPTION_REQUIRED_KEY = "STUDENT_SUBSCRIPTION_REQUIRED";
export const STUDENT_SUBSCRIPTION_FEE_PKR_KEY = "STUDENT_SUBSCRIPTION_FEE_PKR";
export const STUDENT_SUBSCRIPTION_DEFAULT_FEE_PKR = 300;
export const PENDING_SUBSCRIPTION_STATUS = "pending_subscription_payment";
export const STUDENT_SUBSCRIPTION_PATH = "/dashboard/student/subscription";

export function parseStudentSubscriptionRequiredSettingValue(
    value: string | null | undefined,
    defaultEnabled = true,
): boolean {
    if (value == null || String(value).trim() === "") return defaultEnabled;
    const normalized = String(value).trim().toLowerCase();
    if (["false", "0", "no", "off", "disabled"].includes(normalized)) return false;
    if (["true", "1", "yes", "on", "enabled"].includes(normalized)) return true;
    return defaultEnabled;
}

/** True when the student must pay the subscription fee before the portal unlocks. */
export function studentNeedsSubscriptionPayment(user: Record<string, unknown> | null | undefined): boolean {
    if (!user) return false;
    const role = String(user.role ?? user.type ?? "").trim().toLowerCase();
    if (role && role !== "student") return false;
    if (user.requires_subscription_payment === true) return true;
    const st = String(user.account_status ?? user.status ?? "").trim().toLowerCase();
    return st === PENDING_SUBSCRIPTION_STATUS;
}

const ALLOWED_PREFIXES = [
    STUDENT_SUBSCRIPTION_PATH,
    "/dashboard/student/profile",
    "/dashboard/student/settings",
    "/dashboard/student/help",
] as const;

/** Pages a student may still open while the subscription fee is pending. */
export function studentPathAllowedDuringSubscriptionPending(pathname: string): boolean {
    return ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
