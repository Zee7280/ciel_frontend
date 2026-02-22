import { Leaf, Recycle, TrendingUp, Info } from "lucide-react";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Checkbox } from "./ui/checkbox";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import { AlertCircle } from "lucide-react";
import clsx from "clsx";

export default function Section10Sustainability() {
    const { data, updateSection, getFieldError, validationErrors } = useReportForm();
    const {
        continuation_status,
        continuation_details,
        mechanisms,
        scaling_potential,
        policy_influence
    } = data.section10;

    const sectionErrors = validationErrors['section10'] || [];
    const hasErrors = sectionErrors.length > 0;

    const handleUpdate = (field: string, value: any) => {
        updateSection('section10', { [field]: value });
    };

    const toggleMechanism = (item: string) => {
        const current = mechanisms || [];
        if (current.includes(item)) {
            handleUpdate('mechanisms', current.filter(i => i !== item));
        } else {
            handleUpdate('mechanisms', [...current, item]);
        }
    };

    const mechanismOptions = [
        "Community Ownership", "Partner Adoption", "Commercialization",
        "Policy Integration", "Institutionalization", "Volunteer Network"
    ];

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <span className="text-sm font-bold">🔹 SECTION 10</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Sustainability & Future</h2>
                <p className="text-slate-600 text-sm">Will the impact last? Define the project's future trajectory.</p>

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

            {/* 10.1 Status */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">10.1</div>
                    <h3 className="text-lg font-bold text-slate-900">Continuation Status</h3>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-6">
                    <RadioGroup
                        value={continuation_status}
                        onValueChange={(val) => handleUpdate('continuation_status', val)}
                        className="grid grid-cols-1 md:grid-cols-3 gap-4"
                    >
                        {[
                            { id: 'yes', label: 'Ongoing / Sustainable', desc: 'Project will continue independently' },
                            { id: 'partially', label: 'Partially Sustainable', desc: 'Requires further support' },
                            { id: 'no', label: 'One-off Initiative', desc: 'Completed as single event' }
                        ].map((opt) => (
                            <div key={opt.id}>
                                <RadioGroupItem value={opt.id} id={opt.id} className="sr-only" />
                                <Label
                                    htmlFor={opt.id}
                                    className={clsx(
                                        "flex flex-col p-4 rounded-xl border cursor-pointer transition-all h-full",
                                        continuation_status === opt.id
                                            ? "bg-green-50 border-green-500 text-green-800 ring-1 ring-green-500"
                                            : "bg-white border-slate-200 text-slate-600 hover:border-green-200 hover:bg-green-50/30"
                                    )}
                                >
                                    <span className="font-bold mb-1">{opt.label}</span>
                                    <span className="text-xs opacity-80 font-normal">{opt.desc}</span>
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                    <FieldError message={getFieldError('continuation_status')} />

                    {continuation_status !== 'no' && (
                        <div className="space-y-4 animate-in fade-in">
                            <Label className="text-sm font-semibold text-slate-700">Sustainability Mechanisms</Label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {mechanismOptions.map(mech => (
                                    <div key={mech} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={mech}
                                            checked={(mechanisms || []).includes(mech)}
                                            onChange={() => toggleMechanism(mech)}
                                        />
                                        <Label htmlFor={mech} className="text-sm font-normal cursor-pointer">{mech}</Label>
                                    </div>
                                ))}
                            </div>
                            <FieldError message={getFieldError('mechanisms')} />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">Explainer</Label>
                        <Textarea
                            placeholder="Explain the future plan..."
                            className={clsx("min-h-[100px]", getFieldError('continuation_details') && "border-red-400 bg-red-50")}
                            value={continuation_details}
                            onChange={(e) => handleUpdate('continuation_details', e.target.value)}
                        />
                        <FieldError message={getFieldError('continuation_details')} />
                    </div>
                </div>
            </div>

            {/* 10.2 Scaling */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">10.2</div>
                    <h3 className="text-lg font-bold text-slate-900">Scalability</h3>
                </div>
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Potential for Growth</Label>
                    <Textarea
                        placeholder="Can this project be replicated in other communities? How?"
                        className="min-h-[100px] bg-white"
                        value={scaling_potential}
                        onChange={(e) => handleUpdate('scaling_potential', e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}
