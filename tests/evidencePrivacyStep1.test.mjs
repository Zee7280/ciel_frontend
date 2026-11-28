import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const s8 = read("src/app/dashboard/student/report/components/Section8Evidence.tsx");
const backend = read("../ciel_backend/src/reports/evidence-access.util.ts");

test("privacy cards describe what the system enforces (Faculty / University see evidence at every level)", () => {
    assert.doesNotMatch(s8, /Faculty and University unlock after super-admin approval/);
    assert.doesNotMatch(s8, /Faculty and University after super-admin approval/);
    assert.match(s8, /Associated Partners\/NGOs and the public cannot\. Only CIEL PK Super Admin can download the originals\./);
    // The rule the text describes: academic roles view restricted / private evidence.
    assert.match(backend, /role === 'student' \|\|\s*role === 'admin' \|\|\s*role === 'faculty' \|\|\s*role === 'university'/);
});

test("prototype wording: authenticity confirmation, informed-consent tick and academic-access note", () => {
    assert.match(s8, /regardless of the selected privacy level\. The selected\s+privacy level determines access for Partner Organizations, NGOs and the general public\./);
    assert.match(s8, /including applicable permissions for identifiable individuals and minors\./);
    assert.match(s8, /Academic access stays the same at every level\./);
    // Not claimed until the backend enforces it (Step 2).
    assert.doesNotMatch(s8, /Public access remains subject to final approval/);
});

test("Section 8 shows the stakeholder access matrix with the chosen level highlighted", () => {
    assert.match(s8, /<EvidenceAccessMatrix selected=\{selectedVisibility\} \/>/);
    assert.match(s8, /\{ who: "Associated Partner Organization \/ NGO", access: \{ public: true, restricted: false, private: false \} \}/);
    assert.match(s8, /\{ who: "Original downloads — everyone else", access: \{ public: true, restricted: false, private: false \} \}/);
});
