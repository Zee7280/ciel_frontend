// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { notificationDisplayType } from "../src/utils/notificationTone.ts";

test("rejections are shown as rejected whatever type the backend sent", () => {
    assert.equal(notificationDisplayType({ type: "approval", title: "Partner Rejected" }), "rejected");
    assert.equal(notificationDisplayType({ type: "update", title: "Your venture was rejected" }), "rejected");
    assert.equal(notificationDisplayType({ type: "approval", title: "Admin Approved" }), "approval");
    assert.equal(notificationDisplayType({ type: "update", title: null }), "update");
});
