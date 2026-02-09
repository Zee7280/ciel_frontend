"use client";

import { Search, Handshake, Sprout, TrendingUp, ArrowRight } from "lucide-react";

export default function HowWeWork() {
    const steps = [
        {
            icon: Search,
            title: "Identify Needs",
            description: "Anyone can post a real community challenge aligned with SDGs.",
            bg: "bg-yellow-100", // Yellow card
            iconBg: "bg-yellow-200",
            iconColor: "text-yellow-800",
            titleColor: "text-yellow-900",
        },
        {
            icon: Handshake,
            title: "Join Opportunities",
            description: "Students and institutions participate through structured projects.",
            bg: "bg-sky-100", // Light Blue card
            iconBg: "bg-sky-200",
            iconColor: "text-sky-800",
            titleColor: "text-sky-900",
        },
        {
            icon: Sprout,
            title: "Document Action",
            description: "Log activities, hours, outputs, outcomes, and evidence in one report.",
            bg: "bg-green-100", // Green card
            iconBg: "bg-green-200",
            iconColor: "text-green-800",
            titleColor: "text-green-900",
        },
        {
            icon: TrendingUp,
            title: "Verify & Measure",
            description: "Partners/faculty verify contributions; dashboards generate impact intelligence.",
            bg: "bg-orange-100", // Orange card
            iconBg: "bg-orange-200",
            iconColor: "text-orange-800",
            titleColor: "text-orange-900",
        },
    ];

    return (
        <section className="pt-24 pb-0 px-6 relative overflow-hidden bg-white">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-black text-emerald-500 mb-6 tracking-tight">
                        How CIEL Works
                    </h2>
                    <div className="flex flex-wrap justify-center items-center gap-2 md:gap-4 text-lg md:text-xl font-bold text-slate-600">
                        <span className="text-sky-600">Identify</span>
                        <ArrowRight className="w-5 h-5 text-slate-400" />
                        <span className="text-emerald-600">Participate</span>
                        <ArrowRight className="w-5 h-5 text-slate-400" />
                        <span className="text-sky-600">Document</span>
                        <ArrowRight className="w-5 h-5 text-slate-400" />
                        <span className="text-emerald-600">Verify</span>
                        <ArrowRight className="w-5 h-5 text-slate-400" />
                        <span className="text-sky-600">Measure</span>
                    </div>
                </div>

                {/* Process Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {steps.map((step, index) => {
                        const Icon = step.icon;
                        return (
                            <div
                                key={index}
                                className={`relative group rounded-[2rem] p-8 ${step.bg} hover:shadow-xl hover:-translate-y-2 transition-all duration-300`}
                            >
                                {/* Icon */}
                                <div className="flex justify-center mb-6">
                                    <Icon className={`w-12 h-12 ${step.titleColor}`} strokeWidth={1.5} />
                                </div>

                                {/* Title */}
                                <h3 className={`text-xl font-bold ${step.titleColor} text-center mb-3 leading-tight`}>
                                    {step.title}
                                </h3>

                                {/* Description */}
                                <p className={`text-sm ${step.titleColor} text-center opacity-80 leading-relaxed font-medium`}>
                                    {step.description}
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* CTA */}
                <div className="text-center">
                    <p className="text-lg text-slate-500 font-medium flex justify-center items-center gap-1">
                        Partner with us <span className="text-2xl">🤝</span>
                        <span className="font-bold text-sky-500">Together,</span> we create
                        measurable change <span className="font-bold text-sky-500">across Pakistan.</span>
                    </p>
                </div>
            </div>
        </section>
    );
}
