import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
    activityIssues,
    baselineFromSection2,
    buildSection4Summary,
    challengeTagIssues,
    deliveryOk,
    effectiveReachMode,
    NO_CHALLENGES_TAG,
    reachIssues,
    reachStatusLine,
    simpleMeasureChangeLine,
    simpleMeasureIssues,
    suggestedUnitForOutput,
} from "../src/app/dashboard/student/report/utils/section4Streamlined.ts";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const subs = (c) => (c === "Education" ? ["Tutoring", "Other"] : []);

test("V19 activity: name, status, category (+sub), what-we-did and delivery are required; evidence is optional", () => {
    const good = {
        title: "English workshops",
        status: "Completed",
        primary_category: "Education",
        sub_category: "Tutoring",
        description: "Ran four weekly English workshops for grade five.",
        outputs: [{ type: "Sessions Conducted", quantity: "4", unit: "Sessions" }],
    };
    assert.deepEqual(activityIssues(good, 0, subs), []);
    assert.equal(activityIssues({ ...good, title: "" }, 0, subs)[0].field, "activity_blocks.0.title");
    assert.equal(activityIssues({ ...good, status: "" }, 0, subs)[0].field, "activity_blocks.0.status");
    assert.equal(activityIssues({ ...good, sub_category: "" }, 0, subs)[0].field, "activity_blocks.0.sub_category");
    assert.equal(activityIssues({ ...good, primary_category: "Other", other_category_text: "" }, 0, subs)[0].field, "activity_blocks.0.other_category_text");
    assert.equal(activityIssues({ ...good, sub_category: "Other" }, 0, subs)[0].field, "activity_blocks.0.other_sub_category_text");
    // Delivery: a complete output, or the explicit no-output declaration with a reason.
    assert.equal(deliveryOk({ ...good, outputs: [{ type: "Sessions Conducted", quantity: "0", unit: "Sessions" }] }), false);
    assert.equal(deliveryOk({ ...good, outputs: [{ type: "Other", type_other: "", quantity: "2", unit: "Items" }] }), false);
    assert.equal(deliveryOk({ ...good, outputs: [{ type: "Other", type_other: "Murals", quantity: "2", unit: "Items" }] }), true);
    assert.equal(deliveryOk({ ...good, outputs: [], no_output: true }), false);
    assert.equal(deliveryOk({ ...good, outputs: [], no_output: true, no_output_reason: "Awareness talk only" }), true);
    assert.match(activityIssues({ ...good, outputs: [], no_output: true }, 1, subs)[0].message, /explain briefly why/);
});

test("4.2 community reach is one project-level answer; legacy per-activity counts are read as 'counted'", () => {
    assert.equal(reachIssues({}, [])[0].field, "project_summary.reach_mode");
    assert.equal(reachIssues({ reach_mode: "counted" }, []).length, 2);
    assert.deepEqual(reachIssues({ reach_mode: "counted", distinct_total_beneficiaries: "30", counting_method: "Register" }, []), []);
    assert.deepEqual(reachIssues({ reach_mode: "unconfirmed" }, []), []);
    assert.deepEqual(reachIssues({ reach_mode: "none" }, []), []);
    assert.equal(effectiveReachMode({ distinct_total_beneficiaries: "120" }, []), "counted");
    assert.equal(effectiveReachMode({}, [{ beneficiaries_reached: "40" }]), "counted");
    assert.equal(effectiveReachMode({}, []), "");
    assert.match(reachStatusLine({}, [{ beneficiaries_reached: "40" }, { beneficiaries_reached: "10" }]), /50 activity-level engagements/);
    assert.match(reachStatusLine({ reach_mode: "unconfirmed" }, []), /^Unique reach unconfirmed · 0 activity-level engagements/);
    assert.match(reachStatusLine({ reach_mode: "counted", distinct_total_beneficiaries: "30", counting_method: "Register" }, []), /^30 unique people .* Source: Register$/);
});

test("4.3: baseline comes from Section 2; the one measurable result is optional but must be complete once started", () => {
    assert.equal(baselineFromSection2({}), "");
    assert.equal(baselineFromSection2({ problem_statement: "Classrooms had no working lights.", affected_group: "Grade 5", affected_count: "30" }), "Classrooms had no working lights. Affected: Grade 5, ~30.");
    assert.equal(baselineFromSection2({ baseline_smart_draft: "Draft baseline.", problem_statement: "x" }), "Draft baseline.");
    assert.deepEqual(simpleMeasureIssues(null), []);
    assert.deepEqual(simpleMeasureIssues({ simple: true }), []);
    assert.equal(simpleMeasureIssues({ simple: true, metric: "Reading score" }).length, 4);
    const full = { simple: true, metric: "Reading score", unit: "score", baseline: "40", endline: "55", measurement_explanation: "Assessment sheets" };
    assert.deepEqual(simpleMeasureIssues(full), []);
    assert.equal(simpleMeasureChangeLine(full), "Reading score: 40 → 55 = +15 score (+37.5%) · student-reported, not independently verified. Attribution not established.");
    assert.equal(simpleMeasureChangeLine({ ...full, unit: "%", baseline: "60", endline: "72" }), "Reading score: 60 → 72 = +12 percentage points · student-reported, not independently verified. Attribution not established.");
});

