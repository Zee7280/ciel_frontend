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

export interface Section2CIIInput {
    problemStatement: string;
    discipline: string;
    disciplineContribution: string;
    evidenceSources: string[];
    summaryText: string;
    otherEvidenceExplanation?: string;
}

export interface Section2CIIResult {
    identifiedElements: {
        problem: string;
        beneficiary: string;
        gap: string;
        justification: string;
    };
    problemValidity: number;
    evidenceStrength: number;
    academicApplication: number;
    framingIntegrity: number;
    finalScore: number;
    explanation: string;
}

export const calculateSection2CII = (input: Section2CIIInput): Section2CIIResult => {
    const {
        problemStatement = '',
        disciplineContribution = '',
        evidenceSources = [],
        summaryText = '',
        otherEvidenceExplanation = ''
    } = input;

    const lowerProblem = problemStatement.toLowerCase();
    const lowerDisc = disciplineContribution.toLowerCase();

    // STEP 1 — IDENTIFY BASELINE ELEMENTS
    const identifiedElements = {
        problem: "NOT CLEARLY IDENTIFIED",
        beneficiary: "NOT CLEARLY IDENTIFIED",
        gap: "NOT CLEARLY IDENTIFIED",
        justification: "NOT CLEARLY IDENTIFIED"
    };

    // 1. Problem Identified: specific issue/challenge
    if (problemStatement.length > 50 && !lowerProblem.includes("community faced challenges")) {
        identifiedElements.problem = problemStatement.split(/[.!?]/)[0].trim() + ".";
    }

    // 2. Beneficiary Group: who was affected
    const beneficiaryTerms = ["student", "youth", "child", "women", "community", "farmer", "patient", "people", "citizen", "elderly", "disabled", "local", "villager"];
    const foundBeneficiary = beneficiaryTerms.find(b => lowerProblem.includes(b));
    if (foundBeneficiary) {
        identifiedElements.beneficiary = foundBeneficiary.charAt(0).toUpperCase() + foundBeneficiary.slice(1) + " affected by identified issue.";
    }

    // 3. System Gap: what gap existed
    const gapTerms = ["lack", "awareness", "skill", "access", "infrastructure", "policy", "system", "shortage", "gap", "need"];
    const foundGap = gapTerms.find(g => lowerProblem.includes(g));
    if (foundGap) {
        identifiedElements.gap = "Identified " + foundGap + " as a core system deficiency.";
    }

    // 4. Justification: why intervention was necessary
    const justificationTerms = ["necessary", "required", "essential", "because", "due to", "intervention", "needed to"];
    if (justificationTerms.some(j => lowerProblem.includes(j))) {
        identifiedElements.justification = "Direct rationale for structured intervention identified.";
    }

    // STEP 2 — PROBLEM VALIDITY SCORE (0–2)
    const validityMatch = {
        problem: identifiedElements.problem !== "NOT CLEARLY IDENTIFIED",
        beneficiary: identifiedElements.beneficiary !== "NOT CLEARLY IDENTIFIED",
        gap: identifiedElements.gap !== "NOT CLEARLY IDENTIFIED",
        justification: identifiedElements.justification !== "NOT CLEARLY IDENTIFIED"
    };

    const identifiedCount = Object.values(validityMatch).filter(Boolean).length;
    let problemValidity = 0;
    if (identifiedCount === 4) problemValidity = 2;
    else if (identifiedCount === 3) problemValidity = 1;
    else if (identifiedCount >= 1) problemValidity = 0.5;

    // Generic statement override
    const isGeneric = [
        "people lacked awareness",
        "community faced challenges",
        "students needed help"
    ].some(g => lowerProblem.includes(g));

    if (isGeneric) {
        problemValidity = Math.min(problemValidity, 0.5);
    }

    // STEP 3 — EVIDENCE STRENGTH SCORE (0–1.5)
    const weights: Record<string, number> = {
        "government_data": 1.0,
        "academic_research": 1.0,
        "survey_data": 0.8,
        "partner_data": 0.8,
        "community_interviews": 0.6,
        "previous_projects": 0.6,
        "observation": 0.4
    };

    let totalWeight = 0;
    const sourceCount = evidenceSources.length;

    evidenceSources.forEach(src => {
        if (src === 'other') {
            let otherWeight = 0.4;
            if (otherEvidenceExplanation.length > 50) otherWeight = 0.8;
            else if (otherEvidenceExplanation.length > 20) otherWeight = 0.6;
            totalWeight += otherWeight;
        } else {
            totalWeight += (weights[src] || 0.4);
        }
    });

    let evidenceStrength = 0;
    if (sourceCount > 0) {
        const avgWeight = totalWeight / sourceCount;
        evidenceStrength = Number((avgWeight * 1.5).toFixed(1));
    }
    evidenceStrength = Math.min(evidenceStrength, 1.5);

    // STEP 4 — DISCIPLINE APPLICATION SCORE (0–1)
    let academicApplication = 0;
    const hasMethods = ["framework", "concept", "analytical", "method", "principle", "theory", "logic", "approach"].some(m => lowerDisc.includes(m));
    const hasApplication = lowerDisc.includes("applied") || lowerDisc.includes("use") || lowerDisc.includes("analyzed") || lowerDisc.includes("help");

    if (disciplineContribution.length >= 30 && hasMethods && hasApplication) {
        academicApplication = 1;
    } else if (disciplineContribution.length >= 15 && (hasMethods || hasApplication)) {
        academicApplication = 0.5;
    }

    // Generic statements override
    if (lowerDisc.includes("my degree helped me understand society") || disciplineContribution.length < 5) {
        academicApplication = 0;
    }

    // STEP 5 — BASELINE INTEGRITY SCORE (0–0.5)
    let framingIntegrity = 0.5;
    const lowerSummary = summaryText.toLowerCase();
    const outcomeTerms = ["improved", "increased", "reduced", "achieved", "successful", "resulted in"];
    const foundOutcomes = outcomeTerms.filter(t => lowerProblem.includes(t) || lowerSummary.includes(t));

    if (foundOutcomes.length >= 2) framingIntegrity = 0;
    else if (foundOutcomes.length === 1) framingIntegrity = 0.25;

    // STEP 6 — FINAL CII SCORE
    const finalScore = Number((problemValidity + evidenceStrength + academicApplication + framingIntegrity).toFixed(2));

    // Justification (Target 40–60 words)
    const justificationParts = [];
    if (identifiedCount === 4) justificationParts.push("The baseline is exceptionally well-defined with all core elements identified.");
    else justificationParts.push("The analysis misses some core baseline elements required for institutional verification.");

    if (evidenceStrength >= 1.2) justificationParts.push("Evidence is robust, drawing from institutional or primary research data.");
    else justificationParts.push("Evidence relies heavily on anecdotal observation, reducing the overall analytical strength.");

    if (academicApplication === 1) justificationParts.push("Disciplinary alignment shows high-level analytical application of academic frameworks.");
    else if (academicApplication === 0.5) justificationParts.push("Academic integration is present but remains at a partial level.");
    else justificationParts.push("Discipline contribution remains generic and fails to show analytical alignment.");

    if (framingIntegrity < 0.5) justificationParts.push("Use of outcome-oriented language slightly diluted the required pre-intervention focus of this section.");

    const explanation = justificationParts.join(" ");

    return {
        identifiedElements,
        problemValidity,
        evidenceStrength,
        academicApplication,
        framingIntegrity,
        finalScore,
        explanation
    };
};

