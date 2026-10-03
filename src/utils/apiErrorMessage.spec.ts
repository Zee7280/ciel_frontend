import assert from "node:assert/strict";
import test from "node:test";
import { apiErrorMessage } from "./apiErrorMessage";

test("string message", () => assert.equal(apiErrorMessage({ message: "Bad" }, "fb"), "Bad"));
test("class-validator array is joined, not truncated", () =>
    assert.equal(
        apiErrorMessage({ message: ["title must not be blank", "types should not be empty"] }, "fb"),
        "title must not be blank · types should not be empty",
    ));
test("nested message object (409 with payload)", () =>
    assert.equal(apiErrorMessage({ message: { message: "similar title", code: "X" } }, "fb"), "similar title"));
test("falls back to error, then fallback", () => {
    assert.equal(apiErrorMessage({ error: "Forbidden" }, "fb"), "Forbidden");
    assert.equal(apiErrorMessage(null, "fb"), "fb");
    assert.equal(apiErrorMessage({ message: [] }, "fb"), "fb");
});
