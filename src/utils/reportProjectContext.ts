type ProjectContextDisplay = {
    partnerOrganization: string;
    projectLocation: string;
    timelineLabel: string;
    creditHoursLabel: string;
};

function objectRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
}

function cleanText(value: unknown): string {
    if (value === null || value === undefined) return "";
    if (typeof value === "object") return "";
    const text = String(value).trim();
    if (!text || text.toLowerCase() === "undefined" || text.toLowerCase() === "null") return "";
    return text;
}

function firstText(records: Record<string, unknown>[], keys: string[]): string {
    for (const record of records) {
        for (const key of keys) {
            const text = cleanText(record[key]);
            if (text) return text;
        }
    }
    return "";
}

function firstNumber(records: Record<string, unknown>[], keys: string[]): number | null {
    let fallback: number | null = null;
    for (const record of records) {
        for (const key of keys) {
            const value = record[key];
            if (value === null || value === undefined || value === "") continue;
            const parsed = typeof value === "number" ? value : Number(String(value).trim());
            if (!Number.isFinite(parsed)) continue;
            if (parsed > 0) return parsed;
            if (fallback === null) fallback = parsed;
        }
    }
    return fallback;
}

function formatDate(value: string): string {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function joinUnique(parts: string[]): string {
    const seen = new Set<string>();
    return parts
        .map(cleanText)
        .filter((part) => {
            if (!part) return false;
            const key = part.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .join(", ");
}

export function getReportProjectContextDisplay(report: unknown): ProjectContextDisplay {
    const root = objectRecord(report) ?? {};
    const opportunity = objectRecord(root.opportunity) ?? {};
    const project = objectRecord(root.project) ?? objectRecord(root.projectData) ?? {};
    const rootLocation = objectRecord(root.location) ?? {};
    const opportunityLocation = objectRecord(opportunity.location) ?? {};
    const projectLocation = objectRecord(project.location) ?? {};
    const rootTimeline = objectRecord(root.timeline) ?? {};
    const opportunityTimeline = objectRecord(opportunity.timeline) ?? {};
    const projectTimeline = objectRecord(project.timeline) ?? {};
    const organizationObj =
        objectRecord(opportunity.organization) ??
        objectRecord(root.organization) ??
        objectRecord(project.organization) ??
        {};

    const records = [opportunity, project, root];
    const timelineRecords = [opportunityTimeline, projectTimeline, rootTimeline, opportunity, project, root];

    const partnerOrganization =
        firstText([opportunity, root, project, organizationObj], [
            "organization_name",
            "organizationName",
            "partner_organization",
            "partnerOrganization",
            "partner_name",
            "partnerName",
            "organization",
            "name",
        ]) || "N/A";

    const locationText = firstText(records, ["location_text", "locationText", "address", "venue"]);
    const projectLocationDisplay =
        locationText ||
        joinUnique([
            firstText([opportunityLocation, projectLocation, rootLocation], ["venue", "address"]),
            firstText([opportunity, project, root, opportunityLocation, projectLocation, rootLocation], [
                "city",
                "district",
                "location_district",
                "locationDistrict",
            ]),
            firstText([opportunity, project, root, opportunityLocation, projectLocation, rootLocation], [
                "province",
                "location_province",
                "locationProvince",
            ]),
            firstText([opportunity, project, root, opportunityLocation, projectLocation, rootLocation], [
                "country",
                "location_country",
                "locationCountry",
            ]),
        ]) ||
        "N/A";

    const startDate = formatDate(firstText(timelineRecords, ["start_date", "startDate", "from_date", "fromDate"]));
    const endDate = formatDate(firstText(timelineRecords, ["end_date", "endDate", "to_date", "toDate"]));
    const timelineLabel = startDate || endDate ? `${startDate || "—"} to ${endDate || "—"}` : "—";

    const creditHours = firstNumber(timelineRecords, [
        "expected_hours",
        "expectedHours",
        "required_hours",
        "requiredHours",
        "credit_hours",
        "creditHours",
        "hours",
    ]);
    const creditHoursLabel = `${creditHours ?? 0} Hours Credit`;

    return {
        partnerOrganization,
        projectLocation: projectLocationDisplay,
        timelineLabel,
        creditHoursLabel,
    };
}
