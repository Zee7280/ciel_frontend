import assert from "node:assert/strict";
import test from "node:test";
import {
    buildCielPackageSnapshot,
    maskDigits,
    resolveRosterKey,
    stripParticipantPrefix,
    type CielPackageInput,
} from "./buildCielPackageSnapshot";

const report = () => ({
    publicId: "CIEL-BNU-2026-0421",
    section1: {
        participation_type: "team",
        team_lead: { id: "LEAD1", name: "Ayesha", cnic: "35202-1234567-1", mobile: "+923001234567", email: "a@x.pk" },
        team_members: [
            { id: "MEM1", name: "Bilal", cnic: "35202-7654321-9", mobile: "03211234567", email: "b@x.pk" },
            { name: "Sana", cnic: "35202-1111111-3", email: "s@x.pk" },
        ],
        attendance_logs: [
            { id: "a1", date: "2026-03-01", start_time: "09:00", end_time: "17:00", participantId: "lead:LEAD1", approval_status: "approved", evidence_file: {} },
            { id: "a2", date: "2026-03-01", start_time: "09:00", end_time: "17:00", participantId: "member:0:MEM1", entryStatus: "pending" },
            { id: "a3", date: "2026-03-02", start_time: "09:00", end_time: "12:00", participantId: "member:1:35202-1111111-3" },
        ],
    },
    section4: { unique_beneficiaries: 40 },
    section8: {
        evidence_files: [{ name: "photo.jpg", url: "https://cdn/x/photo.jpg", signedUrl: "https://secret" }],
        otp_code: "123456",
    },
    section11: { signed_at: "2026-04-01T10:00:00.000Z", signature_name: "Ayesha" },
    submitted_at: "2026-04-01T10:00:01.000Z",
});

const base = (over: Partial<CielPackageInput> = {}): CielPackageInput => ({
    report: report(),
    opportunity: {
        id: "opp-1",
        title: "Clean water drive",
        start_date: "2026-03-01T00:00:00.000Z",
        end_date: "2026-03-20",
        location_text: "Lahore",
    },
    audience: "student",
    visibility: "restricted",
    publicConsent: false,
    files: [
        { id: "E1", url: "https://cdn/x/photo.jpg", name: "photo.jpg", kind: "image", section: "section8.evidence_files", claim: "Site visit" },
    ],
    approved: false,
    requiredHours: 16,
    uniqueBeneficiaries: 40,
    sdgNumbers: [6, 3],
    now: new Date("2026-04-02T00:00:00.000Z"),
    ...over,
});

test("stripParticipantPrefix handles lead:, member:N: and plain ids", () => {
    assert.equal(stripParticipantPrefix("lead:LEAD1"), "LEAD1");
    assert.equal(stripParticipantPrefix("member:0:MEM1"), "MEM1");
    assert.equal(stripParticipantPrefix("member:self:MEM1"), "MEM1");
    assert.equal(stripParticipantPrefix("PLAIN"), "PLAIN");
    assert.equal(stripParticipantPrefix(undefined), "");
});

test("attendance participantIds resolve to the viewer's roster keys", () => {
    const s1 = report().section1;
    assert.equal(resolveRosterKey("lead:LEAD1", s1), "lead");
    assert.equal(resolveRosterKey("member:0:MEM1", s1), "member-0");
    assert.equal(resolveRosterKey("member:1:35202-1111111-3", s1), "member-1");
    assert.equal(resolveRosterKey("MEM1", s1), "member-0");
    assert.equal(resolveRosterKey("a@x.pk", s1), "lead");
    assert.equal(resolveRosterKey("unknown-person", s1), "unknown-person");
    // solo report: rows with no participant belong to the lead
    assert.equal(resolveRosterKey(undefined, { team_lead: { id: "L" }, team_members: [] }), "lead");
    // team report: a blank id must stay unresolved rather than being guessed
    assert.equal(resolveRosterKey("", s1), "");
});

test("snapshot rewrites attendance ids and maps the app status onto `status`", () => {
    const snap = buildCielPackageSnapshot(base());
    const logs = (snap.data.section1 as { attendance_logs: Array<Record<string, unknown>> }).attendance_logs;
    assert.deepEqual(logs.map((l) => l.participantId), ["lead", "member-0", "member-1"]);
    assert.deepEqual(logs.map((l) => l.status), ["approved", "pending", ""]);
    assert.equal("evidence_file" in logs[0], false); // an empty {} is not a file reference
});

