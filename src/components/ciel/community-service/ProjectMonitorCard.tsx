"use client";

import Link from "next/link";
import type { FacultyCsReportRow } from "@/app/dashboard/faculty/community-service/useFacultyCommunityServiceData";
import { mailtoHref, whatsappShareHref } from "@/utils/reminderLinks";
import { isFacultyCommunityLiveCard, normalizeReviewStatus } from "@/utils/reviewQueue";
import { formatDisplayId } from "@/utils/displayIds";
import { displayOrganizationName } from "@/utils/displayOrganizationName";

function personInitials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .slice(0, 3)
        .toUpperCase() || "?";
}

/** Reviewer's own Email / WhatsApp nudge (opens their mail app / WhatsApp with the text ready). */
export function RemindButtons({ email, title, roleLabel }: { email?: string | null; title: string; roleLabel: string }) {
    const to = email && email.includes("@") ? email : "";
    const subject = `Community Service reminder — ${title}`;
    const body = `A reminder from ${roleLabel} about “${title}”. Please continue the pending Community Service step in your signed-in CIEL PK dashboard.`;
    return (
        <>
            <a href={mailtoHref(to, subject, body)} className="rounded-[10px] bg-[#edf4fb] px-3 py-2 text-[12px] font-black text-[#376d9f]">
                ✉ Remind
            </a>
            <a href={whatsappShareHref(body)} className="rounded-[10px] bg-[#e8f8ee] px-3 py-2 text-[12px] font-black text-[#1f7a46]">
                WhatsApp
            </a>
        </>
    );
}

/** Link to a submitted report (none while it is still a draft the reviewer may not open). */
export function projectReportHref(
    row: { id: string; report_id?: string | null; status?: string; draft_locked?: boolean },
    reportsBase: string,
): string | undefined {
    if (row.draft_locked) return undefined;
    const rid = String(row.report_id || "").trim() || (row.id.startsWith("track:") ? "" : row.id);
    if (!rid) return undefined;
    const status = normalizeReviewStatus(row.status);
    if (status === "assigned" || status === "draft" || status === "continue" || !status) return undefined;
    return `${reportsBase}/${rid}`;
}

function MemberHoursClock({
    name,
    hours,
    required,
}: {
    name: string;
    hours: number;
    required: number;
}) {
    const met = hours + 1e-9 >= required;
    const extra = Math.max(0, Math.round((hours - required) * 10) / 10);
    const remaining = Math.max(0, Math.round((required - hours) * 10) / 10);
    const pct = required > 0 ? Math.min(100, Math.round((hours / required) * 100)) : 0;
    const col = extra > 0 ? "#d5aa46" : met ? "#15988b" : "#e6a23c";
    return (
        <div
            className={`mt-3 grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3 rounded-2xl border p-3 ${
                extra > 0 ? "border-[#e9d59a] bg-[#fffcf2]" : met ? "border-[#bfe3d6] bg-[#f6fcf9]" : "border-[#e8edef] bg-white"
            }`}
        >
            <div
                className="relative h-[72px] w-[72px] shrink-0 rounded-full"
                style={{ background: `conic-gradient(${col} ${pct}%, #e8eef1 0)` }}
                aria-hidden
            >
                <div className="absolute inset-[9px] grid place-items-center rounded-full bg-white text-center">
                    <span className="text-[13px] font-black tabular-nums leading-none text-slate-900">{hours}h</span>
                    <span className="mt-0.5 text-[9px] font-semibold text-slate-500">of {required}h</span>
                </div>
            </div>
            <div className="min-w-0">
                <p className="truncate text-[13px] font-bold text-slate-900">
                    {name} {extra > 0 ? "⭐" : met ? "🟢" : "🟠"}
                </p>
                <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                    {extra > 0
                        ? `Additional verified contribution: +${extra}h`
                        : met
                          ? "Minimum met"
                          : `In progress · ${remaining}h remaining`}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{pct}% complete</span>
                    {met ? <span className="rounded-full bg-[#e7f6f1] px-2 py-0.5 text-[10px] font-bold text-[#1d765d]">Minimum ✓</span> : null}
                    {extra > 0 ? <span className="rounded-full bg-[#f3eefc] px-2 py-0.5 text-[10px] font-bold text-[#6b2bd9]">Beyond minimum</span> : null}
                </div>
            </div>
        </div>
    );
}

