export const COMMUNITY_AWARD_CRITERIA = [
    { key: "cii", max: 40, title: "Composite Impact Index (CII v8.2)", note: "the full 10-section AI evaluation — depth, honesty, verification compounded" },
    { key: "quality", max: 20, title: "Quality & depth of execution", note: "was the work done well, repeatedly, with skill — judged on its own pathway" },
    { key: "evidence", max: 15, title: "Evidence integrity", note: "every attached JPEG re-verified against the claims at ranking time" },
    { key: "outcome", max: 15, title: "Measured community outcome", note: "baseline → endline change in the community, honestly counted" },
    { key: "sustain", max: 10, title: "Sustainability & partnership", note: "does the work outlive the semester; is the partner still engaged" },
] as const;

export const AWARD_PHRASE: Record<number, [string, string, string]> = {
    0: ["the Composite Impact Index is elite — section depth, verification and honesty all compound", "a strong CII with minor section gaps", "the CII reveals thin sections"],
    1: ["execution depth a professional NGO would sign off on", "solid execution with room to deepen", "execution stayed at surface level"],
    2: ["every JPEG re-verified — the work is watchable, not just claimed", "most evidence verified; minor gaps", "evidence coverage is patchy"],
    3: ["the community change is measured, baseline to endline, and survives questioning", "real outcomes, partly qualitative", "outcomes asserted more than measured"],
    4: ["handover secured — the work outlives the semester", "continuity likely but not yet locked", "no plan beyond the last visit"],
};

export type CommunityAwardKind = "fac" | "par" | "uni" | "ciel";

export type CommunityAwardBadge = {
    kind: CommunityAwardKind;
    label: string;
    rank: number;
    of: number;
    score: number;
    scope: string;
    at: string;
};

export type CommunityAwardCard = {
    id: string;
    studentId?: string;
    student_name: string;
    project_title: string;
    organization_name: string;
    university: string;
    department: string;
    faculty_name: string;
    hours: number;
    sdg: string;
    evidenceCount: number;
    story: string;
    change: string;
    semester: string;
    year: string;
    month: string;
    teamSize: number;
    faculty_status: string;
    status: string;
    cii: number | null;
    pts: number[];
    total: number;
    awardBadges?: CommunityAwardBadge[];
};

export function awardTier(ratio: number) {
    return ratio >= 0.85 ? 0 : ratio >= 0.62 ? 1 : 2;
}

export function awardTopN(kind: CommunityAwardKind) {
    return kind === "par" || kind === "fac" ? 1 : 3;
}

export function whyThisCommunityRank(card: CommunityAwardCard, i: number, arr: CommunityAwardCard[], avg: number) {
    const pts = Array.isArray(card.pts) ? card.pts : [];
    if (pts.length < COMMUNITY_AWARD_CRITERIA.length) {
        return `Why #${i + 1} of ${arr.length}: scored ${card.total}/100 against a cohort average of ${avg}.`;
    }
    const ratios = pts.map((p, j) => p / COMMUNITY_AWARD_CRITERIA[j].max);
    const order = ratios.map((r, j) => [r, j] as const).sort((a, b) => b[0] - a[0]);
    const t1 = order[0][1];
    const t2 = order[1][1];
    const wk = order[order.length - 1][1];
    const parts = [
        `Why #${i + 1} of ${arr.length}: ${AWARD_PHRASE[t1][awardTier(ratios[t1])]} (${card.pts[t1]}/${COMMUNITY_AWARD_CRITERIA[t1].max}), reinforced by ${COMMUNITY_AWARD_CRITERIA[t2].title.toLowerCase()}: ${AWARD_PHRASE[t2][awardTier(ratios[t2])]}.`,
        card.change ? `The community record: ${card.change} — over ${card.hours} verified hours with ${card.organization_name}.` : `${card.hours} verified hours with ${card.organization_name}.`,
        `Against the cohort: ${card.total - avg >= 0 ? "+" : ""}${card.total - avg} vs the scoped average of ${avg}.`,
        `What holds it at #${i + 1}: ${AWARD_PHRASE[wk][awardTier(ratios[wk])]}.`,
    ];
    return parts.join(" ");
}

