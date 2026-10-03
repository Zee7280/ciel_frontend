import assert from "node:assert/strict";
import test from "node:test";
import { mapCommunityPipelineRow } from "./communityAwardModel";

test("draft progress fields flow through the pipeline mapper", () => {
    const row = mapCommunityPipelineRow({
        id: "r1",
        student_name: "Zain",
        project_title: "SOS",
        status: "draft",
        is_submitted: false,
        progress_pct: 30,
        sections_complete: 3,
        sections_total: 10,
        draft_locked: true,
    });
    assert.ok(row);
    assert.equal(row.is_submitted, false);
    assert.equal(row.progress_pct, 30);
    assert.equal(row.sections_complete, 3);
    assert.equal(row.sections_total, 10);
    assert.equal(row.student_name, "Zain");
});

test("rows without progress fields are unchanged (no phantom draft)", () => {
    const row = mapCommunityPipelineRow({ id: "r2", status: "submitted" });
    assert.ok(row);
    assert.equal(row.is_submitted, undefined);
    assert.equal(row.progress_pct, undefined);
});
