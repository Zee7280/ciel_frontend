import assert from "node:assert/strict";
import test from "node:test";
import { clampImpactPackageTab, tabFromPackageQuery } from "./impactPackageTabs";
import {
    buildImpactPackageModel,
    impactPackageCanDownload,
    impactPackageCanViewEvidence,
    shouldShowImpactPackageAnalysis,
    shouldShowImpactPackageCertificate,
    shouldShowImpactPackageDetailedReport,
} from "./buildImpactPackageModel";

const locked = (admin_status: string) =>
    ({ ciiV45: { finalCII: 72 }, ciiV45Lock: { locked: true }, admin_status }) as never;

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
    const d = { ciiV45: { finalCII: 72 }, ciiV45Lock: null, admin_status: "approved" } as never;
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
    const d = { ciiV45: { finalCII: 64 }, ciiV45Lock: null, admin_status: "pending" } as never;
    assert.equal(shouldShowImpactPackageAnalysis("admin", d), true);
    assert.equal(shouldShowImpactPackageAnalysis("faculty", d), false);
});

test("student detailed report waits for Super Admin approval; reviewers keep it", () => {
    assert.equal(shouldShowImpactPackageDetailedReport("student", false), false);
    assert.equal(shouldShowImpactPackageDetailedReport("student", true), true);
    for (const a of ["faculty", "admin", "university", "partner", "public"] as const) {
        assert.equal(shouldShowImpactPackageDetailedReport(a, false), true, a);
        assert.equal(shouldShowImpactPackageDetailedReport(a, true), true, a);
    }
});

test("student certificate waits for Super Admin approval; reviewers keep it", () => {
    assert.equal(shouldShowImpactPackageCertificate("student", false), false);
    assert.equal(shouldShowImpactPackageCertificate("student", true), true);
    for (const a of ["faculty", "admin", "university", "partner", "public"] as const) {
        assert.equal(shouldShowImpactPackageCertificate(a, false), true, a);
        assert.equal(shouldShowImpactPackageCertificate(a, true), true, a);
    }
});

test("clampImpactPackageTab falls back to flash when the requested tab is hidden", () => {
    assert.equal(clampImpactPackageTab("report", ["flash", "evidence"]), "flash");
    assert.equal(clampImpactPackageTab("evidence", ["flash", "evidence"]), "evidence");
    assert.equal(clampImpactPackageTab("report", ["flash", "report", "evidence"]), "report");
});

test("wall deep-links map onto Impact Package tabs", () => {
    assert.equal(tabFromPackageQuery("v17"), "report");
    assert.equal(tabFromPackageQuery("report"), "report");
    assert.equal(tabFromPackageQuery("print"), "report");
    assert.equal(tabFromPackageQuery("evidence"), "evidence");
    assert.equal(tabFromPackageQuery("package"), "flash");
    assert.equal(tabFromPackageQuery("flash"), "flash");
    assert.equal(tabFromPackageQuery("certificate"), "certificate");
    assert.equal(tabFromPackageQuery(null, "#report"), "report");
});

test("sectionsComplete reflects real content instead of always reading 0 / 9", () => {
    const empty = buildImpactPackageModel({ project_id: "p-empty", required_hours: 16 } as never);
    assert.equal(empty.sectionsTotal, 9);
    assert.equal(empty.sectionsComplete, 0);

    const full = buildImpactPackageModel(
        {
            project_id: "p-full",
            required_hours: 16,
            section1: {
                participation_type: "individual",
                attendance_logs: [{ date: "2026-09-01", hours: 4, participantId: "lead:u1" }],
            },
            section2: { problem_statement: "Clean water access is limited in the target community." },
            section3: { student_contribution_intent_statement: "We mapped the gap against SDG 6." },
            section4: {
                activity_blocks: [{ title: "Well repair", primary_category: "infrastructure" }],
            },
            section5: { observed_change: "Access improved for 40 households." },
            section6: { use_resources: "no" },
            section7: { has_partners: "no" },
            section9: { reflection_biggest_learning: "Coordination with the community took longer than planned." },
            section10: { continuation_details: "The local committee will maintain the well going forward." },
        } as never,
        undefined,
        [{ url: "https://example.com/evidence.jpg", name: "Evidence.jpg" }],
    );
    assert.equal(full.sectionsTotal, 9);
    assert.equal(full.sectionsComplete, 9);
});
