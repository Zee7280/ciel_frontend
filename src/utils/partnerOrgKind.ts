export type PartnerOrgKind = "university" | "ngo" | "partner";

type OrgUserHint = {
    orgType?: string;
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
