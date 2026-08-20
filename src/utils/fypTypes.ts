// Shared types + summary composition for the FYP / Thesis wizard, flash card, and admin views.
// Mirrors ciel_backend/src/paths/entities/fyp-entry.entity.ts

export interface FypTeamMember {
    name: string;
    email?: string;
    role?: string;
}
export interface FypProjectInfo {
    title?: string;
    school?: string;
    degree?: string;
    graduationYear?: string;
    /** Drives the adaptive-vocabulary "route" (scholar/maker/builder/storyteller/consultant). */
    projectType?: string;
    studentName?: string;
    studentEmail?: string;
    rollNumber?: string;
    /** HEC allows splitting the FYP across the final year — which semester(s) it spans. */
    span?: string;
    /** Typically 6 under HEC policy. */
    creditHours?: string;
    /** Older entries may hold plain name strings — read via normalizeFypTeamMembers. */
    teamMembers?: (string | FypTeamMember)[];
    supervisorName?: string;
    supervisorEmail?: string;
    coSupervisorName?: string;
    coSupervisorEmail?: string;
}
export interface FypBackgroundInfo { problem?: string; whyUrgent?: string[]; whyUrgentOther?: string; audience?: string[]; audienceOther?: string; }
export interface FypObjectivesInfo {
    aim?: string;
    objectives?: string[];
    /** What was deliberately excluded — optional but strengthens the record. */
    scope?: string;
}
export interface FypLiteratureInfo { sourcesReviewed?: string; sourceTypes?: string[]; sourceTypesOther?: string; gap?: string; }
export interface FypMethodologyInfo {
    approaches?: string[];
    methods?: string[];
    methodsOther?: string;
    sampleScale?: string;
    tools?: string;
    /** Month strings ("YYYY-MM"). */
    periodFrom?: string;
    periodTo?: string;
}
export interface FypFindingsInfo {
    findings?: string[];
    measurableImpact?: string;
    limitationType?: string;
    limitationDetail?: string;
    evidenceStatus?: string;
    metricName?: string;
    metricValue?: string;
    metricUnit?: string;
    numberRepresents?: string;
}
export interface FypRouteDetails {
    showMonth?: string;
    piecesShown?: number;
    juryExaminer?: string;
    buildStatus?: string;
    testersCount?: number;
    iterationsCount?: number;
    screeningMonth?: string;
    audienceReached?: number;
    runtimeFormat?: string;
    clientOrg?: string;
    engagementBasis?: string;
    recommendationStatus?: string;
    // scholar route — discussion & conclusion (the HEC thesis chain's closing step)
    discussion?: string;
    conclusion?: string;
}
export interface FypSdgEntry { goalNumber: number; targets: string[]; how?: string; }
export interface FypSdgMapping { entries?: FypSdgEntry[]; noSdgApplies?: boolean; }
export interface FypReflectionInfo { biggestLesson?: string; hardestMoment?: string; wrongAssumption?: string; sustainabilityShift?: string; skills?: string[]; whatsNext?: string; adviceForNext?: string; }
export interface FypRepositoryInfo { externalLinks?: string; visibility?: string; }
export interface FypSectionSummaries { project?: string; background?: string; objectives?: string; literature?: string; methodology?: string; findings?: string; sdg?: string; reflection?: string; }
export interface FypDeliverable { version: number; label: string; fileUrl: string; uploadedAt: string; }

export interface FypEntry {
    id?: string;
    projectTitle: string | null;
    projectInfo: FypProjectInfo | null;
    background: FypBackgroundInfo | null;
    objectivesInfo: FypObjectivesInfo | null;
    literature: FypLiteratureInfo | null;
    methodology: FypMethodologyInfo | null;
    findings: FypFindingsInfo | null;
    routeDetails: FypRouteDetails | null;
    sdgMapping: FypSdgMapping | null;
    reflectionInfo: FypReflectionInfo | null;
    repository: FypRepositoryInfo | null;
    sectionSummaries: FypSectionSummaries | null;
    addedNote: string | null;
    deliverables: FypDeliverable[];
    stepCompleted: number;
    status: "draft" | "submitted";
    /** False when this entry is showing because the viewer was named as a co-author on someone else's
     * submitted record, not because they own it — gates edit/delete access on the frontend. */
    isOwner?: boolean;
}

