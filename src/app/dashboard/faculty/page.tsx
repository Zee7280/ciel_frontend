"use client";

import { useEffect, useState } from "react";
import { BookOpen, GraduationCap, FileBarChart, Users as UsersIcon, Clock, AlertCircle } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";

type FacultyCourse = {
    id?: string;
    title?: string;
    name?: string;
    code?: string;
    semester?: string;
    students?: number;
    enrolled_students?: number;
    pending?: number;
    pending_grading?: number;
};

type FacultyDashboardStats = {
    students_active?: number;
    hours_verified?: number;
    pending_approvals?: number;
    courses?: FacultyCourse[];
};

export default function FacultyDashboard() {
    const [stats, setStats] = useState<FacultyDashboardStats | null>(null);
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
                {(stats?.courses ?? []).map((course, index) => {
                    const title = course.title || course.name || "Untitled course";
                    const code = course.code || "—";
                    const semester = course.semester || "Current semester";
                    const enrolled = typeof course.enrolled_students === "number" ? course.enrolled_students : course.students ?? 0;
                    const pending = typeof course.pending_grading === "number" ? course.pending_grading : course.pending ?? 0;

                    return (
                        <div
                            key={course.id || `${code}-${title}-${index}`}
                            className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <BookOpen className="w-6 h-6" />
                                </div>
                                <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-500">{code}</span>
                            </div>

                            <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">{title}</h3>
                            <p className="text-xs text-slate-500 mb-6">{semester}</p>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500 flex items-center gap-2">
                                        <GraduationCap className="w-4 h-4" /> Enrolled
                                    </span>
                                    <span className="font-bold text-slate-800">{enrolled}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500 flex items-center gap-2">
                                        <FileBarChart className="w-4 h-4" /> Pending Grading
                                    </span>
                                    <span className={`font-bold ${pending > 0 ? "text-amber-500" : "text-green-500"}`}>{pending}</span>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-slate-50 flex gap-3">
                                <button className="flex-1 py-2 rounded-lg bg-slate-50 text-slate-600 text-xs font-bold hover:bg-slate-100">
                                    View Roster
                                </button>
                                <button className="flex-1 py-2 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-bold hover:bg-indigo-100">
                                    Grade Work
                                </button>
                            </div>
                        </div>
                    );
                })}

                {!isLoading && (stats?.courses?.length ?? 0) === 0 ? (
                    <div className="lg:col-span-3 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                        <p className="text-sm font-semibold text-slate-700">No courses found</p>
                        <p className="text-xs text-slate-500 mt-1">
                            Course cards will appear here when dashboard API returns faculty course data.
                        </p>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
