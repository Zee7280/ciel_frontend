// Shared types + summary composition for the Course Project coursework wizard, flash card, and decks.
// Mirrors ciel_backend/src/paths/entities/course-project-entry.entity.ts

export interface CourseProjectGroupMember {
    name: string;
    email?: string;
    rollNumber?: string;
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
    courseworkType?: string;
    courseworkTypeOther?: string;
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
export interface CourseProjectResultsInfo {
    outputs?: string[];
    outputsOther?: string;
    outputDescription?: string;
    findings?: string[];
    measurableImpact?: string;
    evidenceStatus?: string;
    metricName?: string;
    metricValue?: string;
    metricUnit?: string;
    numberRepresents?: string;
    limitationType?: string;
    limitationOther?: string;
    limitationDetail?: string;
    notes?: string;
}
export interface CourseProjectSdgEntry {
    goalNumber: number;
    targets: string[];
    how?: string;
    strength?: string;
}
export interface CourseProjectSdgMapping {
    origin?: string;
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
    imp?: boolean;
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
    evidenceUrls: string[] | null;
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
    createdAt?: string;
    updatedAt?: string;
    /** False when this entry is showing because the viewer was named as a group member on someone else's
     * submitted report, not because they own it — gates edit/delete access on the frontend. */
    isOwner?: boolean;
}

export const EMPTY_COURSE_PROJECT: CourseProjectEntry = {
    course: "",
    projectTitle: "",
    projectDescription: "",
    sdgs: [],
    evidenceUrls: [],
    studentInfo: {},
    assignmentInfo: {},
    aimsInfo: {},
    processInfo: {},
    resultsInfo: {},
    sdgMapping: {},
    reflectionInfo: {},
    moduleInclusion: { aim: true, act: true, meth: false, find: false, imp: true, lim: true },
    sectionSummaries: {},
    addedNote: "",
    stepCompleted: 0,
    status: "draft",
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
    };
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

/** Composed from the student's own answers — not a generic template. Shared by the wizard's review step and the flash card. */
export function composeCourseProjectSummaries(entry: CourseProjectEntry): CourseProjectSectionSummaries {
    const inc: CourseProjectModuleInclusion = entry.moduleInclusion || {};
    const si = entry.studentInfo || {};
    const ai = entry.assignmentInfo || {};
    const am = entry.aimsInfo || {};
    const pr = entry.processInfo || {};
    const re = entry.resultsInfo || {};
    const sm = entry.sdgMapping || {};
    const rf = entry.reflectionInfo || {};
    const gms = normalizeGroupMembers(si.groupMembers).map((m) => m.name).filter(Boolean);
    const formats = (ai.formats?.length ? ai.formats : ai.format ? [ai.format] : []);
    const primaryFormat = formats[0];

    const s: CourseProjectSectionSummaries = {};
    s.course = si.studentName || entry.course
        ? `A ${primaryFormat ? stripEmoji(primaryFormat).split(" (")[0].toLowerCase() : si.courseworkType ? stripEmoji(si.courseworkType).toLowerCase() : "course assignment"} for ${entry.course || si.disciplineName || "this course"}${si.courseCode ? ` (${si.courseCode})` : ""}${si.department ? `, ${si.department}` : ""}${si.programme ? `, ${si.programme}` : ""}${si.semester ? `, ${si.semester}` : ""}${si.teamMode ? `, completed ${/individual|solo/i.test(si.teamMode) ? "individually" : `as ${lc(si.teamMode)}${gms.length ? ` (${si.studentName ? si.studentName + ", " : ""}${joinList(gms)})` : ""}`}` : ""}${si.teacherName ? `, under the supervision of ${si.teacherName}` : ""}.`
        : "";

    s.assignment = ai.whatAsked || ai.realWorldIssue
        ? `${entry.projectTitle ? `"${entry.projectTitle}": the` : "The"} task asked us to ${lc(ai.whatAsked || "")}${ai.realWorldIssue ? `, engaging the real issue that ${lc(ai.realWorldIssue)}` : ""}.`
        : "";

    const objs = (am.objectives || []).filter(Boolean);
    const benef = (am.beneficiaries || []).filter((b) => b && !/no specific/i.test(b)).map(stripEmoji);
    s.aims = inc.aim && (am.aimStatement || objs.length)
        ? `${am.aimStatement ? `The aim was to ${lc(am.aimStatement)}.` : ""}${objs.length ? ` Objectives: ${objs.map((o, i) => `(${i + 1}) ${lc(o)}`).join("; ")}.` : ""}${benef.length ? ` Intended to benefit or influence: ${benef.join(", ").toLowerCase()}.` : ""}`
        : "";

    const acts = (pr.activities || []).map(stripEmoji).map((x) => x.toLowerCase());
    const meths = (pr.methods || []).filter((m) => !/not applicable/i.test(m)).map(stripEmoji).map((x) => x.toLowerCase());
    const stakeholders = (pr.stakeholders || []).filter((x) => !/no external/i.test(x)).map(stripEmoji);
    s.process = (inc.act && acts.length) || (inc.meth && meths.length)
        ? `The work involved ${inc.act && acts.length ? joinList(acts) : ""}${inc.act && acts.length && inc.meth && meths.length ? ", using " : ""}${inc.meth && meths.length ? joinList(meths) : ""}${inc.meth && pr.sampleScale ? ` (${pr.sampleScale})` : ""}.${stakeholders.length ? ` Engaged: ${stakeholders.join(", ").toLowerCase()}.` : ""}`
        : "";

    const outs = (re.outputs || []).map(stripEmoji).map((x) => x.toLowerCase());
    const finds = (re.findings || []).filter(Boolean);
    const evidenceLine = re.evidenceStatus
        ? ` Evidence status: ${re.evidenceStatus}${re.metricName && re.metricValue ? ` — ${re.metricName}: ${re.metricValue}${re.metricUnit || ""}${re.numberRepresents ? ` (${re.numberRepresents.toLowerCase()})` : ""}` : ""}.`
        : "";
    s.results = outs.length || re.outputDescription
        ? `It produced ${outs.length ? joinList(outs) : "its deliverable"}${re.outputDescription ? ` — ${lc(re.outputDescription)}` : ""}.${inc.find && finds.length ? ` Key findings: ${finds.map((f, i) => `(${i + 1}) ${lc(f)}`).join("; ")}.` : ""}${inc.imp && re.measurableImpact ? ` Measured impact: ${lc(re.measurableImpact)}.` : ""}${evidenceLine}${inc.lim && re.limitationType ? ` Limitation, honestly noted: ${lc(re.limitationType)}${re.limitationDetail ? ` — ${lc(re.limitationDetail)}` : ""}.` : ""}`
        : "";

    const entries = sm.entries || [];
    s.sdg = entries.length
        ? `${sm.origin ? `Sustainability entered because ${lc(stripEmoji(sm.origin))}. ` : ""}Primary: SDG ${entries[0].goalNumber}${entries[0].targets.length ? ` (target ${entries[0].targets.join(", ")})` : ""}${entries[0].how ? ` — ${lc(entries[0].how)}` : ""}.${entries.length > 1 ? ` Supporting: ${entries.slice(1).map((en) => `SDG ${en.goalNumber} (${(en.strength || "supporting").toLowerCase()})`).join(", ")}.` : ""}`
        : sm.origin
          ? `Sustainability entered because ${lc(stripEmoji(sm.origin))}; SDG mapping pending.`
          : "";

    const sk = (rf.skills || []).map(stripEmoji).map((x) => x.toLowerCase());
    const integration = rf.integrationLevel || rf.sdgLinkHonesty;
    const nextLine = rf.nextSteps ? `${lc(stripEmoji(rf.nextSteps))}${rf.whatsNext ? ` — ${lc(rf.whatsNext)}` : ""}` : rf.whatsNext ? lc(rf.whatsNext) : "";
    s.reflection = rf.lessonLearned
        ? `Reflecting, the takeaway: ${lc(rf.lessonLearned)}.${integration ? ` Sustainability integration: "${lc(stripEmoji(integration))}".` : ""}${sk.length ? ` Skills grown: ${joinList(sk)}.` : ""}${nextLine ? ` Next: ${nextLine}.` : ""}${rf.adviceNextSemester ? ` Advice to next semester: "${rf.adviceNextSemester}".` : ""}`
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

export function activeSectionKeys(entry: CourseProjectEntry): (keyof CourseProjectSectionSummaries)[] {
    const inc = entry.moduleInclusion || {};
    const keys: (keyof CourseProjectSectionSummaries)[] = ["course", "assignment"];
    if (inc.aim) keys.push("aims");
    if (inc.act || inc.meth) keys.push("process");
    keys.push("results", "sdg", "reflection");
    return keys;
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
        name: "✍️ Writer / analyst pathway",
        aimL: "The overall aim",
        aimPh: "e.g. Develop a practical strategy to reduce cafeteria waste",
        fndL: "Key findings / conclusions",
        steps: ["Aims", "Research", "Findings"],
        road: ["🎯 Aim", "🔍 Research", "🧠 Argument", "📊 Findings", "🌍 SDG link"],
        i: { aim: true, act: false, meth: true, find: true, imp: true, lim: true },
    },
    advisor: {
        name: "🧭 Advisor pathway",
        aimL: "What the brief asked you to solve",
        aimPh: "e.g. Recommend how the café chain cuts single-use plastic without losing margin",
        fndL: "Key recommendations",
        steps: ["Brief", "Analysis", "Recommendation"],
        road: ["🏢 The brief", "🔍 Analysis", "📈 Recommendation", "📏 Evidence", "🌍 SDG link"],
        i: { aim: true, act: false, meth: true, find: true, imp: true, lim: true },
    },
    maker: {
        name: "🎨 Maker pathway",
        aimL: "Your design intention",
        aimPh: "e.g. A poster series that makes water-saving feel modern, not preachy",
        fndL: "What the work demonstrates",
        steps: ["Intention", "Process", "The work"],
        road: ["💡 Intention", "✂️ Process", "🔁 Iterations", "🖼️ Final work", "🌍 SDG link"],
        i: { aim: true, act: true, meth: false, find: true, imp: true, lim: true },
    },
    builder: {
        name: "💻 Builder pathway",
        aimL: "The problem you set out to solve",
        aimPh: "e.g. Society events clash because no shared campus calendar exists",
        fndL: "What the build proved",
        steps: ["Problem", "Build & test", "Output"],
        road: ["🧩 Problem", "🛠️ Build", "🧪 Testing", "✅ Output", "🌍 SDG link"],
        i: { aim: true, act: true, meth: true, find: false, imp: true, lim: true },
    },
    comm: {
        name: "📣 Communicator pathway",
        aimL: "Your concept / message",
        aimPh: "e.g. Make campus recycling feel like a team sport, not a chore",
        fndL: "Audience response / what it communicated",
        steps: ["Concept", "Making", "Response"],
        road: ["🎬 Concept", "🎥 Making", "👥 Audience", "💬 Response", "🌍 SDG link"],
        i: { aim: true, act: true, meth: false, find: true, imp: true, lim: false },
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
