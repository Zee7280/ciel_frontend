import assert from "node:assert/strict";
import test from "node:test";
import { mapOpportunityDetailToStudentForm } from "./mapDetailToStudentForm";

const detail = (over: Record<string, unknown> = {}) => ({
    title: "Reading circles",
    status: "pending_faculty",
    mode: "Remote",
    timeline: { expected_hours: 16, volunteers_required: 5 },
    objectives: {
        beneficiary_group: "Orphans",
        beneficiaries_type: ["Children", "Orphans", "Street kids"],
        beneficiaries_count: 40,
    },
    activity_details: { skills_gained: ["Teaching", "Beekeeping"] },
    ...over,
});

test("the group label reloads only as the group, not as a permanent 'other beneficiary' chip", () => {
    const f = mapOpportunityDetailToStudentForm(detail()).formDataPatch as any;
    assert.equal(f.objectives.beneficiaryGroup, "Orphans");
    assert.deepEqual(f.objectives.otherBeneficiarySpecs, ["Street kids"]);
    assert.deepEqual(f.objectives.beneficiariesType, ["Children"]);
});

test("custom skills reload visibly under 'Other'", () => {
    const f = mapOpportunityDetailToStudentForm(detail()).formDataPatch as any;
    assert.deepEqual(f.activity.skills, ["Teaching"]);
    assert.equal(f.activity.isOtherSkillChecked, true);
    assert.deepEqual(f.activity.otherSkills, ["Beekeeping"]);
});

test("draft placeholder title and zero numbers reload as blank", () => {
    const f = mapOpportunityDetailToStudentForm(
        detail({ title: "Untitled opportunity", timeline: { expected_hours: 0, volunteers_required: 0 }, objectives: { beneficiaries_count: 0 } }),
    ).formDataPatch as any;
    assert.equal(f.title, "");
    assert.equal(f.capacity.hours, "");
    assert.equal(f.capacity.volunteers, "");
    assert.equal(f.objectives.beneficiariesCount, "");
});