test("student copy masks CNIC and mobile but keeps e-mail", () => {
    const snap = buildCielPackageSnapshot(base());
    const lead = (snap.data.section1 as { team_lead: Record<string, string> }).team_lead;
    assert.equal(lead.cnic, "•••••-••••567-1");
    assert.equal(lead.mobile, "+•••••••••567");
    assert.equal(lead.email, "a@x.pk");
});

test("maskDigits keeps only the requested tail", () => {
    assert.equal(maskDigits("35202-1234567-1", 4), "•••••-••••567-1");
    assert.equal(maskDigits("0300 1234567", 3), "•••• ••••567");
    assert.equal(maskDigits("12", 4), "••");
    assert.equal(maskDigits("", 4), "");
});

test("partner and public copies carry no CNIC, mobile or e-mail at all", () => {
    for (const audience of ["partner", "public"] as const) {
        const snap = buildCielPackageSnapshot(base({ audience }));
        const s1 = snap.data.section1 as { team_lead: Record<string, string>; team_members: Array<Record<string, string>> };
        for (const p of [s1.team_lead, ...s1.team_members]) {
            assert.equal(p.cnic, "", audience);
            assert.equal(p.mobile ?? "", "", audience);
            assert.equal(p.email, "", audience);
        }
        const text = JSON.stringify(snap);
        assert.equal(/35202|0321123|3001234|@x\.pk/.test(text), false, audience);
    }
});

test("secrets, file urls and blobs never travel inside data", () => {
    const snap = buildCielPackageSnapshot(base());
    const text = JSON.stringify(snap.data);
    assert.equal(/otp|123456|signedUrl|secret|https:\/\/cdn/i.test(text), false);
});

test("restricted / private evidence is listed without any file; public + consent gets the link", () => {
    for (const visibility of ["restricted", "private"] as const) {
        const snap = buildCielPackageSnapshot(base({ visibility, publicConsent: true }));
        assert.equal(snap.evidence[0].url, "", visibility);
        assert.equal(snap.evidence[0].visibility, visibility);
        assert.equal(snap.evidence[0].name, "photo.jpg");
    }
    assert.equal(buildCielPackageSnapshot(base({ visibility: "public", publicConsent: false })).evidence[0].url, "");
    const open = buildCielPackageSnapshot(base({ visibility: "public", publicConsent: true }));
    assert.equal(open.evidence[0].url, "https://cdn/x/photo.jpg");
});

test("non-https evidence urls are never embedded", () => {
    const snap = buildCielPackageSnapshot(
        base({
            visibility: "public",
            publicConsent: true,
            files: [
                { id: "1", url: "javascript:alert(1)", name: "x" },
                { id: "2", url: "http://insecure/x.png", name: "y" },
                { id: "3", url: "data:image/png;base64,AAAA", name: "z" },
            ],
        }),
    );
    assert.deepEqual(snap.evidence.map((e) => e.url), ["", "", ""]);
});

test("official score and badge only appear after admin approval", () => {
    assert.deepEqual(buildCielPackageSnapshot(base({ score: 82, badge: "Gold" })).review, {});
    const ok = buildCielPackageSnapshot(base({ approved: true, score: 82, badge: "Gold" }));
    assert.deepEqual(ok.review, { status: "approved", score: 82, badge: "Gold" });
    assert.deepEqual(buildCielPackageSnapshot(base({ approved: true, score: null })).review, {});
});

test("project block is filled from the opportunity and report", () => {
    const { project } = buildCielPackageSnapshot(base());
    assert.equal(project.id, "CIEL-BNU-2026-0421");
    assert.equal(project.title, "Clean water drive");
    assert.equal(project.start_date, "2026-03-01");
    assert.equal(project.end_date, "2026-03-20");
    assert.equal(project.required_hours_per_student, 16);
    assert.equal(project.venue, "Lahore");
    assert.deepEqual(project.sdg_primary, [6]);
    assert.deepEqual(project.sdg_secondary, [3]);
    assert.equal(project.unique_beneficiaries, 40);
    assert.equal(project.signed_at, "2026-04-01T10:00:00.000Z");
    assert.equal(project.submitted_at, "2026-04-01T10:00:01.000Z");
});