export interface Section4CIIInput {
    activities: Array<{
        type: string;
        delivery_mode: string;
        sessions: string | number;
        type_other?: string;
    }>;
    outputs: Array<{
        type: string;
        count: string | number;
        other_label?: string;
    }>;
    primary_change_area: string;
    primary_change_area_others?: string[];
    beneficiary_categories: string[];
    total_beneficiaries: string | number;
    total_sessions: string | number;
    delivery_mode?: string;
    isTeam: boolean;
    team_contributions?: Array<{
        member_id: string;
        name: string;
        role: string;
        hours: string | number;
        sessions: string | number;
        beneficiaries: string | number;
    }>;
    engagementProfile: {
        totalVerifiedStudentHours: number;
        numContributors: number;
        avgHoursPerContributor: number;
    };
    section3Intent: string;
}

export interface Section4CIIResult {
    activityProfile: {
        mainActivityTypes: string[];
        deliveryMode: string;
        totalSessions: number;
        primaryChangeArea: string;
    };
    outputProfile: {
        distinctOutputCategoriesCount: number;
        totalBeneficiariesReached: number;
        otherEntriesNotes: string;
    };
    scores: {
        implementationScale: number;
        outputDiversity: number;
        beneficiaryReach: number;
        activityStructureQuality: number;
        alignmentConsistency: number;
        outputCredibility: number;
    };
    finalScore: number;
    qualityLevel: 'Minimal' | 'Moderate' | 'Strong' | 'Highly Structured';
    justification: string;
}

