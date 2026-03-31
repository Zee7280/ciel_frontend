/**
 * Engagement Metrics Utility
 * Logic for calculating EIS and HEC compliance benchmarking
 */

export interface AttendanceLog {
    id?: string;
    date: string;
    hours: number;
    evidence_file?: any;
    participantId?: string;
}

export interface IndividualMetric {
    student_id: string;
    individual_hours: number;
    gateway_status: "ELIGIBLE" | "INCOMPLETE";
    completion_percentage: number;
    team_eis: number;
    bonus: number;
    final_score: number | null;
    band: string;
    final_status: string;
    evidence_status: string;
}

export interface CalculatedMetrics {
    total_verified_hours: number;
    total_active_days: number;
    engagement_span: number;
    attendance_frequency: number;
    weekly_continuity: number;
    eis_score: number;
    engagement_category: string;
    hec_compliance: 'below' | 'recognized' | 'advanced' | 'full';
    individual_metrics?: IndividualMetric[];
}

export function calculateEngagementMetrics(logs: AttendanceLog[], requiredHours: number = 16, teamSize: number = 1): CalculatedMetrics {
    if (!logs || logs.length === 0) {
        return {
            total_verified_hours: 0,
            total_active_days: 0,
            engagement_span: 0,
            attendance_frequency: 0,
            weekly_continuity: 0,
            eis_score: 0,
            engagement_category: 'Band A – Emerging Service Participant',
            hec_compliance: 'below',
            individual_metrics: []
        };
    }

    // 1. INPUT VARIABLES
    const RHS = requiredHours;
    const N = teamSize > 0 ? teamSize : 1;
    const projectGoal = RHS * N;
    
    const totalHours = logs.reduce((sum, log) => sum + (Number(log.hours) || 0), 0);
    const uniqueDays = new Set(logs.map(log => log.date)).size;

    const dates = logs.map(log => new Date(log.date).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const spanMs = maxDate - minDate;
    const spanDays = isFinite(spanMs) ? Math.ceil(spanMs / (1000 * 60 * 60 * 24)) + 1 : 0;
    const projectSpan = Math.max(1, spanDays / 7);

    const weeksWithVisits = new Set();
    logs.forEach(log => {
        const d = new Date(log.date);
        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const weekNum = Math.ceil((((d.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getDay() + 1) / 7);
        weeksWithVisits.add(`${d.getFullYear()}-W${weekNum}`);
    });
    const activeWeeks = weeksWithVisits.size;
    const avgFrequency = activeWeeks > 0 ? logs.length / activeWeeks : 0;

    // 2. TEAM EIS CALCULATION (MAX = 100)
    let hoursScore = 0;
    let continuityScore = 0;
    let spanScore = 0;
    let frequencyScore = 0;
    let teamEIS = 0;

    if (totalHours > 0) {
        hoursScore = Math.min(totalHours / projectGoal, 1) * 45;
        
        // ExpectedWeeks = system-derived or projectSpan or config default (fallback = 12 weeks)
        const expectedWeeks = Math.max(12, projectSpan); 
        continuityScore = Math.min(activeWeeks / expectedWeeks, 1) * 25;
        
        const expectedSpan = 12; // target logic 12 weeks
        spanScore = Math.min(projectSpan / expectedSpan, 1) * 15;
        
        const targetFrequency = 3; // 3 visits/week default
        frequencyScore = Math.min(avgFrequency / targetFrequency, 1) * 15;
        
        teamEIS = Math.round(hoursScore + continuityScore + spanScore + frequencyScore);
        if (teamEIS > 100) teamEIS = 100;
        
        // Edge cases
        if (activeWeeks === 0) continuityScore = 0;
        if (projectSpan === 0) spanScore = 0;
        if (avgFrequency === 0) frequencyScore = 0;
        if (totalHours === 0) teamEIS = 0;
    }

    // 3. INDIVIDUAL SCORE & BONUS
    const studentHoursMap: Record<string, number> = {};
    const studentEvidenceMap: Record<string, boolean> = {};
    logs.forEach(log => {
        const pId = log.participantId || 'unknown';
        studentHoursMap[pId] = (studentHoursMap[pId] || 0) + (Number(log.hours) || 0);
        if (log.evidence_file) studentEvidenceMap[pId] = true;
    });

    const individualMetrics: IndividualMetric[] = Object.keys(studentHoursMap).map(pId => {
        const ih = studentHoursMap[pId];
        const evidenceUploaded = studentEvidenceMap[pId] || false;
        
        let gateway: "ELIGIBLE" | "INCOMPLETE" = "ELIGIBLE";
        if (ih < RHS) gateway = "INCOMPLETE";

        let bonus = 0;
        if (gateway === "ELIGIBLE") {
            bonus = Math.min((ih - RHS) / RHS, 1) * 10;
        }

        let finalScore: number | null = null;
        let finalStatus = "";
        let band = "";

        if (gateway === "INCOMPLETE") {
            finalStatus = "INCOMPLETE";
            band = "Incomplete";
        } else {
            finalScore = Math.round(teamEIS + bonus);
            if (finalScore < 50) finalStatus = "LOW";
            else finalStatus = "COMPLETE";
            
            if (finalScore >= 80) band = "Band E – Transformative Community Impact Leader";
            else if (finalScore >= 60) band = "Band D – Impact Advancement Leader";
            else if (finalScore >= 40) band = "Band C – Structured Impact Contributor";
            else if (finalScore >= 20) band = "Band B – Developing Community Contributor";
            else band = "Band A – Emerging Service Participant";
        }

        return {
            student_id: pId,
            individual_hours: Number(ih.toFixed(1)),
            gateway_status: gateway,
            completion_percentage: Math.round(Math.min((ih / RHS) * 100, 100)),
            team_eis: teamEIS,
            bonus: Number(bonus.toFixed(1)),
            final_score: finalScore,
            band,
            final_status: finalStatus,
            evidence_status: evidenceUploaded ? "Compliant" : "Missing"
        };
    });

    // 4. Determine Display Category for the Team (using TeamEIS)
    let category = 'Band A – Emerging Service Participant';
    if (teamEIS >= 80) category = 'Band E – Transformative Community Impact Leader';
    else if (teamEIS >= 60) category = 'Band D – Impact Advancement Leader';
    else if (teamEIS >= 40) category = 'Band C – Structured Impact Contributor';
    else if (teamEIS >= 20) category = 'Band B – Developing Community Contributor';

    // 5. Overall HEC Compliance (mapped closely to teamEIS for UX)
    let hec: 'below' | 'recognized' | 'advanced' | 'full' = 'below';
    if (teamEIS >= 80) hec = 'full';
    else if (teamEIS >= 60) hec = 'advanced';
    else if (teamEIS >= 40) hec = 'recognized';

    return {
        total_verified_hours: Number(totalHours.toFixed(1)),
        total_active_days: uniqueDays,
        engagement_span: spanDays,
        attendance_frequency: Number(avgFrequency.toFixed(1)),
        weekly_continuity: activeWeeks > 0 ? Math.round((activeWeeks / Math.max(12, projectSpan)) * 100) : 0,
        eis_score: teamEIS,
        engagement_category: category,
        hec_compliance: hec,
        individual_metrics: individualMetrics
    };
}

