import React, { useMemo, useEffect, useState } from "react";
import { generateAISummary } from "../utils/aiSummarizer";
import { toast } from "sonner";
import { Target, Info, Trash2, AlertCircle, CheckCircle2, Lock, X, Sparkles, Plus, Layers } from "lucide-react";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { useReportForm } from "../context/ReportContext";
import { useDebounce } from "@/hooks/useDebounce";
import { FieldError } from "./ui/FieldError";
import { sdgData } from "@/utils/sdgData";
import clsx from "clsx";

interface Section3Props {
    projectData: any;
}

// All 17 SDGs with official UN colors (for the read-only grid)
const ALL_SDGS = [
    { num: 1, color: "#E5243B", name: "No Poverty" },
    { num: 2, color: "#DDA63A", name: "Zero Hunger" },
    { num: 3, color: "#4C9F38", name: "Good Health & Well-Being" },
    { num: 4, color: "#C5192D", name: "Quality Education" },
    { num: 5, color: "#FF3A21", name: "Gender Equality" },
    { num: 6, color: "#26BDE2", name: "Clean Water & Sanitation" },
    { num: 7, color: "#FCC30B", name: "Affordable & Clean Energy" },
    { num: 8, color: "#A21942", name: "Decent Work & Economic Growth" },
    { num: 9, color: "#FD6925", name: "Industry, Innovation & Infrastructure" },
    { num: 10, color: "#DD1367", name: "Reduced Inequalities" },
    { num: 11, color: "#FD9D24", name: "Sustainable Cities & Communities" },
    { num: 12, color: "#BF8B2E", name: "Responsible Consumption & Production" },
    { num: 13, color: "#3F7E44", name: "Climate Action" },
    { num: 14, color: "#0A97D9", name: "Life Below Water" },
    { num: 15, color: "#56C02B", name: "Life on Land" },
    { num: 16, color: "#00689D", name: "Peace, Justice & Strong Institutions" },
    { num: 17, color: "#19486A", name: "Partnerships for the Goals" },
];

const dropdownClass = "w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-report-primary-border focus:ring-8 focus:ring-report-primary-soft/50 outline-none font-medium bg-slate-50 text-slate-800 text-sm transition-all";