test("4.4 challenges: one or more tags, and 'No significant challenges' stands alone", () => {
    assert.equal(challengeTagIssues([])[0].field, "challenge_tags");
    assert.deepEqual(challengeTagIssues(["⏰ Not enough time"]), []);
    assert.deepEqual(challengeTagIssues([NO_CHALLENGES_TAG]), []);
    assert.match(challengeTagIssues([NO_CHALLENGES_TAG, "⏰ Not enough time"])[0].message, /cannot be selected together/);
});

test("output picker suggests a sensible unit", () => {
    assert.equal(suggestedUnitForOutput("Sessions Conducted"), "Sessions");
    assert.equal(suggestedUnitForOutput("Trainings Delivered"), "Trainings");
    assert.equal(suggestedUnitForOutput("Trees Planted"), "Trees");
    assert.equal(suggestedUnitForOutput("Books / Learning Materials"), "Books / Materials");
    assert.equal(suggestedUnitForOutput("Rooms / Classrooms Improved"), "Rooms / Classrooms");
    assert.equal(suggestedUnitForOutput("Waste Collected / Diverted"), "Kilograms");
    assert.equal(suggestedUnitForOutput("Kits Distributed"), "Kits");
    assert.equal(suggestedUnitForOutput("Other"), "Items");
});

test("the auto-generated section summary is honest field text (counts, reach caveat, results, challenges)", () => {
    const s = buildSection4Summary({
        activities: [
            { title: "Workshops", status: "Completed", outputs: [{ type: "Sessions Conducted", quantity: "4", unit: "Sessions" }] },
            { title: "Clean-up", status: "Ongoing", outputs: [], no_output: true, no_output_reason: "Awareness only" },
            { title: "" },
        ],
        projectSummary: { reach_mode: "unconfirmed" },
        observedChange: "Lights were installed; learning not assessed",
        howWeKnow: "Before/after photos",
        measure: null,
        legacyOutcomeCount: 1,
        challenges: "Limited time.",
        challengeTags: ["⏰ Not enough time", "✨ Other"],
    });
    assert.equal(s.majorActivities, 2);
    assert.equal(s.outputRecords, 1);
    assert.equal(s.uniqueLabel, "Unconfirmed");
    assert.match(s.activitiesText, /Workshops — Completed\. Reported outputs: 4 Sessions \(Sessions Conducted\)/);
    assert.match(s.activitiesText, /Clean-up — Ongoing\. No countable output declared: Awareness only/);
    assert.match(s.reachText, /defensible unique beneficiary total has not yet been established/);
    assert.match(s.resultsText, /Lights were installed; learning not assessed\. Evidence basis: Before\/after photos\. 1 previously recorded quantitative comparison was retained/);
    assert.match(s.challengesText, /^Reported challenges: Not enough time, Other\. Limited time\./);
    assert.equal(buildSection4Summary({ activities: [] }).activitiesText, "No major activities recorded yet.");
    assert.equal(buildSection4Summary({ activities: [], projectSummary: { reach_mode: "none" } }).uniqueLabel, "None");
});

test("the report wizard renders the streamlined Section 4 (activities, reach, results, challenges, summary) on existing keys", () => {
    const page = read("src/app/dashboard/student/report/page.tsx");
    assert.match(page, /import Section4Streamlined from '\.\/components\/Section4Streamlined';/);
    assert.match(page, /<Section4Streamlined \/>/);
    assert.doesNotMatch(page, /<Section4Activities \/>|<Section5Outcomes \/>/);
    const ui = read("src/app/dashboard/student/report/components/Section4Streamlined.tsx");
    for (const marker of [
        "data-ciel-section4-v19",
        "Activities &amp; outputs",
        "No countable output is applicable to this activity",
        "Supporting evidence (optional here)",
        "Did the project directly reach people?",
        "Baseline · automatically from Section 2",
        "What changed as a result of the work (if anything)?",
        "How do you know?",
        "One optional measurable result (before / after)",
        "Challenges &amp; limitations",
        "Auto-generated Section 4 summary",
        "Refresh summary",
        "Finalise Section 4 →",
    ]) {
        assert.ok(ui.includes(marker), marker);
    }
    // Existing keys only: activity_blocks / project_summary / section5.* (no new top-level sections).
    assert.match(ui, /updateSection\("section4", \{ activity_blocks: next \}\)/);
    assert.match(ui, /updateSection\("section5", \{ observed_change: e\.target\.value \}\)/);
    assert.match(ui, /updateSection\("section5", \{ challenge_tags: next \}\)/);
    const validation = read("src/app/dashboard/student/report/utils/validation.ts");
    assert.match(validation, /observed_change: \{ min: 8, max: 100 \}/);
    assert.match(validation, /reachIssues\(asObj\(data\.project_summary\), activityBlocks\)/);
    assert.match(validation, /simpleMeasureIssues\(simpleRow \? asObj\(simpleRow\) : null\)/);
    assert.match(validation, /challengeTagIssues\(data\.challenge_tags\)/);
});
