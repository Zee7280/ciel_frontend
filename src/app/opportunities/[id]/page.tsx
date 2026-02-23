"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, MapPin, Calendar, Globe, ArrowLeft, Users, Clock, Target, CheckCircle2, ShieldCheck, Heart, Share2 } from "lucide-react";
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
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                </div>
                <Footer />
            </div>
        );
    }

    if (!opportunity) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col">
                <Navbar />
                <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                    <h2 className="text-2xl font-bold text-slate-900">Project Not Found</h2>
                    <Link href="/" className="text-blue-600 hover:underline font-semibold flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> Back to Home
                    </Link>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <Navbar />

            <main className="flex-1 pt-32 pb-20 px-6 max-w-7xl mx-auto w-full">
                {/* Header Section */}
                <div className="mb-10 animate-fade-in-up">
                    <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-blue-600 font-semibold mb-6 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to browse
                    </Link>

                    <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">
                        <div className="flex-1 space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider">
                                    Verified Impact
                                </span>
                                <span className="text-sm font-bold text-slate-400 uppercase">{opportunity.mode || "On Site"}</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
                                {opportunity.title}
                            </h1>
                            <p className="text-xl font-semibold text-blue-600">{opportunity.organization?.name || "Global Partner"}</p>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 min-w-[300px] w-full lg:w-auto">
                            <h3 className="font-bold text-slate-900 mb-4">Quick Stats</h3>
                            <div className="space-y-4 mb-6">
                                <div className="flex items-center gap-3 text-slate-600">
                                    <MapPin className="w-5 h-5 text-slate-400" />
                                    <span className="text-sm font-medium">{opportunity.location?.city || "Remote"}</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600">
                                    <Users className="w-5 h-5 text-slate-400" />
                                    <span className="text-sm font-medium">{opportunity.timeline?.volunteers_required || 0} Volunteers Needed</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600">
                                    <Clock className="w-5 h-5 text-slate-400" />
                                    <span className="text-sm font-medium">{opportunity.timeline?.expected_hours || 0} Hours Commitment</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600">
                                    <Calendar className="w-5 h-5 text-slate-400" />
                                    <span className="text-sm font-medium">Starts: {opportunity.timeline?.start_date ? new Date(opportunity.timeline.start_date).toLocaleDateString() : "Flexible"}</span>
                                </div>
                            </div>
                            <Link href="/login" className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all">
                                Log in to Apply
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Objectives */}
                        <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                                <Target className="w-6 h-6 text-blue-600" /> Project Objectives
                            </h2>
                            <p className="text-slate-600 leading-relaxed font-medium">
                                {opportunity.objectives?.description || opportunity.description}
                            </p>
                        </section>

                        {/* Student Activities */}
                        <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                                <Users className="w-6 h-6 text-emerald-600" /> Student Responsibilities
                            </h2>
                            <div className="text-slate-600 leading-relaxed font-medium whitespace-pre-line">
                                {opportunity.activity_details?.student_responsibilities || "Contributing to meaningful community goals through direct action and reporting."}
                            </div>
                        </section>

                        {/* Skills */}
                        {opportunity.activity_details?.skills_gained && (
                            <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                                <h2 className="text-2xl font-bold text-slate-900 mb-6">Skills to be Gained</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {opportunity.activity_details.skills_gained.map((skill: string) => (
                                        <div key={skill} className="flex items-center gap-3">
                                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                                            <span className="font-bold text-slate-700">{skill}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* SDGs */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                            <h3 className="font-bold text-slate-900 mb-4">SDG Alignment</h3>
                            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl">
                                <span className="text-3xl font-black text-blue-600">{opportunity.sdg || "?"}</span>
                                <div className="flex flex-col">
                                    <span className="text-xs font-black text-blue-400 uppercase tracking-widest">Global Goal</span>
                                    <span className="text-sm font-bold text-slate-700">Sustainable Development</span>
                                </div>
                            </div>
                        </div>

                        {/* Safety */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-emerald-600" /> Supervision & Safety
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Supervisor</p>
                                    <p className="font-bold text-slate-800 text-sm">{opportunity.supervision?.supervisor_name || "Assigned Coordinator"}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    <span className="text-xs font-bold text-slate-600">Safe working environment</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    <span className="text-xs font-bold text-slate-600">Professional guidance</span>
                                </div>
                            </div>
                        </div>

                        {/* CTA Sidebar */}
                        <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
                            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                                <Heart className="w-5 h-5 text-rose-500 fill-rose-500" /> Make an Impact
                            </h3>
                            <p className="text-slate-400 text-sm mb-6 font-medium">Join this project and contribute to real-world community development.</p>
                            <Link href="/login" className="block w-full text-center py-3 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-50 transition-all">
                                Get Started
                            </Link>
                        </div>

                        <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-all">
                            <Share2 className="w-4 h-4" /> Share Project
                        </button>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
