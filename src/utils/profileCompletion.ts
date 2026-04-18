/** Roles that use the partner dashboard (must match login redirect). */
export const PARTNER_DASHBOARD_ROLES = ["university", "ngo", "corporate", "organization_admin"] as const;

function nonEmptyString(value: unknown): boolean {
    return typeof value === "string" && value.trim().length > 0;
}

export function isValidEmailFormat(value: string): boolean {
    const s = value.trim();
    if (!s) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export function pickProfileContact(user: Record<string, unknown>): string {
    const raw =
        user.contact ??
        user.phone ??
        user.mobile ??
        user.phone_number ??
        user.contactPhone ??
        user.contact_phone;
    if (raw == null) return "";
    return String(raw).trim();
}

export function pickProfileName(user: Record<string, unknown>): string {
    const raw = user.name ?? user.full_name ?? user.fullName;
    if (raw == null) return "";
    return String(raw).trim();
}

/** Login / account email. */
export function pickProfileEmail(user: Record<string, unknown>): string {
    const raw = user.email ?? user.official_email ?? user.officialEmail;
    if (raw == null) return "";
    return String(raw).trim();
}

export function pickDepartment(user: Record<string, unknown>): string {
    const raw = user.department ?? user.faculty_department ?? user.dept;
    if (raw == null) return "";
    return String(raw).trim();
}

function pickOrganizationLabel(user: Record<string, unknown>): string {
    const directName = user.name ?? user.organization_name ?? user.organisation_label;
    if (typeof directName === "string" && directName.trim()) return directName.trim();
    const o = user.organization ?? user.organisation;
    if (typeof o === "string") return o.trim();
    if (o && typeof o === "object" && o !== null && "name" in o) {
        const n = (o as { name?: unknown }).name;
        return typeof n === "string" ? n.trim() : "";
    }
    const alt =
        user.org_name ?? user.organizationName ?? user.orgName ?? user.organisation_name ?? user.organisationName;
    if (alt == null) return "";
    return String(alt).trim();
}

function pickOrganizationDescription(org: Record<string, unknown>): string {
    const raw = org.description ?? org.about ?? org.summary;
    if (raw == null) return "";
    return String(raw).trim();
}

function pickOrganizationWebsite(org: Record<string, unknown>): string {
    const raw = org.websiteUrl ?? org.website ?? org.website_url;
    if (raw == null) return "";
    return String(raw).trim();
}

function pickOrganizationRegion(org: Record<string, unknown>): string {
    const raw = org.region ?? org.province ?? org.state;
    if (raw == null) return "";
    return String(raw).trim();
}

function pickOrganizationContactName(org: Record<string, unknown>): string {
    const raw = org.contactName ?? org.contact_name ?? org.contactPersonName;
    if (raw == null) return "";
    return String(raw).trim();
}

function pickOrganizationContactEmail(org: Record<string, unknown>): string {
    const raw = org.contactEmail ?? org.contact_email ?? org.officialEmail;
    if (raw == null) return "";
    return String(raw).trim();
}

function pickOrganizationContactPhone(org: Record<string, unknown>): string {
    const raw = org.contactPhone ?? org.contact_phone ?? org.phone ?? org.mobile;
    if (raw == null) return "";
    return String(raw).trim();
}

function pickCity(user: Record<string, unknown>): string {
    if (nonEmptyString(user.city)) return String(user.city).trim();
    if (nonEmptyString(user.location)) return String(user.location).trim();
    const loc = user.location;
    if (loc && typeof loc === "object" && loc !== null && !Array.isArray(loc) && "city" in loc) {
        const c = (loc as { city?: unknown }).city;
        if (typeof c === "string" && c.trim()) return c.trim();
    }
    const o = user.organization ?? user.organisation;
    if (o && typeof o === "object" && o !== null && "city" in o) {
        const c = (o as { city?: unknown }).city;
        if (typeof c === "string" && c.trim()) return c.trim();
    }
    return "";
}

/** When backend sets `requires_cnic` / `cnic_required`, CNIC must be present. */
function isCnicRequirementSatisfied(user: Record<string, unknown>): boolean {
    if (user.requires_cnic === true || user.cnic_required === true) {
        const c = user.cnic ?? user.national_id;
        return nonEmptyString(c);
    }
    return true;
}

/** When backend sets `requires_profile_verification`, platform verification must be done. */
function isProfileVerificationSatisfied(user: Record<string, unknown>): boolean {
    if (user.requires_profile_verification === true) {
        return user.profile_verified === true || user.identity_verified === true;
    }
    return true;
}

function institutionPresent(user: Record<string, unknown>): boolean {
    return nonEmptyString(user.institution ?? user.university);
}

/** Student & faculty: aligned with profile forms and opportunity Section A. */
export function isStudentProfileComplete(user: Record<string, unknown>): boolean {
    return (
        nonEmptyString(pickProfileName(user)) &&
        isValidEmailFormat(pickProfileEmail(user)) &&
        nonEmptyString(pickProfileContact(user)) &&
        institutionPresent(user) &&
        nonEmptyString(pickDepartment(user)) &&
        nonEmptyString(pickCity(user)) &&
        isCnicRequirementSatisfied(user) &&
        isProfileVerificationSatisfied(user)
    );
}

export function isFacultyProfileComplete(user: Record<string, unknown>): boolean {
    return isStudentProfileComplete(user);
}

export function isPartnerProfileComplete(user: Record<string, unknown>): boolean {
    return (
        nonEmptyString(pickProfileName(user)) &&
        isValidEmailFormat(pickProfileEmail(user)) &&
        nonEmptyString(pickProfileContact(user)) &&
        nonEmptyString(pickOrganizationLabel(user)) &&
        nonEmptyString(pickCity(user)) &&
        isCnicRequirementSatisfied(user) &&
        isProfileVerificationSatisfied(user)
    );
}

export function isPartnerOrganizationComplete(org: Record<string, unknown>): boolean {
    return (
        nonEmptyString(pickOrganizationLabel(org)) &&
        nonEmptyString(pickOrganizationDescription(org)) &&
        nonEmptyString(pickOrganizationWebsite(org)) &&
        nonEmptyString(pickCity(org)) &&
        nonEmptyString(pickOrganizationRegion(org)) &&
        nonEmptyString(pickOrganizationContactName(org)) &&
        isValidEmailFormat(pickOrganizationContactEmail(org)) &&
        nonEmptyString(pickOrganizationContactPhone(org))
    );
}

export function isPartnerRole(role: string): boolean {
    const r = role.toLowerCase();
    return PARTNER_DASHBOARD_ROLES.some((x) => x === r);
}

export function profileCompletionRedirectPath(role: string, user: Record<string, unknown>): string | null {
    const r = String(role).toLowerCase();
    if (r === "student" && !isStudentProfileComplete(user)) {
        return "/dashboard/student/profile";
    }
    if (isPartnerRole(r) && !isPartnerProfileComplete(user)) {
        return "/dashboard/partner/organization";
    }
    if (r === "faculty" && !isFacultyProfileComplete(user)) {
        return "/dashboard/faculty/profile";
    }
    return null;
}

/** Human-readable list for profile pages (English UI copy). */
export function missingProfileFieldsForRole(
    role: string,
    user: Record<string, unknown>
): string[] {
    const r = String(role).toLowerCase();
    const missing: string[] = [];

    const pushStudentFaculty = () => {
        if (!nonEmptyString(pickProfileName(user))) missing.push("Full name");
        if (!isValidEmailFormat(pickProfileEmail(user))) missing.push("Email");
        if (!nonEmptyString(pickProfileContact(user))) missing.push("Phone number");
        if (!institutionPresent(user)) missing.push("Institution / university");
        if (!nonEmptyString(pickDepartment(user))) missing.push("Department");
        if (!nonEmptyString(pickCity(user))) missing.push("City / location");
        if (!isCnicRequirementSatisfied(user)) missing.push("CNIC / national ID");
        if (!isProfileVerificationSatisfied(user)) missing.push("Profile verification");
    };

    if (r === "student" || r === "faculty") {
        pushStudentFaculty();
        return missing;
    }
    if (isPartnerRole(r)) {
        if (!nonEmptyString(pickProfileName(user))) missing.push("Full name");
        if (!isValidEmailFormat(pickProfileEmail(user))) missing.push("Email");
        if (!nonEmptyString(pickProfileContact(user))) missing.push("Phone number");
        if (!nonEmptyString(pickOrganizationLabel(user))) missing.push("Organization");
        if (!nonEmptyString(pickCity(user))) missing.push("City / location");
        if (!isCnicRequirementSatisfied(user)) missing.push("CNIC / national ID");
        if (!isProfileVerificationSatisfied(user)) missing.push("Profile verification");
        return missing;
    }
    return missing;
}
