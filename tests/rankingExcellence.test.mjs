// Ranking Studio — Excellence shortlist, Specialist awards and 440-question crosswalk (read-only views).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
    anchorsOf,
    comparativeNarrative,
    excellenceBand,
    keyReasons,
    rankReason,
    rankedRows,
    shortReason,
    shortlistWithTies,
    verificationExceptions,
    SPECIALIST_AWARDS,
    awardCandidate,
    computeSpecialistAwards,
} from "../src/components/ciel/community-service/national-ranking/studio-explain.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const CRITERIA = [
    ["impact", "Community Impact", 22],
    ["need", "Need & Relevance", 13],
    ["sustain", "Sustainability", 9],
    ["partner", "Collaboration", 9],
    ["efficiency", "Resource Efficiency", 9],
    ["sdg", "SDG Contribution", 9],
    ["scale", "Transferability", 9],
    ["learning", "Student Learning", 10],
].map(([key, label, weight]) => ({ key, title: label, label, weight }));

const row = (id, rank, score, anchors, over = {}) => ({
    id,
    title: `Project ${id}`,
    university: "BNU",
    pathway: "Community service",
    version: "v1",
    cii: 80,
    ciiLocked: true,
    status: "Ranked",
    reason: "",
    rank,
    score,
    evaluation: {
        readComplete: true,
        flags: [],
        summary: `Project ${id} repaired three classrooms. Teachers confirmed use.`,
        limitations: "Follow-up photos are from one school only. Second sentence.",
        criteria: Object.fromEntries(CRITERIA.map((c) => [c.key, { anchor: anchors[c.key] ?? 3, confidence: anchors[`${c.key}_conf`] ?? "high", reason: "" }])),
        claims: [],
    },
    ...over,
});

test("ranked rows keep the server's order; held and excluded rows become verification exceptions, never last place", () => {
    const rows = [
        row("b", 2, 80, {}),
        row("a", 1, 90, {}),
        row("held", null, null, {}, { status: "Review", reason: "Evidence original unreadable" }),
        row("x", null, null, {}, { status: "Excluded", reason: "" , evaluation: { readComplete: false, flags: ["Consent missing"], summary: "", limitations: "", criteria: {}, claims: [] } }),
    ];
    assert.deepEqual(rankedRows(rows).map((r) => r.id), ["a", "b"]);
    const ex = verificationExceptions(rows);
    assert.deepEqual(ex.map((e) => [e.id, e.status, e.reason]), [
        ["held", "Review", "Evidence original unreadable"],
        ["x", "Excluded", "Consent missing"],
    ]);
});

test("the shortlist cutoff never splits a tie", () => {
    const ranked = [row("a", 1, 90, {}), row("b", 2, 85, {}), row("c", 2, 85, {}), row("d", 4, 85, {}), row("e", 5, 70, {})];
    assert.deepEqual(shortlistWithTies(ranked, 2).map((r) => r.id), ["a", "b", "c", "d"]);
    assert.deepEqual(shortlistWithTies(ranked, 1).map((r) => r.id), ["a"]);
    assert.equal(shortlistWithTies(ranked, 50).length, 5);
});

test("anchors come from the evaluation, fall back to the score breakdown, and unsupported criteria earn no credit", () => {
    const r = row("a", 1, 90, { impact: 5, sustain: 2, sustain_conf: "unsupported" });
    const anchors = anchorsOf(r, CRITERIA);
    assert.equal(anchors.find((a) => a.key === "impact").anchor, 5);
    const { best, weakest } = keyReasons(anchors);
    assert.equal(best[0].key, "impact");
    assert.ok(!best.some((a) => a.key === "sustain"), "unsupported never leads");
    assert.notEqual(weakest.key, "sustain");
    // fallback: points per criterion → anchor out of 5
    const noEval = row("b", 2, 70, {}, { evaluation: null, scoreBreakdown: { cii: 8, criteria: { impact: 22, need: 6.5 }, total: 70 } });
    const fb = anchorsOf(noEval, CRITERIA);
    assert.equal(fb.find((a) => a.key === "impact").anchor, 5);
    assert.equal(fb.find((a) => a.key === "need").anchor, 2.5);
    assert.equal(fb.find((a) => a.key === "sdg").confidence, "unsupported");
});

