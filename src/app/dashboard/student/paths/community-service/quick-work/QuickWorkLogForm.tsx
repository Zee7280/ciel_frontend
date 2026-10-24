"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { apiMessages, QUICK_WORK_HREF, QUICK_WORK_PRESIGN_PATH, quickWorkApi } from "@/utils/quickWorkApi";
import { uploadFileViaPresign } from "@/utils/presignedFileUpload";
import { compressImageForUpload } from "@/utils/compressImageForUpload";
import {
    activityErrors,
    attendanceErrors,
    attendanceFor,
    attendanceMinutes,
    EMAIL_RE,
    emptyAttendance,
    evidenceErrors,
    formatHours,
    formFromLog,
    formPeople,
    joinErrors,
    payloadFromForm,
    pktNow,
    QUICK_WORK_ACTIVITY_TYPES,
    QUICK_WORK_EVIDENCE_TYPES,
    QUICK_WORK_MAX_EVIDENCE,
    QUICK_WORK_MAX_EVIDENCE_BYTES,
    QUICK_WORK_MAX_PARTICIPANTS,
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
    BookIcon,
    EvidenceTile,
    LeafIcon,
    ModalClose,
    PhotoIcon,
    QuickWorkModal,
    QuickWorkRecordDetails,
    QuickWorkStatusPill,
} from "@/components/ciel/community-service/quick-work/QuickWorkShared";
import { useQuickWorkRoutes } from "@/components/ciel/community-service/quick-work/QuickWorkRoutes";

const HUB = "/dashboard/student/paths/community-service";
const STEPS = ["Team & faculty", "Activity details", "Attendance", "Evidence & submit"] as const;

const inputCls =
    "w-full min-w-0 rounded-lg border border-[#cfdbd4] bg-white px-3 py-2.5 text-[13px] text-[#163d3b] outline-none focus:border-[#71a68c] focus:ring-2 focus:ring-[#71a68c]/30 disabled:bg-[#f4f6f3] disabled:text-[#57706e]";
const btnCls =
    "inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#b8cec3] bg-white px-4 py-2.5 text-xs font-semibold text-[#12685d] hover:bg-[#f5faf7] disabled:cursor-not-allowed disabled:opacity-50";
const primaryCls =
    "inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#12685d] bg-[#12685d] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#104c46] disabled:cursor-not-allowed disabled:opacity-50";

