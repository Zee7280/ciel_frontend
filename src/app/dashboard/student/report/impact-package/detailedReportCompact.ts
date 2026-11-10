/**
 * Compact layout for the Admin's Detailed report tab. The full dossier prints every session, evidence
 * file and activity as a stacked block of fields, which runs to many pages. In compact mode the same
 * answers are laid out densely: repeated entries become one table row each, short answers share a
 * grid, unanswered questions fold into one line, and long tables show their first rows with a
 * "show all" toggle. Pure module (type-only import), so the node:test suite can load it directly.
 */
import type { DetailedReportRow, DetailedReportValue } from "./buildImpactPackageDetailedReport";

/** Rows a long table shows before the "show all" toggle. */
export const COMPACT_TABLE_PREVIEW_ROWS = 6;

const NOT_SUPPLIED = "Not supplied";
const SHORT_TEXT = 90;

type RecordValue = { [key: string]: DetailedReportValue };

function isRecord(value: DetailedReportValue): value is RecordValue {
    return value != null && typeof value === "object" && !Array.isArray(value);
}

function niceKey(value: string): string {
    return value
        .replaceAll("_", " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function blank(value: DetailedReportValue): boolean {
    if (value == null) return true;
    if (typeof value === "string") return !value.trim() || value === NOT_SUPPLIED;
    if (typeof value === "number") return !Number.isFinite(value);
    if (typeof value === "boolean") return false;
    if (Array.isArray(value)) return value.every(blank);
    return Object.values(value).every(blank);
}

/** One table cell as plain text: lists join with commas, nested records flatten to "Key: value". */
export function compactCellText(value: DetailedReportValue): string {
    if (value == null || blank(value)) return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "number") return String(value);
    if (typeof value === "string") return value.trim();
    if (Array.isArray(value)) {
        return value
            .filter((item) => !blank(item))
            .map((item) => (typeof item === "string" ? niceKey(item) : compactCellText(item)))
            .join(", ");
    }
    return Object.entries(value)
        .filter(([, item]) => !blank(item))
        .map(([key, item]) => `${niceKey(key)}: ${compactCellText(item)}`)
        .join(" · ");
}

export type CompactTable = { columns: Array<{ key: string; label: string }>; rows: string[][] };

/**
 * A list of entries as a table: one row per entry, one column per field that at least one entry
 * answered. Null when the answer is not a list of records (it is shown as before).
 */
export function compactTable(value: DetailedReportValue): CompactTable | null {
    if (!Array.isArray(value) || !value.length || !value.every(isRecord)) return null;
    const entries = value as RecordValue[];
    const keys: string[] = [];
    for (const entry of entries) {
        for (const key of Object.keys(entry)) {
            if (!keys.includes(key) && entries.some((item) => !blank(item[key] ?? null))) keys.push(key);
        }
    }
    if (!keys.length) return null;
    return {
        columns: keys.map((key) => ({ key, label: niceKey(key) })),
        rows: entries.map((entry) => keys.map((key) => compactCellText(entry[key] ?? null))),
    };
}

/** Short answers sit two or three to a line; long text and tables take the full width. */
export function isCompactShortAnswer(value: DetailedReportValue): boolean {
    if (typeof value === "number" || typeof value === "boolean") return true;
    if (typeof value === "string") return value.length <= SHORT_TEXT && !value.includes("\n");
    if (Array.isArray(value)) {
        if (!value.every((item) => item == null || typeof item !== "object")) return false;
        return value.map((item) => String(item ?? "")).join(", ").length <= SHORT_TEXT;
    }
    return false;
}

/** Splits a subsection's rows into answered rows and the questions left unanswered. */
export function splitCompactRows(rows: DetailedReportRow[]): { answered: DetailedReportRow[]; unanswered: string[] } {
    const answered: DetailedReportRow[] = [];
    const unanswered: string[] = [];
    for (const item of rows) {
        if (blank(item.answer)) unanswered.push(item.question);
        else answered.push(item);
    }
    return { answered, unanswered };
}
