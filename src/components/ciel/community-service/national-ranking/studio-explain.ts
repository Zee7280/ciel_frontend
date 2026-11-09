/**
 * Read-only explanation helpers for the Ranking Studio's "Excellence shortlist" view.
 *
 * Everything here is derived from the analyzer run already on screen (`RunPayload.rows`): the
 * server's rank, score and per-criterion anchors. Nothing is recomputed or re-ranked, and nothing
 * is published from this view — it explains the current run in the words the designer's prototype
 * uses ("why #1", "why the lowest eligible rank", "compared with the next position").
 *
 * Pure functions, no React: covered by tests/rankingExcellence.test.mjs.
 */
import type { CriterionMeta, RunRow } from "./studio-types";

export type CriterionAnchor = { key: string; label: string; weight: number; anchor: number; confidence: string };

const CONFIDENCE_UNSUPPORTED = "unsupported";

/** Per-criterion anchors (0–5) for a row, from the AI evaluation; falls back to the score breakdown. */
export function anchorsOf(row: RunRow, criteria: CriterionMeta[]): CriterionAnchor[] {
    return criteria.map((c) => {
        const ev = row.evaluation?.criteria?.[c.key];
        if (ev && Number.isFinite(ev.anchor)) {
            return { key: c.key, label: c.label || c.title, weight: c.weight, anchor: clampAnchor(ev.anchor), confidence: String(ev.confidence || "high") };
        }
        const points = row.scoreBreakdown?.criteria?.[c.key];
        const anchor = Number.isFinite(points) && c.weight > 0 ? clampAnchor(((points as number) / c.weight) * 5) : 0;
        return { key: c.key, label: c.label || c.title, weight: c.weight, anchor, confidence: anchor > 0 ? "high" : CONFIDENCE_UNSUPPORTED };
    });
}

function clampAnchor(n: number): number {
    return Math.max(0, Math.min(5, Math.round(n * 10) / 10));
}

export function isUnsupported(a: CriterionAnchor): boolean {
    return a.confidence === CONFIDENCE_UNSUPPORTED;
}

/** Ranked rows of a run, in rank order (the server's rank, never re-derived). */
export function rankedRows(rows: RunRow[] | undefined): RunRow[] {
    return (rows ?? [])
        .filter((r) => r.status === "Ranked" && typeof r.rank === "number" && typeof r.score === "number")
        .sort((a, b) => (a.rank as number) - (b.rank as number) || a.id.localeCompare(b.id));
}

/** Rows the run could not rank, with the server's reason ("verification exceptions", never "last place"). */
export function verificationExceptions(rows: RunRow[] | undefined): Array<{ id: string; title: string; status: string; reason: string }> {
    return (rows ?? [])
        .filter((r) => r.status !== "Ranked")
        .map((r) => ({ id: r.id, title: r.title, status: r.status, reason: r.reason || r.evaluation?.flags?.join("; ") || "Package not yet eligible for comparison." }));
}

/** The first `limit` ranked rows plus everyone tied with the score at the cutoff (ties never split). */
export function shortlistWithTies(ranked: RunRow[], limit: number): RunRow[] {
    const n = Math.max(1, Math.floor(limit));
    if (ranked.length <= n) return ranked;
    const cutoff = ranked[n - 1].score as number;
    return ranked.filter((r, i) => i < n || (r.score as number) >= cutoff);
}

/** Two strongest anchors (by anchor, then weight) and the weakest supported one. */
export function keyReasons(anchors: CriterionAnchor[]): { best: CriterionAnchor[]; weakest: CriterionAnchor | null } {
    const supported = anchors.filter((a) => !isUnsupported(a));
    const sorted = [...supported].sort((x, y) => y.anchor - x.anchor || y.weight - x.weight || x.label.localeCompare(y.label));
    return { best: sorted.slice(0, 2), weakest: sorted.length ? sorted[sorted.length - 1] : null };
}

const fmtAnchor = (a: CriterionAnchor) => `${a.label} ${trim1(a.anchor)}/5`;
const trim1 = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** One line for the shortlist table. */
export function shortReason(row: RunRow, criteria: CriterionMeta[]): string {
    const { best } = keyReasons(anchorsOf(row, criteria));
    const lead = best.length ? best.map(fmtAnchor).join(" and ") : "No supported criterion anchors yet";
    const achievement = firstSentence(row.evaluation?.summary || "");
    return `${lead}.${achievement ? ` ${achievement}` : ""}`;
}

