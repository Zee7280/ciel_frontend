import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Button } from "./ui/button";
import { useReportForm } from "../context/ReportContext";
import { useDebounce } from "@/hooks/useDebounce";
import { FieldError } from "./ui/FieldError";
import clsx from "clsx";
import React, { useEffect, useMemo, useState } from "react";
import { generateAISummary } from "../utils/aiSummarizer";
import { toast } from "sonner";
import {
    Activity, Layers, Target, Users, MapPin, Globe, CheckCircle2,
    ChevronRight, Save, Info, Plus, Trash2, Shield, PlusCircle,
    Sparkles, Loader2, AlertCircle, Lock, X as LucideX
} from "lucide-react";

export default function Section4Activities() {
    const { data, updateSection, getFieldError, validationErrors, saveReport } = useReportForm();
    const section1 = data.section1 || {};
    const section4 = data.section4 || {};
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

    // Build the list of all verified participants from Section 1 (Team Lead + Verified Members)
    const verifiedMembers = useMemo(() => {
        const members = [];
        const seenIds = new Set();

        // 1. Add Team Lead (Self)
        if (section1.team_lead?.verified) {
            const leadId = section1.team_lead.id || 'lead-self';
            members.push({
                member_id: leadId,
                name: section1.team_lead.fullName || section1.team_lead.name || 'Team Lead (You)',
                default_role: 'Team Lead',
            });
            seenIds.add(leadId);
        }

        // 2. Add Verified Team Members (excluding lead if already added)
        (section1.team_members || [])
            .filter(m => m.verified && m.id && !seenIds.has(m.id))
            .forEach((m: any) => {
                members.push({
                    member_id: m.id,
                    name: m.fullName || m.name || 'Team Member',
                    default_role: m.role || '',
                });
                seenIds.add(m.id);
            });

        // 3. Calculate hours for each member from Section 1 Attendance Logs
        return members.map(m => {
            const memberLogs = (section1.attendance_logs || []).filter((log: any) =>
                log.participantId === m.member_id || (m.member_id === 'lead-self' && !log.participantId)
            );
            const totalHours = memberLogs.reduce((acc: number, log: any) => acc + (Number(log.hours) || 0), 0);

            return {
                ...m,
                hours: totalHours.toString()
            };
        });
    }, [section1.team_lead, section1.team_members, section1.attendance_logs]);

    // Sync team_contributions whenever verified members change
    useEffect(() => {
        if (!isTeam || verifiedMembers.length === 0) return;

        // Build a map of existing contributions by member_id to preserve entered data (roles, sessions, etc)
        const existingMap = new Map(
            section4.team_contributions.map(c => [c.member_id, c])
        );

        const synced = verifiedMembers.map(vm => {
            const existing = existingMap.get(vm.member_id);
            return {
                member_id: vm.member_id,
                name: vm.name,                              // always sync name from source
                role: existing?.role || vm.default_role,   // preserve entered role or use default
                hours: vm.hours,                           // always sync calculated hours
                sessions: existing?.sessions || '',
                beneficiaries: existing?.beneficiaries || ''
            };
        });

        // Only update if something actually changed (using stringify for deep equality)
        const currentData = JSON.stringify(section4.team_contributions);
        const newData = JSON.stringify(synced);

        if (currentData !== newData) {
            updateSection('section4', { team_contributions: synced });
        }
    }, [isTeam, verifiedMembers, section4.team_contributions]);

    // ─── AI Summarization Logic ─────────────────────────────────────────────
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateAISummary = async () => {
        if (section4.activities?.length === 0) {
            toast.error("Please add some activities first");
            return;
        }

        setIsGenerating(true);
        const result = await generateAISummary("section4", section4);
        setIsGenerating(false);

        if (result.error) {
            toast.error(result.error);
        } else if (result.summary) {
            updateSection('section4', { summary_text: result.summary });
            toast.success("AI Summary generated!");
        }
    };

    const autoSummary = useMemo(() => {
        if (section4.summary_text && (section4.summary_text.length > 50 || !section4.summary_text.includes("The project delivered"))) {
            return section4.summary_text;
        }

        const activitiesStr = section4.activities.map(a => a.type === 'Other' ? (a as any).type_other || a.other_text : a.type).filter(Boolean).join(", ");
        const entries = section4.outputs.map(o => `${o.count} ${o.type}`).join(", ");

        let areaStr = section4.primary_change_area;
        if (section4.primary_change_area === 'Other') {
            const others = (section4.primary_change_area_others || []).filter(Boolean);
            if (others.length > 0) {
                areaStr = others.join(", ");
            }
        }

        return `The project delivered ${section4.total_sessions} sessions covering ${activitiesStr}, primarily focused on ${areaStr}. Engagement resulted in ${entries}, reaching a total of ${section4.total_beneficiaries} beneficiaries from the following categories: ${section4.beneficiary_categories.join(", ")}.`;
    }, [section4.activities, section4.total_sessions, section4.outputs, section4.total_beneficiaries, section4.beneficiary_categories, section4.summary_text, section4.primary_change_area, section4.primary_change_area_others]);

    useEffect(() => {
        if (section4.summary_text !== autoSummary) {
            updateSection('section4', { summary_text: autoSummary });
        }
    }, [autoSummary, section4.summary_text]);

    // ─── Automated AI Summarization ─────────────────────────────────────────
    const debouncedData = useDebounce({
        activities: section4.activities,
        outputs: section4.outputs,
        total_beneficiaries: section4.total_beneficiaries,
        categories: section4.beneficiary_categories
    }, 3000);
    const [lastAutoGeneratedFor, setLastAutoGeneratedFor] = useState('');

    useEffect(() => {
        const hasData = debouncedData.activities.length > 0 && debouncedData.outputs.length > 0;
        const currentDataKey = JSON.stringify(debouncedData);

        const canAutoGenerate =
            hasData &&
            currentDataKey !== lastAutoGeneratedFor &&
            (!section4.summary_text ||
                section4.summary_text.includes("The project delivered") ||
                section4.summary_text.length < 50);

        if (canAutoGenerate && !isGenerating) {
            setLastAutoGeneratedFor(currentDataKey);
            handleGenerateAISummary();
        }
    }, [debouncedData, section4.summary_text, isGenerating]);

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
        if (field === 'beneficiaries') {
            const total = parseInt(section4.total_beneficiaries || '0');
            const entered = parseInt(val || '0');
            if (entered > total) {
                toast.error(`Individual count cannot exceed Section Total (${total})`);
                return;
            }
        }
        const next = [...section4.team_contributions];
        next[i] = { ...next[i], [field]: val };
        updateSection('section4', { team_contributions: next });
    };

    const addOtherChangeArea = () => {
        const others = section4.primary_change_area_others || [''];
        updateSection('section4', { primary_change_area_others: [...others, ''] });
    };

    const removeOtherChangeArea = (index: number) => {
        const others = section4.primary_change_area_others || [''];
        if (others.length > 1) {
            updateSection('section4', { primary_change_area_others: others.filter((_, i) => i !== index) });
        }
    };

    const updateOtherChangeArea = (index: number, val: string) => {
        const others = [...(section4.primary_change_area_others || [''])];
        others[index] = val;
        updateSection('section4', { primary_change_area_others: others });
    };

    return (
        <div className="space-y-12 pb-16">
            {/* Header */}
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-report-primary text-white flex items-center justify-center shadow-xl shadow-report-primary-shadow ring-4 ring-report-primary-soft">
                        <Activity className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="report-h2">Section 4 — Structured Activities & Outputs</h2>
                        <p className="report-label">What Was Done and Delivered</p>
                    </div>
                </div>

                <div className="p-8 bg-report-primary-soft/80 border-2 border-report-primary-border rounded-[2.5rem] shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-report-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
                    <div className="flex items-start gap-4 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0 border border-report-primary-border/50">
                            <Target className="w-5 h-5 text-report-primary" />
                        </div>
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-black text-report-primary uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                    🎯 Purpose of This Section
                                </h3>
                                <p className="text-xs text-slate-600 font-bold leading-relaxed max-w-2xl">
                                    This section documents the tangible aspects of your project's implementation. It provides a structured record of:
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <ul className="space-y-2.5">
                                    <li className="flex items-center gap-2.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                                        <div className="w-1.5 h-1.5 rounded-full bg-report-primary" />
                                        What activities were conducted
                                    </li>
                                    <li className="flex items-center gap-2.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                                        <div className="w-1.5 h-1.5 rounded-full bg-report-primary" />
                                        What was delivered
                                    </li>
                                    <li className="flex items-center gap-2.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                                        <div className="w-1.5 h-1.5 rounded-full bg-report-primary" />
                                        Outputs Only (No Impact)
                                    </li>
                                </ul>
                                <ul className="space-y-2.5">
                                    <li className="flex items-center gap-2.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                                        <div className="w-1.5 h-1.5 rounded-full bg-report-primary" />
                                        Who was reached
                                    </li>
                                    <li className="flex items-center gap-2.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                                        <div className="w-1.5 h-1.5 rounded-full bg-report-primary" />
                                        The scale of implementation
                                    </li>
                                    <li className="flex items-center gap-2.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                                        <div className="w-1.5 h-1.5 rounded-full bg-report-primary" />
                                        Beneficiary Specificity
                                    </li>
                                </ul>
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
                        <h3 className="report-h3">Activity Overview</h3>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={addActivity}
                        className="h-9 px-4 rounded-xl bg-report-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-report-primary/90 transition-all shadow-md shadow-report-primary-shadow"
                    >
                        <PlusCircle className="w-3.5 h-3.5 mr-2" /> Add Additional Activity
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
                                <Label className="report-label">Activity Types (Required)</Label>
                                <select
                                    value={act.type || ''}
                                    onChange={(e) => updateActivity(i, 'type', e.target.value)}
                                    className={clsx(
                                        "w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 font-black text-slate-700 outline-none focus:border-report-primary-border transition-all appearance-none text-xs",
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
                                        className="w-full h-10 bg-slate-50 border-2 border-report-primary-border rounded-xl px-4 text-xs font-bold text-slate-700 outline-none focus:border-report-primary"
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
                    <h3 className="report-h3">Primary Change Area</h3>
                </div>

                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-10 shadow-sm relative group overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-40 h-40 bg-slate-50 rounded-full group-hover:bg-blue-50 transition-colors" />
                    <div className="relative z-10 space-y-6">
                        <div className="space-y-2">
                            <Label className="report-h3 !normal-case">Primary Change Area (Required)</Label>
                            <p className="report-help !pl-0">What type of change was your project primarily designed to support?</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {changeAreas.map((area) => (
                                <button
                                    key={area}
                                    type="button"
                                    onClick={() => updateSection('section4', { primary_change_area: area })}
                                    className={clsx(
                                        "px-6 py-4 rounded-2xl border-2 text-left transition-all font-black text-[10px] uppercase tracking-wider",
                                        section4.primary_change_area === area
                                            ? "border-report-primary bg-report-primary text-white shadow-lg shadow-report-primary-shadow"
                                            : "border-slate-100 bg-slate-50 text-slate-500 hover:border-report-primary-border hover:text-report-primary"
                                    )}
                                >
                                    {area}
                                </button>
                            ))}
                        </div>
                        {/* Other specify */}
                        {section4.primary_change_area === 'Other' && (
                            <div className="space-y-3">
                                {(section4.primary_change_area_others || ['']).map((val: string, idx: number) => (
                                    <div key={idx} className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                                        <input
                                            type="text"
                                            placeholder="Specify your change area..."
                                            value={val}
                                            onChange={(e) => updateOtherChangeArea(idx, e.target.value)}
                                            className="flex-1 h-11 bg-slate-50 border-2 border-report-primary-border rounded-xl px-4 text-xs font-bold text-slate-700 outline-none focus:border-report-primary"
                                        />
                                        {(section4.primary_change_area_others || ['']).length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeOtherChangeArea(idx)}
                                                className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-all"
                                            >
                                                <LucideX className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={addOtherChangeArea}
                                    className="h-8 px-3 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                                >
                                    <Plus className="w-3 h-3 mr-2" /> Add Another Area
                                </Button>
                            </div>
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
                        <h3 className="report-h3">Structured Outputs</h3>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={addOutput}
                        className="h-9 px-5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-md"
                    >
                        <PlusCircle className="w-3.5 h-3.5 mr-2" /> Add Output Row
                    </Button>
                </div>

                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-sm">
                    <div className="space-y-4">
                        {section4.outputs.map((out, i) => (
                            <div key={i} className="space-y-2 animate-in fade-in slide-in-from-left-4 duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                    <div className="md:col-span-7 space-y-2">
                                        <Label className="report-label">Output Type</Label>
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
                                        <Label className="report-label">Total Number</Label>
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
                                        className="w-full md:w-8/12 h-10 bg-slate-50 border-2 border-report-primary-border rounded-xl px-4 text-xs font-bold text-slate-700 outline-none focus:border-report-primary"
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
                    <h3 className="report-h3">Beneficiary Profile</h3>
                </div>

                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-10 shadow-sm space-y-10">
                    <div className="space-y-6">
                        <Label className="report-label">Select Categories (Select All That Apply)</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {beneficiaryGroups.map((group) => (
                                <button
                                    key={group}
                                    type="button"
                                    onClick={() => toggleBeneficiary(group)}
                                    className={clsx(
                                        "p-4 rounded-xl border-2 flex items-center justify-center text-center transition-all",
                                        section4.beneficiary_categories.includes(group)
                                            ? "border-report-primary bg-report-primary-soft text-report-primary shadow-sm"
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
                                className="w-full md:w-1/2 h-10 bg-slate-50 border-2 border-report-primary-border rounded-xl px-4 text-xs font-bold text-slate-700 outline-none focus:border-report-primary"
                            />
                        )}
                    </div>

                    <div className="pt-8 border-t border-slate-50 max-w-sm">
                        <div className="space-y-3">
                            <Label className="report-label">Total Beneficiaries Reached (Numeric Only)</Label>
                            <Input
                                type="number"
                                placeholder="Total unique individuals"
                                value={section4.total_beneficiaries}
                                onChange={(e) => updateSection('section4', { total_beneficiaries: e.target.value })}
                                className="h-14 bg-slate-50 border-none rounded-2xl px-6 font-black text-lg text-report-primary"
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
                        <h3 className="report-h3">Team Contribution Details</h3>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-4 report-label text-slate-500">Member</th>
                                        <th className="px-6 py-4 report-label text-slate-500">Role</th>
                                        <th className="px-6 py-4 report-label text-slate-500">Hours</th>
                                        <th className="px-6 py-4 report-label text-slate-500">Sessions</th>
                                        <th className="px-6 py-4 report-label text-slate-500">Beneficiaries Engaged (Individuals)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {section4.team_contributions.map((cont, i) => (
                                        <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-report-primary-soft text-report-primary flex items-center justify-center text-[10px] font-black border border-report-primary-border uppercase">
                                                        {cont.name.substring(0, 2)}
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-black text-slate-900 block">{cont.name}</span>
                                                        <span className="text-[8px] font-black text-report-primary uppercase tracking-widest flex items-center gap-0.5 mt-0.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-report-primary animate-pulse" /> Verified Member
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <select
                                                    value={cont.role}
                                                    onChange={(e) => updateContributor(i, 'role', e.target.value)}
                                                    className="w-full h-10 bg-slate-50 border-2 border-slate-100 rounded-xl px-3 font-black text-[10px] text-slate-700 outline-none focus:border-report-primary-border transition-all"
                                                >
                                                    <option value="">Select Role...</option>
                                                    {teamRoles.map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="h-10 bg-slate-100/50 rounded-xl px-4 flex items-center text-[10px] font-black text-slate-600 border border-slate-100">
                                                    {cont.hours}h
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <Input
                                                    type="number"
                                                    value={cont.sessions}
                                                    onChange={(e) => updateContributor(i, 'sessions', e.target.value)}
                                                    className="h-10 w-24 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-xs font-black focus:border-report-primary-border"
                                                />
                                            </td>
                                            <td className="px-6 py-5">
                                                <Input
                                                    type="number"
                                                    value={cont.beneficiaries}
                                                    onChange={(e) => updateContributor(i, 'beneficiaries', e.target.value)}
                                                    className="h-10 w-24 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-xs font-black focus:border-report-primary-border"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 bg-report-primary-soft/50 border-t border-slate-100">
                            <p className="report-label !text-report-primary flex items-center gap-2">
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
                        <div className="w-10 h-10 rounded-xl bg-report-primary text-white flex items-center justify-center shadow-lg shadow-report-primary-shadow">
                            <Activity className="w-6 h-6" />
                        </div>
                        <h3 className="report-h3 !text-xl !italic">Activity & Output Summary</h3>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleGenerateAISummary}
                            disabled={isGenerating || section4.activities?.length === 0}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-report-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-report-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-report-primary-shadow"
                        >
                            {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 font-black" />}
                            Improve summary with AI
                        </button>
                        <div className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest border border-slate-800">
                            Auto-Generated
                        </div>
                    </div>
                </div>

                <div className="bg-white border-2 border-slate-200 rounded-[3rem] p-12 relative overflow-hidden shadow-2xl space-y-10 group">
                    <div className="absolute -bottom-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity duration-1000 rotate-12">
                        <Activity className="w-80 h-80 text-slate-900" />
                    </div>
                    <div className="relative z-10 space-y-6">
                        <span className="absolute -top-10 -left-6 text-7xl font-serif text-slate-100 select-none">“</span>
                        <p className="report-ai-text">
                            {autoSummary}
                        </p>
                        <span className="absolute -bottom-16 -right-6 text-7xl font-serif text-slate-100 select-none rotate-180">“</span>
                    </div>
                </div>
            </div>

            <div className="flex justify-center pt-10">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => saveReport(false)}
                    className="h-16 px-12 rounded-2xl border-2 border-slate-200 bg-white text-slate-500 font-extrabold uppercase tracking-widest hover:border-slate-900 hover:text-slate-900 hover:shadow-2xl hover:shadow-slate-100 transition-all flex items-center gap-4 group"
                >
                    <Save className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                    <span>Save Section 4 Progress</span>
                </Button>
            </div>
        </div>
    )
}
