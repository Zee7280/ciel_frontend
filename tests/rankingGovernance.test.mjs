// NPE-1.3 governance helpers (Ranking Studio): corrections, challenges, audit wording, feed status,
// rank progression. Pure functions + a wiring check that the panels call the governance routes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
    bestPublishedRank,
    challengeBlockers,
    correctableCriteria,
    describeAction,
    effectiveAnchor,
    feedHeadline,
    feedMessage,
    overrideBlockers,
    rankPercentile,
    rankSeries,
    sparklinePoints,
    trendReading,
} from "../src/components/ciel/community-service/national-ranking/studio-governance.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

const CRITERIA = [
    { key: "impact", title: "Impact", label: "Community Impact", weight: 22 },
    { key: "sdg", title: "SDG", label: "SDG Contribution", weight: 9 },
    { key: "need", title: "Need", label: "Need & Relevance", weight: 13 },
];

const row = {
    id: "r1",
    title: "Classroom",
    evaluation: {
        criteria: {
            impact: { anchor: 3, confidence: "high", reason: "" },
            sdg: { anchor: 2, confidence: "unsupported", reason: "" },
            need: { anchor: 4, confidence: "moderate", reason: "" },
        },
    },
    effectiveCriteria: {
        impact: { anchor: 5, confidence: "high" },
        sdg: { anchor: 2, confidence: "unsupported" },
        need: { anchor: 4, confidence: "moderate" },
    },
    overrides: [{ id: "o1", criterion: "impact", anchor: 5, aiAnchor: 3, locator: "EV-3", reason: "Endline table", createdAt: null, createdByUserId: null, role: null }],
};

test("only evidence-supported criteria can be corrected; the effective anchor is the correction when one is active", () => {
    assert.deepEqual(correctableCriteria(row, CRITERIA).map((c) => c.key), ["impact", "need"]);
    assert.deepEqual(correctableCriteria(null, CRITERIA), []);
    assert.equal(effectiveAnchor(row, "impact"), 5);
    assert.equal(effectiveAnchor(row, "need"), 4);
    assert.equal(effectiveAnchor({ ...row, effectiveCriteria: null }, "impact"), 3);
    assert.equal(effectiveAnchor(null, "impact"), null);
});

test("correction blockers: unsupported criterion, same anchor, short locator / reason, no judgment", () => {
    assert.deepEqual(overrideBlockers({ criterion: "need", anchor: 5, locator: "EV-2 p.4", reason: "The partner letter on page 4 confirms the handover." }, row, CRITERIA), []);
    const bad = overrideBlockers({ criterion: "sdg", anchor: 7, locator: "x", reason: "short" }, row, CRITERIA);
    assert.deepEqual(bad, [
        "Choose a criterion the AI judged with evidence support.",
        "Select a corrected anchor from 0 to 5.",
        "Give the exact evidence or claim locator (file id, page, claim).",
        "Explain the overlooked evidence in at least 20 characters.",
    ]);
    assert.deepEqual(overrideBlockers({ criterion: "impact", anchor: 5, locator: "EV-3 p.2", reason: "Already corrected to five, nothing changes here." }, row, CRITERIA), ["This criterion already stands at 5/5."]);
    assert.equal(overrideBlockers({ criterion: "impact", anchor: 4, locator: "EV-3 p.2", reason: "No judgment exists yet for this package at all." }, { id: "x" }, CRITERIA)[0], "Run the Ranking Analyzer first: a correction must refer to an existing AI judgment.");
});

test("challenge blockers name every missing field", () => {
    assert.deepEqual(challengeBlockers({ publicationId: "p", reportId: "r", locator: "EV-1 p.2", reason: "The counted beneficiaries exclude the second cohort." }), []);
    assert.equal(challengeBlockers({ publicationId: "", reportId: "", locator: "", reason: "" }).length, 4);
});

test("audit lines carry the before/after summary, the locator and the reason", () => {
    const d = describeAction({ id: "a", action: "override.save", role: "ciel_admin", actorUserId: "u", reportId: "r", targetId: "o", at: "2026-11-10T00:00:00Z", details: { summary: "Classroom: impact 3 → 5/5", locator: "EV-3 p.2", reason: "Endline table overlooked" } });
    assert.equal(d.title, "Criterion correction");
    assert.equal(d.detail, "Classroom: impact 3 → 5/5 · Locator: EV-3 p.2 · Endline table overlooked");
    assert.equal(describeAction({ id: "b", action: "studio.publish", role: "university", actorUserId: "u", reportId: null, targetId: "p", at: "", details: {} }).title, "Ranking published");
});

test("feed status wording follows the server counts", () => {
    assert.deepEqual(feedHeadline(null), { label: "● NOT CHECKED", tone: "idle" });
    assert.deepEqual(feedHeadline(null, "HTTP 500"), { label: "● FEED NOT READY", tone: "error" });
    const feed = {
        connected: true,
        packageSource: "MY_IMPACT_WALL",
        approvedCIIFieldsReady: true,
        canRun: true,
        scope: "national",
        rubricVersion: "NPE-1.3",
        checkedAt: "2026-11-10T00:00:00Z",
        counts: { discovered: 12, eligible: 10, held: 2, evaluated: 10, awaitingRead: 0, pendingReviews: 0, corrections: 1, openChallenges: 0 },
        run: null,
        lastPublication: null,
    };
    assert.deepEqual(feedHeadline(feed), { label: "● IMPACT WALL CONNECTED", tone: "ok" });
    assert.equal(feedMessage(feed), "Server verified 12 approved packages from My Impact Wall (locked CII and badge included) · 10 passed the four-part check · 10 read by the AI evaluator · 2 held for verification · 1 active correction.");
    assert.equal(feedHeadline({ ...feed, counts: { ...feed.counts, awaitingRead: 3 } }).tone, "warn");
});

