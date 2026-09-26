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
    const logs = Array.isArray(s1.attendance_logs) ? s1.attendance_logs : [];
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
        (Array.isArray(s1.team_members)
            ? (s1.team_members as unknown[]).reduce((sum, member) => sum + pickNumber(asRecord(member).hours), 0)
            : 0);
    const individualHours = Array.isArray(metrics.individual_metrics)
        ? (metrics.individual_metrics as unknown[]).reduce(
              (sum, row) => sum + pickNumber(asRecord(row).individual_hours),
              0,
          )
        : 0;
    return metricHours > 0 ? metricHours : logHours > 0 ? logHours : individualHours > 0 ? individualHours : rosterHours;
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

export default function CommunityCiiAnalyser() {
    const params = useParams();
    const reportId = String(params.reportId ?? "");

    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState<Record<string, unknown> | null>(null);
    const [analysing, setAnalysing] = useState(false);
    const [approving, setApproving] = useState(false);
    const [deciding, setDeciding] = useState(false);
    const [facultyNote, setFacultyNote] = useState("");
    const [facultySectionScores, setFacultySectionScores] = useState<Record<number, number>>({});

    const ciiV2 = (report?.ciiV2 as CiiV2Result | undefined) || null;
    const ciiV2Lock = (report?.ciiV2Lock as CiiV2Lock | undefined) || null;
    const locked = Boolean(ciiV2Lock?.locked);

    const loadReport = async () => {
        if (!reportId) return;
        try {
            setLoading(true);
            const res = await authenticatedFetch(`/api/v1/faculty/reports/${reportId}`);
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
        if (!reportId || analysing || locked) return;
        try {
            setAnalysing(true);
            const res = await authenticatedFetch(`/api/v1/faculty/reports/${reportId}/cii-v2/analyse`, {
                method: "POST",
            });
            if (!res?.ok) {
                const payload = res ? await res.json().catch(() => ({})) : {};
                toast.error((payload as { error?: string; message?: string }).error || (payload as { message?: string }).message || "CII analysis failed");
                return;
            }
            toast.success("CII v2 analysis complete");
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
        if (!reportId || approving || locked || !ciiV2 || facultyFinal == null) return;
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
            const res = await authenticatedFetch(`/api/v1/faculty/reports/${reportId}/cii-v2/approve`, {
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
        if (!reportId || deciding || locked) return;
        if (!facultyNote.trim()) {
            toast.error("State exactly what needs clarification or review.");
            return;
        }
        try {
            setDeciding(true);
            const res = await authenticatedFetch(`/api/v1/faculty/reports/${reportId}/action`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "rejected", remarks: `[Return for revision] ${facultyNote.trim()}` }),
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
        if (!reportId || deciding || locked) return;
        if (!facultyNote.trim()) {
            toast.error("A reason is required when rejecting a report.");
            return;
        }
        try {
            setDeciding(true);
            const res = await authenticatedFetch(`/api/v1/faculty/reports/${reportId}/action`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "rejected", remarks: facultyNote.trim() }),
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
                <Link href="/dashboard/faculty/reports" className="text-[12px] underline" style={{ color: TEAL }}>
                    Back to student reports
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
                    <span>Faculty review workspace · A Analyzer</span>
                    <h2>{projectTitle}</h2>
                    <p>
                        {studentName} · submitted Flashcard + Detailed Report stay locked. The Analyzer runs only when you choose to run it.
                    </p>
                </div>
                <div>
                    <Link href="/dashboard/faculty/reports">Back to reports</Link>
                    <Link href={`/dashboard/faculty/reports/${reportId}`}>Standard console</Link>
                </div>
            </div>

            {locked ? (
                <div className="fx23-lock">
                    CII + badge are locked. The Faculty-Verified score cannot be silently rewritten. Any later correction should create a new version.
                </div>
            ) : (
                <div className="fx23-lock">
                    Locked flow: review the submitted record first. Running the Analyzer generates a provisional System CII. Student-source text is not rewritten.
                </div>
            )}

            <div className="fx23-aintro">
                <div>
                    <small>SYSTEM ASSESSMENT · FACULTY-TRIGGERED</small>
                    <h2>CIEL PK CII Analyzer</h2>
                    <p>
                        Composite Impact Index v2 reads the locked 9-section report and evidence package. Faculty then moderates the score before a badge is issued.
                    </p>
                </div>
                <button type="button" className="fx23-run" onClick={runAnalysis} disabled={analysing || locked}>
                    {analysing ? "Analysing…" : locked ? "Locked" : ciiV2 ? "Re-run AI Analyzer" : "Run AI Analyzer"}
                </button>
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

            <details className="fx23-method">
                <summary>How the Analyzer scores this report</summary>
                <p>
                    94-point core across 9 weighted sections, 0–4 analytic anchors ({CII_V2_ANCHORS.join(" · ")}), plus up to +6 verified bonus and an integrity penalty. Extra hours, money or partners cannot buy a high badge if outcomes, evidence or core quality are weak.
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
                                                        disabled={locked}
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
                                disabled={locked}
                                placeholder="Record why the system assessment is accepted or adjusted. This becomes the Faculty Analysis note."
                            />
                            <small>
                                Approve locks the Faculty-Verified CII and badge. Revision / reject keep the record unlocked and send the same note to the student.
                            </small>
                        </div>
                        <div className="fx23-decision">
                            <button type="button" className="rev" disabled={locked || deciding} onClick={returnForRevision}>
                                Request revision
                            </button>
                            <button type="button" className="rej" disabled={locked || deciding} onClick={rejectReport}>
                                Reject
                            </button>
                            <button type="button" className="approve" disabled={locked || approving || !ciiV2} onClick={approveAndLock}>
                                {approving ? "Locking…" : "Approve & lock"}
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                <div className="fx23-moderation" style={{ padding: 22 }}>
                    <p style={{ fontSize: 10, color: "#617579", margin: 0 }}>
                        Analyzer not run. No CII or badge has been assigned yet. Click Run AI Analyzer when you are ready to assess this locked report.
                    </p>
                </div>
            )}

            <div className="fx23-workfoot">
                <span>{locked && ciiV2Lock ? `Locked ${new Date(ciiV2Lock.lockedAt).toLocaleString()}` : "Analysis open"}</span>
                <span>CIEL PK Composite Impact Index v2</span>
            </div>
        </div>
    );
}
