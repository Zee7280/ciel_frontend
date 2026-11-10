/**
 * R3 "student report analysis": the Admin-approved result as one portable record (final CII, badge,
 * section scores, overall analysis, strengths, areas to grow, Admin comment). It is built only from a
 * locked approval, so a provisional or unapproved review can never be exported. Pure module, no
 * imports, so the node:test suite can load it directly.
 */

export const STUDENT_ANALYSIS_VERSION = "CIEL-STUDENT-REPORT-ANALYSIS-R3";

export interface StudentAnalysisSection {
    dimension?: string;
    name?: string;
    score?: number | null;
    maximumPoints?: number | null;
}

export interface StudentAnalysisInput {
    locked: boolean;
    reportId: string;
    projectTitle: string;
    studentName?: string;
    university?: string;
    finalCII: number | null;
    badgeName: string | null;
    badgeLevel?: number | null;
    /** R3: `L6_PENDING_QUALIFICATION` when a locked 90+ CII has no awarded badge yet. */
    badgeStatus?: string | null;
    approvalHash?: string | null;
    approvedAt?: string | null;
    sections: StudentAnalysisSection[];
    overallAnalysis: string;
    strengths: string[];
    areasToGrow: string[];
    adminComment?: string;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const lines = (xs: string[]) => xs.map((x) => String(x ?? "").trim()).filter(Boolean);

/** Null until the CII is locked: an unapproved review is never exported as a student analysis. */
export function buildStudentAnalysisRecord(input: StudentAnalysisInput) {
    if (!input.locked || input.finalCII == null) return null;
    return {
        version: STUDENT_ANALYSIS_VERSION,
        reportId: input.reportId,
        projectTitle: input.projectTitle,
        studentName: input.studentName || null,
        university: input.university || null,
        officialApproval: true,
        approvalHash: input.approvalHash || null,
        approvedAt: input.approvedAt || null,
        finalCII: round1(input.finalCII),
        badge: input.badgeName ? { name: input.badgeName, level: input.badgeLevel ?? null } : null,
        badgeStatus: input.badgeStatus ?? null,
        sectionScores: input.sections
            .filter((s) => s.dimension || s.name)
            .map((s) => ({
                dimension: s.dimension || null,
                title: s.name || null,
                score: s.score == null ? null : round1(Number(s.score)),
                maximum: s.maximumPoints ?? null,
            })),
        overallAnalysis: String(input.overallAnalysis || "").trim(),
        strengths: lines(input.strengths),
        areasToGrow: lines(input.areasToGrow),
        adminComment: String(input.adminComment || "").trim(),
    };
}

export function studentAnalysisFileName(reportId: string): string {
    return `CIEL_PK_Student_Report_Analysis_${String(reportId || "report").replace(/[^a-z0-9_-]/gi, "_")}.json`;
}
