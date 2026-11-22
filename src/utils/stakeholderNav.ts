/**
 * CIEL PK · Final Stakeholder Dashboard Structure (Community Service).
 *
 * One source of truth for every stakeholder's main buttons and the sub-buttons that open inside
 * them. The Sidebar, the mobile menu sheet and every dashboard home page read from here, so a
 * button exists once and links to the same Opportunity / Report / approved-package screens
 * everywhere. Names follow the structure document; a few are adapted where the product already
 * has a dedicated screen (noted inline).
 *
 * This file is imported by node tests directly, so it must stay a leaf module: no aliases, no
 * React, string literals only.
 */

export type StakeholderNavRole = "student" | "faculty" | "university" | "ngo" | "partner" | "admin";

export type StakeholderSubButton = {
    label: string;
    href: string;
    /** One line shown under the label in menus and inside the home card. */
    hint?: string;
};

export type StakeholderMainButton = {
    key: string;
    label: string;
    emoji: string;
    /** What the button is for, in one sentence (home card body). */
    description: string;
    /** Where the main button itself lands (normally the first sub-button or the hub view). */
    href: string;
    subButtons: StakeholderSubButton[];
    /** Card gradient on the home screen. */
    background: string;
};

export type StakeholderNav = {
    role: StakeholderNavRole;
    /** Short role title used in headings ("Student", "Faculty", …). */
    title: string;
    /** One-line purpose from the structure document. */
    purpose: string;
    mainButtons: StakeholderMainButton[];
};

const GRADIENT = {
    teal: "linear-gradient(135deg,#15988b,#2ec8bd)",
    blue: "linear-gradient(135deg,#16798c,#38b8e6)",
    orange: "linear-gradient(135deg,#c76000,#f59a00)",
    purple: "linear-gradient(135deg,#6b2bd9,#9f78ef)",
    green: "linear-gradient(135deg,#0e4d4e,#117669)",
    pink: "linear-gradient(135deg,#b74986,#e47fb3)",
    navy: "linear-gradient(135deg,#183b56,#286786)",
    gold: "linear-gradient(135deg,#a67516,#d5aa46)",
    red: "linear-gradient(135deg,#a33d49,#d7626a)",
    slate: "linear-gradient(135deg,#5c6f80,#34495e)",
} as const;

export const STUDENT_CS_HUB = "/dashboard/student/paths/community-service";
export const STUDENT_QUICK_WORK = `${STUDENT_CS_HUB}/quick-work`;
export const FACULTY_CS_HUB = "/dashboard/faculty/community-service";
export const PARTNER_CS_HUB = "/dashboard/partner/community-service";
export const ADMIN_CS_HUB = "/dashboard/admin/community-service";