test("faculty comes from the opportunity's supervision block, university from the lead", () => {
    const snap = buildCielPackageSnapshot(
        base({
            opportunity: { id: "o", title: "T", supervision: { supervisor_name: "Dr. Hina" } },
            report: { ...report(), section1: { ...report().section1, team_lead: { id: "L", university: "BNU" } } },
        }),
    );
    assert.equal(snap.project.faculty, "Dr. Hina");
    assert.equal(snap.project.university, "BNU");
});

test("identity fields are written under the viewer's schema names too", () => {
    const snap = buildCielPackageSnapshot(
        base({
            report: {
                ...report(),
                section1: {
                    ...report().section1,
                    team_lead: { id: "L", name: "Ayesha Noor", university: "BNU", degree: "BBA", year: "Semester 5" },
                    team_members: [{ id: "M", name: "Bilal", university: "LUMS", program: "BSc" }],
                },
            },
        }),
    );
    const s1 = snap.data.section1 as { team_lead: Record<string, string>; team_members: Array<Record<string, string>> };
    assert.equal(s1.team_lead.fullName, "Ayesha Noor");
    assert.equal(s1.team_lead.name, "Ayesha Noor");
    assert.equal(s1.team_lead.universityName, "BNU");
    assert.equal(s1.team_lead.academicProgram, "BBA");
    assert.equal(s1.team_lead.semester, "Semester 5");
    assert.equal(s1.team_members[0].fullName, "Bilal");
    assert.equal(s1.team_members[0].academicProgram, "BSc");
});

test("attendance dates and clock times are normalised to the viewer's strict formats", () => {
    const r = report();
    r.section1.attendance_logs = [
        { id: "a1", date: "2026-03-01T00:00:00.000Z", start_time: "9:00", end_time: "17:5", participantId: "lead:LEAD1" },
    ] as never;
    const snap = buildCielPackageSnapshot(base({ report: r }));
    const log = (snap.data.section1 as { attendance_logs: Array<Record<string, string>> }).attendance_logs[0];
    assert.equal(log.date, "2026-03-01");
    assert.equal(log.start_time, "09:00");
    assert.equal(log.end_time, "17:5");
});

test("restricted evidence is marked server-stored so the analyzer does not call it a missing original", () => {
    const snap = buildCielPackageSnapshot(base({ visibility: "restricted" }));
    assert.equal(snap.evidence[0].serverStored, true);
    assert.equal(snap.evidence[0].storageId, "E1");
    assert.equal(snap.evidence[0].url, "");
    const noFile = buildCielPackageSnapshot(base({ files: [{ id: "X", url: "", name: "lost.jpg" }] }));
    assert.equal(noFile.evidence[0].serverStored, false);
});

test("internal bookkeeping keys are not exported as answers", () => {
    const r = report() as Record<string, unknown>;
    r.section1 = { ...(r.section1 as object), metrics: { eis_score: 3 }, attendance_verification_status: "x", verified_summary: "y" };
    r.section4 = { unique_beneficiaries: 40, finalized: true, ladder_ui: {} };
    const snap = buildCielPackageSnapshot(base({ report: r }));
    const s1 = snap.data.section1 as Record<string, unknown>;
    assert.equal("metrics" in s1, false);
    assert.equal("attendance_verification_status" in s1, false);
    assert.equal("verified_summary" in s1, false);
    const s4 = snap.data.section4 as Record<string, unknown>;
    assert.deepEqual(Object.keys(s4), ["unique_beneficiaries"]);
});

test("project carries the viewer's daily cap and timezone", () => {
    const { project } = buildCielPackageSnapshot(base());
    assert.equal(project.maximum_hours_per_day, 9);
    assert.equal(project.timezone, "Asia/Karachi");
});

