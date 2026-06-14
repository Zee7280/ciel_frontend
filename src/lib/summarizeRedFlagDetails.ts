const INFLATION_FLAG_RE =
    /^Inflation:\s*Unrealistic daily output on (\d{4}-\d{2}-\d{2}) \((\d+(?:\.\d+)?)\s*hrs\)$/i;

function formatShortDate(isoDate: string): string {
    const d = new Date(`${isoDate}T12:00:00`);
    if (Number.isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function summarizeInflationFlags(entries: { date: string; hrs: number }[]): string | null {
    if (entries.length === 0) return null;

    const maxHrs = Math.max(...entries.map((e) => e.hrs));
    const sortedDates = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const dateLabels = sortedDates.map((e) => formatShortDate(e.date));

    if (entries.length === 1) {
        return `Unrealistic daily output on ${dateLabels[0]} (${entries[0].hrs} hrs logged; exceeds 8 hr/day threshold).`;
    }

    const datePart =
        dateLabels.length <= 3
            ? dateLabels.join(", ")
            : `${dateLabels.slice(0, 2).join(", ")} and ${dateLabels.length - 2} more day(s)`;

    return `Unrealistic daily output on ${entries.length} day(s) (max ${maxHrs} hrs/day; ${datePart}).`;
}

function normalizeGenericFlag(flag: string): string {
    const trimmed = flag.trim();
    if (!trimmed) return trimmed;

    return trimmed
        .replace(/^Inflation:\s*/i, "")
        .replace(/^Suspicious Pattern:\s*/i, "Suspicious pattern: ")
        .replace(/\s+/g, " ");
}

/**
 * Collapses repetitive Section 1 engagement flags into reviewer-friendly bullets.
 */
export function summarizeEngagementRedFlags(flags: unknown): string[] {
    if (!Array.isArray(flags)) return [];

    const inflation: { date: string; hrs: number }[] = [];
    const others: string[] = [];
    const seenOther = new Set<string>();

    for (const raw of flags) {
        if (typeof raw !== "string") continue;
        const flag = raw.trim();
        if (!flag) continue;

        const inflationMatch = flag.match(INFLATION_FLAG_RE);
        if (inflationMatch) {
            inflation.push({ date: inflationMatch[1], hrs: Number(inflationMatch[2]) });
            continue;
        }

        const normalized = normalizeGenericFlag(flag);
        const key = normalized.toLowerCase();
        if (!seenOther.has(key)) {
            seenOther.add(key);
            others.push(normalized);
        }
    }

    const summary: string[] = [];
    const inflationSummary = summarizeInflationFlags(inflation);
    if (inflationSummary) summary.push(inflationSummary);
    summary.push(...others);

    return summary;
}

/**
 * Turns long Section 11 audit issue blocks into short bullet lines for dossier UI.
 */
export function summarizeAuditIssueText(text: string | null | undefined): string | null {
    if (text == null) return null;

    const normalized = text.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
    if (!normalized) return null;

    const numbered = normalized
        .split(/\s*(?:\d+[.)]\s+|\u2022\s+|[-*]\s+)/)
        .map((part) => part.trim())
        .filter(Boolean);

    const parts =
        numbered.length > 1
            ? numbered
            : normalized
                  .split(/\s*;\s+|\s*\|\s+/)
                  .map((part) => part.trim())
                  .filter(Boolean);

    if (parts.length <= 1) return normalized;

    return parts.map((part, index) => `${index + 1}. ${part.replace(/[.;]\s*$/, "")}`).join("\n");
}
