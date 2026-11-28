import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../src/app/dashboard/student/report/page.tsx", import.meta.url), "utf8");

test("team lead gets the View Flash Card shortcut team members have (and a way back to Section 1)", () => {
    assert.match(page, /\{!isTeamMemberAttendanceOnly && !stepperLockedToSummaryOnly \? \(\s*onFlash \? \(/);
    assert.match(page, /onClick=\{\(\) => goJourney\(FLASH_CARD_STEP\)\}\s*data-testid="lead-view-flash-card"/);
    assert.match(page, /onClick=\{\(\) => goJourney\(1\)\} data-testid="lead-back-to-sections"/);
    // Team members keep theirs in the banner.
    assert.match(page, /data-testid="team-member-banner"/);
});
