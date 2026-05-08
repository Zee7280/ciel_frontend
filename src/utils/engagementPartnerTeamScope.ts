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
