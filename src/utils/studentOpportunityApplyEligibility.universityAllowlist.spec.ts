import assert from "node:assert/strict";
import test from "node:test";
import {
    collectUniversityParticipationAllowlist,
    resolveStudentUniversityApplyEligibility,
    universityNamesMatch,
} from "./studentOpportunityApplyEligibility";
import { BNU_UNIVERSITY_NAME, canonicalUniversityAllowlist } from "./universityData";

// Exactly what ciel_backend createStudentOpportunity / updateStudentOpportunity persist for a
// student at BNU (profile university is the picker's canonical string), as returned by
// GET /student/projects/:id and the report GET's `opportunity` block.
const bnuScopedProject = {
    id: "opp-1",
    title: "Digital Skills for Learning",
    participation_scope: {
        rule: "own_university_only",
        creator_university_name: "Beaconhouse National University (BNU)",
        university_names: ["Beaconhouse National University (BNU)"],
    },
    restricted_universities: ["Beaconhouse National University (BNU)"],
};

test("a BNU-only student listing resolves to exactly one allowed university → picker locks", () => {
    const allow = canonicalUniversityAllowlist(collectUniversityParticipationAllowlist(bnuScopedProject));
    assert.deepEqual(allow, [BNU_UNIVERSITY_NAME]);
});

test("short-form profile spelling (\"BNU\") still locks to the canonical picker entry", () => {
    const allow = canonicalUniversityAllowlist(
        collectUniversityParticipationAllowlist({
            participation_scope: { rule: "own_university_departments", creator_university_name: "BNU", university_names: ["BNU"] },
            restricted_universities: ["BNU"],
        }),
    );
    assert.deepEqual(allow, [BNU_UNIVERSITY_NAME]);
});

test("report GET shape: scope nested under `opportunity` is read the same way the page merges it", () => {
    const reportPayload = { project_id: "opp-1", opportunity: bnuScopedProject };
    const allow = canonicalUniversityAllowlist(
        collectUniversityParticipationAllowlist({ ...(reportPayload.opportunity || {}) }),
    );
    assert.deepEqual(allow, [BNU_UNIVERSITY_NAME]);
});

test("an open-to-all or unscoped listing yields an empty allowlist → full university list stays available", () => {
    assert.deepEqual(collectUniversityParticipationAllowlist({ participation_scope: { rule: "open_all_universities" } }), []);
    assert.deepEqual(collectUniversityParticipationAllowlist({ id: "x", title: "no scope" }), []);
});

test("a faculty/partner listing restricted to several universities offers only those", () => {
    const allow = canonicalUniversityAllowlist(
        collectUniversityParticipationAllowlist({
            participation_scope: { rule: "selected_universities", university_names: ["BNU", "COMSATS University Islamabad"] },
        }),
    );
    assert.deepEqual(allow, [BNU_UNIVERSITY_NAME, "COMSATS University Islamabad"]);
});

test("profile spelling tolerant like the API: \"BNU\" profile may apply to a BNU-only listing, LUMS may not", () => {
    assert.equal(universityNamesMatch("BNU", BNU_UNIVERSITY_NAME), true);
    assert.equal(universityNamesMatch("UET", "UET Taxila"), false);
    assert.equal(universityNamesMatch("LUMS", BNU_UNIVERSITY_NAME), false);
    const bnuOnly = { participation_scope: { rule: "own_university_only", creator_university_name: BNU_UNIVERSITY_NAME, university_names: [BNU_UNIVERSITY_NAME] } };
    assert.equal(resolveStudentUniversityApplyEligibility(bnuOnly, "BNU", "CS").canApply, true);
    assert.equal(resolveStudentUniversityApplyEligibility(bnuOnly, "LUMS", "CS").canApply, false);
});
