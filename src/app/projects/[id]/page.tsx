"use client";

import Navbar from "@/components/Navbar";
import PartnersFooter from "@/components/PartnersFooter";
import FooterBanner from "@/components/FooterBanner";
import Footer from "@/components/Footer";
import { MapPin, Users, Calendar, Target, ArrowLeft, CheckCircle2, Loader2, Globe2, Sparkles, Building2, Tag } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

interface ProjectDetails {
    id: string | number;
    title: string;
    partner_name?: string;
    location?: string | { pin?: string; city?: string; venue?: string };
    status: string;
    participant_count?: number;
    description: string;
    types?: string[];
    sdg_info?: { sdg_id?: string; description?: string };
    submitted_at?: string;
}

export default function ProjectDetailsPage() {
    const params = useParams();
    const projectId = params.id as string;
    const [project, setProject] = useState<ProjectDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProjectDetails = async () => {
            try {
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
                const response = await fetch(`${backendUrl}/public/opportunities`);
                const data = await response.json();
                
                if (data.success && Array.isArray(data.data)) {
                    const found = data.data.find((p: any) => p.id.toString() === projectId);
                    if (found) {
                        setProject(found);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch project details:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProjectDetails();
    }, [projectId]);

    const getDisplayLocation = (loc: any) => {
        if (!loc) return "Remote / Pakistan";
        if (typeof loc === 'string') return loc;
        const parts = [];
        if (loc.city) parts.push(loc.city);
        if (loc.venue) parts.push(loc.venue);
        return parts.length > 0 ? parts.join(", ") : (loc.pin || "Pakistan");
    };

    if (isLoading) {
        return (
            <main className="min-h-screen bg-slate-50 font-sans text-center">
                <Navbar />
                <div className="flex flex-col items-center justify-center min-h-screen pt-20 text-slate-400 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-[#4285F4]" />
                    <p className="font-bold text-sm tracking-widest uppercase">Fetching Details...</p>
                </div>
            </main>
        );
    }

    if (!project) {
        return (
            <main className="min-h-screen bg-slate-50 font-sans">
                <Navbar />
                <div className="pt-48 pb-20 px-6 max-w-7xl mx-auto text-center">
                    <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Project Not Found</h1>
                    <Link href="/projects" className="inline-flex items-center gap-3 px-8 py-4 bg-[#4285F4] text-white font-black rounded-2xl hover:scale-105 transition-all shadow-xl shadow-blue-200">
                        ← Back to Projects
                    </Link>
                </div>
                <PartnersFooter />
                <Footer />
            </main>
        );
    }

    const category = (project.types && project.types.length > 0) ? project.types[0] : "Social Impact";
    const status = project.status || "Active";
    const displayLocation = getDisplayLocation(project.location);

    return (
        <main className="min-h-screen bg-slate-50 font-sans selection:bg-blue-100 pb-20">
            <Navbar />

            <div className="pt-40 px-6 max-w-5xl mx-auto mb-10 text-center md:text-left transition-all">
                <Link href="/projects" className="group inline-flex items-center gap-2 text-slate-500 hover:text-[#4285F4] font-black text-[10px] uppercase tracking-widest mb-10">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Projects list
                </Link>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-3 tracking-tight leading-tight">{project.title}</h1>
                        <p className="text-lg font-bold text-[#4285F4]">{project.partner_name || "Verified Organization"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                         <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                status.toLowerCase() === 'active' ? 'bg-green-50 text-green-700 border border-green-100' :
                                status.toLowerCase() === 'recruiting' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                'bg-slate-50 text-slate-600 border border-slate-100'
                            }`}>
                                {status}
                        </span>
                    </div>
                </div>
            </div>

            {/* Consolidated Details Card */}
            <div className="px-6 max-w-5xl mx-auto">
                <div className="bg-white rounded-[2.5rem] p-10 md:p-14 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 animate-fade-in-up">
                    
                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-12 mb-12 border-b border-slate-50">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-slate-400">
                                <MapPin className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Location</span>
                            </div>
                            <span className="text-sm font-bold text-slate-900">{displayLocation}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-slate-400">
                                <Users className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Volunteers</span>
                            </div>
                            <span className="text-sm font-bold text-slate-900">{project.participant_count || 0} Registered</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-slate-400">
                                <Calendar className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Posted on</span>
                            </div>
                            <span className="text-sm font-bold text-slate-900">{project.submitted_at ? new Date(project.submitted_at).toLocaleDateString() : "Just Now"}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-slate-400">
                                <Tag className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Category</span>
                            </div>
                            <span className="text-sm font-bold text-slate-900">{category}</span>
                        </div>
                    </div>

                    {/* Description Section */}
                    <div className="mb-14">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">About the Project</h3>
                        <p className="text-xl text-slate-600 font-medium leading-[1.8]">
                            {project.description}
                        </p>
                    </div>

                    {/* SDG Section (Simplified) */}
                    {project.sdg_info && (
                        <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 flex flex-col md:flex-row items-start md:items-center gap-6 mb-14">
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                                <Globe2 className="w-7 h-7 text-[#4285F4]" />
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-[#4285F4] uppercase tracking-widest mb-1">{project.sdg_info.sdg_id || "UN GLOBAL GOAL"}</h4>
                                <p className="text-sm font-bold text-slate-600 leading-relaxed max-w-2xl">{project.sdg_info.description || "Contributing to sustainable community development."}</p>
                            </div>
                        </div>
                    )}

                    {/* Apply Action */}
                    <Link 
                        href="/signup"
                        className="w-full flex items-center justify-center py-6 rounded-2xl bg-[#4285F4] text-white font-black text-base hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-blue-100 tracking-widest uppercase"
                    >
                        Apply to Project
                    </Link>
                    <p className="text-[10px] text-center text-slate-400 font-black mt-6 tracking-widest uppercase italic">You must be a verified student to join this initiative.</p>
                </div>
            </div>

            <PartnersFooter />
            <FooterBanner />
            <Footer />
        </main>
    );
}

