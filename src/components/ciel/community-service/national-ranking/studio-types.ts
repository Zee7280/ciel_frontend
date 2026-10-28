/** Shapes returned by the Ranking Studio API (`.../ranking/studio/*`) and the run payload. */

export type StudioRole = "ciel_admin" | "university";

export type PackageRow = {
    id: string;
    title: string;
    university: string;
    pathway: string;
    version: string;
    cii: number | null;
    ciiLocked: boolean;
    parts?: string[];
};

export type RunRow = {
    id: string;
    title: string;
    university: string;
    pathway: string;
    version: string;
    parts?: string[];
    cii: number | null;
    ciiLocked: boolean;
    status: string;
    reason: string;
    rank: number | null;
    score: number | null;
    scoreBreakdown?: { cii: number; criteria: Record<string, number>; total: number } | null;
    evaluation?: {
        readComplete: boolean;
        flags: string[];
        summary: string;
        limitations: string;
        criteria: Record<string, { anchor: number; confidence: string; reason: string }>;
        claims: Array<{ statement: string; source: string; locator: string; support: string; limitation: string }>;
    } | null;
    package?: PackageRow;
    /** What the analyzer could and could not show the AI for this package (set by the server). */
    evidenceRead?: {
        inspected: Array<{ id: string; name: string }>;
        notInspected: Array<{ id: string; name: string; reason: string }>;
    } | null;
};

export type ReviewItem = { id: string; title: string; reason: string; type: string; cleared: boolean };

export type CriterionMeta = { key: string; title: string; label?: string; question?: string; weight: number; source?: string };

export type RunPayload = {
    runId: string;
    /** Server-side analysis progress; `remaining` > 0 means call analyze again with the same runId. */
    progress?: { total: number; analyzed: number; remaining: number };
    rubricVersion: string;
    createdAt: string;
    published: boolean;
    criteria?: CriterionMeta[];
    rows: RunRow[];
    reviewItems: ReviewItem[];
};

export type StudioFilters = Partial<{
    university: string;
    department: string;
    instructor: string;
    sdg: string;
    skills: string;
    year: string;
    month: string;
    semester: string;
    city: string;
    partner: string;
    activity: string;
    theme: string;
    ciiBadge: string;
    privacy: string;
    dateFrom: string;
    dateTo: string;
    minHours: number;
    minCii: number;
    teamSize: string;
}>;

export type CustomWeights = { impact: number; sustain: number; learning: number; cii: number };

export type StudioRow = {
    rank: number;
    id: string;
    label: string;
    projectCount: number;
    projectIds: string[];
    metric: number;
    cii: number | null;
    previousRank?: number | null;
    movement?: "up" | "down" | "same" | "new" | "cohort";
};

export type StudioResult = {
    lens: string;
    groupBy: string;
    filters: StudioFilters;
    weights: CustomWeights | null;
    rubricVersion: string;
    name: string;
    signature: string;
    rows: StudioRow[];
    eligibleIds: string[];
    heldIds: string[];
    unreadIds: string[];
    heldReasons: Array<{ id: string; title: string; reason: string }>;
    thinGroups: Array<{ id: string; projectCount: number }>;
    populationCount: number;
};

export type LensMeta = {
    key: string;
    title: string;
    description: string;
    kind: "points" | "rubric" | "hours" | "people" | "currency";
    needsEvaluation: boolean;
};

export type LibraryPackage = {
    id: string;
    title: string;
    university: string;
    department: string;
    sdg: string;
    date: string;
    cii: number | null;
    /** `legacy`: approved before CII v4.5 locking — the original approved CII, not a v4.5 lock. */
    ciiSource?: "v45" | "legacy" | null;
    ready: boolean;
    evaluated: boolean;
    reason: string;
};

