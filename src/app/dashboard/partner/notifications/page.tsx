"use client";

import { useState, useEffect } from "react";
import { Bell, CheckCircle, Trash2, Filter, Loader2, AlertCircle, Info, Clock } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";

interface Notification {
    id: number;
    type: "approval" | "reminder" | "update" | "alert";
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
}

export default function PartnerNotificationsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [filter, setFilter] = useState<"all" | "unread">("all");

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await authenticatedFetch(`/api/v1/notifications`);
            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    setNotifications(data.data || []);
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
                method: 'PUT'
            });
            if (res && res.ok) {
                setNotifications(prev =>
                    prev.map(n => n.id === id ? { ...n, isRead: true } : n)
                );
            }
        } catch (error) {
            toast.error("Failed to mark as read");
        }
    };

    const deleteNotification = async (id: number) => {
        try {
            const res = await authenticatedFetch(`/api/v1/notifications/${id}`, {
                method: 'DELETE'
            });
            if (res && res.ok) {
                setNotifications(prev => prev.filter(n => n.id !== id));
                toast.success("Notification deleted");
            }
        } catch (error) {
            toast.error("Failed to delete notification");
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "approval": return <CheckCircle className="w-5 h-5 text-green-600" />;
            case "reminder": return <Clock className="w-5 h-5 text-blue-600" />;
            case "update": return <Info className="w-5 h-5 text-purple-600" />;
            case "alert": return <AlertCircle className="w-5 h-5 text-orange-600" />;
            default: return <Bell className="w-5 h-5 text-slate-600" />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case "approval": return "bg-green-50 border-green-200";
            case "reminder": return "bg-blue-50 border-blue-200";
            case "update": return "bg-purple-50 border-purple-200";
            case "alert": return "bg-orange-50 border-orange-200";
            default: return "bg-slate-50 border-slate-200";
        }
    };

    const filteredNotifications = notifications.filter(n =>
        filter === "all" ? true : !n.isRead
    );

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
                    <p className="text-slate-500">
                        {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setFilter("all")}
                        className={`px-4 py-2 rounded-lg font-semibold transition-colors ${filter === "all"
                                ? "bg-blue-600 text-white"
                                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                            }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter("unread")}
                        className={`px-4 py-2 rounded-lg font-semibold transition-colors ${filter === "unread"
                                ? "bg-blue-600 text-white"
                                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                            }`}
                    >
                        Unread ({unreadCount})
                    </button>
                </div>
            </div>

            {/* Notifications List */}
            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
                </div>
            ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
                    <Bell className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 mb-2">No Notifications</h3>
                    <p className="text-slate-500">You're all caught up!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredNotifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`rounded-2xl border p-5 transition-all ${notification.isRead
                                    ? "bg-white border-slate-100"
                                    : `${getTypeColor(notification.type)} border-2`
                                }`}
                        >
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 mt-1">
                                    {getIcon(notification.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4 mb-2">
                                        <h3 className="font-bold text-slate-900">{notification.title}</h3>
                                        <span className="text-xs text-slate-500 whitespace-nowrap">
                                            {new Date(notification.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-slate-600 text-sm mb-3">{notification.message}</p>
                                    <div className="flex gap-2">
                                        {!notification.isRead && (
                                            <button
                                                onClick={() => markAsRead(notification.id)}
                                                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                            >
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                Mark as read
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteNotification(notification.id)}
                                            className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
