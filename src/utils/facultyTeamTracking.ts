/**
 * Faculty Community Service project cards: the tracking API returns one row per seat, so a project
 * with five students arrives as five rows. Two steps:
 *  1. Seats of one team fold into one team row (lead first, every member's hours).
 *  2. On each project, every team / individual whose report is not submitted yet folds into one
 *     project card. A submitted report keeps its own card, so it stays reachable and its status
 *     (Submitted / Verified) never moves students who are still logging hours off the Active tab.
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
    status?: string;
    draft_locked?: boolean;
    sections_complete?: number;
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

function foldTeamSeats<T extends TeamTrackingRow>(rows: T[]): T[] {
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

/** Same rule as the card's "Open report" link: only a submitted (no longer draft) report opens. */
function hasOpenableReport(row: TeamTrackingRow): boolean {
    if (!String(row.report_id || "").trim() || row.draft_locked === true) return false;
    const status = String(row.status || "").trim().toLowerCase();
    return Boolean(status) && !["assigned", "draft", "continue"].includes(status);
}

export function groupTeamTrackingRows<T extends TeamTrackingRow>(rows: T[]): T[] {
    const units = foldTeamSeats(rows);
    const groups = new Map<string, T[]>();
    const order: Array<T | string> = [];
    for (const unit of units) {
        const project = String(unit.project_id || "").trim();
        if (!project || hasOpenableReport(unit)) {
            order.push(unit);
            continue;
        }
        const list = groups.get(project);
        if (list) list.push(unit);
        else {
            groups.set(project, [unit]);
            order.push(project);
        }
    }
    return order.flatMap((entry): T[] => {
        if (typeof entry !== "string") return [entry];
        const all = groups.get(entry)!;
        if (all.length === 1) return all;
        const base = [...all].sort((a, b) => Number(b.is_team_lead === true) - Number(a.is_team_lead === true))[0];
        const updated = latest(all.map((u) => u.updated_at));
        const lastActivity = latest(all.map((u) => u.last_activity_at));
        const merged: T = {
            ...base,
            // Several teams / individuals on one card: never labelled as a single team.
            participation_type: "individual",
            // One student's draft is not the project's report: the card shows hours, and each draft's
            // progress stays on the In progress tab.
            report_id: null,
            sections_complete: undefined,
            hours_progress_pct: Math.min(...all.map(memberPct)),
            ...(updated ? { updated_at: updated } : {}),
            ...(lastActivity ? { last_activity_at: lastActivity } : {}),
            member_hours: all.flatMap((u) =>
                u.member_hours && u.member_hours.length
                    ? u.member_hours
                    : [{ name: u.student_name || "Student", hours: u.hours || 0, required: u.required_hours || 16 }],
            ),
            team_members: all.flatMap(
                (u) => u.team_members ?? [{ name: u.student_name || "Student", email: u.student_email, lead: u.is_team_lead === true }],
            ),
        };
        return [merged];
    });
}
