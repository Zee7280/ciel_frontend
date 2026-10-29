"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { formatInternationalPhoneDisplay } from "@/utils/countryCallingCodes";
import { mailtoHref, whatsappHrefForPhone, whatsappShareHref } from "@/utils/reminderLinks";
import type { ReminderMessage } from "@/utils/quickWorkReminders";
import {
    activityLabel,
    formatHours,
    evidenceKind,
    SDG_NAMES,
    shortDate,
    STATUS_LABEL,
    type QuickWorkEvidence,
    type QuickWorkLog,
    type QuickWorkStatus,
} from "@/utils/quickWorkRules";

/* ------------------------------------------------------------------ icons */

export function LeafIcon({ className = "h-6 w-6" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className={className}>
            <path d="M20 3c-9-1-16 3-16 9 0 4 3 7 7 7 6 0 9-7 9-16Z" />
            <path d="M3 22 16 9M9 16v-5m0 5h5" />
        </svg>
    );
}

export function BookIcon({ className = "h-6 w-6" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className={className}>
            <path d="M3 4h7l2 2 2-2h7v16h-7l-2 1-2-1H3ZM12 6v15" />
            <path d="M6 8h3M6 12h3M15 8h3M15 12h3" />
        </svg>
    );
}

export function PhotoIcon({ className = "h-7 w-7" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className={className}>
            <rect x="3" y="4" width="18" height="16" rx="3" />
            <circle cx="8" cy="9" r="1.5" />
            <path d="m3 17 6-5 4 3 3-4 5 6" />
        </svg>
    );
}

/* ------------------------------------------------------------------ reminders */

/**
 * Email / WhatsApp reminder buttons. They open a prefilled message on the sender's own device (no
 * message is sent by CIEL PK). WhatsApp goes to `phone` when known, otherwise to the share sheet.
 */
export function QuickWorkReminder({
    label,
    email,
    phone,
    message,
}: {
    label: string;
    email?: string | null;
    phone?: string | null;
    message: ReminderMessage;
}) {
    const text = `${message.subject}\n\n${message.body}`;
    const whatsapp = whatsappHrefForPhone(phone, text) ?? whatsappShareHref(text);
    return (
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-[#6b7c86]">{label}</span>
            {email ? (
                <a
                    href={mailtoHref(email, message.subject, message.body)}
                    className="rounded-md bg-[#edf4fb] px-2 py-1 text-[11px] font-bold text-[#376d9f] hover:bg-[#dfeaf6]"
                >
                    Email
                </a>
            ) : null}
            <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-[#e8f8ee] px-2 py-1 text-[11px] font-bold text-[#1f7a46] hover:bg-[#d6f1e0]"
            >
                WhatsApp
            </a>
        </span>
    );
}

/* ------------------------------------------------------------------ status */

const PILL_TONE: Record<QuickWorkStatus, string> = {
    draft: "bg-[#eef2f4] text-[#6b7c86]",
    submitted: "bg-[#fff5de] text-[#916b21]",
    admin_review: "bg-[#eaf0ff] text-[#3d5ba9]",
    changes: "bg-[#fae9e7] text-[#ac3c3c]",
    approved: "bg-[#e6f6f4] text-[#0e7d74]",
    rejected: "bg-[#fae9e7] text-[#ac3c3c]",
};

/** `inProgress` shows a draft whose faculty or teammates have already been asked as "In progress". */
export function QuickWorkStatusPill({ status, inProgress = false }: { status: QuickWorkStatus; inProgress?: boolean }) {
    const tone = inProgress && status === "draft" ? PILL_TONE.submitted : (PILL_TONE[status] ?? PILL_TONE.draft);
    return (
        <span className={`inline-block rounded-md px-2.5 py-1.5 text-[11px] font-semibold leading-tight ${tone}`}>
            {inProgress && status === "draft" ? "In progress" : (STATUS_LABEL[status] ?? status)}
        </span>
    );
}

/* ------------------------------------------------------------------ modal */

/** Centered dialog: Escape and the backdrop close it, focus starts inside, the page behind does not scroll. */
export function QuickWorkModal({
    labelledBy,
    onClose,
    children,
    wide = false,
}: {
    labelledBy: string;
    onClose: () => void;
    children: ReactNode;
    wide?: boolean;
}) {
    const panel = useRef<HTMLElement>(null);
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        const { overflow } = document.body.style;
        document.body.style.overflow = "hidden";
        panel.current?.querySelector<HTMLElement>("button, a, input, select, textarea")?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = overflow;
            previous?.focus?.();
        };
    }, [onClose]);
    return (
        <div
            className="fixed inset-0 z-[100] grid place-items-center overflow-auto overscroll-contain bg-[#04252b]/50 p-3 sm:p-5"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <section
                ref={panel}
                role="dialog"
                aria-modal="true"
                aria-labelledby={labelledBy}
                className={`max-h-[94dvh] w-full overflow-auto rounded-[17px] bg-white p-5 text-[#16313d] shadow-2xl sm:p-7 ${wide ? "max-w-[760px]" : "max-w-[610px]"}`}
            >
                {children}
            </section>
        </div>
    );
}

