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
            { id: "a", date: "2026-05-04", start_time: "09:00", end_time: "13:00", location: "Lahore", activity_type: "field_visit", description: "Paint", hours: 4 },
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
} as never;

test("detailed report uses the 10-section mockup outline with live answers", () => {
    const dossier = buildImpactPackageDetailedReport(base);
    assert.equal(dossier.sections.length, 10);
    assert.equal(dossier.sections[0].title, "Identity, team & participation");
    assert.equal(dossier.sections[9].id, "10");
    const name = dossier.sections[0].subsections[0].rows.find((row) => row.question === "Full name");
    assert.equal(name?.answer, "Zain");
    assert.equal(name?.origin, "Source record");
    assert.ok(dossier.fieldCount > 30);
    assert.ok(dossier.banner?.htmlTitle.includes("Super Admin"));
});

test("partner package redacts CNIC; faculty keeps the identity number", () => {
    const partner = buildImpactPackageDetailedReport(base, undefined, undefined, "partner");
    const cnic = partner.sections[0].subsections[0].rows.find((row) => row.question === "CNIC / identity number");
    assert.match(String(cnic?.answer), /Private identity/);
    const faculty = buildImpactPackageDetailedReport(base, undefined, undefined, "faculty");
    const facCnic = faculty.sections[0].subsections[0].rows.find((row) => row.question === "CNIC / identity number");
    assert.match(String(facCnic?.answer), /35202/);
});
