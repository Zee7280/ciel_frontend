import { pickVisibilityBucket } from "@/utils/opportunityListing";

function normUni(value: unknown): string {
    if (typeof value !== "string") return "";
    return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function participationRuleIsOpenAll(raw: Record<string, unknown>): boolean {
    const ps = raw.participation_scope;
    if (!ps || typeof ps !== "object") return false;
    const rule = String((ps as Record<string, unknown>).rule ?? "").toLowerCase();
    return rule.includes("open_all");
}

function isOpenParticipation(raw: Record<string, unknown>): boolean {
    const v = String(raw.visibility ?? "").toLowerCase();
    if (v === "public") return true;
    if (pickVisibilityBucket(raw) === "open") return true;
    return participationRuleIsOpenAll(raw);
}

/** Universities explicitly allowed to participate (whitelist), deduped. */
export function collectUniversityParticipationAllowlist(raw: Record<string, unknown>): string[] {
    const names: string[] = [];

    const ps = raw.participation_scope;
    if (ps && typeof ps === "object") {
        const arr = (ps as Record<string, unknown>).university_names;
        if (Array.isArray(arr)) {
            for (const x of arr) {
                if (typeof x === "string" && x.trim()) names.push(x.trim());
            }
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

export type StudentUniversityApplyEligibility = {
    canApply: boolean;
    isUniversityRestricted: boolean;
    blockedReason: string | null;
    /** Short label for listing badges */
    listingRestrictionLabel: string | null;
    allowedUniversities: string[];
};

/**
 * Client-side gate for university-scoped listings so students see eligibility before POSTing
 * (avoids opaque 403 on apply when visibility / participation is restricted).
 */
export function resolveStudentUniversityApplyEligibility(
    raw: Record<string, unknown>,
    studentInstitution: string,
): StudentUniversityApplyEligibility {
    const allowedUniversities = collectUniversityParticipationAllowlist(raw);

    if (isOpenParticipation(raw)) {
        return {
            canApply: true,
            isUniversityRestricted: false,
            blockedReason: null,
            listingRestrictionLabel: null,
            allowedUniversities: [],
        };
    }

    const vis = String(raw.visibility ?? "").toLowerCase();
    const bucket = pickVisibilityBucket(raw);
    const hasExplicitAllowlist = allowedUniversities.length > 0;
    const isUniversityRestricted = vis === "restricted" || bucket === "restricted" || hasExplicitAllowlist;

    let listingRestrictionLabel: string | null = null;
    if (isUniversityRestricted) {
        if (allowedUniversities.length === 1) {
            listingRestrictionLabel = `${allowedUniversities[0]} only`;
        } else if (allowedUniversities.length > 1) {
            listingRestrictionLabel = "Selected universities only";
        } else {
            listingRestrictionLabel = "University-restricted";
        }
    }

    if (!hasExplicitAllowlist) {
        return {
            canApply: true,
            isUniversityRestricted,
            blockedReason: null,
            listingRestrictionLabel,
            allowedUniversities: [],
        };
    }

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
