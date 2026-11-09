/**
 * Pure helpers for the NPE-1.3 governance panels of the Ranking Studio: feed status wording,
 * Admin criterion corrections, the administrator action log, the challenge process and a project's
 * rank progression across comparable published revisions. No React, no network — covered by
 * tests/rankingGovernance.test.mjs.
 */
import type { AdminAction, CriterionMeta, FeedStatus, RankHistoryPoint, RunRow } from "./studio-types";

// ------------------------------------------------------------------------------ corrections

export type OverrideDraft = { criterion: string; anchor: number | null; locator: string; reason: string };

export const OVERRIDE_REASON_MIN = 20;
export const OVERRIDE_LOCATOR_MIN = 5;

/** Criteria an administrator may correct: judged by the AI and not `unsupported` (those need new evidence). */
export function correctableCriteria(row: RunRow | null, criteria: CriterionMeta[]): CriterionMeta[] {
    if (!row?.evaluation?.criteria) return [];
    return criteria.filter((c) => {
        const j = row.evaluation?.criteria?.[c.key];
        return j && Number.isFinite(j.anchor) && String(j.confidence) !== "unsupported";
    });
}

/** Anchor currently used for scoring: the active correction if any, else the AI anchor. */
export function effectiveAnchor(row: RunRow | null, key: string): number | null {
    const eff = row?.effectiveCriteria?.[key]?.anchor;
    if (eff != null && Number.isFinite(eff)) return Number(eff);
    const ai = row?.evaluation?.criteria?.[key]?.anchor;
    return ai != null && Number.isFinite(ai) ? Number(ai) : null;
}

/** Everything that stops a correction being sent, in the order the form shows them. */
export function overrideBlockers(draft: OverrideDraft, row: RunRow | null, criteria: CriterionMeta[]): string[] {
    const out: string[] = [];
    const allowed = correctableCriteria(row, criteria);
    if (!row?.evaluation) out.push("Run the Ranking Analyzer first: a correction must refer to an existing AI judgment.");
    else if (!allowed.some((c) => c.key === draft.criterion)) out.push("Choose a criterion the AI judged with evidence support.");
    if (draft.anchor == null || !Number.isInteger(draft.anchor) || draft.anchor < 0 || draft.anchor > 5) out.push("Select a corrected anchor from 0 to 5.");
    else if (row && effectiveAnchor(row, draft.criterion) === draft.anchor) out.push(`This criterion already stands at ${draft.anchor}/5.`);
    if (draft.locator.trim().length < OVERRIDE_LOCATOR_MIN) out.push("Give the exact evidence or claim locator (file id, page, claim).");
    if (draft.reason.trim().length < OVERRIDE_REASON_MIN) out.push(`Explain the overlooked evidence in at least ${OVERRIDE_REASON_MIN} characters.`);
    return out;
}

// -------------------------------------------------------------------------------- challenges

export type ChallengeDraft = { publicationId: string; reportId: string; locator: string; reason: string };

export function challengeBlockers(draft: ChallengeDraft): string[] {
    const out: string[] = [];
    if (!draft.publicationId) out.push("Choose the published ranking being challenged.");
    if (!draft.reportId) out.push("Choose the project whose position is challenged.");
    if (draft.locator.trim().length < OVERRIDE_LOCATOR_MIN) out.push("Point to the evidence the challenge rests on (file id, page, claim).");
    if (draft.reason.trim().length < OVERRIDE_REASON_MIN) out.push(`State the evidence-based reason in at least ${OVERRIDE_REASON_MIN} characters.`);
    return out;
}

export const CHALLENGE_STATUS_LABEL: Record<string, string> = {
    open: "Open · awaiting review",
    upheld: "Upheld · correction and new revision required",
    dismissed: "Dismissed · published position stands",
};

// ------------------------------------------------------------------------------------- audit

export const ACTION_LABEL: Record<string, string> = {
    "override.save": "Criterion correction",
    "override.revoke": "Correction revoked",
    "review.clear": "Review item cleared",
    "run.publish": "Official snapshot published",
    "studio.publish": "Ranking published",
    "challenge.open": "Challenge opened",
    "challenge.resolve": "Challenge resolved",
};

/** One line per action: what happened, with the before/after values when there are any. */
export function describeAction(a: AdminAction): { title: string; detail: string } {
    const d = a.details ?? {};
    const title = ACTION_LABEL[a.action] ?? a.action;
    const summary = typeof d.summary === "string" ? d.summary : "";
    const parts: string[] = [];
    if (summary) parts.push(summary);
    if (a.action === "override.save" && typeof d.locator === "string") parts.push(`Locator: ${d.locator}`);
    if (a.action === "override.save" && typeof d.reason === "string") parts.push(d.reason);
    if (a.action === "challenge.resolve" && typeof d.resolution === "string") parts.push(d.resolution);
    if (a.action === "challenge.open" && typeof d.locator === "string") parts.push(`Locator: ${d.locator}`);
    return { title, detail: parts.join(" · ") };
}

// -------------------------------------------------------------------------------- feed status

export function feedHeadline(feed: FeedStatus | null, error?: string | null): { label: string; tone: "ok" | "warn" | "error" | "idle" } {
    if (error) return { label: "● FEED NOT READY", tone: "error" };
    if (!feed) return { label: "● NOT CHECKED", tone: "idle" };
    if (!feed.connected || !feed.approvedCIIFieldsReady) return { label: "● FEED NOT READY", tone: "error" };
    if (feed.counts.awaitingRead > 0 || feed.counts.pendingReviews > 0) return { label: "● IMPACT WALL CONNECTED · WORK PENDING", tone: "warn" };
    return { label: "● IMPACT WALL CONNECTED", tone: "ok" };
}

