// Section 9.5 follow-up UI wiring: the pieces must stay mounted where the flow expects them and
// call the backend routes that exist (admin/followups, admin/reports/:id/followup/*, public/followups/:token/*).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

const adminVerify = read("src/app/dashboard/admin/reports/verify/[reportId]/page.tsx");
const adminCard = read("src/app/dashboard/admin/reports/verify/[reportId]/AdminReportFollowUpCard.tsx");
const tracker = read("src/app/dashboard/admin/followups/page.tsx");
const publicPage = read("src/app/verify/follow-up/page.tsx");
const studentNote = read("src/app/dashboard/student/report/components/FollowUpStatusNote.tsx");
const section95 = read("src/app/dashboard/student/report/components/SustainabilityFollowUp.tsx");
const sidebar = read("src/components/Sidebar.tsx");
const middleware = read("src/middleware.ts");

test("admin dossier mounts the follow-up card under Section 09 and the sidebar links the tracker", () => {
    assert.match(adminVerify, /import AdminReportFollowUpCard from '\.\/AdminReportFollowUpCard'/);
    assert.match(adminVerify, /<AdminReportFollowUpCard reportId=\{String\(report\.id\)\} \/>/);
    assert.match(sidebar, /href: "\/dashboard\/admin\/followups"/);
});

test("admin card and tracker call the backend routes that exist", () => {
    assert.match(adminCard, /\/api\/v1\/admin\/reports\/\$\{encodeURIComponent\(reportId\)\}\/followup/);
    for (const action of ["/activate", "/send-now", "/cancel", "/mark-reviewed", "/regenerate", "/audit"]) {
        assert.ok(adminCard.includes(`\`\${base}${action}\``) || adminCard.includes(`"${action}"`), action);
    }
    assert.match(adminCard, /`\$\{base\}\/questions`/);
    assert.match(tracker, /\/api\/v1\/admin\/followups\?\$\{params\.toString\(\)\}/);
    assert.match(tracker, /\/api\/v1\/admin\/followups\/export\.csv\?/);
    assert.match(tracker, /\/followup\/activate`/);
});

test("the partner page is public (no auth helper, no middleware gate), confirms explicitly and offers decline + opt-out", () => {
    assert.doesNotMatch(publicPage, /authenticatedFetch/);
    assert.match(publicPage, /fetch\(`\/api\/v1\/public\/followups\/\$\{encodeURIComponent\(token\)\}`/);
    assert.match(publicPage, /\/public\/followups\/\$\{encodeURIComponent\(token\)\}\/response`/);
    assert.match(publicPage, /\/public\/followups\/\$\{encodeURIComponent\(token\)\}\/decline`/);
    assert.match(publicPage, /consent: true/);
    assert.match(publicPage, /optOut: optOutAll \|\| undefined/);
    // useSearchParams needs a Suspense boundary for static rendering
    assert.match(publicPage, /<Suspense[\s\S]*<FollowUpResponse \/>/);
    // `ref` is reserved in React; the reference block takes `reference`
    assert.doesNotMatch(publicPage, /<ReferenceBlock ref=/);
    assert.doesNotMatch(middleware, /verify\/follow-up|api\/v1\/public/);
});

test("the student 9.5 block shows the status note for every plan (CIEL PK may start one for 'Not decided yet') and never changes the form fields", () => {
    assert.match(section95, /import FollowUpStatusNote from "\.\/FollowUpStatusNote"/);
    const afterPlans = section95.slice(section95.lastIndexOf(") : null}"));
    assert.match(afterPlans, /<FollowUpStatusNote reportId=\{data\.id\} \/>/);
    assert.match(section95, /Saving this does not send any email\./);
    assert.match(studentNote, /\/api\/v1\/students\/reports\/\$\{encodeURIComponent\(reportId\)\}\/followup/);
    assert.match(studentNote, /if \(!fu\) return null;/);
});
