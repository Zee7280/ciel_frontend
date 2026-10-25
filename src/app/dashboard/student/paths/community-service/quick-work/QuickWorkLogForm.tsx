"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { apiMessages, QUICK_WORK_HREF, QUICK_WORK_PRESIGN_PATH, quickWorkApi } from "@/utils/quickWorkApi";
import { uploadFileViaPresign } from "@/utils/presignedFileUpload";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { facultyDepartmentOptionsForInstitution } from "@/utils/universityData";
import { compressImageForUpload } from "@/utils/compressImageForUpload";
import {
    activityErrors,
    activityLabel,
    attendanceErrors,
    attendanceFor,
    attendanceMinutes,
    EMAIL_RE,
    emptyAttendance,
    evidenceErrors,
    evidenceTypeOf,
    facultyConfirmationErrors,
    formatHours,
    formFromLog,
    formPeople,
    joinErrors,
    payloadFromForm,
    pktNow,
    QUICK_WORK_ACTIVITY_TYPES,
    QUICK_WORK_EVIDENCE_ACCEPT,
    QUICK_WORK_EVIDENCE_HINT,
    QUICK_WORK_MAX_EVIDENCE,
    QUICK_WORK_MAX_DAILY_MINUTES,
    QUICK_WORK_MAX_EVIDENCE_BYTES,
    QUICK_WORK_MAX_PARTICIPANTS,
    QUICK_WORK_MAX_PARTNERS,
    QUICK_WORK_OTHER_ACTIVITY,
    QUICK_WORK_SUMMARY_MAX,
    QUICK_WORK_TEMPLATES,
    QUICK_WORK_VISIBILITY,
    SDG_NAMES,
    shortDate,
    teamErrors,
    type QuickWorkForm,
    type QuickWorkLog,
} from "@/utils/quickWorkRules";
import {
    EvidenceTile,
    ModalClose,
    PhotoIcon,
    QuickWorkModal,
    QuickWorkRecordDetails,
    QuickWorkStatusPill,
} from "@/components/ciel/community-service/quick-work/QuickWorkShared";
import { useQuickWorkRoutes } from "@/components/ciel/community-service/quick-work/QuickWorkRoutes";

const LocationPicker = dynamic(() => import("@/components/ui/LocationPicker"), {
    ssr: false,
    loading: () => (
        <div className="flex h-[180px] w-full animate-pulse items-center justify-center rounded-lg bg-[#f4f8f9] text-xs text-[#6b7c86]">Loading map…</div>
    ),
});

const HUB = "/dashboard/student/paths/community-service";
const MAX_EVIDENCE_MB = Math.round(QUICK_WORK_MAX_EVIDENCE_BYTES / (1024 * 1024));
const STEPS = ["Team & faculty", "Activity details", "Attendance", "Evidence & submit"] as const;
const PHONE_RE = /^\+?[0-9][0-9\s()-]{6,28}$/;

const inputCls =
    "w-full min-w-0 rounded-lg border border-[#d3e3e6] bg-white px-3 py-2.5 text-[13px] text-[#16313d] outline-none focus:border-[#0e7d74] focus:ring-2 focus:ring-[#0e7d74]/30 disabled:bg-[#f4f7f8] disabled:text-[#6b7c86]";
const btnCls =
    "inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#cbe3e0] bg-white px-4 py-2.5 text-xs font-semibold text-[#0e7d74] hover:bg-[#f2faf9] disabled:cursor-not-allowed disabled:opacity-50";
const primaryCls =
    "inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#0e7d74] bg-[#0e7d74] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0b6760] disabled:cursor-not-allowed disabled:opacity-50";

