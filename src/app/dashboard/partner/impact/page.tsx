"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Users, Clock, Target, BarChart3, PieChart, Loader2 } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";

interface ImpactMetrics {
    totalBeneficiaries: number;
    totalProjects: number;
    totalHours: number;
    sdgDistribution: { [key: number]: number };
    monthlyTrend: { month: string; beneficiaries: number }[];
}

export default function PartnerImpactPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [metrics, setMetrics] = useState<ImpactMetrics | null>(null);

    useEffect(() => {
        fetchMetrics();
    }, []);

    const fetchMetrics = async () => {
        try {
            const res = await authenticatedFetch(`/api/v1/partners/impact/metrics`);
            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    setMetrics(data.data);
                }
            }
        } catch (error) {
            console.error("Failed to fetch metrics", error);
            toast.error("Failed to load impact metrics");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
            </div>
        );
    }

    const sdgColors: { [key: number]: string } = {
        1: "bg-red-500",
        2: "bg-yellow-500",
        3: "bg-green-500",
        4: "bg-red-600",
        5: "bg-orange-500",
        6: "bg-blue-400",
        7: "bg-yellow-400",
        8: "bg-red-700",
        9: "bg-orange-600",
        10: "bg-pink-500",
        11: "bg-yellow-600",
        12: "bg-yellow-700",
        13: "bg-green-600",
        14: "bg-blue-500",
        15: "bg-green-700",
        16: "bg-blue-600",
        17: "bg-blue-700",
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Impact Dashboard</h1>
                <p className="text-slate-500">Track your organization's measurable impact and SDG alignment</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <Users className="w-10 h-10 opacity-80" />
                        <div className="bg-white/20 rounded-full px-3 py-1 text-xs font-bold">
                            Total
                        </div>
                    </div>
                    <h3 className="text-4xl font-bold mb-2">
                        {metrics?.totalBeneficiaries.toLocaleString() || 0}
                    </h3>
                    <p className="text-blue-100 font-medium">Beneficiaries Reached</p>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <Target className="w-10 h-10 opacity-80" />
                        <div className="bg-white/20 rounded-full px-3 py-1 text-xs font-bold">
                            Completed
                        </div>
                    </div>
                    <h3 className="text-4xl font-bold mb-2">
                        {metrics?.totalProjects || 0}
                    </h3>
                    <p className="text-green-100 font-medium">Projects Delivered</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <Clock className="w-10 h-10 opacity-80" />
                        <div className="bg-white/20 rounded-full px-3 py-1 text-xs font-bold">
                            Logged
                        </div>
                    </div>
                    <h3 className="text-4xl font-bold mb-2">
                        {metrics?.totalHours.toLocaleString() || 0}
                    </h3>
                    <p className="text-purple-100 font-medium">Volunteer Hours</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* SDG Distribution */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <PieChart className="w-6 h-6 text-blue-600" />
                        <h2 className="text-xl font-bold text-slate-900">SDG Alignment</h2>
                    </div>
                    <div className="space-y-3">
                        {metrics?.sdgDistribution && Object.entries(metrics.sdgDistribution)
                            .sort((a, b) => b[1] - a[1])
                            .map(([sdg, percentage]) => (
                                <div key={sdg} className="flex items-center gap-3">
                                    <div className={`w-10 h-10 ${sdgColors[parseInt(sdg)] || 'bg-slate-500'} rounded-lg flex items-center justify-center text-white font-bold text-sm`}>
                                        {sdg}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-sm font-semibold text-slate-700">SDG {sdg}</span>
                                            <span className="text-sm font-bold text-slate-900">{percentage}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${sdgColors[parseInt(sdg)] || 'bg-slate-500'}`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>

                {/* Monthly Trend */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <BarChart3 className="w-6 h-6 text-green-600" />
                        <h2 className="text-xl font-bold text-slate-900">Monthly Growth</h2>
                    </div>
                    <div className="space-y-4">
                        {metrics?.monthlyTrend.map((item, index) => {
                            const maxValue = Math.max(...(metrics?.monthlyTrend.map(m => m.beneficiaries) || [1]));
                            const percentage = (item.beneficiaries / maxValue) * 100;

                            return (
                                <div key={index} className="flex items-center gap-3">
                                    <span className="text-sm font-semibold text-slate-600 w-12">{item.month}</span>
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-xs text-slate-500">Beneficiaries</span>
                                            <span className="text-sm font-bold text-slate-900">{item.beneficiaries.toLocaleString()}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-3">
                                            <div
                                                className="h-3 rounded-full bg-gradient-to-r from-green-400 to-green-600"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Export Button */}
            <div className="mt-8 flex justify-end">
                <button className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors">
                    <TrendingUp className="w-5 h-5" />
                    Export Impact Report
                </button>
            </div>
        </div>
    );
}
