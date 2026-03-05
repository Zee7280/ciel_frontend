"use client";
import { Target, Info, Trash2, AlertCircle, CheckCircle2, Lock, X } from "lucide-react";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import { sdgData } from "@/utils/sdgData";
import React, { useMemo, useEffect } from "react";
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

const dropdownClass = "w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none font-medium bg-white text-slate-800 text-sm";

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
    const studentTargetId = data.section3.primary_sdg.target_code || "";
    const studentIndicatorId = data.section3.primary_sdg.indicator_code || "";

    const selectedSDGRecord = sdgData.find(s => s.id === studentPrimaryId);
    const availableTargets = selectedSDGRecord?.targets || [];
    const availableIndicators = availableTargets.find(t => t.id === studentTargetId)?.indicators || [];

    // ── Secondary helpers ─────────────────────────────────────────────────────
    const handleAddSecondary = () => {
        if (secondary_sdgs.length < 2) {
            updateSection('section3', {
                secondary_sdgs: [...secondary_sdgs, { goal_number: null, justification_text: '', status: 'provisional' }]
            });
        }
    };

    const handleRemoveSecondary = (index: number) => {
        const updated = [...secondary_sdgs];
        updated.splice(index, 1);
        updateSection('section3', { secondary_sdgs: updated });
    };

    const updateSecondary = (index: number, field: string, value: any) => {
        const updated = [...secondary_sdgs];
        updated[index] = { ...updated[index], [field]: value };
        updateSection('section3', { secondary_sdgs: updated });
    };

    // ── Auto-generated summary ────────────────────────────────────────────────
    const autoSummary = useMemo(() => {
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
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-100 ring-4 ring-blue-50">
                        <Target className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">SECTION 3 — SDG CONTRIBUTION MAPPING</h2>
                        <p className="text-slate-500 font-bold uppercase tracking-[0.15em] text-[10px]">How your project contributed to the Sustainable Development Goals</p>
                    </div>
                </div>
                <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-800 font-medium leading-relaxed">
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
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Opportunity's Registered SDGs</h3>
                    </div>
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-500 font-black text-[9px] uppercase tracking-widest border border-slate-200">
                        <Lock className="w-3 h-3" /> Read-Only · From Opportunity
                    </span>
                </div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-11">
                    These SDGs were selected when the opportunity was created. You cannot change them.
                </p>

                {/* All 17 — highlighted vs dimmed */}
                <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(17, minmax(0, 1fr))" }}>
                    {ALL_SDGS.map(sdg => {
                        const isOppPrimary = sdg.num === oppPrimaryNum;
                        const isOppSecondary = oppSecondaries.includes(sdg.num);
                        return (
                            <div
                                key={sdg.num}
                                title={`SDG ${sdg.num}: ${sdg.name}${isOppPrimary ? ' (Primary)' : isOppSecondary ? ' (Secondary)' : ''}`}
                                className={clsx(
                                    "aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 border-2 cursor-default transition-all",
                                    isOppPrimary ? "border-white ring-2 ring-offset-1 scale-110 shadow-lg z-10"
                                        : isOppSecondary ? "border-white ring-2 ring-offset-1 shadow-md"
                                            : "opacity-20 border-transparent grayscale"
                                )}
                                style={{ backgroundColor: sdg.color }}
                            >
                                <span className="text-white font-black text-[10px] leading-none">{sdg.num}</span>
                            </div>
                        );
                    })}
                </div>

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
                            <div className="flex items-start gap-3 p-3 rounded-xl border" style={{ borderColor: sdg.color + '40', backgroundColor: sdg.color + '08' }}>
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black text-white shadow shrink-0" style={{ backgroundColor: sdg.color }}>{sdg.num}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-xs font-black text-slate-900">SDG {sdg.num}: {sdg.name}</p>
                                        <span className="px-1.5 py-0.5 rounded bg-white border text-[8px] font-black uppercase tracking-widest text-slate-500">PRIMARY</span>
                                    </div>
                                    {targetId && (
                                        <p className="text-[10px] text-slate-500 mt-0.5">
                                            <span className="font-black text-slate-700">Target {targetId}</span>{targetDesc && <span className="text-slate-400"> — {targetDesc}</span>}
                                        </p>
                                    )}
                                    {indicatorId && (
                                        <p className="text-[10px] text-slate-500 mt-0.5">
                                            <span className="font-black text-slate-700">Indicator {indicatorId}</span>{indicatorDesc && <span className="text-slate-400"> — {indicatorDesc}</span>}
                                        </p>
                                    )}
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
                            <div key={num} className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black text-white shadow shrink-0" style={{ backgroundColor: sdg.color }}>{sdg.num}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-xs font-black text-slate-900">SDG {sdg.num}: {sdg.name}</p>
                                        <span className="px-1.5 py-0.5 rounded bg-white border text-[8px] font-black uppercase tracking-widest text-slate-400">SECONDARY</span>
                                    </div>
                                    {secTargetId && (
                                        <p className="text-[10px] text-slate-500 mt-0.5">
                                            <span className="font-black text-slate-700">Target {secTargetId}</span>{secTargetDesc && <span className="text-slate-400"> — {secTargetDesc}</span>}
                                        </p>
                                    )}
                                    {secIndicatorId && (
                                        <p className="text-[10px] text-slate-500 mt-0.5">
                                            <span className="font-black text-slate-700">Indicator {secIndicatorId}</span>{secIndicatorDesc && <span className="text-slate-400"> — {secIndicatorDesc}</span>}
                                        </p>
                                    )}
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
                        <h3 className="text-lg font-bold text-purple-700 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-black">B</div>
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
                        <label className="block text-sm font-bold text-slate-900 mb-2">
                            C1. Select PRIMARY SDG <span className="text-red-500">*</span>
                        </label>
                        <select
                            className={dropdownClass}
                            value={studentPrimaryId}
                            onChange={(e) => {
                                updateSection('section3', {
                                    primary_sdg: { ...data.section3.primary_sdg, goal_number: e.target.value, target_code: '', indicator_code: '' }
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
                        <label className="block text-sm font-bold text-slate-900 mb-2">
                            C2. Select SDG Target <span className="text-red-500">*</span>
                        </label>
                        <select
                            className={dropdownClass}
                            value={studentTargetId}
                            onChange={(e) => {
                                updateSection('section3', {
                                    primary_sdg: { ...data.section3.primary_sdg, target_code: e.target.value, indicator_code: '' }
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
                        <label className="block text-sm font-bold text-slate-900 mb-2">C3. SDG Indicator</label>
                        <select
                            className={dropdownClass}
                            value={studentIndicatorId}
                            onChange={(e) => {
                                updateSection('section3', {
                                    primary_sdg: { ...data.section3.primary_sdg, indicator_code: e.target.value }
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
                        <label className="block text-sm font-bold text-slate-900">
                            Contribution Logic Statement <span className="text-xs font-normal text-slate-500">(80–120 words, required)</span>
                        </label>
                        <p className="text-xs text-slate-500">Explain who benefits and how this activity connects to the selected SDG target. Focus on intent only — no numbers.</p>
                        <Textarea
                            placeholder="Describe what you planned to do, who will benefit, and how this activity is logically connected to the selected SDG target..."
                            className={clsx(
                                "min-h-[140px] rounded-xl border border-slate-200 p-4 text-slate-700 font-medium bg-white outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 transition-all resize-none text-sm",
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
                                <span className={clsx("text-xs font-bold",
                                    wordCount >= 80 && wordCount <= 120 ? "text-emerald-600" : wordCount > 120 ? "text-red-500" : "text-slate-400"
                                )}>
                                    {wordCount} / 120 words
                                </span>
                            </div>
                        </div>
                        <FieldError message={getFieldError('contribution_intent_statement')} />
                    </div>

                    {/* C4. Secondary SDGs */}
                    <div className="pt-6 border-t border-slate-100">
                        <label className="block text-sm font-bold text-slate-900 mb-1">C4. Secondary SDGs (Optional)</label>
                        <p className="text-xs text-slate-500 mb-4">Select other SDGs this project contributes to and provide a brief justification.</p>

                        <div className="space-y-4">
                            {/* "Add a Secondary SDG..." dropdown */}
                            {secondary_sdgs.length < 2 && (
                                <select
                                    className={clsx(dropdownClass, "text-slate-400")}
                                    value=""
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val && !secondary_sdgs.find((s: any) => s.goal_number?.toString() === val)) {
                                            updateSection('section3', {
                                                secondary_sdgs: [...secondary_sdgs, { goal_number: val, target_code: '', indicator_code: '', justification_text: '', status: 'provisional' }]
                                            });
                                        }
                                        e.currentTarget.value = "";
                                    }}
                                >
                                    <option value="">Add a Secondary SDG...</option>
                                    {sdgData
                                        .filter(s => s.id !== studentPrimaryId && !secondary_sdgs.find((sec: any) => sec.goal_number?.toString() === s.id))
                                        .map(s => (
                                            <option key={s.id} value={s.id}>SDG {s.number} — {s.title}</option>
                                        ))}
                                </select>
                            )}

                            {/* Secondary SDG cards */}
                            {secondary_sdgs.map((sdg: any, index: number) => {
                                const sdgId = sdg.goal_number?.toString() || "";
                                const sdgRecord = sdgData.find(s => s.id === sdgId);
                                const secTargets = sdgRecord?.targets || [];
                                const secTargetId = sdg.target_code || "";
                                const secIndicators = secTargets.find(t => t.id === secTargetId)?.indicators || [];
                                const justWords = sdg.justification_text?.trim().split(/\s+/).filter((w: string) => w.length > 0).length || 0;

                                return (
                                    <div key={index} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col gap-4 relative">
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveSecondary(index)}
                                            className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>

                                        {/* Header */}
                                        <div className="flex items-center gap-3 pb-2 border-b border-slate-200/60">
                                            {sdgRecord && (
                                                <div
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm text-sm"
                                                    style={{ backgroundColor: ALL_SDGS.find(s => s.num === Number(sdgId))?.color || "#64748b" }}
                                                >
                                                    {sdgRecord.number}
                                                </div>
                                            )}
                                            <div>
                                                <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{sdgRecord?.title || `SDG ${sdgId}`}</span>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SECONDARY GOAL {index + 1}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Target */}
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">TARGET</label>
                                                <select
                                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-purple-500 outline-none text-xs font-bold bg-white"
                                                    value={secTargetId}
                                                    onChange={(e) => updateSecondary(index, 'target_code', e.target.value)}
                                                >
                                                    <option value="">Choose Target...</option>
                                                    {secTargets.map(t => (
                                                        <option key={t.id} value={t.id}>Target {t.id} — {t.description.substring(0, 60)}...</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Indicator */}
                                            <div className={!secTargetId ? "opacity-50 pointer-events-none" : ""}>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">INDICATOR</label>
                                                <select
                                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-purple-500 outline-none text-xs font-bold bg-white"
                                                    value={sdg.indicator_code || ""}
                                                    onChange={(e) => updateSecondary(index, 'indicator_code', e.target.value)}
                                                >
                                                    <option value="">Choose Indicator...</option>
                                                    {secIndicators.map(ind => (
                                                        <option key={ind.id} value={ind.id}>Indicator {ind.id} — {ind.description.substring(0, 60)}...</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Justification */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">JUSTIFICATION</label>
                                                <span className={clsx("text-[10px] font-bold",
                                                    justWords >= 100 && justWords <= 150 ? "text-emerald-600" : justWords > 150 ? "text-red-500" : "text-slate-400"
                                                )}>{justWords} / 150</span>
                                            </div>
                                            <textarea
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 outline-none text-xs h-24 bg-white font-medium resize-none"
                                                placeholder="Briefly explain the contribution to this SDG..."
                                                value={sdg.justification_text || ''}
                                                onChange={(e) => updateSecondary(index, 'justification_text', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Preliminary Summary ──────────────────────────────────── */}
            <div className="pt-10 border-t-2 border-slate-100 space-y-5">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        Preliminary SDG Alignment Statement
                    </h3>
                    <div className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 text-[9px] font-black uppercase tracking-widest border border-amber-100">
                        Auto-Generated · Read-Only
                    </div>
                </div>
                <div className="bg-slate-50 rounded-[2rem] p-8 border-2 border-slate-100 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12" />
                    <p className="text-base font-bold text-slate-800 leading-relaxed font-serif relative z-10">
                        "{data.section3.summary_text}"
                    </p>
                    <div className="mt-4 flex gap-4">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No output numbers shown</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No results claimed</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
