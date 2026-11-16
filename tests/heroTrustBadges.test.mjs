import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const hero = readFileSync(new URL("../src/components/Hero.tsx", import.meta.url), "utf8");

test("home hero shows the three positioning bullets under the CTAs", () => {
    for (const line of [
        "Evidence-Backed Impact Records",
        "Verified Contributions. Recognized Achievements.",
        "University Impact Analytics & SDG Intelligence",
    ]) {
        assert.match(hero, new RegExp(line.replace(/[.&]/g, "\\$&")));
    }
    assert.doesNotMatch(hero, /HEC-recognized certificates|Every hour valued at PKR/);
});
