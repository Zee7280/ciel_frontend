"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { AlertCircle, Bell, CheckCircle, Clock, GraduationCap, Info, Loader2, LogOut, Search, User } from "lucide-react";
import { useRouter } from "next/navigation";
import {
    dashboardNavRoleFromPathname,
    readDashboardNavRoleFromStorage,
    type DashboardNavRole,
} from "@/utils/dashboardNavRole";
import { authenticatedFetch } from "@/utils/api";
import { CIEL_NOTIFICATIONS_UNREAD_EVENT, type CielNotificationsUnreadEventDetail } from "@/utils/cielNotificationsUnread";
import { clearStudentDashboardCache } from "@/utils/student-dashboard-cache";
import {
    CIEL_FACULTY_SCOPE_EVENT,
    clearFacultyScopeSession,
    readFacultyScopeSession,
    type FacultyScopeSessionPayload,
} from "@/utils/facultyScopeSession";
import { namedTimeGreeting } from "@/utils/timeGreeting";

function studentPageKicker(pathname: string): string {
    const p = pathname.replace(/\/+$/, "") || pathname;
    if (p === "/dashboard/student") return "Overview";
    if (p.startsWith("/dashboard/student/browse")) return "Browse opportunities";
    if (p.startsWith("/dashboard/student/impact")) return "Impact";
    if (p.startsWith("/dashboard/student/payments") || p.startsWith("/dashboard/student/payment")) return "Payments";
    if (p.startsWith("/dashboard/student/messages")) return "Messages";
    if (p.startsWith("/dashboard/student/notifications")) return "Notifications";
    if (p.startsWith("/dashboard/student/tutorials")) return "Platform tutorial";
    if (p.startsWith("/dashboard/student/help")) return "Help";
    if (p.startsWith("/dashboard/student/settings")) return "Settings";
    if (p.startsWith("/dashboard/student/profile")) return "Profile";
    if (p.startsWith("/dashboard/student/report")) return "Impact report";
    if (p.startsWith("/dashboard/student/create-opportunity")) return "Create opportunity";
    if (p.startsWith("/dashboard/student/paths/community-service")) return "Community Service";
    if (p.startsWith("/dashboard/student/paths/course-project")) return "Course Project";
    if (p.startsWith("/dashboard/student/paths/fyp-thesis")) return "FYP / Thesis";
    if (p.startsWith("/dashboard/student/paths/startup-business")) return "Startup / Business";
    if (p.startsWith("/dashboard/student/engagement")) return "Engagement";
    if (p.startsWith("/dashboard/student/projects")) return "My projects";
    return "Student";
}

type HeaderNotification = {
    id: number;
    type: "approval" | "reminder" | "update" | "alert";
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
};

