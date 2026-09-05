// Shared types + summary composition for the Course Project coursework wizard, flash card, and decks.
// Mirrors ciel_backend/src/paths/entities/course-project-entry.entity.ts

export interface CourseProjectGroupMember {
    name: string;
    email?: string;
    rollNumber?: string;
    /** Server-computed — 'accepted' only once this teammate clicked their emailed invite link. */
    inviteStatus?: "pending" | "accepted";
}
export interface CourseProjectStudentInfo {
    studentName?: string;
    rollNumber?: string;
    studentEmail?: string;
    universityName?: string;
    disciplineName?: string;
    department?: string;
    programme?: string;
    courseCode?: string;
    semester?: string;
    teamMode?: string;
    /** Older entries may still hold plain name strings from before email capture was added — read via normalizeGroupMembers. */
    groupMembers?: (string | CourseProjectGroupMember)[];
    /** Tap all that apply — students can mix e.g. "Semester project" + "Research task". */
    courseworkTypes?: string[];
    courseworkTypeOther?: string;
    /** @deprecated pre-multi-select shape — still read for entries submitted before this was a tap-all field. */
    courseworkType?: string;
    teacherName?: string;
    teacherEmail?: string;
    notes?: string;
}

/** Handles both the legacy string[] shape and the current {name, email}[] shape. */
export function normalizeGroupMembers(raw: (string | CourseProjectGroupMember)[] | undefined): CourseProjectGroupMember[] {
    return (raw ?? []).map((m) => (typeof m === "string" ? { name: m } : m));
}
export interface CourseProjectAssignmentInfo {
    format?: string;
    formatOther?: string;
    formats?: string[];
    /** Explicit student override of which pathway leads, when picked formats span more than one — unset means "first pick leads". */
    leadRoute?: string;
    whatAsked?: string;
    realWorldIssue?: string;
    notes?: string;
}
export interface CourseProjectAimsInfo {
    aimStatement?: string;
    objectives?: string[];
    beneficiaries?: string[];
    beneficiariesOther?: string;
    notes?: string;
}
export interface CourseProjectProcessInfo {
    activities?: string[];
    activitiesOther?: string;
    methods?: string[];
    methodsOther?: string;
    sampleScale?: string;
    stakeholders?: string[];
    stakeholdersOther?: string;
    notes?: string;
}
/** One measured/estimated result inside resultsInfo.metrics — up to 5 per entry. */
export interface CourseProjectMetric {
    id: string;
    name?: string;
    type?: string;
    typeOther?: string;
    value?: string;
    unit?: string;
    unitOther?: string;
    /** "Actual — measured" | "Target — intended future result" | "Estimated / projected" | "Proposed — not yet tested" */
    status?: string;
    meaning?: string;
    sample?: string;
    periodFrom?: string;
    periodTo?: string;
    source?: string;
    sourceOther?: string;
    character?: string;
    verifier?: string;
    verifierOther?: string;
    comparedBeforeAfter?: boolean;
    baseline?: string;
    evidenceAttached?: boolean;
}
export interface CourseProjectResultsInfo {
    outputs?: string[];
    outputsOther?: string;
    outputDescription?: string;
    findings?: string[];
    /** "Did you measure a result?" — Yes / Partly / No (findings-only) / Not yet. Drives whether `metrics` is shown at all. */
    measured?: string;
    /** Up to 5 structured results — replaces the older single evidenceStatus/metricName/metricValue/metricUnit/numberRepresents fields below. */
    metrics?: CourseProjectMetric[];
    measurableImpact?: string;
    limitationType?: string;
    limitationOther?: string;
    limitationDetail?: string;
    /** "How should this limitation be considered when reading your results?" */
    limitationInterpretation?: string;
    /** Up to 3 optional next-step recommendations. */
    recommendations?: string[];
    /** 2-3 sentence summary of the most important result. */
    resultsSummary?: string;
    notes?: string;
    /** @deprecated pre-multi-metric shape — still read for entries submitted before this system existed. */
    evidenceStatus?: string;
    /** @deprecated see evidenceStatus */
    metricName?: string;
    /** @deprecated see evidenceStatus */
    metricValue?: string;
    /** @deprecated see evidenceStatus */
    metricUnit?: string;
    /** @deprecated see evidenceStatus */
    numberRepresents?: string;
}
export interface CourseProjectSdgEntry {
    goalNumber: number;
    targets: string[];
    how?: string;
    strength?: string;
}
export interface CourseProjectSdgMapping {
    origin?: string;
    /** Honestly declared "no genuine SDG link" — flagged for teacher confirmation rather than force-mapped; the record still counts fully. */
    notApplicable?: boolean;
    entries?: CourseProjectSdgEntry[];
    notes?: string;
}
export interface CourseProjectReflectionInfo {
    lessonLearned?: string;
    sdgLinkHonesty?: string;
    integrationLevel?: string;
    skills?: string[];
    skillsOther?: string;
    nextSteps?: string;
    nextStepsOther?: string;
    whatsNext?: string;
    adviceNextSemester?: string;
    notes?: string;
}
export interface CourseProjectModuleInclusion {
    aim?: boolean;
    act?: boolean;
    meth?: boolean;
    find?: boolean;
    /** @deprecated the wizard's tile is "Results / evidence" (key `res`), not "Impact" — kept for older entries. */
    imp?: boolean;
    res?: boolean;
    lim?: boolean;
}
export interface CourseProjectSectionSummaries {
    course?: string;
    assignment?: string;
    aims?: string;
    process?: string;
    results?: string;
    sdg?: string;
    reflection?: string;
}

