"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useState } from "react";

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
        <section className="relative max-w-[1600px] mx-auto px-4 md:px-10 pb-0 lg:pb-4 overflow-visible">
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
        </section>
    );
}
