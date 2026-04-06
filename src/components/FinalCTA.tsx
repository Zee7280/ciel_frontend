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
        <section className="py-12 px-6 bg-white relative overflow-hidden">
            <div className="max-w-7xl mx-auto relative z-10">
                <div className="relative rounded-[3rem] overflow-hidden bg-gradient-to-r from-[#034C5F] to-[#12A07B] p-16 md:p-24 text-center shadow-2xl">
                    {/* Animated glow blobs */}
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

                    {/* Headline */}
                    <h2 className="relative z-10 text-4xl md:text-5xl lg:text-[64px] font-black text-white tracking-tight leading-[1.05] mb-8">
                        Start Your Impact Journey Today
                    </h2>

                    {/* Subtitle */}
                    <p className="relative z-10 text-emerald-50 text-base md:text-lg lg:text-xl font-medium max-w-3xl mx-auto mb-12 leading-relaxed opacity-90">
                        Join thousands of students and institutions already building verified, 
                        measurable community impact across Pakistan.
                    </p>

                    {/* CTA Buttons */}
                    <div className="relative z-10 flex flex-col sm:flex-row gap-6 justify-center items-center">
                        <Link
                            href="/signup"
                            className="group inline-flex items-center gap-4 px-12 py-5 bg-white text-[#034C5F] font-black rounded-2xl hover:bg-slate-50 hover:scale-105 transition-all duration-300 shadow-xl text-lg"
                        >
                            <Rocket className="w-6 h-6" />
                            Register as Student
                            <ArrowRight className="w-6 h-6 group-hover:translate-x-1.5 transition-transform duration-300" />
                        </Link>

                        <Link
                            href="/signup?role=partner"
                            className="group inline-flex items-center gap-4 px-12 py-5 bg-transparent border-2 border-white/30 text-white font-black rounded-2xl hover:bg-white/10 hover:scale-105 transition-all duration-300 text-lg"
                        >
                            <Handshake className="w-6 h-6 text-emerald-100 group-hover:text-white transition-colors" />
                            Partner With Us
                        </Link>
                    </div>

                    {/* Footer Badges/Text */}
                    <div className="relative z-10 mt-16 flex flex-wrap justify-center items-center gap-4 opacity-60">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">
                            Free to join
                        </p>
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">
                            No credit card required
                        </p>
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">
                            HEC recognized
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