export interface CourseProjectEntry {
    id?: string;
    userId?: string;
    course: string | null;
    projectTitle: string | null;
    projectDescription: string | null;
    sdgs: number[] | null;
    /** The primary uploaded assignment file (essay/deck/design file/code link) — distinct from evidenceUrls' supporting files. Drives half the Verifiability score. */
    assignmentFileUrl?: string | null;
    evidenceUrls: string[] | null;
    /** What the uploaded files include (report, slides, poster, photos, etc.) — student-declared, shown alongside the upload boxes at review. */
    evidenceTypes?: string[] | null;
    studentInfo: CourseProjectStudentInfo | null;
    assignmentInfo: CourseProjectAssignmentInfo | null;
    aimsInfo: CourseProjectAimsInfo | null;
    processInfo: CourseProjectProcessInfo | null;
    resultsInfo: CourseProjectResultsInfo | null;
    sdgMapping: CourseProjectSdgMapping | null;
    reflectionInfo: CourseProjectReflectionInfo | null;
    moduleInclusion: CourseProjectModuleInclusion | null;
    sectionSummaries: CourseProjectSectionSummaries | null;
    addedNote: string | null;
    stepCompleted: number;
    status: "draft" | "submitted";
    /** Faculty review gate — only "approved" entries count toward Merit Model rankings/AI picks/showcase, mirroring FYP's eligibility gate. Unset/"pending" once submitted, until the named instructor reviews it. */
    facultyApprovalStatus?: "pending" | "approved" | "rejected" | "revision_requested" | null;
    facultyApprovalNote?: string | null;
    facultyApprovalAt?: string | null;
    /** Pinned by the analyzer after a ranked run — shown on My Impact Wall. badgeLevel is a rank-percentile
     * tier; previousRank is this card's rank the last time it was ranked (null/undefined = first run). */
    meritRibbon?: {
        rank: number;
        of: number;
        scope: string;
        total?: number;
        badgeLevel?: "Gold" | "Silver" | "Bronze" | "Participant";
        previousRank?: number | null;
        at: string;
    } | null;
    /** Unique public key for the badge's QR/share verify link — see /coursework/verify/[key]. */
    verificationPublicSlug?: string | null;
    createdAt?: string;
    updatedAt?: string;
    /** False when this entry is showing because the viewer was named as a group member on someone else's
     * report. Teammates can view and edit the same record; only the owner can delete it. */
    isOwner?: boolean;
}