export function ModalClose({ onClose, label = "Close" }: { onClose: () => void; label?: string }) {
    return (
        <button
            type="button"
            onClick={onClose}
            aria-label={label}
            className="grid h-[30px] w-[30px] flex-none place-items-center rounded-full bg-[#eef4f5] text-lg text-[#16313d] hover:bg-[#e2eef0]"
        >
            ×
        </button>
    );
}

/* ------------------------------------------------------------------ route popups */

/** Shown before the quick log opens: what quick work is, and that it is not the 16-hour route. */
export function QuickWorkIntroDialog({
    onClose,
    onContinue,
    onStructured,
}: {
    onClose: () => void;
    onContinue: () => void;
    onStructured: () => void;
}) {
    return (
        <QuickWorkModal labelledBy="quickWorkIntroTitle" onClose={onClose}>
            <header className="mb-3.5 flex items-start justify-between gap-5">
                <div>
                    <span className="grid h-[43px] w-[43px] place-items-center rounded-xl bg-[#fff0cd] text-[#88600d]">
                        <LeafIcon />
                    </span>
                    <div className="mt-3 text-[11px] font-bold uppercase tracking-[1.2px] text-[#6b7c86]">Short university activities</div>
                    <h2 id="quickWorkIntroTitle" className="mt-1.5 text-[21px] font-bold leading-tight text-[#16313d] sm:text-[21px]">
                        Quick Community Impact
                    </h2>
                </div>
                <ModalClose onClose={onClose} label="Close explanation" />
            </header>
            <p className="text-[13px] leading-relaxed text-[#6b7c86]">
                Use this for brief community activities at university—even a one-hour activity—such as:
            </p>
            <div className="my-3.5 flex flex-wrap gap-1.5">
                {["Tree-planting drives", "Awareness campaigns", "Pinktober events", "Campus clean-ups"].map((c) => (
                    <span key={c} className="rounded-md border border-[#dcebee] bg-[#f8fbfc] px-2 py-1 text-[11px] text-[#6b7c86]">
                        {c}
                    </span>
                ))}
            </div>
            <div className="border-t border-[#dcebee] pt-4">
                <h3 className="text-sm font-semibold">A short log for work you have completed</h3>
                <ol className="my-3 list-decimal space-y-2 pl-5 text-xs leading-relaxed text-[#6b7c86]">
                    <li>
                        <b className="text-[#16313d]">Add yourself or your team.</b> Name the faculty member who will review your work; each teammate gets an email to confirm.
                    </li>
                    <li>
                        <b className="text-[#16313d]">Record what you did.</b> Enter each person’s actual attendance and attach photos or supporting evidence.
                    </li>
                    <li>
                        <b className="text-[#16313d]">Submit for approval.</b> Faculty reviews the completed work, then CIEL PK gives final approval; approved individual hours appear in{" "}
                        <b className="text-[#16313d]">Quick Impact Log</b>.
                    </li>
                </ol>
                <p className="mb-4 mt-3 text-xs font-semibold text-[#0e7d74]">Faculty approval happens only after submission.</p>
            </div>
            <div className="rounded-md border-l-[3px] border-[#e3a72b] bg-[#fff6e1] px-4 py-3 text-xs leading-relaxed text-[#624b20]">
                <b className="mb-1 block text-[13px]">Need to complete your 16-hour requirement?</b>
                Choose <strong>Structured Community Service</strong>. Quick Community Impact is recorded separately and does not automatically fulfil that requirement.
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <button
                    type="button"
                    onClick={onContinue}
                    className="min-h-[43px] flex-1 rounded-lg bg-[#0e7d74] px-3 text-xs font-semibold text-white hover:bg-[#0b6760]"
                >
                    Continue to Quick Community Impact <span aria-hidden="true">→</span>
                </button>
                <button
                    type="button"
                    onClick={onStructured}
                    className="min-h-[43px] flex-1 rounded-lg border border-[#cbe3e0] bg-white px-3 text-xs font-semibold text-[#0e7d74] hover:bg-[#f2faf9]"
                >
                    Go to Structured Service
                </button>
            </div>
        </QuickWorkModal>
    );
}