export const EMPTY_FYP: FypEntry = {
    projectTitle: "",
    projectInfo: {},
    background: {},
    objectivesInfo: {},
    literature: {},
    methodology: {},
    findings: {},
    routeDetails: {},
    sdgMapping: { entries: [], noSdgApplies: false },
    reflectionInfo: {},
    repository: {},
    sectionSummaries: {},
    addedNote: "",
    deliverables: [],
    stepCompleted: 0,
    status: "draft",
};

export function mergeFypEntry(base: FypEntry, data: Partial<FypEntry>): FypEntry {
    return {
        ...base,
        ...data,
        projectInfo: { ...base.projectInfo, ...data.projectInfo },
        background: { ...base.background, ...data.background },
        objectivesInfo: { ...base.objectivesInfo, ...data.objectivesInfo },
        literature: { ...base.literature, ...data.literature },
        methodology: { ...base.methodology, ...data.methodology },
        findings: { ...base.findings, ...data.findings },
        routeDetails: { ...base.routeDetails, ...data.routeDetails },
        sdgMapping: { ...base.sdgMapping, ...data.sdgMapping },
        reflectionInfo: { ...base.reflectionInfo, ...data.reflectionInfo },
        repository: { ...base.repository, ...data.repository },
        sectionSummaries: { ...base.sectionSummaries, ...data.sectionSummaries },
        deliverables: data.deliverables ?? base.deliverables,
    };
}

/** Handles both the legacy string[] shape and the current {name, email, role}[] shape. */
export function normalizeFypTeamMembers(raw: (string | FypTeamMember)[] | undefined): FypTeamMember[] {
    return (raw ?? []).map((m) => (typeof m === "string" ? { name: m } : m));
}

function fmtMonth(x?: string): string {
    if (!x) return "";
    const [y, m] = x.split("-");
    if (!y || !m) return x;
    return new Date(Number(y), Number(m) - 1).toLocaleString("en", { month: "short" }) + " " + y;
}
function fmtRange(a?: string, b?: string): string {
    if (a && b) return a === b ? fmtMonth(a) : `${fmtMonth(a)} – ${fmtMonth(b)}`;
    return a ? fmtMonth(a) : "";
}
/** Route-specific extras (degree show / build status / screening / client engagement) only make
 * sense to mention for the matching route — otherwise leftover fields from a route the student
 * switched away from would show up in the summary. */
function routeDetailsClause(pi: FypProjectInfo, rd: FypRouteDetails): string {
    const route = fypRouteFor(pi.projectType);
    if (route === "scholar" && (rd.discussion || rd.conclusion)) {
        return `${rd.discussion ? ` ${lc(rd.discussion)}.` : ""}${rd.conclusion ? ` Conclusion: ${lc(rd.conclusion)}.` : ""}`;
    }
    if (route === "maker" && (rd.showMonth || rd.piecesShown || rd.juryExaminer)) {
        return ` Degree show: ${rd.piecesShown ? `${rd.piecesShown} works shown` : "shown"}${rd.showMonth ? ` · ${fmtMonth(rd.showMonth)}` : ""}${rd.juryExaminer ? ` · examined by ${rd.juryExaminer}` : ""}.`;
    }
    if (route === "builder" && (rd.buildStatus || rd.testersCount || rd.iterationsCount)) {
        return ` Build status: ${rd.buildStatus || "in progress"}${rd.testersCount ? ` · tested by ${rd.testersCount} people` : ""}${rd.iterationsCount ? ` · ${rd.iterationsCount} iterations` : ""}.`;
    }
    if (route === "storyteller" && (rd.screeningMonth || rd.audienceReached || rd.runtimeFormat)) {
        return ` ${rd.runtimeFormat || "Production"}${rd.screeningMonth ? ` · released ${fmtMonth(rd.screeningMonth)}` : ""}${rd.audienceReached ? ` · reached ${rd.audienceReached} viewers` : ""}.`;
    }
    if (route === "consultant" && (rd.clientOrg || rd.engagementBasis || rd.recommendationStatus)) {
        return ` Client engagement: ${rd.clientOrg || "—"}${rd.engagementBasis ? ` · ${rd.engagementBasis.toLowerCase()}` : ""}${rd.recommendationStatus ? ` · ${rd.recommendationStatus.toLowerCase()}` : ""}.`;
    }
    return "";
}

