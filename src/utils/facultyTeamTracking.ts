/**
 * Faculty Community Service project cards: the tracking API returns one row per seat, so a team of
 * five arrives as five rows. Rows of the same team on the same project fold into one card that
 * lists every member's hours; individual seats stay one card each. Rows without a `team_id`
 * (older backend) are left as they are.
 */

export type TeamTrackingRow = {
    id: string;
    project_id?: string;
    team_id?: string | null;
    is_team_lead?: boolean;
    participation_type?: string;
    student_name: string;
    student_email?: string;
    report_id?: string | null;
    hours?: number;
    required_hours?: number;
    hours_progress_pct?: number;
    updated_at?: string;
    last_activity_at?: string;
    member_hours?: Array<{ name: string; hours: number; required: number }>;
    team_members?: Array<{ name: string; email?: string; lead?: boolean }>;
};

function latest(values: Array<string | undefined>): string | undefined {
    let best: string | undefined;
    let bestTime = -Infinity;
    for (const v of values) {
        const t = v ? new Date(v).getTime() : NaN;
        if (Number.isFinite(t) && t > bestTime) {
            best = v;
            bestTime = t;
        }
    }
    return best;
}

function memberPct(row: TeamTrackingRow): number {
    if (typeof row.hours_progress_pct === "number") return row.hours_progress_pct;
    const required = row.required_hours || 16;
    return required > 0 ? Math.min(100, Math.round(((row.hours || 0) / required) * 100)) : 0;
}

export function groupTeamTrackingRows<T extends TeamTrackingRow>(rows: T[]): T[] {
    const groups = new Map<string, T[]>();
    const order: Array<T | string> = [];
    for (const row of rows) {
        const team = String(row.team_id || "").trim();
        if (!team) {
            order.push(row);
            continue;
        }
        const key = `${row.project_id || ""}::${team}`;
        const list = groups.get(key);
        if (list) list.push(row);
        else {
            groups.set(key, [row]);
            order.push(key);
        }
    }
    return order.flatMap((entry): T[] => {
        if (typeof entry !== "string") return [entry];
        const all = groups.get(entry)!;
        if (all.length === 1) return all;
        // Lead first; the card's report and status come from the seat that holds the team report.
        const ordered = [...all].sort((a, b) => Number(b.is_team_lead === true) - Number(a.is_team_lead === true));
        const base = ordered.find((m) => String(m.report_id || "").trim()) ?? ordered[0];
        // A member with a report of their own keeps their own card, so that report stays reachable.
        const ownReport = (m: T) => m !== base && Boolean(String(m.report_id || "").trim()) && m.report_id !== base.report_id;
        const separate = ordered.filter(ownReport);
        const sorted = ordered.filter((m) => !ownReport(m));
        if (sorted.length === 1) return [base, ...separate];
        const updated = latest(sorted.map((m) => m.updated_at));
        const lastActivity = latest(sorted.map((m) => m.last_activity_at));
        const merged: T = {
            ...base,
            participation_type: "team",
            // The team is complete only when every member has met the minimum.
            hours_progress_pct: Math.min(...sorted.map(memberPct)),
            ...(updated ? { updated_at: updated } : {}),
            ...(lastActivity ? { last_activity_at: lastActivity } : {}),
            member_hours: sorted.flatMap((m) =>
                m.member_hours && m.member_hours.length
                    ? m.member_hours
                    : [{ name: m.student_name || "Student", hours: m.hours || 0, required: m.required_hours || 16 }],
            ),
            team_members: sorted.map((m) => ({ name: m.student_name || "Student", email: m.student_email, lead: m.is_team_lead === true })),
        };
        return [merged, ...separate];
    });
}
