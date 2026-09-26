"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDisplayId } from "@/utils/displayIds";
import { DIVIDEND_HOURLY_RATE_PKR } from "@/utils/communityAwardModel";
import { approvalActionClass } from "@/components/ciel/community-service/OpportunityApprovalCard";
import type { FacultyCsReportRow } from "@/app/dashboard/faculty/community-service/useFacultyCommunityServiceData";
import FacultyLockedV17Modal from "@/app/dashboard/faculty/reports/[reportId]/FacultyLockedV17Modal";

export type FacultyReportReviewMode = "pending" | "revision" | "decided";

const REPORT_BASE = "/dashboard/faculty/reports";

function ago(value?: string): string {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
    if (days < 1) return "just now";
    if (days === 1) return "1 day ago";
    if (days < 60) return `${days} days ago`;
    return date.toLocaleDateString();
}

function money(amount: number): string {
    if (!Number.isFinite(amount) || amount <= 0) return "PKR 0";
    return `PKR ${Math.round(amount).toLocaleString("en-PK")}`;
}

function analyserHasRun(row: FacultyCsReportRow): boolean {
    return Boolean(row.cii_analyser_run) || typeof row.cii_provisional === "number";
}

function stageClass(state: "done" | "cur" | ""): string {
    if (state === "done") return "border-[#bfe3d6] bg-[#f3fbf7] text-[#1d765d]";
    if (state === "cur") return "border-[#f0d9a8] bg-[#fffaf0] text-[#9a6410]";
    return "border-[#e8edef] bg-white text-[#6b7c86]";
}

function initials(name: string): string {
    const parts = name
        .split(/\s+/)
        .map((part) => part[0])
        .filter(Boolean);
    return (parts.join("") || "?").slice(0, 3).toUpperCase();
}

const AVATAR: Record<string, string> = {
    student: "bg-[#dff1ed] text-[#145a4f]",
    faculty: "bg-[#fbe8d0] text-[#8a4e00]",
    partner: "bg-[#e6e0f7] text-[#5a2bb5]",
    university: "bg-[#dde9f5] text-[#2f5b86]",
    ciel: "bg-[#0e4d4e] text-white",
};

