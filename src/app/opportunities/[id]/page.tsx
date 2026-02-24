"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, MapPin, Calendar, Globe, ArrowLeft, Building2, Share2, CheckCircle2, User, Trophy, Clock, Target, ShieldCheck, Heart } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function PublicOpportunityPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [opportunity, setOpportunity] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchPublicOpportunity();
        }
    }, [id]);

    const fetchPublicOpportunity = async () => {
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? "http://localhost:3000";
            // Handle case where backendUrl might already include /api/v1
            const baseUrl = backendUrl.endsWith("/api/v1") ? backendUrl.replace("/api/v1", "") : backendUrl;
            const res = await fetch(`${baseUrl}/api/v1/public/opportunities/${id}`);

            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    setOpportunity(data.data);
                } else {
                    toast.error(data.message || "Failed to load project details");
                }
            } else {
                toast.error("Project not found or temporarily unavailable");
            }
        } catch (error) {
            console.error("Error fetching project", error);
            toast.error("An error occurred while loading the project");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col">
                <Navbar />
                <div className="flex-1 flex justify-center items-center">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Excellence...</p>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    if (!opportunity) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col">
                <Navbar />
                <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                    <div className="w-20 h-20 bg-white rounded-3xl shadow-lg border border-slate-100 flex items-center justify-center">
                        <ArrowLeft className="w-8 h-8 text-slate-300" />
                    </div>
                    <div className="text-center">
                        <h2 className="text-2xl font-black text-slate-900">Project Not Found</h2>
                        <p className="text-slate-500 font-medium">This project might have been completed or moved.</p>
                    </div>
                    <Link href="/" className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold hover:shadow-xl transition-all shadow-lg">
                        Return to Homepage
                    </Link>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <Navbar />

            <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Back Button */}
                <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold transition-colors group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to browse
                </Link>

                {/* Hero Section */}
                <div className="relative bg-white rounded-[2.5rem] p-8 md:p-12 border border-slate-200 overflow-hidden shadow-[0_20px_50px_-15px_rgba(0,0,0,0.03)]">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-50"></div>

                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-8">
                        <div className="max-w-3xl space-y-6">
                            <div className="flex flex-wrap gap-3">
                                <span className="px-4 py-1.5 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200">
                                    Verified Impact
                                </span>
                                {opportunity.mode && (
                                    <span className="px-4 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-black uppercase tracking-widest">
                                        {opportunity.mode}
                                    </span>
                                )}
                            </div>

                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-tight tracking-tight">
                                {opportunity.title}
                            </h1>

                            <div className="flex flex-wrap items-center gap-6 text-slate-500 font-bold">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-slate-50 rounded-lg"><MapPin className="w-4 h-4 text-blue-500" /></div>
                                    <span className="text-sm">{opportunity.location?.city || "Remote"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-slate-50 rounded-lg"><Calendar className="w-4 h-4 text-emerald-500" /></div>
                                    <span className="text-sm">Starts {opportunity.timeline?.start_date ? new Date(opportunity.timeline.start_date).toLocaleDateString() : "Flexible"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-slate-50 rounded-lg"><User className="w-4 h-4 text-purple-500" /></div>
                                    <span className="text-sm">{opportunity.organization?.name || "Global Partner"}</span>
                                </div>
                            </div>
                        </div>

                        <div className="shrink-0 w-full md:w-auto">
                            <Link href="/login" className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white px-10 py-5 rounded-[2rem] font-black text-lg shadow-2xl shadow-orange-200 hover:-translate-y-1 active:scale-95 transition-all">
                                Log in to Apply
                            </Link>
                            <p className="text-center mt-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                Join CIEL to Participate
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left: Detailed Sections */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Objectives */}
                        <section className="bg-white rounded-[2rem] p-10 border border-slate-100 shadow-sm relative group overflow-hidden">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600 transition-all group-hover:w-2"></div>
                            <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                                <Target className="w-6 h-6 text-blue-600" /> Project Objectives
                            </h2>
                            <div className="text-slate-600 leading-relaxed space-y-4 font-medium italic">
                                "{opportunity.objectives?.description || opportunity.description}"
                            </div>
                        </section>

                        {/* Student Activities */}
                        <section className="bg-white rounded-[2rem] p-10 border border-slate-100 shadow-sm relative group overflow-hidden">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 transition-all group-hover:w-2"></div>
                            <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                                <Trophy className="w-6 h-6 text-emerald-500" /> Student Responsibilities
                            </h2>
                            <div className="text-slate-600 leading-relaxed font-medium whitespace-pre-line">
                                {opportunity.activity_details?.student_responsibilities || "Contributing to meaningful community goals through direct action and reporting."}
                            </div>
                        </section>

                        {/* Skills to be Gained */}
                        {opportunity.activity_details?.skills_gained && (
                            <section className="bg-white rounded-[2rem] p-10 border border-slate-100 shadow-sm">
                                <h2 className="text-2xl font-black text-slate-900 mb-8 tracking-tight">Competencies You'll Gain</h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                    {opportunity.activity_details.skills_gained.map((skill: string) => (
                                        <div key={skill} className="flex items-center gap-4 group">
                                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                <CheckCircle2 className="w-5 h-5" />
                                            </div>
                                            <span className="font-bold text-slate-700 tracking-tight">{skill}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Right: Sidebar Info */}
                    <div className="lg:col-span-4 space-y-8">
                        {/* Stats Card */}
                        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-8 shadow-2xl shadow-blue-900/10 border-b-8 border-blue-600">
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expected Commitment</span>
                                        <span className="text-3xl font-black">{opportunity.timeline?.expected_hours || 0} Hours</span>
                                    </div>
                                    <div className="p-3 bg-white/10 rounded-2xl"><Clock className="w-6 h-6 text-blue-400" /></div>
                                </div>
                                <div className="h-px bg-white/10"></div>
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Impact Goal</span>
                                        <span className="text-3xl font-black">SDG {opportunity.sdg || "?"}</span>
                                    </div>
                                    <div className="p-3 bg-white/10 rounded-2xl"><Globe className="w-6 h-6 text-emerald-400" /></div>
                                </div>
                                <div className="h-px bg-white/10"></div>
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Beneficiaries</span>
                                        <span className="text-3xl font-black">{opportunity.objectives?.beneficiaries_count || "Global"}</span>
                                    </div>
                                    <div className="p-3 bg-white/10 rounded-2xl"><Heart className="w-6 h-6 text-rose-400" /></div>
                                </div>
                            </div>
                        </div>

                        {/* Safety & Supervision */}
                        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm space-y-6">
                            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-emerald-600" /> Supervision & Safety
                            </h3>
                            <div className="space-y-4">
                                <div className="pb-4 border-b border-slate-50">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Supervisor</p>
                                    <p className="font-bold text-slate-800">{opportunity.supervision?.supervisor_name || "Assigned Coordinator"}</p>
                                    <p className="text-xs text-slate-500 font-medium">{opportunity.supervision?.role || "Project Lead"}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${opportunity.supervision?.safe_environment ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                    <span className="text-xs font-bold text-slate-600">Safe working environment confirmed</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${opportunity.supervision?.supervised ? 'bg-emerald-500' : 'bg-emerald-500'}`}></div>
                                    <span className="text-xs font-bold text-slate-600">Professional guidance provided</span>
                                </div>
                            </div>
                        </div>

                        {/* Share */}
                        <button className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all active:scale-95">
                            <Share2 className="w-5 h-5" /> Share this Project
                        </button>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
