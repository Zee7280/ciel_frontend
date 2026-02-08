import { BookOpen, Star, Trophy, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "./report/components/ui/button";

export default function StudentDashboard() {
    const stats = [
        { label: "Active Courses", value: "3", icon: BookOpen, color: "blue" },
        { label: "Impact Points", value: "1,250", icon: Star, color: "amber" },
        { label: "Projects Completed", value: "12", icon: Trophy, color: "green" },
        { label: "Hours Volunteered", value: "48", icon: Clock, color: "purple" },
    ];

    return (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
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
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="p-6 border-b border-slate-50 last:border-none hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                                        FR
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">Flood Relief Campaign {2024 + i}</h4>
                                        <p className="text-xs text-slate-500">Disaster Management • Assigned 2 days ago</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold">In Progress</span>
                                    <Link href="/dashboard/student/report">
                                        <Button size="sm" variant="outline">
                                            Submit Report
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <h2 className="text-lg font-bold text-slate-800">Upcoming Deadlines</h2>
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2"></div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">Field Report Submission</p>
                                <p className="text-xs text-slate-500">Tomorrow at 11:59 PM</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2"></div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">Mentor Meeting</p>
                                <p className="text-xs text-slate-500">Jan 26 at 3:00 PM</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
