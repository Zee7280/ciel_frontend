"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import clsx from "clsx";

interface PathDef {
    key: string;
    emoji: string;
    title: string;
    subtitle: string;
    badge: string;
    accent: {
        border: string;
        ring: string;
        badgeBg: string;
        badgeText: string;
        snapshotFrom: string;
        snapshotTo: string;
    };
    detailTitle: string;
    description: string;
    steps: { title: string; detail: string }[];
    snapshot: {
        value: string;
        label: string;
        lineOne: string;
        lineTwo: string;
        cta: string;
        href: string;
    };
}

const PATHS: PathDef[] = [
    {
        key: "community-service",
        emoji: "⛺",
        title: "Community Service",
        subtitle: "Field work with real hours",
        badge: "VERIFIED HOURS",
        accent: {
            border: "border-t-blue-500",
            ring: "ring-blue-500",
            badgeBg: "bg-blue-50",
            badgeText: "text-blue-700",
            snapshotFrom: "from-blue-500",
            snapshotTo: "to-blue-600",
        },
        detailTitle: "⛺ Community Service & Field Work",
        description:
            "Join an opportunity — or create your own and get faculty approval with one tap. Attendance logs itself, evidence collects as you go, and one partner approval verifies the whole record. HEC-compliant hours, guaranteed.",
        steps: [
            { title: "Join or create an opportunity", detail: "Faculty & partner approve via one-tap links" },
            { title: "Log sessions as you work", detail: "A photo per visit is enough — 16 hrs typical" },
            { title: "Report writes itself", detail: "Guided taps, no essays" },
            { title: "One approval → verified record", detail: "Hours, certificate, CII score" },
        ],
        snapshot: {
            value: "1,840",
            label: "VERIFIED HOURS",
            lineOne: "128 completed reports · 96 active students",
            lineTwo: "24 live opportunities · 37 partner orgs",
            cta: "Browse opportunities",
            href: "/opportunities",
        },
    },
    {
        key: "course-project",
        emoji: "📚",
        title: "Course Projects",
        subtitle: "SDG-linked class work",
        badge: "FREE · COURSEWORK",
        accent: {
            border: "border-t-amber-500",
            ring: "ring-amber-500",
            badgeBg: "bg-amber-50",
            badgeText: "text-amber-700",
            snapshotFrom: "from-amber-500",
            snapshotTo: "to-orange-600",
        },
        detailTitle: "📚 Course Projects",
        description:
            "Turn a semester assignment into a verified impact record. Map your coursework to the SDGs, attach your deliverables, and get it signed off by your instructor — completely free, no partner org required.",
        steps: [
            { title: "Pick your course", detail: "Any class, any semester" },
            { title: "Describe the project", detail: "What you built and who it's for" },
            { title: "Map it to the SDGs", detail: "Multi-select the goals it advances" },
            { title: "Attach evidence, submit", detail: "Instructor sign-off closes the loop" },
        ],
        snapshot: {
            value: "67",
            label: "RECORDS LOGGED",
            lineOne: "42 courses represented · 19 universities",
            lineTwo: "100% free · no partner needed",
            cta: "Start a course project",
            href: "/signup",
        },
    },
    {
        key: "fyp-thesis",
        emoji: "🎓",
        title: "FYP / Thesis",
        subtitle: "Final-year research",
        badge: "ACADEMIC",
        accent: {
            border: "border-t-purple-500",
            ring: "ring-purple-500",
            badgeBg: "bg-purple-50",
            badgeText: "text-purple-700",
            snapshotFrom: "from-purple-500",
            snapshotTo: "to-violet-600",
        },
        detailTitle: "🎓 FYP / Thesis",
        description:
            "Track your final-year project from proposal to defense. A 5-step milestone timeline, versioned deliverables that never overwrite each other, and a community-linkage record that shows real-world relevance to evaluators.",
        steps: [
            { title: "Set your milestones", detail: "Proposal → defense, pre-built timeline" },
            { title: "Upload versioned deliverables", detail: "Every draft kept, nothing lost" },
            { title: "Link it to a real community", detail: "Show who it helps, and how" },
            { title: "Get showcased", detail: "Standout theses featured platform-wide" },
        ],
        snapshot: {
            value: "7",
            label: "SHOWCASE STARS",
            lineOne: "31 active theses · 12 supervisors",
            lineTwo: "5-step milestone timeline",
            cta: "Start your thesis record",
            href: "/signup",
        },
    },
    {
        key: "startup-business",
        emoji: "💼",
        title: "Startup / Business",
        subtitle: "SDG-driven ventures",
        badge: "ENTERPRISE",
        accent: {
            border: "border-t-emerald-500",
            ring: "ring-emerald-500",
            badgeBg: "bg-emerald-50",
            badgeText: "text-emerald-700",
            snapshotFrom: "from-emerald-500",
            snapshotTo: "to-emerald-600",
        },
        detailTitle: "💼 Startup / Business",
        description:
            "Build your venture profile in the open — traction, team, and materials — and unlock visibility to investors once your profile crosses 70% complete. No fluff, just what a real investor checks first.",
        steps: [
            { title: "Build your venture profile", detail: "Name, description, stage" },
            { title: "Log traction over time", detail: "Dated rows investors can trust" },
            { title: "Add your team & materials", detail: "Pitch deck, one-pager, demo" },
            { title: "Go visible at 70% complete", detail: "Investors browse the marketplace" },
        ],
        snapshot: {
            value: "PKR 4.2M",
            label: "PIPELINE TRACKED",
            lineOne: "18 ventures · 9 investor intros",
            lineTwo: "70% completeness unlocks visibility",
            cta: "Start your venture profile",
            href: "/signup",
        },
    },
];

