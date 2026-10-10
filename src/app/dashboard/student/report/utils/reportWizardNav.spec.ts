import assert from "node:assert/strict";
import { dataSectionToWizardStep, formatIncompleteSectionHeading } from "./reportWizardNav";

const CLICK_MAP: Array<[number, number]> = [
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 4],
    [5, 4],
    [6, 5],
    [7, 6],
    [8, 7],
    [9, 8],
    [10, 9],
];

for (const [dataSection, wizard] of CLICK_MAP) {
    assert.equal(
        dataSectionToWizardStep(dataSection),
        wizard,
        `missing-item click for data section ${dataSection} must open wizard step ${wizard}`,
    );
}

assert.equal(formatIncompleteSectionHeading(5, "Activities & Outputs (Part B)"), "Step 4 — Activities & Outputs (Part B)");
assert.equal(formatIncompleteSectionHeading(10, "Sustainability"), "Step 9 — Sustainability");

console.log("reportWizardNav incomplete-click mapping ok");
