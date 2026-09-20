"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useLayoutEffect, useCallback, useMemo, type ComponentType } from "react";
import { LayoutDashboard, Users, Settings, PieChart, LogOut, FileText, Building2, CheckCircle, Briefcase, FileBarChart, ShieldAlert, BarChart3, History, Bell, User, MessageSquare, Plus, CreditCard, ClipboardList, CalendarClock, LifeBuoy, Link2, Globe2, PlayCircle, Mail, Archive, ChevronsLeft, ChevronsRight, Compass, HelpCircle, BookOpen, X, type LucideProps } from "lucide-react";
import clsx from "clsx";
import { authenticatedFetch, isTokenValid } from "@/utils/api";
import {
    CIEL_STUDENT_DASHBOARD_CACHE_EVENT,
    clearStudentDashboardCache,
    readStudentDashboardCache,
} from "@/utils/student-dashboard-fetch";
import {
    dashboardNavRoleFromPathname,
    readDashboardNavRoleFromStorage,
    type DashboardNavRole,
} from "@/utils/dashboardNavRole";
import { clearFacultyScopeSession } from "@/utils/facultyScopeSession";
import { readPartnerOrgKind, type PartnerOrgKind } from "@/utils/partnerOrgKind";
import { CIEL_NOTIFICATIONS_UNREAD_EVENT, type CielNotificationsUnreadEventDetail } from "@/utils/cielNotificationsUnread";
import {
    CIEL_IMPACT_SUMMARY_CACHE_EVENT,
    clearImpactSummaryCache,
    fetchImpactSummary,
    readImpactSummaryCache,
    type CielImpactSummary,
} from "@/utils/cielImpactSummary";
import { CIEL_PATHS } from "@/utils/cielPaths";
import PathsBottomSheet from "@/components/ciel/PathsBottomSheet";

const SIDEBAR_COLLAPSED_KEY = "ciel_sidebar_collapsed";

type NavItem = {
    label: string;
    href: string;
    icon: ComponentType<LucideProps>;
    countPill?: number;
};

