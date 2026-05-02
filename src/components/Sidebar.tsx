"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { LayoutDashboard, Users, Settings, PieChart, LogOut, FileText, Building2, CheckCircle, Briefcase, FileBarChart, ShieldAlert, History, Bell, User, MessageSquare, Plus, CreditCard, ClipboardList, CalendarClock, LifeBuoy, type LucideProps } from "lucide-react";
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
import { CIEL_NOTIFICATIONS_UNREAD_EVENT, type CielNotificationsUnreadEventDetail, broadcastUnreadNotificationsCount } from "@/utils/cielNotificationsUnread";

export default function Sidebar() {
    const pathname = usePathname();
    const [unreadCount, setUnreadCount] = useState(0);
    const [impactHistoryBadge, setImpactHistoryBadge] = useState(0);
    const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
    const router = useRouter();

    const handleLogout = () => {
        localStorage.removeItem("ciel_user");
        localStorage.removeItem("ciel_token");
        clearStudentDashboardCache();
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

    const hasInboxNotificationsNav = isStudent || isPartner || isFaculty;

    const refreshNotificationUnreadFromApi = useCallback(async () => {
        if (!isTokenValid(localStorage.getItem("ciel_token"))) return;
        try {
            const res = await authenticatedFetch("/api/v1/notifications/unread-count", {}, { redirectToLogin: false });
            if (!res?.ok) return;
            const data = (await res.json()) as { success?: boolean; data?: { count?: number } };
            if (data.success && typeof data.data?.count === "number") {
                const count = data.data.count;
                setNotificationUnreadCount(count);
                broadcastUnreadNotificationsCount(count);
            }
        } catch {
            /* non-fatal */
        }
    }, []);

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
        void refreshNotificationUnreadFromApi();
        const poll = setInterval(() => void refreshNotificationUnreadFromApi(), 30000);
        const handler = (e: Event) => {
            const ce = e as CustomEvent<CielNotificationsUnreadEventDetail>;
            if (typeof ce.detail?.count === "number") {
                setNotificationUnreadCount(ce.detail.count);
            }
        };
        window.addEventListener(CIEL_NOTIFICATIONS_UNREAD_EVENT, handler);
        window.addEventListener("ciel_user_updated", syncFromLs);
        return () => {
            clearInterval(poll);
            window.removeEventListener(CIEL_NOTIFICATIONS_UNREAD_EVENT, handler);
            window.removeEventListener("ciel_user_updated", syncFromLs);
        };
    }, [hasInboxNotificationsNav, refreshNotificationUnreadFromApi]);

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
            { label: "Payments", href: "/dashboard/student/payments", icon: CreditCard },
            { label: "Messages", href: "/dashboard/student/messages", icon: MessageSquare },
            { label: "Notifications", href: "/dashboard/student/notifications", icon: Bell },
            { label: "Help & Support", href: "/dashboard/student/help", icon: LifeBuoy },
            { label: "My Profile", href: "/dashboard/student/profile", icon: User },
        ] : []),
        // Partner
        ...(isPartner ? [
            { label: "My Organization", href: "/dashboard/partner/organization", icon: Building2 },
            { label: "My Opportunities", href: "/dashboard/partner/requests", icon: Briefcase },
            { label: "Create Opportunity", href: "/dashboard/partner/requests/new", icon: Plus },
            { label: "Attendance review", href: "/dashboard/partner/attendance-review", icon: CalendarClock },
            { label: "Verify Work", href: "/dashboard/partner/verification", icon: CheckCircle },
            { label: "Reports", href: "/dashboard/partner/reports", icon: FileText },
            { label: "Impact", href: "/dashboard/partner/impact", icon: FileBarChart },
            { label: "Messages", href: "/dashboard/partner/messages", icon: MessageSquare },
            { label: "Funding", href: "/dashboard/partner/funding", icon: PieChart },
            { label: "Notifications", href: "/dashboard/partner/notifications", icon: Bell },
        ] : []),
        // Faculty 
        ...(isFaculty ? [
            // { label: "My Courses", href: "/dashboard/faculty/courses", icon: BookOpen },
            { label: "My Profile", href: "/dashboard/faculty/profile", icon: User },
            { label: "Opportunity Request Approvals", href: "/dashboard/faculty/approvals", icon: CheckCircle },
            { label: "Applications & Reports Approvals", href: "/dashboard/faculty/join-applications", icon: ClipboardList },
            { label: "Attendance review", href: "/dashboard/faculty/attendance-review", icon: CalendarClock },
            { label: "My Opportunities", href: "/dashboard/faculty/my-opportunities", icon: Briefcase },
            { label: "Create Opportunity", href: "/dashboard/faculty/create-opportunity", icon: Plus },
            // { label: "Student Grading", href: "/dashboard/faculty/grading", icon: FileText },
            { label: "Messages", href: "/dashboard/faculty/messages", icon: MessageSquare },
            { label: "Notifications", href: "/dashboard/faculty/notifications", icon: Bell },
            { label: "Impact Analytics", href: "/dashboard/faculty/analytics", icon: PieChart },
        ] : []),
        // Admin
        ...(isAdmin ? [
            { label: "Users", href: "/dashboard/admin/users", icon: Users },
            { label: "Organizations", href: "/dashboard/admin/organizations", icon: Building2 },
            { label: "Opportunity Request Approvals", href: "/dashboard/admin/approvals", icon: CheckCircle },
            { label: "Applications & Reports Approvals", href: "/dashboard/admin/join-applications", icon: ClipboardList },
            { label: "Payments", href: "/dashboard/admin/payments", icon: CreditCard },
            { label: "All projects", href: "/dashboard/admin/projects", icon: Briefcase },
            { label: "Student Reports", href: "/dashboard/admin/reports/verify", icon: FileText },
            { label: "Impact", href: "/dashboard/admin/impact", icon: FileBarChart },
            { label: "Messages", href: "/dashboard/admin/messages", icon: MessageSquare },
            { label: "Help & Support", href: "/dashboard/admin/support", icon: LifeBuoy },
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

    return (
        <>
        <aside className="fixed left-0 top-0 z-40 hidden h-screen max-h-[100dvh] w-64 flex-col bg-slate-900 text-white lg:flex">
            <div className="flex h-24 shrink-0 items-center px-4 border-b border-slate-800">
                <Link href="/" className="flex items-center gap-3">
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/5 p-1">
                        <img src="/iel-pk-logo.png" alt="IEL PK" className="h-11 w-11 object-contain" width={44} height={44} />
                    </div>
                    <div className="flex flex-col ml-1">
                        <span className="text-xs font-bold tracking-tight text-white leading-tight">
                            Community Impact <br /> Education Lab
                        </span>
                        <span className="text-[8px] text-[#4285F4] font-[family-name:var(--font-dancing)] tracking-wide mt-0.5">
                            Youth Empowered Community Impact
                        </span>
                    </div>
                </Link>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-6 custom-scrollbar overscroll-contain">
                {links.map((link) => {
                    const isActive =
                        pathname === link.href ||
                        (link.href === "/dashboard/student/payments" && pathname === "/dashboard/student/payment");
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
                })}
            </div>

            <div className="shrink-0 border-t border-slate-800 p-4">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-[#4285F4] hover:bg-slate-500/10 hover:text-[#4285F4] transition-colors text-sm font-medium"
                >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                </button>
            </div>
        </aside>

        <nav
            className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-3 py-2 shadow-[0_-12px_30px_-20px_rgba(15,23,42,0.45)] backdrop-blur lg:hidden"
            aria-label="Dashboard navigation"
        >
            <div className="flex gap-2 overflow-x-auto pb-1">
                {links.map((link) => {
                    const isActive =
                        pathname === link.href ||
                        (link.href === "/dashboard/student/payments" && pathname === "/dashboard/student/payment");
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
        </>
    );
}