export default function WhereImpactLives() {
    const [activeKey, setActiveKey] = useState(PATHS[0].key);
    const active = PATHS.find((p) => p.key === activeKey) ?? PATHS[0];

    return (
        <section className="py-20 px-6 bg-slate-50/60">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-3">
                        One platform · Four paths
                    </p>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                        Where does your impact live?
                    </h2>
                    <p className="text-base text-slate-500 font-medium max-w-2xl mx-auto mt-3">
                        You don&apos;t have to do everything — pick what fits today. Most students use two or three paths before they graduate, and it all builds one portfolio.
                    </p>
                </div>

                {/* Tabs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {PATHS.map((path) => {
                        const isActive = path.key === activeKey;
                        return (
                            <button
                                key={path.key}
                                type="button"
                                onClick={() => setActiveKey(path.key)}
                                aria-pressed={isActive}
                                className={clsx(
                                    "text-left rounded-2xl border-t-4 bg-white border border-slate-200 p-6 transition-all duration-200",
                                    path.accent.border,
                                    isActive ? `ring-2 ${path.accent.ring} shadow-lg` : "hover:shadow-md hover:-translate-y-0.5",
                                )}
                            >
                                <span className="text-3xl" aria-hidden>{path.emoji}</span>
                                <p className="mt-3 text-base font-black text-slate-900">{path.title}</p>
                                <p className="mt-1 text-sm text-slate-500">{path.subtitle}</p>
                                <span
                                    className={clsx(
                                        "mt-3 inline-block rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest",
                                        path.accent.badgeBg,
                                        path.accent.badgeText,
                                    )}
                                >
                                    {path.badge}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Detail panel */}
                <div className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 md:p-10">
                    <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8 lg:gap-10 items-stretch">
                        <div>
                            <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                                {active.detailTitle}
                            </h3>
                            <p className="mt-3 text-sm md:text-base text-slate-500 leading-relaxed max-w-xl">
                                {active.description}
                            </p>

                            <ol className="mt-6 space-y-4">
                                {active.steps.map((step, i) => (
                                    <li key={step.title} className="flex items-start gap-3">
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-black text-emerald-700">
                                            {i + 1}
                                        </span>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{step.title}</p>
                                            <p className="text-sm text-slate-500">{step.detail}</p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </div>

                        <div
                            className={clsx(
                                "rounded-2xl bg-gradient-to-br p-7 text-white flex flex-col justify-between",
                                active.accent.snapshotFrom,
                                active.accent.snapshotTo,
                            )}
                        >
                            <div>
                                <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/80">
                                    <span aria-hidden>{active.emoji}</span>
                                    Live snapshot
                                </p>
                                <p className="mt-3 text-4xl font-black tracking-tight">{active.snapshot.value}</p>
                                <p className="mt-1 text-xs font-black uppercase tracking-widest text-white/70">
                                    {active.snapshot.label}
                                </p>
                                <p className="mt-4 text-sm text-white/85">{active.snapshot.lineOne}</p>
                                <p className="mt-1 text-sm text-white/85">{active.snapshot.lineTwo}</p>
                            </div>

                            <Link
                                href={active.snapshot.href}
                                className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-white/15 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/25"
                            >
                                {active.snapshot.cta} <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