export function feedMessage(feed: FeedStatus | null, error?: string | null): string {
    if (error) return `Could not read a verified My Impact Wall feed: ${error}`;
    if (!feed) return "Press “Check automatic feed” to verify the My Impact Wall connector, the approved packages and the locked CII fields.";
    const c = feed.counts;
    const bits = [
        `Server verified ${c.discovered} approved package${c.discovered === 1 ? "" : "s"} from My Impact Wall (locked CII and badge included)`,
        `${c.eligible} passed the four-part check`,
        `${c.evaluated} read by the AI evaluator`,
    ];
    if (c.awaitingRead) bits.push(`${c.awaitingRead} awaiting read`);
    if (c.held) bits.push(`${c.held} held for verification`);
    if (c.pendingReviews) bits.push(`${c.pendingReviews} review item${c.pendingReviews === 1 ? "" : "s"} open`);
    if (c.corrections) bits.push(`${c.corrections} active correction${c.corrections === 1 ? "" : "s"}`);
    if (c.openChallenges) bits.push(`${c.openChallenges} open challenge${c.openChallenges === 1 ? "" : "s"}`);
    return `${bits.join(" · ")}.`;
}

// ------------------------------------------------------------------------------ rank progression

export type RankSeries = {
    signature: string;
    name: string;
    lensTitle: string;
    scope: "national" | "university";
    points: RankHistoryPoint[];
};

/** Groups a project's published placements by ranking (signature), oldest revision first. */
export function rankSeries(points: RankHistoryPoint[]): RankSeries[] {
    const map = new Map<string, RankSeries>();
    for (const p of [...points].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt) || a.revision - b.revision)) {
        if (!map.has(p.signature)) map.set(p.signature, { signature: p.signature, name: p.name, lensTitle: p.lensTitle, scope: p.scope, points: [] });
        map.get(p.signature)!.points.push(p);
    }
    return [...map.values()].sort((a, b) => b.points[b.points.length - 1].publishedAt.localeCompare(a.points[a.points.length - 1].publishedAt));
}

/** Rank percentile 0–100 (100 = first). Single-row rankings count as 100. */
export function rankPercentile(rank: number, of: number): number {
    if (of <= 1) return 100;
    return Math.round(((of - rank) / (of - 1)) * 1000) / 10;
}

/** Polyline points for a small SVG trend of rank percentile (only comparable revisions are plotted). */
export function sparklinePoints(points: RankHistoryPoint[], width = 250, height = 80): { x: number; y: number; pct: number; p: RankHistoryPoint }[] {
    const list = points.slice(-8);
    if (list.length < 2) return [];
    const left = 16;
    const right = width - 20;
    const top = 18;
    const bottom = height - 16;
    return list.map((p, i) => {
        const pct = rankPercentile(p.rank, p.of);
        return { x: left + (i * (right - left)) / (list.length - 1), y: bottom - (pct / 100) * (bottom - top), pct, p };
    });
}

export type TrendReading = { kind: "up" | "down" | "same" | "cohort" | "new" | "none"; label: string; detail: string };

/**
 * The mockup's four readings: Improved / Fell / Unchanged in a comparable cohort, and "Cohort
 * changed" (show percentile context, never a false direct comparison). A ranking with one
 * revision is "new".
 */
export function trendReading(series: RankSeries | null): TrendReading {
    if (!series || !series.points.length) return { kind: "none", label: "Not published", detail: "Publication is required before rank, tier and trends are displayed." };
    const pts = series.points;
    const last = pts[pts.length - 1];
    if (pts.length < 2) return { kind: "new", label: "● New ranking", detail: `First publication · #${last.rank} of ${last.of} · ${rankPercentile(last.rank, last.of)}th percentile.` };
    const prev = pts[pts.length - 2];
    if (!last.cohortComparable) {
        return {
            kind: "cohort",
            label: "◉ Cohort changed",
            detail: `Update ${last.revision} ranked a different set of projects than update ${prev.revision}. Percentile context: ${rankPercentile(prev.rank, prev.of)} → ${rankPercentile(last.rank, last.of)}; no direct rank comparison is claimed.`,
        };
    }
    if (last.rank < prev.rank) return { kind: "up", label: `↑ Improved ${prev.rank - last.rank} place${prev.rank - last.rank === 1 ? "" : "s"}`, detail: `#${prev.rank} → #${last.rank} of ${last.of} in a comparable cohort.` };
    if (last.rank > prev.rank) return { kind: "down", label: `↓ Fell ${last.rank - prev.rank} place${last.rank - prev.rank === 1 ? "" : "s"}`, detail: `#${prev.rank} → #${last.rank} of ${last.of} in a comparable cohort.` };
    return { kind: "same", label: "→ Unchanged", detail: `#${last.rank} of ${last.of} in both update ${prev.revision} and update ${last.revision}.` };
}

/** Best comparable published rank of a series (lowest number), or null. */
export function bestPublishedRank(series: RankSeries | null): number | null {
    if (!series?.points.length) return null;
    return Math.min(...series.points.map((p) => p.rank));
}

export const TREND_LEGEND: Array<[string, string]> = [
    ["↑ Improved", "Better rank in a comparable cohort (same method family, same eligible projects)."],
    ["↓ Fell", "Lower rank in a comparable cohort."],
    ["→ Unchanged", "Same rank, same cohort and method."],
    ["◉ Cohort changed", "The eligible set changed. Percentile context is shown instead of a false direct comparison."],
];