const STUDENT_NAV: StakeholderNav = {
    role: "student",
    title: "Student",
    purpose: "Create or apply for opportunities, complete your report and see your approved impact.",
    mainButtons: [
        {
            key: "opportunities",
            label: "Opportunities",
            emoji: "🚀",
            description: "Create a different opportunity, browse published ones and follow every application.",
            href: `${STUDENT_CS_HUB}?view=create`,
            background: GRADIENT.teal,
            subButtons: [
                { label: "My Opportunities", href: `${STUDENT_CS_HUB}?view=create`, hint: "Drafts · Under Review · Action Required · Rejected · Published" },
                { label: "Browse Opportunities", href: "/dashboard/student/browse", hint: "Published opportunities · Apply Now" },
                { label: "My Applications", href: "/dashboard/student/browse?tab=applied", hint: "Status of every application you sent" },
            ],
        },
        {
            key: "reports",
            label: "My Reports",
            emoji: "🛠️",
            description: "Start the report from a published opportunity or approved application, then save, submit, revise and track it.",
            href: `${STUDENT_CS_HUB}?view=workspace`,
            background: GRADIENT.orange,
            subButtons: [
                { label: "Ready to Start", href: `${STUDENT_CS_HUB}?view=workspace&filter=ready`, hint: "Approved work with no report yet" },
                { label: "Drafts / In Progress", href: `${STUDENT_CS_HUB}?view=workspace&filter=reports`, hint: "Reports you are still writing" },
                { label: "Submitted / Under Review", href: `${STUDENT_CS_HUB}?view=workspace&filter=review`, hint: "With Faculty or CIEL PK" },
                { label: "Action Required / Rejected", href: `${STUDENT_CS_HUB}?view=workspace&filter=action`, hint: "Sent back for revision" },
            ],
        },
        {
            key: "impact",
            label: "My Impact",
            emoji: "🏅",
            description: "Outputs appear only after CIEL PK final approval: your flashcard and permitted evidence, never the full reviewer package.",
            href: `${STUDENT_CS_HUB}?view=wall`,
            background: GRADIENT.green,
            subButtons: [
                { label: "Approved Flashcards", href: `${STUDENT_CS_HUB}?view=wall`, hint: "Published flashcards" },
                { label: "Evidence Gallery", href: "/dashboard/student/impact", hint: "Every approved record with its permitted evidence" },
                { label: "CII / Badges / Certificates", href: `${STUDENT_CS_HUB}?view=wall&filter=ranked`, hint: "Ranked records with CII, badges and certificates" },
                { label: "My Rankings", href: `${STUDENT_CS_HUB}?view=rankings`, hint: "Ranking snapshots and badge history" },
            ],
        },
        {
            key: "qci",
            label: "Quick Community Impact",
            emoji: "⚡",
            description: "Short 1–3 hour activities, recorded in their own QCI workflow and never mixed with the structured 16-hour report.",
            href: STUDENT_QUICK_WORK,
            background: GRADIENT.pink,
            subButtons: [
                { label: "Log a Quick Activity", href: `${STUDENT_QUICK_WORK}?log=new`, hint: "Start a new quick log" },
                { label: "Quick Impact Log", href: STUDENT_QUICK_WORK, hint: "Drafts · Submitted · Approved" },
            ],
        },
        {
            key: "help",
            label: "Help & Guidance",
            emoji: "📘",
            description: "Stages, form guidance and answers in one place, so the home screen stays an overview.",
            href: "/dashboard/student/help",
            background: GRADIENT.purple,
            subButtons: [
                { label: "How It Works", href: "/dashboard/student/help?tab=tutorials", hint: "Platform walkthrough" },
                { label: "Report Guidance", href: `${STUDENT_CS_HUB}?view=guide`, hint: "Section-by-section report coach" },
                { label: "FAQs", href: "/dashboard/student/help?tab=faqs", hint: "Common questions and support tickets" },
            ],
        },
    ],
};

const FACULTY_NAV: StakeholderNav = {
    role: "faculty",
    title: "Faculty",
    purpose: "Create opportunities, approve student proposals and monitor the work you supervise.",
    mainButtons: [
        {
            key: "opportunities",
            label: "Opportunities",
            emoji: "🚀",
            description: "Create your own opportunities; supervised student opportunities sync on the same Opportunity ID.",
            href: `${FACULTY_CS_HUB}?view=create`,
            background: GRADIENT.teal,
            subButtons: [
                { label: "Create Opportunity", href: "/dashboard/faculty/create-opportunity", hint: "New faculty opportunity" },
                { label: "Browse Opportunities", href: "/dashboard/faculty/browse", hint: "Everything published on CIEL PK · view only" },
                { label: "My & Supervised Opportunities", href: `${FACULTY_CS_HUB}?view=create`, hint: "Drafts · Under Approval · Action Required · Published · Closed" },
            ],
        },
        {
            key: "approvals",
            label: "Approvals",
            emoji: "✅",
            description: "Your assigned inbox: approve, request revision or reject. Every decision updates the creator and linked stakeholders.",
            href: `${FACULTY_CS_HUB}?view=review`,
            background: GRADIENT.orange,
            subButtons: [
                { label: "Opportunity Reviews", href: `${FACULTY_CS_HUB}?view=review&tab=opps`, hint: "Student proposals waiting for you" },
                { label: "Participation Requests", href: `${FACULTY_CS_HUB}?view=review&tab=apps`, hint: "Students applying to published opportunities" },
                { label: "QCI Reviews", href: "/dashboard/faculty/quick-work", hint: "Quick Community Impact logs naming you" },
            ],
        },
        {
            key: "supervision",
            label: "Project Supervision",
            emoji: "📈",
            description: "Report status, verified hours and the reviews assigned to you. The University sees the same activity as an observer.",
            href: `${FACULTY_CS_HUB}?view=projects`,
            background: GRADIENT.navy,
            subButtons: [
                { label: "Community Service Projects", href: `${FACULTY_CS_HUB}?view=projects&tab=active`, hint: "Approved projects you supervise" },
                { label: "Reports in Progress", href: `${FACULTY_CS_HUB}?view=projects&tab=progress`, hint: "Students still writing" },
                { label: "Attendance / Below-Hours Alerts", href: "/dashboard/faculty/attendance-review", hint: "Member hours and reminders" },
                { label: "Submitted Reports", href: "/dashboard/faculty/reports?tab=waiting", hint: "Read-only · CIEL PK finalises" },
            ],
        },
        {
            key: "records",
            label: "Impact Records",
            emoji: "🏅",
            description: "After CIEL PK approval: the approved detailed package and permitted evidence for your supervised projects.",
            href: `${FACULTY_CS_HUB}?view=impact`,
            background: GRADIENT.green,
            subButtons: [
                { label: "Approved Project Packages", href: `${FACULTY_CS_HUB}?view=impact`, hint: "Verified impact from your projects" },
                { label: "Detailed Reports", href: "/dashboard/faculty/reports?tab=approved", hint: "Approved report packages" },
                { label: "Evidence / Flashcards", href: "/dashboard/faculty/impact?tab=community", hint: "Published flashcards on your Impact Wall" },
            ],
        },
        {
            key: "insights",
            label: "Insights",
            emoji: "📊",
            description: "Summary, hours, SDGs and impact for your supervised projects only. Final CII scoring stays with CIEL PK.",
            href: `${FACULTY_CS_HUB}?view=analytics`,
            background: GRADIENT.gold,
            subButtons: [
                { label: "Faculty Impact Summary", href: `${FACULTY_CS_HUB}?view=analytics`, hint: "Your projects at a glance" },
                { label: "Project Analytics", href: "/dashboard/faculty/analytics", hint: "Filters, departments and trends" },
            ],
        },
    ],
};

