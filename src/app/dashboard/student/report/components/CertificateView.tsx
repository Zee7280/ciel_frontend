import React from 'react';
import { useReportForm } from "../context/ReportContext";
import { formatDisplayId } from "@/utils/displayIds";
import { Award, ShieldCheck, Calendar, Globe, User, Building } from "lucide-react";

export default function CertificateView() {
    const { data } = useReportForm();
    const { section1, section2, section3 } = data;

    const today = new Date().toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    return (
        <div className="bg-white min-h-[800px] w-full max-w-5xl mx-auto p-16 relative border-[12px] border-slate-900 shadow-2xl flex flex-col items-center text-center overflow-hidden print:shadow-none print:border-[16px] print:m-0 print:max-w-none">
            
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-slate-900/5 -ml-32 -mt-32 rounded-full" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-slate-900/5 -mr-48 -mb-48 rounded-full" />
            
            {/* Header Logos */}
            <div className="w-full flex justify-between items-start mb-16 pt-4">
                <img src="/logo-1.png" alt="CIEL Logo" className="h-16 w-auto" />
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck className="w-4 h-4 text-slate-900" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Verified impact</span>
                    </div>
                    <div className="text-[9px] font-bold text-slate-400">
                        ID: {data.project_id ? formatDisplayId(data.project_id, "OPP") : 'CIEL-REF-PENDING'}
                    </div>
                </div>
            </div>

            {/* Main Title Area */}
            <div className="space-y-4 mb-12">
                <div className="inline-flex items-center gap-3 px-6 py-2 bg-slate-900 text-white rounded-full mb-6">
                    <Award className="w-5 h-5" />
                    <span className="text-xs font-black uppercase tracking-[0.4em]">Honorary Recognition</span>
                </div>
                
                <h1 className="text-6xl font-black text-slate-900 uppercase tracking-tighter leading-tight">
                    Certificate of <br />
                    <span className="opacity-30">Institutional Impact</span>
                </h1>
            </div>

            {/* Recipient Area */}
            <div className="w-full max-w-3xl space-y-6 mb-16">
                <p className="text-lg font-medium text-slate-500 italic">This official recognition is proudly presented to</p>
                
                <div className="pb-4 border-b-2 border-slate-200">
                    <h2 className="report-h2">
                        {section1.team_lead.name || "Distinguished Participant"}
                    </h2>
                </div>
                
                <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-2xl mx-auto">
                    for the successful execution and high-fidelity delivery of the social impact project titled <br/>
                    <strong className="text-slate-900 uppercase tracking-tight">"{data.section2.problem_statement?.slice(0, 80) || "Community Improvement Initiative"}..."</strong>
                </p>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-3 gap-12 w-full max-w-4xl mb-20">
                <div className="space-y-2">
                    <div className="flex justify-center mb-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900">
                            <Clock className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Engagement span</p>
                    <p className="text-xl font-black text-slate-900">{section1.metrics?.total_verified_hours || '0'} Verified Hours</p>
                </div>

                <div className="space-y-2 border-x border-slate-100">
                    <div className="flex justify-center mb-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900">
                            <Globe className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Primary SDG Alignment</p>
                    <p className="text-xl font-black text-slate-900">Goal {section3.primary_sdg?.goal_number || 'X'}</p>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-center mb-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900">
                            <Award className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">CII Index Score</p>
                    <p className="text-xl font-black text-slate-900">{section1.metrics?.eis_score || '0'}/100 Rating</p>
                </div>
            </div>

            {/* Signatures */}
            <div className="w-full flex justify-between items-end mt-auto pt-10">
                <div className="text-left space-y-4">
                    <div className="w-48 h-[1px] bg-slate-900" />
                    <div>
                        <p className="font-black text-slate-900 text-sm uppercase">Registrar of Impact</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Community Impact Lab (CIEL)</p>
                    </div>
                </div>

                {/* Seal */}
                <div className="w-32 h-32 rounded-full border-4 border-slate-900 flex flex-col items-center justify-center rotate-12 bg-white shadow-xl shadow-slate-100 p-2">
                    <div className="w-full h-full rounded-full border border-dashed border-slate-900 flex flex-col items-center justify-center text-center">
                        <Award className="w-8 h-8 text-slate-900 mb-1" />
                        <span className="text-[7px] font-black text-slate-900 uppercase leading-none">OFFICIAL<br/>SEAL OF<br/>IMPACT</span>
                    </div>
                </div>

                <div className="text-right space-y-4">
                    <div className="w-48 h-[1px] bg-slate-900 ml-auto" />
                    <div>
                        <p className="font-black text-slate-900 text-sm uppercase">Dated</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{today}</p>
                    </div>
                </div>
            </div>

            {/* Bottom Tagline */}
            <div className="absolute bottom-6 w-full text-center">
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.5em]">This verification protocol adheres to Global HEC-Community Engagement standards</p>
            </div>
        </div>
    );
}

const Clock = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
