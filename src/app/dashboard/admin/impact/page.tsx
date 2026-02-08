"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Users, Clock, Globe, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { authenticatedFetch } from "@/utils/api";

export default function AdminImpactPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [hoursData, setHoursData] = useState<any[]>([]);
    const [sdgData, setSdgData] = useState<any[]>([]);
    const [stats, setStats] = useState({
        activeVolunteers: 0,
        partnerNgos: 0,
        totalBeneficiaries: 0
    });

    useEffect(() => {
        const fetchImpactData = async () => {
            setIsLoading(true);
            try {
                const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/admin/analytics/impact`);
                if (res && res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setHoursData(data.data.hours_trend || []);
                        setSdgData(data.data.impact_by_sdg || []);
                        setStats(data.data.stats || {
                            activeVolunteers: 0,
                            partnerNgos: 0,
                            totalBeneficiaries: 0
                        });
                    }
                }
            } catch (error) {
                console.error("Failed to fetch impact data", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchImpactData();
    }, []);

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Impact Analytics</h1>
                    <p className="text-slate-500">Deep dive into social impact metrics.</p>
                </div>
                <div className="flex gap-2">
                    <select className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-bold text-slate-700 outline-none">
                        <option>Last 6 Months</option>
                        <option>This Year</option>
                    </select>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Download Report</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Hours Trend */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-500" /> Volunteering Hours Trend
                    </h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={hoursData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* SDG Impact */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-green-500" /> Impact by SDG
                    </h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sdgData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="text-slate-500 text-sm mb-1">Active Volunteers</div>
                    <div className="text-3xl font-bold text-slate-900 mb-2">{isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (stats?.activeVolunteers || 0).toLocaleString()}</div>
                    <div className="text-green-600 text-xs font-bold bg-green-50 inline-block px-2 py-1 rounded">+12% vs last month</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="text-slate-500 text-sm mb-1">Partner NGOs</div>
                    <div className="text-3xl font-bold text-slate-900 mb-2">{isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (stats?.partnerNgos || 0).toLocaleString()}</div>
                    <div className="text-blue-600 text-xs font-bold bg-blue-50 inline-block px-2 py-1 rounded">+5 new this week</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="text-slate-500 text-sm mb-1">Total Beneficiaries</div>
                    <div className="text-3xl font-bold text-slate-900 mb-2">{isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (stats?.totalBeneficiaries || 0).toLocaleString()}</div>
                    <div className="text-slate-400 text-xs">Estimated based on project data</div>
                </div>
            </div>
        </div>
    );
}
