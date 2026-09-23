"use client";

import { useState } from "react";
import { findSdgById } from "@/utils/sdgData";
import "@/components/opportunities/create-opportunity.css";

export type FlashViewer = "eligible" | "wrongdept" | "otheruni";

export type StudentFlashcardModel = {
    title: string;
    hook: string;
    summary: string;
    activityType: string;
    mode: string;
    city: string;
    hours: string;
    seats: string;
    start: string;
    end: string;
    deadline: string;
    beneficiariesCount: string;
    beneficiaryType: string;
    responsibilities: string;
    scheduleNotes: string;
    skills: string;
    resources: string;
    prerequisites: string;
    sdg: string;
    target: string;
    secondarySdg: string;
    secondaryTarget: string;
    objective: string;
    outputs: string;
    creatorName: string;
    orgLabel: string;
    unitLabel: string;
    badgeLabel: string;
    privateCandidate: boolean;
    facultyName: string;
    facultyEmail: string;
    host: string;
    partnerEmail: string;
    verification: string;
    scopeLabel: string;
    scopeDetail: string;
    approvalText: string;
    eligible: boolean;
    eligibilityWhy: string;
};

function esc(s: string): string {
    return s || "—";
}

function daysUntil(deadline: string): number | null {
    const d = deadline.trim();
    if (!d) return null;
    const end = new Date(d.length <= 10 ? `${d}T23:59:59` : d);
    if (Number.isNaN(end.getTime())) return null;
    return Math.floor((end.getTime() - Date.now()) / 86400000);
}

function prettyDate(iso: string): string {
    const d = iso.trim();
    if (!d) return "TBC";
    const dt = new Date(d.length <= 10 ? `${d}T00:00:00` : d);
    if (Number.isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function daySpan(start: string, end: string): string {
    const a = start.trim();
    const b = end.trim();
    if (!a || !b) return "";
    const ms = new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime();
    if (!Number.isFinite(ms) || ms < 0) return "";
    const days = Math.round(ms / 86400000) + 1;
    return `${days} day${days === 1 ? "" : "s"}`;
}

function splitBits(raw: string): string[] {
    return raw
        .split(/[\n,;]+/)
        .map((s) => s.replace(/^[\s•\-*]+/, "").replace(/^step\s*\d+\s*[:.)-]?\s*/i, "").trim())
        .filter(Boolean);
}

function flowSteps(raw: string): string[] {
    const lines = raw
        .split(/\n+/)
        .map((s) => s.replace(/^[\s•\-*]+/, "").replace(/^step\s*\d+\s*[:.)-]?\s*/i, "").trim())
        .filter(Boolean);
    if (lines.length === 0) return ["Responsibilities will be confirmed with selected students."];
    if (lines.length <= 4) return lines;
    return [...lines.slice(0, 3), lines.slice(3).join(" ")];
}

function icsDay(iso: string, plusDays = 0): string {
    const raw = iso.trim();
    if (!raw) return "";
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return "";
    const dt = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (Number.isNaN(dt.getTime())) return "";
    dt.setDate(dt.getDate() + plusDays);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    return `${y}${m}${d}`;
}

function downloadIcs(filename: string, title: string, start: string, end?: string) {
    const startDay = icsDay(start);
    if (!startDay) return;
    const endDay = icsDay((end || start).trim() || start, 1);
    if (!endDay) return;
    const body = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//CIEL PK//Opportunity//EN",
        "BEGIN:VEVENT",
        `DTSTART;VALUE=DATE:${startDay}`,
        `DTEND;VALUE=DATE:${endDay}`,
        `SUMMARY:${title.replace(/\n/g, " ")}`,
        "END:VEVENT",
        "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([body], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function pickStr(...vals: unknown[]): string {
    for (const v of vals) {
        if (typeof v === "string" && v.trim()) return v.trim();
        if (typeof v === "number" && Number.isFinite(v)) return String(v);
    }
    return "";
}

function asRecord(v: unknown): Record<string, unknown> {
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function listText(v: unknown): string {
    if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean).join(", ");
    return pickStr(v);
}

