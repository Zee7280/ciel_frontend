import React, { useMemo, useEffect, useState } from "react";
import { generateAISummary } from "../utils/aiSummarizer";
import { toast } from "sonner";
import { Target, Info, Trash2, AlertCircle, CheckCircle2, Lock, X, Sparkles, Loader2, Plus } from "lucide-react";
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



    const wordCount = contribution_intent_statement?.trim().split(/\s+/).filter((w: string) => w.length > 0).length || 0;

    return (
        <div className="space-y-10 pb-16">

            {/* ── Section Header ───────────────────────────────────────── */}
            <div className="space-y-5">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-report-primary text-white flex items-center justify-center shadow-xl shadow-report-primary-shadow ring-4 ring-report-primary-soft">
                        <Target className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="report-h2">SECTION 3 — SDG CONTRIBUTION MAPPING</h2>
                        <p className="report-label">How your project contributed to the Sustainable Development Goals</p>
                    </div>
                </div>
                <div className="p-5 bg-report-primary-soft rounded-2xl border border-report-primary-border flex items-start gap-3">
                    <Info className="w-4 h-4 text-report-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-slate-700 font-medium leading-relaxed">
                        <strong>Purpose:</strong> First, review the SDGs your opportunity is registered under. Then, map your specific project contribution by selecting a Primary SDG (and optional Secondary SDGs) below.
                    </p>
                </div>
                {hasErrors && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                        <div>
                            <h4 className="font-semibold text-red-900 text-sm">Please fix the following errors:</h4>
                            <ul className="mt-2 space-y-1">
                                {sectionErrors.slice(0, 5).map((error: any, idx: number) => (
                                    <li key={idx} className="text-xs text-red-700">• {error.message}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* PART A — Opportunity's Registered SDGs (Read-Only)        */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="space-y-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-black text-[10px]">A</div>
                        <h3 className="report-h3">Opportunity's Registered SDGs</h3>
                    </div>
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-500 font-black text-[9px] uppercase tracking-widest border border-slate-200">
                        <Lock className="w-3 h-3" /> Read-Only · From Opportunity
                    </span>
                </div>
                <p className="report-help pl-11">
                    These SDGs were selected when the opportunity was created. You cannot change them.
                </p>

                {/* All 17 — highlighted vs dimmed */}
                {/* <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(17, minmax(0, 1fr))" }}>
                    {ALL_SDGS.map(sdg => {
                        const isOppPrimary = sdg.num === oppPrimaryNum;
                        const isOppSecondary = oppSecondaries.includes(sdg.num);
                        return (
                            <div
                                key={sdg.num}
                                title={`SDG ${sdg.num}: ${sdg.name}${isOppPrimary ? ' (Primary)' : isOppSecondary ? ' (Secondary)' : ''}`}
                                className={clsx(
                                    "aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 border-2 cursor-default transition-all shadow-sm",
                                    isOppPrimary ? "border-white ring-4 ring-report-primary-soft scale-110 z-10 shadow-xl"
                                        : isOppSecondary ? "border-white ring-2 ring-report-primary-soft shadow-md"
                                            : "opacity-10 border-transparent grayscale hover:opacity-20 transition-opacity"
                                )}
                                style={{ backgroundColor: sdg.color }}
                            >
                                <span className="text-[10px] font-black text-white leading-none">{sdg.num}</span>
                            </div>
                        );
                    })}
                </div> */}

                {/* Detail cards for opportunity SDGs */}
                <div className="space-y-2">
                    {oppPrimaryNum > 0 && (() => {
                        const sdg = ALL_SDGS.find(s => s.num === oppPrimaryNum);
                        const sdgRecord = sdgData.find(s => s.number === oppPrimaryNum);
                        const targetId = projectData?.sdg_info?.target_id || "";
                        const indicatorId = projectData?.sdg_info?.indicator_id || "";
                        const targetDesc = sdgRecord?.targets.find(t => t.id === targetId)?.description || "";
                        const indicatorDesc = sdgRecord?.targets.flatMap(t => t.indicators).find(i => i.id === indicatorId)?.description || "";
                        if (!sdg) return null;
                        return (
                            <div className="relative overflow-hidden flex flex-col md:flex-row items-start gap-5 p-6 rounded-[2rem] border-2 transition-all shadow-lg hover:shadow-xl bg-white" style={{ borderColor: sdg.color + '50' }}>
                                {/* Soft dynamic background glow */}
                                <div className="absolute top-0 right-0 w-[400px] h-[400px] -mr-32 -mt-32 opacity-10 pointer-events-none mix-blend-multiply" style={{ backgroundColor: sdg.color, borderRadius: '50%', filter: 'blur(50px)' }} />

                                <div className="w-14 h-14 rounded-[1.25rem] flex items-center justify-center text-2xl font-black text-white shadow-md shrink-0 relative z-10" style={{ backgroundColor: sdg.color, boxShadow: `0 0 0 4px ${sdg.color}20` }}>
                                    {sdg.num}
                                </div>

                                <div className="flex-1 min-w-0 relative z-10 w-full pt-1">
                                    <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                                        <p className="text-xl font-black text-slate-900 tracking-tight">SDG {sdg.num}: {sdg.name}</p>
                                        <span className="px-3 py-1.5 rounded-lg border-2 text-[10px] font-black uppercase tracking-widest shadow-sm" style={{ borderColor: sdg.color, color: sdg.color, backgroundColor: sdg.color + '10' }}>PRIMARY SDG</span>
                                    </div>
                                    <div className="space-y-1.5 mt-3 pt-3 border-t border-slate-100">
                                        {targetId && (
                                            <p className="text-sm text-slate-600 leading-relaxed">
                                                <span className="font-extrabold text-slate-800">Target {targetId}</span>{targetDesc && <span className="text-slate-500 font-medium"> — {targetDesc}</span>}
                                            </p>
                                        )}
                                        {indicatorId && (
                                            <p className="text-sm text-slate-600 leading-relaxed">
                                                <span className="font-extrabold text-slate-800">Indicator {indicatorId}</span>{indicatorDesc && <span className="text-slate-500 font-medium"> — {indicatorDesc}</span>}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                    {oppSecondaries.map((num, i) => {
                        const sdg = ALL_SDGS.find(s => s.num === num);
                        const sdgRecord = sdgData.find(s => s.number === num);
                        const secData = projectData?.secondary_sdgs?.[i];
                        const secTargetId = secData?.target_id || "";
                        const secIndicatorId = secData?.indicator_id || "";
                        const secTargetDesc = sdgRecord?.targets.find(t => t.id === secTargetId)?.description || "";
                        const secIndicatorDesc = sdgRecord?.targets.flatMap(t => t.indicators).find(ind => ind.id === secIndicatorId)?.description || "";
                        if (!sdg) return null;
                        return (
                            <div key={num} className="flex flex-col md:flex-row items-start gap-4 p-4 rounded-2xl border-2 border-slate-100 bg-white transition-all hover:border-slate-200 hover:shadow-sm" style={{ borderLeftColor: sdg.color, borderLeftWidth: '4px' }}>
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-black text-white shadow-sm shrink-0" style={{ backgroundColor: sdg.color }}>
                                    {sdg.num}
                                </div>
                                <div className="flex-1 min-w-0 w-full pt-0.5">
                                    <div className="flex items-center justify-between gap-3 flex-wrap mb-1.5">
                                        <p className="text-base font-bold text-slate-800 tracking-tight">SDG {sdg.num}: {sdg.name}</p>
                                        <span className="px-2.5 py-1 rounded-md border text-[9px] font-black uppercase tracking-widest bg-slate-50 text-slate-500 border-slate-200">SECONDARY</span>
                                    </div>
                                    <div className="space-y-1 mt-2 pt-2 border-t border-slate-50">
                                        {secTargetId && (
                                            <p className="text-xs text-slate-600 leading-relaxed">
                                                <span className="font-bold text-slate-700">Target {secTargetId}</span>{secTargetDesc && <span className="text-slate-500"> — {secTargetDesc}</span>}
                                            </p>
                                        )}
                                        {secIndicatorId && (
                                            <p className="text-xs text-slate-600 leading-relaxed">
                                                <span className="font-bold text-slate-700">Indicator {secIndicatorId}</span>{secIndicatorDesc && <span className="text-slate-500"> — {secIndicatorDesc}</span>}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {oppPrimaryNum === 0 && (
                        <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3">
                            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                            <p className="text-xs text-amber-700 font-medium">No SDGs registered on this opportunity yet.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* PART B — Student SDG Mapping (dropdown design)            */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-report-primary flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-report-primary text-white flex items-center justify-center text-xs font-black">B</div>
                            Secondary SDGs (Optional)
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 pl-8">Critical Linkage — map your project to SDGs</p>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3 text-sm text-amber-800">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <div>
                            <strong>Important:</strong> The SDG, Target, and Indicator selected here will be{" "}
                            <span className="font-bold underline">linked</span> to your report. Please select carefully.
                        </div>
                    </div>

                    {/* C1. Primary SDG */}
                    <div>
                        <label className="block report-h3 mb-2">
                            C1. Select PRIMARY SDG <span className="text-red-500">*</span>
                        </label>
                        <select
                            className={dropdownClass}
                            value={studentPrimaryId}
                            onChange={(e) => {
                                updateSection('section3', {
                                    primary_sdg: { ...data.section3.primary_sdg, goal_number: e.target.value, target_id: '', indicator_id: '' }
                                });
                            }}
                        >
                            <option value="">Select an SDG...</option>
                            {sdgData.map(s => (
                                <option key={s.id} value={s.id}>SDG {s.number} — {s.title}</option>
                            ))}
                        </select>
                        <FieldError message={getFieldError('primary_sdg')} />
                    </div>

                    {/* C2. Target */}
                    <div className={!studentPrimaryId ? "opacity-50 pointer-events-none" : ""}>
                        <label className="block report-h3 mb-2">
                            C2. Select SDG Target <span className="text-red-500">*</span>
                        </label>
                        <select
                            className={dropdownClass}
                            value={studentTargetId}
                            onChange={(e) => {
                                updateSection('section3', {
                                    primary_sdg: { ...data.section3.primary_sdg, target_id: e.target.value, indicator_id: '' }
                                });
                            }}
                        >
                            <option value="">Select a Target...</option>
                            {availableTargets.map(t => (
                                <option key={t.id} value={t.id}>Target {t.id} — {t.description}</option>
                            ))}
                        </select>
                        <FieldError message={getFieldError('target_code')} />
                    </div>

                    {/* C3. Indicator */}
                    <div className={!studentTargetId ? "opacity-50 pointer-events-none" : ""}>
                        <label className="block report-h3 mb-2">C3. SDG Indicator</label>
                        <select
                            className={dropdownClass}
                            value={studentIndicatorId}
                            onChange={(e) => {
                                updateSection('section3', {
                                    primary_sdg: { ...data.section3.primary_sdg, indicator_id: e.target.value }
                                });
                            }}
                        >
                            <option value="">Select an Indicator...</option>
                            {availableIndicators.map(ind => (
                                <option key={ind.id} value={ind.id}>Indicator {ind.id} — {ind.description}</option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-2">Selecting an indicator improves reporting quality.</p>
                    </div>

                    {/* C3.5 Contribution Logic Statement */}
                    <div className="pt-4 border-t border-slate-100 space-y-3">
                        <label className="block report-h3">
                            Contribution Logic Statement <span className="report-help normal-case !pl-0">(80–120 words, required)</span>
                        </label>
                        <p className="report-help !pl-0 font-medium">Explain who benefits and how this activity connects to the selected SDG target. Focus on intent only — no numbers.</p>
                        <Textarea
                            placeholder="Describe what you planned to do, who will benefit, and how this activity is logically connected to the selected SDG target..."
                            className={clsx(
                                "min-h-[140px] rounded-xl border border-slate-200 p-4 text-slate-700 font-medium bg-white outline-none focus:border-report-primary focus:ring-4 focus:ring-report-primary-shadow transition-all resize-none text-sm",
                                getFieldError('contribution_intent_statement') && "border-red-200 bg-red-50"
                            )}
                            value={contribution_intent_statement || ''}
                            onChange={(e) => updateSection('section3', { contribution_intent_statement: e.target.value })}
                        />
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-1.5 w-32 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={clsx("h-full rounded-full transition-all duration-700",
                                            wordCount < 80 ? "bg-amber-400" : wordCount > 120 ? "bg-red-500" : "bg-emerald-500"
                                        )}
                                        style={{ width: `${Math.min((wordCount / 120) * 100, 100)}%` }}
                                    />
                                </div>
                                <span className={clsx("report-label !tracking-normal",
                                    wordCount >= 80 && wordCount <= 120 ? "text-emerald-600" : wordCount > 120 ? "text-red-500" : "text-slate-400"
                                )}>
                                    {wordCount} / 120 words
                                </span>
                            </div>
                        </div>
                        <FieldError message={getFieldError('contribution_intent_statement')} />
                    </div>

                    {/* C4. Secondary SDGs */}
                    <div className="pt-4 border-t border-slate-100 pb-2">
                        <label className="block report-h3 mb-1">C4. Secondary SDGs (Optional)</label>
                        <p className="report-help !pl-0 font-medium mb-4">Select other SDGs this project contributes to and provide a brief justification.</p>

                        <div className="space-y-6">
                            {secondary_sdgs.map((sdg: any, index: number) => {
                                const sdgId = sdg.goal_number?.toString() || "";
                                const sdgRecord = sdgData.find(s => s.id === sdgId);
                                const secTargets = sdgRecord?.targets || [];
                                const secTargetId = sdg.target_id || "";
                                const secIndicators = secTargets.find(t => t.id === secTargetId)?.indicators || [];
                                const justWords = sdg.justification_text?.trim().split(/\s+/).filter((w: string) => w.length > 0).length || 0;

                                return (
                                    <div key={index} className="relative group bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveSecondary(index)}
                                            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors z-10"
                                            title="Remove SDG"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>

                                        {/* Row 1: SDG Selection */}
                                        <div className="mb-6">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wider">SELECT SECONDARY SDG GOAL</label>
                                            <div className="flex items-center gap-3">
                                                {sdgRecord && (
                                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0"
                                                        style={{ backgroundColor: sdgRecord.color }}>
                                                        {sdgRecord.number}
                                                    </div>
                                                )}
                                                <select
                                                    className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 focus:border-report-primary outline-none text-xs font-bold bg-white shadow-sm"
                                                    value={sdgId}
                                                    onChange={(e) => updateSecondary(index, { goal_number: e.target.value, target_id: '', indicator_id: '' })}
                                                >
                                                    <option value="">Choose an SDG Goal...</option>
                                                    {sdgData
                                                        .filter(s => s.id !== studentPrimaryId && !secondary_sdgs.find((sec: any, idx) => idx !== index && sec.goal_number?.toString() === s.id))
                                                        .map(s => (
                                                            <option key={s.id} value={s.id}>SDG {s.number}: {s.title}</option>
                                                        ))}
                                                </select>
                                            </div>
                                        </div>

                                        {sdgRecord ? (
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {/* Target */}
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">CHOOSE TARGET</label>
                                                        <select
                                                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-report-primary outline-none text-xs font-bold bg-white shadow-sm"
                                                            value={secTargetId}
                                                            onChange={(e) => updateSecondary(index, { target_id: e.target.value, indicator_id: '' })}
                                                        >
                                                            <option value="">Select Target...</option>
                                                            {secTargets.map(t => (
                                                                <option key={t.id} value={t.id}>Target {t.id} — {t.description.substring(0, 70)}...</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* Indicator */}
                                                    <div className={clsx("transition-opacity duration-300", !secTargetId ? "opacity-30 pointer-events-none" : "opacity-100")}>
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">CHOOSE INDICATOR</label>
                                                        <select
                                                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-report-primary outline-none text-xs font-bold bg-white shadow-sm"
                                                            value={sdg.indicator_id || ""}
                                                            onChange={(e) => updateSecondary(index, { indicator_id: e.target.value })}
                                                        >
                                                            <option value="">Select Indicator...</option>
                                                            {secIndicators.map(ind => (
                                                                <option key={ind.id} value={ind.id}>Indicator {ind.id} — {ind.description.substring(0, 70)}...</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Justification */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">BRIEF JUSTIFICATION</label>
                                                        <div className="flex items-center gap-2">
                                                            <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                                                justWords >= 100 && justWords <= 150 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : justWords > 150 ? "bg-red-50 text-red-500 border-red-100" : "bg-slate-50 text-slate-400 border-slate-100"
                                                            )}>{justWords} / 150 words</span>
                                                        </div>
                                                    </div>
                                                    <textarea
                                                        className="w-full px-5 py-4 rounded-[2rem] border border-slate-200 focus:border-report-primary outline-none text-sm h-32 bg-slate-50/30 font-bold resize-none transition-all duration-300"
                                                        placeholder="How does this project specifically contribute to the selected SDG? Focus on intent and methodology."
                                                        value={sdg.justification_text || ''}
                                                        onChange={(e) => updateSection('section3', {
                                                            secondary_sdgs: secondary_sdgs.map((s: any, i: number) => i === index ? { ...s, justification_text: e.target.value } : s)
                                                        })}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="py-12 flex flex-col items-center justify-center border-t border-slate-50 mt-4 animate-pulse">
                                                <Target className="w-8 h-8 text-slate-200 mb-2" />
                                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Select a goal to continue</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {secondary_sdgs.length < 2 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        updateSection('section3', {
                                            secondary_sdgs: [...secondary_sdgs, {
                                                goal_number: null,
                                                target_id: '',
                                                indicator_id: '',
                                                justification_text: '',
                                                status: 'provisional'
                                            }]
                                        });
                                    }}
                                    className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-white hover:border-report-primary group transition-all duration-300"
                                >
                                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:bg-report-primary group-hover:border-report-primary transition-colors shadow-sm">
                                        <Plus className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-500 group-hover:text-report-primary uppercase tracking-widest">Add Secondary SDG Alignment</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Preliminary Summary ──────────────────────────────────── */}
            <div className="pt-10 border-t-2 border-slate-100 space-y-5">
                <div className="flex items-center justify-between">
                    <h3 className="report-h3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        Preliminary SDG Alignment Statement
                    </h3>
                    <div className="flex items-center gap-3">

                        <div className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest border border-slate-800">
                            Auto-Generated
                        </div>
                    </div>
                </div>
                <div className="bg-slate-50 rounded-[2rem] p-8 border-2 border-slate-100 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12" />
                    <p className="report-ai-text !text-base relative z-10">
                        "{data.section3.summary_text}"
                    </p>
                    <div className="mt-4 flex gap-4">
                        <span className="report-label">No output numbers shown</span>
                        <span className="report-label">No results claimed</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
