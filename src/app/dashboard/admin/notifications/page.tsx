"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Bell, CheckCircle, Clock, Info, Loader2, Trash2 } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { broadcastUnreadNotificationsCount } from "@/utils/cielNotificationsUnread";
import { toast } from "sonner";

interface Notification {
    id: number;
    type: "approval" | "reminder" | "update" | "alert";
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
}

export default function AdminNotificationsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [filter, setFilter] = useState<"all" | "unread">("all");

    useEffect(() => {
        void fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await authenticatedFetch("/api/v1/notifications");
            if (res?.ok) {
                const data = await res.json();
                if (data.success) {
                    const list = data.data || [];
                    setNotifications(list);
                    broadcastUnreadNotificationsCount(list.filter((n: Notification) => !n.isRead).length);
                }
            }
        } catch (error) {
            console.error("Failed to fetch notifications", error);
            toast.error("Failed to load notifications");
        } finally {
            setIsLoading(false);
        }
    };

    const markAsRead = async (id: number) => {
        try {
            const res = await authenticatedFetch(`/api/v1/notifications/${id}/read`, {
                method: "PUT",
            });
            if (res?.ok) {
                setNotifications((prev) => {
                    const next = prev.map((item) => (item.id === id ? { ...item, isRead: true } : item));
                    broadcastUnreadNotificationsCount(next.filter((n) => !n.isRead).length);
                    return next;
                });
            }
        } catch (error) {
            console.error("Failed to mark notification as read", error);
            toast.error("Failed to mark as read");
        }
    };

    const deleteNotification = async (id: number) => {
        try {
            const res = await authenticatedFetch(`/api/v1/notifications/${id}`, {
                method: "DELETE",
            });
            if (res?.ok) {
                setNotifications((prev) => {
                    const next = prev.filter((item) => item.id !== id);
                    broadcastUnreadNotificationsCount(next.filter((n) => !n.isRead).length);
                    return next;
                });
                toast.success("Notification deleted");
            }
        } catch (error) {
            console.error("Failed to delete notification", error);
            toast.error("Failed to delete notification");
        }
    };

    const getTypeVisual = (type: Notification["type"]) => {
        switch (type) {
            case "approval":
                return {
                    bar: "bg-emerald-500",
                    iconWrap: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100/80",
                    icon: <CheckCircle className="h-5 w-5" strokeWidth={2} />,
                };
            case "reminder":
                return {
                    bar: "bg-sky-500",
                    iconWrap: "bg-sky-50 text-sky-700 ring-1 ring-sky-100/80",
                    icon: <Clock className="h-5 w-5" strokeWidth={2} />,
                };
            case "update":
                return {
                    bar: "bg-violet-500",
                    iconWrap: "bg-violet-50 text-violet-700 ring-1 ring-violet-100/80",
                    icon: <Info className="h-5 w-5" strokeWidth={2} />,
                };
            case "alert":
                return {
                    bar: "bg-amber-500",
                    iconWrap: "bg-amber-50 text-amber-700 ring-1 ring-amber-100/80",
                    icon: <AlertCircle className="h-5 w-5" strokeWidth={2} />,
                };
            default:
                return {
                    bar: "bg-slate-400",
                    iconWrap: "bg-slate-100 text-slate-600 ring-1 ring-slate-200/80",
                    icon: <Bell className="h-5 w-5" strokeWidth={2} />,
                };
        }
    };

    const formatDate = (iso: string) => {
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

    const filteredNotifications = notifications.filter((item) => (filter === "all" ? true : !item.isRead));
    const unreadCount = notifications.filter((item) => !item.isRead).length;

    return (
        <div className="p-6 sm:p-8">
            <div className="mb-8 flex flex-col gap-6 border-b border-slate-200/80 pb-8 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-lg shadow-slate-900/20">
                        <Bell className="h-7 w-7" strokeWidth={2} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Notifications</h1>
                        <p className="mt-1 text-sm text-slate-500 sm:text-base">
                            {unreadCount > 0
                                ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                                : "You're all caught up."}
                        </p>
                    </div>
                </div>
                <div
                    className="inline-flex w-full shrink-0 rounded-full bg-slate-100/90 p-1 ring-1 ring-slate-200/70 sm:w-auto"
                    role="group"
                    aria-label="Filter notifications"
                >
                    <button
                        type="button"
                        onClick={() => setFilter("all")}
                        className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-all sm:flex-none ${
                            filter === "all"
                                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
                                : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        All
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilter("unread")}
                        className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-all sm:flex-none ${
                            filter === "unread"
                                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
                                : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        Unread
                        <span
                            className={`ml-1.5 tabular-nums ${unreadCount > 0 ? "text-blue-600" : "text-slate-400"}`}
                        >
                            ({unreadCount})
                        </span>
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-24">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                    <p className="text-sm font-medium text-slate-500">Loading notifications…</p>
                </div>
            ) : filteredNotifications.length === 0 ? (
                <div className="rounded-2xl border border-slate-200/80 bg-white px-6 py-20 text-center shadow-sm">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-100">
                        <Bell className="h-8 w-8 text-slate-300" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">No notifications</h3>
                    <p className="mt-2 text-sm text-slate-500">You&apos;re all caught up.</p>
                </div>
            ) : (
                <ul className="mx-auto max-w-4xl space-y-3" role="list">
                    {filteredNotifications.map((notification) => {
                        const visual = getTypeVisual(notification.type);
                        const unread = !notification.isRead;
                        return (
                            <li key={notification.id}>
                                <article
                                    className={`group relative flex overflow-hidden rounded-xl border bg-white shadow-sm transition-all duration-200 hover:shadow-md ${
                                        unread
                                            ? "border-slate-200/90 ring-1 ring-slate-900/[0.04]"
                                            : "border-slate-200/70 opacity-[0.97] hover:opacity-100"
                                    }`}
                                >
                                    <div
                                        className={`w-1 shrink-0 self-stretch ${unread ? visual.bar : "bg-slate-200/80"}`}
                                        aria-hidden
                                    />
                                    <div className="flex min-w-0 flex-1 gap-4 p-4 sm:p-5">
                                        <div
                                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${visual.iconWrap}`}
                                        >
                                            {visual.icon}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {unread && (
                                                        <span
                                                            className="h-2 w-2 shrink-0 rounded-full bg-blue-500"
                                                            title="Unread"
                                                        />
                                                    )}
                                                    <h3
                                                        className={`text-[15px] font-semibold leading-snug text-slate-900 sm:text-base ${
                                                            unread ? "" : "text-slate-700"
                                                        }`}
                                                    >
                                                        {notification.title}
                                                    </h3>
                                                </div>
                                                <time
                                                    className="shrink-0 text-xs font-medium tabular-nums text-slate-400 sm:text-sm"
                                                    dateTime={notification.createdAt}
                                                >
                                                    {formatDate(notification.createdAt)}
                                                </time>
                                            </div>
                                            <p className="mt-2 text-sm leading-relaxed text-slate-600">{notification.message}</p>
                                            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                                                {unread ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => void markAsRead(notification.id)}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-transparent bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-none transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                                                    >
                                                        <CheckCircle className="h-3.5 w-3.5 text-blue-600" strokeWidth={2} />
                                                        Mark as read
                                                    </button>
                                                ) : null}
                                                <button
                                                    type="button"
                                                    onClick={() => void deleteNotification(notification.id)}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-transparent bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 text-red-500" strokeWidth={2} />
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
