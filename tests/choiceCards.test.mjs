// Report wizard one-of-two choice cards (5.1 resources, 6.1 partners): exactly one card reads as
// selected. The report CSS repaints any class containing "indigo" (hover: classes included), which
// made "We used resources" look selected at the same time as "Just our time & effort".
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");
const dir = "src/app/dashboard/student/report";

const cardBlock = (src, marker) => {
    const start = src.indexOf(`data-ciel-choice-card="${marker}"`);
    assert.ok(start > 0, `card ${marker} present`);
    const open = src.lastIndexOf("<button", start);
    const close = src.indexOf("</button>", start);
    return src.slice(open, close);
};

test("5.1 and 6.1 cards carry their state in aria-pressed, show a Selected tag, and use no indigo utility at all", () => {
    const s6 = read(`${dir}/components/Section6Resources.tsx`);
    const s7 = read(`${dir}/components/Section7Partnerships.tsx`);
    for (const [src, marker, cond] of [
        [s6, "use_resources:no", 'use_resources === "no"'],
        [s6, "use_resources:yes", 'use_resources === "yes"'],
        [s7, "has_partners:no", 'has_partners === "no"'],
        [s7, "has_partners:yes", 'has_partners === "yes"'],
    ]) {
        const block = cardBlock(src, marker);
        assert.ok(block.includes(`aria-pressed={${cond}}`), `${marker} aria-pressed`);
        assert.ok(block.includes(`{${cond} ? <span className="cer-choice-card-tag">✓ Selected</span> : null}`), `${marker} tag`);
        assert.ok(block.includes('className="cer-choice-card'), `${marker} class`);
        assert.equal(/indigo|blue-/.test(block), false, `${marker} has no indigo/blue utility: ${block.match(/[\w:/-]*(indigo|blue-)[\w/-]*/g)}`);
    }
});

test("the CSS styles the cards from aria-pressed only, and no report toggle keeps an indigo hover class", () => {
    const css = read(`${dir}/community-engagement-report.css`);
    assert.match(css, /\.cer \.cer-choice-card\[aria-pressed="true"\] \{\s*border-color: var\(--teal\);\s*background: var\(--teal-soft\);/);
    assert.match(css, /\.cer \.cer-choice-card \{\s*position: relative;\s*border: 2px solid var\(--line\);\s*background: #fff;/);
    for (const f of ["Section6Resources.tsx", "Section7Partnerships.tsx", "Section8Evidence.tsx", "Section4Streamlined.tsx"]) {
        const src = read(`${dir}/components/${f}`);
        assert.equal(/hover:(bg|border)-indigo-/.test(src), false, `${f} indigo hover`);
    }
});
