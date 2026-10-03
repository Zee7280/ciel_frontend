import assert from "node:assert/strict";
import test from "node:test";
import {
    buildImpactPackageModel,
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

test("flash Participation chips split live attendance logs per teammate", () => {
    const leadId = "9bd564fb-abf4-404c-951e-866f7cb56c6d";
    const memberId = "6dda5269-8d24-4ae7-8a7c-b22fe7aab087";
    const model = buildImpactPackageModel({
        project_id: "p1",
        required_hours: 16,
        section1: {
            participation_type: "team",
            team_lead: {
                id: leadId,
                name: "FATIMA KHALID",
                fullName: "FATIMA KHALID",
                email: "fatimaknawaz786@gmail.com",
                hours: 0,
            },
            team_members: [
                {
                    id: memberId,
                    name: "Aiman Azam",
                    fullName: "Alina Azam",
                    email: "f2023-159@bnu.edu.pk",
                    hours: 0,
                },
            ],
            attendance_logs: [
                { date: "2026-09-01", hours: 9, participantId: `lead:${leadId}` },
                { date: "2026-09-02", hours: 8, participantId: `lead:${leadId}` },
                { date: "2026-09-01", hours: 8, participantId: `member:0:${memberId}` },
                { date: "2026-09-02", hours: 8, participantId: `member:0:${memberId}` },
            ],
        },
    } as never);
    const chips = model.tiles[0].chips.map((c) => c.text);
    assert.deepEqual(chips, [
        "FATIMA KHALID 17 / 16 h",
        "Alina Azam 16 / 16 h",
    ]);
    assert.equal(chips.some((t) => /remaining/i.test(t)), false);
});

test("flash Participation chips do not dump pooled hours onto the team lead", () => {
    const leadId = "lead-1";
    const memberId = "member-1";
    const model = buildImpactPackageModel({
        project_id: "p1",
        required_hours: 16,
        section1: {
            participation_type: "team",
            team_lead: { id: leadId, fullName: "Fatima Khalid", hours: 0 },
            team_members: [{ id: memberId, fullName: "Alina Azam", hours: 0 }],
            attendance_logs: [
                { date: "2026-09-01", hours: 16, participantId: `member:0:${memberId}` },
            ],
        },
    } as never);
    const chips = model.tiles[0].chips.map((c) => c.text);
    assert.equal(chips[0], "Fatima Khalid 0 / 16 h · remaining");
    assert.equal(chips[1], "Alina Azam 16 / 16 h");
});


test("admin sees the analysis tab once a score exists, even before locking", () => {
    const d = { ciiV2: { final: 64 }, ciiV2Lock: null, admin_status: "pending" } as never;
    assert.equal(shouldShowImpactPackageAnalysis("admin", d), true);
    assert.equal(shouldShowImpactPackageAnalysis("faculty", d), false);
});
