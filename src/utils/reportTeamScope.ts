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
    const base = dedupeTeamMemberRowsForReport(
        mapProjectTeamRowsForReport(teamRows, myId),
        teamRows,
        leadHint,
    );

    if (!myTeamId) {
        return {
            team_members: base,
            participation_type: base.length > 0 ? "team" : "individual",
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

/** Full team roster for certificates — includes the viewer and uses live lead from enrollment. */
export function resolveScopedTeamRosterForCertificate(
    participant: unknown,
    teamRows: unknown[],
): ScopedTeamResult & { team_lead?: ReportTeamRow } {
    const p = participant as Record<string, unknown> | null;
    const myTeamId = pickTeamIdFromRecord(participant);
    const roster = Array.isArray(teamRows) ? teamRows : [];
    const scoped =
        myTeamId && roster.length > 0
            ? roster.filter((row) => pickTeamIdFromRecord(row) === myTeamId)
            : roster;
    const normalized = scoped.map((row) => normalizeParticipationRowForDossier(row));
    const leadRow =
        normalized.find((row) => row.isTeamLead === true) ??
        (p
            ? normalized.find((row) => {
                  const rowIds = [row.id, row.participantId].map((v) => (v == null ? "" : String(v)));
                  const myId = p.id == null ? "" : String(p.id);
                  const rowEmail = typeof row.email === "string" ? row.email.trim().toLowerCase() : "";
                  const myEmail = typeof p.email === "string" ? p.email.trim().toLowerCase() : "";
                  return (myId && rowIds.includes(myId)) || (rowEmail && myEmail && rowEmail === myEmail);
              })
            : undefined) ??
        normalized[0];
    const members = normalized.filter((row) => row !== leadRow);
    return {
        team_lead: leadRow,
        team_members: members,
        participation_type: normalized.length > 0 ? "team" : "individual",
    };
}

export function mergeReportSection1TeamScopeForCertificate(
    report: Record<string, unknown>,
    participant: unknown,
    teamRows: unknown[],
): Record<string, unknown> {
    const section1 = { ...((report.section1 as Record<string, unknown> | undefined) || {}) };
    const { team_members, participation_type, team_lead } = resolveScopedTeamRosterForCertificate(
        participant,
        teamRows,
    );
    const existingLead =
        section1.team_lead && typeof section1.team_lead === "object"
            ? (section1.team_lead as Record<string, unknown>)
            : undefined;
    return {
        ...report,
        section1: {
            ...section1,
            team_members,
            participation_type,
            team_lead: mergeTeamLeadForDossier(existingLead, team_lead),
        },
    };
}

export function mergeReportSection1TeamScope(
    report: Record<string, unknown>,
    participant: unknown,
    teamRows: unknown[],
): Record<string, unknown> {
    const section1 = { ...((report.section1 as Record<string, unknown> | undefined) || {}) };
    const { team_members, participation_type } = resolveScopedTeamMembers(participant, teamRows);

    const myTeamId = pickTeamIdFromRecord(participant);
    const roster = Array.isArray(teamRows) ? teamRows : [];
    const scopedRoster =
        myTeamId && participation_type === "team"
            ? roster.filter((row) => pickTeamIdFromRecord(row) === myTeamId)
            : roster;
    const leadFromRoster = scopedRoster.find((row) => {
        if (!row || typeof row !== "object") return false;
        const o = row as Record<string, unknown>;
        return o.isTeamLead === true || o.is_team_lead === true;
    });
    const existingLead =
        section1.team_lead && typeof section1.team_lead === "object"
            ? (section1.team_lead as Record<string, unknown>)
            : undefined;
    const team_lead = mergeTeamLeadForDossier(
        existingLead,
        leadFromRoster ? normalizeParticipationRowForDossier(leadFromRoster) : undefined,
    );

    return {
        ...report,
        section1: {
            ...section1,
            team_members,
            participation_type,
            team_lead,
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

function dossierFirstNonBlank(...values: unknown[]): string {
    for (const value of values) {
        if (value === null || value === undefined) continue;
        const text = String(value).trim();
        if (text && text.toLowerCase() !== "undefined" && text.toLowerCase() !== "null") return text;
    }
    return "";
}

function linkedStudentRecord(row: Record<string, unknown>): Record<string, unknown> | null {
    const s = row.student;
    return s && typeof s === "object" ? (s as Record<string, unknown>) : null;
}

/** Degree / program line for verify dossiers (matches backend `resolveParticipationProgramLine`). */
export function buildParticipationProgramLine(row: Record<string, unknown>): string {
    const student = linkedStudentRecord(row);
    const deptRaw = dossierFirstNonBlank(row.department, student?.department);
    const dept =
        deptRaw && !["other", "n/a", "na", "general", "unspecified"].includes(deptRaw.trim().toLowerCase())
            ? deptRaw
            : "";
    const progRaw = dossierFirstNonBlank(row.academicProgram, row.academic_program, row.degree, student?.major);
    const prog =
        progRaw && !["other", "n/a", "na", "general", "unspecified"].includes(progRaw.trim().toLowerCase())
            ? progRaw
            : "";
    const base = dossierFirstNonBlank(row.program, prog, dept);
    const year = dossierFirstNonBlank(row.year, row.yearOfStudy, row.year_of_study);
    if (base && year) return `${base} · ${year}`;
    if (base) return base;
    return year;
}

/** Map engagement `Participation` rows (or stored section1 rows) to verify-dossier field names. */
export function normalizeParticipationRowForDossier(row: unknown): ReportTeamRow {
    if (!row || typeof row !== "object") return {};
    const r = row as Record<string, unknown>;
    const isTeamLead = r.isTeamLead === true;
    const status = typeof r.status === "string" ? r.status : "";
    const approvedLike = ["approved", "verified", "accepted", "finalized"].includes(status.toLowerCase());
    const programLine = buildParticipationProgramLine(r);
    const student = linkedStudentRecord(r);
    return {
        ...r,
        id: r.id ?? r.participantId,
        participantId: r.participantId ?? r.id,
        fullName: dossierFirstNonBlank(r.fullName, r.name, r.full_name),
        name: dossierFirstNonBlank(r.fullName, r.name, r.full_name),
        mobile: dossierFirstNonBlank(r.mobile, r.phone),
        university: dossierFirstNonBlank(r.university, r.universityName),
        program: programLine,
        degree: dossierFirstNonBlank(r.degree, r.academicProgram, r.academic_program, student?.major, r.department),
        year: dossierFirstNonBlank(r.year, r.yearOfStudy, r.year_of_study),
        email: r.email,
        cnic: r.cnic,
        role: dossierFirstNonBlank(r.role, isTeamLead ? "Team lead" : ""),
        isTeamLead,
        verified: r.verified === true || approvedLike,
        status: status || (r.verified === true ? "approved" : "pending_approval"),
        hours: r.hours,
        teamId: r.teamId ?? r.team_id,
        team_id: r.teamId ?? r.team_id,
    };
}

function mergeTeamLeadForDossier(
    existing: Record<string, unknown> | undefined,
    leadFromRoster: ReportTeamRow | undefined,
): ReportTeamRow {
    const from = leadFromRoster ? normalizeParticipationRowForDossier(leadFromRoster) : {};
    const base =
        existing && typeof existing === "object" ? normalizeParticipationRowForDossier(existing) : {};
    const rosterLeadEmail = dossierFirstNonBlank(from.email).toLowerCase();
    const storedLeadEmail = dossierFirstNonBlank(base.email).toLowerCase();
    const rosterIsCanonicalLead = from.isTeamLead === true;
    const storedLeadIsStale =
        rosterLeadEmail.length > 0 &&
        storedLeadEmail.length > 0 &&
        rosterLeadEmail !== storedLeadEmail &&
        rosterIsCanonicalLead;
    const merged: ReportTeamRow = storedLeadIsStale ? { ...base, ...from } : { ...from, ...base };
    const keys = [
        "fullName",
        "name",
        "cnic",
        "mobile",
        "email",
        "university",
        "degree",
        "year",
        "program",
        "role",
        "hours",
        "consent",
        "verified",
        "id",
    ] as const;
    for (const key of keys) {
        if (!dossierFirstNonBlank(merged[key]) && dossierFirstNonBlank(from[key])) {
            merged[key] = from[key];
        }
    }
    if (!dossierFirstNonBlank(merged.fullName) && dossierFirstNonBlank(merged.name)) {
        merged.fullName = merged.name;
    }
    return merged;
}

/**
 * Admin / partner / faculty verify dossiers: keep the full project roster from the API.
 * Do not scope to the filing student's team (that is for student report editing only).
 */
export function prepareReportForVerifyDossier(report: Record<string, unknown>): Record<string, unknown> {
    const section1 = { ...((report.section1 as Record<string, unknown> | undefined) || {}) };
    const embeddedScope = scopeTeamMembersByEmbeddedTeamId(section1);
    const rawMembers = embeddedScope ?? (Array.isArray(section1.team_members) ? section1.team_members : []);
    const normalized = rawMembers.map((row) => normalizeParticipationRowForDossier(row));

    const leadRow = normalized.find((r) => r.isTeamLead === true);
    const leadEmail =
        typeof leadRow?.email === "string" ? leadRow.email.trim().toLowerCase() : "";
    const leadId = String(leadRow?.id ?? leadRow?.participantId ?? "").trim();
    const memberRows = normalized.filter((r) => {
        if (r.isTeamLead === true) return false;
        const em = typeof r.email === "string" ? r.email.trim().toLowerCase() : "";
        const id = String(r.id ?? r.participantId ?? "").trim();
        if (leadId && id === leadId) return false;
        if (leadEmail && em && em === leadEmail) return false;
        return true;
    });
    const existingLead =
        section1.team_lead && typeof section1.team_lead === "object"
            ? (section1.team_lead as Record<string, unknown>)
            : undefined;
    const team_lead = mergeTeamLeadForDossier(existingLead, leadRow);

    const team_members = memberRows.length > 0 ? memberRows : leadRow ? [] : normalized;

    const participation_type =
        section1.participation_type === "team" || team_members.length > 0 || dossierFirstNonBlank(team_lead.fullName)
            ? team_members.length > 0 || leadRow
                ? "team"
                : section1.participation_type
            : section1.participation_type;

    const leadRoll = resolveStudentRollNumberForDossier(team_lead);
    if (leadRoll) {
        team_lead.studentRollNumber = leadRoll;
    }

    const membersWithRoll = team_members.map((m) => {
        const roll = resolveStudentRollNumberForDossier(m);
        if (!roll) return m;
        return { ...m, studentRollNumber: roll };
    });

    return {
        ...report,
        section1: {
            ...section1,
            team_lead,
            team_members: membersWithRoll,
            ...(participation_type ? { participation_type } : {}),
        },
    };
}

/** Student roll from identity form (`universityId` column), excluding university name / UUID noise. */
function resolveStudentRollNumberForDossier(row: Record<string, unknown>): string {
    const universityName = dossierFirstNonBlank(row.university, row.universityName);
    const stored = dossierFirstNonBlank(row.universityId, row.university_id);
    const reg = dossierFirstNonBlank(row.registrationNumber, row.registration_number);
    if (!stored) return reg;
    const lower = stored.toLowerCase();
    if (universityName && lower === universityName.trim().toLowerCase()) return reg;
    if (/^[0-9a-f-]{36}$/i.test(stored)) return reg;
    if (lower.includes("university") || lower.includes("institute") || stored.length > 36) return reg;
    return stored;
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
