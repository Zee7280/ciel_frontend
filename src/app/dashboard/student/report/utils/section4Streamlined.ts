/**
 * V19 "streamlined" Section 4 (Activities & Outputs) — pure helpers shared by the wizard UI, the
 * live validation and the auto-generated section summary. Deliberately dependency-free so the
 * node test runner can import it directly.
 *
 * Data contract: everything is written onto the EXISTING report keys (`section4.activity_blocks`,
 * `section4.project_summary`, `section5.*`), so earlier drafts, the backend submit validation,
 * scoring and the impact package keep reading the same fields. V19 only adds optional keys:
 *   activity: `no_output`, `no_output_reason`, `evidence_ref`, `v19`
 *   project_summary: `reach_mode` ('counted' | 'unconfirmed' | 'none')
 *   measurable outcome: `simple` (the one optional before / after result)
 */

export type ReachMode = "counted" | "unconfirmed" | "none" | "";

export const ACTIVITY_STATUS_OPTIONS = ["Completed", "Partially Completed", "Ongoing", "Cancelled / Not Delivered"] as const;

export const REACH_MODE_OPTIONS: Array<{ value: Exclude<ReachMode, "">; label: string }> = [
    { value: "counted", label: "Yes — I can give one deduplicated count of unique people" },
    { value: "unconfirmed", label: "Yes, people were reached, but a unique count is not confirmed" },
    { value: "none", label: "No direct human beneficiaries (e.g. environmental or systems work)" },
];

/** Output types grouped the way the V19 picker shows them. */
export const OUTPUT_GROUPS: Array<[string, string[]]> = [
    ["People & sessions", ["Sessions Conducted", "Trainings Delivered", "Individuals Reached", "Unique People Reached", "Households Supported", "Participant-Hours", "Volunteers Engaged", "Volunteer Hours"]],
    ["Things delivered", ["Kits Distributed", "Books / Learning Materials", "Meals / Food Packages", "Devices Distributed", "Resources Distributed", "Awareness Materials Produced", "Services Delivered", "Referrals Made"]],
    ["Places & environment", ["Rooms / Classrooms Improved", "Facilities Improved", "Area Covered / Cleaned / Restored", "Trees Planted", "Trees Surviving", "Waste Collected / Diverted", "Water Supplied / Saved"]],
    ["Knowledge & systems", ["Reports / Surveys / Assessments Generated", "Datasets Produced", "Systems / Tools Developed", "SOPs / Policies Developed", "Digital Users"]],
    ["Money & partnerships", ["Financial Support Provided", "Funds Mobilized", "In-Kind Value", "Partnerships Formed", "Businesses Supported", "Jobs / Internships Facilitated"]],
    ["Other", ["Other"]],
];

export const OUTPUT_UNIT_OPTIONS = [
    "Sessions", "Trainings", "Workshops", "Individuals / People", "Households", "Hours", "Days",
    "Kits", "Items", "Packages", "Meals", "Books / Materials", "Devices",
    "Rooms / Classrooms", "Facilities", "Trees", "Kilograms", "Tons", "Liters", "Hectares / Area Units",
    "Reports", "Surveys", "Assessments", "Systems", "Platforms", "Partnerships", "Volunteers", "PKR", "USD", "Other",
];

/** Unit the picker pre-selects for an output type (the student can still change it). */
export function suggestedUnitForOutput(type: string): string {
    const name = String(type || "").toLowerCase();
    if (/session|workshop|training|meeting|consultation|event/.test(name)) return /training/.test(name) ? "Trainings" : "Sessions";
    if (/trees|plants/.test(name)) return "Trees";
    if (/books|learning materials/.test(name)) return "Books / Materials";
    if (/classrooms|rooms/.test(name)) return "Rooms / Classrooms";
    if (/facilit/.test(name)) return "Facilities";
    if (/kilogram|waste/.test(name)) return "Kilograms";
    if (/water/.test(name)) return "Liters";
    if (/area/.test(name)) return "Hectares / Area Units";
    if (/people|participants|students|patients|individuals|users|volunteers engaged/.test(name)) return "Individuals / People";
    if (/household/.test(name)) return "Households";
    if (/hours/.test(name)) return "Hours";
    if (/report|research|survey|assessment|dataset/.test(name)) return "Reports";
    if (/kit/.test(name)) return "Kits";
    if (/meal/.test(name)) return "Meals";
    if (/device/.test(name)) return "Devices";
    if (/fund|financial|value/.test(name)) return "PKR";
    if (/partnership/.test(name)) return "Partnerships";
    if (/system|tool|sop|polic|platform/.test(name)) return "Systems";
    return "Items";
}