export default function FacultyReportReviewCard({
    row,
    mode,
}: {
    row: FacultyCsReportRow;
    mode: FacultyReportReviewMode;
}) {
    const [lockedOpen, setLockedOpen] = useState(false);
    const has = analyserHasRun(row);
    const locked = Boolean(row.cii_locked);
    const hours = Number(row.hours || 0);
    const dividend = hours * DIVIDEND_HOURLY_RATE_PKR;
    const submitted = ago(row.report_submitted_at || row.submission_date);
    const lastActivity = ago(row.updated_at || row.report_submitted_at || row.submission_date);
    const reportHref = `${REPORT_BASE}/${row.id}`;
    const analyserHref = `${reportHref}?view=cii-v2`;
    const decideHref = `${reportHref}?intent=decide`;
    const idLabel = formatDisplayId(row.id, "RPT");
    const score = typeof row.cii_provisional === "number" ? Math.round(row.cii_provisional * 10) / 10 : null;
    const levelLabel = row.cii_level_name
        ? row.cii_numeric_level
            ? `L${row.cii_numeric_level} ${row.cii_level_name}`
            : row.cii_level_name
        : "";
    const evidenceCount = Number(row.evidence_count || 0);
    const required = Number(row.required_hours || 16);
    const participation =
        String(row.participation_type || "individual").toLowerCase() === "team" ? "Student · Team" : "Student · Individual";

    const rejected = String(row.faculty_status || row.status || "")
        .toLowerCase()
        .includes("reject");

    let statusTitle = "Pending Faculty Review";
    let statusText = [
        submitted ? `Submitted ${submitted}` : "Report v1",
        has
            ? `System CII ${score ?? "—"} (Provisional)${levelLabel ? ` · ${levelLabel}` : ""}`
            : "Analyzer not run",
    ]
        .filter(Boolean)
        .join(" · ");
    let statusTone: "warn" | "ok" | "bad" = "warn";
    let nextTitle = has ? "Review CII · Moderate · Approve / Revise / Reject" : "Open locked package · Run Analyzer";
    let nextText = has
        ? "Approval locks the Faculty-Verified CII and releases badge, certificate and QR"
        : "The student submission stays locked; analysis starts only when Faculty triggers the Analyzer.";
    let accent: "act" | "ok" | "rev" = "act";

    if (mode === "revision") {
        statusTitle = "Revision Required · with student";
        statusText = "Returned for correction. The locked package stays visible until the student resubmits.";
        statusTone = "bad";
        nextTitle = "Waiting for resubmission";
        nextText = "Report returns as a new locked version; Faculty reruns the Analyzer.";
        accent = "rev";
    } else if (mode === "decided") {
        statusTitle = rejected ? "Rejected — Closed" : locked ? `Verified · CII ${score ?? "—"}` : "Approved";
        statusText = locked && score != null ? `Verified CII ${score}/100${levelLabel ? ` · ${levelLabel}` : ""}` : "Decision recorded for academic history.";
        statusTone = rejected ? "bad" : "ok";
        nextTitle = "—";
        nextText = rejected ? "Rejected work never appears as verified impact." : "Open the locked package or verified CII record.";
        accent = rejected ? "rev" : "ok";
    }

    const analyserStep: "done" | "cur" | "" = has ? "done" : mode === "pending" ? "cur" : "";
    const facultyStep: "done" | "cur" | "" = mode === "decided" ? "done" : has && mode === "pending" ? "cur" : "";

    const stages: { label: string; sub: string; state: "done" | "cur" | "" }[] = [
        { label: "Flashcard", sub: "Locked V17 template", state: "done" },
        { label: "Detailed Report", sub: "Full section + sub-section record", state: "done" },
        { label: "Evidence", sub: `${evidenceCount} items · full access`, state: "done" },
        { label: "Full PDF", sub: `${idLabel}-R01.pdf`, state: "done" },
        {
            label: "AI Analyzer",
            sub: has ? "Run complete · System CII ready" : "Faculty action required · not yet run",
            state: analyserStep,
        },
        {
            label: "Faculty Final",
            sub: mode === "decided" ? "Decision recorded" : has ? "Review / moderate / approve" : "Available after Analyzer",
            state: facultyStep,
        },
    ];

    const people = [
        { name: row.student_name, role: participation, tone: "student" },
        row.faculty_name ? { name: row.faculty_name, role: "Faculty", tone: "faculty" } : null,
        row.organization_name && row.organization_name !== "N/A"
            ? { name: row.organization_name, role: "NGO", tone: "partner" }
            : null,
        row.university ? { name: row.university, role: "University", tone: "university" } : null,
        { name: "CIEL PK", role: "Verification", tone: "ciel" },
    ].filter(Boolean) as Array<{ name: string; role: string; tone: string }>;

    const roster =
        row.member_hours?.length
            ? row.member_hours.map((member) => ({ ...member }))
            : [{ name: row.student_name, hours, required }];
    if (roster.every((member) => !member.hours) && hours > 0 && roster[0]) {
        roster[0] = { ...roster[0], hours };
    }
    const memberPills = roster.map((member) => {
        const met = member.hours >= member.required;
        return {
            label: `${member.name.split(" ")[0]} ${Math.round(member.hours)}/${member.required}h`,
            met,
        };
    });

    return (
        <>
            <article
                className={
                    "grid grid-cols-1 items-start gap-4 rounded-[18px] border border-[#dde5ea] bg-white p-4 transition hover:border-[#bcd4d8] hover:shadow-[0_8px_22px_rgba(24,52,64,.06)] lg:grid-cols-[minmax(0,1fr)_280px] lg:p-[16px_18px] " +
                    (accent === "rev"
                        ? "border-l-[5px] border-l-[#d7626a]"
                        : accent === "ok"
                          ? "border-l-[5px] border-l-[#15988b]"
                          : "border-l-[5px] border-l-[#f2b23a]")
                }
            >
                <div className="min-w-0">
                    <h4 className="m-0 text-[15.5px] font-semibold text-[#16313d]">{row.project_title || "Report"}</h4>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-[#6b7c86]">
                        <span className="rounded-lg bg-[#eef3f5] px-1.5 py-0.5 font-mono text-[11px] font-bold text-[#3f5661]">{idLabel}</span>
                        <span className="rounded-lg bg-[#f1eef8] px-1.5 py-0.5 text-[10px] font-black text-[#6b2bd9]">Report v1</span>
                        <span className="rounded-[18px] bg-[#fff3dc] px-2 py-0.5 text-[10.5px] font-black text-[#9a6410]">{statusTitle}</span>
                        {lastActivity ? <span>Last activity {lastActivity}</span> : null}
                        {!has ? (
                            <span className="rounded-[18px] border border-dashed border-[#d3e3e0] bg-[#f4f7f8] px-2 py-0.5 text-[10.5px] font-bold text-[#6c7f86]">
                                Not analysed yet
                            </span>
                        ) : null}
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                        {people.map((person) => (
                            <span
                                key={`${person.tone}-${person.name}`}
                                className="inline-flex items-center gap-1.5 rounded-[20px] border border-[#dde5ea] bg-[#fbfcfd] py-1 pl-1 pr-2.5 text-[11.5px] text-[#16313d]"
                            >
                                <span className={`grid h-[22px] w-[22px] place-items-center rounded-full text-[10px] font-black ${AVATAR[person.tone] || AVATAR.student}`}>
                                    {initials(person.name)}
                                </span>
                                {person.name}
                                <small className="text-[10px] text-[#6b7c86]">{person.role}</small>
                            </span>
                        ))}
                    </div>

                    <div className="mt-3 rounded-[13px] border border-[#e8edef] bg-[#fafbfb] p-3">
                        <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-black uppercase tracking-[0.04em] text-[#4d6069]">
                            <span>What you receive</span>
                            <span className="rounded-lg bg-[#f1eef8] px-1.5 py-0.5 text-[10px] normal-case tracking-normal text-[#6b2bd9]">
                                Report v1
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
                            {stages.map((step) => (
                                <div key={step.label} className={`rounded-[11px] border px-2 py-2 ${stageClass(step.state)}`}>
                                    <b className="block text-[11.5px] font-black leading-tight">{step.label}</b>
                                    <small className="mt-0.5 block text-[10px] font-semibold leading-snug opacity-80">{step.sub}</small>
                                </div>
                            ))}
                        </div>
                        {has ? (
                            <p className="mt-2 text-[12px] leading-relaxed text-[#4f6068]">
                                {row.story
                                    ? `${row.story.slice(0, 320)}${row.story.length > 320 ? "…" : ""}`
                                    : "System CII is provisional until you approve. Overrides need a recorded reason. Student-source text is not rewritten."}
                            </p>
                        ) : (
                            <div className="mt-2 rounded-[11px] border border-[#cfe6ef] bg-[#f3f9fb] px-3 py-2 text-[12px] leading-relaxed text-[#3e515b]">
                                <b>Locked flow:</b> Faculty first reviews the submitted Flashcard + Detailed Report. The Analyzer runs only when you choose to run it.
                            </div>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {memberPills.map((pill) => (
                                <span
                                    key={pill.label}
                                    className={
                                        "rounded-[18px] px-2 py-0.5 text-[10.5px] font-black " +
                                        (pill.met ? "bg-[#e8f5ef] text-[#1d765d]" : "bg-[#fff3dc] text-[#9a6410]")
                                    }
                                >
                                    {pill.label}
                                </span>
                            ))}
                            <span className="rounded-[18px] bg-[#edf4fb] px-2 py-0.5 text-[10.5px] font-black text-[#376d9f]">
                                {hours} person-hours
                            </span>
                            <span className="rounded-[18px] bg-[#f1eef8] px-2 py-0.5 text-[10.5px] font-black text-[#6b2bd9]">
                                Dividend {money(dividend)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid content-start gap-2.5 lg:border-l lg:border-[#dde5ea] lg:pl-4">
                    <div
                        className={
                            "rounded-xl border px-3 py-2.5 " +
                            (statusTone === "bad"
                                ? "border-[#f1c4c4] bg-[#fff5f5]"
                                : statusTone === "ok"
                                  ? "border-[#bfe3d6] bg-[#f3fbf7]"
                                  : "border-[#f0d9a8] bg-[#fffaf0]")
                        }
                    >
                        <p
                            className={
                                "text-[9.5px] font-black uppercase tracking-[0.08em] " +
                                (statusTone === "bad" ? "text-[#b34c4c]" : statusTone === "ok" ? "text-[#1d765d]" : "text-[#9a6410]")
                            }
                        >
                            Status · Report
                        </p>
                        <b className="mt-0.5 block text-[13px] text-[#16313d]">{statusTitle}</b>
                        <small className="mt-0.5 block text-[11.5px] leading-snug text-[#6b7c86]">{statusText}</small>
                    </div>
                    <div className="rounded-xl border border-[#bfe3d6] bg-[#f3fbf7] px-3 py-2.5">
                        <p className="text-[9.5px] font-black uppercase tracking-[0.08em] text-[#1d765d]">Next action</p>
                        <b className="mt-0.5 block text-[13px] text-[#16313d]">{nextTitle}</b>
                        <small className="mt-0.5 block text-[11.5px] leading-snug text-[#6b7c86]">{nextText}</small>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        <button type="button" className={approvalActionClass.green} onClick={() => setLockedOpen(true)}>
                            Open Locked V17 Package
                        </button>
                        <Link href={analyserHref} className={approvalActionClass.blue}>
                            {has ? "System CII · Review & Finalise" : "Run AI Analyzer"}
                        </Link>
                        {mode === "pending" ? (
                            <>
                                <Link href={decideHref} className={approvalActionClass.gold}>
                                    ✏ Request Revision
                                </Link>
                                <Link href={decideHref} className={approvalActionClass.red}>
                                    ✕ Reject
                                </Link>
                            </>
                        ) : (
                            <Link href={reportHref} className={approvalActionClass.soft}>
                                Open record
                            </Link>
                        )}
                    </div>
                </div>
            </article>
            {lockedOpen ? <FacultyLockedV17Modal reportId={row.id} onClose={() => setLockedOpen(false)} /> : null}
        </>
    );
}
