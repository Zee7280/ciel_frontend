// AI Opportunity Assistant on the faculty (also Super Admin) and partner / NGO / university /
// corporate wizards: same endpoint, a mapper for their form shape. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
    aiDraftInputsFromOrgForm,
    applyAiDraftToOrgForm,
    buildAiDraftRequest,
} from "../src/app/dashboard/student/create-opportunity/aiDraft.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

const ORG_TYPES = [
    "Community Service",
    "Volunteer Activity",
    "Awareness Campaign",
    "Training / Teaching",
    "Research / Survey Support",
    "Technical / Professional Support",
    "Environmental Action",
    "Corporate CSR Activity",
];
const ORG_SKILLS = ["Leadership", "Communication", "Teaching", "Teamwork", "Digital Skills", "Research", "Problem Solving"];
const BENEFICIARIES = ["Children", "Youth", "Women", "Elderly", "Persons with disabilities", "Students", "Community members"];

/** Faculty wizard form (partner wizard differs only outside the mapped fields). */
const facultyForm = (over = {}) => ({
    title: "",
    hook: "",
    opportunityType: [],
    isOtherTypeChecked: false,
    otherTypeSpecs: [""],
    mode: "",
    location: { city: "", venue: "", pin: "31.5,74.3" },
    timelineType: "Fixed dates",
    dates: { start: "", end: "", fromTime: "09:00", endTime: "" },
    scheduleNotes: "",
    capacity: { hours: "", volunteers: "" },
    sdg: "",
    target: "",
    indicator: "",
    subIndicator: "",
    sdgWhy: "",
    secondarySdgs: [],
    objectives: {
        description: "",
        outputs: "",
        outcome: "",
        beneficiariesCount: "",
        beneficiariesType: [],
        isOtherBeneficiaryChecked: false,
        otherBeneficiarySpecs: [""],
    },
    activity: {
        responsibilities: "",
        skills: [],
        isOtherSkillChecked: false,
        otherSkills: [""],
        prerequisites: "",
        resources: "",
    },
    academicLead: { designation: "Lecturer", officialEmail: "lead@bnu.edu.pk" },
    partnerCollaboration: { hasPartner: false, orgName: "", contactPerson: "", email: "" },
    safetyDeclarations: { safeAppropriate: true },
    electronicSignature: "Dr Hina",
    applyScope: "own_uni_all",
    ...over,
});

const inputs = (over = {}) => ({
    idea: "sos kids classroom charts and repaint desks",
    titleHint: "Classroom Upgradation",
    place: "SOS Village, Lahore",
    beneficiaries: "30",
    teamMode: "private_team",
    seats: "40",
    hours: "16",
    startDate: "2026-10-22",
    endDate: "2026-12-31",
    mainPartner: "SOS Children's Villages",
    ...over,
});

const fields = (over = {}) => ({
    title: "SOS Classroom Upgradation",
    hook: "Brighten SOS classrooms.",
    summary: "Students create curriculum charts and refresh furniture.",
    activity_types: ["Community Service", "Research", "Fundraising / Resource Mobilization"],
    mode: "On site",
    schedule_notes: "1. Meet instructors\n2. Prepare charts",
    objective: "Improve two classrooms.",
    outputs: "12 charts",
    outcome: "Host confirms use.",
    beneficiary_types: ["Children"],
    responsibilities: "• Plan\n• Prepare charts",
    skills: ["Teaching", "Teamwork", "Event Planning"],
    prerequisites: "Follow safeguarding rules.",
    resources: "To be confirmed.",
    feasibility_warning: "40 × 16 = 640 student-hours.",
    primary_sdg: { sdg_id: "4", target_id: "4.a", indicator_id: "4.a.1", why: "Better classrooms.", local_metric: "Classrooms improved" },
    supporting_sdg: { sdg_id: "12", target_id: "12.5", indicator_id: "12.5.1", why: "Reuse furniture." },
    ...over,
});

const opts = {
    cityOptions: ["Karachi", "Lahore", "Islamabad"],
    sdgTargetExists: (sdg, target) => ({ 4: ["4.a", "4.1"], 12: ["12.5"] })[sdg]?.includes(target) ?? false,
    sdgIndicatorExists: (sdg, target, ind) => ({ "4.a": ["4.a.1"], "12.5": ["12.5.1"] })[target]?.includes(ind) ?? false,
    activityTypeOptions: ORG_TYPES,
    skillOptions: ORG_SKILLS,
    beneficiaryOptions: BENEFICIARIES,
};

test("fills the faculty / partner form from the draft and the creator's own facts", () => {
    const before = facultyForm();
    const out = applyAiDraftToOrgForm(before, fields(), inputs(), opts);
    assert.equal(out.title, "SOS Classroom Upgradation");
    assert.equal(out.hook, "Brighten SOS classrooms.");
    // Student-list types mapped to the org chips; types the org form lacks are dropped.
    assert.deepEqual(out.opportunityType, ["Community Service", "Research / Survey Support"]);
    assert.equal(out.mode, "On site");
    assert.deepEqual(out.location, { city: "Lahore", venue: "SOS Village, Lahore", pin: "31.5,74.3" });
    assert.deepEqual(out.dates, { start: "2026-10-22", end: "2026-12-31", fromTime: "09:00", endTime: "" });
    // No team mode on these forms: 40 places is kept (no private-team cap of 20).
    assert.deepEqual(out.capacity, { hours: "16", volunteers: "40" });
    assert.equal("teamMode" in out, false);
    assert.equal("opportunitySummary" in out, false);
    assert.deepEqual([out.sdg, out.target, out.indicator, out.subIndicator], ["4", "4.a", "4.a.1", "Classrooms improved"]);
    assert.deepEqual(out.secondarySdgs, [
        { sdgId: "12", targetId: "12.5", indicatorId: "12.5.1", subIndicatorId: "", justification: "Reuse furniture." },
    ]);
    assert.equal(out.objectives.description, "Improve two classrooms.");
    assert.equal(out.objectives.beneficiariesCount, "30");
    assert.deepEqual(out.objectives.beneficiariesType, ["Children"]);
    assert.deepEqual(out.activity.skills, ["Teaching", "Teamwork"]);
    assert.equal(out.activity.isOtherSkillChecked, true);
    assert.deepEqual(out.activity.otherSkills, ["Event Planning"]);
    // Never touched: lead, partner block, safety, signature, apply scope, other fields.
    for (const key of ["academicLead", "partnerCollaboration", "safetyDeclarations", "electronicSignature", "applyScope", "timelineType", "isOtherTypeChecked"]) {
        assert.deepEqual(out[key], before[key], key);
    }
    assert.notEqual(out, before, "returns a new object");
    assert.deepEqual(before.opportunityType, [], "input not mutated");
});

