"use client";

import { useEffect, useState } from "react";
import { BookOpen, CheckCircle, GraduationCap, FileBarChart, Loader2, Users as UsersIcon, Clock, AlertCircle } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";

export default function FacultyDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await authenticatedFetch(`/api/v1/faculty/dashboard`);
                if (res && res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setStats(data.data);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch faculty stats", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, []);

    return (
        <div className="space-y-8 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Faculty Dashboard</h1>
                    <p className="text-slate-500">Overview of student activities and impact.</p>
                </div>
                <button className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all">Create New Course</button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                        <UsersIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-bold uppercase">Active Students</p>
                        <h3 className="text-2xl font-bold text-slate-900">{isLoading ? "-" : stats?.students_active || 0}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-50 rounded-xl text-green-600">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-bold uppercase">Hours Verified</p>
                        <h3 className="text-2xl font-bold text-slate-900">{isLoading ? "-" : stats?.hours_verified || 0}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-bold uppercase">Pending Approvals</p>
                        <h3 className="text-2xl font-bold text-slate-900">{isLoading ? "-" : stats?.pending_approvals || 0}</h3>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Course Cards */}
                {[
                    { title: "Community Development 101", code: "SOC-201", students: 45, pending: 12 },
                    { title: "Social Impact Design", code: "DES-305", students: 28, pending: 5 },
                    { title: "NGO Management", code: "MGT-410", students: 33, pending: 0 },
                ].map((course, index) => (
                    <div key={index} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <BookOpen className="w-6 h-6" />
                            </div>
                            <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-500">{course.code}</span>
                        </div>

                        <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">{course.title}</h3>
                        <p className="text-xs text-slate-500 mb-6">Fall Semester 2025</p>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500 flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Enrolled</span>
                                <span className="font-bold text-slate-800">{course.students}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500 flex items-center gap-2"><FileBarChart className="w-4 h-4" /> Pending Grading</span>
                                <span className={`font-bold ${course.pending > 0 ? "text-amber-500" : "text-green-500"}`}>{course.pending}</span>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-50 flex gap-3">
                            <button className="flex-1 py-2 rounded-lg bg-slate-50 text-slate-600 text-xs font-bold hover:bg-slate-100">View Roster</button>
                            <button className="flex-1 py-2 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-bold hover:bg-indigo-100">Grade Work</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
