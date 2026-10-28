// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { groupTeamTrackingRows } from "../src/utils/facultyTeamTracking.ts";

const seat = (over) => ({
    id: `track:${over.name}`,
    project_id: "opp-1",
    team_id: null,
    is_team_lead: false,
    student_name: over.name,
    student_email: `${over.name.toLowerCase()}@bnu.edu.pk`,
    report_id: null,
    status: "assigned",
    hours: 0,
    required_hours: 16,
    hours_progress_pct: 0,
    member_hours: [{ name: over.name, hours: over.hours ?? 0, required: 16 }],
    ...over,
});

test("a team's seats on one project fold into one card, lead first, with every member's hours", () => {
    const rows = [
        seat({ name: "Sara", team_id: "TM-1", hours: 4, hours_progress_pct: 25, last_activity_at: "2026-10-20T10:00:00Z" }),
        seat({ name: "Shaher", team_id: "TM-1", is_team_lead: true, hours: 16, hours_progress_pct: 100, last_activity_at: "2026-10-28T10:00:00Z" }),
        seat({ name: "Eman", team_id: "TM-1", hours: 8, hours_progress_pct: 50 }),
    ];
    const out = groupTeamTrackingRows(rows);
    assert.equal(out.length, 1);
    const card = out[0];
    assert.equal(card.participation_type, "team");
    assert.equal(card.student_name, "Shaher");
    assert.deepEqual(card.member_hours.map((m) => m.name), ["Shaher", "Sara", "Eman"]);
    assert.deepEqual(card.team_members.map((m) => [m.name, m.lead]), [["Shaher", true], ["Sara", false], ["Eman", false]]);
    // Complete only when every member met the minimum; latest activity of anyone.
    assert.equal(card.hours_progress_pct, 25);
    assert.equal(card.last_activity_at, "2026-10-28T10:00:00Z");
});

test("the card's report comes from the seat that holds the team report", () => {
    const out = groupTeamTrackingRows([
        seat({ name: "Lead", team_id: "TM-2", is_team_lead: true }),
        seat({ name: "Writer", team_id: "TM-2", id: "rep-9", report_id: "rep-9", status: "submitted" }),
    ]);
    assert.equal(out.length, 1);
    assert.equal(out[0].report_id, "rep-9");
    assert.equal(out[0].status, "submitted");
});

test("a member who holds a report of their own keeps a separate card", () => {
    const rows = [
        seat({ name: "Lead", team_id: "TM-3", is_team_lead: true, id: "rep-lead", report_id: "rep-lead", status: "draft" }),
        seat({ name: "Member", team_id: "TM-3" }),
        seat({ name: "OwnReport", team_id: "TM-3", id: "rep-own", report_id: "rep-own", status: "submitted" }),
    ];
    const out = groupTeamTrackingRows(rows);
    assert.deepEqual(out.map((r) => r.student_name), ["Lead", "OwnReport"]);
    assert.equal(out[0].report_id, "rep-lead");
    assert.deepEqual(out[0].team_members.map((m) => m.name), ["Lead", "Member"]);
    assert.equal(out[1], rows[2]);
    // Only the lead and that member: nothing left to fold.
    const pair = groupTeamTrackingRows([rows[0], rows[2]]);
    assert.deepEqual(pair, [rows[0], rows[2]]);
});

test("individuals, other teams and other projects stay separate cards, in order", () => {
    const rows = [
        seat({ name: "Solo" }),
        seat({ name: "A1", team_id: "TM-A" }),
        seat({ name: "B1", team_id: "TM-B" }),
        seat({ name: "A2", team_id: "TM-A" }),
        seat({ name: "OtherProject", team_id: "TM-A", project_id: "opp-2" }),
        seat({ name: "Solo2", participation_type: "individual" }),
    ];
    const out = groupTeamTrackingRows(rows);
    assert.deepEqual(out.map((r) => r.student_name), ["Solo", "A1", "B1", "OtherProject", "Solo2"]);
    assert.equal(out[1].member_hours.length, 2);
    // A team with one seat is left untouched.
    assert.equal(out[2], rows[2]);
    assert.equal(out[0], rows[0]);
});

test("rows from an older backend (no team_id) are unchanged", () => {
    const rows = [seat({ name: "X", team_id: undefined }), seat({ name: "Y", team_id: undefined })];
    const out = groupTeamTrackingRows(rows);
    assert.equal(out.length, 2);
    assert.equal(out[0], rows[0]);
    assert.equal(out[1], rows[1]);
});
