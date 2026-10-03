import assert from "node:assert/strict";
import {
    getIncompleteSectionsSummary,
    validateSection1,
    validateSection2,
    validateSection3,
    validateSection4,
    validateSection5,
    validateSection6,
    validateSection7,
    validateSection8,
    validateSection9,
    validateSection10,
} from "./validation";

function words(n: number): string {
    return Array.from({ length: n }, () => "word").join(" ");
}

const COMPETENCY_SCORES = {
    cognitive_systemic: 3,
    cognitive_critical: 3,
    cognitive_evaluate: 3,
    practical_design: 3,
    practical_evidence: 3,
    practical_engagement: 3,
    social_empathy: 3,
    social_diversity: 3,
    social_collaboration: 3,
    transformative_longterm: 3,
    transformative_benefits: 3,
    transformative_sustainability: 3,
};

const COMPLETE = {
    section1: {
        privacy_consent: true,
        review_checked: [true, true, true],
    },
    section2: {
        problem_statement: words(22),
        affected_group: "Households without safe water",
        affected_count: "40",
        system_gaps: ["Access"],
        discipline: "Environmental Engineering",
        discipline_contribution: words(16),
        baseline_evidence: ["Survey"],
    },
    section3: {
        contribution_intent_statement: words(32),
    },
    section4: {
        activity_blocks: [
            {
                title: "Water filter installation",
                primary_category: "Infrastructure",
                sub_category: "Water / Sanitation Infrastructure",
                status: "Completed",
                description: words(16),
                outputs: [{ title: "Filters installed", quantity: "5" }],
            },
        ],
    },
    section5: {
        observed_change: words(42),
        challenges: words(16),
        measurable_outcomes: [
            {
                outcome_area: "Health",
                outcome_sub_category: "Water quality",
                metric_category: "Health outcome",
                metric: "Households served",
                baseline: 0,
                endline: 50,
                unit: "households",
                confidence_level: ["Directly Measured"],
                measurement_explanation: words(22),
            },
        ],
    },
    section6: { use_resources: "no" },
    section7: { has_partners: "no" },
    section8: {
        has_evidence: "no",
        media_visible: "internal",
        ethical_compliance: {
            authentic: true,
            informed_consent: true,
            no_harm: true,
            privacy_respected: true,
        },
    },
    section9: {
        academic_integration: "Course-linked assignment",
        skills_grown: ["Communication"],
        reflection_biggest_learning: "listening",
        reflection_moment: "first household visit",
        reflection_discipline_help: "field notes",
        personal_learning: words(22),
        academic_application: words(22),
        competency_scores: COMPETENCY_SCORES,
    },
    section10: {
        continuation_status: "no",
        continuation_details: words(62),
        mechanisms: ["No continuation mechanism"],
        scaling_potential: "Not scalable",
        policy_influence: "No",
    },
};

function assertNoThrow(fn: () => unknown, label: string) {
    try {
        fn();
    } catch (error) {
        assert.fail(`${label} threw: ${error instanceof Error ? error.message : String(error)}`);
    }
}

assert.equal(validateSection1(null).isValid, false, "section 1 null is incomplete");
assert.equal(validateSection2(undefined).isValid, false, "section 2 undefined is incomplete");
assertNoThrow(() => validateSection3({ secondary_sdgs: { 0: {} } }), "section 3 non-array secondary_sdgs");
assertNoThrow(() => validateSection4({ activity_blocks: { 0: {} } }), "section 4 non-array activity_blocks");
assertNoThrow(() => validateSection5({ measurable_outcomes: { 0: {} } }), "section 5 non-array outcomes");
assertNoThrow(() => validateSection6({ use_resources: "yes", resources: { 0: {} } }), "section 6 non-array resources");
assertNoThrow(() => validateSection7({ has_partners: "yes", partners: { 0: {} } }), "section 7 non-array partners");
assertNoThrow(() => validateSection8({ evidence_files: {}, evidence_types: "photo" }), "section 8 non-array evidence");
assertNoThrow(() => validateSection9({ skills_grown: { 0: "other" } }), "section 9 non-array skills");
assertNoThrow(() => validateSection10({ mechanisms: { 0: "other" } }), "section 10 non-array mechanisms");
assertNoThrow(() => getIncompleteSectionsSummary(null as never), "summary null report");

