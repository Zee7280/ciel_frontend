"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertCircle, FileText, ChevronRight, Shield, Clock, TrendingUp } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import Link from "next/link";
import EngagementOverview from "./components/EngagementOverview";

export default function EngagementDashboard() {
    const [metrics, setMetrics] = useState<any>(null);
    const [summary, setSummary] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // For now, using a placeholder participant ID or 
    // we need to fetch the participant record first
    useEffect(() => {
        const loadData = async () => {
            try {
                // 1. Get current participant record
                // This is a simplified flow. In a real app, 
                // we'd first list the student's projects and pick the active one.
                // For this implementation, let's assume we're fetching the latest.
                const res = await authenticatedFetch(`/api/v1/engagement/my`);
                if (res && res.ok) {
                    const result = await res.json();
                    if (result.success && result.data.length > 0) {
                        const participantId = result.data[0].id;

                        // 2. Fetch metrics
                        const mRes = await authenticatedFetch(`/api/v1/engagement/${participantId}/metrics`);
                        if (mRes && mRes.ok) {
                            const mData = await mRes.json();
                            setMetrics(mData.data);
                        }

                        // 3. Fetch summary
                        const sRes = await authenticatedFetch(`/api/v1/engagement/${participantId}/summary`);
                        if (sRes && sRes.ok) {
                            const sData = await sRes.json();
                            setSummary(sData.data);
                        }
                    } else {
                        setError("No engagement record found. Please register for a project first.");
                    }
                }
            } catch (err) {
                console.error(err);
                setError("Failed to load engagement data.");
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-3xl border border-slate-100">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
                <p className="text-slate-500 font-medium tracking-tight">Calculating identity metrics...</p>
            </div>
        );
    }

    if (error) {
        return <OnboardingView />;
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded border border-blue-100">Section 1</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Participation Record</h1>
                    <p className="text-slate-500 font-medium">Identity authentication & engagement intensity tracking</p>
                </div>
            </header>

            {metrics && <EngagementOverview metrics={metrics} />}

            {/* Auto-Summary Section */}
            <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-8 space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Institutional Summary</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">System-Generated Output</p>
                    </div>
                </div>

                <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 italic text-slate-700 leading-relaxed font-medium">
                    "{summary || "No active engagement logs found to generate a narrative. Start logging your attendance to see your impact narrative here."}"
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                    <Shield className="w-3.5 h-3.5" />
                    <span>This summary is immutable and generated using verified attendance logic.</span>
                </div>
            </section>
        </div>
    );
}

function OnboardingView() {
    const [projects, setProjects] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const res = await authenticatedFetch('/api/v1/student/projects');
                if (res && res.ok) {
                    const data = await res.json();
                    setProjects(data.data || []);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProjects();
    }, []);

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 space-y-12">
            <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-blue-100/50 mb-6">
                    <Shield className="w-10 h-10" />
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Verified Participation</h1>
                <p className="text-slate-500 text-lg font-medium max-w-xl mx-auto">
                    To generate a verified Section 1 for your report, you must first authenticate your identity and log your project hours.
                </p>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50 bg-slate-50/30">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">Step 1: Select Active Project</h2>
                    <p className="text-sm text-slate-500 font-medium">Which project are you currently working on?</p>
                </div>

                <div className="p-4">
                    {isLoading ? (
                        <div className="p-12 text-center">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                        </div>
                    ) : projects.length > 0 ? (
                        <div className="space-y-3">
                            {projects.map((p) => (
                                <div key={p.id} className="group p-6 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-xl border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:border-blue-100 transition-colors font-black">
                                            {p.title.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{p.title}</h3>
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{p.category}</p>
                                        </div>
                                    </div>
                                    <Link href={`/dashboard/student/engagement/verify?projectId=${p.id}`}>
                                        <button className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:scale-105 transition-all active:scale-95 shadow-lg shadow-slate-200">
                                            Verify Identity <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-12 text-center space-y-4">
                            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto" />
                            <p className="text-slate-500 font-medium">You don't have any active projects yet.</p>
                            <Link href="/dashboard/student/browse">
                                <button className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-200">
                                    Browse Opportunities
                                </button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { title: "Authenticate", desc: "One-time CNIC & Mobile verification for HEC compliance.", icon: Shield },
                    { title: "Log Logs", desc: "Easy, session-based attendance tracking with daily summaries.", icon: Clock },
                    { title: "Impact Score", desc: "Watch your EIS score grow and get auto-narratives for reports.", icon: TrendingUp },
                ].map((item, i) => (
                    <div key={i} className="p-6 bg-slate-50 rounded-3xl border border-slate-200/50">
                        <item.icon className="w-6 h-6 text-slate-400 mb-4" />
                        <h4 className="font-bold text-slate-900 mb-1">{item.title}</h4>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
