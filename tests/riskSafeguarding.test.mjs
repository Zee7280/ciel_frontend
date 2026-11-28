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

test("V19 item 13: reviewer attention notes flag blank, incomplete and inconsistent safeguarding answers", async () => {
    const { safeguardingReviewNotes } = await import("../src/app/dashboard/student/report/utils/riskSafeguarding.ts");
    const codes = (block) => safeguardingReviewNotes(block).map((n) => n.code);

    assert.deepEqual(codes(undefined), ["block_blank"]);
    assert.deepEqual(codes({}), ["block_blank"]);
    assert.deepEqual(codes({ risk_factors: ["none"] }), []);

    assert.deepEqual(codes({ risk_factors: ["children_present"] }), ["fields_missing", "consent_missing_sensitive"]);
    assert.deepEqual(
        codes({ risk_factors: ["beneficiary_photos"], risk_mitigation: "x", risk_consent: "not_obtained", risk_safeguarding_lead: "Ms A" }),
        ["consent_not_obtained_sensitive"],
    );
    assert.deepEqual(
        codes({ risk_factors: ["personal_data"], risk_mitigation: "x", risk_consent: "not_applicable", risk_safeguarding_lead: "Ms A" }),
        ["consent_not_applicable_sensitive"],
    );
    assert.deepEqual(codes({ risk_factors: ["none"], risk_unresolved: "Roof still unsafe" }), ["none_but_details", "unresolved_risks"]);

    const clean = safeguardingReviewNotes({
        risk_factors: ["physical_work"],
        risk_mitigation: "Helmets and a contractor for heights",
        risk_consent: "written",
        risk_safeguarding_lead: "Mr B, site supervisor",
    });
    assert.deepEqual(clean.map((n) => [n.level, n.code]), [["info", "consent_student_reported"]]);
    assert.match(clean[0].message, /student-reported, not independently verified/);
});

test("2.3 is written into the Section 2 statement and summaries: one plain sentence set, nothing invented", async () => {
    const { safeguardingSummarySentence, safeguardingBannerLine } = await import("../src/app/dashboard/student/report/utils/riskSafeguarding.ts");
    assert.equal(safeguardingSummarySentence({}), "");
    assert.equal(safeguardingSummarySentence(null), "");
    assert.equal(safeguardingBannerLine({}), "Safeguarding block not answered yet.");
    const block = {
        risk_factors: ["children_present", "physical_work"],
        risk_mitigation: "All activities will be coordinated with SOS Children's Village management. Volunteers will use protective equipment.",
        risk_consent: "written",
        risk_safeguarding_lead: "Village Director",
        risk_unresolved: "",
    };
    assert.equal(
        safeguardingSummarySentence(block),
        "Safeguarding: children present and physical work / tools / heights were identified as risk factors; all activities will be coordinated with SOS Children's Village management. " +
            "Consent for photographs and personal data: written consent obtained (student-reported, not independently verified). " +
            "Responsible for safeguarding on site: Village Director.",
    );
    assert.equal(safeguardingBannerLine(block), "Safeguarding: 2 risk factors · written consent obtained (student-reported) · on-site lead named.");
    assert.equal(safeguardingSummarySentence({ risk_factors: ["none"] }), "Safeguarding: no risk factors were identified for this project.");
    assert.equal(safeguardingBannerLine({ risk_factors: ["none"] }), "Safeguarding: no risk factors identified.");
    assert.match(safeguardingSummarySentence({ risk_factors: ["travel_to_site"], risk_unresolved: "Transport for the last session is still unconfirmed." }), /Unresolved: Transport for the last session is still unconfirmed\.$/);
});

test("Section 2 wiring: the live statement, the AI-unavailable fallback and the banner all carry 2.3", async () => {
    const { readFileSync } = await import("node:fs");
    const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
    const s2 = read("src/app/dashboard/student/report/components/Section2ProjectContext.tsx");
    assert.match(s2, /safeguardingSummarySentence\(sectionData\),\s*\);/);
    assert.match(s2, /if \(safeguarding\) parts\.push\(safeguarding\);/);
    assert.match(s2, /hasRiskBlockContent\(sectionData\);/);
    for (const key of ["risk_factors", "risk_mitigation", "risk_consent", "risk_safeguarding_lead", "risk_unresolved"]) {
        assert.match(s2, new RegExp(`sectionData\\.${key},\\s*\\n`), `effect dep ${key}`);
    }
    const chrome = read("src/app/dashboard/student/report/ReportFormChrome.tsx");
    assert.match(chrome, /safeguardingBannerLine\(data\.section2\),/);
    assert.match(chrome, /🛡 \$\{riskFactorLabel\(id\)\}/);
    const draft = read("src/app/dashboard/student/report/utils/section2SmartDraft.ts");
    assert.match(draft, /const safeguarding = clean\(input\.safeguarding\);\s*if \(safeguarding\) parts\.push\(safeguarding\);/);
});