function NavRow({
    href,
    label,
    icon: Icon,
    emoji,
    active,
    needsAction,
    countPill,
    collapsed,
    indent,
    impact,
}: {
    href: string;
    label: string;
    icon?: ComponentType<LucideProps>;
    emoji?: string;
    active: boolean;
    needsAction?: boolean;
    countPill?: number;
    collapsed: boolean;
    indent?: boolean;
    impact?: boolean;
}) {
    return (
        <Link
            href={href}
            scroll
            className={clsx(
                "ciel-transition relative mx-[10px] mb-[5px] flex w-[calc(100%-20px)] items-center gap-[13px] rounded-[14px] px-3.5 py-3.5 text-left text-[14px] font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#42ddb2]",
                active ? "bg-[#22515b] text-white shadow-[inset_4px_0_0_#42ddb2]" : "text-[#c8d4da] hover:bg-white/[0.055] hover:text-white",
                impact && !active && "mt-2 border border-[rgba(62,218,157,.18)] bg-[rgba(43,202,139,.10)]",
                impact && active && "mt-2",
                indent && !collapsed && "mb-1 ml-5 w-[calc(100%-40px)] py-2.5 text-[13px] font-bold",
                collapsed && "justify-center px-0",
            )}
            title={collapsed ? label : undefined}
        >
            {emoji ? <span className="w-7 shrink-0 text-center text-lg leading-none" aria-hidden>{emoji}</span> : Icon ? <Icon className="h-[18px] w-[18px] shrink-0" /> : null}
            {!collapsed && <span className="flex-1 truncate">{label}</span>}
            {!collapsed && needsAction && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ciel-amber" aria-label="Needs action" />}
            {!collapsed && !!countPill && countPill > 0 && (
                <span className="ml-auto grid h-6 min-w-6 shrink-0 place-items-center rounded-xl bg-[#355c6b] px-1.5 text-[11px] font-bold text-white">{countPill > 99 ? "99+" : countPill}</span>
            )}
        </Link>
    );
}

function NavSectionLabel({ collapsed, children }: { collapsed: boolean; children: string }) {
    if (collapsed) return <div className="pt-3" />;
    return <p className="px-2.5 pb-2 pt-[18px] text-[11px] font-black uppercase tracking-[0.08em] text-[#6e92a5]">{children}</p>;
}

function RoleMenuSheet({
    open,
    onClose,
    title,
    items,
    isActive,
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    items: NavItem[];
    isActive: (href: string) => boolean;
}) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label={title}>
            <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ciel-text/40" />
            <div className="ciel-crossfade-enter absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-ciel-xl bg-white p-5 pb-8 shadow-[0_-12px_30px_-20px_rgba(15,23,42,0.45)]">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-black text-ciel-text">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-10 items-center justify-center rounded-full text-ciel-text-soft hover:bg-ciel-page focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="mt-4 space-y-1">
                    {items.map((item) => {
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={clsx(
                                    "ciel-transition flex items-center gap-3 rounded-ciel-md border px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green",
                                    active
                                        ? "border-ciel-green/40 bg-ciel-green-soft text-ciel-green-deep"
                                        : "border-ciel-border text-ciel-text hover:border-ciel-green/40",
                                )}
                            >
                                <item.icon className="h-4 w-4 shrink-0" />
                                <span className="flex-1 text-sm font-bold">{item.label}</span>
                                {!!item.countPill && item.countPill > 0 && (
                                    <span className="rounded-full bg-ciel-navy/10 px-2 py-0.5 text-[10px] font-bold">
                                        {item.countPill > 99 ? "99+" : item.countPill}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function InvestorPlanCard() {
    const [label, setLabel] = useState("Explorer · Free");
    const [quotaTxt, setQuotaTxt] = useState("0 / 3 intro requests used");
    const [bar, setBar] = useState(0);

    useEffect(() => {
        const read = () => {
            try {
                const raw = localStorage.getItem("ciel_user") || localStorage.getItem("user");
                const u = raw ? (JSON.parse(raw) as { investor?: Record<string, unknown> }) : null;
                const inv = u?.investor && typeof u.investor === "object" ? u.investor : {};
                const planKey = String(inv.plan || "explorer").toLowerCase();
                const plans: Record<string, { name: string; price: string; quota: number | null }> = {
                    explorer: { name: "Explorer", price: "Free", quota: 3 },
                    angel: { name: "Angel", price: "PKR 60,000 / yr", quota: 10 },
                    fund: { name: "Fund", price: "PKR 250,000 / yr", quota: null },
                    institutional: { name: "Institutional Partner", price: "PKR 1,200,000 / yr", quota: null },
                };
                const p = plans[planKey] || plans.explorer;
                setLabel(`${p.name} · ${p.price}`);
                const hub = inv.hub && typeof inv.hub === "object" ? (inv.hub as { intros?: unknown[] }) : {};
                const used = Array.isArray(hub.intros) ? hub.intros.length : 0;
                if (p.quota) {
                    setBar(Math.min(100, (used / p.quota) * 100));
                    setQuotaTxt(`${used} / ${p.quota} intro requests used`);
                } else {
                    setBar(100);
                    setQuotaTxt(`${used} sent · unlimited`);
                }
            } catch {
                /* ignore */
            }
        };
        read();
        window.addEventListener("ciel_user_updated", read);
        return () => window.removeEventListener("ciel_user_updated", read);
    }, []);

    return (
        <div className="mx-3.5 mt-3 rounded-[14px] bg-white/[0.055] p-3.5 text-[11px] leading-[1.55] text-[#a9c2cc]">
            <b className="text-white">{label}</b>
            <div className="mt-1">Intro requests this quarter</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full bg-[#42ddb2]" style={{ width: `${bar}%` }} />
            </div>
            <div className="mt-1.5">{quotaTxt}</div>
        </div>
    );
}

export default function Sidebar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [unreadCount, setUnreadCount] = useState(0);
    const [impactHistoryBadge, setImpactHistoryBadge] = useState(0);
    const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
    const router = useRouter();

    const handleLogout = () => {
        localStorage.removeItem("ciel_user");
        localStorage.removeItem("ciel_token");
        clearStudentDashboardCache();
        clearImpactSummaryCache();
        clearFacultyScopeSession();
        router.push("/login");
    };

    const isMessagesPage =
        /^\/dashboard\/(student|partner|faculty|admin)\/messages$/.test(pathname);

    useEffect(() => {
        if (!isMessagesPage) return;

        const fetchUnreadCount = async () => {
            if (!isTokenValid(localStorage.getItem("ciel_token"))) return;
            try {
                const res = await authenticatedFetch("/api/v1/chat/unread-count", {}, { redirectToLogin: false });
                if (res && res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setUnreadCount(data.data.count);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch unread count", error);
            }
        };

        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, [isMessagesPage]);

    const [navRole, setNavRole] = useState<DashboardNavRole>(() => dashboardNavRoleFromPathname(pathname));

    useLayoutEffect(() => {
        const fromUser = readDashboardNavRoleFromStorage();
        if (fromUser) setNavRole(fromUser);
        else setNavRole(dashboardNavRoleFromPathname(pathname));
    }, [pathname]);

    const isStudent = navRole === "student";
    const isPartner = navRole === "partner";
    const isFaculty = navRole === "faculty";
    const isAdmin = navRole === "admin";
    const isInvestor = navRole === "investor";

    const [partnerMembershipNav, setPartnerMembershipNav] = useState(false);
    useEffect(() => {
        if (!isPartner) {
            setPartnerMembershipNav(false);
            return;
        }
        const read = () => {
            try {
                const raw = localStorage.getItem("ciel_user") || localStorage.getItem("user");
                const u = raw ? (JSON.parse(raw) as { requires_membership_payment?: boolean; account_status?: string }) : null;
                const pending =
                    u?.requires_membership_payment === true ||
                    String(u?.account_status || "").toLowerCase() === "pending_membership_payment";
                setPartnerMembershipNav(Boolean(pending));
            } catch {
                setPartnerMembershipNav(false);
            }
        };
        read();
        window.addEventListener("ciel_user_updated", read);
        return () => window.removeEventListener("ciel_user_updated", read);
    }, [isPartner, pathname]);

    const [isUniversityPartnerOrg, setIsUniversityPartnerOrg] = useState(false);
    const [partnerOrgKind, setPartnerOrgKind] = useState<PartnerOrgKind>("partner");
    useEffect(() => {
        if (!isPartner) {
            setIsUniversityPartnerOrg(false);
            setPartnerOrgKind("partner");
            return;
        }
        const read = () => {
            try {
                const raw = localStorage.getItem("ciel_user") || localStorage.getItem("user");
                const u = raw
                    ? (JSON.parse(raw) as { orgType?: string; organization_type?: string; type?: string; role?: string })
                    : null;
                const kind = readPartnerOrgKind(u);
                setPartnerOrgKind(kind);
                setIsUniversityPartnerOrg(kind === "university");
            } catch {
                setIsUniversityPartnerOrg(false);
                setPartnerOrgKind("partner");
            }
        };
        read();
        window.addEventListener("ciel_user_updated", read);
        return () => window.removeEventListener("ciel_user_updated", read);
    }, [isPartner]);

    const hasInboxNotificationsNav = isStudent || isPartner || isFaculty || isAdmin || isInvestor;

    useEffect(() => {
        if (!hasInboxNotificationsNav) {
            setNotificationUnreadCount(0);
            return;
        }
        const syncFromLs = () => {
            try {
                const raw = localStorage.getItem("ciel_user") || localStorage.getItem("user");
                const u = raw ? JSON.parse(raw) : null;
                if (typeof u?.notifications_count === "number") {
                    setNotificationUnreadCount(u.notifications_count);
                }
            } catch {
                /* ignore */
            }
        };
        syncFromLs();
        const handler = (e: Event) => {
            const ce = e as CustomEvent<CielNotificationsUnreadEventDetail>;
            if (typeof ce.detail?.count === "number") {
                setNotificationUnreadCount(ce.detail.count);
            }
        };
        window.addEventListener(CIEL_NOTIFICATIONS_UNREAD_EVENT, handler);
        window.addEventListener("ciel_user_updated", syncFromLs);
        return () => {
            window.removeEventListener(CIEL_NOTIFICATIONS_UNREAD_EVENT, handler);
            window.removeEventListener("ciel_user_updated", syncFromLs);
        };
    }, [hasInboxNotificationsNav]);

    useEffect(() => {
        if (!isStudent) {
            setImpactHistoryBadge(0);
            return;
        }
        const syncBadge = () => {
            try {
                const data = readStudentDashboardCache();
                const n = data?.overview?.impactHistoryBadgeCount;
                if (typeof n === "number" && n >= 0) setImpactHistoryBadge(n);
                else setImpactHistoryBadge(0);
            } catch {
                setImpactHistoryBadge(0);
            }
        };
        syncBadge();
        window.addEventListener(CIEL_STUDENT_DASHBOARD_CACHE_EVENT, syncBadge);
        return () => window.removeEventListener(CIEL_STUDENT_DASHBOARD_CACHE_EVENT, syncBadge);
    }, [isStudent]);

    const [collapsed, setCollapsed] = useState(false);
    useEffect(() => {
        try {
            setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
        } catch {
            /* ignore */
        }
    }, []);

    const toggleCollapsed = useCallback(() => {
        setCollapsed((prev) => {
            const next = !prev;
            try {
                localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
            } catch {
                /* ignore */
            }
            return next;
        });
    }, []);

    useEffect(() => {
        document.documentElement.style.setProperty("--ciel-sidebar-width", collapsed ? "72px" : "305px");
        return () => {
            document.documentElement.style.setProperty("--ciel-sidebar-width", "305px");
        };
    }, [collapsed]);

    // Starts null (matching the server render) rather than reading the cache synchronously —
    // localStorage isn't available during SSR, so seeding this from the lazy-initializer caused a
    // hydration mismatch (and the resulting thrown error killed interactivity for the whole page)
    // for any returning visitor who already had a cached summary. Read it in the effect below
    // instead, which only runs client-side after hydration completes.
    const [impactSummary, setImpactSummary] = useState<CielImpactSummary | null>(null);
    useEffect(() => {
        setImpactSummary(readImpactSummaryCache());
        if (!isStudent) return;
        fetchImpactSummary({ redirectToLogin: false }).then((data) => {
            if (data) setImpactSummary(data);
        });
        const syncFromCache = () => setImpactSummary(readImpactSummaryCache());
        window.addEventListener(CIEL_IMPACT_SUMMARY_CACHE_EVENT, syncFromCache);
        return () => window.removeEventListener(CIEL_IMPACT_SUMMARY_CACHE_EVENT, syncFromCache);
    }, [isStudent]);

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mobilePathsSheetOpen, setMobilePathsSheetOpen] = useState(false);

    const roleSlug = isStudent ? "student" : isPartner ? "partner" : isFaculty ? "faculty" : isInvestor ? "investor" : "admin";
    const dashboardHref = `/dashboard/${roleSlug}`;
    const settingsHref = `/dashboard/${roleSlug}/settings`;
    const helpHref = isAdmin ? "/dashboard/admin/support" : `/dashboard/${roleSlug}/help`;

    const withCounts = useCallback(
        (items: Omit<NavItem, "countPill">[]): NavItem[] =>
            items.map((item) => ({
                ...item,
                countPill:
                    item.label === "Messages"
                        ? unreadCount
                        : item.label === "Notifications"
                          ? notificationUnreadCount
                          : item.label === "Impact" && isStudent
                            ? impactHistoryBadge
                            : undefined,
            })),
        [unreadCount, notificationUnreadCount, impactHistoryBadge, isStudent],
    );

    const partnerWorkspace = useMemo(
        () =>
            withCounts([
                { label: "My Organization", href: "/dashboard/partner/organization", icon: Building2 },
                ...(partnerMembershipNav
                    ? [{ label: "Membership fee", href: "/dashboard/partner/membership-payment", icon: CreditCard }]
                    : []),
                { label: "My Opportunities", href: "/dashboard/partner/requests", icon: Briefcase },
                // Universities don't author Community Service opportunities directly — faculty
                // representatives create them on the institution's behalf (see the backend's
                // matching guard in OpportunitiesService.create).
                ...(!isUniversityPartnerOrg
                    ? [{ label: "Create Opportunity", href: "/dashboard/partner/requests/new", icon: Plus }]
                    : []),
                { label: "Attendance review", href: "/dashboard/partner/attendance-review", icon: CalendarClock },
                { label: "Verify Work", href: "/dashboard/partner/verification", icon: CheckCircle },
                { label: "Reports", href: "/dashboard/partner/reports", icon: FileText },
                ...(!isUniversityPartnerOrg ? [{ label: "Impact", href: "/dashboard/partner/impact", icon: FileBarChart }] : []),
                ...(!isUniversityPartnerOrg
                    ? [{ label: "Analytics", href: "/dashboard/partner/analytics", icon: BarChart3 }]
                    : []),
            ]),
        [withCounts, partnerMembershipNav, isUniversityPartnerOrg],
    );

    const partnerMore = useMemo(
        () =>
            withCounts([
                { label: "Messages", href: "/dashboard/partner/messages", icon: MessageSquare },
                { label: "Funding", href: "/dashboard/partner/funding", icon: PieChart },
                { label: "Notifications", href: "/dashboard/partner/notifications", icon: Bell },
                { label: "Platform tutorial", href: "/dashboard/partner/tutorials", icon: PlayCircle },
            ]),
        [withCounts],
    );

    const facultyPaths = useMemo(
        () => [
            { label: "Community Service", href: "/dashboard/faculty/community-service", emoji: "⛺" },
            { label: "Coursework Project", href: "/dashboard/faculty/coursework-projects", emoji: "📚" },
            { label: "Final Year Project (FYP)", href: "/dashboard/faculty/fyp-thesis", emoji: "🎓" },
            { label: "Startup / Business", href: "/dashboard/faculty/startup-business", emoji: "💼" },
        ],
        [],
    );

    const facultyWorkspace = useMemo(
        () =>
            withCounts([
                // { label: "Opportunity Request Approvals", href: "/dashboard/faculty/approvals", icon: CheckCircle },
                { label: "Applications & Reports Approvals", href: "/dashboard/faculty/join-applications", icon: ClipboardList },
                // { label: "Student impact reports", href: "/dashboard/faculty/reports", icon: FileText },
                { label: "Attendance review", href: "/dashboard/faculty/attendance-review", icon: CalendarClock },
                // { label: "My Opportunities", href: "/dashboard/faculty/my-opportunities", icon: Briefcase },
            ]),
        [withCounts],
    );

    const facultyMore = useMemo(
        () =>
            withCounts([
                { label: "Analytics", href: "/dashboard/faculty/analytics", icon: BarChart3 },
                { label: "Messages", href: "/dashboard/faculty/messages", icon: MessageSquare },
                { label: "Notifications", href: "/dashboard/faculty/notifications", icon: Bell },
                { label: "Platform tutorial", href: "/dashboard/faculty/tutorials", icon: PlayCircle },
            ]),
        [withCounts],
    );

    const universityPaths = useMemo(
        () => [
            { label: "Community Service", href: "/dashboard/partner/community-service", emoji: "🏕️" },
            { label: "Coursework", href: "/dashboard/partner/university-showcase?mode=course-project", emoji: "📚" },
            { label: "Final Year Project (FYP)", href: "/dashboard/partner/university-showcase?mode=fyp-thesis", emoji: "🎓" },
            { label: "Startup / Venture", href: "/dashboard/partner/startup-business", emoji: "🚀" },
        ],
        [],
    );

    const ngoPaths = useMemo(
        () => [{ label: "Community Service", href: "/dashboard/partner/community-service", emoji: "🌱" }],
        [],
    );

    const adminPaths = useMemo(
        () => [
            { label: "Community Service", href: "/dashboard/admin/community-service", emoji: "🏕️" },
            { label: "Coursework", href: "/dashboard/admin/path-submissions?tab=course-project", emoji: "📚" },
            { label: "Final Year Project (FYP)", href: "/dashboard/admin/path-submissions?tab=fyp-thesis", emoji: "🎓" },
            { label: "Startup / Venture", href: "/dashboard/admin/startup-business", emoji: "🚀" },
        ],
        [],
    );

    const adminWorkspace = useMemo(
        () =>
            withCounts([
                { label: "Users", href: "/dashboard/admin/users", icon: Users },
                { label: "Organizations", href: "/dashboard/admin/organizations", icon: Building2 },
                { label: "Faculty ↔ University scope", href: "/dashboard/admin/faculty-university-scope", icon: Link2 },
                { label: "Org membership fees", href: "/dashboard/admin/org-membership", icon: CreditCard },
                { label: "Opportunity Request Approvals", href: "/dashboard/admin/approvals", icon: CheckCircle },
                { label: "Applications & Reports Approvals", href: "/dashboard/admin/join-applications", icon: ClipboardList },
                { label: "Payments", href: "/dashboard/admin/payments", icon: CreditCard },
                { label: "All projects", href: "/dashboard/admin/projects", icon: Briefcase },
                { label: "Path submissions", href: "/dashboard/admin/path-submissions", icon: BookOpen },
                { label: "Community service", href: "/dashboard/admin/community-service", icon: Globe2 },
                { label: "Project evidence export", href: "/dashboard/admin/project-evidence", icon: Archive },
                { label: "Student Reports", href: "/dashboard/admin/reports/verify", icon: FileText },
            ]),
        [withCounts],
    );

    const adminMore = useMemo(
        () =>
            withCounts([
                { label: "CIEL Master", href: "/dashboard/admin/master-analytics", icon: Globe2 },
                { label: "Messages", href: "/dashboard/admin/messages", icon: MessageSquare },
                { label: "Notifications", href: "/dashboard/admin/notifications", icon: Bell },
                { label: "Platform tutorial", href: "/dashboard/admin/tutorials", icon: PlayCircle },
                { label: "Send email", href: "/dashboard/admin/email", icon: Mail },
                { label: "CEP feedback", href: "/dashboard/admin/cep-feedback", icon: MessageSquare },
                { label: "Audit Logs", href: "/dashboard/admin/audit-logs", icon: History },
                { label: "Issue Logs", href: "/dashboard/admin/issue-logs", icon: ShieldAlert },
            ]),
        [withCounts],
    );

    const investorPaths = useMemo(
        () => [
            { label: "Overview", href: "/dashboard/investor?view=overview", emoji: "⌂" },
            { label: "Inbox & Messages", href: "/dashboard/investor?view=inbox", emoji: "✉" },
            { label: "Discover Ventures", href: "/dashboard/investor?view=discover", emoji: "🚀" },
            { label: "AI Deal Match", href: "/dashboard/investor?view=match", emoji: "✦" },
            { label: "My Pipeline", href: "/dashboard/investor?view=pipeline", emoji: "⭐" },
            { label: "Diligence Rooms", href: "/dashboard/investor?view=diligence", emoji: "🔐" },
            { label: "Deal Outcomes", href: "/dashboard/investor?view=outcomes", emoji: "🏁" },
            { label: "Reports, Seats & API", href: "/dashboard/investor?view=reports", emoji: "📑" },
            { label: "Membership & Billing", href: "/dashboard/investor?view=membership", emoji: "◈" },
            { label: "Agreements & Protection", href: "/dashboard/investor?view=agreements", emoji: "🛡" },
            { label: "My Activity Log", href: "/dashboard/investor?view=activity", emoji: "≡" },
            { label: "Pipeline Impact", href: "/dashboard/investor?view=impact", emoji: "◎" },
            { label: "Investor Profile", href: "/dashboard/investor?view=profile", emoji: "🏢" },
        ],
        [],
    );

    const investorDash = investorPaths.slice(0, 2);
    const investorDealFlow = investorPaths.slice(2, 8);
    const investorCielYou = investorPaths.slice(8);

    const investorWorkspace = useMemo(() => withCounts([]), [withCounts]);

    const workspaceLinks = isPartner ? partnerWorkspace : isFaculty ? facultyWorkspace : isAdmin ? adminWorkspace : isInvestor ? investorWorkspace : [];
    const moreLinksRole = isPartner ? partnerMore : isFaculty ? facultyMore : isAdmin ? adminMore : [];
    const rolePaths = isFaculty
        ? facultyPaths
        : isPartner && isUniversityPartnerOrg
          ? universityPaths
          : isPartner
            ? ngoPaths
          : isAdmin
            ? adminPaths
            : isInvestor
              ? investorPaths
              : [];
    const impactHref = isFaculty
        ? "/dashboard/faculty/impact"
        : isPartner && isUniversityPartnerOrg
          ? "/dashboard/partner/impact"
          : isAdmin
            ? "/dashboard/admin/analytics"
            : null;
    const impactLabel = isAdmin ? "Impact Intelligence Hub" : isPartner && isUniversityPartnerOrg ? "University Impact Portfolio" : "My Impact Wall";
    const impactEmoji = isAdmin ? "📊" : isPartner && isUniversityPartnerOrg ? "🏆" : "🏅";

    const footerLinks = useMemo(() => {
        const items: NavItem[] = [];
        if (isFaculty) items.push({ label: "My Profile", href: "/dashboard/faculty/profile", icon: User });
        items.push({ label: "Settings", href: settingsHref, icon: Settings });
        items.push({
            label: isInvestor ? "Help & Deal Desk" : "Help",
            href: isInvestor ? "/dashboard/investor?view=agreements" : helpHref,
            icon: HelpCircle,
        });
        return items;
    }, [isFaculty, isInvestor, settingsHref, helpHref]);

    const allRoleHrefs = useMemo(
        () => [
            dashboardHref,
            ...rolePaths.map((l) => l.href),
            ...(impactHref ? [impactHref] : []),
            ...workspaceLinks.map((l) => l.href),
            ...moreLinksRole.map((l) => l.href),
            ...footerLinks.map((l) => l.href),
        ],
        [dashboardHref, rolePaths, impactHref, workspaceLinks, moreLinksRole, footerLinks],
    );

    const isNavActive = (href: string) => {
        const [hrefPath, hrefQuery] = href.split("?");
        const hrefParams = hrefQuery ? new URLSearchParams(hrefQuery) : null;
        const hrefTab = hrefParams?.get("tab");
        const hrefMode = hrefParams?.get("mode");
        const hrefArea = hrefParams?.get("area");
        const hrefView = hrefParams?.get("view");
        if (hrefArea) {
            return pathname === hrefPath && searchParams.get("area") === hrefArea;
        }
        if (hrefView) {
            if (isInvestor) {
                const v = searchParams.get("view") || "";
                const aliases: Record<string, string[]> = {
                    overview: ["overview", "home", ""],
                    discover: ["discover", "showcase"],
                    match: ["match", "rankings", "rank"],
                    pipeline: ["pipeline", "saved"],
                };
                const list = aliases[hrefView];
                if (list) return pathname === hrefPath && list.includes(v);
            }
            return pathname === hrefPath && (!hrefTab || searchParams.get("tab") === hrefTab) && searchParams.get("view") === hrefView;
        }
        if (hrefTab) {
            if (hrefTab === "fyp-thesis" && searchParams.get("view") === "faculty-work") return false;
            return pathname === hrefPath && searchParams.get("tab") === hrefTab;
        }
        if (hrefMode) {
            return pathname === hrefPath && searchParams.get("mode") === hrefMode;
        }
        if (hrefPath === dashboardHref) return pathname === hrefPath;
        if (hrefPath === "/dashboard/student/payments" && pathname === "/dashboard/student/payment") return true;
        if (hrefPath === "/dashboard/student/impact" && pathname.startsWith("/dashboard/student/analytics")) return true;
        if (hrefPath === "/dashboard/student/paths/community-service" && pathname.startsWith("/dashboard/student/create-opportunity")) return true;
        if (hrefPath === "/dashboard/student/paths/community-service" && pathname.startsWith("/dashboard/student/browse")) return true;
        if (
            hrefPath === "/dashboard/faculty/community-service" &&
            (pathname.startsWith("/dashboard/faculty/create-opportunity") ||
                pathname.startsWith("/dashboard/faculty/my-opportunities") ||
                pathname.startsWith("/dashboard/faculty/approvals") ||
                pathname.startsWith("/dashboard/faculty/join-applications") ||
                pathname.startsWith("/dashboard/faculty/reports") ||
                pathname.startsWith("/dashboard/faculty/attendance-review"))
        ) {
            return true;
        }
        if (
            hrefPath === "/dashboard/partner/community-service" &&
            !isUniversityPartnerOrg &&
            (pathname.startsWith("/dashboard/partner/requests") ||
                pathname.startsWith("/dashboard/partner/verify") ||
                pathname.startsWith("/dashboard/partner/verification") ||
                pathname.startsWith("/dashboard/partner/reports") ||
                pathname.startsWith("/dashboard/partner/attendance-review"))
        ) {
            return true;
        }
        if (pathname === hrefPath) return true;
        const longerChild = allRoleHrefs.some(
            (other) => other !== hrefPath && other.startsWith(`${hrefPath}/`) && (pathname === other || pathname.startsWith(`${other}/`)),
        );
        if (longerChild) return false;
        return pathname.startsWith(`${hrefPath}/`);
    };

    const studentMoreLinks = withCounts([
        { label: "Impact", href: "/dashboard/student/impact", icon: PieChart },
        { label: "Payments", href: "/dashboard/student/payments", icon: CreditCard },
        { label: "Messages", href: "/dashboard/student/messages", icon: MessageSquare },
        { label: "Notifications", href: "/dashboard/student/notifications", icon: Bell },
        { label: "Platform tutorial", href: "/dashboard/student/tutorials", icon: PlayCircle },
    ]);

    const mobilePrimary =
        isFaculty
            ? { label: "Profile", href: "/dashboard/faculty/profile", icon: User }
            : isPartner
              ? { label: "Organization", href: "/dashboard/partner/organization", icon: Building2 }
              : isInvestor
                ? { label: "Profile", href: "/dashboard/investor?view=profile", icon: Building2 }
              : { label: "Settings", href: settingsHref, icon: Settings };

    const mobileMenuItems = [
        ...rolePaths.map((p) => ({ label: p.label, href: p.href, icon: BookOpen })),
        ...(impactHref ? [{ label: impactLabel, href: impactHref, icon: FileBarChart }] : []),
        ...(isAdmin
            ? [{ label: "Faculty Work · All Universities", href: "/dashboard/admin/path-submissions?tab=fyp-thesis&view=faculty-work", icon: BookOpen }]
            : []),
        ...workspaceLinks,
        ...moreLinksRole,
        ...footerLinks,
    ];

    return (
        <>
        <aside
            className={clsx(
                "fixed left-0 top-0 z-40 hidden h-screen max-h-[100dvh] flex-col text-white lg:flex ciel-transition",
                collapsed ? "w-[72px]" : "w-[305px]",
            )}
            style={{ background: "linear-gradient(180deg,#133747,#0f2d3a)" }}
        >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-[18px] py-5">
                <Link href="/" className="flex min-w-0 items-center gap-3.5">
                    <div className="relative grid h-[62px] w-[62px] shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/5 bg-white/[0.06] p-1">
                        <img src="/iel-pk-logo.png" alt="IEL PK" className="h-11 w-11 object-contain" width={44} height={44} />
                    </div>
                    {!collapsed && (
                        <div className="flex min-w-0 flex-col">
                            <span className="text-[15px] font-bold leading-[1.25] text-white">
                                Community Impact <br /> Education Lab
                            </span>
                            <span className="mt-1 text-[11px] tracking-wide text-[#7ed0e4]">
                                {isFaculty
                                    ? "Faculty Impact Dashboard"
                                    : isUniversityPartnerOrg
                                      ? "University Dashboard"
                                      : isStudent
                                        ? "Student Impact Dashboard"
                                        : isInvestor
                                          ? "CIEL Investor Hub"
                                          : isAdmin
                                            ? "Youth Empowered Community Impact"
                                            : isPartner
                                              ? partnerOrgKind === "ngo"
                                                ? "NGO / Nonprofit"
                                                : "Partner Organization"
                                            : "Youth Empowered Community Impact"}
                            </span>
                        </div>
                    )}
                </Link>
                <button
                    type="button"
                    onClick={toggleCollapsed}
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    className="ciel-transition flex h-8 w-8 shrink-0 items-center justify-center rounded-ciel-xs text-white/50 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green"
                >
                    {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
                </button>
            </div>

            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain py-2">
                {isInvestor ? (
                    <>
                        <NavSectionLabel collapsed={collapsed}>My Dashboard</NavSectionLabel>
                        {investorDash.map((link) => (
                            <NavRow
                                key={link.href}
                                href={link.href}
                                label={link.label}
                                emoji={link.emoji}
                                active={isNavActive(link.href)}
                                collapsed={collapsed}
                            />
                        ))}
                        <NavSectionLabel collapsed={collapsed}>Deal Flow</NavSectionLabel>
                        {investorDealFlow.map((link) => (
                            <NavRow
                                key={link.href}
                                href={link.href}
                                label={link.label}
                                emoji={link.emoji}
                                active={isNavActive(link.href)}
                                collapsed={collapsed}
                            />
                        ))}
                        <NavSectionLabel collapsed={collapsed}>CIEL & You</NavSectionLabel>
                        {investorCielYou.map((link) => (
                            <NavRow
                                key={link.href}
                                href={link.href}
                                label={link.label}
                                emoji={link.emoji}
                                active={isNavActive(link.href)}
                                collapsed={collapsed}
                            />
                        ))}
                        {!collapsed && <InvestorPlanCard />}
                    </>
                ) : isStudent ? (
                    <>
                        <NavSectionLabel collapsed={collapsed}>My Dashboard</NavSectionLabel>
                        <NavRow href={dashboardHref} label="Dashboard" emoji="🏠" active={pathname === dashboardHref} collapsed={collapsed} />
                        <NavSectionLabel collapsed={collapsed}>My Impact Areas</NavSectionLabel>
                        {CIEL_PATHS.map((path) => (
                            <NavRow
                                key={path.key}
                                href={path.href}
                                label={path.label}
                                emoji={path.emoji}
                                active={isNavActive(path.href)}
                                needsAction={impactSummary?.pathsStatus?.[path.key]?.needsAction}
                                countPill={path.key === "communityService" ? impactSummary?.activeEngagements : undefined}
                                collapsed={collapsed}
                            />
                        ))}
                        {!collapsed && <div className="mx-0 my-4 border-t border-white/[0.09]" />}
                        <NavSectionLabel collapsed={collapsed}>My Portfolio</NavSectionLabel>
                        <NavRow
                            href="/dashboard/student/impact"
                            label="My Impact Portfolio"
                            emoji="🏆"
                            active={isNavActive("/dashboard/student/impact") && !searchParams.get("area")}
                            countPill={impactHistoryBadge}
                            collapsed={collapsed}
                        />
                        {!collapsed &&
                            [
                                { label: "Community Service", area: "Community Service", emoji: "🏕️" },
                                { label: "Coursework", area: "Coursework", emoji: "📚" },
                                { label: "FYP", area: "FYP", emoji: "🎓" },
                                { label: "Startup", area: "Startup", emoji: "💼" },
                            ].map((sub) => (
                                <NavRow
                                    key={sub.area}
                                    href={`/dashboard/student/impact?area=${encodeURIComponent(sub.area)}`}
                                    label={sub.label}
                                    emoji={sub.emoji}
                                    active={isNavActive(`/dashboard/student/impact?area=${encodeURIComponent(sub.area)}`)}
                                    collapsed={collapsed}
                                    indent
                                />
                            ))}
                        <NavSectionLabel collapsed={collapsed}>More</NavSectionLabel>
                        {studentMoreLinks.filter((link) => link.href !== "/dashboard/student/impact").map((link) => (
                            <NavRow
                                key={link.href}
                                href={link.href}
                                label={link.label}
                                icon={link.icon}
                                active={isNavActive(link.href)}
                                countPill={link.countPill}
                                collapsed={collapsed}
                            />
                        ))}
                        {!collapsed && (
                            <div className="mx-3.5 mt-[18px] rounded-[14px] bg-white/[0.055] p-3.5 text-[11px] leading-[1.55] text-[#a9c2cc]">
                                <b className="text-white">Tip</b>
                                <br />
                                Open the Guidance card in each area before starting. Your draft saves automatically as you work.
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <NavSectionLabel collapsed={collapsed}>
                            {isUniversityPartnerOrg ? "University" : isFaculty ? "My Paths" : isAdmin ? "Super Admin" : isInvestor ? "CIEL Investor Hub" : isPartner ? "Organization dashboard" : "Dashboard"}
                        </NavSectionLabel>
                        <NavRow href={dashboardHref} label={isFaculty ? "Overview" : isUniversityPartnerOrg || isAdmin ? "Overview" : isInvestor ? "Home" : isPartner ? "Home" : "Dashboard"} emoji="🏠" active={pathname === dashboardHref} collapsed={collapsed} />
                        {rolePaths.length > 0 ? (
                            <>
                                <NavSectionLabel collapsed={collapsed}>
                                    {isFaculty ? "Impact Areas" : isInvestor ? "Deal Flow" : "Impact Areas"}
                                </NavSectionLabel>
                                {rolePaths.map((link) => (
                                    <NavRow
                                        key={link.href}
                                        href={link.href}
                                        label={link.label}
                                        emoji={link.emoji}
                                        active={isNavActive(link.href)}
                                        collapsed={collapsed}
                                    />
                                ))}
                                {impactHref && isFaculty ? (
                                    <>
                                        <NavRow
                                            href={impactHref}
                                            label={impactLabel}
                                            emoji={impactEmoji}
                                            active={isNavActive(impactHref)}
                                            collapsed={collapsed}
                                            impact
                                        />
                                        {!collapsed && (
                                            <p className="mb-4 ml-14 mt-1 text-[10px] leading-snug text-[#7fa2b0]">
                                                One Faculty Impact Wall combining approved Community Service, Coursework, FYP / Thesis and Startup / Business impact.
                                            </p>
                                        )}
                                    </>
                                ) : null}
                                {impactHref && !isFaculty ? (
                                    <>
                                        {!collapsed && <div className="mx-0 my-4 border-t border-white/[0.09]" />}
                                        <NavSectionLabel collapsed={collapsed}>
                                            {isAdmin ? "Intelligence" : "Institutional Impact"}
                                        </NavSectionLabel>
                                        <NavRow
                                            href={impactHref}
                                            label={impactLabel}
                                            emoji={impactEmoji}
                                            active={isNavActive(impactHref)}
                                            collapsed={collapsed}
                                            impact
                                        />
                                        {isAdmin ? (
                                            <NavRow
                                                href="/dashboard/admin/path-submissions?tab=fyp-thesis&view=faculty-work"
                                                label="Faculty Work · All Universities"
                                                emoji="🧑‍🏫"
                                                active={isNavActive("/dashboard/admin/path-submissions?tab=fyp-thesis&view=faculty-work")}
                                                collapsed={collapsed}
                                            />
                                        ) : null}
                                        {isUniversityPartnerOrg ? (
                                            <NavRow
                                                href="/dashboard/partner/university-analytics"
                                                label="Overall Impact Analytics"
                                                emoji="📊"
                                                active={isNavActive("/dashboard/partner/university-analytics")}
                                                collapsed={collapsed}
                                            />
                                        ) : null}
                                        {!collapsed && isUniversityPartnerOrg && (
                                            <div className="mx-3.5 mt-2 rounded-[14px] bg-white/[0.055] p-3.5 text-[11px] leading-[1.55] text-[#a9c2cc]">
                                                <b className="text-white">University View</b>
                                                <br />
                                                Approved faculty work from all departments flows automatically into the relevant impact wall. Analytics access is controlled by CIEL PK subscription.
                                            </div>
                                        )}
                                        {!collapsed && isAdmin && (
                                            <div className="mx-3.5 mt-2 rounded-[14px] bg-white/[0.055] p-3.5 text-[11px] leading-[1.55] text-[#a9c2cc]">
                                                <b className="text-white">Super Admin rule</b>
                                                <br />
                                                Wherever a student, faculty member, partner or reviewer is holding the workflow, show Email + WhatsApp reminder actions on that exact record.
                                            </div>
                                        )}
                                    </>
                                ) : null}
                            </>
                        ) : null}
                        <NavSectionLabel collapsed={collapsed}>{isInvestor ? "Organisation" : "Workspace"}</NavSectionLabel>
                        {workspaceLinks.map((link) => (
                            <NavRow
                                key={link.href}
                                href={link.href}
                                label={link.label}
                                icon={link.icon}
                                active={isNavActive(link.href)}
                                countPill={link.countPill}
                                collapsed={collapsed}
                            />
                        ))}
                        <NavSectionLabel collapsed={collapsed}>More</NavSectionLabel>
                        {moreLinksRole.map((link) => (
                            <NavRow
                                key={link.href}
                                href={link.href}
                                label={link.label}
                                icon={link.icon}
                                active={isNavActive(link.href)}
                                countPill={link.countPill}
                                collapsed={collapsed}
                            />
                        ))}
                    </>
                )}
            </div>

            <div className="shrink-0 space-y-1 border-t border-white/10 p-3">
                {isStudent ? (
                    <>
                        <NavRow href="/dashboard/student/settings" label="Settings" icon={Settings} active={isNavActive("/dashboard/student/settings")} collapsed={collapsed} />
                        <NavRow href="/dashboard/student/help" label="Help" icon={HelpCircle} active={isNavActive("/dashboard/student/help")} collapsed={collapsed} />
                    </>
                ) : (
                    footerLinks.map((link) => (
                        <NavRow
                            key={link.href}
                            href={link.href}
                            label={link.label}
                            icon={link.icon}
                            active={isNavActive(link.href)}
                            collapsed={collapsed}
                        />
                    ))
                )}
                <button
                    type="button"
                    onClick={handleLogout}
                    className={clsx(
                        "flex w-full items-center gap-3 rounded-ciel-sm px-3 py-2.5 text-sm font-semibold text-white/60 hover:bg-white/5 hover:text-white ciel-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green",
                        collapsed && "justify-center px-0",
                    )}
                >
                    <LogOut className="h-4 w-4 shrink-0" />
                    {!collapsed && "Sign out"}
                </button>
            </div>
        </aside>

        {isStudent ? (
            <>
                <nav
                    className="fixed inset-x-0 bottom-0 z-50 border-t border-ciel-border bg-white/95 px-3 py-2 shadow-[0_-12px_30px_-20px_rgba(15,23,42,0.45)] backdrop-blur lg:hidden"
                    aria-label="Dashboard navigation"
                >
                    <div className="flex items-stretch justify-between gap-1">
                        {[
                            { label: "Dashboard", href: "/dashboard/student", icon: LayoutDashboard },
                            { label: "Paths", href: "#paths", icon: Compass, isPathsTrigger: true },
                            { label: "Profile", href: "/dashboard/student/profile", icon: User },
                        ].map((item) => {
                            const active = !item.isPathsTrigger && isNavActive(item.href);
                            const commonClass = clsx(
                                "relative flex flex-1 flex-col items-center justify-center gap-1 rounded-ciel-md px-2 py-2 text-[10px] font-bold ciel-transition",
                                active ? "bg-ciel-green-soft text-ciel-green-deep" : "text-ciel-text-mid hover:bg-ciel-page",
                            );
                            if (item.isPathsTrigger) {
                                return (
                                    <button
                                        key={item.label}
                                        type="button"
                                        onClick={() => setMobilePathsSheetOpen(true)}
                                        className={commonClass}
                                    >
                                        <item.icon className="h-5 w-5" />
                                        <span>{item.label}</span>
                                    </button>
                                );
                            }
                            return (
                                <Link key={item.label} href={item.href} className={commonClass}>
                                    <item.icon className="h-5 w-5" />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </nav>
                <PathsBottomSheet
                    open={mobilePathsSheetOpen}
                    onClose={() => setMobilePathsSheetOpen(false)}
                    pathsStatus={impactSummary?.pathsStatus}
                />
            </>
        ) : (
            <>
                <nav
                    className="fixed inset-x-0 bottom-0 z-50 border-t border-ciel-border bg-white/95 px-3 py-2 shadow-[0_-12px_30px_-20px_rgba(15,23,42,0.45)] backdrop-blur lg:hidden"
                    aria-label="Dashboard navigation"
                >
                    <div className="flex items-stretch justify-between gap-1">
                        <Link
                            href={dashboardHref}
                            className={clsx(
                                "relative flex flex-1 flex-col items-center justify-center gap-1 rounded-ciel-md px-2 py-2 text-[10px] font-bold ciel-transition",
                                pathname === dashboardHref ? "bg-ciel-green-soft text-ciel-green-deep" : "text-ciel-text-mid hover:bg-ciel-page",
                            )}
                        >
                            <LayoutDashboard className="h-5 w-5" />
                            <span>Dashboard</span>
                        </Link>
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(true)}
                            className={clsx(
                                "relative flex flex-1 flex-col items-center justify-center gap-1 rounded-ciel-md px-2 py-2 text-[10px] font-bold ciel-transition",
                                mobileMenuOpen ? "bg-ciel-green-soft text-ciel-green-deep" : "text-ciel-text-mid hover:bg-ciel-page",
                            )}
                        >
                            <Compass className="h-5 w-5" />
                            <span>Menu</span>
                        </button>
                        <Link
                            href={mobilePrimary.href}
                            className={clsx(
                                "relative flex flex-1 flex-col items-center justify-center gap-1 rounded-ciel-md px-2 py-2 text-[10px] font-bold ciel-transition",
                                isNavActive(mobilePrimary.href) ? "bg-ciel-green-soft text-ciel-green-deep" : "text-ciel-text-mid hover:bg-ciel-page",
                            )}
                        >
                            <mobilePrimary.icon className="h-5 w-5" />
                            <span>{mobilePrimary.label}</span>
                        </Link>
                    </div>
                </nav>
                <RoleMenuSheet
                    open={mobileMenuOpen}
                    onClose={() => setMobileMenuOpen(false)}
                    title={isInvestor ? "Investor Hub" : isUniversityPartnerOrg ? "University menu" : isPartner ? "Partner menu" : isFaculty ? "Faculty menu" : "Admin menu"}
                    items={mobileMenuItems}
                    isActive={isNavActive}
                />
            </>
        )}
        </>
    );
}
