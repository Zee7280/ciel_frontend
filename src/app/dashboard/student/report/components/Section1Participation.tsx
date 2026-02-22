import { Users, UserPlus, Trash2, Shield, Info, AlertCircle, Clock } from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Button } from "./ui/button";
import { useReportForm } from "../context/ReportContext";
import clsx from "clsx";

import { FieldError } from "./ui/FieldError";

export default function Section1Participation() {
    const { data, updateSection, getFieldError, validationErrors } = useReportForm();
    const { participation_type, team_lead, team_members } = data.section1;

    // Get section-level errors
    const sectionErrors = validationErrors['section1'] || [];
    const hasErrors = sectionErrors.length > 0;

    const handleTeamLeadChange = (field: string, value: string | boolean) => {
        updateSection('section1', {
            team_lead: { ...team_lead, [field]: value }
        });
    };

    const handleTypeChange = (type: string) => {
        updateSection('section1', {
            participation_type: type as 'individual' | 'team',
            team_members: type === 'individual' ? [] : team_members
        });
    };

    const addTeamMember = () => {
        if (team_members.length < 19) {
            updateSection('section1', {
                team_members: [...team_members, { name: "", cnic: "", mobile: "", university: "", program: "", year: "", role: "", hours: "" }]
            });
        }
    };

    const updateTeamMember = (index: number, field: string, value: string) => {
        const newMembers = [...team_members];
        newMembers[index] = { ...newMembers[index], [field]: value };
        updateSection('section1', { team_members: newMembers });
    };

    const removeTeamMember = (index: number) => {
        const newMembers = [...team_members];
        newMembers.splice(index, 1);
        updateSection('section1', { team_members: newMembers });
    };

    // Calculate totals
    const totalStudents = participation_type === 'team' ? 1 + team_members.length : 1;
    const teamMembersHours = team_members.reduce((acc, curr) => acc + (parseFloat(curr.hours) || 0), 0);
    const teamLeadHours = parseFloat(team_lead.hours) || 0;
    const totalHours = teamLeadHours + teamMembersHours;
    const avgHours = totalStudents > 0 ? (totalHours / totalStudents).toFixed(1) : 0;

    // Engagement Score Calculation (Mock logic for now)
    const engagementScore = Math.min(100, Math.round((totalHours / totalStudents) * 2));

    return (
        <div className="space-y-8">
            {/* Section Header */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <span className="text-sm font-bold">🔹 SECTION 1</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Verified Participation & Engagement</h2>
                <p className="text-slate-600 text-sm">Identity authentication, hours validation & institutional metrics</p>

                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 mt-4">
                    <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm text-blue-900 font-semibold">Purpose</p>
                            <p className="text-xs text-blue-800 leading-relaxed">
                                This section establishes authenticity. It confirms who participated, how participation was verified,
                                and the intensity of engagement. All data is traceable and audit-ready for HEC and QS reporting.
                            </p>
                        </div>
                    </div>
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

            {/* 1.1 Participation Type */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">1.1</div>
                    <h3 className="text-lg font-bold text-slate-900">Participation Type (Mandatory)</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                        { id: 'individual', title: 'Individual', icon: Users, desc: 'Solo participation' },
                        { id: 'team', title: 'Team Participation', icon: UserPlus, desc: 'Collaborative project (Each member verifies own hours)' }
                    ].map((type) => (
                        <button
                            key={type.id}
                            onClick={() => handleTypeChange(type.id)}
                            className={clsx(
                                "p-4 rounded-xl border-2 transition-all text-left",
                                participation_type === type.id
                                    ? "bg-blue-50 border-blue-600"
                                    : "bg-white border-slate-200 hover:border-slate-300"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className={clsx(
                                    "w-10 h-10 rounded-lg flex items-center justify-center",
                                    participation_type === type.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                                )}>
                                    <type.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-900">{type.title}</h4>
                                    <p className="text-xs text-slate-500">{type.desc}</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* 1.2 Identity Verification */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">1.2</div>
                    <h3 className="text-lg font-bold text-slate-900">Identity Verification</h3>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-6">
                    <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
                        <Shield className="w-4 h-4" />
                        <span>Generic identifiers are encrypted and never publicly displayed. Used for HEC compliance.</span>
                    </div>

                    {/* Full Name */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">Full Name *</Label>
                        <Input
                            value={team_lead.name || ''}
                            onChange={(e) => handleTeamLeadChange('name', e.target.value)}
                            placeholder="Student Name"
                            className={clsx("h-10 rounded-lg border-slate-200", getFieldError('team_lead.name') && "border-red-400 bg-red-50")}
                        />
                        <FieldError message={getFieldError('team_lead.name')} />
                    </div>

                    {/* CNIC */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">CNIC / B Form Number *</Label>
                        <Input
                            value={team_lead.cnic || ''}
                            onChange={(e) => handleTeamLeadChange('cnic', e.target.value)}
                            placeholder="3520112345678"
                            maxLength={13}
                            className={clsx("h-10 rounded-lg border-slate-200", getFieldError('team_lead.cnic') && "border-red-400 bg-red-50")}
                        />
                        <FieldError message={getFieldError('team_lead.cnic')} />
                    </div>

                    {/* Contact Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">Mobile Number *</Label>
                            <Input
                                value={team_lead.mobile || ''}
                                onChange={(e) => handleTeamLeadChange('mobile', e.target.value)}
                                placeholder="03001234567"
                                className={clsx("h-10 rounded-lg border-slate-200", getFieldError('team_lead.mobile') && "border-red-400 bg-red-50")}
                            />
                            <FieldError message={getFieldError('team_lead.mobile')} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">Email Address *</Label>
                            <Input
                                value={team_lead.email || ''}
                                onChange={(e) => handleTeamLeadChange('email', e.target.value)}
                                placeholder="student@university.edu.pk"
                                className={clsx("h-10 rounded-lg border-slate-200", getFieldError('team_lead.email') && "border-red-400 bg-red-50")}
                            />
                            <FieldError message={getFieldError('team_lead.email')} />
                        </div>
                    </div>

                    {/* Academic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">University / Institution *</Label>
                            <Input
                                value={team_lead.university || ''}
                                onChange={(e) => handleTeamLeadChange('university', e.target.value)}
                                placeholder="University Name"
                                className={clsx("h-10 rounded-lg border-slate-200", getFieldError('team_lead.university') && "border-red-400 bg-red-50")}
                            />
                            <FieldError message={getFieldError('team_lead.university')} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">Degree / Program *</Label>
                            <Input
                                value={team_lead.degree || ''}
                                onChange={(e) => handleTeamLeadChange('degree', e.target.value)}
                                placeholder="BS Program"
                                className={clsx("h-10 rounded-lg border-slate-200", getFieldError('team_lead.degree') && "border-red-400 bg-red-50")}
                            />
                            <FieldError message={getFieldError('team_lead.degree')} />
                        </div>
                    </div>
                </div>
            </div>

            {/* 1.3 Hours Contributed */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">1.3</div>
                    <h3 className="text-lg font-bold text-slate-900">Hours Contributed (Mandatory)</h3>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">My Role *</Label>
                            <Input
                                value={team_lead.role || ''}
                                onChange={(e) => handleTeamLeadChange('role', e.target.value)}
                                placeholder="e.g. Team Lead, Volunteer"
                                className={clsx("h-10 rounded-lg border-slate-200", getFieldError('team_lead.role') && "border-red-400 bg-red-50")}
                            />
                            <FieldError message={getFieldError('team_lead.role')} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">My Hours *</Label>
                            <Input
                                type="number"
                                value={team_lead.hours || ''}
                                onChange={(e) => handleTeamLeadChange('hours', e.target.value)}
                                placeholder="Total hours"
                                className={clsx("h-10 rounded-lg border-slate-200", getFieldError('team_lead.hours') && "border-red-400 bg-red-50")}
                            />
                            <p className="text-xs text-slate-500">Only actual hours spent on the project.</p>
                            <FieldError message={getFieldError('team_lead.hours')} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Team Members */}
            {participation_type === 'team' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-900">Team Members</h3>
                        <Button onClick={addTeamMember} disabled={team_members.length >= 19} size="sm" variant="outline">
                            <UserPlus className="w-4 h-4 mr-2" /> Add Member
                        </Button>
                    </div>

                    {team_members.map((member, index) => (
                        <div key={index} className="bg-slate-50 rounded-xl p-4 border border-slate-200 relative">
                            <button onClick={() => removeTeamMember(index)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500">
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8">
                                <div className="space-y-1">
                                    <Input
                                        placeholder="Name"
                                        value={member.name}
                                        onChange={(e) => updateTeamMember(index, 'name', e.target.value)}
                                        className={clsx("h-9 text-sm bg-white", getFieldError(`team_members.${index}.name`) && "border-red-400 bg-red-50")}
                                    />
                                    <FieldError message={getFieldError(`team_members.${index}.name`)} />
                                </div>
                                <div className="space-y-1">
                                    <Input
                                        placeholder="CNIC"
                                        value={member.cnic}
                                        onChange={(e) => updateTeamMember(index, 'cnic', e.target.value)}
                                        className={clsx("h-9 text-sm bg-white", getFieldError(`team_members.${index}.cnic`) && "border-red-400 bg-red-50")}
                                    />
                                    <FieldError message={getFieldError(`team_members.${index}.cnic`)} />
                                </div>
                                <div className="space-y-1">
                                    <Input
                                        placeholder="Role"
                                        value={member.role}
                                        onChange={(e) => updateTeamMember(index, 'role', e.target.value)}
                                        className={clsx("h-9 text-sm bg-white", getFieldError(`team_members.${index}.role`) && "border-red-400 bg-red-50")}
                                    />
                                    <FieldError message={getFieldError(`team_members.${index}.role`)} />
                                </div>
                                <div className="space-y-1">
                                    <Input
                                        type="number"
                                        placeholder="Hours"
                                        value={member.hours}
                                        onChange={(e) => updateTeamMember(index, 'hours', e.target.value)}
                                        className={clsx("h-9 text-sm bg-white", getFieldError(`team_members.${index}.hours`) && "border-red-400 bg-red-50")}
                                    />
                                    <FieldError message={getFieldError(`team_members.${index}.hours`)} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Privacy Consent */}
            <div className={clsx(
                "rounded-xl p-5 border-2 transition-all",
                data.section1.privacy_consent
                    ? "bg-emerald-50 border-emerald-300"
                    : getFieldError('privacy_consent')
                        ? "bg-red-50 border-red-300"
                        : "bg-slate-50 border-slate-200"
            )}>
                <label className="flex items-start gap-4 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={!!data.section1.privacy_consent}
                        onChange={(e) => updateSection('section1', { privacy_consent: e.target.checked })}
                        className="mt-1 w-5 h-5 accent-emerald-600 cursor-pointer shrink-0"
                    />
                    <div>
                        <p className="text-sm font-semibold text-slate-900">
                            Privacy & Data Consent <span className="text-red-500">*</span>
                        </p>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            I consent to the collection, storage, and use of my personal data for HEC compliance reporting and institutional benchmarking purposes. I confirm that all information provided is accurate and complete.
                        </p>
                        {getFieldError('privacy_consent') && (
                            <p className="text-xs text-red-600 font-semibold mt-2">⚠ {getFieldError('privacy_consent')}</p>
                        )}
                    </div>
                </label>
            </div>

            {/* 1.4 System Outputs */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-600 text-white flex items-center justify-center font-bold text-sm">1.4</div>
                    <h3 className="text-lg font-bold text-slate-900">System-Generated Outputs (Read-Only)</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Verified Participants', value: totalStudents },
                        { label: 'Total Verified Hours', value: totalHours },
                        { label: 'Avg Hours/Student', value: avgHours },
                        { label: 'Engagement Score', value: `${engagementScore}/100` },
                    ].map((metric, i) => (
                        <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">{metric.label}</p>
                            <p className="text-xl font-black text-slate-900">{metric.value}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
