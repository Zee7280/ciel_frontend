/**
 * Pure team-scoping helpers for the student report (no app imports, so they are unit-testable
 * under plain node). `reportTeamScope.ts` re-exports them and adds the app-bound merge helpers.
 */

export type ReportTeamRow = Record<string, unknown>;

export type ScopedTeamResult = {
    team_members: ReportTeamRow[];
    participation_type: "individual" | "team";
};

export function pickTeamIdFromRecord(rec: unknown): string {
    if (!rec || typeof rec !== "object") return "";
    const o = rec as Record<string, unknown>;
    const v = o.teamId ?? o.team_id;
    if (typeof v === "string") return v.trim();
    if (v != null && (typeof v === "number" || typeof v === "boolean")) return String(v).trim();
    return "";
}

function participantIdentityKey(row: Record<string, unknown>): string {
    const sid = row.studentId ?? row.student_id;
    if (typeof sid === "string" && sid.trim()) return `s:${sid.trim()}`;
    const em = typeof row.email === "string" ? row.email.trim().toLowerCase() : "";
    if (em) return `e:${em}`;
    return `id:${String(row.id ?? row.participantId ?? "").trim()}`;
}

/** Drop ghost seats: same person twice (lead row + duplicate member row) or duplicate email in roster. */
export function dedupeTeamMemberRowsForReport(
    members: ReportTeamRow[],
    teamRows: unknown[],
    leadHint?: Record<string, unknown> | null,
): ReportTeamRow[] {
    const leadEmails = new Set<string>();
    const leadIds = new Set<string>();
    const addLeadIdentity = (row: Record<string, unknown> | null | undefined) => {
        if (!row) return;
        const em = typeof row.email === "string" ? row.email.trim().toLowerCase() : "";
        if (em) leadEmails.add(em);
        const id = String(row.id ?? row.participantId ?? "").trim();
        if (id) leadIds.add(id);
    };
    addLeadIdentity(leadHint ?? null);
    for (const row of teamRows) {
        if (!row || typeof row !== "object") continue;
        const o = row as Record<string, unknown>;
        if (o.isTeamLead === true || o.is_team_lead === true) addLeadIdentity(o);
    }

    const seen = new Set<string>();
    const out: ReportTeamRow[] = [];
    for (const member of members) {
        const id = String(member.id ?? member.participantId ?? "").trim();
        const em = typeof member.email === "string" ? member.email.trim().toLowerCase() : "";
        if (id && leadIds.has(id)) continue;
        if (em && leadEmails.has(em)) continue;
        const key = participantIdentityKey(member);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(member);
    }
    return out;
}

/**
 * Map project `/team` rows for the student report editor's teammates list.
 * By default excludes the viewer's own participation id (the lead's own seat is `team_lead`, not a
 * member). Pass `includeSelf` for a non-lead viewer: their seat IS one of the team's member rows and
 * must stay in `team_members`, or their copy of the report reads as an individual record.
 */
export function mapProjectTeamRowsForReport(
    teamRows: unknown[],
    myParticipantId: string,
    opts: { includeSelf?: boolean } = {},
): ReportTeamRow[] {
    if (!Array.isArray(teamRows) || !myParticipantId) return [];
    return teamRows
        .filter((m: unknown) => {
            if (!m || typeof m !== "object") return false;
            const row = m as { id?: unknown; participantId?: unknown };
            const ids = [row.id, row.participantId].filter((v): v is string => typeof v === "string" && v.length > 0);
            return ids.length > 0 && (opts.includeSelf === true || !ids.includes(myParticipantId));
        })
        .map((m: unknown) => {
            const row = m as ReportTeamRow;
            const status = typeof row.status === "string" ? row.status : "";
            const approvedLike = ["approved", "verified", "accepted", "finalized"].includes(status);
            return {
                ...row,
                verified: row.verified === true || approvedLike,
                status: status || (row.verified === true ? "approved" : "pending_approval"),
                name: row.fullName || row.name,
                university: row.universityName || row.university,
            };
        });
}

/**
 * The viewer's team as the report editor should see it: lead in `team_lead` (handled by the caller),
 * every OTHER seat of the same team in `team_members`. For a teammate that includes their own seat.
 *
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
        ? (teamRows.find((row) => {
              if (!row || typeof row !== "object") return false;
              const o = row as Record<string, unknown>;
              const rowIds = [o.id, o.participantId].map((v) => (v == null ? "" : String(v)));
              const rowEmail = typeof o.email === "string" ? o.email.trim().toLowerCase() : "";
              const myEmail = typeof p?.email === "string" ? p.email.trim().toLowerCase() : "";
              return rowIds.includes(myId) || (!!rowEmail && rowEmail === myEmail);
          }) as Record<string, unknown> | undefined)
        : undefined;
    const myTeamId = pickTeamIdFromRecord(participant) || pickTeamIdFromRecord(matchedTeamRow);
    const viewerIsLead =
        p?.isTeamLead === true ||
        p?.is_team_lead === true ||
        matchedTeamRow?.isTeamLead === true ||
        matchedTeamRow?.is_team_lead === true;
    const leadHint =
        p?.isTeamLead === true || p?.is_team_lead === true
            ? (p as Record<string, unknown>)
            : (Array.isArray(teamRows)
                  ? (teamRows.find((row) => {
                        if (!row || typeof row !== "object") return false;
                        const o = row as Record<string, unknown>;
                        return o.isTeamLead === true || o.is_team_lead === true;
                    }) as Record<string, unknown> | undefined)
                  : undefined);
    // A teammate's own seat is a member row of the same team: keep it, so their copy of the report
    // shows lead + members (not "individual record" with the lead alone). The lead's own seat is the
    // `team_lead`, so it stays out of `team_members` (dedupe drops lead rows anyway). A viewer with
    // no OTHER lead on their team is a solo participant, whose own seat is never a "member".
    const myEmail = typeof p?.email === "string" ? p.email.trim().toLowerCase() : "";
    const hasOtherLeadOnMyTeam =
        !viewerIsLead &&
        Array.isArray(teamRows) &&
        teamRows.some((row) => {
            if (!row || typeof row !== "object") return false;
            const o = row as Record<string, unknown>;
            if (!(o.isTeamLead === true || o.is_team_lead === true)) return false;
            const rowIds = [o.id, o.participantId].map((v) => (v == null ? "" : String(v)));
            const rowEmail = typeof o.email === "string" ? o.email.trim().toLowerCase() : "";
            if (rowIds.includes(myId) || (!!rowEmail && rowEmail === myEmail)) return false;
            return pickTeamIdFromRecord(o) === myTeamId;
        });
    const base = dedupeTeamMemberRowsForReport(
        mapProjectTeamRowsForReport(teamRows, myId, { includeSelf: hasOtherLeadOnMyTeam }),
        teamRows,
        leadHint,
    );

    if (!myTeamId) {
        // Rows tagged with a team id belong to a formed team; an untagged viewer is not on it.
        const untagged = base.filter((m) => !pickTeamIdFromRecord(m));
        return {
            team_members: untagged,
            participation_type: untagged.length > 0 ? "team" : "individual",
        };
    }

    const filtered = dedupeTeamMemberRowsForReport(
        base.filter((m) => pickTeamIdFromRecord(m) === myTeamId),
        teamRows,
        leadHint,
    );
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
