/** Non-negative decimal field (digits + one dot): keeps 4.2 / 12.5 / 82.5 while blocking `e`, `-`, `+`. */
export function decimalFieldInput(raw: string, maxLength = 9): string {
    const cleaned = String(raw ?? "").replace(/[^\d.]/g, "");
    const dot = cleaned.indexOf(".");
    const normalized = dot === -1 ? cleaned : cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "");
    return normalized.slice(0, maxLength);
}
