import { filterAttendanceLogsForVerifiedMetrics } from "@/utils/attendanceApprovalEligibility";

export interface QualityAlert {
    sectionId: string;
    message: string;
    severity: 'warning' | 'error';
}

function normStr(v: unknown): string {
    return typeof v === "string" ? v.trim() : "";
}

function extractUuidFromSyntheticStudentId(studentId: string): string | null {
    const m = studentId.match(/^member:\d+:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
    return m?.[1] ? m[1].toLowerCase() : null;
}

function resolveTeamMemberDisplayName(report: any, row: Record<string, unknown>): string {
    const synthetic = normStr(row.student_id);
    const uuidFromSynthetic = synthetic ? extractUuidFromSyntheticStudentId(synthetic) : null;

    const candidates = [
        normStr(row.studentId),
        normStr(row.student_id),
        uuidFromSynthetic || "",
    ].filter(Boolean);

    const members: any[] = Array.isArray(report?.section1?.team_members) ? report.section1.team_members : [];
    const lead: any = report?.section1?.team_lead;

    const scoreMatch = (m: any): number => {
        const ids = [
            normStr(m?.studentId),
            normStr(m?.student_id),
            normStr(m?.id),
            normStr(m?.applicationId),
        ].filter(Boolean);

        for (const c of candidates) {
            if (!c) continue;
            const cl = c.toLowerCase();
            for (const id of ids) {
                if (!id) continue;
                const il = id.toLowerCase();
                if (il === cl) return 100;
                if (il.includes(cl) || cl.includes(il)) return 80;
            }
        }
        return 0;
    };

    let best: any | null = null;
    let bestScore = 0;
    for (const m of members) {
        const s = scoreMatch(m);
        if (s > bestScore) {
            bestScore = s;
            best = m;
        }
    }

    const leadScore = lead ? scoreMatch(lead) : 0;
    if (leadScore > bestScore) {
        best = lead;
        bestScore = leadScore;
    }

    const pickName = (m: any) => normStr(m?.fullName) || normStr(m?.name);
    const pickEmail = (m: any) => normStr(m?.email);

    if (best && bestScore > 0) {
        const nm = pickName(best);
        const em = pickEmail(best);
        if (nm && em) return `${nm} (${em})`;
        if (nm) return nm;
        if (em) return em;
    }

    // Fall back to something human-readable (avoid showing synthetic member:idx:uuid if possible)
    if (uuidFromSynthetic) return `Team member (${uuidFromSynthetic})`;
    if (synthetic) return "Team member";
    return "Team member";
}

export const checkReportQuality = (report: any): QualityAlert[] => {
    const alerts: QualityAlert[] = [];

    // Section 1: engagement / attendance integrity flags (from stored metrics)
    const s1Metrics = report.section1?.metrics;
    const redFlags: unknown[] = Array.isArray(s1Metrics?.redFlags) ? s1Metrics.redFlags : [];
    for (const rf of redFlags) {
        const msg = typeof rf === "string" ? rf.trim() : "";
        if (!msg) continue;
        const lower = msg.toLowerCase();
        const severity: QualityAlert["severity"] =
            lower.includes("inflation") ||
            lower.includes("unrealistic") ||
            lower.includes("duplicate") ||
            lower.includes("suspicious") ||
            lower.includes("fraud")
                ? "error"
                : "warning";
        alerts.push({
            sectionId: "section1",
            message: msg,
            severity,
        });
    }
    if (s1Metrics?.isNonCompliant === true && redFlags.length === 0) {
        alerts.push({
            sectionId: "section1",
            message: "Participation metrics are marked non-compliant (no detailed red-flag text on file).",
            severity: "error",
        });
    }
    const individuals: unknown[] = Array.isArray(s1Metrics?.individual_metrics)
        ? s1Metrics.individual_metrics
        : [];
    for (const row of individuals) {
        if (!row || typeof row !== "object") continue;
        const r = row as Record<string, unknown>;
        const name = resolveTeamMemberDisplayName(report, r);
        const ev = typeof r.evidence_status === "string" ? r.evidence_status.trim() : "";
        if (ev.toLowerCase() === "missing") {
            alerts.push({
                sectionId: "section1",
                message: `${name}: engagement evidence status is Missing.`,
                severity: "warning",
            });
        }
    }

    // Section 2: Problem Statement
    if (!report.section2?.problem_statement || report.section2.problem_statement.length < 50) {
        alerts.push({
            sectionId: 'section2',
            message: 'Problem statement is too brief or missing. Needs more context.',
            severity: 'warning'
        });
    }

    // Section 4: Activities
    if (!report.section4?.activity_blocks || report.section4.activity_blocks.length === 0) {
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
    const hasEvidenceClaim =
        String(report.section8?.has_evidence || "")
            .toLowerCase()
            .trim() === "yes";
    if (hasEvidenceClaim && (!report.evidence_urls || report.evidence_urls.length === 0)) {
        alerts.push({
            sectionId: "section8",
            message: "Section 8 claims evidence, but no evidence_urls are attached — verify file upload pipeline.",
            severity: "error",
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
    leadProfile: {
        name: string;
        cnic: string;
        mobile: string;
        university: string;
        degree: string;
        year: string;
        verified: boolean;
    };
    attendanceLogs: any[];
    studentVerifiedHours: number;
    requiredHours: number;
    studentActiveDays: number;
    studentEngagementSpan: number;
    teamSize?: number; 
    totalVerifiedTeamHours?: number;
}

export interface Section1CIIResult {
    scores: {
        identity: number;    // Max 1.5
        academic: number;    // Max 1.5
        participation: number; // Max 1.0
        attendance: number;  // Max 2.0
        hours: number;       // Max 3.0
        bonus: number;       // Max 1.0 (Limited)
    };
    redFlags: string[];
    isNonCompliant: boolean;
    intensity: {
        volume: number;
        continuity: number;
        span: number;
        frequency: number;
    };
    finalScore: number;
    complianceStatus: 'non-compliant' | 'standard' | 'advanced' | 'transformational';
    justification: string;
}

export const calculateSection1CII = (input: Section1CIIInput): Section1CIIResult => {
    const {
        participationMode,
        leadProfile,
        attendanceLogs = [],
        studentVerifiedHours,
        requiredHours = 16,
        studentActiveDays,
        studentEngagementSpan,
        teamSize = 1,
        totalVerifiedTeamHours = 0
    } = input;

    const countedAttendanceLogs = filterAttendanceLogsForVerifiedMetrics(attendanceLogs as any[]);

    const redFlags: string[] = [];

    // --- 1. Identity Verification (Max 1.5) ---
    // Criteria: authentic, traceable, verified
    let identity = 0;
    if (leadProfile.verified) identity += 1.0;
    if (leadProfile.name && leadProfile.cnic && leadProfile.mobile) identity += 0.5;
    
    if (!leadProfile.verified) redFlags.push("Missing Admin Identity Verification");
    if (!leadProfile.cnic) redFlags.push("CNIC Traceability Gap");

    // --- 2. Academic Linkage (Max 1.5) ---
    // Criteria: Connection to institution, faculty, course
    let academic = 0;
    if (leadProfile.university) academic += 0.5;
    if (leadProfile.degree) academic += 0.5;
    if (leadProfile.year) academic += 0.5;

    if (!leadProfile.university || !leadProfile.degree) {
        redFlags.push("Weak Academic Institutional Linkage");
    }

    // --- 3. Participation Structure (Max 1.0) ---
    // Criteria: Individual vs team clarity, roles
    const participation = participationMode ? 1.0 : 0;

    // --- 4. Attendance Integrity (Max 2.0) ---
    // Criteria: consistency, logical progression, no inflation
    let attendance = 0;
    const sessions = countedAttendanceLogs.length;
    if (sessions >= 8) attendance = 2.0;
    else if (sessions >= 4) attendance = 1.0;
    else if (sessions > 0) attendance = 0.5;

    // RED FLAG CHECK: Inflation & Overlaps
    const hoursPerDay: Record<string, number> = {};
    countedAttendanceLogs.forEach(log => {
        const date = log.date;
        const h = parseFloat(log.hours) || 0;
        hoursPerDay[date] = (hoursPerDay[date] || 0) + h;
    });

    Object.entries(hoursPerDay).forEach(([date, hrs]) => {
        if (hrs > 8) redFlags.push(`Unrealistic daily output detected on ${date} (>8 hrs)`);
    });

    // Patterns (e.g., exact same time range repeated too many times)
    const patterns: Record<string, number> = {};
    countedAttendanceLogs.forEach(log => {
        const p = `${log.start_time}-${log.end_time}`;
        patterns[p] = (patterns[p] || 0) + 1;
    });
    if (Object.values(patterns).some(v => v > 6)) {
        redFlags.push("Duplicate attendance patterns detected (suspicious log frequency)");
    }

    // --- 5. Hours Compliance (Max 3.0) ---
    // Rule: Proportionally reduced if below RHS. Max 3.0 if meets or exceeds RHS.
    const ratio = Math.min(1.0, studentVerifiedHours / requiredHours);
    const hoursScore = 3.0 * ratio;

    // --- 6. Bonus Engagement (Max 2.0) ---
    // Rule: B = min(2, (Hs - RHS) / RHS * 2)
    let bonus = 0;
    if (studentVerifiedHours > requiredHours) {
        bonus = Math.min(2.0, ((studentVerifiedHours - requiredHours) / requiredHours) * 2.0);
    }

    const baseScore = identity + academic + participation + attendance + hoursScore + bonus;
    const finalScore = Math.min(10, baseScore);

    // Intensity Metrics (0-100%)
    const volume = Math.min(100, (studentVerifiedHours / requiredHours) * 100);
    const continuity = Math.min(100, (studentActiveDays / (studentEngagementSpan || 1)) * 100);
    const span = Math.min(100, (studentActiveDays / 15) * 100);
    const frequency = Math.min(100, (sessions / 10) * 100);

    let complianceStatus: Section1CIIResult['complianceStatus'] = 'standard';
    const isBelowRHS = studentVerifiedHours < requiredHours;
    const isNonCompliant = isBelowRHS || redFlags.length > 2;

    if (isNonCompliant) {
        complianceStatus = 'non-compliant';
    } else if (studentVerifiedHours >= requiredHours * 2) {
        complianceStatus = 'transformational';
    } else if (studentVerifiedHours >= requiredHours) {
        complianceStatus = 'advanced';
    }

    const justification = isBelowRHS 
        ? `Evaluation: ${finalScore.toFixed(1)}/10. STATUS: NOT ELIGIBLE FOR COMPLETION (Hrs < RHS).`
        : `Evaluation: ${finalScore.toFixed(1)}/10. Status: ${complianceStatus.toUpperCase()}. Flags: ${redFlags.length}. Bonus: +${bonus.toFixed(1)}.`;

    return {
        scores: { identity, academic, participation, attendance, hours: hoursScore, bonus },
        redFlags,
        isNonCompliant,
        intensity: { volume, continuity, span, frequency },
        finalScore,
        complianceStatus,
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
