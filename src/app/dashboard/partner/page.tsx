"use client";

import { useEffect, useState } from "react";
import { HandHeart, Users, FileCheck, CircleDollarSign, Clock, FileText, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { authenticatedFetch } from "@/utils/api";

export default function PartnerDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchDashboardData() {
            try {
                const storedUser = localStorage.getItem("ciel_user");
                const user = storedUser ? JSON.parse(storedUser) : null;
                const userId = user?.id || user?.userId;

                if (!userId) {
                    console.error("User ID not found in storage");
                    setLoading(false);
                    return;
                }

                const response = await authenticatedFetch(`/api/v1/partners/dashboard?id=${userId}`);
                if (response?.ok) {
                    const result = await response.json();
                    if (result.success) {
                        setStats(result.data);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const colorStyles = {
        blue: "bg-blue-50 text-blue-600",
        green: "bg-green-50 text-green-600",
        purple: "bg-purple-50 text-purple-600",
        amber: "bg-amber-50 text-amber-600"
    };

    const statCards = [
        { label: "Active Opportunities", value: stats?.stats?.activeOpportunities ?? 0, icon: FileCheck, color: "blue" as const },
        { label: "Students Engaged", value: stats?.stats?.studentsEngaged ?? 0, icon: Users, color: "green" as const },
        { label: "Verified Hours", value: stats?.stats?.verifiedHours?.toLocaleString() ?? 0, icon: Clock, color: "purple" as const },
        { label: "Reports Submitted", value: stats?.stats?.reportsSubmitted ?? 0, icon: FileText, color: "amber" as const },
    ];

    return (
        <div className="space-y-8">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-800 rounded-3xl p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="relative z-10">
                    <h2 className="text-3xl font-bold mb-2">Welcome, Partner</h2>
                    <p className="text-blue-100 max-w-xl">Manage your project requests, track volunteer engagement, and report impact directly through the CIEL Partner Portal.</p>
                    <div className="mt-6 flex gap-4">
                        <Link href="/dashboard/partner/requests/new" className="bg-white text-blue-900 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors inline-block">Post New Request</Link>
                        <button className="bg-blue-800 text-white border border-blue-700 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors">View Reports</button>
                    </div>
                </div>
            </div>

            {/* Pending Verifications Alert */}
            {stats?.pendingVerifications > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-full text-amber-600">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-amber-900">Pending Verifications</h3>
                            <p className="text-sm text-amber-700">You have {stats.pendingVerifications} student reports waiting for your approval.</p>
                        </div>
                    </div>
                    <Link href="/dashboard/partner/verification" className="bg-amber-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-amber-700 transition-colors">
                        Review Now
                    </Link>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {statCards.map((stat, index) => (
                    <div key={index} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] flex flex-col gap-4 group hover:-translate-y-1 transition-transform">
                        <div className="flex justify-between items-start">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${colorStyles[stat.color]}`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold bg-slate-50 px-2 py-1 rounded text-slate-400">+12%</span>
                        </div>
                        <div>
                            <h3 className="text-3xl font-bold text-slate-800">{stat.value}</h3>
                            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Project Requests */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-800 text-lg">Recent Project Requests</h3>
                        <Link href="/dashboard/partner/requests" className="text-sm font-bold text-blue-600 hover:underline">View All</Link>
                    </div>
                    <div className="space-y-4">
                        {stats?.recentProjects?.length > 0 ? (
                            stats.recentProjects.map((project: any) => (
                                <div key={project.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-slate-50 rounded-xl hover:border-slate-100 hover:shadow-sm transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">#{project.id}</div>
                                        <div>
                                            <h4 className="font-bold text-slate-800">{project.title}</h4>
                                            <p className="text-xs text-slate-500">{project.location} • {project.volunteersNeeded} Volunteers Needed</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex -space-x-2">
                                            {/* Mock avatars */}
                                            <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white"></div>
                                            <div className="w-8 h-8 rounded-full bg-slate-300 border-2 border-white"></div>
                                            <div className="w-8 h-8 rounded-full bg-slate-400 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">+{project.volunteersApplied}</div>
                                        </div>
                                        <Link href={`/dashboard/partner/requests/${project.id}`} className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors">Manage</Link>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-slate-500 text-sm">No recent projects found.</div>
                        )}
                    </div>
                </div>

                {/* Impact Chart Placeholder */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center justify-center text-center">
                    <div className="w-48 h-48 rounded-full border-[12px] border-slate-50 border-t-blue-500 border-r-green-500 flex items-center justify-center mb-4 relative" style={{ background: `conic-gradient(from 0deg, #3b82f6 0%, #3b82f6 ${stats?.impactTarget?.percentage || 0}%, #f8fafc ${stats?.impactTarget?.percentage || 0}%, #f8fafc 100%)`, borderRadius: '50%' }}>
                        <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                            <div>
                                <div className="text-3xl font-bold text-slate-800">{stats?.impactTarget?.percentage || 0}%</div>
                                <div className="text-xs font-bold text-slate-400 uppercase">{stats?.impactTarget?.label || "Goal Met"}</div>
                            </div>
                        </div>
                    </div>
                    <h3 className="font-bold text-slate-800">Annual Impact Targets</h3>
                    <p className="text-sm text-slate-500 max-w-xs mt-2">You are on track to meet your beneficiary targets for Q1 2026.</p>
                </div>
            </div>
        </div>
    );
}
