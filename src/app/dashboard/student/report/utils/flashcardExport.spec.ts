import assert from "node:assert/strict";
import {
    flashcardExportFilename,
    isShareAbort,
    resolveFlashcardShareUrl,
} from "./flashcardExportCore";

assert.equal(
    flashcardExportFilename("SOS Classroom Learning Environment Transformation"),
    "sos-classroom-learning-environment-transformation-ciel-pk-flash-card",
);
assert.equal(flashcardExportFilename("  "), "community-engagement-ciel-pk-flash-card");
assert.equal(flashcardExportFilename(""), "community-engagement-ciel-pk-flash-card");

assert.equal(
    resolveFlashcardShareUrl("https://cielpk.com/impact/verify/abc", "https://cielpk.com/dashboard/student/report?x=1"),
    "https://cielpk.com/impact/verify/abc",
);
assert.equal(
    resolveFlashcardShareUrl(null, "https://cielpk.com/dashboard/student/report?projectId=1"),
    "https://cielpk.com/dashboard/student/report?projectId=1",
);
assert.equal(
    resolveFlashcardShareUrl("/impact/verify/abc", "https://cielpk.com/dashboard/student/report?x=1"),
    "https://cielpk.com/impact/verify/abc",
);

assert.equal(isShareAbort({ name: "AbortError" }), true);
assert.equal(isShareAbort({ name: "NotAllowedError" }), true);
assert.equal(isShareAbort({ name: "TypeError" }), false);
assert.equal(isShareAbort(null), false);

console.log("flashcardExport.spec.ts ok");