function Field({ id, label, optional, required, children, full }: { id: string; label: string; optional?: boolean; required?: boolean; children: ReactNode; full?: boolean }) {
    return (
        <div className={full ? "sm:col-span-2" : undefined}>
            <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-[#16313d]">
                {label}
                {required ? <span className="text-[#0e7d74]"> *</span> : null}
                {optional ? <span className="font-normal text-[#6b7c86]"> (optional)</span> : null}
            </label>
            {children}
        </div>
    );
}

export default function QuickWorkLogForm({ logId }: { logId: string }) {
    const router = useRouter();
    const routes = useQuickWorkRoutes(() => router.push(`${HUB}#structured-tools`));
    const [log, setLog] = useState<QuickWorkLog | null>(null);
    const [form, setForm] = useState<QuickWorkForm | null>(null);
    const [step, setStep] = useState(1);
    const [errors, setErrors] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [preview, setPreview] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [confirmSolo, setConfirmSolo] = useState(false);
    const [mate, setMate] = useState({ name: "", email: "", studentId: "", contact: "" });
    const [partnerDraft, setPartnerDraft] = useState("");
    const [uploading, setUploading] = useState(0);
    const errorBox = useRef<HTMLDivElement>(null);
    const panel = useRef<HTMLElement>(null);
    const loadedId = useRef<string | null>(null);
    /** Faculty this student named on earlier logs, offered as suggestions in Step 1. */
    const [pastFaculty, setPastFaculty] = useState<{ name: string; email: string }[]>([]);

    /* ---------------------------------------------------------------- load */

    useEffect(() => {
        if (loadedId.current && loadedId.current === logId) return;
        let cancelled = false;
        (async () => {
            try {
                let l: QuickWorkLog;
                if (logId === "new") {
                    // Reuse an untouched draft instead of leaving a new empty one behind on every visit.
                    const mine = await quickWorkApi.mine();
                    const blank = mine.logs.find(
                        (x) => x.isLead && x.status === "draft" && !x.title.trim() && x.participants.length === 1 && !x.evidence.length,
                    );
                    l = blank ?? (await quickWorkApi.create({ activityDate: pktNow().date }));
                } else {
                    l = await quickWorkApi.get(logId);
                }
                if (cancelled) return;
                loadedId.current = l.id;
                setLog(l);
                setForm(formFromLog(l));
                if (logId === "new") router.replace(`${QUICK_WORK_HREF}?log=${encodeURIComponent(l.id)}`);
            } catch (e) {
                if (!cancelled) setLoadError(apiMessages(e).join(" "));
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [logId, router]);

    useEffect(() => {
        let cancelled = false;
        quickWorkApi
            .mine()
            .then(({ logs }) => {
                if (cancelled) return;
                const seen = new Map<string, { name: string; email: string }>();
                for (const l of logs) {
                    const email = l.facultyEmail.trim().toLowerCase();
                    if (email && !seen.has(email)) seen.set(email, { name: l.facultyName.trim(), email });
                }
                setPastFaculty(Array.from(seen.values()));
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!dirty) return;
        const warn = (e: BeforeUnloadEvent) => {
            e.preventDefault();
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);

    const showErrors = useCallback((list: string[]) => {
        setErrors(list);
        if (list.length) requestAnimationFrame(() => errorBox.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
    }, []);

    const patch = (p: Partial<QuickWorkForm>) => {
        setForm((f) => (f ? { ...f, ...p } : f));
        setDirty(true);
    };
    const setAttendance = (email: string, p: Partial<ReturnType<typeof emptyAttendance>>) => {
        setForm((f) => (f ? { ...f, attendance: { ...f.attendance, [email]: { ...attendanceFor(f, email), ...p } } } : f));
        setDirty(true);
    };

    /** Saves the draft; on success keeps the server's view of the team (names, join status). */
    const persist = async (next: QuickWorkForm | null = form): Promise<QuickWorkLog | null> => {
        if (!log || !next) return null;
        setSaving(true);
        try {
            const saved = await quickWorkApi.save(log.id, payloadFromForm(next));
            const fresh = formFromLog(saved);
            setLog(saved);
            setForm((f) => (f ? { ...f, teammates: fresh.teammates, leadName: fresh.leadName, leadEmail: fresh.leadEmail } : fresh));
            setDirty(false);
            setErrors([]);
            return saved;
        } catch (e) {
            showErrors(apiMessages(e));
            return null;
        } finally {
            setSaving(false);
        }
    };

    if (loadError) {
        return (
            <div className="mx-auto max-w-[760px] py-10 text-[#16313d]">
                <div role="alert" className="rounded-[9px] border border-[#edccc5] bg-[#fff0ed] px-4 py-3 text-sm text-[#9b3832]">
                    {loadError}
                </div>
                <Link href={QUICK_WORK_HREF} className={`${btnCls} mt-4`}>
                    ← Quick Impact Log
                </Link>
            </div>
        );
    }
    if (!log || !form) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-[#6b7c86]" />
            </div>
        );
    }

    if (!log.isLead || (log.status !== "draft" && log.status !== "changes")) {
        return (
            <div className="mx-auto max-w-[760px] py-10 text-[#16313d]">
                <h1 className="text-2xl font-semibold">{log.title || "Quick Community Work log"}</h1>
                <div className="mt-3">
                    <QuickWorkStatusPill status={log.status} />
                </div>
                <p className="mt-3 text-sm text-[#6b7c86]">
                    {log.isLead ? "This log has been submitted, so it can no longer be edited." : "Only the activity lead can edit this log."}
                </p>
                <Link href={QUICK_WORK_HREF} className={`${btnCls} mt-4`}>
                    ← Quick Impact Log
                </Link>
            </div>
        );
    }

    /* ---------------------------------------------------------------- actions */

    const stepCheck = [teamErrors, activityErrors, (f: QuickWorkForm) => attendanceErrors(f)] as const;

    const goTo = async (target: number) => {
        if (target === step) return;
        if (dirty) await persist();
        setErrors([]);
        setStep(target);
        panel.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const next = async () => {
        const e = stepCheck[step - 1](form);
        if (e.length) return showErrors(e);
        if (await persist()) {
            setStep(step + 1);
            panel.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    const review = async () => {
        const e = [...teamErrors(form), ...activityErrors(form), ...attendanceErrors(form), ...evidenceErrors(form), ...joinErrors(form)];
        if (e.length) return showErrors(Array.from(new Set(e)));
        const saved = await persist();
        if (!saved) return;
        const waiting = facultyConfirmationErrors(saved);
        if (waiting.length) return showErrors(waiting);
        setPreview(true);
    };

    const resendFacultyRequest = async () => {
        try {
            setLog(await quickWorkApi.resendFacultyRequest(log.id));
            toast.success(`Request sent to ${log.facultyEmail} again.`);
        } catch (e) {
            toast.error(apiMessages(e).join(" "));
        }
    };

    const checkFaculty = async () => {
        try {
            const fresh = await quickWorkApi.get(log.id);
            setLog(fresh);
            if (fresh.facultyConfirmation === log.facultyConfirmation) toast.info("No answer from the faculty member yet.");
        } catch (e) {
            toast.error(apiMessages(e).join(" "));
        }
    };

    const submit = async () => {
        setSubmitting(true);
        try {
            await quickWorkApi.submit(log.id);
            setDirty(false);
            toast.success("Quick-work log submitted. Hours remain pending until faculty approval.");
            router.push(QUICK_WORK_HREF);
        } catch (e) {
            setPreview(false);
            showErrors(apiMessages(e));
        } finally {
            setSubmitting(false);
        }
    };

    const addMate = async () => {
        const name = mate.name.trim();
        const email = mate.email.trim().toLowerCase();
        const studentId = mate.studentId.trim();
        const contact = mate.contact.trim();
        if (!name || !EMAIL_RE.test(email) || !studentId) return toast.error("Enter the teammate's name, a valid email and their student ID.");
        if (contact && !PHONE_RE.test(contact)) return toast.error("Enter the contact as a phone number, e.g. +92 300 1234567.");
        if (formPeople(form).length >= QUICK_WORK_MAX_PARTICIPANTS) return toast.error(`This log allows up to ${QUICK_WORK_MAX_PARTICIPANTS} participants.`);
        if (formPeople(form).some((p) => p.email === email || p.studentId.trim().toLowerCase() === studentId.toLowerCase())) {
            return toast.error("That email or student ID is already on this team.");
        }
        const nextForm: QuickWorkForm = {
            ...form,
            mode: "team",
            teammates: [...form.teammates, { email, studentId, name, contact, joinStatus: "invited" }],
            attendance: { ...form.attendance, [email]: attendanceFor(form, email) },
        };
        setForm(nextForm);
        if (await persist(nextForm)) {
            setMate({ name: "", email: "", studentId: "", contact: "" });
            toast.success("Join request sent. They confirm from their Quick Impact Log page.");
        } else {
            setForm((f) => (f ? { ...f, teammates: f.teammates.filter((t) => t.email !== email) } : f));
        }
    };

    const removeMate = async (email: string) => {
        const nextForm = { ...form, teammates: form.teammates.filter((t) => t.email !== email) };
        setForm(nextForm);
        await persist(nextForm);
    };

    const refreshTeam = async () => {
        try {
            const fresh = formFromLog(await quickWorkApi.get(log.id));
            setForm((f) => (f ? { ...f, teammates: fresh.teammates } : f));
        } catch (e) {
            toast.error(apiMessages(e).join(" "));
        }
    };

    const switchMode = async (mode: "solo" | "team") => {
        if (mode === form.mode) return;
        if (mode === "solo" && form.teammates.length) return setConfirmSolo(true);
        patch({ mode });
    };

    const addPartner = () => {
        const name = partnerDraft.trim();
        if (!name) return;
        if (form.partners.some((p) => p.toLowerCase() === name.toLowerCase())) return toast.error("That partner is already added.");
        if (form.partners.length >= QUICK_WORK_MAX_PARTNERS) return toast.error(`Add up to ${QUICK_WORK_MAX_PARTNERS} partners.`);
        patch({ partners: [...form.partners, name] });
        setPartnerDraft("");
    };

    const applyEventTimes = () => {
        if (activityErrors(form).length) return toast.error("Set a valid activity time window in Step 2 first.");
        const attendance = { ...form.attendance };
        for (const p of formPeople(form)) {
            const a = attendanceFor(form, p.email);
            if (a.present) attendance[p.email] = { ...a, startTime: form.startTime, endTime: form.endTime, breakMinutes: "0" };
        }
        patch({ attendance });
    };

    const addFiles = async (files: File[]) => {
        let evidence = [...form.evidence];
        for (const original of files) {
            if (evidence.length >= QUICK_WORK_MAX_EVIDENCE) {
                toast.error(`Use up to ${QUICK_WORK_MAX_EVIDENCE} evidence files per activity.`);
                break;
            }
            setUploading((n) => n + 1);
            try {
                // Some phones and Windows report no type (or an alias) for HEIC / JPEG; use the extension.
                const type = evidenceTypeOf(original);
                if (!type) {
                    toast.error(`${original.name}: use a photo, PDF, Word, Excel, PowerPoint, text, video or audio file.`);
                    continue;
                }
                const typed = type === original.type ? original : new File([original], original.name, { type, lastModified: original.lastModified });
                const file = await compressImageForUpload(typed);
                if (file.size > QUICK_WORK_MAX_EVIDENCE_BYTES) {
                    toast.error(`${original.name} exceeds ${MAX_EVIDENCE_MB} MB.`);
                    continue;
                }
                const url = await uploadFileViaPresign(QUICK_WORK_PRESIGN_PATH, file);
                evidence = [...evidence, { url, name: file.name, type: file.type, size: file.size, caption: "" }];
                setForm((f) => (f ? { ...f, evidence } : f));
            } catch (e) {
                toast.error((e as Error).message || `Could not upload ${original.name}.`);
            } finally {
                setUploading((n) => n - 1);
            }
        }
        await persist({ ...form, evidence });
    };

    /* ---------------------------------------------------------------- render */

    const people = formPeople(form);
    const teamMinutes = people.reduce((a, p) => a + attendanceMinutes(attendanceFor(form, p.email)), 0);
    const myMinutes = attendanceMinutes(attendanceFor(form, form.leadEmail));
    const today = pktNow().date;

    return (
        <div className="mx-auto min-w-0 max-w-[1280px] pb-16 text-[#16313d]">
            <Link href={QUICK_WORK_HREF} className="text-xs font-semibold text-[#0e7d74] underline underline-offset-[3px]">
                ← Quick Impact Log
            </Link>
            <section className="flex flex-wrap items-end justify-between gap-3 pb-5 pt-4">
                <div className="min-w-0">
                    <h1 className="break-words text-[21px] font-semibold leading-tight">{form.title.trim() || "Quick Community Work Log"}</h1>
                    <p className="mt-1 text-[13px] text-[#6b7c86]">
                        {log.status === "changes" ? "Changes requested" : "Draft"} · started {shortDate(log.createdAt.slice(0, 10))}
                        {log.facultyName ? ` · faculty: ${log.facultyName}` : ""}
                    </p>
                </div>
                <button type="button" onClick={routes.openCompare} className="text-xs font-semibold text-[#0e7d74] underline underline-offset-[3px]">
                    Which route should I use?
                </button>
            </section>

            {log.status === "changes" && log.reviewNote ? (
                <div className="mb-4 rounded-lg bg-[#fff6e5] px-3.5 py-3 text-[13px] leading-relaxed text-[#79571c]">
                    <b>{log.facultyName || "Faculty"} asked for changes:</b> {log.reviewNote}
                </div>
            ) : null}

            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_290px] lg:gap-6">
                <section ref={panel} className="scroll-mt-20 overflow-hidden rounded-2xl border border-[#dcebee] bg-white shadow-[0_3px_12px_#16313d12]">
                    <div aria-label="Form steps" className="grid grid-cols-4 gap-1.5 border-b border-[#dcebee] bg-[#f8fbfc] px-2 py-3 sm:px-4 sm:py-4">
                        {STEPS.map((label, i) => {
                            const active = step === i + 1;
                            return (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => void goTo(i + 1)}
                                    aria-current={active ? "step" : undefined}
                                    className={`flex flex-col items-center gap-1 p-1 text-center text-[11px] font-semibold sm:flex-row sm:text-left sm:text-xs ${active ? "text-[#0e7d74]" : "text-[#6b7c86]"}`}
                                >
                                    <span
                                        className={`grid h-[26px] w-[26px] flex-none place-items-center rounded-full border ${active ? "border-[#0e7d74] bg-[#0e7d74] text-white" : "border-[#dcebee] bg-white"}`}
                                    >
                                        {i + 1}
                                    </span>
                                    <span>{label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="px-4 py-5 sm:px-7 sm:py-6">
                        {errors.length ? (
                            <div ref={errorBox} role="alert" className="mb-4 rounded-[9px] border border-[#edccc5] bg-[#fff0ed] px-4 py-3 text-xs text-[#9b3832]">
                                <b>Please check the following:</b>
                                <ul className="mt-1 list-disc pl-4">
                                    {errors.map((x) => (
                                        <li key={x}>{x}</li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}

                        {step === 1 ? (
                            <>
                                <StepHead title="Who’s taking part?" n={1} intro="Add yourself, your teammates and one coordinating faculty member." />
                                <div className="mb-4 inline-flex rounded-lg border border-[#dcebee] bg-[#eef4f5] p-[3px]" aria-label="Participation mode">
                                    {(["solo", "team"] as const).map((m) => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => void switchMode(m)}
                                            aria-pressed={form.mode === m}
                                            className={`rounded-[5px] px-4 py-1.5 text-xs ${form.mode === m ? "bg-white font-semibold text-[#16313d] shadow-[0_1px_4px_#16313d1a]" : "text-[#6b7c86]"}`}
                                        >
                                            {m === "solo" ? "Just me" : "With a team"}
                                        </button>
                                    ))}
                                </div>
                                <h3 className="mb-3 text-[15px] font-semibold">You · Activity lead</h3>
                                <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
                                    <Field id="qwLeadName" label="Full name">
                                        <input id="qwLeadName" className={inputCls} value={form.leadName} disabled />
                                    </Field>
                                    <Field id="qwLeadEmail" label="University email">
                                        <input id="qwLeadEmail" className={inputCls} value={form.leadEmail} disabled />
                                    </Field>
                                    <Field id="qwLeadSid" label="Student ID" required>
                                        <input
                                            id="qwLeadSid"
                                            className={inputCls}
                                            value={form.leadStudentId}
                                            maxLength={60}
                                            placeholder="Your registration number"
                                            onChange={(e) => patch({ leadStudentId: e.target.value })}
                                        />
                                    </Field>
                                    <Field id="qwUni" label="University" required>
                                        <input id="qwUni" className={inputCls} value={form.university} maxLength={120} placeholder="Your university" onChange={(e) => patch({ university: e.target.value })} />
                                    </Field>
                                    <Field id="qwDept" label="Department / programme" required>
                                        <SearchableSelect
                                            value={form.department}
                                            onChange={(department) => patch({ department: department.slice(0, 120) })}
                                            options={facultyDepartmentOptionsForInstitution(form.university)}
                                            placeholder="Select your department"
                                            searchPlaceholder="Search departments…"
                                            ariaLabel="Department / programme"
                                            variant="field"
                                        />
                                    </Field>
                                </div>
                                <p className="mt-2 text-xs text-[#6b7c86]">Your name and email come from your CIEL profile.</p>

                                {form.mode === "team" ? (
                                    <>
                                        <hr className="my-6 border-[#dcebee]" />
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <h3 className="text-[15px] font-semibold">Teammates</h3>
                                            <div className="flex items-center gap-3">
                                                <small className="text-xs text-[#6b7c86]">
                                                    {people.length} / {QUICK_WORK_MAX_PARTICIPANTS} members, including you
                                                </small>
                                                {form.teammates.length ? (
                                                    <button type="button" onClick={() => void refreshTeam()} className="text-xs font-semibold text-[#0e7d74] underline">
                                                        Refresh
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                        {form.teammates.length ? (
                                            form.teammates.map((t) => (
                                                <div key={t.email} className="my-2 flex flex-wrap items-center gap-2.5 rounded-[9px] border border-[#dcebee] p-3">
                                                    <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#e6f6f4] font-bold text-[#0e7d74]">
                                                        {(t.name || t.email).slice(0, 1).toUpperCase()}
                                                    </span>
                                                    <div className="min-w-[60%] flex-1 sm:min-w-0">
                                                        <b className="block break-words text-[13px]">{t.name || t.email}</b>
                                                        <small className="block break-words text-xs text-[#6b7c86]">
                                                            {t.email} · {t.studentId || "Student ID needed"}
                                                            {t.contact ? ` · ${t.contact}` : ""}
                                                        </small>
                                                    </div>
                                                    <span
                                                        className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold ${
                                                            t.joinStatus === "joined"
                                                                ? "bg-[#e6f6f4] text-[#0e7d74]"
                                                                : t.joinStatus === "declined"
                                                                  ? "bg-[#fae9e7] text-[#ac3c3c]"
                                                                  : "bg-[#fff5de] text-[#916b21]"
                                                        }`}
                                                    >
                                                        {t.joinStatus === "joined" ? "Joined" : t.joinStatus === "declined" ? "Declined" : "Waiting for confirmation"}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => void removeMate(t.email)}
                                                        disabled={saving}
                                                        aria-label={`Remove ${t.name || t.email}`}
                                                        className="p-1 text-xs text-[#6b7c86] hover:text-[#ac3c3c]"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-[#6b7c86]">Add each participant once. Their hours will appear on their own Quick Impact Log page.</p>
                                        )}
                                        <div className="mt-3 rounded-[10px] border border-dashed border-[#a8d3cd] bg-[#f8fbfc] p-3.5">
                                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:items-end">
                                                <Field id="qwMateName" label="Teammate’s full name" required>
                                                    <input
                                                        id="qwMateName"
                                                        className={inputCls}
                                                        maxLength={100}
                                                        placeholder="Full name"
                                                        value={mate.name}
                                                        onChange={(e) => setMate((m) => ({ ...m, name: e.target.value }))}
                                                    />
                                                </Field>
                                                <Field id="qwMateEmail" label="Teammate’s CIEL account email" required>
                                                    <input
                                                        id="qwMateEmail"
                                                        type="email"
                                                        className={inputCls}
                                                        maxLength={120}
                                                        placeholder="teammate@university.edu.pk"
                                                        value={mate.email}
                                                        onChange={(e) => setMate((m) => ({ ...m, email: e.target.value }))}
                                                    />
                                                </Field>
                                                <Field id="qwMateSid" label="Student ID" required>
                                                    <input
                                                        id="qwMateSid"
                                                        className={inputCls}
                                                        maxLength={60}
                                                        placeholder="Registration number"
                                                        value={mate.studentId}
                                                        onChange={(e) => setMate((m) => ({ ...m, studentId: e.target.value }))}
                                                    />
                                                </Field>
                                                <Field id="qwMateContact" label="Contact number" optional>
                                                    <input
                                                        id="qwMateContact"
                                                        type="tel"
                                                        className={inputCls}
                                                        maxLength={30}
                                                        placeholder="+92 300 1234567"
                                                        value={mate.contact}
                                                        onChange={(e) => setMate((m) => ({ ...m, contact: e.target.value }))}
                                                    />
                                                </Field>
                                            </div>
                                            <button type="button" onClick={() => void addMate()} disabled={saving} className={`${btnCls} mt-2.5 w-full sm:w-auto`}>
                                                + Add teammate
                                            </button>
                                            <p className="mt-2 text-xs text-[#6b7c86]">
                                                Teammates need a CIEL student account. They get a join request and confirm from their own Quick Impact Log page;
                                                you can submit once everyone has confirmed.
                                            </p>
                                        </div>
                                    </>
                                ) : null}

                                <hr className="my-6 border-[#dcebee]" />
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <h3 className="text-[15px] font-semibold">Coordinating faculty</h3>
                                    <span className="rounded-md bg-[#e6f6f4] px-2.5 py-1.5 text-[11px] font-semibold text-[#0e7d74]">Required approver</span>
                                </div>
                                <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
                                    <Field id="qwFaculty" label="Faculty member’s name" required>
                                        <input
                                            id="qwFaculty"
                                            className={inputCls}
                                            value={form.facultyName}
                                            maxLength={100}
                                            placeholder="Full name"
                                            list={pastFaculty.length ? "qwPastFacultyNames" : undefined}
                                            onChange={(e) => {
                                                const name = e.target.value;
                                                const known = pastFaculty.find((f) => f.name && f.name === name);
                                                patch(known && !form.facultyEmail.trim() ? { facultyName: name, facultyEmail: known.email } : { facultyName: name });
                                            }}
                                        />
                                    </Field>
                                    <Field id="qwFacultyEmail" label="Faculty university email" required>
                                        <input
                                            id="qwFacultyEmail"
                                            type="email"
                                            className={inputCls}
                                            value={form.facultyEmail}
                                            maxLength={120}
                                            placeholder="faculty@university.edu.pk"
                                            list={pastFaculty.length ? "qwPastFacultyEmails" : undefined}
                                            onChange={(e) => {
                                                const email = e.target.value;
                                                const known = pastFaculty.find((f) => f.email === email.trim().toLowerCase());
                                                patch(known && !form.facultyName.trim() ? { facultyEmail: email, facultyName: known.name } : { facultyEmail: email });
                                            }}
                                        />
                                    </Field>
                                </div>
                                {pastFaculty.length ? (
                                    <>
                                        <datalist id="qwPastFacultyNames">
                                            {pastFaculty.filter((f) => f.name).map((f) => (
                                                <option key={f.email} value={f.name} />
                                            ))}
                                        </datalist>
                                        <datalist id="qwPastFacultyEmails">
                                            {pastFaculty.map((f) => (
                                                <option key={f.email} value={f.email}>
                                                    {f.name}
                                                </option>
                                            ))}
                                        </datalist>
                                    </>
                                ) : null}
                                <FacultyRequestStatus
                                    log={log}
                                    typedEmail={form.facultyEmail}
                                    onResend={() => void resendFacultyRequest()}
                                    onCheck={() => void checkFaculty()}
                                />
                                <p className="mt-2.5 text-xs text-[#6b7c86]">
                                    When you save, this faculty member is emailed a request to coordinate your activity. You can submit only after they
                                    accept and every teammate confirms; they then review your completed work from their CIEL dashboard.
                                </p>
                            </>
                        ) : null}

                        {step === 2 ? (
                            <>
                                <StepHead title="What’s the activity?" n={2} intro="A brief event record is enough. Start with a type, then add the details." />
                                <div className="mb-5 flex flex-wrap gap-1.5">
                                    {QUICK_WORK_TEMPLATES.map((t) => {
                                        const other = t.type === QUICK_WORK_OTHER_ACTIVITY;
                                        const active = form.activityType === t.type;
                                        return (
                                            <button
                                                key={t.label}
                                                type="button"
                                                aria-pressed={active}
                                                onClick={() => {
                                                    // “Other” has no meaningful default title or SDG, so keep what the student has.
                                                    patch(other ? { activityType: t.type } : { activityType: t.type, title: form.title || t.type, sdg: t.sdg ? String(t.sdg) : "" });
                                                    if (other) requestAnimationFrame(() => document.getElementById("qwTypeOther")?.focus());
                                                }}
                                                className={`rounded-md border px-2.5 py-1.5 text-xs hover:border-[#0e7d74] hover:text-[#0e7d74] ${
                                                    active ? "border-[#0e7d74] bg-[#e6f6f4] font-semibold text-[#0e7d74]" : "border-[#dcebee] bg-[#f4f8f9] text-[#6b7c86]"
                                                }`}
                                            >
                                                {other ? "+ Other" : t.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
                                    <Field id="qwTitle" label="Activity title" required full>
                                        <input id="qwTitle" className={inputCls} value={form.title} maxLength={120} placeholder="e.g. Pinktober awareness circle" onChange={(e) => patch({ title: e.target.value })} />
                                    </Field>
                                    <Field id="qwType" label="Activity type" required>
                                        <select id="qwType" className={inputCls} value={form.activityType} onChange={(e) => patch({ activityType: e.target.value })}>
                                            <option value="">Choose activity type</option>
                                            {QUICK_WORK_ACTIVITY_TYPES.map((t) => (
                                                <option key={t}>{t}</option>
                                            ))}
                                        </select>
                                    </Field>
                                    {form.activityType === QUICK_WORK_OTHER_ACTIVITY ? (
                                        <Field id="qwTypeOther" label="Describe the activity type" required>
                                            <input
                                                id="qwTypeOther"
                                                className={inputCls}
                                                value={form.activityTypeOther}
                                                maxLength={60}
                                                placeholder="e.g. Blood donation camp"
                                                onChange={(e) => patch({ activityTypeOther: e.target.value })}
                                            />
                                        </Field>
                                    ) : null}
                                    <Field id="qwDate" label="Activity date" required>
                                        <input id="qwDate" type="date" className={inputCls} value={form.activityDate} max={today} onChange={(e) => patch({ activityDate: e.target.value })} />
                                    </Field>
                                    <Field id="qwStart" label="Starts at" required>
                                        <input id="qwStart" type="time" className={inputCls} value={form.startTime} onChange={(e) => patch({ startTime: e.target.value })} />
                                    </Field>
                                    <Field id="qwEnd" label="Ends at" required>
                                        <input id="qwEnd" type="time" className={inputCls} value={form.endTime} onChange={(e) => patch({ endTime: e.target.value })} />
                                    </Field>
                                    <Field id="qwLocation" label="Location / venue" required full>
                                        <input
                                            id="qwLocation"
                                            className={inputCls}
                                            value={form.location}
                                            maxLength={180}
                                            placeholder="Venue and city, or online platform"
                                            onChange={(e) => patch({ location: e.target.value })}
                                        />
                                    </Field>
                                    <Field id="qwLocationPin" label="Pin on map" optional full>
                                        <div id="qwLocationPin" className="min-w-0 rounded-lg border border-[#d3e3e6] bg-white p-3">
                                            <LocationPicker
                                                initialLocation={pinLatLng(form.locationPin)}
                                                onLocationSelect={(loc) =>
                                                    patch({
                                                        location: form.location.trim() ? form.location : (loc.address ?? "").slice(0, 180),
                                                        locationPin: `${loc.lat},${loc.lng}`,
                                                    })
                                                }
                                            />
                                        </div>
                                        <p className="mt-1.5 text-xs text-[#6b7c86]">
                                            {form.locationPin ? (
                                                <>
                                                    Pinned · GPS {form.locationPin} ·{" "}
                                                    <button type="button" onClick={() => patch({ locationPin: "" })} className="font-semibold text-[#ac3c3c] underline">
                                                        Remove pin
                                                    </button>
                                                </>
                                            ) : (
                                                "Search the venue by name or drop a pin. Helps faculty verify where the work took place; skip for online activities."
                                            )}
                                        </p>
                                    </Field>
                                    <Field id="qwHost" label="Host / organisation" optional>
                                        <input id="qwHost" className={inputCls} value={form.host} maxLength={120} placeholder="If hosted by an organisation" onChange={(e) => patch({ host: e.target.value })} />
                                    </Field>
                                    <Field id="qwSdg" label="Main SDG" optional>
                                        <select id="qwSdg" className={inputCls} value={form.sdg} onChange={(e) => patch({ sdg: e.target.value })}>
                                            <option value="">Select if relevant</option>
                                            {SDG_NAMES.map((n, i) => (
                                                <option key={n} value={String(i + 1)}>
                                                    {i + 1} · {n}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field id="qwPartner" label="Partner organisations" optional full>
                                        <div className="flex gap-2">
                                            <input
                                                id="qwPartner"
                                                className={inputCls}
                                                value={partnerDraft}
                                                maxLength={120}
                                                placeholder="e.g. Edhi Foundation"
                                                disabled={form.partners.length >= QUICK_WORK_MAX_PARTNERS}
                                                onChange={(e) => setPartnerDraft(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        e.preventDefault();
                                                        addPartner();
                                                    }
                                                }}
                                            />
                                            <button type="button" onClick={addPartner} disabled={!partnerDraft.trim()} className={`${btnCls} flex-none`}>
                                                + Add
                                            </button>
                                        </div>
                                        {form.partners.length ? (
                                            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Added partners">
                                                {form.partners.map((p) => (
                                                    <li key={p} className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-[#e6f6f4] px-2.5 py-1.5 text-xs font-semibold text-[#0e7d74]">
                                                        <span className="break-words">{p}</span>
                                                        <button
                                                            type="button"
                                                            aria-label={`Remove ${p}`}
                                                            onClick={() => patch({ partners: form.partners.filter((x) => x !== p) })}
                                                            className="text-[#6b7c86] hover:text-[#ac3c3c]"
                                                        >
                                                            ×
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : null}
                                        <p className="mt-1.5 text-xs text-[#6b7c86]">
                                            Organisations you worked with on this activity. Add as many as apply (up to {QUICK_WORK_MAX_PARTNERS}).
                                        </p>
                                    </Field>
                                </div>
                                <p className="mt-3 text-xs text-[#6b7c86]">Enter the actual date and times of work already completed, in Pakistan time (PKT).</p>
                            </>
                        ) : null}

                        {step === 3 ? (
                            <>
                                <StepHead title="Record each person’s time" n={3} intro="Mark who attended, then enter their actual times. Absentees receive zero hours." />
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                    <div className="text-xs text-[#6b7c86]">
                                        {shortDate(form.activityDate)} · {form.startTime || "—"}–{form.endTime || "—"}
                                        <br />
                                        {form.location || "Set the venue in Activity details"}
                                    </div>
                                    <button type="button" onClick={applyEventTimes} className={`${btnCls} px-3 py-2 text-xs`}>
                                        Use event times for all
                                    </button>
                                </div>
                                <p className="mb-2 text-[11px] text-[#6b7c86] sm:hidden">Swipe the attendance table to see all fields →</p>
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[520px] border-collapse">
                                        <thead>
                                            <tr className="bg-[#f4f8f9] text-left text-[11px] tracking-[0.5px] text-[#6b7c86]">
                                                <th className="px-2 py-2.5 font-semibold">Participant</th>
                                                <th className="px-2 py-2.5 font-semibold">Present</th>
                                                <th className="px-2 py-2.5 font-semibold">Arrival</th>
                                                <th className="px-2 py-2.5 font-semibold">Departure</th>
                                                <th className="px-2 py-2.5 font-semibold">
                                                    Break
                                                    <br />
                                                    (min)
                                                </th>
                                                <th className="px-2 py-2.5 font-semibold">Hours</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {people.map((p) => {
                                                const a = attendanceFor(form, p.email);
                                                return (
                                                    <tr key={p.email} className="border-b border-[#dcebee] text-xs">
                                                        <td className="min-w-[100px] px-2 py-3 font-semibold">
                                                            {p.name || p.email}
                                                            <small className="block text-[11px] font-normal text-[#6b7c86]">
                                                                {p.isLead ? "Activity lead" : p.joinStatus === "joined" ? "Joined" : "Join confirmation needed"}
                                                            </small>
                                                        </td>
                                                        <td className="px-2 py-3">
                                                            <input
                                                                type="checkbox"
                                                                className="h-[17px] w-[17px] accent-[#0e7d74]"
                                                                aria-label={`${p.name || p.email} attended`}
                                                                checked={a.present}
                                                                onChange={(e) => setAttendance(p.email, { present: e.target.checked })}
                                                            />
                                                        </td>
                                                        <td className="px-2 py-3">
                                                            <input
                                                                type="time"
                                                                aria-label={`${p.name || p.email} arrival`}
                                                                className={`${inputCls} max-w-[110px] px-1.5 py-1.5 text-xs`}
                                                                value={a.startTime}
                                                                disabled={!a.present}
                                                                onChange={(e) => setAttendance(p.email, { startTime: e.target.value })}
                                                            />
                                                        </td>
                                                        <td className="px-2 py-3">
                                                            <input
                                                                type="time"
                                                                aria-label={`${p.name || p.email} departure`}
                                                                className={`${inputCls} max-w-[110px] px-1.5 py-1.5 text-xs`}
                                                                value={a.endTime}
                                                                disabled={!a.present}
                                                                onChange={(e) => setAttendance(p.email, { endTime: e.target.value })}
                                                            />
                                                        </td>
                                                        <td className="px-2 py-3">
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                step={1}
                                                                aria-label={`${p.name || p.email} break minutes`}
                                                                className={`${inputCls} max-w-[64px] px-2 py-1.5 text-xs`}
                                                                value={a.breakMinutes}
                                                                disabled={!a.present}
                                                                onChange={(e) => setAttendance(p.email, { breakMinutes: e.target.value })}
                                                            />
                                                        </td>
                                                        <td className="whitespace-nowrap px-2 py-3 font-bold text-[#0e7d74]">{formatHours(attendanceMinutes(a))} h</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <p className="mt-3 text-xs text-[#6b7c86]">
                                    Record actual service time, excluding breaks. Up to {formatHours(QUICK_WORK_MAX_DAILY_MINUTES)} hours per student per day;
                                    the same time cannot be claimed twice, including time logged in a structured project.
                                </p>
                            </>
                        ) : null}

                        {step === 4 ? (
                            <>
                                <StepHead title="A few words. A little evidence." n={4} intro="Describe what happened and attach at least one supporting photo or PDF." />
                                <label htmlFor="qwSummary" className="mb-1.5 block text-xs font-semibold">
                                    What did you do? <span className="text-[#0e7d74]">*</span>
                                </label>
                                <textarea
                                    id="qwSummary"
                                    className={`${inputCls} min-h-[84px] resize-y`}
                                    maxLength={QUICK_WORK_SUMMARY_MAX}
                                    placeholder="e.g. We ran a one-hour Pinktober awareness desk, shared information leaflets and guided visitors to the health team."
                                    value={form.summary}
                                    onChange={(e) => patch({ summary: e.target.value })}
                                />
                                <div className="mt-1 text-right text-[11px] text-[#6b7c86]">
                                    {form.summary.length} / {QUICK_WORK_SUMMARY_MAX} characters · 2–3 sentences are enough
                                </div>
                                <div className="my-4 grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
                                    <Field id="qwReach" label="People reached" optional>
                                        <input
                                            id="qwReach"
                                            type="number"
                                            min={0}
                                            step={1}
                                            className={inputCls}
                                            placeholder="e.g. 30"
                                            value={form.peopleReached}
                                            onChange={(e) => patch({ peopleReached: e.target.value })}
                                        />
                                    </Field>
                                    <Field id="qwVisibility" label="Evidence visibility">
                                        <select id="qwVisibility" className={inputCls} value={form.visibility} onChange={(e) => patch({ visibility: e.target.value })}>
                                            {QUICK_WORK_VISIBILITY.map((v) => (
                                                <option key={v}>{v}</option>
                                            ))}
                                        </select>
                                    </Field>
                                </div>
                                <label
                                    htmlFor="qwFiles"
                                    className="mb-2 block cursor-pointer rounded-xl border-[1.5px] border-dashed border-[#a8d3cd] bg-[#f8fbfc] p-5 text-center"
                                >
                                    <PhotoIcon className="mx-auto mb-1.5 h-7 w-7 text-[#0e7d74]" />
                                    <b className="block text-[13px]">Add activity photos or supporting documents</b>
                                    <span className="mt-1 block text-xs text-[#6b7c86]">
                                        {QUICK_WORK_EVIDENCE_HINT} · up to {QUICK_WORK_MAX_EVIDENCE} files · {MAX_EVIDENCE_MB} MB each
                                    </span>
                                    <input
                                        id="qwFiles"
                                        type="file"
                                        multiple
                                        accept={QUICK_WORK_EVIDENCE_ACCEPT}
                                        disabled={uploading > 0 || form.evidence.length >= QUICK_WORK_MAX_EVIDENCE}
                                        className="mx-auto mt-3 block max-w-[240px] text-xs"
                                        onChange={(e) => {
                                            const files = Array.from(e.target.files ?? []);
                                            e.target.value = "";
                                            if (files.length) void addFiles(files);
                                        }}
                                    />
                                    {uploading > 0 ? (
                                        <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#0e7d74]">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
                                        </span>
                                    ) : null}
                                </label>
                                <p className="text-xs text-[#6b7c86]">Choose images that show the activity and participation. Add a short caption.</p>
                                {form.evidence.length ? (
                                    <div className="my-4 grid grid-cols-1 gap-3 min-[481px]:grid-cols-2">
                                        {form.evidence.map((ev) => (
                                            <EvidenceTile key={ev.url} item={ev}>
                                                <label className="sr-only" htmlFor={`cap-${ev.url}`}>
                                                    Evidence caption
                                                </label>
                                                <input
                                                    id={`cap-${ev.url}`}
                                                    className={`${inputCls} my-1.5 px-2 py-1.5 text-xs`}
                                                    maxLength={160}
                                                    placeholder="What does this evidence show?"
                                                    value={ev.caption}
                                                    onChange={(e) =>
                                                        patch({ evidence: form.evidence.map((x) => (x.url === ev.url ? { ...x, caption: e.target.value } : x)) })
                                                    }
                                                />
                                                <button
                                                    type="button"
                                                    className="p-0.5 text-[11px] text-[#ac3c3c]"
                                                    onClick={() => patch({ evidence: form.evidence.filter((x) => x.url !== ev.url) })}
                                                >
                                                    Remove
                                                </button>
                                            </EvidenceTile>
                                        ))}
                                    </div>
                                ) : null}
                                <label className="my-3 flex items-start gap-2.5 text-xs">
                                    <input type="checkbox" className="mt-0.5 h-[17px] w-[17px] flex-none accent-[#0e7d74]" checked={form.consent} onChange={(e) => patch({ consent: e.target.checked })} />
                                    <span>I have permission to share this evidence and have protected participants’ privacy.</span>
                                </label>
                                <label className="my-3 flex items-start gap-2.5 text-xs">
                                    <input type="checkbox" className="mt-0.5 h-[17px] w-[17px] flex-none accent-[#0e7d74]" checked={form.honest} onChange={(e) => patch({ honest: e.target.checked })} />
                                    <span>I confirm these attendance entries are accurate and have not been claimed in another service log or academic report.</span>
                                </label>
                            </>
                        ) : null}
                    </div>

                    <footer className="flex flex-col items-start justify-between gap-3 border-t border-[#dcebee] bg-[#f8fbfc] px-4 py-4 sm:flex-row sm:items-center sm:px-7">
                        <span className="text-xs text-[#6b7c86]">{saving
                                ? "Saving…"
                                : dirty
                                  ? "Unsaved changes"
                                  : `Draft saved · ${new Date(log.updatedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}</span>
                        <div className="flex w-full gap-2 sm:w-auto">
                            {step > 1 ? (
                                <button type="button" onClick={() => void goTo(step - 1)} disabled={saving} className={`${btnCls} flex-1 sm:flex-none`}>
                                    ← Back
                                </button>
                            ) : null}
                            {dirty ? (
                                <button type="button" onClick={() => void persist()} disabled={saving} className={`${btnCls} flex-1 sm:flex-none`}>
                                    Save draft
                                </button>
                            ) : null}
                            {step < 4 ? (
                                <button type="button" onClick={() => void next()} disabled={saving} className={`${primaryCls} flex-1 sm:flex-none`}>
                                    Continue →
                                </button>
                            ) : (
                                <button type="button" onClick={() => void review()} disabled={saving || uploading > 0} className={`${primaryCls} flex-1 sm:flex-none`}>
                                    Review & submit →
                                </button>
                            )}
                        </div>
                    </footer>
                </section>

                <aside className="rounded-2xl border border-[#dcebee] bg-white p-5 lg:sticky lg:top-5">
                    <div className="flex items-start justify-between gap-3">
                        <h3 className="text-[15px] font-semibold">Summary</h3>
                        <QuickWorkStatusPill status={log.status} />
                    </div>
                    <dl className="mt-3 space-y-1.5 text-[13px]">
                        <SummaryRow label="Activity" value={activityLabel(form)} />
                        <SummaryRow label="Date" value={form.activityDate ? shortDate(form.activityDate) : ""} />
                        <SummaryRow label="Time" value={form.startTime && form.endTime ? `${form.startTime}–${form.endTime}` : ""} />
                        <SummaryRow label="Venue" value={form.location} />
                        <SummaryRow label="Faculty" value={form.facultyName} />
                    </dl>
                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#dcebee] pt-4">
                        <Stat value={String(people.length)} label={people.length === 1 ? "participant" : "participants"} />
                        <Stat value={`${formatHours(myMinutes)} h`} label="your hours" />
                        {people.length > 1 ? <Stat value={`${formatHours(teamMinutes)} h`} label="team person-hours" /> : null}
                        <Stat value={`${form.evidence.length} / ${QUICK_WORK_MAX_EVIDENCE}`} label="evidence files" />
                    </div>
                    <p className="mt-4 text-xs text-[#6b7c86]">Hours count only after faculty approval.</p>
                </aside>
            </div>

            {preview ? (
                <QuickWorkModal labelledBy="quickPreviewTitle" onClose={() => !submitting && setPreview(false)} wide>
                    <header className="mb-3 flex items-start justify-between gap-5">
                        <div className="min-w-0">
                            <span className="text-xs font-semibold text-[#0e7d74]">Review before submitting</span>
                            <h2 id="quickPreviewTitle" className="mt-1 break-words text-lg font-bold">
                                {form.title}
                            </h2>
                        </div>
                        <ModalClose onClose={() => !submitting && setPreview(false)} />
                    </header>
                    <QuickWorkRecordDetails log={log} />
                    <p className="mt-3 text-xs text-[#6b7c86]">
                        {form.evidence.length} evidence file(s) · {form.visibility}. {log.facultyName} reviews the complete record before any hours count.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2.5 border-t border-[#dcebee] pt-4">
                        <button type="button" onClick={() => setPreview(false)} disabled={submitting} className={btnCls}>
                            Back to edit
                        </button>
                        <button type="button" onClick={() => void submit()} disabled={submitting} className={primaryCls}>
                            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                            Submit service record
                        </button>
                    </div>
                </QuickWorkModal>
            ) : null}

            {confirmSolo ? (
                <QuickWorkModal labelledBy="soloTitle" onClose={() => setConfirmSolo(false)}>
                    <header className="mb-3 flex items-start justify-between gap-5">
                        <h2 id="soloTitle" className="text-lg font-bold">
                            Switch to individual participation?
                        </h2>
                        <ModalClose onClose={() => setConfirmSolo(false)} />
                    </header>
                    <p className="text-[13px] text-[#6b7c86]">This removes teammates and their draft attendance from this activity only.</p>
                    <div className="mt-4 flex flex-wrap gap-2.5 border-t border-[#dcebee] pt-4">
                        <button type="button" onClick={() => setConfirmSolo(false)} className={btnCls}>
                            Keep team
                        </button>
                        <button
                            type="button"
                            className={primaryCls}
                            onClick={() => {
                                setConfirmSolo(false);
                                const nextForm: QuickWorkForm = { ...form, mode: "solo", teammates: [] };
                                setForm(nextForm);
                                void persist(nextForm);
                            }}
                        >
                            Switch to just me
                        </button>
                    </div>
                </QuickWorkModal>
            ) : null}

            {routes.dialogs}
        </div>
    );
}

/** `lat,lng` → map centre, or undefined when no valid pin is stored. */
function pinLatLng(pin: string) {
    const [lat, lng] = pin.split(",").map((s) => parseFloat(s.trim()));
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;
}

/** Where the faculty request stands, for the email saved on the log (not one still being typed). */
function FacultyRequestStatus({ log, typedEmail, onResend, onCheck }: { log: QuickWorkLog; typedEmail: string; onResend: () => void; onCheck: () => void }) {
    const typed = typedEmail.trim().toLowerCase();
    if (typed && typed !== log.facultyEmail) {
        return <p className="mt-2.5 rounded-lg bg-[#f4f8f9] px-3 py-2 text-xs text-[#6b7c86]">Save to send {typed} a request to accept.</p>;
    }
    const who = log.facultyName || log.facultyEmail;
    if (log.facultyConfirmation === "accepted") {
        return <p className="mt-2.5 rounded-lg bg-[#e6f6f4] px-3 py-2 text-xs font-semibold text-[#0e7d74]">✓ {who} accepted coordinating this activity.</p>;
    }
    if (log.facultyConfirmation === "declined") {
        return (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg bg-[#fae9e7] px-3 py-2 text-xs text-[#ac3c3c]">
                <span className="min-w-0 flex-1 break-words">
                    <b>{who} declined.</b> Enter another faculty member and save, or ask them again.
                </span>
                <button type="button" onClick={onResend} className="font-semibold underline">
                    Ask again
                </button>
            </div>
        );
    }
    if (log.facultyConfirmation !== "pending") return null;
    return (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg bg-[#fff5de] px-3 py-2 text-xs text-[#79571c]">
            <span className="min-w-0 flex-1 break-words">
                Request emailed to <b>{log.facultyEmail}</b>
                {log.facultyRequestedAt ? ` on ${new Date(log.facultyRequestedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}.
                Waiting for them to accept.
            </span>
            <button type="button" onClick={onCheck} className="font-semibold underline">
                Check again
            </button>
            <button type="button" onClick={onResend} className="font-semibold underline">
                Re-send request
            </button>
        </div>
    );
}

function StepHead({ title, n, intro }: { title: string; n: number; intro: string }) {
    return (
        <>
            <p className="text-xs font-semibold text-[#0e7d74]">
                Step {n} of {STEPS.length}
            </p>
            <h2 className="mb-1 text-lg font-semibold">{title}</h2>
            <p className="mb-5 text-[13px] text-[#6b7c86]">{intro}</p>
        </>
    );
}

function Stat({ value, label }: { value: string; label: string }) {
    return (
        <div>
            <b className="block text-lg font-semibold text-[#0e7d74]">{value}</b>
            <span className="text-xs text-[#6b7c86]">{label}</span>
        </div>
    );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex gap-3">
            <dt className="w-16 flex-none text-[#6b7c86]">{label}</dt>
            <dd className={`min-w-0 break-words ${value ? "" : "text-[#9aa8b0]"}`}>{value || "Not added yet"}</dd>
        </div>
    );
}
