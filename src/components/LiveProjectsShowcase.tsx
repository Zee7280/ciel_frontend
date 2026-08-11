"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Check } from "lucide-react";
import clsx from "clsx";

interface ProjectPill {
    label: string;
    className: string;
    icon?: "sparkles" | "check";
}

interface ShowcaseProject {
    id: string;
    emoji: string;
    banner: string;
    title: string;
    description: string;
    pills: ProjectPill[];
}

const PROJECTS: ShowcaseProject[] = [
    {
        id: "faslo-fikar",
        emoji: "🌾",
        banner: "from-emerald-500 to-emerald-700",
        title: "Faslo Fikar",
        description: "Pesticide-safety education for farmers — Urdu guides, PPE training, QR video tools. Lahore · 20 hrs · hybrid.",
        pills: [
            { label: "SDG 3", className: "bg-emerald-600 text-white" },
            { label: "Student-created", className: "bg-amber-50 text-amber-700", icon: "sparkles" },
            { label: "2 seats left", className: "bg-rose-50 text-rose-600" },
        ],
    },
    {
        id: "sos-classroom-transformation",
        emoji: "🏫",
        banner: "from-indigo-500 to-blue-600",
        title: "SOS Classroom Transformation",
        description: "Renovate classrooms & train caregivers with SOS Children's Villages. Lahore · 16 hrs · on-ground.",
        pills: [
            { label: "SDG 4", className: "bg-rose-600 text-white" },
            { label: "Verified partner", className: "bg-emerald-50 text-emerald-700", icon: "check" },
            { label: "3 seats left", className: "bg-rose-50 text-rose-600" },
        ],
    },
    {
        id: "clean-water-awareness-week",
        emoji: "💧",
        banner: "from-teal-600 to-sky-500",
        title: "Clean Water Awareness Week",
        description: "Hygiene & safe-water education across 3 community schools with WaterAid. Kasur · 20 hrs.",
        pills: [
            { label: "SDG 6", className: "bg-sky-100 text-sky-700" },
            { label: "SDG 3", className: "bg-emerald-600 text-white" },
            { label: "12 seats", className: "bg-blue-50 text-blue-700" },
        ],
    },
];

export default function LiveProjectsShowcase() {
    return (
        <section className="py-20 px-6 bg-white">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <p className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-600 mb-3">
                        <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden />
                        Live right now
                    </p>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                        Projects you can join today
                    </h2>
                    <p className="text-base text-slate-500 font-medium max-w-2xl mx-auto mt-3">
                        Real seats, real partners, faculty-supervised — apply in one tap and your verified record starts immediately.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {PROJECTS.map((project) => (
                        <Link
                            key={project.id}
                            href="/projects"
                            className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                        >
                            <div className={clsx("flex h-40 items-center justify-center bg-gradient-to-br", project.banner)}>
                                <span className="text-5xl" aria-hidden>{project.emoji}</span>
                            </div>
                            <div className="p-6">
                                <p className="flex items-center gap-2 text-base font-black text-slate-900">
                                    {project.title}
                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-emerald-600">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                                        Live
                                    </span>
                                </p>
                                <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                                    {project.description}
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {project.pills.map((pill) => (
                                        <span
                                            key={pill.label}
                                            className={clsx(
                                                "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide",
                                                pill.className,
                                            )}
                                        >
                                            {pill.icon === "sparkles" && <Sparkles className="h-3 w-3" />}
                                            {pill.icon === "check" && <Check className="h-3 w-3" />}
                                            {pill.label}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                    <Link
                        href="/projects"
                        className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-slate-800"
                    >
                        Browse all 24 live projects <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                        href="/signup"
                        className="flex items-center gap-2 rounded-xl border-2 border-slate-200 px-6 py-3.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        Create your own opportunity
                    </Link>
                </div>
            </div>
        </section>
    );
}
