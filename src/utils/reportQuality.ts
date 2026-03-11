export interface QualityAlert {
    sectionId: string;
    message: string;
    severity: 'warning' | 'error';
}

export const checkReportQuality = (report: any): QualityAlert[] => {
    const alerts: QualityAlert[] = [];

    // Section 2: Problem Statement
    if (!report.section2?.problem_statement || report.section2.problem_statement.length < 50) {
        alerts.push({
            sectionId: 'section2',
            message: 'Problem statement is too brief or missing. Needs more context.',
            severity: 'warning'
        });
    }

    // Section 4: Activities
    if (!report.section4?.activities || report.section4.activities.length === 0) {
        alerts.push({
            sectionId: 'section4',
            message: 'No core activities logged. Impact cannot be verified without activities.',
            severity: 'error'
        });
    }

    // Section 5: Outcomes
    if (!report.section5?.observed_change || report.section5.observed_change.length < 50) {
        alerts.push({
            sectionId: 'section5',
            message: 'Observed change description is weak. Ask for specific impact details.',
            severity: 'warning'
        });
    }

    // Section 8: Evidence
    if (!report.evidence_urls || report.evidence_urls.length === 0) {
        alerts.push({
            sectionId: 'section8',
            message: 'No evidence files (photos/PDFs) uploaded.',
            severity: 'warning'
        });
    }

    // Section 9: Reflection
    if (!report.section9?.personal_learning || report.section9.personal_learning.length < 100) {
        alerts.push({
            sectionId: 'section9',
            message: 'Reflection on personal learning is very short. Low depth detected.',
            severity: 'warning'
        });
    }

    return alerts;
};

export interface Section1CIIInput {
    participationMode: 'individual' | 'team';
    teamSize?: number; // if team
    totalVerifiedTeamHours?: number; // if team
    studentVerifiedHours: number;
    studentActiveDays: number;
    studentEngagementSpan: number;
    studentTotalSessions: number;
    studentSessionsWithEvidence: number;
}

export interface Section1CIIResult {
    studentBaseScore: number;
    expectedTeamHours: number;
    teamComplianceRatio: number;
    penaltyApplied: number;
    finalScore: number;
    justification: string;
}

export const calculateSection1CII = (input: Section1CIIInput): Section1CIIResult => {
    const {
        participationMode,
        teamSize = 1,
        totalVerifiedTeamHours = 0,
        studentVerifiedHours,
        studentActiveDays,
        studentEngagementSpan,
        studentTotalSessions,
        studentSessionsWithEvidence
    } = input;

    // Step 1 - Calculate Student Base Score

    // A. Participation Completion (0–5)
    let scoreA = 0;
    if (studentVerifiedHours >= 16) scoreA = 5;
    else if (studentVerifiedHours >= 12) scoreA = 3;
    else if (studentVerifiedHours >= 8) scoreA = 2;

    // B. Extended Engagement Bonus (0–4)
    let scoreB = 0;
    if (studentVerifiedHours > 16) {
        const cappedHours = Math.min(studentVerifiedHours, 48);
        const extraHours = cappedHours - 16;
        scoreB = (extraHours / 32) * 4;
    }

    // C. Attendance Consistency (0–3)
    let scoreC = 0;
    const consistencyRatio = studentEngagementSpan > 0 ? studentActiveDays / studentEngagementSpan : 0;
    if (consistencyRatio >= 0.60) scoreC = 3;
    else if (consistencyRatio >= 0.40) scoreC = 2;
    else if (consistencyRatio >= 0.20) scoreC = 1;

    // D. Evidence Strength (0–3)
    let scoreD = 0;
    const evidenceRatio = studentTotalSessions > 0 ? studentSessionsWithEvidence / studentTotalSessions : 0;
    if (evidenceRatio >= 0.70) scoreD = 3;
    else if (evidenceRatio >= 0.40) scoreD = 2;
    else if (evidenceRatio >= 0.10) scoreD = 1;

    const studentBaseScore = scoreA + scoreB + scoreC + scoreD;

    // Step 2 - Team Compliance
    let penalty = 0;
    let expectedTeamHours = 0;
    let teamComplianceRatio = 0;

    if (participationMode === 'team') {
        expectedTeamHours = teamSize * 16;
        teamComplianceRatio = expectedTeamHours > 0 ? totalVerifiedTeamHours / expectedTeamHours : 0;

        if (teamComplianceRatio >= 1.00) penalty = 0;
        else if (teamComplianceRatio >= 0.80) penalty = -1;
        else if (teamComplianceRatio >= 0.60) penalty = -2;
        else penalty = -3;
    }

    const finalScore = Math.max(0, studentBaseScore + penalty);

    // Short justification
    let justification = `Base score of ${studentBaseScore.toFixed(1)} calculated from participation (${scoreA}), bonus (${scoreB.toFixed(1)}), consistency (${scoreC}), and evidence (${scoreD}).`;
    if (participationMode === 'team') {
        if (penalty < 0) {
            justification += ` A penalty of ${penalty} was applied due to team compliance ratio of ${(teamComplianceRatio * 100).toFixed(0)}%.`;
        } else {
            justification += ` No team penalty applied (100%+ compliance).`;
        }
    }

    return {
        studentBaseScore: Number(studentBaseScore.toFixed(2)),
        expectedTeamHours,
        teamComplianceRatio: Number(teamComplianceRatio.toFixed(2)),
        penaltyApplied: penalty,
        finalScore: Number(finalScore.toFixed(2)),
        justification
    };
};
