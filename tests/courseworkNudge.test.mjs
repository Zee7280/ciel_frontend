// Faculty → student coursework nudges: the stored account contact becomes a direct WhatsApp chat,
// the message follows the record's stage, and every coursework screen renders the same button pair.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { contactWhatsappDigits } from "../src/utils/reminderLinks.ts";
import { courseworkStudentNudge } from "../src/utils/courseworkNudge.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

test("account contact (dial code + national number) becomes wa.me digits", () => {
    assert.equal(contactWhatsappDigits("+92", "3001234567"), "923001234567");
    assert.equal(contactWhatsappDigits("+92", "03001234567"), "923001234567");
    assert.equal(contactWhatsappDigits("92", "0300-1234567"), "923001234567");
    assert.equal(contactWhatsappDigits("+92", "923001234567"), "923001234567", "national already carries the dial code");
    assert.equal(contactWhatsappDigits("+44", "7700900123"), "447700900123");
    // Older rows: one international string, or a local number with no dial code on file.
    assert.equal(contactWhatsappDigits(null, "+92 300 1234567"), "923001234567");
    assert.equal(contactWhatsappDigits("", "03001234567"), "923001234567");
    assert.equal(contactWhatsappDigits("+92", "+447700900123"), "447700900123");
    for (const [cc, phone] of [["+92", ""], ["+92", null], [null, undefined], ["+92", "12"], ["+92", "abc"]]) {
        assert.equal(contactWhatsappDigits(cc, phone), "", `${cc} ${phone}`);
    }
});

test("the nudge message follows the record's stage and names the student and teacher", () => {
    const base = { projectTitle: "Free medical care", course: "BI analytics", studentInfo: { teacherName: "Dr Sana Khan" } };
    const draft = courseworkStudentNudge({ ...base, status: "draft", stepCompleted: 7 }, "Mahnoor Murtaza");
    assert.equal(draft.subject, 'Reminder: continue "Free medical care" on CIEL PK');
    assert.match(draft.body, /^Hi Mahnoor,/);
    assert.match(draft.body, /100% complete/);
    assert.match(draft.body, /Thanks,\nDr Sana Khan$/);
    assert.equal(draft.text, `${draft.subject}\n\n${draft.body}`);

    const review = courseworkStudentNudge({ ...base, status: "submitted", facultyApprovalStatus: "pending" }, "Alina Azam");
    assert.equal(review.subject, 'About your coursework "Free medical care" on CIEL PK');
    assert.match(review.body, /I am reviewing/);

    const revision = courseworkStudentNudge({ ...base, status: "submitted", facultyApprovalStatus: "revision_requested", facultyApprovalNote: "Add the survey file." }, "Alina");
    assert.equal(revision.subject, 'Revision requested: "Free medical care" on CIEL PK');
    assert.match(revision.body, /My note: Add the survey file\./);

    const rejected = courseworkStudentNudge({ ...base, status: "submitted", facultyApprovalStatus: "rejected" }, "Alina");
    assert.match(rejected.subject, /was not approved/);

    const approved = courseworkStudentNudge({ ...base, status: "submitted", facultyApprovalStatus: "approved" }, "Alina", "Prof. Ali");
    assert.equal(approved.subject, 'Approved: "Free medical care" on CIEL PK');
    assert.match(approved.body, /Impact Wall/);
    assert.match(approved.body, /Thanks,\nProf\. Ali$/);

    const bare = courseworkStudentNudge({ status: "draft" });
    assert.match(bare.body, /^Hi there,/);
    assert.match(bare.body, /Your instructor$/);
});

test("every faculty coursework screen renders the nudge pair with the student's WhatsApp digits", () => {
    const page = read("src/app/dashboard/faculty/coursework-projects/page.tsx");
    assert.match(page, /contactWhatsappDigits\(entry\.student\?\.countryCode, entry\.student\?\.phone\)/);
    assert.match(page, /<CourseworkNudgeButtons className="mt-3" email=\{email\} whatsappDigits=\{whatsapp\}/, "Live Drafts");
    assert.match(page, /contactStudent=\{\{/, "Faculty Impact Wall cards");
    const analyser = read("src/components/ciel/coursework/CourseworkFacultyAiAnalyser.tsx");
    assert.match(analyser, /label="Contact student:"/, "Review Queue");
    const card = read("src/components/ciel/CourseworkCard.tsx");
    assert.match(card, /studentNudge \? \(\s*<CourseworkNudgeButtons/);
    const buttons = read("src/components/ciel/coursework/CourseworkNudgeButtons.tsx");
    assert.match(buttons, /openWhatsAppForDevice\(text, digits\)/, "device-aware WhatsApp open");
    assert.match(buttons, /"WhatsApp \(pick contact\)"/);
    assert.match(buttons, /mailtoHref\(to, subject, body\)/);
    const monitor = read("src/components/ciel/coursework/CourseworkMonitorRow.tsx");
    assert.match(monitor, /openWhatsApp\(`\$\{contact\.subject\}\\n\\n\$\{contact\.body\}`, contact\.whatsappDigits \|\| ""\)/);
});