export default function DashboardHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const [navRole, setNavRole] = useState<DashboardNavRole>(() => dashboardNavRoleFromPathname(pathname));

    useLayoutEffect(() => {
        const fromUser = readDashboardNavRoleFromStorage();
        if (fromUser) setNavRole(fromUser);
        else setNavRole(dashboardNavRoleFromPathname(pathname));
    }, [pathname]);

    const handleLogout = () => {
        localStorage.removeItem("ciel_user");
        localStorage.removeItem("ciel_token");
        clearStudentDashboardCache();
        clearFacultyScopeSession();
        router.push("/login");
    };

    const [user, setUser] = useState<{ name: string; role: string; email: string; image?: string; logoUrl?: string; notifications_count?: number } | null>(null);

    const [facultyDelegatedScope, setFacultyDelegatedScope] = useState<FacultyScopeSessionPayload | null>(null);

    useEffect(() => {
        if (navRole !== "faculty") {
            setFacultyDelegatedScope(null);
            return;
        }
        const sync = () => setFacultyDelegatedScope(readFacultyScopeSession());
        sync();
        window.addEventListener(CIEL_FACULTY_SCOPE_EVENT, sync);
        return () => window.removeEventListener(CIEL_FACULTY_SCOPE_EVENT, sync);
    }, [navRole, pathname]);

    const getTitle = () => {
        if (navRole === "student") return "Student Dashboard";
        if (navRole === "partner") return "Partner Portal";
        if (navRole === "faculty") return "Faculty Hub";
        if (navRole === "admin") return "Platform Admin";
        return "Dashboard";
    };

    const isStudent = navRole === "student";
    const firstName = user?.name?.trim().split(/\s+/)[0] || "";
    const greeting = namedTimeGreeting(firstName);

    useEffect(() => {
        const loadUserFromStorage = () => {
            try {
                const storedUser = localStorage.getItem("ciel_user") || localStorage.getItem("user");
                if (storedUser) {
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                }
            } catch (e) {
                console.error("Failed to parse user from localStorage");
            }
        };

        loadUserFromStorage();
        window.addEventListener("ciel_user_updated", loadUserFromStorage);
        return () => window.removeEventListener("ciel_user_updated", loadUserFromStorage);
    }, []);

    // Prefer stored aliases — login payload carries `avatar` from API while header historically read `image` / partner `logoUrl`.
    const getProfileImage = () => {
        const raw = user as Record<string, unknown> | undefined;
        if (!raw) return undefined;
        const picks = ["image", "logoUrl", "avatar_url", "avatarUrl", "avatar"] as const;
        for (const k of picks) {
            const v = raw[k];
            if (typeof v === "string" && v.trim()) return v.trim();
        }
        return undefined;
    };

    const notificationHref =
        navRole === "student"
            ? "/dashboard/student/notifications"
            : navRole === "partner"
              ? "/dashboard/partner/notifications"
              : navRole === "faculty"
                ? "/dashboard/faculty/notifications"
                : navRole === "admin"
                  ? "/dashboard/admin/notifications"
                  : null;

    const [notifOpen, setNotifOpen] = useState(false);
    const [notifLoading, setNotifLoading] = useState(false);
    const [notifPreview, setNotifPreview] = useState<HeaderNotification[]>([]);
    const notifWrapRef = useRef<HTMLDivElement>(null);

    const [headerUnreadBellCount, setHeaderUnreadBellCount] = useState(0);

    useEffect(() => {
        if (!notificationHref) {
            setHeaderUnreadBellCount(0);
            return;
        }
        const syncFromStorage = () => {
            try {
                const raw = localStorage.getItem("ciel_user") || localStorage.getItem("user");
                const u = raw ? JSON.parse(raw) : null;
                if (typeof u?.notifications_count === "number") {
                    setHeaderUnreadBellCount(u.notifications_count);
                }
            } catch {
                /* ignore */
            }
        };
        syncFromStorage();
        const onUnreadEvent = (e: Event) => {
            const ce = e as CustomEvent<CielNotificationsUnreadEventDetail>;
            if (typeof ce.detail?.count === "number") {
                setHeaderUnreadBellCount(ce.detail.count);
            }
        };
        window.addEventListener(CIEL_NOTIFICATIONS_UNREAD_EVENT, onUnreadEvent);
        window.addEventListener("ciel_user_updated", syncFromStorage);
        return () => {
            window.removeEventListener(CIEL_NOTIFICATIONS_UNREAD_EVENT, onUnreadEvent);
            window.removeEventListener("ciel_user_updated", syncFromStorage);
        };
    }, [notificationHref]);

    const loadHeaderNotifications = useCallback(async () => {
        if (!notificationHref) return;
        setNotifLoading(true);
        try {
            const res = await authenticatedFetch("/api/v1/notifications", {}, { redirectToLogin: false });
            if (res?.ok) {
                const data = (await res.json()) as { success?: boolean; data?: HeaderNotification[] };
                if (data.success && Array.isArray(data.data)) {
                    const sorted = [...data.data].sort(
                        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                    );
                    setNotifPreview(sorted.slice(0, 3));
                } else {
                    setNotifPreview([]);
                }
            } else {
                setNotifPreview([]);
            }
        } catch {
            setNotifPreview([]);
        } finally {
            setNotifLoading(false);
        }
    }, [notificationHref]);

    useEffect(() => {
        if (notifOpen && notificationHref) {
            void loadHeaderNotifications();
        }
    }, [notifOpen, notificationHref, loadHeaderNotifications]);

    useEffect(() => {
        if (!notifOpen) return;
        const onDocMouseDown = (e: MouseEvent) => {
            if (!notifWrapRef.current?.contains(e.target as Node)) {
                setNotifOpen(false);
            }
        };
        document.addEventListener("mousedown", onDocMouseDown);
        return () => document.removeEventListener("mousedown", onDocMouseDown);
    }, [notifOpen]);

    useEffect(() => {
        setNotifOpen(false);
    }, [pathname]);

    const goNotifications = () => {
        if (!notificationHref) return;
        setNotifOpen(false);
        router.push(notificationHref);
    };

    const formatNotifDate = (iso: string) => {
        try {
            return new Date(iso).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
            });
        } catch {
            return "";
        }
    };

    const getTypeVisual = (type: HeaderNotification["type"]) => {
        switch (type) {
            case "approval":
                return {
                    bar: "bg-emerald-500",
                    iconWrap: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100/80",
                    icon: <CheckCircle className="h-4 w-4" strokeWidth={2} />,
                };
            case "reminder":
                return {
                    bar: "bg-sky-500",
                    iconWrap: "bg-sky-50 text-sky-700 ring-1 ring-sky-100/80",
                    icon: <Clock className="h-4 w-4" strokeWidth={2} />,
                };
            case "update":
                return {
                    bar: "bg-violet-500",
                    iconWrap: "bg-violet-50 text-violet-700 ring-1 ring-violet-100/80",
                    icon: <Info className="h-4 w-4" strokeWidth={2} />,
                };
            case "alert":
                return {
                    bar: "bg-amber-500",
                    iconWrap: "bg-amber-50 text-amber-700 ring-1 ring-amber-100/80",
                    icon: <AlertCircle className="h-4 w-4" strokeWidth={2} />,
                };
            default:
                return {
                    bar: "bg-slate-400",
                    iconWrap: "bg-slate-100 text-slate-600 ring-1 ring-slate-200/80",
                    icon: <Bell className="h-4 w-4" strokeWidth={2} />,
                };
        }
    };

    return (
        <header className="ciel-transition sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-ciel-border bg-white px-4 py-3 font-sans sm:px-6 lg:ml-[var(--ciel-sidebar-width)] lg:h-20 lg:px-8">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-base font-black tracking-tight text-ciel-text sm:text-xl">
                        {isStudent ? greeting : getTitle()}
                    </h1>
                    {navRole === "faculty" && facultyDelegatedScope?.organization_name ? (
                        <span
                            className="inline-flex max-w-[min(100%,14rem)] items-center gap-1 rounded-full border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-900 shadow-sm sm:max-w-[20rem]"
                            title="Admin-assigned university-wide visibility for matching student profiles"
                        >
                            <GraduationCap className="h-3.5 w-3.5 shrink-0 text-indigo-600" aria-hidden />
                            <span className="truncate">Uni scope: {facultyDelegatedScope.organization_name}</span>
                        </span>
                    ) : null}
                </div>
                <p className="truncate text-[10px] font-bold uppercase tracking-wider text-ciel-text-soft">
                    {isStudent ? studentPageKicker(pathname) : greeting}
                </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-4 lg:gap-6">
                <div className="relative hidden md:block">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ciel-text-soft" />
                    <input
                        type="text"
                        placeholder="Search dashboard..."
                        className="w-64 rounded-xl border border-ciel-border bg-ciel-page/50 py-2 pl-10 pr-4 text-sm font-medium text-ciel-text transition-all focus:border-ciel-green focus:outline-none focus:ring-4 focus:ring-ciel-green/15"
                    />
                </div>

                {notificationHref ? (
                    <div className="relative" ref={notifWrapRef}>
                        <button
                            type="button"
                            onClick={() => setNotifOpen((o) => !o)}
                            className="group relative rounded-xl p-2.5 text-ciel-text-soft transition-all hover:bg-ciel-green-soft hover:text-ciel-green-deep"
                            aria-expanded={notifOpen}
                            aria-haspopup="dialog"
                            aria-label="Notifications"
                        >
                            <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            {headerUnreadBellCount > 0 ? (
                                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white" />
                            ) : null}
                        </button>
                        {notifOpen ? (
                            <div
                                className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/[0.04]"
                                role="dialog"
                                aria-label="Recent notifications"
                            >
                                <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Recent</p>
                                    <p className="text-sm font-semibold text-slate-900">Notifications</p>
                                </div>
                                <div className="max-h-[min(24rem,70vh)] overflow-y-auto p-2">
                                    {notifLoading ? (
                                        <div className="flex flex-col items-center justify-center gap-2 py-10">
                                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                            <p className="text-xs font-medium text-slate-500">Loading…</p>
                                        </div>
                                    ) : notifPreview.length === 0 ? (
                                        <div className="px-3 py-8 text-center">
                                            <p className="text-sm font-medium text-slate-600">No notifications yet</p>
                                            <p className="mt-1 text-xs text-slate-500">You&apos;re all caught up.</p>
                                        </div>
                                    ) : (
                                        <ul className="space-y-2" role="list">
                                            {notifPreview.map((notification) => {
                                                const visual = getTypeVisual(notification.type);
                                                const unread = !notification.isRead;
                                                return (
                                                    <li key={notification.id}>
                                                        <button
                                                            type="button"
                                                            onClick={goNotifications}
                                                            className={`flex w-full overflow-hidden rounded-xl border bg-white text-left shadow-sm transition hover:shadow-md ${
                                                                unread
                                                                    ? "border-slate-200/90 ring-1 ring-slate-900/[0.04]"
                                                                    : "border-slate-200/70 opacity-[0.97] hover:opacity-100"
                                                            }`}
                                                        >
                                                            <div
                                                                className={`w-1 shrink-0 self-stretch ${unread ? visual.bar : "bg-slate-200/80"}`}
                                                                aria-hidden
                                                            />
                                                            <div className="flex min-w-0 flex-1 gap-3 p-3">
                                                                <div
                                                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${visual.iconWrap}`}
                                                                >
                                                                    {visual.icon}
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <div className="flex min-w-0 items-center gap-1.5">
                                                                            {unread ? (
                                                                                <span
                                                                                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500"
                                                                                    title="Unread"
                                                                                />
                                                                            ) : null}
                                                                            <span className="truncate text-sm font-semibold text-slate-900">
                                                                                {notification.title}
                                                                            </span>
                                                                        </div>
                                                                        <time
                                                                            className="shrink-0 text-[10px] font-medium tabular-nums text-slate-400"
                                                                            dateTime={notification.createdAt}
                                                                        >
                                                                            {formatNotifDate(notification.createdAt)}
                                                                        </time>
                                                                    </div>
                                                                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">
                                                                        {notification.message}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                                <div className="border-t border-slate-100 bg-slate-50/50 p-2">
                                    <button
                                        type="button"
                                        onClick={goNotifications}
                                        className="w-full rounded-xl bg-blue-600 px-3 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
                                    >
                                        View all notifications
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <button type="button" className="group relative rounded-xl p-2.5 text-ciel-text-soft transition-all hover:bg-ciel-green-soft hover:text-ciel-green-deep">
                        <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        {(user?.notifications_count ?? 0) > 0 ? (
                            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white"></span>
                        ) : null}
                    </button>
                )}

                <div className="flex items-center gap-2 border-l border-ciel-border pl-2 sm:gap-4 sm:pl-4 lg:pl-6">
                    <div className="text-right hidden md:block">
                        <div className="mb-1 text-sm font-black leading-none text-ciel-text">{user?.name || "Guest User"}</div>
                        <div className="text-[10px] font-bold uppercase leading-none tracking-widest text-ciel-text-soft">{user?.role || "Visitor"}</div>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border-2 border-slate-50 bg-slate-100 shadow-sm transition-all hover:border-blue-200 sm:h-11 sm:w-11">
                        {getProfileImage() ? (
                            <img src={getProfileImage()} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-6 h-6 text-slate-400" />
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="rounded-xl p-2.5 text-slate-400 transition-all hover:bg-slate-50 hover:text-[#4285F4]"
                        aria-label="Log out"
                        title="Log out"
                    >
                        <LogOut className="h-5 w-5 shrink-0" aria-hidden />
                    </button>
                </div>
            </div>
        </header>
    );
}
