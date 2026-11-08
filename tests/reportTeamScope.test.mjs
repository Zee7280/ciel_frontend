// A teammate opening the lead's report must see the TEAM (lead + members, themselves included), not
// an "individual record" with the lead alone — that is what Zubair saw in his own dashboard.
import test from "node:test";
import assert from "node:assert/strict";
import { resolveScopedTeamMembers, mapProjectTeamRowsForReport } from "../src/utils/reportTeamScopeCore.ts";

const lead = {
    id: "seat-lead",
    studentId: "u-fatima",
    fullName: "FATIMA KHALID",
    email: "fatima@bnu.edu.pk",
    isTeamLead: true,
    teamId: "TM-1",
    status: "approved",
};
const zubair = {
    id: "seat-zubair",
    studentId: "u-zubair",
    fullName: "Zubair Ali",
    email: "zubair@bnu.edu.pk",
    isTeamLead: false,
    teamId: "TM-1",
    status: "approved",
};
const otherTeam = {
    id: "seat-other",
    studentId: "u-other",
    fullName: "Other Team Member",
    email: "other@bnu.edu.pk",
    isTeamLead: false,
    teamId: "TM-2",
    status: "approved",
};
const names = (rows) => rows.map((r) => r.name);

test("teammate's view keeps their own seat: lead + Zubair, participation_type team", () => {
    const out = resolveScopedTeamMembers(zubair, [lead, zubair, otherTeam]);
    assert.equal(out.participation_type, "team");
    assert.deepEqual(names(out.team_members), ["Zubair Ali"]);
    assert.equal(out.team_members[0].verified, true);
    assert.equal(out.team_members[0].university, undefined);
});

test("lead's view is unchanged: members only, never the lead's own seat", () => {
    const out = resolveScopedTeamMembers(lead, [lead, zubair, otherTeam]);
    assert.equal(out.participation_type, "team");
    assert.deepEqual(names(out.team_members), ["Zubair Ali"]);
});

test("the viewer is recognised as lead from the roster row even when /engagement/my omits the flag", () => {
    const out = resolveScopedTeamMembers({ id: "seat-lead", email: lead.email }, [lead, zubair]);
    assert.deepEqual(names(out.team_members), ["Zubair Ali"]);
});

test("a teammate on a team with no teamId tags yet still sees a team with themselves in it", () => {
    const untaggedLead = { ...lead, teamId: undefined };
    const untaggedZubair = { ...zubair, teamId: undefined };
    const out = resolveScopedTeamMembers(untaggedZubair, [untaggedLead, untaggedZubair]);
    assert.equal(out.participation_type, "team");
    assert.deepEqual(names(out.team_members), ["Zubair Ali"]);
});

test("another team on the same project never leaks into the teammate's view", () => {
    const out = resolveScopedTeamMembers(zubair, [lead, zubair, otherTeam, { ...otherTeam, id: "seat-other-lead", isTeamLead: true }]);
    assert.deepEqual(names(out.team_members), ["Zubair Ali"]);
});

test("a solo participant stays individual", () => {
    const solo = { ...lead, isTeamLead: false, teamId: undefined, participationMode: "individual" };
    const out = resolveScopedTeamMembers(solo, [solo]);
    assert.equal(out.participation_type, "individual");
    assert.deepEqual(out.team_members, []);
});

test("an individual on a project that also hosts someone else's team stays individual", () => {
    const solo = { id: "seat-solo", studentId: "u-solo", fullName: "Solo", email: "solo@bnu.edu.pk", isTeamLead: false, status: "approved" };
    const out = resolveScopedTeamMembers(solo, [lead, zubair, solo]);
    assert.equal(out.participation_type, "individual");
    assert.deepEqual(out.team_members, []);
});

test("a duplicate seat of the same teammate (same account) is listed once", () => {
    const ghost = { ...zubair, id: "seat-zubair-ghost" };
    const out = resolveScopedTeamMembers(zubair, [lead, zubair, ghost]);
    assert.deepEqual(names(out.team_members), ["Zubair Ali"]);
});

test("mapProjectTeamRowsForReport drops self by default and keeps it with includeSelf", () => {
    assert.deepEqual(names(mapProjectTeamRowsForReport([lead, zubair], "seat-zubair")), ["FATIMA KHALID"]);
    assert.deepEqual(names(mapProjectTeamRowsForReport([lead, zubair], "seat-zubair", { includeSelf: true })), [
        "FATIMA KHALID",
        "Zubair Ali",
    ]);
});
