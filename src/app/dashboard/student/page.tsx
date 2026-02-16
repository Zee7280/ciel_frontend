"use client";

import { useState, useEffect } from "react";
import { BookOpen, Star, Trophy, Clock, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "./report/components/ui/button";
import { DashboardData } from "./types";
import { authenticatedFetch } from "@/utils/api";

export default function StudentDashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // In a real app, we might need to pass the student ID if not handled by session/cookie
                // For now, the API route handles it (mocked)
                const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/student/dashboard`);
                if (res && res.ok) {
                    const result = await res.json();
                    if (result.success) {
                        setData(result.data);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-10">
                <p className="text-slate-500">Failed to load dashboard data.</p>
            </div>
        );
    }

    const { stats, activeProjects, deadlines } = data;

    const statItems = [
        { label: "Active Courses", value: stats.activeCourses.toString(), icon: BookOpen, color: "blue" },
        { label: "Impact Points", value: stats.impactPoints.toLocaleString(), icon: Star, color: "amber" },
        { label: "Projects Completed", value: stats.projectsCompleted.toString(), icon: Trophy, color: "green" },
        { label: "Hours Volunteered", value: stats.hoursVolunteered.toString(), icon: Clock, color: "purple" },
    ];

    return (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {statItems.map((stat, index) => (
                    <div key={index} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl bg-${stat.color}-50 flex items-center justify-center text-${stat.color}-600`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
                            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-lg font-bold text-slate-800">My Active Projects</h2>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        {activeProjects.length > 0 ? (
                            activeProjects.map((project) => (
                                <div key={project.id} className="p-6 border-b border-slate-50 last:border-none hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                                            {project.title.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{project.title}</h4>
                                            <p className="text-xs text-slate-500">{project.category} • Assigned {new Date(project.assignedAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold">{project.status}</span>
                                        <Link href="/dashboard/student/projects">
                                            <Button size="sm" variant="outline">
                                                View Projects
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-slate-500">
                                No active projects found.
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <h2 className="text-lg font-bold text-slate-800">Upcoming Deadlines</h2>
                    {deadlines.length > 0 ? (
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                            {deadlines.map((deadline) => (
                                <div key={deadline.id} className="flex items-start gap-3">
                                    <div className={`w-1.5 h-1.5 rounded-full mt-2 ${deadline.type === 'urgent' ? 'bg-red-500' : deadline.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{deadline.title}</p>
                                        <p className="text-xs text-slate-500">
                                            {new Date(deadline.date).toLocaleDateString(undefined, {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: 'numeric',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center text-slate-500 text-sm">
                            No upcoming deadlines.
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
