"use client";

import PortalHelpPage from "@/components/support/PortalHelpPage";

const FACULTY_CATEGORIES = [
    { value: "account", label: "Account & login" },
    { value: "opportunity", label: "Opportunity approvals" },
    { value: "applications", label: "Applications & reports" },
    { value: "attendance", label: "Attendance review" },
    { value: "analytics", label: "Impact analytics" },
    { value: "messages", label: "Messages & notifications" },
    { value: "other", label: "Other" },
];

export default function FacultyHelpPage() {
    return (
        <PortalHelpPage
            apiBase="/api/v1/faculty/support"
            categoryOptions={FACULTY_CATEGORIES}
            submitBlurb="Describe your issue clearly. CIEL support or your institution admin may respond depending on category."
        />
    );
}
