const PERSONAL_EMAIL_DOMAINS = new Set([
    "gmail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "live.com",
    "icloud.com",
    "protonmail.com",
    "aol.com",
]);

/** Frontend-only heuristic: known personal providers get a soft warning; anything else is treated as an institutional/partner address that verifies instantly. */
export function isPersonalEmailDomain(email: string): boolean {
    const domain = email.trim().toLowerCase().split("@")[1];
    if (!domain) return false;
    return PERSONAL_EMAIL_DOMAINS.has(domain);
}
