"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useLayoutEffect, useCallback, type ComponentType } from "react";
import { LayoutDashboard, Users, Settings, PieChart, LogOut, FileText, Building2, CheckCircle, Briefcase, FileBarChart, ShieldAlert, BarChart3, History, Bell, User, MessageSquare, Plus, CreditCard, ClipboardList, CalendarClock, LifeBuoy, Link2, GraduationCap, Globe2, PlayCircle, Mail, Archive, LayoutGrid, Clock, ChevronsLeft, ChevronsRight, Compass, HelpCircle, BookOpen, type LucideProps } from "lucide-react";
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

function StudentNavRow({
    href,
    label,
    icon: Icon,
    emoji,
    active,
    needsAction,
    countPill,
    collapsed,
}: {
    href: string;
    label: string;
    icon?: ComponentType<LucideProps>;
    emoji?: string;
    active: boolean;
    needsAction?: boolean;
    countPill?: number;
    collapsed: boolean;
}) {
    return (
        <Link
            href={href}
            className={clsx(
                "ciel-transition relative flex items-center gap-3 rounded-ciel-sm px-3 py-2.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green",
                active ? "bg-ciel-green/15 text-white" : "text-white/60 hover:bg-white/5 hover:text-white",
                collapsed && "justify-center px-0",
            )}
            title={collapsed ? label : undefined}
        >
            {active && <span className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-ciel-green" aria-hidden />}
            {emoji ? <span className="text-base leading-none" aria-hidden>{emoji}</span> : Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
            {!collapsed && <span className="flex-1 truncate">{label}</span>}
            {!collapsed && needsAction && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ciel-amber" aria-label="Needs action" />}
            {!collapsed && !!countPill && countPill > 0 && (
                <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white">{countPill > 99 ? "99+" : countPill}</span>
            )}
        </Link>
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
        const interval = setInterval(fetchUnreadCount, 30000); // Check every 30s
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
    useEffect(() => {
        if (!isPartner) {
            setIsUniversityPartnerOrg(false);
            return;
        }
        const read = () => {
            try {
                const raw = localStorage.getItem("ciel_user") || localStorage.getItem("user");
                const u = raw
                    ? (JSON.parse(raw) as { orgType?: string; organization_type?: string; type?: string })
                    : null;
                const t = String(u?.orgType || u?.organization_type || u?.type || "").toLowerCase();
                setIsUniversityPartnerOrg(t.includes("university"));
            } catch {
                setIsUniversityPartnerOrg(false);
            }
        };
        read();
        window.addEventListener("ciel_user_updated", read);
        return () => window.removeEventListener("ciel_user_updated", read);
    }, [isPartner]);

    const hasInboxNotificationsNav = isStudent || isPartner || isFaculty || isAdmin;

    /**
     * Notification unread count: fetched once on login; sidebar mirrors localStorage + `CIEL_NOTIFICATIONS_UNREAD_EVENT`.
     */
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

    // ---- Student-only: collapse, impact summary, opportunities count, avatar ----

    const [collapsed, setCollapsed] = useState(false);
    useEffect(() => {
        if (!isStudent) return;
        try {
            setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
        } catch {
            /* ignore */
        }
    }, [isStudent]);

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

    /** Drives `main`'s `lg:ml-[var(--ciel-sidebar-width)]` offset in `dashboard/layout.tsx` without a client layout. */
    useEffect(() => {
        if (!isStudent) return;
        document.documentElement.style.setProperty("--ciel-sidebar-width", collapsed ? "72px" : "16rem");
        return () => {
            document.documentElement.style.setProperty("--ciel-sidebar-width", "16rem");
        };
    }, [isStudent, collapsed]);

    const [impactSummary, setImpactSummary] = useState<CielImpactSummary | null>(() => readImpactSummaryCache());
    useEffect(() => {
        if (!isStudent) return;
        fetchImpactSummary({ redirectToLogin: false }).then((data) => {
            if (data) setImpactSummary(data);
        });
        const syncFromCache = () => setImpactSummary(readImpactSummaryCache());
        window.addEventListener(CIEL_IMPACT_SUMMARY_CACHE_EVENT, syncFromCache);
        return () => window.removeEventListener(CIEL_IMPACT_SUMMARY_CACHE_EVENT, syncFromCache);
    }, [isStudent]);

    const [recommendedCount, setRecommendedCount] = useState(0);
    useEffect(() => {
        if (!isStudent) return;
        authenticatedFetch("/api/v1/students/opportunities/recommended", {}, { redirectToLogin: false })
            .then((res) => (res?.ok ? res.json() : null))
            .then((result) => {
                const list = Array.isArray(result?.data) ? result.data : [];
                setRecommendedCount(list.length);
            })
            .catch(() => setRecommendedCount(0));
    }, [isStudent]);

    const [mobilePathsSheetOpen, setMobilePathsSheetOpen] = useState(false);

    // Helper icons import
    function FolderOpen(props: LucideProps) { return <FileText {...props} /> }
    function Globe(props: LucideProps) { return <Building2 {...props} /> }

    const roleLinks = [
        // Student
        ...(isStudent ? [
            { label: "My Projects", href: "/dashboard/student/projects", icon: FolderOpen },
            { label: "Browse Opportunities", href: "/dashboard/student/browse", icon: Globe },
            { label: "Create Opportunity", href: "/dashboard/student/create-opportunity", icon: Plus },
            { label: "Impact History", href: "/dashboard/student/impact", icon: PieChart },
            { label: "Analytics", href: "/dashboard/student/analytics", icon: BarChart3 },
            { label: "Payments", href: "/dashboard/student/payments", icon: CreditCard },
            { label: "Messages", href: "/dashboard/student/messages", icon: MessageSquare },
            { label: "Notifications", href: "/dashboard/student/notifications", icon: Bell },
            { label: "Platform tutorial", href: "/dashboard/student/tutorials", icon: PlayCircle },
            { label: "Help & Support", href: "/dashboard/student/help", icon: LifeBuoy },
            { label: "My Profile", href: "/dashboard/student/profile", icon: User },
        ] : []),
        // Partner
        ...(isPartner ? [
            { label: "My Organization", href: "/dashboard/partner/organization", icon: Building2 },
            ...(partnerMembershipNav
                ? [{ label: "Membership fee", href: "/dashboard/partner/membership-payment", icon: CreditCard }]
                : []),
            { label: "My Opportunities", href: "/dashboard/partner/requests", icon: Briefcase },
            { label: "Create Opportunity", href: "/dashboard/partner/requests/new", icon: Plus },
            { label: "Attendance review", href: "/dashboard/partner/attendance-review", icon: CalendarClock },
            { label: "Verify Work", href: "/dashboard/partner/verification", icon: CheckCircle },
            { label: "Reports", href: "/dashboard/partner/reports", icon: FileText },
            { label: "Impact", href: "/dashboard/partner/impact", icon: FileBarChart },
            { label: "Analytics", href: "/dashboard/partner/analytics", icon: BarChart3 },
            ...(isUniversityPartnerOrg
                ? [{ label: "Institution analytics", href: "/dashboard/partner/university-analytics", icon: GraduationCap }]
                : []),
            { label: "Messages", href: "/dashboard/partner/messages", icon: MessageSquare },
            { label: "Funding", href: "/dashboard/partner/funding", icon: PieChart },
            { label: "Notifications", href: "/dashboard/partner/notifications", icon: Bell },
            { label: "Platform tutorial", href: "/dashboard/partner/tutorials", icon: PlayCircle },
            { label: "Help & Support", href: "/dashboard/partner/help", icon: LifeBuoy },
        ] : []),
        // Faculty
        ...(isFaculty ? [
            // { label: "My Courses", href: "/dashboard/faculty/courses", icon: BookOpen },
            { label: "My Profile", href: "/dashboard/faculty/profile", icon: User },
            { label: "Opportunity Request Approvals", href: "/dashboard/faculty/approvals", icon: CheckCircle },
            { label: "Applications & Reports Approvals", href: "/dashboard/faculty/join-applications", icon: ClipboardList },
            { label: "Student impact reports", href: "/dashboard/faculty/reports", icon: FileText },
            { label: "Coursework reports", href: "/dashboard/faculty/coursework-projects", icon: BookOpen },
            { label: "Attendance review", href: "/dashboard/faculty/attendance-review", icon: CalendarClock },
            { label: "My Opportunities", href: "/dashboard/faculty/my-opportunities", icon: Briefcase },
            { label: "Create Opportunity", href: "/dashboard/faculty/create-opportunity", icon: Plus },
            // { label: "Student Grading", href: "/dashboard/faculty/grading", icon: FileText },
            { label: "Messages", href: "/dashboard/faculty/messages", icon: MessageSquare },
            { label: "Notifications", href: "/dashboard/faculty/notifications", icon: Bell },
            { label: "Platform tutorial", href: "/dashboard/faculty/tutorials", icon: PlayCircle },
            { label: "Analytics", href: "/dashboard/faculty/analytics", icon: BarChart3 },
            { label: "Help & Support", href: "/dashboard/faculty/help", icon: LifeBuoy },
        ] : []),
        // Admin
        ...(isAdmin ? [
            { label: "Users", href: "/dashboard/admin/users", icon: Users },
            { label: "Organizations", href: "/dashboard/admin/organizations", icon: Building2 },
            { label: "Faculty ↔ University scope", href: "/dashboard/admin/faculty-university-scope", icon: Link2 },
            { label: "Org membership fees", href: "/dashboard/admin/org-membership", icon: CreditCard },
            { label: "Opportunity Request Approvals", href: "/dashboard/admin/approvals", icon: CheckCircle },
            { label: "Applications & Reports Approvals", href: "/dashboard/admin/join-applications", icon: ClipboardList },
            { label: "Payments", href: "/dashboard/admin/payments", icon: CreditCard },
            { label: "All projects", href: "/dashboard/admin/projects", icon: Briefcase },
            { label: "Path submissions", href: "/dashboard/admin/path-submissions", icon: BookOpen },
            { label: "Project evidence export", href: "/dashboard/admin/project-evidence", icon: Archive },
            { label: "Student Reports", href: "/dashboard/admin/reports/verify", icon: FileText },
            { label: "CIEL Master", href: "/dashboard/admin/master-analytics", icon: Globe2 },
            { label: "Analytics", href: "/dashboard/admin/analytics", icon: BarChart3 },
            { label: "All-Fields Console", href: "/dashboard/admin/all-fields-console", icon: LayoutGrid },
            { label: "Impact", href: "/dashboard/admin/impact", icon: FileBarChart },
            { label: "Messages", href: "/dashboard/admin/messages", icon: MessageSquare },
            { label: "Notifications", href: "/dashboard/admin/notifications", icon: Bell },
            { label: "Platform tutorial", href: "/dashboard/admin/tutorials", icon: PlayCircle },
            { label: "Send email", href: "/dashboard/admin/email", icon: Mail },
            { label: "Help & Support", href: "/dashboard/admin/support", icon: LifeBuoy },
            { label: "CEP feedback", href: "/dashboard/admin/cep-feedback", icon: MessageSquare },
            { label: "Audit Logs", href: "/dashboard/admin/audit-logs", icon: History },
            { label: "Issue Logs", href: "/dashboard/admin/issue-logs", icon: ShieldAlert },
        ] : []),
    ];

    const dashboardLink = {
        label: "Dashboard",
        href: "/dashboard/" + (isStudent ? "student" : isPartner ? "partner" : isFaculty ? "faculty" : "admin"),
        icon: LayoutDashboard
    };

    const settingsLink = {
        label: "Settings",
        href: `/dashboard/${isStudent ? "student" : isPartner ? "partner" : isFaculty ? "faculty" : "admin"}/settings`,
        icon: Settings
    };

    const links = [dashboardLink, ...roleLinks, settingsLink];

    const isLinkActive = (href: string) => {
        if (pathname === href) return true;
        if (href === "/dashboard/student/payments" && pathname === "/dashboard/student/payment") return true;
        if (href.endsWith("/analytics") && pathname.startsWith(`${href}/`)) return true;
        return false;
    };

    // ---- Student nav model: Dashboard, MY PATHS, RECORD, MORE ----
    const recordLinks = [
        { label: "My Hours", href: "/dashboard/student/paths/community-service?tab=log-hours", icon: Clock },
        { label: "Opportunities", href: "/dashboard/student/browse", icon: Compass, countPill: recommendedCount },
    ];

    const moreLinks = [
        { label: "My Projects", href: "/dashboard/student/projects", icon: Briefcase },
        { label: "Create Opportunity", href: "/dashboard/student/create-opportunity", icon: Plus },
        { label: "Impact History", href: "/dashboard/student/impact", icon: PieChart, countPill: impactHistoryBadge },
        { label: "Analytics", href: "/dashboard/student/analytics", icon: BarChart3 },
        { label: "Payments", href: "/dashboard/student/payments", icon: CreditCard },
        { label: "Messages", href: "/dashboard/student/messages", icon: MessageSquare, countPill: unreadCount },
        { label: "Notifications", href: "/dashboard/student/notifications", icon: Bell, countPill: notificationUnreadCount },
        { label: "Platform tutorial", href: "/dashboard/student/tutorials", icon: PlayCircle },
    ];

    const studentIsActive = (href: string) => {
        const [hrefPath, hrefQuery] = href.split("?");
        const hrefTab = hrefQuery ? new URLSearchParams(hrefQuery).get("tab") : null;
        if (hrefTab) {
            return pathname === hrefPath && searchParams.get("tab") === hrefTab;
        }
        return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
    };

    return (
        <>
        <aside
            className={clsx(
                "fixed left-0 top-0 z-40 hidden h-screen max-h-[100dvh] flex-col bg-ciel-navy text-white lg:flex ciel-transition",
                isStudent && collapsed ? "w-[72px]" : "w-64",
            )}
        >
            <div className="flex h-24 shrink-0 items-center justify-between px-4 border-b border-white/10">
                <Link href="/" className="flex items-center gap-3 min-w-0">
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/5 p-1">
                        <img src="/iel-pk-logo.png" alt="IEL PK" className="h-11 w-11 object-contain" width={44} height={44} />
                    </div>
                    {(!isStudent || !collapsed) && (
                        <div className="flex flex-col ml-1 min-w-0">
                            <span className="text-xs font-bold tracking-tight text-white leading-tight">
                                Community Impact <br /> Education Lab
                            </span>
                            <span className="text-[8px] text-[#4285F4] font-[family-name:var(--font-dancing)] tracking-wide mt-0.5">
                                Youth Empowered Community Impact
                            </span>
                        </div>
                    )}
                </Link>
                {isStudent && (
                    <button
                        type="button"
                        onClick={toggleCollapsed}
                        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        className="ciel-transition flex h-8 w-8 shrink-0 items-center justify-center rounded-ciel-xs text-white/50 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green"
                    >
                        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
                    </button>
                )}
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-6 custom-scrollbar overscroll-contain">
                {isStudent ? (
                    <>
                        <StudentNavRow href={dashboardLink.href} label="Dashboard" icon={LayoutDashboard} active={pathname === dashboardLink.href} collapsed={collapsed} />

                        {!collapsed && <p className="pt-4 pb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-white/30">My Paths</p>}
                        {collapsed && <div className="pt-3" />}
                        {CIEL_PATHS.map((path) => (
                            <StudentNavRow
                                key={path.key}
                                href={path.href}
                                label={path.label}
                                emoji={path.emoji}
                                active={studentIsActive(path.href)}
                                needsAction={impactSummary?.pathsStatus?.[path.key]?.needsAction}
                                collapsed={collapsed}
                            />
                        ))}

                        {!collapsed && <p className="pt-4 pb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-white/30">Record</p>}
                        {collapsed && <div className="pt-3" />}
                        {recordLinks.map((link) => (
                            <StudentNavRow
                                key={link.href}
                                href={link.href}
                                label={link.label}
                                icon={link.icon}
                                active={studentIsActive(link.href)}
                                countPill={link.countPill}
                                collapsed={collapsed}
                            />
                        ))}

                        {!collapsed && <p className="pt-4 pb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-white/30">More</p>}
                        {collapsed && <div className="pt-3" />}
                        {moreLinks.map((link) => (
                            <StudentNavRow
                                key={link.href}
                                href={link.href}
                                label={link.label}
                                icon={link.icon}
                                active={studentIsActive(link.href)}
                                countPill={link.countPill}
                                collapsed={collapsed}
                            />
                        ))}
                    </>
                ) : (
                    links.map((link) => {
                        const isActive = isLinkActive(link.href);
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={clsx(
                                    "flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium text-sm w-full group",
                                    isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50" : "text-slate-400 hover:text-white hover:bg-slate-800"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <link.icon className="w-5 h-5" />
                                    {link.label}
                                </div>
                                {link.label === "Messages" && unreadCount > 0 && (
                                    <span className="bg-slate-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                                        {unreadCount > 99 ? "99+" : unreadCount}
                                    </span>
                                )}
                                {link.label === "Notifications" && notificationUnreadCount > 0 && (
                                    <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                        {notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}
                                    </span>
                                )}
                                {link.label === "Impact History" && impactHistoryBadge > 0 && (
                                    <span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                                        {impactHistoryBadge > 99 ? "99+" : impactHistoryBadge}
                                    </span>
                                )}
                            </Link>
                        )
                    })
                )}
            </div>

            {isStudent ? (
                <div className="shrink-0 border-t border-white/10 p-3 space-y-3">
                    <StudentNavRow href="/dashboard/student/settings" label="Settings" icon={Settings} active={studentIsActive("/dashboard/student/settings")} collapsed={collapsed} />
                    <StudentNavRow href="/dashboard/student/help" label="Help" icon={HelpCircle} active={studentIsActive("/dashboard/student/help")} collapsed={collapsed} />

                    <button
                        onClick={handleLogout}
                        className={clsx(
                            "flex items-center gap-3 px-3 py-2.5 w-full rounded-ciel-sm text-white/60 hover:bg-white/5 hover:text-white ciel-transition text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green",
                            collapsed && "justify-center px-0",
                        )}
                    >
                        <LogOut className="w-4 h-4 shrink-0" />
                        {!collapsed && "Sign out"}
                    </button>
                </div>
            ) : (
                <div className="shrink-0 border-t border-slate-800 p-4">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-[#4285F4] hover:bg-slate-500/10 hover:text-[#4285F4] transition-colors text-sm font-medium"
                    >
                        <LogOut className="w-5 h-5" />
                        Sign Out
                    </button>
                </div>
            )}
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
                            { label: "My Hours", href: "/dashboard/student/paths/community-service?tab=log-hours", icon: Clock },
                            { label: "Paths", href: "#paths", icon: Compass, isPathsTrigger: true },
                            { label: "Opportunities", href: "/dashboard/student/browse", icon: Briefcase, countPill: recommendedCount },
                            { label: "Profile", href: "/dashboard/student/profile", icon: User },
                        ].map((item) => {
                            const active = !item.isPathsTrigger && studentIsActive(item.href);
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
                                    {!!item.countPill && item.countPill > 0 && (
                                        <span className="absolute right-1 top-1 rounded-full bg-ciel-amber px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
                                            {item.countPill > 99 ? "99+" : item.countPill}
                                        </span>
                                    )}
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
            <nav
                className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-3 py-2 shadow-[0_-12px_30px_-20px_rgba(15,23,42,0.45)] backdrop-blur lg:hidden"
                aria-label="Dashboard navigation"
            >
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {links.map((link) => {
                        const isActive = isLinkActive(link.href);
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={clsx(
                                    "relative flex min-w-[4.75rem] flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-[10px] font-bold transition-colors",
                                    isActive ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
                                )}
                            >
                                <link.icon className="h-5 w-5" />
                                <span className="line-clamp-1 max-w-[4.5rem] text-center leading-tight">{link.label}</span>
                                {link.label === "Messages" && unreadCount > 0 && (
                                    <span className="absolute right-2 top-1 rounded-full bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
                                        {unreadCount > 99 ? "99+" : unreadCount}
                                    </span>
                                )}
                                {link.label === "Notifications" && notificationUnreadCount > 0 && (
                                    <span className="absolute right-2 top-1 rounded-full bg-rose-600 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
                                        {notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}
                                    </span>
                                )}
                                {link.label === "Impact History" && impactHistoryBadge > 0 && (
                                    <span className="absolute right-2 top-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
                                        {impactHistoryBadge > 99 ? "99+" : impactHistoryBadge}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>
        )}
        </>
    );
}
