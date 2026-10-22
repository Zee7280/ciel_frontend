// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { isOwnedByCurrentPartner } from "../src/utils/partnerOpportunityOwnership.ts";

const ME = "user-1";
const ORG = "org-1";

test("partner-created rows with a creator are mine only when I created them", () => {
    assert.equal(isOwnedByCurrentPartner({ creatorId: ME }, ME, ORG), true);
    assert.equal(isOwnedByCurrentPartner({ creatorId: "faculty-9", organizationId: ORG }, ME, ORG), false);
});

test("student-created rows that name my org are never mine", () => {
    assert.equal(isOwnedByCurrentPartner({ isStudentCreated: true, organizationId: ORG }, ME, ORG), false);
    assert.equal(isOwnedByCurrentPartner({ created_by_role: "student" }, ME, ORG), false);
});

test("legacy rows without a creator fall back to the owning organization", () => {
    assert.equal(isOwnedByCurrentPartner({ creatorId: null, isStudentCreated: false, organizationId: ORG }, ME, ORG), true);
    assert.equal(isOwnedByCurrentPartner({ creatorId: null, organizationId: "org-2" }, ME, ORG), false);
    assert.equal(isOwnedByCurrentPartner({ creatorId: null }, ME, ""), true);
});
