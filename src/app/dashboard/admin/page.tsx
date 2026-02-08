"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { Users, Briefcase, Clock, FileText, TrendingUp, AlertCircle, Building2, Eye, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function AdminDashboard() {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/admin/dashboard`);
                if (!res) return;

                const result = await res.json();
                if (result.success) {
                    setData(result.data);
                }
            } catch (error) {
                console.error("Failed to fetch admin stats", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const { metrics, sdgDistribution } = data || {};

    // Fallback data if API fails (for development visual confirmation)
    const chartData = sdgDistribution || [
        { name: "No Poverty", value: 30, color: "#e5243b" },
        { name: "Quality Education", value: 45, color: "#c5192d" },
        { name: "Climate Action", value: 25, "color": "#3f7e44" },
        { name: "Gender Equality", value: 20, "color": "#ff3a21" },
        { name: "Clean Water", value: 15, "color": "#26bde2" }
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[600px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium animate-pulse">Loading dashboard insights...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-8 max-w-[1600px] mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Platform Overview</h1>
                <p className="text-slate-500 mt-2 text-lg">Real-time system activity and performance metrics.</p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* Total Users */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-300">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users className="w-24 h-24 text-blue-600 transform rotate-12 translate-x-4 -translate-y-4" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 shadow-inner group-hover:scale-110 transition-transform"><Users className="w-6 h-6" /></div>
                            <h3 className="font-bold text-slate-600">Total Users</h3>
                        </div>
                        <div className="flex items-baseline gap-2 mb-6">
                            <span className="text-4xl font-black text-slate-900 tracking-tight">{metrics?.totalUsers?.total?.toLocaleString() || 0}</span>
                            <span className="text-sm font-bold text-green-500 bg-green-50 px-2 py-0.5 rounded-lg">+12%</span>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                <span>Students</span>
                                <span>{Math.round((metrics?.totalUsers?.students / metrics?.totalUsers?.total) * 100) || 0}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${(metrics?.totalUsers?.students / metrics?.totalUsers?.total) * 100}%` }}></div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-50">
                                <div>
                                    <div className="text-xs text-slate-400 font-bold uppercase mb-1">NGOs</div>
                                    <div className="font-bold text-slate-800">{metrics?.totalUsers?.ngos?.toLocaleString() || 0}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-400 font-bold uppercase mb-1">Corps</div>
                                    <div className="font-bold text-slate-800">{metrics?.totalUsers?.corporates?.toLocaleString() || 0}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Opportunities */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group hover:shadow-2xl hover:shadow-amber-900/10 transition-all duration-300">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Briefcase className="w-24 h-24 text-amber-500 transform -rotate-12 translate-x-4 -translate-y-4" />
                    </div>
                    <div className="relative z-10 h-full flex flex-col">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-amber-50 rounded-2xl text-amber-600 shadow-inner group-hover:scale-110 transition-transform"><Briefcase className="w-6 h-6" /></div>
                            <h3 className="font-bold text-slate-600">Opportunities</h3>
                        </div>
                        <div className="text-4xl font-black text-slate-900 tracking-tight mb-2">{metrics?.opportunities?.toLocaleString() || 0}</div>
                        <div className="text-sm font-medium text-slate-500 leading-relaxed max-w-[80%]">Active volunteering & internship slots available.</div>
                        <div className="mt-auto pt-6">
                            <button className="text-amber-600 font-bold text-sm flex items-center gap-2 hover:gap-3 transition-all group-hover:text-amber-700">View All <ArrowRight className="w-4 h-4" /></button>
                        </div>
                    </div>
                </div>

                {/* Verified Hours */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group hover:shadow-2xl hover:shadow-purple-900/10 transition-all duration-300">
                    <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-purple-50 rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10 h-full flex flex-col">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-purple-50 rounded-2xl text-purple-600 shadow-inner group-hover:scale-110 transition-transform"><Clock className="w-6 h-6" /></div>
                            <h3 className="font-bold text-slate-600">Impact Hours</h3>
                        </div>
                        <div className="text-4xl font-black text-slate-900 tracking-tight mb-2">{metrics?.verifiedHours?.toLocaleString() || 0}</div>
                        <div className="text-sm font-medium text-slate-500">Total verified social impact hours contributed.</div>
                        <div className="mt-auto pt-6 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                                <TrendingUp className="w-3 h-3" /> Top Metric
                            </span>
                        </div>
                    </div>
                </div>

                {/* Pending Approvals - Action Card */}
                <div className="bg-gradient-to-br from-red-50 to-white p-6 rounded-3xl border border-red-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group hover:shadow-2xl hover:shadow-red-900/10 transition-all duration-300">
                    <div className="relative z-10 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-2xl text-red-500 shadow-sm border border-red-50 group-hover:scale-110 transition-transform"><AlertCircle className="w-6 h-6" /></div>
                                <h3 className="font-bold text-slate-700">Pending Actions</h3>
                            </div>
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        </div>

                        <div className="text-5xl font-black text-slate-900 tracking-tight mb-2">{metrics?.pendingApprovals || 0}</div>
                        <p className="text-sm font-bold text-red-600 mb-6">Requests awaiting your approval.</p>

                        <div className="mt-auto space-y-3">
                            <button className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2">
                                Review Now <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Layout Grid for Charts & Reports */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* SDG Chart */}
                <div className="xl:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-3">
                                <TrendingUp className="w-6 h-6 text-slate-400" /> Impact Distribution by SDG
                            </h3>
                            <p className="text-slate-500 mt-1">Breakdown of projects alignment with UN Sustainable Development Goals.</p>
                        </div>
                    </div>

                    <div className="h-[350px] w-full bg-slate-50/50 rounded-2xl p-4 border border-dashed border-slate-200">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={140}
                                    tick={{ fontSize: 13, fontWeight: 700, fill: '#64748b' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f1f5f9', opacity: 0.5 }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.15)', padding: '16px', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(4px)' }}
                                    itemStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                                />
                                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={32} animationDuration={1000}>
                                    {chartData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sidebar Stats */}
                <div className="space-y-6">
                    {/* Reports Card */}
                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-teal-50 rounded-2xl text-teal-600 shadow-inner"><FileText className="w-6 h-6" /></div>
                            <h3 className="text-lg font-bold text-slate-800">Total Reports</h3>
                        </div>
                        <div className="text-5xl font-black text-slate-900 tracking-tight mb-2">{metrics?.totalReports || 0}</div>
                        <p className="text-sm font-medium text-slate-400">Activity reports generated by users this month.</p>
                    </div>

                    {/* Quick Access */}
                    <div className="bg-slate-900 p-8 rounded-3xl shadow-xl shadow-slate-900/20 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
                            <Briefcase className="w-5 h-5 text-blue-400" /> Administrative Actions
                        </h3>
                        <div className="space-y-4 relative z-10">
                            <button className="w-full py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-sm font-bold transition-all flex items-center justify-between px-6 group backdrop-blur-sm">
                                Review Approvals
                                <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </button>
                            <button className="w-full py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-sm font-bold transition-all flex items-center justify-between px-6 group backdrop-blur-sm">
                                Export Impact Report
                                <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