const UNIVERSITY_NAV: StakeholderNav = {
    role: "university",
    title: "University",
    purpose: "Observe your institution's opportunity and report pipeline and analyse approved data cumulatively.",
    mainButtons: [
        {
            key: "opportunities",
            label: "Opportunities",
            emoji: "🚀",
            description: "University-authorised opportunities and faculty allocation, connected to one project record.",
            href: `${PARTNER_CS_HUB}?view=create`,
            background: GRADIENT.teal,
            subButtons: [
                { label: "Create Opportunity", href: `${PARTNER_CS_HUB}?view=create`, hint: "University opportunities · Drafts to Published" },
                { label: "Browse Opportunities", href: "/dashboard/partner/browse", hint: "Everything published on CIEL PK · view only" },
                { label: "Faculty Allocation", href: `${PARTNER_CS_HUB}?view=allocation`, hint: "Authorise faculty representatives" },
            ],
        },
        {
            key: "monitoring",
            label: "Approvals & Monitoring",
            emoji: "🔎",
            description: "Observer view of Draft, Under Review, Action Required, Published and report progress. Faculty and partner approvals stay theirs.",
            href: `${PARTNER_CS_HUB}?view=projects&tab=approval`,
            background: GRADIENT.orange,
            subButtons: [
                { label: "Opportunity Approval Status", href: `${PARTNER_CS_HUB}?view=projects&tab=approval`, hint: "Faculty → Partner → CIEL PK" },
                { label: "Applications Overview", href: `${PARTNER_CS_HUB}?view=projects&tab=applications`, hint: "Join applications to institutional listings" },
                { label: "Reports in Progress", href: `${PARTNER_CS_HUB}?view=projects&tab=progress`, hint: "Students still writing" },
                { label: "Institutional Alerts", href: `${PARTNER_CS_HUB}?view=projects&tab=faculty`, hint: "Items waiting on your faculty" },
            ],
        },
        {
            key: "records",
            label: "Project Records",
            emoji: "📁",
            description: "Track project progress; detailed reports, flashcards and permitted evidence appear after CIEL PK approval.",
            href: `${PARTNER_CS_HUB}?view=projects&tab=active`,
            background: GRADIENT.navy,
            subButtons: [
                { label: "Community Service Projects", href: `${PARTNER_CS_HUB}?view=projects&tab=active`, hint: "Active institutional projects" },
                { label: "Submitted Reports Status", href: `${PARTNER_CS_HUB}?view=reports`, hint: "Read-only review of submitted packages" },
                { label: "Approved Project Packages", href: `${PARTNER_CS_HUB}?view=approved`, hint: "CIEL PK-published records" },
            ],
        },
        {
            key: "wall",
            label: "Impact Wall",
            emoji: "🏆",
            description: "Approved projects, badges and published institutional rankings on the University Impact Wall.",
            href: `${PARTNER_CS_HUB}?view=wall`,
            background: GRADIENT.green,
            subButtons: [
                { label: "University Impact Wall", href: `${PARTNER_CS_HUB}?view=wall`, hint: "Published flashcards" },
                { label: "Verified Impact", href: "/dashboard/partner/reports", hint: "Published impact packages" },
            ],
        },
        {
            key: "ai",
            label: "AI & Intelligence",
            emoji: "🧠",
            description: "Tool 1 ranks your own approved projects. Tool 2 builds evidence-supported statistical packages for HEC/QEC, QS, THE, GreenMetric and VC reporting.",
            href: `${PARTNER_CS_HUB}?view=run`,
            background: GRADIENT.purple,
            subButtons: [
                { label: "CIEL PK Project Rankings AI", href: `${PARTNER_CS_HUB}?view=run`, hint: "Rank and publish institutional runs" },
                { label: "Institutional Impact Intelligence AI", href: "/dashboard/partner/university-analytics", hint: "Statistical packages from approved reports" },
            ],
        },
        {
            key: "exports",
            label: "Reports & Exports",
            emoji: "📤",
            description: "Version-wise outputs, filtered by period, department, faculty, SDG and partner. Your institution's data only.",
            href: `${PARTNER_CS_HUB}?view=exports`,
            background: GRADIENT.slate,
            subButtons: [
                { label: "Semester / Annual Reports", href: `${PARTNER_CS_HUB}?view=exports`, hint: "HEC-ready summaries and registers" },
                { label: "Statistical Packages Repository", href: `${PARTNER_CS_HUB}?view=analytics`, hint: "Institution-wide analytics" },
                { label: "CSV / Export Downloads", href: "/dashboard/partner/integrations", hint: "External records and exports" },
            ],
        },
    ],
};

