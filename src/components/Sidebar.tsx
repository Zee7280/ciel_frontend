"use client";
import { STUDENT_SUBSCRIPTION_PATH, studentNeedsSubscriptionPayment } from "@/utils/studentSubscription";

import Link from "next/link";
import { clearPathSessionCache } from "@/utils/student-path-session-cache";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useLayoutEffect, useCallback, useMemo, type ComponentType } from "react";
import {
    LayoutDashboard,
    Users,
    Settings,
    PieChart,
    LogOut,
    Building2,
    ShieldAlert,
    History,
    Bell,
    User,
    MessageSquare,
    CreditCard,
    Link2,
    Globe2,
    PlayCircle,
    Mail,
    Archive,
    ChevronsLeft,
    ChevronsRight,
    ChevronDown,
    Compass,
    HelpCircle,
    BookOpen,
    X,
    type LucideProps,
} from "lucide-react";
import clsx from "clsx";
import { authenticatedFetch, isTokenValid } from "@/utils/api";
import {
    CIEL_STUDENT_DASHBOARD_CACHE_EVENT,
    clearStudentDashboardCache,
    fetchStudentDashboardData,
    readStudentDashboardCache,
} from "@/utils/student-dashboard-fetch";
import {
    dashboardNavRoleFromPathname,
    readDashboardNavRoleFromStorage,
    type DashboardNavRole,
} from "@/utils/dashboardNavRole";
import { clearFacultyScopeSession } from "@/utils/facultyScopeSession";
import { readPartnerOrgKind, readPartnerOrgLabel, type PartnerOrgKind } from "@/utils/partnerOrgKind";
import { CIEL_NOTIFICATIONS_UNREAD_EVENT, type CielNotificationsUnreadEventDetail } from "@/utils/cielNotificationsUnread";
import {
    CIEL_IMPACT_SUMMARY_CACHE_EVENT,
    clearImpactSummaryCache,
    fetchImpactSummary,
    readImpactSummaryCache,
    type CielImpactSummary,
} from "@/utils/cielImpactSummary";
import { CIEL_PATHS } from "@/utils/cielPaths";
import {
    CIEL_ADMIN_MUTATED_EVENT,
    CIEL_ADMIN_PENDING_COUNTS_EVENT,
    clearAdminPendingCountsCache,
    fetchAdminPendingCounts,
    readAdminPendingCountsCache,
    type AdminPendingCounts,
} from "@/utils/adminPendingCounts";
import { prefetchStudentImpactPortfolio, prefetchStudentPathData } from "@/utils/student-path-prefetch";
import { QUICK_WORK_FACULTY_PENDING_EVENT, fetchFacultyQuickWorkPending } from "@/utils/quickWorkApi";
import { refreshStoredUserFromMeApi } from "@/utils/membershipPayment";
import {
    FACULTY_CS_HUB,
    STAKEHOLDER_NAV,
    STUDENT_CS_HUB,
    activeMainButton,
    hrefMatchesLocation,
    splitHref,
    stakeholderNavRole,
    type StakeholderMainButton,
} from "@/utils/stakeholderNav";

const SIDEBAR_COLLAPSED_KEY = "ciel_sidebar_collapsed";
const SIDEBAR_EXPANDED_WIDTH = "280px";
const SIDEBAR_COLLAPSED_WIDTH = "64px";