test("file lists become display names in data; URLs never travel there", () => {
    const r = report() as Record<string, unknown>;
    r.section8 = {
        evidence_files: [{ name: "photo.jpg", url: "https://cdn/x/photo.jpg?sig=1" }, "https://cdn/x/site%20plan.pdf?X-Amz=abc"],
        media_visible: "restricted",
    };
    r.section6 = { evidence_files: ["receipt.png"] };
    (r.section1 as Record<string, unknown>).attendance_logs = [
        { id: "a1", date: "2026-03-01", start_time: "09:00", end_time: "17:00", participantId: "lead:LEAD1", evidence_file: { name: "day1.jpg", url: "https://cdn/x/day1.jpg" } },
    ];
    const snap = buildCielPackageSnapshot(base({ report: r }));
    const s8 = snap.data.section8 as Record<string, unknown>;
    assert.deepEqual(s8.evidence_files, ["photo.jpg", "site plan.pdf"]);
    assert.deepEqual((snap.data.section6 as Record<string, unknown>).evidence_files, ["receipt.png"]);
    const log = (snap.data.section1 as { attendance_logs: Array<Record<string, unknown>> }).attendance_logs[0];
    assert.equal(log.evidence_file, "day1.jpg");
    assert.equal(/https?:\/\//.test(JSON.stringify(snap.data)), false);
});

test("inventory source and name match the data placeholder so the viewer shows each file once", () => {
    const r = report() as Record<string, unknown>;
    r.section8 = { evidence_files: [{ name: "photo.jpg", url: "https://cdn/x/photo.jpg" }, "https://cdn/x/q.pdf?sig=1"] };
    (r.section1 as Record<string, unknown>).attendance_logs = [
        { id: "a1", date: "2026-03-01", start_time: "09:00", end_time: "17:00", participantId: "lead:LEAD1", evidence_file: { name: "day1.jpg", url: "https://cdn/x/day1.jpg" } },
    ];
    const snap = buildCielPackageSnapshot(
        base({
            report: r,
            files: [
                { id: "E1", url: "https://cdn/x/photo.jpg", name: "photo.jpg", kind: "image", section: "section8" },
                { id: "E2", url: "https://cdn/x/q.pdf?sig=1", name: "q.pdf", kind: "file", section: "section8" },
                { id: "E3", url: "https://cdn/x/day1.jpg", name: "day1.jpg", kind: "image", section: "section1" },
                { id: "E4", url: "https://cdn/x/orphan.png", name: "orphan.png", kind: "image", section: "section4" },
            ],
        }),
    );
    assert.deepEqual(
        snap.evidence.map((e) => [e.source, e.name]),
        [
            ["section8.evidence_files", "photo.jpg"],
            ["section8.evidence_files", "q.pdf"],
            ["section1.attendance_logs[0].evidence_file", "day1.jpg"],
            ["section4.evidence_files", "orphan.png"],
        ],
    );
});

test("the Section 2 statement travels under the viewer's `baseline_statement` name", () => {
    const r = report() as Record<string, unknown>;
    r.section2 = { problem_statement: "No lights.", summary_text: "AI paragraph about the context." };
    const s2 = (buildCielPackageSnapshot(base({ report: r })).data.section2 || {}) as Record<string, unknown>;
    assert.equal(s2.baseline_statement, "AI paragraph about the context.");
    assert.equal(s2.summary_text, "AI paragraph about the context.");

    r.section2 = { problem_statement: "No lights.", baseline_smart_draft: "Smart draft." };
    assert.equal(((buildCielPackageSnapshot(base({ report: r })).data.section2 || {}) as Record<string, unknown>).baseline_statement, "Smart draft.");

    r.section2 = { problem_statement: "No lights.", baseline_statement: "Already set.", summary_text: "AI paragraph." };
    assert.equal(((buildCielPackageSnapshot(base({ report: r })).data.section2 || {}) as Record<string, unknown>).baseline_statement, "Already set.");

    r.section2 = { problem_statement: "No lights." };
    assert.equal(((buildCielPackageSnapshot(base({ report: r })).data.section2 || {}) as Record<string, unknown>).baseline_statement, undefined);
});

test("snapshot never mutates the live report", () => {
    const input = base();
    const before = JSON.stringify(input.report);
    buildCielPackageSnapshot(input);
    assert.equal(JSON.stringify(input.report), before);
});
