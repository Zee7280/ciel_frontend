"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { AlertCircle, Bell, CheckCircle, Clock, Info, Loader2, LogOut, Search, User } from "lucide-react";
import { useRouter } from "next/navigation";
import {
    dashboardNavRoleFromPathname,
    readDashboardNavRoleFromStorage,
    type DashboardNavRole,
} from "@/utils/dashboardNavRole";
import { authenticatedFetch, isTokenValid } from "@/utils/api";
import { CIEL_NOTIFICATIONS_UNREAD_EVENT, type CielNotificationsUnreadEventDetail, broadcastUnreadNotificationsCount } from "@/utils/cielNotificationsUnread";
import { clearStudentDashboardCache } from "@/utils/student-dashboard-cache";

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
        router.push("/login");
    };

    const [user, setUser] = useState<{ name: string; role: string; email: string; image?: string; logoUrl?: string; notifications_count?: number } | null>(null);

    const getTitle = () => {
        if (navRole === "student") return "Student Dashboard";
        if (navRole === "partner") return "Partner Portal";
        if (navRole === "faculty") return "Faculty Hub";
        if (navRole === "admin") return "Platform Admin";
        return "Dashboard";
    };

    const isStudentHome = navRole === "student" && pathname === "/dashboard/student";
    const firstName = user?.name?.split(/\s+/)[0] || "User";

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

    // Helper to get image URL
    const getProfileImage = () => {
        return user?.image || user?.logoUrl;
    };

    const notificationHref =
        navRole === "student"
            ? "/dashboard/student/notifications"
            : navRole === "partner"
              ? "/dashboard/partner/notifications"
              : navRole === "faculty"
                ? "/dashboard/faculty/notifications"
                : null;

    const [notifOpen, setNotifOpen] = useState(false);
    const [notifLoading, setNotifLoading] = useState(false);
    const [notifPreview, setNotifPreview] = useState<HeaderNotification[]>([]);
    const notifWrapRef = useRef<HTMLDivElement>(null);

    /** After first successful poll, overrides `user.notifications_count` from localStorage for the bell badge. */
    const [liveUnreadInboxCount, setLiveUnreadInboxCount] = useState<number | null>(null);

    const refreshUnreadInboxCount = useCallback(async () => {
        if (!notificationHref) return;
        if (!isTokenValid(localStorage.getItem("ciel_token"))) return;
        try {
            const res = await authenticatedFetch("/api/v1/notifications/unread-count", {}, { redirectToLogin: false });
            if (!res?.ok) return;
            const data = (await res.json()) as { success?: boolean; data?: { count?: number } };
            if (data.success && typeof data.data?.count === "number") {
                const count = data.data.count;
                setLiveUnreadInboxCount(count);
                broadcastUnreadNotificationsCount(count);
            }
        } catch {
            /* non-fatal */
        }
    }, [notificationHref]);

    useEffect(() => {
        if (!notificationHref) {
            setLiveUnreadInboxCount(null);
            return;
        }
        void refreshUnreadInboxCount();
        const interval = setInterval(() => void refreshUnreadInboxCount(), 30000);
        return () => clearInterval(interval);
    }, [notificationHref, refreshUnreadInboxCount]);

    useEffect(() => {
        if (!notificationHref) return;
        const handler = (e: Event) => {
            const ce = e as CustomEvent<CielNotificationsUnreadEventDetail>;
            if (typeof ce.detail?.count === "number") {
                setLiveUnreadInboxCount(ce.detail.count);
            }
        };
        window.addEventListener(CIEL_NOTIFICATIONS_UNREAD_EVENT, handler);
        return () => window.removeEventListener(CIEL_NOTIFICATIONS_UNREAD_EVENT, handler);
    }, [notificationHref]);

    const headerUnreadBellCount =
        liveUnreadInboxCount !== null ? liveUnreadInboxCount : (user?.notifications_count ?? 0);

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
        void refreshUnreadInboxCount();
    }, [notificationHref, refreshUnreadInboxCount]);

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
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 font-sans sm:px-6 lg:ml-64 lg:h-20 lg:px-8">
            <div className="min-w-0">
                <h1 className="truncate text-base font-black tracking-tight text-slate-900 sm:text-xl">
                    {isStudentHome ? `Welcome back, ${firstName}!` : getTitle()}
                </h1>
                <p className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {isStudentHome ? "Overview" : `Welcome back, ${firstName}`}
                </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-4 lg:gap-6">
                <div className="relative hidden md:block">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search dashboard..."
                        className="pl-10 pr-4 py-2 rounded-xl border border-slate-100 bg-slate-50/50 text-sm focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 w-64 transition-all font-medium"
                    />
                </div>

                {notificationHref ? (
                    <div className="relative" ref={notifWrapRef}>
                        <button
                            type="button"
                            onClick={() => setNotifOpen((o) => !o)}
                            className="relative p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all group"
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
                    <button type="button" className="relative p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all group">
                        <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        {(user?.notifications_count ?? 0) > 0 ? (
                            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white"></span>
                        ) : null}
                    </button>
                )}

                <div className="flex items-center gap-2 border-l border-slate-100 pl-2 sm:gap-4 sm:pl-4 lg:pl-6">
                    <div className="text-right hidden md:block">
                        <div className="text-sm font-black text-slate-900 leading-none mb-1">{user?.name || "Guest User"}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">{user?.role || "Visitor"}</div>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border-2 border-slate-50 bg-slate-100 shadow-sm transition-all hover:border-blue-200 sm:h-11 sm:w-11">
                        {getProfileImage() ? (
                            <img src={getProfileImage()} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-6 h-6 text-slate-400" />
                        )}
                    </div>
                    <button
                        onClick={handleLogout}
                        className="hidden rounded-xl p-2.5 text-slate-300 transition-all hover:bg-slate-50 hover:text-[#4285F4] sm:block"
                        title="Sign Out"
                    >
                        <LogOut className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </div>
            </div>
        </header>
    );
}