type NavItem = {
    label: string;
    href: string;
    icon?: ComponentType<LucideProps>;
    emoji?: string;
    countPill?: number;
    needsAction?: boolean;
    onPrefetch?: () => void;
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
    onPrefetch,
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
    onPrefetch?: () => void;
}) {
    return (
        <Link
            href={href}
            scroll
            onPointerEnter={onPrefetch}
            onFocus={onPrefetch}
            className={clsx(
                "ciel-transition relative mb-[5px] flex items-center gap-[13px] rounded-[14px] py-3.5 text-left text-[14px] font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#42ddb2]",
                collapsed ? "mx-1 w-[calc(100%-8px)] justify-center px-0" : "mx-[10px] w-[calc(100%-20px)] px-3.5",
                active ? "bg-[#22515b] text-white shadow-[inset_4px_0_0_#42ddb2]" : "text-[#c8d4da] hover:bg-white/[0.055] hover:text-white",
                impact && "mt-2",
                indent && !collapsed && "mb-1 ml-5 w-[calc(100%-40px)] py-2.5 text-[13px] font-bold",
            )}
            title={collapsed ? label : undefined}
            aria-label={collapsed ? (countPill && countPill > 0 ? `${label} (${countPill > 99 ? "99+" : countPill} pending)` : label) : undefined}
            aria-current={active ? "page" : undefined}
        >
            {emoji ? (
                <span className="w-7 shrink-0 text-center text-lg leading-none" aria-hidden>{emoji}</span>
            ) : Icon ? (
                <Icon className="h-[18px] w-[18px] shrink-0" />
            ) : indent && !collapsed ? (
                <span className={clsx("ml-2 h-1.5 w-1.5 shrink-0 rounded-full", active ? "bg-[#42ddb2]" : "bg-white/35")} aria-hidden />
            ) : null}
            {!collapsed && <span className="flex-1 truncate">{label}</span>}
            {!collapsed && needsAction && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ciel-amber" aria-label="Needs action" />}
            {collapsed && !!countPill && countPill > 0 && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-ciel-amber ring-2 ring-[#133747]" aria-hidden />
            )}
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

/**
 * A main button with its sub-buttons underneath (Final Stakeholder Dashboard Structure). The label
 * navigates to the button's landing screen; the chevron opens or closes the sub-buttons. The group
 * opens by itself while any of its screens is the current page. Collapsed sidebar: icon only.
 */
function NavGroup({
    id,
    label,
    emoji,
    icon: Icon,
    href,
    items,
    open,
    onToggle,
    collapsed,
    active,
    countPill,
    isActive,
}: {
    id: string;
    label: string;
    emoji?: string;
    icon?: ComponentType<LucideProps>;
    href?: string;
    items: NavItem[];
    open: boolean;
    onToggle: () => void;
    collapsed: boolean;
    active: boolean;
    countPill?: number;
    isActive: (href: string) => boolean;
}) {
    if (collapsed) {
        return (
            <NavRow
                href={href || items[0]?.href || "#"}
                label={label}
                emoji={emoji}
                icon={Icon}
                active={active}
                collapsed
                countPill={countPill}
            />
        );
    }
    const headClass = clsx(
        "ciel-transition relative mb-[5px] flex w-[calc(100%-20px)] items-center gap-[13px] rounded-[14px] py-3.5 pl-3.5 pr-1.5 text-left text-[14px] font-extrabold mx-[10px]",
        active ? "bg-[#22515b] text-white shadow-[inset_4px_0_0_#42ddb2]" : "text-[#c8d4da] hover:bg-white/[0.055] hover:text-white",
    );
    const inner = (
        <>
            {emoji ? (
                <span className="w-7 shrink-0 text-center text-lg leading-none" aria-hidden>{emoji}</span>
            ) : Icon ? (
                <Icon className="h-[18px] w-[18px] shrink-0" />
            ) : null}
            <span className="flex-1 truncate">{label}</span>
            {!!countPill && countPill > 0 && (
                <span className="grid h-6 min-w-6 shrink-0 place-items-center rounded-xl bg-[#355c6b] px-1.5 text-[11px] font-bold text-white">{countPill > 99 ? "99+" : countPill}</span>
            )}
        </>
    );
    return (
        <div className="mb-0.5" data-nav-group={id}>
            <div className={headClass}>
                {href ? (
                    <Link
                        href={href}
                        scroll
                        aria-current={active ? "page" : undefined}
                        className="flex min-w-0 flex-1 items-center gap-[13px] rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#42ddb2]"
                    >
                        {inner}
                    </Link>
                ) : (
                    <button
                        type="button"
                        onClick={onToggle}
                        aria-expanded={open}
                        aria-controls={`${id}-items`}
                        className="flex min-w-0 flex-1 items-center gap-[13px] rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#42ddb2]"
                    >
                        {inner}
                    </button>
                )}
                <button
                    type="button"
                    onClick={onToggle}
                    aria-expanded={open}
                    aria-controls={`${id}-items`}
                    aria-label={open ? `Hide ${label} options` : `Show ${label} options`}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#42ddb2]"
                >
                    <ChevronDown className={clsx("h-4 w-4 ciel-transition", open && "rotate-180")} />
                </button>
            </div>
            {open ? (
                <div id={`${id}-items`} role="group" aria-label={`${label} options`}>
                    {items.map((item) => (
                        <NavRow
                            key={`${item.href}|${item.label}`}
                            href={item.href}
                            label={item.label}
                            icon={item.icon}
                            active={isActive(item.href)}
                            countPill={item.countPill}
                            needsAction={item.needsAction}
                            collapsed={false}
                            indent
                            onPrefetch={item.onPrefetch}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
}

type MenuSection = { heading: string; items: NavItem[] };

function RoleMenuSheet({
    open,
    onClose,
    title,
    items,
    sections,
    isActive,
    onSignOut,
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    items: NavItem[];
    sections?: MenuSection[];
    isActive: (href: string) => boolean;
    onSignOut?: () => void;
}) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [open, onClose]);

    if (!open) return null;

    const renderItem = (item: NavItem) => {
        const active = isActive(item.href);
        return (
            <Link
                key={`${item.href}|${item.label}`}
                href={item.href}
                onClick={onClose}
                className={clsx(
                    "ciel-transition flex items-center gap-3 rounded-ciel-md border px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green",
                    active
                        ? "border-ciel-green/40 bg-ciel-green-soft text-ciel-green-deep"
                        : "border-ciel-border text-ciel-text hover:border-ciel-green/40",
                )}
            >
                {item.emoji ? (
                    <span className="w-5 shrink-0 text-center text-base leading-none" aria-hidden>{item.emoji}</span>
                ) : item.icon ? (
                    <item.icon className="h-4 w-4 shrink-0" />
                ) : (
                    <span className="ml-1.5 mr-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" aria-hidden />
                )}
                <span className="min-w-0 flex-1 text-sm font-bold">{item.label}</span>
                {!!item.countPill && item.countPill > 0 && (
                    <span className="rounded-full bg-ciel-navy/10 px-2 py-0.5 text-[10px] font-bold">
                        {item.countPill > 99 ? "99+" : item.countPill}
                    </span>
                )}
            </Link>
        );
    };

    return (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label={title}>
            <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ciel-text/40" />
            <div className="ciel-crossfade-enter custom-scrollbar absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto overscroll-contain rounded-t-ciel-xl bg-white p-5 pb-[calc(2rem+env(safe-area-inset-bottom))] shadow-[0_-12px_30px_-20px_rgba(15,23,42,0.45)]">
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
                {sections ? (
                    sections
                        .filter((sec) => sec.items.length > 0)
                        .map((sec) => (
                            <div key={sec.heading} className="mt-4">
                                <p className="px-1 pb-2 text-[11px] font-black uppercase tracking-[0.08em] text-ciel-text-soft">{sec.heading}</p>
                                <div className="space-y-1">{sec.items.map(renderItem)}</div>
                            </div>
                        ))
                ) : (
                    <div className="mt-4 space-y-1">{items.map(renderItem)}</div>
                )}
                {onSignOut ? (
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            onSignOut();
                        }}
                        className="ciel-transition mt-5 flex w-full items-center gap-3 rounded-ciel-md border border-ciel-border px-4 py-3 text-left text-sm font-bold text-ciel-text hover:border-red-300 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green"
                    >
                        <LogOut className="h-4 w-4 shrink-0" />
                        Sign out
                    </button>
                ) : null}
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
        // Revoke server-side (bumps tokenVersion) so the token dies now, not when it expires. Best
        // effort: the local sign-out below happens regardless.
        const token = localStorage.getItem("ciel_token");
        if (token) {
            void fetch("/api/v1/auth/logout", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                keepalive: true,
            }).catch(() => undefined);
        }
        localStorage.removeItem("ciel_user");
        localStorage.removeItem("ciel_token");
        clearStudentDashboardCache();
        clearImpactSummaryCache();
        clearPathSessionCache();
        clearFacultyScopeSession();
        clearAdminPendingCountsCache();
        router.push("/login");
    };

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

    // Admins see the Messages badge on every page; other roles only poll while on their Messages page.
    const isMessagesPage =
        /^\/dashboard\/(student|partner|faculty|admin)\/messages$/.test(pathname);
    const shouldPollUnread = isMessagesPage || isAdmin;

    useEffect(() => {
        if (!shouldPollUnread) return;

        const fetchUnreadCount = async () => {
            if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
            if (!isTokenValid(localStorage.getItem("ciel_token"))) return;
            try {
                const res = await authenticatedFetch("/api/v1/chat/unread-count", {}, { redirectToLogin: false });
                if (res && res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setUnreadCount(Number(data.data?.count) || 0);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch unread count", error);
            }
        };

        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, [shouldPollUnread, pathname]);

    // Admin pending-work badges: on mount, route change, every 60s while visible, and after admin writes.
    const [adminCounts, setAdminCounts] = useState<AdminPendingCounts | null>(null);
    useEffect(() => {
        if (!isAdmin) {
            setAdminCounts(null);
            return;
        }
        setAdminCounts(readAdminPendingCountsCache());
        let cancelled = false;
        const load = (force: boolean) => {
            if (document.visibilityState === "hidden") return;
            void fetchAdminPendingCounts({ force }).then((c) => {
                if (!cancelled && c) setAdminCounts(c);
            });
        };
        load(false);
        const onMutated = () => load(true);
        const onCounts = (e: Event) => {
            const d = (e as CustomEvent<AdminPendingCounts>).detail;
            if (d && !cancelled) setAdminCounts(d);
        };
        const onVisible = () => load(false);
        window.addEventListener(CIEL_ADMIN_MUTATED_EVENT, onMutated);
        window.addEventListener(CIEL_ADMIN_PENDING_COUNTS_EVENT, onCounts);
        document.addEventListener("visibilitychange", onVisible);
        const interval = setInterval(() => load(true), 60_000);
        return () => {
            cancelled = true;
            clearInterval(interval);
            window.removeEventListener(CIEL_ADMIN_MUTATED_EVENT, onMutated);
            window.removeEventListener(CIEL_ADMIN_PENDING_COUNTS_EVENT, onCounts);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [isAdmin, pathname]);

    // Faculty approval queues (join applications this faculty member can decide; report supervision
    // requests): one count per page load, so a waiting student is visible from any page.
    const [facultyQueueCounts, setFacultyQueueCounts] = useState({ joinApplications: 0 });
    useEffect(() => {
        if (!isFaculty) return;
        let cancelled = false;
        const count = async (path: string, pick: (data: unknown) => number): Promise<number> => {
            try {
                const res = await authenticatedFetch(path, {}, { redirectToLogin: false });
                if (!res?.ok) return 0;
                const body = (await res.json().catch(() => null)) as { data?: unknown } | null;
                return pick(body?.data);
            } catch {
                return 0;
            }
        };
        void Promise.all([
            count("/api/v1/faculty/applications?status=pending", (d) =>
                Array.isArray(d) ? d.filter((r) => (r as { can_decide?: boolean } | null)?.can_decide !== false).length : 0,
            ),
        ]).then(([joinApplications]) => {
            if (!cancelled) setFacultyQueueCounts({ joinApplications });
        });
        return () => {
            cancelled = true;
        };
    }, [isFaculty, pathname]);

    // Faculty Quick Community Work badge: one count per page load, and again after a review on that page.
    const [facultyQuickWorkPending, setFacultyQuickWorkPending] = useState(0);
    useEffect(() => {
        if (!isFaculty) return; // the badge is shown to faculty only
        let cancelled = false;
        const load = () =>
            void fetchFacultyQuickWorkPending().then((n) => {
                if (!cancelled && n !== null) setFacultyQuickWorkPending(n);
            });
        load();
        window.addEventListener(QUICK_WORK_FACULTY_PENDING_EVENT, load);
        return () => {
            cancelled = true;
            window.removeEventListener(QUICK_WORK_FACULTY_PENDING_EVENT, load);
        };
    }, [isFaculty, pathname]);

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
    // The cached flag can outlive the admin turning the partner fee off: re-read `/users/me` once per
    // partner session so a "Membership fee" entry never shows for a fee that no longer applies.
    useEffect(() => {
        if (!isPartner) return;
        void refreshStoredUserFromMeApi();
    }, [isPartner]);

    const [studentSubscriptionNav, setStudentSubscriptionNav] = useState(false);
    useEffect(() => {
        if (!isStudent) {
            setStudentSubscriptionNav(false);
            return;
        }
        const read = () => {
            try {
                const raw = localStorage.getItem("ciel_user") || localStorage.getItem("user");
                const u = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
                setStudentSubscriptionNav(studentNeedsSubscriptionPayment(u));
            } catch {
                setStudentSubscriptionNav(false);
            }
        };
        read();
        window.addEventListener("ciel_user_updated", read);
        return () => window.removeEventListener("ciel_user_updated", read);
    }, [isStudent, pathname]);

    const [isUniversityPartnerOrg, setIsUniversityPartnerOrg] = useState(false);
    const [partnerOrgKind, setPartnerOrgKind] = useState<PartnerOrgKind>("partner");
    const [partnerOrgLabel, setPartnerOrgLabel] = useState("Partner Organization");
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
                    ? (JSON.parse(raw) as { orgType?: string; organizationCategory?: string; organization_type?: string; type?: string; role?: string })
                    : null;
                const kind = readPartnerOrgKind(u);
                setPartnerOrgKind(kind);
                setPartnerOrgLabel(readPartnerOrgLabel(u));
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
        document.documentElement.style.setProperty("--ciel-sidebar-width", collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH);
        return () => {
            document.documentElement.style.setProperty("--ciel-sidebar-width", SIDEBAR_EXPANDED_WIDTH);
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

    const roleSlug = isStudent ? "student" : isPartner ? "partner" : isFaculty ? "faculty" : isInvestor ? "investor" : "admin";
    const dashboardHref = `/dashboard/${roleSlug}`;
    const settingsHref = `/dashboard/${roleSlug}/settings`;
    const helpHref = isAdmin ? "/dashboard/admin/support" : `/dashboard/${roleSlug}/help`;

    // ---- Final Stakeholder Dashboard Structure: main buttons + sub-buttons for this role ----
    const stakeholderRole = stakeholderNavRole(navRole, partnerOrgKind);
    const stakeholderNav = stakeholderRole ? STAKEHOLDER_NAV[stakeholderRole] : null;

    /** Live count for one link. Keyed by the exact href the menu uses, so a queue shows once. */
    const countForHref = useCallback(
        (href: string): number | undefined => {
            const { path } = splitHref(href);
            if (path.endsWith("/messages")) return unreadCount || undefined;
            if (path.endsWith("/notifications")) return notificationUnreadCount || undefined;
            if (isFaculty) {
                if (href === `${FACULTY_CS_HUB}?view=review&tab=apps`) return facultyQueueCounts.joinApplications || undefined;
                if (href === "/dashboard/faculty/quick-work") return facultyQuickWorkPending || undefined;
            }
            if (isAdmin && adminCounts) {
                switch (href) {
                    case "/dashboard/admin/approvals?tab=pending_admin":
                        return adminCounts.opportunityApprovals || undefined;
                    case "/dashboard/admin/join-applications":
                        return adminCounts.joinApplications || undefined;
                    case "/dashboard/admin/reports/verify":
                        return adminCounts.reportsAwaitingAdmin || undefined;
                    case "/dashboard/admin/quick-work?status=admin_review":
                        return adminCounts.quickWork || undefined;
                    case "/dashboard/admin/users":
                        return adminCounts.userApprovals || undefined;
                    case "/dashboard/admin/payments":
                        return adminCounts.payments || undefined;
                    case "/dashboard/admin/org-membership":
                        return adminCounts.orgMembership || undefined;
                    case "/dashboard/admin/issue-logs":
                        return adminCounts.issueLogsOpen || undefined;
                    case "/dashboard/admin/support":
                        return adminCounts.supportOpen || undefined;
                    default:
                        return undefined;
                }
            }
            return undefined;
        },
        [unreadCount, notificationUnreadCount, isFaculty, facultyQueueCounts, facultyQuickWorkPending, isAdmin, adminCounts],
    );

    const prefetchForHref = useCallback(
        (href: string): (() => void) | undefined => {
            if (!isStudent) return undefined;
            if (href.startsWith(STUDENT_CS_HUB)) return () => prefetchStudentPathData("communityService");
            if (href === "/dashboard/student/impact") return () => prefetchStudentImpactPortfolio();
            return undefined;
        },
        [isStudent],
    );

    /** Main buttons with live counts on their sub-buttons (and the sum on the main button). */
    const mainGroups = useMemo(
        () =>
            (stakeholderNav?.mainButtons ?? []).map((main: StakeholderMainButton) => {
                const items: NavItem[] = main.subButtons.map((sub) => ({
                    label: sub.label,
                    href: sub.href,
                    countPill: countForHref(sub.href),
                    onPrefetch: prefetchForHref(sub.href),
                }));
                const extra = isStudent && main.key === "impact" ? impactHistoryBadge : 0;
                const total = items.reduce((sum, item) => sum + (item.countPill ?? 0), 0) + extra;
                return { main, items, countPill: total || undefined };
            }),
        [stakeholderNav, countForHref, prefetchForHref, isStudent, impactHistoryBadge],
    );

    /** The other impact areas keep their own workspaces; Community Service is covered by the main buttons. */
    const otherAreas = useMemo<NavItem[]>(() => {
        if (isStudent) {
            return CIEL_PATHS.filter((path) => path.key !== "communityService").map((path) => ({
                label: path.label,
                href: path.href,
                emoji: path.emoji,
                needsAction: impactSummary?.pathsStatus?.[path.key]?.needsAction,
                onPrefetch: () => prefetchStudentPathData(path.key),
            }));
        }
        if (isFaculty) {
            return [
                { label: "Coursework Project", href: "/dashboard/faculty/coursework-projects", emoji: "📚" },
                { label: "Final Year Project (FYP)", href: "/dashboard/faculty/fyp-thesis", emoji: "🎓" },
                { label: "Startup / Business", href: "/dashboard/faculty/startup-business", emoji: "💼" },
            ];
        }
        if (isPartner && isUniversityPartnerOrg) {
            return [
                { label: "Coursework", href: "/dashboard/partner/university-showcase?mode=course-project", emoji: "📚" },
                { label: "Final Year Project (FYP)", href: "/dashboard/partner/university-showcase?mode=fyp-thesis", emoji: "🎓" },
                { label: "Startup / Venture", href: "/dashboard/partner/startup-business", emoji: "🚀" },
            ];
        }
        if (isAdmin) {
            return [
                { label: "Coursework", href: "/dashboard/admin/path-submissions?tab=course-project", emoji: "📚" },
                { label: "Final Year Project (FYP)", href: "/dashboard/admin/path-submissions?tab=fyp-thesis", emoji: "🎓" },
                { label: "Startup / Venture", href: "/dashboard/admin/startup-business", emoji: "🚀" },
                { label: "Faculty Work · All Universities", href: "/dashboard/admin/path-submissions?tab=fyp-thesis&view=faculty-work", emoji: "🧑‍🏫" },
            ];
        }
        return [];
    }, [isStudent, isFaculty, isPartner, isUniversityPartnerOrg, isAdmin, impactSummary]);

    const withCounts = useCallback(
        (items: NavItem[]): NavItem[] => items.map((item) => ({ ...item, countPill: item.countPill ?? countForHref(item.href) })),
        [countForHref],
    );

    /** Everything outside Community Service: inbox, organisation, platform administration. */
    const extraSections = useMemo<MenuSection[]>(() => {
        if (isStudent) {
            return [
                {
                    heading: "Inbox & payments",
                    items: withCounts([
                        { label: "Messages", href: "/dashboard/student/messages", icon: MessageSquare },
                        { label: "Notifications", href: "/dashboard/student/notifications", icon: Bell },
                        { label: "Payments", href: "/dashboard/student/payments", icon: CreditCard },
                    ]),
                },
            ];
        }
        if (isFaculty) {
            return [
                {
                    heading: "Inbox",
                    items: withCounts([
                        { label: "Messages", href: "/dashboard/faculty/messages", icon: MessageSquare },
                        { label: "Notifications", href: "/dashboard/faculty/notifications", icon: Bell },
                    ]),
                },
            ];
        }
        if (isPartner) {
            return [
                {
                    heading: "Organization",
                    items: withCounts([
                        { label: "My Organization", href: "/dashboard/partner/organization", icon: Building2 },
                        ...(partnerMembershipNav
                            ? [{ label: "Membership fee", href: "/dashboard/partner/membership-payment", icon: CreditCard }]
                            : []),
                        { label: "External Records", href: "/dashboard/partner/integrations", icon: Link2 },
                        { label: "Funding", href: "/dashboard/partner/funding", icon: PieChart },
                    ]),
                },
                {
                    heading: "Inbox",
                    items: withCounts([
                        { label: "Messages", href: "/dashboard/partner/messages", icon: MessageSquare },
                        { label: "Notifications", href: "/dashboard/partner/notifications", icon: Bell },
                    ]),
                },
            ];
        }
        if (isAdmin) {
            return [
                {
                    heading: "Accounts & payments",
                    items: withCounts([
                        { label: "Users & account approvals", href: "/dashboard/admin/users", icon: Users },
                        { label: "Organizations", href: "/dashboard/admin/organizations", icon: Building2 },
                        { label: "Faculty ↔ University scope", href: "/dashboard/admin/faculty-university-scope", icon: Link2 },
                        { label: "Payments", href: "/dashboard/admin/payments", icon: CreditCard },
                        { label: "Student subscriptions", href: "/dashboard/admin/student-subscriptions", icon: CreditCard },
                        { label: "Org membership fees", href: "/dashboard/admin/org-membership", icon: CreditCard },
                    ]),
                },
                {
                    heading: "Records & communication",
                    items: withCounts([
                        { label: "Path submissions", href: "/dashboard/admin/path-submissions", icon: BookOpen },
                        { label: "Project evidence export", href: "/dashboard/admin/project-evidence", icon: Archive },
                        { label: "Reports & moderation", href: "/dashboard/admin/reports", icon: ShieldAlert },
                        { label: "Follow-up tracker", href: "/dashboard/admin/followups", icon: History },
                        { label: "Messages", href: "/dashboard/admin/messages", icon: MessageSquare },
                        { label: "Notifications", href: "/dashboard/admin/notifications", icon: Bell },
                        { label: "Send email", href: "/dashboard/admin/email", icon: Mail },
                        { label: "CEP feedback", href: "/dashboard/admin/cep-feedback", icon: MessageSquare },
                        { label: "Platform tutorial", href: "/dashboard/admin/tutorials", icon: PlayCircle },
                    ]),
                },
                {
                    heading: "System & logs",
                    items: withCounts([
                        { label: "Issue Logs", href: "/dashboard/admin/issue-logs", icon: ShieldAlert },
                        { label: "Audit Logs", href: "/dashboard/admin/audit-logs", icon: History },
                        { label: "All-Fields Analytics Console", href: "/dashboard/admin/master-analytics", icon: Globe2 },
                    ]),
                },
            ];
        }
        return [];
    }, [isStudent, isFaculty, isPartner, isAdmin, partnerMembershipNav, withCounts]);

    const investorPaths = useMemo(
        () => [
            { label: "Dashboard", href: "/dashboard/investor?view=overview", emoji: "🏠" },
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

    const footerLinks = useMemo(() => {
        const items: NavItem[] = [];
        if (isStudent) items.push({ label: "My Profile", href: "/dashboard/student/profile", icon: User });
        if (isFaculty) items.push({ label: "My Profile", href: "/dashboard/faculty/profile", icon: User });
        items.push({ label: "Settings", href: settingsHref, icon: Settings });
        items.push({
            label: isInvestor ? "Help & Deal Desk" : isAdmin ? "Support desk" : "Help",
            href: isInvestor ? "/dashboard/investor?view=agreements" : helpHref,
            icon: HelpCircle,
            countPill: isAdmin ? countForHref(helpHref) : undefined,
        });
        return items;
    }, [isStudent, isFaculty, isInvestor, isAdmin, settingsHref, helpHref, countForHref]);

    const conditionalDashboardRows = useMemo<NavItem[]>(() => {
        const rows: NavItem[] = [];
        if (isStudent && studentSubscriptionNav) rows.push({ label: "Subscription fee", href: STUDENT_SUBSCRIPTION_PATH, emoji: "💳" });
        return rows;
    }, [isStudent, studentSubscriptionNav]);

    const allRoleHrefs = useMemo(
        () => [
            dashboardHref,
            ...conditionalDashboardRows.map((l) => l.href),
            ...mainGroups.flatMap((g) => [g.main.href, ...g.items.map((l) => l.href)]),
            ...otherAreas.map((l) => l.href),
            ...extraSections.flatMap((s) => s.items.map((l) => l.href)),
            ...footerLinks.map((l) => l.href),
            ...(isInvestor ? investorPaths.map((l) => l.href) : []),
        ],
        [dashboardHref, conditionalDashboardRows, mainGroups, otherAreas, extraSections, footerLinks, isInvestor, investorPaths],
    );

    const paramCount = (href: string) => Array.from(splitHref(href).params.keys()).length;

    /**
     * A link is active when its path and every query parameter it names match the current URL,
     * unless a sibling link is a more specific match (more parameters, or a longer path).
     */
    const isNavActive = (href: string): boolean => {
        const { path: hrefPath, params } = splitHref(href);
        const hrefView = params.get("view");
        if (isInvestor && hrefView) {
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
        if (hrefPath === dashboardHref) return pathname === hrefPath && paramCount(href) === 0;
        if (pathname === hrefPath) {
            if (!hrefMatchesLocation(href, pathname, searchParams)) return false;
            const mine = paramCount(href);
            const moreSpecific = allRoleHrefs.some(
                (other) =>
                    other !== href &&
                    splitHref(other).path === hrefPath &&
                    paramCount(other) > mine &&
                    hrefMatchesLocation(other, pathname, searchParams),
            );
            return !moreSpecific;
        }
        if (!pathname.startsWith(`${hrefPath}/`)) return false;
        if (paramCount(href) > 0) return false;
        const longerChild = allRoleHrefs.some((other) => {
            const otherPath = splitHref(other).path;
            return otherPath !== hrefPath && otherPath.startsWith(`${hrefPath}/`) && (pathname === otherPath || pathname.startsWith(`${otherPath}/`));
        });
        return !longerChild;
    };

    // Which main button owns the current page: it opens by itself. Manual toggles are remembered
    // until the route changes.
    const activeMain = stakeholderNav ? activeMainButton(stakeholderNav, pathname, searchParams) : null;
    const locationKey = `${pathname}?${searchParams.toString()}`;
    const [groupToggles, setGroupToggles] = useState<{ location: string; open: Record<string, boolean> }>({ location: "", open: {} });
    const openGroups = groupToggles.location === locationKey ? groupToggles.open : {};
    const isGroupOpen = (key: string, fallback: boolean) => (key in openGroups ? openGroups[key] : fallback);
    const toggleGroup = (key: string, fallback: boolean) =>
        setGroupToggles((prev) => {
            const open = prev.location === locationKey ? prev.open : {};
            return { location: locationKey, open: { ...open, [key]: !(key in open ? open[key] : fallback) } };
        });

    const mobilePrimary =
        isFaculty
            ? { label: "Profile", href: "/dashboard/faculty/profile", icon: User }
            : isPartner
              ? { label: "Organization", href: "/dashboard/partner/organization", icon: Building2 }
              : isInvestor
                ? { label: "Profile", href: "/dashboard/investor?view=profile", icon: Building2 }
                : isStudent
                  ? { label: "Profile", href: "/dashboard/student/profile", icon: User }
                  : { label: "Settings", href: settingsHref, icon: Settings };

    const mobileSections: MenuSection[] = isInvestor
        ? [
              { heading: "My Dashboard", items: investorDash },
              { heading: "Deal Flow", items: investorDealFlow },
              { heading: "CIEL & You", items: investorCielYou },
              { heading: "Account", items: footerLinks },
          ]
        : [
              { heading: "My Dashboard", items: [{ label: "Dashboard", href: dashboardHref, icon: LayoutDashboard }, ...conditionalDashboardRows] },
              ...mainGroups.map((g) => ({ heading: `${g.main.emoji} ${g.main.label}`, items: g.items })),
              { heading: "Other impact areas", items: otherAreas },
              ...extraSections,
              { heading: "Account", items: footerLinks },
          ];

    const dashboardTitle = isFaculty
        ? "Faculty Impact Dashboard"
        : isUniversityPartnerOrg
          ? "University Dashboard"
          : isStudent
            ? "Student Impact Dashboard"
            : isInvestor
              ? "CIEL Investor Hub"
              : isAdmin
                ? "Super Admin Dashboard"
                : isPartner
                  ? partnerOrgLabel === "HEC / Government"
                      ? "HEC / Govt Dashboard"
                      : partnerOrgLabel === "Corporate Partner"
                        ? "Corporate Dashboard"
                        : partnerOrgKind === "ngo"
                          ? "NGO Dashboard"
                          : "Partner Dashboard"
                  : "Dashboard";

    const menuTitle = isInvestor
        ? "Investor Hub"
        : isUniversityPartnerOrg
          ? "University menu"
          : isPartner
            ? partnerOrgKind === "ngo"
                ? "NGO menu"
                : "Partner menu"
            : isFaculty
              ? "Faculty menu"
              : isStudent
                ? "Student menu"
                : "Admin menu";

    return (
        <>
        <aside
            className={clsx(
                "fixed left-0 top-0 z-40 hidden h-screen max-h-[100dvh] flex-col overflow-hidden text-white [color-scheme:dark] lg:flex ciel-transition",
                collapsed ? "w-[64px]" : "w-[280px]",
            )}
            style={{ background: "linear-gradient(180deg,#133747,#0f2d3a)" }}
        >
            <div className={clsx(
                "flex shrink-0 border-b border-white/10",
                collapsed ? "flex-col items-center gap-2 px-1.5 py-3" : "flex-row items-center justify-between gap-3 px-[18px] py-5",
            )}>
                <Link href="/" className="flex min-w-0 items-center gap-3.5">
                    <div className={clsx(
                        "relative grid shrink-0 place-items-center overflow-hidden border border-white/5 bg-white/[0.06]",
                        collapsed ? "h-10 w-10 rounded-xl p-0.5" : "h-[62px] w-[62px] rounded-2xl p-1",
                    )}>
                        <img src="/iel-pk-logo-192.webp" alt="IEL PK" className={clsx("object-contain", collapsed ? "h-8 w-8" : "h-11 w-11")} width={44} height={44} />
                    </div>
                    {!collapsed && (
                        <div className="flex min-w-0 flex-col">
                            <span className="text-[15px] font-bold leading-[1.25] text-white">
                                Community Impact <br /> Education Lab
                            </span>
                            <span className="mt-1 text-[11px] tracking-wide text-[#7ed0e4]">{dashboardTitle}</span>
                        </div>
                    )}
                </Link>
                <button
                    type="button"
                    onClick={toggleCollapsed}
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    className={clsx(
                        "ciel-transition flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green",
                        collapsed ? "bg-white/15 text-white" : "text-white/50",
                    )}
                >
                    {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
                </button>
            </div>

            <div className="sidebar-scroll custom-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain py-2 pr-1">
                {isInvestor ? (
                    <>
                        <NavSectionLabel collapsed={collapsed}>My Dashboard</NavSectionLabel>
                        {investorDash.map((link) => (
                            <NavRow key={link.href} href={link.href} label={link.label} emoji={link.emoji} active={isNavActive(link.href)} collapsed={collapsed} />
                        ))}
                        <NavSectionLabel collapsed={collapsed}>Deal Flow</NavSectionLabel>
                        {investorDealFlow.map((link) => (
                            <NavRow key={link.href} href={link.href} label={link.label} emoji={link.emoji} active={isNavActive(link.href)} collapsed={collapsed} />
                        ))}
                        <NavSectionLabel collapsed={collapsed}>CIEL & You</NavSectionLabel>
                        {investorCielYou.map((link) => (
                            <NavRow key={link.href} href={link.href} label={link.label} emoji={link.emoji} active={isNavActive(link.href)} collapsed={collapsed} />
                        ))}
                        {!collapsed && <InvestorPlanCard />}
                    </>
                ) : (
                    <>
                        <NavSectionLabel collapsed={collapsed}>My Dashboard</NavSectionLabel>
                        <NavRow
                            href={dashboardHref}
                            label="Dashboard"
                            emoji="🏠"
                            active={pathname === dashboardHref}
                            collapsed={collapsed}
                            onPrefetch={
                                isStudent
                                    ? () => {
                                          void fetchStudentDashboardData({ redirectToLogin: false });
                                          void fetchImpactSummary({ redirectToLogin: false });
                                      }
                                    : undefined
                            }
                        />
                        {conditionalDashboardRows.map((row) => (
                            <NavRow key={row.href} href={row.href} label={row.label} emoji={row.emoji} active={isNavActive(row.href)} collapsed={collapsed} />
                        ))}

                        {stakeholderNav ? (
                            <>
                                <NavSectionLabel collapsed={collapsed}>Community Service</NavSectionLabel>
                                {mainGroups.map(({ main, items, countPill }) => {
                                    const active = activeMain?.key === main.key;
                                    return (
                                        <NavGroup
                                            key={main.key}
                                            id={`nav-${stakeholderNav.role}-${main.key}`}
                                            label={main.label}
                                            emoji={main.emoji}
                                            href={main.href}
                                            items={items}
                                            open={isGroupOpen(main.key, active)}
                                            onToggle={() => toggleGroup(main.key, active)}
                                            collapsed={collapsed}
                                            active={active}
                                            countPill={countPill}
                                            isActive={isNavActive}
                                        />
                                    );
                                })}
                            </>
                        ) : null}

                        {otherAreas.length > 0 ? (
                            <>
                                <NavSectionLabel collapsed={collapsed}>Other impact areas</NavSectionLabel>
                                {otherAreas.map((link) => (
                                    <NavRow
                                        key={link.href}
                                        href={link.href}
                                        label={link.label}
                                        emoji={link.emoji}
                                        active={isNavActive(link.href)}
                                        needsAction={link.needsAction}
                                        collapsed={collapsed}
                                        onPrefetch={link.onPrefetch}
                                    />
                                ))}
                            </>
                        ) : null}

                        {isAdmin ? (
                            <>
                                <NavSectionLabel collapsed={collapsed}>Platform administration</NavSectionLabel>
                                {extraSections.map((section) => {
                                    const key = `admin-${section.heading}`;
                                    const active = section.items.some((item) => isNavActive(item.href));
                                    const total = section.items.reduce((sum, item) => sum + (item.countPill ?? 0), 0);
                                    return (
                                        <NavGroup
                                            key={key}
                                            id={key.replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}
                                            label={section.heading}
                                            icon={section.heading.startsWith("Accounts") ? Users : section.heading.startsWith("Records") ? Archive : ShieldAlert}
                                            items={section.items}
                                            open={isGroupOpen(key, active)}
                                            onToggle={() => toggleGroup(key, active)}
                                            collapsed={collapsed}
                                            active={active}
                                            countPill={total || undefined}
                                            isActive={isNavActive}
                                        />
                                    );
                                })}
                            </>
                        ) : (
                            extraSections.map((section) => (
                                <div key={section.heading}>
                                    <NavSectionLabel collapsed={collapsed}>{section.heading}</NavSectionLabel>
                                    {section.items.map((link) => (
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
                                </div>
                            ))
                        )}
                    </>
                )}
                {/* Overlay scrollbars stay hidden until you scroll, so fade the bottom edge to show
                    there are more items below the fold. It takes its own space, so it never covers the last item. */}
                <div aria-hidden className="pointer-events-none sticky -bottom-2 h-8 bg-gradient-to-t from-[#0f2d3a] to-transparent" />
            </div>

            <div className="shrink-0 space-y-1 border-t border-white/10 p-3">
                {footerLinks.map((link) => (
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

        <nav
            className="fixed inset-x-0 bottom-0 z-50 border-t border-ciel-border bg-white/95 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-12px_30px_-20px_rgba(15,23,42,0.45)] backdrop-blur lg:hidden"
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
            title={menuTitle}
            items={mobileSections.flatMap((s) => s.items)}
            sections={mobileSections}
            onSignOut={handleLogout}
            isActive={isNavActive}
        />
        </>
    );
}
