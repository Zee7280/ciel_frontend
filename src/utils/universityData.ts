export const pakistaniUniversities = [
    "Abdul Wali Khan University Mardan",
    "Aga Khan University",
    "Air University",
    "Allama Iqbal Open University",
    "Bahauddin Zakariya University",
    "Bahria University",
    "Balochistan University of Information Technology, Engineering and Management Sciences (BUITEMS)",
    "Beaconhouse National University (BNU)",
    "COMSATS University Islamabad",
    "Dawood University of Engineering and Technology",
    "Dow University of Health Sciences",
    "Fatima Jinnah Women University",
    "Federal Urdu University of Arts, Science and Technology",
    "Forman Christian College (University)",
    "Ghanshyam Das Birla Institute of Technology (BIT)",
    "Ghulam Ishaq Khan Institute of Engineering Sciences and Technology (GIKI)",
    "GIFT University",
    "Gomal University",
    "Government College University, Faisalabad",
    "Government College University, Lahore",
    "Habib University",
    "Hamdard University",
    "Hazara University",
    "Information Technology University (ITU)",
    "Institute of Art and Culture (IAC)",
    "Institute of Business Administration (IBA)",
    "Institute of Business Management (IoBM)",
    "Institute of Management Sciences (IMSciences)",
    "Institute of Space Technology (IST)",
    "International Islamic University, Islamabad",
    "Iqra University",
    "Islamia College University",
    "Jinnah Sindh Medical University",
    "Karakoram International University",
    "Karachi School of Business and Leadership (KSBL)",
    "Khwaja Fareed University of Engineering and Information Technology",
    "Khyber Medical University",
    "Kinnaird College for Women",
    "Kohat University of Science and Technology",
    "Lahore School of Economics (LSE)",
    "Lahore University of Management Sciences (LUMS)",
    "Lasbela University of Agriculture, Water and Marine Sciences",
    "Liaquat University of Medical and Health Sciences",
    "Mehran University of Engineering and Technology",
    "Mirpur University of Science and Technology (MUST)",
    "National College of Arts (NCA)",
    "National Defence University",
    "National University of Computer and Emerging Sciences (FAST-NUCES)",
    "National University of Medical Sciences (NUMS)",
    "National University of Modern Languages (NUML)",
    "National University of Sciences and Technology (NUST)",
    "National University of Technology (NUTECH)",
    "NED University of Engineering and Technology",
    "Pakistan Institute of Development Economics (PIDE)",
    "Pakistan Institute of Engineering and Applied Sciences (PIEAS)",
    "Pakistan Military Academy",
    "Pakistan Naval Academy",
    "Pir Mehr Ali Shah Arid Agriculture University",
    "Preston University",
    "Punjab University",
    "Quaid-i-Azam University",
    "Riphah International University",
    "Sardar Bahadur Khan Women's University",
    "Sarhad University of Science and Information Technology",
    "Shah Abdul Latif University",
    "Shaheed Behezir Bhutto Women University",
    "Shaheed Zulfiqar Ali Bhutto Institute of Science and Technology (SZABIST)",
    "Sindh Agriculture University",
    "Sindh Madressatul Islam University",
    "Sir Syed University of Engineering and Technology",
    "Sukkur IBA University",
    "Superior University",
    "The Islamia University of Bahawalpur",
    "The University of Lahore (UOL)",
    "University of Agriculture, Faisalabad",
    "University of Agriculture, Peshawar",
    "University of Azad Jammu and Kashmir (UAJK)",
    "University of Balochistan",
    "University of Central Punjab",
    "University of Chakwal",
    "University of Engineering and Technology, Lahore",
    "University of Engineering and Technology, Peshawar",
    "University of Engineering and Technology, Taxila",
    "University of Gujrat",
    "University of Karachi",
    "University of Management and Technology (UMT)",
    "University of Mianwali",
    "University of Okara",
    "University of Peshawar",
    "University of Sahiwal",
    "University of Sargodha",
    "University of Sindh",
    "University of South Asia",
    "University of Veterinary and Animal Sciences",
    "Virtual University of Pakistan",
    "Ziauddin University"
].sort();

/** Beaconhouse National University — report identity uses this list as a dropdown. */
export const BNU_UNIVERSITY_NAME = "Beaconhouse National University (BNU)";

