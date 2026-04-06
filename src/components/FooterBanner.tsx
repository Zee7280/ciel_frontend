"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function FooterBanner() {
    return (
        <div className="w-full bg-gradient-to-r from-[#0ea5e9] via-[#0d9488] to-[#10b981] py-12 px-6 text-center">
            <div className="max-w-4xl mx-auto">
                <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight leading-[1.1]">
                    Empowering Youth for a <br className="hidden md:block" />
                    Better Pakistan
                </h2>

                <p className="text-white/90 text-[18px] md:text-[22px] max-w-3xl mx-auto leading-relaxed mb-12 font-medium opacity-90">
                    Join the movement by engaging with impactful community projects aligned with Sustainable Development Goals.
                </p>

                <div className="flex justify-center">
                    <Link href="/register" className="px-12 py-4 bg-white text-[#0d9488] rounded-lg font-bold text-xl hover:bg-slate-50 transition-all shadow-xl hover:-translate-y-1">
                        Join Now
                    </Link>
                </div>
            </div>
        </div>
    );
}
