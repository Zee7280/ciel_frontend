// CIEL PK can add optional instructions for the creator when approving an opportunity.
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

test("the approve proxy forwards the optional instructions body", () => {
    const src = read("src/app/api/v1/admin/opportunities/[id]/approve/route.ts");
    assert.match(src, /const rawBody = await request\.text\(\)/);
    assert.match(src, /body: rawBody\.trim\(\) \? rawBody : "\{\}"/);
});

test("the approvals page opens the instructions modal before approving an opportunity", () => {
    const src = read("src/app/dashboard/admin/approvals/page.tsx");
    assert.match(src, /<ApprovalInstructionsField/);
    assert.match(src, /onClick=\{\(\) => openApproveModal\(proj as Record<string, unknown>, proj\.id\)\}/);
    assert.match(src, /openApproveModal\(selectedOpportunity as Record<string, unknown>, selectedOpportunity\.id\)/);
    assert.match(src, /body: JSON\.stringify\(\{ instructions: note \}\)/);
    // Registrations and bulk approve keep their plain request.
    assert.match(src, /onClick=\{\(\) => handleApprove\(req\.id, 'user'\)\}/);
    assert.match(src, /authenticatedFetch\(`\/api\/v1\/admin\/opportunities\/\$\{t\.id\}\/approve`, \{ method: "POST" \}\)/);
});

test("the projects page approve modal carries the same instructions field", () => {
    const src = read("src/app/dashboard/admin/projects/page.tsx");
    assert.match(src, /wa\.kind === "approve" \? \(/);
    assert.match(src, /<ApprovalInstructionsField/);
    assert.match(src, /body: JSON\.stringify\(\{ instructions: note \}\)/);
});

test("the instructions field caps text at the backend limit and offers quick-add lines", () => {
    const src = read("src/app/dashboard/admin/_shared/ApprovalInstructionsField.tsx");
    assert.match(src, /export const APPROVAL_INSTRUCTIONS_MAX = 2000;/);
    assert.match(src, /maxLength=\{APPROVAL_INSTRUCTIONS_MAX\}/);
    assert.match(src, /label: "Report & hours"/);
});
