import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
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

    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateAISummary = async () => {
        setIsGenerating(true);
        // Prepare data for Section 4 summary, including Section 1 engagement context
        const summaryData = {
            ...section4,
            engagementProfile: {
                engagement_span: section1.metrics?.engagement_span || 0,
                total_verified_hours: section1.metrics?.total_verified_hours || 0,
            }
        };

        const result = await generateAISummary("section4", summaryData);
        setIsGenerating(false);

        if (result.error) {
            toast.error(result.error);
        } else if (result.summary) {
            updateSection('section4', { summary_text: result.summary });
            toast.success("Section 4 summary improved with AI!");
        }
    };

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
            const memberLogs = (section1.attendance_logs || []).filter((log: any) => {
                const rawLogId = log.participantId ? (log.participantId.includes(':') ? log.participantId.split(':').pop() : log.participantId) : '';
                return rawLogId === m.member_id || (m.member_id === 'lead-self' && !log.participantId) || log.participantId === m.member_id;
            });
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



    const autoSummary = useMemo(() => {
        // Only return early if user has manually entered a custom summary (detected by not matching the pattern)
        if (section4.summary_text && (section4.summary_text.length > 50 && !section4.summary_text.startsWith("The project conducted") && !section4.summary_text.includes("The implementation profile"))) {
            return section4.summary_text;
        }

        // 1. Implementation Profile
        const activitiesStr = section4.activities.map(a => a.type === 'Other' ? (a as any).type_other || a.other_text : a.type).filter(Boolean).join(", ");
        const deliveryMode = section4.delivery_mode || "various";
        const sessions = section4.total_sessions || "0";
        const duration = section1.metrics?.engagement_span || "0";
        const implementationText = `The project conducted ${sessions} sessions of ${activitiesStr} over ${duration} days using a ${deliveryMode} delivery mode.`;

        // 2. Output Profile
        const outputsStr = section4.outputs.map(o => {
            const label = o.type === 'Other' ? (o as any).other_label || "additional resources" : o.type;
            return `${o.count} ${label}`;
        }).filter(Boolean).join(", ");
        const outputText = outputsStr ? `Implementation produced structured outputs across multiple categories, including ${outputsStr}.` : "The project delivered structured implementation outputs.";

        // 3. Beneficiary Profile
        const beneficiaries = section4.total_beneficiaries || "0";
        const categories = section4.beneficiary_categories.join(", ");
        const beneficiaryText = `A total of ${beneficiaries} beneficiaries were reached, with participation from ${categories || "community members"}.`;

        return `${implementationText} ${outputText} ${beneficiaryText}`;
    }, [section4.activities, section4.total_sessions, section4.outputs, section4.total_beneficiaries, section4.beneficiary_categories, section4.summary_text, section4.primary_change_area, section4.primary_change_area_others, section4.delivery_mode, section1.metrics?.engagement_span]);

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
            <div className="space-y-5">

                {/* Header */}
                <div className="flex items-center gap-4">

                    <div className="w-12 h-12 rounded-xl bg-report-primary text-white flex items-center justify-center shadow-sm">
                        <Activity className="w-6 h-6" />
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">
                            Section 4 — Structured Activities & Outputs
                        </h2>
                        <p className="text-sm text-slate-500">
                            What Was Done and Delivered
                        </p>
                    </div>

                </div>


                {/* Purpose Card */}
                <div className="p-6 bg-report-primary-soft border border-report-primary-border rounded-2xl relative overflow-hidden">

                    <div className="flex items-start gap-4">

                        <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center border border-report-primary-border shadow-sm shrink-0">
                            <Target className="w-4 h-4 text-report-primary" />
                        </div>

                        <div className="space-y-4">

                            <div>
                                <h3 className="text-sm font-semibold text-report-primary uppercase tracking-wide mb-1">
                                    Purpose of This Section
                                </h3>

                                <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
                                    This section documents the tangible aspects of your project's implementation.
                                    It provides a structured record of:
                                </p>
                            </div>


                            {/* Bullet Lists */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                <ul className="space-y-2 text-sm text-slate-600">

                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-report-primary" />
                                        What activities were conducted
                                    </li>

                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-report-primary" />
                                        What was delivered
                                    </li>

                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-report-primary" />
                                        Outputs only (no impact)
                                    </li>

                                </ul>


                                <ul className="space-y-2 text-sm text-slate-600">

                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-report-primary" />
                                        Who was reached
                                    </li>

                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-report-primary" />
                                        Scale of implementation
                                    </li>

                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-report-primary" />
                                        Beneficiary specificity
                                    </li>

                                </ul>

                            </div>

                        </div>

                    </div>

                </div>


                {/* Error Block */}
                {hasErrors && (

                    <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3">

                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />

                        <div>

                            <h4 className="text-sm font-semibold text-red-800">
                                Action Required: Validation Errors
                            </h4>

                            <ul className="mt-2 space-y-1">

                                {sectionErrors.slice(0, 5).map((error: any, idx: number) => (
                                    <li key={idx} className="text-sm text-red-700">
                                        • {error.message}
                                    </li>
                                ))}

                            </ul>

                        </div>

                    </div>

                )}

            </div>

            {/* 4.1 Activity Overview */}
            <div className="space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">

                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-bold">
                            4.1
                        </div>

                        <h3 className="text-base font-semibold text-slate-900">
                            Activity Overview
                        </h3>
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        onClick={addActivity}
                        className="h-9 px-4 rounded-lg bg-report-primary text-white text-xs font-semibold uppercase tracking-wide hover:bg-report-primary/90 transition"
                    >
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Add Activity
                    </Button>

                </div>


                {/* Activities */}
                <div className="space-y-6">

                    {section4.activities.map((act: any, i: number) => (

                        <div
                            key={i}
                            className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6 relative"
                        >

                            {/* Remove button */}
                            {i > 0 && (
                                <button
                                    type="button"
                                    onClick={() => removeActivity(i)}
                                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}


                            {/* Activity Type */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                <div className="space-y-2">

                                    <Label className="text-sm font-semibold text-slate-800">
                                        Activity Type
                                    </Label>

                                    <select
                                        value={act.type || ''}
                                        onChange={(e) => updateActivity(i, 'type', e.target.value)}
                                        className={clsx(
                                            "w-full h-12 bg-slate-50 border border-slate-200 rounded-lg px-4 text-sm font-medium text-slate-700 outline-none focus:border-report-primary",
                                            getFieldError(`activities.${i}.type`) && "border-red-300"
                                        )}
                                    >
                                        <option value="">Select Activity Type...</option>
                                        {activityTypes.map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>

                                    <FieldError message={getFieldError(`activities.${i}.type`)} />

                                </div>


                                {/* Other Type */}
                                <div className="space-y-2">

                                    {(act.type === 'Other') && (
                                        <>
                                            <Label className="text-sm font-semibold text-slate-800">
                                                Specify Activity
                                            </Label>

                                            <Textarea
                                                placeholder="Specify activity..."
                                                value={act.type_other || ''}
                                                onChange={(e) => updateActivity(i, 'type_other', e.target.value)}
                                                className="w-full h-24 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 outline-none focus:border-report-primary resize-none"
                                            />
                                        </>
                                    )}

                                </div>

                            </div>


                            {/* Delivery / Sessions / Duration */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-200">

                                {/* Delivery Mode */}
                                <div className="space-y-2">

                                    <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                        Delivery Mode
                                    </Label>

                                    <select
                                        value={act.delivery_mode || section4.delivery_mode || ''}
                                        onChange={(e) => {
                                            updateActivity(i, 'delivery_mode', e.target.value);
                                            if (i === 0) updateSection('section4', { delivery_mode: e.target.value });
                                        }}
                                        className="w-full h-11 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm text-slate-700"
                                    >
                                        <option value="">Select Mode...</option>

                                        {deliveryModes.map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}

                                    </select>

                                </div>


                                {/* Sessions */}
                                <div className="space-y-2">

                                    <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                        Total Sessions
                                    </Label>

                                    <input
                                        type="number"
                                        placeholder="e.g. 5"
                                        value={act.sessions || (i === 0 ? section4.total_sessions : '') || ''}
                                        onChange={(e) => {
                                            updateActivity(i, 'sessions', e.target.value);
                                            if (i === 0) updateSection('section4', { total_sessions: e.target.value });
                                        }}
                                        className="w-full h-11 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm text-slate-700 outline-none"
                                    />

                                </div>


                                {/* Duration */}
                                <div className="space-y-2">

                                    <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                        Project Duration
                                    </Label>

                                    <div className="h-11 bg-slate-100 rounded-lg px-3 flex items-center justify-between border border-slate-200">

                                        <span className="text-sm font-medium text-slate-600">
                                            {section1.metrics.engagement_span} Days
                                        </span>

                                        <Lock className="w-4 h-4 text-slate-400" />

                                    </div>

                                    <p className="text-xs text-slate-400">
                                        Linked from Section 1 Attendance
                                    </p>

                                </div>

                            </div>

                        </div>

                    ))}

                </div>

            </div>

            {/* 4.2 Primary Change Area */}
            <div className="space-y-6">

                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-bold">
                        4.2
                    </div>

                    <h3 className="text-base font-semibold text-slate-900">
                        Primary Change Area
                    </h3>
                </div>


                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative">

                    <div className="space-y-6">

                        {/* Label */}
                        <div className="space-y-1">
                            <Label className="text-sm font-semibold text-slate-800">
                                Primary Change Area (Required)
                            </Label>

                            <p className="text-xs text-slate-500">
                                What type of change was your project primarily designed to support?
                            </p>
                        </div>


                        {/* Options */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                            {changeAreas.map((area) => (

                                <button
                                    key={area}
                                    type="button"
                                    onClick={() => updateSection('section4', { primary_change_area: area })}
                                    className={clsx(
                                        "px-4 py-3 rounded-lg border text-left transition text-xs font-semibold uppercase tracking-wide",
                                        section4.primary_change_area === area
                                            ? "border-report-primary bg-report-primary text-white"
                                            : "border-slate-200 bg-slate-50 text-slate-600 hover:border-report-primary hover:text-report-primary"
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

                                    <div key={idx} className="flex items-center gap-2">

                                        <Textarea
                                            placeholder="Specify your change area (100–200 words)..."
                                            value={val}
                                            onChange={(e) => updateOtherChangeArea(idx, e.target.value)}
                                            className="flex-1 min-h-[80px] max-h-[120px] bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 outline-none focus:border-report-primary resize-none"
                                        />

                                        {(section4.primary_change_area_others || ['']).length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeOtherChangeArea(idx)}
                                                className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition"
                                            >
                                                <LucideX className="w-4 h-4" />
                                            </button>
                                        )}

                                    </div>

                                ))}


                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={addOtherChangeArea}
                                    className="h-8 px-3 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold uppercase tracking-wide hover:bg-slate-200"
                                >
                                    <Plus className="w-3 h-3 mr-2" />
                                    Add Another Area
                                </Button>

                            </div>

                        )}


                        {/* Warning */}
                        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-3">

                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />

                            <p className="text-xs text-amber-800 font-medium leading-relaxed">
                                The system internally maps this to the SDG, Target, and Indicator locked in Section 3.
                            </p>

                        </div>

                    </div>

                </div>

            </div>

            {/* 4.3 Structured Outputs */}
            <div className="space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">

                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-bold">
                            4.3
                        </div>

                        <h3 className="text-base font-semibold text-slate-900">
                            Structured Outputs
                        </h3>
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        onClick={addOutput}
                        className="h-9 px-4 rounded-lg bg-slate-900 text-white text-xs font-semibold uppercase tracking-wide hover:bg-black transition shadow-sm"
                    >
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Add Output Row
                    </Button>

                </div>


                {/* Outputs Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">

                    <div className="space-y-5">

                        {section4.outputs.map((out, i) => (

                            <div key={i} className="space-y-2">

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">

                                    {/* Output Type */}
                                    <div className="md:col-span-5 space-y-2">

                                        <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                            Output Type
                                        </Label>

                                        <select
                                            value={out.type}
                                            onChange={(e) => updateOutput(i, 'type', e.target.value)}
                                            className="w-full h-11 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm text-slate-700 outline-none focus:border-report-primary"
                                        >
                                            <option value="">Select Output Type...</option>

                                            {outputTypes.map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}

                                        </select>

                                    </div>


                                    {/* Other specify */}
                                    <div className="md:col-span-4 space-y-2">

                                        {out.type === 'Other' ? (

                                            <>
                                                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                                    Specify Output
                                                </Label>

                                                <Textarea
                                                    placeholder="Specify output + unit..."
                                                    value={(out as any).other_label || ''}
                                                    onChange={(e) => updateOutput(i, 'other_label', e.target.value)}
                                                    className="w-full min-h-[70px] bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-report-primary resize-none"
                                                />
                                            </>

                                        ) : (

                                            <div className="h-11 hidden md:block"></div>

                                        )}

                                    </div>


                                    {/* Total Number */}
                                    <div className="md:col-span-2 space-y-2">

                                        <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                            Total Number
                                        </Label>

                                        <Input
                                            type="number"
                                            placeholder="0"
                                            value={out.count}
                                            onChange={(e) => updateOutput(i, 'count', e.target.value)}
                                            className="h-11 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm font-medium"
                                        />

                                    </div>


                                    {/* Delete Button */}
                                    <div className="md:col-span-1 pb-1 flex justify-end">

                                        <button
                                            type="button"
                                            onClick={() => removeOutput(i)}
                                            disabled={section4.outputs.length === 1}
                                            className="w-9 h-9 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 disabled:opacity-30 transition"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>

                                    </div>

                                </div>

                            </div>

                        ))}

                    </div>

                </div>

            </div>
            {/* 4.4 Beneficiary Profile */}
            <div className="space-y-6">

                {/* Header */}
                <div className="flex items-center gap-3">

                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-bold">
                        4.4
                    </div>

                    <h3 className="text-base font-semibold text-slate-900">
                        Beneficiary Profile
                    </h3>

                </div>


                {/* Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-10">


                    {/* Category Selection */}
                    <div className="space-y-5">

                        <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            Select Categories (Select All That Apply)
                        </Label>


                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

                            {beneficiaryGroups.map((group) => (

                                <button
                                    key={group}
                                    type="button"
                                    onClick={() => toggleBeneficiary(group)}
                                    className={clsx(
                                        "px-4 py-4 rounded-lg border text-center transition text-xs font-semibold uppercase tracking-wide",
                                        section4.beneficiary_categories.includes(group)
                                            ? "border-report-primary bg-report-primary-soft text-report-primary"
                                            : "border-slate-200 bg-slate-50 text-slate-600 hover:border-report-primary hover:text-report-primary"
                                    )}
                                >
                                    {group}
                                </button>

                            ))}

                        </div>


                        {/* Other Beneficiary */}
                        {section4.beneficiary_categories.includes('Other') && (

                            <Textarea
                                placeholder="Specify beneficiary group..."
                                value={section4.beneficiary_other || ''}
                                onChange={(e) => updateSection('section4', { beneficiary_other: e.target.value })}
                                className="w-full md:w-[420px] min-h-[70px] bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 outline-none focus:border-report-primary resize-none"
                            />

                        )}

                    </div>



                    {/* Divider */}
                    <div className="border-t border-slate-200 pt-8">


                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">


                            {/* Total Beneficiaries */}
                            <div className="space-y-3">

                                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                    Total Beneficiaries Reached (Numeric Only)
                                </Label>

                                <Input
                                    type="number"
                                    placeholder="Total unique individuals"
                                    value={section4.total_beneficiaries}
                                    onChange={(e) => updateSection('section4', { total_beneficiaries: e.target.value })}
                                    className="h-12 bg-slate-50 border border-slate-200 rounded-lg px-4 text-sm font-semibold text-slate-800"
                                />

                                <p className="text-xs text-slate-400 flex items-center gap-2">
                                    <Info className="w-3 h-3" />
                                    Enter total unique individuals reached
                                </p>

                            </div>



                            {/* System Validation Card */}
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">

                                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                                    System validates consistency between:
                                </p>

                                <ul className="text-xs text-amber-700 space-y-1">

                                    <li>• "People reached" output entries</li>
                                    <li>• Selected beneficiary categories</li>
                                    <li>• Attendance records from Section 1</li>

                                </ul>

                            </div>
                        </div>

                    </div>

                </div>

            </div>

            {/* 4.5 Team Contribution Details (Team Only) */}
            {isTeam && (
                <div className="space-y-6">

                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-bold">
                            4.5
                        </div>

                        <h3 className="text-base font-semibold text-slate-900">
                            Team Contribution Details
                        </h3>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

                        <div className="overflow-x-auto">

                            <table className="w-full text-left text-sm">

                                <thead className="bg-slate-50 border-b border-slate-200">

                                    <tr className="text-xs font-semibold text-slate-600 uppercase tracking-wide">

                                        <th className="px-6 py-4">Member</th>
                                        <th className="px-6 py-4">Role</th>
                                        <th className="px-6 py-4">Hours</th>
                                        <th className="px-6 py-4">Sessions</th>
                                        <th className="px-6 py-4">Beneficiaries Engaged</th>

                                    </tr>

                                </thead>


                                <tbody className="divide-y divide-slate-100">

                                    {section4.team_contributions.map((cont, i) => (

                                        <tr key={i} className="hover:bg-slate-50 transition">

                                            <td className="px-6 py-4">

                                                <div className="flex items-center gap-3">

                                                    <div className="w-9 h-9 rounded-lg bg-report-primary-soft text-report-primary flex items-center justify-center text-xs font-bold border border-report-primary-border uppercase">
                                                        {cont.name.substring(0, 2)}
                                                    </div>

                                                    <div>

                                                        <span className="text-sm font-semibold text-slate-900 block">
                                                            {cont.name}
                                                        </span>

                                                        <span className="text-[10px] text-report-primary flex items-center gap-1 mt-0.5 font-semibold">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-report-primary animate-pulse" />
                                                            Verified Member
                                                        </span>

                                                    </div>

                                                </div>

                                            </td>


                                            <td className="px-6 py-4">

                                                <select
                                                    value={cont.role}
                                                    onChange={(e) => updateContributor(i, 'role', e.target.value)}
                                                    className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-xs text-slate-700 outline-none focus:border-report-primary"
                                                >

                                                    <option value="">Select Role...</option>

                                                    {teamRoles.map(r => (
                                                        <option key={r} value={r}>{r}</option>
                                                    ))}

                                                </select>

                                            </td>


                                            <td className="px-6 py-4">

                                                <div className="h-10 bg-slate-100 rounded-lg px-3 flex items-center text-xs font-semibold text-slate-600 border border-slate-200">
                                                    {cont.hours}h
                                                </div>

                                            </td>


                                            <td className="px-6 py-4">

                                                <Input
                                                    type="number"
                                                    value={cont.sessions}
                                                    onChange={(e) => updateContributor(i, 'sessions', e.target.value)}
                                                    className="h-10 w-24 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm"
                                                />

                                            </td>


                                            <td className="px-6 py-4">

                                                <Input
                                                    type="number"
                                                    value={cont.beneficiaries}
                                                    onChange={(e) => updateContributor(i, 'beneficiaries', e.target.value)}
                                                    className="h-10 w-24 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm"
                                                />

                                            </td>

                                        </tr>

                                    ))}

                                </tbody>

                            </table>

                        </div>


                        <div className="p-4 bg-slate-50 border-t border-slate-200">

                            <p className="text-xs text-slate-600 flex items-center gap-2">

                                <Shield className="w-3.5 h-3.5 text-slate-500" />

                                Hours are linked from Section 1 Attendance and cannot be edited.

                            </p>

                        </div>

                    </div>

                </div>
            )}



            {/* Auto-Generated Summary */}
            <div className="pt-14 border-t border-slate-200">

                <div className="flex items-center justify-between mb-6">

                    <div className="flex items-center gap-3">

                        <div className="w-9 h-9 rounded-lg bg-report-primary text-white flex items-center justify-center shadow-sm">
                            <Activity className="w-5 h-5" />
                        </div>

                        <h3 className="text-lg font-semibold text-slate-900 italic">
                            Activity & Output Summary
                        </h3>

                    </div>


                    <div className="flex items-center gap-3">

                        <button
                            type="button"
                            onClick={handleGenerateAISummary}
                            disabled={isGenerating}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-report-primary text-white text-xs font-semibold uppercase tracking-wide hover:opacity-90 disabled:opacity-40 transition"
                        >

                            {isGenerating
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Sparkles className="w-4 h-4" />
                            }

                            {isGenerating ? "Generating…" : "Improve with AI"}

                        </button>


                        <div className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold uppercase tracking-wide">
                            Live Preview
                        </div>

                    </div>

                </div>



                <div className="bg-white border border-slate-200 rounded-xl p-8 relative shadow-sm">

                    <div className="relative z-10">

                        <p className="report-ai-text text-sm leading-relaxed text-slate-700">
                            {autoSummary}
                        </p>

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
