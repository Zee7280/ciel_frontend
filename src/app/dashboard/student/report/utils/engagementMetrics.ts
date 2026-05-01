/**
 * Engagement Metrics Utility
 * Logic for calculating EIS and HEC compliance benchmarking
 */

import { filterAttendanceLogsForVerifiedMetrics } from "@/utils/attendanceApprovalEligibility";

export interface AttendanceLog {
    id?: string;
    date: string;
    hours?: number;
    start_time?: string;
    end_time?: string;
    startTime?: string;
    endTime?: string;
    evidence_file?: any;
    participantId?: string;
    /** Null/empty = legacy log (counted). Only `approved` counts otherwise — matches backend engagement metrics. */
    approval_status?: string | null;
    approvalStatus?: string | null;
}

function parseClockToMinutes(t: string | undefined): number | null {
    if (!t || typeof t !== "string") return null;
    const m = t.trim().match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

/** Same prefix/compare rules as Section1 participation — aligns log rows with roster cards. */
function engagementParticipantCompareKey(id: string | undefined | null): string {
    if (!id) return "";
    if (id.startsWith("lead:")) return id.slice("lead:".length);
    const m = /^member:\d+:(.+)$/.exec(id);
    if (m?.[1]) return m[1];
    return id;
}

function engagementParticipantIdsMatch(a: string | undefined | null, b: string | undefined | null): boolean {
    if (!a || !b) return false;
    if (a === b) return true;
    return engagementParticipantCompareKey(a) === engagementParticipantCompareKey(b);
}

/**
 * Roster IDs for team reports — must stay aligned with Section1 rawParticipants /
 * attendance log prefixed ids (`lead:…`, `member:idx:…`).
 */
export function buildIndividualRosterFromSection1(section1: {
    participation_type?: string;
    team_lead?: { id?: string | null };
    team_members?: Array<{ id?: string; participantId?: string; cnic?: string; email?: string }>;
}, leadParticipantId?: string | null): string[] | undefined {
    if (section1.participation_type !== "team") return undefined;
    const leadId = leadParticipantId ?? section1.team_lead?.id ?? null;
    if (!leadId) return undefined;
    const ids: string[] = [`lead:${leadId}`];
    (section1.team_members ?? []).forEach((m, idx) => {
        ids.push(`member:${idx}:${m?.id ?? m?.participantId ?? m?.cnic ?? m?.email ?? "anon"}`);
    });
    return ids;
}

/** Prefer stored `hours`; otherwise derive from start/end clock times on the same day. */
export function effectiveHoursFromLog(log: AttendanceLog): number {
    const direct = Number(log.hours);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const startRaw = log.start_time || log.startTime;
    const endRaw = log.end_time || log.endTime;
    const a = parseClockToMinutes(startRaw);
    const b = parseClockToMinutes(endRaw);
    if (a === null || b === null) return 0;
    let diffMin = b - a;
    if (diffMin < 0) diffMin += 24 * 60;
    const h = diffMin / 60;
    return Math.round(h * 10) / 10;
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
    /** Count of roster-attributed attendance rows (same basis as totals when team roster is applied). */
    verified_session_count: number;
    total_active_days: number;
    engagement_span: number;
    attendance_frequency: number;
    weekly_continuity: number;
    eis_score: number;
    engagement_category: string;
    hec_compliance: 'below' | 'recognized' | 'advanced' | 'full' | 'non-compliant';
    individual_metrics?: IndividualMetric[];
    redFlags?: string[];
    isNonCompliant?: boolean;
}

export function calculateEngagementMetrics(
    logs: AttendanceLog[], 
    requiredHours: number = 16, 
    teamSize: number = 1,
    leadProfile?: any,
    /** When set for team flows, splits hours strictly by roster participant (fixes merged "Team Lead" card). */
    individualRosterIds?: readonly string[],
): CalculatedMetrics {
    const redFlags: string[] = [];
    const countedLogs = filterAttendanceLogsForVerifiedMetrics(logs || []);

    if (!countedLogs || countedLogs.length === 0) {
        return {
            total_verified_hours: 0,
            verified_session_count: 0,
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

    const rosterIds =
        individualRosterIds && individualRosterIds.length > 0 ? individualRosterIds : null;
    /** Team flows: ignore bulk rows that cannot be attributed to current roster — they inflated totals vs individual cards. */
    const aggregateLogs = rosterIds
        ? countedLogs.filter((log) =>
              rosterIds.some((id) => engagementParticipantIdsMatch(log.participantId, id)),
          )
        : countedLogs;

    if (
        rosterIds &&
        countedLogs.length > aggregateLogs.length
    ) {
        const n = countedLogs.length - aggregateLogs.length;
        redFlags.push(
            `Excluded ${n} attendance row(s) not attributed to the current team roster (bulk API noise or stale participants).`,
        );
    }

    if (rosterIds && aggregateLogs.length === 0) {
        if (countedLogs.length > 0) {
            redFlags.push(
                "Team roster attribution: approved attendance rows did not match any current team member.",
            );
        }
        return {
            total_verified_hours: 0,
            verified_session_count: 0,
            total_active_days: 0,
            engagement_span: 0,
            attendance_frequency: 0,
            weekly_continuity: 0,
            eis_score: 0,
            engagement_category: "Band A – Emerging Service Participant",
            hec_compliance: "below",
            individual_metrics:
                rosterIds?.map((pId) => ({
                    student_id: pId,
                    individual_hours: 0,
                    gateway_status: "INCOMPLETE" as const,
                    completion_percentage: 0,
                    team_eis: 0,
                    bonus: 0,
                    final_score: null,
                    band: "Incomplete",
                    final_status: "INCOMPLETE",
                    evidence_status: "Missing",
                })) ?? [],
            redFlags,
        };
    }

    // 1. INPUT VARIABLES
    const RHS = requiredHours;
    const N = teamSize > 0 ? teamSize : 1;
    const projectGoal = RHS * N;
    
    const totalHours = aggregateLogs.reduce((sum, log) => sum + effectiveHoursFromLog(log), 0);
    const uniqueDays = new Set(aggregateLogs.map(log => log.date)).size;

    // --- AUDIT: Red Flag Detection ---
    const hoursPerDay: Record<string, number> = {};
    const patterns: Record<string, number> = {};
    
    aggregateLogs.forEach(log => {
        const h = effectiveHoursFromLog(log);
        hoursPerDay[log.date] = (hoursPerDay[log.date] || 0) + h;

        // Pattern detection (e.g., exact same hours or times)
        const p = `${effectiveHoursFromLog(log)}`;
        patterns[p] = (patterns[p] || 0) + 1;
    });

    Object.entries(hoursPerDay).forEach(([date, hrs]) => {
        if (hrs > 8) redFlags.push(`Inflation: Unrealistic daily output on ${date} (${hrs} hrs)`);
    });

    if (Object.values(patterns).some(v => v > 10)) {
        redFlags.push("Suspicious Pattern: Multiple identical duration logs detected");
    }

    // Identity/Academic Trace
    if (leadProfile) {
        if (!leadProfile.verified) redFlags.push("Admin Identity Verification Pending");
        if (!leadProfile.university || !leadProfile.degree) redFlags.push("Weak Academic Traceability");
        if (!leadProfile.cnic) redFlags.push("Missing National ID Attribution");
    }

    const dates = aggregateLogs.map(log => new Date(log.date).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const spanMs = maxDate - minDate;
    const spanDays = isFinite(spanMs) ? Math.ceil(spanMs / (1000 * 60 * 60 * 24)) + 1 : 0;
    const projectSpan = Math.max(1, spanDays / 7);

    const weeksWithVisits = new Set();
    aggregateLogs.forEach(log => {
        const d = new Date(log.date);
        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const weekNum = Math.ceil((((d.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getDay() + 1) / 7);
        weeksWithVisits.add(`${d.getFullYear()}-W${weekNum}`);
    });
    const activeWeeks = weeksWithVisits.size;
    const avgFrequency = activeWeeks > 0 ? aggregateLogs.length / activeWeeks : 0;

    // 2. TEAM EIS CALCULATION (MAX = 100)
    let hoursScore = 0;
    let continuityScore = 0;
    let spanScore = 0;
    let frequencyScore = 0;
    let teamEIS = 0;

    const ratio = Math.min(totalHours / projectGoal, 1);

    if (totalHours > 0) {
        hoursScore = ratio * 45;
        const expectedWeeks = Math.max(12, projectSpan); 
        continuityScore = Math.min(activeWeeks / expectedWeeks, 1) * 25;
        const expectedSpan = 12; 
        spanScore = Math.min(projectSpan / expectedSpan, 1) * 15;
        const targetFrequency = 3; 
        frequencyScore = Math.min(avgFrequency / targetFrequency, 1) * 15;
        
        teamEIS = Math.round(hoursScore + continuityScore + spanScore + frequencyScore);
    }

    // 3. INDIVIDUAL SCORE & BONUS
    const studentHoursMap: Record<string, number> = {};
    const studentEvidenceMap: Record<string, boolean> = {};

    const rosterForIndividuals = rosterIds;

    if (rosterForIndividuals) {
        for (const id of rosterForIndividuals) {
            studentHoursMap[id] = 0;
            studentEvidenceMap[id] = false;
        }
        aggregateLogs.forEach((log) => {
            const logPid = log.participantId;
            for (const rosterId of rosterForIndividuals) {
                if (engagementParticipantIdsMatch(logPid, rosterId)) {
                    studentHoursMap[rosterId] = (studentHoursMap[rosterId] ?? 0) + effectiveHoursFromLog(log);
                    if (log.evidence_file) studentEvidenceMap[rosterId] = true;
                    return;
                }
            }
        });
    } else {
        aggregateLogs.forEach(log => {
            const pId = log.participantId || "unknown";
            studentHoursMap[pId] = (studentHoursMap[pId] || 0) + effectiveHoursFromLog(log);
            if (log.evidence_file) studentEvidenceMap[pId] = true;
        });
    }

    const individualKeysOrdered = rosterForIndividuals ?? Object.keys(studentHoursMap);
    const individualMetrics: IndividualMetric[] = individualKeysOrdered.map((pId) => {
        const ih = studentHoursMap[pId] ?? 0;
        const evidenceUploaded = studentEvidenceMap[pId] || false;
        let gateway: "ELIGIBLE" | "INCOMPLETE" = ih < RHS ? "INCOMPLETE" : "ELIGIBLE";

        let bonus = 0;
        if (gateway === "ELIGIBLE" && redFlags.length === 0 && ih > RHS) {
            bonus = Math.min(2.0, ((ih - RHS) / RHS) * 2.0);
        }

        let finalScore: number | null = gateway === "INCOMPLETE" ? null : Math.round(teamEIS + (bonus * 5)); // Scaling bonus to EIS 100-point scale
        let finalStatus = gateway === "INCOMPLETE" ? "INCOMPLETE" : (finalScore! < 50 ? "LOW" : "COMPLETE");
        let band = "Incomplete";

        if (gateway === "ELIGIBLE" && finalScore !== null) {
            if (finalScore >= 80) band = "Band E – Transformative Community Impact Leader";
            else if (finalScore >= 60) band = "Band D – Impact Advancement Leader";
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

    // 4. Compliance & Status
    const isNonCompliant = ratio < 1.0 || redFlags.length > 0;
    
    let category = 'Band A – Emerging Service Participant';
    if (teamEIS >= 80) category = 'Band E – Transformative Community Impact Leader';
    else if (teamEIS >= 60) category = 'Band D – Impact Advancement Leader';
    else if (teamEIS >= 20) category = 'Band B – Developing Community Contributor';

    let hec: 'below' | 'recognized' | 'advanced' | 'full' | 'non-compliant' = 'below';
    if (isNonCompliant) hec = 'non-compliant';
    else if (teamEIS >= 80) hec = 'full';
    else if (teamEIS >= 60) hec = 'advanced';
    else if (teamEIS >= 40) hec = 'recognized';

    return {
        total_verified_hours: Number(totalHours.toFixed(1)),
        verified_session_count: aggregateLogs.length,
        total_active_days: uniqueDays,
        engagement_span: spanDays,
        attendance_frequency: Number(avgFrequency.toFixed(1)),
        weekly_continuity: activeWeeks > 0 ? Math.round((activeWeeks / Math.max(12, projectSpan)) * 100) : 0,
        eis_score: teamEIS,
        engagement_category: isNonCompliant ? "Non-Compliant Participation" : category,
        hec_compliance: hec,
        individual_metrics: individualMetrics,
        redFlags,
        isNonCompliant
    };
}

