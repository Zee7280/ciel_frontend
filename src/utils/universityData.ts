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
    let s = raw
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
