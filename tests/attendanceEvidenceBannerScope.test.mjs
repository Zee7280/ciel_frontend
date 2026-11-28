import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const s1 = readFileSync(new URL("../src/app/dashboard/student/report/components/Section1Participation.tsx", import.meta.url), "utf8");

// Reported: a member with 2 sessions missing evidence saw "4 sessions have no supporting evidence"
// (the whole team's count) above a list of only their own sessions.
test("the missing-evidence banner counts the sessions listed below; other members' sessions are named separately", () => {
    assert.match(s1, /const shownMissingEvidence = attendanceSessionsWithoutEvidence\(participantLogs\)\.length;/);
    assert.match(s1, /const otherMissingEvidence = Math\.max\(0, sessionsMissingEvidence\.length - shownMissingEvidence\);/);
    assert.match(s1, /\{shownMissingEvidence \? \(/);
    assert.match(s1, /s below have" \} no supporting evidence\.|s below have"\} no supporting evidence\./);
    assert.match(s1, /in other members&apos; logs also need evidence\./);
    assert.match(s1, /data-testid="attendance-missing-evidence-others"/);
    // The submit gate itself is unchanged: every counted session in the team still needs evidence.
    assert.match(s1, /\(\) => attendanceSessionsWithoutEvidence\(attendanceLogs\),/);
});
