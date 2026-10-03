import assert from "node:assert/strict";
import test from "node:test";
import { UNIVERSAL_UNITS } from "./section4Constants";
import { metricPickPatch, outcomeLadderOk, step1Ok, step3Ok, unitForOutputType } from "./section4Ladder";
import { validateSection4 } from "./validation";

const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");

const goodActivity = () => ({
    title: "Repaint",
    status: "Completed",
    primary_category: "📚 Education & Learning",
    sub_category: "Tutoring",
    description: words(20),
    outputs: [{ type: "Sessions Conducted", quantity: "3", unit: "Sessions" }],
    serves_beneficiaries: true,
    unique_beneficiaries: "120",
    beneficiaries_reached: "120",
    overlap_status: "Mostly Unique to This Activity",
    beneficiary_categories: ["Children"],
    reach_counting_method: "Manual counting by team",
    geographic_reach: "Single Site",
    ladder_ui: { open: 1 },
});

test("description limit is 15-60 words", () => {
    assert.equal(step1Ok({ ...goodActivity(), description: words(60) }), true);
    assert.equal(step1Ok({ ...goodActivity(), description: words(61) }), false);
});

test("a complete ladder activity passes submit validation; a zero quantity does not", () => {
    assert.equal(validateSection4({ activity_blocks: [goodActivity()] }).isValid, true);
    const bad = { ...goodActivity(), outputs: [{ type: "Sessions Conducted", quantity: "0", unit: "Sessions" }] };
    assert.equal(validateSection4({ activity_blocks: [bad] }).isValid, false);
});

test("ladder activity missing overlap / counting method / geography cannot submit", () => {
    for (const patch of [{ overlap_status: "" }, { reach_counting_method: "" }, { geographic_reach: "" }]) {
        assert.equal(validateSection4({ activity_blocks: [{ ...goodActivity(), ...patch }] }).isValid, false);
    }
});

test("clearing unique people does not fall back to a stale gross value", () => {
    assert.equal(step3Ok({ ...goodActivity(), unique_beneficiaries: "", beneficiaries_reached: "" }), false);
});

test("legacy (non-ladder) activity keeps the lighter rule", () => {
    const { ladder_ui, ...legacy } = goodActivity();
    void ladder_ui;
    assert.equal(validateSection4({ activity_blocks: [legacy] }).isValid, true);
});

test("metric picks follow the metric, not a hard-coded Access-to-Education default", () => {
    const trees = metricPickPatch("Trees surviving", "🌿 Environment, Climate & Biodiversity");
    assert.equal(trees.outcome_area, "9. Environmental Improvement");
    assert.equal(trees.unit, "Trees");
    const income = metricPickPatch("Yield / income (PKR)", "🌾 Agriculture, Rural & Animal Support");
    assert.equal(income.outcome_area, "6. Economic Improvement");
    assert.equal(income.unit, "PKR");
    assert.equal(metricPickPatch("Attendance rate (%)", "📚 Education & Learning").unit, "%");
    assert.notEqual(metricPickPatch("My own metric").unit, "");
});

test("every mapped output unit exists in the unit list", () => {
    for (const t of ["Volunteer Hours", "Trees Planted", "Kits Distributed", "Waste Collected / Diverted", "Rooms / Classrooms Improved", "Households Supported", "Individuals Reached", "Something else"]) {
        const u = unitForOutputType(t);
        assert.ok(u === "Items" || UNIVERSAL_UNITS.includes(u), `${t} -> ${u}`);
    }
});

test("proof is a short note, not 20 words", () => {
    const o = { metric: "Other", metric_other: "Attendance", outcome_area: "x", baseline: "55", endline: "82", sure: 1, confidence_level: ["Directly Measured"] };
    assert.equal(outcomeLadderOk({ ...o, measurement_explanation: "attendance register, 4 weeks" }), true);
    assert.equal(outcomeLadderOk({ ...o, measurement_explanation: "" }), false);
});
