import { hecPrograms } from "./hecProgramsData";
import { BNU_DEGREE_PROGRAMS, facultyDepartmentOptionsForInstitution, isBnuUniversity } from "./universityData";

/**
 * Fixed choice lists for every programme / department field. These fields are dropdown-only (no
 * free text), so a listing can never store a spelling ("BS CS") that a student's programme
 * ("BS Computer Science") does not match. Values saved before this still display unchanged.
 */

const uniq = (values: string[]): string[] => Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));

/** "Other" is not a department: as a listing restriction it would block every student. */
const isPlaceholderChoice = (value: string) => /^other\b/i.test(value.trim());

/** Every programme a student can be registered in: the university's own (BNU) first, then HEC. */
export function studentProgramOptions(institution?: string | null): string[] {
    const bnu = BNU_DEGREE_PROGRAMS.flatMap((group) => group.programs);
    return uniq(isBnuUniversity(institution) ? [...bnu, ...hecPrograms] : [...hecPrograms, ...bnu]);
}

/**
 * Departments / schools and programmes, for a faculty member's department and for an opportunity's
 * "permitted departments / programmes". Includes every student programme, so any student can be
 * named exactly.
 */
export function academicUnitOptionsForInstitutions(institutions: ReadonlyArray<string | null | undefined>): string[] {
    const named = institutions.map((i) => (i ?? "").trim()).filter(Boolean);
    const list = named.length ? named : [null];
    return uniq(
        list.flatMap((institution) => [
            ...facultyDepartmentOptionsForInstitution(institution),
            ...studentProgramOptions(institution),
        ]),
    ).filter((value) => !isPlaceholderChoice(value));
}

export function academicUnitOptionsForInstitution(institution?: string | null): string[] {
    return academicUnitOptionsForInstitutions([institution]);
}
