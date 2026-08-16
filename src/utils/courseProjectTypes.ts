// Shared types + summary composition for the Course Project coursework wizard, flash card, and decks.
// Mirrors ciel_backend/src/paths/entities/course-project-entry.entity.ts

export interface CourseProjectStudentInfo {
    studentName?: string;
    rollNumber?: string;
    universityName?: string;
    disciplineName?: string;
    semester?: string;
    teamMode?: string;
    groupMembers?: string[];
    teacherName?: string;
    teacherEmail?: string;
    notes?: string;
}
export interface CourseProjectAssignmentInfo {
    format?: string;
    formatOther?: string;
    whatAsked?: string;
    realWorldIssue?: string;
    notes?: string;
}
export interface CourseProjectAimsInfo {
    aimStatement?: string;
    objectives?: string[];
    notes?: string;
}
export interface CourseProjectProcessInfo {
    activities?: string[];
    activitiesOther?: string;
    methods?: string[];
    methodsOther?: string;
    sampleScale?: string;
    notes?: string;
}
export interface CourseProjectResultsInfo {
    outputs?: string[];
    outputsOther?: string;
    outputDescription?: string;
    findings?: string[];
    measurableImpact?: string;
    limitationType?: string;
    limitationOther?: string;
    limitationDetail?: string;
    notes?: string;
}
export interface CourseProjectSdgEntry {
    goalNumber: number;
    targets: string[];
    how?: string;
}
export interface CourseProjectSdgMapping {
    origin?: string;
    entries?: CourseProjectSdgEntry[];
    notes?: string;
}
export interface CourseProjectReflectionInfo {
    lessonLearned?: string;
    sdgLinkHonesty?: string;
    skills?: string[];
    skillsOther?: string;
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
    const gms = si.groupMembers || [];

    const s: CourseProjectSectionSummaries = {};
    s.course = si.studentName || entry.course
        ? `A ${ai.format ? stripEmoji(ai.format).split(" (")[0].toLowerCase() : "course assignment"} for ${entry.course || si.disciplineName || "this course"}${si.disciplineName ? ` (${si.disciplineName})` : ""}${si.universityName ? `, ${si.universityName}` : ""}${si.semester ? `, ${si.semester}` : ""}${si.teamMode ? `, completed ${si.teamMode === "Solo" ? "individually" : `as a group${gms.length ? ` (${si.studentName ? si.studentName + ", " : ""}${joinList(gms)})` : ""}`}` : ""}${si.teacherName ? `, under the supervision of ${si.teacherName}` : ""}.`
        : "";

    s.assignment = ai.whatAsked || ai.realWorldIssue
        ? `${entry.projectTitle ? `"${entry.projectTitle}": the` : "The"} task asked us to ${lc(ai.whatAsked || "")}${ai.realWorldIssue ? `, engaging the real issue that ${lc(ai.realWorldIssue)}` : ""}.`
        : "";

    const objs = (am.objectives || []).filter(Boolean);
    s.aims = inc.aim && (am.aimStatement || objs.length)
        ? `${am.aimStatement ? `The aim was to ${lc(am.aimStatement)}.` : ""}${objs.length ? ` Objectives: ${objs.map((o, i) => `(${i + 1}) ${lc(o)}`).join("; ")}.` : ""}`
        : "";

    const acts = (pr.activities || []).map(stripEmoji).map((x) => x.toLowerCase());
    const meths = (pr.methods || []).map(stripEmoji).map((x) => x.toLowerCase());
    s.process = (inc.act && acts.length) || (inc.meth && meths.length)
        ? `The work involved ${inc.act && acts.length ? joinList(acts) : ""}${inc.act && acts.length && inc.meth && meths.length ? ", using " : ""}${inc.meth && meths.length ? joinList(meths) : ""}${inc.meth && pr.sampleScale ? ` (${pr.sampleScale})` : ""}.`
        : "";

    const outs = (re.outputs || []).map(stripEmoji).map((x) => x.toLowerCase());
    const finds = (re.findings || []).filter(Boolean);
    s.results = outs.length || re.outputDescription
        ? `It produced ${outs.length ? joinList(outs) : "its deliverable"}${re.outputDescription ? ` — ${lc(re.outputDescription)}` : ""}.${inc.find && finds.length ? ` Key findings: ${finds.map((f, i) => `(${i + 1}) ${lc(f)}`).join("; ")}.` : ""}${inc.imp && re.measurableImpact ? ` Measured impact: ${lc(re.measurableImpact)}.` : ""}${inc.lim && re.limitationType ? ` Limitation, honestly noted: ${lc(re.limitationType)}${re.limitationDetail ? ` — ${lc(re.limitationDetail)}` : ""}.` : ""}`
        : "";

    const entries = sm.entries || [];
    s.sdg = entries.length
        ? `${sm.origin ? `Sustainability entered because ${lc(stripEmoji(sm.origin))}. ` : ""}It supports ${entries.map((en) => `SDG ${en.goalNumber}${en.targets.length ? ` (target ${en.targets.join(", ")})` : ""}${en.how ? ` — ${lc(en.how)}` : ""}`).join("; ")}.`
        : sm.origin
          ? `Sustainability entered because ${lc(stripEmoji(sm.origin))}; SDG mapping pending.`
          : "";

    const sk = (rf.skills || []).map(stripEmoji).map((x) => x.toLowerCase());
    s.reflection = rf.lessonLearned
        ? `Reflecting, the takeaway: ${lc(rf.lessonLearned)}.${rf.sdgLinkHonesty ? ` The SDG link is honestly rated as "${lc(stripEmoji(rf.sdgLinkHonesty))}".` : ""}${sk.length ? ` Skills grown: ${joinList(sk)}.` : ""}${rf.whatsNext ? ` Next: ${lc(rf.whatsNext)}.` : ""}${rf.adviceNextSemester ? ` Advice to next semester: "${rf.adviceNextSemester}".` : ""}`
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
    assignment: { emoji: "🧬", label: "The assignment" },
    aims: { emoji: "🎯", label: "Aims" },
    process: { emoji: "🛠️", label: "Process" },
    results: { emoji: "📦", label: "Results" },
    sdg: { emoji: "🌍", label: "SDG mapping" },
    reflection: { emoji: "🪞", label: "Reflection" },
};

export function activeSectionKeys(entry: CourseProjectEntry): (keyof CourseProjectSectionSummaries)[] {
    const inc = entry.moduleInclusion || {};
    const keys: (keyof CourseProjectSectionSummaries)[] = ["course", "assignment"];
    if (inc.aim) keys.push("aims");
    if (inc.act || inc.meth) keys.push("process");
    keys.push("results", "sdg", "reflection");
    return keys;
}
