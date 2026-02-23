"use client";

import { useEffect, useState } from "react";
import { ArrowRight, GraduationCap, AlertTriangle, Heart, Leaf, Users, Target, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

interface Opportunity {
    id: string;
    title: string;
    description: string;
    types: string[];
    sdg_info: {
        sdg_id: string;
    };
    participant_count?: number;
}

// SDG Mapping Helper
const getSdgStyles = (sdgNumber: number | string) => {
    const num = Number(sdgNumber);
    if (num <= 4) return { header: "bg-yellow-400", icon: "text-yellow-600", bg: "bg-yellow-50/30", iconType: GraduationCap };
    if (num <= 8) return { header: "bg-blue-400", icon: "text-blue-600", bg: "bg-blue-50/30", iconType: Target };
    if (num <= 12) return { header: "bg-orange-400", icon: "text-orange-600", bg: "bg-orange-50/30", iconType: Users };
    if (num <= 15) return { header: "bg-emerald-400", icon: "text-emerald-600", bg: "bg-emerald-50/30", iconType: Leaf };
    return { header: "bg-purple-400", icon: "text-purple-600", bg: "bg-purple-50/30", iconType: Heart };
};

export default function StoriesGrid() {
    const router = useRouter();
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOpportunities = async () => {
            try {
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
                const response = await fetch(`${backendUrl}/opportunities`);
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && Array.isArray(result.data)) {
                        setOpportunities(result.data.slice(0, 4));
                    }
                }
            } catch (error) {
                console.error("Failed to fetch opportunities for landing page", error);
            } finally {
                setLoading(false);
            }
        };

        fetchOpportunities();
    }, []);

    return (
        <section className="pt-12 pb-4 px-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-black text-orange-500 mb-4 tracking-tight">
                    Verified Community Impact
                </h2>
                <p className="text-xl text-slate-800 font-bold max-w-2xl mx-auto">
                    Projects that turned learning into <span className="text-emerald-600">measurable community impact.</span>
                </p>
            </div>

            {/* Project Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {loading ? (
                    // Skeleton Loading
                    [1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white rounded-[2rem] overflow-hidden shadow-lg border border-slate-100 flex flex-col h-[400px] animate-pulse">
                            <div className="bg-slate-200 h-10 w-full" />
                            <div className="p-8 flex flex-col items-center gap-6">
                                <div className="w-12 h-12 rounded-xl bg-slate-100" />
                                <div className="h-6 bg-slate-100 w-3/4 rounded" />
                                <div className="space-y-2 w-full">
                                    <div className="h-4 bg-slate-50 w-full rounded" />
                                    <div className="h-4 bg-slate-50 w-5/6 rounded" />
                                </div>
                                <div className="mt-auto w-32 h-10 bg-slate-100 rounded-full" />
                            </div>
                        </div>
                    ))
                ) : opportunities.length > 0 ? (
                    opportunities.map((opp) => {
                        const sdgStyles = getSdgStyles(opp.sdg_info.sdg_id.match(/\d+/)?.[0] || 1);
                        const Icon = sdgStyles.iconType;

                        return (
                            <div
                                key={opp.id}
                                className="bg-white rounded-[2rem] overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-slate-100 flex flex-col group"
                            >
                                {/* Header Bar */}
                                <div className={clsx(sdgStyles.header, "py-3 px-6 text-center transition-colors")}>
                                    <span className="font-bold text-slate-900 text-sm">
                                        {opp.participant_count ? `Active (${opp.participant_count})` : "Verified Project"}
                                    </span>
                                </div>

                                {/* Body */}
                                <div className="p-8 flex-1 flex flex-col items-center text-center">
                                    {/* Icon + Category */}
                                    <div className="flex flex-col items-center gap-3 mb-4">
                                        <div className={clsx("p-3 rounded-2xl transition-transform group-hover:scale-110", sdgStyles.bg)}>
                                            <Icon className={clsx("w-8 h-8", sdgStyles.icon)} />
                                        </div>
                                        <span className={clsx("text-[11px] font-bold uppercase tracking-widest", sdgStyles.icon)}>
                                            {opp.types[0] || "Community Service"}
                                        </span>
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-xl font-extrabold text-slate-900 mb-3 line-clamp-2">
                                        {opp.title}
                                    </h3>

                                    {/* Description */}
                                    <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8 line-clamp-3">
                                        {opp.description}
                                    </p>

                                    {/* Button */}
                                    <button
                                        onClick={() => router.push(`/opportunities/${opp.id}`)}
                                        className="mt-auto bg-orange-400 hover:bg-orange-500 text-white font-bold py-2.5 px-8 rounded-full text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                                    >
                                        View Project <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                        <div className="mx-auto w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
                            <Search className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">No active projects to display</h3>
                        <p className="text-slate-500 font-medium">Be the first to create one!</p>
                    </div>
                )}
            </div>
        </section>
    );
}
