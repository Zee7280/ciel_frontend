/** Normalize Nest / BFF error bodies into a single user-facing string. */
export function authApiErrorMessage(body: unknown, fallback: string): string {
    const fromBody = firstMessage(body);
    return fromBody || fallback;
}

function firstMessage(value: unknown): string {
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed;
    }
    if (Array.isArray(value)) {
        return value.map((item) => firstMessage(item)).filter(Boolean).join(". ");
    }
    if (value && typeof value === "object") {
        const record = value as Record<string, unknown>;
        return firstMessage(record.message) || firstMessage(record.error);
    }
    return "";
}

export function isSignupEmailUnverifiedMessage(message: string): boolean {
    return /email not verified/i.test(message);
}
