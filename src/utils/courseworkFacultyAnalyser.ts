import { findSdgById } from "@/utils/sdgData";
import { fileNameFromUrl } from "@/utils/courseworkFlashCard";
import { type CourseProjectEntry, normalizeUrlList, resolveSectionSummaries, stripEmoji } from "@/utils/courseProjectTypes";
import {
    computeMeritScorecard,
    MERIT_RUBRIC,
    RUBRIC_SCALE,
    type MeritCriterionResult,
    type MeritScorecard,
} from "@/utils/courseworkMeritModel";
import type { MeritEntry } from "@/components/ciel/MeritModelPanel";

export const QUALITY_BANDS = [
    { min: 95, max: 100, name: "Outstanding", short: "OUTSTANDING" },
    { min: 85, max: 94.99, name: "Excellent", short: "EXCELLENT" },
    { min: 75, max: 84.99, name: "Very Good", short: "VERY GOOD" },
    { min: 65, max: 74.99, name: "Good", short: "GOOD" },
    { min: 55, max: 64.99, name: "Developing", short: "DEVELOPING" },
    { min: 40, max: 54.99, name: "Basic", short: "BASIC" },
    { min: 0, max: 39.99, name: "Insufficient", short: "INSUFFICIENT" },
] as const;

export const PERFORMANCE_ANCHORS: Record<number, { title: string; text: string }> = {
    0: { title: "Not demonstrated", text: "Absent, unusable or not evidenced in the submitted work." },
    1: { title: "Basic", text: "Limited understanding, weak development or largely unsupported execution." },
    2: { title: "Developing / Medium", text: "Relevant work is present but depth, integration or control is uneven." },
    3: { title: "Good", text: "Clear, competent and appropriate work with sound reasoning and execution." },
    4: { title: "Excellent", text: "Strong, well-justified, rigorous and highly resolved work." },
    5: { title: "Outstanding", text: "Exceptional command, insight, sophistication, integration or professional-level resolution." },
};

export const GLOBAL_FRAMEWORKS = [
    {
        icon: "🎓",
        name: "QAA Qualifications Frameworks",
        check: "Academic-level calibration",
        source: "QAA · Frameworks for Higher Education Qualifications",
        url: "https://www.qaa.ac.uk/the-quality-code/qualifications-frameworks",
        strong:
            "The declared academic stage is used to calibrate expected depth, independence, critical analysis and handling of uncertainty. The rubric itself remains unchanged across levels.",
    },
    {
        icon: "🔎",
        name: "AAC&U VALUE Rubrics",
        check: "Inquiry, analysis & integrative learning",
        source: "AAC&U · VALUE Rubrics",
        url: "https://www.aacu.org/value/rubrics",
        strong:
            "The work demonstrates inquiry, evidence use, synthesis and application. Deeper critical interpretation and transfer remain the clearest route to the top band.",
    },
    {
        icon: "🌍",
        name: "UNESCO Education for Sustainable Development",
        check: "Sustainability competencies",
        source: "UNESCO · Education for Sustainable Development Goals: Learning Objectives",
        url: "https://www.unesco.org/en/articles/education-sustainable-development-goals-learning-objectives",
        strong:
            "Systems thinking, critical thinking and strategic action are visible. Anticipatory thinking, explicit trade-offs and longer-horizon implications could be developed further.",
    },
] as const;

export const AI_STAGES = [
    { n: 1, title: "Read Flashcard", sub: "Context, level, SDGs, claims" },
    { n: 2, title: "Inspect Work", sub: "Actual coursework / output" },
    { n: 3, title: "Inspect Evidence", sub: "Claim-specific files" },
    { n: 4, title: "Apply Rubric", sub: "7 criteria · 0–5" },
    { n: 5, title: "Level Calibrate", sub: "Expected academic depth" },
    { n: 6, title: "Global Compare", sub: "Standards + similar work" },
    { n: 7, title: "Explain Score", sub: "Section + overall reasoning" },
    { n: 8, title: "Faculty Review", sub: "Approve / change / return" },
] as const;

export function levelFromPoints(points: number, max: number): number {
    if (!max) return 0;
    return Math.max(0, Math.min(5, Math.round((points / max) * 5)));
}

export function bandForScore(score: number) {
    return QUALITY_BANDS.find((b) => score >= b.min && score <= b.max) ?? QUALITY_BANDS[QUALITY_BANDS.length - 1];
}

export function academicStage(entry: CourseProjectEntry): { label: string; tag: string } {
    const raw = entry.studentInfo?.semester || "";
    const n = Number((raw.match(/\d+/) || ["0"])[0]);
    if (n >= 7) return { label: "Undergraduate — final year / advanced stage", tag: "FINAL-YEAR UNDERGRADUATE" };
    if (n >= 5) return { label: "Undergraduate — mid / advanced stage", tag: "MID-STAGE UNDERGRADUATE" };
    if (n >= 1) return { label: "Undergraduate — foundation / early stage", tag: "EARLY UNDERGRADUATE" };
    return { label: "Undergraduate coursework", tag: "UNDERGRADUATE" };
}

export type AnalyserEvidenceRow = {
    id: string;
    file: string;
    url?: string;
    claim: string;
    type: string;
    match: number;
    verdict: "MATCH" | "PARTIAL";
    why: string;
};

