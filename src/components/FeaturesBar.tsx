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
import { HomeHeader, homeCard, homeSectionMint, homeWrap } from "@/components/home/HomeChrome";

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
        iconBox: "bg-ciel-teal-soft text-ciel-teal",
    },
    {
        icon: Globe2,
        title: "Align with SDGs",
        description: "Every project connects to global development goals",
        iconBox: "bg-ciel-green-soft text-ciel-green-deep",
    },
    {
        icon: Award,
        title: "Earn Verified Certificates",
        description: "Proof of your real contribution — not just participation",
        iconBox: "bg-ciel-gold-soft text-ciel-gold-deep",
    },
    {
        icon: BadgeCheck,
        title: "Verified by Partners",
        description: "Ensure credibility through external validation",
        iconBox: "bg-ciel-indigo-soft text-ciel-indigo",
    },
    {
        icon: BarChart3,
        title: "Get Your CII Score",
        description: "See your overall impact in one powerful number",
        iconBox: "bg-ciel-teal-soft text-ciel-teal",
    },
    {
        icon: LayoutDashboard,
        title: "Institutional Dashboard",
        description: "Universities get full analytics and reports",
        iconBox: "bg-ciel-green-soft text-ciel-green-deep",
    },
];

export default function FeaturesBar() {
    return (
        <section className={homeSectionMint}>
            <div className={homeWrap}>
                <HomeHeader
                    align="center"
                    kicker="Platform capabilities"
                    title="Exclusive features"
                    lead="Everything you need to document, verify, and report community impact — in one place."
                />

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {features.map(({ icon: Icon, title, description, iconBox }) => (
                        <div
                            key={title}
                            className={`flex items-center gap-4 p-5 md:p-6 ${homeCard}`}
                        >
                            <div
                                className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-lg ${iconBox}`}
                            >
                                <Icon className="h-6 w-6" strokeWidth={2} aria-hidden />
                            </div>
                            <div className="min-w-0 flex-1 text-left">
                                <h3 className="text-base font-black leading-snug text-ciel-navy md:text-[17px]">
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