test("explanations name the leading anchors, the achievement, the limitation and the locked CII", () => {
    const a = row("a", 1, 90, { impact: 5, need: 4, sustain: 2 });
    const b = row("b", 2, 80, { impact: 4, need: 4, sustain: 3 });
    const text = rankReason(a, 2, CRITERIA);
    assert.match(text, /ranked #1 of 2/);
    assert.match(text, /Community Impact 5\/5 and Need & Relevance 4\/5/);
    assert.match(text, /repaired three classrooms\./);
    assert.match(text, /main documented limitation is: Follow-up photos are from one school only\./);
    assert.match(text, /approved CII of 80\/100 is locked/);
    const cmp = comparativeNarrative(a, b, CRITERIA);
    assert.match(cmp, /^Compared with Project b \(rank #2\), Project a has stronger anchored performance in Community Impact \(5\/5 versus 4\/5\)/);
    assert.match(cmp, /however, it is lower in Sustainability \(2\/5 versus 3\/5\)/);
    assert.match(shortReason(a, CRITERIA), /^Community Impact 5\/5 and Need & Relevance 4\/5\. Project a repaired/);
});

test("display bands follow rank percentiles and the scope wording", () => {
    assert.equal(excellenceBand(1, 500, "ciel_admin"), "CIEL PK #1");
    assert.equal(excellenceBand(5, 500, "ciel_admin"), "CIEL PK Top 1%");
    assert.equal(excellenceBand(25, 500, "university"), "University Top 5%");
    assert.equal(excellenceBand(50, 500, "ciel_admin"), "CIEL PK Top 10%");
    assert.equal(excellenceBand(125, 500, "ciel_admin"), "CIEL PK Top 25%");
    assert.equal(excellenceBand(400, 500, "ciel_admin"), "CIEL PK Contributor");
    assert.equal(excellenceBand(3, 0, "ciel_admin"), "Pending");
});

test("specialist awards: proof gate, joint winners, not awarded, and never for unranked rows", () => {
    assert.equal(SPECIALIST_AWARDS.length, 8);
    const sustainable = SPECIALIST_AWARDS.find((a) => a.id === "sustainable");
    const strong = row("a", 1, 90, { sustain: 5, impact: 4 });
    const weakGuard = row("b", 2, 85, { sustain: 5, impact: 2 });
    const unsupportedLead = row("c", 3, 80, { sustain: 5, sustain_conf: "unsupported", impact: 4 });
    const tied = row("d", 4, 75, { sustain: 5, impact: 4 });
    const held = row("e", null, null, { sustain: 5, impact: 5 }, { status: "Review" });
    assert.ok(awardCandidate(strong, sustainable, CRITERIA));
    assert.equal(awardCandidate(weakGuard, sustainable, CRITERIA), null);
    assert.equal(awardCandidate(unsupportedLead, sustainable, CRITERIA), null);
    assert.equal(awardCandidate(held, sustainable, CRITERIA), null);
    const results = computeSpecialistAwards([strong, weakGuard, unsupportedLead, tied, held], CRITERIA);
    const s = results.find((r) => r.award.id === "sustainable");
    assert.equal(s.status, "awarded");
    assert.deepEqual(s.winners.map((w) => w.row.id), ["a", "d"], "joint winners on an equal comparator, overall rank orders them");
    assert.equal(s.winners[0].comparator, 4.8);
    const outcomes = results.find((r) => r.award.id === "outcomes");
    assert.equal(outcomes.status, "awarded", "impact 4 with need 3 passes the outcomes gate");
    // c's sustainability is unsupported, but its impact 4 / need 3 still passes the outcomes gate
    assert.deepEqual(outcomes.winners.map((w) => w.row.id), ["a", "c", "d"]);
    const leadership = results.find((r) => r.award.id === "leadership");
    assert.equal(leadership.status, "not_awarded", "no project has learning ≥ 4");
    assert.ok(computeSpecialistAwards([], CRITERIA).every((r) => r.status === "no_run"));
});

test("the 440-question reference file ships without demo answers and the studio wires the new tabs", () => {
    const bank = JSON.parse(readFileSync(path.join(root, "public/ciel-440-question-crosswalk.json"), "utf8"));
    assert.equal(bank.length, 440);
    const keys = Object.keys(bank[0]).sort();
    assert.deepEqual(keys, ["answerRule", "badgeTreatment", "cadence", "capture", "dimension", "gap", "id", "minimumData", "module", "owner", "question", "route"]);
    assert.ok(!JSON.stringify(bank).includes("source_record_ids"), "demo CSV answers are not shipped");
    assert.ok(!JSON.stringify(bank).includes("candidatePlatforms"), "internal platform codes are not shipped");
    assert.equal(new Set(bank.map((q) => q.module)).size, 27);
    assert.deepEqual(
        ["P", "A", "I", "E"].map((r) => bank.filter((q) => q.route === r).length),
        [155, 42, 234, 9],
    );
    // every award's related questions exist in the bank
    const ids = new Set(bank.map((q) => q.id));
    for (const a of SPECIALIST_AWARDS) for (const q of a.questions) assert.ok(ids.has(q), `${a.id}: ${q}`);

    const studio = readFileSync(path.join(root, "src/components/ciel/community-service/national-ranking/NationalRankingStudio.tsx"), "utf8");
    for (const tab of ['["shortlist", "Excellence shortlist"]', '["awards", "Specialist awards"]', '["crosswalk", "440-question crosswalk"]', '["rules", "Ranking rules"]']) {
        assert.ok(studio.includes(tab), tab);
    }
    // the crosswalk is admin-only; the existing tabs keep their order ahead of the new ones
    assert.match(studio, /role === "ciel_admin" \? \(\[\["crosswalk"/);
    assert.match(studio, /tab === "crosswalk" && role === "ciel_admin"/);
    assert.ok(studio.indexOf('["history", "Ranking history"]') < studio.indexOf('["shortlist", "Excellence shortlist"]'));
    // the new screens never call the ranking API
    const screens = readFileSync(path.join(root, "src/components/ciel/community-service/national-ranking/StudioExcellence.tsx"), "utf8");
    assert.doesNotMatch(screens, /authenticatedFetch|\/api\/v1\//);
    assert.match(screens, /fetch\(CROSSWALK_URL/);
});
