import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";

// `section4Streamlined.ts` imports the shared chip-label helper without an extension (as the Next
// bundle expects); Node's type stripping needs one, so resolve "./x" -> "./x.ts" for this test only.
registerHooks({
    resolve(specifier, context, nextResolve) {
        try {
            return nextResolve(specifier, context);
        } catch (error) {
            if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context);
            throw error;
        }
    },
});

const {
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
    legacyOutcomeIssues,
    legacyOutcomeLabel,
    legacyOutcomeToSimple,
    outcomeHasContent,
    outcomeIsMeasured,
    splitOutcomes,
} = await import("../src/app/dashboard/student/report/utils/section4Streamlined.ts");

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

test("4.2 conflict: a unique total above the activity-level engagements blocks and is called out", async () => {
    const { reachConflict } = await import("../src/app/dashboard/student/report/utils/section4Streamlined.ts");
    const acts = [{ beneficiaries_reached: "20" }, { beneficiaries_reached: "10" }];
    assert.equal(reachConflict({ distinct_total_beneficiaries: "30" }, acts), false);
    assert.equal(reachConflict({ distinct_total_beneficiaries: "31" }, acts), true);
    assert.equal(reachConflict({ distinct_total_beneficiaries: "500" }, []), false, "no activity counts → nothing to conflict with");
    const issues = reachIssues({ reach_mode: "counted", distinct_total_beneficiaries: "31", counting_method: "Register" }, acts);
    assert.match(issues[0].message, /Conflicting project and activity counts/);
    assert.match(reachStatusLine({ reach_mode: "counted", distinct_total_beneficiaries: "31", counting_method: "Register" }, acts), /reconcile/);
});

