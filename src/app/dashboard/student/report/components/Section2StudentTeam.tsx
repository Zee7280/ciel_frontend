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

export default function Section2StudentTeam() {
    const { data, updateSection } = useReportForm();
    const { participation_type, team_lead, team_members, privacy_consent } = data.section2;

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
                        { label: "CNIC Number", value: team_lead.cnic, field: 'cnic', placeholder: "13 digits", icon: Fingerprint },
                        { label: "Mobile Number", value: team_lead.mobile, field: 'mobile', placeholder: "03XX-XXXXXXX", icon: Phone },
                        { label: "Email Address", value: team_lead.email, field: 'email', placeholder: "university@email.com", icon: Mail },
                        { label: "University", value: team_lead.university, field: 'university', isSelect: true, icon: GraduationCap },
                        { label: "Degree Path", value: team_lead.degree, field: 'degree', placeholder: "e.g. BSCS", icon: GraduationCap },
                        { label: "Year", value: team_lead.year, field: 'year', isSelect: true, icon: Calendar }
                    ].map((input, idx) => (
                        <div key={idx} className={clsx("space-y-2", input.label === "Email Address" && "lg:col-span-1")}>
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <input.icon className="w-3 h-3" /> {input.label}
                            </Label>
                            {input.isSelect ? (
                                <Select
                                    value={input.value}
                                    onChange={(e) => handleTeamLeadChange(input.field, e.target.value)}
                                    className="bg-white border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 transition-all font-bold text-slate-800"
                                >
                                    {input.field === 'university' ? (
                                        <>
                                            <option value="">Select University</option>
                                            <option value="PU">University of the Punjab</option>
                                            <option value="LCWU">LCWU</option>
                                            <option value="LUMS">LUMS</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="">Select Year</option>
                                            {['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Final Year'].map(y => <option key={y} value={y}>{y}</option>)}
                                        </>
                                    )}
                                </Select>
                            ) : (
                                <Input
                                    value={input.value}
                                    onChange={(e) => handleTeamLeadChange(input.field, e.target.value)}
                                    placeholder={input.placeholder}
                                    className="bg-white border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 transition-all font-bold text-slate-800"
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Team Members Section */}
            {participation_type === "team" && (
                <div className="space-y-8 pt-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-xl">TM</div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Collaboration Team</h3>
                                <p className="text-sm text-slate-500 font-medium">{team_members.length} Members Added</p>
                            </div>
                        </div>
                        <Button
                            onClick={addTeamMember}
                            className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl px-6"
                        >
                            <UserPlus className="w-4 h-4 mr-2" /> Add Participant
                        </Button>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        {["Name", "ID/CNIC", "University", "Role", "Hrs", ""].map((h, i) => (
                                            <th key={i} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {team_members.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                                                No team members added yet. Click 'Add Participant' to start.
                                            </td>
                                        </tr>
                                    ) : (
                                        team_members.map((member, index) => (
                                            <tr key={index} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-4 py-4"><Input className="h-10 border-slate-200 rounded-xl font-bold text-sm min-w-[150px]" value={member.name} onChange={(e) => updateTeamMember(index, 'name', e.target.value)} /></td>
                                                <td className="px-4 py-4"><Input className="h-10 border-slate-200 rounded-xl font-bold text-sm w-32" value={member.cnic} onChange={(e) => updateTeamMember(index, 'cnic', e.target.value)} /></td>
                                                <td className="px-4 py-4">
                                                    <Select className="h-10 border-slate-200 rounded-xl font-bold text-sm w-40" value={member.university} onChange={(e) => updateTeamMember(index, 'university', e.target.value)}>
                                                        <option value="">Select</option>
                                                        <option value="PU">PU</option>
                                                        <option value="LCWU">LCWU</option>
                                                    </Select>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <Select className="h-10 border-slate-200 rounded-xl font-bold text-sm w-32" value={member.role} onChange={(e) => updateTeamMember(index, 'role', e.target.value)}>
                                                        <option value="">Role</option>
                                                        <option value="Member">Member</option>
                                                        <option value="Lead">Lead</option>
                                                    </Select>
                                                </td>
                                                <td className="px-4 py-4"><Input type="number" className="h-10 border-slate-200 rounded-xl font-bold text-sm w-20" value={member.hours} onChange={(e) => updateTeamMember(index, 'hours', e.target.value)} /></td>
                                                <td className="px-4 py-4">
                                                    <button onClick={() => removeTeamMember(index)} className="p-2 text-slate-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Summary & Consent */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-900 rounded-[2rem] p-8 text-white space-y-6">
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Impact Summary</h4>
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { label: "Team Size", value: participation_type === 'team' ? team_members.length + 1 : 1 },
                            { label: "Total Hours", value: totalHours },
                            { label: "Avg Focus", value: `${(totalHours / (participation_type === 'team' ? team_members.length + 1 : 1)).toFixed(1)} hrs` }
                        ].map((stat, i) => (
                            <div key={i} className="space-y-1">
                                <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</span>
                                <span className="text-2xl font-black text-white">{stat.value}</span>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-400 shrink-0" />
                        <p className="text-xs text-slate-300 leading-relaxed font-medium">Verify that the total hours represent authentic community engagement. This data is used for SDG 4.7 mapping.</p>
                    </div>
                </div>

                <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2rem] p-8 flex flex-col justify-center gap-6 group hover:border-blue-200 transition-colors">
                    <div className="flex items-start gap-4">
                        <Checkbox
                            id="privacy_consent"
                            className="mt-1 border-slate-300 rounded-md data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                            checked={privacy_consent}
                            onChange={(e) => updateSection('section2', { privacy_consent: e.target.checked })}
                        />
                        <div className="space-y-2">
                            <Label htmlFor="privacy_consent" className="text-sm font-bold text-slate-800 cursor-pointer">Identity Confirmation & Privacy Consent</Label>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">I confirm that all team members' personal information is accurate and shared with their informed consent for reporting purposes.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-xl border border-green-100 w-fit">
                        <CheckCircle2 className="w-3 h-3" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Secure Handling active</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
