/** V13 Section 4 ladder helpers — same activity_blocks / measurable_outcomes shape. */

export type LadderUi = {
    open: number;
    allBen?: boolean;
};

export const LADDER_STEPS = [
    { id: 1, label: "Did", hint: "What was this activity?" },
    { id: 2, label: "Delivered", hint: "What can you count?" },
    { id: 3, label: "Who", hint: "Who did it serve, and how many?" },
    { id: 4, label: "Changed", hint: "What number moved?" },
] as const;

export const OVERLAP_CHIPS: { label: string; value: string }[] = [
    { label: "No — different people", value: "Mostly Unique to This Activity" },
    { label: "Yes — a few of them", value: "Partially Overlapping with Other Activities" },
    { label: "Yes — mostly the same people", value: "Mostly the Same Beneficiaries as Another Activity" },
];

export const SURE_OPTIONS = [
    { n: 1, t: "We measured it ourselves — same number before and after", cf: "Directly Measured" },
    { n: 2, t: "A partner, school or official record confirms the before and after numbers", cf: "Partner Confirmed" },
    { n: 3, t: "We estimated it with a clear method — other factors may also have helped", cf: "Estimated" },
    { n: 4, t: "People told us or we observed it — we cannot prove our project caused it", cf: "Observed" },
] as const;

const UNIT_RULES: Array<[RegExp, string]> = [
    [/sessions?|trainings?|workshops?/i, "Sessions"],
    [/kits?/i, "Kits"],
    [/meals?|packages/i, "Packages"],
    [/books?|materials/i, "Items"],
    [/hours?/i, "Volunteer Hours"],
    [/trees?/i, "Items"],
    [/people|students?|participants/i, "Individuals / People"],
    [/events?/i, "Workshops"],
];

export function unitForOutputType(type: string): string {
    for (const [re, unit] of UNIT_RULES) {
        if (re.test(type || "")) return unit;
    }
    return "Items";
}