export function isBnuUniversity(name: string | null | undefined): boolean {
    const folded = String(name || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    return folded.includes("beaconhouse national university") || /(^| )bnu( |$)/.test(folded);
}

export const BNU_DEGREE_PROGRAMS: { school: string; programs: string[] }[] = [
    {
        school: "Mariam Dawood School of Visual Arts & Design",
        programs: [
            "BFA Visual Arts",
            "BDes Visual Communication Design",
            "BDes Textile, Fashion & Accessories Design",
            "BA (Hons) Interdisciplinary Expanded Design & Art",
            "MA Art & Design Studies",
        ],
    },
    {
        school: "Razia Hassan School of Architecture",
        programs: ["Bachelor of Architecture (B.Arch)", "Bachelor in Interior Design"],
    },
    {
        school: "Seeta Majeed School of Liberal Arts & Social Sciences",
        programs: [
            "BS Liberal Arts & Social Sciences",
            "BS Political Science",
            "BS Political Science with International Relations",
        ],
    },
    {
        school: "School of Media & Mass Communication",
        programs: [
            "BS Journalism & Media Studies",
            "BS Immersive Media",
            "BS Theatre, Film & TV",
            "MS Public Relations & Advertising",
            "MS Film Direction",
        ],
    },
    {
        school: "School of Computer & Information Technology",
        programs: [
            "BS Computer Science",
            "BS Software Engineering",
            "BS Artificial Intelligence",
            "BS Management & Business Computing",
            "MS Computer Science",
        ],
    },
    {
        school: "School of Education",
        programs: [
            "Bachelor of Education (B.Ed)",
            "MPhil Linguistics & TESOL",
            "MPhil Educational Leadership and Management",
        ],
    },
    {
        school: "School of Management Sciences",
        programs: [
            "BBA (Hons)",
            "BS Business Intelligence & Analytics",
            "BS Economics",
            "BS Economics & Finance",
            "BS Economics with Data Analytics",
            "BS Hospitality Management",
        ],
    },
    {
        school: "Institute of Psychology",
        programs: ["BS Applied Psychology", "MS Clinical & Counseling Psychology"],
    },
];

/** Faculty department / school options for opportunity Verification (BNU + common PK names). */
export const BNU_FACULTY_DEPARTMENTS: string[] = [
    ...BNU_DEGREE_PROGRAMS.map((s) => s.school),
    "School of Management Sciences (SMS)",
    "SMS",
];

export const COMMON_FACULTY_DEPARTMENTS: string[] = [
    "Computer Science",
    "Software Engineering",
    "Information Technology",
    "Artificial Intelligence",
    "Data Science",
    "Cyber Security",
    "Electrical Engineering",
    "Mechanical Engineering",
    "Civil Engineering",
    "Business Administration",
    "Management Sciences",
    "School of Management Sciences",
    "Accounting & Finance",
    "Economics",
    "Psychology",
    "Education",
    "Media & Mass Communication",
    "Architecture",
    "Design",
    "Law",
    "Pharmacy",
    "Medicine",
    "Public Health",
    "Social Sciences",
    "English",
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "Other",
];

/** Searchable department list; BNU institutions get school names first. */
export function facultyDepartmentOptionsForInstitution(institution?: string | null): string[] {
    const base = isBnuUniversity(institution)
        ? [...BNU_FACULTY_DEPARTMENTS, ...COMMON_FACULTY_DEPARTMENTS]
        : [...COMMON_FACULTY_DEPARTMENTS, ...BNU_FACULTY_DEPARTMENTS];
    return Array.from(new Set(base.map((s) => s.trim()).filter(Boolean)));
}

/** Department options when an opportunity targets several universities: each selected
 * university's list in order (so BNU schools appear when BNU is among them), de-duplicated. */
export function facultyDepartmentOptionsForInstitutions(institutions: ReadonlyArray<string | null | undefined>): string[] {
    const named = institutions.map((i) => (i ?? "").trim()).filter(Boolean);
    const lists = named.length ? named.map((i) => facultyDepartmentOptionsForInstitution(i)) : [facultyDepartmentOptionsForInstitution(null)];
    return Array.from(new Set(lists.flat()));
}

function foldAcademicLabel(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Drop "School of …" / named-school / institute wrappers so Department is department-only.
 * Keep in lockstep with ciel_backend/src/common/academic-department.util.ts
 */

export function stripSchoolWrapperFromAcademicUnit(value: string): string {
    let s = value.trim();
    if (!s) return "";
    if (foldAcademicLabel(s) === "sms") return "Management Sciences";
    s = s.replace(/\s*\(\s*sms\s*\)\s*$/i, "").trim();
    s = s.replace(/^.+?\s+School of\s+/i, "");
    s = s.replace(/^School of\s+/i, "");
    s = s.replace(/^Institute of\s+/i, "");
    return s.trim();
}

export function isSchoolOrInstituteAcademicLabel(value: string): boolean {
    const t = value.trim();
    if (!t) return false;
    const folded = foldAcademicLabel(t);
    if (folded === "sms") return true;
    if (BNU_DEGREE_PROGRAMS.some((group) => foldAcademicLabel(group.school) === folded)) return true;
    if (BNU_FACULTY_DEPARTMENTS.some((label) => foldAcademicLabel(label) === folded)) return true;
    return /\bschool of\b/i.test(t) || /^institute of\b/i.test(t);
}

/** "BS Computer Science" → "Computer Science"; empty leftovers fall back to the school unit without "School of". */
export function departmentFromDegreeProgram(program: string): string {
    const raw = program.trim();
    if (!raw) return "";
    const s = raw
        .replace(/^(associate degree in)\s+/i, "")
        .replace(/^(bachelor of|bachelor in|master of)\s+/i, "")
        .replace(/^(mphil|phd)\s+/i, "")
        .replace(/^(bdes|bfa|bba|bs|ms|ma|ba|be)\s+/i, "")
        .replace(/^\((hons)\)\s*/i, "")
        .replace(/\s*\((b\.arch|b\.ed|hons)\)\s*$/i, "")
        .trim();
    if (s && foldAcademicLabel(s) !== foldAcademicLabel(raw)) return s;
    const group = BNU_DEGREE_PROGRAMS.find((g) => g.programs.includes(raw));
    if (group) return stripSchoolWrapperFromAcademicUnit(group.school);
    return s;
}

function foldAcademicUnitKey(value: string): string {
    return value
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

/**
 * Every spelling under which one academic unit may be stored: the label itself, without a
 * "School of …" / "Institute of …" wrapper, without a degree prefix ("BS Computer Science" →
 * "Computer Science"), the BNU school a programme belongs to, and a trailing "(ABBR)".
 * A student profile stores an HEC programme while a listing stores a department or school.
 * Mirrors ciel_backend/src/common/academic-department.util.ts academicUnitMatchKeys so the page
 * never blocks a student the API would accept, or vice versa.
 */
export function academicUnitMatchKeys(value: string | null | undefined): string[] {
    const raw = String(value ?? "").trim();
    if (!raw) return [];
    const forms = new Set<string>();
    const add = (v: string) => {
        const k = foldAcademicUnitKey(v);
        if (k) forms.add(k);
    };
    const expand = (v: string) => {
        const t = v.trim();
        if (!t) return;
        add(t);
        add(stripSchoolWrapperFromAcademicUnit(t));
        const abbr = t.match(/^(.*?)\s*\(([^()]{2,24})\)\s*$/);
        if (abbr) {
            add(abbr[1]);
            add(abbr[2]);
        }
    };
    expand(raw);
    const asDepartment = departmentFromDegreeProgram(raw);
    if (asDepartment) expand(asDepartment);
    const rawKey = foldAcademicUnitKey(raw);
    const group = BNU_DEGREE_PROGRAMS.find((g) => g.programs.some((prog) => foldAcademicUnitKey(prog) === rawKey));
    if (group) expand(group.school);
    return Array.from(forms);
}

/** true when two stored academic-unit labels refer to the same department / school / programme. */
export function academicDepartmentsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
    const ka = academicUnitMatchKeys(a);
    if (!ka.length) return false;
    const kb = new Set(academicUnitMatchKeys(b));
    return ka.some((k) => kb.has(k));
}

/**
 * Report Academic "Department" must not include the school name.
 * Prefer a department derived from the degree program when the stored value is a school.
 */
export function sanitizeReportAcademicDepartment(
    department: string | null | undefined,
    academicProgram?: string | null,
): string {
    const fromProgram = departmentFromDegreeProgram(String(academicProgram || ""));
    const dept = String(department || "").trim();
    if (!dept) return fromProgram;

    let rest = dept;
    for (const group of BNU_DEGREE_PROGRAMS) {
        if (foldAcademicLabel(rest).startsWith(foldAcademicLabel(group.school))) {
            rest = rest.slice(group.school.length).replace(/^[\s,;:–—\-/|]+/, "").trim();
            if (!rest) return fromProgram || stripSchoolWrapperFromAcademicUnit(group.school);
            break;
        }
    }

    if (isSchoolOrInstituteAcademicLabel(rest)) {
        return fromProgram || stripSchoolWrapperFromAcademicUnit(rest);
    }

    const parts = rest.split(/\s*[,;:–—\-/|]\s*/).map((part) => part.trim()).filter(Boolean);
    if (parts.length > 1 && isSchoolOrInstituteAcademicLabel(parts[0])) {
        const afterSchool = parts.slice(1).join(" ").trim();
        if (afterSchool && !isSchoolOrInstituteAcademicLabel(afterSchool)) {
            return foldAcademicLabel(afterSchool) === foldAcademicLabel(String(academicProgram || ""))
                ? fromProgram || afterSchool
                : afterSchool;
        }
    }

    if (fromProgram && foldAcademicLabel(rest) === foldAcademicLabel(String(academicProgram || ""))) {
        return fromProgram;
    }
    return rest;
}

function foldUniversityName(name: string | null | undefined): string {
    return String(name || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

/** Maps a free-text university name from an opportunity's scope ("BNU", "Beaconhouse National
 * University", "beaconhouse national university (bnu)") onto the canonical entry of
 * `pakistaniUniversities`, so the identity picker can lock to it. Unknown names come back as typed. */
export function canonicalPakistaniUniversity(name: string | null | undefined): string {
    const raw = String(name || "").trim();
    if (!raw) return "";
    if (isBnuUniversity(raw)) return BNU_UNIVERSITY_NAME;
    const folded = foldUniversityName(raw);
    const exact = pakistaniUniversities.find((u) => foldUniversityName(u) === folded);
    if (exact) return exact;
    const partial = pakistaniUniversities.find((u) => {
        const f = foldUniversityName(u);
        return f.includes(folded) || folded.includes(f);
    });
    return partial || raw;
}

/** Canonical, deduped version of an opportunity's university allowlist (empty = any university). */
export function canonicalUniversityAllowlist(names: ReadonlyArray<string> | null | undefined): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const n of names || []) {
        const c = canonicalPakistaniUniversity(n);
        const key = foldUniversityName(c);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push(c);
    }
    return out;
}

/**
 * True when the backend can link students / faculty to a university organization with this name:
 * a listed name, or the bracketed abbreviation of one ("BNU" → "Beaconhouse National University (BNU)").
 * Mirrors ciel_backend `universityNamesMatch`.
 */
export function isLinkableUniversityName(name: unknown): boolean {
    const key = foldUniversityName(String(name ?? ""));
    if (!key) return false;
    return pakistaniUniversities.some((u) => {
        if (foldUniversityName(u) === key) return true;
        const abbr = u.match(/\(([^()]{2,12})\)\s*$/);
        return !!abbr && foldUniversityName(abbr[1]) === key;
    });
}

/** Same institution despite spelling, or a listed abbreviation of the full name (backend `universityNamesMatch`). */
export function universityNamesLooselyMatch(a: unknown, b: unknown): boolean {
    const fa = foldUniversityName(String(a ?? ""));
    const fb = foldUniversityName(String(b ?? ""));
    if (!fa || !fb) return false;
    if (fa === fb) return true;
    const abbr = (name: string) => {
        const m = name.match(/\(([^()]{2,12})\)\s*$/);
        return m ? foldUniversityName(m[1]) : "";
    };
    const aa = abbr(String(a ?? ""));
    const ab = abbr(String(b ?? ""));
    return (!!aa && aa === fb) || (!!ab && ab === fa);
}
