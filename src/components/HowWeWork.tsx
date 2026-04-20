"use client";

import {
    UserCheck,
    ClipboardList,
    Users,
    BarChart2,
    Award,
    ArrowRight,
} from "lucide-react";

const steps = [
    {
        number: "01",
        icon: UserCheck,
        title: "Register & Join Project",
        description: "Sign up, verify your identity, and apply to a real community project aligned with your goals.",
        color: "bg-slate-50 border-slate-100",
        iconBg: "bg-slate-50 text-[#4285F4]",
        numberColor: "text-violet-200",
        accentLine: "bg-[#4285F4]",
        connectorColor: "from-violet-300",
    },
    {
        number: "02",
        icon: ClipboardList,
        title: "Record Activities & Attendance",
        description: "Log each session with date, hours, activity type, and upload supporting evidence.",
        color: "bg-slate-50 border-slate-100",
        iconBg: "bg-slate-50 text-[#4285F4]",
        numberColor: "text-sky-200",
        accentLine: "bg-[#4285F4]",
        connectorColor: "from-sky-300",
    },
    {
        number: "03",
        icon: Users,
        title: "Track Outputs & Beneficiaries",
        description: "Document who you helped, what you produced, and how many lives were touched.",
        color: "bg-slate-50 border-slate-100",
        iconBg: "bg-slate-50 text-[#4285F4]",
        numberColor: "text-emerald-200",
        accentLine: "bg-[#4285F4]",
        connectorColor: "from-emerald-300",
    },
    {
        number: "04",
        icon: BarChart2,
        title: "Measure Outcomes",
        description: "Compare before vs. after data. CIEL generates your engagement intensity score automatically.",
        color: "bg-slate-50 border-slate-100",
        iconBg: "bg-slate-50 text-[#4285F4]",
        numberColor: "text-orange-200",
        accentLine: "bg-[#4285F4]",
        connectorColor: "from-orange-300",
    },
    {
        number: "05",
        icon: Award,
        title: "Get Reports + CII Score + Certificate",
        description: "Receive your verified report, community impact index, and a digital certificate — all HEC-recognized.",
        color: "bg-slate-50 border-slate-100",
        iconBg: "bg-slate-50 text-[#4285F4]",
        numberColor: "text-rose-200",
        accentLine: "bg-rose-400",
        connectorColor: "from-rose-300",
    },
];

export default function HowWeWork() {
    return (
        <section className="py-24 px-6 bg-white relative overflow-hidden">
            {/* Subtle dot grid */}
            <div className="absolute inset-0 bg-[radial-gradient(rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

            {/* Glow blobs */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-slate-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-slate-50/5 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-slate-500 text-[10px] font-black uppercase tracking-widest mb-6">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse" />
                        5 Simple Steps
                    </div>

                    <div className="relative inline-block mb-4">
                        <h2 className="text-3xl md:text-4xl lg:text-[42px] font-black text-slate-900 tracking-tight leading-tight">
                            How{" "}
                            <span className="text-[#3A72AA]">
                                CIEL Works
                            </span>
                        </h2>
                        {/* Wavy Underline (Red) */}
                        <svg className="absolute -bottom-3 left-0 w-full h-3 text-[#EA4335]/30" preserveAspectRatio="none" viewBox="0 0 100 10" fill="none">
                            <path d="M0 5Q 25 0 50 5 Q 75 10 100 5" stroke="currentColor" strokeWidth="4" />
                        </svg>
                    </div>

                </div>

                {/* Steps — horizontal on desktop, vertical on mobile */}
                <div className="relative">
                    {/* Desktop horizontal connector line */}
                    <div className="hidden lg:block absolute top-[5.5rem] left-[10%] right-[10%] h-px bg-gradient-to-r from-violet-200 via-emerald-200 to-rose-200 z-0" />

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 relative z-10">
                        {[
                            { icon: UserCheck, title: "Register & Join Project", description: "Sign up, verify your identity, and apply to a community project.", bg: "bg-blue-50 text-blue-600" },
                            { icon: ClipboardList, title: "Record Activities", description: "Log each session with date, hours, activity type, and evidence.", bg: "bg-rose-50 text-rose-600" },
                            { icon: Users, title: "Track Outputs", description: "Document who you helped and what you produced in each session.", bg: "bg-orange-50 text-orange-600" },
                            { icon: BarChart2, title: "Measure Outcomes", description: "CIEL generates your engagement intensity score automatically.", bg: "bg-amber-50 text-amber-600" },
                            { icon: Award, title: "Get Certified", description: "Receive your verified HEC-recognized digital certificate.", bg: "bg-emerald-50 text-emerald-600" }
                        ].map((step, i) => {
                            const Icon = step.icon;
                            const isLast = i === 4;
                            return (
                                <div key={i} className="relative flex flex-col items-center text-center group">
                                    {/* Icon Circle */}
                                    <div className={`relative w-20 h-20 rounded-[1.5rem] ${step.bg} flex items-center justify-center mb-6 shadow-sm group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
                                        <Icon className="w-9 h-9" strokeWidth={1.5} />
                                        {/* Step number overlay */}
                                        <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border-2 border-slate-100 shadow-sm flex items-center justify-center text-[10px] font-black text-slate-900">
                                            {i + 1}
                                        </div>
                                    </div>

                                    {/* Arrow connector (mobile) */}
                                    {!isLast && (
                                        <div className="lg:hidden flex justify-center mb-4 opacity-30">
                                            <ArrowRight className="w-5 h-5 text-slate-400 rotate-90" />
                                        </div>
                                    )}

                                    {/* Text */}
                                    <h3 className="text-base font-black text-slate-900 leading-snug mb-3 tracking-tight">
                                        {step.title}
                                    </h3>
                                    <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-[200px]">
                                        {step.description}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
