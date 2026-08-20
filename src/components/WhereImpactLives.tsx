"use client";

import { useEffect, useState } from "react";
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
            label: "VERIFIED HOURS — AND COUNTING",
            lineOne: "The pilot is live — every hour above is faculty-verified",
            lineTwo: "New opportunities and partners added weekly",
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
            "Did a class project touch sustainability? Record it in ~8 minutes — whether the SDG link was required by your teacher or your own idea. Free forever: the value is putting Pakistan's curriculum on the SDG map.",
        steps: [
            { title: "Record the project", detail: "Mostly taps, no essays" },
            { title: "Map the SDG", detail: "Plain-language targets, help if unsure" },
            { title: "Teacher confirms in one click", detail: "Then it joins your portfolio" },
            { title: "Universities see the map", detail: "Which courses embed SDGs — nationally" },
        ],
        snapshot: {
            value: "OPEN",
            label: "NOW ACCEPTING FIRST RECORDS — FREE FOREVER",
            lineOne: "Pakistan's SDG curriculum map starts with record #1 — make it yours",
            lineTwo: "🏁 Founding records carry a First Cohort badge, permanently",
            cta: "Record a course project",
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
            "Research paper, fabric collection, building design, or app — every school's work counts. A live Showcase Strength meter rewards rigor, and supervisor sign-off gates everything. The best get featured to universities and industry.",
        steps: [
            { title: "Record your project", detail: "Any form — 10 forms supported" },
            { title: "Show your research depth", detail: "Methods, data scale, honest novelty" },
            { title: "Supervisor signs off", detail: "Nothing counts without it" },
            { title: "Strong work gets showcased ⭐", detail: "Featured to industry & rankings" },
        ],
        snapshot: {
            value: "⭐",
            label: "SHOWCASE OPENING THIS SEMESTER",
            lineOne: "The first approved projects set the benchmark for everyone after",
            lineTwo: "Early entries are featured at launch — to universities and industry",
            cta: "Start my FYP record",
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
            "From napkin idea to operating company — staged honestly, faculty-gated, and visible to subscribed investors on your terms. Your consent controls every field on your Investor Card; contacts stay private until you accept an introduction.",
        steps: [
            { title: "Build your profile", detail: "8 steps — reality check first" },
            { title: "Prove the impact", detail: "SDG wired into the model, indicators tracked" },
            { title: "Faculty approves", detail: "Then your Investor Card goes live" },
            { title: "Investors request intros", detail: "You accept or decline — your call" },
        ],
        snapshot: {
            value: "SOON",
            label: "INVESTOR MARKETPLACE — LAUNCHING",
            lineOne: "Build your Venture Card now and be on the marketplace on day one",
            lineTwo: "Founding ventures get priority visibility to subscribed investors",
            cta: "Start my venture",
            href: "/signup",
        },
    },
];

export default function WhereImpactLives() {
    const [activeKey, setActiveKey] = useState(PATHS[0].key);
    const active = PATHS.find((p) => p.key === activeKey) ?? PATHS[0];

    useEffect(() => {
        const requestedKey = new URLSearchParams(window.location.search).get("path");
        if (requestedKey && PATHS.some((p) => p.key === requestedKey)) {
            setActiveKey(requestedKey);
        }
    }, []);

    return (
        <section id="where-your-impact-lives" className="py-20 px-6 bg-slate-50/60 scroll-mt-24">
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