function orgNav(role: "ngo" | "partner"): StakeholderNav {
    const isNgo = role === "ngo";
    return {
        role,
        title: isNgo ? "NGO / Nonprofit" : "Partner Organization",
        purpose: isNgo
            ? "Host or create opportunities and verify the student work linked to your organization."
            : "Manage your sponsored or hosted projects and the approvals assigned to you.",
        mainButtons: [
            {
                key: "opportunities",
                label: "Opportunities",
                emoji: "🚀",
                description: isNgo
                    ? "Standard NGO opportunity form; created and hosted opportunities show their status here."
                    : "Create partner opportunities and see the live status of everything you host.",
                href: `${PARTNER_CS_HUB}?view=create`,
                background: GRADIENT.teal,
                subButtons: [
                    { label: "Create Opportunity", href: "/dashboard/partner/requests/new", hint: "New opportunity for students" },
                    { label: "Browse Opportunities", href: "/dashboard/partner/browse", hint: "Everything published on CIEL PK · view only" },
                    { label: isNgo ? "NGO Opportunities" : "Partner Opportunities", href: `${PARTNER_CS_HUB}?view=create`, hint: "Drafts · Under Approval · Action Required · Published · Closed" },
                ],
            },
            {
                key: "approvals",
                label: "Approvals",
                emoji: "✅",
                description: "Only requests linked to you: approve, revise or reject. Email approvals and dashboard decisions update the same record.",
                href: `${PARTNER_CS_HUB}?view=approvals`,
                background: GRADIENT.orange,
                subButtons: [
                    { label: "Opportunity Approval Inbox", href: `${PARTNER_CS_HUB}?view=approvals&tab=pending`, hint: "Opportunities that name your organization" },
                    { label: "Attendance / Work Verification", href: "/dashboard/partner/attendance-review", hint: "Verify student hours and work" },
                ],
            },
            {
                key: "tracking",
                label: "Project Tracking",
                emoji: "📈",
                description: isNgo
                    ? "Linked students, report progress and attendance. Nothing is exposed without a real association."
                    : "Only Project IDs connected to you: status, participation and report progress.",
                href: `${PARTNER_CS_HUB}?view=projects`,
                background: GRADIENT.navy,
                subButtons: [
                    { label: isNgo ? "Community Service Projects" : "Linked Projects", href: `${PARTNER_CS_HUB}?view=projects&tab=active`, hint: "Approved projects linked to you" },
                    { label: "Participants", href: "/dashboard/partner/participants", hint: "Students on your projects" },
                    { label: "Reports in Progress", href: `${PARTNER_CS_HUB}?view=projects&tab=tracking`, hint: "Live report progress" },
                ],
            },
            {
                key: "impact",
                label: "My Impact",
                emoji: "🏆",
                description: "After final approval: flashcards, detailed reports and permitted evidence of linked projects. Restricted files never open.",
                href: `${PARTNER_CS_HUB}?view=impact`,
                background: GRADIENT.green,
                subButtons: [
                    { label: isNgo ? "Verified NGO Impact" : "Verified Partner Impact", href: `${PARTNER_CS_HUB}?view=impact`, hint: "Published flashcards linked to you" },
                    { label: "Approved Project Packages", href: "/dashboard/partner/reports", hint: "Detailed reports and permitted evidence" },
                ],
            },
            {
                key: "insights",
                label: "Insights",
                emoji: "📊",
                description: "Impact, hours, beneficiaries and SDG coverage of your linked projects.",
                href: `${PARTNER_CS_HUB}?view=analytics`,
                background: GRADIENT.gold,
                subButtons: [
                    { label: isNgo ? "NGO Project Summary" : "Partner Impact Summary", href: `${PARTNER_CS_HUB}?view=analytics`, hint: "Your projects at a glance" },
                    { label: isNgo ? "Impact Analytics" : "Linked Project Analytics", href: "/dashboard/partner/analytics", hint: "Filters and trends" },
                ],
            },
        ],
    };
}