export type StudioPreview = {
    scope: string;
    run: { id: string; status: string; createdAt: string; rubricVersion: string } | null;
    rubricVersion: string;
    criteria: CriterionMeta[];
    lenses: LensMeta[];
    groups: Array<{ key: string; title: string }>;
    counts: {
        packages: number;
        eligible: number;
        held: number;
        inRanking: number;
        heldInSelection: number;
        populationInFilters: number;
    };
    pendingReviews: number;
    options: Record<string, string[]>;
    packages: LibraryPackage[];
    result: StudioResult;
    publishBlockers: string[];
    lastPublication: { id: string; revision: number; publishedAt: string } | null;
};

export type PublicationSummary = {
    id: string;
    name: string;
    lens: string;
    lensTitle: string;
    groupBy: string;
    filters: StudioFilters;
    weights: CustomWeights | null;
    rubricVersion: string;
    revision: number;
    cohortComparable: boolean;
    eligibleCount: number;
    heldCount: number;
    rowCount: number;
    publishedAt: string;
    top: Array<{ rank: number; label: string; metric: number }>;
    rows?: StudioRow[];
};

export type ProjectRanking = {
    publicationId: string;
    name: string;
    lens: string;
    lensTitle: string;
    groupBy: string;
    filters: StudioFilters;
    rank: number;
    of: number;
    label: string;
    metric: number;
    revision: number;
    publishedAt: string;
    movement: "up" | "down" | "same" | "new" | "cohort";
    previousRank: number | null;
    scope: "national" | "university";
};