export type ProjectMonitorRemind = {
    /** "your faculty supervisor" / "your linked organization" / "your university" / "CIEL PK". */
    roleLabel: string;
    /** Server-side "Remind now" (standard "Complete your report ASAP" email + in-app notice). */
    onRemindNow?: (row: FacultyCsReportRow) => void | Promise<void>;
    busy?: boolean;
};

function shortDate(iso?: string | null): string | null {
    if (!iso) return null;
    const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** The deadline line of the communication bar. */
export function describeDeadline(row: FacultyCsReportRow): { text: string; tone: "warn" | "ok" | "muted" } | null {
    const close = shortDate(row.reporting_close_date);
    const end = shortDate(row.project_end_date);
    const left = row.days_left_to_report;
    switch (row.deadline_phase) {
        case "reporting_window":
            return {
                text:
                    left != null
                        ? `Project ended · ${left} day${left === 1 ? "" : "s"} left to submit the report${close ? ` (closes ${close})` : ""}`
                        : `Project ended${close ? ` · report closes ${close}` : ""}`,
                tone: left != null && left <= 14 ? "warn" : "ok",
            };
        case "in_progress":
            return { text: `Project running${end ? ` · ends ${end}` : ""}${close ? ` · report closes ${close}` : ""}`, tone: "muted" };
        case "before_start":
            return { text: `Project not started yet${end ? ` · ends ${end}` : ""}`, tone: "muted" };
        case "closed":
            return { text: `Reporting window closed${close ? ` on ${close}` : ""}`, tone: "warn" };
        default:
            return null;
    }
}

/**
 * One project / student (or team) on a Community Service Projects list: live hours per member,
 * report progress, deadline and reminder state. Shared by the faculty, partner / NGO, university
 * and CIEL PK admin hubs; the hrefs and the remind role differ per dashboard.
 */
export default function ProjectMonitorCard({
    row,
    reportHrefFor,
    hoursHrefFor,
    onViewFlashcard,
    remind,
}: {
    row: FacultyCsReportRow;
    /** Where "Open report" goes for a submitted report; undefined keeps it hidden. */
    reportHrefFor?: (row: FacultyCsReportRow) => string | undefined;
    /** Where "View live hours" goes for a project id; undefined hides the button. */
    hoursHrefFor?: (projectId: string) => string;
    /** Opens the approved opportunity's flashcard (read-only review); undefined hides the button. */
    onViewFlashcard?: (projectId: string) => void;
    remind?: ProjectMonitorRemind;
}) {
    const required = row.required_hours || 16;
    const hours = row.hours || 0;
    const hoursPct =
        typeof row.hours_progress_pct === "number"
            ? Math.max(0, Math.min(100, Math.round(row.hours_progress_pct)))
            : required > 0
              ? Math.max(0, Math.min(100, Math.round((hours / required) * 100)))
              : 0;
    const reportHref = reportHrefFor ? reportHrefFor(row) : undefined;
    const last = row.last_activity_at || row.updated_at;
    const lastLabel = last
        ? new Date(last).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
        : null;
    const org = displayOrganizationName(row.organization_name);
    const live = isFacultyCommunityLiveCard(row);
    const members =
        row.member_hours && row.member_hours.length
            ? row.member_hours
            : [{ name: row.student_name || "Student", hours, required }];
    const fillingReport = row.draft_locked === true && typeof row.sections_complete === "number";
    const team = row.team_members && row.team_members.length > 1 ? row.team_members : null;
    const remindTo = team
        ? team
              .map((m) => m.email)
              .filter((e): e is string => Boolean(e && e.includes("@")))
              .join(",")
        : row.student_email;
    const status = live
        ? { title: "Verified", text: "Impact package is live for connected stakeholders.", nextTitle: "No action required from you", nextText: "Hours and the verified package stay available here.", nextCls: "" }
        : reportHref
          ? { title: "Submitted", text: "The student submitted the Community Service report.", nextTitle: "Open the submitted report", nextText: "Review the locked package when you are ready.", nextCls: "next" }
          : fillingReport
            ? {
                  title: "Report in progress",
                  text: `${Math.round(row.progress_pct || 0)}% filled · ${row.sections_complete ?? 0} of ${row.sections_total ?? 10} sections`,
                  nextTitle: "Opens after the student submits",
                  nextText: "Live hours stay visible. The report stays locked until submit.",
                  nextCls: "warn",
              }
            : {
                  title: hoursPct >= 100 ? "Hours complete" : "Hours in progress",
                  text: hoursPct >= 100 ? "Minimum hours met." : "Live hours from assigned students.",
                  nextTitle:
                      hoursPct >= 100
                          ? team ? "Students can submit the report" : "Student can submit the report"
                          : team ? "Students continue logging hours" : "Student continues logging hours",
                  nextText: "Reminders are system-generated and logged.",
                  nextCls: hoursPct >= 100 ? "next" : "warn",
              };
    const idLabel = formatDisplayId(row.project_id || row.id, "CS");
    const deadline = describeDeadline(row);
    return (
        <div className="rounded-[18px] border border-[#e2eaed] bg-white p-4 shadow-sm transition hover:border-[#bcd4d8] hover:shadow-md md:grid md:grid-cols-[minmax(0,1fr)_260px] md:gap-4">
            <div className="min-w-0">
                <h4 className="text-[15.5px] font-semibold leading-snug text-slate-900">{row.project_title || "Project"}</h4>
                <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] text-slate-500">
                    <span className="inline-block rounded-lg bg-[#eef3f5] px-1.5 py-0.5 font-mono text-[11px] font-bold text-[#3f5661]">{idLabel}</span>
                    <span aria-hidden className="text-[#b9c4ca]">•</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-600">
                        {live ? "Verified" : reportHref ? "Submitted" : "Active"}
                    </span>
                    {lastLabel ? (
                        <>
                            <span aria-hidden className="text-[#b9c4ca]">•</span>
                            <span>Last activity {lastLabel}</span>
                        </>
                    ) : null}
                    {org ? (
                        <>
                            <span aria-hidden className="text-[#b9c4ca]">•</span>
                            <span className="min-w-0 break-words">{org}</span>
                        </>
                    ) : null}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                    {team ? (
                        <span className="inline-flex items-center rounded-full bg-[#e8f1ff] px-2.5 py-1 text-[11px] font-black text-[#2f5ea8]">
                            {row.participation_type === "team" ? `Team · ${team.length} members` : `${team.length} students`}
                        </span>
                    ) : null}
                    {(team ?? [{ name: row.student_name || "Student" }]).map((person, index) => (
                        <span
                            key={`${person.name}-${index}`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[#e2eaed] bg-[#fbfcfd] py-1 pl-1 pr-2.5 text-[11.5px] text-slate-800"
                        >
                            <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-[#dff1ed] text-[10px] font-black text-[#145a4f]">
                                {personInitials(person.name || "Student")}
                            </span>
                            {person.name || "Student"}
                            <small className="text-[10px] text-slate-500">{"lead" in person && person.lead ? "Team lead" : "Student"}</small>
                        </span>
                    ))}
                    {org ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e2eaed] bg-[#fbfcfd] py-1 pl-1 pr-2.5 text-[11.5px] text-slate-800">
                            <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-[#e6e0f7] text-[10px] font-black text-[#5a2bb5]">
                                {personInitials(org)}
                            </span>
                            {org}
                            <small className="text-[10px] text-slate-500">Organization</small>
                        </span>
                    ) : null}
                </div>
                {members.map((member, index) => (
                    <MemberHoursClock
                        key={`${member.name}-${index}`}
                        name={member.name}
                        hours={member.hours}
                        required={member.required || required}
                    />
                ))}
            </div>
            <div className="mt-4 grid content-start gap-2.5 border-t border-[#e8edef] pt-4 md:mt-0 md:border-l md:border-t-0 md:pl-4 md:pt-0">
                <div className="rounded-xl border border-[#e2eaed] bg-[#f8fafb] p-3">
                    <div className="text-[9.5px] font-black uppercase tracking-[0.08em] text-[#7b8a91]">Status</div>
                    <b className="mt-1 block text-[13px] text-slate-900">{status.title}</b>
                    <small className="mt-1 block text-[11.5px] leading-snug text-slate-500">{status.text}</small>
                </div>
                <div
                    className={`rounded-xl border p-3 ${
                        status.nextCls === "warn"
                            ? "border-[#f0d9a8] bg-[#fffaf0]"
                            : "border-[#bfe3d6] bg-[#f3fbf7]"
                    }`}
                >
                    <div className={`text-[9.5px] font-black uppercase tracking-[0.08em] ${status.nextCls === "warn" ? "text-[#9a6410]" : "text-[#1d765d]"}`}>
                        Next action
                    </div>
                    <b className="mt-1 block text-[13px] text-slate-900">{status.nextTitle}</b>
                    <small className="mt-1 block text-[11.5px] leading-snug text-slate-500">{status.nextText}</small>
                </div>
                {!live && (deadline || !reportHref) ? (
                    <div
                        data-testid="communication-bar"
                        className={`rounded-xl border p-3 ${
                            deadline?.tone === "warn" ? "border-[#f3c9a6] bg-[#fff6ee]" : "border-[#e2eaed] bg-[#f8fafb]"
                        }`}
                    >
                        <div className={`text-[9.5px] font-black uppercase tracking-[0.08em] ${deadline?.tone === "warn" ? "text-[#b4530a]" : "text-[#7b8a91]"}`}>
                            Communication
                        </div>
                        {deadline ? <b className="mt-1 block text-[12.5px] leading-snug text-slate-900">{deadline.text}</b> : null}
                        {!reportHref ? (
                            <small className="mt-1 block text-[11.5px] leading-snug text-slate-500">
                                {row.last_reminder_at
                                    ? `“Complete your report ASAP” sent ${shortDate(row.last_reminder_at)}${
                                          row.last_reminder_channel === "manual" ? " (Remind now)" : " (automatic)"
                                      }${row.reminders_sent && row.reminders_sent > 1 ? ` · ${row.reminders_sent} reminders so far` : ""}`
                                    : "No “Complete your report ASAP” reminder sent yet. Automatic reminders go every 3 days once the project end date has passed."}
                            </small>
                        ) : null}
                    </div>
                ) : null}
                <div className="flex flex-wrap gap-1.5">
                    {live || reportHref ? null : (
                        <>
                            {remind?.onRemindNow ? (
                                <button
                                    type="button"
                                    disabled={remind.busy || !row.project_id}
                                    onClick={() => void remind.onRemindNow?.(row)}
                                    title="CIEL PK emails the student the standard “Complete your report ASAP” message (once per student per day)"
                                    className="rounded-[10px] bg-[#c76000] px-3 py-2 text-[12px] font-black text-white hover:bg-[#a85000] disabled:opacity-60"
                                >
                                    {remind.busy ? "Sending…" : "Remind now"}
                                </button>
                            ) : null}
                            {remind ? <RemindButtons email={remindTo} title={row.project_title} roleLabel={remind.roleLabel} /> : null}
                        </>
                    )}
                    {reportHref ? (
                        <Link href={reportHref} className="rounded-[10px] bg-[#0e7d74] px-3 py-2 text-[12px] font-black text-white">
                            Open report
                        </Link>
                    ) : null}
                    {row.project_id && hoursHrefFor ? (
                        <Link
                            href={hoursHrefFor(row.project_id)}
                            className="rounded-[10px] bg-[#edf4fb] px-3 py-2 text-[12px] font-black text-[#0e7d74]"
                        >
                            View live hours
                        </Link>
                    ) : null}
                    {row.project_id && onViewFlashcard ? (
                        <button
                            type="button"
                            onClick={() => onViewFlashcard(row.project_id as string)}
                            className="rounded-[10px] bg-[#f1eef8] px-3 py-2 text-[12px] font-black text-[#6b2bd9] hover:brightness-95"
                            title="Open the approved opportunity flashcard"
                        >
                            View flashcard
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