function lc(s: string) {
    const t = (s || "").trim();
    return t ? t.replace(/\.$/, "").charAt(0).toLowerCase() + t.replace(/\.$/, "").slice(1) : "";
}
function joinList(a: string[]) {
    return a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
}
export function stripEmoji(s: string) {
    return (s || "").replace(/^[^\s]+\s/, "");
}

// ---------------------------------------------------------------------------
// Adaptive vocabulary — one form, five research "routes"
// ---------------------------------------------------------------------------

export type FypRoute = "scholar" | "maker" | "builder" | "storyteller" | "consultant";

export interface FypRouteMode {
    name: string;
    note: string;
    probL: string;
    aimL: string;
    aimPh: string;
    objsL: string;
    fndL: string;
    fndListL: string;
    litL: string;
    blk: "discussion" | "studio" | "build" | "media" | "client" | null;
}

export const FYP_MODES: Record<FypRoute, FypRouteMode> = {
    scholar: {
        name: "SCHOLAR ROUTE",
        note: "📜 Scholar route — the HEC thesis chain: aims & objectives, literature review, methodology, findings, discussion & conclusion.",
        probL: "What gap, question or debate does it address?",
        aimL: "The overall aim",
        aimPh: "e.g. Develop and test food-waste dyes that small units can afford",
        objsL: "Research questions",
        fndL: "Key findings / conclusions",
        fndListL: "Findings",
        litL: "Literature foundation",
        blk: "discussion",
    },
    maker: {
        name: "MAKER ROUTE",
        note: "🎨 Maker route. This form now speaks studio: intention, influences, process, the work — and your degree show gets its own space. The documented work IS valid evidence.",
        probL: "What idea, tension or brief drives the work?",
        aimL: "Your design intention",
        aimPh: "e.g. A collection that makes zero-waste construction wearable, not worthy",
        objsL: "Explorations / design questions",
        fndL: "What the work demonstrates",
        fndListL: "What it demonstrates",
        litL: "Influences & context — precedents, craft, theory",
        blk: "studio",
    },
    builder: {
        name: "BUILDER ROUTE",
        note: "🖥️ Builder route. Problem → requirements → build → test → proof. Heading to market? Mark it in Reflection and CIEL can link an Enterprise Path record later.",
        probL: "What problem does the system solve — for whom?",
        aimL: "The problem you set out to solve",
        aimPh: "e.g. Students have no central system for finding verified community projects",
        objsL: "Requirements / success criteria",
        fndL: "What the build proved",
        fndListL: "What it proved",
        litL: "Technical context — existing systems reviewed",
        blk: "build",
    },
    storyteller: {
        name: "STORYTELLER ROUTE",
        note: "🎬 Storyteller route. Concept, research, production, audience, message — with screening details and the production itself as evidence.",
        probL: "What story, issue or experience does it explore?",
        aimL: "Your creative intention",
        aimPh: "e.g. Make invisible sanitation workers visible to the city they clean",
        objsL: "Narrative / experience goals",
        fndL: "What it says — and how audiences responded",
        fndListL: "Reception & message",
        litL: "References & pre-production research",
        blk: "media",
    },
    consultant: {
        name: "CONSULTANT ROUTE",
        note: "📊 Consultant route. Client problem, analysis, recommendation, validation, handoff — with the client engagement on record.",
        probL: "What business problem or opportunity was addressed?",
        aimL: "The engagement objective",
        aimPh: "e.g. Cut the client's packaging cost without raising waste",
        objsL: "Analysis questions",
        fndL: "Key recommendations / conclusions",
        fndListL: "Recommendations",
        litL: "Data sources & frameworks used",
        blk: "client",
    },
};

