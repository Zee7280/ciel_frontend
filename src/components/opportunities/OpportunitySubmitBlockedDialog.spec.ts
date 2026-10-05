import assert from "node:assert/strict";
import test from "node:test";
import { incompleteWizardSteps } from "./OpportunitySubmitBlockedDialog";

test("groups missing messages under each wizard step and skips complete steps", () => {
    const steps = incompleteWizardSteps(
        [
            { key: "B", label: "Opportunity" },
            { key: "SCHED", label: "Schedule" },
            { key: "C", label: "SDG & impact" },
        ],
        {
            B: { title: "Enter an opportunity title.", hook: "Add a one-line student hook." },
            SCHED: {},
            C: { sdg: "Select a primary SDG.", extra: undefined },
        },
    );
    assert.deepEqual(
        steps.map((step: { key: string }) => step.key),
        ["B", "C"],
    );
    assert.equal(steps[0]?.errors.length, 2);
    assert.equal(steps[1]?.label, "SDG & impact");
});
