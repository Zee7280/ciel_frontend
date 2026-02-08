import { Users, UserPlus, Trash2, Mail, Phone, Fingerprint, GraduationCap, MapPin, CheckCircle2, AlertCircle, Calendar } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Select } from "./ui/select";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { useReportForm } from "../context/ReportContext";
import clsx from "clsx";

// Error message component
function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return (
        <div className="flex items-center gap-1.5 text-red-600 text-xs font-medium mt-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{message}</span>
        </div>
    );
}

export default function Section2StudentTeam() {
    const { data, updateSection, getFieldError, validationErrors } = useReportForm();
    const { participation_type, team_lead, team_members, privacy_consent } = data.section2;

    // Get section-level errors
    const sectionErrors = validationErrors['section2'] || [];
    const hasErrors = sectionErrors.length > 0;

    const handleTeamLeadChange = (field: string, value: string) => {
        updateSection('section2', {
            team_lead: { ...team_lead, [field]: value }
        });
    };

    const handleTypeChange = (type: string) => {
        updateSection('section2', { participation_type: type as 'individual' | 'team' });
    };

    const addTeamMember = () => {
        updateSection('section2', {
            team_members: [...team_members, { name: "", cnic: "", mobile: "", university: "", program: "", role: "", hours: "" }]
        });
    };

    const updateTeamMember = (index: number, field: string, value: string) => {
        const newMembers = [...team_members];
        newMembers[index] = { ...newMembers[index], [field]: value };
        updateSection('section2', { team_members: newMembers });
    };

    const removeTeamMember = (index: number) => {
        const newMembers = [...team_members];
        newMembers.splice(index, 1);
        updateSection('section2', { team_members: newMembers });
    };

    const totalHours = team_members.reduce((acc, curr) => acc + (parseFloat(curr.hours) || 0), 0);

    return (
        <div className="space-y-12">
            {/* Section Header */}
            <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600">
                    <Users className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Team Configuration</span>
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Identity & Team</h2>
                <p className="text-slate-500 max-w-2xl font-medium">Define your participation type and provide verified details for certificates and impact tracking.</p>

                {/* Error Summary */}
                {hasErrors && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-red-900 text-sm">Please fix the following errors:</h4>
                            <ul className="mt-2 space-y-1">
                                {sectionErrors.slice(0, 5).map((error, idx) => (
                                    <li key={idx} className="text-xs text-red-700">• {error.message}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            {/* Participation Type Selection */}
            <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100">
                <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                    {[
                        { id: 'individual', title: 'Individual', icon: Users, desc: 'Reporting personal impact' },
                        { id: 'team', title: 'Team Participation', icon: UserPlus, desc: '2–20 students collaborated' }
                    ].map((type) => (
                        <button
                            key={type.id}
                            onClick={() => handleTypeChange(type.id)}
                            className={clsx(
                                "flex-1 w-full max-w-[320px] p-6 rounded-3xl border-2 transition-all duration-300 text-left group",
                                participation_type === type.id
                                    ? "bg-white border-blue-600 shadow-xl shadow-blue-100"
                                    : "bg-transparent border-slate-200 hover:border-slate-300"
                            )}
                        >
                            <div className={clsx(
                                "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110",
                                participation_type === type.id ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-white text-slate-400 border border-slate-200"
                            )}>
                                <type.icon className="w-6 h-6" />
                            </div>
                            <h4 className={clsx("font-black text-lg", participation_type === type.id ? "text-slate-900" : "text-slate-500")}>{type.title}</h4>
                            <p className="text-sm text-slate-400 font-medium mt-1">{type.desc}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Team Lead Section */}
            <div className="space-y-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-xl italic">TL</div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Primary Student / Team Lead</h3>
                        <p className="text-sm text-slate-500 font-medium">Official representative for this project</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: "Full Name", value: team_lead.name, field: 'name', placeholder: "Ayesha Khan", icon: Users },
                        { label: "CNIC Number", value: team_lead.cnic, field: 'cnic', placeholder: "13 digits", icon: Fingerprint, maxLength: 13 },
                        { label: "Mobile Number", value: team_lead.mobile, field: 'mobile', placeholder: "03XX-XXXXXXX", icon: Phone, maxLength: 11 },
                        { label: "Email Address", value: team_lead.email, field: 'email', placeholder: "university@email.com", icon: Mail },
                        { label: "University", value: team_lead.university, field: 'university', placeholder: "University of the Punjab", icon: GraduationCap },
                        { label: "Degree Path", value: team_lead.degree, field: 'degree', placeholder: "e.g. BSCS", icon: GraduationCap },
                        { label: "Year", value: team_lead.year, field: 'year', isSelect: true, icon: Calendar }
                    ].map((input, idx) => {
                        const fieldError = getFieldError(`team_lead.${input.field}`);
                        const hasError = !!fieldError;

                        return (
                            <div key={idx} className={clsx("space-y-2", input.label === "Email Address" && "lg:col-span-1")}>
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    <input.icon className="w-3 h-3" /> {input.label}
                                </Label>
                                {input.isSelect ? (
                                    <Select
                                        value={input.value}
                                        onChange={(e) => handleTeamLeadChange(input.field, e.target.value)}
                                        className={clsx(
                                            "w-full px-4 py-3 rounded-2xl border-2 bg-white transition-all duration-200 font-medium",
                                            hasError
                                                ? "border-red-400 focus:border-red-500 bg-red-50"
                                                : "border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                        )}
                                    >
                                        <option value="">Select {input.label}</option>
                                        {input.field === 'year' && ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'].map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </Select>
                                ) : (
                                    <Input
                                        value={input.value}
                                        onChange={(e) => handleTeamLeadChange(input.field, e.target.value)}
                                        placeholder={input.placeholder}
                                        maxLength={input.maxLength}
                                        className={clsx(
                                            "px-4 py-3 rounded-2xl border-2 transition-all duration-200 font-medium",
                                            hasError
                                                ? "border-red-400 focus:border-red-500 bg-red-50"
                                                : "border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                        )}
                                    />
                                )}
                                <FieldError message={fieldError} />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Privacy Consent Checkbox */}
            <div className={clsx(
                "rounded-3xl border-2 p-6 transition-all duration-300 bg-slate-50 border-slate-200"
            )}>
                <label className="flex items-start gap-4 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={team_lead.consent || false}
                        onChange={(e) => updateSection('section2', {
                            team_lead: { ...team_lead, consent: e.target.checked }
                        })}
                        className="mt-1 w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex-1">
                        <p className="font-semibold text-slate-900 mb-1">
                            I consent to sharing my verified identity for certification and impact verification purposes.
                        </p>
                        <p className="text-xs text-slate-500">Required for generating authenticated certificates.</p>
                    </div>
                </label>
            </div>
        </div>
    )
}
