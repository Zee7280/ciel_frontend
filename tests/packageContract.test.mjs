// Run: npm test
// The static package viewer (public/ciel-impact-package.html) embeds a scoring contract that the
// Admin's "Analyzer packet" export carries. It must state the SAME weights the backend scores with
// (ciel_backend/src/reports/cii-v4-5.constants.ts) — otherwise reviewers read two different rubrics.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../public/ciel-impact-package.html", import.meta.url), "utf8");
const m = /<script id="ciel-analyzer-contract" type="application\/json">(.*?)<\/script>/s.exec(html);
const contract = JSON.parse(m[1]);

// Mirrors CII_V45_DIMENSIONS maxPoints in the backend (rubric CIEL-CII-2026.11-R3: 45 criteria, Partnership 5, Sustainability 10).
const BACKEND_SECTION_MAX = { 1: 10, 2: 10, 3: 5, 4: 30, 5: 10, 6: 5, 7: 15, 8: 5, 9: 10 };
const BACKEND_AI_DIMENSION_MAX = { 1: 10, 2: 10, 3: 5, "4A": 15, "4B": 15, 5: 10, 6: 5, 8: 5, 9: 10 };

test("package contract section maxima match the backend CII v4.5 weights", () => {
    const got = Object.fromEntries(contract.scoring.package_sections.map((s) => [s.section, s.maximum]));
    assert.deepEqual(got, Object.fromEntries(Object.entries(BACKEND_SECTION_MAX).map(([k, v]) => [String(k), v])));
    assert.equal(contract.scoring.ai_max, 85);
    assert.equal(contract.scoring.admin_evidence_max, 15);
    assert.equal(contract.scoring.bonus_max, 5);
});

test("AI dimension maxima match the backend and sum to 85", () => {
    const got = Object.fromEntries(contract.scoring.ai_dimensions.map((d) => [d.dimension, d.maximum]));
    assert.deepEqual(got, Object.fromEntries(Object.entries(BACKEND_AI_DIMENSION_MAX).map(([k, v]) => [String(k), v])));
    assert.equal(Object.values(got).reduce((a, b) => a + b, 0), 85);
});

test("evidence dimension stays Admin-manual /15 and badge bands are L1–L6", () => {
    assert.equal(contract.scoring.evidence_dimension.maximum, 15);
    assert.equal(contract.scoring.evidence_dimension.manual_admin_only, true);
    assert.deepEqual(
        contract.scoring.badge_bands.map((b) => b.code),
        ["L1", "L2", "L3", "L4", "L5", "L6"],
    );
});

test("the shipped viewer carries no demo data, form importer or original-form copy", () => {
    for (const dead of ['id="demo"', 'id="source-locked"', 'id="load-dialog"', 'id="load-button"', 'id="source-button"']) {
        assert.equal(html.includes(dead), false, dead);
    }
    assert.ok(html.includes("setTab,setAllowedTabs,setActions"));
    assert.ok(html.includes('id="analyzer-export-button" hidden'));
});
