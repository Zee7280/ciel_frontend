import assert from "node:assert/strict";
import test from "node:test";
import { displayOrganizationName } from "./displayOrganizationName";

test("keeps a real partner name", () => {
    assert.equal(displayOrganizationName("SOS Children's Villages"), "SOS Children's Villages");
});

test("hides create-form helper copy and N/A", () => {
    assert.equal(
        displayOrganizationName("add only if theres another organization connected (eg.SOS)"),
        undefined,
    );
    assert.equal(displayOrganizationName("N/A"), undefined);
    assert.equal(displayOrganizationName(""), undefined);
});
