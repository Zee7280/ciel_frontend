"use client";

import { Users, Clock, HandHeart, Target, LucideIcon, GraduationCap, Building2, TrendingUp } from "lucide-react";
import { useCounter } from "@/hooks/useCounter";

interface StatProps {
    label: string;
    value: number;
    separator?: string;
    suffix?: string;
    icon: LucideIcon;
    color: string;
    delay: number;
}

function StatCard({ label, value, separator = ",", suffix = "", icon: Icon, color, delay }: StatProps) {
    const count = useCounter(value, 2000);

    const formattedValue = count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);

    return (
        <div
            className="flex items-center gap-4 animate-fade-in-up group cursor-default"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className={`p-4 rounded-full bg-white shadow-lg shadow-slate-200/50 text-slate-700 group-hover:scale-110 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300`}>
                <Icon className="w-8 h-8" strokeWidth={2} />
            </div>
            <div className="flex flex-col">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-1">
                    {formattedValue}{suffix}
                </h3>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">{label}</p>
            </div>
        </div>
    );
}

export default function StatsRow() {
    const stats = [
        {
            label: "Students Engaged",
            value: 8540,
            icon: GraduationCap,
            color: "text-slate-900",
        },
        {
            label: "Hours Served",
            value: 124000,
            icon: Clock,
            color: "text-slate-900",
        },
        {
            label: "NGOs Supported",
            value: 8540,
            icon: Building2,
            color: "text-slate-900",
        },
        {
            label: "SDGs Impacted",
            value: 17,
            icon: Target,
            color: "text-slate-900",
        },
    ];

    return (
        <section className="relative z-20 max-w-7xl mx-auto px-6 -mt-10 lg:-mt-20 pb-20">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
                {stats.map((stat, index) => (
                    <StatCard
                        key={index}
                        {...stat}
                        delay={index * 150}
                    />
                ))}
            </div>
        </section>
    );
}
