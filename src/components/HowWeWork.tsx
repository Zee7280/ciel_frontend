"use client";

import {
    UserCheck,
    ClipboardList,
    ShieldCheck,
    Award,
    ArrowRight,
} from "lucide-react";

const steps = [
    {
        number: "01",
        icon: UserCheck,
        title: "Register & pick your path",
        description: "One account for your whole degree. Choose community service, coursework, FYP, or venture — switch or add anytime.",
    },
    {
        number: "02",
        icon: ClipboardList,
        title: "Do the work, tap the form",
        description: "Guided, mostly-tap reports. Attendance logs itself session by session; evidence attaches as you go.",
    },
    {
        number: "03",
        icon: ShieldCheck,
        title: "One-tap verification",
        description: "Faculty and partners approve via a single link. Nothing enters the record — or our analytics — unverified.",
    },
    {
        number: "04",
        icon: Award,
        title: "Report, score & showcase",
        description: "AI-generated reports, your CII score, HEC-recognized certificates — and the best work featured to universities and investors.",
    },
];

export default function HowWeWork() {
    return (
        <section id="how-it-works" className="py-24 px-6 bg-white relative overflow-hidden scroll-mt-28">
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
                        4 Simple Steps
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

                    <p className="text-base md:text-lg text-slate-500 font-medium max-w-2xl mx-auto mt-6">
                        The same simple spine whatever you&apos;re doing — only the questions adapt to your path.
                    </p>
                </div>

                {/* Steps — horizontal on desktop, vertical on mobile */}
                <div className="relative">
                    <div className="hidden lg:block absolute top-[5.5rem] left-[10%] right-[10%] h-px bg-gradient-to-r from-violet-200 via-emerald-200 to-rose-200 z-0" />

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 relative z-10">
                        {steps.map((step, i) => {
                            const Icon = step.icon;
                            const isLast = i === steps.length - 1;
                            const iconTones = [
                                "bg-blue-50 text-blue-600",
                                "bg-rose-50 text-rose-600",
                                "bg-orange-50 text-orange-600",
                                "bg-emerald-50 text-emerald-600",
                            ];
                            return (
                                <div key={step.number} className="relative flex flex-col items-center text-center group">
                                    <div
                                        className={`relative w-20 h-20 rounded-[1.5rem] ${iconTones[i]} flex items-center justify-center mb-6 shadow-sm group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}
                                    >
                                        <Icon className="w-9 h-9" strokeWidth={1.5} />
                                        <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border-2 border-slate-100 shadow-sm flex items-center justify-center text-[10px] font-black text-slate-900">
                                            {step.number}
                                        </div>
                                    </div>

                                    {!isLast && (
                                        <div className="lg:hidden flex justify-center mb-4 opacity-30">
                                            <ArrowRight className="w-5 h-5 text-slate-400 rotate-90" />
                                        </div>
                                    )}

                                    <h3 className="text-base font-black text-slate-900 leading-snug mb-3 tracking-tight">
                                        {step.title}
                                    </h3>
                                    <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-[220px]">
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
