"use client";
import React from "react";
import { CheckCircle2, ChevronRight, Users, MapPin, Target, Activity, TrendingUp, Wrench, Handshake, Image, BookOpen, Leaf, BarChart3 } from "lucide-react";
import { Button } from "./ui/button";

const sections = [
    {
        icon: <Users className="w-5 h-5" />,
        color: "blue",
        title: "Section 1 — Participation & Attendance",
        items: [
            "Register using your correct personal and academic details",
            "Verify mobile number and email via OTP",
            "Record attendance for every activity session",
            "Enter start time and end time for each session",
            "Briefly describe what happened during each session",
            "Upload optional evidence (photos or documents) where available",
        ],
        note: "You cannot manually enter total hours. The system calculates hours automatically based on attendance logs."
    },
    {
        icon: <MapPin className="w-5 h-5" />,
        color: "violet",
        title: "Section 2 — Project Context & Problem Definition",
        items: [
            "What problem existed before the project",
            "Who was affected by the problem",
            "What gap existed (skills, awareness, services, etc.)",
            "Why intervention was necessary",
            "What data or evidence informed the problem (survey, observation, research)",
        ],
        note: "Do not describe activities or results here. Only explain the situation before the project started."
    },
    {
        icon: <Target className="w-5 h-5" />,
        color: "emerald",
        title: "Section 3 — SDG Alignment",
        items: [
            "Which SDG Goal the project supports",
            "The SDG Target and Indicator connected to the project",
            "How your planned activities contribute to that SDG",
            "What you plan to do and who will benefit",
            "What type of change you expect to support",
        ],
        note: "This section describes intent, not results. Do NOT include numbers, measured outcomes, or final achievements."
    },
    {
        icon: <Activity className="w-5 h-5" />,
        color: "orange",
        title: "Section 4 — Activities & Outputs",
        items: [
            "Type of activities conducted (training, workshop, service, etc.)",
            "Number of sessions conducted",
            "Outputs delivered (people trained, materials distributed, etc.)",
            "Number of beneficiaries reached",
            "Who the beneficiaries were (youth, women, community members, etc.)",
        ],
        note: "This section records outputs only. Do not describe improvements, impact or results — those belong in Section 5."
    },
    {
        icon: <TrendingUp className="w-5 h-5" />,
        color: "rose",
        title: "Section 5 — Outcomes & Results",
        items: [
            "What improved or changed for beneficiaries",
            "A measurable indicator (e.g. number of people who learned a skill)",
            "The baseline value (before) and endline value (after)",
            "Any limitations that affected the results",
        ],
        note: "Outcomes must be linked to outputs recorded in Section 4."
    },
    {
        icon: <Wrench className="w-5 h-5" />,
        color: "amber",
        title: "Section 6 — Resources & Implementation Support",
        items: [
            "Financial support, materials or equipment used",
            "Training venue, transport support",
            "Volunteers or experts involved",
            "Institutional support received",
            "Who provided each resource and what it enabled",
        ],
        note: "If the project used only volunteer effort, the system records that automatically."
    },
    {
        icon: <Handshake className="w-5 h-5" />,
        color: "teal",
        title: "Section 7 — Partnerships & Collaboration",
        items: [
            "Organizations or institutions that hosted activities",
            "Partners who provided beneficiaries, resources, or technical expertise",
            "Partner type (NGO, school, government, etc.)",
            "Role played and contribution provided by each partner",
        ],
        note: "Do not list organizations that were only informed or mentioned — only active contributors."
    },
    {
        icon: <Image className="w-5 h-5" />,
        color: "indigo",
        title: "Section 8 — Evidence & Verification",
        items: [
            "Activity photos, attendance sheets, training materials",
            "Survey results, partner confirmation emails or letters",
            "Media coverage where available",
            "Participant consent confirmation where required",
        ],
        note: "Evidence must clearly show the activity occurred, beneficiaries participated, and outputs were delivered."
    },
    {
        icon: <BookOpen className="w-5 h-5" />,
        color: "pink",
        title: "Section 9 — Reflection & Learning",
        items: [
            "Skills developed during the project",
            "Learning from working with communities",
            "How academic knowledge helped in the project",
            "Challenges faced and lessons learned",
            "Self-rating on critical thinking, teamwork, and sustainability thinking",
        ],
    },
    {
        icon: <Leaf className="w-5 h-5" />,
        color: "green",
        title: "Section 10 — Sustainability & Continuation",
        items: [
            "Will activities continue after the project ends?",
            "Will a partner continue the work?",
            "Were resources or knowledge transferred?",
            "Could the project scale to other communities?",
            "Identify continuation mechanisms and scaling potential",
        ],
        note: "Honest answers are encouraged — even partial continuation is valuable."
    },
    {
        icon: <BarChart3 className="w-5 h-5" />,
        color: "slate",
        title: "Section 11 — Institutional Intelligence Dashboard",
        items: [
            "This section is automatically generated by the system",
            "No data entry is required",
            "Analytics are calculated from your previous sections",
        ],
        note: "Supports university reporting, HEC audit compliance, SDG reporting and QS impact rankings."
    },
];