/** The full "why this position" paragraph for one ranked row. */
export function rankReason(row: RunRow, total: number, criteria: CriterionMeta[]): string {
    const anchors = anchorsOf(row, criteria);
    const { best } = keyReasons(anchors);
    const parts: string[] = [];
    parts.push(`${row.title} is ranked #${row.rank} of ${total} in this run.`);
    if (best.length) parts.push(`Its leading criterion anchors are ${best.map(fmtAnchor).join(" and ")}.`);
    const achievement = firstSentence(row.evaluation?.summary || "");
    if (achievement) parts.push(achievement);
    const limitation = firstSentence(row.evaluation?.limitations || "");
    if (limitation) parts.push(`The main documented limitation is: ${limitation}`);
    const unsupported = anchors.filter(isUnsupported);
    if (unsupported.length) parts.push(`${unsupported.map((a) => a.label).join(", ")} earned no comparative credit (unsupported by the package).`);
    if (typeof row.cii === "number") {
        parts.push(`The approved CII of ${trim1(row.cii)}/100 is locked and contributes only its fixed contextual share; it is not treated as new outcome proof.`);
    }
    return parts.join(" ");
}

/** How `a` compares with `b` (normally the next-lower rank), criterion by criterion. */
export function comparativeNarrative(a: RunRow, b: RunRow, criteria: CriterionMeta[]): string {
    const aa = anchorsOf(a, criteria);
    const bb = new Map(anchorsOf(b, criteria).map((x) => [x.key, x]));
    const stronger: string[] = [];
    const weaker: string[] = [];
    for (const x of aa) {
        const y = bb.get(x.key);
        if (!y) continue;
        if (x.anchor > y.anchor) stronger.push(`${x.label} (${trim1(x.anchor)}/5 versus ${trim1(y.anchor)}/5)`);
        else if (x.anchor < y.anchor) weaker.push(`${x.label} (${trim1(x.anchor)}/5 versus ${trim1(y.anchor)}/5)`);
    }
    const head = `Compared with ${b.title} (rank #${b.rank}), ${a.title}`;
    let body: string;
    if (!stronger.length && !weaker.length) body = `${head} has identical criterion anchors; the order follows the total score and then the record id.`;
    else {
        body = stronger.length ? `${head} has stronger anchored performance in ${stronger.slice(0, 3).join("; ")}` : `${head} has no stronger criterion`;
        if (weaker.length) body += `${stronger.length ? "; however, it" : " and"} is lower in ${weaker.slice(0, 2).join("; ")}`;
        body += ".";
    }
    const ciiA = typeof a.cii === "number" ? trim1(a.cii) : "—";
    const ciiB = typeof b.cii === "number" ? trim1(b.cii) : "—";
    return `${body} Their separately approved CII values are ${ciiA} and ${ciiB} /100 (contextual share only). Differences are read with the frozen criterion weights, not prestige, budget or raw reach.`;
}

/** Display-only excellence band from a rank in a cohort (never a stored badge). */
export function excellenceBand(rank: number, total: number, scope: "ciel_admin" | "university"): string {
    const prefix = scope === "university" ? "University" : "CIEL PK";
    if (!total || rank < 1) return "Pending";
    if (rank === 1) return `${prefix} #1`;
    const pct = (rank / total) * 100;
    if (pct <= 1) return `${prefix} Top 1%`;
    if (pct <= 5) return `${prefix} Top 5%`;
    if (pct <= 10) return `${prefix} Top 10%`;
    if (pct <= 25) return `${prefix} Top 25%`;
    return `${prefix} Contributor`;
}

export function firstSentence(text: string): string {
    const t = String(text || "").trim();
    if (!t) return "";
    const m = /^(.+?[.!?])(\s|$)/.exec(t);
    const s = (m ? m[1] : t).trim();
    return s.length > 220 ? `${s.slice(0, 217).trimEnd()}…` : s;
}

// ================================================================================ specialist awards
export type SpecialistAward = {
    id: string;
    icon: string;
    label: string;
    lead: string;
    guards: string[];
    sources: string;
    rule: string;
    /** Related reference questions in the 440-question crosswalk (ids). */
    questions: string[];
};

