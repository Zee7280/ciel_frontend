"use client";

import { useState, useEffect } from "react";
import { Clock, Globe, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { authenticatedFetch } from "@/utils/api";

type ImpactStats = {
    activeVolunteers: number;
    partnerNgos: number;
    totalBeneficiaries: number;
};

type TrendPoint = {
    month: string;
    hours: number;
};

type SdgPoint = {
    name: string;
    value: number;
};

const emptyStats: ImpactStats = {
    activeVolunteers: 0,
    partnerNgos: 0,
    totalBeneficiaries: 0,
};

function toNumber(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
}

function normalizeStats(value: unknown): ImpactStats {
    const stats = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
    return {
        activeVolunteers: toNumber(stats.active_volunteers ?? stats.activeVolunteers),
        partnerNgos: toNumber(stats.partner_ngos ?? stats.partnerNgos),
        totalBeneficiaries: toNumber(stats.total_beneficiaries ?? stats.totalBeneficiaries),
    };
}

function normalizeHoursTrend(value: unknown): TrendPoint[] {
    return Array.isArray(value)
        ? value.map((row) => {
              const item = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
              return {
                  month: String(item.month ?? item.name ?? ""),
                  hours: toNumber(item.hours),
              };
          })
        : [];
}

function normalizeSdgImpact(value: unknown): SdgPoint[] {
    return Array.isArray(value)
        ? value.map((row) => {
              const item = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
              return {
                  name: String(item.name ?? item.sdg ?? "Unknown"),
                  value: toNumber(item.value ?? item.hours),
              };
          })
        : [];
}

export default function AdminImpactPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [hoursData, setHoursData] = useState<TrendPoint[]>([]);
    const [sdgData, setSdgData] = useState<SdgPoint[]>([]);
    const [stats, setStats] = useState<ImpactStats>(emptyStats);

    useEffect(() => {
        const fetchImpactData = async () => {
            setIsLoading(true);
            try {
                const res = await authenticatedFetch(`/api/v1/admin/analytics/impact`);
                if (res && res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setHoursData(normalizeHoursTrend(data.data?.hours_trend));
                        setSdgData(normalizeSdgImpact(data.data?.impact_by_sdg));
                        setStats(normalizeStats(data.data?.stats));
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
        <div className="p-0 lg:p-8">
            <div className="mb-8 flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Impact Analytics</h1>
                    <p className="text-slate-500">Deep dive into social impact metrics.</p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:flex">
                    <select className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-bold text-slate-700 outline-none">
                        <option>Last 6 Months</option>
                        <option>This Year</option>
                    </select>
                    <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">Download Report</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Hours Trend */}
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                    <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-500" /> Volunteering Hours Trend
                    </h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={hoursData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* SDG Impact */}
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
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
