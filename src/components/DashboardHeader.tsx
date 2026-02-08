"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search, User, LogOut } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";

export default function DashboardHeader() {
    const pathname = usePathname();

    // Clean up title from pathname
    const getTitle = () => {
        if (pathname.includes("student")) return "Student Dashboard";
        if (pathname.includes("partner")) return "Partner Portal";
        if (pathname.includes("faculty")) return "Faculty Hub";
        if (pathname.includes("admin")) return "Platform Admin";
        return "Dashboard";
    };

    const [user, setUser] = useState<{ name: string; role: string; email: string; notifications_count?: number } | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const storedUser = localStorage.getItem("ciel_user");
                let userId = null;
                if (storedUser) {
                    try {
                        const parsedUser = JSON.parse(storedUser);
                        userId = parsedUser.id;
                    } catch (e) {
                        console.error("Failed to parse user from local storage");
                    }
                }

                const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/user/me`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ userId: userId })
                });

                if (res && res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setUser(data.data);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch user profile", error);
            }
        };

        fetchUser();
    }, []);

    return (
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-30 ml-64">
            <div>
                <h1 className="text-xl font-bold text-slate-800">{getTitle()}</h1>
                <p className="text-xs text-slate-500 font-medium">Welcome back, {user?.name?.split(' ')[0] || "User"}</p>
            </div>

            <div className="flex items-center gap-6">
                <div className="relative hidden md:block">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="pl-10 pr-4 py-2 rounded-full border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-64 transition-all"
                    />
                </div>

                <button className="relative text-slate-500 hover:text-slate-800 transition-colors">
                    <Bell className="w-5 h-5" />
                    {user?.notifications_count ? (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                    ) : null}
                </button>

                <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
                    <div className="text-right hidden md:block">
                        <div className="text-sm font-bold text-slate-800">{user?.name || "Guest User"}</div>
                        <div className="text-xs text-slate-500 font-medium">{user?.role || "Visitor"}</div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                        <User className="w-5 h-5 text-slate-500" />
                    </div>
                    <Link href="/login" className="ml-2 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" title="Sign Out">
                        <LogOut className="w-5 h-5" />
                    </Link>
                </div>
            </div>
        </header>
    );
}
