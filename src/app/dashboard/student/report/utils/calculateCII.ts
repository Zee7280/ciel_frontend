import { ReportData } from '../context/ReportContext';
import { calculateSection1CII } from '@/utils/reportQuality';

export interface CIIResult {
    totalScore: number;
    level: string;
    breakdown: {
        participation: number; // Max 10
        context: number;       // Max 10
        sdg: number;           // Max 10
        outputs: number;       // Max 15
        outcomes: number;      // Max 20
        resources: number;     // Max 7
        partnerships: number;  // Max 7
        evidence: number;      // Max 12
        learning: number;      // Max 4
        sustainability: number;// Max 5
    };
    suggestions: string[];
}

export function calculateCII(data: ReportData): CIIResult {
    const suggestions: string[] = [];

    // --- 1. Participation & Engagement (Max 10) ---
    const lead = data.section1?.team_lead || {};
    
    const section1Result = calculateSection1CII({
        participationMode: data.section1?.participation_type || 'individual',
        leadProfile: {
            name: lead.name || '',
            cnic: lead.cnic || '',
            mobile: lead.mobile || '',
            university: lead.university || '',
            degree: lead.degree || '',
            year: lead.year || '',
            verified: !!lead.verified
        },
        attendanceLogs: data.section1?.attendance_logs || [],
        studentVerifiedHours: data.section1?.metrics?.total_verified_hours || 0,
        requiredHours: (data as any).requiredHoursPerStudent || data.required_hours || 16,
        studentActiveDays: data.section1?.metrics?.total_active_days || 0,
        studentEngagementSpan: data.section1?.metrics?.engagement_span || 0,
        teamSize: data.section1?.team_members?.length ? data.section1.team_members.length + 1 : 1,
        totalVerifiedTeamHours: (data.section1?.team_members?.reduce((sum, member) => sum + (parseFloat(member.hours) || 0), 0) || 0) + (parseFloat(data.section1?.team_lead?.hours) || 0),
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

    if (participation < 8) {
        suggestions.push("Ensure identity is verified and attendance hours meet the 16-hour goal.");
    }

    // --- 2. Project Context & Academic Alignment (Max 10) ---
    if ((data.section2 as any)?.baseline_evidence?.length > 0 && data.section2?.discipline_contribution?.length > 50) {
        context = 10; // Evidence-based
    } else if (data.section2?.problem_statement?.length > 100) {
        context = 7; // Detailed problem
    } else if (data.section2?.problem_statement?.length > 50) {
        context = 4; // Clear problem
    } else {
        context = 2; // Weak baseline
    }

    // --- 3. SDG Alignment Strength (Max 10) ---
    const primarySDG = data.section3?.primary_sdg?.goal_number;
    const hasIntent = data.section3?.contribution_intent_statement?.length > 100;
    const validationStatus = data.section3?.validation_status;

    if (primarySDG && hasIntent && validationStatus === 'validated') {
        sdg = 10;
    } else if (primarySDG && hasIntent) {
        sdg = 8;
    } else if (primarySDG) {
        sdg = 4;
    }

    // --- 4. Activities & Outputs (Max 15) ---
    const sessions = (data.section4?.activity_blocks || []).reduce((acc: number, b: any) => acc + (parseInt(b.sessions_count, 10) || 0), 0);
    if (sessions >= 8) outputs = 15;
    else if (sessions >= 5) outputs = 12;
    else if (sessions >= 3) outputs = 8;
    else if (sessions > 0) outputs = 4;

    // --- 5. Outcomes & Measurable Change (Max 20) ---
    const hasBaseline = data.section5?.measurable_outcomes?.some(o => o.baseline && o.endline);
    const hasConfidence = data.section5?.measurable_outcomes?.some(o => 
        o.confidence_level?.includes('Directly Measured') || 
        o.confidence_level?.includes('Partner Confirmed')
    );

    if (hasBaseline && hasConfidence) outcomes = 20; 
    else if (hasBaseline) outcomes = 15;
    else if (data.section5?.observed_change?.length > 100) outcomes = 10;
    else outcomes = 5;

    // --- 6. Resources Mobilized (Max 7) ---
    const resourceCount = data.section6?.resources?.length || 0;
    const useResources = data.section6?.use_resources;

    if (useResources === 'yes') {
        if (resourceCount >= 3) resources = 7;
        else if (resourceCount === 2) resources = 5;
        else if (resourceCount === 1) resources = 3;
    } else {
        resources = 3; // Volunteer effort only
    }

    // --- 7. Partnerships & Collaboration (Max 7) ---
    const partnerCount = data.section7?.partners?.length || 0;
    const hasPartners = data.section7?.has_partners;

    if (hasPartners === 'yes') {
        if (partnerCount >= 3) partnerships = 7;
        else if (partnerCount === 2) partnerships = 5;
        else if (partnerCount === 1) partnerships = 3;
    } else {
        partnerships = 2; // No partner
    }

    // --- 8. Evidence & Verification (Max 12) ---
    const evidenceFiles = data.section8?.evidence_files?.length || 0;
    const partnerVerified = data.section8?.partner_verification;

    if (partnerVerified) evidence = 12;
    else if (evidenceFiles >= 5) evidence = 10;
    else if (evidenceFiles >= 3) evidence = 7;
    else evidence = 3;

    // --- 9. Learning & Competency (Max 4) ---
    const academicRef = data.section9?.academic_integration?.length || 0;
    const personalRef = data.section9?.personal_learning?.length || 0;

    if (academicRef > 150 && personalRef > 150) learning = 4;
    else if (academicRef > 50 || personalRef > 50) learning = 2;
    else learning = 1;

    // --- 10. Sustainability (Max 5) ---
    const continuation = data.section10?.continuation_status;
    if (continuation === 'yes') sustainability = 5;
    else if (continuation === 'partially') sustainability = 3;
    else sustainability = 1;

    // --- Calculate Total ---
    const totalScore = participation + context + sdg + outputs + outcomes + resources + partnerships + evidence + learning + sustainability;

    // --- Determine Level ---
    let level = "Introductory Engagement";
    if (totalScore >= 91) level = "Transformational Engagement";
    else if (totalScore >= 76) level = "High Impact Engagement";
    else if (totalScore >= 61) level = "Sustained Engagement";
    else if (totalScore >= 41) level = "Structured Engagement";
    else if (totalScore >= 20) level = "Standard Engagement";

    // Limit suggestions to top 3
    const finalSuggestions = suggestions.slice(0, 3);
    if (finalSuggestions.length === 0 && totalScore < 90) {
        finalSuggestions.push("Review technical documentation in Sections 5 and 8 to boost verification score.");
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