assert.equal(validateSection1({ privacy_consent: true }).isValid, false, "consent alone is not enough");
assert.equal(validateSection1({ review_checked: [true, true, true] }).isValid, true, "three boxes pass section 1");

assert.equal(validateSection2({}).isValid, false);
assert.equal(validateSection2(COMPLETE.section2).isValid, true, "complete section 2");
assert.equal(
    validateSection2({ ...COMPLETE.section2, affected_count: "0" }).errors.some((e) => e.field === "affected_count"),
    true,
);

assert.equal(validateSection3({ contribution_intent_statement: "we solved it" }).isValid, false);
assert.equal(validateSection3(COMPLETE.section3).isValid, true);

assert.equal(validateSection4({}).isValid, false);
assert.equal(validateSection4(COMPLETE.section4).isValid, true);
assert.equal(
    validateSection4({
        activity_blocks: [{ ...COMPLETE.section4.activity_blocks[0], outputs: [], beneficiaries_reached: "" }],
    }).errors.some((e) => e.field.endsWith(".outputs")),
    true,
);

assert.equal(validateSection5({}).isValid, false);
assert.equal(validateSection5(COMPLETE.section5).isValid, true);
assert.equal(
    validateSection5({
        ...COMPLETE.section5,
        measurable_outcomes: [{ ...COMPLETE.section5.measurable_outcomes[0], metric: "Other", metric_other: "" }],
    }).errors.some((e) => e.field.endsWith("metric_other")),
    true,
);

assert.equal(validateSection6({}).isValid, false);
assert.equal(validateSection6({ use_resources: "no" }).isValid, true);
assert.equal(validateSection6({ use_resources: "yes", resources: [] }).isValid, false);
assert.equal(
    validateSection6({
        use_resources: "yes",
        resources: [{ purpose: "Printed worksheets for the session", type: "Print", unit: "pages", sources: ["Self"] }],
    }).isValid,
    true,
);

assert.equal(validateSection7({}).isValid, false);
assert.equal(validateSection7({ has_partners: "no" }).isValid, true);
assert.equal(validateSection7({ has_partners: "yes", partners: [{}] }).isValid, false);
assert.equal(
    validateSection7({
        has_partners: "yes",
        partners: [{ name: "Local clinic", type: "NGO", role: ["Host"], contribution: ["Venue"] }],
    }).isValid,
    true,
);

assert.equal(validateSection8({}).isValid, false);
assert.equal(validateSection8(COMPLETE.section8).isValid, true);
assert.equal(
    validateSection8({
        has_evidence: "yes",
        evidence_files: ["https://example.com/a.jpg"],
        evidence_types: ["Photo"],
        description: words(12),
        media_visible: "internal",
        ethical_compliance: COMPLETE.section8.ethical_compliance,
    }).isValid,
    true,
);

assert.equal(validateSection9({}).isValid, false);
assert.equal(validateSection9(COMPLETE.section9).isValid, true);

assert.equal(validateSection10({}).isValid, false);
assert.equal(validateSection10(COMPLETE.section10).isValid, true);
assert.equal(validateSection10({ ...COMPLETE.section10, continuation_details: "too short" }).isValid, false);

const incomplete = getIncompleteSectionsSummary({
    section1: {},
    section2: {},
    section3: {},
    section4: {},
    section5: {},
    section6: {},
    section7: {},
    section8: {},
    section9: {},
    section10: {},
});
assert.equal(incomplete.length, 10, "empty report fails every section 1–10");

const complete = getIncompleteSectionsSummary(COMPLETE);
assert.deepEqual(complete, [], "complete wizard payload has no incomplete sections");

console.log("validation.spec.ts: all section checks passed");
