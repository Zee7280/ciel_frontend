import { ReportData } from '../context/ReportContext';
import { calculateSection1CII } from '@/utils/reportQuality';

export interface CIIResult {
    totalScore: number;
    level: string;
    breakdown: {
        participation: number; // Max 15
        context: number;       // Max 5
        sdg: number;           // Max 5
        outputs: number;       // Max 15
        outcomes: number;      // Max 25
        resources: number;     // Max 5
        partnerships: number;  // Max 10
        evidence: number;      // Max 10
        learning: number;      // Max 5
        sustainability: number;// Max 5
    };
    suggestions: string[];
}

export function calculateCII(data: ReportData): CIIResult {
    const suggestions: string[] = [];

    // --- 1. Participation & Engagement (Max 15) ---
    const section1Result = calculateSection1CII({
        participationMode: data.section1?.participation_type || 'individual',
        teamSize: data.section1?.team_members?.length ? data.section1.team_members.length + 1 : 1,
        totalVerifiedTeamHours: data.section1?.team_members?.reduce((sum, member) => sum + (parseFloat(member.hours) || 0), 0) + (parseFloat(data.section1?.team_lead?.hours) || 0),
        studentVerifiedHours: data.section1?.metrics?.total_verified_hours || 0,
        studentActiveDays: data.section1?.metrics?.total_active_days || 0,
        studentEngagementSpan: data.section1?.metrics?.engagement_span || 0,
        studentTotalSessions: data.section1?.attendance_logs?.length || 0,
        studentSessionsWithEvidence: data.section1?.attendance_logs?.filter(log => log.evidence_file).length || 0
    });

    let participation = section1Result.finalScore;
    let context = 0;
    let sdg = 0;
    let outputs = 0;
    let outcomes = 0;
    let resources = 0;
    let partnerships = 0;
    let evidence = 0;
    let learning = 0;
    let sustainability = 0;

    if (participation < 11) {
        suggestions.push("Increase verified participation hours and evidence consistency to improve engagement score.");
    }
    if (section1Result.penaltyApplied < 0) {
        suggestions.push(`Team hours gap detected. Current team hours: ${section1Result.teamComplianceRatio * 100}%. Ensure all members log at least 16 hours.`);
    }

    // --- 2. Project Context & Academic Alignment (Max 5) ---
    if (data.section2?.baseline_evidence?.length > 0 && data.section2?.discipline_contribution?.length > 50) {
        context = 5; // Evidence-based
    } else if (data.section2?.problem_statement?.length > 50) {
        context = 3; // Clear problem
    } else {
        context = 1; // Weak baseline
    }

    // --- 3. SDG Alignment Strength (Max 5) ---
    const primarySDG = data.section3?.primary_sdg?.goal_number;
    const hasIntent = data.section3?.contribution_intent_statement?.length > 50;
    const validationStatus = data.section3?.validation_status;

    if (primarySDG && hasIntent && validationStatus === 'validated') {
        sdg = 5;
    } else if (primarySDG && hasIntent) {
        sdg = 4;
    } else if (primarySDG) {
        sdg = 2;
    }

    // --- 4. Activities & Outputs (Max 15) ---
    const sessions = parseInt(data.section4?.total_sessions || '0', 10) || 0;
    if (sessions >= 6) outputs = 15;
    else if (sessions >= 3) outputs = 10;
    else if (sessions > 0) outputs = 5;

    if (outputs < 15) {
        suggestions.push("Conduct more structured sessions to improve activities output.");
    }

    // --- 5. Outcomes & Measurable Change (Max 25) ---
    const hasBaseline = data.section5?.measurable_outcomes?.some(o => o.baseline && o.endline);
    const hasConfidence = data.section5?.measurable_outcomes?.some(o => o.confidence_level === 'high' || o.confidence_level === 'medium');

    // Simplified heuristic for demo context
    if (hasBaseline && hasConfidence) outcomes = 25; // Significant
    else if (hasBaseline) outcomes = 18; // Moderate
    else if (data.section5?.observed_change?.length > 50) outcomes = 12; // Small
    else outcomes = 5; // No measurable

    if (outcomes < 18) {
        suggestions.push("Ensure you measure clear baseline vs endline changes for your outcomes.");
    }

    // --- 6. Resources Mobilized (Max 5) ---
    const resourceCount = data.section6?.resources?.length || 0;
    const useResources = data.section6?.use_resources;

    if (useResources === 'yes') {
        if (resourceCount >= 3) resources = 5;
        else if (resourceCount === 2) resources = 4;
        else if (resourceCount === 1) resources = 3;
        else resources = 2;
    } else {
        resources = 2; // Volunteer effort only
    }

    // --- 7. Partnerships & Collaboration (Max 10) ---
    const partnerCount = data.section7?.partners?.length || 0;
    const hasPartners = data.section7?.has_partners;

    if (hasPartners === 'yes') {
        if (partnerCount >= 3) partnerships = 10;
        else if (partnerCount === 2) partnerships = 8;
        else if (partnerCount === 1) partnerships = 5;
        else partnerships = 2;
    } else {
        partnerships = 2; // No partner
    }

    if (partnerships < 5) {
        suggestions.push("Collaborate with external partners to boost sustainability and reach.");
    }

    // --- 8. Evidence & Verification (Max 10) ---
    const evidenceFiles = data.section8?.evidence_files?.length || 0;
    const partnerVerified = data.section8?.partner_verification;

    if (partnerVerified) evidence = 10;
    else if (evidenceFiles >= 3) evidence = 7;
    else evidence = 3;

    if (!partnerVerified) {
        suggestions.push("Obtain partner verification for your evidence to reach maximum credibility.");
    }

    // --- 9. Learning & Competency (Max 5) ---
    const academicRef = data.section9?.academic_integration?.length || 0;
    const personalRef = data.section9?.personal_learning?.length || 0;

    if (academicRef > 100 && personalRef > 100) learning = 5;
    else if (academicRef > 50 || personalRef > 50) learning = 3;
    else learning = 2;

    // --- 10. Sustainability (Max 5) ---
    const continuation = data.section10?.continuation_status;
    if (continuation === 'yes') sustainability = 5;
    else if (continuation === 'partially') sustainability = 3;
    else sustainability = 1;

    if (sustainability < 5) {
        suggestions.push("Develop stronger continuation and hand-over mechanisms for long-term impact.");
    }

    // --- Calculate Total ---
    const totalScore = participation + context + sdg + outputs + outcomes + resources + partnerships + evidence + learning + sustainability;

    // --- Determine Level ---
    let level = "Minimal Engagement";
    if (totalScore >= 91) level = "Transformational Engagement";
    else if (totalScore >= 76) level = "High Impact Engagement";
    else if (totalScore >= 61) level = "Sustained Engagement";
    else if (totalScore >= 41) level = "Structured Engagement";
    else if (totalScore >= 21) level = "Introductory Engagement";

    // Limit suggestions to top 3
    const finalSuggestions = suggestions.slice(0, 3);
    if (finalSuggestions.length === 0 && totalScore < 90) {
        finalSuggestions.push("Review all sections to ensure comprehensive documentation.");
    }

    return {
        totalScore,
        level,
        breakdown: {
            participation,
            context,
            sdg,
            outputs,
            outcomes,
            resources,
            partnerships,
            evidence,
            learning,
            sustainability
        },
        suggestions: finalSuggestions
    };
}
