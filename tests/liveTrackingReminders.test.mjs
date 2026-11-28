// Live synchronisation of opportunity & report progress for faculty, partner / NGO, university
// and CIEL PK admin, plus the "Complete your report ASAP" communication bar. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

test("one tracking API per dashboard, one mapper, one Remind now call", () => {
    const util = read("src/utils/projectTracking.ts");
    assert.match(util, /faculty: "\/api\/v1\/faculty\/community-service\/tracking"/);
    assert.match(util, /partner: "\/api\/v1\/partners\/community-service\/tracking"/);
    assert.match(util, /admin: "\/api\/v1\/admin\/community-service\/tracking"/);
    assert.match(util, /return `\$\{PROJECT_TRACKING_API\[role\]\}\/\$\{encodeURIComponent\(opportunityId\)\}\/remind`;/);
    // Communication-bar fields come through the shared mapper.
    for (const field of ["project_end_date", "reporting_close_date", "days_left_to_report", "deadline_phase", "last_reminder_at", "reminders_sent"]) {
        assert.match(util, new RegExp(`${field}:`), field);
    }
    const hook = read("src/app/dashboard/faculty/community-service/useFacultyCommunityServiceData.ts");
    assert.match(hook, /const mappedTracking: FacultyCsReportRow\[\] = mapTrackingRows\(tracking\);/);
});

test("the shared monitor card carries the communication bar and the Remind now button", () => {
    const card = read("src/components/ciel/community-service/ProjectMonitorCard.tsx");
    assert.match(card, /export default function ProjectMonitorCard\(/);
    assert.match(card, /data-testid="communication-bar"/);
    assert.match(card, /“Complete your report ASAP” sent/);
    assert.match(card, /\{remind\.busy \? "Sending…" : "Remind now"\}/);
    assert.match(card, /export function describeDeadline\(/);
    // The faculty page no longer keeps its own copy.
    const faculty = read("src/app/dashboard/faculty/community-service/page.tsx");
    assert.doesNotMatch(faculty, /function FacultyProjectMonitorCard/);
    assert.match(faculty, /<ProjectMonitorCard\s/);
    assert.match(faculty, /postRemindNow\("faculty", row\.project_id/);
});

test("every stakeholder hub shows live tracking from the same rows", () => {
    // University and CIEL PK admin keep a separate Live progress tab on the shared panel (with a count).
    for (const [file, role] of [
        ["src/app/dashboard/partner/community-service/UniversityCommunityServiceHub.tsx", 'role="partner"'],
        ["src/app/dashboard/admin/community-service/page.tsx", 'role="admin"'],
    ]) {
        const src = read(file);
        assert.match(src, /\{ id: "tracking", label: "Live progress"/, file);
        assert.match(src, /<ProjectTrackingPanel/, file);
        assert.ok(src.includes(role), `${file} ${role}`);
    }
    assert.match(
        read("src/app/dashboard/partner/community-service/UniversityCommunityServiceHub.tsx"),
        /\{ id: "tracking", label: "Live progress", count: linkedProjects\.active\.length \}/,
    );
    // Partner and NGO show the faculty-style view: the Active tab IS the live view (old ?tab=tracking → Active).
    for (const file of [
        "src/app/dashboard/partner/community-service/PartnerCommunityServiceHub.tsx",
        "src/app/dashboard/partner/community-service/NgoCommunityServiceHub.tsx",
    ]) {
        const src = read(file);
        assert.match(src, /<LinkedProjectsView/, file);
        assert.match(src, /const linkedProjects = useLinkedProjects\("partner", \{ enabled: view === "projects" \}\);/, file);
        assert.match(src, /tab=\{linkedProjectsTab\(projectTab\)\}/, file);
    }
    const view = read("src/components/ciel/community-service/LinkedProjectsView.tsx");
    assert.match(view, /return raw === "verified" \|\| raw === "all" \? raw : "active";/);
    const panel = read("src/components/ciel/community-service/ProjectTrackingPanel.tsx");
    assert.match(panel, /const own = useLinkedProjects\(role, \{ enabled: !tracking \}\);/);
    const hook = read("src/hooks/useLinkedProjects.ts");
    assert.match(hook, /const tracking = useProjectTracking\(role, options\);/);
    assert.match(hook, /groupTeamTrackingRows\(tracking\.rows\)/);
});

test("live sync: lists refresh on an interval while visible and when the tab comes back", () => {
    const live = read("src/hooks/useLiveRefresh.ts");
    assert.match(live, /window\.setInterval\(tick, Math\.max\(15_000, intervalMs\)\)/);
    assert.match(live, /document\.addEventListener\("visibilitychange", onVisible\)/);
    assert.match(live, /window\.addEventListener\("focus", onVisible\)/);
    for (const file of [
        "src/app/dashboard/faculty/community-service/useFacultyCommunityServiceData.ts",
        "src/app/dashboard/partner/community-service/PartnerCommunityServiceHub.tsx",
        "src/app/dashboard/partner/community-service/useNgoCommunityServiceData.ts",
        "src/app/dashboard/partner/community-service/useUniversityCommunityServiceData.ts",
        "src/app/dashboard/admin/community-service/page.tsx",
        "src/hooks/useProjectTracking.ts",
    ]) {
        assert.match(read(file), /useLiveRefresh\(/, file);
    }
});

test("students see the Complete-your-report bar on My Reports and the module hub", () => {
    const bar = read("src/components/ciel/community-service/StudentReportReminderBar.tsx");
    assert.match(bar, /STUDENT_REPORT_REMINDERS_API = "\/api\/v1\/student\/report-reminders"/);
    assert.match(bar, /"Complete your report ASAP" : "Reports in progress"/);
    assert.match(bar, /if \(!items \|\| !items\.length\) return null;/);
    assert.match(read("src/app/dashboard/student/paths/community-service/CommunityServiceWorkspace.tsx"), /<StudentReportReminderBar className="mb-4" \/>/);
    assert.match(read("src/app/dashboard/student/paths/community-service/CommunityServiceHub.tsx"), /<StudentReportReminderBar className="mb-4" \/>/);
});
