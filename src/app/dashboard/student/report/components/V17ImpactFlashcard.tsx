"use client";

import { useMemo, useState } from "react";
import type { ReportData } from "../context/ReportContext";
import { resolveReportCii } from "../utils/resolveReportCii";
import { effectiveHoursFromLog } from "../utils/engagementMetrics";
import { findSdgById } from "@/utils/sdgData";
import ReportVerificationQr from "@/components/ReportVerificationQr";
import {
    downloadExhibitionFlashcard,
    printExhibitionFlashcard,
    shareExhibitionFlashcard,
} from "../utils/flashcardExport";

type Agg = {
    title: string;
    hours: number;
    members: number;
    logs: Array<{
        id?: string;
        date?: string;
        location?: string;
        hours?: number;
        start_time?: string;
        end_time?: string;
        activity_type?: string;
        description?: string;
        evidence_file?: unknown;
        evidence_url?: unknown;
        evidence_urls?: unknown;
    }>;
    acts: Array<{
        title?: string;
        primary_category?: string;
        sub_category?: string;
        description?: string;
        site_note?: string;
        geographic_reach?: string;
        status?: string;
        outputs?: Array<{ title?: string; type?: string; quantity?: string; unit?: string; unit_other?: string }>;
        beneficiaries_reached?: string;
        unique_beneficiaries?: string;
        delivery_mode?: string;
    }>;
    outputs: number;
    reach: string;
    measured: Array<{
        metric?: string;
        outcome_area?: string;
        baseline?: string;
        endline?: string;
        confidence_level?: string[];
        measurement_explanation?: string;
    }>;
    bestPct: number | null;
    evidence: number;
    competency: string;
    sdgs: Array<{
        goalNumber: number | string;
        title?: string;
        targetId?: string;
        justification?: string;
        role?: "primary" | "secondary";
    }>;
    pkr: number;
    names?: string[];
    ethicsOk?: boolean;
    context: { partnerOrganization?: string; projectLocation?: string; timelineLabel?: string };
};

type EvItem = { url?: string; cap: string; section: string; ext: string };

const NR = "Not recorded in source report";

const CONTINUATION_LABEL: Record<string, string> = {
    yes: "Yes · Likely to continue independently",
    partially: "Partial · Some elements continue with support",
    no: "No · Will not continue without further action",
};

const COMP_GROUPS: Array<[string, Array<keyof NonNullable<ReportData["section9"]["competency_scores"]>>]> = [
    ["Cognitive", ["cognitive_systemic", "cognitive_critical", "cognitive_evaluate"]],
    ["Practical", ["practical_design", "practical_evidence", "practical_engagement"]],
    ["Social", ["social_empathy", "social_diversity", "social_collaboration"]],
    ["Transformative", ["transformative_longterm", "transformative_benefits", "transformative_sustainability"]],
];

function asList(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
    }
    if (typeof value === "string" && value.trim()) return [value.trim()];
    return [];
}

function stripChoice(value: unknown): string {
    return String(value ?? "")
        .replace(/^[^\p{L}\p{N}]+/u, "")
        .trim();
}

function fmtNum(n: number | string) {
    const num = typeof n === "number" ? n : Number(String(n).replace(/,/g, ""));
    if (!Number.isFinite(num)) return String(n || "0");
    return num.toLocaleString();
}