export default function Section3SDGMapping({ projectData }: Section3Props) {
    const { data, updateSection, getFieldError, validationErrors } = useReportForm();
    const { section3 } = data;
    const { contribution_intent_statement, secondary_sdgs } = section3;

    const sectionErrors = validationErrors['section3'] || [];
    const hasErrors = sectionErrors.length > 0;

    // ── Opportunity SDGs (Part A – read-only display) ─────────────────────────
    const oppPrimaryNum = Number(String(projectData?.sdg_info?.sdg_id || "").replace(/\D/g, "")) || 0;
    const oppSecondaries: number[] = (projectData?.secondary_sdgs || [])
        .map((s: any) => Number(String(s?.sdg_id || "").replace(/\D/g, "")))
        .filter(Boolean);

    // ── Student primary SDG state (Part B – dropdowns) ────────────────────────
    const studentPrimaryId = data.section3.primary_sdg.goal_number?.toString() || "";
    const studentTargetId = data.section3.primary_sdg.target_id || "";
    const studentIndicatorId = data.section3.primary_sdg.indicator_id || "";

    const selectedSDGRecord = sdgData.find(s => s.id === studentPrimaryId);
    const availableTargets = selectedSDGRecord?.targets || [];
    const availableIndicators = availableTargets.find(t => t.id === studentTargetId)?.indicators || [];

    const handleRemoveSecondary = (index: number) => {
        const updated = [...secondary_sdgs];
        updated.splice(index, 1);
        updateSection('section3', { secondary_sdgs: updated });
    };

    const updateSecondary = (index: number, payload: Partial<(typeof secondary_sdgs)[0]>) => {
        const updated = secondary_sdgs.map((item, i) =>
            i === index ? { ...item, ...payload } : item
        );
        updateSection('section3', { secondary_sdgs: updated });
    };



    const autoSummary = useMemo(() => {
        const currentSummary = data.section3.summary_text || "";
        // If user already edited the summary significantly, don't overwrite it
        if (currentSummary && (currentSummary.length > 100 || !currentSummary.includes("This project is aligned with SDG"))) {
            return currentSummary;
        }

        const goalNum = oppPrimaryNum || studentPrimaryId || "X";
        const target = projectData?.sdg_info?.target_id || studentTargetId || "X.X";
        const indicator = projectData?.sdg_info?.indicator_id || studentIndicatorId || "X.X.X";
        return `This project is aligned with SDG ${goalNum}, Target ${target}, Indicator ${indicator}. The planned intervention focuses on the intended contribution pathway described above. Final validation of indicator-level contribution will be determined after measurable outputs and outcomes are submitted in Sections 4 and 5.`;
    }, [projectData, oppPrimaryNum, studentPrimaryId, studentTargetId, studentIndicatorId]);

    useEffect(() => {
        if (data.section3.summary_text !== autoSummary) {
            updateSection('section3', { summary_text: autoSummary });
        }
    }, [autoSummary, data.section3.summary_text]);



    const wordCount = (contribution_intent_statement || "").trim().split(/\s+/).filter((w: string) => w).length;

    return (
        <div className="space-y-10 pb-16">

            {/* ── Section Header ───────────────────────────────────────── */}
            <div className="space-y-6">

                {/* Header */}
                <div className="flex items-center gap-4">

                    <div className="w-12 h-12 rounded-xl bg-report-primary text-white flex items-center justify-center shadow-sm">
                        <Target className="w-6 h-6" />
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">
                            Section 3 — SDG Contribution Mapping
                        </h2>
                        <p className="text-sm text-slate-500">
                            Sustainability Alignment & Intent
                        </p>
                    </div>

                </div>


                {/* Purpose Card */}
                <div className="p-6 bg-report-primary-soft border border-report-primary-border rounded-2xl relative overflow-hidden">

                    <div className="flex items-start gap-4">

                        <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center border border-report-primary-border shadow-sm shrink-0">
                            <Info className="w-4 h-4 text-report-primary" />
                        </div>

                        <div className="space-y-4">

                            <div>
                                <h3 className="text-sm font-semibold text-report-primary uppercase tracking-wide mb-1">
                                    Purpose of This Section
                                </h3>

                                <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
                                    This section establishes the technical and moral alignment of your project with the Global Goals.
                                    It provides a structured framework for:
                                </p>
                            </div>


                            {/* Bullet Lists */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                <ul className="space-y-2 text-sm text-slate-600">

                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-report-primary" />
                                        Reviewing opportunity-level SDGs
                                    </li>

                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-report-primary" />
                                        Selecting a project-specific Primary SDG
                                    </li>

                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-report-primary" />
                                        Defining the contribution pathway
                                    </li>

                                </ul>


                                <ul className="space-y-2 text-sm text-slate-600">

                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-report-primary" />
                                        Mapping Secondary Goal alignments
                                    </li>

                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-report-primary" />
                                        Standardizing UN indicator reporting
                                    </li>

                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-report-primary" />
                                        Synthesizing your alignment logic
                                    </li>

                                </ul>

                            </div>

                        </div>

                    </div>

                </div>


                {/* Validation Errors */}
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

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 3.1 — Opportunity's Registered SDGs (Read-Only)          */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="space-y-6">

                {/* Section Header */}
                <div className="flex items-center justify-between">

                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-bold">
                            3.1
                        </div>

                        <h3 className="text-base font-semibold text-slate-900">
                            Opportunity's Registered SDGs
                        </h3>
                    </div>

                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100 text-slate-500 text-[10px] font-semibold uppercase tracking-wide border border-slate-200">
                        <Lock className="w-3 h-3" />
                        Locked · From Admin
                    </span>

                </div>


                {/* Description */}
                <p className="text-sm text-slate-500">
                    These SDGs were selected when the opportunity was created. You cannot change them.
                </p>


                {/* Detail cards for opportunity SDGs */}
                <div className="space-y-4">

                    {/* Primary SDG */}
                    {oppPrimaryNum > 0 && (() => {

                        const sdg = ALL_SDGS.find(s => s.num === oppPrimaryNum);
                        const sdgRecord = sdgData.find(s => s.number === oppPrimaryNum);

                        const targetId = projectData?.sdg_info?.target_id || "";
                        const indicatorId = projectData?.sdg_info?.indicator_id || "";

                        const targetDesc =
                            sdgRecord?.targets?.find(t => t.id === targetId)?.description || "";

                        const indicatorDesc =
                            sdgRecord?.targets
                                ?.flatMap(t => t.indicators || [])
                                .find(i => i.id === indicatorId)?.description || "";

                        if (!sdg) return null;

                        return (

                            <div
                                className="relative overflow-hidden flex flex-col md:flex-row items-stretch gap-6 p-6 rounded-2xl border bg-white shadow-sm hover:shadow-md transition duration-300"
                                style={{ borderColor: sdg.color + "20" }}
                            >

                                {/* Background glow */}
                                <div
                                    className="absolute -top-24 -right-24 w-64 h-64 opacity-[0.03] pointer-events-none transition-opacity group-hover:opacity-[0.05]"
                                    style={{
                                        backgroundColor: sdg.color,
                                        borderRadius: "50%",
                                        filter: "blur(60px)"
                                    }}
                                />

                                {/* SDG Number Side */}
                                <div
                                    className="w-16 h-16 md:w-20 md:h-auto rounded-xl flex items-center justify-center report-h3 !text-2xl font-black"
                                    style={{ backgroundColor: sdg.color, boxShadow: `inset 0 2px 4px rgba(0,0,0,0.1)` }}
                                >
                                    {sdg.num}
                                </div>

                                {/* Content */}
                                <div className="flex-1 w-full space-y-4">

                                    <div className="flex items-start justify-between flex-wrap gap-3">
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: sdg.color }}>
                                                Primary Alignment
                                            </p>
                                            <h4 className="text-lg font-bold text-slate-900 leading-tight">
                                                SDG {sdg.num}: {sdg.name}
                                            </h4>
                                        </div>

                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-100">
                                            <CheckCircle2 className="w-3 h-3" />
                                            VERIFIED
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 pt-4 border-t border-slate-100">

                                        {targetId && (
                                            <div className="flex gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                                                    <Target className="w-4 h-4 text-slate-400" />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Target {targetId}</p>
                                                    <p className="text-sm text-slate-600 leading-snug">{targetDesc || "No description provided."}</p>
                                                </div>
                                            </div>
                                        )}

                                        {indicatorId && (
                                            <div className="flex gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                                                    <Layers className="w-4 h-4 text-slate-400" />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Indicator {indicatorId}</p>
                                                    <p className="text-sm text-slate-600 leading-snug">{indicatorDesc || "No description provided."}</p>
                                                </div>
                                            </div>
                                        )}

                                    </div>

                                </div>

                            </div>

                        );

                    })()}


                    {/* Secondary SDGs */}
                    {oppSecondaries.map((num, i) => {

                        const sdg = ALL_SDGS.find(s => s.num === num);
                        const sdgRecord = sdgData.find(s => s.number === num);

                        const secData = projectData?.secondary_sdgs?.[i];

                        const secTargetId = secData?.target_id || "";
                        const secIndicatorId = secData?.indicator_id || "";

                        const secTargetDesc =
                            sdgRecord?.targets?.find(t => t.id === secTargetId)?.description || "";

                        const secIndicatorDesc =
                            sdgRecord?.targets
                                ?.flatMap(t => t.indicators || [])
                                .find(ind => ind.id === secIndicatorId)?.description || "";

                        if (!sdg) return null;

                        return (

                            <div
                                key={num}
                                className="relative overflow-hidden flex flex-col md:flex-row items-center gap-4 p-5 rounded-xl border bg-slate-50/50 hover:bg-white border-slate-200 transition-all duration-300"
                            >
                                {/* SDG Number Side */}
                                <div
                                    className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold text-white shadow-md shrink-0"
                                    style={{ backgroundColor: sdg.color }}
                                >
                                    {sdg.num}
                                </div>

                                {/* Content */}
                                <div className="flex-1 w-full">
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="text-sm font-bold text-slate-800">
                                            SDG {sdg.num}: {sdg.name}
                                        </h4>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            Secondary Alignment
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                                        {secTargetId && (
                                            <span className="flex items-center gap-1">
                                                <span className="font-bold text-slate-700">Target {secTargetId}:</span> {secTargetDesc || "Registered Target"}
                                            </span>
                                        )}
                                        {secIndicatorId && (
                                            <span className="flex items-center gap-1 pl-4 border-l border-slate-200">
                                                <span className="font-bold text-slate-700">Indicator {secIndicatorId}</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                        );

                    })}


                    {/* No SDGs Warning */}
                    {oppPrimaryNum === 0 && (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />

                            <p className="text-sm text-amber-800">
                                No SDGs registered on this opportunity yet.
                            </p>
                        </div>
                    )}


                    <div className="pt-8 border-t border-slate-100 space-y-4">

                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-slate-900">
                                3.1.1 Contribution Logic Statement
                            </Label>
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                                Required
                            </span>
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed">
                            Explain the "Pathway to Change" — how do your activities directly lead to the selected SDG Target? Consider who benefits and what specific shift occurs.
                        </p>

                        <div className="relative">
                            <Textarea
                                placeholder="Describe the planned contribution pathway..."
                                className={clsx(
                                    "min-h-[160px] rounded-xl border border-slate-200 bg-slate-50/30 p-4 text-sm focus:bg-white transition-all focus:ring-8 focus:ring-report-primary-soft/50 focus:border-report-primary-border",
                                    getFieldError('contribution_intent_statement') && "border-red-300"
                                )}
                                value={contribution_intent_statement || ''}
                                onChange={(e) => updateSection('section3', { contribution_intent_statement: e.target.value })}
                            />

                            <div className="absolute bottom-4 right-4 flex items-center gap-3 bg-white/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                                <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={clsx(
                                            "h-full transition-all",
                                            wordCount < 100 ? "bg-amber-400"
                                                : wordCount > 200 ? "bg-red-500"
                                                    : "bg-emerald-500"
                                        )}
                                        style={{ width: `${Math.min((wordCount / 200) * 100, 100)}%` }}
                                    />
                                </div>

                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                                    {wordCount} / 200 Words
                                </span>
                            </div>
                        </div>

                        <FieldError message={getFieldError('contribution_intent_statement')} />

                    </div>
                </div>

            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 3.2 — Student SDG Mapping (Implementation)              */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="space-y-6">

                {/* Section Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-bold">
                            3.2
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-semibold text-slate-900">
                                Optional Student SDG Mapping
                            </h3>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                If you wish to align your project with additional SDGs, you may select up to two.
                                Please briefly explain how your activities contribute to achieving each selected SDG.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-8">

                    {/* Warning Card */}
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-semibold text-amber-900">Important Selection Guidance</p>
                            <p className="text-sm text-amber-800 leading-relaxed">
                                The SDG, Target, and Indicator selected here will be directly linked to your project's accountability profile. Ensure these align with your planned activities in Section 4.
                            </p>
                        </div>
                    </div>


                    {/* C1 C2 C3 Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Primary SDG */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-800 mb-2">
                                C1. Select Primary SDG <span className="text-red-500">*</span>
                            </label>

                            <select
                                className={dropdownClass}
                                value={studentPrimaryId}
                                onChange={(e) => {
                                    updateSection('section3', {
                                        primary_sdg: {
                                            ...data.section3.primary_sdg,
                                            goal_number: e.target.value,
                                            target_id: '',
                                            indicator_id: ''
                                        }
                                    });
                                }}
                            >
                                <option value="">Select SDG...</option>
                                {sdgData.map(s => (
                                    <option key={s.id} value={s.id}>
                                        SDG {s.number} — {s.title}
                                    </option>
                                ))}
                            </select>

                            <FieldError message={getFieldError('primary_sdg')} />
                        </div>


                        {/* Target */}
                        <div className={!studentPrimaryId ? "opacity-50 pointer-events-none" : ""}>
                            <label className="block text-sm font-semibold text-slate-800 mb-2">
                                C2. Select SDG Target
                            </label>

                            <select
                                className={dropdownClass}
                                value={studentTargetId}
                                onChange={(e) => {
                                    updateSection('section3', {
                                        primary_sdg: {
                                            ...data.section3.primary_sdg,
                                            target_id: e.target.value,
                                            indicator_id: ''
                                        }
                                    });
                                }}
                            >
                                <option value="">Select Target...</option>
                                {availableTargets.map(t => (
                                    <option key={t.id} value={t.id}>
                                        Target {t.id} — {t.description}
                                    </option>
                                ))}
                            </select>

                            <FieldError message={getFieldError('target_code')} />
                        </div>


                        {/* Indicator */}
                        <div className={!studentTargetId ? "opacity-50 pointer-events-none" : ""}>
                            <label className="block text-sm font-semibold text-slate-800 mb-2">
                                C3. SDG Indicator
                            </label>

                            <select
                                className={dropdownClass}
                                value={studentIndicatorId}
                                onChange={(e) => {
                                    updateSection('section3', {
                                        primary_sdg: {
                                            ...data.section3.primary_sdg,
                                            indicator_id: e.target.value
                                        }
                                    });
                                }}
                            >
                                <option value="">Select Indicator...</option>
                                {availableIndicators.map(ind => (
                                    <option key={ind.id} value={ind.id}>
                                        Indicator {ind.id} — {ind.description}
                                    </option>
                                ))}
                            </select>

                            <p className="text-xs text-slate-500 mt-2">
                                Selecting an indicator improves reporting quality.
                            </p>
                        </div>

                    </div>


                    {/* Contribution Statement */}
                    <div className="pt-8 border-t border-slate-100 space-y-4">

                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-slate-900">
                                3.2.1 Contribution Logic Statement
                            </Label>
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                                Required
                            </span>
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed">
                            Explain the "Pathway to Change" — how do your activities directly lead to the selected SDG Target? Consider who benefits and what specific shift occurs.
                        </p>

                        <div className="relative">
                            <Textarea
                                placeholder="Describe the planned contribution pathway..."
                                className={clsx(
                                    "min-h-[160px] rounded-xl border border-slate-200 bg-slate-50/30 p-4 text-sm focus:bg-white transition-all focus:ring-8 focus:ring-report-primary-soft/50 focus:border-report-primary-border",
                                    getFieldError('contribution_intent_statement') && "border-red-300"
                                )}
                                value={contribution_intent_statement || ''}
                                onChange={(e) => updateSection('section3', { contribution_intent_statement: e.target.value })}
                            />

                            <div className="absolute bottom-4 right-4 flex items-center gap-3 bg-white/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                                <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={clsx(
                                            "h-full transition-all",
                                            wordCount < 100 ? "bg-amber-400"
                                                : wordCount > 200 ? "bg-red-500"
                                                    : "bg-emerald-500"
                                        )}
                                        style={{ width: `${Math.min((wordCount / 200) * 100, 100)}%` }}
                                    />
                                </div>

                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                                    {wordCount} / 200 Words
                                </span>
                            </div>
                        </div>

                        <FieldError message={getFieldError('contribution_intent_statement')} />

                    </div>


                    {/* Secondary SDGs */}
                    <div className="pt-8 border-t border-slate-100 space-y-6">

                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-sm font-semibold text-slate-900">
                                    3.2.2 Secondary SDG Mapping (Optional)
                                </Label>
                                <p className="text-xs text-slate-500 mt-1">
                                    Map additional goals impacted by this project.
                                </p>
                            </div>
                        </div>


                        {(secondary_sdgs || []).map((sdg: any, index: number) => {

                            const sdgId = sdg.goal_number?.toString() || "";
                            const sdgRecord = sdgData.find(s => s.id === sdgId);
                            const secTargets = sdgRecord?.targets || [];
                            const secTargetId = sdg.target_id || "";
                            const secIndicators = secTargets.find(t => t.id === secTargetId)?.indicators || [];

                            const justWords = (sdg.justification_text || "").trim().split(/\s+/).filter((w: string) => w).length;

                            return (

                                <div key={index} className="relative group p-6 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 space-y-5">

                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-report-primary" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                                Secondary SDG Alignment #{index + 1}
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleRemoveSecondary(index)}
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>


                                    {/* SDG Goal Selector */}
                                    <div className="space-y-2">
                                        <select
                                            className={dropdownClass}
                                            value={sdgId}
                                            onChange={(e) =>
                                                updateSecondary(index, {
                                                    goal_number: e.target.value,
                                                    target_id: '',
                                                    indicator_id: ''
                                                })
                                            }
                                        >
                                            <option value="">Choose SDG Goal...</option>

                                            {sdgData
                                                .filter(s => s.id !== studentPrimaryId)
                                                .map(s => (
                                                    <option key={s.id} value={s.id}>
                                                        SDG {s.number} — {s.title}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>


                                    {sdgRecord && (
                                        <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-5">
                                            <div className="grid md:grid-cols-2 gap-4">

                                                {/* Target */}
                                                <div className="space-y-1.5">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-1">UN Target</p>
                                                    <select
                                                        className={dropdownClass}
                                                        value={secTargetId}
                                                        onChange={(e) =>
                                                            updateSecondary(index, {
                                                                target_id: e.target.value,
                                                                indicator_id: ''
                                                            })
                                                        }
                                                    >
                                                        <option value="">Select Target...</option>

                                                        {secTargets.map(t => (
                                                            <option key={t.id} value={t.id}>
                                                                Target {t.id} — {t.description}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>


                                                {/* Indicator */}
                                                <div className="space-y-1.5">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-1">UN Indicator</p>
                                                    <select
                                                        className={dropdownClass}
                                                        value={sdg.indicator_id || ""}
                                                        onChange={(e) =>
                                                            updateSecondary(index, {
                                                                indicator_id: e.target.value
                                                            })
                                                        }
                                                    >
                                                        <option value="">Select Indicator...</option>

                                                        {secIndicators.map(ind => (
                                                            <option key={ind.id} value={ind.id}>
                                                                Indicator {ind.id} — {ind.description}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                            </div>


                                            {/* Justification */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-1">Alignment Justification</p>
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        {justWords} / 200 Words
                                                    </span>
                                                </div>
                                                <Textarea
                                                    className="w-full min-h-[100px] p-4 rounded-xl border border-slate-200 text-sm resize-none bg-slate-50/30 focus:bg-white focus:ring-8 focus:ring-report-primary-soft/50 transition-all"
                                                    placeholder="Briefly explain how this project supports this secondary goal..."
                                                    value={sdg.justification_text || ''}
                                                    onChange={(e) =>
                                                        updateSection('section3', {
                                                            secondary_sdgs: (secondary_sdgs || []).map((s, i) =>
                                                                i === index
                                                                    ? { ...s, justification_text: e.target.value }
                                                                    : s
                                                            )
                                                        })
                                                    }
                                                />
                                            </div>
                                        </div>
                                    )}

                                </div>

                            );

                        })}


                        {/* Add Secondary */}
                        {secondary_sdgs.length < 2 && (

                            <button
                                type="button"
                                onClick={() => {
                                    updateSection('section3', {
                                        secondary_sdgs: [
                                            ...(secondary_sdgs || []),
                                            {
                                                goal_number: null,
                                                target_id: '',
                                                indicator_id: '',
                                                justification_text: '',
                                                status: 'provisional'
                                            }
                                        ]
                                    });
                                }}
                                className="w-full flex items-center justify-center gap-2 px-6 py-5 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-report-primary hover:text-report-primary hover:bg-report-primary-soft/30 transition-all duration-300 group"
                            >
                                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-white group-hover:border-report-primary-border transition-colors">
                                    <Plus className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-semibold tracking-wide">Add Secondary SDG Alignment</span>
                            </button>

                        )}

                    </div>

                </div>
            </div>

            {/* ── Preliminary Summary ──────────────────────────────────── */}
            <div className="pt-12 border-t border-slate-200">

                <div className="bg-white border-2 border-slate-100 rounded-2xl p-8 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">

                    {/* Background Detail */}
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hove:opacity-[0.05]">
                        <Sparkles className="w-32 h-32 text-report-primary" />
                    </div>

                    <div className="relative space-y-6">

                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-report-primary rounded-full" />
                                <h3 className="report-h3 !text-lg">
                                    Preliminary SDG Alignment Statement
                                </h3>
                            </div>

                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                System Synthesis
                            </div>
                        </div>

                        {/* Summary Content */}
                        <div className="p-6 rounded-xl bg-slate-50 border border-slate-100">
                            <p className="report-ai-text !text-base">
                                "{data.section3.summary_text}"
                            </p>
                        </div>

                        {/* Meta Tags */}
                        <div className="flex flex-wrap gap-3">
                            {[
                                { label: "Standardized Formatting", icon: CheckCircle2 },
                                { label: "No Performance Claims", icon: Info },
                                { label: "Structural Validation Only", icon: Layers }
                            ].map((tag, idx) => (
                                <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                    <tag.icon className="w-3 h-3 text-report-primary" />
                                    {tag.label}
                                </div>
                            ))}
                        </div>

                        <p className="text-[11px] text-slate-500 leading-relaxed max-w-2xl">
                            <strong>Note:</strong> This statement is programmatically generated based on your selections above. It will be finalized and combined with measurable impact data once Sections 4 and 5 are completed.
                        </p>

                    </div>

                </div>

            </div>
        </div>
    );
}
