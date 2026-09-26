import type { ReactNode } from "react";
import { formatDisplayId } from "@/utils/displayIds";
import {
    isFacultyApprovalCompleteForPartnerGate,
    resolveStudentOpportunityWorkflow,
} from "@/utils/opportunityWorkflow";

export type ApprovalCardStepState = "done" | "cur" | "bad" | "locked";

export type ApprovalCardStep = {
    role: string;
    who?: string;
    state: ApprovalCardStepState;
};

export type ApprovalCardPerson = {
    name: string;
    role: string;
    tone: "student" | "faculty" | "partner" | "university" | "ciel";
};

export type ApprovalViewer = "ngo" | "partner" | "faculty" | "university" | "admin" | "student";
export type ApprovalCardMode = "pending" | "revision" | "decided";

function lower(value: unknown): string {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}

function pickStr(record: Record<string, unknown> | null | undefined, ...keys: string[]): string {
    if (!record) return "";
    for (const key of keys) {
        const value = record[key];
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
}

function asObj(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function initials(name: string): string {
    const parts = name
        .split(/\s+/)
        .map((part) => part[0])
        .filter(Boolean);
    return (parts.join("") || "?").slice(0, 3).toUpperCase();
}

function ago(value: unknown): string {
    if (value == null || value === "") return "";
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return String(value);
    const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
    if (days < 1) return "today";
    if (days === 1) return "1 day ago";
    if (days < 60) return `${days} days ago`;
    return date.toLocaleDateString();
}

function lineState(status: string, currentAssigned: { value: boolean }, blocked: { value: boolean }): ApprovalCardStepState {
    if (status === "rejected" || status === "revision_requested" || status.includes("revision")) {
        blocked.value = true;
        return "bad";
    }
    if (blocked.value) return "locked";
    if (status === "approved" || status === "skipped" || status === "not_applicable" || status === "not_required") {
        return "done";
    }
    if (!currentAssigned.value) {
        currentAssigned.value = true;
        return "cur";
    }
    return "locked";
}

function pillLabel(state: ApprovalCardStepState, badWord: string): string {
    if (state === "done") return "Approved";
    if (state === "cur") return "Pending";
    if (state === "bad") return badWord;
    return "Locked";
}

export function ApprovalChain({ steps, badWord = "Revision" }: { steps: ApprovalCardStep[]; badWord?: string }) {
    return (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            {steps.map((step) => (
                <div
                    key={step.role}
                    className={
                        "rounded-[11px] border px-2.5 py-2 " +
                        (step.state === "done"
                            ? "border-[#bfe3d6] bg-[#f3fbf7]"
                            : step.state === "cur"
                              ? "border-[#e6a23c] bg-[#fffaf0]"
                              : step.state === "bad"
                                ? "border-[#f1c4c4] bg-[#fff5f5]"
                                : "border-[#dde5ea] bg-white")
                    }
                >
                    <b className="block text-[11.5px] text-[#16313d]">{step.role}</b>
                    {step.who ? <small className="mt-0.5 block text-[10.5px] text-[#6b7c86]">{step.who}</small> : null}
                    <span
                        className={
                            "mt-1.5 inline-block rounded-[18px] px-2 py-0.5 text-[10.5px] font-black " +
                            (step.state === "done"
                                ? "bg-[#e8f5ef] text-[#1d765d]"
                                : step.state === "cur"
                                  ? "bg-[#fff3dc] text-[#9a6410]"
                                  : step.state === "bad"
                                    ? "bg-[#fdeeee] text-[#b34c4c]"
                                    : "bg-[#eef1f2] text-[#6d7a80]")
                        }
                    >
                        {pillLabel(step.state, badWord)}
                    </span>
                </div>
            ))}
        </div>
    );
}

export function buildOpportunityApprovalModel(
    row: Record<string, unknown>,
    viewer: ApprovalViewer,
    options?: { orgName?: string; mode?: ApprovalCardMode },
) {
    const mode = options?.mode ?? "pending";
    const supervision = asObj(row.supervision);
    const partnerOrg = asObj(row.partner_organization);
    const collab = asObj(row.external_partner_collaboration);
    const executing = asObj(row.executing_context);
    const executingPartner = asObj(executing?.partner);
    const timeline = asObj(row.timeline);
    const organization = asObj(row.organization);
    const location = asObj(row.location);

    const studentName =
        pickStr(row, "student_name", "studentName", "creator_name", "creatorName", "submitted_by_name") ||
        pickStr(supervision, "student_name");
    const facultyName =
        pickStr(row, "faculty_contact_name", "faculty_name", "facultyName") ||
        pickStr(supervision, "supervisor_name", "faculty_name", "contact_name");
    const partnerName =
        pickStr(supervision, "partner_org_name", "external_partner_org_name") ||
        pickStr(collab, "organization_name") ||
        pickStr(executingPartner, "organization_name") ||
        pickStr(partnerOrg, "organization_name", "name") ||
        options?.orgName ||
        "";
    const universityName =
        pickStr(row, "university", "institution") ||
        pickStr(organization, "name") ||
        pickStr(supervision, "university", "institution");

    const createdBy = lower(row.created_by_role ?? row.creator_role ?? row.createdByRole);
    const studentCreated =
        row.isStudentCreated === true ||
        row.is_student_created === true ||
        createdBy === "student" ||
        viewer === "student" ||
        (viewer === "faculty" && createdBy !== "faculty" && createdBy !== "ngo" && createdBy !== "partner" && createdBy !== "university");
    const facultyCreated = createdBy === "faculty";
    const requiresPartner =
        row.requires_partner_approval === true ||
        row.requiresPartnerApproval === true ||
        viewer === "ngo" ||
        viewer === "partner" ||
        Boolean(partnerName);

    const facultyStatus = lower(row.faculty_approval_status ?? row.facultyApprovalStatus);
    const partnerStatus = lower(row.partner_approval_status ?? row.partnerApprovalStatus ?? row.partner_status);
    const adminStatus = lower(row.admin_approval_status ?? row.adminApprovalStatus);
    const workflow = resolveStudentOpportunityWorkflow(row);
    const facultyDone =
        isFacultyApprovalCompleteForPartnerGate(row) ||
        facultyStatus === "approved" ||
        ["pending_partner", "pending_admin", "live"].includes(workflow.stage);

    const cursor = { value: false };
    const blocked = { value: false };
    const steps: ApprovalCardStep[] = [];

    if (studentCreated && !facultyCreated) {
        steps.push({
            role: "Student",
            who: studentName || undefined,
            state: lower(row.status) === "draft" ? "cur" : "done",
        });
        if (lower(row.status) !== "draft") cursor.value = false;
    }

    const facultyLine = facultyDone ? "approved" : facultyStatus || (workflow.stage === "pending_faculty" ? "pending" : "");
    steps.push({
        role: "Faculty",
        who: facultyName || undefined,
        state: lineState(facultyLine, cursor, blocked),
    });

    if (requiresPartner) {
        const partnerLine =
            partnerStatus ||
            (workflow.stage === "pending_partner" ? "pending" : workflow.stage === "pending_admin" || workflow.stage === "live" ? "approved" : "");
        steps.push({
            role: viewer === "ngo" ? "NGO" : "Partner",
            who: partnerName || undefined,
            state: lineState(partnerLine, cursor, blocked),
        });
    }

    const adminLine =
        adminStatus ||
        (workflow.stage === "pending_admin" ? "pending" : workflow.stage === "live" ? "approved" : "");
    steps.push({
        role: "CIEL PK",
        who: "Verification",
        state: lineState(adminLine, cursor, blocked),
    });

    if (studentCreated) {
        steps.push({
            role: "Team Project",
            state: workflow.stage === "live" ? "done" : "locked",
        });
    }

    const people: ApprovalCardPerson[] = [];
    if (studentName) people.push({ name: studentName, role: "Student", tone: "student" });
    if (facultyName) people.push({ name: facultyName, role: "Faculty", tone: "faculty" });
    if (partnerName) people.push({ name: partnerName, role: viewer === "ngo" ? "NGO" : "Partner", tone: "partner" });
    if (universityName && universityName !== partnerName) {
        people.push({ name: universityName, role: "University", tone: "university" });
    }
    people.push({ name: "CIEL PK", role: "Verification", tone: "ciel" });

    const version = typeof row.version === "number" && Number.isFinite(row.version) ? row.version : 1;
    const activity = ago(row.updated_at ?? row.updatedAt ?? row.submitted_at ?? row.submittedAt ?? row.created_at ?? row.createdAt);
    const summary =
        pickStr(row, "summary", "description", "short_description") ||
        pickStr(asObj(row.activity_details), "summary", "description");
    const start = pickStr(timeline, "start_date", "start");
    const end = pickStr(timeline, "end_date", "end");
    const place = pickStr(row, "location_name", "location_text") || pickStr(location, "address", "name", "city") || pickStr(timeline, "location");
    const hours = timeline?.hours_per_student ?? timeline?.required_hours ?? row.totalHours ?? row.total_hours;
    const facts = [start && end ? `${start}–${end}` : start || end, place, hours ? `${hours}h/student` : ""]
        .filter(Boolean)
        .join(" · ");

    const orgWord = viewer === "ngo" ? "NGO" : viewer === "partner" ? "Partner" : viewer === "faculty" ? "Faculty" : "CIEL PK";
    const rejected = workflow.stage === "rejected" || lower(row.status) === "rejected";
    let statusTitle = workflow.badgeLabel || `Pending ${orgWord} approval`;
    let statusText = activity ? `Opp v${version} · ${activity}` : `Opp v${version}`;
    let nextTitle = "Approve, request revision or reject";
    let nextText = "Your decision stays on this same opportunity. The next reviewer is notified only after you decide.";
    let accent: "act" | "rev" | "ok" = rejected ? "rev" : workflow.stage === "live" ? "ok" : "act";
    let statusTone: "warn" | "bad" | "ok" | "" = rejected ? "bad" : workflow.stage === "live" ? "ok" : "warn";

    if (viewer === "university" || viewer === "student") {
        nextTitle = "No action required from you";
        nextText =
            viewer === "student"
                ? "This stays here until the current reviewer decides. You will be notified."
                : "Faculty, the named organization, and CIEL PK decide. You can open the flashcard.";
    } else if (facultyCreated && (viewer === "ngo" || viewer === "partner")) {
        statusTitle = "Acknowledgement requested";
        nextTitle = "Acknowledge that your organization agrees to this opportunity";
    } else if (viewer === "faculty") {
        statusTitle = "Pending Faculty approval";
        nextText = "Approve the academic fit, or send it back. Partner and CIEL PK stay locked until you decide.";
    } else if (viewer === "admin") {
        statusTitle = "Pending CIEL PK approval";
        nextText = "Final platform approval. Faculty and the named organization are already recorded on this version.";
    } else {
        statusTitle = `Pending ${orgWord} approval`;
        statusText = `Faculty approved · Opp v${version}${activity ? ` · ${activity}` : ""}`;
    }

    if (mode === "revision") {
        statusTitle = "Revision requested";
        statusText = "Waiting for the creator to resubmit this version.";
        nextTitle = "Waiting for resubmission";
        nextText = "The corrected version returns to this queue.";
        accent = "rev";
        statusTone = "bad";
    } else if (mode === "decided") {
        statusTitle = rejected ? "Rejected" : workflow.stage === "live" ? "Approved" : "Decided";
        nextTitle = "Decision recorded";
        nextText = "Open the record to see the version history.";
        accent = rejected ? "rev" : "ok";
        statusTone = rejected ? "bad" : "ok";
    }

    return {
        title: pickStr(row, "title", "project_title", "projectTitle", "name") || "Opportunity",
        idLabel: formatDisplayId(row.id, "OPP"),
        versionLabel: `Opp v${version}`,
        statusPill: statusTitle,
        lastActivity: activity ? `Last activity ${activity}` : "",
        people,
        steps,
        summary,
        facts,
        accent,
        status: { label: "Status · Opportunity", title: statusTitle, text: statusText, tone: statusTone },
        next: { title: nextTitle, text: nextText },
    };
}

const AVATAR: Record<ApprovalCardPerson["tone"], string> = {
    student: "bg-[#dff1ed] text-[#145a4f]",
    faculty: "bg-[#fbe8d0] text-[#8a4e00]",
    partner: "bg-[#e6e0f7] text-[#5a2bb5]",
    university: "bg-[#dde9f5] text-[#2f5b86]",
    ciel: "bg-[#0e4d4e] text-white",
};

export default function OpportunityApprovalCard({
    title,
    idLabel,
    versionLabel,
    statusPill,
    lastActivity,
    people,
    steps,
    summary,
    facts,
    accent = "act",
    status,
    next,
    actions,
}: {
    title: string;
    idLabel?: string;
    versionLabel?: string;
    statusPill?: string;
    lastActivity?: string;
    people?: ApprovalCardPerson[];
    steps: ApprovalCardStep[];
    summary?: string;
    facts?: string;
    accent?: "act" | "rev" | "ok" | "";
    status: { label: string; title: string; text?: string; tone?: "warn" | "bad" | "ok" | "" };
    next: { title: string; text?: string };
    actions?: ReactNode;
}) {
    return (
        <article
            className={
                "grid grid-cols-1 items-start gap-4 rounded-[18px] border border-[#dde5ea] bg-white p-4 transition hover:border-[#bcd4d8] hover:shadow-[0_8px_22px_rgba(24,52,64,.06)] lg:grid-cols-[minmax(0,1fr)_280px] lg:p-[16px_18px] " +
                (accent === "rev" ? "border-l-[5px] border-l-[#d7626a]" : accent === "act" ? "border-l-[5px] border-l-[#f2b23a]" : accent === "ok" ? "border-l-[5px] border-l-[#15988b]" : "")
            }
        >
            <div className="min-w-0">
                <h4 className="m-0 text-[15.5px] font-semibold text-[#16313d]">{title}</h4>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-[#6b7c86]">
                    {idLabel ? (
                        <span className="rounded-lg bg-[#eef3f5] px-1.5 py-0.5 font-mono text-[11px] font-bold text-[#3f5661]">{idLabel}</span>
                    ) : null}
                    {versionLabel ? (
                        <span className="rounded-lg bg-[#f1eef8] px-1.5 py-0.5 text-[10px] font-black text-[#6b2bd9]">{versionLabel}</span>
                    ) : null}
                    {statusPill ? (
                        <span className="rounded-[18px] bg-[#fff3dc] px-2 py-0.5 text-[10.5px] font-black text-[#9a6410]">{statusPill}</span>
                    ) : null}
                    {lastActivity ? <span>{lastActivity}</span> : null}
                </div>
                {people && people.length > 0 ? (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                        {people.map((person) => (
                            <span
                                key={`${person.tone}-${person.name}`}
                                className="inline-flex items-center gap-1.5 rounded-[20px] border border-[#dde5ea] bg-[#fbfcfd] py-1 pl-1 pr-2.5 text-[11.5px] text-[#16313d]"
                            >
                                <span className={`grid h-[22px] w-[22px] place-items-center rounded-full text-[10px] font-black ${AVATAR[person.tone]}`}>
                                    {initials(person.name)}
                                </span>
                                {person.name}
                                <small className="text-[10px] text-[#6b7c86]">{person.role}</small>
                            </span>
                        ))}
                    </div>
                ) : null}
                <div className="mt-3 rounded-[13px] border border-[#e8edef] bg-[#fafbfb] p-3">
                    <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-black uppercase tracking-[0.04em] text-[#4d6069]">
                        <span>Approval chain</span>
                        {versionLabel ? <span className="rounded-lg bg-[#f1eef8] px-1.5 py-0.5 text-[10px] normal-case tracking-normal text-[#6b2bd9]">{versionLabel}</span> : null}
                    </div>
                    <ApprovalChain steps={steps} badWord={status.tone === "bad" && status.title.toLowerCase().includes("reject") ? "Rejected" : "Revision"} />
                </div>
                {summary ? (
                    <p className="mt-2 text-[12.5px] leading-relaxed text-[#3e515b]">
                        <span className="mr-1 text-[10px] font-black uppercase tracking-[0.04em] text-[#7b8a91]">Summary</span>
                        {summary}
                    </p>
                ) : null}
                {facts ? (
                    <p className="mt-1 text-[12px] text-[#6b7c86]">
                        <span className="mr-1 text-[10px] font-black uppercase tracking-[0.04em] text-[#7b8a91]">Dates · location · hours</span>
                        {facts}
                    </p>
                ) : null}
            </div>
            <div className="grid content-start gap-2.5 lg:border-l lg:border-[#dde5ea] lg:pl-4">
                <div
                    className={
                        "rounded-xl border px-3 py-2.5 " +
                        (status.tone === "bad"
                            ? "border-[#f1c4c4] bg-[#fff5f5]"
                            : status.tone === "ok"
                              ? "border-[#bfe3d6] bg-[#f3fbf7]"
                              : status.tone === "warn"
                                ? "border-[#f0d9a8] bg-[#fffaf0]"
                                : "border-[#dde5ea] bg-[#f8fafb]")
                    }
                >
                    <p
                        className={
                            "text-[9.5px] font-black uppercase tracking-[0.08em] " +
                            (status.tone === "bad" ? "text-[#b34c4c]" : status.tone === "ok" ? "text-[#1d765d]" : status.tone === "warn" ? "text-[#9a6410]" : "text-[#7b8a91]")
                        }
                    >
                        {status.label}
                    </p>
                    <b className="mt-0.5 block text-[13px] text-[#16313d]">{status.title}</b>
                    {status.text ? <small className="mt-0.5 block text-[11.5px] leading-snug text-[#6b7c86]">{status.text}</small> : null}
                </div>
                <div className="rounded-xl border border-[#bfe3d6] bg-[#f3fbf7] px-3 py-2.5">
                    <p className="text-[9.5px] font-black uppercase tracking-[0.08em] text-[#1d765d]">Next action</p>
                    <b className="mt-0.5 block text-[13px] text-[#16313d]">{next.title}</b>
                    {next.text ? <small className="mt-0.5 block text-[11.5px] leading-snug text-[#6b7c86]">{next.text}</small> : null}
                </div>
                {actions ? <div className="flex flex-wrap gap-1.5">{actions}</div> : null}
            </div>
        </article>
    );
}

export const approvalActionClass = {
    green: "rounded-[10px] bg-[#e8f5ef] px-3 py-2 text-[12px] font-black text-[#1d765d] hover:brightness-95",
    gold: "rounded-[10px] bg-[#f8f2e7] px-3 py-2 text-[12px] font-black text-[#765b25] hover:brightness-95",
    red: "rounded-[10px] bg-[#fdeeee] px-3 py-2 text-[12px] font-black text-[#b34c4c] hover:brightness-95",
    soft: "rounded-[10px] bg-[#eef2f3] px-3 py-2 text-[12px] font-black text-[#29454f] hover:brightness-95",
    purple: "rounded-[10px] bg-[#f1eef8] px-3 py-2 text-[12px] font-black text-[#6b2bd9] hover:brightness-95",
    blue: "rounded-[10px] bg-[#edf4fb] px-3 py-2 text-[12px] font-black text-[#376d9f] hover:brightness-95",
} as const;