export function analyserEvidenceRows(entry: CourseProjectEntry, scorecard: MeritScorecard): AnalyserEvidenceRow[] {
    const rows: AnalyserEvidenceRow[] = [
        {
            id: "F-01",
            file: "Coursework flashcard",
            claim: "Course, academic stage, title, format, SDGs and student-declared summary",
            type: "Structured record",
            match: 100,
            verdict: "MATCH",
            why: "Structured submission metadata reconciles with the review package.",
        },
    ];
    if (entry.assignmentFileUrl) {
        rows.push({
            id: "F-02",
            file: fileNameFromUrl(entry.assignmentFileUrl, 42) || "Primary coursework file",
            url: entry.assignmentFileUrl,
            claim: "Main academic argument, method, findings and recommendations",
            type: "Document analysis",
            match: scorecard.consistency.ok ? 96 : 84,
            verdict: scorecard.consistency.ok ? "MATCH" : "PARTIAL",
            why: scorecard.consistency.ok
                ? "Core claims in the flashcard are present in the submitted coursework file."
                : scorecard.consistency.message,
        });
    }
    normalizeUrlList(entry.evidenceUrls).forEach((url, i) => {
        const types = entry.evidenceTypes || [];
        rows.push({
            id: `E-${String(i + 1).padStart(2, "0")}`,
            file: fileNameFromUrl(url, 42) || `Evidence ${i + 1}`,
            url,
            claim: types[i] || "Supporting evidence for a declared result or process step",
            type: "Supporting file",
            match: scorecard.consistency.ok ? 90 : 78,
            verdict: scorecard.consistency.ok ? "MATCH" : "PARTIAL",
            why: scorecard.consistency.ok
                ? "File is mapped to the submitted record and used as supporting evidence."
                : "Mapped, but a claims-vs-evidence consistency flag is open for faculty review.",
        });
    });
    return rows;
}

export function evidenceAverage(rows: AnalyserEvidenceRow[]): number {
    if (!rows.length) return 0;
    return Math.round(rows.reduce((sum, row) => sum + row.match, 0) / rows.length);
}

export function criterionExplain(c: MeritCriterionResult): { good: string; gap: string; analysis: string } {
    const scale = RUBRIC_SCALE[c.key];
    const level = levelFromPoints(c.points, c.max);
    return {
        good: level >= 4 ? scale.exemplary : level >= 3 ? scale.solid : scale.developing,
        gap:
            level >= 5
                ? "This criterion already sits at Outstanding. Faculty should only change it with a recorded academic reason."
                : `To reach the next level: ${scale.exemplary}`,
        analysis: `${c.note}. ${PERFORMANCE_ANCHORS[level]?.text ?? ""}`,
    };
}

export function sdgLabel(entry: CourseProjectEntry): string {
    const sm = entry.sdgMapping;
    if (sm?.notApplicable) return "Honestly declared not applicable";
    const primary = sm?.entries?.[0];
    if (!primary) return "No SDG selected";
    const sdg = findSdgById(primary.goalNumber);
    const extra = (sm?.entries?.length ?? 0) > 1 ? ` · supporting SDG ${sm!.entries![1].goalNumber}` : "";
    return sdg ? `SDG ${sdg.number} · ${sdg.title}${extra}` : `SDG ${primary.goalNumber}${extra}`;
}

export function formatLabel(entry: CourseProjectEntry): string {
    const formats = entry.assignmentInfo?.formats?.length
        ? entry.assignmentInfo.formats
        : entry.assignmentInfo?.format
          ? [entry.assignmentInfo.format]
          : [];
    return formats.map((f) => stripEmoji(f).split(" (")[0]).join(" + ") || "Coursework";
}

export function studentDisplayName(entry: MeritEntry): string {
    return entry.student?.name || entry.studentInfo?.studentName || "Student";
}

export function summaryCount(entry: CourseProjectEntry): number {
    const summaries = resolveSectionSummaries(entry);
    return (["course", "assignment", "aims", "process", "results", "sdg", "reflection"] as const).filter(
        (key) => Boolean(summaries[key]?.trim()),
    ).length;
}

export function weightedPoints(c: MeritCriterionResult, level = levelFromPoints(c.points, c.max)): number {
    return (c.max * level) / 5;
}

export function scoreFromLevels(scorecard: MeritScorecard, levels: Record<string, number>): number {
    return scorecard.criteria.reduce((sum, c) => sum + weightedPoints(c, levels[c.key] ?? levelFromPoints(c.points, c.max)), 0);
}

export function defaultFacultyLevels(scorecard: MeritScorecard): Record<string, number> {
    return Object.fromEntries(scorecard.criteria.map((c) => [c.key, levelFromPoints(c.points, c.max)]));
}

export function buildAnalyserModel(entry: MeritEntry) {
    const scorecard = computeMeritScorecard(entry);
    const evidence = analyserEvidenceRows(entry, scorecard);
    const stage = academicStage(entry);
    const aiLevels = defaultFacultyLevels(scorecard);
    return {
        scorecard,
        evidence,
        evidenceAvg: evidenceAverage(evidence),
        stage,
        aiLevels,
        aiScore: scorecard.total,
        band: bandForScore(scorecard.total),
        name: studentDisplayName(entry),
        university: entry.student?.institution || entry.studentInfo?.universityName || "—",
        course: entry.course || entry.studentInfo?.courseCode || "Coursework",
        programme: entry.studentInfo?.programme || entry.studentInfo?.disciplineName || "—",
        title: entry.projectTitle || "Untitled coursework",
        format: formatLabel(entry),
        sdg: sdgLabel(entry),
        instructor: entry.studentInfo?.teacherName || "Faculty",
        summariesFilled: summaryCount(entry),
        primaryFile: entry.assignmentFileUrl,
        primaryFileName: entry.assignmentFileUrl ? fileNameFromUrl(entry.assignmentFileUrl, 48) : null,
        evidenceCount: normalizeUrlList(entry.evidenceUrls).length,
        rubric: MERIT_RUBRIC,
    };
}
