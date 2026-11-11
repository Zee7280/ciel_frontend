/**
 * The "year / semester" part of a participant's degree line ("BS AI · Semester 3").
 *
 * The Community Service flow asks for Semester (1-10) and hides "Year of study", whose form default
 * ("3rd Year") is still saved. So the semester wins whenever it is present. Program lines can also
 * arrive already joined ("BS AI · 3rd Year") and get joined again; `composeProgramLine` drops any
 * study-period segment already in the line before adding one, so the period never repeats.
 * Pure module (no imports), so node:test can load it directly.
 */

const STUDY_PERIOD_RE =
    /^(?:\d{1,2}\s*(?:st|nd|rd|th)\s+(?:year|semester)|(?:semester|sem|year)\s*\d{1,2}|graduate|postgraduate)$/i;

function firstText(...values: unknown[]): string {
    for (const value of values) {
        if (value === null || value === undefined) continue;
        const text = String(value).trim();
        if (text && text.toLowerCase() !== "undefined" && text.toLowerCase() !== "null") return text;
    }
    return "";
}

/** True for a bare year/semester label: "3rd Year", "Semester 3", "3rd semester", "Graduate". */
export function isStudyPeriodLabel(value: unknown): boolean {
    return STUDY_PERIOD_RE.test(String(value ?? "").trim());
}

/** Semester when the participant gave one, otherwise year of study. */
export function participantStudyPeriod(row: Record<string, unknown> | null | undefined): string {
    if (!row) return "";
    return firstText(row.semester, row.year, row.yearOfStudy, row.year_of_study);
}

/**
 * Joins a degree line and a study period with " · ". Study-period and repeated segments already in
 * the line are dropped first; when no period is given, the one found in the line is kept.
 */
export function composeProgramLine(baseLine: unknown, period?: unknown): string {
    const segments: string[] = [];
    let foundPeriod = "";
    for (const raw of String(baseLine ?? "").split("·")) {
        const segment = raw.trim();
        if (!segment) continue;
        if (isStudyPeriodLabel(segment)) {
            if (!foundPeriod) foundPeriod = segment;
            continue;
        }
        if (!segments.some((s) => s.toLowerCase() === segment.toLowerCase())) segments.push(segment);
    }
    const chosen = firstText(period) || foundPeriod;
    if (chosen) segments.push(chosen);
    return segments.join(" · ");
}