const ADMIN_NAV: StakeholderNav = {
    role: "admin",
    title: "Super Admin",
    purpose: "Central control of every institution, faculty, student and partner project.",
    mainButtons: [
        {
            key: "opportunities",
            label: "Opportunities",
            emoji: "🚀",
            description: "Every opportunity on the platform; final publication approval and history live on one record.",
            href: `${ADMIN_CS_HUB}?view=create`,
            background: GRADIENT.teal,
            subButtons: [
                { label: "Create Opportunity", href: "/dashboard/admin/create-opportunity", hint: "Publish as CIEL PK" },
                { label: "All Opportunities", href: "/dashboard/admin/approvals?tab=all", hint: "Every record, every status" },
                { label: "CIEL PK Opportunities", href: `${ADMIN_CS_HUB}?view=create`, hint: "Drafts · Under Approval · Action Required · Published · Closed" },
            ],
        },
        {
            key: "queues",
            label: "Approval Queues",
            emoji: "✅",
            description: "Pending approvals, corrections and rejections in one place, with Faculty and Partner decisions visible.",
            href: "/dashboard/admin/approvals?tab=pending_admin",
            background: GRADIENT.orange,
            subButtons: [
                { label: "Opportunity Final Approvals", href: "/dashboard/admin/approvals?tab=pending_admin", hint: "Waiting for CIEL PK" },
                { label: "Applications Monitor", href: "/dashboard/admin/join-applications", hint: "Join applications and report approvals" },
                { label: "Report Verification", href: "/dashboard/admin/reports/verify", hint: "Student reports awaiting admin" },
                { label: "Supervision Confirmations", href: "/dashboard/admin/report-supervision", hint: "Students waiting for a faculty confirmation" },
            ],
        },
        {
            key: "records",
            label: "Project Records",
            emoji: "📁",
            description: "Every institution, faculty, student and partner record, reached through Project and Report IDs.",
            href: `${ADMIN_CS_HUB}?view=projects`,
            background: GRADIENT.navy,
            subButtons: [
                { label: "All Community Service Projects", href: "/dashboard/admin/projects", hint: "Details, applicants, stages" },
                { label: "Reports in Progress", href: `${ADMIN_CS_HUB}?view=projects&tab=progress`, hint: "Students still writing" },
                { label: "Approved Packages Repository", href: `${ADMIN_CS_HUB}?view=approved`, hint: "Verified reports, CII, badges, QR" },
            ],
        },
        {
            key: "wall",
            label: "Impact Wall",
            emoji: "🏆",
            description: "Only approved and published outputs. Labelled CIEL PK Rankings, never an official national ranking.",
            href: `${ADMIN_CS_HUB}?view=wall`,
            background: GRADIENT.green,
            subButtons: [
                { label: "CIEL PK Impact Wall", href: `${ADMIN_CS_HUB}?view=wall`, hint: "National showcase" },
                { label: "Verified Impact Showcase", href: "/dashboard/admin/analytics?tab=impact", hint: "Impact and SDG lens" },
            ],
        },
        {
            key: "ai",
            label: "AI & Intelligence",
            emoji: "🧠",
            description: "Tool 1 ranks approved projects across and within institutions. Tool 2 runs cumulative evidence-supported analysis on all approved data.",
            href: `${ADMIN_CS_HUB}?view=run`,
            background: GRADIENT.purple,
            subButtons: [
                { label: "CIEL PK Project Rankings AI", href: `${ADMIN_CS_HUB}?view=run`, hint: "National Ranking Studio · published runs" },
                { label: "Platform Impact Intelligence AI", href: "/dashboard/admin/analytics", hint: "Platform KPIs, impact and stakeholder lens" },
            ],
        },
        {
            key: "exports",
            label: "Reports & Exports",
            emoji: "📤",
            description: "Outputs derived from approved packages, with filters, version history and institution-wise drill-down.",
            href: `${ADMIN_CS_HUB}?view=exports`,
            background: GRADIENT.slate,
            subButtons: [
                { label: "Institution-wise Reports", href: "/dashboard/admin/cs-reporting", hint: "HEC, government and university reports" },
                { label: "Platform Statistical Packages", href: `${ADMIN_CS_HUB}?view=exports`, hint: "Summaries, registers, authorised exports" },
                { label: "CSV / Award Exports", href: "/dashboard/admin/integrations", hint: "Integration hub and university export" },
            ],
        },
        {
            key: "qci",
            label: "Quick Community Impact",
            emoji: "⚡",
            description: "Short impact entries administered separately; never merged with structured reports without a clear label.",
            href: "/dashboard/admin/quick-work",
            background: GRADIENT.pink,
            subButtons: [
                { label: "QCI Oversight", href: "/dashboard/admin/quick-work", hint: "Every log, status and evidence" },
                { label: "QCI Approvals / Published", href: "/dashboard/admin/quick-work?status=admin_review", hint: "Final approval after faculty" },
            ],
        },
    ],
};

