"use client";

import React from "react";
import clsx from "clsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import {
    THANK_YOU_FLOW_STEPS, flowStepAt, fmtAmount, isCashResource, resourceName, shareText, thankYouCashTotals,
    thankYouEmailSubject, thankYouProjectLine,
    type ContributorGroup, type ReportStage, type ThankYouContext,
} from "../utils/resourceContributorsView";

/** The five-step strip: where the thank-you email is in its life (V21 flowStrip). */
export function ThankYouFlowStrip({ stage }: { stage: ReportStage }) {
    const at = flowStepAt(stage);
    return (
        <ol className="cer-rx-timeline" data-ciel-thankyou-flow>
            {THANK_YOU_FLOW_STEPS.map(([title, detail], i) => (
                <li key={title} className={clsx(i + 1 < at && "done", i + 1 === at && "now")}>
                    <b>{i + 1}. {title}</b>
                    <span>{detail}</span>
                </li>
            ))}
        </ol>
    );
}

/**
 * Preview of what a named contributor receives once CIEL PK Admin approves the report: the thank-you
 * email with the contribution summary, the certificate attached to it, and the record they see if
 * they register. Preview only — this page cannot send email or approve a report.
 */
export default function ContributorThankYouPreview({
    group, ctx, stage, onClose,
}: {
    group: ContributorGroup | null;
    ctx: ThankYouContext;
    stage: ReportStage;
    onClose: () => void;
}) {
    if (!group) return <Dialog open={false} onOpenChange={() => onClose()} />;
    const items = group.items.filter((q) => (q.share ?? 0) > 0);
    const cashTotals = thankYouCashTotals(group);
    const inKind = items.filter((q) => !isCashResource(q.row)).length;
    const where = [ctx.location, ctx.dates].filter(Boolean).join(" · ");
    const draftRef = `${ctx.projectCode} / ${group.key.replace(/^[a-z]+\|/, "").slice(0, 8) || "draft"}`;

    return (
        <Dialog open={!!group} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[92vh] max-w-3xl overflow-auto bg-white p-5 sm:p-6" data-ciel-thankyou-preview>
                <DialogHeader className="mb-2 w-full items-start text-left">
                    <DialogTitle className="text-base font-extrabold text-slate-800">What {group.name || group.display} receives · preview</DialogTitle>
                </DialogHeader>
                <div className="cer-scope space-y-3 text-left">
                    <div className="cer-rx-notice">
                        <b>Preview only — nothing has been sent.</b> CIEL PK’s server sends this email once CIEL PK Admin approves the report. This page cannot send email or approve a report.
                    </div>
                    <ThankYouFlowStrip stage={stage} />

                    <h3 className="cer-rx-sub">1 · Thank-you email with the contribution summary</h3>
                    <div className="cer-rx-mail">
                        <div className="cer-rx-mail-meta">
                            <div><span>From</span>CIEL PK · Community Impact Education Lab Pakistan</div>
                            <div><span>To</span>{group.name || group.display} &lt;{group.email || "email pending"}&gt;</div>
                            <div><span>Subject</span>{thankYouEmailSubject(ctx)}</div>
                            <div><span>Sent</span>Automatically, when CIEL PK Admin approves the report</div>
                        </div>
                        <div className="cer-rx-mail-body">
                            <div className="cer-rx-mail-brand">CIEL PK</div>
                            <h3>Thank you, {group.name || group.display}</h3>
                            <p>
                                Thank you{group.kind === "organization" && group.org ? <> — and thank you to <b>{group.org}</b> —</> : null} for supporting the student community project <b>{thankYouProjectLine(ctx)}</b>{where ? ` (${where})` : ""}.
                            </p>
                            <p>CIEL PK has reviewed and approved the project report. This is the summary of what you contributed:</p>
                            <table className="cer-rx-mail-table">
                                <thead><tr><th>Resource</th><th>Your contribution</th><th>What it made possible</th></tr></thead>
                                <tbody>
                                    {items.map((q) => (
                                        <tr key={q.index}>
                                            <td>{resourceName(q.row) || "Resource"}</td>
                                            <td><b>{shareText(q.row, q.share).split(" · ")[0]}</b></td>
                                            <td>{q.enabled || "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {cashTotals.length || inKind ? (
                                <p className="text-[12px]">
                                    {cashTotals.length ? <>Total cash contributed: <b>{cashTotals.map(([u, n]) => `${u} ${fmtAmount(n)}`).join(" + ")}</b></> : null}
                                    {cashTotals.length && inKind ? " · " : ""}
                                    {inKind ? <>In-kind contributions: <b>{inKind}</b></> : null}
                                </p>
                            ) : null}
                            <p className="cer-hint">Project reference: {ctx.projectCode}{ctx.teamNames?.length ? ` · Student team: ${ctx.teamNames.join(", ")}` : ""}</p>
                            <div className="cer-rx-mail-cta">
                                <b>See your contribution record — anytime</b>
                                <p>You can register on CIEL PK at any time using this email address (<b>{group.email || "email pending"}</b>). Your contribution to this project is already saved under it, and any future project you support will be added automatically. Registering is optional — this email is your acknowledgement either way.</p>
                                <span className="cer-rx-mail-btn">Register or sign in · cielpk.com</span>
                            </div>
                            <p className="cer-hint">If any detail above is not correct, please let CIEL PK know so that the record can be corrected.</p>
                            <p>With appreciation,<br /><b>CIEL PK</b> · Community Impact Education Lab Pakistan</p>
                        </div>
                    </div>

                    <h3 className="cer-rx-sub">2 · Certificate attached to the email</h3>
                    <div className="cer-rx-cert">
                        <div className="brand">CIEL PK</div>
                        <div className="cer-hint">COMMUNITY IMPACT EDUCATION LAB PAKISTAN</div>
                        <div className="draft">DRAFT PREVIEW · AWAITING ADMIN APPROVAL</div>
                        <h2>Certificate of Contribution</h2>
                        <p>Presented with appreciation to</p>
                        <h3>{group.display}</h3>
                        {group.kind === "organization" && group.name ? <p>Contact person: {group.name}</p> : group.org ? <p>{group.org}</p> : null}
                        <p>For supporting</p>
                        <p><b>{ctx.projectTitle}</b><br />Project reference: {ctx.projectCode}</p>
                        <ul>{items.map((q) => <li key={q.index}>{shareText(q.row, q.share)}</li>)}</ul>
                        <p>Thank you for helping turn community engagement into meaningful action.</p>
                        <footer>
                            Draft reference: {draftRef}<br />
                            The approved certificate will carry its server-issued number, issue date and verification link.<br />
                            This acknowledges a contribution; it does not certify student service hours.
                        </footer>
                    </div>

                    <h3 className="cer-rx-sub">3 · What they see if they register — at any time</h3>
                    <p className="cer-hint">
                        The record is held against the contributor’s email. Whenever they register and confirm that email, it is attached to their account; if they register before approval, it appears as soon as the report is approved.
                    </p>
                    <div className="cer-rx-portal">
                        <div className="cer-rx-portal-bar"><b>CIEL PK</b><span>My contributions</span><i>{group.display} · {group.email || "email pending"}</i></div>
                        <div className="cer-rx-portal-body">
                            <div className="cer-rx-portal-stats">
                                <div><b>1</b><small>project supported</small></div>
                                <div><b>{cashTotals.length ? cashTotals.map(([u, n]) => `${u} ${fmtAmount(n)}`).join(" + ") : "—"}</b><small>cash contributed</small></div>
                                <div><b>{inKind}</b><small>in-kind contribution{inKind === 1 ? "" : "s"}</small></div>
                            </div>
                            <div className="cer-rx-portal-card">
                                <span className="cer-pill">Approved by CIEL PK</span>
                                <h4>{ctx.projectTitle}</h4>
                                <p>{[ctx.projectCode, ctx.partnerName, ctx.location, ctx.dates].filter(Boolean).join(" · ")}</p>
                                <ul>{items.map((q) => <li key={q.index}>{shareText(q.row, q.share)}{q.enabled ? ` — ${q.enabled}` : ""}</li>)}</ul>
                                <p>📄 Certificate of Contribution · available to download</p>
                            </div>
                            <p className="cer-hint">Projects supported later with the same email or WhatsApp number are added to this page automatically.</p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