test("keeps what the creator already chose", () => {
    const form = facultyForm({
        title: "My title",
        location: { city: "Karachi", venue: "Govt School", pin: "" },
        secondarySdgs: [{ sdgId: "11", targetId: "11.1", indicatorId: "", subIndicatorId: "", justification: "Mine" }],
        objectives: { ...facultyForm().objectives, beneficiariesType: ["Refugee families"] },
        activity: { ...facultyForm().activity, isOtherSkillChecked: true, otherSkills: ["Sign language"] },
    });
    const out = applyAiDraftToOrgForm(form, fields({ title: "" }), inputs(), opts);
    assert.equal(out.title, "My title", "blank AI value keeps the form value");
    assert.deepEqual(out.location, { city: "Karachi", venue: "Govt School", pin: "" });
    assert.deepEqual(out.secondarySdgs, form.secondarySdgs, "an existing supporting SDG is not replaced");
    assert.deepEqual(out.objectives.beneficiariesType, ["Children", "Refugee families"]);
    assert.deepEqual(out.activity.otherSkills, ["Sign language", "Event Planning"]);

    const sameAsPrimary = applyAiDraftToOrgForm(
        facultyForm({ secondarySdgs: [{ sdgId: "4", targetId: "", indicatorId: "", subIndicatorId: "", justification: "" }] }),
        fields({ supporting_sdg: null }),
        inputs(),
        opts,
    );
    assert.deepEqual(sameAsPrimary.secondarySdgs, [], "a supporting SDG equal to the new primary is removed");

    const noLists = applyAiDraftToOrgForm(
        facultyForm({ opportunityType: ["Awareness Campaign"] }),
        fields({ activity_types: ["Fundraising / Resource Mobilization"], skills: [], beneficiary_types: [] }),
        inputs(),
        opts,
    );
    assert.deepEqual(noLists.opportunityType, ["Awareness Campaign"]);
    assert.equal(noLists.activity.isOtherSkillChecked, false);
});

test("modal inputs and request for faculty / organisation creators", () => {
    const form = facultyForm({
        title: "Tree drive",
        location: { city: "Lahore", venue: "Model Town park", pin: "" },
        capacity: { hours: "12", volunteers: "30" },
        dates: { start: "2026-12-01", end: "", fromTime: "", endTime: "" },
        objectives: { ...facultyForm().objectives, beneficiariesCount: "200" },
    });
    const modal = aiDraftInputsFromOrgForm(form, "WWF Pakistan");
    assert.deepEqual(modal, {
        idea: "",
        titleHint: "Tree drive",
        place: "Model Town park, Lahore",
        beneficiaries: "200",
        teamMode: "open",
        seats: "30",
        hours: "12",
        startDate: "2026-12-01",
        endDate: "",
        mainPartner: "WWF Pakistan",
    });
    assert.equal(buildAiDraftRequest({ ...modal, idea: "plant trees" }, "faculty").creator_pathway, "faculty");
    assert.equal(buildAiDraftRequest({ ...modal, idea: "plant trees" }, "organization").creator_pathway, "organization");
});

test("faculty (also Super Admin) and partner wizards show the assistant; chip lists match", () => {
    const assistant = read("src/app/dashboard/student/create-opportunity/OrgAiDraftAssistant.tsx");
    assert.match(assistant, /usePublicPlatformConfig\(\)\.student_ai_draft_enabled/, "same admin switch as the student form");
    for (const type of ORG_TYPES) assert.ok(assistant.includes(`"${type}"`), type);

    const faculty = read("src/app/dashboard/faculty/create-opportunity/page.tsx");
    const partner = read("src/app/dashboard/partner/requests/new/page.tsx");
    assert.match(faculty, /<OrgAiDraftAssistant[\s\S]*?creatorPathway="faculty"/);
    assert.match(partner, /<OrgAiDraftAssistant[\s\S]*?creatorPathway="organization"/);
    const typeList = JSON.stringify(ORG_TYPES).replace(/,/g, ", ");
    assert.ok(faculty.includes(typeList), "faculty Section B chips unchanged");
    assert.ok(partner.includes(typeList), "partner Section B chips unchanged");
    assert.match(read("src/app/dashboard/admin/create-opportunity/page.tsx"), /faculty\/create-opportunity\/page/, "Super Admin uses the faculty wizard");

    // Student wizard keeps its own assistant and copy.
    const modal = read("src/app/dashboard/student/create-opportunity/AiDraftModal.tsx");
    assert.match(modal, /forOrg \? "Describe the opportunity" : "Tell us what you want to do"/);
});