const point = (over) => ({
    publicationId: "p",
    signature: "sig-a",
    name: "Overall Project Excellence — All eligible projects",
    lens: "excellence",
    lensTitle: "Overall Project Excellence",
    groupBy: "project",
    scope: "national",
    revision: 1,
    cohortComparable: false,
    publishedAt: "2026-01-01T00:00:00Z",
    rank: 5,
    of: 20,
    label: "Classroom",
    movement: "new",
    previousRank: null,
    ...over,
});

test("rank progression: series per ranking, percentile, sparkline and the four trend readings", () => {
    const pts = [
        point({ publicationId: "a1", revision: 1, rank: 5 }),
        point({ publicationId: "a2", revision: 2, rank: 3, cohortComparable: true, publishedAt: "2026-02-01T00:00:00Z" }),
        point({ publicationId: "b1", signature: "sig-b", name: "SDG 4", lens: "sdg", rank: 1, of: 8, publishedAt: "2026-03-01T00:00:00Z" }),
    ];
    const series = rankSeries(pts);
    assert.equal(series.length, 2);
    assert.equal(series[0].signature, "sig-b", "most recently published ranking first");
    const a = series.find((s) => s.signature === "sig-a");
    assert.deepEqual(a.points.map((p) => p.revision), [1, 2]);
    assert.equal(rankPercentile(1, 20), 100);
    assert.equal(rankPercentile(20, 20), 0);
    assert.equal(rankPercentile(1, 1), 100);
    assert.equal(bestPublishedRank(a), 3);
    assert.equal(trendReading(a).kind, "up");
    assert.equal(trendReading(a).label, "↑ Improved 2 places");
    assert.equal(trendReading(series.find((s) => s.signature === "sig-b")).kind, "new");
    assert.equal(trendReading(null).kind, "none");
    const cohort = rankSeries([pts[0], point({ publicationId: "a3", revision: 2, rank: 9, of: 40, cohortComparable: false, publishedAt: "2026-02-01T00:00:00Z" })])[0];
    assert.equal(trendReading(cohort).kind, "cohort");
    assert.match(trendReading(cohort).detail, /no direct rank comparison is claimed/);
    const same = rankSeries([pts[0], point({ publicationId: "a4", revision: 2, rank: 5, cohortComparable: true, publishedAt: "2026-02-01T00:00:00Z" })])[0];
    assert.equal(trendReading(same).kind, "same");
    const down = rankSeries([pts[0], point({ publicationId: "a5", revision: 2, rank: 6, cohortComparable: true, publishedAt: "2026-02-01T00:00:00Z" })])[0];
    assert.equal(trendReading(down).label, "↓ Fell 1 place");
    const spark = sparklinePoints(a.points);
    assert.equal(spark.length, 2);
    assert.ok(spark[1].y < spark[0].y, "a better rank plots higher");
    assert.deepEqual(sparklinePoints([pts[0]]), []);
});

test("the studio wires the governance routes and both controllers expose them", () => {
    const gov = read("src/components/ciel/community-service/national-ranking/StudioGovernance.tsx");
    for (const route of ["/feed", "/audit", "/overrides", "/overrides/${encodeURIComponent(id)}/revoke", "/challenges", "/challenges/${encodeURIComponent(id)}/resolve", "/project/${encodeURIComponent(project.id)}/history"]) {
        assert.ok(gov.includes(`\`\${studioBase}${route}\``), route);
    }
    const studio = read("src/components/ciel/community-service/national-ranking/NationalRankingStudio.tsx");
    assert.match(studio, /<FeedStrip studioBase=\{studioBase\}/);
    assert.match(studio, /onOverrideChanged=\{async \(\) => \{/);
    assert.match(studio, /refreshKey=\{govKey\}/);
    const parts = read("src/components/ciel/community-service/national-ranking/StudioParts.tsx");
    assert.match(parts, /<CorrectionPanel studioBase=\{studioBase\} row=\{row\} criteria=\{criteria\} onChanged=\{onOverrideChanged\} \/>/);
    const screens = read("src/components/ciel/community-service/national-ranking/StudioScreens.tsx");
    assert.match(screens, /<AuditPanel studioBase=\{studioBase\}/);
    assert.match(screens, /<ChallengesPanel studioBase=\{studioBase\}/);
    assert.match(screens, /<FlashcardProjection key=\{project\.id\} studioBase=\{studioBase\}/);
    assert.match(screens, /<RaiseChallengeForm studioBase=\{studioBase\}/);
    // the existing tabs and their order are untouched
    assert.ok(studio.indexOf('["analyzer", "Overview & Run"]') < studio.indexOf('["review",'));
    assert.ok(studio.indexOf('["published", "My Impact Wall"]') < studio.indexOf('["history", "Ranking History"]'));
});
