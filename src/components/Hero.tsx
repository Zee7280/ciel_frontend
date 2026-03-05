"use client";

import Image from "next/image";
import Link from "next/link";
import { GraduationCap, School } from "lucide-react";
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
                <div className="p-2 bg-slate-100 rounded-full text-slate-700 flex items-center justify-center">
                    {isImagePath ? (
                        <Image src={icon} alt={label} width={24} height={24} className="w-6 h-6 object-contain" />
                    ) : (
                        (() => { const Icon = icon; return <Icon className="w-6 h-6" strokeWidth={2} />; })()
                    )}
                </div>
                <h3 className={clsx("font-black text-slate-800 tracking-tight leading-none", typeof value === 'string' ? "text-xl lg:text-2xl" : "text-2xl lg:text-3xl")}>
                    {isNumber ? formattedValue : value}
                </h3>
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide pl-1">{label}</p>
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
        <section className="relative max-w-[1600px] mx-auto px-4 md:px-10 pt-32 pb-12 lg:pt-40 lg:pb-32 overflow-visible">
            {/* Soft Background Glow */}
            <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-blue-50/50 rounded-full blur-[120px] -z-10" />
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-emerald-50/50 rounded-full blur-[120px] -z-10" />

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-16">

                {/* LEFT CONTENT */}
                <div className="flex-1 max-w-2xl text-center lg:text-left">

                    {/* Role Switcher */}
                    <div className="flex justify-center lg:justify-start gap-4 mb-10">
                        {[
                            { id: 'student', label: 'I am a Student' },
                            { id: 'faculty', label: 'I am Faculty' },
                            { id: 'partner', label: 'I am a Partner' }
                        ].map((role) => {
                            const isActive = activeRole === role.id;
                            return (
                                <button
                                    key={role.id}
                                    onClick={() => setActiveRole(role.id as any)}
                                    className={clsx(
                                        "flex items-center gap-2 px-6 py-2.5 rounded-full text-[15px] font-medium border transition-all duration-300",
                                        isActive
                                            ? "bg-[#E3F2FD] text-[#4285F4] border-[#BBDEFB]"
                                            : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50"
                                    )}
                                >
                                    {isActive && <div className="w-2 h-2 rounded-full bg-[#34A853]" />}
                                    {role.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="space-y-6 mb-10">
                        <h1 className="text-6xl lg:text-[72px] font-[900] text-[#4285F4] leading-[0.9] tracking-tighter max-w-[900px] mx-auto lg:mx-0">
                            Where Learning <br />
                            Becomes <br />
                            <span className="text-[#34A853]">Measurable</span> <br />
                            Community <br />
                            Impact
                        </h1>

                        <div className="space-y-6 max-w-xl mx-auto lg:mx-0 mt-6 px-1 text-slate-700">
                            <p className="text-lg md:text-[22px] font-normal leading-tight opacity-90">
                                Explore opportunities, participate in projects, submit verified engagement, and generate impact intelligence aligned with SDGs.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mt-8">
                        <Link href="/projects" className="w-full sm:w-auto px-10 py-4 bg-[#4285F4] hover:bg-[#3367D6] text-white rounded-lg font-bold text-lg shadow-xl shadow-blue-100 transition-all duration-300 text-center">
                            Explore Projects
                        </Link>
                        <Link href="/contact" className="w-full sm:w-auto px-10 py-4 border border-[#4285F4] text-[#4285F4] rounded-lg font-bold text-lg hover:bg-blue-50 transition-all duration-300 text-center">
                            Post an Opportunity
                        </Link>
                    </div>

                    <p className="mt-8 text-lg md:text-xl font-normal italic text-[#FFA000] text-center lg:text-left tracking-tight">
                        Integrate community learning into your curriculum seamlessly.
                    </p>
                </div>

                {/* RIGHT - VIDEO & STATS */}
                <div className="flex-1 flex flex-col items-center relative min-h-[500px] w-full lg:w-auto">
                    {/* Video Container (Increased Size) */}
                    <div className="relative w-[450px] h-[450px] md:w-[600px] md:h-[600px] lg:w-[850px] lg:h-[850px] mb-8">
                        {/* Subtle Glow Behind Video */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-emerald-100 rounded-full blur-3xl opacity-40 animate-pulse-slow" />

                        <div className="relative w-full h-full mix-blend-multiply">
                            <video
                                src="/hero.mp4"
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="w-full h-full object-contain pointer-events-none scale-110 lg:scale-125"
                            />
                        </div>
                    </div>

                    {/* Stats Section - Horizontal Row */}
                    <div className="flex flex-row flex-nowrap justify-between items-center w-[120%] -ml-[10%] max-w-5xl mt-8 lg:mt-12 px-4 gap-2 lg:gap-6 scale-90 sm:scale-100 origin-left">
                        <StatItem label="Contributors" value={50} icon="/icon-planting.jpg" delay={100} />
                        <StatItem label="Impact Hours" value="Launching Pilot" icon="/icon-globe.jpg" delay={200} />
                        <StatItem label="Universities" value={24} icon="/icon-gears.jpg" delay={300} />
                        <StatItem label="SDGs Impacted" value={17} icon="/icon-graph.jpg" delay={400} />
                    </div>
                </div>

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
