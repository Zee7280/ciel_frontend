import assert from "node:assert/strict";
import test from "node:test";
import {
    impactPackageCanDownload,
    impactPackageCanViewEvidence,
    shouldShowImpactPackageAnalysis,
} from "./buildImpactPackageModel";

const locked = (admin_status: string) =>
    ({ ciiV2: { final: 72 }, ciiV2Lock: { locked: true }, admin_status }) as never;

test("analysis report goes to student, faculty, university and admin after approval only", () => {
    for (const a of ["student", "faculty", "university"] as const) {
        assert.equal(shouldShowImpactPackageAnalysis(a, locked("approved")), true, a);
        assert.equal(shouldShowImpactPackageAnalysis(a, locked("pending")), false, a);
    }
    assert.equal(shouldShowImpactPackageAnalysis("admin", locked("pending")), true);
});

test("partner / NGO and public never get the analysis report", () => {
    assert.equal(shouldShowImpactPackageAnalysis("partner", locked("approved")), false);
    assert.equal(shouldShowImpactPackageAnalysis("public", locked("approved")), false);
});

test("no analysis tab when CII is not locked", () => {
    const d = { ciiV2: { final: 72 }, ciiV2Lock: null, admin_status: "approved" } as never;
    assert.equal(shouldShowImpactPackageAnalysis("faculty", d), false);
});

test("evidence: partner locked on restricted, downloads only for public with consent", () => {
    assert.equal(impactPackageCanViewEvidence("partner", "restricted" as never), false);
    assert.equal(impactPackageCanViewEvidence("faculty", "restricted" as never), true);
    assert.equal(impactPackageCanDownload("student", "restricted" as never, true), false);
    assert.equal(impactPackageCanDownload("partner", "public" as never, true), true);
    assert.equal(impactPackageCanDownload("partner", "public" as never, false), false);
});
