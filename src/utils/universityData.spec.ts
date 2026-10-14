import assert from "node:assert/strict";
import test from "node:test";
import { BNU_UNIVERSITY_NAME, canonicalPakistaniUniversity, canonicalUniversityAllowlist } from "./universityData";

test("maps BNU spellings from an opportunity scope onto the canonical picker entry", () => {
    assert.equal(canonicalPakistaniUniversity("BNU"), BNU_UNIVERSITY_NAME);
    assert.equal(canonicalPakistaniUniversity("Beaconhouse National University"), BNU_UNIVERSITY_NAME);
    assert.equal(canonicalPakistaniUniversity("beaconhouse national university (bnu)"), BNU_UNIVERSITY_NAME);
});

test("matches other universities exactly or by containment, and keeps unknown names as typed", () => {
    assert.equal(canonicalPakistaniUniversity("comsats university islamabad"), "COMSATS University Islamabad");
    assert.equal(canonicalPakistaniUniversity("Lahore University of Management Sciences"), "Lahore University of Management Sciences (LUMS)");
    assert.equal(canonicalPakistaniUniversity("Some Private College"), "Some Private College");
    assert.equal(canonicalPakistaniUniversity(""), "");
});

test("allowlist is canonical and deduped — a BNU-only listing yields exactly one entry", () => {
    assert.deepEqual(canonicalUniversityAllowlist(["BNU", "Beaconhouse National University (BNU)", " bnu "]), [BNU_UNIVERSITY_NAME]);
    assert.deepEqual(canonicalUniversityAllowlist(undefined), []);
});
