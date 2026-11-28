import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

// Every programme / department field compared during eligibility is a fixed dropdown, so a listing can
// never store a spelling ("BS CS") a student's programme does not match.
test("opportunity department / programme restrictions are dropdown-only on every create form", () => {
    for (const [file, re] of [
        ["src/app/dashboard/student/create-opportunity/page.tsx", /options=\{academicUnitOptionsForInstitutions\(formData\.selectedUniversities\)\}\s*allowCustomValue=\{false\}/],
        ["src/app/dashboard/student/create-opportunity/page.tsx", /options=\{academicUnitOptionsForInstitution\(studentDetails\.institution\)\}\s*allowCustomValue=\{false\}/],
        ["src/app/dashboard/faculty/create-opportunity/page.tsx", /options=\{academicUnitOptionsForInstitutions\([\s\S]{0,600}?\)\}\s*allowCustomValue=\{false\}\s*placeholder="Select department \/ programme…"/],
        ["src/app/dashboard/partner/requests/new/page.tsx", /options=\{academicUnitOptionsForInstitutions\(formData\.restrictedUniversities\)\}\s*allowCustomValue=\{false\}/],
    ]) {
        assert.match(read(file), re, file);
    }
});

test("student programme and faculty department are dropdown-only at signup, in profiles and in admin", () => {
    const signup = read("src/app/signup/page.tsx");
    assert.match(signup, /options=\{studentProgramOptions\(formData\.institution\)\} allowCustomValue=\{false\}/);
    assert.match(signup, /options=\{academicUnitOptionsForInstitution\(formData\.institution\)\} allowCustomValue=\{false\}/);
    assert.doesNotMatch(signup, /placeholder="e\.g\. School of Management Sciences" aria-label="Department"/);
    assert.match(read("src/app/dashboard/student/profile/page.tsx"), /options=\{studentProgramOptions\(formData\.institution\)\}\s*allowCustomValue=\{false\}/);
    assert.match(read("src/app/dashboard/faculty/profile/page.tsx"), /options=\{academicUnitOptionsForInstitution\(formData\.institution\)\}\s*allowCustomValue=\{false\}/);
    assert.match(read("src/app/dashboard/admin/users/page.tsx"), /options=\{studentProgramOptions\(affiliation\.university\)\}\s*allowCustomValue=\{false\}/);
});

test("choice lists: BNU programmes included, no 'Other' restriction, every programme selectable on a listing", () => {
    const choices = read("src/utils/academicChoices.ts");
    assert.match(choices, /const bnu = BNU_DEGREE_PROGRAMS\.flatMap\(\(group\) => group\.programs\);/);
    assert.match(choices, /\.\.\.studentProgramOptions\(institution\),/);
    assert.match(choices, /\.filter\(\(value\) => !isPlaceholderChoice\(value\)\)/);
    // A dropdown-only select never commits typed text.
    const select = read("src/components/ui/SearchableSelect.tsx");
    assert.match(select, /if \(allowCustomValue && query\.trim\(\) && !filteredOptions\.includes\(query\.trim\(\)\)\) \{/);
});
