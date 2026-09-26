"use client";
import React, { useMemo, useState, useLayoutEffect, useRef } from "react";
import { toast } from "sonner";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import { SingleSelect } from "./ui/SingleSelect";
import clsx from "clsx";
import { FIELD_WORD_POLICY, wordRangeLabel, reportTextWordMeter } from "../utils/validation";

const PROBLEM_WORD_RANGE = FIELD_WORD_POLICY.problem_statement;
const DISCIPLINE_WORD_RANGE = FIELD_WORD_POLICY.discipline_contribution;

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

/** Prefer multi-entry Other texts; fall back to legacy single string. */
function resolveSystemGapsOtherEntries(section: {
    system_gaps_other_entries?: string[];
    system_gaps_other?: string;
}): string[] {
    if (Array.isArray(section.system_gaps_other_entries) && section.system_gaps_other_entries.length > 0) {
        return section.system_gaps_other_entries.map((entry) => String(entry ?? ""));
    }
    const legacy = String(section.system_gaps_other || "");
    return [legacy];
}

function joinSystemGapsOther(entries: string[]): string {
    return entries
        .map((entry) => entry.trim())
        .filter(Boolean)
        .join("\n\n---\n\n");
}

function formatSystemGapsOtherLabels(entries: string[]): string {
    const cleaned = entries.map((entry) => entry.trim()).filter(Boolean);
    if (!cleaned.length) return "other factors";
    return listJoin(cleaned.map((entry) => entry.toLowerCase()));
}

const GAP_OPTIONS = [
    { value: "Skills", label: "🧰 Skills" },
    { value: "Knowledge", label: "🧠 Knowledge" },
    { value: "Access", label: "🚪 Access" },
    { value: "Resources", label: "📦 Resources" },
    { value: "Infrastructure", label: "🏗️ Infrastructure" },
    { value: "Funding", label: "💰 Funding" },
    { value: "Services", label: "🩺 Services" },
    { value: "Technology", label: "💻 Technology" },
    { value: "Systems", label: "⚙️ Systems / Processes" },
    { value: "Awareness", label: "💡 Awareness" },
    { value: "Inclusion", label: "♿ Inclusion" },
    { value: "Safety", label: "🛡️ Safety" },
    { value: "Community Participation", label: "👥 Community Participation" },
    { value: "Data / Information", label: "📊 Data / Information" },
    { value: "Other", label: "✏️ Other" },
];

const EVIDENCE_OPTIONS = [
    { value: "Observation", label: "👀 Observation" },
    { value: "Survey Data", label: "📋 Survey data" },
    { value: "Community Interviews", label: "💬 Community interviews" },
    { value: "Focus Group", label: "👥 Focus group" },
    { value: "Partner-Provided Data", label: "🤝 Partner-provided data" },
    { value: "Attendance / Administrative Records", label: "📁 Attendance / administrative records" },
    { value: "Government Data", label: "🏛️ Government / public data" },
    { value: "Academic Research", label: "🎓 Academic research" },
    { value: "Needs Assessment", label: "🧭 Needs assessment" },
    { value: "Environmental Measurement", label: "🌿 Environmental measurement" },
    { value: "Digital Analytics", label: "💻 Digital analytics" },
    { value: "Previous Project Data", label: "🗂️ Previous project data" },
    { value: "Other", label: "✏️ Other" },
];

const DISCIPLINES = [
    "Architecture & Design",
    "Business & Management",
    "Computer Science & IT",
    "Economics",
    "Education",
    "Engineering",
    "Environmental Sciences",
    "Fine Arts",
    "Law",
    "Liberal Arts & Social Sciences",
    "Mass Communication & Media",
    "Psychology",
    "Public Health",
    "Other…",
];

