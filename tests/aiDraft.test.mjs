// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
    aiDraftInputError,
    aiDraftInputsFromForm,
    aiWorkloadHint,
    applyAiDraft,
    buildAiDraftRequest,
} from "../src/app/dashboard/student/create-opportunity/aiDraft.ts";

/** The slice of the wizard form the mapper touches, plus fields it must never touch. */
const blankForm = () => ({
    title: "",
    hook: "",
    opportunitySummary: "",
    opportunityType: [],
    mode: "",
    location: { city: "", venue: "", pin: "", mapSearch: "", mapLink: "" },
    dates: { start: "", end: "", fromTime: "09:00", endTime: "" },
    scheduleNotes: "",
    capacity: { hours: "", volunteers: "" },
    teamMode: "open",
    sdg: "",
    target: "",
    indicator: "",
    subIndicator: "",
    sdgWhy: "",
    secondarySdg: "",
    secondaryTarget: "",
    secondaryIndicator: "",
    secondarySubIndicator: "",
    secondarySdgWhy: "",
    objectives: {
        description: "",
        outputs: "",
        outcome: "",
        beneficiariesCount: "",
        beneficiaryGroup: "",
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
    supervision: {
        facultyName: "Dr Hina",
        facultyOfficialEmail: "hina@bnu.edu.pk",
        executingContext: "",
        partnerOrgName: "",
        partnerEmail: "",
        declSafeEnvironment: false,
    },
    applyScope: "student_uni_all",
    electronicSignature: "",
    flashApprove: false,
    privateCandidate: false,
});

const inputs = (over = {}) => ({
    idea: "sos kids classroom charts and repaint desks",
    titleHint: "Classroom Upgradation",
    place: "SOS Village, Lahore",
    beneficiaries: "30",
    teamMode: "private_team",
    seats: "10",
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
    activity_types: ["Community Service", "Training / Teaching"],
    mode: "On site",
    schedule_notes: "1. Meet instructors\n2. Prepare charts",
    objective: "Improve two classrooms.",
    outputs: "12 charts",
    outcome: "Host confirms use.",
    beneficiary_types: ["Children"],
    responsibilities: "• Plan\n• Prepare charts",
    skills: ["Teaching", "Teamwork"],
    prerequisites: "Follow safeguarding rules.",
    resources: "To be confirmed.",
    feasibility_warning: "10 × 16 = 160 student-hours.",
    primary_sdg: { sdg_id: "4", target_id: "4.a", indicator_id: "4.a.1", why: "Better classrooms.", local_metric: "Classrooms improved" },
    supporting_sdg: { sdg_id: "12", target_id: "12.9", indicator_id: "12.9.1", why: "Reuse furniture." },
    ...over,
});

const opts = {
    cityOptions: ["Karachi", "Lahore", "Islamabad"],
    sdgTargetExists: (sdg, target) => ({ 4: ["4.a", "4.1"], 12: ["12.5"] })[sdg]?.includes(target) ?? false,
    sdgIndicatorExists: (sdg, target, ind) => ({ "4.a": ["4.a.1"], "4.1": ["4.1.1"], "12.5": ["12.5.1"] })[target]?.includes(ind) ?? false,
    teamModeChoosable: true,
};

test("fills the drafted text and the student's own facts", () => {
    const out = applyAiDraft(blankForm(), fields(), inputs(), opts);
    assert.equal(out.title, "SOS Classroom Upgradation");
    assert.equal(out.opportunitySummary, "Students create curriculum charts and refresh furniture.");
    assert.deepEqual(out.opportunityType, ["Community Service", "Training / Teaching"]);
    assert.equal(out.mode, "On site");
    assert.equal(out.location.venue, "SOS Village, Lahore");
    assert.equal(out.location.city, "Lahore");
    assert.deepEqual(out.dates, { start: "2026-10-22", end: "2026-12-31", fromTime: "09:00", endTime: "" });
    assert.deepEqual(out.capacity, { hours: "16", volunteers: "10" });
    assert.equal(out.teamMode, "private_team");
    assert.equal(out.sdg, "4");
    assert.equal(out.target, "4.a");
    assert.equal(out.indicator, "4.a.1");
    assert.equal(out.subIndicator, "Classrooms improved");
    assert.equal(out.objectives.beneficiariesCount, "30");
    assert.deepEqual(out.objectives.beneficiariesType, ["Children"]);
    assert.deepEqual(out.activity.skills, ["Teaching", "Teamwork"]);
    assert.equal(out.supervision.executingContext, "partner");
    assert.equal(out.supervision.partnerOrgName, "SOS Children's Villages");
});

test("never touches faculty, partner email, map pin, scope, declarations or signature", () => {
    const form = blankForm();
    form.location.pin = "31.5,74.3";
    const out = applyAiDraft(form, fields(), inputs(), opts);
    assert.equal(out.location.pin, "31.5,74.3");
    assert.equal(out.supervision.facultyName, "Dr Hina");
    assert.equal(out.supervision.facultyOfficialEmail, "hina@bnu.edu.pk");
    assert.equal(out.supervision.partnerEmail, "");
    assert.equal(out.supervision.declSafeEnvironment, false);
    assert.equal(out.applyScope, "student_uni_all");
    assert.equal(out.electronicSignature, "");
    assert.equal(out.flashApprove, false);
    assert.equal(out.privateCandidate, false);
});

test("drops SDG targets missing from the catalog and keeps unknown-city places as venue only", () => {
    const out = applyAiDraft(blankForm(), fields(), inputs({ place: "Village near Murree" }), opts);
    assert.equal(out.secondarySdg, "12");
    assert.equal(out.secondaryTarget, "", "12.9 is not in the catalog");
    assert.equal(out.secondaryIndicator, "", "no indicator without a catalog target");
    assert.equal(out.location.city, "");
    assert.equal(out.location.venue, "Village near Murree");
});

test("fills the supporting SDG's target and indicator when both are in the catalog", () => {
    const out = applyAiDraft(
        blankForm(),
        fields({ supporting_sdg: { sdg_id: "12", target_id: "12.5", indicator_id: "12.5.1", why: "Reuse." } }),
        inputs(),
        opts,
    );
    assert.equal(out.secondaryTarget, "12.5");
    assert.equal(out.secondaryIndicator, "12.5.1");
    const wrongIndicator = applyAiDraft(
        blankForm(),
        fields({ primary_sdg: { sdg_id: "4", target_id: "4.1", indicator_id: "4.a.1", why: "x", local_metric: "" } }),
        inputs(),
        opts,
    );
    assert.equal(wrongIndicator.target, "4.1");
    assert.equal(wrongIndicator.indicator, "");
});

test("keeps what the student already wrote when the AI leaves a field empty", () => {
    const form = blankForm();
    form.hook = "My own hook";
    form.location = { city: "Karachi", venue: "My venue", pin: "", mapSearch: "", mapLink: "" };
    form.supervision.partnerOrgName = "Existing partner";
    form.supervision.executingContext = "partner";
    form.opportunityType = ["Other"];
    const out = applyAiDraft(form, fields({ hook: "", activity_types: ["Environmental Action"] }), inputs(), opts);
    assert.equal(out.hook, "My own hook");
    assert.equal(out.location.city, "Karachi");
    assert.equal(out.location.venue, "My venue");
    assert.equal(out.supervision.partnerOrgName, "Existing partner");
    assert.deepEqual(out.opportunityType, ["Environmental Action", "Other"]);
});

test("ignores the modal's team mode when the wizard does not offer the choice", () => {
    const out = applyAiDraft(blankForm(), fields(), inputs(), { ...opts, teamModeChoosable: false });
    assert.equal(out.teamMode, "open");
});

test("clears a secondary SDG that would duplicate the new primary", () => {
    const form = blankForm();
    form.secondarySdg = "4";
    form.secondarySdgWhy = "old";
    const out = applyAiDraft(form, fields({ supporting_sdg: null }), inputs(), opts);
    assert.equal(out.sdg, "4");
    assert.equal(out.secondarySdg, "");
    assert.equal(out.secondarySdgWhy, "");
});

test("validates modal inputs before calling the server", () => {
    assert.equal(aiDraftInputError(inputs()), null);
    assert.match(aiDraftInputError(inputs({ idea: "ab" })), /few keywords/);
    assert.match(aiDraftInputError(inputs({ seats: "21" })), /1–20 places/);
    assert.equal(aiDraftInputError(inputs({ teamMode: "open", seats: "500" })), null);
    assert.match(aiDraftInputError(inputs({ hours: "600" })), /1 and 500/);
    assert.match(aiDraftInputError(inputs({ startDate: "2026-12-31", endDate: "2026-10-01" })), /End date/);
});

test("builds the request body without empty values", () => {
    assert.deepEqual(buildAiDraftRequest(inputs(), "university"), {
        idea: "sos kids classroom charts and repaint desks",
        team_mode: "private_team",
        creator_pathway: "university",
        title_hint: "Classroom Upgradation",
        place: "SOS Village, Lahore",
        beneficiaries: "30",
        main_partner: "SOS Children's Villages",
        seats: 10,
        hours: 16,
        start_date: "2026-10-22",
        end_date: "2026-12-31",
    });
    assert.deepEqual(
        buildAiDraftRequest(inputs({ titleHint: " ", place: "", beneficiaries: "", mainPartner: "", seats: "", hours: "", startDate: "", endDate: "" }), "private"),
        { idea: "sos kids classroom charts and repaint desks", team_mode: "private_team", creator_pathway: "private" },
    );
});

test("caps pre-filled values to the backend DTO limits", () => {
    const body = buildAiDraftRequest(
        inputs({ titleHint: "t".repeat(260), place: "p".repeat(300), mainPartner: "m".repeat(250), beneficiaries: "9".repeat(80) }),
        "university",
    );
    assert.equal(body.title_hint.length, 200);
    assert.equal(body.place.length, 200);
    assert.equal(body.main_partner.length, 200);
    assert.equal(body.beneficiaries.length, 60);
});

test("workload hint multiplies seats × hours and flags paint-only ideas", () => {
    assert.match(aiWorkloadHint(inputs()), /10 students × 16 hours = 160/);
    assert.match(aiWorkloadHint(inputs({ idea: "repaint chairs", titleHint: "" })), /Painting alone/);
    assert.equal(aiWorkloadHint(inputs({ seats: "" })), "");
});

test("prefills the modal from the form", () => {
    const form = blankForm();
    form.title = "Tree drive";
    form.location = { city: "Lahore", venue: "Jallo Park", pin: "", mapSearch: "", mapLink: "" };
    form.capacity = { hours: "8", volunteers: "25" };
    const pre = aiDraftInputsFromForm(form);
    assert.equal(pre.titleHint, "Tree drive");
    assert.equal(pre.place, "Jallo Park, Lahore");
    assert.equal(pre.seats, "25");
    assert.equal(pre.teamMode, "open");
    assert.equal(pre.mainPartner, "");
});
