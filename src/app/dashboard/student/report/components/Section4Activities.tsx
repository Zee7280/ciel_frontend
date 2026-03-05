import { Calendar, Users, Clock, Briefcase, Activity, Target, Save, Plus, Trash2, Info, AlertCircle, Shield, CheckCircle2, Lock } from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Button } from "./ui/button";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import clsx from "clsx";
import React, { useEffect, useMemo } from "react";

export default function Section4Activities() {
    const { data, updateSection, getFieldError, validationErrors, saveReport } = useReportForm();
    const { section1, section4 } = data;
    const isTeam = section1.participation_type === 'team';

    const sectionErrors = validationErrors['section4'] || [];
    const hasErrors = sectionErrors.length > 0;

    // Consts from specs
    const activityTypes = [
        "Training / Workshop", "Awareness Session", "Research / Survey / Assessment",
        "Mentoring / Coaching", "Service Delivery", "Resource Distribution",
        "Infrastructure / Facility Improvement", "Digital / Technology Development",
        "Policy / Advocacy / Consultation", "Field Engagement / Community Mobilization",
        "System / Process Development", "Monitoring & Evaluation", "Other"
    ];

    const deliveryModes = ["In-person", "Online", "Hybrid", "Field-based"];

    const changeAreas = [
        "Education & Skills", "Health & Wellbeing", "Economic Opportunity",
        "Environment & Climate", "Governance & Policy", "Infrastructure & Services",
        "Digital Access & Systems", "Social Inclusion & Protection", "Food & Basic Needs",
        "Research & Knowledge", "Partnerships & Institutional Strengthening", "Other"
    ];

    const outputTypes = [
        "People trained", "People reached", "Households supported", "Sessions conducted",
        "Services delivered", "Referrals facilitated", "Packs / Kits distributed",
        "Materials distributed", "Infrastructure improved / created",
        "Digital tool / system developed", "Surveys / Assessments conducted",
        "Reports / Policy briefs prepared", "Funds / Resources mobilized",
        "Partnerships activated", "Policy / Advocacy actions completed", "Other"
    ];

    const beneficiaryGroups = [
        "Children (Under 18)", "Youth (18–29)", "Women", "Persons with Disabilities",
        "Low-Income Households", "Rural Communities", "Urban Communities",
        "Refugees / Displaced Populations", "Small Businesses / Entrepreneurs",
        "Public Institutions", "Community Members (General)", "Other"
    ];

    const teamRoles = [
        "Team Lead", "Project Coordinator", "Trainer / Facilitator", "Technical Specialist",
        "Field Officer", "Communication Lead", "Research Lead", "Volunteer", "Other"
    ];

    // Build the list of verified team members from Section 1 (Team Lead excluded — not a member)
    const verifiedMembers = section1.team_members
        .filter(m => m.verified)
        .map((m: any, i) => ({
            member_id: `member-${i}`,
            name: m.fullName || m.name || `Member ${i + 1}`,  // fullName from Participant, fallback to name
            hours: m.hours || '0',
            default_role: m.role || '',
        }));

    // Sync team_contributions whenever verified members change
    useEffect(() => {
        if (!isTeam || verifiedMembers.length === 0) return;

        // Build a map of existing contributions by member_id to preserve entered data
        const existingMap = new Map(
            section4.team_contributions.map(c => [c.member_id, c])
        );

        const synced = verifiedMembers.map(vm => {
            const existing = existingMap.get(vm.member_id);
            return {
                member_id: vm.member_id,
                name: vm.name,                              // always sync name from section 1
                role: existing?.role || vm.default_role,   // preserve entered role
                hours: vm.hours,                           // always sync hours from section 1
                sessions: existing?.sessions || '',
                beneficiaries: existing?.beneficiaries || ''
            };
        });

        // Only update if something actually changed
        const changed = JSON.stringify(synced) !== JSON.stringify(section4.team_contributions);
        if (changed) {
            updateSection('section4', { team_contributions: synced });
        }
    }, [
        isTeam,
        verifiedMembers.map(v => `${v.member_id}|${v.name}|${v.hours}`).join(','),
    ]);

    // Summary calculation
    const autoSummary = useMemo(() => {
        const activityCount = section4.activities.length;
        const totalBennies = section4.total_beneficiaries || "0";
        const sessions = section4.total_sessions || "0";
        const delivery = section4.delivery_mode || "specified mode";
        const outputs = section4.outputs.map(o => `${o.count} ${o.type}`).join(", ");
        const contributors = isTeam ? verifiedMembers.length : 1;
        const totalHours = section1.metrics.total_verified_hours;

        return `This project conducted ${sessions} structured activity sessions through ${delivery.toLowerCase()} delivery. A total of ${totalBennies} beneficiaries were reached, including ${section4.beneficiary_categories.slice(0, 3).join(", ")}${section4.beneficiary_categories.length > 3 ? " and others" : ""}. Verified outputs include ${outputs || "reported deliverables"}. The engagement involved ${contributors} contributor(s) delivering ${totalHours} verified student hours.`;
    }, [section4, section1.metrics.total_verified_hours]);

    useEffect(() => {
        if (section4.summary_text !== autoSummary) {
            updateSection('section4', { summary_text: autoSummary });
        }
    }, [autoSummary, section4.summary_text]);

    // Handlers
    const addActivity = () => updateSection('section4', {
        activities: [...section4.activities, { type: '', delivery_mode: '', sessions: '' }]
    });
    const removeActivity = (i: number) => updateSection('section4', { activities: section4.activities.filter((_, idx) => idx !== i) });
    const updateActivity = (i: number, field: string, val: string) => {
        const next = [...section4.activities];
        next[i] = { ...next[i], [field]: val };
        updateSection('section4', { activities: next });
    };

    const addOutput = () => updateSection('section4', { outputs: [...section4.outputs, { type: '', count: '' }] });
    const removeOutput = (i: number) => updateSection('section4', { outputs: section4.outputs.filter((_, idx) => idx !== i) });
    const updateOutput = (i: number, field: string, val: string) => {
        const next = [...section4.outputs];
        next[i] = { ...next[i], [field]: val };
        updateSection('section4', { outputs: next });
    };

    const toggleBeneficiary = (cat: string) => {
        const current = section4.beneficiary_categories;
        if (current.includes(cat)) {
            updateSection('section4', { beneficiary_categories: current.filter(c => c !== cat) });
        } else {
            updateSection('section4', { beneficiary_categories: [...current, cat] });
        }
    };

    const updateContributor = (i: number, field: string, val: string) => {
        const next = [...section4.team_contributions];
        next[i] = { ...next[i], [field]: val };
        updateSection('section4', { team_contributions: next });
    };

    return (
        <div className="space-y-12 pb-16">
            {/* Header */}
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-100 ring-4 ring-blue-50">
                        <Activity className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Section 4 — Structured Activities & Outputs</h2>
                        <p className="text-slate-500 font-bold uppercase tracking-[0.15em] text-[10px]">What Was Done and Delivered</p>
                    </div>
                </div>

                <div className="p-8 bg-blue-50/80 border-2 border-blue-200 rounded-[2.5rem] shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-700" />
                    <div className="flex items-start gap-6 relative z-10">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0 border border-blue-200 shadow-sm">
                            <Target className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="space-y-3">
                            <h4 className="font-black text-blue-900 uppercase tracking-wider text-sm">🎯 Purpose of This Section</h4>
                            <p className="text-xs text-blue-800 leading-relaxed font-semibold max-w-2xl">
                                Record the specific activities, outputs, and beneficiary reach. This provides the structured evidence layer for SDG alignment validation.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 pt-2">
                                <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-2">
                                    <CheckCircle2 className="w-3 h-3" /> Outputs Only (No Impact)
                                </p>
                                <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-2">
                                    <CheckCircle2 className="w-3 h-3" /> Beneficiary Specificity
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {hasErrors && (
                    <div className="bg-red-50 border-2 border-red-100 rounded-[2rem] p-6 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        <AlertCircle className="w-6 h-6 text-red-600 mt-1 shrink-0" />
                        <div>
                            <h4 className="font-black text-red-900 uppercase tracking-wider text-sm">Action Required: Validation Errors</h4>
                            <ul className="mt-2 space-y-1">
                                {sectionErrors.slice(0, 5).map((error: any, idx: number) => (
                                    <li key={idx} className="text-xs text-red-700 font-bold">• {error.message}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            {/* 4.1 Activity Overview */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">4.1</div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Activity Overview</h3>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={addActivity}
                        className="h-8 px-3 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest hover:bg-blue-100"
                    >
                        <Plus className="w-3 h-3 mr-2" /> Add Additional Activity
                    </Button>
                </div>

                <div className="space-y-6">
                    {section4.activities.map((act: any, i: number) => (
                        <div key={i} className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-10 shadow-sm space-y-8 relative">
                            {/* Remove button — only on extra activities */}
                            {i > 0 && (
                                <button
                                    type="button"
                                    onClick={() => removeActivity(i)}
                                    className="absolute top-5 right-5 w-8 h-8 rounded-full bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}

                            {/* Activity Type */}
                            <div className="space-y-3">
                                <Label className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Activity Types (Required)</Label>
                                <select
                                    value={act.type || ''}
                                    onChange={(e) => updateActivity(i, 'type', e.target.value)}
                                    className={clsx(
                                        "w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 font-black text-slate-700 outline-none focus:border-blue-200 transition-all appearance-none text-xs",
                                        getFieldError(`activities.${i}.type`) && "border-red-200"
                                    )}
                                >
                                    <option value="">Select Activity Type...</option>
                                    {activityTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                {/* Other specify input */}
                                {(act.type === 'Other') && (
                                    <input
                                        type="text"
                                        maxLength={40}
                                        placeholder="Specify (max 5 words)"
                                        value={act.type_other || ''}
                                        onChange={(e) => updateActivity(i, 'type_other', e.target.value)}
                                        className="w-full h-10 bg-slate-50 border-2 border-blue-100 rounded-xl px-4 text-xs font-bold text-slate-700 outline-none focus:border-blue-300"
                                    />
                                )}
                                <FieldError message={getFieldError(`activities.${i}.type`)} />
                            </div>

                            {/* Delivery Mode / Total Sessions / Project Duration */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4 border-t border-slate-50">
                                <div className="space-y-3">
                                    <Label className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Delivery Mode</Label>
                                    <select
                                        value={act.delivery_mode || section4.delivery_mode || ''}
                                        onChange={(e) => {
                                            updateActivity(i, 'delivery_mode', e.target.value);
                                            if (i === 0) updateSection('section4', { delivery_mode: e.target.value });
                                        }}
                                        className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 font-bold text-slate-700 text-xs"
                                    >
                                        <option value="">Select Mode...</option>
                                        {deliveryModes.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Total Sessions</Label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 5"
                                        value={act.sessions || (i === 0 ? section4.total_sessions : '') || ''}
                                        onChange={(e) => {
                                            updateActivity(i, 'sessions', e.target.value);
                                            if (i === 0) updateSection('section4', { total_sessions: e.target.value });
                                        }}
                                        className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 font-bold text-slate-700 text-xs outline-none"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Project Duration</Label>
                                    <div className="h-12 bg-slate-100 rounded-xl px-4 flex items-center justify-between border-2 border-slate-200 border-dashed">
                                        <span className="text-xs font-black text-slate-500 uppercase">{section1.metrics.engagement_span} Days</span>
                                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                                    </div>
                                    <p className="text-[9px] font-semibold text-slate-400 italic">Linked from Section 1 Attendance</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 4.2 Primary Change Area */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">4.2</div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Primary Change Area</h3>
                </div>

                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-10 shadow-sm relative group overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-40 h-40 bg-slate-50 rounded-full group-hover:bg-blue-50 transition-colors" />
                    <div className="relative z-10 space-y-6">
                        <div className="space-y-2">
                            <Label className="text-base font-black text-slate-900 uppercase tracking-tight">Primary Change Area (Required)</Label>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">What type of change was your project primarily designed to support?</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {changeAreas.map((area) => (
                                <button
                                    key={area}
                                    type="button"
                                    onClick={() => updateSection('section4', { primary_change_area: area })}
                                    className={clsx(
                                        "px-6 py-4 rounded-2xl border-2 text-left transition-all",
                                        section4.primary_change_area === area
                                            ? "border-blue-600 bg-blue-50 text-blue-900 shadow-lg shadow-blue-100"
                                            : "border-slate-50 bg-slate-50 text-slate-600 hover:bg-slate-100"
                                    )}
                                >
                                    <span className="text-[10px] font-black uppercase tracking-wider">{area}</span>
                                </button>
                            ))}
                        </div>
                        {/* Other specify */}
                        {section4.primary_change_area === 'Other' && (
                            <input
                                type="text"
                                placeholder="Specify your change area..."
                                value={section4.primary_change_area_other || ''}
                                onChange={(e) => updateSection('section4', { primary_change_area_other: e.target.value })}
                                className="w-full h-11 bg-slate-50 border-2 border-blue-100 rounded-xl px-4 text-xs font-bold text-slate-700 outline-none focus:border-blue-300"
                            />
                        )}
                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-[9px] font-bold text-amber-800 uppercase leading-relaxed">
                                The system internally maps this to the SDG, Target, and Indicator locked in Section 3.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4.3 Structured Outputs */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">4.3</div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Structured Outputs</h3>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={addOutput}
                        className="h-8 px-4 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black"
                    >
                        <Plus className="w-3.5 h-3.5 mr-2" /> Add Output Row
                    </Button>
                </div>

                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-sm">
                    <div className="space-y-4">
                        {section4.outputs.map((out, i) => (
                            <div key={i} className="space-y-2 animate-in fade-in slide-in-from-left-4 duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                    <div className="md:col-span-7 space-y-2">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Output Type</Label>
                                        <select
                                            value={out.type}
                                            onChange={(e) => updateOutput(i, 'type', e.target.value)}
                                            className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 font-bold text-slate-700 text-xs"
                                        >
                                            <option value="">Select Output Type...</option>
                                            {outputTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div className="md:col-span-3 space-y-2">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Number</Label>
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            value={out.count}
                                            onChange={(e) => updateOutput(i, 'count', e.target.value)}
                                            className="h-12 bg-slate-50 border-none rounded-xl px-4 font-bold"
                                        />
                                    </div>
                                    <div className="md:col-span-2 pb-1.5 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => removeOutput(i)}
                                            disabled={section4.outputs.length === 1}
                                            className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 disabled:opacity-30 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                {/* Other: specify + unit */}
                                {out.type === 'Other' && (
                                    <input
                                        type="text"
                                        placeholder="Specify output + unit (e.g. 'Meals served')"
                                        value={(out as any).other_label || ''}
                                        onChange={(e) => updateOutput(i, 'other_label', e.target.value)}
                                        className="w-full md:w-8/12 h-10 bg-slate-50 border-2 border-blue-100 rounded-xl px-4 text-xs font-bold text-slate-700 outline-none focus:border-blue-300"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 4.4 Beneficiary Profile */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">4.4</div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Beneficiary Profile</h3>
                </div>

                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-10 shadow-sm space-y-10">
                    <div className="space-y-6">
                        <Label className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Select Categories (Select All That Apply)</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {beneficiaryGroups.map((group) => (
                                <button
                                    key={group}
                                    type="button"
                                    onClick={() => toggleBeneficiary(group)}
                                    className={clsx(
                                        "p-4 rounded-xl border-2 flex items-center justify-center text-center transition-all",
                                        section4.beneficiary_categories.includes(group)
                                            ? "border-blue-600 bg-blue-50 text-blue-900"
                                            : "border-slate-50 bg-slate-50 text-slate-500 hover:border-slate-100"
                                    )}
                                >
                                    <span className="text-[9px] font-black uppercase tracking-wider">{group}</span>
                                </button>
                            ))}
                        </div>
                        {/* Other beneficiary specify */}
                        {section4.beneficiary_categories.includes('Other') && (
                            <input
                                type="text"
                                placeholder="Specify beneficiary group..."
                                value={section4.beneficiary_other || ''}
                                onChange={(e) => updateSection('section4', { beneficiary_other: e.target.value })}
                                className="w-full md:w-1/2 h-10 bg-slate-50 border-2 border-blue-100 rounded-xl px-4 text-xs font-bold text-slate-700 outline-none focus:border-blue-300"
                            />
                        )}
                    </div>

                    <div className="pt-8 border-t border-slate-50 max-w-sm">
                        <div className="space-y-3">
                            <Label className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Total Beneficiaries Reached (Numeric Only)</Label>
                            <Input
                                type="number"
                                placeholder="Total unique individuals"
                                value={section4.total_beneficiaries}
                                onChange={(e) => updateSection('section4', { total_beneficiaries: e.target.value })}
                                className="h-14 bg-slate-50 border-none rounded-2xl px-6 font-black text-lg text-blue-600"
                            />
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-2 flex items-center gap-2">
                                <Info className="w-3 h-3" /> Enter total unique individuals reached
                            </p>
                            <div className="mt-2 p-3 bg-amber-50 border border-amber-100 rounded-xl space-y-1">
                                <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest">System validates consistency between:</p>
                                <p className="text-[9px] text-amber-700 font-semibold">• "People reached" output entries</p>
                                <p className="text-[9px] text-amber-700 font-semibold">• Selected beneficiary categories</p>
                                <p className="text-[9px] text-amber-700 font-semibold">• Attendance records from Section 1</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4.5 Team Contribution Details (Team Only) */}
            {isTeam && (
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">4.5</div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Team Contribution Details</h3>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Member</th>
                                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Role</th>
                                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Hours</th>
                                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Sessions</th>
                                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Bennies Engaged</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {section4.team_contributions.map((cont, i) => (
                                        <tr key={i} className="hover:bg-blue-50/10 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-black text-emerald-700 border border-emerald-200 uppercase">
                                                        {cont.name.substring(0, 2)}
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-black text-slate-900 block">{cont.name}</span>
                                                        <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-0.5">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Verified
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={cont.role}
                                                    onChange={(e) => updateContributor(i, 'role', e.target.value)}
                                                    className="w-full h-10 bg-white border-2 border-slate-100 rounded-lg px-3 font-bold text-[10px] text-slate-700 outline-none"
                                                >
                                                    <option value="">Select Role...</option>
                                                    {teamRoles.map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="h-10 bg-slate-50 rounded-lg px-3 flex items-center text-[10px] font-black text-slate-500">
                                                    {cont.hours}h
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Input
                                                    type="number"
                                                    value={cont.sessions}
                                                    onChange={(e) => updateContributor(i, 'sessions', e.target.value)}
                                                    className="h-10 w-20 bg-white border-2 border-slate-100 rounded-lg px-3 text-xs font-black"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <Input
                                                    type="number"
                                                    value={cont.beneficiaries}
                                                    onChange={(e) => updateContributor(i, 'beneficiaries', e.target.value)}
                                                    className="h-10 w-20 bg-white border-2 border-slate-100 rounded-lg px-3 text-xs font-black"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 bg-blue-50/50 border-t border-slate-100">
                            <p className="text-[9px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-2">
                                <Shield className="w-3 h-3" /> Hours are linked from Section 1 Attendance and cannot be edited.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Auto-Generated Summary */}
            <div className="pt-16 border-t-2 border-slate-100">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-100">
                            <Activity className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Activity & Output Summary</h3>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                        Read-Only System Narrative
                    </div>
                </div>

                <div className="bg-white border-2 border-slate-200 rounded-[3rem] p-12 relative overflow-hidden shadow-2xl space-y-10 group">
                    <div className="absolute -bottom-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity duration-1000 rotate-12">
                        <Activity className="w-80 h-80 text-slate-900" />
                    </div>
                    <div className="relative z-10 space-y-6">
                        <span className="absolute -top-10 -left-6 text-7xl font-serif text-slate-100 select-none">“</span>
                        <div className="text-2xl font-bold text-slate-800 leading-[1.7] tracking-tight relative z-10 font-serif">
                            {autoSummary}
                        </div>
                        <span className="absolute -bottom-16 -right-6 text-7xl font-serif text-slate-100 select-none rotate-180">“</span>
                    </div>
                </div>
            </div>

            {/* Save Draft Action */}
            <div className="flex justify-center pt-10">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => saveReport(false)}
                    className="h-16 px-12 rounded-2xl border-2 border-slate-100 bg-white text-slate-500 font-extrabold uppercase tracking-widest hover:border-slate-900 hover:text-slate-900 hover:shadow-2xl hover:shadow-slate-100 transition-all flex items-center gap-4 group"
                >
                    <Save className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                    <span>Save Section 4 Progress</span>
                </Button>
            </div>
        </div>
    )
}
