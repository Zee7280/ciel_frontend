import assert from "node:assert/strict";
import test from "node:test";
import {
    pickCiiV45DisplayBadgeName,
    pickCiiV45DisplayScore,
    readPersistedCiiSnapshot,
} from "./reportCiiSnapshot";

test("locked CII prefers admin-approved score over diagnostic", () => {
    assert.equal(
        pickCiiV45DisplayScore(
            { diagnosticCII: 80, finalCII: 75, baseCII: 70 },
            { locked: true, adminApprovedScore: 75 },
        ),
        75,
    );
    assert.equal(
        pickCiiV45DisplayBadgeName(
            {
                finalBadge: { name: "Published band" },
                diagnosticBadge: { name: "Provisional band" },
            },
            { locked: true },
        ),
        "Published band",
    );
});

test("unlocked reviewer CII uses diagnostic then base then known points", () => {
    assert.equal(
        pickCiiV45DisplayScore(
            { diagnosticCII: null, baseCII: 70, knownBasePoints: 62 },
            { locked: false },
        ),
        70,
    );
    assert.equal(
        pickCiiV45DisplayScore(
            { diagnosticCII: null, baseCII: null, knownBasePoints: 62 },
            null,
        ),
        62,
    );
    assert.equal(
        pickCiiV45DisplayBadgeName(
            {
                recommendedBadge: { name: "Sound" },
                diagnosticBadge: { name: "Provisional" },
            },
            { locked: false },
        ),
        "Sound",
    );
});

test("readPersistedCiiSnapshot prefers v4.5 over legacy section11 text", () => {
    const locked = readPersistedCiiSnapshot({
        ciiV45: { diagnosticCII: 80, finalCII: 75, finalBadge: { name: "Published band" } },
        ciiV45Lock: { locked: true, adminApprovedScore: 75 },
        section11: { summary_text: "Final Adjusted CII Score: 41" },
    });
    assert.equal(locked?.totalScore, 75);
    assert.equal(locked?.level, "Published band");
    assert.equal(locked?.evaluation_framework_version, "v4.5");

    const unlocked = readPersistedCiiSnapshot({
        ciiV45: { diagnosticCII: null, baseCII: 70, diagnosticBadge: { name: "Sound" } },
        ciiV45Lock: { locked: false },
        section11: { summary_text: "Final Adjusted CII Score: 41" },
    });
    assert.equal(unlocked?.totalScore, 70);
    assert.equal(unlocked?.level, "Sound");
});

test("pending Admin evidence is not shown as an overall /100 CII", () => {
    assert.equal(
        pickCiiV45DisplayScore(
            {
                diagnosticCII: null,
                baseCII: null,
                knownBasePoints: 85,
                aiReportScore: 85,
                adminEvidenceAssessment: { status: "PENDING" },
            },
            null,
        ),
        null,
    );
    assert.equal(
        pickCiiV45DisplayBadgeName(
            {
                diagnosticBadge: { name: "Sound Community Contributor" },
                recommendedBadge: { name: "Sound Community Contributor" },
                adminEvidenceAssessment: { status: "PENDING" },
            },
            { locked: false },
        ),
        null,
    );
    assert.equal(
        readPersistedCiiSnapshot({
            ciiV45: {
                diagnosticCII: null,
                knownBasePoints: 85,
                aiReportScore: 85,
                frameworkVersion: "5.0",
                adminEvidenceAssessment: { status: "PENDING" },
            },
            ciiV45Lock: { locked: false },
            section11: { summary_text: "Final Adjusted CII Score: 41" },
        }),
        null,
    );
});

test("locked v5.0 snapshot labels the hybrid framework", () => {
    const locked = readPersistedCiiSnapshot({
        ciiV45: {
            frameworkVersion: "5.0",
            diagnosticCII: 100,
            finalCII: 100,
            finalBadge: { name: "Transformative Impact Contributor" },
        },
        ciiV45Lock: { locked: true, adminApprovedScore: 100 },
    });
    assert.equal(locked?.totalScore, 100);
    assert.equal(locked?.evaluation_framework_version, "v5.0");
});
