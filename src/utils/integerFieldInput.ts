/** Digits-only integer field (blocks `e` / `.` / `+` from `type="number"`). */
export function integerFieldInput(raw: string, maxDigits = 6): string {
    return String(raw ?? "").replace(/\D/g, "").slice(0, maxDigits);
}
