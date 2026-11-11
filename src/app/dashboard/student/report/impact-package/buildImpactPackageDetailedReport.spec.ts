import assert from "node:assert/strict";
import test from "node:test";
import { buildImpactPackageDetailedReport } from "./buildImpactPackageDetailedReport";

const base = {
    project_id: "CS-1",
    project_title: "Classroom repair",
    status: "submitted",
    admin_status: "pending",
    required_hours: 16,
    section1: {
        participation_type: "team",
        privacy_consent: true,
        team_lead: {
            name: "Zain",
            fullName: "Zain",
            cnic: "3520212345671",
            mobile: "+923001234567",
            email: "zain@uni.edu.pk",
            university: "BNU",
            degree: "BArch",
            year: "Semester 6",
            role: "Team lead",
            hours: "16",
        },
        team_members: [],
        attendance_logs: [
            { id: "a", date: "2026-05-04", start_time: "09:00", end_time: "13:00", location: "Lahore", activity_type: "field_visit", description: "Paint", hours: 4, approval_status: "pending" },
        ],
        metrics: { total_verified_hours: 16, total_active_days: 1, engagement_span: 1, attendance_frequency: 1, weekly_continuity: 1, eis_score: 1, engagement_category: "ok", hec_compliance: "recognized" },
    },
    section2: { problem_statement: "Broken lights", discipline: "Architecture", discipline_contribution: "Audit lighting", baseline_evidence: ["observation"], affected_group: "children", affected_count: "120" },
    section3: { primary_sdg: { goal_number: 4, target_id: "4.a", indicator_id: "4.a.1" }, contribution_intent_statement: "Improve classrooms", student_contribution_intent_statement: "Improve classrooms", secondary_sdgs: [], validation_status: "pending", summary_stage: "preliminary" },
    section4: { activity_blocks: [], project_summary: { distinct_total_beneficiaries: "120", counting_method: "headcount", overall_overlap: "unique", overall_delivery_mode: "in_person", overall_implementation_model: [], overall_geographic_reach: "site", project_implementation_explanation: "" } },
    section5: { observed_change: "Brighter room", measurable_outcomes: [], challenges: "" },
    section6: { use_resources: "no", resources: [], evidence_files: [] },
    section7: { has_partners: "no", partners: [], formalization_status: [], formalization_files: [] },
    section8: { has_evidence: "no", evidence_types: [], evidence_files: [], description: "", ethical_compliance: { authentic: true, informed_consent: true, no_harm: true, privacy_respected: true }, media_visible: "restricted", partner_verification: false, partner_verification_files: [] },
    section9: { academic_integration: "coursework", personal_learning: "Patience", academic_application: "Studio", sustainability_reflection: "", competency_scores: { cognitive_systemic: 3 } },
    section10: { continuation_status: "yes", continuation_details: "Teachers keep it", mechanisms: [], scaling_potential: "", policy_influence: "" },
    section11: { final_declaration: [true, true, true, true, true], signature_name: "Zain" },
};

test("detailed report uses the 10-section mockup outline with live answers", () => {
    const dossier = buildImpactPackageDetailedReport(base as never);
    assert.equal(dossier.sections.length, 10);
    assert.equal(dossier.sections[0].title, "Identity, team & participation");
    assert.equal(dossier.sections[9].id, "10");
    const name = dossier.sections[0].subsections[0].rows.find((row) => row.question === "Full name");
    assert.equal(name?.answer, "Zain");
    assert.equal(name?.origin, "Source record");
    assert.match(String(name?.source_path), /student_source\.section_1\./);
    assert.ok(dossier.fieldCount > 30);
    assert.ok(dossier.banner?.htmlTitle.includes("Super Admin"));
    const sessionRow = dossier.sections[0].subsections.find((sub) => sub.id === "1.3")?.rows[0];
    const entries = sessionRow?.answer as Array<{ status?: string }>;
    assert.equal(entries[0]?.status, "Logged");
});

test("signed date-time falls back to reportSubmittedAt when section11.signed_at is missing", () => {
    const dossier = buildImpactPackageDetailedReport({
        ...base,
        reportSubmittedAt: "2026-09-08T15:30:00.000Z",
        section11: { final_declaration: [true, true, true, true, true], signature_name: "Fatima Khalid" },
    } as never);
    const signed = dossier.sections[9].subsections
        .find((sub) => sub.id === "10.1")
        ?.rows.find((row) => row.question === "Signed date-time");
    assert.notEqual(signed?.answer, "Not supplied");
    assert.match(String(signed?.answer), /2026/);
});

