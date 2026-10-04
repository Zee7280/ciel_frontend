"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";
import {
    CII_V2_ANCHORS,
    CII_V2_LEVELS,
    CII_V2_SECTIONS,
    levelByNumber,
    type CiiV2Lock,
    type CiiV2Result,
} from "@/utils/communityCiiAnalyser";
import { sumNonRejectedLoggedHours } from "@/app/dashboard/student/report/utils/engagementMetrics";
import "./community-cii-analyser.css";

const TEAL = "#0e7d74";

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
}

function pickNumber(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const n = Number(value.replace(/,/g, "").trim());
        return Number.isFinite(n) ? n : 0;
    }
    return 0;
}

function reportHours(report: Record<string, unknown>): number {
    const s1 = asRecord(report.section1);
    const metrics = asRecord(s1.metrics);
    const metricHours = pickNumber(metrics.total_verified_hours);
    const logs = asArray(s1.attendance_logs);
    const logHours = sumNonRejectedLoggedHours(
        logs.map((log) => {
            const row = asRecord(log);
            return {
                date: String(row.date || ""),
                hours: pickNumber(row.hours),
                start_time: typeof row.start_time === "string" ? row.start_time : undefined,
                end_time: typeof row.end_time === "string" ? row.end_time : undefined,
                approval_status: typeof row.approval_status === "string" ? row.approval_status : null,
            };
        }),
    );
    const rosterHours =
        pickNumber(asRecord(s1.team_lead).hours) +
        asArray(s1.team_members).reduce((sum: number, member) => sum + pickNumber(asRecord(member).hours), 0);
    const individualHours = asArray(metrics.individual_metrics).reduce(
        (sum: number, row) => sum + pickNumber(asRecord(row).individual_hours),
        0,
    );
    if (metricHours > 0) return metricHours;
    if (logHours > 0) return logHours;
    if (individualHours > 0) return individualHours;
    return rosterHours;
}

function evidenceCount(report: Record<string, unknown>): number {
    const keys = ["section1", "section2", "section3", "section4", "section5", "section6", "section7", "section8", "section9", "section10"];
    let files = 0;
    for (const key of keys) {
        const section = asRecord(report[key]);
        if (Array.isArray(section.media_urls)) files += section.media_urls.length;
        if (Array.isArray(section.evidence_files)) files += section.evidence_files.length;
    }
    if (Array.isArray(report.evidence_urls)) files += report.evidence_urls.length;
    const logs = Array.isArray(asRecord(report.section1).attendance_logs)
        ? (asRecord(report.section1).attendance_logs as unknown[])
        : [];
    const logEvidence = logs.filter((log) => {
        const row = asRecord(log);
        return Boolean(row.evidence_file || (typeof row.evidence_url === "string" && row.evidence_url.trim()));
    }).length;
    return Math.max(files, logEvidence);
}

function outcomeCount(report: Record<string, unknown>): number {
    const s5 = asRecord(report.section5);
    const rows = Array.isArray(s5.measurable_outcomes) ? s5.measurable_outcomes : [];
    return rows.filter((row) => {
        const rec = asRecord(row);
        return String(rec.metric || rec.outcome_area || "").trim() && (rec.baseline || rec.endline);
    }).length;
}

function sessionCount(report: Record<string, unknown>): number {
    const logs = Array.isArray(asRecord(report.section1).attendance_logs)
        ? (asRecord(report.section1).attendance_logs as unknown[])
        : [];
    return logs.length;
}

function partnerCount(report: Record<string, unknown>): number {
    const partners = asRecord(report.section7).partners;
    return Array.isArray(partners) ? partners.length : 0;
}

function clampScore(n: number): number {
    return Math.min(100, Math.max(0, Math.round(n * 10) / 10));
}

function splitLines(text: string | undefined): string[] {
    if (!text?.trim()) return [];
    return text
        .split(/[.;]\s+/)
        .map((part) => part.trim())
        .filter(Boolean)
        .slice(0, 4);
}

