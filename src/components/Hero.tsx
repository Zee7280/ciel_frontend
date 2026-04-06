"use client";

import Image from "next/image";
import Link from "next/link";
import { GraduationCap, School, Check } from "lucide-react";
import { useCounter } from "@/hooks/useCounter";
import { useState } from "react";
import clsx from "clsx";

// Stat Hook Helper (modified to handle string values for "Pilot")
function StatItem({ label, value, icon, delay }: { label: string, value: number | string, icon: any | string, delay: number }) {
    const isNumber = typeof value === 'number';
    const count = useCounter(isNumber ? value as number : 0, 2000);
    const formattedValue = isNumber
        ? count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (label.includes("Student") ? "+" : "")
        : value;

    const isImagePath = typeof icon === 'string';

    return (
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-1 animate-fade-in-up" style={{ animationDelay: `${delay}ms` }}>
            <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 shadow-sm flex items-center justify-center text-slate-500 shrink-0">
                    {isImagePath ? (
                        <Image src={icon} alt={label} width={14} height={14} className="w-3.5 h-3.5 object-contain" />
                    ) : (
                        (() => { const Icon = icon; return <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />; })()
                    )}
                </div>
                <h3 className={clsx("font-black text-slate-900 tracking-tight leading-none", typeof value === 'string' ? "text-xl lg:text-[22px]" : "text-3xl lg:text-[32px]")}>
                    {isNumber ? formattedValue : value}
                </h3>
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] pl-1">{label}</p>
        </div>
    );
}

export default function Hero() {
    const [activeRole, setActiveRole] = useState<'student' | 'faculty' | 'partner'>('student');

    const roleContent = {
        student: {
            text: "Build your portfolio with verified social impact projects.",
            cta: "Explore Projects",
            link: "/projects"
        },
        faculty: {
            text: "Integrate community learning into your curriculum seamlessly.",
            cta: "View Framework",
            link: "/about"
        },
        partner: {
            text: "Connect with students to drive your social impact goals.",
            cta: "Post Opportunity",
            link: "/contact"
        }
    };

    return (
        <section className="relative max-w-[1600px] mx-auto px-4 md:px-10 pb-4 lg:pb-10 overflow-visible">
            {/* Soft Background Glow */}
            <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-blue-50/50 rounded-full blur-[120px] -z-10" />
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-emerald-50/50 rounded-full blur-[120px] -z-10" />

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-16">

                {/* LEFT CONTENT */}
                <div className="flex-1 max-w-3xl text-center lg:text-left pt-12 lg:pt-0">

                    <div className="space-y-6 mb-10">
                        <h1 className="text-5xl md:text-6xl lg:text-4xl font-black text-[#3A72AA] leading-[1.1] tracking-tight max-w-[900px] mx-auto lg:mx-0">
                            Turn Student Engagement into <span className="text-[#3A72AA]">Measurable</span> Community <span className="text-[#3A72AA]">Impact</span>
                        </h1>

                        <div className="space-y-6 max-w-xl mx-auto lg:mx-0 mt-6 px-1 text-slate-600">
                            <p className="text-base md:text-lg font-medium leading-relaxed opacity-90">
                                Track, verify, and measure real-world impact aligned with SDGs — all in one platform.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mt-8">
                        <Link href="/projects" className="w-full sm:w-auto px-10 py-4 bg-[#4285F4] hover:bg-blue-600 text-white rounded-xl font-bold text-lg shadow-xl shadow-blue-100 transition-all duration-300 text-center">
                            Start Your Project
                        </Link>
                        <Link href="/about" className="w-full sm:w-auto px-10 py-4 border-2 border-slate-200 text-slate-700 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all duration-300 text-center">
                            Explore How It Works
                        </Link>
                    </div>

                    {/* Impact Badges Row */}
                    <div className="mt-10 flex flex-wrap justify-center lg:justify-start items-center gap-x-6 gap-y-3">
                        {[
                            "SDG-Aligned Projects",
                            "Verified Impact Tracking",
                            "CII Score Generated"
                        ].map((badge) => (
                            <div key={badge} className="flex items-center gap-2 text-slate-500 font-bold text-sm italic">
                                <Check className="w-4 h-4 text-slate-800" strokeWidth={3} />
                                <span>{badge}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT - VIDEO & STATS */}
                <div className="flex-1 flex flex-col items-center relative min-h-[400px] w-full lg:w-auto">
                    {/* Video Container */}
                    <div className="relative w-full aspect-square max-w-[650px]">
                        {/* Subtle Glow Behind Video */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-emerald-100 rounded-full blur-3xl opacity-30 animate-pulse-slow" />

                        <div className="relative w-full h-full">
                            <video
                                src="/hero.mp4"
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="w-full h-full object-contain pointer-events-none"
                            />
                        </div>
                    </div>
                </div>

            </div>

            {/* FULL WIDTH STATS BANNER */}
            <div className="relative w-full max-w-7xl mx-auto mt-4 pt-2">
                {/* Stats Container */}
                <div className="flex flex-wrap justify-between items-center gap-10 lg:gap-16 relative z-10 px-4 md:px-12 pb-16">
                    <StatItem label="Contributors" value={50} icon="/icon-planting.jpg" delay={100} />
                    <StatItem label="Impact Hours" value="Launching Pilot" icon="/icon-globe.jpg" delay={200} />
                    <StatItem label="Universities" value={24} icon="/icon-gears.jpg" delay={300} />
                    <StatItem label="SDGs Impacted" value={17} icon="/icon-graph.jpg" delay={400} />
                </div>

                {/* Vertical Background Grid */}
                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[100vw] h-48 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px)] bg-[size:40px] md:bg-[size:60px] opacity-100 -z-10 [mask-image:linear-gradient(to_bottom,transparent_0%,black_50%,transparent_100%)] pointer-events-none" />

                {/* Bottom Separator line  */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[100vw] h-[1px] bg-slate-100" />

                {/* Built for you chip center bottom */}

            </div>
        </section>
    );
}

function HandshakeIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m11 17 2 2a1 1 0 1 0 3-3" />
            <path d="m22 22-5-10-5 10" />
            <path d="M14 11.22V5c0-1.1.9-2 2-2h3.5a1 1 0 0 1 1 1v2.5" />
            <path d="M9 11.22V5c0-1.1-.9-2-2-2H3.5a1 1 0 0 0-1 1v2.5" />
            <path d="m2 22 5-10 5 10" />
            <path d="m19 19-3-3" />
        </svg>
    )
}
