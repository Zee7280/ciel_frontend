"use client";
import React from "react";
import { Building, Globe, Users, BookOpen, AlertCircle, Clock, CheckCircle2, Save, MapPin, Calendar, XCircle } from "lucide-react";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import clsx from "clsx";

interface Section2Props {
    projectData?: any;
}

export default function Section2ProjectContext({ projectData }: Section2Props) {
    const { data, updateSection, getFieldError, validationErrors, saveReport, isReadOnly } = useReportForm();

    const sectionErrors = validationErrors['section2'] || [];
    const hasErrors = sectionErrors.length > 0;
    const sectionData = data.section2;

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

    // ─── Auto-generate summary when inputs are complete ───────────────────────
    React.useEffect(() => {
        const words = sectionData.problem_statement?.trim().split(/\s+/).filter(w => w.length > 0).length || 0;
        const evidenceSource = sectionData.baseline_evidence === 'Other'
            ? (sectionData.baseline_evidence_other || 'Other Sources')
            : sectionData.baseline_evidence;

        if (words >= 100 && sectionData.discipline && sectionData.baseline_evidence) {
            const pCategory = classifyProblem(sectionData.problem_statement);
            const beneficiary = detectBeneficiary(sectionData.problem_statement);
            const summary = generateSummary(pCategory, beneficiary, evidenceSource, sectionData.discipline);

            if (summary !== sectionData.summary_text) {
                updateSection('section2', {
                    problem_category: pCategory,
                    primary_beneficiary: beneficiary,
                    summary_text: summary
                });
            }
        } else if (sectionData.summary_text) {
            updateSection('section2', { summary_text: '' });
        }
    }, [sectionData.problem_statement, sectionData.discipline, sectionData.baseline_evidence, sectionData.baseline_evidence_other, sectionData.summary_text]);

    // ─── Word counts ─────────────────────────────────────────────────────────
    const wordCount = sectionData.problem_statement?.trim().split(/\s+/).filter(w => w.length > 0).length || 0;
    const disciplineWordCount = sectionData.discipline_contribution?.trim().split(/\s+/).filter(w => w.length > 0).length || 0;
    const otherEvidenceWordCount = sectionData.baseline_evidence_other?.trim().split(/\s+/).filter(w => w.length > 0).length || 0;

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
        <div className="space-y-14 pb-16">

            {/* ── Section Header ─────────────────────────────────────────── */}
            <div className="space-y-5">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-100 ring-4 ring-indigo-50">
                        <Globe className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">SECTION 2 — PROJECT CONTEXT</h2>
                        <p className="text-slate-500 font-bold uppercase tracking-[0.15em] text-[10px]">Baseline Definition &amp; Academic Framing</p>
                    </div>
                </div>

                {/* Purpose callout */}
                <div className="p-8 bg-slate-900 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
                    <div className="relative z-10 space-y-4">
                        <h4 className="font-black text-white uppercase tracking-wider text-sm flex items-center gap-2">
                            🎯 Purpose of This Section
                        </h4>
                        <p className="text-xs text-indigo-100/80 leading-relaxed font-medium max-w-3xl">
                            This section establishes the <strong className="text-white">baseline condition before your intervention</strong>.
                            You must clearly describe what problem existed, who was affected, what gap required attention, and what informed your understanding of the issue.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                            <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
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
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Project Identity</h3>
                    </div>
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-500 font-black text-[9px] uppercase tracking-widest border border-slate-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Auto-Filled · Read-Only
                    </span>
                </div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-11">
                    The system automatically displays project information for institutional traceability and reporting consistency.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {[
                        { label: "Project Title", value: title, icon: Globe },
                        { label: "Partner Organization", value: partner, icon: Building },
                        { label: "Location", value: `${district}, ${province}, ${country}`, icon: MapPin },
                        { label: "Project Duration", value: `${startDate} – ${endDate}`, icon: Calendar },
                    ].map((item) => (
                        <div key={item.label} className="bg-white rounded-2xl p-5 border-2 border-slate-100 shadow-sm space-y-2 relative overflow-hidden">
                            <div className="flex items-center gap-2">
                                <item.icon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{item.label}</p>
                            </div>
                            <p className="text-sm font-bold text-slate-800 leading-snug">{item.value}</p>
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-100 to-transparent" />
                        </div>
                    ))}
                </div>
            </div>

            {/* ── 2.2 Problem / System Need ──────────────────────────────── */}
            <div className="space-y-5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">2.2</div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Problem / System Need</h3>
                    <span className="ml-auto px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-black text-[9px] uppercase tracking-widest border border-amber-100">Mandatory · 100–150 Words</span>
                </div>

                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-10 shadow-sm space-y-8">
                    {/* Guidance */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Describe the Situation Before Your Intervention</p>
                            {[
                                "What specific issue or challenge existed?",
                                "Who was affected?",
                                "What gap was present? (skills, awareness, access, infrastructure, policy, systems)",
                                "Why was a structured intervention necessary?",
                            ].map(q => (
                                <div key={q} className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3 h-3 text-indigo-400 mt-0.5 shrink-0" />
                                    <p className="text-[10px] font-semibold text-slate-600">{q}</p>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-1 bg-red-50/50 rounded-2xl p-4 border border-red-100">
                            <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-2">Important Guidelines</p>
                            {[
                                ["✔", "Focus only on the baseline condition", "text-emerald-700"],
                                ["✔", "Be specific and realistic", "text-emerald-700"],
                                ["✔", "Use factual, clear language", "text-emerald-700"],
                                ["✗", "Do not describe your activities", "text-red-600"],
                                ["✗", "Do not describe results or improvements", "text-red-600"],
                                ["✗", "Do not mention SDG achievements", "text-red-600"],
                            ].map(([icon, text, color]) => (
                                <div key={text as string} className="flex items-start gap-2">
                                    <span className={clsx("text-xs font-black", color)}>{icon}</span>
                                    <p className={clsx("text-[10px] font-semibold", color)}>{text}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Textarea */}
                    <div className="space-y-3">
                        <Textarea
                            placeholder="Before our intervention, the situation was characterized by... [100–150 Words]"
                            readOnly={isReadOnly}
                            disabled={isReadOnly}
                            className={clsx(
                                "min-h-[240px] rounded-[2rem] border-2 border-slate-100 p-8 text-slate-700 font-medium leading-[1.8] resize-none focus:ring-8 focus:ring-indigo-50/50 focus:border-indigo-200 transition-all text-sm",
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
                                            wordCount < 100 ? "bg-amber-400" : wordCount > 150 ? "bg-red-500" : "bg-emerald-500"
                                        )}
                                        style={{ width: `${Math.min((wordCount / 150) * 100, 100)}%` }}
                                    />
                                </div>
                                <span className={clsx(
                                    "text-xs font-black uppercase tracking-widest",
                                    wordCount >= 100 && wordCount <= 150 ? "text-emerald-600" : wordCount > 150 ? "text-red-500" : "text-amber-500"
                                )}>
                                    {wordCount} / 150 words
                                </span>
                            </div>
                            <span className="px-3 py-1 rounded-lg bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                Requirement: 100–150 Words
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
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Academic Discipline Applied</h3>
                    <span className="ml-auto px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-black text-[9px] uppercase tracking-widest border border-amber-100">Mandatory</span>
                </div>

                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-10 shadow-sm space-y-10">

                    {/* Discipline picker — pill grid */}
                    <div className="space-y-4">
                        <Label className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Select Your Primary Academic Discipline</Label>
                        <div className="flex flex-wrap gap-2">
                            {disciplines.map(d => (
                                <button
                                    key={d}
                                    type="button"
                                    disabled={isReadOnly}
                                    onClick={() => updateSection('section2', { discipline: d })}
                                    className={clsx(
                                        "px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest transition-all border-2",
                                        sectionData.discipline === d
                                            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100"
                                            : "bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600",
                                        isReadOnly && "cursor-not-allowed opacity-50"
                                    )}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                        <FieldError message={getFieldError('discipline')} />
                    </div>

                    {/* Discipline contribution textarea */}
                    <div className="space-y-4 pt-8 border-t border-slate-50">
                        <div className="space-y-1">
                            <Label className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Discipline Contribution</Label>
                            <p className="text-[10px] font-semibold text-slate-500 leading-relaxed max-w-2xl">
                                Explain how your academic background helped you understand the problem, analyse the situation, design a structured approach, or apply technical, research, legal, financial, or social frameworks. Be specific and practical. Avoid general statements.
                            </p>
                            <div className="flex gap-4 mt-2">
                                {[
                                    ["✔ Be specific:", "Explain how you applied your knowledge"],
                                    ["✗ Avoid:", '"My degree helped me understand society."'],
                                ].map(([label, detail]) => (
                                    <div key={label} className="text-[10px] font-semibold text-slate-500 italic">
                                        <span className="font-black text-slate-700 not-italic">{label}</span> {detail}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Textarea
                            placeholder="Example: Utilized Engineering optimization models to identify structural inefficiencies in waste collection routing, applying network analysis techniques from Operations Research coursework..."
                            readOnly={isReadOnly}
                            disabled={isReadOnly}
                            className={clsx(
                                "min-h-[160px] bg-slate-50 border-2 border-slate-100 rounded-2xl p-8 font-medium text-slate-700 focus:ring-8 focus:ring-indigo-50/50 focus:border-indigo-200 transition-all resize-none text-sm",
                                getFieldError('discipline_contribution') && "border-red-200",
                                disciplineWordCount > 60 && "border-red-300"
                            )}
                            value={sectionData.discipline_contribution}
                            onChange={(e) => updateSection('section2', { discipline_contribution: e.target.value })}
                        />
                        <div className="flex justify-between items-center px-2">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Maximum 60 Words</p>
                            <span className={clsx(
                                "text-[10px] font-black uppercase tracking-widest",
                                disciplineWordCount > 60 ? "text-red-500" : disciplineWordCount >= 40 ? "text-emerald-600" : "text-slate-400"
                            )}>
                                {disciplineWordCount} / 60 Words
                            </span>
                        </div>
                        <FieldError message={getFieldError('discipline_contribution')} />
                    </div>
                </div>
            </div>

            {/* ── 2.4 Baseline Evidence Source ───────────────────────────── */}
            <div className="space-y-5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">2.4</div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Baseline Evidence Source</h3>
                    <span className="ml-auto px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-black text-[9px] uppercase tracking-widest border border-amber-100">Required</span>
                </div>

                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-10 shadow-sm space-y-8">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <Label className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Select what informed your understanding of the problem</Label>
                            <p className="text-[10px] font-semibold text-slate-500">What specific data or observation informed your understanding of the baseline situation?</p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {evidenceTypes.map(t => (
                                <button
                                    key={t}
                                    type="button"
                                    disabled={isReadOnly}
                                    onClick={() => updateSection('section2', { baseline_evidence: t, ...(t !== 'Other' ? { baseline_evidence_other: '' } : {}) })}
                                    className={clsx(
                                        "h-16 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-2 flex flex-col items-center justify-center gap-1 px-2 text-center",
                                        sectionData.baseline_evidence === t
                                            ? "bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100"
                                            : "bg-white border-slate-100 text-slate-400 hover:border-indigo-200 hover:text-indigo-600",
                                        isReadOnly && "cursor-not-allowed opacity-50"
                                    )}
                                >
                                    {t}
                                    {sectionData.baseline_evidence === t && <div className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />}
                                </button>
                            ))}
                        </div>
                        <FieldError message={getFieldError('baseline_evidence')} />
                    </div>

                    {/* Other: specify text */}
                    {sectionData.baseline_evidence === 'Other' && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-400 pt-8 border-t-2 border-slate-50 space-y-4">
                            <div className="space-y-1">
                                <Label className="text-xs font-black text-slate-900 uppercase tracking-widest">Please specify the evidence source (20–40 Words)</Label>
                                <p className="text-[10px] font-semibold text-slate-500">Clearly explain what data, consultation, or documentation informed your understanding.</p>
                                <p className="text-[10px] font-semibold text-slate-400 italic">
                                    Example: "Informal consultation with local school administration and review of internal performance records."
                                </p>
                            </div>
                            <Textarea
                                placeholder="e.g. Informal consultation with local school administration and review of internal performance records."
                                readOnly={isReadOnly}
                                disabled={isReadOnly}
                                className={clsx(
                                    "min-h-[120px] bg-slate-50 border-2 border-slate-100 rounded-2xl p-8 font-medium text-slate-700 focus:ring-8 focus:ring-indigo-50/50 focus:border-indigo-200 transition-all resize-none text-sm",
                                    getFieldError('baseline_evidence_other') && "border-red-400 bg-red-50/30"
                                )}
                                value={sectionData.baseline_evidence_other}
                                onChange={(e) => updateSection('section2', { baseline_evidence_other: e.target.value })}
                            />
                            <div className="flex justify-between items-center px-2">
                                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Specific context required (20–40 words)</p>
                                <span className={clsx(
                                    "text-[10px] font-black uppercase tracking-widest",
                                    otherEvidenceWordCount >= 20 && otherEvidenceWordCount <= 40 ? "text-emerald-600" : "text-amber-500"
                                )}>
                                    {otherEvidenceWordCount} / 40 Words
                                </span>
                            </div>
                            <FieldError message={getFieldError('baseline_evidence_other')} />
                        </div>
                    )}
                </div>
            </div>

            {/* ── System-Generated Summary ────────────────────────────────── */}
            <div className="pt-10 border-t-2 border-slate-100 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-100">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">System-Generated Summary</h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Auto-Generated · Read-Only · Students Cannot Edit This Summary</p>
                        </div>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest border border-blue-100">
                        Auto-Generated
                    </div>
                </div>

                {sectionData.summary_text ? (
                    <div className="bg-white border-2 border-slate-200 rounded-[2.5rem] p-10 relative overflow-hidden shadow-lg space-y-8">
                        <div className="absolute -bottom-8 -right-8 opacity-5">
                            <Building className="w-64 h-64 text-slate-900" />
                        </div>

                        <div className="relative z-10 space-y-6">
                            {/* Tags */}
                            <div className="flex flex-wrap gap-3">
                                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    {sectionData.problem_category}
                                </div>
                                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest">
                                    <Users className="w-3 h-3" />
                                    {sectionData.primary_beneficiary}
                                </div>
                                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                                    <MapPin className="w-3 h-3" />
                                    {district}, {province}
                                </div>
                            </div>

                            {/* Summary text */}
                            <div className="relative">
                                <span className="absolute -top-8 -left-4 text-6xl font-serif text-slate-100 select-none">"</span>
                                <p className="text-lg font-bold text-slate-800 leading-[1.8] relative z-10 font-serif">
                                    {sectionData.summary_text}
                                </p>
                                <span className="absolute -bottom-12 -right-4 text-6xl font-serif text-slate-100 select-none rotate-180">"</span>
                            </div>

                            {/* Footer */}
                            <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">CIEL Institutional Traceability Protocol · Auto-Validated</p>
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                                    RECORD ID: {projectData?.id?.substring(0, 12).toUpperCase() || 'BASE-REG-2024'}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-14 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-center space-y-4">
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

            {/* ── Save Draft ──────────────────────────────────────────────── */}
            <div className="flex justify-center pt-6">
                <Button
                    variant="outline"
                    onClick={() => saveReport(false)}
                    className="h-14 px-10 rounded-2xl border-2 border-slate-200 text-slate-500 font-black uppercase tracking-widest hover:border-slate-900 hover:text-slate-900 transition-all flex items-center gap-3"
                >
                    <Save className="w-5 h-5" /> Save Progress
                </Button>
            </div>
        </div>
    );
}