export default function Section2ProjectContext({ projectData }: Section2Props) {
    const { data, updateSection, getFieldError, isReportSectionsReadOnly } = useReportForm();
    const isReadOnly = isReportSectionsReadOnly;

    const sectionData = data.section2;

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
        affectedCount: string,
        gaps: string[],
        gapsOtherEntries: string[],
        evidenceList: string,
        discipline: string,
        disciplineContribution: string,
    ) => {
        const parts: string[] = [];

        const problemLead = firstSentence(problemStatement);
        if (problemLead) parts.push(`Before this project, ${lowerFirst(problemLead)}`);

        if (affectedGroup.trim()) {
            const who = lowerFirst(affectedGroup.trim().replace(/\.$/, ""));
            const count = affectedCount.trim();
            parts.push(`Those most affected were ${count ? `around ${count} ` : ""}${who}.`);
        }

        if (gaps.length) {
            const gapLabels = gaps.map((g) =>
                g === "Other" ? formatSystemGapsOtherLabels(gapsOtherEntries) : g.toLowerCase(),
            );
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
            (sectionData.affected_count || "").trim() ||
            gaps.length > 0 ||
            evidenceArray.length > 0 ||
            sectionData.discipline;

        if (hasAnyInput) {
            const composed = composeBaseline(
                problemStatement,
                sectionData.affected_group || "",
                sectionData.affected_count || "",
                gaps,
                resolveSystemGapsOtherEntries(sectionData),
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
        sectionData.affected_count,
        sectionData.system_gaps,
        sectionData.system_gaps_other,
        sectionData.system_gaps_other_entries,
        updateSection,
    ]);

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

    const disciplineOptions = sectionData.discipline && !DISCIPLINES.includes(sectionData.discipline)
        ? [sectionData.discipline, ...DISCIPLINES]
        : DISCIPLINES;

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
        if (gap === "Other" && !cur.includes("Other")) {
            const entries = resolveSystemGapsOtherEntries(sectionData);
            updateSection("section2", {
                system_gaps: next,
                system_gaps_other_entries: entries.length ? entries : [""],
                system_gaps_other: joinSystemGapsOther(entries.length ? entries : [""]),
            });
            return;
        }
        if (gap === "Other" && cur.includes("Other")) {
            updateSection("section2", {
                system_gaps: next,
                system_gaps_other_entries: [],
                system_gaps_other: "",
            });
            return;
        }
        updateSection("section2", { system_gaps: next });
    };

    const gapOtherEntries = useMemo(
        () => resolveSystemGapsOtherEntries(sectionData),
        [sectionData.system_gaps_other, sectionData.system_gaps_other_entries],
    );

    const updateGapOtherEntries = (entries: string[]) => {
        updateSection("section2", {
            system_gaps_other_entries: entries,
            system_gaps_other: joinSystemGapsOther(entries),
        });
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

    const generateSmartDraft = () => {
        const problem = (sectionData.problem_statement || "").trim();
        if (!problem) {
            toast.error("Answer question 1 first.");
            return;
        }
        const who = (sectionData.affected_group || "").trim();
        const num = (sectionData.affected_count || "").trim();
        const gaps = (sectionData.system_gaps || []).map((g) =>
            g === "Other"
                ? formatSystemGapsOtherLabels(resolveSystemGapsOtherEntries(sectionData))
                : g,
        );
        const sources = formatBaselineEvidenceForDisplay(sectionData)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        const disc = sectionData.discipline === "Other…"
            ? (sectionData.discipline_other || "").trim()
            : (sectionData.discipline || "").trim();
        const how = (sectionData.discipline_contribution || "").trim();
        let text = `Before our project began, ${problem.replace(/\.$/, "")}. `;
        if (who) {
            text += `This weighed most heavily on ${num ? `roughly ${num} ` : ""}${who.replace(/\.$/, "")}, for whom the situation was a daily reality rather than a statistic. `;
        }
        if (gaps.length) {
            text += `At its core, the gap came down to ${listJoin(gaps.map((g) => g.toLowerCase()))} — needs that were visible but going unmet. `;
        }
        if (sources.length) {
            text += `Our understanding was not guesswork: it was grounded in ${listJoin(sources.map((s) => s.toLowerCase()))}. `;
        }
        if (disc && how) {
            text += `Coming from ${disc}, ${how.replace(/\.$/, "")} — which is why a structured intervention, rather than goodwill alone, was the right response.`;
        }
        updateSection("section2", { baseline_smart_draft: text.trim() });
    };

    const fieldClass = "min-h-[110px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-[var(--teal)] focus:bg-white focus:ring-2 focus:ring-[var(--aqua-soft)]";
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

            <div className="cer-note !mb-0">
                <span aria-hidden>☝️</span>
                <p>
                    <span className="font-semibold">One rule:</span> describe things <span className="font-semibold">before</span> your project — activities &amp; results live in Sections 4 &amp; 5.
                </p>
            </div>

            {/* ── Quick questions ────────────────────────────────────────── */}
            <div className="cer-card space-y-5">
                <div>
                    <div className="cer-secl">
                        <span className="cer-secn">2.1</span>
                        <h2>Quick questions</h2>
                        <span className="cer-tag">Mandatory</span>
                    </div>
                    <p className="cer-sub">Short answers are fine — the statement builds itself below.</p>
                </div>

                    {/* Q1 */}
                    <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">1 · What problem did you see?</p>
                            <span className="ml-auto shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                {wordRangeLabel(PROBLEM_WORD_RANGE.min, PROBLEM_WORD_RANGE.max)}
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
                        <p className={clsx("text-[11px] font-semibold uppercase tracking-wide tabular-nums", reportTextWordMeter(wordCount, PROBLEM_WORD_RANGE.min, PROBLEM_WORD_RANGE.max).textClass)}>
                            {wordCount} words · aim {PROBLEM_WORD_RANGE.min}–{PROBLEM_WORD_RANGE.max}
                        </p>
                        <FieldError message={getFieldError("problem_statement")} />
                    </div>

                    <div className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <p className="text-sm font-semibold text-slate-900">2 · Who was affected?</p>
                            <Input
                                placeholder="e.g. children aged 5–12 at the SOS Village"
                                readOnly={isReadOnly}
                                disabled={isReadOnly}
                                className={clsx(
                                    "h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-[#4285f4] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#4285f4]/20",
                                    getFieldError("affected_group") && "border-red-400 bg-red-50/30",
                                )}
                                value={sectionData.affected_group || ""}
                                onChange={(e) => updateSection("section2", { affected_group: e.target.value })}
                            />
                            <FieldError message={getFieldError("affected_group")} />
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-sm font-semibold text-slate-900">≈ How many?</p>
                            <Input
                                inputMode="numeric"
                                placeholder="e.g. 120"
                                readOnly={isReadOnly}
                                disabled={isReadOnly}
                                className={clsx(
                                    "h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-[#4285f4] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#4285f4]/20",
                                    getFieldError("affected_count") && "border-red-400 bg-red-50/30",
                                )}
                                value={sectionData.affected_count || ""}
                                onChange={(e) => updateSection("section2", { affected_count: e.target.value.replace(/[^\d]/g, "") })}
                            />
                            <FieldError message={getFieldError("affected_count")} />
                        </div>
                    </div>

                    {/* Q3 */}
                    <div className="space-y-1.5 border-t border-slate-100 pt-5">
                        <p className="text-sm font-semibold text-slate-900">3 · What was missing? <span className="font-normal text-slate-400">(tap all that apply)</span></p>
                        <div className="flex flex-wrap gap-2">
                            {GAP_OPTIONS.map((g) => (
                                <button
                                    key={g.value}
                                    type="button"
                                    disabled={isReadOnly}
                                    onClick={() => toggleGap(g.value)}
                                    className={chipClass((sectionData.system_gaps || []).includes(g.value))}
                                >
                                    {g.label}
                                </button>
                            ))}
                        </div>
                        <FieldError message={getFieldError("system_gaps")} />
                        {(sectionData.system_gaps || []).includes("Other") ? (
                            <div className="space-y-3 pt-1">
                                {gapOtherEntries.map((entryText, i) => (
                                    <div key={`system-gap-other-${i}`} className="space-y-1">
                                        {gapOtherEntries.length > 1 ? (
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                                    Other gap {i + 1}
                                                </p>
                                                {!isReadOnly && gapOtherEntries.length > 1 ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const next = gapOtherEntries.filter((_, idx) => idx !== i);
                                                            updateGapOtherEntries(next.length ? next : [""]);
                                                        }}
                                                        className="text-[10px] font-semibold text-rose-600 hover:underline"
                                                    >
                                                        Remove
                                                    </button>
                                                ) : null}
                                            </div>
                                        ) : null}
                                        <Input
                                            placeholder="What else was missing?"
                                            readOnly={isReadOnly}
                                            disabled={isReadOnly}
                                            className={clsx(
                                                "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-[var(--teal)] focus-visible:ring-2 focus-visible:ring-[var(--aqua-soft)]",
                                                getFieldError(`system_gaps_other_entries.${i}`) && "border-red-400 bg-red-50/30",
                                            )}
                                            value={entryText}
                                            onChange={(e) => {
                                                const next = [...gapOtherEntries];
                                                next[i] = e.target.value;
                                                updateGapOtherEntries(next);
                                            }}
                                        />
                                        <FieldError message={getFieldError(`system_gaps_other_entries.${i}`)} />
                                    </div>
                                ))}
                                <FieldError message={getFieldError("system_gaps_other")} />
                                {!isReadOnly ? (
                                    <button
                                        type="button"
                                        onClick={() => updateGapOtherEntries([...gapOtherEntries, ""])}
                                        className="text-xs font-semibold text-[var(--teal)] hover:underline"
                                    >
                                        + Add another &apos;Other&apos;
                                    </button>
                                ) : null}
                            </div>
                        ) : null}
                    </div>

                    {/* Q4 */}
                    <div className="space-y-2 border-t border-slate-100 pt-5">
                        <p className="text-sm font-semibold text-slate-900">4 · How did you know? <span className="font-normal text-slate-400">(tap all that apply)</span></p>
                        <div className="flex flex-wrap gap-2">
                            {EVIDENCE_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    disabled={isReadOnly}
                                    onClick={() => toggleEvidence(opt.value)}
                                    className={chipClass(isEvidenceSelected(opt.value))}
                                >
                                    {opt.label}
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
                                            placeholder="What else informed you?"
                                            readOnly={isReadOnly}
                                            disabled={isReadOnly}
                                            className={clsx(
                                                "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-[var(--teal)] focus-visible:ring-2 focus-visible:ring-[var(--aqua-soft)]",
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
                                        className="text-xs font-semibold text-[var(--teal)] hover:underline"
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
                                {wordRangeLabel(DISCIPLINE_WORD_RANGE.min, DISCIPLINE_WORD_RANGE.max)}
                            </span>
                        </div>
                        <SingleSelect
                            options={disciplineOptions}
                            value={sectionData.discipline}
                            onChange={(val) => updateSection("section2", { discipline: val })}
                            placeholder="Select your discipline…"
                            disabled={isReadOnly}
                        />
                        <FieldError message={getFieldError("discipline")} />
                        {sectionData.discipline === "Other…" ? (
                            <Input
                                placeholder="Name your discipline…"
                                disabled={isReadOnly}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-[var(--teal)] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[var(--aqua-soft)]"
                                value={sectionData.discipline_other || ""}
                                onChange={(e) => updateSection("section2", { discipline_other: e.target.value })}
                            />
                        ) : null}
                        <p className="text-xs text-slate-500">Be specific: how was your academic background applied — not &ldquo;my degree helped me understand society.&rdquo;</p>
                        <Textarea
                            placeholder="e.g. we used our design training to audit lighting and seating against classroom standards"
                            readOnly={isReadOnly}
                            disabled={isReadOnly}
                            className={clsx(fieldClass, getFieldError("discipline_contribution") && "border-red-400 bg-red-50/30")}
                            value={sectionData.discipline_contribution}
                            onChange={(e) => updateSection("section2", { discipline_contribution: e.target.value })}
                        />
                        <p className={clsx("text-[11px] font-semibold uppercase tracking-wide tabular-nums", reportTextWordMeter(disciplineWordCount, DISCIPLINE_WORD_RANGE.min, DISCIPLINE_WORD_RANGE.max).textClass)}>
                            {disciplineWordCount} words · aim {DISCIPLINE_WORD_RANGE.min}–{DISCIPLINE_WORD_RANGE.max}
                        </p>
                        <FieldError message={getFieldError("discipline_contribution")} />
                    </div>
            </div>

            <section className="cer-card space-y-3">
                <div className="cer-secl">
                    <span className="cer-secn">2.2</span>
                    <h2>Your baseline statement</h2>
                    <span className="cer-tag auto">Builds itself live</span>
                </div>
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-800">
                    {sectionData.summary_text?.trim()
                        ? sectionData.summary_text
                        : <span className="text-slate-400">Answer the questions above — your statement appears here…</span>}
                </div>
                {!isReadOnly ? (
                    <button
                        type="button"
                        onClick={generateSmartDraft}
                        className="rounded-full border border-[#25b8d8] bg-[#f0fbfd] px-4 py-2 text-sm font-semibold text-[#0e7490]"
                    >
                        ✨ Generate smart draft summary — one strong paragraph
                    </button>
                ) : null}
                {sectionData.baseline_smart_draft?.trim() ? (
                    <div className="rounded-xl border border-[#25b8d8] bg-[#f0fbfd] px-4 py-3 text-sm leading-relaxed text-slate-800">
                        {sectionData.baseline_smart_draft}
                    </div>
                ) : null}
            </section>
        </div>
    );
}