export function buildOpportunityRecordFlashcard(
    raw: Record<string, unknown>,
    people?: {
        studentName?: string;
        facultyName?: string;
        facultyEmail?: string;
        partnerOrg?: string;
        partnerEmail?: string;
        university?: string;
    },
): StudentFlashcardModel {
    const objectives = asRecord(raw.objectives);
    const timeline = asRecord(raw.timeline);
    const location = asRecord(raw.location);
    const cityFromObject = pickStr(location.city, location.venue, location.district);
    const cityFromString = typeof raw.location === "string" ? raw.location.trim() : "";
    const activity = asRecord(raw.activity_details);
    const supervision = asRecord(raw.supervision);
    const sdgInfo = asRecord(raw.sdg_info);
    const secondary = Array.isArray(raw.secondary_sdgs) ? asRecord(raw.secondary_sdgs[0]) : {};
    const types = Array.isArray(raw.types) ? raw.types.map((t) => String(t)).filter(Boolean) : [];
    const host =
        pickStr(people?.partnerOrg, supervision.partner_org_name, supervision.external_partner_org_name) ||
        "No external partner";
    return {
        title: pickStr(raw.title),
        hook: pickStr(objectives.hook, objectives.summary),
        summary: pickStr(objectives.summary, objectives.description, raw.description),
        activityType: types[0] || pickStr(raw.type) || "Community Service",
        mode: pickStr(raw.mode) || "On-site",
        city: cityFromObject || cityFromString || (pickStr(raw.mode) === "Remote" ? "Remote" : ""),
        hours: pickStr(timeline.expected_hours) || "0",
        seats: pickStr(timeline.volunteers_required) || "0",
        start: pickStr(timeline.start_date),
        end: pickStr(timeline.end_date),
        deadline: pickStr(timeline.application_deadline),
        beneficiariesCount: pickStr(objectives.beneficiaries_count) || "0",
        beneficiaryType: listText(objectives.beneficiaries_type) || pickStr(objectives.beneficiary_group) || "Community members",
        responsibilities: pickStr(activity.student_responsibilities),
        scheduleNotes: pickStr(timeline.schedule_notes),
        skills: listText(activity.skills_gained),
        resources: pickStr(activity.resources),
        prerequisites: pickStr(activity.prerequisites),
        sdg: pickStr(sdgInfo.sdg_id),
        target: pickStr(sdgInfo.target_id),
        secondarySdg: pickStr(secondary.sdg_id),
        secondaryTarget: pickStr(secondary.target_id),
        objective: pickStr(objectives.description, sdgInfo.why_relevant),
        outputs: pickStr(objectives.outputs, objectives.outcome),
        creatorName: pickStr(people?.studentName, supervision.supervisor_name) || "Creator",
        orgLabel: pickStr(people?.university, supervision.faculty_university_name) || "CIEL PK",
        unitLabel: pickStr(supervision.faculty_department, supervision.role),
        badgeLabel: "Student created",
        privateCandidate: supervision.private_candidate === true,
        facultyName: pickStr(people?.facultyName, supervision.supervisor_name),
        facultyEmail: pickStr(people?.facultyEmail, supervision.contact),
        host,
        partnerEmail: pickStr(people?.partnerEmail, supervision.partner_email, supervision.external_partner_email),
        verification: listText(raw.verification_method) || "Photos / attendance / reflection",
        scopeLabel: pickStr(raw.visibility) === "public" ? "Open application" : "Scoped application",
        scopeDetail: "Apply Now follows the scope set when this opportunity was created.",
        approvalText: "Approval flow: Student → Faculty → Partner → CIEL PK",
        eligible: true,
        eligibilityWhy: "Students who match the application scope can apply once this opportunity is live.",
    };
}

export function resolveStudentFlashEligibility(input: {
    viewer: FlashViewer;
    privateCandidate: boolean;
    applyScope: string;
    creatorUniversity: string;
}): { eligible: boolean; why: string } {
    const { viewer, privateCandidate, applyScope, creatorUniversity } = input;
    if (viewer === "eligible") {
        return { eligible: true, why: "You match the selected application scope." };
    }
    if (privateCandidate) {
        if (applyScope === "all") {
            return {
                eligible: true,
                why: "This private-candidate-created opportunity is open across all universities after CIEL PK verification.",
            };
        }
        return {
            eligible: false,
            why:
                viewer === "otheruni"
                    ? "The card is public, but Apply Now is restricted to the selected university scope."
                    : "The card is public, but your department / programme is outside the selected scope.",
        };
    }
    if (viewer === "otheruni") {
        return {
            eligible: false,
            why: `This student-created opportunity is visible to you, but applications are restricted to ${creatorUniversity || "the creator university"}.`,
        };
    }
    if (viewer === "wrongdept" && (applyScope === "student_own_dept" || applyScope === "student_selected_depts")) {
        return {
            eligible: false,
            why: "You are in the correct university, but your department/programme is not permitted.",
        };
    }
    return { eligible: true, why: "You are in the creator university and match the selected scope." };
}

