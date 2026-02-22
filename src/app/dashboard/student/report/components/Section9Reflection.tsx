import { BookOpen, GraduationCap, BrainCircuit, Star } from "lucide-react";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select } from "./ui/select";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import { AlertCircle } from "lucide-react";
import clsx from "clsx";

export default function Section9Reflection() {
    const { data, updateSection, getFieldError, validationErrors } = useReportForm();
    const {
        academic_integration,
        personal_learning,
        academic_application,
        competency_scores,
        strongest_competency
    } = data.section9;

    const sectionErrors = validationErrors['section9'] || [];
    const hasErrors = sectionErrors.length > 0;

    const handleUpdate = (field: string, value: any) => {
        updateSection('section9', { [field]: value });
    };

    const handleScoreChange = (competency: string, score: number) => {
        handleUpdate('competency_scores', { ...competency_scores, [competency]: score });
    };

    const competencies = [
        { id: 'cognitive', label: 'Cognitive Competence', desc: 'Critical thinking, problem solving, analysis' },
        { id: 'practical', label: 'Practical Competence', desc: 'Technical skills, project management, execution' },
        { id: 'social', label: 'Social Competence', desc: 'Communication, teamwork, empathy' },
        { id: 'transformative', label: 'Transformative Competence', desc: 'Innovation, adaptability, vision' }
    ];

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <span className="text-sm font-bold">🔹 SECTION 9</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Academic Integration & Reflection</h2>
                <p className="text-slate-600 text-sm">Connect your project experience back to your academic journey.</p>

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
            </div>

            {/* 9.1 Academic Connection */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">9.1</div>
                    <h3 className="text-lg font-bold text-slate-900">Classroom to Community</h3>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-6">
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">How did you apply your classroom knowledge?</Label>
                        <p className="text-xs text-slate-500">Cite specific theories, courses, or concepts used.</p>
                        <Textarea
                            placeholder="e.g. Applied principles from Sociology 101 regarding group dynamics..."
                            className={clsx("min-h-[120px]", getFieldError('academic_application') && "border-red-400 bg-red-50")}
                            value={academic_application}
                            onChange={(e) => handleUpdate('academic_application', e.target.value)}
                        />
                        <FieldError message={getFieldError('academic_application')} />
                    </div>
                </div>
            </div>

            {/* 9.2 Competency Framework */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">9.2</div>
                    <h3 className="text-lg font-bold text-slate-900">Competency Development</h3>
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-6">
                    <Label className="text-sm font-semibold text-slate-700">Self-Assessment (Score 1-10)</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {competencies.map(comp => (
                            <div key={comp.id} className="bg-white p-4 rounded-xl border border-slate-200">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-bold text-sm text-slate-900">{comp.label}</h4>
                                        <p className="text-xs text-slate-500">{comp.desc}</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center font-bold text-blue-700">
                                        {competency_scores[comp.id as keyof typeof competency_scores] || 0}
                                    </div>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="10"
                                    value={competency_scores[comp.id as keyof typeof competency_scores] || 0}
                                    onChange={(e) => handleScoreChange(comp.id, parseInt(e.target.value))}
                                    className="w-full"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">Which competency did you develop the most?</Label>
                        <Select
                            value={strongest_competency}
                            onChange={(e) => handleUpdate('strongest_competency', e.target.value)}
                            className={clsx(getFieldError('strongest_competency') && "border-red-400 bg-red-50")}
                        >
                            <option value="">Select Strongest Area</option>
                            {competencies.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
                        </Select>
                        <FieldError message={getFieldError('strongest_competency')} />
                    </div>
                </div>
            </div>

            {/* 9.3 Personal Growth */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">9.3</div>
                    <h3 className="text-lg font-bold text-slate-900">Personal Growth</h3>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Reflective Statement</Label>
                    <Textarea
                        placeholder="How has this experience changed you personally?..."
                        className={clsx("min-h-[120px]", getFieldError('personal_learning') && "border-red-400 bg-red-50")}
                        value={personal_learning}
                        onChange={(e) => handleUpdate('personal_learning', e.target.value)}
                    />
                    <FieldError message={getFieldError('personal_learning')} />
                </div>
            </div>
        </div>
    )
}
