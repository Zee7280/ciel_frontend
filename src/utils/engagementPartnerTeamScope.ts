import { pickTeamIdFromRecord } from "@/utils/reportTeamScope";

function pickStr(v: unknown): string {
    if (v == null) return "";
    return String(v).trim();
}

/** Pass to pending panel: partner must pick a team before rows show. */
export const PARTNER_ATTENDANCE_AWAIT_TEAM = "__partner_await_team_selection__";

/** No team bucket filter — show all pending rows for the project (fallback / single cohort). */
export const PARTNER_ATTENDANCE_ALL_TEAMS = "*";

/** Stable cohort key shared by `/team` rows and attendance `participant` payloads. */
export function partnerTeamBucketKey(source: Record<string, unknown>): string {
    const tid = pickTeamIdFromRecord(source);
    if (tid) return `t:${tid}`;
    const aid = pickStr(source.applicationId ?? source.application_id);
    if (aid) return `a:${aid}`;
    const id = pickStr(source.id ?? source.participantId);
    return id ? `p:${id}` : "";
}

export type PartnerTeamBucket = {
    key: string;
    label: string;
    subtitle?: string;
};

/** Group partner project roster (`/engagement/project/:id/team`) into distinct teams/applications. */
export function buildPartnerTeamBuckets(teamRows: unknown[]): PartnerTeamBucket[] {
    const groups = new Map<string, { leadName?: string; subtitle?: string }>();
    for (const raw of teamRows) {
        if (!raw || typeof raw !== "object") continue;
        const o = raw as Record<string, unknown>;
        const key = partnerTeamBucketKey(o);
        if (!key) continue;
        const prev = groups.get(key) ?? {};
        const name = pickStr(o.fullName ?? o.name ?? o.studentName ?? o.full_name);
        const leadFlag = Boolean(o.isTeamLead ?? o.is_team_lead);
        if (leadFlag && name) prev.leadName = name;
        if (!prev.subtitle) {
            const em = pickStr(o.email);
            if (em) prev.subtitle = em;
        }
        groups.set(key, prev);
    }

    const out: PartnerTeamBucket[] = [];
    for (const [key, v] of groups) {
        const tail = key.includes(":") ? key.slice(key.indexOf(":") + 1) : key;
        const shortId = tail.length > 10 ? `${tail.slice(0, 4)}…${tail.slice(-4)}` : tail;
        const label =
            v.leadName ? `${v.leadName}'s team` : `Team / group (${shortId || "unknown"})`;
        out.push({
            key,
            label,
            subtitle: v.subtitle,
        });
    }
    out.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
    return out;
}

function pendingParticipantRecord(raw: Record<string, unknown>): Record<string, unknown> | null {
    const p = raw.participant;
    return p && typeof p === "object" ? (p as Record<string, unknown>) : null;
}

/**
 * Partner queue: scope pending rows to a team bucket from `/engagement/project/:id/team`.
 * Matches by bucket key on the participant, or by roster member id/email when `teamId` was
 * never persisted on the attendance participant (common on older enrollments).
 */
export function filterPendingRowsByTeamScope(
    rows: Record<string, unknown>[],
    scope: string,
    teamRosterRows: unknown[],
): Record<string, unknown>[] {
    if (scope === PARTNER_ATTENDANCE_AWAIT_TEAM) return [];
    if (scope === "" || scope === PARTNER_ATTENDANCE_ALL_TEAMS) return rows;

    const memberIds = new Set<string>();
    const memberEmails = new Set<string>();
    for (const raw of teamRosterRows) {
        if (!raw || typeof raw !== "object") continue;
        const o = raw as Record<string, unknown>;
        if (partnerTeamBucketKey(o) !== scope) continue;
        const id = pickStr(o.id ?? o.participantId ?? o.participant_id);
        if (id) memberIds.add(id);
        const email = pickStr(o.email).toLowerCase();
        if (email) memberEmails.add(email);
    }

    return rows.filter((raw) => {
        const po = pendingParticipantRecord(raw);
        if (!po) return false;
        if (partnerTeamBucketKey(po) === scope) return true;
        const pid = pickStr(po.id ?? po.participantId ?? po.participant_id ?? po.userId ?? po.user_id);
        if (pid && memberIds.has(pid)) return true;
        const email = pickStr(po.email).toLowerCase();
        if (email && memberEmails.has(email)) return true;
        return false;
    });
}