export function resolveFacultyFlashEligibility(input: {
    viewer: FlashViewer;
    applyScope: string;
    creatorUniversity: string;
}): { eligible: boolean; why: string } {
    const { viewer, applyScope, creatorUniversity } = input;
    if (viewer === "eligible") {
        return { eligible: true, why: "You match the selected application scope." };
    }
    if (applyScope === "all") {
        return { eligible: true, why: "This opportunity is open across all universities and departments." };
    }
    if (viewer === "otheruni") {
        if (applyScope === "own_uni_all" || applyScope === "own_dept") {
            return {
                eligible: false,
                why: `The card is public, but Apply Now is restricted to ${creatorUniversity || "the creator university"}.`,
            };
        }
        return {
            eligible: false,
            why: "The card is public, but Apply Now is restricted to the selected university scope.",
        };
    }
    if (
        viewer === "wrongdept" &&
        (applyScope === "own_dept" || applyScope === "one_depts" || applyScope === "multi_depts")
    ) {
        return {
            eligible: false,
            why: "The card is public, but your department / programme is outside the selected scope.",
        };
    }
    return { eligible: true, why: "You match the selected application scope." };
}

export function StudentOpportunityFlashcard({ model }: { model: StudentFlashcardModel }) {
    const [note, setNote] = useState("");
    const sdg = findSdgById(model.sdg);
    const sdgName = sdg?.title || "SDG";
    const sdgNum = sdg?.number != null ? String(sdg.number) : model.sdg || "—";
    const secondarySdg = model.secondarySdg ? findSdgById(model.secondarySdg) : null;
    const secondarySdgName = secondarySdg?.title || "SDG";
    const secondarySdgNum = secondarySdg?.number != null ? String(secondarySdg.number) : model.secondarySdg || "—";

    const days = daysUntil(model.deadline);
    const closed = days !== null && days < 0;
    const hot = days !== null && days >= 0 && days <= 3;
    const soon = days !== null && days > 3 && days <= 10;
    const ribbon =
        days === null ? "open" : closed ? "closed" : hot ? "hot" : soon ? "soon" : "open";
    const ribbonTitle =
        days === null
            ? "APPLICATIONS OPEN"
            : closed
              ? "APPLICATIONS CLOSED"
              : days === 0
                ? "CLOSES TODAY"
                : hot
                  ? "CLOSING SOON"
                  : soon
                    ? "APPLY SOON"
                    : "APPLICATIONS OPEN";
    const ribbonSub =
        days === null
            ? "Application deadline will appear here once it is set."
            : closed
              ? "The application deadline has passed. The card stays visible for reference."
              : days === 0
                ? "Applications close today. Apply before the day ends."
                : hot
                  ? `Only ${days} day${days === 1 ? "" : "s"} left to apply.`
                  : soon
                    ? `${days} days left before applications close.`
                    : `${days} days left. Applications are open.`;
    const span = daySpan(model.start, model.end);
    const steps = flowSteps(model.responsibilities);
    const skillChips = splitBits(model.skills);
    const title = model.title.trim() || "Untitled Community Service Opportunity";
    const hook = model.hook.trim() || "A practical opportunity to contribute, learn and build verified community impact.";
    const canApply = model.eligible && !closed;
    const ctaTitle = closed
        ? "Applications are closed."
        : !model.eligible
          ? "You can view this opportunity."
          : hot
            ? "Closing soon."
            : "Ready to contribute?";
    const ctaBody = closed
        ? "This deadline has passed. You can still read the card."
        : model.eligibilityWhy;
    const sdgWhy = model.objective.trim() || model.outputs.trim() || model.summary.trim();
    const reachBits = [
        model.beneficiariesCount.trim() ? { k: model.beneficiariesCount.trim(), l: model.beneficiaryType || "people reached" } : null,
        model.hours.trim() && model.hours.trim() !== "0" ? { k: `${model.hours.trim()} hrs`, l: "expected per student" } : null,
    ].filter((x): x is { k: string; l: string } => !!x);

    const remind = () => {
        if (!model.deadline.trim() || closed) return;
        downloadIcs("ciel-application-deadline.ics", `Apply: ${title}`, model.deadline);
        setNote("Deadline reminder downloaded.");
    };
    const addDates = () => {
        if (!model.start.trim()) return;
        downloadIcs("ciel-project-dates.ics", title, model.start, model.end || model.start);
        setNote("Project dates downloaded.");
    };
    const share = async () => {
        const text = `${title}\n${hook}`;
        try {
            await navigator.clipboard.writeText(text);
            setNote("Card text copied.");
        } catch {
            setNote("");
        }
    };

    return (
        <article className="co-flash">
            <section className="co-flash-hero">
                <div className="co-flash-top">
                    <div className="co-flash-kicker">CIEL PK · Community Service Opportunity</div>
                    <div className="co-flash-chips">
                        <span className="co-flash-chip">{esc(model.badgeLabel)}</span>
                        <span className="co-flash-chip">Public card</span>
                    </div>
                </div>
                <h1 className="co-flash-title">{esc(title)}</h1>
                <p className="co-flash-hook">{esc(hook)}</p>
                <div className="co-flash-meta">
                    <span>{esc(model.activityType || "Community Service")}</span>
                    <span>{esc(model.mode || "On-site")}</span>
                    {model.city.trim() ? <span>{esc(model.city)}</span> : null}
                    <span>{esc(model.orgLabel)}</span>
                </div>
            </section>
            <div className={`co-flash-ribbon ${ribbon}`}>
                <div className="co-flash-ribbon-copy">
                    <b>{ribbonTitle}</b>
                    <span>{ribbonSub}</span>
                </div>
                {closed ? null : (
                    <div className="co-flash-count">
                        <strong>{days === null ? "—" : days}</strong>
                        <small>days left</small>
                    </div>
                )}
                <div className="co-flash-ribbon-actions">
                    {closed ? null : (
                        <button type="button" className="co-flash-ghost" onClick={remind}>
                            Remind me
                        </button>
                    )}
                    <button type="button" className="co-flash-ghost" onClick={addDates}>
                        Add project dates
                    </button>
                </div>
            </div>
            <div className="co-flash-facts">
                <div className="co-flash-fact">
                    <div className="ico">⏱</div>
                    <small>Commitment</small>
                    <b>{esc(model.hours)} hours</b>
                    <em>per student</em>
                </div>
                <div className="co-flash-fact">
                    <div className="ico">👥</div>
                    <small>Seats</small>
                    <b>{esc(model.seats)}</b>
                    <em>students</em>
                </div>
                <div className="co-flash-fact">
                    <div className="ico">📅</div>
                    <small>Project dates</small>
                    <b>
                        {prettyDate(model.start)} – {prettyDate(model.end)}
                    </b>
                    <em>{span || "dates confirmed with the team"}</em>
                </div>
                <div className="co-flash-fact">
                    <div className="ico">🗓</div>
                    <small>Schedule</small>
                    <b>{esc(model.scheduleNotes || "Agreed with selected students")}</b>
                </div>
                <div className="co-flash-fact">
                    <div className="ico">🎯</div>
                    <small>Expected reach</small>
                    <b>{esc(model.beneficiariesCount)}</b>
                    <em>{esc(model.beneficiaryType)}</em>
                </div>
            </div>
            <div className="co-flash-duo">
                <section className="co-flash-need">
                    <span className="co-flash-tag">The need & the plan</span>
                    <h2>{esc(model.summary || hook)}</h2>
                    {model.objective.trim() && model.objective.trim() !== model.summary.trim() ? (
                        <p>{model.objective}</p>
                    ) : null}
                </section>
                <section className="co-flash-who">
                    <span className="co-flash-tag">Who can apply</span>
                    <div className={`co-flash-row ${model.eligible ? "yes" : "no"}`}>
                        <b>{model.eligible ? "Eligible" : "View only"}</b>
                        <span>{esc(model.scopeLabel)}</span>
                        <small>{esc(model.eligibilityWhy)}</small>
                    </div>
                    <div className="co-flash-row no">
                        <b>Scope</b>
                        <span>{esc(model.scopeDetail)}</span>
                    </div>
                    {model.prerequisites.trim() ? (
                        <div className="co-flash-row">
                            <b>Before you apply</b>
                            <span>{model.prerequisites}</span>
                        </div>
                    ) : null}
                </section>
            </div>
            <section className="co-flash-flow">
                <div className="co-flash-flow-head">
                    <b>What you will do</b>
                    <span>{steps.length === 1 ? "Your role" : `${steps.length} steps`}</span>
                </div>
                <div className="co-flash-steps">
                    {steps.map((step, i) => (
                        <div key={`${i}-${step.slice(0, 24)}`} className="co-flash-step">
                            <div className="co-flash-step-n">{i + 1}</div>
                            <p>{step}</p>
                        </div>
                    ))}
                </div>
            </section>
            <section className="co-flash-sdg">
                <div className="co-flash-sdg-head">
                    <b>SDG alignment</b>
                    <span>Primary{secondarySdg ? " + supporting" : ""}</span>
                </div>
                <div className="co-flash-sdg-row">
                    <div className="co-flash-sdg-card">
                        <span className="co-flash-sdg-badge" style={{ background: sdg?.color || "#0e7d74" }}>
                            {esc(sdgNum)}
                        </span>
                        <div>
                            <small>Primary SDG</small>
                            <b>
                                SDG {esc(sdgNum)}
                                {model.target ? ` · Target ${model.target}` : ""} · {esc(sdgName)}
                            </b>
                        </div>
                    </div>
                    {secondarySdg ? (
                        <div className="co-flash-sdg-card">
                            <span className="co-flash-sdg-badge" style={{ background: secondarySdg.color || "#15988b" }}>
                                {esc(secondarySdgNum)}
                            </span>
                            <div>
                                <small>Supporting SDG</small>
                                <b>
                                    SDG {esc(secondarySdgNum)}
                                    {model.secondaryTarget ? ` · Target ${model.secondaryTarget}` : ""} · {esc(secondarySdgName)}
                                </b>
                            </div>
                        </div>
                    ) : null}
                </div>
                {sdgWhy ? <p className="co-flash-sdg-why">{sdgWhy}</p> : null}
                {reachBits.length > 0 ? (
                    <div className="co-flash-metrics">
                        {reachBits.map((m) => (
                            <div key={m.l} className="co-flash-metric">
                                <strong>{m.k}</strong>
                                <span>{m.l}</span>
                            </div>
                        ))}
                    </div>
                ) : null}
            </section>
            <div className="co-flash-half">
                <section className="co-flash-skills">
                    <b>Skills & support</b>
                    <div className="co-flash-skill-row">
                        {(skillChips.length ? skillChips : ["Community engagement"]).map((skill) => (
                            <span key={skill}>{skill}</span>
                        ))}
                    </div>
                    {model.resources.trim() ? (
                        <p>
                            <strong>Support: </strong>
                            {model.resources}
                        </p>
                    ) : null}
                    {model.verification.trim() ? (
                        <p>
                            <strong>Verification: </strong>
                            {model.verification}
                        </p>
                    ) : null}
                </section>
                <section className="co-flash-account">
                    <b>Accountability</b>
                    <div className="co-flash-chain">
                        <div>
                            <small>Created by</small>
                            <b>{esc(model.creatorName)}</b>
                            <em>{esc(model.orgLabel)}</em>
                        </div>
                        <div>
                            <small>{model.privateCandidate ? "Verification" : "Faculty"}</small>
                            <b>{esc(model.facultyName)}</b>
                            <em>{esc(model.unitLabel || model.facultyEmail)}</em>
                        </div>
                        <div>
                            <small>Host</small>
                            <b>{esc(model.host)}</b>
                            <em>{model.host !== "No external partner" ? esc(model.partnerEmail) : "No partner on this card"}</em>
                        </div>
                        <div>
                            <small>CIEL PK</small>
                            <b>Final check</b>
                            <em>{esc(model.approvalText)}</em>
                        </div>
                    </div>
                </section>
            </div>
            <section className={`co-flash-cta ${closed || !model.eligible ? "muted" : ""}`}>
                <div>
                    <h3>{ctaTitle}</h3>
                    <p>{esc(ctaBody)}</p>
                </div>
                <div className="co-flash-btns">
                    {canApply ? (
                        <span className="co-flash-btn apply">Apply now</span>
                    ) : (
                        <span className="co-flash-btn disabled">{closed ? "Applications closed" : "View only"}</span>
                    )}
                    <button type="button" className="co-flash-btn ghost" onClick={() => void share()}>
                        Share
                    </button>
                </div>
            </section>
            {note ? <p className="co-flash-note">{note}</p> : null}
            <footer className="co-flash-foot">
                <span>CIEL PK</span>
                <span>{esc(model.approvalText)}. Phone numbers stay off this card.</span>
            </footer>
        </article>
    );
}