export const EMPTY_COURSE_PROJECT: CourseProjectEntry = {
    course: "",
    projectTitle: "",
    projectDescription: "",
    sdgs: [],
    assignmentFileUrl: null,
    evidenceUrls: [],
    evidenceTypes: [],
    studentInfo: {},
    assignmentInfo: {},
    aimsInfo: {},
    processInfo: {},
    resultsInfo: {},
    sdgMapping: {},
    reflectionInfo: {},
    moduleInclusion: { aim: true, act: true, meth: true, find: true, res: true, lim: true },
    sectionSummaries: {},
    addedNote: "",
    stepCompleted: 0,
    status: "draft",
    facultyApprovalStatus: null,
    facultyApprovalNote: null,
    facultyApprovalAt: null,
};

export function mergeCourseProjectEntry(base: CourseProjectEntry, data: Partial<CourseProjectEntry>): CourseProjectEntry {
    return {
        ...base,
        ...data,
        studentInfo: { ...base.studentInfo, ...data.studentInfo },
        assignmentInfo: { ...base.assignmentInfo, ...data.assignmentInfo },
        aimsInfo: { ...base.aimsInfo, ...data.aimsInfo },
        processInfo: { ...base.processInfo, ...data.processInfo },
        resultsInfo: { ...base.resultsInfo, ...data.resultsInfo },
        sdgMapping: { ...base.sdgMapping, ...data.sdgMapping },
        reflectionInfo: { ...base.reflectionInfo, ...data.reflectionInfo },
        moduleInclusion: { ...base.moduleInclusion, ...data.moduleInclusion },
        sectionSummaries: { ...base.sectionSummaries, ...data.sectionSummaries },
        evidenceUrls: data.evidenceUrls ?? base.evidenceUrls,
        evidenceTypes: data.evidenceTypes ?? base.evidenceTypes,
    };
}

function lc(s: string) {
    const t = (s || "").trim();
    return t ? t.replace(/\.$/, "").charAt(0).toLowerCase() + t.replace(/\.$/, "").slice(1) : "";
}
function cap(s: string) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
function article(s: string) {
    return /^[aeiou]/i.test(s) ? "an" : "a";
}
/** Strips a trailing period without altering case — for quoting/echoing the student's own free
 * text verbatim, where lc()'s forced lowercase would be wrong. */
function stripPeriod(s: string) {
    return (s || "").trim().replace(/\.$/, "");
}
function joinList(a: string[]) {
    return a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
}
export function stripEmoji(s: string) {
    return (s || "").replace(/^[^\s]+\s/, "");
}

/** Human-readable "name: value unit (status)" line for one structured result — shared by the summary composer, the flash card, and the Merit Model. */
export function courseProjectMetricLine(m: CourseProjectMetric): string {
    if (!m.name) return "";
    const unit = m.unit === "Percentage (%)" ? "%" : m.unit === "Other" ? (m.unitOther ? ` ${m.unitOther}` : "") : m.unit ? ` ${m.unit}` : "";
    const statusTag = m.status ? ` (${m.status.split(" — ")[0].toLowerCase()})` : "";
    return `${m.name}: ${m.value ?? ""}${unit}${statusTag}`;
}

/** Rank-movement arrow for a ribbon vs its previous run — `previousRank` unset/null means this is the
 * card's first-ever ranked run. */
export function rankMovement(
    ribbon?: { rank: number; previousRank?: number | null } | null,
): { symbol: "↑" | "↓" | "—" | "•"; label: string } | null {
    if (!ribbon) return null;
    if (ribbon.previousRank == null) return { symbol: "•", label: "First ranked run" };
    if (ribbon.previousRank > ribbon.rank) return { symbol: "↑", label: `Up from #${ribbon.previousRank}` };
    if (ribbon.previousRank < ribbon.rank) return { symbol: "↓", label: `Down from #${ribbon.previousRank}` };
    return { symbol: "—", label: "Unchanged" };
}

/** Section summaries embed literal `<b>...</b>` markers for emphasis (rendered via RichSummaryText
 * in read-only views) — but a plain HTML `<textarea>` can't render partial bold, so the review
 * step's editable boxes need the clean, tag-free version instead. */
