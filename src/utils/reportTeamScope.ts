/**
 * Scopes project roster rows to the current student's team so multiple applications
 * on the same opportunity (individual vs different teams) do not leak into Section 1
 * or certificate / dossier payloads.
 */

import { authenticatedFetch } from "@/utils/api";

export function pickTeamIdFromRecord(rec: unknown): string {
    if (!rec || typeof rec !== "object") return "";
    const o = rec as Record<string, unknown>;
    const v = o.teamId ?? o.team_id;
    if (typeof v === "string") return v.trim();
    if (v != null && (typeof v === "number" || typeof v === "boolean")) return String(v).trim();
    return "";
}

type ReportTeamRow = Record<string, unknown>;

export function mapProjectTeamRowsForReport(teamRows: unknown[], myParticipantId: string): ReportTeamRow[] {
    if (!Array.isArray(teamRows) || !myParticipantId) return [];
    return teamRows
        .filter((m: unknown) => {
            if (!m || typeof m !== "object") return false;
            const row = m as { id?: unknown; participantId?: unknown };
            const ids = [row.id, row.participantId].filter((v): v is string => typeof v === "string" && v.length > 0);
            return ids.length > 0 && !ids.includes(myParticipantId);
        })
        .map((m: unknown) => {
            const row = m as ReportTeamRow;
            return {
                ...row,
                verified: true,
                name: row.fullName || row.name,
                university: row.universityName || row.university,
            };
        });
}

export type ScopedTeamResult = {
    team_members: ReportTeamRow[];
    participation_type: "individual" | "team";
};

/**
 * @param participant — row from `/api/v1/engagement/my` for this project
 * @param teamRows — rows from `/api/v1/engagement/project/:projectId/team`
 */
export function resolveScopedTeamMembers(participant: unknown, teamRows: unknown[]): ScopedTeamResult {
    const p = participant as Record<string, unknown> | null;
    const myIdRaw = p?.id;
    const myId = typeof myIdRaw === "string" ? myIdRaw : myIdRaw != null ? String(myIdRaw) : "";
    if (!myId) {
        return { team_members: [], participation_type: "individual" };
    }

    const matchedTeamRow = Array.isArray(teamRows)
        ? teamRows.find((row) => {
            if (!row || typeof row !== "object") return false;
            const o = row as Record<string, unknown>;
            const rowIds = [o.id, o.participantId].map((v) => (v == null ? "" : String(v)));
            const rowEmail = typeof o.email === "string" ? o.email.trim().toLowerCase() : "";
            const myEmail = typeof p?.email === "string" ? p.email.trim().toLowerCase() : "";
            return rowIds.includes(myId) || (!!rowEmail && rowEmail === myEmail);
        })
        : undefined;
    const myTeamId = pickTeamIdFromRecord(participant) || pickTeamIdFromRecord(matchedTeamRow);
    const base = mapProjectTeamRowsForReport(teamRows, myId);

    if (!myTeamId) {
        return {
            team_members: base,
            participation_type: base.length > 0 ? "team" : "individual",
        };
    }

    const filtered = base.filter((m) => pickTeamIdFromRecord(m) === myTeamId);
    if (filtered.length > 0) {
        return { team_members: filtered, participation_type: "team" };
    }

    const anyRowTagged = base.some((m) => pickTeamIdFromRecord(m));
    if (anyRowTagged) {
        return { team_members: [], participation_type: "individual" };
    }

    return {
        team_members: base,
        participation_type: base.length > 0 ? "team" : "individual",
    };
}

export function mergeReportSection1TeamScope(
    report: Record<string, unknown>,
    participant: unknown,
    teamRows: unknown[],
): Record<string, unknown> {
    const section1 = { ...((report.section1 as Record<string, unknown> | undefined) || {}) };
    const { team_members, participation_type } = resolveScopedTeamMembers(participant, teamRows);
    return {
        ...report,
        section1: {
            ...section1,
            team_members,
            participation_type,
        },
    };
}

function pickProjectIdFromReport(report: Record<string, unknown>): string {
    const nestedProject =
        report["project"] && typeof report["project"] === "object"
            ? (report["project"] as Record<string, unknown>)
            : undefined;
    const cand = [
        report.project_id,
        report.projectId,
        (report.opportunity as Record<string, unknown> | undefined)?.id,
        (report.opportunity as Record<string, unknown> | undefined)?.project_id,
        (report.opportunity as Record<string, unknown> | undefined)?.projectId,
        report.opportunity_id,
        nestedProject?.id,
    ];
    for (const c of cand) {
        if (typeof c === "string" && c.trim()) return c.trim();
        if (c != null && String(c).trim()) return String(c).trim();
    }
    return "";
}

/** When lead + teammates carry the same embedded `team_id`, drop other teams without calling the engagement API. */
export function scopeTeamMembersByEmbeddedTeamId(section1: Record<string, unknown>): unknown[] | null {
    const raw = section1.team_members;
    if (!Array.isArray(raw) || raw.length === 0) return null;
    const lead = section1.team_lead as Record<string, unknown> | undefined;
    const leadTid = pickTeamIdFromRecord(lead);
    if (!leadTid) return null;

    let anyMemberTagged = false;
    for (const m of raw) {
        if (m && typeof m === "object" && pickTeamIdFromRecord(m as Record<string, unknown>)) {
            anyMemberTagged = true;
            break;
        }
    }
    if (!anyMemberTagged) return null;

    const filtered = raw.filter((m) => {
        if (!m || typeof m !== "object") return false;
        return pickTeamIdFromRecord(m as Record<string, unknown>) === leadTid;
    });
    return filtered.length > 0 ? filtered : null;
}

/** Same merge as student report load: scope roster to the author’s engagement team for dossier / verify UIs. */
export async function applyEngagementTeamScopeToReport(report: Record<string, unknown>): Promise<Record<string, unknown>> {
    const section1 = (report.section1 as Record<string, unknown> | undefined) || {};
    const sync = scopeTeamMembersByEmbeddedTeamId(section1);
    if (sync) {
        return {
            ...report,
            section1: {
                ...section1,
                team_members: sync,
            },
        };
    }

    const projectId = pickProjectIdFromReport(report);
    if (!projectId) return report;

    const student = report.student as Record<string, unknown> | undefined;
    const lead = section1.team_lead as Record<string, unknown> | undefined;
    const emails = [
        typeof student?.email === "string" ? student.email.trim().toLowerCase() : "",
        typeof lead?.email === "string" ? String(lead.email).trim().toLowerCase() : "",
    ].filter(Boolean);

    try {
        const teamRes = await authenticatedFetch(`/api/v1/engagement/project/${encodeURIComponent(projectId)}/team`);
        if (!teamRes?.ok) return report;
        const teamJson = (await teamRes.json().catch(() => ({}))) as { success?: boolean; data?: unknown[] };
        const teamRows = teamJson.success && Array.isArray(teamJson.data) ? teamJson.data : [];

        let participant: Record<string, unknown> | null = null;
        for (const em of emails) {
            for (const row of teamRows) {
                if (!row || typeof row !== "object") continue;
                const o = row as Record<string, unknown>;
                const rowEm = typeof o.email === "string" ? o.email.trim().toLowerCase() : "";
                if (rowEm && rowEm === em) {
                    participant = o;
                    break;
                }
            }
            if (participant) break;
        }
        if (!participant) return report;

        return mergeReportSection1TeamScope(report, participant, teamRows);
    } catch {
        return report;
    }
}
