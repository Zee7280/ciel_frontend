"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search, User, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DashboardHeader() {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = () => {
        localStorage.removeItem("ciel_user");
        localStorage.removeItem("ciel_token");
        router.push("/login");
    };

    // Clean up title from pathname
    const getTitle = () => {
        if (pathname.includes("student")) return "Student Dashboard";
        if (pathname.includes("partner")) return "Partner Portal";
        if (pathname.includes("faculty")) return "Faculty Hub";
        if (pathname.includes("admin")) return "Platform Admin";
        return "Dashboard";
    };

    const [user, setUser] = useState<{ name: string; role: string; email: string; image?: string; logoUrl?: string; notifications_count?: number } | null>(null);

    useEffect(() => {
        try {
            const storedUser = localStorage.getItem("ciel_user");
            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
            }
        } catch (e) {
            console.error("Failed to parse user from localStorage");
        }
    }, []);

    // Helper to get image URL
    const getProfileImage = () => {
        return user?.image || user?.logoUrl;
    };

    return (
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-30 ml-64 font-sans">
            <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">{getTitle()}</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Welcome back, {user?.name?.split(' ')[0] || "User"}</p>
            </div>

            <div className="flex items-center gap-6">
                <div className="relative hidden md:block">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search dashboard..."
                        className="pl-10 pr-4 py-2 rounded-xl border border-slate-100 bg-slate-50/50 text-sm focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 w-64 transition-all font-medium"
                    />
                </div>

                <button className="relative p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all group">
                    <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    {user?.notifications_count ? (
                        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white"></span>
                    ) : null}
                </button>

                <div className="flex items-center gap-4 pl-6 border-l border-slate-100">
                    <div className="text-right hidden md:block">
                        <div className="text-sm font-black text-slate-900 leading-none mb-1">{user?.name || "Guest User"}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">{user?.role || "Visitor"}</div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center border-2 border-slate-50 overflow-hidden shadow-sm group hover:border-blue-200 transition-all cursor-pointer">
                        {getProfileImage() ? (
                            <img src={getProfileImage()} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-6 h-6 text-slate-400" />
                        )}
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all group"
                        title="Sign Out"
                    >
                        <LogOut className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </div>
            </div>
        </header>
    );
}