export function stripBoldMarkup(text: string): string {
    return text.replace(/<\/?b>/g, "");
}

/** Composed from the student's own answers — not a generic template. Shared by the wizard's review step and the flash card. */
export function composeCourseProjectSummaries(entry: CourseProjectEntry): CourseProjectSectionSummaries {
    const si = entry.studentInfo || {};
    const ai = entry.assignmentInfo || {};
    const am = entry.aimsInfo || {};
    const pr = entry.processInfo || {};
    const re = entry.resultsInfo || {};
    const sm = entry.sdgMapping || {};
    const rf = entry.reflectionInfo || {};
    const gms = normalizeGroupMembers(si.groupMembers).map((m) => m.name).filter(Boolean);
    const formats = (ai.formats?.length ? ai.formats : ai.format ? [ai.format] : []);
    // Written in the student's own voice — I/we, never third-person — driven by team mode.
    const solo = !si.teamMode || /individual|solo/i.test(si.teamMode);
    const W = solo ? "I" : "We";
    const Wl = solo ? "I" : "we";
    const My = solo ? "my" : "our";
    const Me = solo ? "me" : "us";

    // Mirrors the mockup's X(i) helper — appends the section's optional "anything else" free text.
    const note = (n?: string) => (n?.trim() ? ` Additionally: ${lc(n.trim())}.` : "");

    const s: CourseProjectSectionSummaries = {};
    s.course = entry.course
        ? `${W} took <b>${entry.course}</b>${si.programme ? ` (${si.programme}${si.semester ? `, ${si.semester}` : ""})` : si.semester ? ` in ${si.semester}` : ""}${si.teamMode && !solo ? `, working as ${article(lc(si.teamMode))} ${lc(si.teamMode)}${gms.length ? ` — ${joinList(gms)}` : ""}` : ""}${si.teacherName ? `, under ${si.teacherName}` : ""}.${note(si.notes)}`
        : "";

    const formatLabels = formats.map((f) => stripEmoji(f).split(" (")[0]);
    s.assignment = entry.projectTitle
        ? `${cap(My)} work is "<b>${entry.projectTitle}</b>"${formatLabels.length ? ` — ${formatLabels.join(" + ")}` : ""}.${ai.whatAsked ? ` ${W} ${solo ? "was" : "were"} asked to ${lc(ai.whatAsked)}.` : ""}${ai.realWorldIssue ? ` It addresses ${lc(ai.realWorldIssue)}.` : ""}${note(ai.notes)}`
        : "";

    const objs = (am.objectives || []).filter(Boolean);
    // BENEFICIARY_OPTIONS carry no emoji prefix — no stripEmoji (it would mistake "Environment" in
    // "Environment / ecosystems" for an emoji token and strip it).
    const benef = (am.beneficiaries || []).filter((b) => b && !/no specific/i.test(b)).map((b) => b.toLowerCase());
    // The student can manually switch the "Aim & objectives" tile off in the Format step — say so
    // plainly rather than showing a blank review row for a section they never saw.
    s.aims = entry.moduleInclusion?.aim === false
        ? "Not applicable — skipped for this format."
        : (am.aimStatement || objs.length)
          ? `${cap(My)} aim was to <b>${am.aimStatement ? lc(am.aimStatement) : "—"}</b>${objs.length ? `. ${W} set out to: ${objs.map((o, i) => `(${i + 1}) ${lc(o)}`).join("; ")}` : ""}${benef.length ? `. ${W} hoped it would benefit ${benef.join(", ").toLowerCase()}` : ""}.${note(am.notes)}`
          : "";

    const acts = (pr.activities || []).map(stripEmoji).map((x) => x.toLowerCase());
    const meths = (pr.methods || []).filter((m) => !/not applicable/i.test(m)).map(stripEmoji).map((x) => x.toLowerCase());
    const noFormalMethod = (pr.methods || []).some((m) => /not applicable/i.test(m));
    // STAKEHOLDER_OPTIONS carry no emoji prefix — no stripEmoji, same reasoning as beneficiaries above.
    const stakeholders = (pr.stakeholders || []).filter((x) => !/no external/i.test(x)).map((x) => x.toLowerCase());
    s.process = acts.length || meths.length || pr.sampleScale || noFormalMethod || stakeholders.length
        ? `${acts.length ? `${W} worked through <b>${joinList(acts)}</b>. ` : ""}${meths.length ? `${cap(My)} methods: ${joinList(meths)}. ` : noFormalMethod ? `${W} used no formal research method — this was practice-led work. ` : ""}${pr.sampleScale ? `The scale of ${My} work: <b>${pr.sampleScale}</b>. ` : ""}${stakeholders.length ? `Along the way ${Wl} engaged ${stakeholders.join(", ").toLowerCase()}.` : ""}${note(pr.notes)}`
        : "";

    const outs = (re.outputs || []).map(stripEmoji).map((x) => x.toLowerCase());
    const finds = (re.findings || []).filter(Boolean);
    const metricLines = (re.metrics || []).map(courseProjectMetricLine).filter(Boolean);
    const legacyEvidenceLine = !metricLines.length && re.evidenceStatus
        ? ` ${W} noted evidence status: ${re.evidenceStatus}${re.metricName && re.metricValue ? ` — ${re.metricName}: ${re.metricValue}${re.metricUnit || ""}${re.numberRepresents ? ` (${re.numberRepresents.toLowerCase()})` : ""}` : ""}.`
        : "";
    const resultsLine = metricLines.length ? ` ${cap(My)} results: ${metricLines.join(" · ")}.` : legacyEvidenceLine;
    const recs = (re.recommendations || []).filter(Boolean);
    const limitationLabel = re.limitationType === "Other — describe below" ? re.limitationOther : re.limitationType;
    s.results = outs.length || re.outputDescription
        ? `${W} produced <b>${outs.length ? joinList(outs) : "—"}</b>${re.outputDescription ? ` — ${lc(re.outputDescription)}` : ""}.${finds.length ? ` ${W} found that ${finds.map((f, i) => `(${i + 1}) ${lc(f)}`).join("; ")}.` : ""}${resultsLine}${re.measurableImpact ? ` Measured impact: ${lc(re.measurableImpact)}.` : ""}${limitationLabel ? ` ${W} acknowledge the main limitation honestly: ${lc(limitationLabel)}${re.limitationDetail ? ` — ${lc(re.limitationDetail)}` : ""}${re.limitationInterpretation ? ` — ${lc(re.limitationInterpretation)}` : ""}.` : ""}${recs.length ? ` Based on this, ${Wl} recommend: ${recs.map(lc).join("; ")}.` : ""}${re.resultsSummary ? ` <b>In ${My} own words:</b> ${stripPeriod(re.resultsSummary)}.` : ""}${note(re.notes)}`
        : "";

    const entries = sm.entries || [];
    s.sdg = sm.notApplicable
        ? `${W} looked honestly and found <b>no genuine SDG link in this assignment</b> — ${Wl}'d rather declare that than force one. Flagged for ${My} teacher's confirmation.${note(sm.notes)}`
        : entries.length
          ? `${sm.origin ? `For ${Me}, sustainability ${lc(stripEmoji(sm.origin))}. ` : ""}${W} connected the work primarily to <b>SDG ${entries[0].goalNumber}${entries[0].targets.length ? ` (target ${entries[0].targets.join(", ")})` : ""}</b>${entries.length > 1 ? `, with ${entries.slice(1).map((en) => `SDG ${en.goalNumber}${en.targets.length ? ` (target ${en.targets.join(", ")})` : ""} (${(en.strength || "supporting").toLowerCase()})${en.how ? ` — ${lc(en.how)}` : ""}`).join(" and ")} in support` : ""}.${entries[0].how ? ` In ${My} words: ${lc(entries[0].how)}.` : ""}${note(sm.notes)}`
          : sm.origin
            ? `For ${Me}, sustainability ${lc(stripEmoji(sm.origin))} — SDG selection pending.${note(sm.notes)}`
            : "";

    const sk = (rf.skills || []).map(stripEmoji).map((x) => x.toLowerCase());
    const integration = rf.integrationLevel || rf.sdgLinkHonesty;
    s.reflection = rf.lessonLearned || integration
        ? `${rf.lessonLearned ? `This work taught ${Me} ${lc(rf.lessonLearned)}. ` : ""}${integration ? `Honestly, sustainability was <b>${lc(stripEmoji(integration))}</b>. ` : ""}${sk.length ? `${W} built skills in ${joinList(sk)}. ` : ""}${rf.nextSteps ? `What's next: ${lc(rf.nextSteps)}${rf.whatsNext ? ` — ${lc(rf.whatsNext)}` : ""}. ` : ""}${rf.adviceNextSemester ? `${cap(My)} advice to the next class: "${stripPeriod(rf.adviceNextSemester)}".` : ""}${note(rf.notes)}`
        : "";

    return s;
}