export const SPECIALIST_AWARDS: SpecialistAward[] = [
    {
        id: "sustainable",
        icon: "🌱",
        label: "Sustainable Impact & Continuity",
        lead: "sustain",
        guards: ["impact"],
        sources: "S5 outcomes · S9 reflection · follow-up records",
        rule: "Documented post-project ownership, a maintenance or follow-up plan, and an evidence-backed continuity mechanism. A promise alone is insufficient.",
        questions: ["M03-Q14", "M06-Q03", "M07-Q12", "M21-Q07"],
    },
    {
        id: "resources",
        icon: "♻️",
        label: "Responsible Resource Stewardship",
        lead: "efficiency",
        guards: ["impact"],
        sources: "S6 resources · S4 outputs · S5 outcomes",
        rule: "Verified outputs and outcomes achieved with proportionate, well-documented resources. Lowest cost alone does not win.",
        questions: ["M03-Q11", "M06-Q13", "M06-Q14", "M07-Q11"],
    },
    {
        id: "partnership",
        icon: "🤝",
        label: "Outstanding Community Partnership",
        lead: "partner",
        guards: ["need"],
        sources: "S2 need · S7 partner roles · verification",
        rule: "Shared decisions, clear partner roles and partner-verified contribution, grounded in a documented community need.",
        questions: ["M07-Q01", "M07-Q04", "M07-Q08", "M07-Q10", "M07-Q12"],
    },
    {
        id: "equity",
        icon: "💛",
        label: "Inclusive Community Reach",
        lead: "need",
        guards: ["partner", "impact"],
        sources: "S2 community need · S5 reach · consent",
        rule: "Reached the people the need analysis identified, with consent and dignity. Does not reward unverified beneficiary totals.",
        questions: ["M03-Q05", "M05-Q07", "M05-Q08", "M05-Q09", "M07-Q06"],
    },
    {
        id: "sdg",
        icon: "🎯",
        label: "Evidence-Led SDG Contribution",
        lead: "sdg",
        guards: ["impact"],
        sources: "S3 target mapping · S5 measured indicator",
        rule: "A specific SDG target mapped to a measured indicator with evidence. An SDG tag alone is never proof of a measured outcome.",
        questions: ["M03-Q08", "M06-Q01", "M06-Q11", "M23-Q07"],
    },
    {
        id: "replication",
        icon: "🔁",
        label: "Most Replicable Community Model",
        lead: "scale",
        guards: ["sustain"],
        sources: "S4 activities · S6 resources · S10 summary",
        rule: "A documented, transferable model: steps, resources and conditions another team could repeat, with continuity evidence.",
        questions: ["M25-Q09", "M25-Q10", "M25-Q11", "M03-Q14"],
    },
    {
        id: "leadership",
        icon: "⭐",
        label: "Student Leadership & Learning",
        lead: "learning",
        guards: ["partner"],
        sources: "S1 participation · S8 ethics · S9 reflection",
        rule: "Demonstrated student ownership, ethical practice and reflective learning, recognised by the partner.",
        questions: ["M04-Q06", "M08-Q09", "M25-Q07", "M25-Q04"],
    },
    {
        id: "outcomes",
        icon: "🏆",
        label: "Exceptional Measured Community Change",
        lead: "impact",
        guards: ["need"],
        sources: "S2 baseline · S5 outcome evidence",
        rule: "Baseline-to-endline change verified against the documented need. Raw reach, spending or volunteer counts do not count.",
        questions: ["M06-Q01", "M06-Q02", "M06-Q06", "M06-Q11", "M06-Q12"],
    },
];

export const AWARD_LEAD_MIN = 4;
export const AWARD_GUARD_MIN = 3;

export type AwardCandidate = { row: RunRow; lead: CriterionAnchor; guards: CriterionAnchor[]; comparator: number };

export type AwardResult = {
    award: SpecialistAward;
    /** Every project that passes the proof gate, best comparator first. */
    qualified: AwardCandidate[];
    /** Joint winners: all candidates tied on the best comparator. */
    winners: AwardCandidate[];
    status: "awarded" | "not_awarded" | "no_run";
};

function byKey(anchors: CriterionAnchor[]): Map<string, CriterionAnchor> {
    return new Map(anchors.map((a) => [a.key, a]));
}

/** Proof gate: lead ≥ 4/5, every guard ≥ 3/5, none unsupported; needs the criteria to exist in this rubric. */
export function awardCandidate(row: RunRow, award: SpecialistAward, criteria: CriterionMeta[]): AwardCandidate | null {
    if (row.status !== "Ranked") return null;
    const map = byKey(anchorsOf(row, criteria));
    const lead = map.get(award.lead);
    if (!lead || isUnsupported(lead) || lead.anchor < AWARD_LEAD_MIN) return null;
    const guards: CriterionAnchor[] = [];
    for (const g of award.guards) {
        const a = map.get(g);
        if (!a || isUnsupported(a) || a.anchor < AWARD_GUARD_MIN) return null;
        guards.push(a);
    }
    const guardMean = guards.length ? guards.reduce((s, g) => s + g.anchor, 0) / guards.length : lead.anchor;
    const comparator = Math.round((lead.anchor * 0.8 + guardMean * 0.2) * 10000) / 10000;
    return { row, lead, guards, comparator };
}

/** All eight awards for the run on screen. Order inside an award: comparator, overall rank, record id. */
export function computeSpecialistAwards(rows: RunRow[] | undefined, criteria: CriterionMeta[]): AwardResult[] {
    const list = rows ?? [];
    return SPECIALIST_AWARDS.map((award) => {
        if (!list.length) return { award, qualified: [], winners: [], status: "no_run" as const };
        const qualified = list
            .map((r) => awardCandidate(r, award, criteria))
            .filter((c): c is AwardCandidate => c !== null)
            .sort((x, y) => y.comparator - x.comparator || (x.row.rank ?? 1e9) - (y.row.rank ?? 1e9) || x.row.id.localeCompare(y.row.id));
        const winners = qualified.length ? qualified.filter((c) => c.comparator === qualified[0].comparator) : [];
        return { award, qualified, winners, status: winners.length ? ("awarded" as const) : ("not_awarded" as const) };
    });
}
