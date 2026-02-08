"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Users, Clock, Building2, Globe, Lightbulb, Sprout, Heart, Settings, GraduationCap, BookOpen } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useCounter } from "@/hooks/useCounter";

// Stat Hook Helper (re-implemented inline for simplicity if needed, or imported)
function StatItem({ label, value, icon, delay }: { label: string, value: number, icon: any | string, delay: number }) {
    const count = useCounter(value, 2000);
    const formattedValue = count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    const isImagePath = typeof icon === 'string';

    return (
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-1 animate-fade-in-up" style={{ animationDelay: `${delay}ms` }}>
            <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-slate-100 rounded-full text-slate-700 flex items-center justify-center">
                    {isImagePath ? (
                        <Image src={icon} alt={label} width={24} height={24} className="w-6 h-6 object-contain" />
                    ) : (
                        (() => { const Icon = icon; return <Icon className="w-6 h-6" strokeWidth={2} />; })()
                    )}
                </div>
                <h3 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight leading-none">
                    {formattedValue}
                </h3>
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide pl-1">{label}</p>
        </div>
    );
}

export default function Hero() {
    const sdgData = Array(17).fill(0).map((_, i) => ({ name: `SDG ${i + 1}`, value: 1 }));

    // Approximate SDG Colors
    const COLORS = [
        '#E5243B', '#DDA63A', '#4C9F38', '#C5192D', '#FF3A21',
        '#26BDE2', '#FCC30B', '#A21942', '#FD6925', '#DD1367',
        '#FD9D24', '#BF8B2E', '#3F7E44', '#0A97D9', '#56C02B',
        '#00689D', '#19486A'
    ];

    return (
        <section className="relative max-w-7xl mx-auto px-6 pt-32 pb-12 lg:pt-40 lg:pb-24 overflow-visible">
            {/* Soft Background Glow */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-emerald-50/50 rounded-full blur-[100px] -z-10" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-orange-50/50 rounded-full blur-[100px] -z-10" />

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-20">

                {/* LEFT CONTENT */}
                <div className="flex-1 max-w-2xl text-center lg:text-left">
                    <div className="space-y-6 mb-10">
                        <h1 className="text-4xl lg:text-6xl font-extrabold text-emerald-600 leading-[1.1] tracking-tight max-w-[700px] mx-auto lg:mx-0">
                            Where Youth, Universities & Communities Create <br className="hidden lg:block" />
                            <span className="text-orange-500">Measurable Impact</span>
                        </h1>

                        <div className="space-y-4 max-w-lg mx-auto lg:mx-0">
                            <p className="text-xl text-slate-700 font-semibold leading-[1.6]">
                                Community Impact Education Lab <br />
                                (CIEL Pakistan)
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                        <button className="w-full sm:w-auto px-10 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-full font-bold text-lg shadow-[0_10px_20px_-10px_rgba(249,115,22,0.5)] hover:shadow-[0_20px_40px_-10px_rgba(249,115,22,0.6)] hover:-translate-y-1 transition-all duration-300">
                            View Impact
                        </button>
                        <button className="w-full sm:w-auto px-10 py-4 bg-slate-200 text-slate-700 rounded-full font-bold text-lg hover:bg-slate-300 shadow-sm hover:shadow-md transition-all duration-300">
                            Partner With Us
                        </button>
                    </div>
                </div>

                {/* RIGHT - SDG WHEEL & STATS */}
                <div className="flex-1 flex flex-col items-center relative min-h-[500px]">

                    {/* Floating Decorative Icons (Simulating Illustrations) */}
                    <div className="absolute top-0 left-10 animate-bounce delay-100 hidden md:block">
                        <Lightbulb className="w-10 h-10 text-yellow-400 fill-yellow-100" />
                    </div>
                    <div className="absolute top-10 right-0 animate-pulse delay-300 hidden md:block">
                        <Sprout className="w-10 h-10 text-green-500 fill-green-100" />
                    </div>
                    <div className="absolute bottom-40 left-0 animate-bounce delay-500 hidden md:block">
                        <Heart className="w-8 h-8 text-red-400 fill-red-100" />
                    </div>
                    <div className="absolute top-1/2 right-10 animate-pulse delay-700 hidden md:block">
                        <Settings className="w-8 h-8 text-slate-400 fill-slate-100" />
                    </div>
                    <div className="absolute top-20 left-20 hidden md:block opacity-60">
                        <BookOpen className="w-6 h-6 text-blue-400" />
                    </div>


                    {/* Wheel Container */}
                    <div className="relative w-[300px] h-[300px] md:w-[400px] md:h-[400px] lg:w-[450px] lg:h-[450px] mb-8">
                        {/* Subtle Glow Behind Wheel */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-100 to-orange-100 rounded-full blur-3xl opacity-60 animate-pulse-slow" />

                        {/* DOUBLE PIE CHART ANIMATION */}
                        <div className="relative w-full h-full drop-shadow-2xl">
                            {/* Outer Wheel - Slow Clockwise */}
                            <div className="absolute inset-0 animate-spin-slow">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={sdgData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius="75%"
                                            outerRadius="95%"
                                            startAngle={60}
                                            endAngle={320}
                                            paddingAngle={2}
                                            dataKey="value"
                                            cornerRadius={4}
                                            stroke="none"
                                        >
                                            {sdgData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Inner Wheel - Faster Counter-Clockwise (Double Layer) */}
                            <div className="absolute inset-0 opacity-40 scale-95" style={{ animationDirection: 'reverse', animationDuration: '15s' }}>
                                <div className="w-full h-full animate-spin-slow">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={sdgData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius="65%"
                                                outerRadius="72%"
                                                startAngle={60}
                                                endAngle={320}
                                                paddingAngle={1}
                                                dataKey="value"
                                                cornerRadius={2}
                                                stroke="none"
                                            >
                                                {sdgData.map((entry, index) => (
                                                    <Cell key={`cell-inner-${index}`} fill={COLORS[(index + 5) % COLORS.length]} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Center Text Overlay (Fixed, static branding) */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="relative flex items-center justify-center">
                                {/* The Central Black Circle with 17 SDG */}
                                <div className="w-24 h-24 md:w-32 md:h-32 bg-slate-900 rounded-full flex flex-col items-center justify-center shadow-2xl border-4 border-white z-20">
                                    <span className="text-3xl md:text-5xl font-black text-white tracking-tighter">17</span>
                                    <span className="text-xs md:text-sm font-bold text-white tracking-widest mt-[-2px]">SDG</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid - Moved inside Hero */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-8 w-full max-w-md mx-auto">
                        <StatItem label="Students Engaged" value={8540} icon="/icon-planting.jpg" delay={100} />
                        <StatItem label="Hours Served" value={124000} icon="/icon-globe.jpg" delay={200} />
                        <StatItem label="NGOs Supported" value={8540} icon="/icon-gears.jpg" delay={300} />
                        <StatItem label="SDGs Impacted" value={17} icon="/icon-graph.jpg" delay={400} />
                    </div>

                </div>

            </div>
        </section>
    );
}
