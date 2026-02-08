import { Globe, Building, Calendar, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { useReportForm } from "../context/ReportContext";
import clsx from "clsx";

interface Section1Props {
    projectData?: any;
}

export default function Section1ProjectContext({ projectData }: Section1Props) {
    const { data, updateSection } = useReportForm();
    const formatDate = (dateString?: string) => dateString ? new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : "N/A";

    const handleProblemStatementChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        const words = text.trim().split(/\s+/).filter(w => w.length > 0);
        if (words.length <= 160) {
            updateSection('section1', { problem_statement: text });
        }
    };

    const wordCount = data.section1.problem_statement.trim().split(/\s+/).filter(w => w.length > 0).length;

    return (
        <div className="space-y-12">
            {/* Project Overview Header */}
            <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Project Reference Information</span>
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Project Context</h2>
                <p className="text-slate-500 max-w-2xl font-medium">Verify the details of the project you are reporting for. These details are pulled automatically from the opportunity data.</p>
            </div>

            {/* Premium Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { icon: Globe, label: "Project Title", value: projectData?.title || "Loading...", color: "blue" },
                    { icon: Building, label: "Partner Org", value: projectData?.partner_name || "Self-Initiated", color: "purple" },
                    { icon: Calendar, label: "Duration", value: `${formatDate(projectData?.dates?.start)} - ${formatDate(projectData?.dates?.end)}`, color: "amber" }
                ].map((item, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col gap-3 group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-sm border border-slate-100 text-${item.color}-600 group-hover:scale-110 transition-transform`}>
                            <item.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                            <p className="text-sm font-bold text-slate-900 line-clamp-1">{item.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Problem Statement Section */}
            <div className="space-y-8">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-lg shadow-lg">1</div>
                        <h3 className="text-xl font-bold text-slate-900">Problem / Need Statement</h3>
                    </div>
                    <Badge className="bg-red-50 text-red-600 border-red-100 px-3 py-1 rounded-lg">MANDATORY</Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="problem_statement" className="text-sm font-bold text-slate-700">What community gap did this project address?</Label>
                            <Textarea
                                id="problem_statement"
                                placeholder="Describe the situation before your intervention. Focus on who was affected and what was missing..."
                                className="min-h-[200px] rounded-[1.5rem] border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all text-base p-6 shadow-sm"
                                value={data.section1.problem_statement}
                                onChange={handleProblemStatementChange}
                            />
                            <div className="flex justify-between items-center px-2 mt-2">
                                <div className="flex items-center gap-2">
                                    <div className={`h-1.5 rounded-full bg-slate-200 overflow-hidden w-32`}>
                                        <div
                                            className={clsx("h-full transition-all duration-500", wordCount > 100 ? "bg-green-500" : "bg-blue-500")}
                                            style={{ width: `${Math.min((wordCount / 150) * 100, 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{wordCount} / 150 Words</span>
                                </div>
                                <span className="text-xs text-slate-400 font-medium italic">Target: 100-150 words</span>
                            </div>
                        </div>
                    </div>

                    <aside className="space-y-6">
                        <div className="bg-blue-50/50 rounded-3xl p-6 border border-blue-100 space-y-4 shadow-sm">
                            <h4 className="flex items-center gap-2 text-sm font-black text-blue-900 uppercase tracking-tight">
                                <CheckCircle2 className="w-4 h-4" /> Writing Tips
                            </h4>
                            <ul className="space-y-3">
                                {[
                                    "Focus on the problem, not your solution.",
                                    "Describe life BEFORE the project.",
                                    "Be specific about who was affected."
                                ].map((tip, i) => (
                                    <li key={i} className="flex gap-2 text-xs font-medium text-blue-700/80 leading-relaxed">
                                        <div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="bg-red-50/50 rounded-3xl p-6 border border-red-100 space-y-4 shadow-sm">
                            <h4 className="flex items-center gap-2 text-sm font-black text-red-900 uppercase tracking-tight">
                                <XCircle className="w-4 h-4" /> Avoid
                            </h4>
                            <ul className="space-y-3 text-xs font-medium text-red-700/80 leading-relaxed list-none">
                                <li className="flex gap-2">
                                    <div className="w-1 h-1 rounded-full bg-red-400 mt-1.5 shrink-0" />
                                    "We solved the issue..."
                                </li>
                                <li className="flex gap-2">
                                    <div className="w-1 h-1 rounded-full bg-red-400 mt-1.5 shrink-0" />
                                    "This project achieved SDG X..."
                                </li>
                            </ul>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    )
}