/**
 * What a teacher/faculty deck should display: the text the student explicitly accepted (or hand-edited)
 * during the step 8 review, falling back to a fresh AI draft only for sections never reviewed yet
 * (e.g. an in-progress draft). Once accepted, a section's wording never silently changes underneath the student.
 */
export function resolveSectionSummaries(entry: CourseProjectEntry): CourseProjectSectionSummaries {
    const draft = composeCourseProjectSummaries(entry);
    const saved = entry.sectionSummaries || {};
    const out: CourseProjectSectionSummaries = {};
    for (const key of ACTIVE_SECTION_KEYS) {
        out[key] = saved[key] || draft[key];
    }
    return out;
}

/** One-line "ten-second story" for the flash card's closed state. */
export function courseProjectStory(entry: CourseProjectEntry): string {
    const re = entry.resultsInfo || {};
    const ai = entry.assignmentInfo || {};
    if (re.outputDescription) return re.outputDescription;
    if (re.findings?.[0]) return re.findings[0];
    if (ai.whatAsked) return ai.whatAsked;
    return "No summary yet — keep filling in the report.";
}

export const ACTIVE_SECTION_KEYS: (keyof CourseProjectSectionSummaries)[] = ["course", "assignment", "aims", "process", "results", "sdg", "reflection"];
export const SECTION_LABELS: Record<keyof CourseProjectSectionSummaries, { emoji: string; label: string }> = {
    course: { emoji: "📌", label: "Course & context" },
    assignment: { emoji: "🚀", label: "The assignment" },
    aims: { emoji: "🎯", label: "Aims" },
    process: { emoji: "🛠️", label: "Process" },
    results: { emoji: "📦", label: "Results" },
    sdg: { emoji: "🌍", label: "SDG mapping" },
    reflection: { emoji: "💡", label: "Reflection" },
};