export const FILTER_TITLES: Record<string, string> = {
    university: "University",
    department: "Department",
    instructor: "Instructor",
    sdg: "SDG",
    skills: "Skill",
    year: "Year",
    month: "Month",
    semester: "Semester",
    city: "City",
    partner: "Partner",
    activity: "Activity",
    theme: "Impact theme",
    ciiBadge: "CII badge",
    privacy: "Evidence class",
    dateFrom: "From",
    dateTo: "To",
    minHours: "Min. hours",
    minCii: "Min. CII",
    teamSize: "Team size",
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const TEAM_SIZE_LABELS: Record<string, string> = {
    "1-3": "1–3 students",
    "4-6": "4–6 students",
    "7-10": "7–10 students",
    "11-999": "11+ students",
};

export function prettyFilterValue(key: string, value: string | number): string {
    if (key === "month") return MONTHS[Number(value) - 1] || String(value);
    if (key === "dateFrom" || key === "dateTo") return fmtDate(String(value));
    if (key === "teamSize") return TEAM_SIZE_LABELS[String(value)] || String(value);
    return String(value);
}

/** Display names for Compare options (the server titles are terser). */
export function groupTitle(key: string, serverTitle?: string): string {
    if (key === "sdg") return "Primary SDGs";
    if (key === "partner") return "Partner organizations";
    return serverTitle || key;
}

/** Every Rank-by lens, shown until the server's list (with descriptions) arrives or if it never does. */
export const FALLBACK_LENSES: LensMeta[] = [
    { key: "excellence", title: "Overall Project Excellence", description: "", kind: "points", needsEvaluation: true },
    { key: "cii", title: "Approved CII Score", description: "", kind: "points", needsEvaluation: false },
    { key: "impact", title: "Community Impact", description: "", kind: "rubric", needsEvaluation: true },
    { key: "sdg", title: "SDG Contribution", description: "", kind: "rubric", needsEvaluation: true },
    { key: "learning", title: "Student Skills & Learning", description: "", kind: "rubric", needsEvaluation: true },
    { key: "sustain", title: "Sustainability", description: "", kind: "rubric", needsEvaluation: true },
    { key: "partner", title: "Partner Collaboration", description: "", kind: "rubric", needsEvaluation: true },
    { key: "need", title: "Community Need & Relevance", description: "", kind: "rubric", needsEvaluation: true },
    { key: "efficiency", title: "Resource Efficiency", description: "", kind: "rubric", needsEvaluation: true },
    { key: "scale", title: "Transferability", description: "", kind: "rubric", needsEvaluation: true },
    { key: "hours", title: "Verified Service Hours", description: "", kind: "hours", needsEvaluation: false },
    { key: "reach", title: "Beneficiaries Reached", description: "", kind: "people", needsEvaluation: false },
    { key: "funds", title: "Resources Mobilized (PKR)", description: "", kind: "currency", needsEvaluation: false },
    { key: "custom", title: "Custom Weighted Excellence", description: "", kind: "points", needsEvaluation: true },
];

/** Every Compare option, mirroring the server's STUDIO_GROUPS. */
export const FALLBACK_GROUPS: Array<{ key: string; title: string }> = [
    { key: "project", title: "Individual projects" },
    { key: "university", title: "Universities" },
    { key: "department", title: "Departments" },
    { key: "instructor", title: "Instructors" },
    { key: "sdg", title: "SDGs" },
    { key: "skill", title: "Skills" },
    { key: "partner", title: "Partners" },
    { key: "city", title: "Cities" },
];

/**
 * A project's standing in the ranking on screen. Group rankings rank the group, so a member project
 * is "in group #N", never ranked #N itself. One map feeds both the panel and the CSV export.
 */
export type ProjectStanding =
    | { kind: "ranked"; rank: number }
    | { kind: "in_group"; rank: number; group: string }
    | { kind: "eligible" }
    | { kind: "unread" }
    | { kind: "outside" }
    | { kind: "held" };

export function buildProjectStandings(
    result: StudioResult | null,
    packages: LibraryPackage[],
    stale: boolean,
): Map<string, ProjectStanding> {
    const out = new Map<string, ProjectStanding>();
    const isProject = (result?.groupBy ?? "project") === "project";
    if (result && !stale) {
        for (const r of result.rows) {
            for (const id of r.projectIds ?? []) {
                if (out.has(id)) continue;
                out.set(id, isProject ? { kind: "ranked", rank: r.rank } : { kind: "in_group", rank: r.rank, group: r.label });
            }
        }
    }
    const inSelection = new Set([...(result?.eligibleIds ?? []), ...(result?.heldIds ?? [])]);
    const unread = new Set(result?.unreadIds ?? []);
    for (const p of packages) {
        if (out.has(p.id)) continue;
        if (!p.ready) out.set(p.id, { kind: "held" });
        else if (result && !stale && !inSelection.has(p.id)) out.set(p.id, { kind: "outside" });
        else if (unread.has(p.id) || !p.evaluated) out.set(p.id, { kind: "unread" });
        else out.set(p.id, { kind: "eligible" });
    }
    return out;
}

export function standingLabel(s: ProjectStanding | undefined): string {
    switch (s?.kind) {
        case "ranked":
            return `Ranked #${s.rank}`;
        case "in_group":
            return `In #${s.rank} group (${s.group})`;
        case "unread":
            return "Eligible — awaiting AI read";
        case "outside":
            return "Outside current filters";
        case "held":
            return "Held — verification required";
        default:
            return "Eligible — no value for this measure";
    }
}

export function fmtNum(n: number, digits = 1): string {
    return Number(n).toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function fmtDate(iso: string): string {
    if (!iso) return "—";
    const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function metricDisplay(value: number, kind: LensMeta["kind"] | undefined): string {
    switch (kind) {
        case "hours":
            return `${fmtNum(value)} hours`;
        case "people":
            return `${fmtNum(value, 0)} people`;
        case "currency":
            return `PKR ${fmtNum(Math.round(value), 0)}`;
        default:
            return `${fmtNum(value)} /100`;
    }
}

/** Width (0–100) of the little bar next to a measure, relative to the largest value shown. */
export function metricBarPercent(value: number, max: number, kind: LensMeta["kind"] | undefined): number {
    const ceiling = kind === "hours" || kind === "people" || kind === "currency" ? Math.max(max, 1) : 100;
    return Math.max(3, Math.min(100, (value / ceiling) * 100));
}