export const STAKEHOLDER_NAV: Record<StakeholderNavRole, StakeholderNav> = {
    student: STUDENT_NAV,
    faculty: FACULTY_NAV,
    university: UNIVERSITY_NAV,
    ngo: orgNav("ngo"),
    partner: orgNav("partner"),
    admin: ADMIN_NAV,
};

/** Resolve the structure-document role from the dashboard role plus the partner organisation kind. */
export function stakeholderNavRole(
    navRole: "student" | "partner" | "faculty" | "admin" | "investor",
    partnerKind: "university" | "ngo" | "partner" = "partner",
): StakeholderNavRole | null {
    if (navRole === "student") return "student";
    if (navRole === "faculty") return "faculty";
    if (navRole === "admin") return "admin";
    if (navRole === "partner") return partnerKind;
    return null;
}

export function splitHref(href: string): { path: string; params: URLSearchParams } {
    const [path, query] = href.split("?");
    return { path, params: new URLSearchParams(query || "") };
}

/**
 * True when `href` describes the current location: same path, and every query parameter the
 * href names has the same value in the current URL. Extra current parameters are ignored, so
 * `?view=review` still matches when the page added `&page=2`.
 */
export function hrefMatchesLocation(href: string, pathname: string, current: { get(name: string): string | null }): boolean {
    const { path, params } = splitHref(href);
    if (path !== pathname) return false;
    for (const [key, value] of params.entries()) {
        if ((current.get(key) || "") !== value) return false;
    }
    return true;
}

/** The main button whose landing or sub-button matches the current location, if any. */
export function activeMainButton(
    nav: StakeholderNav,
    pathname: string,
    current: { get(name: string): string | null },
): StakeholderMainButton | null {
    for (const main of nav.mainButtons) {
        if (main.subButtons.some((sub) => hrefMatchesLocation(sub.href, pathname, current))) return main;
    }
    for (const main of nav.mainButtons) {
        if (hrefMatchesLocation(main.href, pathname, current)) return main;
    }
    return null;
}
