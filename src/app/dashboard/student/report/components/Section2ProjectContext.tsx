"use client";
import React, { useMemo, useState, useLayoutEffect, useRef } from "react";
import { generateAISummary } from "../utils/aiSummarizer";
import { toast } from "sonner";
import { Sparkles, Loader2, Building, AlertCircle, CheckCircle2, MapPin, Calendar, Users } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import { SingleSelect } from "./ui/SingleSelect";
import clsx from "clsx";

/** Internal tokens for multiple "Other" rows in Q4 evidence (must not match human-readable option labels). */
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

function listJoin(items: string[]): string {
    if (items.length < 2) return items.join("");
    return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const GAP_OPTIONS = ["Skills", "Access", "Resources", "Systems", "Awareness", "Other"];

export default function Section2ProjectContext({ projectData }: Section2Props) {
    const { data, updateSection, getFieldError, isReportSectionsReadOnly } = useReportForm();
    const isReadOnly = isReportSectionsReadOnly;

    const sectionData = data.section2;

    const [isGenerating, setIsGenerating] = useState(false);
    const legacyOtherMigrated = useRef(false);
    /** Tracks the last summary WE composed, so a student's hand-edit is never silently overwritten. */
    const lastAutoSummaryRef = useRef<string>("");

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
            toast.error("Please provide at least 100 words in Question 1 first.");
            return;
        }
        if (!sectionData.discipline) {
            toast.error("Please select an academic discipline first.");
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
            lastAutoSummaryRef.current = result.summary;
            updateSection('section2', {
                summary_text: result.summary,
                problem_category: classifyProblem(sectionData.problem_statement),
                primary_beneficiary: detectBeneficiary(sectionData.problem_statement)
            });
            toast.success("AI baseline statement generated!");
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

    /** First sentence (or a clipped lead-in) of free text, used to quote the student's own wording instead of a generic label. */
    const firstSentence = (text: string, maxLen = 220) => {
        const trimmed = (text || "").trim();
        if (!trimmed) return "";
        const match = trimmed.match(/^[^.!?]*[.!?]/);
        const candidate = (match ? match[0] : trimmed).trim();
        return candidate.length <= maxLen ? candidate : `${candidate.slice(0, maxLen).trim()}…`;
    };

    const lowerFirst = (text: string) => {
        const t = text.trim();
        return t ? t.charAt(0).toLowerCase() + t.slice(1) : t;
    };

    /** Composes the baseline statement from all five quick-question answers — not a generic template. */
    const composeBaseline = (
        problemStatement: string,
        affectedGroup: string,
        gaps: string[],
        gapsOther: string,
        evidenceList: string,
        discipline: string,
        disciplineContribution: string,
    ) => {
        const parts: string[] = [];

        const problemLead = firstSentence(problemStatement);
        if (problemLead) parts.push(`Before this project, ${lowerFirst(problemLead)}`);

        if (affectedGroup.trim()) {
            parts.push(`This affected ${lowerFirst(affectedGroup.trim().replace(/\.$/, ""))}.`);
        }

        if (gaps.length) {
            const gapLabels = gaps.map((g) => (g === "Other" ? (gapsOther.trim() || "other factors") : g.toLowerCase()));
            parts.push(`The core gaps were in ${listJoin(gapLabels)}.`);
        }

        if (evidenceList) {
            parts.push(`This baseline understanding was informed through ${evidenceList}.`);
        }

        if (discipline) {
            const contribution = disciplineContribution ? lowerFirst(firstSentence(disciplineContribution, 200)) : "";
            parts.push(
                contribution
                    ? `Drawing on a background in ${discipline}, ${contribution}`
                    : `The project draws on academic grounding in ${discipline}.`,
            );
        }

        return parts.join(" ");
    };

    // ─── Auto-compose the baseline statement as answers come in — builds from whatever's filled so far, not gated on any one field being "complete" ───
    React.useEffect(() => {
        const evidenceArray = sectionData.baseline_evidence || [];
        const hasOtherBlock =
            evidenceArray.includes("Other") || evidenceArray.some((t) => isOtherSlotToken(t));
        const evidenceSource = hasOtherBlock
            ? formatBaselineEvidenceForDisplay(sectionData)
            : evidenceArray.join(", ");
        const problemStatement = sectionData.problem_statement || "";
        const gaps = sectionData.system_gaps || [];

        const hasAnyInput =
            problemStatement.trim() ||
            (sectionData.affected_group || "").trim() ||
            gaps.length > 0 ||
            evidenceArray.length > 0 ||
            sectionData.discipline;

        if (hasAnyInput) {
            const composed = composeBaseline(
                problemStatement,
                sectionData.affected_group || "",
                gaps,
                sectionData.system_gaps_other || "",
                evidenceSource,
                sectionData.discipline,
                sectionData.discipline_contribution,
            );

            // Only auto-update while the student hasn't hand-edited the draft away from our last output.
            const isStillAutoGenerated = !sectionData.summary_text || sectionData.summary_text === lastAutoSummaryRef.current;
            if (isStillAutoGenerated && composed !== sectionData.summary_text) {
                lastAutoSummaryRef.current = composed;
                const patch: Record<string, unknown> = { summary_text: composed };
                if (problemStatement.trim()) {
                    patch.problem_category = classifyProblem(problemStatement);
                    patch.primary_beneficiary = detectBeneficiary(problemStatement);
                }
                updateSection('section2', patch);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        sectionData.problem_statement,
        sectionData.discipline,
        sectionData.discipline_contribution,
        sectionData.baseline_evidence,
        sectionData.baseline_evidence_other,
        sectionData.baseline_other_entries,
        sectionData.affected_group,
        sectionData.system_gaps,
        sectionData.system_gaps_other,
        updateSection,
    ]);

    // ─── Word counts ─────────────────────────────────────────────────────────
    const wordCount = (sectionData.problem_statement || "").trim().split(/\s+/).filter((w) => w).length;
    const disciplineWordCount = (sectionData.discipline_contribution || "").trim().split(/\s+/).filter((w) => w).length;
    const summaryWordCount = (sectionData.summary_text || "").trim().split(/\s+/).filter((w) => w).length;
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

    const toggleEvidence = (opt: string) => {
        const cur = sectionData.baseline_evidence || [];
        let next: string[];
        if (opt === "Other") {
            const hasAnyOther = cur.some((x) => isOtherSlotToken(x) || x === "Other");
            next = hasAnyOther ? cur.filter((x) => !isOtherSlotToken(x) && x !== "Other") : [...cur, "__o_0"];
        } else if (isOtherSlotToken(opt)) {
            next = cur.filter((x) => x !== opt);
        } else {
            next = cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt];
        }
        const s = syncBaselineOtherSlots(next, sectionData.baseline_other_entries);
        updateSection("section2", {
            baseline_evidence: s.evidence,
            baseline_other_entries: s.entries,
            baseline_evidence_other: s.legacyOther,
        });
    };
    const isEvidenceSelected = (opt: string) =>
        opt === "Other"
            ? (sectionData.baseline_evidence || []).some((x) => isOtherSlotToken(x) || x === "Other")
            : (sectionData.baseline_evidence || []).includes(opt);

    const toggleGap = (gap: string) => {
        const cur = sectionData.system_gaps || [];
        const next = cur.includes(gap) ? cur.filter((x) => x !== gap) : [...cur, gap];
        updateSection("section2", { system_gaps: next });
    };

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

    const fieldClass = "min-h-[110px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100";
    const chipClass = (isSel: boolean) =>
        clsx(
            "rounded-full border px-3.5 py-2 text-xs font-semibold transition",
            isSel
                ? "border-[#0e7d74] bg-[#0e7d74] text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-[#0e7d74] hover:text-[#0e7d74]",
            isReadOnly && "cursor-not-allowed opacity-60",
        );

    return (
        <div className="mx-auto max-w-5xl space-y-5 pb-8">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="cer-dup-head space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Section 2 of 11 — Project Context
                </p>
                <p className="text-base font-semibold text-slate-900">{title}</p>
                <h1 className="pt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                    What was the situation before you started?
                </h1>
                <p className="text-sm text-slate-500">
                    Answer a few quick questions — we&apos;ll compose the baseline statement for you. You just review and edit.
                </p>
            </div>

            {/* ── Compact project strip ─────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5">
                {[
                    { label: "Partner Organization", value: partner, icon: Building },
                    { label: "Location", value: locationDisplay, icon: MapPin },
                    { label: "Project Duration", value: `${startDate} – ${endDate}`, icon: Calendar },
                ].map((item) => (
                    <div key={item.label} className="flex min-w-0 items-center gap-2" title={item.label}>
                        <item.icon className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                        <span className="truncate text-sm font-semibold text-slate-800">{item.value}</span>
                    </div>
                ))}
                <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Auto-filled
                </span>
            </div>

            {/* ── One-rule banner ────────────────────────────────────────── */}
            <div className="flex gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/80 px-4 py-3 text-sm leading-relaxed text-indigo-900 sm:px-5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                <p>
                    One rule only: describe things <span className="font-semibold">before</span> your project —
                    save activities and results for later sections.
                </p>
            </div>

            {/* ── Two-column: quick questions + live draft ──────────────── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">

                {/* LEFT: quick questions */}
                <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div>
                        <h2 className="text-base font-semibold text-slate-900">Quick questions</h2>
                        <p className="text-xs text-slate-500">Short answers are fine — the statement builds itself on the right.</p>
                    </div>

                    {/* Q1 */}
                    <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">1 · What problem did you see?</p>
                            <span className="ml-auto shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                100–200 words
                            </span>
                        </div>
                        <p className="text-xs text-slate-500">Be specific — what issue, gap, or challenge existed, and why did it need a structured response?</p>
                        <Textarea
                            placeholder="The problem was…"
                            readOnly={isReadOnly}
                            disabled={isReadOnly}
                            className={clsx(fieldClass, "min-h-[150px]", getFieldError("problem_statement") && "border-red-400 bg-red-50/30")}
                            value={sectionData.problem_statement}
                            onChange={(e) => updateSection("section2", { problem_statement: e.target.value })}
                        />
                        <div className="flex items-center justify-between">
                            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className={clsx(
                                        "h-full rounded-full transition-all",
                                        wordCount < 100 ? "bg-amber-400" : wordCount > 200 ? "bg-red-500" : "bg-emerald-500",
                                    )}
                                    style={{ width: `${Math.min((wordCount / 200) * 100, 100)}%` }}
                                />
                            </div>
                            <p className={clsx("text-[11px] tabular-nums", wordCount >= 100 && wordCount <= 200 ? "text-emerald-600" : wordCount > 200 ? "text-red-500" : "text-slate-400")}>
                                {wordCount} / 200 words · {charCount} chars
                            </p>
                        </div>
                        <FieldError message={getFieldError("problem_statement")} />
                    </div>

                    {/* Q2 */}
                    <div className="space-y-1.5 border-t border-slate-100 pt-5">
                        <p className="text-sm font-semibold text-slate-900">2 · Who was affected?</p>
                        <p className="text-xs text-slate-500">Add a rough number if you know it.</p>
                        <Input
                            placeholder="e.g. around 120 children aged 5–12 at the SOS Village"
                            readOnly={isReadOnly}
                            disabled={isReadOnly}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-300 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-100"
                            value={sectionData.affected_group || ""}
                            onChange={(e) => updateSection("section2", { affected_group: e.target.value })}
                        />
                    </div>

                    {/* Q3 */}
                    <div className="space-y-1.5 border-t border-slate-100 pt-5">
                        <p className="text-sm font-semibold text-slate-900">3 · What was missing? <span className="font-normal text-slate-400">(tap all that apply)</span></p>
                        <div className="flex flex-wrap gap-2">
                            {GAP_OPTIONS.map((g) => (
                                <button
                                    key={g}
                                    type="button"
                                    disabled={isReadOnly}
                                    onClick={() => toggleGap(g)}
                                    className={chipClass((sectionData.system_gaps || []).includes(g))}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>
                        {(sectionData.system_gaps || []).includes("Other") ? (
                            <Input
                                placeholder="Describe what was missing…"
                                readOnly={isReadOnly}
                                disabled={isReadOnly}
                                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-100"
                                value={sectionData.system_gaps_other || ""}
                                onChange={(e) => updateSection("section2", { system_gaps_other: e.target.value })}
                            />
                        ) : null}
                    </div>

                    {/* Q4 */}
                    <div className="space-y-2 border-t border-slate-100 pt-5">
                        <p className="text-sm font-semibold text-slate-900">4 · How did you know? <span className="font-normal text-slate-400">(tap all that apply)</span></p>
                        <div className="flex flex-wrap gap-2">
                            {evidenceTypes.map((opt) => (
                                <button
                                    key={opt}
                                    type="button"
                                    disabled={isReadOnly}
                                    onClick={() => toggleEvidence(opt)}
                                    className={chipClass(isEvidenceSelected(opt))}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                        <FieldError message={getFieldError("baseline_evidence")} />

                        {otherCount > 0 && (
                            <div className="space-y-3 pt-1">
                                {otherEntries.map((entryText, i) => (
                                    <div key={`baseline-other-${i}`} className="space-y-1">
                                        {otherCount > 1 ? (
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Other source {i + 1}</p>
                                        ) : null}
                                        <Input
                                            placeholder="Describe the source…"
                                            readOnly={isReadOnly}
                                            disabled={isReadOnly}
                                            className={clsx(
                                                "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-100",
                                                getFieldError(`baseline_other_entries.${i}`) && "border-red-400 bg-red-50/30",
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
                                        <FieldError message={getFieldError(`baseline_other_entries.${i}`)} />
                                    </div>
                                ))}
                                {!isReadOnly ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const ev = sectionData.baseline_evidence || [];
                                            const c = otherSlotCount(ev);
                                            const nextSel = [...ev, `__o_${c}`];
                                            const s = syncBaselineOtherSlots(nextSel, sectionData.baseline_other_entries);
                                            updateSection("section2", {
                                                baseline_evidence: s.evidence,
                                                baseline_other_entries: s.entries,
                                                baseline_evidence_other: s.legacyOther,
                                            });
                                        }}
                                        className="text-xs font-semibold text-indigo-600 hover:underline"
                                    >
                                        + Add another &apos;Other&apos; source
                                    </button>
                                ) : null}
                            </div>
                        )}
                    </div>

                    {/* Q5 */}
                    <div className="space-y-2 border-t border-slate-100 pt-5">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">5 · Your field of study &amp; how it helped</p>
                            <span className="ml-auto shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                100–200 words
                            </span>
                        </div>
                        <SingleSelect
                            options={disciplines}
                            value={sectionData.discipline}
                            onChange={(val) => updateSection("section2", { discipline: val })}
                            placeholder="Select your discipline…"
                            disabled={isReadOnly}
                        />
                        <FieldError message={getFieldError("discipline")} />
                        <p className="text-xs text-slate-500">Be specific: how was your academic background applied — not &ldquo;my degree helped me understand society.&rdquo;</p>
                        <Textarea
                            placeholder="e.g. we used engineering optimization models to identify inefficiencies in waste collection routing…"
                            readOnly={isReadOnly}
                            disabled={isReadOnly}
                            className={clsx(fieldClass, getFieldError("discipline_contribution") && "border-red-400 bg-red-50/30")}
                            value={sectionData.discipline_contribution}
                            onChange={(e) => updateSection("section2", { discipline_contribution: e.target.value })}
                        />
                        <div className="flex items-center justify-between">
                            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className={clsx(
                                        "h-full rounded-full transition-all",
                                        disciplineWordCount < 100 ? "bg-amber-400" : disciplineWordCount > 200 ? "bg-red-500" : "bg-emerald-500",
                                    )}
                                    style={{ width: `${Math.min((disciplineWordCount / 200) * 100, 100)}%` }}
                                />
                            </div>
                            <p className={clsx("text-[11px] tabular-nums", disciplineWordCount >= 100 && disciplineWordCount <= 200 ? "text-emerald-600" : disciplineWordCount > 200 ? "text-red-500" : "text-slate-400")}>
                                {disciplineWordCount} / 200 words · {disciplineCharCount} chars
                            </p>
                        </div>
                        <FieldError message={getFieldError("discipline_contribution")} />
                    </div>
                </div>

                {/* RIGHT: live baseline draft */}
                <div className="lg:sticky lg:top-4 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div>
                        <h2 className="text-base font-semibold text-slate-900">Your baseline statement ✍️</h2>
                        <p className="text-xs text-slate-500">Builds itself as you answer on the left. Click in the box to edit directly.</p>
                    </div>

                    {(sectionData.problem_category || sectionData.primary_beneficiary || (district !== "—" || province !== "—")) ? (
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
                            {(district !== "—" || province !== "—") ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                    <MapPin className="h-3 w-3" />
                                    {[district, province].filter((x) => x && x !== "—").join(", ")}
                                </span>
                            ) : null}
                        </div>
                    ) : null}

                    <Textarea
                        placeholder="Start answering on the left and your statement will appear here…"
                        readOnly={isReadOnly}
                        disabled={isReadOnly}
                        className="min-h-[220px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                        value={sectionData.summary_text || ""}
                        onChange={(e) => updateSection("section2", { summary_text: e.target.value })}
                    />

                    <div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                                className={clsx(
                                    "h-full rounded-full transition-all",
                                    summaryWordCount >= 100 && summaryWordCount <= 200 ? "bg-emerald-500" : "bg-indigo-400",
                                )}
                                style={{ width: `${Math.min(100, (summaryWordCount / 200) * 100)}%` }}
                            />
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                            <span className={clsx("font-semibold tabular-nums", summaryWordCount >= 100 && summaryWordCount <= 200 && "text-emerald-600")}>
                                {summaryWordCount} words{summaryWordCount >= 100 && summaryWordCount <= 200 ? " ✓" : ""}
                            </span>
                            <span>aim for 100–200</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={handleGenerateAISummary}
                            disabled={isGenerating || isReadOnly}
                            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 text-xs font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-50 disabled:opacity-40"
                        >
                            {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                            {isGenerating ? "Generating…" : "✨ Expand with AI"}
                        </button>
                    </div>

                    <p className="border-t border-slate-100 pt-3 text-center text-[11px] text-slate-400">
                        That&apos;s the whole section — no separate essays, no duplicate summaries.
                    </p>
                </div>
            </div>
        </div>
    );
}
