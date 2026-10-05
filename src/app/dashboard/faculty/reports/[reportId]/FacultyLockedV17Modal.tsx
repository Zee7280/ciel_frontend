"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";
import { prepareReportForVerifyDossier } from "@/utils/reportTeamScope";
import { coerceFlashReportData, unwrapFacultyReportPayload } from "./facultyAiEvaluation.helpers";
import { buildLockedV17Package, type LockedV17Assess, type LockedV17DetailBlock, type LockedV17PackageModel } from "./buildLockedV17Package";
import type { LockedV17ClaimState, LockedV17SourceTabs } from "./buildLockedV17SourceTabs";
import { emptyLockedV17SourceTabs } from "./buildLockedV17SourceTabs";
import { V19_ASSESSMENT_RULE } from "./buildLockedV17Assessment";
import { resolveReportCii } from "@/app/dashboard/student/report/utils/resolveReportCii";
import "./faculty-locked-v17.css";
import ReportEvidenceGallery from "@/components/ciel/community-service/ReportEvidenceGallery";
import { HubBackButton } from "@/components/ciel/community-service/CommunityServiceHubChrome";

type TabId = "flashView" | "reportView" | "evidenceView" | "attendanceView" | "analyzerView" | "decisionView" | "assessedView" | "badgeView";

const TABS: Array<{ id: TabId; label: string }> = [
    { id: "flashView", label: "01 · Flashcard" },
    { id: "reportView", label: "02 · Detailed Report" },
    { id: "evidenceView", label: "03 · Evidence" },
    { id: "attendanceView", label: "04 · Attendance & Hours" },
    { id: "analyzerView", label: "05 · CII Analyzer" },
    { id: "decisionView", label: "06 · Faculty Decision" },
    { id: "assessedView", label: "Detailed Report + CII Assessment" },
    { id: "badgeView", label: "Flashcard + CII Badge" },
];

