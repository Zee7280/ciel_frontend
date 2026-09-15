"use client";

import {
    UserCheck,
    ClipboardList,
    ShieldCheck,
    Award,
    ArrowRight,
} from "lucide-react";
import { HomeHeader, homeSectionWhite, homeWrap } from "@/components/home/HomeChrome";

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
        <section id="how-it-works" className={`${homeSectionWhite} relative overflow-hidden`}>
            <div className={`${homeWrap} relative z-10`}>
                <HomeHeader
                    align="center"
                    kicker="4 simple steps"
                    title="How CIEL works"
                    lead="The same simple spine whatever you're doing — only the questions adapt to your path."
                />

                {/* Steps — horizontal on desktop, vertical on mobile */}
                <div className="relative">
                    <div className="hidden lg:block absolute top-[5.5rem] left-[10%] right-[10%] h-px bg-[#D6E6E3] z-0" />

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 relative z-10">
                        {steps.map((step, i) => {
                            const Icon = step.icon;
                            const isLast = i === steps.length - 1;
                            const iconTones = [
                                "bg-ciel-teal-soft text-ciel-teal",
                                "bg-ciel-green-soft text-ciel-green-deep",
                                "bg-ciel-gold-soft text-ciel-gold-deep",
                                "bg-ciel-indigo-soft text-ciel-indigo",
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

                                    <h3 className="mb-3 text-base font-black leading-snug tracking-tight text-ciel-navy">
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
