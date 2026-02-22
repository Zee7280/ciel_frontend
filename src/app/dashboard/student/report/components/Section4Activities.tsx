import { Calendar, Users, Clock, Briefcase, Activity, Target } from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import { AlertCircle } from "lucide-react";
import clsx from "clsx";

export default function Section4Activities() {
    const { data, updateSection, getFieldError, validationErrors } = useReportForm();
    const { section1, section4 } = data;
    const isTeam = section1.participation_type === 'team';

    const sectionErrors = validationErrors['section4'] || [];
    const hasErrors = sectionErrors.length > 0;

    const handleSection4Change = (field: string, value: any) => {
        updateSection('section4', { [field]: value });
    };

    const handleCategoryToggle = (category: string) => {
        const current = section4.beneficiary_categories || [];
        if (current.includes(category)) {
            handleSection4Change('beneficiary_categories', current.filter(c => c !== category));
        } else {
            handleSection4Change('beneficiary_categories', [...current, category]);
        }
    };

    const activityTypes = [
        "Training / Workshop", "Awareness Session", "Research / Survey", "Mentoring / Coaching",
        "Service Delivery", "Resource Distribution", "Infrastructure / System Development",
        "Advocacy / Campaign", "Policy / Analysis", "Field Engagement", "Other"
    ];

    const deliveryModes = ["In-person", "Online", "Hybrid", "Field-based"];

    const beneficiaryGroups = [
        "Children (Under 18)", "Youth (18–29)", "Women", "Persons with Disabilities",
        "Low-income Communities", "Rural Population", "Urban Population",
        "Refugees / Vulnerable Groups", "SMEs / Businesses", "Public Institutions", "General Community"
    ];

    const roles = [
        "Team Lead", "Co-Lead", "Trainer / Facilitator", "Research & Data Collection",
        "Logistics & Coordination", "Content Development", "Technical Support", "Field Support", "Other"
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <span className="text-sm font-bold">🔹 SECTION 4</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Structured Activities & Outputs</h2>
                <p className="text-slate-600 text-sm">Clear, numeric & analytics-ready reporting of what was done.</p>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 mt-4">
                    <p className="text-xs text-blue-800">
                        <strong>Mode detected:</strong> {isTeam ? "Team Participation" : "Individual Participation"}.
                        {isTeam ? " You must enter Team Totals first, then your Individual Contribution." : " Enter your total outputs below."}
                    </p>
                </div>

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

            {/* 4.1 Activity Overview (Team Level or Individual Total) */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">4.1</div>
                    <h3 className="text-lg font-bold text-slate-900">{isTeam ? "Team-Level Results" : "Activity Overview"}</h3>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">A. Activity Type</Label>
                            <Select
                                value={section4.activity_type}
                                onChange={(e) => handleSection4Change('activity_type', e.target.value)}
                                className={clsx("h-10 border-slate-200", getFieldError('activity_type') && "border-red-400 bg-red-50")}
                            >
                                <option value="">Select Type</option>
                                {activityTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </Select>
                            <FieldError message={getFieldError('activity_type')} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">B. Delivery Mode</Label>
                            <Select
                                value={section4.delivery_mode}
                                onChange={(e) => handleSection4Change('delivery_mode', e.target.value)}
                                className={clsx("h-10 border-slate-200", getFieldError('delivery_mode') && "border-red-400 bg-red-50")}
                            >
                                <option value="">Select Mode</option>
                                {deliveryModes.map(m => <option key={m} value={m}>{m}</option>)}
                            </Select>
                            <FieldError message={getFieldError('delivery_mode')} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">C. Total Sessions</Label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={section4.total_sessions}
                                onChange={(e) => handleSection4Change('total_sessions', e.target.value)}
                                className={clsx(getFieldError('total_sessions') && "border-red-400 bg-red-50")}
                            />
                            <FieldError message={getFieldError('total_sessions')} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">D. Total Duration</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    placeholder="0"
                                    className={clsx("w-20", getFieldError('duration_val') && "border-red-400 bg-red-50")}
                                    value={section4.duration_val}
                                    onChange={(e) => handleSection4Change('duration_val', e.target.value)}
                                />
                                <Select
                                    value={section4.duration_unit}
                                    onChange={(e) => handleSection4Change('duration_unit', e.target.value)}
                                    className="flex-1"
                                >
                                    <option value="Hours">Hours</option>
                                    <option value="Days">Days</option>
                                    <option value="Weeks">Weeks</option>
                                </Select>
                            </div>
                            <FieldError message={getFieldError('duration_val')} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">E. Total Beneficiaries</Label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={section4.total_beneficiaries}
                                onChange={(e) => handleSection4Change('total_beneficiaries', e.target.value)}
                                className={clsx(getFieldError('total_beneficiaries') && "border-red-400 bg-red-50")}
                            />
                            <FieldError message={getFieldError('total_beneficiaries')} />
                        </div>
                    </div>
                </div>
            </div>

            {/* 4.2 My Contribution (visible for ALL — individual & team) */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">4.2</div>
                    <h3 className="text-lg font-bold text-slate-900">My Contribution</h3>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">My Role *</Label>
                            <Select
                                value={section4.my_role}
                                onChange={(e) => handleSection4Change('my_role', e.target.value)}
                                className={clsx("h-10 border-slate-200", getFieldError('my_role') && "border-red-400 bg-red-50")}
                            >
                                <option value="">Select Role</option>
                                {roles.map(r => <option key={r} value={r}>{r}</option>)}
                            </Select>
                            <FieldError message={getFieldError('my_role')} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">My Hours *</Label>
                            <Input
                                type="number"
                                placeholder="Total hours I contributed"
                                value={section4.my_hours}
                                onChange={(e) => handleSection4Change('my_hours', e.target.value)}
                                className={clsx("h-10", getFieldError('my_hours') && "border-red-400 bg-red-50")}
                            />
                            <FieldError message={getFieldError('my_hours')} />
                        </div>
                    </div>
                </div>
            </div>

            {/* 4.3 Individual Contribution — extra fields for Team Mode only */}
            {isTeam && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">4.3</div>
                        <h3 className="text-lg font-bold text-slate-900">My Individual Contribution (Team Detail)</h3>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">Sessions Participated</Label>
                                <Input
                                    type="number"
                                    value={section4.my_sessions}
                                    onChange={(e) => handleSection4Change('my_sessions', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">Beneficiaries Engaged</Label>
                                <Input
                                    type="number"
                                    value={section4.my_beneficiaries}
                                    onChange={(e) => handleSection4Change('my_beneficiaries', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">My Output Contribution</Label>
                                <Input
                                    placeholder="e.g. 5 surveys"
                                    value={section4.my_output}
                                    onChange={(e) => handleSection4Change('my_output', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Beneficiary Categories */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">4.4</div>
                    <h3 className="text-lg font-bold text-slate-900">Beneficiary Categories</h3>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-slate-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {beneficiaryGroups.map((group) => (
                            <div key={group} className="flex items-center gap-3">
                                <Checkbox
                                    id={group}
                                    checked={section4.beneficiary_categories?.includes(group)}
                                    onChange={() => handleCategoryToggle(group)}
                                />
                                <Label htmlFor={group} className="text-sm text-slate-700 cursor-pointer font-medium">{group}</Label>
                            </div>
                        ))}
                    </div>
                    <FieldError message={getFieldError('beneficiary_categories')} />
                </div>
            </div>
        </div>
    )
}
