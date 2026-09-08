import { pickVisibilityBucket } from "@/utils/opportunityListing";

function normUni(value: unknown): string {
    if (typeof value !== "string") return "";
    return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function participationScope(raw: Record<string, unknown>): Record<string, unknown> | null {
    const ps = raw.participation_scope;
    return ps && typeof ps === "object" ? (ps as Record<string, unknown>) : null;
}

function participationRule(raw: Record<string, unknown>): string {
    return String(participationScope(raw)?.rule ?? "").toLowerCase();
}

function participationRuleIsOpenAll(raw: Record<string, unknown>): boolean {
    return participationRule(raw).includes("open_all");
}

function departmentRestriction(raw: Record<string, unknown>): { scope: string; departments: string[] } {
    const ps = participationScope(raw);
    const dr = ps?.department_restriction;
    if (!dr || typeof dr !== "object") return { scope: "all", departments: [] };
    const o = dr as Record<string, unknown>;
    const departments: string[] = [];
    if (Array.isArray(o.departments)) {
        for (const x of o.departments) {
            if (typeof x === "string" && x.trim()) departments.push(x.trim());
        }
    }
    return {
        scope: String(o.scope ?? "all").toLowerCase(),
        departments,
    };
}

function needsDepartmentMatch(raw: Record<string, unknown>): boolean {
    const rule = participationRule(raw);
    const { scope, departments } = departmentRestriction(raw);
    return scope === "specific" || rule.includes("department") || departments.length > 0;
}

/** Card may be public while Apply Now is still scoped. Never treat visibility=public as open apply when a targeting rule exists. */
function isOpenParticipation(raw: Record<string, unknown>): boolean {
    if (needsDepartmentMatch(raw)) return false;
    if (participationRuleIsOpenAll(raw)) return true;
    const rule = participationRule(raw);
    if (rule && rule !== "open_all_universities") return false;
    const v = String(raw.visibility ?? "").toLowerCase();
    if (v === "public") return true;
    if (pickVisibilityBucket(raw) === "open") return true;
    return false;
}

/** Universities explicitly allowed to participate (whitelist), deduped. */
export function collectUniversityParticipationAllowlist(raw: Record<string, unknown>): string[] {
    const names: string[] = [];

    const ps = participationScope(raw);
    if (ps) {
        const arr = ps.university_names;
        if (Array.isArray(arr)) {
            for (const x of arr) {
                if (typeof x === "string" && x.trim()) names.push(x.trim());
            }
        }
        const rule = String(ps.rule ?? "").toLowerCase();
        if (rule === "own_university_only" || rule === "own_university_departments") {
            const creator = ps.creator_university_name;
            if (typeof creator === "string" && creator.trim()) names.push(creator.trim());
        }
    }

    const ru = raw.restricted_universities;
    if (Array.isArray(ru)) {
        for (const x of ru) {
            if (typeof x === "string" && x.trim()) names.push(x.trim());
        }
    }

    const linkage = raw.visibility_and_academic_linkage;
    if (linkage && typeof linkage === "object") {
        const arr = (linkage as Record<string, unknown>).restricted_university_names;
        if (Array.isArray(arr)) {
            for (const x of arr) {
                if (typeof x === "string" && x.trim()) names.push(x.trim());
            }
        }
    }

    const seen = new Set<string>();
    const out: string[] = [];
    for (const n of names) {
        const key = normUni(n);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push(n);
    }
    return out;
}

export function readStudentInstitutionFromBrowserStorage(): string {
    if (typeof window === "undefined") return "";
    try {
        const raw = window.localStorage.getItem("ciel_user") || window.localStorage.getItem("user");
        if (!raw) return "";
        const u = JSON.parse(raw) as Record<string, unknown>;
        const s = u.university ?? u.institution;
        return typeof s === "string" ? s.trim() : "";
    } catch {
        return "";
    }
}

export function readStudentDepartmentFromBrowserStorage(): string {
    if (typeof window === "undefined") return "";
    try {
        const raw = window.localStorage.getItem("ciel_user") || window.localStorage.getItem("user");
        if (!raw) return "";
        const u = JSON.parse(raw) as Record<string, unknown>;
        const s = u.department ?? u.major ?? u.faculty_department ?? u.programme;
        return typeof s === "string" ? s.trim() : "";
    } catch {
        return "";
    }
}

export type StudentUniversityApplyEligibility = {
    canApply: boolean;
    isUniversityRestricted: boolean;
    blockedReason: string | null;
    /** Short label for listing badges */
    listingRestrictionLabel: string | null;
    allowedUniversities: string[];
};

function uniBlocked(
    allowedUniversities: string[],
    listingRestrictionLabel: string | null,
    studentInstitution: string,
): StudentUniversityApplyEligibility {
    const st = normUni(studentInstitution);
    if (!st) {
        return {
            canApply: false,
            isUniversityRestricted: true,
            blockedReason: `This opportunity is limited to: ${allowedUniversities.join(", ")}. Add your university to your profile to apply.`,
            listingRestrictionLabel,
            allowedUniversities,
        };
    }
    const ok = allowedUniversities.some((a) => normUni(a) === st);
    if (!ok) {
        return {
            canApply: false,
            isUniversityRestricted: true,
            blockedReason: `Only students from ${allowedUniversities.join(", ")} may apply. Your profile university does not match.`,
            listingRestrictionLabel,
            allowedUniversities,
        };
    }
    return {
        canApply: true,
        isUniversityRestricted: true,
        blockedReason: null,
        listingRestrictionLabel,
        allowedUniversities,
    };
}

function applyDepartmentGate(
    raw: Record<string, unknown>,
    base: StudentUniversityApplyEligibility,
    studentDepartment: string,
): StudentUniversityApplyEligibility {
    if (!base.canApply || !needsDepartmentMatch(raw)) return base;
    const { departments } = departmentRestriction(raw);
    if (departments.length === 0) return base;
    const dept = normUni(studentDepartment || readStudentDepartmentFromBrowserStorage());
    const label = base.listingRestrictionLabel || "Selected departments only";
    if (!dept) {
        return {
            ...base,
            canApply: false,
            blockedReason:
                "This opportunity is limited to selected departments. Add your department or major in your profile, then try again.",
            listingRestrictionLabel: label,
        };
    }
    const ok = departments.some((d) => normUni(d) === dept);
    if (!ok) {
        return {
            ...base,
            canApply: false,
            blockedReason:
                "This opportunity is limited to selected departments, and your department or major is not on the allowed list.",
            listingRestrictionLabel: label,
        };
    }
    return base;
}

/**
 * Client-side gate so students see Eligible vs View Only before POSTing.
 * Card visibility (public listing) is independent of Apply Now (participation_scope).
 */
export function resolveStudentUniversityApplyEligibility(
    raw: Record<string, unknown>,
    studentInstitution: string,
    studentDepartment?: string,
): StudentUniversityApplyEligibility {
    const allowedUniversities = collectUniversityParticipationAllowlist(raw);
    const dept = studentDepartment ?? readStudentDepartmentFromBrowserStorage();

    if (isOpenParticipation(raw)) {
        return applyDepartmentGate(
            raw,
            {
                canApply: true,
                isUniversityRestricted: false,
                blockedReason: null,
                listingRestrictionLabel: null,
                allowedUniversities: [],
            },
            dept,
        );
    }

    const hasExplicitAllowlist = allowedUniversities.length > 0;
    const rule = participationRule(raw);
    const isUniversityRestricted =
        hasExplicitAllowlist ||
        rule === "own_university_only" ||
        rule === "own_university_departments" ||
        rule === "restricted_specific_universities" ||
        rule === "departments_across_universities";

    let listingRestrictionLabel: string | null = null;
    if (needsDepartmentMatch(raw) && allowedUniversities.length <= 1) {
        listingRestrictionLabel =
            allowedUniversities.length === 1
                ? `${allowedUniversities[0]} · selected departments`
                : "Selected departments only";
    } else if (isUniversityRestricted) {
        if (allowedUniversities.length === 1) {
            listingRestrictionLabel = `${allowedUniversities[0]} only`;
        } else if (allowedUniversities.length > 1) {
            listingRestrictionLabel = "Selected universities only";
        } else {
            listingRestrictionLabel = "University-restricted";
        }
    }

    if (!hasExplicitAllowlist) {
        return applyDepartmentGate(
            raw,
            {
                canApply: !isUniversityRestricted,
                isUniversityRestricted,
                blockedReason: isUniversityRestricted
                    ? "This opportunity is limited to selected universities. Add your university to your profile to apply."
                    : null,
                listingRestrictionLabel,
                allowedUniversities: [],
            },
            dept,
        );
    }

    return applyDepartmentGate(raw, uniBlocked(allowedUniversities, listingRestrictionLabel, studentInstitution), dept);
}
