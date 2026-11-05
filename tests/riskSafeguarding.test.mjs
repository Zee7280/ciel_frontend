// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
    consentLabel,
    hasRiskBlockContent,
    realRiskIds,
    riskBlockErrors,
    riskFactorIds,
    riskFactorLabel,
    toggleRiskFactor,
} from "../src/app/dashboard/student/report/utils/riskSafeguarding.ts";

test("None identified is exclusive in both directions", () => {
    assert.deepEqual(toggleRiskFactor(["children_present", "travel_to_site"], "none"), ["none"]);
    assert.deepEqual(toggleRiskFactor(["none"], "children_present"), ["children_present"]);
    assert.deepEqual(toggleRiskFactor(["children_present"], "children_present"), []);
    assert.deepEqual(toggleRiskFactor(undefined, "handling_money"), ["handling_money"]);
});

test("tolerates missing or malformed saved values (older reports)", () => {
    assert.deepEqual(riskFactorIds(undefined), []);
    assert.deepEqual(riskFactorIds("children_present"), []);
    assert.deepEqual(riskFactorIds(["a", "", 3, null, "b"]), ["a", "b"]);
    assert.deepEqual(realRiskIds(["none", "personal_data"]), ["personal_data"]);
    assert.equal(hasRiskBlockContent(undefined), false);
    assert.equal(hasRiskBlockContent({}), false);
    assert.equal(hasRiskBlockContent({ risk_factors: [], risk_mitigation: "  " }), false);
    assert.equal(hasRiskBlockContent({ risk_consent: "verbal" }), true);
});

test("validation only bites once a real risk is selected", () => {
    assert.deepEqual(riskBlockErrors(undefined), []);
    assert.deepEqual(riskBlockErrors({}), []);
    assert.deepEqual(riskBlockErrors({ risk_factors: ["none"] }), []);
    assert.deepEqual(
        riskBlockErrors({ risk_factors: ["children_present"] }).map((e) => e.field),
        ["risk_mitigation", "risk_consent", "risk_safeguarding_lead"],
    );
    assert.deepEqual(
        riskBlockErrors({
            risk_factors: ["children_present"],
            risk_mitigation: "x",
            risk_consent: "not_obtained",
            risk_safeguarding_lead: "Principal",
        }),
        [],
    );
});

test("labels fall back to the raw value for unknown ids", () => {
    assert.equal(riskFactorLabel("children_present"), "Children present");
    assert.equal(riskFactorLabel("legacy_x"), "legacy_x");
    assert.equal(consentLabel("written"), "Written consent obtained");
    assert.equal(consentLabel(""), "");
});
