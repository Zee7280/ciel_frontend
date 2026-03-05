"use client";

import { BarChart3, CheckSquare, Globe2, Award, ClipboardList } from "lucide-react";

export default function FeaturesBar() {
    const features = [
        {
            icon: BarChart3,
            title: "Automated Impact Tracking"
        },
        {
            icon: CheckSquare,
            title: "Faculty Verification Workflow"
        },
        {
            icon: Globe2,
            title: "SDG Mapping Engine"
        },
        {
            icon: Award,
            title: "Digital Certificate Generation"
        },
        {
            icon: ClipboardList,
            title: "Audit & Reporting Module"
        }
    ];

    return (
        <section className="w-full bg-gradient-to-r from-[#14b8a6] via-[#0ea5e9] to-[#2563eb] py-20 px-6">
            <div className="max-w-[1600px] mx-auto">
                <h2 className="text-4xl md:text-5xl font-bold text-center text-white mb-20 tracking-tight">
                    Platform Features
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-12 text-center">
                    {features.map((feature, index) => {
                        const Icon = feature.icon;
                        return (
                            <div key={index} className="flex flex-col items-center group cursor-default">
                                <div className="mb-6 p-4 rounded-2xl bg-white/10 border border-white/20 transition-all duration-300 group-hover:scale-110 group-hover:bg-white/20">
                                    <Icon className="w-8 h-8 md:w-10 md:h-10 text-white stroke-[1.5]" />
                                </div>
                                <h3 className="text-white text-sm md:text-base font-semibold leading-snug max-w-[150px]">
                                    {feature.title}
                                </h3>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