function Field({ id, label, optional, required, children, full }: { id: string; label: string; optional?: boolean; required?: boolean; children: ReactNode; full?: boolean }) {
    return (
        <div className={full ? "sm:col-span-2" : undefined}>
            <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-[#163d3b]">
                {label}
                {required ? <span className="text-[#12685d]"> *</span> : null}
                {optional ? <span className="font-normal text-[#57706e]"> (optional)</span> : null}
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
    const [mate, setMate] = useState({ email: "", studentId: "" });
    const [uploading, setUploading] = useState(0);
    const errorBox = useRef<HTMLDivElement>(null);
    const panel = useRef<HTMLElement>(null);
    const loadedId = useRef<string | null>(null);

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
            <div className="mx-auto max-w-[760px] py-10 text-[#163d3b]">
                <div role="alert" className="rounded-[9px] border border-[#edccc5] bg-[#fff0ed] px-4 py-3 text-sm text-[#9b3832]">
                    {loadError}
                </div>
                <Link href={QUICK_WORK_HREF} className={`${btnCls} mt-4`}>
                    ← My Quick Work
                </Link>
            </div>
        );
    }
    if (!log || !form) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-[#57706e]" />
            </div>
        );
    }

    if (!log.isLead || (log.status !== "draft" && log.status !== "changes")) {
        return (
            <div className="mx-auto max-w-[760px] py-10 text-[#163d3b]">
                <h1 className="text-2xl font-semibold">{log.title || "Quick Community Work log"}</h1>
                <div className="mt-3">
                    <QuickWorkStatusPill status={log.status} />
                </div>
                <p className="mt-3 text-sm text-[#57706e]">
                    {log.isLead ? "This log has been submitted, so it can no longer be edited." : "Only the activity lead can edit this log."}
                </p>
                <Link href={QUICK_WORK_HREF} className={`${btnCls} mt-4`}>
                    ← My Quick Work
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
        if (await persist()) setPreview(true);
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
        const email = mate.email.trim().toLowerCase();
        const studentId = mate.studentId.trim();
        if (!EMAIL_RE.test(email) || !studentId) return toast.error("Enter a student ID and a valid university email.");
        if (formPeople(form).length >= QUICK_WORK_MAX_PARTICIPANTS) return toast.error(`This log allows up to ${QUICK_WORK_MAX_PARTICIPANTS} participants.`);
        if (formPeople(form).some((p) => p.email === email || p.studentId.trim().toLowerCase() === studentId.toLowerCase())) {
            return toast.error("That email or student ID is already on this team.");
        }
        const nextForm: QuickWorkForm = {
            ...form,
            mode: "team",
            teammates: [...form.teammates, { email, studentId, name: "", joinStatus: "invited" }],
            attendance: { ...form.attendance, [email]: attendanceFor(form, email) },
        };
        setForm(nextForm);
        if (await persist(nextForm)) {
            setMate({ email: "", studentId: "" });
            toast.success("Join request sent. They confirm from their My Quick Work page.");
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
                const file = await compressImageForUpload(original);
                if (!(QUICK_WORK_EVIDENCE_TYPES as readonly string[]).includes(file.type)) {
                    toast.error(`${original.name}: use JPG, PNG, WEBP or PDF files.`);
                    continue;
                }
                if (file.size > QUICK_WORK_MAX_EVIDENCE_BYTES) {
                    toast.error(`${original.name} exceeds 5 MB.`);
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
        <div className="mx-auto min-w-0 max-w-[1280px] pb-16 text-[#163d3b]">
            <Link href={QUICK_WORK_HREF} className="text-xs font-semibold text-[#12685d] underline underline-offset-[3px]">
                ← My Quick Work
            </Link>
            <section className="flex items-end justify-between gap-6 pb-6 pt-5">
                <div>
                    <div className="mb-3 text-[11px] font-bold uppercase tracking-[1.6px] text-[#12685d]">Community Service / Quick Community Work</div>
                    <h1 className="text-[29px] font-semibold leading-tight tracking-[-1.2px] sm:text-[clamp(29px,3.5vw,43px)]">Quick Community Work Log</h1>
                    <p className="mt-3 max-w-[650px] text-[13px] text-[#57706e] sm:text-sm">
                        Record a short university activity you have completed. Submit your attendance and evidence for one final faculty review.
                    </p>
                </div>
                <div className="hidden min-w-[155px] border-l-2 border-[#bdceab] pl-4 lg:block">
                    <b className="block text-[22px]">Every hour counts.</b>
                    <small className="text-xs text-[#57706e]">One activity. One simple record.</small>
                </div>
            </section>

            {log.status === "changes" && log.reviewNote ? (
                <div className="mb-4 rounded-lg bg-[#fff6e5] px-3.5 py-3 text-xs leading-relaxed text-[#79571c]">
                    <b>Faculty asked for changes:</b> {log.reviewNote}
                </div>
            ) : null}

            <div className="mb-4 rounded-lg bg-[#edf5f0] px-3.5 py-3 text-xs leading-relaxed text-[#104c46]">
                <b>Quick work record</b> · This log is separate from your structured 16-hour requirement.{" "}
                <button type="button" onClick={routes.openCompare} className="ml-1 font-semibold underline underline-offset-[3px]">
                    Which route should I use?
                </button>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-2 min-[481px]:grid-cols-2 sm:gap-3">
                <div aria-current="page" className="flex items-center gap-3 rounded-xl border border-[#91b8a5] bg-[#edf5f0] px-4 py-3 text-[#104c46]">
                    <LeafIcon className="h-6 w-6 flex-none" />
                    <span>
                        <b className="block text-sm">Quick Community Work Log</b>
                        <small className="text-[11px]">Short activity · attendance · evidence · approved hours</small>
                    </span>
                    <span className="ml-auto text-lg">✓</span>
                </div>
                <Link href={`${HUB}#structured-tools`} className="flex items-center gap-3 rounded-xl border border-[#dce5df] bg-white px-4 py-3 text-[#57706e] hover:border-[#91b8a5]">
                    <BookIcon className="h-6 w-6 flex-none" />
                    <span>
                        <b className="block text-sm">Structured Community Service Report</b>
                        <small className="text-[11px]">16-hour requirement · detailed report · CII assessment</small>
                    </span>
                    <span className="ml-auto text-lg">↗</span>
                </Link>
            </div>

            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_290px] lg:gap-6">
                <section ref={panel} className="scroll-mt-20 overflow-hidden rounded-2xl border border-[#dce5df] bg-white shadow-[0_3px_12px_#173c3812]">
                    <div aria-label="Form steps" className="grid grid-cols-4 gap-1.5 border-b border-[#dce5df] bg-[#fcfdfa] px-2 py-3 sm:px-4 sm:py-4">
                        {STEPS.map((label, i) => {
                            const active = step === i + 1;
                            return (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => void goTo(i + 1)}
                                    aria-current={active ? "step" : undefined}
                                    className={`flex flex-col items-center gap-1 p-1 text-center text-[9px] font-semibold sm:flex-row sm:text-left sm:text-[11px] ${active ? "text-[#12685d]" : "text-[#57706e]"}`}
                                >
                                    <span
                                        className={`grid h-[26px] w-[26px] flex-none place-items-center rounded-full border ${active ? "border-[#12685d] bg-[#12685d] text-white" : "border-[#dce5df] bg-white"}`}
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
                                <div className="mb-4 inline-flex rounded-lg border border-[#dce5df] bg-[#f1f4f0] p-[3px]" aria-label="Participation mode">
                                    {(["solo", "team"] as const).map((m) => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => void switchMode(m)}
                                            aria-pressed={form.mode === m}
                                            className={`rounded-[5px] px-4 py-1.5 text-xs ${form.mode === m ? "bg-white font-semibold text-[#163d3b] shadow-[0_1px_4px_#1538311a]" : "text-[#57706e]"}`}
                                        >
                                            {m === "solo" ? "Just me" : "With a team"}
                                        </button>
                                    ))}
                                </div>
                                <div className="mb-3 flex flex-wrap items-center gap-2.5 text-xs">
                                    <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#edf5f0] font-bold text-[#12685d]">01</span>
                                    <b>You · Activity lead</b>
                                    <span className="rounded-md bg-[#edf0ed] px-2.5 py-1.5 text-[10px] font-semibold text-[#57706e]">One submission for the team</span>
                                </div>
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
                                        <input
                                            id="qwDept"
                                            className={inputCls}
                                            value={form.department}
                                            maxLength={120}
                                            placeholder="Your department or programme"
                                            onChange={(e) => patch({ department: e.target.value })}
                                        />
                                    </Field>
                                </div>
                                <p className="mt-2 text-[11px] text-[#57706e]">Your name and email come from your CIEL profile.</p>

                                {form.mode === "team" ? (
                                    <>
                                        <hr className="my-6 border-[#dce5df]" />
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <h3 className="text-[17px] font-semibold">Teammates</h3>
                                            <div className="flex items-center gap-3">
                                                <small className="text-xs text-[#57706e]">
                                                    {people.length} / {QUICK_WORK_MAX_PARTICIPANTS} members, including you
                                                </small>
                                                {form.teammates.length ? (
                                                    <button type="button" onClick={() => void refreshTeam()} className="text-xs font-semibold text-[#12685d] underline">
                                                        Refresh
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                        {form.teammates.length ? (
                                            form.teammates.map((t) => (
                                                <div key={t.email} className="my-2 flex flex-wrap items-center gap-2.5 rounded-[9px] border border-[#dce5df] p-3">
                                                    <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#edf5f0] font-bold text-[#12685d]">
                                                        {(t.name || t.email).slice(0, 1).toUpperCase()}
                                                    </span>
                                                    <div className="min-w-[60%] flex-1 sm:min-w-0">
                                                        <b className="block break-words text-[13px]">{t.name || t.email}</b>
                                                        <small className="block break-words text-xs text-[#57706e]">
                                                            {t.email} · {t.studentId || "Student ID needed"}
                                                        </small>
                                                    </div>
                                                    <span
                                                        className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold ${
                                                            t.joinStatus === "joined"
                                                                ? "bg-[#edf5f0] text-[#12685d]"
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
                                                        className="p-1 text-[11px] text-[#57706e] hover:text-[#ac3c3c]"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-[#57706e]">Add each participant once. Their hours will appear on their own My Quick Work page.</p>
                                        )}
                                        <div className="mt-3 rounded-[10px] border border-dashed border-[#a9c4b8] bg-[#fbfdfa] p-3.5">
                                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-end">
                                                <Field id="qwMateEmail" label="Teammate’s CIEL account email">
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
                                                <Field id="qwMateSid" label="Student ID">
                                                    <input
                                                        id="qwMateSid"
                                                        className={inputCls}
                                                        maxLength={60}
                                                        placeholder="Registration number"
                                                        value={mate.studentId}
                                                        onChange={(e) => setMate((m) => ({ ...m, studentId: e.target.value }))}
                                                    />
                                                </Field>
                                                <button type="button" onClick={() => void addMate()} disabled={saving} className={btnCls}>
                                                    + Add teammate
                                                </button>
                                            </div>
                                            <p className="mt-2 text-[11px] text-[#57706e]">
                                                Teammates need a CIEL student account. They get a join request and confirm from their own My Quick Work page;
                                                you can submit once everyone has confirmed.
                                            </p>
                                        </div>
                                    </>
                                ) : null}

                                <hr className="my-6 border-[#dce5df]" />
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <h3 className="text-[17px] font-semibold">Coordinating faculty</h3>
                                    <span className="rounded-md bg-[#edf5f0] px-2.5 py-1.5 text-[10px] font-semibold text-[#12685d]">Required approver</span>
                                </div>
                                <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
                                    <Field id="qwFaculty" label="Faculty member’s name" required>
                                        <input id="qwFaculty" className={inputCls} value={form.facultyName} maxLength={100} placeholder="Full name" onChange={(e) => patch({ facultyName: e.target.value })} />
                                    </Field>
                                    <Field id="qwFacultyEmail" label="Faculty university email" required>
                                        <input
                                            id="qwFacultyEmail"
                                            type="email"
                                            className={inputCls}
                                            value={form.facultyEmail}
                                            maxLength={120}
                                            placeholder="faculty@university.edu.pk"
                                            onChange={(e) => patch({ facultyEmail: e.target.value })}
                                        />
                                    </Field>
                                </div>
                                <p className="mt-2.5 text-xs text-[#57706e]">
                                    This faculty member reviews your completed work after you submit, from their CIEL dashboard. Selecting them does not
                                    send an approval request yet.
                                </p>
                            </>
                        ) : null}

                        {step === 2 ? (
                            <>
                                <StepHead title="What’s the activity?" n={2} intro="A brief event record is enough. Start with a type, then add the details." />
                                <div className="mb-5 flex flex-wrap gap-1.5">
                                    {QUICK_WORK_TEMPLATES.map((t) => (
                                        <button
                                            key={t.label}
                                            type="button"
                                            onClick={() => patch({ activityType: t.type, title: form.title || t.type, sdg: t.sdg ? String(t.sdg) : "" })}
                                            className="rounded-md border border-[#dce5df] bg-[#f5f7f3] px-2.5 py-1.5 text-[11px] text-[#57706e] hover:border-[#12685d] hover:text-[#12685d]"
                                        >
                                            {t.label}
                                        </button>
                                    ))}
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
                                </div>
                                <div className="mt-4 rounded-lg bg-[#edf5f0] px-3.5 py-3 text-xs leading-relaxed text-[#104c46]">
                                    <b>Record work already completed.</b> Add the actual date, venue and time. Faculty review starts only when you submit the
                                    complete log in Step 4. All times are Pakistan Standard Time (PKT).
                                </div>
                            </>
                        ) : null}

                        {step === 3 ? (
                            <>
                                <StepHead title="Record each person’s time" n={3} intro="Mark who attended, then enter their actual times. Absentees receive zero hours." />
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                    <div className="text-xs text-[#57706e]">
                                        {shortDate(form.activityDate)} · {form.startTime || "—"}–{form.endTime || "—"}
                                        <br />
                                        {form.location || "Set the venue in Activity details"}
                                    </div>
                                    <button type="button" onClick={applyEventTimes} className={`${btnCls} px-3 py-2 text-[11px]`}>
                                        Use event times for all
                                    </button>
                                </div>
                                <p className="mb-2 text-[10px] text-[#57706e] sm:hidden">Swipe the attendance table to see all fields →</p>
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[520px] border-collapse">
                                        <thead>
                                            <tr className="bg-[#f6f8f4] text-left text-[10px] tracking-[0.5px] text-[#57706e]">
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
                                                    <tr key={p.email} className="border-b border-[#dce5df] text-xs">
                                                        <td className="min-w-[100px] px-2 py-3 font-semibold">
                                                            {p.name || p.email}
                                                            <small className="block text-[10px] font-normal text-[#57706e]">
                                                                {p.isLead ? "Activity lead" : p.joinStatus === "joined" ? "Joined" : "Join confirmation needed"}
                                                            </small>
                                                        </td>
                                                        <td className="px-2 py-3">
                                                            <input
                                                                type="checkbox"
                                                                className="h-[17px] w-[17px] accent-[#12685d]"
                                                                aria-label={`${p.name || p.email} attended`}
                                                                checked={a.present}
                                                                onChange={(e) => setAttendance(p.email, { present: e.target.checked })}
                                                            />
                                                        </td>
                                                        <td className="px-2 py-3">
                                                            <input
                                                                type="time"
                                                                aria-label={`${p.name || p.email} arrival`}
                                                                className={`${inputCls} max-w-[110px] px-1.5 py-1.5 text-[11px]`}
                                                                value={a.startTime}
                                                                disabled={!a.present}
                                                                onChange={(e) => setAttendance(p.email, { startTime: e.target.value })}
                                                            />
                                                        </td>
                                                        <td className="px-2 py-3">
                                                            <input
                                                                type="time"
                                                                aria-label={`${p.name || p.email} departure`}
                                                                className={`${inputCls} max-w-[110px] px-1.5 py-1.5 text-[11px]`}
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
                                                                className={`${inputCls} max-w-[64px] px-2 py-1.5 text-[11px]`}
                                                                value={a.breakMinutes}
                                                                disabled={!a.present}
                                                                onChange={(e) => setAttendance(p.email, { breakMinutes: e.target.value })}
                                                            />
                                                        </td>
                                                        <td className="whitespace-nowrap px-2 py-3 font-bold text-[#12685d]">{formatHours(attendanceMinutes(a))} h</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-4 rounded-lg bg-[#edf5f0] px-3.5 py-3 text-xs leading-relaxed text-[#104c46]">
                                    <b>One hour is welcome.</b> Time is counted in minutes and added to each student’s service history after approval. Team
                                    person-hours are shown separately from your own hours.
                                </div>
                                <p className="mt-3 text-xs text-[#57706e]">
                                    Record actual service, excluding breaks and passive attendance. Maximum 9 hours per student per day. The same student
                                    cannot claim an overlapping period twice, including time already logged in a structured project.
                                </p>
                            </>
                        ) : null}

                        {step === 4 ? (
                            <>
                                <StepHead title="A few words. A little evidence." n={4} intro="Describe what happened and attach at least one supporting photo or PDF." />
                                <label htmlFor="qwSummary" className="mb-1.5 block text-xs font-semibold">
                                    What did you do? <span className="text-[#12685d]">*</span>
                                </label>
                                <textarea
                                    id="qwSummary"
                                    className={`${inputCls} min-h-[84px] resize-y`}
                                    maxLength={QUICK_WORK_SUMMARY_MAX}
                                    placeholder="e.g. We ran a one-hour Pinktober awareness desk, shared information leaflets and guided visitors to the health team."
                                    value={form.summary}
                                    onChange={(e) => patch({ summary: e.target.value })}
                                />
                                <div className="mt-1 text-right text-[10px] text-[#57706e]">
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
                                    className="mb-2 block cursor-pointer rounded-xl border-[1.5px] border-dashed border-[#a6bfb2] bg-[#f9fbf7] p-5 text-center"
                                >
                                    <PhotoIcon className="mx-auto mb-1.5 h-7 w-7 text-[#12685d]" />
                                    <b className="block text-[13px]">Add activity photos or supporting documents</b>
                                    <span className="mt-1 block text-[11px] text-[#57706e]">
                                        JPG, PNG, WEBP or PDF · up to {QUICK_WORK_MAX_EVIDENCE} files · 5 MB each
                                    </span>
                                    <input
                                        id="qwFiles"
                                        type="file"
                                        multiple
                                        accept={QUICK_WORK_EVIDENCE_TYPES.join(",")}
                                        disabled={uploading > 0 || form.evidence.length >= QUICK_WORK_MAX_EVIDENCE}
                                        className="mx-auto mt-3 block max-w-[240px] text-[11px]"
                                        onChange={(e) => {
                                            const files = Array.from(e.target.files ?? []);
                                            e.target.value = "";
                                            if (files.length) void addFiles(files);
                                        }}
                                    />
                                    {uploading > 0 ? (
                                        <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-[#12685d]">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
                                        </span>
                                    ) : null}
                                </label>
                                <p className="text-xs text-[#57706e]">Choose images that show the activity and participation. Add a short caption.</p>
                                {form.evidence.length ? (
                                    <div className="my-4 grid grid-cols-1 gap-3 min-[481px]:grid-cols-2">
                                        {form.evidence.map((ev) => (
                                            <EvidenceTile key={ev.url} item={ev}>
                                                <label className="sr-only" htmlFor={`cap-${ev.url}`}>
                                                    Evidence caption
                                                </label>
                                                <input
                                                    id={`cap-${ev.url}`}
                                                    className={`${inputCls} my-1.5 px-2 py-1.5 text-[11px]`}
                                                    maxLength={160}
                                                    placeholder="What does this evidence show?"
                                                    value={ev.caption}
                                                    onChange={(e) =>
                                                        patch({ evidence: form.evidence.map((x) => (x.url === ev.url ? { ...x, caption: e.target.value } : x)) })
                                                    }
                                                />
                                                <button
                                                    type="button"
                                                    className="p-0.5 text-[10px] text-[#ac3c3c]"
                                                    onClick={() => patch({ evidence: form.evidence.filter((x) => x.url !== ev.url) })}
                                                >
                                                    Remove
                                                </button>
                                            </EvidenceTile>
                                        ))}
                                    </div>
                                ) : null}
                                <label className="my-3 flex items-start gap-2.5 text-xs">
                                    <input type="checkbox" className="mt-0.5 h-[17px] w-[17px] flex-none accent-[#12685d]" checked={form.consent} onChange={(e) => patch({ consent: e.target.checked })} />
                                    <span>I have permission to share this evidence and have protected participants’ privacy.</span>
                                </label>
                                <label className="my-3 flex items-start gap-2.5 text-xs">
                                    <input type="checkbox" className="mt-0.5 h-[17px] w-[17px] flex-none accent-[#12685d]" checked={form.honest} onChange={(e) => patch({ honest: e.target.checked })} />
                                    <span>I confirm these attendance entries are accurate and have not been claimed in another service log or academic report.</span>
                                </label>
                                <div className="mt-4 rounded-lg bg-[#edf5f0] px-3.5 py-3 text-xs leading-relaxed text-[#104c46]">
                                    <b>Ready for final review.</b> Submit once your activity, individual attendance and evidence are complete. The assigned faculty
                                    member can approve, return for correction or decline. Only approved hours count.
                                </div>
                            </>
                        ) : null}
                    </div>

                    <footer className="flex flex-col items-start justify-between gap-3 border-t border-[#dce5df] bg-[#fcfdfa] px-4 py-4 sm:flex-row sm:items-center sm:px-7">
                        <span className="text-xs text-[#57706e]">{saving ? "Saving…" : dirty ? "Unsaved changes" : "Draft saved"}</span>
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

                <aside className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:sticky lg:top-5 lg:block lg:space-y-3.5">
                    <div className="relative overflow-hidden rounded-2xl bg-[#104c46] p-6 text-white sm:col-span-2">
                        <div className="text-[10px] font-bold uppercase tracking-[1.6px] text-[#b3d0be]">Live activity snapshot</div>
                        <h3 className="mb-1 mt-2.5 break-words text-[17px] font-semibold leading-snug text-white">{form.title || "Your next act of service"}</h3>
                        <p className="text-[11px] text-[#d7e8df]">
                            {form.activityType || "A short community activity"}
                            <br />
                            {shortDate(form.activityDate)} · {form.location || "Location to be added"}
                        </p>
                        <div className="mt-4 grid max-w-[320px] grid-cols-2 gap-2.5 border-t border-white/15 pt-4 lg:max-w-none">
                            <Stat value={String(people.length)} label={`registered participant${people.length === 1 ? "" : "s"}`} />
                            <Stat value={formatHours(teamMinutes)} label="team person-hours" />
                            <Stat value={formatHours(myMinutes)} label="your recorded hours" />
                            <Stat value={String(form.evidence.length)} label="evidence files" />
                        </div>
                        <span className="mt-4 inline-block rounded-md bg-white/15 px-2.5 py-1.5 text-[10px] font-semibold text-[#eef7ef]">
                            {log.status === "changes" ? "Changes requested" : "Draft"}
                        </span>
                        <p className="mt-3 text-[11px] text-[#d7e8df]">Recorded hours remain pending until faculty confirms attendance and evidence.</p>
                    </div>
                    <div className="rounded-xl border border-[#dce5df] bg-white p-5">
                        <h3 className="mb-2.5 text-[13px] font-semibold">A simple approval journey</h3>
                        {["Complete the activity; prepare your log.", "Submit attendance and evidence.", "Faculty reviews the completed work once.", "Each student’s hours accumulate."].map(
                            (t, i) => (
                                <div key={t} className="my-3 flex gap-2.5 text-xs">
                                    <i className="grid h-[19px] w-[19px] flex-none place-items-center rounded-full bg-[#edf5f0] text-[10px] not-italic">{i + 1}</i>
                                    <span>{t}</span>
                                </div>
                            ),
                        )}
                    </div>
                    <div className="rounded-xl border border-[#dce5df] bg-white p-5">
                        <h3 className="mb-2.5 text-[13px] font-semibold">Your effort, recorded accurately</h3>
                        <p className="text-xs text-[#57706e]">
                            One hour is a valid entry. Each member receives only their own approved time. Quick logs keep a separate service history from
                            academic CII scores and badges.
                        </p>
                    </div>
                </aside>
            </div>

            {preview ? (
                <QuickWorkModal labelledBy="quickPreviewTitle" onClose={() => !submitting && setPreview(false)} wide>
                    <header className="mb-3 flex items-start justify-between gap-5">
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold uppercase tracking-[1.6px] text-[#12685d]">Quick service flashcard</span>
                            <h2 id="quickPreviewTitle" className="mt-1 break-words text-[23px] font-bold tracking-[-0.6px]">
                                {form.title}
                            </h2>
                        </div>
                        <ModalClose onClose={() => !submitting && setPreview(false)} />
                    </header>
                    <QuickWorkRecordDetails log={log} />
                    <p className="mt-3 text-xs text-[#57706e]">
                        {form.evidence.length} evidence file(s) · {form.visibility}. {log.facultyName} reviews the complete record before any hours count.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2.5 border-t border-[#dce5df] pt-4">
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
                        <h2 id="soloTitle" className="text-[21px] font-bold">
                            Switch to individual participation?
                        </h2>
                        <ModalClose onClose={() => setConfirmSolo(false)} />
                    </header>
                    <p className="text-[13px] text-[#57706e]">This removes teammates and their draft attendance from this activity only.</p>
                    <div className="mt-4 flex flex-wrap gap-2.5 border-t border-[#dce5df] pt-4">
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

function StepHead({ title, n, intro }: { title: string; n: number; intro: string }) {
    return (
        <>
            <div className="mb-1.5 flex items-center justify-between gap-3">
                <h2 className="text-[21px] font-semibold tracking-[-0.6px] sm:text-[23px]">{title}</h2>
                <span className="rounded-md bg-[#edf5f0] px-2.5 py-1.5 text-[10px] font-semibold text-[#12685d]">0{n} / 04</span>
            </div>
            <p className="mb-5 text-[13px] text-[#57706e]">{intro}</p>
        </>
    );
}

function Stat({ value, label }: { value: string; label: string }) {
    return (
        <div>
            <b className="block text-[27px] font-medium text-[#ddebab]">{value}</b>
            <span className="text-[10px] text-[#d7e8df]">{label}</span>
        </div>
    );
}
