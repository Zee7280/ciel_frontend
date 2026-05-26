"use client";

import PortalHelpPage from "@/components/support/PortalHelpPage";

const PARTNER_CATEGORIES = [
    { value: "account", label: "Account & organization" },
    { value: "opportunity", label: "Opportunities & applicants" },
    { value: "verification", label: "Work verification" },
    { value: "attendance", label: "Attendance review" },
    { value: "report", label: "Reports & impact" },
    { value: "funding", label: "Funding" },
    { value: "membership", label: "Membership / billing" },
    { value: "messages", label: "Messages & notifications" },
    { value: "other", label: "Other" },
];

export default function PartnerHelpPage() {
    return (
        <PortalHelpPage
            apiBase="/api/v1/partner/support"
            categoryOptions={PARTNER_CATEGORIES}
            submitBlurb="Describe your issue clearly. CIEL support will respond based on your organization and ticket category."
        />
    );
}
