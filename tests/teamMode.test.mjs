// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
    clampSeatsForPrivateTeam,
    loadedTeamModeFromDetail,
    OPEN_MAX_SEATS,
    PRIVATE_TEAM_MAX_SEATS,
    seatsRangeError,
    teamModeChooserVisible,
    teamModePayload,
} from "../src/app/dashboard/student/create-opportunity/teamMode.ts";

test("private team seats are 1–20, open seats 1–5000", () => {
    assert.equal(PRIVATE_TEAM_MAX_SEATS, 20);
    assert.equal(OPEN_MAX_SEATS, 5000);
    assert.equal(seatsRangeError("20", true), null);
    assert.match(seatsRangeError("21", true), /1–20 seats including you/);
    assert.equal(seatsRangeError("21", false), null);
    assert.equal(seatsRangeError("5000", false), null);
    assert.match(seatsRangeError("5001", false), /between 1 and 5000/);
    assert.notEqual(seatsRangeError("", true), null);
    assert.notEqual(seatsRangeError("0", false), null);
});

test("switching to a private team clamps seats above 20 only", () => {
    assert.deepEqual(clampSeatsForPrivateTeam("100"), { seats: "20", clamped: true });
    assert.deepEqual(clampSeatsForPrivateTeam("8"), { seats: "8", clamped: false });
    assert.deepEqual(clampSeatsForPrivateTeam(""), { seats: "", clamped: false });
});

test("team_mode is only sent once students can choose", () => {
    // Feature off: payload stays exactly as before (backend stores null = legacy rules).
    assert.deepEqual(teamModePayload(false, "open"), {});
    assert.deepEqual(teamModePayload(false, undefined), {});
    assert.deepEqual(teamModePayload(true, "private_team"), { team_mode: "private_team" });
    assert.deepEqual(teamModePayload(true, "open"), { team_mode: "open" });
    // Old on-device drafts have no teamMode at all.
    assert.deepEqual(teamModePayload(true, undefined), { team_mode: "open" });
});

test("editing a legacy listing (team_mode null) keeps it legacy unless the student uses the chooser", () => {
    assert.equal(loadedTeamModeFromDetail(null), null);
    assert.equal(loadedTeamModeFromDetail(undefined), null);
    assert.equal(loadedTeamModeFromDetail("private_team"), "private_team");
    assert.deepEqual(teamModePayload(true, "open", { loaded: null, touched: false }), {});
    assert.deepEqual(teamModePayload(true, "private_team", { loaded: null, touched: true }), { team_mode: "private_team" });
    // New listing (nothing loaded) and builder listings keep sending their mode.
    assert.deepEqual(teamModePayload(true, "open", { loaded: undefined }), { team_mode: "open" });
    assert.deepEqual(teamModePayload(true, "open", { loaded: "open" }), { team_mode: "open" });
});

test("a private team can still switch back to Open after the feature is turned off", () => {
    assert.equal(teamModeChooserVisible(false, "private_team", "open"), true);
    assert.deepEqual(teamModePayload(teamModeChooserVisible(false, "private_team", "open"), "open", { loaded: "private_team", touched: true }), {
        team_mode: "open",
    });
    // Feature off, nothing private: chooser hidden, nothing sent.
    assert.equal(teamModeChooserVisible(false, null, "open"), false);
    assert.equal(teamModeChooserVisible(false, undefined, "open"), false);
    assert.equal(teamModeChooserVisible(true, null, "open"), true);
});