test("4.3 'How do you know?' chips (evidence basis) and the detailed report carry the new fields; old components are gone", () => {
    const ui = read("src/app/dashboard/student/report/components/Section4Streamlined.tsx");
    assert.match(ui, /data-ciel-evidence-basis/);
    assert.match(ui, /updateSection\("section5", \{ evidence_basis_tags: next/);
    const builder = read("src/app/dashboard/student/report/impact-package/buildImpactPackageDetailedReport.ts");
    assert.match(builder, /no_countable_output: block\.no_output === true/);
    assert.match(builder, /linked_evidence: text\(block\.evidence_ref\)/);
    assert.match(builder, /"Did the project directly reach people\?"/);
    assert.match(builder, /row\("Evidence basis", data\.section5\?\.evidence_basis_tags \|\| \[\]\)/);
    assert.match(builder, /row\("Section 4 summary \(field-generated\)", text\(data\.section4\?\.summary_text\)\)/);
    const ctx = read("src/app/dashboard/student/report/context/ReportContext.tsx");
    for (const key of ["no_output?: boolean;", "evidence_ref?: string;", 'reach_mode?: "counted" | "unconfirmed" | "none" | "";', "simple?: boolean;", "evidence_basis_tags?: string[];"]) {
        assert.ok(ctx.includes(key), key);
    }
    assert.throws(() => readFileSync(new URL("../src/app/dashboard/student/report/components/Section4Activities.tsx", import.meta.url)));
    assert.throws(() => readFileSync(new URL("../src/app/dashboard/student/report/components/Section5Outcomes.tsx", import.meta.url)));
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
    assert.match(validation, /simpleMeasureIssues\(split\.simple \? asObj\(split\.simple\) : null\)/);
    assert.match(validation, /challengeTagIssues\(data\.challenge_tags\)/);
});

test("'No significant challenges' keeps its 'No' in the composed summary and reads as a sentence, with or without a narrative", () => {
    const none = buildSection4Summary({ activities: [], challengeTags: ["No significant challenges"] });
    assert.equal(none.challengesText, "No significant challenges were reported.");
    assert.doesNotMatch(none.challengesText, /Reported challenges: significant/);
    const withNote = buildSection4Summary({ activities: [], challengeTags: ["No significant challenges"], challenges: "Weather delayed one session." });
    assert.equal(withNote.challengesText, "No significant challenges were reported. Weather delayed one session.");
    // Emoji chips still lose only their emoji.
    const tagged = buildSection4Summary({ activities: [], challengeTags: ["⏰ Not enough time", "📊 Missing baseline / follow-up data"] });
    assert.equal(tagged.challengesText, "Reported challenges: Not enough time, Missing baseline / follow-up data. Limitations narrative pending.");
});

test("the live banner does not count 'No significant challenges' as a limitation", () => {
    const chrome = read("src/app/dashboard/student/report/ReportFormChrome.tsx");
    assert.match(chrome, /noChallenges \? "No significant challenges reported\." : challenges \? `\$\{plural\(challenges, "limitation"\)\} named\.` : ""/);
});


test("earlier-version outcome rows: a blank row is nothing, a row with content is legacy, the V19 result is found by its flag", () => {
    const blank = { id: "old-1", outcome_area: "", metric: "", baseline: "", endline: "", unit: "", confidence_level: ["Student-reported"] };
    const legacy = { id: "old-2", outcome_sub_category: "Attendance", baseline: "55", endline: "", unit: "%" };
    const simple = { id: "oc-1", simple: true, metric: "QA calculation test", baseline: "55", endline: "" };
    assert.equal(outcomeHasContent(blank), false);
    assert.equal(outcomeHasContent(legacy), true);
    assert.equal(outcomeIsMeasured(legacy), false);
    assert.equal(outcomeIsMeasured({ ...legacy, endline: "72" }), true);
    const split = splitOutcomes([blank, simple, legacy]);
    assert.equal(split.simpleIndex, 1);
    assert.equal(split.simple.metric, "QA calculation test");
    assert.deepEqual(split.blankIndexes, [0]);
    assert.deepEqual(split.legacy.map((l) => l.index), [2]);
    assert.equal(legacyOutcomeLabel(legacy), "Attendance");
    assert.ok(legacyOutcomeIssues(legacy, 0).some((i) => i.field === "measurable_outcomes.0.endline"));
    // Adopting a legacy row into the editable V19 result keeps its numbers and maps its unit.
    const adopted = legacyOutcomeToSimple({ ...legacy, unit: "households", measurement_explanation: "School register" });
    assert.equal(adopted.simple, true);
    assert.equal(adopted.metric, "Attendance");
    assert.equal(adopted.baseline, "55");
    assert.equal(adopted.unit, "Other");
    assert.equal(adopted.unit_other, "households");
    assert.equal(legacyOutcomeToSimple({ ...legacy, unit: "%" }).unit, "%");
});

test("the auto summary names a started-but-incomplete result and does not call a blank row a retained comparison", () => {
    const half = buildSection4Summary({ activities: [], measure: { simple: true, metric: "QA calculation test", baseline: "55", endline: "" }, legacyOutcomeCount: 0 });
    assert.match(half.resultsText, /The before \/ after result \(QA calculation test\) is started but incomplete — finish it or clear it before submitting\./);
    assert.doesNotMatch(half.resultsText, /previously recorded quantitative comparison/);
    const retained = buildSection4Summary({ activities: [], measure: null, legacyOutcomeCount: 1 });
    assert.match(retained.resultsText, /1 previously recorded quantitative comparison was retained/);
    const incompleteLegacy = buildSection4Summary({ activities: [], measure: null, legacyIncompleteCount: 1 });
    assert.match(incompleteLegacy.resultsText, /No comparable before-and-after measurements were reported\. 1 earlier comparison is incomplete — finish or remove it in 4\.3\./);
});

test("wizard wiring: blank legacy rows are dropped, legacy rows with content are shown with Remove / Edit-as-my-result, validation and banner use the shared helpers", () => {
    const component = read("src/app/dashboard/student/report/components/Section4Streamlined.tsx");
    assert.match(component, /const outcomeSplit = splitOutcomes\(outcomes\);/);
    assert.match(component, /if \(!outcomeSplit\.blankIndexes\.length \|\| isReadOnly\) return;/);
    assert.match(component, /data-ciel-legacy-outcomes/);
    assert.match(component, /Edit as my result/);
    assert.match(component, /onClick=\{\(\) => removeLegacy\(index\)\}/);
    assert.match(component, /legacyIncompleteCount,/);
    const validation = read("src/app/dashboard/student/report/utils/validation.ts");
    assert.match(validation, /const split = splitOutcomes\(asList\(data\.measurable_outcomes\)\);/);
    assert.match(validation, /split\.legacy\.forEach\(\(\{ row \}, index\) => \{\s*legacyOutcomeIssues\(row, index\)/);
    assert.doesNotMatch(validation, /legacyOutcomes\.forEach/);
    for (const file of ["src/app/dashboard/student/report/ReportFormChrome.tsx", "src/app/dashboard/student/report/impact-package/buildImpactPackageModel.ts"]) {
        const src = read(file);
        assert.match(src, /pickNumber\(o\.baseline\) != null && pickNumber\(o\.endline\) != null\)/, file);
        assert.doesNotMatch(src, /\(o\.baseline \|\| o\.endline\)\)/, file);
    }
});

test("a blank before / after field is never read as 0 (banner, impact package, final summary)", () => {
    for (const file of ["src/app/dashboard/student/report/ReportFormChrome.tsx", "src/app/dashboard/student/report/impact-package/buildImpactPackageModel.ts"]) {
        const src = read(file);
        assert.match(src, /function pickNumber\(value: unknown\): number \| null \{[\s\S]*?if \(!text\) return null;/, file);
    }
    const s11 = read("src/app/dashboard/student/report/components/Section11Summary.tsx");
    assert.match(s11, /if \(!bText \|\| !eText\) return null;/);
});

test("legacy row rules match the submit gates: the explanation is required and sized like a short note; adopted numbers are plain", () => {
    const row = { outcome_area: "Health", outcome_sub_category: "Attendance", metric_category: "Count", metric: "Days", baseline: "1,200", endline: "~1,450", unit: "days", confidence_level: ["Directly measured"] };
    const noExplanation = legacyOutcomeIssues(row, 0);
    assert.deepEqual(noExplanation.map((i) => i.field), ["measurable_outcomes.0.measurement_explanation"]);
    assert.match(noExplanation[0].message, /^Measurement explanation must be 10–80 words \(0 current\)$/);
    assert.deepEqual(legacyOutcomeIssues({ ...row, measurement_explanation: "too short" }, 0).map((i) => i.message), ["Measurement explanation must be 10–80 words (2 current)"]);
    assert.deepEqual(legacyOutcomeIssues({ ...row, measurement_explanation: "Compared the school register four weeks before and four weeks after the workshops." }, 0), []);
    const adopted = legacyOutcomeToSimple(row);
    assert.equal(adopted.baseline, "1200");
    // "~1,450" is not a number: the field comes back empty for the student to re-enter.
    assert.equal(adopted.endline, "");
    assert.equal(legacyOutcomeToSimple({ ...row, endline: "1,450" }).endline, "1450");
    assert.equal(legacyOutcomeToSimple({ ...row, baseline: "n/a" }).baseline, "");
    // validateSection5 relies on the helper alone (no second explanation check).
    const validation = read("src/app/dashboard/student/report/utils/validation.ts");
    assert.doesNotMatch(validation, /pushWordRange\(errors, `measurable_outcomes\.\$\{index\}\.measurement_explanation`/);
    // 4.1 evidence chooser sees saved logs' evidence_url too.
    const component = read("src/app/dashboard/student/report/components/Section4Streamlined.tsx");
    assert.match(component, /log\?\.evidence_file \|\| \(typeof log\?\.evidence_url === "string" && log\.evidence_url\.trim\(\)\)/);
});
