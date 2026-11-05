"use client";
import React, { useEffect } from "react";
import clsx from "clsx";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import {
    FOLLOWUP_CHECKS,
    FOLLOWUP_DECISION_OWNERS,
    FOLLOWUP_DEFAULT_INTERVAL,
    FOLLOWUP_INTERVALS,
    FOLLOWUP_NO_REASONS,
    FOLLOWUP_OTHER,
    FOLLOWUP_OWNER_ROLES,
    FOLLOWUP_PLAN_OPTIONS,
    FOLLOWUP_TEXT_LIMITS,
    computeFollowupDueDate,
    followupPlanOf,
    normalizeIsoDate,
    projectEndDateOf,
} from "../utils/sustainabilityFollowup";

const fieldLabel = "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500";

function formatDate(iso: string): string {
    const clean = normalizeIsoDate(iso);
    if (!clean) return "";
    const [y, m, d] = clean.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/**
 * 9.5 Follow-up check — optional, conditional. Records who (if anyone) will check later whether the
 * benefits continued. It never sends an email; see utils/sustainabilityFollowup.ts.
 */
export default function SustainabilityFollowUp({ projectData }: { projectData?: unknown }) {
    const { data, updateSection, getFieldError, isReportSectionsReadOnly } = useReportForm();
    const isReadOnly = isReportSectionsReadOnly;
    const s10 = data.section10;
    const plan = followupPlanOf(s10);

    const patch = (fields: Record<string, unknown>) => updateSection("section10", fields);

    const projectEnd = projectEndDateOf(projectData);
    const interval = s10.followup_interval || FOLLOWUP_DEFAULT_INTERVAL;
    const computedDue = plan === "yes" ? computeFollowupDueDate(s10, projectEnd) : "";

    // Keep the stored due date in step with the end date + interval (never on a locked/submitted report).
    useEffect(() => {
        if (isReadOnly || plan !== "yes") return;
        if ((s10.followup_due_date || "") !== computedDue) {
            updateSection("section10", { followup_due_date: computedDue });
        }
    }, [isReadOnly, plan, computedDue, s10.followup_due_date, updateSection]);

    const choosePlan = (next: string) => {
        if (isReadOnly) return;
        const fields: Record<string, unknown> = { followup_plan: next };
        if (next === "yes") {
            if (!s10.followup_interval) fields.followup_interval = FOLLOWUP_DEFAULT_INTERVAL;
            if (!s10.followup_check) fields.followup_check = FOLLOWUP_CHECKS[0];
        }
        if (next === "later" && !s10.followup_decision_owner) fields.followup_decision_owner = "faculty";
        patch(fields);
    };

    const inputClass = "cer-input";
    const errClass = (field: string) => (getFieldError(field) ? "border-red-400 bg-red-50/30" : "");

    return (
        <section className="cer-card space-y-4" id="section10-followup">
            <div className="cer-secl">
                <span className="cer-secn">9.5</span>
                <h3>Follow-up check</h3>
                <span className="cer-tag">Optional</span>
            </div>
            <p className="cer-sub">
                Activities, beneficiaries and results stay in Section 5 — this only records whether someone will check later that the
                benefits continued. One-time community activities are fully valid.
            </p>

            <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-900">Is a follow-up check planned or needed?</p>
                <p className="text-xs text-slate-500">
                    A follow-up is optional. Choose No for completed, one-time work that does not need later verification.
                </p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Follow-up check">
                    {FOLLOWUP_PLAN_OPTIONS.map((opt) => (
                        <button
                            key={opt.id}
                            type="button"
                            role="radio"
                            aria-checked={plan === opt.id}
                            disabled={isReadOnly}
                            onClick={() => choosePlan(opt.id)}
                            className={clsx("cer-chip", plan === opt.id && "on")}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {plan === "no" ? (
                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <label className={fieldLabel} htmlFor="followup-no-reason">Why is no follow-up planned?</label>
                        <select
                            id="followup-no-reason"
                            className={clsx(inputClass, errClass("followup_no_reason"))}
                            disabled={isReadOnly}
                            value={s10.followup_no_reason || ""}
                            onChange={(e) => patch({ followup_no_reason: e.target.value })}
                        >
                            <option value="">Select a reason</option>
                            {FOLLOWUP_NO_REASONS.map((reason) => (
                                <option key={reason} value={reason}>{reason}</option>
                            ))}
                        </select>
                        <FieldError message={getFieldError("followup_no_reason")} />
                    </div>
                    {s10.followup_no_reason === FOLLOWUP_OTHER ? (
                        <div className="space-y-1.5">
                            <label className={fieldLabel} htmlFor="followup-no-reason-other">Brief reason</label>
                            <input
                                id="followup-no-reason-other"
                                className={clsx(inputClass, errClass("followup_no_reason_other"))}
                                placeholder="Add a short explanation"
                                disabled={isReadOnly}
                                maxLength={FOLLOWUP_TEXT_LIMITS.reason}
                                value={s10.followup_no_reason_other || ""}
                                onChange={(e) => patch({ followup_no_reason_other: e.target.value })}
                            />
                            <FieldError message={getFieldError("followup_no_reason_other")} />
                        </div>
                    ) : null}
                    <div className="rounded-xl border border-[#cbe7e3] bg-[#f5fbfa] px-4 py-3 text-xs leading-relaxed text-slate-700">
                        This report can still be submitted and evaluated normally. Its follow-up status is recorded as{" "}
                        <b>Not planned</b>, not as an unsuccessful outcome.
                    </div>
                </div>
            ) : null}

            {plan === "later" ? (
                <div className="space-y-3">
                    <div className="rounded-xl border border-[#cbe7e3] bg-[#f5fbfa] px-4 py-3 text-xs leading-relaxed text-slate-700">
                        Nobody is contacted now. After your report is approved, a decision task can be created for the person below.
                    </div>
                    <div className="space-y-1.5">
                        <label className={fieldLabel} htmlFor="followup-decision-owner">Who should decide whether follow-up is needed?</label>
                        <select
                            id="followup-decision-owner"
                            className={inputClass}
                            disabled={isReadOnly}
                            value={s10.followup_decision_owner || "faculty"}
                            onChange={(e) => patch({ followup_decision_owner: e.target.value })}
                        >
                            {FOLLOWUP_DECISION_OWNERS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            ) : null}

            {plan === "yes" ? (
                <div className="space-y-4 border-t border-slate-100 pt-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label className={fieldLabel} htmlFor="followup-owner-role">Who will check the results?</label>
                            <select
                                id="followup-owner-role"
                                className={clsx(inputClass, errClass("followup_owner_role"))}
                                disabled={isReadOnly}
                                value={s10.followup_owner_role || ""}
                                onChange={(e) => patch({ followup_owner_role: e.target.value })}
                            >
                                <option value="">Choose responsible role</option>
                                {FOLLOWUP_OWNER_ROLES.map((role) => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                            <FieldError message={getFieldError("followup_owner_role")} />
                        </div>
                        <div className="space-y-1.5">
                            <label className={fieldLabel} htmlFor="followup-owner-name">Responsible person&apos;s name</label>
                            <input
                                id="followup-owner-name"
                                className={clsx(inputClass, errClass("followup_owner_name"))}
                                placeholder="Full name"
                                disabled={isReadOnly}
                                maxLength={FOLLOWUP_TEXT_LIMITS.name}
                                value={s10.followup_owner_name || ""}
                                onChange={(e) => patch({ followup_owner_name: e.target.value })}
                            />
                            <FieldError message={getFieldError("followup_owner_name")} />
                        </div>
                        <div className="space-y-1.5">
                            <label className={fieldLabel} htmlFor="followup-owner-email">Email for follow-up invitation</label>
                            <input
                                id="followup-owner-email"
                                type="email"
                                className={clsx(inputClass, errClass("followup_owner_email"))}
                                placeholder="name@example.org"
                                disabled={isReadOnly}
                                maxLength={FOLLOWUP_TEXT_LIMITS.email}
                                value={s10.followup_owner_email || ""}
                                onChange={(e) => patch({ followup_owner_email: e.target.value })}
                            />
                            <FieldError message={getFieldError("followup_owner_email")} />
                        </div>
                        <div className="space-y-1.5">
                            <span className={fieldLabel}>Project end date · from the opportunity</span>
                            <div className="cer-input flex items-center bg-slate-50 text-slate-600">
                                {projectEnd ? formatDate(projectEnd) : "Not available"}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className={fieldLabel} htmlFor="followup-interval">When should results be checked?</label>
                            <select
                                id="followup-interval"
                                className={inputClass}
                                disabled={isReadOnly}
                                value={interval}
                                onChange={(e) => patch({ followup_interval: e.target.value })}
                            >
                                {FOLLOWUP_INTERVALS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                        {interval === "custom" ? (
                            <div className="space-y-1.5">
                                <label className={fieldLabel} htmlFor="followup-custom-date">Choose follow-up date</label>
                                <input
                                    id="followup-custom-date"
                                    type="date"
                                    className={clsx(inputClass, errClass("followup_due_date"))}
                                    disabled={isReadOnly}
                                    value={normalizeIsoDate(s10.followup_custom_date)}
                                    onChange={(e) => patch({ followup_custom_date: e.target.value })}
                                />
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <span className={fieldLabel}>Follow-up due date · calculated</span>
                                <div className={clsx("cer-input flex items-center bg-slate-50 text-slate-600", errClass("followup_due_date"))}>
                                    {computedDue ? formatDate(computedDue) : "Needs a project end date — choose a date instead"}
                                </div>
                            </div>
                        )}
                    </div>
                    <FieldError message={getFieldError("followup_due_date")} />

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label className={fieldLabel} htmlFor="followup-check">What should be checked?</label>
                            <select
                                id="followup-check"
                                className={inputClass}
                                disabled={isReadOnly}
                                value={s10.followup_check || FOLLOWUP_CHECKS[0]}
                                onChange={(e) => patch({ followup_check: e.target.value })}
                            >
                                {FOLLOWUP_CHECKS.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className={fieldLabel} htmlFor="followup-check-notes">Specific instruction (optional)</label>
                            <input
                                id="followup-check-notes"
                                className={inputClass}
                                placeholder="e.g. Count how many planted trees are still healthy"
                                disabled={isReadOnly}
                                maxLength={FOLLOWUP_TEXT_LIMITS.notes}
                                value={s10.followup_check_notes || ""}
                                onChange={(e) => patch({ followup_check_notes: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="rounded-xl border-l-4 border-[#bb7a19] bg-[#fffaf0] px-4 py-3 text-xs leading-relaxed text-[#775620]">
                        Saving this does not send any email. The person you name is only approached after your report is approved, and
                        they can decline or opt out.
                    </div>
                </div>
            ) : null}
        </section>
    );
}