export function activeSectionKeys(_entry?: CourseProjectEntry): (keyof CourseProjectSectionSummaries)[] {
    return ["course", "assignment", "aims", "process", "results", "sdg", "reflection"];
}

/** Primary SDG is always entries[0] — helper for display code that wants it explicitly. */
export function primarySdgEntry(entry: CourseProjectEntry): CourseProjectSdgEntry | null {
    return entry.sdgMapping?.entries?.[0] ?? null;
}

// ---------------------------------------------------------------------------
// Five pathways — adaptive vocabulary keyed by the assignment's first format pick.
// Mirrors fypTypes.ts's FYP_MODES/PROJECT_TYPE_ROUTE pattern.
// ---------------------------------------------------------------------------

export type CourseProjectRoute = "writer" | "advisor" | "maker" | "builder" | "comm";

export interface CourseProjectRouteMode {
    name: string;
    aimL: string;
    aimPh: string;
    fndL: string;
    /** Stepper mini-labels for the Aims / Process / Results steps, in that order. */
    steps: [string, string, string];
    road: string[];
    i: CourseProjectModuleInclusion;
}

export const COURSEWORK_MODES: Record<CourseProjectRoute, CourseProjectRouteMode> = {
    writer: {
        name: "✍️ WRITER / ANALYST PATHWAY",
        aimL: "The overall aim",
        aimPh: "e.g. Develop a practical strategy to reduce cafeteria waste",
        fndL: "Key findings / conclusions",
        steps: ["Aims", "Research", "Findings"],
        road: ["🎯 Aim", "🔍 Research", "🧠 Argument", "📊 Findings", "🌍 SDG link"],
        i: { aim: true, act: false, meth: true, find: true, res: true, lim: true },
    },
    advisor: {
        name: "🧭 ADVISOR PATHWAY",
        aimL: "What the brief asked you to solve",
        aimPh: "e.g. Recommend how the café chain cuts single-use plastic without losing margin",
        fndL: "Key recommendations",
        steps: ["Brief", "Analysis", "Recommendation"],
        road: ["🏢 The brief", "🔍 Analysis", "📈 Recommendation", "📏 Evidence", "🌍 SDG link"],
        i: { aim: true, act: false, meth: true, find: true, res: true, lim: true },
    },
    maker: {
        name: "🎨 MAKER PATHWAY",
        aimL: "Your design intention",
        aimPh: "e.g. A poster series that makes water-saving feel modern, not preachy",
        fndL: "What the work demonstrates",
        steps: ["Intention", "Process", "The work"],
        road: ["💡 Intention", "✂️ Process", "🔁 Iterations", "🖼️ Final work", "🌍 SDG link"],
        i: { aim: true, act: true, meth: false, find: true, res: true, lim: true },
    },
    builder: {
        name: "💻 BUILDER PATHWAY",
        aimL: "The problem you set out to solve",
        aimPh: "e.g. Society events clash because no shared campus calendar exists",
        fndL: "What the build proved",
        steps: ["Problem", "Build & test", "Output"],
        road: ["🧩 Problem", "🛠️ Build", "🧪 Testing", "✅ Output", "🌍 SDG link"],
        i: { aim: true, act: true, meth: true, find: false, res: true, lim: true },
    },
    comm: {
        name: "📣 COMMUNICATOR PATHWAY",
        aimL: "Your concept / message",
        aimPh: "e.g. Make campus recycling feel like a team sport, not a chore",
        fndL: "Audience response / what it communicated",
        steps: ["Concept", "Making", "Response"],
        road: ["🎬 Concept", "🎥 Making", "👥 Audience", "💬 Response", "🌍 SDG link"],
        i: { aim: true, act: true, meth: false, find: true, res: true, lim: false },
    },
};

