"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { LayoutDashboard, BookOpen, Users, Settings, PieChart, LogOut, FileText, Heart, Building2, CheckCircle, Briefcase, FileBarChart, ShieldAlert, Bell, User, Flag, MessageSquare, Plus } from "lucide-react";
import clsx from "clsx";
import { authenticatedFetch } from "@/utils/api";

export default function Sidebar() {
    const pathname = usePathname();
    const [unreadCount, setUnreadCount] = useState(0);
    const router = useRouter();

    const handleLogout = () => {
        localStorage.removeItem("ciel_user");
        localStorage.removeItem("ciel_token");
        router.push("/login");
    };

    useEffect(() => {
        const fetchUnreadCount = async () => {
            try {
                const res = await authenticatedFetch("/api/v1/chat/unread-count");
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
    }, []);

    // Determine role based on path (simple logic for now)
    const isStudent = pathname.includes("/student");
    const isPartner = pathname.includes("/partner");
    const isFaculty = pathname.includes("/faculty");
    const isAdmin = pathname.includes("/admin");

    // Helper icons import
    function FolderOpen(props: any) { return <FileText {...props} /> }
    function Globe(props: any) { return <Building2 {...props} /> }

    const roleLinks = [
        // Student
        ...(isStudent ? [
            { label: "My Projects", href: "/dashboard/student/projects", icon: FolderOpen },
            { label: "Create Opportunity", href: "/dashboard/student/create-opportunity", icon: Plus },
            { label: "Browse Opportunities", href: "/dashboard/student/browse", icon: Globe },
            { label: "Impact History", href: "/dashboard/student/impact", icon: PieChart },
            { label: "Messages", href: "/dashboard/student/messages", icon: MessageSquare },
            { label: "My Profile", href: "/dashboard/student/profile", icon: User },
        ] : []),
        // Partner
        ...(isPartner ? [
            { label: "My Organization", href: "/dashboard/partner/organization", icon: Building2 },
            { label: "My Opportunities", href: "/dashboard/partner/requests", icon: Briefcase },

            { label: "Verify Work", href: "/dashboard/partner/verification", icon: CheckCircle },
            { label: "Reports", href: "/dashboard/partner/reports", icon: FileText },
            { label: "Impact", href: "/dashboard/partner/impact", icon: FileBarChart },
            { label: "Messages", href: "/dashboard/partner/messages", icon: MessageSquare },
            { label: "Funding", href: "/dashboard/partner/funding", icon: PieChart },
            { label: "Notifications", href: "/dashboard/partner/notifications", icon: Bell },
            { label: "My Profile", href: "/dashboard/partner/profile", icon: User },
        ] : []),
        // Faculty
        ...(isFaculty ? [
            { label: "My Courses", href: "/dashboard/faculty/courses", icon: BookOpen },
            { label: "Project Approvals", href: "/dashboard/faculty/approvals", icon: CheckCircle },
            { label: "Create Opportunity", href: "/dashboard/faculty/create-opportunity", icon: Plus },
            { label: "Student Grading", href: "/dashboard/faculty/grading", icon: FileText },
            { label: "Messages", href: "/dashboard/faculty/messages", icon: MessageSquare },
            { label: "Impact Analytics", href: "/dashboard/faculty/analytics", icon: PieChart },
        ] : []),
        // Admin
        ...(isAdmin ? [
            { label: "Users", href: "/dashboard/admin/users", icon: Users },
            { label: "Organizations", href: "/dashboard/admin/organizations", icon: Building2 },
            { label: "Approvals", href: "/dashboard/admin/approvals", icon: CheckCircle },
            { label: "Projects", href: "/dashboard/admin/projects", icon: Briefcase },
            { label: "Student Reports", href: "/dashboard/admin/reports/verify", icon: FileText },
            { label: "Impact", href: "/dashboard/admin/impact", icon: FileBarChart },
            { label: "Messages", href: "/dashboard/admin/messages", icon: MessageSquare },
            { label: "Audit Logs", href: "/dashboard/admin/audit-logs", icon: ShieldAlert },
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
        <aside className="w-64 bg-slate-900 text-white min-h-screen fixed left-0 top-0 flex flex-col z-40">
            <div className="h-24 flex items-center px-4 border-b border-slate-800">
                <Link href="/" className="flex items-center gap-3">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                        <Image src="/logo-1.png" alt="CIEL Logo" width={64} height={64} className="object-contain" />
                    </div>
                    <div className="flex flex-col ml-1">
                        <span className="text-xs font-bold tracking-tight text-white leading-tight">
                            Community Impact <br /> Education Lab
                        </span>
                        <span className="text-[8px] text-emerald-400 font-[family-name:var(--font-dancing)] tracking-wide mt-0.5">
                            Youth Empowered Community Impact
                        </span>
                    </div>
                </Link>
            </div>

            <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto custom-scrollbar">
                {links.map((link) => {
                    const isActive = pathname === link.href;
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
                                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                            )}
                        </Link>
                    )
                })}
            </div>

            <div className="p-4 border-t border-slate-800">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-sm font-medium"
                >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
