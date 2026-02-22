import { Building, Globe, Users, BookOpen } from "lucide-react";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select } from "./ui/select";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import { AlertCircle } from "lucide-react";
import clsx from "clsx";

interface Section2Props {
    projectData?: any;
}

export default function Section2ProjectContext({ projectData }: Section2Props) {
    const { data, updateSection, getFieldError, validationErrors } = useReportForm();

    const sectionErrors = validationErrors['section2'] || [];
    const hasErrors = sectionErrors.length > 0;

    // Safety check for section2 property (since we just renamed it in schema)
    const sectionData = data.section2 || { problem_statement: '', discipline: '', baseline_evidence: '' };

    const handleProblemStatementChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        const words = text.trim().split(/\s+/).filter(w => w.length > 0);
        if (words.length <= 160) {
            updateSection('section2', { problem_statement: text });
        }
    };

    const wordCount = sectionData.problem_statement?.trim().split(/\s+/).filter(w => w.length > 0).length || 0;

    const disciplines = [
        "Business & Economics",
        "Computing & Technology",
        "Engineering & Built Environment",
        "Health Sciences",
        "Natural & Environmental Sciences",
        "Social Sciences & Development",
        "Arts & Humanities",
        "Media & Creative Industries",
        "Education",
        "Law",
        "Agriculture & Food Sciences",
        "Hospitality & Services",
        "Interdisciplinary Studies"
    ];

    const evidenceTypes = [
        "Observation",
        "Survey Data",
        "Partner-Provided Data",
        "Government Data",
        "Academic Research",
        "Community Interviews",
        "Previous Project Data",
        "Other"
    ];

    return (
        <div className="space-y-8">
            {/* Project Identity (Auto-Filled) */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <span className="text-sm font-bold">🔹 SECTION 2</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Project Context & Baseline</h2>
                <p className="text-slate-600 text-sm">Define the problem and academic alignment.</p>

                {/* Error Summary */}
                {hasErrors && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 mt-4">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                        <div>
                            <h4 className="font-semibold text-red-900 text-sm">Please fix the following errors:</h4>
                            <ul className="mt-2 space-y-1">
                                {sectionErrors.slice(0, 5).map((error, idx) => (
                                    <li key={idx} className="text-xs text-red-700">• {error.message}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-2 mt-6">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">2.1</div>
                    <h3 className="text-lg font-bold text-slate-900">Project Identity (Read-Only)</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <div className="flex items-center gap-2 text-slate-500 mb-1">
                            <Globe className="w-4 h-4" />
                            <span className="text-xs font-semibold">Project Title</span>
                        </div>
                        <p className="font-semibold text-slate-900">{projectData?.title || "Untitled Project"}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <div className="flex items-center gap-2 text-slate-500 mb-1">
                            <Building className="w-4 h-4" />
                            <span className="text-xs font-semibold">Partner Organization</span>
                        </div>
                        <p className="font-semibold text-slate-900">{projectData?.organization || "Self-Initiated"}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <div className="flex items-center gap-2 text-slate-500 mb-1">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs font-semibold">Duration</span>
                        </div>
                        <p className="font-semibold text-slate-900">{projectData?.startDate || "Not set"} - {projectData?.endDate || "Not set"}</p>
                    </div>
                </div>
            </div>

            {/* 2.2 Problem / System Need */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">2.2</div>
                    <h3 className="text-lg font-bold text-slate-900">Problem / System Need (Mandatory)</h3>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
                    <Label className="text-sm font-semibold text-slate-700">Describe the situation BEFORE the intervention (100-150 words)</Label>
                    <p className="text-xs text-slate-500">
                        What specific issue existed? Who was affected? Why was intervention necessary?
                        <strong> Do NOT describe your activities here.</strong>
                    </p>
                    <Textarea
                        placeholder="e.g. In the local community school, 40% of students lacked basic hygiene awareness..."
                        className={clsx(
                            "min-h-[160px] rounded-xl border-slate-200 p-4 text-slate-700",
                            getFieldError('problem_statement') && "border-red-400 bg-red-50"
                        )}
                        value={sectionData.problem_statement}
                        onChange={handleProblemStatementChange}
                    />
                    <FieldError message={getFieldError('problem_statement')} />
                    <div className="flex justify-between items-center text-xs text-slate-500">
                        <span>Target: 100-150 words</span>
                        <span className={clsx(wordCount >= 100 && wordCount <= 150 ? "text-green-600" : "text-slate-500")}>
                            {wordCount} / 150 words
                        </span>
                    </div>
                </div>
            </div>

            {/* 2.3 Discipline Contribution */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">2.3</div>
                    <h3 className="text-lg font-bold text-slate-900">Discipline Contribution</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">Academic Discipline</Label>
                        <Select
                            value={sectionData.discipline}
                            onChange={(e) => updateSection('section2', { discipline: e.target.value })}
                            className={clsx("w-full h-11 border-slate-200 rounded-lg", getFieldError('discipline') && "border-red-400 bg-red-50")}
                        >
                            <option value="">Select Discipline</option>
                            {disciplines.map(d => <option key={d} value={d}>{d}</option>)}
                        </Select>
                        <FieldError message={getFieldError('discipline')} />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">Baseline Evidence Type</Label>
                        <Select
                            value={sectionData.baseline_evidence}
                            onChange={(e) => updateSection('section2', { baseline_evidence: e.target.value })}
                            className={clsx("w-full h-11 border-slate-200 rounded-lg", getFieldError('baseline_evidence') && "border-red-400 bg-red-50")}
                        >
                            <option value="">Select Evidence Source</option>
                            {evidenceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </Select>
                        <FieldError message={getFieldError('baseline_evidence')} />
                    </div>
                </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mt-2">
                <p className="text-xs text-slate-500">
                    <strong>Auto-Generated Summary:</strong> The system will generate a baseline profile summary based on these inputs.
                </p>
            </div>
        </div>
    )
}

function Clock({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    )
}