/** Every format maps to exactly one of the five pathways — the first format picked leads. */
export const FORMAT_ROUTE: Record<string, CourseProjectRoute> = {
    "✍️ Essay / written argument": "writer",
    "📑 Report": "writer",
    "🔬 Research paper": "writer",
    "📊 Data / analysis": "writer",
    "🥾 Fieldwork output": "writer",
    "📖 Literature review": "writer",
    "🧪 Lab / practical report": "writer",
    "🌐 Translation / language work": "writer",
    "🧭 Case study": "advisor",
    "🧭 Strategy / proposal / plan": "advisor",
    "🩺 Clinical case / care plan": "advisor",
    "⚖️ Legal brief / moot": "advisor",
    "💼 Business plan": "advisor",
    "🧑‍🏫 Lesson plan / teaching practice": "comm",
    "🎪 Event / experience organised": "comm",
    "🎨 Design / visual work": "maker",
    "📐 Model": "maker",
    "🔧 Prototype": "maker",
    "🧱 Physical product / making": "maker",
    "🖼️ Artwork / creative production": "maker",
    "🪧 Poster / infographic": "maker",
    "📱 App / website / software": "builder",
    "🎤 Presentation / slides": "comm",
    "🎬 Video / film / audio": "comm",
    "📣 Campaign / communication": "comm",
    "🎭 Performance / exhibition": "comm",
};

export function courseProjectRouteFor(formats?: string[]): CourseProjectRoute {
    const first = formats?.[0];
    return FORMAT_ROUTE[first || ""] || "writer";
}
