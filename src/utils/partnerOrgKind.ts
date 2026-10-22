export type PartnerOrgKind = "university" | "ngo" | "partner";

type OrgUserHint = {
    orgType?: string;
    organizationCategory?: string | null;
    organization_type?: string;
    type?: string;
    role?: string;
} | null;

function orgTypeText(user: OrgUserHint): string {
    return String(user?.orgType || user?.organization_type || user?.type || "")
        .trim()
        .toLowerCase();
}

function roleText(user: OrgUserHint): string {
    return String(user?.role || "")
        .trim()
        .toLowerCase();
}

export function isUniversityPartnerOrg(user: OrgUserHint): boolean {
    const t = orgTypeText(user);
    const role = roleText(user);
    return t.includes("university") || role === "university";
}

export function isNgoPartnerOrg(user: OrgUserHint): boolean {
    if (isUniversityPartnerOrg(user)) return false;
    const t = orgTypeText(user);
    const role = roleText(user);
    if (role === "corporate" || role === "government") return false;
    if (t.includes("corporate") || t.includes("company") || t.includes("government") || t.includes("public sector")) {
        return false;
    }
    if (role === "ngo") return true;
    return (
        t === "ngo" ||
        t.includes("ngo") ||
        t.includes("nonprofit") ||
        t.includes("non-profit") ||
        t.includes("civil society") ||
        t.includes("charity")
    );
}

export function readPartnerOrgKind(user: OrgUserHint): PartnerOrgKind {
    if (isUniversityPartnerOrg(user)) return "university";
    if (isNgoPartnerOrg(user)) return "ngo";
    return "partner";
}

/**
 * Display name for a partner org. HEC / Government signups are NGO accounts underneath (same tools),
 * so only `organizationCategory` tells them apart.
 */
export function readPartnerOrgLabel(user: OrgUserHint): string {
    if (/government/i.test(String(user?.organizationCategory ?? ""))) return "HEC / Government";
    const kind = readPartnerOrgKind(user);
    if (kind === "university") return "University";
    if (kind === "ngo") return "NGO / Nonprofit";
    if (orgTypeText(user).includes("corporate") || roleText(user) === "corporate") return "Corporate Partner";
    return "Partner Organization";
}
