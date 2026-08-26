"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useLayoutEffect, useCallback, useMemo, type ComponentType } from "react";
import { LayoutDashboard, Users, Settings, PieChart, LogOut, FileText, Building2, CheckCircle, Briefcase, FileBarChart, ShieldAlert, BarChart3, History, Bell, User, MessageSquare, Plus, CreditCard, ClipboardList, CalendarClock, LifeBuoy, Link2, GraduationCap, Globe2, PlayCircle, Mail, Archive, ChevronsLeft, ChevronsRight, Compass, HelpCircle, BookOpen, X, type LucideProps } from "lucide-react";
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

function NavSectionLabel({ collapsed, children }: { collapsed: boolean; children: string }) {
    if (collapsed) return <div className="pt-3" />;
    return <p className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-widest text-white/30">{children}</p>;
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
        document.documentElement.style.setProperty("--ciel-sidebar-width", collapsed ? "72px" : "16rem");
        return () => {
            document.documentElement.style.setProperty("--ciel-sidebar-width", "16rem");
        };
    }, [collapsed]);

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

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mobilePathsSheetOpen, setMobilePathsSheetOpen] = useState(false);

    const roleSlug = isStudent ? "student" : isPartner ? "partner" : isFaculty ? "faculty" : "admin";
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
                { label: "Create Opportunity", href: "/dashboard/partner/requests/new", icon: Plus },
                { label: "Attendance review", href: "/dashboard/partner/attendance-review", icon: CalendarClock },
                { label: "Verify Work", href: "/dashboard/partner/verification", icon: CheckCircle },
                { label: "Reports", href: "/dashboard/partner/reports", icon: FileText },
                { label: "Impact", href: "/dashboard/partner/impact", icon: FileBarChart },
                { label: "Community service", href: "/dashboard/partner/community-service", icon: BookOpen },
                { label: "Analytics", href: "/dashboard/partner/analytics", icon: BarChart3 },
                ...(isUniversityPartnerOrg
                    ? [
                          { label: "Institution analytics", href: "/dashboard/partner/university-analytics", icon: GraduationCap },
                          { label: "Showcase deck", href: "/dashboard/partner/university-showcase", icon: BookOpen },
                      ]
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

    const facultyWorkspace = useMemo(
        () =>
            withCounts([
                { label: "Opportunity Request Approvals", href: "/dashboard/faculty/approvals", icon: CheckCircle },
                { label: "Applications & Reports Approvals", href: "/dashboard/faculty/join-applications", icon: ClipboardList },
                { label: "Student impact reports", href: "/dashboard/faculty/reports", icon: FileText },
                { label: "Community service", href: "/dashboard/faculty/community-service", icon: BookOpen },
                { label: "Coursework reports", href: "/dashboard/faculty/coursework-projects", icon: BookOpen },
                { label: "FYP / Thesis records", href: "/dashboard/faculty/fyp-thesis", icon: BookOpen },
                { label: "Startup / Business", href: "/dashboard/faculty/startup-business", icon: BookOpen },
                { label: "Attendance review", href: "/dashboard/faculty/attendance-review", icon: CalendarClock },
                { label: "My Opportunities", href: "/dashboard/faculty/my-opportunities", icon: Briefcase },
                { label: "Create Opportunity", href: "/dashboard/faculty/create-opportunity", icon: Plus },
                { label: "Analytics", href: "/dashboard/faculty/analytics", icon: BarChart3 },
            ]),
        [withCounts],
    );

    const facultyMore = useMemo(
        () =>
            withCounts([
                { label: "Messages", href: "/dashboard/faculty/messages", icon: MessageSquare },
                { label: "Notifications", href: "/dashboard/faculty/notifications", icon: Bell },
                { label: "Platform tutorial", href: "/dashboard/faculty/tutorials", icon: PlayCircle },
            ]),
        [withCounts],
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
                { label: "Analytics & Impact", href: "/dashboard/admin/analytics", icon: BarChart3 },
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

    const workspaceLinks = isPartner ? partnerWorkspace : isFaculty ? facultyWorkspace : isAdmin ? adminWorkspace : [];
    const moreLinksRole = isPartner ? partnerMore : isFaculty ? facultyMore : isAdmin ? adminMore : [];

    const footerLinks = useMemo(() => {
        const items: NavItem[] = [];
        if (isFaculty) items.push({ label: "My Profile", href: "/dashboard/faculty/profile", icon: User });
        items.push({ label: "Settings", href: settingsHref, icon: Settings });
        items.push({ label: "Help", href: helpHref, icon: HelpCircle });
        return items;
    }, [isFaculty, settingsHref, helpHref]);

    const allRoleHrefs = useMemo(
        () => [dashboardHref, ...workspaceLinks.map((l) => l.href), ...moreLinksRole.map((l) => l.href), ...footerLinks.map((l) => l.href)],
        [dashboardHref, workspaceLinks, moreLinksRole, footerLinks],
    );

    const isNavActive = (href: string) => {
        const [hrefPath, hrefQuery] = href.split("?");
        const hrefTab = hrefQuery ? new URLSearchParams(hrefQuery).get("tab") : null;
        if (hrefTab) {
            return pathname === hrefPath && searchParams.get("tab") === hrefTab;
        }
        if (hrefPath === dashboardHref) return pathname === hrefPath;
        if (hrefPath === "/dashboard/student/payments" && pathname === "/dashboard/student/payment") return true;
        if (hrefPath === "/dashboard/student/impact" && pathname.startsWith("/dashboard/student/analytics")) return true;
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
              : { label: "Settings", href: settingsHref, icon: Settings };

    const mobileMenuItems = [...workspaceLinks, ...moreLinksRole, ...footerLinks];

    return (
        <>
        <aside
            className={clsx(
                "fixed left-0 top-0 z-40 hidden h-screen max-h-[100dvh] flex-col bg-ciel-navy text-white lg:flex ciel-transition",
                collapsed ? "w-[72px]" : "w-64",
            )}
        >
            <div className="flex h-24 shrink-0 items-center justify-between px-4 border-b border-white/10">
                <Link href="/" className="flex min-w-0 items-center gap-3">
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/5 p-1">
                        <img src="/iel-pk-logo.png" alt="IEL PK" className="h-11 w-11 object-contain" width={44} height={44} />
                    </div>
                    {!collapsed && (
                        <div className="ml-1 flex min-w-0 flex-col">
                            <span className="text-xs font-bold leading-tight tracking-tight text-white">
                                Community Impact <br /> Education Lab
                            </span>
                            <span className="mt-0.5 font-[family-name:var(--font-dancing)] text-[8px] tracking-wide text-[#4285F4]">
                                Youth Empowered Community Impact
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

            <div className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 py-6">
                {isStudent ? (
                    <>
                        <NavRow href={dashboardHref} label="Dashboard" icon={LayoutDashboard} active={pathname === dashboardHref} collapsed={collapsed} />
                        <NavSectionLabel collapsed={collapsed}>My Paths</NavSectionLabel>
                        {CIEL_PATHS.map((path) => (
                            <NavRow
                                key={path.key}
                                href={path.href}
                                label={path.label}
                                emoji={path.emoji}
                                active={isNavActive(path.href)}
                                needsAction={impactSummary?.pathsStatus?.[path.key]?.needsAction}
                                collapsed={collapsed}
                            />
                        ))}
                        <NavSectionLabel collapsed={collapsed}>More</NavSectionLabel>
                        {studentMoreLinks.map((link) => (
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
                ) : (
                    <>
                        <NavRow href={dashboardHref} label="Dashboard" icon={LayoutDashboard} active={pathname === dashboardHref} collapsed={collapsed} />
                        <NavSectionLabel collapsed={collapsed}>Workspace</NavSectionLabel>
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
                    title={isUniversityPartnerOrg ? "University menu" : isPartner ? "Partner menu" : isFaculty ? "Faculty menu" : "Admin menu"}
                    items={mobileMenuItems}
                    isActive={isNavActive}
                />
            </>
        )}
        </>
    );
}
