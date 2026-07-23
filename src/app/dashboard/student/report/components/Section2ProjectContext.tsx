"use client";
import React, { useMemo, useState, useEffect, useLayoutEffect, useRef } from "react";
import { generateAISummary } from "../utils/aiSummarizer";
import { calculateSection2CII } from "@/utils/reportQuality";
import { toast } from "sonner";
import { Sparkles, Loader2, Building, FileText, Users, BookOpen, AlertCircle, CheckCircle2, MapPin, Calendar, X } from "lucide-react";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useReportForm } from "../context/ReportContext";
import { useDebounce } from "@/hooks/useDebounce";
import { FieldError } from "./ui/FieldError";
import { MultiSelect } from "./ui/MultiSelect";
import { SingleSelect } from "./ui/SingleSelect";
import clsx from "clsx";

/** Internal tokens for multiple "Other" rows in 2.4 (must not match human-readable option labels). */
const OTHER_SLOT_RE = /^__o_(\d+)$/;

function isOtherSlotToken(s: string): boolean {
    return OTHER_SLOT_RE.test(s);
}

/**
 * Renumbers `__o_n` in selection and syncs the parallel `baseline_other_entries` text.
 * Keeps `baseline_evidence_other` as a joined string for API / legacy consumers.
 */
function syncBaselineOtherSlots(rawSelected: string[], prevEntries: string[] | undefined): {
    evidence: string[];
    entries: string[];
    legacyOther: string;
} {
    const raw = rawSelected.map((s) => (s === "Other" ? "__o_0" : s));
    const staticPart = raw.filter((s) => !isOtherSlotToken(s));
    const oldIndices = raw
        .filter((s) => isOtherSlotToken(s))
        .map((s) => parseInt(s.match(OTHER_SLOT_RE)![1], 10));
    const uniqueSorted = [...new Set(oldIndices)].sort((a, b) => a - b);
    const ent = Array.isArray(prevEntries) ? [...prevEntries] : [];
    const texts = uniqueSorted.map((i) => (ent[i] != null && ent[i] !== undefined ? ent[i] : ""));
    const newOtherTags = texts.map((_, j) => `__o_${j}`);
    return {
        evidence: [...staticPart, ...newOtherTags],
        entries: texts,
        legacyOther: texts.join("\n\n---\n\n"),
    };
}

function otherSlotCount(evidence: string[] | undefined): number {
    return (evidence || []).filter((s) => isOtherSlotToken(s)).length;
}

function otherTagLabel(value: string): string {
    const m = value.match(OTHER_SLOT_RE);
    if (!m) return value;
    const n = parseInt(m[1], 10);
    if (n === 0) return "Other";
    return `Other (${n + 1})`;
}

interface Section2Props {
    projectData?: any;
}

function formatBaselineEvidenceForDisplay(section: {
    baseline_evidence?: string[];
    baseline_other_entries?: string[];
    baseline_evidence_other?: string;
}): string {
    const ev = section.baseline_evidence || [];
    const otherTexts = section.baseline_other_entries;
    return ev
        .map((t) => {
            if (t === "Other") {
                return (section.baseline_evidence_other || "Other").trim() || "Other";
            }
            if (isOtherSlotToken(t)) {
                const m = t.match(OTHER_SLOT_RE);
                if (m) {
                    const idx = parseInt(m[1], 10);
                    const o = otherTexts && otherTexts[idx] != null ? otherTexts[idx] : "";
                    return o.trim() || `Other (slot ${idx + 1})`;
                }
            }
            return t;
        })
        .join(", ");
}

function asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function cleanString(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function pickString(...values: unknown[]): string {
    for (const value of values) {
        const text = cleanString(value);
        if (text) return text;
    }
    return "";
}

function joinLocationParts(parts: string[]): string {
    const seen = new Set<string>();
    const filtered = parts.filter((part) => {
        const text = part.trim();
        if (!text || text === "—") return false;
        const key = text.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    return filtered.length ? filtered.join(", ") : "—";
}

export default function Section2ProjectContext({ projectData }: Section2Props) {
    const { data, updateSection, getFieldError, validationErrors, saveReport, isReportSectionsReadOnly } =
        useReportForm();
    const isReadOnly = isReportSectionsReadOnly;

    const sectionErrors = validationErrors['section2'] || [];
    const hasErrors = sectionErrors.length > 0;
    const sectionData = data.section2;

    const [isGenerating, setIsGenerating] = useState(false);
    const legacyOtherMigrated = useRef(false);

    /** One-time: legacy `Other` + single string -> `__o_0` + `baseline_other_entries` (before paint) */
    useLayoutEffect(() => {
        if (legacyOtherMigrated.current) return;
        const be = sectionData.baseline_evidence;
        if (!be || !be.includes("Other") || be.some((s) => isOtherSlotToken(s))) return;
        legacyOtherMigrated.current = true;
        const nextSel = be.map((x) => (x === "Other" ? "__o_0" : x));
        const s = syncBaselineOtherSlots(nextSel, [sectionData.baseline_evidence_other || ""]);
        updateSection("section2", {
            baseline_evidence: s.evidence,
            baseline_other_entries: s.entries,
            baseline_evidence_other: s.legacyOther,
        });
    }, [sectionData.baseline_evidence, sectionData.baseline_evidence_other, updateSection]);

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
        const evidenceSource =
            sectionData.baseline_evidence?.length > 0
                ? formatBaselineEvidenceForDisplay(sectionData)
                : "Unknown Sources";

        const result = await generateAISummary("section2", {
            ...sectionData,
            projectTitle: title,
            partnerOrg: partner,
            location: locationDisplay,
            duration: `${startDate} – ${endDate}`,
            baseline_evidence: evidenceSource,
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
        const location = locationDisplay === "—" ? "Pakistan" : locationDisplay;
        return `This project addresses a documented gap in ${pCategory} affecting ${beneficiary} in ${location}. Baseline assessment was informed through ${evidenceList}. The project demonstrates academic alignment with ${discipline}, ensuring structured and evidence-based engagement.`;
    };



    const autoNarrative = useMemo(() => {
        if (sectionData.summary_text) return sectionData.summary_text;

        const problem = sectionData.problem_statement ? `Problem: ${sectionData.problem_statement}` : '';
        const discipline = sectionData.discipline ? `Discipline: ${sectionData.discipline}` : '';
        const be = sectionData.baseline_evidence;
        const evStr =
            be && be.length > 0
                ? be.includes("Other") || be.some((x) => isOtherSlotToken(x))
                    ? formatBaselineEvidenceForDisplay(sectionData)
                    : be.join(", ")
                : "";
        const evidence = evStr ? `Evidence: ${evStr}` : "";

        if (problem || discipline || evidence) {
            return [problem, discipline, evidence].filter(Boolean).join("\n");
        }
        return "";
    }, [sectionData.summary_text, sectionData.problem_statement, sectionData.discipline, sectionData.baseline_evidence, sectionData.baseline_other_entries, sectionData.baseline_evidence_other]);

    // ─── Auto-generate summary when inputs are complete ───────────────────────
    React.useEffect(() => {
        const words = (sectionData.problem_statement || "").trim().split(/\s+/).filter((w) => w).length;
        const evidenceArray = sectionData.baseline_evidence || [];
        const hasOtherBlock =
            evidenceArray.includes("Other") || evidenceArray.some((t) => isOtherSlotToken(t));
        const evidenceSource = hasOtherBlock
            ? formatBaselineEvidenceForDisplay(sectionData)
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
    }, [sectionData.problem_statement, sectionData.discipline, sectionData.baseline_evidence, sectionData.baseline_evidence_other, sectionData.baseline_other_entries, sectionData.summary_text, updateSection]);

    // ─── Word counts ─────────────────────────────────────────────────────────
    const wordCount = (sectionData.problem_statement || "").trim().split(/\s+/).filter((w) => w).length;
    const disciplineWordCount = (sectionData.discipline_contribution || "").trim().split(/\s+/).filter((w) => w).length;
    const otherCount = useMemo(() => {
        const n = otherSlotCount(sectionData.baseline_evidence);
        if (n > 0) return n;
        if (sectionData.baseline_evidence?.includes("Other")) return 1;
        return 0;
    }, [sectionData.baseline_evidence]);
    const otherEntries = useMemo(() => {
        if (otherCount === 0) return [];
        const n = otherSlotCount(sectionData.baseline_evidence);
        if (n > 0) {
            return Array.from({ length: otherCount }, (_, i) => sectionData.baseline_other_entries?.[i] ?? "");
        }
        if (sectionData.baseline_evidence?.includes("Other")) {
            return [sectionData.baseline_evidence_other ?? ""];
        }
        return [];
    }, [otherCount, sectionData.baseline_evidence, sectionData.baseline_other_entries, sectionData.baseline_evidence_other]);

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
    const project = asRecord(projectData);
    const projectLocation = asRecord(project?.location);
    const projectTimeline = asRecord(project?.timeline);
    const title = projectData?.title || "Untitled Engagement";
    const partner = projectData?.organization_name || projectData?.partner_name || projectData?.organization || "Self-Initiated";
    const venue = pickString(projectLocation?.venue, projectData?.venue);
    const district = pickString(projectData?.city, projectData?.district, projectData?.location_district, projectLocation?.city, projectLocation?.district);
    const province = pickString(projectData?.province, projectData?.location_province, projectLocation?.province);
    const country = pickString(projectData?.country, projectData?.location_country, projectLocation?.country) || "Pakistan";
    const locationDisplay = joinLocationParts([venue, district, province, country]);

    // Format dates nicely if they exist
    const formatDate = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleDateString() : "—";
    const startDate = formatDate(pickString(projectData?.start_date, projectData?.startDate, projectTimeline?.start_date, projectTimeline?.startDate));
    const endDate = formatDate(pickString(projectData?.end_date, projectData?.endDate, projectTimeline?.end_date, projectTimeline?.endDate));

    const charCount = (sectionData.problem_statement || "").length;
    const disciplineCharCount = (sectionData.discipline_contribution || "").length;

    const sectionLabel = "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500";
    const badgeMandatory =
        "shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700";
    const badgeRequired =
        "shrink-0 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-600";

    return (
        <div className="mx-auto max-w-4xl space-y-8 pb-8">

            {/* ── Section Header ─────────────────────────────────────────── */}
            <div className="space-y-5">
                <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm">
                        <FileText className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                            <span className="text-indigo-600">SECTION 2:</span> Project context
                        </h2>
                    </div>
                </div>

                <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3.5 sm:px-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-600">
                        Purpose of this section
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                        This section establishes the{" "}
                        <span className="font-semibold text-slate-900">
                            baseline condition before your intervention
                        </span>
                        . Describe what problem existed, who was affected, what gap required attention,
                        and what informed your understanding of the issue.
                    </p>
                </div>

                <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:px-5">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <p className="text-sm leading-relaxed text-amber-900">
                        This section describes the situation{" "}
                        <span className="font-semibold">before</span> your project activities. Do not
                        describe results, outcomes, or achievements here — those belong in Section 5.
                    </p>
                </div>
            </div>

            {/* ── 2.1 Project Identity ───────────────────────────────────── */}
            <section className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                                2.1
                            </span>
                            <h3 className="text-base font-semibold text-slate-900">Project Identity</h3>
                        </div>
                        <p className="pl-9 text-sm text-slate-500">
                            Project information is displayed automatically for institutional
                            traceability and reporting consistency.
                        </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />
                        Auto-filled · read-only
                    </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                        { label: "Partner Organization", value: partner, icon: Building },
                        { label: "Location", value: locationDisplay, icon: MapPin },
                        { label: "Project Duration", value: `${startDate} – ${endDate}`, icon: Calendar },
                    ].map((item) => (
                        <div
                            key={item.label}
                            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                            <div className="mb-2.5 flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                    <item.icon className="h-3.5 w-3.5" />
                                </div>
                                <p className={sectionLabel}>{item.label}</p>
                            </div>
                            <p className="text-sm font-medium leading-relaxed text-slate-800">
                                {item.value}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── 2.2 Problem / System Need ──────────────────────────────── */}
            <section className="space-y-4">
                <div className="flex flex-wrap items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                        2.2
                    </span>
                    <h3 className="text-base font-semibold text-slate-900">Problem / system need</h3>
                    <span className={clsx(badgeMandatory, "ml-auto")}>Mandatory · 100–200 words</span>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-2 md:divide-x md:divide-y-0">
                        <div className="space-y-3 bg-indigo-50/40 p-5">
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600">
                                Describe the situation
                            </p>
                            <ul className="space-y-2">
                                {[
                                    "What specific issue or challenge existed?",
                                    "Who was affected?",
                                    "What gap was present? (skills, access, systems)",
                                    "Why was a structured intervention necessary?",
                                ].map((q) => (
                                    <li
                                        key={q}
                                        className="flex items-start gap-2 text-sm leading-relaxed text-slate-700"
                                    >
                                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-indigo-500" />
                                        {q}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="space-y-3 bg-rose-50/50 p-5">
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-600">
                                Avoid
                            </p>
                            <ul className="space-y-2">
                                {[
                                    "Do not describe your activities here",
                                    "Do not describe results or outcomes",
                                    "Do not claim achievements yet",
                                ].map((q) => (
                                    <li
                                        key={q}
                                        className="flex items-start gap-2 text-sm leading-relaxed text-rose-800/80"
                                    >
                                        <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                                        {q}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="space-y-3 border-t border-slate-100 p-5">
                        <Textarea
                            placeholder="Before our intervention, the situation was characterized by…"
                            readOnly={isReadOnly}
                            disabled={isReadOnly}
                            className={clsx(
                                "min-h-[180px] resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100",
                                getFieldError("problem_statement") && "border-red-400 bg-red-50/30",
                            )}
                            value={sectionData.problem_statement}
                            onChange={(e) =>
                                updateSection("section2", { problem_statement: e.target.value })
                            }
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-100 sm:w-48">
                                <div
                                    className={clsx(
                                        "h-full rounded-full transition-all",
                                        wordCount < 100
                                            ? "bg-amber-400"
                                            : wordCount > 200
                                              ? "bg-red-500"
                                              : "bg-emerald-500",
                                    )}
                                    style={{
                                        width: `${Math.min((wordCount / 200) * 100, 100)}%`,
                                    }}
                                />
                            </div>
                            <p
                                className={clsx(
                                    "text-[11px] tabular-nums",
                                    wordCount >= 100 && wordCount <= 200
                                        ? "text-emerald-600"
                                        : wordCount > 200
                                          ? "text-red-500"
                                          : "text-slate-400",
                                )}
                            >
                                {wordCount} / 200 words · {charCount} characters
                            </p>
                        </div>
                        <FieldError message={getFieldError("problem_statement")} />
                    </div>
                </div>
            </section>

            {/* ── 2.3 Academic Discipline Applied ────────────────────────── */}
            <section className="space-y-4">
                <div className="flex flex-wrap items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                        2.3
                    </span>
                    <h3 className="text-base font-semibold text-slate-900">
                        Academic discipline applied
                    </h3>
                    <span className={clsx(badgeMandatory, "ml-auto")}>Mandatory</span>
                </div>

                <p className="pl-9 text-sm text-slate-500">
                    Describe how your academic discipline helped you analyse the problem and structure
                    your engagement approach.
                </p>

                <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="space-y-2">
                        <Label className={sectionLabel}>Primary Academic Discipline</Label>
                        <SingleSelect
                            options={disciplines}
                            value={sectionData.discipline}
                            onChange={(val) => updateSection("section2", { discipline: val })}
                            placeholder="Select a discipline..."
                            disabled={isReadOnly}
                        />
                        <FieldError message={getFieldError("discipline")} />
                    </div>

                    <div className="space-y-3 border-t border-slate-100 pt-6">
                        <Label className={sectionLabel}>Problem Statement Summary</Label>
                        <p className="text-sm leading-relaxed text-slate-500">
                            Explain how your academic background helped you analyse the problem, design
                            a structured approach, or apply technical, research, legal, financial, or
                            social frameworks.
                        </p>

                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-1">
                            <span className="inline-flex items-start gap-1.5 text-xs font-medium text-emerald-700">
                                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                Be specific: explain how your knowledge was applied.
                            </span>
                            <span className="inline-flex items-start gap-1.5 text-xs font-medium text-rose-600">
                                <X className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                Avoid: &ldquo;My degree helped me understand society.&rdquo;
                            </span>
                        </div>

                        <Textarea
                            placeholder="Example: Utilized engineering optimization models to identify inefficiencies in waste collection routing…"
                            readOnly={isReadOnly}
                            disabled={isReadOnly}
                            className={clsx(
                                "min-h-[140px] resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100",
                                getFieldError("discipline_contribution") && "border-red-300",
                                disciplineWordCount > 200 && "border-red-400",
                            )}
                            value={sectionData.discipline_contribution}
                            onChange={(e) =>
                                updateSection("section2", {
                                    discipline_contribution: e.target.value,
                                })
                            }
                        />
                        <div className="flex justify-end">
                            <p
                                className={clsx(
                                    "text-[11px] tabular-nums",
                                    disciplineWordCount > 200
                                        ? "text-red-500"
                                        : disciplineWordCount >= 100
                                          ? "text-emerald-600"
                                          : "text-slate-400",
                                )}
                            >
                                {disciplineWordCount} / 200 words · {disciplineCharCount} characters
                            </p>
                        </div>
                        <FieldError message={getFieldError("discipline_contribution")} />
                    </div>
                </div>
            </section>

            {/* ── 2.4 Baseline Evidence Source ───────────────────────────── */}
            <section className="space-y-4">
                <div className="flex flex-wrap items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                        2.4
                    </span>
                    <h3 className="text-base font-semibold text-slate-900">
                        Baseline evidence source
                    </h3>
                    <span className={clsx(badgeRequired, "ml-auto")}>Required</span>
                </div>

                <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="space-y-1">
                        <Label className={sectionLabel}>
                            What informed your understanding of the problem?
                        </Label>
                        <p className="text-sm text-slate-500">
                            What specific data or observation informed your understanding of the
                            baseline situation?
                        </p>
                    </div>

                    <MultiSelect
                        options={evidenceTypes}
                        selected={sectionData.baseline_evidence || []}
                        onChange={(values) => {
                            const s = syncBaselineOtherSlots(
                                values,
                                sectionData.baseline_other_entries,
                            );
                            updateSection("section2", {
                                baseline_evidence: s.evidence,
                                baseline_other_entries: s.entries,
                                baseline_evidence_other: s.legacyOther,
                            });
                        }}
                        getTagLabel={otherTagLabel}
                        isDropdownOptionSelected={(opt, sel) =>
                            opt === "Other"
                                ? sel.some((x) => isOtherSlotToken(x) || x === "Other")
                                : sel.includes(opt)
                        }
                        resolveToggle={(opt, cur) => {
                            if (opt === "Other") {
                                const hasAnyOther = cur.some(
                                    (x) => isOtherSlotToken(x) || x === "Other",
                                );
                                if (hasAnyOther) {
                                    return cur.filter(
                                        (x) => !isOtherSlotToken(x) && x !== "Other",
                                    );
                                }
                                return [...cur, "__o_0"];
                            }
                            if (isOtherSlotToken(opt)) {
                                return cur.filter((x) => x !== opt);
                            }
                            if (cur.includes(opt)) {
                                return cur.filter((x) => x !== opt);
                            }
                            return [...cur, opt];
                        }}
                        placeholder="Select data or observations..."
                        disabled={isReadOnly}
                    />
                    <FieldError message={getFieldError("baseline_evidence")} />

                    {otherCount > 0 && (
                        <div className="space-y-4 border-t border-slate-100 pt-5">
                            <div className="space-y-1">
                                <Label className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                    <AlertCircle className="h-4 w-4 text-amber-500" />
                                    Specify evidence source{otherCount > 1 ? "s" : ""}
                                </Label>
                                <p className="text-xs leading-relaxed text-slate-500">
                                    Clearly explain what documentation, consultation, or institutional
                                    data informed your baseline understanding. Use the button below if
                                    you need more than one custom source.
                                </p>
                            </div>
                            {otherEntries.map((entryText, i) => (
                                <div key={`baseline-other-${i}`} className="space-y-2">
                                    {otherCount > 1 ? (
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                            Other source {i + 1}
                                        </p>
                                    ) : null}
                                    <Input
                                        placeholder="Example: Review of internal performance records and consultation with local administrative leads…"
                                        readOnly={isReadOnly}
                                        disabled={isReadOnly}
                                        className={clsx(
                                            "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:border-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-100",
                                            getFieldError(`baseline_other_entries.${i}`) &&
                                                "border-red-400 bg-red-50/30",
                                        )}
                                        value={entryText}
                                        onChange={(e) => {
                                            const next = [...otherEntries];
                                            next[i] = e.target.value;
                                            updateSection("section2", {
                                                baseline_other_entries: next,
                                                baseline_evidence_other: next.join("\n\n---\n\n"),
                                            });
                                        }}
                                    />
                                    <FieldError
                                        message={getFieldError(`baseline_other_entries.${i}`)}
                                    />
                                </div>
                            ))}
                            {!isReadOnly && otherCount > 0 ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full rounded-lg border-slate-200 text-sm font-medium text-slate-700 sm:w-auto"
                                    onClick={() => {
                                        const ev = sectionData.baseline_evidence || [];
                                        const c = otherSlotCount(ev);
                                        const nextSel = [...ev, `__o_${c}`];
                                        const s = syncBaselineOtherSlots(
                                            nextSel,
                                            sectionData.baseline_other_entries,
                                        );
                                        updateSection("section2", {
                                            baseline_evidence: s.evidence,
                                            baseline_other_entries: s.entries,
                                            baseline_evidence_other: s.legacyOther,
                                        });
                                    }}
                                >
                                    Add another &apos;Other&apos; source
                                </Button>
                            ) : null}
                        </div>
                    )}
                </div>
            </section>

            {/* ── System-Generated Summary (logic preserved) ─────────────── */}
            <section className="space-y-4 border-t border-slate-200 pt-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                            <BookOpen className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-slate-900">
                                System-generated summary
                            </h3>
                            <p className="text-xs text-slate-500">Auto-built from your answers above</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleGenerateAISummary}
                            disabled={isGenerating || isReadOnly}
                            className="inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-40"
                        >
                            {isGenerating ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Sparkles className="h-3.5 w-3.5" />
                            )}
                            {isGenerating ? "Generating…" : "Improve with AI"}
                        </button>
                        <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            Auto-generated
                        </span>
                    </div>
                </div>

                {sectionData.summary_text ? (
                    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="flex flex-wrap gap-2">
                            {sectionData.problem_category ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                    {sectionData.problem_category}
                                </span>
                            ) : null}
                            {sectionData.primary_beneficiary ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                                    <Users className="h-3 w-3" />
                                    {sectionData.primary_beneficiary}
                                </span>
                            ) : null}
                            {(district || province) && (district !== "—" || province !== "—") ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                    <MapPin className="h-3 w-3" />
                                    {[district, province].filter((x) => x && x !== "—").join(", ")}
                                </span>
                            ) : null}
                        </div>
                        <p className="text-sm leading-relaxed text-slate-700">
                            {sectionData.summary_text}
                        </p>
                        <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                                CIEL institutional traceability
                            </p>
                            <p className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                                REF:{" "}
                                {projectData?.id?.substring(0, 12).toUpperCase() || "BASE-REG-2024"}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-300 shadow-sm">
                            <BookOpen className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-semibold text-slate-700">Summary not ready yet</p>
                        <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-500">
                            Complete the problem statement (100+ words), select a discipline, and choose
                            a baseline evidence source — a structured summary will appear here
                            automatically.
                        </p>
                    </div>
                )}
            </section>
        </div>
    );
}
