"use client";

import {
    LineChart,
    Globe2,
    Award,
    BadgeCheck,
    BarChart3,
    LayoutDashboard,
    type LucideIcon,
} from "lucide-react";

const features: {
    icon: LucideIcon;
    title: string;
    description: string;
    iconBox: string;
}[] = [
    {
        icon: LineChart,
        title: "Track Real Impact",
        description: "Automatically record activities, hours, and outputs",
        iconBox: "bg-sky-50 text-sky-600",
    },
    {
        icon: Globe2,
        title: "Align with SDGs",
        description: "Every project connects to global development goals",
        iconBox: "bg-orange-50 text-orange-600",
    },
    {
        icon: Award,
        title: "Earn Verified Certificates",
        description: "Proof of your real contribution — not just participation",
        iconBox: "bg-emerald-50 text-emerald-600",
    },
    {
        icon: BadgeCheck,
        title: "Verified by Partners",
        description: "Ensure credibility through external validation",
        iconBox: "bg-rose-50 text-rose-600",
    },
    {
        icon: BarChart3,
        title: "Get Your CII Score",
        description: "See your overall impact in one powerful number",
        iconBox: "bg-cyan-50 text-cyan-600",
    },
    {
        icon: LayoutDashboard,
        title: "Institutional Dashboard",
        description: "Universities get full analytics and reports",
        iconBox: "bg-amber-50 text-amber-700",
    },
];

export default function FeaturesBar() {
    return (
        <section className="relative overflow-hidden bg-white px-6 py-20 md:py-24">
            <div className="relative z-10 mx-auto max-w-6xl">
                <div className="mb-12 text-center md:mb-16">
                    <div className="relative mb-4 inline-block">
                        <h2 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl lg:text-[42px] lg:leading-tight">
                            Exclusive Features
                        </h2>
                        <svg
                            className="absolute -bottom-3 left-0 h-3 w-full text-[#34A853]/40"
                            preserveAspectRatio="none"
                            viewBox="0 0 100 10"
                            fill="none"
                            aria-hidden
                        >
                            <path
                                d="M0 5Q 25 0 50 5 Q 75 10 100 5"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                        </svg>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
                    {features.map(({ icon: Icon, title, description, iconBox }) => (
                        <div
                            key={title}
                            className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.06)] md:p-6"
                        >
                            <div
                                className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-lg ${iconBox}`}
                            >
                                <Icon className="h-6 w-6" strokeWidth={2} aria-hidden />
                            </div>
                            <div className="min-w-0 flex-1 text-left">
                                <h3 className="text-base font-bold leading-snug text-slate-900 md:text-[17px]">
                                    {title}
                                </h3>
                                <p className="mt-1 text-sm font-normal leading-relaxed text-slate-500">
                                    {description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