/** "Which route should I use?" — the two purposes side by side. */
export function RouteChoiceDialog({
    onClose,
    onStructured,
    onQuick,
}: {
    onClose: () => void;
    onStructured: () => void;
    onQuick: () => void;
}) {
    return (
        <QuickWorkModal labelledBy="routeChoiceTitle" onClose={onClose}>
            <header className="mb-3.5 flex items-start justify-between gap-5">
                <div>
                    <div className="text-xs font-bold uppercase tracking-[1.6px] text-[#0e7d74]">Choose the right route</div>
                    <h2 id="routeChoiceTitle" className="mt-1 text-lg font-bold">
                        What are you here to do?
                    </h2>
                </div>
                <ModalClose onClose={onClose} />
            </header>
            <div className="my-3.5 rounded-[10px] border border-[#dcebee] bg-[#f8fbfc] p-[18px]">
                <h3 className="text-[15px] font-semibold">Complete the 16-hour requirement</h3>
                <p className="mb-3.5 mt-2 text-[13px] text-[#6b7c86]">
                    Choose Structured Community Service for a structured project, verified attendance and a detailed report.
                </p>
                <button type="button" onClick={onStructured} className="rounded-lg bg-[#0e7d74] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0b6760]">
                    Open Structured Service
                </button>
            </div>
            <div className="my-3.5 rounded-[10px] border border-[#dcebee] bg-[#f8fbfc] p-[18px]">
                <h3 className="text-[15px] font-semibold">Record a short university activity</h3>
                <p className="mb-3.5 mt-2 text-[13px] text-[#6b7c86]">
                    Choose Quick Community Impact for a brief activity log, evidence, and faculty then CIEL PK approval after submission.
                </p>
                <button type="button" onClick={onQuick} className="rounded-lg bg-[#f4a51c] px-4 py-2.5 text-xs font-bold text-[#2e270e] hover:bg-[#e99a12]">
                    Quick Community Impact
                </button>
            </div>
        </QuickWorkModal>
    );
}

/* ------------------------------------------------------------------ record details */

export function EvidenceTile({ item, children }: { item: QuickWorkEvidence; children?: ReactNode }) {
    const kind = evidenceKind(item.type);
    const ext = item.name.split(".").pop()?.toUpperCase() ?? "";
    return (
        <div className="overflow-hidden rounded-[9px] border border-[#dcebee]">
            {!item.url ? (
                // The API sends a short-lived signed link; none means it could not be issued just now.
                <div className="grid h-[135px] place-items-center bg-[#f4f8f9] px-3 text-center text-xs text-[#6b7c86]">
                    Preview unavailable. Reopen this record to refresh it.
                </div>
            ) : kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element -- user evidence from S3, any size
                <img src={item.url} alt={item.caption || item.name} className="block h-[135px] w-full bg-[#e6f6f4] object-cover" />
            ) : kind === "video" ? (
                <video src={item.url} controls preload="metadata" className="block h-[135px] w-full bg-black object-contain" />
            ) : kind === "audio" ? (
                <div className="grid h-[135px] place-items-center bg-[#e6f6f4] px-2">
                    <audio src={item.url} controls preload="none" className="w-full" />
                </div>
            ) : (
                <div className="grid h-[135px] place-items-center bg-[#e6f6f4] font-bold text-[#0b6760]">
                    {kind === "pdf" ? "PDF" : ext || "File"} evidence
                </div>
            )}
            <div className="p-2.5">
                <div className="truncate text-[11px] text-[#6b7c86]" title={item.name}>
                    {item.name}
                </div>
                {children ?? (
                    <>
                        <p className="mt-1 text-xs text-[#16313d]">{item.caption}</p>
                        {item.url ? (
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#0e7d74] underline">
                                Open evidence
                            </a>
                        ) : null}
                    </>
                )}
            </div>
        </div>
    );
}

