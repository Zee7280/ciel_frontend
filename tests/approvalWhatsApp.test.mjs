// Approved report → Admin sends each participant the "showcase your project" WhatsApp message
// (prefilled chat; no messaging API), from the verify page panel and the approval toast.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { APPROVAL_SHOWCASE_WHATSAPP_TEXT, approvalWhatsappRecipients } = await import(path.join(root, "src/utils/approvalShowcaseMessage.ts"));
const { whatsappDigits } = await import(path.join(root, "src/utils/reminderLinks.ts"));

test("the message is the approved CIEL PK text, WhatsApp bold kept", () => {
    assert.ok(APPROVAL_SHOWCASE_WHATSAPP_TEXT.startsWith("Dear Student,\n\nCongratulations on successfully completing your community service project"));
    assert.match(APPROVAL_SHOWCASE_WHATSAPP_TEXT, /\*showcase your inspiring work on CIEL PK’s Instagram and social media platforms\*/);
    assert.match(APPROVAL_SHOWCASE_WHATSAPP_TEXT, /please share your handle with us\./);
    assert.ok(APPROVAL_SHOWCASE_WHATSAPP_TEXT.endsWith("Together, let’s inspire a culture of community impact! 🌍💙"));
});

test("recipients: lead first, then members, one per person, phones usable by wa.me", () => {
    const section1 = {
        participation_type: "team",
        team_lead: { id: "L", fullName: "Muhammad Junaid Khan", mobile: "0300-1234567", email: "j@bnu.edu.pk" },
        team_members: [
            { id: "L", fullName: "Muhammad Junaid Khan", mobile: "+923001234567" },
            { id: "M1", fullName: "Inam Ullah Khan", role: "Team member", mobile: "+92 333 7654321" },
            { id: "M2", name: "Hunain Malik" },
        ],
    };
    const list = approvalWhatsappRecipients(section1);
    assert.deepEqual(list.map((r) => [r.name, r.role]), [
        ["Muhammad Junaid Khan", "Team Lead"],
        ["Inam Ullah Khan", "Team member"],
        ["Hunain Malik", "Team member"],
    ]);
    assert.equal(whatsappDigits(list[0].phone), "923001234567");
    assert.equal(whatsappDigits(list[1].phone), "923337654321");
    assert.equal(list[2].phone, "", "no phone → WhatsApp opens to pick the contact");
    assert.deepEqual(
        approvalWhatsappRecipients({ team_lead: { name: "Ayesha", mobile: "03001112223" } }).map((r) => r.role),
        ["Student"],
        "individual report: just the student",
    );
    assert.equal(approvalWhatsappRecipients(undefined, "Sara")[0].name, "Sara");
});

test("verify page: panel on approved reports, WhatsApp action on the approval toast", () => {
    const src = readFileSync(path.join(root, "src/app/dashboard/admin/reports/verify/[reportId]/page.tsx"), "utf8");
    assert.match(src, /=== "approved" \? \(\s*<ApprovalWhatsAppPanel section1=\{report\.section1\}/);
    assert.match(src, /action: \{ label: 'WhatsApp student', onClick: \(\) => openApprovalWhatsApp\(lead\?\.phone \|\| ''\) \}/);
    // The approve path still clears the dialog and moves on like every other decision.
    const okBranch = src.slice(src.indexOf("if (response?.ok) {"), src.indexOf("} else {\n                const payload"));
    assert.match(okBranch, /setPendingDecision\(null\);/);
    assert.match(okBranch, /router\.push\(nextId/);
});
