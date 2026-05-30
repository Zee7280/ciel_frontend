/** Must match backend `REPORT_PARTNER_APPROVAL_SETTING_KEY`. */
export const REPORT_PARTNER_APPROVAL_SETTING_KEY = "REPORT_PARTNER_APPROVAL_ENABLED";

export function parseReportPartnerApprovalSettingValue(
    value: string | null | undefined,
    defaultEnabled = true,
): boolean {
    if (value == null || String(value).trim() === "") return defaultEnabled;
    const normalized = String(value).trim().toLowerCase();
    if (["false", "0", "no", "off", "disabled"].includes(normalized)) return false;
    if (["true", "1", "yes", "on", "enabled"].includes(normalized)) return true;
    return defaultEnabled;
}

/** Align with backend `partner_status` and public verify `requires_partner_approval`. */
export function normalizeReportPartnerStatus(value: string | null | undefined): string {
    if (!value) return "";
    return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function formatReportPartnerStatusLabel(value: string | null | undefined): string {
    const ps = normalizeReportPartnerStatus(value);
    if (!ps) return "Pending";
    if (ps === "not_applicable" || ps === "not_required" || ps === "n_a") return "Not required";
    if (ps === "approved") return "Approved";
    if (ps === "rejected") return "Rejected";
    if (ps === "pending") return "Pending";
    return value?.trim() || "Pending";
}

export function reportPartnerStatusTone(value: string | null | undefined): "approved" | "rejected" | "muted" | "pending" {
    const ps = normalizeReportPartnerStatus(value);
    if (ps === "approved") return "approved";
    if (ps === "rejected") return "rejected";
    if (ps === "not_applicable" || ps === "not_required" || ps === "n_a") return "muted";
    return "pending";
}

export function reportPartnerGateDisabled(report: {
    requires_partner_approval?: boolean | null;
    partner_required?: boolean | null;
} | null | undefined): boolean {
    return report?.requires_partner_approval === false || report?.partner_required === false;
}
