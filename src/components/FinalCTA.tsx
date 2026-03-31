"use client";

import Link from "next/link";
import { ArrowRight, Rocket, Handshake, CheckCircle2 } from "lucide-react";

const checks = [
    "HEC-recognized certificates",
    "Verified by universities & partners",
    "SDG-aligned project tracking",
    "Community Impact Index (CII) score",
];

export default function FinalCTA() {
    return (
        <section className="py-16 px-6 relative overflow-hidden bg-white">

            <div className="max-w-6xl mx-auto">
                {/* Main banner - Lighter/Premium Version */}
                <div className="relative rounded-[3rem] overflow-hidden bg-slate-50/50 border-2 border-slate-100 p-12 md:p-20 text-center shadow-premium">
                    {/* Animated glow blobs */}
                    <div className="absolute top-0 left-1/4 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#4285F4]/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

                    {/* Dot grid overlay */}
                    <div className="absolute inset-0 bg-[radial-gradient(rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />

                    {/* Rocket icon */}
                    <div className="relative z-10 flex justify-center mb-8">
                        <div className="w-20 h-20 rounded-3xl bg-white border border-slate-100 flex items-center justify-center shadow-premium group-hover:scale-110 transition-transform duration-300">
                            <Rocket className="w-10 h-10 text-[#4285F4]" strokeWidth={1.5} />
                        </div>
                    </div>

                    {/* Headline */}
                    <h2 className="relative z-10 text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight mb-6">
                        Start Your{" "}
                        <span className="bg-gradient-to-r from-[#4285F4] to-[#34A853] bg-clip-text text-transparent">
                            Impact Journey
                        </span>{" "}
                        Today
                    </h2>

                    <p className="relative z-10 text-slate-500 text-lg md:text-xl font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
                        Join thousands of students and institutions already building verified, measurable community impact across Pakistan.
                    </p>

                    {/* Trust checks */}
                    <div className="relative z-10 flex flex-wrap justify-center gap-x-8 gap-y-3 mb-12">
                        {checks.map((c, i) => (
                            <div key={i} className="flex items-center gap-2 text-slate-600 text-sm font-bold">
                                <CheckCircle2 className="w-4 h-4 text-[#34A853] shrink-0" />
                                {c}
                            </div>
                        ))}
                    </div>

                    {/* CTA Buttons */}
                    <div className="relative z-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Link
                            href="/signup"
                            className="group inline-flex items-center gap-3 px-10 py-5 bg-[#4285F4] text-white font-black rounded-2xl hover:bg-[#3367D6] hover:scale-105 hover:shadow-2xl hover:shadow-blue-200 transition-all duration-300 text-base"
                        >
                            <Rocket className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                            Register as Student
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                        </Link>

                        <Link
                            href="/signup?role=partner"
                            className="group inline-flex items-center gap-3 px-10 py-5 bg-white border border-slate-200 text-slate-700 font-black rounded-2xl hover:bg-slate-50 hover:scale-105 transition-all duration-300 text-base shadow-sm"
                        >
                            <Handshake className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                            Partner With Us
                        </Link>
                    </div>

                    {/* Fine print */}
                    <p className="relative z-10 text-slate-400 text-[10px] font-black uppercase tracking-widest mt-12">
                        Free to join · No credit card required · HEC recognized
                    </p>
                </div>
            </div>
        </section>
    );
}
