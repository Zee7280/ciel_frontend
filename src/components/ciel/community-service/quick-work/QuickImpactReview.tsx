"use client";

import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { formatInternationalPhoneDisplay } from "@/utils/countryCallingCodes";
import {
    activityLabel,
    evidenceKind,
    formatHours,
    SDG_COLORS,
    SDG_NAMES,
    shortDate,
    type QuickWorkEvidence,
    type QuickWorkLog,
} from "@/utils/quickWorkRules";
import { impactPoints } from "@/utils/quickImpactPoints";
import { EvidenceTile } from "./QuickWorkShared";
import "./quick-impact-review.css";

/**
 * Student pre-submission flashcard (UN-blue): a Summary card, Team & attendance, and Evidence (with a
 * slideshow), plus one "Print flashcard, attendance + evidence sheet" package. Read-only: it only shows
 * what the saved log already holds, so nothing here changes what is submitted.
 */

const MAX_HIGHLIGHTS = 5;

function contactLine(email?: string | null, contact?: string | null): string {
    return [email, contact ? formatInternationalPhoneDisplay(contact) : ""].filter(Boolean).join(" · ");
}

function mapHref(pin: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pin)}`;
}

/* ------------------------------------------------------------------ summary card */

function SummaryCard({ log }: { log: QuickWorkLog }) {
    const present = log.participants.filter((p) => p.present);
    const teamMinutes = present.reduce((a, p) => a + (p.minutes || 0), 0);
    const reached = log.peopleReached ?? null;
    const target = log.peopleTarget && log.peopleTarget > 0 ? log.peopleTarget : null;
    const rate = target && reached !== null ? Math.round((reached / target) * 100) : null;
    const sdgNum = Number(log.sdg) || 0;
    const sdgName = sdgNum >= 1 && sdgNum <= 17 ? SDG_NAMES[sdgNum - 1] : null;
    const allPoints = impactPoints(log.summary);
    const points = allPoints.slice(0, MAX_HIGHLIGHTS);
    const morePoints = allPoints.length - points.length;
    const partners = log.partnerDetails ?? (log.partners ?? []).map((name) => ({ name, email: null, contact: null }));
    const hostPartners = [log.host, ...partners.map((p) => p.name)].filter((v): v is string => Boolean(v && v.trim())).join(" · ");

    return (
        <article className="qcr-card">
            <header className="qcr-hero">
                <div className="qcr-kicker">CIEL PK · Quick Community Impact</div>
                <h2>{log.title || "Quick Community Impact"}</h2>
                <div className="qcr-meta">
                    {[activityLabel(log) || "Activity", shortDate(log.activityDate), log.location || "Venue not recorded"].join(" · ")}
                </div>
            </header>
            <div className="qcr-content">
                <div className="qcr-stats">
                    <div className="qcr-stat">
                        <b>{present.length}</b>
                        <span>Attended</span>
                    </div>
                    <div className="qcr-stat">
                        <b>{formatHours(teamMinutes)}</b>
                        <span>Team person-hours</span>
                    </div>
                    <div className="qcr-stat">
                        <b>{reached === null ? "—" : reached}</b>
                        <span>People reached</span>
                    </div>
                    <div className="qcr-stat">
                        <b>{log.evidence.length}</b>
                        <span>Evidence items</span>
                    </div>
                </div>

                <div className="qcr-sdg">
                    <div className="qcr-sdg-mark" style={{ background: sdgNum ? SDG_COLORS[sdgNum] ?? "#607d8b" : "#607d8b" }}>
                        {sdgNum || "—"}
                    </div>
                    <div className="qcr-sdg-copy">
                        <b>{sdgName ?? "SDG not selected"}</b>
                        <span>{sdgName ? "United Nations Sustainable Development Goal" : "Select a relevant SDG to show alignment"}</span>
                    </div>
                </div>

                {target ? (
                    <div className="qcr-section">
                        <h3>Reach against target</h3>
                        <div className="qcr-detail">
                            <b>
                                {reached ?? 0} of {target} people reached{rate !== null ? ` · ${rate}%` : ""}
                            </b>
                            <div className="qcr-progress">
                                <i style={{ width: `${Math.max(0, Math.min(100, rate ?? 0))}%` }} />
                            </div>
                        </div>
                    </div>
                ) : null}

                <div className="qcr-section">
                    <h3>Activity highlights</h3>
                    <ul className="qcr-impact">
                        {points.length ? points.map((x, i) => <li key={`${i}-${x}`}>{x}</li>) : <li>No activity summary added.</li>}
                    </ul>
                    {morePoints > 0 ? (
                        <p className="qcr-more">
                            + {morePoints} more point{morePoints === 1 ? "" : "s"} in the full activity description.
                        </p>
                    ) : null}
                </div>

                <div className="qcr-detailgrid">
                    <div className="qcr-detail">
                        Date &amp; time
                        <b>
                            {shortDate(log.activityDate)} · {log.startTime || "—"}–{log.endTime || "—"} PKT
                        </b>
                    </div>
                    <div className="qcr-detail">
                        Host / partners<b>{hostPartners || "Not recorded"}</b>
                    </div>
                    <div className="qcr-detail">
                        University / programme
                        <b>
                            {log.university || "—"} · {log.department || "—"}
                        </b>
                    </div>
                    <div className="qcr-detail">
                        Faculty reviewer
                        <b>
                            {log.facultyName || "—"}
                            {log.facultyEmail ? ` · ${log.facultyEmail}` : ""}
                        </b>
                    </div>
                    <div className="qcr-detail qcr-wide">
                        Venue
                        <b>
                            {log.location || "Not recorded"}
                            {log.locationPin ? (
                                <>
                                    {" · "}
                                    <a href={mapHref(log.locationPin)} target="_blank" rel="noopener noreferrer">
                                        Open in Google Maps
                                    </a>
                                </>
                            ) : null}
                        </b>
                    </div>
                    <div className="qcr-detail">
                        Host contact
                        <b>{log.host ? contactLine(log.hostEmail, log.hostContact) || "No contact added" : "No host added"}</b>
                    </div>
                    <div className="qcr-detail">
                        Evidence visibility<b>{log.visibility || "—"}</b>
                    </div>
                    <div className="qcr-detail qcr-wide">
                        Partner organisations
                        <b>
                            {partners.length
                                ? partners
                                      .map((p) => {
                                          const c = contactLine(p.email, p.contact);
                                          return c ? `${p.name} (${c})` : p.name;
                                      })
                                      .join("; ")
                                : "None"}
                        </b>
                    </div>
                    <div className="qcr-detail qcr-wide">
                        Declarations
                        <b>
                            Evidence consent {log.consent ? "✓" : "pending"} · Accurate attendance {log.honest ? "✓" : "pending"}
                        </b>
                    </div>
                </div>
            </div>
        </article>
    );
}

/* ------------------------------------------------------------------ attendance */

function AttendanceBlock({ log }: { log: QuickWorkLog }) {
    const total = log.participants.reduce((a, p) => a + (p.present ? p.minutes || 0 : 0), 0);
    const count = log.participants.length;
    return (
        <div>
            <h3 className="qcr-atth">
                Team &amp; attendance · {count} {count === 1 ? "participant" : "participants"} · {formatHours(total)} h total
            </h3>
            {/* Phones: one card per person so nothing sits off-screen in a six-column table. */}
            <ul className="qcr-att-cards" aria-label="Team and attendance">
                {log.participants.map((p) => (
                    <li key={p.id}>
                        <div className="qcr-att-top">
                            <div className="qcr-att-who">
                                <b>{p.name || p.email || "—"}</b>
                                <small>{[p.isLead ? "Activity lead" : "", p.studentId].filter(Boolean).join(" · ")}</small>
                            </div>
                            <b className="qcr-att-hrs">{formatHours(p.present ? p.minutes : 0)} h</b>
                        </div>
                        <dl>
                            <dt>Status</dt>
                            <dd>{p.present ? "Present" : "Absent"}</dd>
                            <dt>Time</dt>
                            <dd>{p.present ? `${p.startTime ?? "—"}–${p.endTime ?? "—"}` : "—"}</dd>
                            <dt>Break</dt>
                            <dd>{p.present ? `${p.breakMinutes} min` : "—"}</dd>
                        </dl>
                    </li>
                ))}
            </ul>
            <div className="qcr-tablewrap">
                <table className="qcr-att">
                    <thead>
                        <tr>
                            <th>Participant / Student ID</th>
                            <th>Status</th>
                            <th>Arrival</th>
                            <th>Departure</th>
                            <th>Break</th>
                            <th>Hours</th>
                        </tr>
                    </thead>
                    <tbody>
                        {log.participants.map((p) => (
                            <tr key={p.id}>
                                <td>
                                    {p.name || p.email || "—"}
                                    {p.isLead ? <small>Activity lead</small> : null}
                                    <small>{p.studentId || ""}</small>
                                </td>
                                <td>{p.present ? "Present" : "Absent"}</td>
                                <td>{p.present ? p.startTime ?? "—" : "—"}</td>
                                <td>{p.present ? p.endTime ?? "—" : "—"}</td>
                                <td>{p.present ? `${p.breakMinutes} min` : "—"}</td>
                                <td>
                                    <b>{formatHours(p.present ? p.minutes : 0)} h</b>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ evidence */

function SlidePreview({ ev, index }: { ev: QuickWorkEvidence; index: number }) {
    const kind = evidenceKind(ev.type);
    if (!ev.url) return <div className="qcr-file-preview">Preview unavailable. Reopen this record to refresh it.</div>;
    if (kind === "image") {
        // eslint-disable-next-line @next/next/no-img-element -- user evidence from S3, any size
        return <img src={ev.url} alt={ev.caption || `Evidence ${index + 1}`} />;
    }
    if (kind === "video") return <video src={ev.url} controls playsInline preload="metadata" />;
    if (kind === "audio") {
        return (
            <div className="qcr-file-preview">
                {ev.name}
                <audio src={ev.url} controls preload="none" />
            </div>
        );
    }
    return (
        <div className="qcr-file-preview">
            {kind === "pdf" ? "PDF" : "FILE"}
            <br />
            {ev.name}
        </div>
    );
}

function EvidencePanel({ evidence }: { evidence: QuickWorkEvidence[] }) {
    const [show, setShow] = useState(false);
    const [slide, setSlide] = useState(0);
    const n = evidence.length;
    if (!n) return <p className="qcr-empty">No evidence files attached.</p>;
    const i = ((slide % n) + n) % n;
    const ev = evidence[i];
    return (
        <div>
            <div className="qcr-files">
                {evidence.map((e, k) => (
                    <EvidenceTile key={`${k}-${e.name}`} item={e} />
                ))}
            </div>
            {!show ? (
                <div className="qcr-center">
                    <button type="button" className="qcr-btn qcr-primary" onClick={() => setShow(true)}>
                        Open evidence slideshow
                    </button>
                </div>
            ) : (
                <div className="qcr-slideshow">
                    <div className="qcr-slide">
                        <div className="qcr-slideview">
                            <SlidePreview ev={ev} index={i} />
                        </div>
                        <div className="qcr-slidecap">
                            <b>{ev.caption || ev.name}</b>
                            <span>
                                {ev.url && evidenceKind(ev.type) !== "image" ? (
                                    <>
                                        <a href={ev.url} target="_blank" rel="noopener noreferrer">
                                            Open
                                        </a>
                                        {" · "}
                                    </>
                                ) : null}
                                {i + 1} / {n}
                            </span>
                        </div>
                    </div>
                    <div className="qcr-slidenav">
                        <button type="button" className="qcr-btn qcr-small" disabled={n < 2} onClick={() => setSlide(i - 1)} aria-label="Previous evidence">
                            ← Previous
                        </button>
                        <div className="qcr-dots">
                            {evidence.map((_, k) => (
                                <button
                                    key={k}
                                    type="button"
                                    className="qcr-dot"
                                    aria-label={`Show evidence ${k + 1}`}
                                    aria-current={k === i}
                                    onClick={() => setSlide(k)}
                                />
                            ))}
                        </div>
                        <button type="button" className="qcr-btn qcr-small" disabled={n < 2} onClick={() => setSlide(i + 1)} aria-label="Next evidence">
                            Next →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/** Print-only: every evidence file on its own tile, 2 per row. */
function EvidenceSheet({ log }: { log: QuickWorkLog }) {
    return (
        <section className="qcr-sheet">
            <h2>Quick Community Impact · Evidence Sheet</h2>
            <p className="qcr-sheet-sub">
                Evidence attached to “{log.title}” · {shortDate(log.activityDate)} · {log.evidence.length} {log.evidence.length === 1 ? "item" : "items"}
            </p>
            <div className="qcr-ev-grid">
                {log.evidence.map((ev, i) => {
                    const kind = evidenceKind(ev.type);
                    return (
                        <div className="qcr-ev-item" key={`${i}-${ev.name}`}>
                            <div className="qcr-ev-thumb">
                                {kind === "image" && ev.url ? (
                                    // eslint-disable-next-line @next/next/no-img-element -- user evidence from S3, any size
                                    <img src={ev.url} alt="" />
                                ) : (
                                    <span className="qcr-file-preview">
                                        {kind.toUpperCase()}
                                        <br />
                                        {ev.name}
                                    </span>
                                )}
                            </div>
                            <div className="qcr-ev-caption">
                                <b>
                                    {i + 1}. {ev.name}
                                </b>
                                {ev.caption || "Evidence caption not provided"}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ review */

const TABS = ["summary", "attendance", "evidence"] as const;
type Tab = (typeof TABS)[number];

export function QuickImpactReview({ log }: { log: QuickWorkLog }) {
    const [tab, setTab] = useState<Tab>("summary");
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    useEffect(() => () => document.body.classList.remove("qcr-printing"), []);

    const labels: Record<Tab, string> = {
        summary: "Summary",
        attendance: `Team & attendance (${log.participants.length})`,
        evidence: `Evidence (${log.evidence.length})`,
    };

    const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
        const next =
            e.key === "ArrowRight" ? (index + 1) % TABS.length : e.key === "ArrowLeft" ? (index + TABS.length - 1) % TABS.length : e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : -1;
        if (next < 0) return;
        e.preventDefault();
        setTab(TABS[next]);
        document.getElementById(`qcr-tab-${TABS[next]}`)?.focus();
    };

    /** Prints the flashcard, the attendance table and the evidence sheet (the rest of the page is hidden). */
    const printPackage = () => {
        const done = () => {
            document.body.classList.remove("qcr-printing");
            window.removeEventListener("afterprint", done);
        };
        window.addEventListener("afterprint", done);
        document.body.classList.add("qcr-printing");
        window.print();
    };

    const panel = (name: Tab, children: ReactNode) => (
        <section role="tabpanel" id={`qcr-panel-${name}`} aria-labelledby={`qcr-tab-${name}`} hidden={tab !== name}>
            {children}
        </section>
    );

    return (
        <div className="qcr">
            <div className="qcr-tabs" role="tablist" aria-label="Flashcard sections">
                {TABS.map((t, i) => (
                    <button
                        key={t}
                        type="button"
                        role="tab"
                        id={`qcr-tab-${t}`}
                        className="qcr-tab"
                        aria-selected={tab === t}
                        aria-controls={`qcr-panel-${t}`}
                        tabIndex={tab === t ? 0 : -1}
                        onClick={() => setTab(t)}
                        onKeyDown={(e) => onTabKey(e, i)}
                    >
                        {labels[t]}
                    </button>
                ))}
            </div>
            {panel("summary", <SummaryCard log={log} />)}
            {panel("attendance", <AttendanceBlock log={log} />)}
            {panel("evidence", <EvidencePanel evidence={log.evidence} />)}
            <div className="qcr-printrow">
                <button type="button" className="qcr-btn" onClick={printPackage}>
                    Print flashcard, attendance + evidence sheet
                </button>
            </div>
            {mounted
                ? createPortal(
                      <div className="qcr-print-root" aria-hidden>
                          <SummaryCard log={log} />
                          <div className="qcr-print-att">
                              <AttendanceBlock log={log} />
                          </div>
                          <EvidenceSheet log={log} />
                      </div>,
                      document.body,
                  )
                : null}
        </div>
    );
}
