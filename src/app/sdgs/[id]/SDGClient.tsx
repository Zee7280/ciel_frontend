"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SDG } from "@/utils/sdgDetailedData";

export default function SDGClient({ sdg }: { sdg: SDG }) {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const totalTargets = sdg.targets.length;
    const totalIndicators = sdg.targets.reduce(
        (acc, target) => acc + target.indicators.length,
        0
    );

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
            {/* HERO */}
            <section
                className="text-white py-16 px-6 shadow-lg relative"
                style={{ backgroundColor: sdg.color }}
            >
                <div className="absolute inset-0 bg-black/10 mix-blend-multiply pointer-events-none" />
                <div className="max-w-7xl mx-auto relative z-10 text-left">
                    <Link
                        href="/"
                        className="inline-flex items-center text-white/90 hover:text-white mb-8 transition-colors font-medium"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Back to Dashboard
                    </Link>

                    <div className="flex items-center gap-6">
                        <div className="bg-white font-bold text-4xl w-24 h-24 flex items-center justify-center rounded-2xl shadow-xl shrink-0" style={{ color: sdg.color }}>
                            {sdg.number.toString().padStart(2, '0')}
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold tracking-tight">
                                SDG {sdg.number}: {sdg.title}
                            </h1>
                            <p className="mt-3 text-white/90 max-w-2xl text-lg font-medium">
                                {sdg.description}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* KPI STRIP */}
            <section className="max-w-7xl mx-auto px-6 -mt-10 relative z-20">
                <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-wrap md:flex-nowrap justify-between items-center divide-y md:divide-y-0 md:divide-x divide-gray-100">
                    <StatItem label="Total Targets" value={totalTargets.toString()} color={sdg.color} />
                    <StatItem label="Total Indicators" value={totalIndicators.toString()} color={sdg.color} />
                    <StatItem label="Global Status" value="Improving" color={sdg.color} />
                    <StatItem label="Progress Index" value="72%" color={sdg.color} />
                </div>
            </section>

            {/* CONTENT */}
            <section className="max-w-7xl mx-auto px-6 py-16 text-left">
                <h2 className="text-2xl font-bold mb-10 text-gray-800">
                    Targets & Indicators
                </h2>

                <div className="space-y-6">
                    {sdg.targets.map((target, index) => (
                        <div
                            key={target.id}
                            className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition duration-300 border border-gray-100 overflow-hidden"
                        >
                            <div
                                className="p-6 cursor-pointer flex justify-between items-center bg-white hover:bg-gray-50/50 transition-colors"
                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                            >
                                <div className="pr-8">
                                    <span className="text-sm font-bold uppercase tracking-wider" style={{ color: sdg.color }}>
                                        Target {target.id}
                                    </span>
                                    <h3 className="text-lg font-semibold mt-2 text-gray-900 leading-snug">
                                        {target.description}
                                    </h3>
                                </div>

                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 shadow-sm"
                                    style={{
                                        backgroundColor: openIndex === index ? sdg.color : '#f3f4f6',
                                        color: openIndex === index ? 'white' : '#9ca3af',
                                        transform: openIndex === index ? 'rotate(180deg)' : 'rotate(0deg)'
                                    }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="m6 9 6 6 6-6" />
                                    </svg>
                                </div>
                            </div>

                            {openIndex === index && (
                                <div className="px-6 pb-6 border-t border-gray-100 bg-gray-50/30">
                                    <ul className="mt-6 grid md:grid-cols-2 gap-4">
                                        {target.indicators.map((indicator) => (
                                            <li
                                                key={indicator.id}
                                                className="bg-white p-5 rounded-xl text-sm shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden"
                                            >
                                                <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: sdg.color }} />
                                                <span className="font-bold mb-2 block" style={{ color: sdg.color }}>
                                                    Indicator {indicator.id}
                                                </span>
                                                <p className="mt-1 text-gray-700 leading-relaxed font-medium">
                                                    {indicator.description}
                                                </p>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* SOURCE CITATION */}
            <section className="max-w-7xl mx-auto px-6 mt-12 border-t border-gray-200 pt-8 pb-12 text-left">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Source</h2>
                <a
                    href="https://unstats.un.org/sdgs/indicators/Global-Indicator-Framework-after-2025-review-English.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline hover:text-blue-800 transition-colors inline-block"
                >
                    United Nations — Global Indicator Framework (2025 Review)
                </a>
            </section>

            {/* FOOTER */}
            <footer className="bg-white py-8 text-center text-gray-500 text-sm border-t border-gray-100 font-medium">
                © 2026 SDG Institutional Dashboard
            </footer>
        </div>
    );
}

function StatItem({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div className="px-6 py-4 md:py-0 text-center flex-1">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">{label}</p>
            <p className="text-3xl font-black mt-2 drop-shadow-sm" style={{ color }}>
                {value}
            </p>
        </div>
    );
}