export const BADGE_CLASS: Record<CommunityAwardKind, string> = {
    uni: "bg-[linear-gradient(135deg,#0e5f63,#0891b2)]",
    par: "bg-[linear-gradient(135deg,#b45309,#f59e0b)]",
    ciel: "bg-[linear-gradient(135deg,#4c1d95,#8b5cf6)]",
    fac: "bg-[linear-gradient(135deg,#065f46,#10b981)]",
};

export const BADGE_ICON: Record<CommunityAwardKind, string> = { uni: "🏛️", par: "🤝", ciel: "🌍", fac: "🧑‍🏫" };

export function reportRowToAwardCard(row: {
    id: string;
    student_name: string;
    project_title: string;
    organization_name?: string;
    faculty_status?: string;
    status?: string;
    hours?: number;
}): CommunityAwardCard {
    return {
        id: row.id,
        student_name: row.student_name || "Student",
        project_title: row.project_title || "Community service",
        organization_name: row.organization_name || "Partner",
        university: "—",
        department: "—",
        faculty_name: "Faculty",
        hours: row.hours || 0,
        sdg: "—",
        evidenceCount: 0,
        story: "",
        change: "",
        semester: "—",
        year: "",
        month: "",
        teamSize: 1,
        faculty_status: row.faculty_status || "pending",
        status: row.status || "submitted",
        cii: null,
        pts: [],
        total: 0,
    };
}

export type CommunityPipelineRow = {
    id: string;
    student_name: string;
    project_title: string;
    organization_name?: string;
    faculty_status?: string;
    status?: string;
    partner_status?: string;
    admin_status?: string;
    hours?: number;
};

function pickStr(item: Record<string, unknown>, ...keys: string[]): string | undefined {
    for (const key of keys) {
        const value = item[key];
        if (typeof value === "string" && value.trim()) return value;
    }
    return undefined;
}

export function mapCommunityPipelineRow(item: Record<string, unknown>): CommunityPipelineRow | null {
    const id = String(item.id || item.report_id || "");
    if (!id) return null;
    const metrics =
        item.metrics && typeof item.metrics === "object"
            ? (item.metrics as Record<string, unknown>)
            : item.section1 && typeof item.section1 === "object"
              ? ((item.section1 as { metrics?: Record<string, unknown> }).metrics ?? {})
              : {};
    const student = item.student && typeof item.student === "object" ? (item.student as Record<string, unknown>) : {};
    const opportunity =
        item.opportunity && typeof item.opportunity === "object" ? (item.opportunity as Record<string, unknown>) : {};
    const hoursRaw = metrics.total_verified_hours ?? metrics.total_hours ?? item.hours;
    const hours = typeof hoursRaw === "number" ? hoursRaw : Number(hoursRaw || 0);
    return {
        id,
        student_name: pickStr(item, "student_name", "studentName") || pickStr(student, "name") || "Student",
        project_title:
            pickStr(item, "project_title", "projectTitle") || pickStr(opportunity, "title") || "Report",
        organization_name: pickStr(item, "organization_name", "organizationName"),
        faculty_status: pickStr(item, "faculty_status", "facultyStatus"),
        status: pickStr(item, "status"),
        partner_status: pickStr(item, "partner_status", "partnerStatus"),
        admin_status: pickStr(item, "admin_status", "adminStatus"),
        hours: Number.isFinite(hours) ? hours : 0,
    };
}

export function mergeCommunityLiveDeck(
    cards: CommunityAwardCard[],
    liveRows: CommunityPipelineRow[],
    isLive: (row: CommunityPipelineRow | CommunityAwardCard) => boolean,
): CommunityAwardCard[] {
    const liveIds = new Set(liveRows.map((r) => r.id));
    const byId = new Map<string, CommunityAwardCard>();
    for (const card of cards) {
        if (liveIds.has(card.id) || isLive(card)) byId.set(card.id, card);
    }
    for (const row of liveRows) {
        if (!byId.has(row.id)) byId.set(row.id, reportRowToAwardCard(row));
    }
    return Array.from(byId.values());
}
