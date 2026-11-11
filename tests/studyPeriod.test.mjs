// Certificate / dossier degree line: semester (Community Service) wins over the hidden "3rd Year"
// form default, a period is never repeated, and the Verified Hours tile matches the package Overview.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { composeProgramLine, participantStudyPeriod, isStudyPeriodLabel } = await import(path.join(root, "src/utils/studyPeriod.ts"));

test("an already-joined line is not joined twice", () => {
    assert.equal(composeProgramLine("BS Artificial Intelligence · 3rd Year", "3rd Year"), "BS Artificial Intelligence · 3rd Year");
    assert.equal(
        composeProgramLine("BS Artificial Intelligence · 3rd Year · 3rd Year", ""),
        "BS Artificial Intelligence · 3rd Year",
        "a stored doubled line is repaired",
    );
    assert.equal(composeProgramLine(composeProgramLine("BBA (Hons)", "3rd Year"), "3rd Year"), "BBA (Hons) · 3rd Year");
});

test("the semester the student chose replaces the hidden year default", () => {
    const member = { program: "BS Artificial Intelligence · 3rd Year", year: "3rd Year", yearOfStudy: "3rd Year", semester: "Semester 3" };
    assert.equal(participantStudyPeriod(member), "Semester 3");
    assert.equal(composeProgramLine(member.program, participantStudyPeriod(member)), "BS Artificial Intelligence · Semester 3");
    assert.equal(participantStudyPeriod({ yearOfStudy: "2nd Year" }), "2nd Year", "other flows keep year of study");
});

test("degree text and discipline survive; only period labels are recognised", () => {
    assert.equal(composeProgramLine("BS Artificial Intelligence · Computer Science & IT", ""), "BS Artificial Intelligence · Computer Science & IT");
    assert.equal(composeProgramLine("", "Semester 3"), "Semester 3");
    for (const label of ["3rd Year", "Semester 3", "3rd semester", "Graduate", "Postgraduate", "1st Year"]) assert.ok(isStudyPeriodLabel(label), label);
    for (const label of ["BS Artificial Intelligence", "Computer Science & IT", "BBA (Hons)", "MPhil Year-long"]) assert.ok(!isStudyPeriodLabel(label), label);
});

test("certificates, dossiers and the detailed report use the semester; hours tile uses logged hours", () => {
    const read = (p) => readFileSync(path.join(root, p), "utf8");
    for (const file of [
        "src/app/dashboard/student/report/impact-package/ImpactPackageCertificate.tsx",
        "src/app/dashboard/student/report/components/CertificateView.tsx",
    ]) {
        const src = read(file);
        assert.match(src, /composeProgramLine\(m\.program, participantStudyPeriod/, file);
        // The student report context rewrites metrics.total_verified_hours with the approved-only
        // recount (48 for a team whose 80 logged hours were never approved one by one), so the
        // tile must not stop at a stored value.
        assert.match(src, /Math\.max\(ciiVerifiedHours, Math\.round\(sumNonRejectedLoggedHours\(logs\)\)\)/, file);
        assert.doesNotMatch(src, /stored > 0\) return ciiVerifiedHours/, `${file}: stored-first shortcut removed`);
        assert.match(src, /total_verified_hours: ciiVerifiedHours/, `${file}: CII input unchanged`);
    }
    assert.match(
        read("src/app/dashboard/student/report/components/Section11Summary.tsx"),
        /const verifiedHours = Number\(Math\.max\(Number\(section1\.metrics\?\.total_verified_hours\) \|\| 0, loggedHours\)\.toFixed\(1\)\);/,
        "report summary tiles match the certificate",
    );
    assert.match(read("src/utils/reportTeamScope.ts"), /composeProgramLine\(base, participantStudyPeriod\(row\)\)/);
    assert.match(read("src/app/dashboard/student/report/impact-package/buildImpactPackageDetailedReport.ts"), /row\("Semester", text\(\(lead as \{ semester\?: string \} \| undefined\)\?\.semester, lead\?\.year\)\)/);
});
