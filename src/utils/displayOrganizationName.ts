/** Keep in sync with backend tracking-org-name.util.ts */
export function displayOrganizationName(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;
    const name = value.trim();
    if (name.length < 2 || name.length > 80) return undefined;
    if (/^n\/?a$/i.test(name)) return undefined;
    if (/^unknown$/i.test(name)) return undefined;
    if (/^student opportunity\b/i.test(name)) return undefined;
    if (/add only if/i.test(name)) return undefined;
    if (/another organization connected/i.test(name)) return undefined;
    if (/\beg\.?\s*sos\b/i.test(name) && /add only if|connected/i.test(name)) return undefined;
    return name;
}
