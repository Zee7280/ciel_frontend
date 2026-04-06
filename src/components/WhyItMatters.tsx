"use client";

import { EyeOff, Eye, ArrowRight } from "lucide-react";

export default function WhyItMatters() {
    return (
        <section className="py-24 px-6 bg-white relative overflow-hidden">
            {/* Subtle background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:72px_72px] pointer-events-none" />

            <div className="max-w-5xl mx-auto relative z-10">
                {/* Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-slate-500 text-[10px] font-black uppercase tracking-widest mb-6">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335] animate-pulse" />
                        Why It Matters
                    </div>

                    <div className="relative inline-block mb-4">
                        <h2 className="text-3xl md:text-4xl lg:text-[42px] font-black text-slate-900 tracking-tight leading-tight">
                            Impact That Can't Be{" "}
                            <span className="bg-gradient-to-r from-[#EA4335] to-[#FBBC05] bg-clip-text text-transparent">
                                Ignored
                            </span>
                        </h2>
                        {/* Wavy Underline (Green) */}
                        <svg className="absolute -bottom-3 left-0 w-full h-3 text-[#34A853]/30" preserveAspectRatio="none" viewBox="0 0 100 10" fill="none">
                            <path d="M0 5Q 25 0 50 5 Q 75 10 100 5" stroke="currentColor" strokeWidth="4" />
                        </svg>
                    </div>
                </div>


                {/* Before / After comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    {/* Without CIEL */}
                    <div className="group relative p-10 rounded-[2rem] bg-slate-50 border-2 border-slate-100 overflow-hidden hover:shadow-lg transition-all duration-500">
                        {/* Faded X mark */}
                        <div className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                            <EyeOff className="w-5 h-5 text-[#4285F4]" />
                        </div>

                        <div className="mb-8">
                            <span className="text-xs font-black uppercase tracking-widest text-[#4285F4] bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">Without CIEL</span>
                        </div>

                        <h3 className="text-lg font-black text-slate-700 leading-snug mb-6 tracking-tight">
                            Community work is{" "}
                            <span className="text-[#4285F4] line-through decoration-red-300">invisible</span>
                        </h3>

                        <ul className="space-y-4">
                            {[
                                "No record of hours spent",
                                "Impossible to prove real impact",
                                "SDG work goes unrecognized",
                                "Universities can't report to HEC",
                                "Students lose out on credit",
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">
                                        <div className="w-1.5 h-0.5 bg-red-400 rounded-full" />
                                    </div>
                                    <span className="text-sm font-medium text-slate-400 line-through decoration-slate-200">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* With CIEL */}
                    <div className="group relative p-10 rounded-[2rem] bg-gradient-to-br from-emerald-50 to-sky-50 border-2 border-slate-100 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-500">
                        {/* Glow */}
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 to-sky-400/5 pointer-events-none" />

                        <div className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                            <Eye className="w-5 h-5 text-[#4285F4]" />
                        </div>

                        <div className="mb-8">
                            <span className="text-xs font-black uppercase tracking-widest text-[#4285F4] bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">With CIEL</span>
                        </div>

                        <h3 className="text-lg font-black text-slate-900 leading-snug mb-6 tracking-tight">
                             Impact becomes{" "}
                             <span className="text-[#4285F4]">measurable & credible</span>
                         </h3>

                        <ul className="space-y-4 relative z-10">
                            {[
                                "Every hour tracked & verified",
                                "Real SDG impact measured",
                                "Certificates that prove contribution",
                                "Auto-generated HEC reports",
                                "CII score recognized nationally",
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Emotional quote banner - Lighter Version */}
                <div className="text-center p-12 rounded-[3rem] bg-slate-50 border-2 border-slate-100 relative overflow-hidden shadow-premium">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(66,133,244,0.05)_0%,transparent_70%)] pointer-events-none" />
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4 relative z-10">The CIEL Promise</p>
                    <blockquote className="text-xl md:text-2xl font-black text-slate-900 leading-tight relative z-10 max-w-3xl mx-auto tracking-tight">
                        "If it's not measured, it doesn't count.{" "}
                        <span className="bg-gradient-to-r from-[#4285F4] to-[#34A853] bg-clip-text text-transparent">
                            CIEL makes it count.
                        </span>"
                    </blockquote>
                    <p className="text-slate-500 text-sm font-bold mt-4 relative z-10">
                        Turning student effort into national recognition — one verified report at a time.
                    </p>
                </div>

            </div>
        </section>
    );
}
