"use client";

import { findSdgById } from "@/utils/sdgData";

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

function deadlineLabel(deadline: string): string {
    const d = deadline.trim();
    if (!d) return "DEADLINE TBC";
    const days = Math.ceil((new Date(`${d}T23:59:59`).getTime() - Date.now()) / 86400000);
    if (days < 0) return "APPLICATIONS CLOSED";
    if (days === 0) return "CLOSES TODAY";
    if (days <= 10) return `${days} DAYS LEFT`;
    return "APPLICATIONS OPEN";
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
    const sdg = findSdgById(model.sdg);
    const sdgName = sdg?.title || "SDG";
    const sdgNum = sdg?.number != null ? String(sdg.number) : model.sdg || "—";

    return (
        <article className="co-flash">
            <section className="co-flash-hero">
                <div className="co-flash-top">
                    <div className="co-flash-kicker">CIEL PK · Community Service Opportunity</div>
                    <div className="co-flash-creator">{esc(model.badgeLabel)} · PUBLIC CARD PREVIEW</div>
                </div>
                <div className="co-flash-title">{esc(model.title || "Untitled Community Service Opportunity")}</div>
                <p className="co-flash-hook">
                    {esc(model.hook || "A practical opportunity to contribute, learn and build verified community impact.")}
                </p>
                <div className="co-flash-meta">
                    <span>🌱 {esc(model.activityType || "Community Service")}</span>
                    <span>📍 {esc(model.city || model.mode)}</span>
                    <span>🌍 SDG {esc(sdgNum)} · {esc(sdgName)}</span>
                    <span>🏛️ {esc(model.orgLabel)}</span>
                </div>
            </section>
            <div className="co-flash-status">
                <div>
                    <b>{esc(model.approvalText)}</b>
                    <small>After approvals, this same card appears in Browse Opportunities. Visibility and Apply Now follow Step 7.</small>
                </div>
                <span className="co-flash-deadline">{deadlineLabel(model.deadline)}</span>
            </div>
            <div className="co-flash-facts">
                <div className="co-flash-fact"><div className="ico">⏱️</div><small>Commitment</small><b>{esc(model.hours)} hours / student</b></div>
                <div className="co-flash-fact"><div className="ico">👥</div><small>Seats</small><b>{esc(model.seats)} available</b></div>
                <div className="co-flash-fact"><div className="ico">🎯</div><small>Who Can Apply</small><b>{esc(model.scopeLabel)}</b></div>
                <div className="co-flash-fact"><div className="ico">📅</div><small>Dates</small><b>{esc(model.start)} → {esc(model.end)}</b></div>
                <div className="co-flash-fact"><div className="ico">🤝</div><small>Host / Partner</small><b>{esc(model.host)}</b></div>
            </div>
            <div className="co-flash-story">
                <section className="co-flash-why">
                    <span className="co-flash-tag">Why this matters</span>
                    <h3>Make your service hours mean something.</h3>
                    <p>{esc(model.summary)}</p>
                </section>
                <section className="co-flash-impact">
                    <span className="co-flash-tag">Expected reach</span>
                    <strong>{esc(model.beneficiariesCount)}</strong>
                    <h3>{esc(model.beneficiaryType)}</h3>
                    <p>Creator-provided reach; subject to verification.</p>
                </section>
            </div>
            <div className="co-flash-content">
                <div className="co-flash-grid">
                    <section className="co-flash-panel blue">
                        <div className="co-flash-ph"><span>🛠️</span><b>What you’ll do</b></div>
                        <ul className="co-flash-list">
                            <li>{esc(model.responsibilities)}</li>
                            <li>{esc(model.scheduleNotes || "Schedule confirmed with selected students")}</li>
                        </ul>
                    </section>
                    <section className="co-flash-panel green">
                        <div className="co-flash-ph"><span>🌱</span><b>What you may build</b></div>
                        <ul className="co-flash-list">
                            <li>{esc(model.skills || "Practical community-engagement skills")}</li>
                            <li>{esc(model.resources || "Orientation / support as described")}</li>
                        </ul>
                    </section>
                    <section className="co-flash-panel gold">
                        <div className="co-flash-ph"><span>🌍</span><b>Impact & SDG</b></div>
                        <ul className="co-flash-list">
                            <li>SDG {esc(sdgNum)} · {esc(sdgName)}</li>
                            <li>{esc(model.objective)}</li>
                            <li>{esc(model.outputs)}</li>
                        </ul>
                    </section>
                    <section className="co-flash-panel purple">
                        <div className="co-flash-ph"><span>✅</span><b>Before you apply</b></div>
                        <ul className="co-flash-list">
                            <li>{esc(model.prerequisites || "No additional prerequisites stated")}</li>
                            <li>{esc(model.scopeDetail)}</li>
                        </ul>
                    </section>
                </div>
                <section className="co-flash-trust">
                    <div className="co-flash-trusthead">
                        <b>Trust & verification</b>
                        <span>Private operational data stays protected</span>
                    </div>
                    <div className="co-flash-trustgrid">
                        <div className="co-flash-trustitem">
                            <small>Created By</small>
                            <b>{esc(model.creatorName)}</b>
                            <em>{esc(model.orgLabel)}</em>
                        </div>
                        <div className="co-flash-trustitem">
                            <small>{model.privateCandidate ? "Verification Owner" : "Faculty / Academic"}</small>
                            <b>{esc(model.facultyName)}</b>
                            <em>{esc(model.facultyEmail)}</em>
                        </div>
                        <div className="co-flash-trustitem">
                            <small>Host / Partner</small>
                            <b>{esc(model.host)}</b>
                            <em>{model.host !== "No external partner" ? esc(model.partnerEmail) : "No additional operational email shown"}</em>
                        </div>
                        <div className="co-flash-trustitem">
                            <small>CIEL PK</small>
                            <b>{esc(model.approvalText)}</b>
                            <em>Workflow + verification record</em>
                        </div>
                    </div>
                </section>
                <div className="co-flash-cta">
                    <div>
                        <h3>{model.eligible ? "Ready to contribute?" : "You can explore this opportunity."}</h3>
                        <p>{esc(model.eligibilityWhy)}</p>
                    </div>
                    <div className="co-flash-btns">
                        {model.eligible ? (
                            <span className="co-flash-btn apply">APPLY NOW →</span>
                        ) : (
                            <span className="co-flash-btn disabled">VIEW ONLY · NOT ELIGIBLE</span>
                        )}
                    </div>
                </div>
                <div className={`co-flash-elig${model.eligible ? "" : " no"}`}>
                    <b>{model.eligible ? "✓ Eligible to apply" : "ⓘ View-only access"}</b> · {esc(model.eligibilityWhy)}
                </div>
                <div className="co-flash-privacy">
                    🔒 Privacy protected: creator, faculty and partner phone / WhatsApp numbers are never shown on the public opportunity flashcard.
                </div>
            </div>
        </article>
    );
}
