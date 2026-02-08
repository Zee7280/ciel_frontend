import { Users, UserPlus, Trash2, Mail, Phone, Fingerprint, GraduationCap, AlertCircle, Shield, Info } from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Button } from "./ui/button";
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
    const { participation_type, team_lead, team_members } = data.section2;

    // Get section-level errors
    const sectionErrors = validationErrors['section2'] || [];
    const hasErrors = sectionErrors.length > 0;

    const handleTeamLeadChange = (field: string, value: string | boolean) => {
        updateSection('section2', {
            team_lead: { ...team_lead, [field]: value }
        });
    };

    const handleTypeChange = (type: string) => {
        updateSection('section2', {
            participation_type: type as 'individual' | 'team',
            team_members: type === 'individual' ? [] : team_members
        });
    };

    const addTeamMember = () => {
        if (team_members.length < 19) {
            updateSection('section2', {
                team_members: [...team_members, { name: "", cnic: "", mobile: "", university: "", program: "", year: "", role: "", hours: "" }]
            });
        }
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

    // Calculate totals
    const totalStudents = participation_type === 'team' ? 1 + team_members.length : 1;
    const teamMembersHours = team_members.reduce((acc, curr) => acc + (parseFloat(curr.hours) || 0), 0);
    const teamLeadHours = parseFloat(team_lead.hours) || 0;
    const totalHours = teamLeadHours + teamMembersHours;
    const avgHours = totalStudents > 0 ? (totalHours / totalStudents).toFixed(1) : 0;

    return (
        <div className="space-y-8">
            {/* Section Header */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <span className="text-sm font-bold">🔹 SECTION 2</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Student & Team Information</h2>
                <p className="text-slate-600 text-sm">Who participated and in what capacity</p>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 mt-4">
                    <p className="text-xs text-blue-800">
                        <strong>Purpose:</strong> This section records who participated in the project and how much effort was contributed.
                        Accurate information is required for certification, verification, HEC reporting, and university records.
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

            {/* 2.0 Participation Type */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">2.0</div>
                    <h3 className="text-lg font-bold text-slate-900">Participation Type</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                        { id: 'individual', title: 'Individual', icon: Users, desc: 'Solo participation' },
                        { id: 'team', title: 'Team (2–20 students)', icon: UserPlus, desc: 'Collaborative project' }
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

            {/* 2.1 Primary Student / Team Lead Information */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">2.1</div>
                    <h3 className="text-lg font-bold text-slate-900">Primary Student / Team Lead Information</h3>
                </div>

                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        <p className="text-xs text-amber-800">
                            This information is used for identity verification, certificates, and official reporting.
                            Your data will be handled securely and not shared publicly.
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-6">
                    {/* 2.1.1 Full Name */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">2.1.1 Full Name *</Label>
                        <Input
                            value={team_lead.name || ''}
                            onChange={(e) => handleTeamLeadChange('name', e.target.value)}
                            placeholder="Ayesha Khan"
                            className={clsx(
                                "h-10 rounded-lg border-slate-200",
                                getFieldError('team_lead.name') && "border-red-400 bg-red-50"
                            )}
                        />
                        <FieldError message={getFieldError('team_lead.name')} />
                    </div>

                    {/* 2.1.2 CNIC / B Form Number */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">2.1.2 CNIC / B Form Number *</Label>
                        <Input
                            value={team_lead.cnic || ''}
                            onChange={(e) => handleTeamLeadChange('cnic', e.target.value)}
                            placeholder="3520112345678 (13 digits, without dashes)"
                            maxLength={13}
                            className={clsx(
                                "h-10 rounded-lg border-slate-200",
                                getFieldError('team_lead.cnic') && "border-red-400 bg-red-50"
                            )}
                        />
                        <p className="text-xs text-slate-500">
                            <Shield className="w-3 h-3 inline mr-1" />
                            Required for identity verification and HEC/university records. This information will not be displayed publicly.
                        </p>
                        <FieldError message={getFieldError('team_lead.cnic')} />
                    </div>

                    {/* 2.1.3 Mobile Number */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">2.1.3 Mobile Number *</Label>
                        <Input
                            value={team_lead.mobile || ''}
                            onChange={(e) => handleTeamLeadChange('mobile', e.target.value)}
                            placeholder="+923001234567"
                            maxLength={13}
                            className={clsx(
                                "h-10 rounded-lg border-slate-200",
                                getFieldError('team_lead.mobile') && "border-red-400 bg-red-50"
                            )}
                        />
                        <p className="text-xs text-slate-500">For verification, certificate delivery, and official communication</p>
                        <FieldError message={getFieldError('team_lead.mobile')} />
                    </div>

                    {/* 2.1.4 Email Address */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">2.1.4 Email Address *</Label>
                        <Input
                            type="email"
                            value={team_lead.email || ''}
                            onChange={(e) => handleTeamLeadChange('email', e.target.value)}
                            placeholder="ayyesha.khan@student.edu.pk"
                            className={clsx(
                                "h-10 rounded-lg border-slate-200",
                                getFieldError('team_lead.email') && "border-red-400 bg-red-50"
                            )}
                        />
                        <FieldError message={getFieldError('team_lead.email')} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 2.1.5 University / School Name */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">2.1.5 University / School Name *</Label>
                            <Input
                                value={team_lead.university || ''}
                                onChange={(e) => handleTeamLeadChange('university', e.target.value)}
                                placeholder="University of the Punjab"
                                className={clsx(
                                    "h-10 rounded-lg border-slate-200",
                                    getFieldError('team_lead.university') && "border-red-400 bg-red-50"
                                )}
                            />
                            <FieldError message={getFieldError('team_lead.university')} />
                        </div>

                        {/* 2.1.6 Degree / Program / Class */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">2.1.6 Degree / Program / Class *</Label>
                            <Input
                                value={team_lead.degree || ''}
                                onChange={(e) => handleTeamLeadChange('degree', e.target.value)}
                                placeholder="BS Computer Science"
                                className={clsx(
                                    "h-10 rounded-lg border-slate-200",
                                    getFieldError('team_lead.degree') && "border-red-400 bg-red-50"
                                )}
                            />
                            <FieldError message={getFieldError('team_lead.degree')} />
                        </div>
                    </div>

                    {/* 2.1.7 Year of Study */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">2.1.7 Year of Study *</Label>
                        <Select
                            value={team_lead.year || ''}
                            onChange={(e) => handleTeamLeadChange('year', e.target.value)}
                            className={clsx(
                                "h-10 rounded-lg border-slate-200",
                                getFieldError('team_lead.year') && "border-red-400 bg-red-50"
                            )}
                        >
                            <option value="">Select Year</option>
                            <option value="Year 1">Year 1</option>
                            <option value="Year 2">Year 2</option>
                            <option value="Year 3">Year 3</option>
                            <option value="Year 4">Year 4</option>
                            <option value="Final Year">Final Year</option>
                            <option value="School (Grade 7–12)">School (Grade 7–12)</option>
                        </Select>
                        <FieldError message={getFieldError('team_lead.year')} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 2.1.8 Role */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">2.1.8 Role *</Label>
                            <Input
                                value={team_lead.role || ''}
                                onChange={(e) => handleTeamLeadChange('role', e.target.value)}
                                placeholder="Team Lead / Coordinator"
                                className={clsx(
                                    "h-10 rounded-lg border-slate-200",
                                    getFieldError('team_lead.role') && "border-red-400 bg-red-50"
                                )}
                            />
                            <p className="text-xs text-slate-500">Your primary role in this project</p>
                            <FieldError message={getFieldError('team_lead.role')} />
                        </div>

                        {/* 2.1.9 Hours Contributed */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">2.1.9 Hours Contributed *</Label>
                            <Input
                                type="number"
                                value={team_lead.hours || ''}
                                onChange={(e) => handleTeamLeadChange('hours', e.target.value)}
                                placeholder="20"
                                min="0"
                                className={clsx(
                                    "h-10 rounded-lg border-slate-200",
                                    getFieldError('team_lead.hours') && "border-red-400 bg-red-50"
                                )}
                            />
                            <p className="text-xs text-slate-500">Total hours you spent on this project</p>
                            <FieldError message={getFieldError('team_lead.hours')} />
                        </div>
                    </div>
                </div>
            </div>

            {/* 2.2 Team Member Details (Only if Team selected) */}
            {participation_type === 'team' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">2.2</div>
                            <h3 className="text-lg font-bold text-slate-900">Team Member Details</h3>
                        </div>
                        <Button
                            onClick={addTeamMember}
                            disabled={team_members.length >= 19}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
                        >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Add Member
                        </Button>
                    </div>

                    <p className="text-sm text-slate-600">Add details of all team members who actively participated in the project.</p>

                    {team_members.length > 0 ? (
                        <div className="space-y-4">
                            {team_members.map((member, index) => (
                                <div key={index} className="bg-white rounded-xl border border-slate-200 p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                                                {index + 1}
                                            </div>
                                            <span className="text-sm font-semibold text-slate-700">Team Member {index + 1}</span>
                                        </div>
                                        <button
                                            onClick={() => removeTeamMember(index)}
                                            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Row 1: Name, CNIC, Mobile, University */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold text-slate-600">Full Name</Label>
                                            <Input
                                                value={member.name || ''}
                                                onChange={(e) => updateTeamMember(index, 'name', e.target.value)}
                                                placeholder="Ali Raza"
                                                className="h-10 text-sm border-slate-200 rounded-lg"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold text-slate-600">CNIC / B Form</Label>
                                            <Input
                                                value={member.cnic || ''}
                                                onChange={(e) => updateTeamMember(index, 'cnic', e.target.value)}
                                                placeholder="13 digits"
                                                maxLength={13}
                                                className="h-10 text-sm border-slate-200 rounded-lg"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold text-slate-600">Mobile</Label>
                                            <Input
                                                value={member.mobile || ''}
                                                onChange={(e) => updateTeamMember(index, 'mobile', e.target.value)}
                                                placeholder="+92XXX"
                                                className="h-10 text-sm border-slate-200 rounded-lg"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold text-slate-600">University</Label>
                                            <Input
                                                value={member.university || ''}
                                                onChange={(e) => updateTeamMember(index, 'university', e.target.value)}
                                                placeholder="LCWU"
                                                className="h-10 text-sm border-slate-200 rounded-lg"
                                            />
                                        </div>
                                    </div>

                                    {/* Row 2: Program, Role, Hours */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold text-slate-600">Program</Label>
                                            <Input
                                                value={member.program || ''}
                                                onChange={(e) => updateTeamMember(index, 'program', e.target.value)}
                                                placeholder="BS Sociology"
                                                className="h-10 text-sm border-slate-200 rounded-lg"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold text-slate-600">Role</Label>
                                            <Input
                                                value={member.role || ''}
                                                onChange={(e) => updateTeamMember(index, 'role', e.target.value)}
                                                placeholder="Field Support"
                                                className="h-10 text-sm border-slate-200 rounded-lg"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold text-slate-600">Hours</Label>
                                            <Input
                                                type="number"
                                                value={member.hours || ''}
                                                onChange={(e) => updateTeamMember(index, 'hours', e.target.value)}
                                                placeholder="12"
                                                className="h-10 text-sm border-slate-200 rounded-lg"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-slate-50 rounded-xl p-8 text-center border border-slate-200">
                            <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                            <p className="text-slate-600 font-medium">No team members added yet</p>
                            <p className="text-sm text-slate-500 mt-1">Click "Add Member" to add team participants</p>
                        </div>
                    )}

                    {/* Role Examples */}
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-xs text-blue-800 font-semibold mb-1">🧭 Role Examples:</p>
                        <p className="text-xs text-blue-700">Team Lead • Trainer • Research & Data Collection • Logistics & Coordination • Content Development • Field Support</p>
                    </div>
                </div>
            )}

            {/* 2.3 Total Hours Summary (Auto Generated) */}
            {participation_type === 'team' && team_members.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-600 text-white flex items-center justify-center font-bold text-sm">2.3</div>
                        <h3 className="text-lg font-bold text-slate-900">Total Hours Summary</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl p-4 border border-slate-200">
                            <p className="text-xs text-slate-500 mb-1">Total Students</p>
                            <p className="text-2xl font-bold text-slate-900">{totalStudents}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-slate-200">
                            <p className="text-xs text-slate-500 mb-1">Total Hours</p>
                            <p className="text-2xl font-bold text-blue-600">{totalHours}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-slate-200">
                            <p className="text-xs text-slate-500 mb-1">Average Hours/Student</p>
                            <p className="text-2xl font-bold text-green-600">{avgHours}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* 2.4 Data Privacy & Consent */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">2.4</div>
                    <h3 className="text-lg font-bold text-slate-900">Data Privacy & Consent</h3>
                </div>

                <div className="bg-white rounded-xl p-6 border-2 border-slate-200">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={team_lead.consent || false}
                            onChange={(e) => handleTeamLeadChange('consent', e.target.checked)}
                            className="mt-1 w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <div>
                            <p className="font-semibold text-slate-900">
                                I confirm that the personal information provided is accurate and shared with consent for verification, certification, and official reporting purposes.
                            </p>
                            <p className="text-xs text-slate-600 mt-2 flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                Personal identifiers (CNIC/B Form, mobile) will never be displayed publicly.
                            </p>
                        </div>
                    </label>
                    <FieldError message={getFieldError('team_lead.consent')} />
                </div>
            </div>
        </div>
    )
}
