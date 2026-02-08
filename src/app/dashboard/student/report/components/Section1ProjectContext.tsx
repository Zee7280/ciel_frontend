import { Globe, Building, Users } from "lucide-react";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { useReportForm } from "../context/ReportContext";
import clsx from "clsx";

interface Section1Props {
    projectData?: any;
}

export default function Section1ProjectContext({ projectData }: Section1Props) {
    const { data, updateSection } = useReportForm();

    const handleProblemStatementChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        const words = text.trim().split(/\s+/).filter(w => w.length > 0);
        if (words.length <= 160) {
            updateSection('section1', { problem_statement: text });
        }
    };

    const wordCount = data.section1.problem_statement.trim().split(/\s+/).filter(w => w.length > 0).length;

    return (
        <div className="space-y-8">
            {/* Project Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                            <Globe className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-semibold text-slate-500">Project Title</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{projectData?.title || projectData?.name || "Untitled Project"}</p>
                </div>

                <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                            <Building className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-semibold text-slate-500">Partner Organization</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{projectData?.organization || projectData?.organization_name || "Self-Initiated"}</p>
                </div>

                <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                            <Users className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-semibold text-slate-500">Volunteers Needed</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{projectData?.volunteersNeeded || projectData?.volunteers_needed || "Not specified"}</p>
                </div>
            </div>

            {/* Problem Statement */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg">1</div>
                    <h3 className="text-xl font-bold text-slate-900">Problem / Need Statement</h3>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="problem_statement" className="text-sm font-semibold text-slate-700">What community gap did this project address?</Label>
                        <Textarea
                            id="problem_statement"
                            placeholder="Describe the situation before your intervention. Focus on who was affected and what was missing..."
                            className="min-h-[160px] rounded-xl border-slate-200 p-4 text-slate-700"
                            value={data.section1.problem_statement}
                            onChange={handleProblemStatementChange}
                        />
                        <div className="flex justify-between items-center text-xs text-slate-500">
                            <span>Target: 100-150 words</span>
                            <span className={clsx(wordCount >= 100 && wordCount <= 150 ? "text-green-600" : "text-slate-500")}>
                                {wordCount} / 150 words
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
