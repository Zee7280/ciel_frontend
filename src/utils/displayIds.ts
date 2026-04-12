function compactToken(raw: string): string {
    return raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

/**
 * UI-only ID formatter.
 * Keeps backend IDs untouched for API calls and filtering, but shows a shorter label in the UI.
 */
export function formatDisplayId(rawId: unknown, prefix = "ID"): string {
    if (rawId == null) return "—";

    const text = String(rawId).trim();
    if (!text) return "—";

    if (/^[A-Z]-\d+$/i.test(text) || /^[A-Z]{1,4}-[A-Z0-9]+$/i.test(text)) {
        return text.toUpperCase();
    }

    const compact = compactToken(text);
    if (!compact) return text;

    if (compact.length <= 8) {
        return `${prefix}-${compact}`;
    }

    return `${prefix}-${compact.slice(-6)}`;
}
