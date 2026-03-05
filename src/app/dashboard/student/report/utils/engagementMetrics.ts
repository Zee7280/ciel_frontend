/**
 * Engagement Metrics Utility
 * Logic for calculating EIS and HEC compliance benchmarking
 */

export interface AttendanceLog {
    date: string;
    hours: number;
    evidence_file?: any;
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
}

export function calculateEngagementMetrics(logs: AttendanceLog[]): CalculatedMetrics {
    if (!logs || logs.length === 0) {
        return {
            total_verified_hours: 0,
            total_active_days: 0,
            engagement_span: 0,
            attendance_frequency: 0,
            weekly_continuity: 0,
            eis_score: 0,
            engagement_category: 'Introductory Engagement',
            hec_compliance: 'below'
        };
    }

    // 1. Total Hours
    const totalHours = logs.reduce((sum, log) => sum + (Number(log.hours) || 0), 0);

    // 2. Active Days
    const uniqueDays = new Set(logs.map(log => log.date)).size;

    // 3. Engagement Span
    const dates = logs.map(log => new Date(log.date).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const spanMs = maxDate - minDate;
    const spanDays = Math.ceil(spanMs / (1000 * 60 * 60 * 24)) + 1; // +1 to include first day
    const spanWeeks = Math.max(1, spanDays / 7);

    // 4. Frequency
    const frequency = Number((uniqueDays / spanWeeks).toFixed(1));

    // 5. Weekly Continuity
    const weeksWithVisits = new Set();
    logs.forEach(log => {
        const d = new Date(log.date);
        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const weekNum = Math.ceil((((d.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getDay() + 1) / 7);
        weeksWithVisits.add(`${d.getFullYear()}-W${weekNum}`);
    });
    const continuity = Math.min(100, Math.round((weeksWithVisits.size / Math.ceil(spanWeeks)) * 100));

    // 6. Evidence Ratio
    const logsWithEvidence = logs.filter(l => l.evidence_file).length;
    const evidenceRatio = logs.length > 0 ? (logsWithEvidence / logs.length) * 100 : 0;

    // 7. EIS Score (0-100)
    // Hours (40%) - Target 48 hours
    const hourComponent = Math.min(40, (totalHours / 48) * 40);
    // Continuity (20%)
    const continuityComponent = (continuity / 100) * 20;
    // Span (15%) - Target 12 weeks
    const spanComponent = Math.min(15, (spanWeeks / 12) * 15);
    // Frequency (15%) - Target 3 visits per week
    const frequencyComponent = Math.min(15, (frequency / 3) * 15);
    // Evidence (10%)
    const evidenceComponent = (evidenceRatio / 100) * 10;

    const eis = Math.round(hourComponent + continuityComponent + spanComponent + frequencyComponent + evidenceComponent);

    // 8. Category
    let category = 'Introductory Engagement';
    if (eis >= 80) category = 'High-Intensity Engagement';
    else if (eis >= 60) category = 'Sustained Engagement';
    else if (eis >= 40) category = 'Structured Engagement';

    // 9. HEC Compliance
    let hec: 'below' | 'recognized' | 'advanced' | 'full' = 'below';
    if (totalHours >= 48) hec = 'full';
    else if (totalHours >= 32) hec = 'advanced';
    else if (totalHours >= 16) hec = 'recognized';

    return {
        total_verified_hours: Number(totalHours.toFixed(1)),
        total_active_days: uniqueDays,
        engagement_span: spanDays,
        attendance_frequency: frequency,
        weekly_continuity: continuity,
        eis_score: eis,
        engagement_category: category,
        hec_compliance: hec
    };
}