export const PROJECT_TYPE_OPTIONS = [
    "📜 Thesis / dissertation",
    "🔬 Empirical research study",
    "⚖️ Law dissertation / case-law study",
    "🧑‍🏫 Action research / teaching practicum",
    "🧵 Degree-show collection",
    "🎨 Design project (brief-based)",
    "🏗️ Architecture / built design",
    "🏭 Engineering capstone (design-build-test)",
    "🖥️ Software / engineering build",
    "🎬 Film / media production",
    "🎭 Performance / curation",
    "📊 Industry / consulting project",
];

const PROJECT_TYPE_ROUTE: Record<string, FypRoute> = {
    "📜 Thesis / dissertation": "scholar",
    "🔬 Empirical research study": "scholar",
    "⚖️ Law dissertation / case-law study": "scholar",
    "🧑‍🏫 Action research / teaching practicum": "scholar",
    "🧵 Degree-show collection": "maker",
    "🎨 Design project (brief-based)": "maker",
    "🏗️ Architecture / built design": "maker",
    "🎭 Performance / curation": "maker",
    "🏭 Engineering capstone (design-build-test)": "builder",
    "🖥️ Software / engineering build": "builder",
    "🎬 Film / media production": "storyteller",
    "📊 Industry / consulting project": "consultant",
};

export function fypRouteFor(projectType?: string): FypRoute {
    return PROJECT_TYPE_ROUTE[projectType || ""] || "scholar";
}

// ---------------------------------------------------------------------------
// Evidence ladder — mirrors Course Project's resultsInfo.evidenceStatus
// ---------------------------------------------------------------------------

export const FYP_EVIDENCE_STATUS: { emoji: string; label: string; color: string; bg: string }[] = [
    { emoji: "🔬", label: "Measured / tested result", color: "#16a34a", bg: "#e8f8ee" },
    { emoji: "📝", label: "Qualitative evidence", color: "#0f766e", bg: "#e0f3f1" },
    { emoji: "🖼️", label: "The work itself is the evidence", color: "#7c3aed", bg: "#f1eafe" },
    { emoji: "📈", label: "Estimated / projected", color: "#2563eb", bg: "#e8effe" },
    { emoji: "💡", label: "Conceptual / proposed", color: "#c98a04", bg: "#fdf3dd" },
    { emoji: "⏳", label: "Not measured yet", color: "#7a8095", bg: "#f1f2f7" },
    { emoji: "➖", label: "Not applicable", color: "#7a8095", bg: "#f1f2f7" },
];

// ---------------------------------------------------------------------------
// Deterministic SDG suggester — keyword match against the student's own free text,
// same rule-based spirit as the Merit Model (no AI call, always explainable).
// ---------------------------------------------------------------------------

const SDG_KEYWORDS: [number, string[]][] = [
    [12, ["waste", "recycl", "material", "reuse", "upcycl", "dye", "circular", "packag", "consum"]],
    [13, ["climate", "emission", "carbon", "cooling", "heat", "flood"]],
    [6, ["water", "sanitat", "dye-bath", "effluent"]],
    [7, ["energy", "solar", "electric", "kwh", "passive"]],
    [4, ["educat", "school", "learn", "literacy", "student", "teach"]],
    [3, ["health", "patient", "anxiety", "mental", "clinic", "wellbeing", "sleep"]],
    [5, ["women", "girl", "gender"]],
    [8, ["artisan", "livelihood", "income", "job", "craft", "employ", "earn"]],
    [10, ["inequal", "disab", "inclus", "deaf", "accessib", "marginal", "refugee"]],
    [11, ["city", "urban", "housing", "heritage", "building", "public space"]],
    [2, ["food", "agri", "farm", "crop", "nutrition"]],
    [15, ["forest", "tree", "biodivers", "wildlife", "soil", "habitat"]],
    [14, ["marine", "river", "sea", "ocean"]],
    [16, ["justice", "rights", "governance"]],
    [9, ["manufactur", "industr", "infrastructur"]],
];

