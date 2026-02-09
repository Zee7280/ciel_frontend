"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function FooterBanner() {
    return (
        <div className="w-full bg-[#00689D] overflow-hidden py-10 px-6 text-center">
            <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight leading-tight">
                    Empowering Youth for a <br />
                    <span className="text-[#26BDE2]">Better Pakistan</span>
                </h2>

                <p className="text-white/80 text-lg max-w-2xl mx-auto leading-relaxed mb-10 font-medium">
                    Join the movement by engaging with impactful community projects aligned with Sustainable Development Goals.
                </p>

                <div className="flex justify-center">
                    <Link href="/signup" className="px-10 py-4 bg-[#26BDE2] text-white rounded-full font-bold text-lg hover:bg-[#1daecf] transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center gap-2">
                        Join Now
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    {/* 'Contact Us' button removed to match design exactly */}
                </div>
            </div>
        </div>
    );
}
