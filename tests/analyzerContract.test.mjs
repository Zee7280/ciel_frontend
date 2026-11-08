// Run: npm test
// public/ciel-analyzer.html is the Analyser R2 file shipped as a LOCAL Admin review tool. It must
// score with the same weights as the backend (cii-v4-5.constants.ts), stay offline unless ?live=1,
// and use the app's own badge assets instead of 25 MB of embedded PNGs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";

const file = new URL("../public/ciel-analyzer.html", import.meta.url);
const html = readFileSync(file, "utf8");
const block = (id) => JSON.parse(new RegExp(`<script id="${id}" type="application/json">(.*?)</script>`, "s").exec(html)[1]);
const contract = block("ciel-contract");
const rubric = block("ciel-rubric");
const spec = block("ciel-spec");

const BACKEND_SECTION_MAX = { 1: 10, 2: 10, 3: 5, 4: 30, 5: 10, 6: 10, 7: 15, 8: 5, 9: 5 };
const BACKEND_AI_DIMENSION_MAX = { 1: 10, 2: 10, 3: 5, "4A": 15, "4B": 15, 5: 10, 6: 10, 8: 5, 9: 5 };
const str = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [String(k), v]));

test("analyzer contract weights match the backend CII v4.5", () => {
    assert.deepEqual(Object.fromEntries(contract.scoring.package_sections.map((s) => [s.section, s.maximum])), str(BACKEND_SECTION_MAX));
    assert.deepEqual(Object.fromEntries(contract.scoring.ai_dimensions.map((d) => [d.dimension, d.maximum])), str(BACKEND_AI_DIMENSION_MAX));
    assert.equal(contract.scoring.bonus_max, 5);
    assert.equal(contract.framework_version, "5.0");
});

test("rubric criteria sum to each dimension's maximum (85 AI + 15 evidence) and carry the aligned version", () => {
    assert.equal(rubric.length, 45);
    const sums = {};
    for (const c of rubric) sums[c.dimension] = (sums[c.dimension] || 0) + c.max;
    for (const [dim, max] of Object.entries(BACKEND_AI_DIMENSION_MAX)) assert.ok(Math.abs(sums[dim] - max) < 1e-9, `${dim}: ${sums[dim]} vs ${max}`);
    assert.equal(sums["7"], 15);
    assert.equal(Object.values(sums).reduce((a, b) => a + b, 0), 100);
    assert.notEqual(contract.rubric_version, "CIEL-CII-2026.11-R2", "un-aligned R2 results must be refused");
    assert.equal(spec.rubricVersion, contract.rubric_version);
});

test("L6 qualification thresholds follow the backend gate ratios", () => {
    const l6 = contract.scoring.badge_policy.l6;
    assert.equal(l6.minimum_cii, 90);
    assert.equal(l6.minimum_measured_change, 12); // 0.8 × 15
    assert.equal(l6.minimum_manual_evidence, 12.75); // 0.85 × 15
    assert.equal(l6.minimum_sustainability, 3.5); // 0.7 × 5
    assert.ok(html.includes("Sustainability below 3.5/5"));
    assert.ok(html.includes("Manual evidence below 12.75/15"));
    assert.equal(html.includes("Sustainability below 8/10"), false);
});

test("the tool is offline unless opened with ?live=1", () => {
    assert.ok(html.includes("HOSTED=query.get('live')==='1';"));
    assert.equal(html.includes("query.get('demo')!=='1'"), false);
    assert.equal(contract.deployment.mode, "local_review_tool");
});

test("badge and logo artwork come from the app's public assets, not embedded PNGs", () => {
    assert.equal(html.includes("data:image/png;base64"), false);
    assert.ok(statSync(file).size < 6 * 1024 * 1024, "page should be a few MB, not ~29 MB");
    const badges = JSON.parse(/const BADGES = (\{.*?\});/s.exec(html)[1]);
    assert.deepEqual(Object.keys(badges), ["L1", "L2", "L3", "L4", "L5", "L6"]);
    for (const path of [...Object.values(badges), "/iel-pk-logo.png"]) {
        assert.ok(existsSync(new URL(`../public${path}`, import.meta.url)), path);
    }
});