const colorMap: Record<string, { bg: string; icon: string; border: string; badge: string }> = {
    blue: { bg: "bg-blue-50", icon: "text-blue-600 bg-blue-100", border: "border-blue-100", badge: "bg-blue-600" },
    violet: { bg: "bg-violet-50", icon: "text-violet-600 bg-violet-100", border: "border-violet-100", badge: "bg-violet-600" },
    emerald: { bg: "bg-emerald-50", icon: "text-emerald-600 bg-emerald-100", border: "border-emerald-100", badge: "bg-emerald-600" },
    orange: { bg: "bg-orange-50", icon: "text-orange-600 bg-orange-100", border: "border-orange-100", badge: "bg-orange-600" },
    rose: { bg: "bg-rose-50", icon: "text-rose-600 bg-rose-100", border: "border-rose-100", badge: "bg-rose-600" },
    amber: { bg: "bg-amber-50", icon: "text-amber-600 bg-amber-100", border: "border-amber-100", badge: "bg-amber-600" },
    teal: { bg: "bg-teal-50", icon: "text-teal-600 bg-teal-100", border: "border-teal-100", badge: "bg-teal-600" },
    indigo: { bg: "bg-indigo-50", icon: "text-indigo-600 bg-indigo-100", border: "border-indigo-100", badge: "bg-indigo-600" },
    pink: { bg: "bg-pink-50", icon: "text-pink-600 bg-pink-100", border: "border-pink-100", badge: "bg-pink-600" },
    green: { bg: "bg-green-50", icon: "text-green-600 bg-green-100", border: "border-green-100", badge: "bg-green-600" },
    slate: { bg: "bg-slate-50", icon: "text-slate-600 bg-slate-200", border: "border-slate-100", badge: "bg-slate-700" },
};

export default function PreReportGuide({ projectTitle, onStart }: { projectTitle?: string; onStart: () => void }) {
    return (
        <div className="max-w-4xl mx-auto space-y-10 py-4 animate-in fade-in duration-500">
            {/* Hero */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-blue-700 text-xs font-black uppercase tracking-widest">
                    📋 Before You Start
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
                    Community Engagement Report
                </h1>
                {projectTitle && (
                    <p className="text-slate-500 font-medium text-lg">{projectTitle}</p>
                )}
                <p className="text-slate-500 max-w-2xl mx-auto text-sm leading-relaxed">
                    Your report is divided into <strong>11 sections</strong>. Each section records a different part of your project.
                    Review what you need to collect for each section — then start your report when ready.
                </p>
            </div>

            {/* Sections grid */}
            <div className="grid gap-4">
                {sections.map((section, idx) => {
                    const c = colorMap[section.color];
                    return (
                        <div key={idx} className={`rounded-2xl border ${c.border} ${c.bg} p-6 space-y-4`}>
                            <div className="flex items-start gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.icon}`}>
                                    {section.icon}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-black text-slate-900">{section.title}</h3>
                                </div>
                                <span className={`${c.badge} text-white text-[10px] font-black rounded-full px-2.5 py-1 shrink-0`}>
                                    {String(idx + 1).padStart(2, '0')}
                                </span>
                            </div>

                            <ul className="space-y-2 pl-2">
                                {section.items.map((item, i) => (
                                    <li key={i} className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                                        {item}
                                    </li>
                                ))}
                            </ul>

                            {section.note && (
                                <p className="text-[11px] text-slate-500 font-medium bg-white/70 rounded-xl px-4 py-2.5 border border-white">
                                    ⚠️ {section.note}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Key tip */}
            <div className="bg-slate-900 rounded-2xl p-8 text-white space-y-4">
                <h3 className="text-lg font-black">✅ Key Advice for Students</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                        "Record attendance for every session",
                        "Track activities and outputs clearly",
                        "Measure change where possible",
                        "Keep evidence (photos, documents, confirmations)",
                        "Note resources and partnerships",
                        "Reflect on your learning",
                    ].map((tip, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-slate-300 font-medium">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            {tip}
                        </div>
                    ))}
                </div>
                <p className="text-slate-400 text-xs pt-2">
                    If you collect this information during the project, completing the report will be simple and accurate.
                </p>
            </div>

            {/* CTA */}
            <div className="flex justify-center pb-8">
                <Button
                    onClick={onStart}
                    className="h-14 px-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-base shadow-xl shadow-blue-200 transition-all"
                >
                    I'm Ready — Start My Report <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
            </div>
        </div>
    );
}
