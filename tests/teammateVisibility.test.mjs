// A teammate the lead adds in Section 1 must end up on THEIR CIEL account, or the project never
// shows in their dashboard. The report-stage add therefore asks the backend to insist on a
// registered account; the apply-stage dialog keeps inviting by email.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

test("the Section 1 add-member OTP asks for a registered account only for a teammate (not self / lead)", () => {
    const src = read("src/app/dashboard/student/engagement/components/IdentityVerification.tsx");
    const send = src.slice(src.indexOf("const sendOtp = async"), src.indexOf("const sendOtp = async") + 1200);
    assert.match(send, /verify-team-member\/send/);
    assert.match(send, /requireRegisteredAccount: participationMode === 'team' && !isTeamLead/);
});

test("the apply dialog does not send the flag (apply-stage teammates may still sign up later)", () => {
    const src = read("src/app/dashboard/student/browse/components/ApplicationDialog.tsx");
    assert.doesNotMatch(src, /requireRegisteredAccount/);
});

test("TeamVerification registers members as team members (the backend links the seat to their account)", () => {
    const src = read("src/app/dashboard/student/report/components/TeamVerification.tsx");
    assert.match(src, /participationMode="team"/);
    assert.match(src, /isTeamLead=\{false\}/);
    assert.match(src, /data-testid="teammate-visibility-hint"/);
});

test("a verified seat with no account id is flagged on the chip, in a hint and right after saving", () => {
    const src = read("src/app/dashboard/student/report/components/TeamVerification.tsx");
    assert.match(src, /participantSeatIsUnlinked\(member\)/);
    assert.match(src, /data-testid="teammate-unlinked"/);
    assert.match(src, /data-testid="teammate-unlinked-hint"/);
    assert.match(src, /warnIfUnlinked\(participant\)/);
    // The pure check itself: null / empty ids are unlinked; an id is linked.
    const identity = read("src/app/dashboard/student/engagement/components/IdentityVerification.tsx");
    assert.match(identity, /export function participantSeatIsUnlinked/);
    assert.match(identity, /const sid = p\.studentId \?\? p\.student_id;/);
    assert.match(identity, /return !\(typeof sid === "string" && sid\.trim\(\)\.length > 0\);/);
});