export function ladderWordCount(text: string): number {
    return String(text || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
}

export function isOtherLike(value: unknown): boolean {
    return /other/i.test(String(value ?? ""));
}

function numOk(raw: unknown): boolean {
    const n = Number(String(raw ?? "").trim());
    return Number.isFinite(n) && n > 0;
}

export function outputRowOk(out: Record<string, unknown> | null | undefined): boolean {
    if (!out) return false;
    const type = String(out.type || "").trim();
    const title = String(out.title || "").trim();
    const label = type || title;
    if (!label) return false;
    if (isOtherLike(type) && !String(out.type_other || title).trim()) return false;
    if (!numOk(out.quantity)) return false;
    const unit = String(out.unit || "").trim();
    if (!unit) return false;
    if (isOtherLike(unit) && !String(out.unit_other || "").trim()) return false;
    return true;
}

export function step1Ok(a: Record<string, unknown>): boolean {
    if (!String(a.title || "").trim() || !a.status || !a.primary_category) return false;
    if (isOtherLike(a.primary_category) && !String(a.other_category_text || "").trim()) return false;
    const sub = String(a.sub_category || "").trim();
    if (a.primary_category && !isOtherLike(a.primary_category) && !sub) return false;
    if (isOtherLike(a.sub_category) && !String(a.other_sub_category_text || "").trim()) return false;
    const w = ladderWordCount(String(a.description || ""));
    return w >= 15 && w <= 200;
}

export function step2Ok(a: Record<string, unknown>): boolean {
    const outs = Array.isArray(a.outputs) ? a.outputs : [];
    return outs.length > 0 && outs.every((row) => outputRowOk(row as Record<string, unknown>));
}

export function step3Ok(a: Record<string, unknown>): boolean {
    const cats = Array.isArray(a.beneficiary_categories) ? a.beneficiary_categories.map(String) : [];
    const geo = String(a.geographic_reach || "").trim();
    if (a.serves_beneficiaries === false) return cats.length > 0 && !!geo;
    const unique = String(a.unique_beneficiaries || a.beneficiaries_reached || "").trim();
    if (!numOk(unique)) return false;
    if (!String(a.overlap_status || "").trim()) return false;
    const uniqueLike = /mostly unique/i.test(String(a.overlap_status || ""));
    if (!uniqueLike && !String(a.overlap_note || "").trim()) return false;
    if (!cats.length) return false;
    if (cats.some((c) => isOtherLike(c)) && !String(a.other_beneficiary_text || "").trim()) return false;
    if (!String(a.reach_counting_method || "").trim()) return false;
    if (isOtherLike(a.reach_counting_method) && !String(a.reach_counting_method_other || "").trim()) return false;
    return !!geo;
}

export function stepNeedText(a: Record<string, unknown>, step: number): string {
    if (step === 1) {
        if (!a.primary_category) return "Choose an activity family.";
        if (!isOtherLike(a.primary_category) && !String(a.sub_category || "").trim()) return "Choose a sub-category.";
        if (isOtherLike(a.primary_category) && !String(a.other_category_text || "").trim()) return "Name your custom family.";
        if (isOtherLike(a.sub_category) && !String(a.other_sub_category_text || "").trim()) return "Describe your custom sub-category.";
        if (!String(a.title || "").trim()) return "Add a title.";
        const w = ladderWordCount(String(a.description || ""));
        if (w < 15) return `Description needs ${15 - w} more word${15 - w === 1 ? "" : "s"}.`;
        if (w > 200) return "Trim the description to 200 words.";
        return "";
    }
    if (step === 2) {
        const outs = Array.isArray(a.outputs) ? a.outputs : [];
        if (!outs.length) return "Add at least one delivered item.";
        return "Each item needs a number above 0 and a unit.";
    }
    if (step === 3) {
        if (a.serves_beneficiaries === false) {
            const cats = Array.isArray(a.beneficiary_categories) ? a.beneficiary_categories : [];
            return cats.length ? "Choose where it happened." : "Tap who or what benefited.";
        }
        if (!numOk(a.unique_beneficiaries || a.beneficiaries_reached)) return "Enter how many different people.";
        if (!String(a.overlap_status || "").trim()) return "Answer the overlap question.";
        if (!/mostly unique/i.test(String(a.overlap_status || "")) && !String(a.overlap_note || "").trim()) {
            return "Say who overlaps.";
        }
        const cats = Array.isArray(a.beneficiary_categories) ? a.beneficiary_categories : [];
        if (!cats.length) return "Tap who they were.";
        if (!String(a.reach_counting_method || "").trim()) return "Choose how you counted.";
        if (!String(a.geographic_reach || "").trim()) return "Choose where it happened.";
        return "";
    }
    return "";
}

export function readLadderOpen(a: Record<string, unknown>): number {
    const ui = a.ladder_ui && typeof a.ladder_ui === "object" ? (a.ladder_ui as LadderUi) : null;
    const n = Number(ui?.open ?? 1);
    return n >= 0 && n <= 4 ? n : 1;
}

export function readLadderAllBen(a: Record<string, unknown>): boolean {
    const ui = a.ladder_ui && typeof a.ladder_ui === "object" ? (a.ladder_ui as LadderUi) : null;
    return Boolean(ui?.allBen);
}

export function stripFamilyEmoji(text: string): string {
    return String(text || "").replace(/^[^\w(]+/, "").trim();
}

export function numValue(raw: unknown): number | null {
    const s = String(raw ?? "").trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}

const SDG_RULES: Array<[number, RegExp]> = [
    [1, /poverty|low-cost|cash|voucher|relief|social protection|vulnerab|homeless|winteri|shelter|zakat|asset support|household survey|street-connected|price \/ access/i],
    [2, /food|nutrition|hunger|meal|feeding|farm|crop|agri|livestock|fodder|kitchen|garden|pantry|infant|seed bank|fisheries|aquaculture/i],
    [3, /health|clinic|medical|screening|mental|counsel|well-being|wellbeing|sport|fitness|rehab|blood|dental|oral|vision|hearing|maternal|medication|psycho|stress|resilience workshop|physio|first aid|play|recreation|hygiene|therapy|substance|patient|immuniz|vaccin|disease|injury|crisis support|survivor|road safety/i],
    [4, /educ|learn|literacy|tutor|teacher|school|training|skill|\bstem\b|language|reading|library|curricul|scholar|workshop|mentor|readiness/i],
    [5, /gender|women|girl|menstrual|maternal|violence|empower|reproductive|dignity|transgender/i],
    [6, /water|wash\b|sanitation|hygiene|handwash|drainage|wastewater|latrine|toilet|rainwater|irrigation/i],
    [7, /energy|solar|lighting|electric|renewable|efficiency|\bfuel|cooking|stove|off-grid|insulation/i],
    [8, /\bjob|employ|entrepreneur|business|livelihood|income|market|financial|saving|cooperative|commerce|career|internship|craft|tourism|\bsme\b|microenterprise|budgeting|labour|decent work|fair trade|enterprise/i],
    [9, /infrastructure|engineering|prototype|innovation|\bapp\b|website|platform|digital|technology|tech\b|data|research|automation|\bai\b|road|transport|design|product|frugal|dashboard|system|mapping|citizen science|measurement|open data|iot|sensing|device/i],
    [10, /disab|inclusi|accessib|refugee|migrant|older|minority|marginal|equal|universal design|assistive|special|rights|identity|reintegration|safe space|street-connected|transgender/i],
    [11, /housing|shelter|public space|community space|urban|heritage|cultural|city|mobility|disaster|waste|clean-up|litter|\bair\b|safety|structural|museum|archive|public art|mural|community design|neighbourhood|resilien|green spaces|green building/i],
    [12, /recycl|circular|waste|food rescue|redistribution|sustainable|consumption|segregation|resource efficien|frugal|procurement|compost|single-use|plastic|fair trade|green jobs/i],
    [13, /climate|carbon|emission|environmental measurement|environmental research|disaster|energy efficien|energy audit|renewable|flood|\bheat\b|clean energy|clean cooking|green/i],
    [14, /ocean|marine|fisher|coast|river|wetland|aquatic|water quality|plastic|\bsea\b|mangrove|beach|water pollution/i],
    [15, /tree|plant|biodivers|habitat|forest|soil|wildlife|ecosystem|conservation|veterinary|animal|restoration|species|\bland\b|mangrove|wetland|greening|seed bank|fodder/i],
    [16, /legal|right|justice|protection|governance|policy|civic|accountab|institution|peace|violence|identity|documentation|prison|anti-corruption|transparency|public service|service delivery|\bsop\b|monitoring|dialogue|consultation|information access|participation|safety|leadership|neighbourhood watch|anti-violence/i],
    [17, /partnership|coalition|network|fundrais|sponsor|donor|mobiliz|grant|crowdfund|philanthrop|\bcsr\b|multi-stakeholder|referral network|pro-bono|in-kind|university–community|giving drive|\bfund\b|multilateral/i],
];

export function sdgSuggest(cat: string, sub: string, subOther = ""): number[] {
    const text = [stripFamilyEmoji(cat), sub, subOther].filter(Boolean).join(" · ");
    let hit = SDG_RULES.filter((r) => r[1].test(sub || subOther || "")).map((r) => r[0]);
    if (!hit.length) hit = SDG_RULES.filter((r) => r[1].test(text)).map((r) => r[0]);
    return [...new Set(hit)].sort((a, b) => a - b);
}

export function matchedProjectSdgs(activity: Record<string, unknown>, projectSdgs: number[]): number[] {
    const sug = sdgSuggest(
        String(activity.primary_category || ""),
        String(activity.sub_category || ""),
        String(activity.other_sub_category_text || ""),
    );
    return projectSdgs.filter((n) => sug.includes(n));
}

export type LadderOutcome = {
    id?: string;
    activity_id?: string | null;
    metric?: string;
    metric_other?: string;
    outcome_area?: string;
    outcome_sub_category?: string;
    metric_category?: string;
    baseline?: string;
    endline?: string;
    unit?: string;
    confidence_level?: string[];
    measurement_explanation?: string;
    sure?: number;
};

export function outcomeDisplayName(o: LadderOutcome | Record<string, unknown>): string {
    const other = String((o as LadderOutcome).metric_other || "").trim();
    const metric = String((o as LadderOutcome).metric || "").trim();
    if (isOtherLike(metric) && other) return other;
    // A bare "Other" is not a metric name — the student still has to type one.
    if (isOtherLike(metric)) return other;
    return other || metric || String((o as LadderOutcome).outcome_area || "").trim();
}

export function outcomeLadderOk(o: LadderOutcome | Record<string, unknown> | null | undefined): boolean {
    if (!o) return false;
    const row = o as LadderOutcome;
    if (!outcomeDisplayName(row)) return false;
    const b = numValue(row.baseline);
    const e = numValue(row.endline);
    if (b === null || e === null || b < 0 || e < 0) return false;
    const sure = Number(row.sure || 0);
    const cf = Array.isArray(row.confidence_level) ? row.confidence_level.filter(Boolean) : [];
    if (!sure && !cf.length) return false;
    // Mirror validateSection5 so step 4 never shows "done" for a report that cannot submit.
    if (!String(row.outcome_area || "").trim()) return false;
    const proofWords = String(row.measurement_explanation || "").trim().split(/\s+/).filter(Boolean).length;
    if (proofWords < 20) return false;
    return true;
}

export function step4Ok(outcomes: Array<LadderOutcome | Record<string, unknown>>): boolean {
    return outcomes.every((row) => outcomeLadderOk(row));
}

export function sureOption(n: number) {
    return SURE_OPTIONS.find((s) => s.n === n) || null;
}

export const FAM_METRIC_HINTS: Record<string, string[]> = {
    "📚 Education & Learning": ["Attendance rate (%)", "Test / quiz score", "Students completing the programme"],
    "🩺 Health & Clinical Outreach": ["Patients treated", "Screenings completed", "Health knowledge score"],
    "🧠 Mental Health & Psychosocial Support": ["Well-being score", "Students completing counselling"],
    "💧 WASH — Water, Sanitation & Hygiene": ["Households with safe water", "Hygiene practice score"],
    "🍲 Food, Nutrition & Food Security": ["Meals with adequate nutrition", "Households food-secure"],
    "🌾 Agriculture, Rural & Animal Support": ["Farmers adopting practice", "Yield / income (PKR)"],
    "🌿 Environment, Climate & Biodiversity": ["Trees surviving", "Waste diverted (kg)"],
    "🏗️ Built Environment, Infrastructure & Engineering": ["Usable classrooms", "Facilities in working condition"],
    "💻 Digital, Data & Technology": ["Users able to complete the task", "Devices in regular use"],
    "🔬 Research, Citizen Science & Evidence": ["Surveys completed", "Datasets published"],
    "💼 Livelihoods, Business & Financial Inclusion": ["Businesses still operating", "People employed"],
    "📦 Humanitarian, Relief & Resource Distribution": ["Households with 2-week supplies", "People reached with relief"],
    "🤝 Community Mobilization & Volunteering": ["Active volunteers", "Community groups formed"],
};

export function metricPickPatch(label: string): Record<string, unknown> {
    const pct = /%|rate|score/i.test(label);
    const custom = /own metric|other/i.test(label);
    return {
        metric: custom ? "Other" : pct ? "Percentage Improvement (%)" : "Number of Individuals",
        metric_other: custom ? "" : label,
        metric_category: custom ? "🔹 Other" : pct ? "🔹 Percentage-Based (Advanced)" : "🔹 People-Based Metrics",
        outcome_area: pct ? "4. Knowledge / Skills Improvement" : "1. Access Improvement",
        outcome_sub_category: pct ? "Awareness Sessions" : "Access to Education",
        unit: pct ? "%" : "Individuals / People",
    };
}

export function isBlankUnattachedOutcome(o: LadderOutcome | Record<string, unknown> | null | undefined): boolean {
    if (!o) return false;
    const row = o as LadderOutcome;
    if (row.activity_id) return false;
    if (outcomeDisplayName(row)) return false;
    if (String(row.baseline || "").trim() || String(row.endline || "").trim()) return false;
    return true;
}

export const FAM_OUTPUT_HINTS: Record<string, string[]> = {
    "📚 Education & Learning": ["Sessions Conducted", "Trainings Delivered", "Books / Learning Materials"],
    "🩺 Health & Clinical Outreach": ["Sessions Conducted", "Kits Distributed", "Services Delivered"],
    "🧠 Mental Health & Psychosocial Support": ["Sessions Conducted", "Trainings Delivered"],
    "💧 WASH — Water, Sanitation & Hygiene": ["Facilities Improved", "Kits Distributed", "Sessions Conducted"],
    "🍲 Food, Nutrition & Food Security": ["Meals / Food Packages", "Kits Distributed"],
    "🌾 Agriculture, Rural & Animal Support": ["Trainings Delivered", "Resources Distributed"],
    "🌿 Environment, Climate & Biodiversity": ["Trees Planted", "Area Covered / Cleaned / Restored", "Waste Collected / Diverted"],
    "🏗️ Built Environment, Infrastructure & Engineering": ["Rooms / Classrooms Improved", "Facilities Improved"],
    "💻 Digital, Data & Technology": ["Devices Distributed", "Systems / Tools Developed"],
    "🔬 Research, Citizen Science & Evidence": ["Reports / Surveys / Assessments Generated"],
    "💼 Livelihoods, Business & Financial Inclusion": ["Trainings Delivered", "Businesses Supported"],
    "📦 Humanitarian, Relief & Resource Distribution": ["Kits Distributed", "Resources Distributed"],
    "🤝 Community Mobilization & Volunteering": ["Sessions Conducted", "Volunteers Engaged"],
};

export const FAM_BEN_HINTS: Record<string, string[]> = {
    "📚 Education & Learning": ["Students", "Children", "Youth", "Teachers / Educators"],
    "🩺 Health & Clinical Outreach": ["Patients / Health-Service Users", "Children", "Women", "Low-Income Households"],
    "🧠 Mental Health & Psychosocial Support": ["Students", "Youth", "Women"],
    "💧 WASH — Water, Sanitation & Hygiene": ["Low-Income Households", "Children", "Women", "Students"],
    "🍲 Food, Nutrition & Food Security": ["Low-Income Households", "Children", "General Community"],
    "🌿 Environment, Climate & Biodiversity": ["General Community", "Youth", "Students"],
    "💼 Livelihoods, Business & Financial Inclusion": ["Youth", "Women", "Entrepreneurs / Small Business Owners"],
    "📦 Humanitarian, Relief & Resource Distribution": ["Low-Income Households", "Children", "Women", "Refugees / Displaced Populations"],
};
