/**
 * Scopes project roster rows to the current student's team so multiple applications
 * on the same opportunity (individual vs different teams) do not leak into Section 1
 * or certificate / dossier payloads.
 */

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
