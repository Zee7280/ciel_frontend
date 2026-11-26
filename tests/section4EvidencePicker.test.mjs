import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const s4 = read("src/app/dashboard/student/report/components/Section4Streamlined.tsx");
const picker = read("src/app/dashboard/student/report/components/ui/ExistingEvidencePicker.tsx");

test("Section 4 'Supporting evidence' is a picture picker, not a plain dropdown", () => {
    assert.match(s4, /<ExistingEvidencePicker choices=\{evidenceChoices\} value=\{String\(a\.evidence_ref \|\| ""\)\} onChange=\{\(v\) => onChange\(\{ evidence_ref: v \}\)\} \/>/);
    assert.doesNotMatch(s4, /<option value="">Choose existing evidence \(optional\)<\/option>/);
    assert.match(picker, /role="listbox"/);
    assert.match(picker, /aspect-\[4\/3\]/, "tiles show a thumbnail");
    assert.match(picker, /data-ciel-evidence-selected/, "the chosen evidence is shown with its image");
    assert.match(picker, /Previously linked: \{value\}/, "an older label that no longer matches still shows");
});

test("the stored evidence_ref labels are unchanged, so saved reports keep matching", () => {
    assert.match(s4, /value: `Attendance evidence · \$\{caption\}`, source: "Attendance"/);
    assert.match(s4, /const caption = `\$\{log\.date \|\| `session \$\{i \+ 1\}`\}\$\{log\.location \? ` · \$\{log\.location\}` : ""\}`;/);
    assert.match(s4, /value: `Evidence file · \$\{caption\}`, source: "Evidence"/);
    assert.match(s4, /value: `Resource evidence · \$\{caption\}`, source: "Resource"/);
});

test("images preview from the stored URL, or an object URL for a file not uploaded yet", () => {
    assert.match(picker, /return file \? objectUrl : evidenceItemUrl\(item\);/);
    assert.match(picker, /URL\.revokeObjectURL\(url\)/, "object URLs are released");
    assert.match(picker, /evidencePreviewKind\(mimeOf\(choice\.item\), name, evidenceItemUrl\(choice\.item\)\)/);
    assert.match(picker, /onError=\{\(\) => setBroken\(true\)\}/, "a broken image falls back to an icon");
});