export const calculateSection4CII = (input: Section4CIIInput): Section4CIIResult => {
    const {
        activities = [],
        outputs = [],
        primary_change_area = '',
        primary_change_area_others = [],
        beneficiary_categories = [],
        total_beneficiaries = 0,
        total_sessions = 0,
        delivery_mode = '',
        isTeam = false,
        team_contributions = [],
        engagementProfile,
        section3Intent = ''
    } = input;

    const sessionsCount = Number(total_sessions) || 0;
    const beneficiariesCount = Number(total_beneficiaries) || 0;

    // STEP 1 — IMPLEMENTATION SCALE (0–4)
    let implementationScale = 0;
    if (sessionsCount >= 8) implementationScale = 4;
    else if (sessionsCount >= 5) implementationScale = 3;
    else if (sessionsCount >= 3) implementationScale = 2;
    else if (sessionsCount >= 1) implementationScale = 1;

    // STEP 2 — OUTPUT DIVERSITY (0–3)
    const validOutputCategories = [
        "People trained", "People reached", "Households supported", "Sessions conducted",
        "Services delivered", "Referrals facilitated", "Packs / Kits distributed",
        "Materials distributed", "Infrastructure improved / created",
        "Digital tool / system developed", "Surveys / Assessments conducted",
        "Reports / Policy briefs prepared", "Funds / Resources mobilized",
        "Partnerships activated", "Policy / Advocacy actions completed"
    ];

    const distinctCategories = new Set<string>();
    outputs.forEach(out => {
        if (validOutputCategories.includes(out.type)) {
            distinctCategories.add(out.type);
        } else if (out.type === 'Other' && out.other_label && out.other_label.trim().length > 10) {
            // Semantic classification logic (basic)
            const label = out.other_label.toLowerCase();
            if (label.includes("train") || label.includes("workshop") || label.includes("teach")) distinctCategories.add("People trained");
            else if (label.includes("reach") || label.includes("aware")) distinctCategories.add("People reached");
            else if (label.includes("kit") || label.includes("distrib") || label.includes("pack")) distinctCategories.add("Packs / Kits distributed");
            else distinctCategories.add("Other Valid Output");
        }
    });

    let outputDiversity = 0;
    if (distinctCategories.size >= 3) outputDiversity = 3;
    else if (distinctCategories.size === 2) outputDiversity = 2;
    else if (distinctCategories.size === 1) outputDiversity = 1;

    // STEP 3 — BENEFICIARY REACH (0–3)
    let beneficiaryReach = 0;
    if (beneficiariesCount >= 51) beneficiaryReach = 3;
    else if (beneficiariesCount >= 16) beneficiaryReach = 2;
    else if (beneficiariesCount >= 1) beneficiaryReach = 1;

    if (sessionsCount <= 2) {
        beneficiaryReach = Math.min(beneficiaryReach, 2);
    }

    // STEP 4 — ACTIVITY STRUCTURE QUALITY (0–2)
    let activityStructureQuality = 0;
    const activityTypesList = activities.map(a => a.type);
    const hasMultipleStages = activityTypesList.length >= 2;

    // Check for high structure patterns
    const hasTraining = activityTypesList.includes("Training / Workshop") || activityTypesList.includes("Mentoring / Coaching");
    const hasAssessment = activityTypesList.includes("Research / Survey / Assessment") || activityTypesList.includes("Monitoring & Evaluation");
    const hasDelivery = activityTypesList.includes("Service Delivery") || activityTypesList.includes("Resource Distribution");
    const hasDigital = activityTypesList.includes("Digital / Technology Development");

    const isMultiStage = (hasTraining && hasDelivery) || (hasAssessment && hasTraining) || (hasDigital && hasDelivery) || (hasAssessment && hasDelivery);

    if (sessionsCount >= 5 && isMultiStage) {
        activityStructureQuality = 2;
    } else if (sessionsCount >= 3 || hasMultipleStages) {
        activityStructureQuality = 1;
    }

    // STEP 5 — SDG / CHANGE-AREA ALIGNMENT CONSISTENCY (0–2)
    let alignmentConsistency = 1; // Default basic alignment
    const intentLower = section3Intent.toLowerCase();
    const areaLower = primary_change_area.toLowerCase();

    const activityMatch = activities.some(a => {
        const typeLower = a.type.toLowerCase();
        return intentLower.includes(typeLower.split(' ')[0]) || areaLower.includes(typeLower.split(' ')[0]);
    });

    if (intentLower.length > 50 && activityMatch && primary_change_area !== 'Other') {
        alignmentConsistency = 2;
    } else if (primary_change_area === 'Other' && (!primary_change_area_others || primary_change_area_others.length === 0)) {
        alignmentConsistency = 0;
    }

    // STEP 6 — OUTPUT CREDIBILITY (0–1)
    let outputCredibility = 1;
    const { totalVerifiedStudentHours, numContributors } = engagementProfile;

    // Credibility checks
    const tooManyBeneficiaries = beneficiariesCount > 200 && sessionsCount < 2;
    const tooManyOutputs = distinctCategories.size > 5 && totalVerifiedStudentHours < 10;

    let teamInconsistency = false;
    if (isTeam && team_contributions.length > 0) {
        const teamTotalBeneficiaries = team_contributions.reduce((acc, c) => acc + (Number(c.beneficiaries) || 0), 0);
        if (teamTotalBeneficiaries > beneficiariesCount * 1.5) { // Allowing some overlap but not massive inflation
            teamInconsistency = true;
        }
    }

    if (tooManyBeneficiaries || tooManyOutputs || teamInconsistency) {
        outputCredibility = 0;
    }

    // STEP 7 — FINAL SECTION 4 CII SCORE
    const finalScore = implementationScale + outputDiversity + beneficiaryReach + activityStructureQuality + alignmentConsistency + outputCredibility;

    // STEP 8 — QUALITY INTERPRETATION
    let qualityLevel: Section4CIIResult['qualityLevel'] = 'Minimal';
    if (finalScore >= 13) qualityLevel = 'Highly Structured';
    else if (finalScore >= 10) qualityLevel = 'Strong';
    else if (finalScore >= 6) qualityLevel = 'Moderate';

    // Justification (60-90 words)
    const justificationParts = [];
    if (implementationScale >= 3) justificationParts.push(`The project demonstrates significant implementation scale with ${sessionsCount} sessions conducted.`);
    else justificationParts.push(`Implementation scale is limited with only ${sessionsCount} sessions, which constrains the overall impact score.`);

    if (outputDiversity >= 2) justificationParts.push(`There is strong output diversity across ${distinctCategories.size} distinct categories.`);

    if (activityStructureQuality === 2) justificationParts.push("The activity structure is highly intentional and multi-staged, showing clear implementation logic.");
    else if (activityStructureQuality === 1) justificationParts.push("The activity structure is basic but reasonably organized.");

    if (outputCredibility === 1) justificationParts.push("Reported outputs appear plausible and align well with the verified student hours and team contributions.");
    else justificationParts.push("Some discrepancies were noted in output credibility relative to logged engagement hours.");

    if (alignmentConsistency === 2) justificationParts.push("Strong logical alignment is maintained between activities, outputs, and the declared change area.");

    let justification = justificationParts.join(" ");
    // Ensure word count is within 60-90 range (roughly)
    if (justification.split(' ').length < 60) {
        justification += " This structured approach ensures that the project's outputs are documented effectively for institutional verification, providing a solid foundation for evaluating long-term community benefits and SDG alignment in subsequent report sections.";
    }

    return {
        activityProfile: {
            mainActivityTypes: activities.map(a => a.type),
            deliveryMode: delivery_mode || (activities[0]?.delivery_mode || ''),
            totalSessions: sessionsCount,
            primaryChangeArea: primary_change_area
        },
        outputProfile: {
            distinctOutputCategoriesCount: distinctCategories.size,
            totalBeneficiariesReached: beneficiariesCount,
            otherEntriesNotes: outputs.filter(o => o.type === 'Other').map(o => o.other_label).join("; ")
        },
        scores: {
            implementationScale,
            outputDiversity,
            beneficiaryReach,
            activityStructureQuality,
            alignmentConsistency,
            outputCredibility
        },
        finalScore,
        qualityLevel,
        justification
    };
};
