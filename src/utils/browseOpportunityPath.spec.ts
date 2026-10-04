import assert from "node:assert/strict";
import test from "node:test";
import {
    classifyBrowseCreator,
    classifyBrowsePath,
    formatBrowseDeadline,
    isUrgentBrowseDeadline,
} from "./browseOpportunityPath";

test("classifies marketplace paths from opportunity types", () => {
    assert.equal(classifyBrowsePath(["Community Service"]), "community_service");
    assert.equal(classifyBrowsePath(["Course Project"]), "coursework");
    assert.equal(classifyBrowsePath(["Research"]), "fyp");
    assert.equal(classifyBrowsePath(["Startup"]), "startup");
    assert.equal(classifyBrowsePath([], "fyp"), "fyp");
});

test("classifyBrowsePath falls back to community_service for null/undefined/garbage input", () => {
    assert.equal(classifyBrowsePath(null), "community_service");
    assert.equal(classifyBrowsePath(undefined), "community_service");
    assert.equal(classifyBrowsePath(undefined, "not-a-real-path"), "community_service");
    assert.equal(classifyBrowsePath("not-an-array"), "community_service");
});

test("formats card deadlines", () => {
    assert.equal(formatBrowseDeadline("2026-10-30"), "Ends 30 Oct 2026");
});

test("formatBrowseDeadline returns null for missing/malformed dates instead of 'Invalid Date'", () => {
    assert.equal(formatBrowseDeadline(null), null);
    assert.equal(formatBrowseDeadline(undefined), null);
    assert.equal(formatBrowseDeadline("TBD"), null);
});

test("classifies public explore creators", () => {
    assert.equal(classifyBrowseCreator({ created_by_role: "faculty" }), "faculty");
    assert.equal(classifyBrowseCreator({ created_by_role: "admin" }), "admin");
    assert.equal(classifyBrowseCreator({ created_by_role: "student" }), "student");
    assert.equal(
        classifyBrowseCreator({ isStudentCreated: false, facultyId: "f1", organizationId: null }),
        "faculty",
    );
});

test("classifyBrowseCreator returns null for an unclassifiable/empty opportunity", () => {
    assert.equal(classifyBrowseCreator({}), null);
    assert.equal(
        classifyBrowseCreator({ isStudentCreated: false, facultyId: null, organizationId: null }),
        null,
    );
});

test("isUrgentBrowseDeadline flags only deadlines within the next 14 days, never a malformed date", () => {
    const now = new Date("2026-10-04T00:00:00");
    assert.equal(isUrgentBrowseDeadline(null, now), false);
    assert.equal(isUrgentBrowseDeadline("TBD", now), false);
    assert.equal(isUrgentBrowseDeadline("2026-10-04", now), true);
    assert.equal(isUrgentBrowseDeadline("2026-10-15", now), true);
    assert.equal(isUrgentBrowseDeadline("2026-10-20", now), false);
    assert.equal(isUrgentBrowseDeadline("2026-09-01", now), false);
});
