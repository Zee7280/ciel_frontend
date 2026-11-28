import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const card = read("src/components/ciel/community-service/OpportunityApprovalCard.tsx");

test("Student box carries the student's email / WhatsApp for CIEL PK admin only", () => {
    assert.match(card, /const studentEmail = viewer === "admin" \? pickStr\(row, "student_contact_email"\) \|\| pickStr\(creator, "email"\) : "";/);
    assert.match(card, /viewer === "admin" \? formatPhoneDisplay\(pickStr\(row, "student_contact_phone"\) \|\| pickStr\(creator, "phone"\)\) : "";/);
    assert.match(card, /role: "Student",[\s\S]{0,200}email: studentEmail\.includes\("@"\) \? studentEmail : undefined,\s*phone: studentPhone \|\| undefined,/);
});

test("the admin's WhatsApp to the student asks them to chase the reviewer it is waiting on", () => {
    assert.match(card, /if \(step\.role === "Student" && contact\.studentNudge\) \{\s*return studentReviewerNudgeMessage\(/);
    assert.match(card, /viewer === "admin" && studentCreated && !facultyCreated && \(workflow\.stage === "pending_partner" \|\| workflow\.stage === "pending_faculty"\)/);
    assert.match(card, /is still waiting for approval from \$\{waitingOn\}\./);
    assert.match(card, /Please contact them and request them to approve it\./);
});