test("session rows map live attendance field names onto the detailed report", () => {
    const dossier = buildImpactPackageDetailedReport({
        ...base,
        section1: {
            ...base.section1,
            attendance_logs: [
                {
                    dateOfEngagement: "2026-09-07",
                    startTime: "11:00:00",
                    endTime: "18:00:00",
                    sessionHours: 7,
                    organizationName: "SOS",
                    activityType: "Field Visit",
                    description: "Met the children",
                    approvalStatus: "pending",
                },
            ],
        },
    } as never);
    const sessionRow = dossier.sections[0].subsections.find((sub) => sub.id === "1.3")?.rows[0];
    const entries = sessionRow?.answer as Array<Record<string, unknown>>;
    assert.equal(entries[0]?.date, "2026-09-07");
    assert.equal(entries[0]?.start, "11:00:00");
    assert.equal(entries[0]?.hours, "7");
    assert.equal(entries[0]?.location, "SOS");
    assert.equal(entries[0]?.status, "Logged");
});

test("detailed report does not expose V13 labels or project ids in section sources", () => {
    const dossier = buildImpactPackageDetailedReport(base as never);
    for (const section of dossier.sections) {
        assert.equal(section.source.includes("V13"), false);
        assert.equal(/v13/i.test(section.source), false);
    }
    const signed = dossier.sections[9].subsections
        .find((sub) => sub.id === "10.1")
        ?.rows.find((row) => row.question === "Signed declarations");
    assert.ok(signed);
});

test("partner package redacts CNIC; faculty keeps the identity number", () => {
    const partner = buildImpactPackageDetailedReport(base as never, undefined, undefined, "partner");
    const cnic = partner.sections[0].subsections[0].rows.find((row) => row.question === "CNIC / identity number");
    assert.match(String(cnic?.answer), /Private identity/);
    const faculty = buildImpactPackageDetailedReport(base as never, undefined, undefined, "faculty");
    const facCnic = faculty.sections[0].subsections[0].rows.find((row) => row.question === "CNIC / identity number");
    assert.match(String(facCnic?.answer), /35202/);
});

const rowsOf = (dossier: ReturnType<typeof buildImpactPackageDetailedReport>, sub: string) =>
    dossier.sections.flatMap((s) => s.subsections).find((s) => s.id === sub)?.rows || [];
const answerOf = (dossier: ReturnType<typeof buildImpactPackageDetailedReport>, sub: string, question: string) =>
    rowsOf(dossier, sub).find((r) => r.question === question)?.answer;

test("identity loaded from the participation record (universityName / universityId / academicProgram) is shown", () => {
    const dossier = buildImpactPackageDetailedReport({
        ...base,
        section1: {
            ...base.section1,
            team_lead: { name: "Zain", fullName: "Zain", universityName: "BNU", universityId: "S-77", academicProgram: "BS AI", semester: "Semester 5" },
        },
    } as never);
    assert.equal(answerOf(dossier, "1.1", "University"), "BNU");
    assert.equal(answerOf(dossier, "1.1", "Student / registration ID"), "S-77");
    assert.equal(answerOf(dossier, "1.1", "Programme"), "BS AI");
    assert.equal(answerOf(dossier, "1.1", "Semester"), "Semester 5");
});

test("team roster details, whose session it is, hours by student and the attendance matrix", () => {
    const dossier = buildImpactPackageDetailedReport({
        ...base,
        section1: {
            ...base.section1,
            team_lead: { ...base.section1.team_lead, id: "L1" },
            team_members: [{ id: "M1", name: "Alina", fullName: "Alina", universityName: "BNU", universityId: "S-2", academicProgram: "BBA", semester: "Semester 3", role: "Member", hours: "" }],
            attendance_logs: [
                { id: "a", participantId: "lead:L1", date: "2026-05-04", start_time: "09:00", end_time: "13:00", location: "Lahore", hours: 4, approval_status: "pending", evidence_url: "https://x/a.jpg" },
                { id: "b", participantId: "member:0:M1", date: "2026-05-04", start_time: "09:00", end_time: "13:00", location: "Lahore", hours: 4, approval_status: "pending" },
                { id: "c", participantId: "member:0:M1", date: "2026-05-05", start_time: "09:00", end_time: "21:00", location: "Lahore", hours: 12, approval_status: "pending" },
            ],
        },
    } as never);
    const members = answerOf(dossier, "1.2", "Registered members") as Array<Record<string, unknown>>;
    assert.deepEqual(
        { university: members[1].university, student_id: members[1].student_id, programme: members[1].programme, semester: members[1].semester },
        { university: "BNU", student_id: "S-2", programme: "BBA", semester: "Semester 3" },
    );
    const sessions = answerOf(dossier, "1.3", "Date, time, location, activity and accomplishment") as Array<Record<string, unknown>>;
    assert.deepEqual(sessions.map((s) => [s.student, s.evidence]), [["Zain", "Attached"], ["Alina", "None"], ["Alina", "None"]]);
    const hours = answerOf(dossier, "1.7", "Every student's hours against the minimum") as Array<Record<string, unknown>>;
    assert.deepEqual(hours.map((h) => [h.student, h.entries, h.logged_hours, h.remaining_hours, h.status]), [
        ["Zain", 1, 4, 12, "Below minimum"],
        ["Alina", 2, 16, 0, "Minimum met"],
    ]);
    const matrix = answerOf(dossier, "1.7", "Attendance matrix · one column per student") as Array<Record<string, unknown>>;
    assert.deepEqual(matrix, [
        { session: "2026-05-04 · 09:00 · 13:00 · Lahore", Zain: "4h", Alina: "4h" },
        { session: "2026-05-05 · 09:00 · 21:00 · Lahore", Zain: "—", Alina: "12h" },
    ]);
});

