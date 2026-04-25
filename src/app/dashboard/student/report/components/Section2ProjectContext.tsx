"use client";
import React, { useMemo, useState, useEffect } from "react";
import { generateAISummary } from "../utils/aiSummarizer";
import { calculateSection2CII } from "@/utils/reportQuality";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { Building, Globe, Users, BookOpen, AlertCircle, Clock, CheckCircle2, Save, MapPin, Calendar, XCircle } from "lucide-react";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { useReportForm } from "../context/ReportContext";
import { useDebounce } from "@/hooks/useDebounce";
import { FieldError } from "./ui/FieldError";
import { MultiSelect } from "./ui/MultiSelect";
import { SingleSelect } from "./ui/SingleSelect";
import clsx from "clsx";

interface Section2Props {
    projectData?: any;
}

export default function Section2ProjectContext({ projectData }: Section2Props) {
    const { data, updateSection, getFieldError, validationErrors, saveReport, isReadOnly } = useReportForm();

    const sectionErrors = validationErrors['section2'] || [];
    const hasErrors = sectionErrors.length > 0;
    const sectionData = data.section2;

    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateAISummary = async () => {
        const words = (sectionData.problem_statement || "").trim().split(/\s+/).filter(w => w).length;
        if (words < 100) {
            toast.error("Please provide at least 100 words in the Problem Statement first.");
            return;
        }
        if (!sectionData.discipline) {
            toast.error("Please select an Academic Discipline first.");
            return;
        }

        setIsGenerating(true);
        const evidenceSource = sectionData.baseline_evidence?.length > 0
            ? sectionData.baseline_evidence.map((t: string) => t === 'Other' ? (sectionData.baseline_evidence_other || 'Other Sources') : t).join(", ")
            : "Unknown Sources";

        const result = await generateAISummary("section2", {
            ...sectionData,
            projectTitle: title,
            partnerOrg: partner,
            location: `${district}, ${province}, ${country}`,
            duration: `${startDate} – ${endDate}`,
            baseline_evidence: evidenceSource
        });
        setIsGenerating(false);

        if (result.error) {
            toast.error(result.error);
        } else if (result.summary) {
            updateSection('section2', {
                summary_text: result.summary,
                problem_category: classifyProblem(sectionData.problem_statement),
                primary_beneficiary: detectBeneficiary(sectionData.problem_statement)
            });
            toast.success("AI Baseline Summary generated!");
        }
    };

    // ─── Helper: Rule-based classification ───────────────────────────────────
    const classifyProblem = (text: string) => {
        const t = text.toLowerCase();
        if (t.includes("school") || t.includes("student") || t.includes("learning") || t.includes("education")) return "Education Access Gap";
        if (t.includes("skills") || t.includes("training") || t.includes("capacity") || t.includes("competency")) return "Skills Development";
        if (t.includes("internet") || t.includes("digital") || t.includes("technology") || t.includes("access")) return "Digital Divide";
        if (t.includes("health") || t.includes("sanitation") || t.includes("hygiene")) return "Health Awareness Gap";
        if (t.includes("waste") || t.includes("climate") || t.includes("pollution")) return "Environmental Degradation";
        if (t.includes("policy") || t.includes("governance") || t.includes("law")) return "Policy / Governance Gap";
        if (t.includes("infrastructure") || t.includes("building") || t.includes("road")) return "Infrastructure Deficiency";
        if (t.includes("gender") || t.includes("equality")) return "Gender Inequality";
        if (t.includes("economic") || t.includes("opportunity") || t.includes("jobs") || t.includes("poverty")) return "Economic Opportunity Gap";
        return "Community Development";
    };

    const detectBeneficiary = (text: string) => {
        const t = text.toLowerCase();
        if (t.includes("student")) return "Students";
        if (t.includes("women")) return "Women";
        if (t.includes("youth")) return "Youth";
        if (t.includes("business") || t.includes("smes")) return "Small Businesses";
        if (t.includes("rural")) return "Rural Communities";
        if (t.includes("low-income") || t.includes("household") || t.includes("poor")) return "Low-Income Households";
        if (t.includes("public") || t.includes("institution")) return "Public Institutions";
        if (t.includes("children") || t.includes("child")) return "Children";
        return "Community Members";
    };

    const generateSummary = (pCategory: string, beneficiary: string, evidenceList: string, discipline: string) => {
        const district = projectData?.location_district || projectData?.district || "Lahore";
        const province = projectData?.location_province || projectData?.province || "Punjab";
        const country = projectData?.location_country || projectData?.country || "Pakistan";
        const location = `${district}, ${province}, ${country}`;
        return `This project addresses a documented gap in ${pCategory} affecting ${beneficiary} in ${location}. Baseline assessment was informed through ${evidenceList}. The project demonstrates academic alignment with ${discipline}, ensuring structured and evidence-based engagement.`;
    };



    const autoNarrative = useMemo(() => {
        if (sectionData.summary_text) return sectionData.summary_text;

        const problem = sectionData.problem_statement ? `Problem: ${sectionData.problem_statement}` : '';
        const discipline = sectionData.discipline ? `Discipline: ${sectionData.discipline}` : '';
        const evidence = sectionData.baseline_evidence ? `Evidence: ${sectionData.baseline_evidence}` : '';

        if (problem || discipline || evidence) {
            return [problem, discipline, evidence].filter(Boolean).join('\n');
        }
        return '';
    }, [sectionData.summary_text, sectionData.problem_statement, sectionData.discipline, sectionData.baseline_evidence]);

    // ─── Auto-generate summary when inputs are complete ───────────────────────
    React.useEffect(() => {
        const words = (sectionData.problem_statement || "").trim().split(/\s+/).filter(w => w).length;
        const evidenceArray = sectionData.baseline_evidence || [];
        const evidenceSource = evidenceArray.includes('Other')
            ? [...evidenceArray.filter(t => t !== 'Other'), (sectionData.baseline_evidence_other || 'Other Sources')].join(", ")
            : evidenceArray.join(", ");

        if (words >= 100 && sectionData.discipline && evidenceArray.length > 0) {
            const pCategory = classifyProblem(sectionData.problem_statement);
            const beneficiary = detectBeneficiary(sectionData.problem_statement);
            const summary = generateSummary(pCategory, beneficiary, evidenceSource, sectionData.discipline);

            // Only auto-update if summary_text is empty or already matches a previous auto-generated summary
            // This prevents overwriting AI-generated or custom-improved summaries
            if (!sectionData.summary_text || sectionData.summary_text.includes("This project addresses a documented gap")) {
                if (summary !== sectionData.summary_text) {
                    updateSection('section2', {
                        problem_category: pCategory,
                        primary_beneficiary: beneficiary,
                        summary_text: summary
                    });
                }
            }
        }
    }, [sectionData.problem_statement, sectionData.discipline, sectionData.baseline_evidence, sectionData.baseline_evidence_other, sectionData.summary_text]);

    // ─── Word counts ─────────────────────────────────────────────────────────
    const wordCount = (sectionData.problem_statement || "").trim().split(/\s+/).filter(w => w).length;
    const disciplineWordCount = (sectionData.discipline_contribution || "").trim().split(/\s+/).filter(w => w).length;
    const otherEvidenceWordCount = (sectionData.baseline_evidence_other || "").trim().split(/\s+/).filter(w => w).length;

    // ─── Data ────────────────────────────────────────────────────────────────
    const disciplines = [
        "Business & Economics",
        "Computing & Technology",
        "Engineering & Built Environment",
        "Health Sciences",
        "Natural & Environmental Sciences",
        "Social Sciences & Development",
        "Arts & Humanities",
        "Media & Creative Industries",
        "Education",
        "Law",
        "Agriculture & Food Sciences",
        "Hospitality & Services",
        "Interdisciplinary Studies",
    ];

    const evidenceTypes = [
        "Observation",
        "Survey Data",
        "Partner-Provided Data",
        "Government Data",
        "Academic Research",
        "Community Interviews",
        "Previous Project Data",
        "Other",
    ];

    // Project identity fields
    const title = projectData?.title || "Untitled Engagement";
    const partner = projectData?.organization_name || projectData?.partner_name || projectData?.organization || "Self-Initiated";
    const district = projectData?.city || projectData?.district || projectData?.location_district || "—";
    const province = projectData?.province || projectData?.location_province || "—";
    const country = projectData?.country || projectData?.location_country || "Pakistan";

    // Format dates nicely if they exist
    const formatDate = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleDateString() : "—";
    const startDate = formatDate(projectData?.start_date || projectData?.startDate);
    const endDate = formatDate(projectData?.end_date || projectData?.endDate);

    return (
        <div className="space-y-5 pb-6">

            {/* ── Section Header ─────────────────────────────────────────── */}
            <div className="space-y-5">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-report-primary text-white flex items-center justify-center shadow-xl shadow-report-primary-shadow ring-4 ring-report-primary-soft">
                        <Globe className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="report-h2">SECTION 2 — PROJECT CONTEXT</h2>
                        <p className="report-label">Baseline Definition &amp; Academic Framing</p>
                    </div>
                </div>

                {/* Purpose callout */}
                <div className="p-6 bg-report-primary-soft/50 rounded-3xl border-2 border-report-primary-border/50 relative overflow-hidden shadow-sm">
                    <div className="absolute -right-4 -top-4 w-32 h-32 bg-report-primary/5 rounded-full blur-3xl" />
                    <div className="relative z-10 space-y-3">
                        <h4 className="font-black text-report-primary uppercase tracking-wider text-[11px] flex items-center gap-2">
                            🎯 Purpose of This Section
                        </h4>
                        <p className="text-[11px] text-slate-700 leading-relaxed font-bold max-w-3xl">
                            This section establishes the <strong className="text-report-primary">baseline condition before your intervention</strong>.
                            You must clearly describe what problem existed, who was affected, what gap required attention, and what informed your understanding of the issue.
                        </p>
                        <div className="flex items-center gap-2 pt-1 border-t border-report-primary-border/20">
                            <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                            <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest">
                                This section describes the situation BEFORE your project activities. Do not describe results, outcomes, or achievements here.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── 2.1 Project Identity (Auto-Filled | Read-Only) ─────────── */}
            <div className="space-y-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">2.1</div>
                        <h3 className="report-h3">Project Identity</h3>
                    </div>
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-500 font-black text-[9px] uppercase tracking-widest border border-slate-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Auto-Filled · Read-Only
                    </span>
                </div>
                <p className="report-help pl-11">
                    The system automatically displays project information for institutional traceability and reporting consistency.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { label: "Partner Organization", value: partner, icon: Building },
                        { label: "Location", value: `${district}, ${province}, ${country}`, icon: MapPin },
                        { label: "Project Duration", value: `${startDate} – ${endDate}`, icon: Calendar },
                    ].map((item) => (
                        <div key={item.label} className="bg-white rounded-2xl p-5 border-2 border-slate-100 shadow-sm space-y-2.5 relative overflow-hidden flex flex-col justify-between">
                            <div className="space-y-2.5">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-report-primary-soft text-report-primary flex items-center justify-center shrink-0">
                                        <item.icon className="w-3.5 h-3.5" />
                                    </div>
                                    <p className="report-label !leading-none">{item.label}</p>
                                </div>
                                <p className="report-body !text-xs !leading-relaxed min-h-[1.5rem] line-clamp-2">{item.value}</p>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-report-primary to-transparent opacity-20" />
                        </div>
                    ))}
                </div>
            </div>

            {/* ── 2.2 Problem / System Need ──────────────────────────────── */}
            <div className="space-y-5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">2.2</div>
                    <h3 className="report-h3">Problem / System Need</h3>
                    <span className="ml-auto px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-black text-[9px] uppercase tracking-widest border border-amber-100">Mandatory · 100–200 Words</span>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-8">
                    {/* Guidance */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3 bg-slate-50/50 rounded-2xl p-5 border border-slate-100">
                            <p className="report-label !text-slate-900 border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-report-primary" />
                                Describe the Situation
                            </p>
                            <div className="space-y-2">
                                {[
                                    "What specific issue or challenge existed?",
                                    "Who was affected?",
                                    "What gap was present? (skills, access, systems)",
                                    "Why was a structured intervention necessary?",
                                ].map(q => (
                                    <div key={q} className="flex items-start gap-2">
                                        <div className="w-1 h-1 rounded-full bg-report-primary mt-1.5 shrink-0" />
                                        <p className="text-[10px] font-bold text-slate-600 leading-relaxed">{q}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-3 bg-red-50/50 rounded-2xl p-5 border border-red-100">
                            <p className="report-label !text-red-500 border-b border-red-100 pb-2 mb-3 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                Important Guidelines
                            </p>
                            <div className="space-y-2">
                                {[
                                    ["✔", "Focus only on the baseline condition", "text-emerald-700"],
                                    ["✔", "Be specific and realistic", "text-emerald-700"],
                                    ["✔", "Use factual, clear language", "text-emerald-700"],
                                    ["✗", "Do not describe your activities", "text-red-600"],
                                    ["✗", "Do not describe results", "text-red-600"],
                                ].map(([icon, text, color]) => (
                                    <div key={text as string} className="flex items-start gap-2">
                                        <span className={clsx("text-xs font-black shrink-0", color)}>{icon}</span>
                                        <p className={clsx("text-[10px] font-bold leading-relaxed", color)}>{text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Textarea */}
                    <div className="space-y-4">
                        <Textarea
                            placeholder="Before our intervention, the situation was characterized by... [100–200 Words]"
                            readOnly={isReadOnly}
                            disabled={isReadOnly}
                            className={clsx(
                                "min-h-[200px] rounded-3xl border-2 border-slate-100 p-6 text-slate-700 font-bold leading-relaxed resize-none focus:ring-8 focus:ring-report-primary-soft/50 focus:border-report-primary-border transition-all text-sm bg-white",
                                getFieldError('problem_statement') && "border-red-400 bg-red-50/30"
                            )}
                            value={sectionData.problem_statement}
                            onChange={(e) => updateSection('section2', { problem_statement: e.target.value })}
                        />

                        {/* Word count bar */}
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-4">
                                <div className="h-2 w-48 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={clsx(
                                            "h-full rounded-full transition-all duration-700",
                                            wordCount < 100 ? "bg-amber-400" : wordCount > 200 ? "bg-red-500" : "bg-emerald-500"
                                        )}
                                        style={{ width: `${Math.min((wordCount / 200) * 100, 100)}%` }}
                                    />
                                </div>
                                <span className={clsx(
                                    "report-label",
                                    wordCount >= 100 && wordCount <= 200 ? "text-emerald-600" : wordCount > 200 ? "text-red-500" : "text-amber-500"
                                )}>
                                    {wordCount} / 200 words (Min 100)
                                </span>
                            </div>
                            <span className="report-help">
                                Requirement: 100–200 Words
                            </span>
                        </div>
                        <FieldError message={getFieldError('problem_statement')} />
                    </div>
                </div>
            </div>

            {/* ── 2.3 Academic Discipline Applied ────────────────────────── */}
            <div className="space-y-5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">2.3</div>
                    <h3 className="report-h3">Academic Discipline Applied</h3>
                    <span className="ml-auto px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-black text-[9px] uppercase tracking-widest border border-amber-100">Mandatory</span>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-8">
                    {/* Section Header */}
                    <div className="space-y-2">
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                            Academic Discipline Contribution
                        </h2>
                        <p className="text-sm text-slate-500 max-w-xl">
                            Describe how your academic discipline helped you analyse the problem and
                            structure your engagement approach.
                        </p>
                    </div>


                    {/* Discipline Picker */}
                    <div className="space-y-4">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Primary Academic Discipline
                        </Label>

                        <SingleSelect
                            options={disciplines}
                            value={sectionData.discipline}
                            onChange={(val) => updateSection('section2', { discipline: val })}
                            placeholder="Select a discipline..."
                            disabled={isReadOnly}
                        />

                        <FieldError message={getFieldError('discipline')} />
                    </div>


                    {/* Contribution Section */}
                    <div className="space-y-5 pt-8 border-t border-slate-100">

                        {/* Guidance */}
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 space-y-3">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                Problem Statement Summary
                            </Label>

                            <p className="text-sm text-slate-500 leading-relaxed">
                                Explain how your academic background helped you analyse the problem,
                                design a structured approach, or apply technical, research, legal,
                                financial, or social frameworks.
                            </p>

                            <div className="flex gap-6 text-xs font-semibold">
                                <span className="text-emerald-700">
                                    ✔ Be specific: Explain how your knowledge was applied
                                </span>
                                <span className="text-slate-500 italic">
                                    ✗ Avoid: "My degree helped me understand society"
                                </span>
                            </div>
                        </div>


                        {/* Textarea */}
                        <div className="space-y-3">

                            <Textarea
                                placeholder="Example: Utilized Engineering optimization models to identify inefficiencies in waste collection routing..."
                                readOnly={isReadOnly}
                                disabled={isReadOnly}
                                className={clsx(
                                    "min-h-[160px] bg-white border border-slate-200 rounded-xl p-6 text-sm font-medium text-slate-700 leading-relaxed shadow-sm focus:ring-4 focus:ring-report-primary-soft/40 focus:border-report-primary-border transition resize-none",
                                    getFieldError('discipline_contribution') && "border-red-300",
                                    disciplineWordCount > 200 && "border-red-400"
                                )}
                                value={sectionData.discipline_contribution}
                                onChange={(e) => updateSection('section2', { discipline_contribution: e.target.value })}
                            />

                            {/* Word Counter */}
                            <div className="flex justify-between items-center text-xs font-semibold">
                                <span className="text-slate-400 uppercase tracking-wider">
                                    100 – 200 Words Required
                                </span>

                                <span className={clsx(
                                    "font-bold",
                                    disciplineWordCount > 200
                                        ? "text-red-500"
                                        : disciplineWordCount >= 100
                                            ? "text-emerald-600"
                                            : "text-slate-400"
                                )}>
                                    {disciplineWordCount} / 200
                                </span>
                            </div>

                            <FieldError message={getFieldError('discipline_contribution')} />
                        </div>

                    </div>

                </div>
            </div>

            {/* ── 2.4 Baseline Evidence Source ───────────────────────────── */}
            <div className="space-y-5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">2.4</div>
                    <h3 className="report-h3">Baseline Evidence Source</h3>
                    <span className="ml-auto px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-black text-[9px] uppercase tracking-widest border border-amber-100">Required</span>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
                    <div className="space-y-5">
                        <div className="space-y-1">
                            <Label className="report-label !text-slate-900">Select what informed your understanding of the problem</Label>
                            <p className="report-help !pl-0">What specific data or observation informed your understanding of the baseline situation?</p>
                        </div>

                        <MultiSelect
                            options={evidenceTypes}
                            selected={sectionData.baseline_evidence || []}
                            onChange={(values) => {
                                updateSection('section2', {
                                    baseline_evidence: values,
                                    // Clear 'other' text if 'Other' is deselected
                                    ...(!values.includes('Other') ? { baseline_evidence_other: '' } : {})
                                });
                            }}
                            placeholder="Select data or observations..."
                            disabled={isReadOnly}
                        />
                        <FieldError message={getFieldError('baseline_evidence')} />
                    </div>

                    {/* Other: specify text */}
                    {sectionData.baseline_evidence?.includes('Other') && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-400 pt-8 border-t-2 border-slate-50 space-y-5">
                            <div className="space-y-2">
                                <Label className="report-label !text-slate-900 border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-amber-500" />
                                    Specify Evidence Source
                                </Label>
                                <p className="text-[10px] font-bold text-slate-500 leading-relaxed max-w-2xl pl-1">
                                    Clearly explain what specific documentation, professional consultation, or institutional data informed your understanding of the baseline situation.
                                </p>
                            </div>
                            <Textarea
                                placeholder="Example: Review of internal performance records and consultation with local administrative leads..."
                                readOnly={isReadOnly}
                                disabled={isReadOnly}
                                className={clsx(
                                    "min-h-[120px] bg-white border-2 border-slate-100 rounded-3xl p-6 font-bold text-slate-700 focus:ring-8 focus:ring-report-primary-soft/50 focus:border-report-primary-border transition-all resize-none text-sm leading-relaxed",
                                    getFieldError('baseline_evidence_other') && "border-red-400 bg-red-50/30"
                                )}
                                value={sectionData.baseline_evidence_other}
                                onChange={(e) => updateSection('section2', { baseline_evidence_other: e.target.value })}
                            />
                            <div className="flex justify-between items-center px-2">
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">100-200 words required</p>
                                <span className={clsx(
                                    "text-[10px] font-black uppercase tracking-widest leading-none",
                                    otherEvidenceWordCount >= 100 && otherEvidenceWordCount <= 200 ? "text-emerald-600" : "text-amber-500"
                                )}>
                                    {otherEvidenceWordCount} / 200 Words (Min 100)
                                </span>
                            </div>
                            <FieldError message={getFieldError('baseline_evidence_other')} />
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-8 border-t-2 border-slate-100 space-y-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-report-primary text-white flex items-center justify-center shadow-lg shadow-report-primary-shadow ring-4 ring-report-primary-soft">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="report-h3 !text-base !leading-none mb-1.5">System-Generated Summary</h3>
                            <p className="report-label !text-slate-400">CIEL Baseline Intelligence Engine</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleGenerateAISummary}
                            disabled={isGenerating}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-report-primary text-white text-[10px] font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-40 transition-all shadow-md shadow-report-primary-shadow"
                        >
                            {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            {isGenerating ? "Generating…" : "Improve with AI"}
                        </button>
                        <div className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest border border-slate-800 shadow-sm">
                            Auto-Generated
                        </div>
                    </div>
                </div>

                {sectionData.summary_text ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden shadow-sm space-y-6">
                        <div className="absolute -bottom-8 -right-8 opacity-5">
                            <Building className="w-64 h-64 text-slate-900" />
                        </div>

                        <div className="relative z-10 space-y-6">
                            {/* Tags */}
                            <div className="flex flex-wrap gap-2.5">
                                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest shadow-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    {sectionData.problem_category}
                                </div>
                                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-report-primary-soft border border-report-primary-border text-report-primary text-[9px] font-black uppercase tracking-widest">
                                    <Users className="w-3.5 h-3.5" />
                                    {sectionData.primary_beneficiary}
                                </div>
                                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-500 text-[9px] font-black uppercase tracking-widest">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {district}, {province}
                                </div>
                            </div>

                            {/* Summary text */}
                            <div className="relative px-2">
                                <span className="absolute -top-6 -left-4 text-5xl font-serif text-report-primary-soft select-none opacity-40">“</span>
                                <p className="report-ai-text !leading-relaxed !text-slate-800">
                                    {sectionData.summary_text}
                                </p>
                                <span className="absolute -bottom-10 -right-4 text-5xl font-serif text-report-primary-soft select-none rotate-180 opacity-40">“</span>
                            </div>

                            {/* Footer */}
                            <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">CIEL Institutional Traceability Protocol · Auto-Validated</p>
                                <div className="flex items-center gap-2.5">
                                    <span className="report-label !text-slate-300">Auth Signature</span>
                                    <p className="text-[10px] font-black text-report-primary uppercase tracking-widest bg-report-primary-soft px-4 py-2 rounded-xl border border-report-primary-border shadow-sm">
                                        REF: {projectData?.id?.substring(0, 12).toUpperCase() || 'BASE-REG-2024'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center text-slate-200">
                            <BookOpen className="w-8 h-8" />
                        </div>
                        <div className="space-y-2 max-w-sm">
                            <p className="text-sm font-black text-slate-700 uppercase tracking-[0.15em]">Baseline Engine Active</p>
                            <p className="text-[10px] font-semibold text-slate-400 leading-relaxed">
                                After you complete the Problem Statement (100+ words), select an Academic Discipline, and choose a Baseline Evidence Source — the system will automatically generate a structured baseline summary here.
                            </p>
                            <p className="text-[10px] font-black text-slate-400 italic mt-2">
                                Example: "This project addresses a documented gap in Skills Development affecting Youth in Lahore, Punjab, Pakistan…"
                            </p>
                        </div>
                    </div>
                )}
            </div>

            

        </div>
    );
}
