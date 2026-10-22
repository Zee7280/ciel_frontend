// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { signupProofFileError } from "../src/utils/signupProofUpload.ts";

test("signup proof files: images or PDF under 4 MB", () => {
    assert.equal(signupProofFileError({ name: "id.pdf", size: 1024 }), null);
    assert.equal(signupProofFileError({ name: "card.JPG", size: 1024 }), null);
    assert.equal(signupProofFileError(null), null);
    assert.match(signupProofFileError({ name: "letter.docx", size: 1024 }), /PDF, JPG, PNG or WebP/);
    assert.match(signupProofFileError({ name: "scan.png", size: 5 * 1024 * 1024 }), /over 4 MB/);
});