export default function CommunityCiiAnalyser({
    publisher = "faculty",
    readOnly = false,
}: {
    publisher?: "faculty" | "ciel_pk";
    /** Faculty view: inspect only — no Run / Approve / Reject. */
    readOnly?: boolean;
} = {}) {
    const params = useParams();
    const reportId = String(params.reportId ?? "");
    const isCielPk = publisher === "ciel_pk";
    const reportPath = isCielPk
        ? `/api/v1/admin/reports/${reportId}`
        : `/api/v1/faculty/reports/${reportId}`;
    const analysePath = isCielPk
        ? `/api/v1/admin/community-service/reports/${reportId}/cii-v2/analyse`
        : `/api/v1/faculty/reports/${reportId}/cii-v2/analyse`;
    const approvePath = isCielPk
        ? `/api/v1/admin/community-service/reports/${reportId}/cii-v2/approve`
        : `/api/v1/faculty/reports/${reportId}/cii-v2/approve`;
    const inboxHref = isCielPk
        ? "/dashboard/admin/reports/verify"
        : "/dashboard/faculty/community-service";
    const inboxLabel = isCielPk ? "Back to student reports" : "Back to Community Service";

    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState<Record<string, unknown> | null>(null);
    const [analysing, setAnalysing] = useState(false);
    const [approving, setApproving] = useState(false);
    const [deciding, setDeciding] = useState(false);
    const [facultyNote, setFacultyNote] = useState("");
    const [revisionSection, setRevisionSection] = useState("");
    const [requiredCorrection, setRequiredCorrection] = useState("");
    const [facultySectionScores, setFacultySectionScores] = useState<Record<number, number>>({});

    const ciiV2 = (report?.ciiV2 as CiiV2Result | undefined) || null;
    const ciiV2Lock = (report?.ciiV2Lock as CiiV2Lock | undefined) || null;
    const locked = Boolean(ciiV2Lock?.locked);

    const loadReport = async () => {
        if (!reportId) return;
        try {
            setLoading(true);
            const res = await authenticatedFetch(reportPath);
            if (!res?.ok) {
                toast.error("Report not available");
                setReport(null);
                return;
            }
            const data = await res.json();
            const next = (data.data || data) as Record<string, unknown>;
            setReport(next);
            const nextCii = next.ciiV2 as CiiV2Result | undefined;
            if (nextCii?.sections?.length) {
                const scores: Record<number, number> = {};
                for (const section of nextCii.sections) scores[section.id] = section.score;
                setFacultySectionScores(scores);
            }
        } catch {
            toast.error("Failed to load report");
            setReport(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadReport();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reportId]);

    const runAnalysis = async () => {
        if (readOnly || !reportId || analysing) return;
        if (locked && !isCielPk) return;
        if (locked && isCielPk) {
            const ok = window.confirm(
                "This CII is locked. Re-run with Balanced CII v3.1? The lock will clear until you approve the new score.",
            );
            if (!ok) return;
        }
        const previousAt = String(ciiV2?.computedAt || "");
        const pollForFreshCii = async (): Promise<boolean> => {
            for (let i = 0; i < 12; i++) {
                await new Promise((r) => setTimeout(r, 4000));
                const check = await authenticatedFetch(reportPath, {}, { timeoutMs: 20000 });
                if (!check?.ok) continue;
                const data = await check.json().catch(() => null);
                const next = ((data as { data?: Record<string, unknown> } | null)?.data || data) as Record<string, unknown> | null;
                const nextCii = next?.ciiV2 as CiiV2Result | undefined;
                if (nextCii?.computedAt && String(nextCii.computedAt) !== previousAt) {
                    setReport(next);
                    if (nextCii.sections?.length) {
                        const scores: Record<number, number> = {};
                        for (const section of nextCii.sections) scores[section.id] = section.score;
                        setFacultySectionScores(scores);
                    }
                    return true;
                }
            }
            return false;
        };
        try {
            setAnalysing(true);
            let res: Response | null = null;
            try {
                res = await authenticatedFetch(analysePath, { method: "POST" }, { timeoutMs: 180000 });
            } catch (err) {
                const aborted =
                    (err instanceof DOMException && err.name === "AbortError") ||
                    (err instanceof Error && err.name === "AbortError");
                if (!aborted) throw err;
            }
            if (res && !res.ok) {
                const payload = await res.json().catch(() => ({}));
                toast.error((payload as { error?: string; message?: string }).error || (payload as { message?: string }).message || "CII analysis failed");
                return;
            }
            if (!res?.ok) {
                const appeared = await pollForFreshCii();
                if (!appeared) {
                    toast.error("Analyzer is still running. Refresh this page in a minute.");
                    return;
                }
                toast.success("CII analysis complete");
                return;
            }
            toast.success("CII analysis complete");
            await loadReport();
        } catch {
            toast.error("CII analysis failed");
        } finally {
            setAnalysing(false);
        }
    };

    const facultyFinal = useMemo(() => {
        if (!ciiV2) return null;
        const base = ciiV2.sections.reduce((sum, section) => {
            const value = facultySectionScores[section.id];
            return sum + (typeof value === "number" && Number.isFinite(value) ? value : section.score);
        }, 0);
        return clampScore(base + (ciiV2.bonus?.total || 0) - (ciiV2.integrityPenalty || 0));
    }, [ciiV2, facultySectionScores]);

    const approveAndLock = async () => {
        if (readOnly || !reportId || approving || locked || !ciiV2 || facultyFinal == null) return;
        const adjusted = Math.round(facultyFinal) !== Math.round(ciiV2.final);
        if (adjusted && !facultyNote.trim()) {
            toast.error("A moderation reason is required when the Faculty-Verified CII differs from the system score.");
            return;
        }
        try {
            setApproving(true);
            const body: Record<string, unknown> = { note: facultyNote };
            if (adjusted) {
                body.facultyAdjustedScore = facultyFinal;
                body.scoreAdjustmentReason = facultyNote.trim();
            }
            const res = await authenticatedFetch(approvePath, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!res?.ok) {
                const payload = res ? await res.json().catch(() => ({})) : {};
                toast.error((payload as { message?: string }).message || "Could not approve CII");
                return;
            }
            toast.success("CII approved and locked — badge issued");
            await loadReport();
        } catch {
            toast.error("Could not approve CII");
        } finally {
            setApproving(false);
        }
    };

    const returnForRevision = async () => {
        if (readOnly) return;
        if (!reportId || deciding || locked) return;
        if (!facultyNote.trim()) {
            toast.error("State exactly what needs clarification or review.");
            return;
        }
        try {
            setDeciding(true);
            // Faculty writes are blocked on BE; Admin unlock returns the package for edits.
            if (!isCielPk) {
                toast.error("Faculty report review is read-only. CIEL PK Admin handles returns.");
                return;
            }
            const res = await authenticatedFetch(`/api/v1/admin/reports/${reportId}/verify`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "unlock",
                    feedback: facultyNote.trim(),
                    reason: facultyNote.trim(),
                }),
            });
            if (!res?.ok) {
                const payload = res ? await res.json().catch(() => ({})) : {};
                toast.error((payload as { message?: string }).message || "Could not save decision");
                return;
            }
            toast.success("Returned to student for clarification");
            await loadReport();
        } catch {
            toast.error("Could not save decision");
        } finally {
            setDeciding(false);
        }
    };

    const rejectReport = async () => {
        if (readOnly) return;
        if (!reportId || deciding || locked) return;
        if (!facultyNote.trim()) {
            toast.error("A reason is required when rejecting a report.");
            return;
        }
        try {
            setDeciding(true);
            if (!isCielPk) {
                toast.error("Faculty report review is read-only. CIEL PK Admin handles rejections.");
                return;
            }
            const res = await authenticatedFetch(`/api/v1/admin/reports/${reportId}/verify`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "reject",
                    feedback: facultyNote.trim(),
                    reason: facultyNote.trim(),
                }),
            });
            if (!res?.ok) {
                const payload = res ? await res.json().catch(() => ({})) : {};
                toast.error((payload as { message?: string }).message || "Could not save decision");
                return;
            }
            toast.success("Report rejected");
            await loadReport();
        } catch {
            toast.error("Could not save decision");
        } finally {
            setDeciding(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: TEAL }} />
            </div>
        );
    }

    if (!report) {
        return (
            <div className="mx-auto max-w-[1180px] p-5">
                <p className="text-[12px] text-[#687d82]">Report unavailable.</p>
                <Link href={inboxHref} className="text-[12px] underline" style={{ color: TEAL }}>
                    {inboxLabel}
                </Link>
            </div>
        );
    }

    const studentName = (report.student as { name?: string } | undefined)?.name || "Student";
    const projectTitle =
        (report.opportunity as { title?: string } | undefined)?.title || String(report.project_id || "Community Service Project");
    const hours = reportHours(report);
    const evidence = evidenceCount(report);
    const outcomes = outcomeCount(report);
    const sessions = sessionCount(report);
    const partners = partnerCount(report);
    const lvl = ciiV2 ? ciiV2.level || levelByNumber(ciiV2.numericLevel) : null;
    const facultyLvl =
        facultyFinal != null
            ? CII_V2_LEVELS.find((level) => facultyFinal >= level.min && facultyFinal <= level.max) ||
              levelByNumber(ciiV2?.numericLevel ?? 1)
            : null;

    const flags: Array<{ label: string; value: string; note: string; warn?: boolean }> = [
        { label: "HOURS", value: hours > 0 ? `${hours}h` : "Not recorded", note: "Logged service time", warn: hours <= 0 },
        { label: "EVIDENCE", value: String(evidence), note: "Files and session proof", warn: evidence <= 0 },
        { label: "SESSIONS", value: String(sessions), note: "Attendance records", warn: sessions <= 0 },
        { label: "OUTCOMES", value: String(outcomes), note: "Measured change rows", warn: outcomes <= 0 },
        { label: "PARTNERS", value: String(partners), note: "Named collaborators" },
        {
            label: "INTEGRITY",
            value: ciiV2 ? (ciiV2.redFlags?.length ? `${ciiV2.redFlags.length} flag${ciiV2.redFlags.length === 1 ? "" : "s"}` : "Clear") : "Pending run",
            note: "Contradictions / gaming",
            warn: Boolean(ciiV2?.redFlags?.length),
        },
    ];

    return (
        <div className="fx23-analyzer">
            <div className="fx23-workhead">
                <div>
                    <span>{isCielPk ? "CIEL PK Super Admin review · A Analyzer" : "Faculty review workspace · A Analyzer"}</span>
                    <h2>{projectTitle}</h2>
                    <p>
                        {studentName} · submitted Flashcard + Detailed Report stay locked. The Analyzer runs only when you choose to run it.
                    </p>
                </div>
                <div>
                    <Link href={inboxHref}>{inboxLabel}</Link>
                    {!isCielPk ? <Link href={`/dashboard/faculty/reports/${reportId}`}>Standard console</Link> : <Link href={`/dashboard/admin/reports/verify/${reportId}`}>Review dossier</Link>}
                </div>
            </div>

            {locked ? (
                <div className="fx23-lock">
                    {isCielPk
                        ? "CII is locked. Super Admin can re-run the Analyzer if this score was computed on the previous 9-section rubric."
                        : "CII + badge are locked. The Faculty-Verified score cannot be silently rewritten. Any later correction should create a new version."}
                </div>
            ) : readOnly ? (
                <div className="fx23-lock">
                    Faculty access is read-only. You can view the locked package and any System / Verified CII. Analysis, Approve, Request revision and Reject are handled by CIEL PK Admin.
                </div>
            ) : (
                <div className="fx23-lock">
                    Locked flow: review the submitted record first. Running the Analyzer generates a provisional System CII. Student-source text is not rewritten.
                </div>
            )}

            {ciiV2?.incomplete ? (
                <div className="fx23-lock">
                    This run skipped part of the v3.1 rubric and scored those criteria as 0, which collapses the CII. Super Admin can re-run the Analyzer to rescore it properly.
                </div>
            ) : null}

            <div className="fx23-aintro">
                <div>
                    <small>SYSTEM ASSESSMENT · gpt-5.6-sol · HIGH REASONING</small>
                    <h2>CIEL PK CII Analyzer</h2>
                    <p>
                        Balanced CII v3.1 with structured JSON scoring and multimodal evidence ingestion. Faculty can view results; CIEL PK Admin moderates and decides.
                    </p>
                </div>
                {readOnly ? (
                    <span className="fx23-run" style={{ opacity: 0.75, cursor: "default" }}>
                        {locked ? "Locked · read only" : ciiV2 ? "System CII (view only)" : "Analyzer not run · read only"}
                    </span>
                ) : (
                    <button type="button" className="fx23-run" onClick={runAnalysis} disabled={analysing || (locked && !isCielPk)}>
                        {analysing ? "Analysing evidence & scoring…" : locked && !isCielPk ? "Locked" : ciiV2 ? "Re-run AI Analyzer" : "Run AI Analyzer"}
                    </button>
                )}
            </div>

            <div className="fx23-ready">
                <div className="score">
                    <b>{ciiV2 ? Math.round(ciiV2.final) : "—"}</b>
                    <span>System CII / 100</span>
                </div>
                <div className="grid">
                    {flags.map((flag) => (
                        <div key={flag.label} className={flag.warn ? "flag" : undefined}>
                            <small>{flag.label}</small>
                            <b>{flag.value}</b>
                            <span>{flag.note}</span>
                        </div>
                    ))}
                </div>
            </div>

            {ciiV2?.integrityChecks?.length ? (
                <div className="fx23-method" role="region" aria-label="Integrity checks">
                    <p>
                        <b>Integrity checks (admin only)</b>
                    </p>
                    <ul>
                        {ciiV2.integrityChecks.map((check, i) => (
                            <li key={`${check.title}-${i}`}>
                                <b>{check.level === "hold" ? "HOLD" : "REVIEW"} · {check.title}</b> — {check.detail}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}

            <details className="fx23-method">
                <summary>How the Analyzer scores this report</summary>
                <p>
                    gpt-5.6-sol reads the locked 10-section report and inspects attached evidence images (multimodal). Scoring returns structured JSON on Balanced CII v3.1: 100-point core, 0–4 analytic anchors ({CII_V2_ANCHORS.join(" · ")}), plus up to +5 verified Extra-Mile uplift and an integrity penalty. Extra hours, money or partners cannot buy a high badge if outcomes, evidence or core quality are weak.
                </p>
                <ul>
                    {CII_V2_SECTIONS.map((section) => (
                        <li key={section.id}>
                            S{section.id} {section.title} · {section.weight} pts
                        </li>
                    ))}
                </ul>
            </details>

            {ciiV2 && lvl ? (
                <>
                    <div className="fx23-scorehero">
                        <div>
                            <small>SYSTEM PROVISIONAL CII</small>
                            <b>
                                {ciiV2.final.toFixed(1)}
                                <em>/100</em>
                            </b>
                            <strong>
                                {lvl.icon} L{lvl.level} · {lvl.name}
                            </strong>
                            <p>{ciiV2.gateExplanation || "Provisional system assessment of the locked submission. Faculty moderation below decides the verified score."}</p>
                        </div>
                        <div className="fx23-confidence">
                            <span>Evidence match</span>
                            <b>{ciiV2.evidenceAverage}%</b>
                            <small>{ciiV2.evidence.length} claim-to-evidence checks</small>
                        </div>
                    </div>

                    <div className="fx23-a2">
                        <div>
                            <h3>What scored well</h3>
                            <ul>
                                {ciiV2.sections.filter((s) => s.good).slice(0, 5).map((s) => (
                                    <li key={`g-${s.id}`}>
                                        S{s.id}: {s.good}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h3>What limited the score</h3>
                            <ul>
                                {ciiV2.sections.filter((s) => s.limit).slice(0, 5).map((s) => (
                                    <li key={`l-${s.id}`}>
                                        S{s.id}: {s.limit}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="fx23-ciisections">
                        {ciiV2.sections.map((section) => (
                            <article key={section.id} className="fx23-ciisec">
                                <header>
                                    <span>S{section.id}</span>
                                    <div>
                                        <h3>{section.title}</h3>
                                        <small>
                                            {section.id === 1 ? "Individual" : "Project-level"} · {section.criteria.length} criteria
                                        </small>
                                    </div>
                                    <b>
                                        {section.score.toFixed(1)}/{section.weight}
                                    </b>
                                </header>
                                <div className="fx23-ciibody">
                                    <p>{section.good || section.limit || "Section scored from the locked report record."}</p>
                                    <div className="fx23-subrub">
                                        {section.criteria.map((criterion) => (
                                            <div key={criterion.key}>
                                                <span>{criterion.label}</span>
                                                <b>
                                                    {criterion.anchor}/4 · {criterion.points.toFixed(1)}
                                                </b>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="fx23-3col">
                                        <div>
                                            <small>Scored well</small>
                                            <ul>
                                                {(splitLines(section.good).length ? splitLines(section.good) : ["—"]).map((line) => (
                                                    <li key={line}>{line}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div>
                                            <small>Limited</small>
                                            <ul>
                                                {(splitLines(section.limit).length ? splitLines(section.limit) : ["—"]).map((line) => (
                                                    <li key={`lim-${line}`}>{line}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div>
                                            <small>Improve</small>
                                            <ul>
                                                {(section.criteria.filter((c) => c.anchor <= 2).map((c) => c.label).slice(0, 3).length
                                                    ? section.criteria.filter((c) => c.anchor <= 2).map((c) => c.label).slice(0, 3)
                                                    : ["No weak criteria"]).map((line) => (
                                                    <li key={line}>{line}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>

                    <div className="fx23-moderation">
                        <div className="fx23-modhead">
                            <div>
                                <small>FACULTY ACADEMIC MODERATION</small>
                                <h2>Review, adjust, approve</h2>
                                <p>
                                    System CII stays on record. If you change a domain score, the Faculty-Verified CII updates and a reason is required before lock.
                                </p>
                            </div>
                            <div className="fx23-final">
                                <span>Faculty-verified CII</span>
                                <b>{facultyFinal ?? "—"}</b>
                                <small>/100</small>
                                <strong>
                                    {facultyLvl ? `L${facultyLvl.level} · ${facultyLvl.name}` : "Pending"}
                                </strong>
                            </div>
                        </div>
                        <div className="fx23-modtable">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Domain</th>
                                        <th>System</th>
                                        <th>Faculty</th>
                                        <th>Δ</th>
                                        <th>Max</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ciiV2.sections.map((section) => {
                                        const facultyScore = facultySectionScores[section.id] ?? section.score;
                                        const delta = Math.round((facultyScore - section.score) * 10) / 10;
                                        return (
                                            <tr key={section.id}>
                                                <td>
                                                    S{section.id} {section.title}
                                                    <small>{section.good || section.limit || ""}</small>
                                                </td>
                                                <td>{section.score.toFixed(1)}</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={section.weight}
                                                        step={0.1}
                                                        disabled={locked || readOnly}
                                                        value={facultyScore}
                                                        onChange={(e) => {
                                                            const next = Number(e.target.value);
                                                            setFacultySectionScores((prev) => ({
                                                                ...prev,
                                                                [section.id]: Number.isFinite(next)
                                                                    ? Math.min(section.weight, Math.max(0, next))
                                                                    : section.score,
                                                            }));
                                                        }}
                                                    />
                                                </td>
                                                <td className={delta > 0 ? "delta up" : delta < 0 ? "delta down" : undefined}>
                                                    {delta > 0 ? `+${delta}` : String(delta)}
                                                </td>
                                                <td>{section.weight}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="fx23-comment">
                            <label>
                                Faculty final assessment <span>{facultyFinal != null && Math.round(facultyFinal) !== Math.round(ciiV2.final) ? "required when the score changes" : "optional on approve · required to return or reject"}</span>
                            </label>
                            <textarea
                                value={facultyNote}
                                onChange={(e) => setFacultyNote(e.target.value)}
                                disabled={locked || readOnly}
                                placeholder="Record why the system assessment is accepted or adjusted. This becomes the Faculty Analysis note."
                            />
                            <label>
                                Section(s) for revision <span>optional · additive</span>
                            </label>
                            <input
                                value={revisionSection}
                                onChange={(e) => setRevisionSection(e.target.value)}
                                disabled={locked || readOnly}
                                placeholder="e.g. Section 4 Activities, Section 8 Evidence"
                                style={{ width: "100%", marginTop: 6, padding: "8px 10px", border: "1px solid #d7e5e8", borderRadius: 8 }}
                            />
                            <label>
                                Required correction <span>optional · shown to the team</span>
                            </label>
                            <textarea
                                value={requiredCorrection}
                                onChange={(e) => setRequiredCorrection(e.target.value)}
                                disabled={locked || readOnly}
                                placeholder="What the Team Lead must fix before resubmit"
                            />
                            <small>
                                Approve locks the Faculty-Verified CII and badge. Revision / reject keep the record unlocked and send the same note to the student.
                            </small>
                        </div>
                        <div className="fx23-decision">
                            {readOnly ? (
                                <p style={{ margin: 0, fontSize: 11, color: "#617579", fontWeight: 700 }}>
                                    Read-only — Approve, Request revision and Reject are not available on Faculty login.
                                </p>
                            ) : (
                                <>
                                    <button type="button" className="rev" disabled={locked || deciding} onClick={returnForRevision}>
                                        Request revision
                                    </button>
                                    {!isCielPk ? (
                                    <button type="button" className="rej" disabled={locked || deciding} onClick={rejectReport}>
                                        Reject
                                    </button>
                                    ) : null}
                                    <button type="button" className="approve" disabled={locked || approving || !ciiV2} onClick={approveAndLock}>
                                        {approving ? "Locking…" : isCielPk ? "Confirm final score" : "Approve & lock"}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <div className="fx23-moderation" style={{ padding: 22 }}>
                    <p style={{ fontSize: 10, color: "#617579", margin: 0 }}>
                        Analyzer not run yet. Faculty view is read-only — CIEL PK Admin runs analysis and final decisions.
                    </p>
                </div>
            )}

            <div className="fx23-workfoot">
                <span>{locked && ciiV2Lock ? `Locked ${new Date(ciiV2Lock.lockedAt).toLocaleString()}` : "Analysis open"}</span>
                <span>gpt-5.6-sol · high reasoning · structured JSON · multimodal evidence</span>
            </div>
        </div>
    );
}