test("safeguarding, outcome confidence, resource totals, partner details and follow-up are in the report", () => {
    const full = {
        ...base,
        section2: { ...base.section2, risk_factors: ["Children on site"], risk_mitigation: "Two adults present", risk_consent: "written", risk_safeguarding_lead: "Head teacher", risk_unresolved: "", baseline_other_entries: ["Teacher interview"] },
        section5: { ...base.section5, measurable_outcomes: [{ metric: "Reading", baseline: "35", endline: "71", confidence_level: ["Directly measured"], metric_category: "Percent", outcome_sub_category: "Literacy" }] },
        section6: { use_resources: "yes", resources: [
            { type: "Books", amount: "20", unit: "items", sources: ["Donated"], source_other: "Alumni", purpose: "Library", verification: ["Receipt"], verification_other: "Photo" },
            { type: "Books", amount: "10", unit: "items", sources: [], purpose: "", verification: [] },
            { type: "Cash", amount: "5,000", unit: "PKR", sources: [], purpose: "", verification: [] },
        ], evidence_files: [] },
        section7: { has_partners: "yes", partners: [{ name: "TCF", type: "NGO", designation: "Principal", website: "https://tcf.org.pk", role: ["Host"], role_other: "Security", contribution: [], verification: "" }], formalization_status: [], formalization_files: [] },
        section8: { ...base.section8, evidence_type_other: "Voice notes" },
        section10: { ...base.section10, followup_plan: "yes", followup_owner_role: "Teacher", followup_owner_name: "Ms Sara", followup_owner_email: "sara@school.pk", followup_interval: "3 months", followup_due_date: "2027-02-01", followup_check: "Reading levels" },
    };
    const dossier = buildImpactPackageDetailedReport(full as never);
    assert.deepEqual(answerOf(dossier, "2.3", "Who could be harmed, and how?"), ["Children on site"]);
    assert.equal(answerOf(dossier, "2.3", "Consent for photos and data"), "written");
    assert.deepEqual(answerOf(dossier, "2.1", "What else informed you?"), ["Teacher interview"]);
    const outcome = (answerOf(dossier, "4.4", "Outcome metrics") as Array<Record<string, unknown>>)[0];
    assert.deepEqual([outcome.change, outcome.confidence, outcome.metric_scale, outcome.sub_category], ["+36", ["Directly measured"], "Percent", "Literacy"]);
    const items = answerOf(dossier, "5.1", "Items") as Array<Record<string, unknown>>;
    assert.deepEqual([items[0].sources, items[0].verification], [["Donated", "Alumni"], ["Receipt", "Photo"]]);
    assert.deepEqual(answerOf(dossier, "5.2", "Totals by resource type and unit (cash and in-kind kept separate)"), [
        { type: "Books", unit: "items", total: 30 },
        { type: "Cash", unit: "PKR", total: 5000 },
    ]);
    const partner = (answerOf(dossier, "6.1", "Partners") as Array<Record<string, unknown>>)[0];
    assert.deepEqual([partner.roles, partner.designation, partner.website], [["Host", "Security"], "Principal", "https://tcf.org.pk"]);
    assert.equal(answerOf(dossier, "7.1", "Other evidence type"), "Voice notes");
    assert.equal(answerOf(dossier, "9.5", "Is a follow-up check planned or needed?"), "Planned");
    assert.equal(answerOf(dossier, "9.5", "Follow-up due date"), "2027-02-01");
    assert.equal(answerOf(dossier, "9.5", "Email for follow-up invitation"), "sara@school.pk");
    // Shareable copies keep the follow-up email private.
    const partnerCopy = buildImpactPackageDetailedReport(full as never, undefined, undefined, "partner");
    assert.notEqual(answerOf(partnerCopy, "9.5", "Email for follow-up invitation"), "sara@school.pk");
    assert.equal(dossier.sections.length, 10, "still ten sections");
});

test("student IDs stay private in partner / public copies", () => {
    const data = { ...base, section1: { ...base.section1, team_lead: { name: "Zain", fullName: "Zain", universityId: "S-77" } } };
    assert.equal(answerOf(buildImpactPackageDetailedReport(data as never), "1.1", "Student / registration ID"), "S-77");
    for (const audience of ["partner", "public"] as const) {
        assert.notEqual(answerOf(buildImpactPackageDetailedReport(data as never, undefined, undefined, audience), "1.1", "Student / registration ID"), "S-77", audience);
    }
});