export interface FypSdgSuggestion {
    goalNumber: number;
    matchedKeywords: string[];
}

/** Scans the student's own problem/aim/findings text for SDG-relevant keywords — suggestions only,
 * the student still picks; "no SDG applies" stays a fully respected answer either way. */
export function suggestFypSdgs(text: string): FypSdgSuggestion[] {
    const t = (text || "").toLowerCase();
    return SDG_KEYWORDS.map(([goalNumber, keywords]) => ({
        goalNumber,
        matchedKeywords: keywords.filter((k) => t.includes(k)),
    }))
        .filter((x) => x.matchedKeywords.length > 0)
        .sort((a, b) => b.matchedKeywords.length - a.matchedKeywords.length)
        .slice(0, 3);
}

/** Deliverables always append a new version rather than replace — group by label so re-uploads
 * show as "current" + a collapsed history instead of a flat, confusing list of every version. */
export function groupFypDeliverablesByLabel(deliverables: FypDeliverable[]) {
    const byLabel = new Map<string, FypDeliverable[]>();
    for (const d of deliverables) {
        const list = byLabel.get(d.label) ?? [];
        list.push(d);
        byLabel.set(d.label, list);
    }
    return Array.from(byLabel.entries()).map(([label, versions]) => {
        const sorted = [...versions].sort((a, b) => b.version - a.version);
        return { label, latest: sorted[0], earlier: sorted.slice(1) };
    });
}

export const FYP_SECTION_LABELS: Record<keyof FypSectionSummaries, { emoji: string; label: string }> = {
    project: { emoji: "📌", label: "Project" },
    background: { emoji: "🧩", label: "Background" },
    objectives: { emoji: "🎯", label: "Objectives" },
    literature: { emoji: "📚", label: "Literature" },
    methodology: { emoji: "🔬", label: "Methodology" },
    findings: { emoji: "📈", label: "Findings" },
    sdg: { emoji: "🌍", label: "SDG links" },
    reflection: { emoji: "🪞", label: "Reflection" },
};
export const FYP_SECTION_KEYS: (keyof FypSectionSummaries)[] = ["project", "background", "objectives", "literature", "methodology", "findings", "sdg", "reflection"];