export function facultyLockedPackageTabFromQuery(doc: string | null | undefined): TabId {
    const d = String(doc || "").trim().toLowerCase().replace(/^#/, "");
    if (d === "report" || d === "detailed" || d === "detail" || d === "print") return "reportView";
    if (d === "evidence" || d === "gallery") return "evidenceView";
    if (d === "flash" || d === "flashcard") return "flashView";
    if (d === "attendance" || d === "hours") return "attendanceView";
    if (d === "analyzer" || d === "analysis" || d === "cii" || d === "cii-v4-5") return "analyzerView";
    return "flashView";
}

function sourceTabsOf(model: LockedV17PackageModel | null | undefined): LockedV17SourceTabs {
    return model?.sourceTabs ?? emptyLockedV17SourceTabs();
}

function claimStateClass(state: string): string {
    return state.toLowerCase().replace(/\s+/g, "-");
}

function evIcon(kind: string, name: string): string {
    const blob = `${kind} ${name}`.toLowerCase();
    if (/photo|image|jpg|jpeg|png|webp/.test(blob)) return "▣";
    if (/video|mp4/.test(blob)) return "▶";
    if (/pdf/.test(blob)) return "PDF";
    return "DOC";
}

function LockedImpactFlashcard({ model }: { model: LockedV17PackageModel }) {
    const provisional = !model.ciiLocked && model.ciiScore != null;
    const verified = model.ciiLocked && model.ciiScore != null;
    return (
        <article className="v16Flash">
            <header className="v16Hero">
                <div className="v16Kicker">CIEL PK · COMMUNITY ENGAGEMENT · IMPACT FLASHCARD</div>
                <h1>{model.title}</h1>
                <div className="v16Story">{model.story}</div>
                {model.meta ? <div className="v16Meta">{model.meta}</div> : null}
                <div className="v16StatusRow">
                    {model.statusChips.map((chip) => (
                        <span key={chip}>{chip}</span>
                    ))}
                </div>
                {verified ? (
                    <div className="flashcardAwardBlock">
                        <div className="flashcardAwardMeta">
                            <span className="ey">Faculty-Verified CII Recognition</span>
                            <span className="nm">{model.badgeLabel}</span>
                            <span className="sm">
                                The student has now been awarded a Faculty-Verified Composite Index Indicator score. The flashcard template remains locked; the recognition layer is attached for exhibition, review and download.
                            </span>
                        </div>
                        <span className="flashcardAwardPill">
                            {model.ciiScore}/100 · Range {model.badgeRange}
                        </span>
                    </div>
                ) : null}
                {provisional ? (
                    <div className="flashcardAwardBlock">
                        <div className="flashcardAwardMeta">
                            <span className="ey">System assessment complete</span>
                            <span className="nm">Badge awaiting Faculty finalisation</span>
                            <span className="sm">
                                A provisional CII is available, but the badge will only update on the flashcard once Faculty verifies or moderates the score.
                            </span>
                        </div>
                        <span className="flashcardAwardPill pending">Provisional CII {model.ciiScore}/100</span>
                    </div>
                ) : null}
            </header>
            <div className="v16Metrics">
                <div className="v16Metric">
                    <b>{model.hoursLabel}</b>
                    <small>Service hours</small>
                </div>
                <div className="v16Metric">
                    <b>{model.sessions}</b>
                    <small>Sessions</small>
                </div>
                <div className="v16Metric">
                    <b>{model.reach}</b>
                    <small>Beneficiaries</small>
                </div>
                <div className="v16Metric">
                    <b>{model.outputs}</b>
                    <small>Outputs</small>
                </div>
                <div className="v16Metric">
                    <b>{model.outcomes}</b>
                    <small>Outcomes</small>
                </div>
                <div className="v16Metric">
                    <b>{model.evidence}</b>
                    <small>Evidence items</small>
                </div>
            </div>
            <div className="v16Body">
                <div className="v16TitleRow">
                    <h2>Impact Highlights</h2>
                    <i />
                </div>
                <div className="v16SpotGrid">
                    {model.spots.map((spot) => (
                        <div key={spot.ey} className={`v16Spot ${spot.tone}`}>
                            <div className="ey">{spot.ey}</div>
                            <b>{spot.value}</b>
                            <p>{spot.note}</p>
                        </div>
                    ))}
                </div>
                <div className="v16TitleRow">
                    <h2>All Report Sections · Concise Summary</h2>
                    <i />
                </div>
                <div className="v16Sections">
                    {model.sections.map((section) => (
                        <section key={section.n} className={`v16Sec ${section.cls || ""}`}>
                            <div className="v16SecHead">
                                <span className="num">{section.n}</span>
                                <h3>{section.title}</h3>
                            </div>
                            <div className="v16SecBody">
                                <ul>
                                    {section.bullets.map((bullet, index) => (
                                        <li key={`${section.n}-${index}`}>{bullet}</li>
                                    ))}
                                </ul>
                            </div>
                        </section>
                    ))}
                </div>
            </div>
            <footer className="v16Footer">
                <div className="v16FootText">
                    <b>{verified ? model.badgeLabel : provisional ? `SYSTEM CII ${model.ciiScore}/100 · AWAITING FACULTY VERIFICATION` : "HOLD CII · REQUIRED CORRECTIONS"}</b>
                    {" · "}
                    Flashcard = concise summary of all nine report areas. The Detailed Report remains the complete narrative and evidence record.
                </div>
                <span className="hold">
                    {verified
                        ? `Faculty-Verified CII ${model.ciiScore}/100`
                        : provisional
                          ? `System CII ${model.ciiScore}/100 · awaiting Faculty verification`
                          : "Required-field coverage currently incomplete"}
                </span>
            </footer>
        </article>
    );
}

function ReportSectionBlock({ block }: { block: LockedV17DetailBlock }) {
    return (
        <section className="flv17-rsec">
            <h3>
                {block.n} · {block.title}
            </h3>
            <div className="flv17-rsec-sub">
                <span className={`flv17-state ${block.hold.cls}`}>{block.hold.label}</span>
                {" · "}
                {block.coveragePct}% required-field coverage · {block.reqFilled}/{block.reqTotal} required fields represented
            </div>
            <div className="flv17-narrative">{block.narrative}</div>
            {block.flow.length ? (
                <div className="flv17-miniflow">
                    {block.flow.map((node) => (
                        <div key={node.k}>
                            <b>{node.k}</b>
                            {node.v}
                        </div>
                    ))}
                </div>
            ) : null}
            <div className="flv17-gap">
                <b>Evidence:</b> {block.evidence}
                <br />
                <b>Limitation / review point:</b> {block.limitation}
            </div>
            <details open>
                <summary>Field traceability</summary>
                <table className="flv17-trace">
                    <thead>
                        <tr>
                            <th>Field</th>
                            <th>Recorded value</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {block.fields.map((row) => (
                            <tr key={row.field}>
                                <td>
                                    {row.field}
                                    {row.required ? " *" : ""}
                                </td>
                                <td>{row.value}</td>
                                <td>{row.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </details>
        </section>
    );
}

function DetailedReport({ model }: { model: LockedV17PackageModel }) {
    return (
        <div className="reportWrap">
            <div className="reportHead">
                <h2>Detailed Institutional Report</h2>
                <p>
                    Locked student-source record for {model.title}. CII is calculated mainly from this Detailed Report because it carries the complete section/sub-section narrative, source facts, evidence status and traceability. No student-source text is rewritten.
                </p>
            </div>
            {model.detailBlocks.map((block) => (
                <ReportSectionBlock key={block.n} block={block} />
            ))}
        </div>
    );
}

function EvidencePane({ tabs }: { tabs: LockedV17SourceTabs }) {
    return (
        <div className="flv17-evpage">
            <div className="flv17-evhead">
                <div>
                    <small>CIEL PK · CLAIM-AWARE EVIDENCE RECORD</small>
                    <h2>Evidence manifest · {tabs.evidenceItems.length} records</h2>
                    <p>Click a thumbnail to view the file. Evidence is not proof merely because it was uploaded — inspect the actual content against the claim it is intended to substantiate.</p>
                </div>
                <div>
                    <b>{tabs.claimCoverage}/6</b>
                    <span>material claim areas covered</span>
                </div>
            </div>
            <div className="flv17-evgallery">
                <ReportEvidenceGallery
                    files={tabs.evidenceItems.map((item) => ({
                        url: item.url,
                        name: item.name,
                        kind: item.kind,
                    }))}
                    emptyLabel="No evidence attached to this locked report."
                />
            </div>
            <div className="flv17-evcards">
                {tabs.evidenceItems.length ? (
                    tabs.evidenceItems.map((item) => (
                        <article key={item.url || item.name}>
                            <div className="ico">{evIcon(item.kind, item.name)}</div>
                            <div>
                                <h3>{item.name}</h3>
                                <p>
                                    <b>Mapped claim area:</b> {item.supports}
                                </p>
                                <p>{item.caption || "No additional caption recorded."}</p>
                                <div className="flv17-evVerify">
                                    <span className={`flv17-evState ${claimStateClass(item.state)}`}>{item.state}</span>
                                    {!item.inspected ? <span className="flv17-contentPending">CONTENT INSPECTION PENDING</span> : null}
                                </div>
                                <p className="flv17-evFinding">
                                    <b>AI finding:</b> {item.finding}
                                </p>
                                <small>
                                    {item.kind} · {item.verified ? "On record" : "Pending verification"}
                                </small>
                            </div>
                        </article>
                    ))
                ) : null}
            </div>
        </div>
    );
}

function AttendancePane({ tabs }: { tabs: LockedV17SourceTabs }) {
    return (
        <div className="flv17-attendance">
            <div className="flv17-attHead">
                <div>
                    <small>ATTENDANCE & HOURS</small>
                    <h2>Participation verification</h2>
                    <p>Student-level hours remain the compliance source. Team totals never replace individual verified hours.</p>
                </div>
                <div>
                    <b>{tabs.personHours}h</b>
                    <span>verified person-hours</span>
                </div>
            </div>
            <div className="flv17-attMembers">
                {tabs.attendanceMembers.map((member, index) => (
                    <div key={`${member.name}-${index}`} className={member.met ? "met" : "pending"}>
                        <span>{member.name}</span>
                        <b>
                            {member.hours}/{member.required}h
                        </b>
                        <small>{member.met ? "Requirement met" : "Hours pending"}</small>
                    </div>
                ))}
            </div>
            <div className="flv17-attTable">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Member</th>
                            <th>Hours</th>
                            <th>Location</th>
                            <th>Work type</th>
                            <th>Accomplishment</th>
                            <th>Verification</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tabs.attendanceSessions.length ? (
                            tabs.attendanceSessions.map((session, index) => (
                                <tr key={`${session.date}-${session.member}-${index}`}>
                                    <td>{session.date}</td>
                                    <td>{session.member}</td>
                                    <td>{session.hours}</td>
                                    <td>{session.location}</td>
                                    <td>{session.type}</td>
                                    <td>{session.description}</td>
                                    <td>
                                        <span className={`flv17-attStatus ${session.verified ? "verified" : "pending"}`}>
                                            {session.verified ? "Verified" : "Pending"}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7}>No service sessions recorded.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ClaimEvidencePanel({ tabs }: { tabs: LockedV17SourceTabs }) {
    const [showMap, setShowMap] = useState(false);
    const counts = tabs.claimCounts;
    const total = tabs.evidenceItems.length;
    let statusChip = "NO EVIDENCE SUBMITTED";
    let statusTone = "none";
    let stateNote = "Evidence confidence cannot be assessed because no evidence files are attached to this locked report.";
    if (total > 0 && tabs.inspectedCount < total) {
        statusChip = "MULTIMODAL CONTENT CHECK REQUIRED";
        statusTone = "pending";
        stateNote = `${tabs.inspectedCount}/${total} evidence file(s) have been content-inspected. Evidence-based claims remain provisional until the actual file content is inspected.`;
    } else if (total > 0) {
        statusChip = "CONTENT INSPECTION COMPLETE";
        statusTone = "ok";
        stateNote = "All submitted evidence files have been content-inspected; the confidence rating below reflects the inspected claim–evidence relationships.";
    }
    const stats: Array<{ cls: string; label: string; key: LockedV17ClaimState }> = [
        { cls: "supports", label: "Supports", key: "Supports Claim" },
        { cls: "partial", label: "Partially supports", key: "Partially Supports" },
        { cls: "cannot", label: "Cannot verify", key: "Cannot Verify" },
        { cls: "unrelated", label: "Unrelated", key: "Unrelated" },
        { cls: "contradicts", label: "Contradicts", key: "Contradicts" },
    ];
    return (
        <>
            <section className="flv17-ecred">
                <div className="flv17-ecredHead">
                    <div>
                        <small>CLAIM ↔ EVIDENCE VERIFICATION</small>
                        <h3>Evidence Credibility</h3>
                        <p>Every material claim is mapped to evidence. Uploaded files are not treated as proof until their actual content is inspected where technically available.</p>
                    </div>
                    <button type="button" className="flv17-claimBtn" onClick={() => setShowMap((open) => !open)}>
                        {showMap ? "Hide Claim–Evidence Map" : "View Claim–Evidence Map"}
                    </button>
                </div>
                <div className="flv17-credStats">
                    {stats.map((stat) => (
                        <div key={stat.key} className={`flv17-credStat ${stat.cls}`}>
                            <b>{counts[stat.key]}</b>
                            <span>{stat.label}</span>
                        </div>
                    ))}
                </div>
                <div className="flv17-credFoot">
                    <b>Evidence Confidence: {tabs.evidenceConfidence}</b>
                    <span>
                        {tabs.inspectedCount}/{total} evidence file(s) content-inspected
                    </span>
                    <span className={`flv17-contentPending ${statusTone}`}>{statusChip}</span>
                </div>
                <div className="flv17-claimIssue info">ℹ {stateNote}</div>
                {tabs.claimIssues.slice(0, 2).map((issue) => (
                    <div key={issue} className="flv17-claimIssue">
                        ⚠ {issue}
                    </div>
                ))}
            </section>
            {showMap ? (
                <section className="flv17-claimMap">
                    <div className="flv17-claimMapHead">
                        <b>Claim–Evidence Map</b>
                        <span>Claim → Evidence → AI finding → Confidence</span>
                    </div>
                    <div className="flv17-claimTable">
                        <table>
                            <thead>
                                <tr>
                                    <th>Material claim</th>
                                    <th>Mapped evidence</th>
                                    <th>Relationship</th>
                                    <th>Confidence</th>
                                    <th>AI finding</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tabs.claimRows.length ? (
                                    tabs.claimRows.map((row, index) => (
                                        <tr key={`${row.files}-${index}`}>
                                            <td>
                                                <b>{row.category}</b>
                                                <div className="flv17-claimFinding">{row.text}</div>
                                            </td>
                                            <td>{row.files}</td>
                                            <td>
                                                <span className={`flv17-claimState ${claimStateClass(row.state)}`}>{row.state}</span>
                                            </td>
                                            <td>{row.confidence}</td>
                                            <td className="flv17-claimFinding">{row.finding}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5}>No material claims could be mapped from this report.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            ) : null}
        </>
    );
}

function AnalyzerPane({
    model,
    analyzerHref,
}: {
    model: LockedV17PackageModel;
    analyzerHref?: string;
}) {
    const tabs = sourceTabsOf(model);
    if (!tabs.analyzerReady) {
        return (
            <div className="flv17-analyzer">
                <div className="flv17-analyzerTop">
                    <div className="flv17-analyzerTitle">
                        <span className="flv17-analyzerIcon">AI</span>
                        <div>
                            <small>CIEL PK · gpt-5.6-sol CII ANALYZER</small>
                            <h2>Evaluate the locked Report Package</h2>
                            <p>
                                gpt-5.6-sol with high reasoning scores Balanced CII v3.1 as structured JSON. It ingests the Detailed Report, verified attendance/hours, and actual evidence files (multimodal). Filenames alone are never treated as proof.
                            </p>
                        </div>
                    </div>
                    {analyzerHref ? (
                        <Link className="flv17-run" href={analyzerHref}>
                            View CII record
                        </Link>
                    ) : null}
                </div>
                <ClaimEvidencePanel tabs={tabs} />
            </div>
        );
    }
    return (
        <div className="flv17-analyzer">
            <div className={`flv17-analyzerTop ${model.ciiLocked ? "verified" : "results"}`}>
                <div className="flv17-analyzerTitle">
                    <span className="flv17-analyzerIcon">{model.ciiLocked ? "✓" : "AI"}</span>
                    <div>
                        <small>CIEL PK · gpt-5.6-sol · HIGH REASONING</small>
                        <h2>{model.ciiLocked ? "Faculty-Verified CII" : "System assessment ready"}</h2>
                        <p>
                            Review the score, claim-evidence findings, reasoning and evidence confidence. Faculty can inspect mismatches before final approval. The Analyzer never rewrites student-entered facts.
                        </p>
                    </div>
                </div>
                <span className={`flv17-analyzerStatus ${model.ciiLocked ? "" : "ready"}`}>
                    {model.ciiLocked ? "LOCKED · VERIFIED" : "READY FOR FACULTY REVIEW"}
                </span>
            </div>
            <div className="flv17-summaryStrip">
                <div className="flv17-summaryCard primary">
                    <small>{model.ciiLocked ? "FACULTY-VERIFIED CII" : "SYSTEM PROVISIONAL CII"}</small>
                    <b>
                        {model.ciiScore}
                        <em>/100</em>
                    </b>
                    <span>{tabs.levelLabel}</span>
                </div>
                <div className="flv17-summaryCard">
                    <small>EVIDENCE CONFIDENCE</small>
                    <b className="word">{tabs.evidenceConfidence}</b>
                    <span>Locked report source · faculty review</span>
                </div>
                <div className="flv17-summaryCard">
                    <small>BADGE READINESS</small>
                    <b className="word smallword">{tabs.badgeReadiness}</b>
                    <span>{model.badgeLabel}</span>
                </div>
            </div>
            <ClaimEvidencePanel tabs={tabs} />
            <div className="flv17-a2">
                <div>
                    <h3>Why this badge</h3>
                    <p>{tabs.whyBadge}</p>
                    <h3>Why not higher</h3>
                    <p>{tabs.whyNotHigher}</p>
                </div>
                <div>
                    <h3>Strongest dimensions</h3>
                    <ul>
                        {tabs.strengths.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                    <h3>Priority development areas</h3>
                    <ul>
                        {tabs.needs.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </div>
            </div>
            {analyzerHref ? (
                <div className="flv17-analyzerFoot">
                    <Link className="flv17-run" href={analyzerHref}>
                        {model.ciiLocked ? "Open Faculty CII record" : "View System CII (read only)"}
                    </Link>
                </div>
            ) : null}
        </div>
    );
}

function AssessCard({ row }: { row: LockedV17Assess }) {
    const hold = row.score === "HOLD";
    return (
        <article className="assessCard">
            <div className="assessTop">
                <div>
                    <span className="assessNo">{row.no}</span>
                    <strong>{row.name}</strong>
                </div>
                <div className={`assessScore ${hold ? "holdScore" : "scored"}`}>
                    <b>{hold ? "HOLD · NOT SCORED" : `${row.score}/${row.max}`}</b>
                    <small>Maximum {row.max} points</small>
                </div>
            </div>
            {row.chips.length ? (
                <div className="rubricRow">
                    {row.chips.map((chip) => (
                        <span key={chip.label} className="rubChip">
                            {chip.label} · {chip.weight}
                        </span>
                    ))}
                </div>
            ) : null}
            <div className="finding">
                <b>System finding</b>
                <p>{row.reason}</p>
            </div>
            <div className="threeCol">
                <div className="fb good">
                    <b>Strengths</b>
                    <ul>
                        {(row.strengths.length ? row.strengths : ["Pending Analyzer / Faculty moderation."]).map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </div>
                <div className="fb warn">
                    <b>Limitations / marks currently unavailable</b>
                    <ul>
                        {(row.limits.length ? row.limits : ["Pending Analyzer / Faculty moderation."]).map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </div>
                <div className="fb improve">
                    <b>What would improve the score</b>
                    <ul>
                        {(row.improvements.length ? row.improvements : ["Pending Analyzer / Faculty moderation."]).map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </div>
            </div>
            <div className="scoreLogic">
                <b>Assessment rule:</b> {V19_ASSESSMENT_RULE}
            </div>
        </article>
    );
}

function AssessmentLayer({ model }: { model: LockedV17PackageModel }) {
    const byNo = new Map(model.assessment.map((row) => [row.no, row]));
    return (
        <div>
            <div className="assessmentIntro">
                <b>Assessed Detailed Report.</b> The original student record is preserved exactly. After each section, the assessment layer explains the rubric that applies. In a CII-ready approved submission, HOLD states become section marks with reasoning, strengths, limitations and improvement guidance.
            </div>
            <div className="assessWrap">
                {model.detailBlocks.map((block) => {
                    const row = byNo.get(block.n);
                    return (
                        <div key={block.n} className="flv17-assess-stack">
                            <ReportSectionBlock block={block} />
                            {row ? <AssessCard row={row} /> : null}
                        </div>
                    );
                })}
            </div>
            <div className="overallAssessment">
                <div className="overallHead">
                    <div>
                        <span>COMPOSITE IMPACT INDICATOR</span>
                        <h2>
                            {model.ciiLocked
                                ? `Faculty-Verified CII ${model.ciiScore}/100`
                                : model.ciiScore != null
                                  ? `Provisional CII ${model.ciiScore}/100`
                                  : "Current status: HOLD CII · REQUIRED CORRECTIONS"}
                        </h2>
                    </div>
                    <div className="ciiHold">
                        {model.ciiLocked ? `${model.ciiScore}/100` : model.ciiScore != null ? `Provisional ${model.ciiScore}/100` : "NOT YET SCORED"}
                        <small>100-point CII · System CII is provisional until Faculty approval</small>
                    </div>
                </div>
                <p>{model.overall}</p>
                <div className="mapping">
                    {model.assessment.map((row) => (
                        <div key={row.no}>
                            <b>Report {row.no}</b>
                            <span>{row.name}</span>
                            <strong>
                                {row.score === "HOLD" ? "" : row.score}/{row.max}
                            </strong>
                        </div>
                    ))}
                </div>
                <div className="mappingNote">
                    <b>Important:</b> Report Sections 04 and 05 roll up into the canonical 20-point CII dimension “Activities, Outputs, Reach & Outcomes” (13 + 7 = 20). Total CII remains 100. The System Assessment never rewrites this source record.
                </div>
            </div>
            <section className="badgeRules">
                <h2>Recognition after Faculty approval</h2>
                <div className="badgeGrid">
                    <div>
                        <b>L1 · 0–47</b>
                        <span>Participation Acknowledgement</span>
                    </div>
                    <div>
                        <b>L2 · 48–57</b>
                        <span>Foundation Stage Contributor</span>
                    </div>
                    <div>
                        <b>L3 · 58–66</b>
                        <span>Emerging Community Contributor</span>
                    </div>
                    <div>
                        <b>L4 · 67–83</b>
                        <span>Developing Impact Contributor</span>
                    </div>
                    <div>
                        <b>L5 · 84–91</b>
                        <span>Distinguished Impact Contributor</span>
                    </div>
                    <div>
                        <b>L6 · 92–100</b>
                        <span>Transformative Impact Contributor</span>
                    </div>
                </div>
                <p>Premium recognition is subject to evidence/outcome/sustainability quality gates. A numerical score alone does not guarantee Distinguished or Transformative recognition.</p>
            </section>
        </div>
    );
}

export default function FacultyLockedV17Modal({
    reportId,
    report,
    projectData,
    initialTab = "flashView",
    analyzerHref: analyzerHrefProp,
    variant = "modal",
    onClose,
}: {
    reportId?: string;
    /** Skip the faculty API and render from an already-loaded student/faculty report record. */
    report?: Record<string, unknown>;
    projectData?: unknown;
    initialTab?: TabId;
    analyzerHref?: string;
    /** `page` = faculty dossier route (no overlay). `modal` keeps the existing overlay. */
    variant?: "modal" | "page";
    onClose: () => void;
}) {
    const [tab, setTab] = useState<TabId>(initialTab);
    const [loading, setLoading] = useState(!report);
    const [loadError, setLoadError] = useState(false);
    const [raw, setRaw] = useState<Record<string, unknown> | null>(() =>
        report ? (prepareReportForVerifyDossier(report) as Record<string, unknown>) : null,
    );
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (report) return;
        if (!reportId) {
            setLoadError(true);
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setLoadError(false);
        authenticatedFetch(`/api/v1/faculty/reports/${reportId}`)
            .then(async (response) => {
                if (!response?.ok) {
                    toast.error("Locked Impact Package is not available for this report.");
                    return null;
                }
                return response.json();
            })
            .then((payload) => {
                if (cancelled) return;
                if (!payload) {
                    setLoadError(true);
                    return;
                }
                const rec = unwrapFacultyReportPayload(payload as Record<string, unknown>);
                if (!rec || typeof rec !== "object") {
                    setLoadError(true);
                    return;
                }
                setRaw(prepareReportForVerifyDossier(rec) as Record<string, unknown>);
            })
            .catch(() => {
                if (!cancelled) {
                    setLoadError(true);
                    toast.error("Failed to open the locked Impact Package.");
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [reportId, report]);

    const flash = useMemo(() => (raw ? coerceFlashReportData(raw) : null), [raw]);
    const model = useMemo(() => {
        if (!flash) return null;
        try {
            return buildLockedV17Package(flash, projectData ?? raw?.opportunity ?? raw);
        } catch {
            return null;
        }
    }, [flash, raw, projectData]);
    const cii = flash ? resolveReportCii(flash) : null;
    const analyzerHref =
        analyzerHrefProp || (reportId ? `/dashboard/faculty/reports/${reportId}?view=cii-v4-5` : undefined);

    const asPage = variant === "page";

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        if (asPage) {
            return () => window.removeEventListener("keydown", onKey);
        }
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
            document.body.classList.remove("flv17-print");
            const mount = document.getElementById("flv17-print-mount");
            if (mount) mount.innerHTML = "";
        };
    }, [onClose, asPage]);

    const printPackage = () => {
        const source = document.getElementById("flv17-print-root");
        if (!source) return;
        let mount = document.getElementById("flv17-print-mount");
        if (!mount) {
            mount = document.createElement("div");
            mount.id = "flv17-print-mount";
            document.body.appendChild(mount);
        }
        mount.innerHTML = source.innerHTML;
        document.body.classList.add("flv17-print");
        const cleanup = () => {
            if (!document.body.classList.contains("flv17-print") && !mount?.innerHTML) return;
            document.body.classList.remove("flv17-print");
            if (mount) mount.innerHTML = "";
            window.removeEventListener("afterprint", cleanup);
        };
        window.addEventListener("afterprint", cleanup);
        window.print();
        window.setTimeout(cleanup, 800);
    };

    if (!asPage && !mounted) return null;

    const shell = (
        <div className={asPage ? "flv17-page" : "flv17-modal-backdrop"} role="dialog" aria-modal={!asPage} aria-labelledby="flv17-title">
            {asPage ? (
                <div className="mx-auto max-w-[1180px] px-4 pt-4">
                    <HubBackButton href="/dashboard/faculty/community-service" label="← Back to Community Service" />
                </div>
            ) : null}
            <div className="flv17-modal">
                <div className="flv17-modal-top flv17-modal-chrome">
                    <button type="button" className="flv17-close" onClick={onClose} aria-label="Close">
                        ×
                    </button>
                    <span className="pill">LOCKED STUDENT SUBMISSION</span>
                    <h3 id="flv17-title">Locked Faculty Report Package</h3>
                    <p>Locked Faculty review package · Flashcard · Detailed Report · Evidence · Attendance/Hours · CII Analyzer + Claim–Evidence Verification. The System Assessment never rewrites this source record.</p>
                </div>
                <div className="flv17-modal-body" id="flv17-print-root">
                    <div className="flv17-lock-banner">
                        <b>One locked source package:</b> Flashcard + Detailed Report + Evidence + Attendance/Hours. The CII Analyzer reads these records, maps material claims to evidence and never rewrites student-entered facts.
                        {cii?.source === "faculty_locked" ? ` Faculty-Verified CII ${cii.totalScore}/100.` : ""}
                    </div>
                    <div className="flv17">
                        <div className="shell">
                            <div className="topbar assessmentOnlyHide">
                                <div className="brand">
                                    <b>CIEL PK · Community Engagement</b>
                                    <span>Locked flashcard + detailed report + Faculty/System assessment layer</span>
                                </div>
                                <div className="tabs">
                                    {TABS.map((item) => {
                                        const evidenceCount = sourceTabsOf(model).evidenceItems.length;
                                        const analyzerReady = Boolean(sourceTabsOf(model).analyzerReady);
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                className={`tab ${tab === item.id ? "on" : ""}`}
                                                onClick={() => setTab(item.id)}
                                            >
                                                {item.label}
                                                {item.id === "evidenceView" ? <i>{evidenceCount}</i> : null}
                                                {item.id === "analyzerView" && analyzerReady ? <i>READY</i> : null}
                                            </button>
                                        );
                                    })}
                                    <button type="button" className="tab" onClick={printPackage}>
                                        Print Package
                                    </button>
                                </div>
                            </div>
                            <div className="locknote assessmentOnlyHide">{model?.lockNote || "Locked-source rule. The student submission is preserved exactly."}</div>
                            {loading ? (
                                <div className="flex min-h-[40vh] items-center justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
                                </div>
                            ) : loadError || !model ? (
                                <div className="rounded-2xl border border-dashed border-[#d7e5e8] bg-white px-4 py-10 text-center">
                                    <p className="text-sm font-extrabold text-[#16313d]">Locked package could not be opened</p>
                                    <p className="mt-1 text-[12.5px] text-[#6b7c86]">The student record is unchanged. Close and try again from Reports for Review.</p>
                                    <button type="button" className="flv17-close" style={{ position: "static", marginTop: 12 }} onClick={onClose}>
                                        Close
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <section className={`view ${tab === "flashView" ? "on" : ""}`}>
                                        <LockedImpactFlashcard model={model} />
                                    </section>
                                    <section className={`view ${tab === "reportView" ? "on" : ""}`}>
                                        <DetailedReport model={model} />
                                    </section>
                                    <section className={`view ${tab === "evidenceView" ? "on" : ""}`}>
                                        <EvidencePane tabs={sourceTabsOf(model)} />
                                    </section>
                                    <section className={`view ${tab === "attendanceView" ? "on" : ""}`}>
                                        <AttendancePane tabs={sourceTabsOf(model)} />
                                    </section>
                                    <section className={`view ${tab === "analyzerView" ? "on" : ""}`}>
                                        <AnalyzerPane model={model} analyzerHref={analyzerHref} />
                                    </section>
                                    <section className={`view ${tab === "decisionView" ? "on" : ""}`}>
                                        <div className="flv17-analyzer">
                                            <div className="flv17-analyzerTop">
                                                <div className="flv17-analyzerTitle">
                                                    <span className="flv17-analyzerIcon">✓</span>
                                                    <div>
                                                        <small>CIEL PK · FACULTY DECISION</small>
                                                        <h2>Review and approve this locked package</h2>
                                                        <p>
                                                            Faculty can view the Flashcard, Detailed Report and CII record. Analysis, Approve, Request revision and Reject stay with CIEL PK Admin.
                                                        </p>
                                                    </div>
                                                </div>
                                                {analyzerHref ? (
                                                    <Link className="flv17-run" href={analyzerHref}>
                                                        Open Faculty Decision
                                                    </Link>
                                                ) : null}
                                            </div>
                                        </div>
                                    </section>
                                    <section className={`view ${tab === "assessedView" ? "on" : ""}`}>
                                        <AssessmentLayer model={model} />
                                    </section>
                                    <section className={`view ${tab === "badgeView" ? "on" : ""}`}>
                                        <div className="assessmentIntro">
                                            <b>Flashcard + recognition layer.</b> The Flashcard template itself is unchanged. CII and the Faculty-verified badge sit outside the locked Flashcard as an assessment/credential layer.
                                        </div>
                                        {model.ciiLocked ? (
                                            <div className="badgePanel verified">
                                                <div>
                                                    <b>CIEL PK CII RECOGNITION</b>
                                                    <span>Locked Flashcard now updated with the Faculty-Verified badge and score. The Detailed Report remains the assessment source.</span>
                                                </div>
                                                <div className="right">
                                                    <span className="chip">Faculty-Verified CII · {model.ciiScore}/100</span>
                                                    <span className="chip">{model.badgeLabel}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="badgePanel">
                                                <div>
                                                    <b>CIEL PK CII RECOGNITION</b>
                                                    <span>Assessment layer — displayed only after Faculty verification</span>
                                                </div>
                                                <div className="badgePending">
                                                    <b>{model.ciiScore != null ? `PROVISIONAL CII ${model.ciiScore}/100` : "BADGE PENDING"}</b>
                                                    <span>Badge will update on the flashcard once Faculty finalises the score</span>
                                                </div>
                                            </div>
                                        )}
                                        <LockedImpactFlashcard model={model} />
                                    </section>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (asPage) return shell;
    return createPortal(shell, document.body);
}
