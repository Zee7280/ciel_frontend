"use client";

import { ArrowRight, GraduationCap, AlertTriangle, Heart, Leaf, Users, Target } from "lucide-react";

const projects = [
    {
        id: 1,
        category: "EDUCATION",
        icon: GraduationCap,
        title: "SOS Village",
        description: "Conduct community assessments to processing social issues.",
        active: 53,
        color: "yellow",
        headerColor: "bg-yellow-400",
        iconColor: "text-yellow-600",
    },
    {
        id: 2,
        category: "DISASTER RELIEF",
        icon: AlertTriangle,
        title: "Flood Relief",
        description: "Conduct community assessments to processing social issues.",
        active: 11,
        color: "emerald", // Changed to Emerald/Green
        headerColor: "bg-emerald-400",
        iconColor: "text-emerald-600",
    },
    {
        id: 3,
        category: "SOCIAL WORK",
        icon: Heart,
        title: "Children Protection",
        description: "Conduct community assessments to processing social issues.",
        active: 50,
        color: "orange",
        headerColor: "bg-orange-400",
        iconColor: "text-orange-600",
    },
    {
        id: 4,
        category: "ENVIRONMENT",
        icon: Leaf,
        title: "Environmental Projects",
        description: "Conduct community assessments to processing social issues.",
        active: 16,
        color: "blue",
        headerColor: "bg-blue-400",
        iconColor: "text-blue-600",
    },
];

export default function StoriesGrid() {
    return (
        <section className="pt-12 pb-4 px-6 max-w-7xl mx-auto bg-slate-50/0">
            {/* Header */}
            <div className="text-center mb-8">
                <h2 className="text-4xl md:text-5xl font-black text-orange-500 mb-4 tracking-tight">
                    Verified Community Impact
                </h2>
                <p className="text-xl text-slate-800 font-bold max-w-2xl mx-auto">
                    Projects that turned learning into <span className="text-emerald-600">measurable community impact.</span>
                </p>
            </div>

            {/* Project Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-2">
                {projects.map((project) => {
                    const Icon = project.icon;
                    return (
                        <div
                            key={project.id}
                            className="bg-white rounded-[2rem] overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-slate-100 flex flex-col"
                        >
                            {/* Header Bar */}
                            <div className={`${project.headerColor} py-3 px-6 text-center`}>
                                <span className="font-bold text-slate-900 text-sm">Active ({project.active})</span>
                            </div>

                            {/* Body */}
                            <div className="p-8 flex-1 flex flex-col items-center text-center">
                                {/* Icon + Category */}
                                <div className="flex flex-col items-center gap-3 mb-4">
                                    <Icon className={`w-8 h-8 ${project.iconColor}`} />
                                    <span className={`text-[11px] font-bold ${project.iconColor} uppercase tracking-widest`}>
                                        {project.category}
                                    </span>
                                </div>

                                {/* Title */}
                                <h3 className="text-xl font-extrabold text-slate-900 mb-3">
                                    {project.title}
                                </h3>

                                {/* Description */}
                                <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">
                                    {project.description}
                                </p>

                                {/* Button */}
                                <button className="mt-auto bg-orange-400 hover:bg-orange-500 text-white font-bold py-2 px-6 rounded-full text-sm transition-colors shadow-md hover:shadow-lg flex items-center gap-1">
                                    View Project <span className="text-xs">&gt;&gt;</span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
