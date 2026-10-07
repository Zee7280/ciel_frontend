import assert from "node:assert/strict";
import test from "node:test";
import { flowSteps } from "./opportunityFlashcardSteps";

test("empty responsibilities keep a single placeholder step", () => {
    assert.deepEqual(flowSteps(""), ["Responsibilities will be confirmed with selected students."]);
});

test("four short lines stay four separate cards", () => {
    assert.equal(
        flowSteps("Attend briefing.\nAssess the classroom.\nUnderstand age group.\nPrepare sketches.").length,
        4,
    );
});

test("extra lines do not dump into step 4 as one overflow blob", () => {
    const steps = flowSteps(
        [
            "Attend briefing.",
            "Assess the classroom.",
            "Understand age group.",
            "Prepare sketches.",
            "Paint murals.",
            "Protect furniture.",
            "Document before and after.",
            "Respect safeguarding.",
            "Complete the CIEL PK report.",
        ].join("\n"),
    );
    assert.equal(steps.length, 8);
    assert.equal(steps[3], "Prepare sketches.");
    assert.match(steps[7], /Complete the CIEL PK report/);
    assert.equal(steps[3].includes("Paint murals"), false);
});