/** Composed from the student's own answers — not a generic template. Shared by the wizard's review step and the flash card. */
export function composeFypSummaries(entry: FypEntry): FypSectionSummaries {
    const pi = entry.projectInfo || {};
    const bg = entry.background || {};
    const oi = entry.objectivesInfo || {};
    const lit = entry.literature || {};
    const meth = entry.methodology || {};
    const find = entry.findings || {};
    const sm = entry.sdgMapping || {};
    const rf = entry.reflectionInfo || {};

    const s: FypSectionSummaries = {};

    s.project = pi.title
        ? `${pi.title}${pi.degree ? ` — a ${pi.degree} thesis in ${pi.school || "its field"}${pi.graduationYear ? `, Class of ${pi.graduationYear}` : ""}` : ""}${pi.supervisorName ? `, supervised by ${pi.supervisorName}` : ""}.`
        : "";

    const why = [...(bg.whyUrgent || []), ...(bg.whyUrgentOther ? [bg.whyUrgentOther] : [])].map((x) => stripEmoji(x).toLowerCase());
    const aud = [...(bg.audience || []), ...(bg.audienceOther ? [bg.audienceOther] : [])].map((x) => stripEmoji(x).toLowerCase());
    s.background = bg.problem
        ? `It addresses the problem that ${lc(bg.problem)}${why.length ? `, urgent because ${joinList(why)}` : ""}${aud.length ? `, primarily benefiting ${joinList(aud)}` : ""}.`
        : "";

    const objs = (oi.objectives || []).filter(Boolean);
    s.objectives = oi.aim
        ? `Aim: ${lc(oi.aim)}.${objs.length ? ` Set out to ${objs.map((o, i) => `(${i + 1}) ${lc(o)}`).join("; ")}.` : ""}${oi.scope ? ` Deliberately out of scope: ${lc(oi.scope)}.` : ""}`
        : objs.length
          ? `The study set out to ${objs.map((o, i) => `(${i + 1}) ${lc(o)}`).join("; ")}.`
          : "";

    const lits = [...(lit.sourceTypes || []), ...(lit.sourceTypesOther ? [lit.sourceTypesOther] : [])].map((x) => stripEmoji(x).toLowerCase());
    s.literature = lit.gap
        ? `A review of ${lit.sourcesReviewed ? `${lit.sourcesReviewed} sources` : "the literature"}${lits.length ? ` (${joinList(lits)})` : ""} identified a gap: ${lc(lit.gap)}.`
        : "";

    const apps = (meth.approaches || []).map((x) => stripEmoji(x).toLowerCase());
    const meths = [...(meth.methods || []), ...(meth.methodsOther ? [meth.methodsOther] : [])].map((x) => stripEmoji(x).toLowerCase());
    const periodText = meth.periodFrom || meth.periodTo ? ` Conducted ${fmtRange(meth.periodFrom, meth.periodTo)}.` : "";
    s.methodology = apps.length || meths.length || periodText
        ? `${apps.length || meths.length ? `A ${joinList(apps) || "systematic"} approach was used${meths.length ? `, combining ${joinList(meths)}` : ""}${meth.sampleScale ? ` (${meth.sampleScale})` : ""}${meth.tools ? `, with ${meth.tools}` : ""}.` : ""}${periodText}`
        : "";

    const finds = (find.findings || []).filter(Boolean);
    const metricText = find.metricValue ? ` ${find.metricName || "Metric"}: ${find.metricValue}${find.metricUnit || ""}${find.numberRepresents ? ` (${find.numberRepresents.toLowerCase()})` : ""}.` : "";
    s.findings = finds.length
        ? `Key findings: ${finds.map((f, i) => `(${i + 1}) ${lc(f)}`).join("; ")}.${find.evidenceStatus ? ` Evidence: ${find.evidenceStatus.toLowerCase()}.` : ""}${metricText}${find.measurableImpact ? ` Measured impact: ${lc(find.measurableImpact)}.` : ""}${find.limitationType ? ` Main limitation, honestly noted: ${find.limitationType.toLowerCase()}${find.limitationDetail ? ` — ${lc(find.limitationDetail)}` : ""}.` : ""}${routeDetailsClause(pi, entry.routeDetails || {})}`
        : "";

    const entries = sm.entries || [];
    s.sdg = sm.noSdgApplies
        ? "The author assessed no direct SDG linkage; flagged for CIEL review."
        : entries.length
          ? `The work supports ${entries.map((en) => `SDG ${en.goalNumber}${en.targets.length ? ` (target ${en.targets.join(", ")})` : ""}${en.how ? ` — ${lc(en.how)}` : ""}`).join("; ")}.`
          : "";

    const sk = (rf.skills || []).map((x) => stripEmoji(x).toLowerCase());
    s.reflection = rf.biggestLesson
        ? `Reflecting, the author's foremost lesson: ${lc(rf.biggestLesson)}.${rf.wrongAssumption ? ` A key assumption proved wrong: ${lc(rf.wrongAssumption)}.` : ""}${rf.sustainabilityShift ? ` On sustainability: ${lc(rf.sustainabilityShift)}.` : ""}${sk.length ? ` Skills grown: ${joinList(sk)}.` : ""}${rf.whatsNext ? ` Next: ${rf.whatsNext.toLowerCase()}.` : ""}`
        : "";

    return s;
}
