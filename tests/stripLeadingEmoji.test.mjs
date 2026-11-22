// Chip labels lose only their emoji prefix — never a real first word ("No significant challenges").
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripLeadingEmoji } from "../src/utils/stripLeadingEmoji.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

test("emoji and symbol prefixes are removed; words and digits are kept", () => {
    assert.equal(stripLeadingEmoji("⏰ Not enough time"), "Not enough time");
    assert.equal(stripLeadingEmoji("🗓️ Scheduling with partner"), "Scheduling with partner");
    assert.equal(stripLeadingEmoji("✨ Other"), "Other");
    assert.equal(stripLeadingEmoji("No significant challenges"), "No significant challenges");
    assert.equal(stripLeadingEmoji("3 sessions held"), "3 sessions held");
    assert.equal(stripLeadingEmoji("Other"), "Other");
    assert.equal(stripLeadingEmoji("  🎤 Public speaking  "), "Public speaking");
    assert.equal(stripLeadingEmoji(""), "");
    assert.equal(stripLeadingEmoji(null), "");
});

test("every chip stripper in the app delegates to the safe helper (no raw first-token regex left)", () => {
    for (const file of [
        "src/app/dashboard/student/report/utils/section4Streamlined.ts",
        "src/app/dashboard/student/report/components/Section9Reflection.tsx",
        "src/utils/courseProjectTypes.ts",
        "src/utils/fypTypes.ts",
    ]) {
        const src = read(file);
        assert.doesNotMatch(src, /replace\(\/\^\[\^\\s\]\+\\s\/, ""\)/, file);
        assert.match(src, /stripLeadingEmoji/, file);
    }
});