export const CHALLENGE_TAG_OPTIONS = [
    "⏰ Not enough time",
    "💸 Limited budget",
    "🚪 Access to the site",
    "📐 Hard to measure change",
    "🗓️ Scheduling with partner",
    "👥 Participation / engagement",
    "📦 Limited materials / staff",
    "📊 Missing baseline / follow-up data",
    "✨ Other",
] as const;
export const NO_CHALLENGES_TAG = "No significant challenges";

/** 4.3 "How do you know?" — the evidence basis behind the observed change (V16 list). */
export const EVIDENCE_BASIS_OPTIONS = [
    "Before / after photographs",
    "Attendance / distribution records",
    "Partner feedback / records",
    "Student observation only",
    "No outcome evidence yet",
] as const;
export const NO_OUTCOME_EVIDENCE_TAG = "No outcome evidence yet";

export function wordCount(text: unknown): number {
    return String(text ?? "")
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
}

const num = (v: unknown): number => {
    const n = Number(String(v ?? "").replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : NaN;
};
const txt = (v: unknown): string => String(v ?? "").trim();
const isOther = (v: unknown): boolean => /other/i.test(txt(v));

export type V19Output = { type?: string; title?: string; type_other?: string; quantity?: string | number; unit?: string; unit_other?: string };

export function outputOk(o: V19Output | null | undefined): boolean {
    if (!o) return false;
    const type = txt(o.type || o.title);
    if (!type) return false;
    if (isOther(type) && !txt(o.type_other)) return false;
    const q = num(o.quantity);
    if (!(q > 0)) return false;
    const unit = txt(o.unit);
    if (!unit) return false;
    if (isOther(unit) && !txt(o.unit_other)) return false;
    return true;
}

export type V19Activity = {
    id?: string;
    title?: string;
    status?: string;
    primary_category?: string;
    sub_category?: string;
    other_category_text?: string;
    other_sub_category_text?: string;
    description?: string;
    outputs?: V19Output[];
    no_output?: boolean;
    no_output_reason?: string;
    evidence_ref?: string;
    beneficiaries_reached?: string | number;
    unique_beneficiaries?: string | number;
    [key: string]: unknown;
};

/** "What did I/we deliver?" is satisfied by ≥1 valid output, or by the explicit no-output declaration. */
export function deliveryOk(a: V19Activity): boolean {
    if (a.no_output === true) return txt(a.no_output_reason).length > 0;
    const outs = Array.isArray(a.outputs) ? a.outputs : [];
    return outs.length > 0 && outs.every(outputOk);
}

export type ActivityIssue = { field: string; message: string };

/** Per-activity V19 rules; `subsFor` tells whether the chosen category has sub-categories. */
export function activityIssues(a: V19Activity, index: number, subsFor: (category: string) => string[]): ActivityIssue[] {
    const n = index + 1;
    const out: ActivityIssue[] = [];
    const f = (k: string) => `activity_blocks.${index}.${k}`;
    if (!txt(a.title)) out.push({ field: f("title"), message: `Activity ${n}: enter the activity name` });
    if (!txt(a.status)) out.push({ field: f("status"), message: `Activity ${n}: choose the activity status` });
    const cat = txt(a.primary_category);
    if (!cat) out.push({ field: f("primary_category"), message: `Activity ${n}: choose the activity category` });
    else if (isOther(cat) && !txt(a.other_category_text)) out.push({ field: f("other_category_text"), message: `Activity ${n}: name the custom category` });
    else if (!isOther(cat) && subsFor(cat).length && !txt(a.sub_category)) out.push({ field: f("sub_category"), message: `Activity ${n}: choose the activity subcategory` });
    if (isOther(a.sub_category) && !txt(a.other_sub_category_text)) out.push({ field: f("other_sub_category_text"), message: `Activity ${n}: name the custom subcategory` });
    if (!txt(a.description)) out.push({ field: f("description"), message: `Activity ${n}: describe what you actually did` });
    if (!deliveryOk(a)) {
        out.push({
            field: f("outputs"),
            message:
                a.no_output === true
                    ? `Activity ${n}: explain briefly why this activity has no countable output`
                    : `Activity ${n}: enter each output with its quantity and unit, or mark no countable output`,
        });
    }
    return out;
}

export type ProjectReach = { reach_mode?: ReachMode; distinct_total_beneficiaries?: string | number; counting_method?: string; [key: string]: unknown };

/** Project-level unique reach (4.2): one deduplicated count + source, or an honest "unconfirmed" / "none". */
export function reachIssues(summary: ProjectReach | null | undefined, activities: V19Activity[]): ActivityIssue[] {
    const s = summary || {};
    const mode = effectiveReachMode(s, activities);
    if (!mode) return [{ field: "project_summary.reach_mode", message: "Say whether the project directly reached people" }];
    if (mode === "counted") {
        const out: ActivityIssue[] = [];
        if (!(num(s.distinct_total_beneficiaries) > 0)) out.push({ field: "project_summary.distinct_total_beneficiaries", message: "Enter the unique number of people reached (counted once)" });
        if (!txt(s.counting_method)) out.push({ field: "project_summary.counting_method", message: "Say how the unique count was established" });
        if (reachConflict(s, activities)) {
            out.push({ field: "project_summary.distinct_total_beneficiaries", message: "Conflicting project and activity counts: the unique total cannot exceed the activity-level engagements. Reconcile the figures." });
        }
        return out;
    }
    return [];
}

/**
 * Unique people can never exceed the engagements recorded on the activities (a person counted once
 * cannot be more than everyone counted per activity). Only meaningful when activity counts exist.
 */
export function reachConflict(summary: ProjectReach | null | undefined, activities: V19Activity[]): boolean {
    const unique = num(summary?.distinct_total_beneficiaries);
    const engagements = activityLevelEngagements(activities);
    return engagements > 0 && unique > engagements;
}

/** Legacy drafts carried a deduplicated total without a mode: treat that as "counted". */
export function effectiveReachMode(summary: ProjectReach | null | undefined, activities: V19Activity[]): ReachMode {
    const s = summary || {};
    const mode = txt(s.reach_mode) as ReachMode;
    if (mode === "counted" || mode === "unconfirmed" || mode === "none") return mode;
    if (num(s.distinct_total_beneficiaries) > 0) return "counted";
    if (activities.some((a) => num(a.unique_beneficiaries ?? a.beneficiaries_reached) > 0)) return "counted";
    return "";
}

/** Sum of per-activity counts still present on older ladder activities (engagements, not unique people). */
export function activityLevelEngagements(activities: V19Activity[]): number {
    return activities.reduce((sum, a) => {
        const n = num(a.beneficiaries_reached ?? a.unique_beneficiaries);
        return sum + (n > 0 ? n : 0);
    }, 0);
}

export function reachStatusLine(summary: ProjectReach | null | undefined, activities: V19Activity[]): string {
    const mode = effectiveReachMode(summary, activities);
    const engagements = activityLevelEngagements(activities);
    const engText = `${engagements} activity-level engagement${engagements === 1 ? "" : "s"}`;
    if (mode === "counted") {
        const n = num(summary?.distinct_total_beneficiaries);
        const conflict = reachConflict(summary, activities) ? " · Conflicting project and activity counts — reconcile" : "";
        return `${n > 0 ? n.toLocaleString() : "—"} unique people · ${engText} · ${txt(summary?.counting_method) ? `Source: ${txt(summary?.counting_method)}` : "source pending"}${conflict}`;
    }
    if (mode === "none") return `No direct human beneficiaries · ${engText}`;
    return `Unique reach unconfirmed · ${engText} · Unique reach unconfirmed`;
}

export type SimpleMeasure = {
    id?: string;
    simple?: boolean;
    metric?: string;
    unit?: string;
    baseline?: string | number;
    endline?: string | number;
    measurement_explanation?: string;
    [key: string]: unknown;
};

export const SIMPLE_MEASURE_UNITS = ["%", "percentage points", "score", "count", "kg", "liters", "hours", "PKR", "minutes", "days", "Other"];

/** The one optional before / after result is either empty (fine) or complete. */
export function simpleMeasureIssues(m: SimpleMeasure | null | undefined): ActivityIssue[] {
    if (!m) return [];
    const filled = [txt(m.metric), txt(m.unit), txt(m.baseline), txt(m.endline), txt(m.measurement_explanation)].filter(Boolean).length;
    if (filled === 0) return [];
    const out: ActivityIssue[] = [];
    if (!txt(m.metric)) out.push({ field: "measurable_outcomes.0.metric", message: "Name what was measured, or clear the optional result" });
    if (!txt(m.unit)) out.push({ field: "measurable_outcomes.0.unit", message: "Choose the unit of the measured result" });
    if (txt(m.baseline) === "" || !Number.isFinite(num(m.baseline))) out.push({ field: "measurable_outcomes.0.baseline", message: "Enter the before value (a number)" });
    if (txt(m.endline) === "" || !Number.isFinite(num(m.endline))) out.push({ field: "measurable_outcomes.0.endline", message: "Enter the after value (same unit)" });
    if (!txt(m.measurement_explanation)) out.push({ field: "measurable_outcomes.0.measurement_explanation", message: "Say where these figures come from" });
    return out;
}

export function simpleMeasureChangeLine(m: SimpleMeasure | null | undefined): string {
    if (!m || simpleMeasureIssues(m).length || !txt(m.metric)) return "";
    const b = num(m.baseline);
    const e = num(m.endline);
    const diff = Number((e - b).toFixed(6));
    const sign = diff >= 0 ? "+" : "";
    const unit = txt(m.unit);
    const rel = b !== 0 && unit !== "%" && unit !== "percentage points" ? ` (${sign}${((diff / b) * 100).toFixed(1)}%)` : "";
    const unitWord = unit === "%" ? " percentage points" : unit ? ` ${unit}` : "";
    return `${txt(m.metric)}: ${b} → ${e} = ${sign}${diff}${unitWord}${rel} · student-reported, not independently verified. Attribution not established.`;
}

export function challengeTagIssues(tags: unknown): ActivityIssue[] {
    const list = Array.isArray(tags) ? tags.map(txt).filter(Boolean) : [];
    if (!list.length) return [{ field: "challenge_tags", message: "Select one or more challenges, or No significant challenges" }];
    if (list.includes(NO_CHALLENGES_TAG) && list.length > 1) {
        return [{ field: "challenge_tags", message: "No significant challenges cannot be selected together with other challenges" }];
    }
    return [];
}

/** Section 2 text shown read-only as the baseline (never re-typed in Section 4). */
export function baselineFromSection2(section2: Record<string, unknown> | null | undefined): string {
    const s = section2 || {};
    const draft = txt(s.baseline_smart_draft);
    const problem = txt(s.problem_statement);
    const who = txt(s.affected_group);
    const count = txt(s.affected_count);
    const base = draft || problem;
    if (!base) return "";
    const tail = who || count ? ` Affected: ${[who, count ? `~${count}` : ""].filter(Boolean).join(", ")}.` : "";
    return `${base}${tail}`;
}

export type Section4SummaryInput = {
    activities: V19Activity[];
    projectSummary?: ProjectReach | null;
    observedChange?: string;
    howWeKnow?: string;
    measure?: SimpleMeasure | null;
    legacyOutcomeCount?: number;
    challenges?: string;
    challengeTags?: string[];
};

export type Section4Summary = {
    majorActivities: number;
    outputRecords: number;
    uniqueLabel: string;
    activitiesText: string;
    reachText: string;
    resultsText: string;
    challengesText: string;
    text: string;
};

export function outputLine(o: V19Output): string {
    const type = isOther(o.type || o.title) ? txt(o.type_other) || "Other output" : txt(o.type || o.title);
    const unit = isOther(o.unit) ? txt(o.unit_other) || "" : txt(o.unit);
    const q = num(o.quantity);
    return `${Number.isFinite(q) ? q.toLocaleString() : txt(o.quantity)} ${unit} (${type})`.replace(/\s+/g, " ").trim();
}

/** Field-generated, no AI: the same wording the detailed report and flashcard reuse. */
export function buildSection4Summary(input: Section4SummaryInput): Section4Summary {
    const acts = input.activities.filter((a) => txt(a.title));
    const outputRecords = acts.reduce((n, a) => n + (Array.isArray(a.outputs) ? a.outputs.filter(outputOk).length : 0), 0);
    const mode = effectiveReachMode(input.projectSummary, input.activities);
    const unique = num(input.projectSummary?.distinct_total_beneficiaries);
    const uniqueLabel = mode === "counted" && unique > 0 ? unique.toLocaleString() : mode === "none" ? "None" : "Unconfirmed";

    const activitiesText = acts.length
        ? acts
              .map((a) => {
                  const outs = Array.isArray(a.outputs) ? a.outputs.filter(outputOk) : [];
                  const delivered = a.no_output === true
                      ? `No countable output declared: ${txt(a.no_output_reason) || "reason not supplied"}`
                      : outs.length
                        ? `Reported outputs: ${outs.map(outputLine).join("; ")}`
                        : "Outputs not yet entered.";
                  return `${txt(a.title)} — ${txt(a.status) || "status pending"}. ${delivered}`;
              })
              .join("\n")
        : "No major activities recorded yet.";

    const reachText =
        mode === "none"
            ? "No direct human beneficiaries were reported."
            : mode === "counted" && unique > 0
              ? `${unique.toLocaleString()} reported as unique beneficiaries. Source: ${txt(input.projectSummary?.counting_method) || "not stated"}.`
              : "A defensible unique beneficiary total has not yet been established. Activity-level engagements and unique people should not be treated as equivalent.";

    const change = txt(input.observedChange);
    const know = txt(input.howWeKnow);
    const measureLine = simpleMeasureChangeLine(input.measure);
    const legacy = input.legacyOutcomeCount || 0;
    const resultsText = [
        change ? change.replace(/[.!?]+$/, "") + "." : "Observed changes have not been described.",
        know ? `Evidence basis: ${know.replace(/[.!?]+$/, "")}.` : "Evidence basis not yet supplied.",
        measureLine || (legacy ? `${legacy} previously recorded quantitative comparison${legacy === 1 ? " was" : "s were"} retained from the earlier report version.` : "No comparable before-and-after measurements were reported."),
    ].join(" ");

    const tags = (input.challengeTags || []).map((t) => t.replace(/^[^\s]+\s/, "")).filter(Boolean);
    const challengesText = txt(input.challenges)
        ? `${tags.length ? `Reported challenges: ${tags.join(", ")}. ` : ""}${txt(input.challenges)}`
        : tags.length
          ? `Reported challenges: ${tags.join(", ")}. Limitations narrative pending.`
          : "Challenges and limitations not yet documented.";

    const text = [
        `Activities and deliverables: ${activitiesText.replace(/\n/g, " ")}`,
        `Community reach: ${reachText}`,
        `Results and evidence: ${resultsText}`,
        `Challenges and limitations: ${challengesText}`,
    ].join("\n");

    return { majorActivities: acts.length, outputRecords, uniqueLabel, activitiesText, reachText, resultsText, challengesText, text };
}
