import { formatSection1FieldValue, type Section1AnalyticsPayload } from "@/utils/section1Analytics";

export type AnalyticsKpiCard = {
    id: string;
    label: string;
    value: string;
    hint?: string;
    tone?: "default" | "success" | "warning" | "danger";
};

function num(v: unknown): number | null {
    return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function isObj(v: unknown): v is Record<string, unknown> {
    return !!v && typeof v === "object" && !Array.isArray(v);
}

function toneFromPercent(p: number): AnalyticsKpiCard["tone"] {
    if (p >= 80) return "success";
    if (p >= 50) return "warning";
    return "danger";
}

export function extractSection1Kpis(payload: Section1AnalyticsPayload): AnalyticsKpiCard[] {
    const f = payload.fields;
    const cards: AnalyticsKpiCard[] = [];

    const identity = f.identity_verification_status;
    if (isObj(identity) && "verified_students" in identity) {
        const verified = num(identity.verified_students) ?? 0;
        const total = num(identity.total_students) ?? 0;
        cards.push({
            id: "identity",
            label: "Verified students",
            value: verified.toLocaleString(),
            hint: total > 0 ? `${Math.max(0, total - verified)} pending · ${total} total` : undefined,
            tone: total > 0 && verified / total >= 0.8 ? "success" : "warning",
        });
    } else if (typeof identity === "string") {
        cards.push({
            id: "identity",
            label: "Identity status",
            value: identity,
            tone: identity.toLowerCase().includes("verified") ? "success" : "warning",
        });
    }

    const hours = f.hours_status_in_header;
    if (isObj(hours)) {
        const verified = num(hours.verified_hours) ?? 0;
        const required = num(hours.required_hours) ?? 0;
        const pct = num(hours.percent) ?? (required > 0 ? Math.round((100 * verified) / required) : 0);
        cards.push({
            id: "hours",
            label: "Verified hours",
            value: `${verified.toLocaleString()}h`,
            hint: required > 0 ? `${pct}% of ${required.toLocaleString()}h required` : undefined,
            tone: toneFromPercent(pct),
        });
    }

    const completion = f.section_1_completion_rate;
    if (isObj(completion) && completion.percent != null) {
        const pct = num(completion.percent) ?? 0;
        cards.push({
            id: "completion",
            label: "Section completion",
            value: `${pct}%`,
            tone: toneFromPercent(pct),
        });
    }

    const readiness = f.section_1_readiness_score;
    if (isObj(readiness) && readiness.score != null) {
        cards.push({
            id: "readiness",
            label: "Readiness score",
            value: String(num(readiness.score) ?? 0),
            tone: toneFromPercent(num(readiness.score) ?? 0),
        });
    }

    if (typeof f.total_participants === "number") {
        cards.push({ id: "participants", label: "Total participants", value: f.total_participants.toLocaleString() });
    }

    const unlock = f.attendance_logging_unlock_status;
    if (isObj(unlock) && "unlocked_count" in unlock) {
        const unlocked = num(unlock.unlocked_count) ?? 0;
        const total = num(unlock.total) ?? 0;
        cards.push({
            id: "attendance_unlock",
            label: "Attendance unlocked",
            value: `${unlocked}/${total}`,
            tone: total > 0 && unlocked >= total ? "success" : "warning",
        });
    }

    const team = f.team_configuration_status;
    if (isObj(team) && "configured_teams" in team) {
        cards.push({
            id: "teams",
            label: "Teams configured",
            value: `${num(team.configured_teams) ?? 0}/${num(team.total_teams) ?? 0}`,
        });
    } else if (typeof team === "string") {
        cards.push({
            id: "teams",
            label: "Team setup",
            value: team,
            tone: team.toLowerCase().includes("configured") ? "success" : "warning",
        });
    }

    if (cards.length === 0 && f.section_1_status != null) {
        cards.push({ id: "status", label: "Section status", value: formatSection1FieldValue(f.section_1_status) });
    }

    return cards.slice(0, 6);
}

export function extractProjectContext(payload: Section1AnalyticsPayload): {
    title: string;
    subtitle: string;
    progressMode: boolean;
} {
    const titleRaw = payload.fields.project_title;
    let title = "Analytics scope";
    if (typeof titleRaw === "string" && titleRaw.trim()) title = titleRaw.trim();
    else if (Array.isArray(titleRaw) && titleRaw.length > 0) title = String(titleRaw[0]);
    else if (isObj(titleRaw) && "project_count" in titleRaw) {
        title = `${num(titleRaw.project_count) ?? 0} projects in scope`;
    }

    const subtitle = `${payload.scope === "aggregate" ? "Aggregate cohort" : "Project scope"} · ${payload.stakeholder.replace(/_/g, " ")}`;

    const progressRaw = payload.fields.progress_mode_status;
    let progressMode = false;
    if (typeof progressRaw === "string") progressMode = progressRaw.toLowerCase().includes("progress");
    else if (isObj(progressRaw) && "progress_mode_count" in progressRaw) {
        progressMode = (num(progressRaw.progress_mode_count) ?? 0) > 0;
    }

    return { title, subtitle, progressMode };
}

export function categoryCounts(payload: Section1AnalyticsPayload): { basic: number; premium: number; restricted: number } {
    const counts = { basic: 0, premium: 0, restricted: 0 };
    for (const key of Object.keys(payload.fields)) {
        const cat = payload.meta[key]?.category;
        if (cat === "basic") counts.basic += 1;
        else if (cat === "premium") counts.premium += 1;
        else if (cat === "restricted") counts.restricted += 1;
    }
    return counts;
}