function sessionDateLabel(value?: string): string {
    const match = String(value || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return String(value || "").trim();
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (Number.isNaN(date.getTime())) return String(value || "").trim();
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function hoursLabel(hours: number) {
    const rounded = Math.round(hours * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded}` : String(rounded);
}

function outputLines(acts: Agg["acts"]): string[] {
    const rows: string[] = [];
    acts.forEach((block) => {
        (block.outputs || []).forEach((row) => {
            const qty = String(row.quantity ?? "").trim();
            if (!qty) return;
            const unit = /other/i.test(String(row.unit || "")) ? row.unit_other || row.unit : row.unit;
            rows.push(`${qty} ${unit || ""} ${row.title || row.type || ""}`.replace(/\s+/g, " ").trim());
        });
    });
    return rows;
}

function isImageItem(item: EvItem) {
    return Boolean(item.url && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(item.url));
}

function fileKind(item: EvItem) {
    if (isImageItem(item)) return "IMG";
    if (/pdf/i.test(item.ext) || /\.pdf(\?|$)/i.test(item.url || "") || /\.pdf(\?|$)/i.test(item.cap)) return "PDF";
    if (/doc/i.test(item.ext) || /\.docx?(\?|$)/i.test(item.cap)) return "DOC";
    return item.ext || "FILE";
}

function collectEvidence(data: ReportData, logs: Agg["logs"]): EvItem[] {
    const items: EvItem[] = [];
    const seen = new Set<string>();
    const push = (url: string | undefined, cap: string, section: string, ext = "FILE") => {
        const key = `${url || ""}|${cap}|${section}`;
        if (seen.has(key)) return;
        seen.add(key);
        items.push({ url: url || undefined, cap, section, ext });
    };

    (Array.isArray(data.evidence_urls) ? data.evidence_urls : []).forEach((url, i) => {
        if (typeof url === "string" && url.trim()) {
            const clean = url.trim();
            push(clean, `Evidence ${i + 1}`, "Report", (clean.split(".").pop() || "FILE").slice(0, 4).toUpperCase());
        }
    });

    (
        ["section1", "section2", "section3", "section4", "section5", "section6", "section7", "section8", "section9", "section10"] as const
    ).forEach((key) => {
        const rec = data[key] as { media_urls?: unknown } | undefined;
        const urls = Array.isArray(rec?.media_urls) ? rec.media_urls : [];
        urls.forEach((item, i) => {
            const url =
                typeof item === "string"
                    ? item.trim()
                    : item && typeof item === "object" && "url" in item
                      ? String((item as { url?: unknown }).url || "").trim()
                      : "";
            if (!url) return;
            push(url, `${key} media ${i + 1}`, "Gallery", (url.split(".").pop() || "FILE").slice(0, 4).toUpperCase());
        });
    });

    const files = Array.isArray(data.section8?.evidence_files) ? data.section8.evidence_files : [];
    files.forEach((file, i) => {
        const raw: unknown = file;
        if (typeof raw === "string") {
            push(/^https?:\/\//i.test(raw) ? raw : undefined, raw.split("/").pop() || `Evidence ${i + 1}`, "Evidence");
            return;
        }
        if (raw && typeof raw === "object") {
            const rec = raw as { url?: string; path?: string; name?: string; fileName?: string; filename?: string; type?: string };
            const url = rec.url || rec.path;
            const cap = rec.name || rec.fileName || rec.filename || `Evidence ${i + 1}`;
            const ext = (rec.type || cap.split(".").pop() || "FILE").toString().replace(/^image\//, "").slice(0, 4).toUpperCase();
            push(typeof url === "string" ? url : undefined, cap, "Evidence", ext);
        }
    });

    logs.forEach((log, i) => {
        if (typeof log.evidence_url === "string" && log.evidence_url.trim()) {
            push(log.evidence_url.trim(), `Session photo ${i + 1}`, "Session", "IMG");
        }
        (Array.isArray(log.evidence_urls) ? log.evidence_urls : []).forEach((url, j) => {
            if (typeof url === "string" && url.trim()) push(url.trim(), `Session photo ${i + 1}.${j + 1}`, "Session", "IMG");
        });
        if (log.evidence_file && typeof log.evidence_file === "object") {
            const rec = log.evidence_file as { url?: string; name?: string };
            push(typeof rec.url === "string" ? rec.url : undefined, rec.name || `Session photo ${i + 1}`, "Session", "IMG");
        } else if (log.evidence_file) {
            push(undefined, `Session photo ${i + 1}`, "Session", "IMG");
        }
    });

    return items;
}

function logEvidenceCount(log: Agg["logs"][number] | Record<string, unknown>) {
    const rec = log as Agg["logs"][number];
    let n = 0;
    if (typeof rec.evidence_url === "string" && rec.evidence_url.trim()) n += 1;
    if (Array.isArray(rec.evidence_urls)) n += rec.evidence_urls.filter((url) => typeof url === "string" && url.trim()).length;
    if (rec.evidence_file) n += 1;
    return n;
}

function openDetailedReport() {
    window.dispatchEvent(new CustomEvent("ciel-open-full-report"));
}

function SecHead({ n, kicker, title, source }: { n: string; kicker: string; title: string; source: string }) {
    return (
        <div className="c22-head">
            <span className="n">{n}</span>
            <div className="copy">
                <small>{kicker}</small>
                <h2>
                    {title} <span className="c22-source">{source}</span>
                </h2>
            </div>
            <i />
        </div>
    );
}

export function V17ImpactFlashcard({
    data,
    agg,
    sectionsComplete,
    sectionTotal,
    missingLabels,
    canSend,
    onSend,
    sending,
    status,
    audience = "student",
    onOpenDetailed,
}: {
    data: ReportData;
    agg: Agg;
    sectionsComplete: number;
    sectionTotal: number;
    missingLabels: string[];
    canSend?: boolean;
    onSend?: () => void;
    sending?: boolean;
    status: "draft" | "pending" | "live";
    audience?: "student" | "faculty";
    onOpenDetailed?: () => void;
}) {
    const [preview, setPreview] = useState<EvItem | null>(null);
    const cii = resolveReportCii(data);
    const showCiiScore = cii.source === "faculty_locked";

    const evAll = useMemo(() => collectEvidence(data, agg.logs), [data, agg.logs]);

    const partners = Array.isArray(data.section7?.partners) ? data.section7.partners : [];
    const resources = Array.isArray(data.section6?.resources) ? data.section6.resources : [];
    const skills = [
        ...asList(data.section9?.skills_grown)
            .map(stripChoice)
            .filter((s) => s && !/^other(?:…|\.\.\.)?$/i.test(s)),
        ...(data.section9?.skills_grown_other?.trim() ? [data.section9.skills_grown_other.trim()] : []),
    ];
    const mechanisms = asList(data.section10?.mechanisms).map(stripChoice).filter(Boolean);
    const problem = data.section2?.problem_statement?.trim() || "";
    const acts = agg.acts.filter((block) => block.title || block.primary_category || block.description);
    const logs = Array.isArray(data.section1?.attendance_logs) ? data.section1.attendance_logs : agg.logs;
    const dates = logs.map((log) => log.date).filter(Boolean).sort();
    const dateSpan = dates.length
        ? dates.length > 1
            ? `${sessionDateLabel(dates[0])} → ${sessionDateLabel(dates[dates.length - 1])}`
            : sessionDateLabel(dates[0])
        : agg.context.timelineLabel && agg.context.timelineLabel !== "—"
            ? agg.context.timelineLabel
            : "Dates not recorded";
    const partnerLine =
        partners.map((partner) => partner.name).filter(Boolean).join(" · ") ||
        (agg.context.partnerOrganization && agg.context.partnerOrganization !== "N/A" ? agg.context.partnerOrganization : "") ||
        "";
    const locationLine =
        (agg.context.projectLocation && agg.context.projectLocation !== "N/A" ? agg.context.projectLocation : "") ||
        [...new Set(logs.map((log) => log.location).filter(Boolean))][0] ||
        "";
    const facultyLine = data.section1?.faculty_supervisor_email?.trim() || "";
    const recordId = String(data.report_id || data.id || data.project_id || "CIEL COMMUNITY SERVICE RECORD");
    const displayHours =
        agg.hours > 0 ? agg.hours : logs.reduce((sum, log) => sum + effectiveHoursFromLog({ date: log.date || "", ...log }), 0);
    const hrs = hoursLabel(displayHours);
    const reach = agg.reach || data.section2?.affected_count || "";
    const outs = outputLines(acts);
    const evidenceCount = Math.max(agg.evidence, evAll.length);
    const coverage = Math.round((Math.min(sectionsComplete, sectionTotal) / Math.max(sectionTotal, 1)) * 100);
    const statusLabel =
        status === "live" ? "FACULTY VERIFIED" : status === "pending" ? "AWAITING FACULTY REVIEW" : "DRAFT · STUDENT REVIEW";
    const evidenceState =
        status === "live" ? "Included in faculty-verified report" : status === "pending" ? "Submitted for faculty review" : "Attached · verification pending";

    const team = [
        data.section1?.team_lead
            ? {
                  name: data.section1.team_lead.fullName || data.section1.team_lead.name || "Team lead",
                  acad: [data.section1.team_lead.degree, data.section1.team_lead.university].filter(Boolean).join(" · "),
                  hrs: data.section1.team_lead.hours,
              }
            : null,
        ...(Array.isArray(data.section1?.team_members)
            ? data.section1.team_members.map((member) => ({
                  name: member.fullName || member.name || "Team member",
                  acad: [member.program, member.university].filter(Boolean).join(" · "),
                  hrs: member.hours,
              }))
            : []),
    ].filter(Boolean) as Array<{ name: string; acad: string; hrs?: string }>;

    const kpis: Array<[string, string]> = [
        [`${hrs}h`, status === "live" ? "Verified team hours" : "Team hours logged"],
        [String(logs.length), "Field sessions"],
        [String(acts.length), "Activities delivered"],
        [reach ? fmtNum(reach) : "0", "People reached"],
        [String(outs.length || agg.outputs || 0), "Quantified outputs"],
        [String(evidenceCount), "Evidence files"],
    ];

    const oneRead = (() => {
        const parts: string[] = [];
        const names = acts.map((a) => stripChoice(a.title) || stripChoice(a.primary_category)).filter(Boolean);
        if (names.length) parts.push(`The team delivered ${names.join("; ")}.`);
        if (displayHours || logs.length) {
            parts.push(
                `${team.length || agg.members || 1} student${(team.length || agg.members || 1) === 1 ? "" : "s"} recorded ${hrs} team-hours across ${logs.length} field session${logs.length === 1 ? "" : "s"}.`,
            );
        }
        if (outs.length) parts.push(`Recorded outputs: ${outs.join("; ")}.`);
        const who = data.section2?.affected_group?.trim();
        if (reach || who) {
            const reachBit = reach ? `${fmtNum(reach)} people were recorded as reached` : who ? `The project served ${who}` : "";
            parts.push(who && reach ? `${reachBit} (${who}).` : `${reachBit}.`);
        }
        return parts.length ? parts.join(" ") : "Complete the source report to generate the exhibition project summary.";
    })();

    const meta = [partnerLine, locationLine, dateSpan, facultyLine ? `Faculty: ${facultyLine}` : "", recordId].filter(Boolean);
    const gaps = [
        ...asList(data.section2?.system_gaps).map(stripChoice).filter((s) => s && !/^other(?:…|\.\.\.)?$/i.test(s)),
        ...asList(data.section2?.system_gaps_other_entries),
        data.section2?.system_gaps_other?.trim() || "",
    ].filter(Boolean);
    const sources = [
        ...asList(data.section2?.baseline_evidence).map(stripChoice).filter((s) => s && !/^other(?:…|\.\.\.)?$/i.test(s)),
        ...asList(data.section2?.baseline_other_entries),
        data.section2?.baseline_evidence_other?.trim() || "",
    ].filter(Boolean);
    const discipline =
        /other/i.test(data.section2?.discipline || "") ? data.section2?.discipline_other?.trim() || data.section2?.discipline : data.section2?.discipline;
    const academicLens = data.section2?.discipline_contribution?.trim() || "";

    const resourceRows =
        data.section6?.use_resources === "no"
            ? [
                  {
                      name: "Student time & effort",
                      detail: "No separate resource budget was declared; delivery relied on the recorded student service effort.",
                      enabled: "Project delivery",
                  },
              ]
            : resources
                  .filter((r) => r.type)
                  .map((r) => ({
                      name: stripChoice(r.type === "Other" || /other/i.test(r.type) ? r.type_other || r.type : r.type),
                      detail: [
                          r.amount ? `${r.amount} ${/other/i.test(r.unit || "") ? r.unit_other || r.unit : r.unit || ""}`.trim() : "",
                          asList(r.sources)
                              .map(stripChoice)
                              .filter((s) => s && !/^other/i.test(s))
                              .concat(r.source_other ? [r.source_other] : [])
                              .join(", "),
                          asList(r.verification).map(stripChoice).filter(Boolean).join(", "),
                      ]
                          .filter(Boolean)
                          .join(" · "),
                      enabled: r.purpose || "",
                  }));

    const partnerRows = partners.length
        ? partners.map((p) => ({
              name: p.name || "Partner organization",
              type: /other/i.test(p.type || "") ? p.type_other || p.type : p.type,
              role: asList(p.role).map(stripChoice).filter(Boolean).join(" · "),
              contribution: p.contribution_line || asList(p.contribution).filter(Boolean).join(", "),
          }))
        : partnerLine
          ? [{ name: partnerLine, type: "", role: "", contribution: "" }]
          : [];

    const comps = COMP_GROUPS.map(([name, keys]) => {
        const vals = keys.map((k) => Number(data.section9?.competency_scores?.[k] || 0)).filter((n) => n > 0);
        return { name, avg: vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "", count: vals.length };
    }).filter((x) => x.count);

    const continuation = data.section10?.continuation_status
        ? CONTINUATION_LABEL[data.section10.continuation_status] || data.section10.continuation_status
        : "";
    const miss = missingLabels.length;
    const measuredBoth = agg.measured.filter((o) => String(o.baseline ?? "").trim() && String(o.endline ?? "").trim());
    const verifyUrl = data.impact_verify_url || data.impactVerifyUrl;
    const isFaculty = audience === "faculty";

    return (
        <div className="cer-c22-flash" id="cer-v17-flash">
            <article className="c22-card">
                <header className="c22-hero">
                    <div className="c22-hero-grid">
                        <div>
                            <div className="c22-brand">CIEL PK · Exhibition Impact Flash Card · Complete Project Summary</div>
                            <h1>{agg.title || "Community Service Project"}</h1>
                            <div className="c22-one-read">
                                <b>Project in one accurate read:</b> {oneRead}
                            </div>
                        </div>
                        <aside className="c22-state">
                            <span className="pill">{statusLabel}</span>
                            <b>{coverage}%</b>
                            <p>
                                required-field source coverage
                                <br />
                                {evidenceCount} evidence file{evidenceCount === 1 ? "" : "s"} attached
                                {showCiiScore ? (
                                    <>
                                        <br />
                                        Faculty-locked CII {Math.round(cii.totalScore)}/100
                                    </>
                                ) : null}
                            </p>
                        </aside>
                    </div>
                    {meta.length ? (
                        <div className="c22-meta">
                            {meta.map((item) => (
                                <span key={item}>{item}</span>
                            ))}
                        </div>
                    ) : null}
                </header>

                <div className="c22-kpis">
                    {kpis.map(([value, label], i) => (
                        <div key={`${label}-${i}`} className="c22-kpi">
                            <b>{value}</b>
                            <span>{label}</span>
                        </div>
                    ))}
                </div>

                <main className="c22-body">
                    <section className="c22-sec">
                        <SecHead n="01" kicker="Why the project existed" title="Community Need & Project Context" source="REPORT SECTION 2" />
                        <div className="c22-context">
                            <article className="c22-panel">
                                <div className="c22-panel-h">
                                    <b>RECORDED COMMUNITY NEED</b>
                                    <span>Section 2 source</span>
                                </div>
                                <div className="c22-panel-b">
                                    <p className="c22-problem">{problem || NR}</p>
                                    {academicLens ? (
                                        <div className="c22-fact" style={{ marginTop: 9 }}>
                                            <small>Academic lens / how the issue was assessed</small>
                                            <b>{academicLens}</b>
                                        </div>
                                    ) : null}
                                </div>
                            </article>
                            <aside className="c22-facts">
                                <div className="c22-fact">
                                    <small>Who was affected / targeted</small>
                                    <b>{data.section2?.affected_group?.trim() || NR}</b>
                                </div>
                                <div className="c22-fact">
                                    <small>Approx. number identified</small>
                                    <b>{data.section2?.affected_count?.trim() || NR}</b>
                                </div>
                                <div className="c22-fact">
                                    <small>Academic discipline</small>
                                    <b>{discipline?.trim() || NR}</b>
                                </div>
                                {gaps.length ? (
                                    <div className="c22-fact">
                                        <small>Gap areas identified</small>
                                        <b>{gaps.join(" · ")}</b>
                                    </div>
                                ) : null}
                                {sources.length ? (
                                    <div className="c22-fact">
                                        <small>Baseline evidence sources</small>
                                        <b>{sources.join(" · ")}</b>
                                    </div>
                                ) : null}
                            </aside>
                        </div>
                    </section>

                    <section className="c22-sec">
                        <SecHead n="02" kicker="Who delivered it and when" title="Participation & Delivery Record" source="REPORT SECTION 1" />
                        {team.length ? (
                            <div className="c22-teamline">
                                {team.map((member) => (
                                    <div key={member.name} className="c22-member">
                                        <b>{member.name}</b>
                                        <span>
                                            {member.acad}
                                            {member.hrs ? ` · ${member.hrs}h recorded` : ""}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                        <div className="c22-timeline">
                            {logs.length ? (
                                logs.map((log, i) => {
                                    const h = effectiveHoursFromLog({ date: log.date || "", ...log });
                                    const range = [log.start_time, log.end_time].filter(Boolean).join("–");
                                    const evN = logEvidenceCount(log);
                                    return (
                                        <article key={log.id || `${log.date}-${i}`} className="c22-session">
                                            <div className="c22-session-top">
                                                <b>
                                                    {log.date ? sessionDateLabel(log.date) : `Session ${i + 1}`}
                                                    {log.activity_type ? ` · ${stripChoice(log.activity_type)}` : " · Team"}
                                                </b>
                                                <span>
                                                    {h || log.hours || 0}h{range ? ` · ${range}` : ""}
                                                </span>
                                            </div>
                                            <p>{log.description?.trim() || NR}</p>
                                            <div className="meta">
                                                {[stripChoice(log.activity_type), log.location].filter(Boolean).join(" · ") || "Location / activity type not recorded"}
                                                {evN ? ` · ${evN} evidence item${evN === 1 ? "" : "s"}` : ""}
                                            </div>
                                        </article>
                                    );
                                })
                            ) : (
                                <div className="c22-narrative">
                                    <small>Delivery record</small>
                                    <p>{NR}</p>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="c22-sec">
                        <SecHead n="03" kicker="Exact project work" title="What Exactly Was Done & Produced" source="REPORT SECTION 4" />
                        <div className="c22-activity-list">
                            {acts.length ? (
                                acts.map((act, i) => {
                                    const title = stripChoice(act.title) || stripChoice(act.primary_category) || `Activity ${i + 1}`;
                                    const category = [stripChoice(act.primary_category), stripChoice(act.sub_category)].filter(Boolean).join(" → ");
                                    const reachLine = act.unique_beneficiaries || act.beneficiaries_reached;
                                    const actOuts = outputLines([act]);
                                    return (
                                        <article key={`${title}-${i}`} className="c22-act">
                                            <div className="c22-act-top">
                                                <div>
                                                    <h3>
                                                        {i + 1}. {title}
                                                    </h3>
                                                    <div className="meta">
                                                        {[category, act.site_note, stripChoice(act.delivery_mode)].filter(Boolean).join(" · ")}
                                                        {reachLine ? ` · Reach: ${reachLine}` : ""}
                                                    </div>
                                                </div>
                                                {act.status ? <span className="status">{stripChoice(act.status)}</span> : null}
                                            </div>
                                            {act.description?.trim() ? (
                                                <p>
                                                    <b>How it was done:</b> {act.description.trim()}
                                                </p>
                                            ) : null}
                                            {actOuts.length ? (
                                                <div className="c22-output-row">
                                                    {actOuts.map((o) => (
                                                        <span key={o} className="c22-output">
                                                            {o}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </article>
                                    );
                                })
                            ) : (
                                <div className="c22-narrative">
                                    <small>Activities</small>
                                    <p>{NR}</p>
                                </div>
                            )}
                        </div>
                        {outs.length ? (
                            <div className="c22-panel" style={{ marginTop: 10 }}>
                                <div className="c22-panel-h">
                                    <b>COMPLETE QUANTIFIED OUTPUT REGISTER</b>
                                    <span>
                                        {outs.length} output{outs.length === 1 ? "" : "s"}
                                    </span>
                                </div>
                                <div className="c22-panel-b">
                                    <div className="c22-output-register">
                                        {outs.map((o) => (
                                            <div key={o} className="c22-output-box">
                                                {o}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </section>

                    <section className="c22-sec">
                        <SecHead n="04" kicker="Recorded results" title="What Changed?" source="REPORT SECTION 5" />
                        {data.section5?.story_before || data.section5?.story_now || data.section5?.observed_change || data.section5?.story_because ? (
                            <div className="c22-change-intro">
                                {data.section5.story_before ? (
                                    <div className="c22-narrative">
                                        <small>Before</small>
                                        <p>{data.section5.story_before}</p>
                                    </div>
                                ) : null}
                                {data.section5.story_now ? (
                                    <div className="c22-narrative">
                                        <small>Now / after intervention</small>
                                        <p>{data.section5.story_now}</p>
                                    </div>
                                ) : null}
                                {data.section5.observed_change ? (
                                    <div className="c22-narrative">
                                        <small>Recorded change narrative</small>
                                        <p>{data.section5.observed_change}</p>
                                    </div>
                                ) : null}
                                {data.section5.story_because ? (
                                    <div className="c22-narrative">
                                        <small>How the team knows</small>
                                        <p>{data.section5.story_because}</p>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                        {measuredBoth.length ? (
                            <div className="c22-outcomes">
                                {measuredBoth.map((o, i) => {
                                    const b = Number(o.baseline);
                                    const e = Number(o.endline);
                                    const chg = Number.isFinite(b) && b !== 0 && Number.isFinite(e) ? Math.round(((e - b) / Math.abs(b)) * 100) : null;
                                    const conf = Array.isArray(o.confidence_level) ? o.confidence_level.map(stripChoice).filter(Boolean).join(" · ") : "";
                                    return (
                                        <article key={`${o.metric}-${o.outcome_area}-${i}`} className="c22-outcome">
                                            <h3>{o.metric || o.outcome_area || "Outcome"}</h3>
                                            <div className="c22-ba">
                                                <div>
                                                    <small>BASELINE</small>
                                                    <b>{o.baseline}</b>
                                                </div>
                                                <div className="arr">→</div>
                                                <div>
                                                    <small>ENDLINE</small>
                                                    <b>{o.endline}</b>
                                                </div>
                                            </div>
                                            <div className="detail">
                                                {chg != null ? (
                                                    <>
                                                        <b>Recorded movement:</b> {chg >= 0 ? "+" : ""}
                                                        {chg}%
                                                        <br />
                                                    </>
                                                ) : null}
                                                {conf ? (
                                                    <>
                                                        <b>Confidence / verification:</b> {conf}
                                                        <br />
                                                    </>
                                                ) : null}
                                                {o.measurement_explanation ? (
                                                    <>
                                                        <b>Data source:</b> {o.measurement_explanation}
                                                    </>
                                                ) : null}
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="c22-narrative">
                                <small>Measured outcomes</small>
                                <p>No complete baseline → endline measurement is recorded. The qualitative change statements above are shown exactly as captured.</p>
                            </div>
                        )}
                    </section>

                    <section className="c22-sec">
                        <SecHead n="05" kicker="Contribution alignment" title="SDG Contribution & Logic" source="REPORT SECTION 3" />
                        {agg.sdgs.length ? (
                            <div className="c22-sdg-grid">
                                {agg.sdgs.map((row, i) => {
                                    const n = Number(row.goalNumber);
                                    const sdg = findSdgById(n);
                                    const primary = row.role === "primary" || i === 0;
                                    const logic =
                                        row.justification ||
                                        (primary ? data.section3?.contribution_intent_statement : "") ||
                                        "Contribution logic not recorded.";
                                    return (
                                        <article key={`${row.goalNumber}-${i}`} className="c22-sdg" style={{ background: sdg?.color || "#0d746b" }}>
                                            <div className="role">{primary ? "Primary SDG" : "Supporting SDG"}</div>
                                            <h3>
                                                SDG {row.goalNumber} · {row.title || sdg?.title || `Goal ${row.goalNumber}`}
                                            </h3>
                                            <p>{logic}</p>
                                            <div className="num">{row.goalNumber}</div>
                                        </article>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="c22-narrative">
                                <small>SDG mapping</small>
                                <p>{NR}</p>
                            </div>
                        )}
                    </section>

                    <section className="c22-sec">
                        <SecHead n="06" kicker="What powered the project" title="Resources & Partnership Roles" source="REPORT SECTIONS 6–7" />
                        <div className="c22-two">
                            <section className="c22-panel">
                                <div className="c22-panel-h">
                                    <b>RESOURCES USED / MOBILISED</b>
                                    <span>{agg.pkr ? `PKR ${agg.pkr.toLocaleString()} traced` : `${resourceRows.length} record${resourceRows.length === 1 ? "" : "s"}`}</span>
                                </div>
                                <div className="c22-panel-b">
                                    {resourceRows.length ? (
                                        resourceRows.map((r) => (
                                            <div key={r.name} className="c22-line">
                                                <b>{r.name}</b>
                                                <p>
                                                    {r.detail || NR}
                                                    {r.enabled ? (
                                                        <>
                                                            <br />
                                                            <b>Enabled:</b> {r.enabled}
                                                        </>
                                                    ) : null}
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="c22-line">
                                            <b>{NR}</b>
                                        </div>
                                    )}
                                </div>
                            </section>
                            <section className="c22-panel">
                                <div className="c22-panel-h">
                                    <b>PARTNERS & THEIR ACTUAL ROLE</b>
                                    <span>
                                        {partnerRows.length} partner{partnerRows.length === 1 ? "" : "s"}
                                    </span>
                                </div>
                                <div className="c22-panel-b">
                                    {partnerRows.length ? (
                                        partnerRows.map((p) => (
                                            <div key={p.name} className="c22-line">
                                                <b>{p.name}</b>
                                                <p>
                                                    {p.type ? (
                                                        <>
                                                            {p.type}
                                                            <br />
                                                        </>
                                                    ) : null}
                                                    <b>Role:</b> {p.role || NR}
                                                    {p.contribution ? (
                                                        <>
                                                            <br />
                                                            <b>Contribution:</b> {p.contribution}
                                                        </>
                                                    ) : null}
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="c22-line">
                                            <b>{NR}</b>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    </section>

                    <section className="c22-sec">
                        <SecHead n="07" kicker="What the experience developed" title="Student Learning & Competency" source="REPORT SECTION 9" />
                        <div className="c22-learning">
                            <section className="c22-panel">
                                <div className="c22-panel-h">
                                    <b>SKILLS & COMPETENCIES</b>
                                    <span>Section 9 source</span>
                                </div>
                                <div className="c22-panel-b">
                                    {skills.length ? (
                                        <div className="c22-skillwrap">
                                            {skills.map((s) => (
                                                <span key={s} className="c22-skill">
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    ) : null}
                                    {comps.length ? (
                                        <div className="c22-compgrid">
                                            {comps.map((c) => (
                                                <div key={c.name} className="c22-comp">
                                                    <small>{c.name}</small>
                                                    <b>{c.avg}/5</b>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                    {!skills.length && !comps.length ? (
                                        <div className="c22-line">
                                            <b>{NR}</b>
                                        </div>
                                    ) : null}
                                </div>
                            </section>
                            <section className="c22-panel">
                                <div className="c22-panel-h">
                                    <b>WHAT THE STUDENT LEARNED</b>
                                    <span>Direct reflection</span>
                                </div>
                                <div className="c22-panel-b c22-reflect">
                                    {data.section9?.reflection_biggest_learning || data.section9?.personal_learning ? (
                                        <p>
                                            <b>Biggest learning:</b> {data.section9.reflection_biggest_learning || data.section9.personal_learning}
                                        </p>
                                    ) : null}
                                    {data.section9?.reflection_moment ? (
                                        <p>
                                            <b>Perspective-changing moment:</b> {data.section9.reflection_moment}
                                        </p>
                                    ) : null}
                                    {data.section9?.reflection_discipline_help ? (
                                        <p>
                                            <b>Academic skill applied:</b> {data.section9.reflection_discipline_help}
                                        </p>
                                    ) : null}
                                    {data.section9?.academic_application ? (
                                        <p>
                                            <b>Academic application:</b> {data.section9.academic_application}
                                        </p>
                                    ) : null}
                                    {!data.section9?.reflection_biggest_learning &&
                                    !data.section9?.personal_learning &&
                                    !data.section9?.reflection_moment &&
                                    !data.section9?.reflection_discipline_help &&
                                    !data.section9?.academic_application ? (
                                        <p>{NR}</p>
                                    ) : null}
                                </div>
                            </section>
                        </div>
                    </section>

                    <section className="c22-sec">
                        <SecHead n="08" kicker="What continues after students leave" title="Sustainability, Handover & Scale" source="REPORT SECTION 10" />
                        <div className="c22-sustain">
                            <div className="c22-sustain-top">
                                <div className="c22-sustain-state">
                                    <small>CONTINUATION OUTLOOK</small>
                                    <b>{continuation || NR}</b>
                                </div>
                                <div className="c22-sustain-copy">
                                    <b>What continues / what stops / handover:</b>
                                    <br />
                                    {data.section10?.continuation_details?.trim() || NR}
                                </div>
                            </div>
                            <div className="c22-sustain-grid">
                                <div className="c22-sustain-box">
                                    <small>Continuation mechanism(s)</small>
                                    <b>{mechanisms.join(" · ") || NR}</b>
                                </div>
                                <div className="c22-sustain-box">
                                    <small>Scaling potential</small>
                                    <b>{stripChoice(data.section10?.scaling_potential) || NR}</b>
                                </div>
                                <div className="c22-sustain-box">
                                    <small>Institutional / community influence</small>
                                    <b>{stripChoice(data.section10?.policy_influence) || NR}</b>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="c22-sec">
                        <SecHead n="09" kicker="Proof behind the project" title="Complete Evidence Record" source="REPORT SECTION 8 + ALL UPLOADS" />
                        <div className="c22-evidence">
                            <div className="c22-evidence-head">
                                <div>
                                    <small>ALL AUTHORIZED PROJECT ATTACHMENTS</small>
                                    <h3>Evidence Gallery</h3>
                                </div>
                                <span className="count">
                                    {evAll.length} FILE{evAll.length === 1 ? "" : "S"}
                                </span>
                            </div>
                            <div className="c22-evidence-note">
                                Every evidence item attached to the canonical project record is represented here with its source, format and visibility status. Select an image or file to magnify / preview it electronically.
                            </div>
                            {evAll.length ? (
                                <div className="c22-evgrid">
                                    {evAll.map((item, i) => {
                                        const kind = fileKind(item);
                                        return (
                                            <article key={`${item.cap}-${i}`} className="c22-file">
                                                <div
                                                    className="pv"
                                                    role="button"
                                                    tabIndex={0}
                                                    title="Magnify / preview evidence"
                                                    onClick={() => (item.url ? setPreview(item) : undefined)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" && item.url) setPreview(item);
                                                    }}
                                                >
                                                    {isImageItem(item) && item.url ? <img src={item.url} alt={item.cap} /> : <div className="doc">{kind}</div>}
                                                    <span className="mag">VIEW / MAGNIFY</span>
                                                </div>
                                                <div className="info">
                                                    <b>{item.cap}</b>
                                                    <small>{item.section}</small>
                                                    <small>
                                                        {kind} · INSTITUTIONAL
                                                    </small>
                                                    <span className="state">{evidenceState}</span>
                                                    <div className="c22-file-actions">
                                                        {item.url ? (
                                                            <>
                                                                <button type="button" onClick={() => setPreview(item)}>
                                                                    Preview / magnify
                                                                </button>
                                                                <a href={item.url} target="_blank" rel="noopener noreferrer">
                                                                    Open original
                                                                </a>
                                                            </>
                                                        ) : (
                                                            <button type="button" disabled>
                                                                Attached on record
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="c22-evidence-note">No evidence files are attached to the source record.</div>
                            )}
                        </div>
                    </section>

                    {status !== "live" ? (
                        <div className="c22-review">
                            <b>Draft / review note:</b>{" "}
                            {miss ? `${miss} required source-field gap${miss === 1 ? "" : "s"} remain. ` : "No required source-field gaps detected. "}
                            {status === "pending" ? "The report is awaiting faculty review." : "This record has not yet been faculty verified."}
                        </div>
                    ) : null}

                    <div className="c22-trust">
                        <div className="c22-trust-grid">
                            <div className="c22-trust-item">
                                <small>REPORT STATUS</small>
                                <b>{statusLabel}</b>
                            </div>
                            <div className="c22-trust-item">
                                <small>RECORDED EFFORT</small>
                                <b>
                                    {hrs}h · {logs.length} sessions
                                </b>
                            </div>
                            <div className="c22-trust-item">
                                <small>EVIDENCE RECORD</small>
                                <b>
                                    {evAll.length} attachment{evAll.length === 1 ? "" : "s"}
                                </b>
                            </div>
                            <div className="c22-trust-item">
                                <small>SOURCE COVERAGE</small>
                                <b>{coverage}% required fields</b>
                            </div>
                        </div>
                        <div className="c22-record">
                            <p>
                                <b>{recordId}</b>
                                <br />
                                This exhibition Flash Card is generated from the same live Community Service record as the Detailed Report. It summarizes recorded project facts; it does not invent missing impact.
                            </p>
                            <div className="c22-qr">
                                {verifyUrl ? (
                                    <ReportVerificationQr impactVerifyUrl={verifyUrl} size={72} caption="" />
                                ) : (
                                    <>
                                        LIVE RECORD / QR
                                        <br />
                                        ATTACHED ON
                                        <br />
                                        PUBLISH
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </main>

                <footer className="c22-footer">
                    <p>
                        <b>CIEL PK Exhibition Flash Card.</b> A direct project summary for presentation: what was needed, what was done, what was produced, what changed, what supported it, what continues, and the evidence behind it.
                    </p>
                    <div className="c22-actions">
                        {!isFaculty && status === "draft" && onSend ? (
                            <button type="button" className="c22-btn gold" disabled={!canSend || sending} onClick={onSend}>
                                {sending ? "Working…" : "Send to Faculty"}
                            </button>
                        ) : null}
                        <button type="button" className="c22-btn" onClick={() => void printExhibitionFlashcard(agg.title)}>
                            Print / Save Flash Card
                        </button>
                        <button type="button" className="c22-btn" onClick={() => void downloadExhibitionFlashcard(agg.title)}>
                            Download
                        </button>
                        {!isFaculty ? (
                            <button
                                type="button"
                                className="c22-btn alt"
                                onClick={() =>
                                    void shareExhibitionFlashcard({
                                        title: agg.title,
                                        verifyUrl: verifyUrl,
                                    })
                                }
                            >
                                Share
                            </button>
                        ) : null}
                        <button type="button" className="c22-btn alt" onClick={() => (onOpenDetailed ? onOpenDetailed() : openDetailedReport())}>
                            Full Detailed Report
                        </button>
                    </div>
                </footer>
            </article>

            {!isFaculty && status === "draft" && !canSend && missingLabels.length ? (
                <p className="c22-missing">Complete {missingLabels.join(", ")} before the report can be sent.</p>
            ) : null}

            {preview ? (
                <div className="c22-vault on" onClick={(e) => { if (e.target === e.currentTarget) setPreview(null); }}>
                    <div className="c22-vault-panel">
                        <div className="c22-vault-head">
                            <b>{preview.cap}</b>
                            <button type="button" onClick={() => setPreview(null)}>
                                Close
                            </button>
                        </div>
                        {isImageItem(preview) && preview.url ? (
                            <img src={preview.url} alt={preview.cap} />
                        ) : preview.url ? (
                            <iframe title={preview.cap} src={preview.url} />
                        ) : (
                            <p>No preview URL on this attachment.</p>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
