import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const card = read("src/app/dashboard/student/paths/community-service/CommunityServiceCreate.tsx");

// Student-side QA doc (12 Nov): guards for the points verified as fixed.
test("reviewer buttons: a phone typed as the contact is never shown as a name; CIEL PK WhatsApp works", () => {
    assert.match(card, /return v && !looksLikePhone\(v\) && !v\.includes\("@"\) \? v : "";/);
    assert.match(card, /return personName\(op\.partner_contact_name\) \|\| \(org && !\/\^partner \\\/ ngo\$\/i\.test\(org\) \? org : ""\) \|\| "Partner \/ NGO";/);
    assert.match(card, /: reviewerRole === "admin"\s*\? CIEL_SUPPORT_WHATSAPP_E164/);
    // Faculty number is CIEL PK admin only: the student still gets WhatsApp (pick the contact) + email.
    assert.match(card, /reviewerRole === "faculty"\s*\? null/);
    assert.match(card, /: whatsappShareHref\(whatsappText\)/);
});

test("create form: the final button says Finalize & Create Opportunity", () => {
    assert.match(read("src/app/dashboard/student/create-opportunity/page.tsx"), /: "🚀 Finalize & Create Opportunity"/);
});

test("flashcard Faculty box shows the department chosen for the supervisor, not the faculty's profile", () => {
    const flash = read("src/app/dashboard/student/create-opportunity/StudentOpportunityFlashcard.tsx");
    assert.match(flash, /unitLabel: pickStr\(supervision\.faculty_department, supervision\.role\),/);
});

test("submitted prompt names faculty and partner with emails; a phone is not shown as the partner contact", () => {
    const prompt = read("src/app/dashboard/student/components/OpportunityLifecyclePrompts.tsx");
    assert.match(prompt, /email: facultyEmail \|\| undefined,/);
    assert.match(prompt, /email: partnerEmail \|\| undefined,/);
    assert.match(prompt, /partnerContactRaw\.replace\(\/\\D\/g, ""\)\.length >= 7 \? "" : partnerContactRaw;/);
});

test("report header lists every registered SDG (primary + supporting), like the flashcard", () => {
    assert.match(read("src/app/dashboard/student/report/ReportFormChrome.tsx"), /registeredSdgNumbers\.map\(\(n\) => `SDG \$\{n\}`\)\.join\(" \+ "\)/);
});

test("email buttons land where they point after sign-in (member portal deep link)", () => {
    assert.match(read("src/components/DashboardSessionGuard.tsx"), /`\/login\?next=\$\{encodeURIComponent\(here\)\}`/);
    const login = read("src/app/login/page.tsx");
    assert.match(login, /if \(nextParam && isSafeInternalReturnPath\(nextParam\)\) \{\s*router\.push\(nextParam\);/);
    const mail = read("../ciel_backend/src/mail/mail.service.ts");
    assert.match(mail, /`\/dashboard\/student\/projects\/\$\{encodeURIComponent\(params\.projectId\)\}\/participation`/);
});

test("member portal message has no dash that can render as a broken character", () => {
    const svc = read("../ciel_backend/src/students/student-participation.service.ts");
    assert.match(svc, /Do not apply separately\. Update your attendance only; your team lead files the report\./);
    assert.doesNotMatch(svc, /Do not apply separately —/);
});
