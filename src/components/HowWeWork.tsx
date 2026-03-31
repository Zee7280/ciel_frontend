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
        color: "bg-violet-50 border-violet-100",
        iconBg: "bg-violet-100 text-violet-700",
        numberColor: "text-violet-200",
        accentLine: "bg-violet-400",
        connectorColor: "from-violet-300",
    },
    {
        number: "02",
        icon: ClipboardList,
        title: "Record Activities & Attendance",
        description: "Log each session with date, hours, activity type, and upload supporting evidence.",
        color: "bg-sky-50 border-sky-100",
        iconBg: "bg-sky-100 text-sky-700",
        numberColor: "text-sky-200",
        accentLine: "bg-sky-400",
        connectorColor: "from-sky-300",
    },
    {
        number: "03",
        icon: Users,
        title: "Track Outputs & Beneficiaries",
        description: "Document who you helped, what you produced, and how many lives were touched.",
        color: "bg-emerald-50 border-emerald-100",
        iconBg: "bg-emerald-100 text-emerald-700",
        numberColor: "text-emerald-200",
        accentLine: "bg-emerald-400",
        connectorColor: "from-emerald-300",
    },
    {
        number: "04",
        icon: BarChart2,
        title: "Measure Outcomes",
        description: "Compare before vs. after data. CIEL generates your engagement intensity score automatically.",
        color: "bg-orange-50 border-orange-100",
        iconBg: "bg-orange-100 text-orange-700",
        numberColor: "text-orange-200",
        accentLine: "bg-orange-400",
        connectorColor: "from-orange-300",
    },
    {
        number: "05",
        icon: Award,
        title: "Get Reports + CII Score + Certificate",
        description: "Receive your verified report, community impact index, and a digital certificate — all HEC-recognized.",
        color: "bg-rose-50 border-rose-100",
        iconBg: "bg-rose-100 text-rose-700",
        numberColor: "text-rose-200",
        accentLine: "bg-rose-400",
        connectorColor: "from-rose-300",
    },
];

export default function HowWeWork() {
    return (
        <section className="py-16 px-6 bg-white relative overflow-hidden">
            {/* Subtle dot grid */}
            <div className="absolute inset-0 bg-[radial-gradient(rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

            {/* Glow blobs */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-slate-500 text-[10px] font-black uppercase tracking-widest mb-6">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        5 Simple Steps
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">
                        How{" "}
                        <span className="bg-gradient-to-r from-emerald-600 to-sky-600 bg-clip-text text-transparent">
                            CIEL Works
                        </span>
                    </h2>
                    <p className="text-slate-500 text-lg font-medium max-w-xl mx-auto">
                        From your first session to a verified certificate — every step is tracked, measured, and credentialed.
                    </p>
                </div>

                {/* Steps — horizontal on desktop, vertical on mobile */}
                <div className="relative">
                    {/* Desktop horizontal connector line */}
                    <div className="hidden lg:block absolute top-[5.5rem] left-[10%] right-[10%] h-px bg-gradient-to-r from-violet-200 via-emerald-200 to-rose-200 z-0" />

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 relative z-10">
                        {steps.map((step, i) => {
                            const Icon = step.icon;
                            const isLast = i === steps.length - 1;
                            return (
                                <div key={i} className="relative flex flex-col items-center text-center group">
                                    {/* Icon Circle */}
                                    <div className={`relative w-20 h-20 rounded-2xl ${step.iconBg} flex items-center justify-center mb-6 shadow-sm group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
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

                {/* Bottom CTA banner */}
                <div className="mt-12 p-8 rounded-[2.5rem] bg-slate-50 border-2 border-slate-100 shadow-premium flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <p className="text-lg font-black text-slate-900 tracking-tight mb-1">Ready to start your impact journey?</p>
                        <p className="text-sm text-slate-500 font-medium">Join thousands of students already building verified portfolios.</p>
                    </div>
                    <a
                        href="/signup"
                        className="shrink-0 inline-flex items-center gap-2 px-8 py-4 bg-[#4285F4] text-white font-black rounded-2xl hover:bg-[#3367D6] hover:scale-105 transition-all duration-300 shadow-xl shadow-blue-100 text-sm"
                    >
                        Get Started Free <ArrowRight className="w-4 h-4" />
                    </a>
                </div>
            </div>
        </section>
    );
}
