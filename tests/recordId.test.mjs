// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { isPublicRecordId, matchesRecordId, recordIdLabel } from "../src/utils/recordId.ts";

test("shows the public id, else a short uuid", () => {
    assert.equal(recordIdLabel("CIEL-BNU-2026-0421", "abcdef12-0000"), "CIEL-BNU-2026-0421");
    assert.equal(recordIdLabel(null, "abcdef12-0000"), "ABCDEF12");
    assert.equal(recordIdLabel("", ""), "—");
});

test("recognises and searches public ids", () => {
    assert.equal(isPublicRecordId("ciel-bnu-2026-0421"), true);
    assert.equal(isPublicRecordId("BNU-2026-0421"), false);
    assert.equal(matchesRecordId("bnu-2026", "CIEL-BNU-2026-0421"), true);
    assert.equal(matchesRecordId("lums", "CIEL-BNU-2026-0421"), false);
    assert.equal(matchesRecordId("", "CIEL-BNU-2026-0421"), false);
});
