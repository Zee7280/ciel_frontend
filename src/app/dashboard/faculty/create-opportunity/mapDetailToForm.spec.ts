import assert from "node:assert/strict";
import test from "node:test";
import { mapOpportunityDetailToFacultyForm } from "./mapDetailToForm";

const detail = (over: Record<string, unknown> = {}) => ({
    title: "Beach clean-up",
    status: "pending_approval",
    mode: "Remote",
    timeline: { expected_hours: 20, volunteers_required: 30 },
    objectives: { beneficiaries_count: 100, beneficiaries_type: ["Children", "Orphans", "Street kids"] },
    activity_details: { skills_gained: ["Leadership", "Beekeeping"] },
    verification_method: ["Attendance sheets", "Drone footage"],
    ...over,
});

test("custom skills / beneficiaries / verification reload as visible 'Other' entries", () => {
    const { formDataPatch } = mapOpportunityDetailToFacultyForm(detail());
    const f = formDataPatch as any;
    assert.deepEqual(f.activity.skills, ["Leadership"]);
    assert.equal(f.activity.isOtherSkillChecked, true);
    assert.deepEqual(f.activity.otherSkills, ["Beekeeping"]);
    assert.deepEqual(f.objectives.beneficiariesType, ["Children"]);
    assert.equal(f.objectives.isOtherBeneficiaryChecked, true);
    assert.deepEqual(f.objectives.otherBeneficiarySpecs, ["Orphans", "Street kids"]);
    assert.deepEqual(f.verification, ["Attendance sheets"]);
    assert.equal(f.isOtherVerificationChecked, true);
    assert.equal(f.otherVerification, "Drone footage");
});

test("draft placeholder title and 0 numbers reload as blank", () => {
    const { formDataPatch } = mapOpportunityDetailToFacultyForm(
        detail({
            title: "Untitled opportunity",
            status: "draft",
            timeline: { expected_hours: 0, volunteers_required: 0 },
            objectives: { beneficiaries_count: 0 },
        }),
    );
    const f = formDataPatch as any;
    assert.equal(f.title, "");
    assert.equal(f.capacity.hours, "");
    assert.equal(f.capacity.volunteers, "");
    assert.equal(f.objectives.beneficiariesCount, "");
});

test("safety acknowledgements are pre-ticked only for an already-submitted opportunity, not a draft", () => {
    const submitted = mapOpportunityDetailToFacultyForm(detail()).formDataPatch as any;
    assert.deepEqual(Object.values(submitted.extraSafety), [true, true, true, true]);
    const draft = mapOpportunityDetailToFacultyForm(detail({ status: "draft" })).formDataPatch as any;
    assert.deepEqual(Object.values(draft.extraSafety), [false, false, false, false]);
});