/**
 * The Quick Community Log flashcard: a summary hero, the activity and faculty details, what was done
 * (with declarations and the evidence the caller passes in), and each person's attendance. Used by the
 * student, faculty, admin and emailed review views alike.
 */
export function QuickWorkRecordDetails({ log, evidence }: { log: QuickWorkLog; evidence?: ReactNode }) {
    const present = log.participants.filter((p) => p.present);
    const teamMinutes = present.reduce((a, p) => a + (p.minutes || 0), 0);
    const partners = log.partnerDetails ?? (log.partners ?? []).map((name) => ({ name, email: null, contact: null }));
    const reach = (email?: string | null, contact?: string | null) =>
        [email, contact ? formatInternationalPhoneDisplay(contact) : ""].filter(Boolean).join(" · ");
    return (
        <div className="my-3.5 text-[#16313d]">
            <section className="relative overflow-hidden rounded-2xl bg-[linear-gradient(125deg,#104a4b,#146e71)] p-5 text-white [print-color-adjust:exact] sm:p-6">
                <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full border border-white/10" />
                <p className="text-[10px] font-extrabold uppercase tracking-[1.35px] text-[#e4d9a2]">CIEL PK · Quick Community Impact Log</p>
                <h3 className="mt-3 break-words text-[21px] font-bold leading-tight sm:text-[25px]">{log.title || "Untitled activity"}</h3>
                <p className="mt-2 text-xs text-[#d5eae7]">
                    {[activityLabel(log) || "Community activity", shortDate(log.activityDate), log.university].filter(Boolean).join(" · ")}
                </p>
                <span className="mt-3.5 inline-flex items-center gap-1.5 rounded-[7px] bg-[#d4f4dc] px-2.5 py-1.5 text-[11px] font-bold text-[#0c4b4c]">
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#0c4b4c]" />
                    {STATUS_LABEL[log.status] ?? log.status}
                </span>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/20 pt-3.5">
                    <FlashStat value={`${formatHours(teamMinutes)} h`} label="Team person-hours" />
                    <FlashStat value={String(present.length)} label="Participants" />
                    <FlashStat value={log.sdg ? `SDG ${log.sdg}` : "—"} label="SDG linkage" />
                </div>
            </section>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <section className="min-w-0 rounded-[10px] border border-[#dfe9e8] p-4">
                    <h4 className="mb-1.5 text-[15px] font-semibold">Activity & coordinating faculty</h4>
                    <FlashRow label="Activity">
                        {activityLabel(log) || "—"}
                        {log.sdg ? <span className="block text-xs text-[#617980]">SDG {log.sdg} · {SDG_NAMES[log.sdg - 1] ?? ""}</span> : null}
                    </FlashRow>
                    <FlashRow label="Date & time">
                        {shortDate(log.activityDate)} · {log.startTime || "—"}–{log.endTime || "—"} PKT
                    </FlashRow>
                    <FlashRow label="Venue / host">
                        {log.location || "—"} · {log.host || "No host added"}
                        {log.host && (log.hostEmail || log.hostContact) ? (
                            <span className="block text-xs text-[#617980]">{reach(log.hostEmail, log.hostContact)}</span>
                        ) : null}
                        {log.locationPin ? (
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(log.locationPin)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-0.5 block text-xs font-semibold text-[#0e7d74] underline underline-offset-[3px]"
                            >
                                View pin on map ↗
                            </a>
                        ) : null}
                    </FlashRow>
                    {partners.length ? (
                        <FlashRow label="Partner organisations">
                            {partners.map((p) => (
                                <span key={p.name} className="block">
                                    {p.name}
                                    {p.email || p.contact ? <span className="text-xs text-[#617980]"> · {reach(p.email, p.contact)}</span> : null}
                                </span>
                            ))}
                        </FlashRow>
                    ) : null}
                    <FlashRow label="Faculty reviewer">
                        {log.facultyName || "—"}
                        {log.facultyEmail ? <span className="break-all"> · {log.facultyEmail}</span> : null}
                    </FlashRow>
                    <FlashRow label="University">
                        {log.university || "—"} · {log.department || "—"}
                    </FlashRow>
                    <FlashRow label="People reached">{log.peopleReached != null ? String(log.peopleReached) : "Not recorded"}</FlashRow>
                    <FlashRow label="Visibility" last>
                        {log.visibility}
                    </FlashRow>
                </section>

                <section className="min-w-0 rounded-[10px] border border-[#dfe9e8] p-4">
                    <h4 className="mb-2 text-[15px] font-semibold">Activity conducted</h4>
                    <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">{log.summary || "Not provided yet."}</p>
                    <p className="mt-3.5 rounded-[9px] bg-[#ecf6f6] px-3 py-3 text-xs text-[#48686e]">
                        <b>Declarations:</b> Evidence consent {log.consent ? "✓" : "pending"} · Accurate attendance {log.honest ? "✓" : "pending"}
                    </p>
                    <h4 className="mt-4 text-[15px] font-semibold">Evidence ({log.evidence.length})</h4>
                    {evidence ?? (log.evidence.length ? null : <p className="mt-1 text-xs text-[#617980]">No evidence yet.</p>)}
                </section>
            </div>

            <section className="mt-4 rounded-[10px] border border-[#dfe9e8] p-4">
                <h4 className="mb-2 text-[15px] font-semibold">Individual participation & attendance</h4>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] border-collapse text-left text-xs">
                        <thead>
                            <tr className="bg-[#f4f8f9] text-[11px] text-[#617980]">
                                <th className="px-2 py-2.5 font-semibold">Student</th>
                                <th className="px-2 py-2.5 font-semibold">Student ID</th>
                                <th className="px-2 py-2.5 font-semibold">Time</th>
                                <th className="px-2 py-2.5 font-semibold">Break</th>
                                <th className="px-2 py-2.5 font-semibold">Hours</th>
                            </tr>
                        </thead>
                        <tbody>
                            {log.participants.map((p) => (
                                <tr key={p.id} className="border-b border-[#dfe9e8]">
                                    <td className="px-2 py-3">
                                        <span className="font-semibold">{p.name || p.email || "—"}</span>
                                        {p.email || p.contact || p.isLead ? (
                                            <small className="block text-[11px] text-[#617980]">
                                                {[p.email, p.contact ? formatInternationalPhoneDisplay(p.contact) : "", p.isLead ? "Lead" : ""]
                                                    .filter(Boolean)
                                                    .join(" · ")}
                                            </small>
                                        ) : null}
                                    </td>
                                    <td className="px-2 py-3">{p.studentId || "—"}</td>
                                    <td className="px-2 py-3">{p.present ? `${p.startTime ?? "—"}–${p.endTime ?? "—"}` : "Absent"}</td>
                                    <td className="px-2 py-3">{p.present ? p.breakMinutes : 0} min</td>
                                    <td className="whitespace-nowrap px-2 py-3 font-bold text-[#0e7d74]">{formatHours(p.minutes)} h</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

function FlashStat({ value, label }: { value: string; label: string }) {
    return (
        <div className="min-w-0">
            <b className="block break-words text-lg leading-tight text-[#e5f0b9] sm:text-[22px]">{value}</b>
            <span className="text-[10px] text-[#cee3e1]">{label}</span>
        </div>
    );
}

function FlashRow({ label, children, last = false }: { label: string; children: ReactNode; last?: boolean }) {
    return (
        <div className={`grid grid-cols-[110px_minmax(0,1fr)] gap-2 py-2 text-[13px] sm:grid-cols-[150px_minmax(0,1fr)] ${last ? "" : "border-b border-[#eff3f2]"}`}>
            <span className="font-semibold text-[#617980]">{label}</span>
            <span className="min-w-0 break-words">{children}</span>
        </div>
    );
}

export function EvidenceGallery({ evidence }: { evidence: QuickWorkEvidence[] }) {
    if (!evidence.length) return null;
    return (
        <div className="my-4 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3">
            {evidence.map((e, i) => (
                <EvidenceTile key={`${i}-${e.name}`} item={e} />
            ))}
        </div>
    );
}
