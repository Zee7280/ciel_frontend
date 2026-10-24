"use client";

import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import {
    Save,
    Loader2,
    Shield,
    Globe,
    Mail,
    FileCheck,
    CreditCard,
    PauseCircle,
    TimerOff,
    ChevronDown,
    X,
    AlertTriangle,
    Bell,
    RefreshCw,
    MessageSquareText,
    Layers,
    Users,
    Settings2,
    CircleDollarSign,
    ShieldCheck,
} from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { isAbortError, readErrorMessage, useAbortableFetch } from "@/components/admin/useAbortableFetch";
import { formatAdminDateTime } from "@/utils/adminDate";
import {
    CORPORATE_MEMBERSHIP_REQUIRED_KEY,
    FEE_PKR_MAX,
    FEE_PKR_MIN,
    isValidWholeNumberInRange,
    MEMBERSHIP_FEE_CORPORATE_PKR_KEY,
    MEMBERSHIP_FEE_PARTNER_PKR_KEY,
    MEMBERSHIP_FEE_UNIVERSITY_PKR_KEY,
    parseMembershipFeePkrSettingValue,
    parsePartnerMembershipRequiredSettingValue,
    PARTNER_MEMBERSHIP_REQUIRED_KEY,
    REPORTING_FEE_PKR_KEY,
    UNIVERSITY_MEMBERSHIP_REQUIRED_KEY,
} from "@/utils/partnerMembershipDisplay";
import {
    parseStudentSubscriptionRequiredSettingValue,
    STUDENT_SUBSCRIPTION_DEFAULT_FEE_PKR,
    STUDENT_SUBSCRIPTION_FEE_PKR_KEY,
    STUDENT_SUBSCRIPTION_REQUIRED_KEY,
} from "@/utils/studentSubscription";
import {
    DEFAULT_STUDENT_APPLY_EXPIRED_MESSAGE,
    DEFAULT_STUDENT_APPLY_MAINTENANCE_MESSAGE,
    parseStudentApplyClosedBefore,
    parseStudentApplyMaintenanceEnabled,
    STUDENT_APPLY_CLOSED_BEFORE_DISABLED,
    STUDENT_APPLY_CLOSED_BEFORE_KEY,
    STUDENT_APPLY_EXPIRED_MESSAGE_KEY,
    STUDENT_APPLY_MAINTENANCE_ENABLED_KEY,
    STUDENT_APPLY_MAINTENANCE_MESSAGE_KEY,
} from "@/utils/studentApplyMaintenance";
import {
    STUDENT_AI_OPPORTUNITY_DRAFT_ENABLED_KEY,
    STUDENT_PRIVATE_TEAM_ENABLED_KEY,
} from "@/utils/publicPlatformConfig";

/* ----------------------------- constants & types ----------------------------- */

const SETTINGS_URL = `/api/v1/admin/settings`;
const SITE_NAME_KEY = "site_name";
const CONTACT_EMAIL_KEY = "contact_email";
const MAINTENANCE_MODE_KEY = "maintenance_mode";
const ALLOW_REGISTRATIONS_KEY = "allow_registrations";
const ADMIN_REVIEW_EMAILS_KEY = "ADMIN_REVIEW_EMAILS";
const REVIEW_SLA_DAYS_KEY = "REVIEW_SLA_DAYS";

/** Free-text fields saved together by the top "Save changes" button (only changed keys are sent). */
const GENERAL_SETTING_KEYS = [SITE_NAME_KEY, CONTACT_EMAIL_KEY] as const;

const MESSAGE_MAX = 500;
const SITE_NAME_MAX = 80;
const MAX_REVIEW_EMAILS = 10;
const SLA_MIN = 1;
const SLA_MAX = 60;
const MAINTENANCE_CONFIRM_TEXT = "MAINTENANCE";
const EMAIL_RE = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;

type SettingRow = {
    key?: string;
    value?: string | null;
    updatedAt?: string | null;
    updated_at?: string | null;
    updatedBy?: unknown;
    updated_by?: unknown;
    updatedByName?: string | null;
    updatedByEmail?: string | null;
};

type Meta = { at?: string; by?: string };

function whoFromRow(row: SettingRow): string | undefined {
    const direct = row.updatedByName || row.updatedByEmail;
    if (typeof direct === "string" && direct.trim()) return direct.trim();
    const raw = row.updatedBy ?? row.updated_by;
    if (typeof raw === "string" && raw.trim()) return raw.trim();
    if (raw && typeof raw === "object") {
        const o = raw as { name?: unknown; email?: unknown; fullName?: unknown };
        for (const v of [o.name, o.fullName, o.email]) {
            if (typeof v === "string" && v.trim()) return v.trim();
        }
    }
    return undefined;
}

function parseBool(raw: string | undefined, fallback: boolean): boolean {
    if (raw === undefined || raw.trim() === "") return fallback;
    return parseStudentApplyMaintenanceEnabled(raw, fallback);
}

function toLocalInput(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseEmailList(raw: string): string[] {
    return raw
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
}

type ConfirmState = {
    title: string;
    description: ReactNode;
    confirmLabel: string;
    variant: "default" | "warning" | "danger";
    requireText?: string;
    run: () => Promise<void>;
};

const SECTIONS = [
    { id: "apps", label: "Applications" },
    { id: "messages", label: "Student messages" },
    { id: "reports", label: "Reports & partners" },
    { id: "fees", label: "Fees & payments" },
    { id: "notify", label: "Notifications" },
    { id: "platform", label: "Platform access" },
] as const;

/* --------------------------------- UI pieces --------------------------------- */

function Spinner({ className = "h-4 w-4" }: { className?: string }) {
    return <Loader2 className={`${className} animate-spin`} aria-hidden="true" />;
}

function Section({
    id,
    title,
    subtitle,
    badge,
    icon,
    tone = "bg-teal-50 text-teal-700",
    children,
}: {
    id: string;
    title: string;
    subtitle?: string;
    badge?: string;
    icon: ReactNode;
    tone?: string;
    children: ReactNode;
}) {
    const [open, setOpen] = useState(true);
    const bodyId = `${id}-body`;
    return (
        <section id={id} data-settings-section className="scroll-mt-32 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <h2 className="m-0 border-b border-slate-100 px-4 py-4 sm:px-5">
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    aria-expanded={open}
                    aria-controls={bodyId}
                    className="flex w-full items-center gap-3 text-left lg:pointer-events-none lg:cursor-default"
                >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`} aria-hidden="true">
                        {icon}
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-base font-bold text-slate-900">{title}</span>
                        {subtitle ? <span className="block text-xs text-slate-500">{subtitle}</span> : null}
                    </span>
                    {badge ? (
                        <span className="hidden shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-teal-700 ring-1 ring-teal-100 sm:inline-flex">
                            {badge}
                        </span>
                    ) : null}
                    <ChevronDown
                        className={`h-5 w-5 shrink-0 text-slate-400 transition-transform lg:hidden ${open ? "rotate-180" : ""}`}
                        aria-hidden="true"
                    />
                </button>
            </h2>
            <div id={bodyId} className={`${open ? "block" : "hidden"} space-y-4 px-4 py-4 sm:px-5 sm:py-5 lg:block`}>
                {children}
            </div>
        </section>
    );
}

/** Small summary tile above the tabs: one live value per headline switch / fee. */
function StatCard({ label, value, sub, icon, tone }: { label: string; value: string; sub: string; icon: ReactNode; tone: string }) {
    return (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold text-slate-500">{label}</p>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`} aria-hidden="true">
                    {icon}
                </span>
            </div>
            <p className="mt-2 text-xl font-bold tracking-tight text-slate-900">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{sub}</p>
        </div>
    );
}

function UpdatedMeta({ meta }: { meta?: Meta }) {
    if (!meta?.at) return null;
    return (
        <p className="mt-1 text-xs text-slate-500">
            Last updated {formatAdminDateTime(meta.at)}
            {meta.by ? ` by ${meta.by}` : ""}
        </p>
    );
}

function DirtyDot({ show }: { show: boolean }) {
    if (!show) return null;
    return (
        <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
            <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
            Unsaved
        </span>
    );
}

const SWITCH_COLORS = {
    amber: "bg-amber-600 focus-visible:ring-amber-200",
    indigo: "bg-indigo-600 focus-visible:ring-indigo-200",
    emerald: "bg-emerald-600 focus-visible:ring-emerald-200",
    blue: "bg-blue-600 focus-visible:ring-blue-200",
    red: "bg-red-600 focus-visible:ring-red-200",
} as const;

function ToggleRow({
    id,
    title,
    description,
    checked,
    saving,
    onChange,
    color,
    meta,
    stateLabel,
    tone = "bg-slate-50",
}: {
    id: string;
    title: string;
    description: ReactNode;
    checked: boolean;
    saving: boolean;
    onChange: (next: boolean) => void;
    color: keyof typeof SWITCH_COLORS;
    meta?: Meta;
    stateLabel: string;
    tone?: string;
}) {
    const titleId = `${id}-title`;
    return (
        <div className={`rounded-xl border border-slate-200/70 p-4 ${tone}`}>
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div id={titleId} className="font-bold text-slate-900">
                        {title}
                    </div>
                    <div className="mt-1 text-sm leading-relaxed text-slate-600">{description}</div>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={checked}
                    aria-labelledby={titleId}
                    disabled={saving}
                    onClick={() => onChange(!checked)}
                    className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-4 disabled:cursor-wait disabled:opacity-60 ${
                        checked ? SWITCH_COLORS[color] : "bg-slate-300 focus-visible:ring-slate-200"
                    }`}
                >
                    <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                            checked ? "translate-x-[22px]" : "translate-x-0.5"
                        }`}
                    />
                </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1" aria-live="polite">
                {saving ? (
                    <p className="flex items-center gap-2 text-xs font-medium text-slate-700">
                        <Spinner className="h-3.5 w-3.5" /> Saving…
                    </p>
                ) : (
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${
                            checked ? "bg-teal-50 text-teal-800 ring-teal-100" : "bg-slate-100 text-slate-600 ring-slate-200"
                        }`}
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                        {stateLabel}
                    </span>
                )}
            </div>
            <UpdatedMeta meta={meta} />
        </div>
    );
}

const inputCls =
    "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500";

/* ---------------------------------- page ---------------------------------- */

export default function AdminSettingsPage() {
    const { begin } = useAbortableFetch();
    const [loaded, setLoaded] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [server, setServer] = useState<Record<string, string>>({});
    const [meta, setMeta] = useState<Record<string, Meta>>({});
    const [drafts, setDrafts] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState<Record<string, boolean>>({});
    const [isSavingGeneral, setIsSavingGeneral] = useState(false);
    const [confirm, setConfirm] = useState<ConfirmState | null>(null);
    const [confirmBusy, setConfirmBusy] = useState(false);
    const [cutoffInput, setCutoffInput] = useState("");
    const [emailInput, setEmailInput] = useState("");
    const [emailError, setEmailError] = useState("");
    const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id);
    const loadedRef = useRef(false);

    /* ---- load (silent refetches never swap the page for a spinner) ---- */
    const fetchSettings = useCallback(
        async (options?: { silent?: boolean }) => {
            const run = begin();
            if (!options?.silent) setLoadError(false);
            try {
                const res = await authenticatedFetch(SETTINGS_URL, { signal: run.signal });
                if (!run.isCurrent()) return;
                if (!res?.ok) throw new Error(await readErrorMessage(res, "Could not load platform settings"));
                const data = await res.json();
                if (!run.isCurrent()) return;
                const rows: SettingRow[] = Array.isArray(data?.data) ? data.data : [];
                const nextServer: Record<string, string> = {};
                const nextMeta: Record<string, Meta> = {};
                for (const row of rows) {
                    if (!row?.key) continue;
                    nextServer[row.key] = String(row.value ?? "");
                    nextMeta[row.key] = { at: row.updatedAt ?? row.updated_at ?? undefined, by: whoFromRow(row) };
                }
                setServer(nextServer);
                setMeta(nextMeta);
                loadedRef.current = true;
                setLoaded(true);
                setLoadError(false);
            } catch (error) {
                if (isAbortError(error)) return;
                console.error("Failed to fetch settings", error);
                // Only the very first load is allowed to show an error state; later failures keep the page.
                if (!loadedRef.current) setLoadError(true);
                else if (!options?.silent) toast.error("Could not refresh settings");
            }
        },
        [begin],
    );

    useEffect(() => {
        void fetchSettings();
    }, [fetchSettings]);

    /* ---- derived values ---- */
    const baselineOf = (key: string): string =>
        key === MEMBERSHIP_FEE_PARTNER_PKR_KEY
            ? String(parseMembershipFeePkrSettingValue(server[key], 1000))
            : key === STUDENT_SUBSCRIPTION_FEE_PKR_KEY
              ? String(parseMembershipFeePkrSettingValue(server[key], STUDENT_SUBSCRIPTION_DEFAULT_FEE_PKR))
              : (server[key] ?? "");
    const draftOf = (key: string): string => drafts[key] ?? baselineOf(key);
    const isDirty = (key: string): boolean => drafts[key] !== undefined && drafts[key] !== baselineOf(key);
    const setDraft = (key: string, value: string) => setDrafts((d) => ({ ...d, [key]: value }));
    const dirtyKeys = Object.keys(drafts).filter(isDirty);
    const generalDirtyKeys = GENERAL_SETTING_KEYS.filter(isDirty);

    useEffect(() => {
        if (dirtyKeys.length === 0) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [dirtyKeys.length]);

    /* ---- scrollspy for the sticky nav ---- */
    useEffect(() => {
        if (!loaded) return;
        const els = Array.from(document.querySelectorAll<HTMLElement>("[data-settings-section]"));
        if (els.length === 0 || typeof IntersectionObserver === "undefined") return;
        const io = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) setActiveSection(entry.target.id);
                }
            },
            { rootMargin: "-15% 0px -70% 0px" },
        );
        els.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, [loaded]);

    /* ---- persistence ---- */
    const saveKey = async (key: string, value: string, label: string): Promise<boolean> => {
        setSaving((s) => ({ ...s, [key]: true }));
        try {
            const res = await authenticatedFetch(SETTINGS_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key, value }),
            });
            if (!res?.ok) {
                toast.error(await readErrorMessage(res, `Failed to save ${label}`));
                return false;
            }
            // Only this control moves: update it locally, drop its draft, then reconcile silently.
            setServer((p) => ({ ...p, [key]: value }));
            setMeta((p) => ({ ...p, [key]: { at: new Date().toISOString(), by: undefined } }));
            setDrafts((d) => {
                const { [key]: _removed, ...rest } = d;
                void _removed;
                return rest;
            });
            void fetchSettings({ silent: true });
            return true;
        } catch (error) {
            console.error(`Failed to save setting ${key}`, error);
            toast.error(`Failed to save ${label}`);
            return false;
        } finally {
            setSaving((s) => ({ ...s, [key]: false }));
        }
    };

    const saveToggle = async (key: string, next: boolean, label: string, message: string) => {
        if (saving[key]) return;
        if (await saveKey(key, next ? "true" : "false", label)) toast.success(message);
    };

    const askConfirm = (c: ConfirmState) => setConfirm(c);

    const runConfirm = async () => {
        if (!confirm) return;
        setConfirmBusy(true);
        try {
            await confirm.run();
        } finally {
            setConfirmBusy(false);
            setConfirm(null);
        }
    };

    /* ---- toggle values ---- */
    const applyPaused = parseBool(server[STUDENT_APPLY_MAINTENANCE_ENABLED_KEY], false);
    const privateTeamEnabled = parseBool(server[STUDENT_PRIVATE_TEAM_ENABLED_KEY], false);
    const aiDraftEnabled = parseBool(server[STUDENT_AI_OPPORTUNITY_DRAFT_ENABLED_KEY], false);
    const partnerMembershipRequired = parsePartnerMembershipRequiredSettingValue(
        server[PARTNER_MEMBERSHIP_REQUIRED_KEY],
        false,
    );
    const universityMembershipRequired = parsePartnerMembershipRequiredSettingValue(
        server[UNIVERSITY_MEMBERSHIP_REQUIRED_KEY],
        false,
    );
    const corporateMembershipRequired = parsePartnerMembershipRequiredSettingValue(
        server[CORPORATE_MEMBERSHIP_REQUIRED_KEY],
        false,
    );
    const studentSubscriptionRequired = parseStudentSubscriptionRequiredSettingValue(
        server[STUDENT_SUBSCRIPTION_REQUIRED_KEY],
        true,
    );
    const maintenanceMode = parseBool(server[MAINTENANCE_MODE_KEY], false);
    const allowRegistrations = parseBool(server[ALLOW_REGISTRATIONS_KEY], true);
    const closedBefore = parseStudentApplyClosedBefore(server[STUDENT_APPLY_CLOSED_BEFORE_KEY]);

    const onPartnerMembershipToggle = (next: boolean) => {
        if (next) {
            void saveToggle(
                PARTNER_MEMBERSHIP_REQUIRED_KEY,
                true,
                "partner membership setting",
                "Partner membership is now required — new NGO/partner signups must pay before full portal access.",
            );
            return;
        }
        askConfirm({
            title: "Stop requiring partner membership?",
            description:
                "Turning this OFF will activate NGO/partner accounts that are currently pending membership payment, so they get full portal access without paying. New partners will also register without a membership step.",
            confirmLabel: "Turn off and activate pending NGOs",
            variant: "warning",
            run: () =>
                saveToggle(
                    PARTNER_MEMBERSHIP_REQUIRED_KEY,
                    false,
                    "partner membership setting",
                    "Partner membership is no longer required. Pending NGOs are being activated.",
                ),
        });
    };

    /** University / corporate fee switch. Off sends pending accounts to admin verification, not straight in. */
    const onOrgMembershipToggle = (key: string, kind: "University" | "Corporate") => (next: boolean) => {
        const noun = kind.toLowerCase();
        if (next) {
            void saveToggle(
                key,
                true,
                `${noun} membership setting`,
                `${kind} membership is now required — new ${noun} signups must pay before full portal access.`,
            );
            return;
        }
        askConfirm({
            title: `Stop requiring ${noun} membership?`,
            description: `Turning this OFF stops charging the membership fee to new ${noun} accounts. ${kind} accounts currently pending payment move to admin verification: they get the portal once you approve their organisation (already-approved organisations get it right away).`,
            confirmLabel: "Turn off",
            variant: "warning",
            run: () =>
                saveToggle(
                    key,
                    false,
                    `${noun} membership setting`,
                    `${kind} membership is no longer required. New ${noun} accounts wait for organisation approval instead.`,
                ),
        });
    };

    const onStudentSubscriptionToggle = (next: boolean) => {
        if (next) {
            void saveToggle(
                STUDENT_SUBSCRIPTION_REQUIRED_KEY,
                true,
                "student subscription setting",
                "Student subscription is now required — new students from non-member universities pay before the portal unlocks.",
            );
            return;
        }
        askConfirm({
            title: "Stop requiring the student subscription fee?",
            description:
                "Turning this OFF activates every student account currently waiting on the subscription fee, so they get the portal without paying. New students from non-member universities will also register without a payment step.",
            confirmLabel: "Turn off and activate pending students",
            variant: "warning",
            run: () =>
                saveToggle(
                    STUDENT_SUBSCRIPTION_REQUIRED_KEY,
                    false,
                    "student subscription setting",
                    "Student subscription is no longer required. Pending students are being activated.",
                ),
        });
    };

    const onMaintenanceToggle = (next: boolean) => {
        if (!next) {
            void saveToggle(MAINTENANCE_MODE_KEY, false, "maintenance mode", "Maintenance mode is OFF — the platform is open again.");
            return;
        }
        askConfirm({
            title: "Turn ON maintenance mode?",
            description: (
                <span>
                    <strong>Everyone except admins will be blocked immediately</strong> (students, faculty, partners and
                    visitors receive a 503 &quot;under maintenance&quot; response). Only use this for planned downtime.
                    Make sure you stay signed in as an admin so you can turn it off again.
                </span>
            ),
            confirmLabel: "Turn on maintenance",
            variant: "danger",
            requireText: MAINTENANCE_CONFIRM_TEXT,
            run: () =>
                saveToggle(MAINTENANCE_MODE_KEY, true, "maintenance mode", "Maintenance mode is ON — non-admin users are blocked."),
        });
    };

    const onRegistrationsToggle = (next: boolean) => {
        if (next) {
            void saveToggle(ALLOW_REGISTRATIONS_KEY, true, "registrations setting", "Registrations are open again.");
            return;
        }
        askConfirm({
            title: "Close new registrations?",
            description:
                "Signup will close for everyone: no new students, faculty or partners can create an account until you turn this back on. Existing users are not affected.",
            confirmLabel: "Close registrations",
            variant: "warning",
            run: () => saveToggle(ALLOW_REGISTRATIONS_KEY, false, "registrations setting", "Registrations are CLOSED."),
        });
    };

    /* ---- expiry control ---- */
    const closeNow = () =>
        askConfirm({
            title: "Close applications for all existing listings?",
            description:
                "Join / Apply closes on every opportunity created up to now, and they show as Expired. Enrolled students keep reports and attendance. Listings created after this can still accept applications unless the pause switch is on.",
            confirmLabel: "Close now",
            variant: "warning",
            run: async () => {
                // 1s back-off so small client/server clock skew never trips the "not in the future" rule.
                const iso = new Date(Date.now() - 1000).toISOString();
                if (await saveKey(STUDENT_APPLY_CLOSED_BEFORE_KEY, iso, "application cutoff")) {
                    toast.success("Existing opportunities can no longer accept new applications.");
                }
            },
        });

    const cutoffDate = cutoffInput ? new Date(cutoffInput) : null;
    const cutoffInvalid =
        cutoffInput !== "" && (!cutoffDate || Number.isNaN(cutoffDate.getTime()) || cutoffDate.getTime() > Date.now());

    const setCutoff = () => {
        if (!cutoffDate || cutoffInvalid) return;
        askConfirm({
            title: "Set application cutoff?",
            description: `Listings created before ${formatAdminDateTime(cutoffDate)} will stop accepting applications.`,
            confirmLabel: "Set cutoff",
            variant: "warning",
            run: async () => {
                if (await saveKey(STUDENT_APPLY_CLOSED_BEFORE_KEY, cutoffDate.toISOString(), "application cutoff")) {
                    setCutoffInput("");
                    toast.success("Application cutoff saved.");
                }
            },
        });
    };

    const turnOffExpiry = () =>
        askConfirm({
            title: "Turn off the application cutoff?",
            description:
                "Existing listings will accept Join / Apply again (unless the pause switch is on or a listing's own deadline has passed).",
            confirmLabel: "Turn off",
            variant: "default",
            run: async () => {
                if (await saveKey(STUDENT_APPLY_CLOSED_BEFORE_KEY, STUDENT_APPLY_CLOSED_BEFORE_DISABLED, "application cutoff")) {
                    toast.success("Cutoff is off. Existing listings can accept applications again.");
                }
            },
        });

    /* ---- General (top save) ---- */
    const siteNameError = draftOf(SITE_NAME_KEY).trim().length > SITE_NAME_MAX ? `Max ${SITE_NAME_MAX} characters.` : "";
    const contactEmailError =
        isDirty(CONTACT_EMAIL_KEY) && !EMAIL_RE.test(draftOf(CONTACT_EMAIL_KEY).trim())
            ? "Enter a valid email address."
            : "";

    const handleSaveGeneral = async () => {
        if (generalDirtyKeys.length === 0) return;
        if (siteNameError || contactEmailError) {
            toast.error(siteNameError || contactEmailError);
            return;
        }
        setIsSavingGeneral(true);
        try {
            let ok = true;
            for (const key of generalDirtyKeys) {
                const label = key === SITE_NAME_KEY ? "site name" : "support email";
                const success = await saveKey(key, draftOf(key).trim(), label);
                if (!success) ok = false;
            }
            if (ok) toast.success("Settings saved");
        } finally {
            setIsSavingGeneral(false);
        }
    };

    /* ---- sub-controls (closures over page state) ---- */
    const renderMessageField = (
        key: string,
        label: string,
        defaultText: string,
        tone: string,
        btn: string,
    ) => {
        const value = draftOf(key);
        const tooLong = value.length > MESSAGE_MAX;
        const busy = !!saving[key];
        const fieldId = `field-${key}`;
        return (
            <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                <label htmlFor={fieldId} className="block text-sm font-bold text-slate-700">
                    {label}
                    <DirtyDot show={isDirty(key)} />
                </label>
                <textarea
                    id={fieldId}
                    rows={3}
                    value={value}
                    placeholder={defaultText}
                    onChange={(e) => setDraft(key, e.target.value)}
                    disabled={busy}
                    aria-invalid={tooLong}
                    className={`${inputCls} ${tone}`}
                />
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span>Leave blank and save to restore the default message.</span>
                    <span className={tooLong ? "font-semibold text-red-600" : ""}>
                        {value.length}/{MESSAGE_MAX}
                    </span>
                </div>
                {!baselineOf(key).trim() && (
                    <p className="text-xs text-slate-500">Currently showing the default message.</p>
                )}
                <UpdatedMeta meta={meta[key]} />
                <button
                    type="button"
                    onClick={async () => {
                        if (await saveKey(key, value.trim(), label)) {
                            toast.success(value.trim() ? "Message saved" : "Message reset to default");
                        }
                    }}
                    disabled={busy || tooLong || !isDirty(key)}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all disabled:opacity-60 ${btn}`}
                >
                    {busy ? <Spinner /> : <Save className="h-4 w-4" aria-hidden="true" />}
                    Save message
                </button>
            </div>
        );
    };

    const renderIntegerField = (opts: {
        key: string;
        label: string;
        help: string;
        min: number;
        max: number;
        prefix?: string;
        saveLabel: string;
        success: (n: number) => string;
        btn: string;
    }) => {
        const { key, label, help, min, max, prefix, saveLabel, success, btn } = opts;
        const value = draftOf(key);
        const valid = isValidWholeNumberInRange(value, min, max);
        const busy = !!saving[key];
        const dirty = isDirty(key);
        const fieldId = `field-${key}`;
        const showError = dirty && !valid;
        return (
            <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3.5">
                <label htmlFor={fieldId} className="mb-2 block text-xs font-bold text-slate-700">
                    {label}
                    <DirtyDot show={dirty} />
                </label>
                <div className="flex flex-col gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="relative">
                            {prefix && (
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                                    {prefix}
                                </span>
                            )}
                            <input
                                id={fieldId}
                                type="text"
                                inputMode="numeric"
                                autoComplete="off"
                                value={value}
                                placeholder={baselineOf(key) ? undefined : "Not set"}
                                onChange={(e) => setDraft(key, e.target.value.replace(/[^\d]/g, ""))}
                                disabled={busy}
                                aria-invalid={showError}
                                aria-describedby={`${fieldId}-help`}
                                className={`${inputCls} ${prefix ? "pl-12" : ""}`}
                            />
                        </div>
                        <p id={`${fieldId}-help`} className={`mt-1 text-xs ${showError ? "text-red-600" : "text-slate-500"}`}>
                            {showError
                                ? `Enter a whole number from ${min.toLocaleString()} to ${max.toLocaleString()}.`
                                : help}
                        </p>
                        {!baselineOf(key) && <p className="mt-1 text-xs text-slate-500">Not set yet — the platform default applies.</p>}
                        <UpdatedMeta meta={meta[key]} />
                    </div>
                    <button
                        type="button"
                        onClick={async () => {
                            if (!valid) return;
                            const n = Number(value);
                            if (await saveKey(key, String(n), label)) toast.success(success(n));
                        }}
                        disabled={busy || !dirty || !valid}
                        className={`inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg px-3.5 py-2 text-xs font-bold text-white transition-all disabled:opacity-60 ${btn}`}
                    >
                        {busy ? <Spinner className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" aria-hidden="true" />}
                        {saveLabel}
                    </button>
                </div>
            </div>
        );
    };

    /* ---- review emails (chips) ---- */
    const reviewEmails = parseEmailList(draftOf(ADMIN_REVIEW_EMAILS_KEY));
    const setReviewEmails = (list: string[]) => setDraft(ADMIN_REVIEW_EMAILS_KEY, list.join(","));

    const addEmails = (raw: string) => {
        const parts = raw
            .split(/[,\s;]+/)
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean);
        if (parts.length === 0) return;
        const bad = parts.find((p) => !EMAIL_RE.test(p));
        if (bad) {
            setEmailError(`"${bad}" is not a valid email address.`);
            return;
        }
        const merged = [...new Set([...reviewEmails, ...parts])];
        if (merged.length > MAX_REVIEW_EMAILS) {
            setEmailError(`At most ${MAX_REVIEW_EMAILS} addresses are allowed.`);
            return;
        }
        setEmailError("");
        setEmailInput("");
        setReviewEmails(merged);
    };

    const reviewEmailsDirty = isDirty(ADMIN_REVIEW_EMAILS_KEY);

    /* ---- early states ---- */
    if (!loaded) {
        if (loadError) {
            return (
                <div className="mx-auto flex h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
                    <AlertTriangle className="h-8 w-8 text-amber-500" aria-hidden="true" />
                    <p className="text-slate-700">Could not load platform settings.</p>
                    <button
                        type="button"
                        onClick={() => void fetchSettings()}
                        className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-800"
                    >
                        <RefreshCw className="h-4 w-4" aria-hidden="true" /> Retry
                    </button>
                </div>
            );
        }
        return (
            <div className="flex h-[60vh] items-center justify-center" role="status" aria-label="Loading settings">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
        );
    }

    const reportingFeeSet = /^\d+$/.test((server[REPORTING_FEE_PKR_KEY] ?? "").trim());
    const reportingFeeValue = reportingFeeSet ? Number(server[REPORTING_FEE_PKR_KEY]) : null;
    const unsavedCount = dirtyKeys.length;

    return (
        <div className="mx-auto max-w-6xl p-0 lg:p-8">
            <div className="mb-5 flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0">
                    <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-teal-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-teal-500" aria-hidden="true" />
                        Platform governance / Central control
                    </p>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">System settings</h1>
                    <p className="mt-1 text-slate-500">
                        Manage access, application windows, fees, approvals and platform communications in one secure workspace.
                    </p>
                </div>
                <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                    <span
                        className={`text-xs font-semibold ${unsavedCount > 0 ? "text-amber-700" : "text-slate-500"}`}
                        aria-live="polite"
                    >
                        {unsavedCount === 0
                            ? "No unsaved changes"
                            : generalDirtyKeys.length > 0
                              ? `${unsavedCount} unsaved change${unsavedCount === 1 ? "" : "s"}`
                              : `${unsavedCount} unsaved change${unsavedCount === 1 ? "" : "s"} — use the field's own Save button`}
                    </span>
                    <button
                        type="button"
                        onClick={() => void handleSaveGeneral()}
                        disabled={isSavingGeneral || generalDirtyKeys.length === 0}
                        title="Saves site name and support email. Switches and fees save on their own."
                        className="flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-teal-800 disabled:opacity-60"
                    >
                        {isSavingGeneral ? <Spinner /> : <Save className="h-4 w-4" aria-hidden="true" />}
                        Save changes
                    </button>
                </div>
            </div>

            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-teal-100 bg-teal-50/70 px-4 py-3 text-sm text-teal-900">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
                <p>
                    <strong>Live configuration.</strong> Switches and fees apply to the platform the moment they save, and every
                    change is recorded in the audit log. Site name and support email use the Save button.
                </p>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="Applications"
                    value={applyPaused ? "Paused" : "Open"}
                    sub={applyPaused ? "Join / Apply is paused for students" : "Students can join or apply"}
                    icon={<Layers className="h-4 w-4" />}
                    tone="bg-teal-50 text-teal-700"
                />
                <StatCard
                    label="Registrations"
                    value={allowRegistrations ? "Open" : "Closed"}
                    sub={allowRegistrations ? "New accounts accepted" : "Signup is closed to new users"}
                    icon={<Users className="h-4 w-4" />}
                    tone="bg-sky-50 text-sky-700"
                />
                <StatCard
                    label="Maintenance mode"
                    value={maintenanceMode ? "On" : "Off"}
                    sub={maintenanceMode ? "Non-admin users are blocked" : "Platform operating normally"}
                    icon={<Settings2 className="h-4 w-4" />}
                    tone={maintenanceMode ? "bg-red-50 text-red-700" : "bg-indigo-50 text-indigo-700"}
                />
                <StatCard
                    label="Reporting fee"
                    value={reportingFeeValue != null ? `PKR ${reportingFeeValue.toLocaleString()}` : "Not set"}
                    sub={reportingFeeValue != null ? "Charged per student at report submit" : "Default PKR 200 applies until set"}
                    icon={<CircleDollarSign className="h-4 w-4" />}
                    tone="bg-amber-50 text-amber-700"
                />
            </div>

            <nav
                aria-label="Settings sections"
                className="sticky top-16 z-20 -mx-4 mb-5 overflow-x-auto border-y border-slate-200/80 bg-white/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border"
            >
                <ul className="flex min-w-max items-center gap-1">
                    {SECTIONS.map((s) => (
                        <li key={s.id}>
                            <a
                                href={`#${s.id}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                                    setActiveSection(s.id);
                                }}
                                aria-current={activeSection === s.id ? "true" : undefined}
                                className={`block whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                                    activeSection === s.id ? "bg-teal-50 text-teal-800" : "text-slate-600 hover:bg-slate-100"
                                }`}
                            >
                                {s.label}
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
                <div className="min-w-0 space-y-5">
                    {/* ------------------------- Applications & expiry ------------------------- */}
                    <Section
                        id="apps"
                        title="Applications & expiry"
                        subtitle="Control new applications without disrupting existing projects"
                        badge="Access policy"
                        icon={<PauseCircle className="h-5 w-5" />}
                    >
                        <ToggleRow
                            id="apply-pause"
                            title="Pause Join / Apply (temporary maintenance)"
                            description={
                                <>
                                    When <strong>on</strong>, students cannot join or apply to any listing. The message below
                                    is shown on Browse. Reports, attendance, faculty review, and admin tools keep working.
                                </>
                            }
                            checked={applyPaused}
                            saving={!!saving[STUDENT_APPLY_MAINTENANCE_ENABLED_KEY]}
                            color="amber"
                            tone="bg-amber-50/50"
                            meta={meta[STUDENT_APPLY_MAINTENANCE_ENABLED_KEY]}
                            stateLabel={applyPaused ? "Apply paused" : "Apply not paused"}
                            onChange={(next) =>
                                void saveToggle(
                                    STUDENT_APPLY_MAINTENANCE_ENABLED_KEY,
                                    next,
                                    "apply pause",
                                    next
                                        ? "Student apply is paused. Reports, attendance, and reviews still work."
                                        : "Student apply is open again (except listings closed by the cutoff).",
                                )
                            }
                        />

                        <ToggleRow
                            id="private-team"
                            title="Let students create Private Team opportunities"
                            description={
                                <>
                                    When <strong>on</strong>, the student create form asks <em>Who can join?</em>: a Private Team
                                    (1–20 seats, nobody applies, the creator adds members from the report) or an Open
                                    Opportunity (Apply Now, report teams of up to 20). When <strong>off</strong>, new listings use
                                    today&apos;s flow. Existing private teams keep their rules either way.
                                </>
                            }
                            checked={privateTeamEnabled}
                            saving={!!saving[STUDENT_PRIVATE_TEAM_ENABLED_KEY]}
                            color="emerald"
                            tone="bg-emerald-50/40"
                            meta={meta[STUDENT_PRIVATE_TEAM_ENABLED_KEY]}
                            stateLabel={privateTeamEnabled ? "Private teams available" : "Private teams off"}
                            onChange={(next) =>
                                void saveToggle(
                                    STUDENT_PRIVATE_TEAM_ENABLED_KEY,
                                    next,
                                    "private team setting",
                                    next
                                        ? "Students can now choose Private Team or Open Opportunity when creating."
                                        : "Private Team is hidden for new opportunities. Existing private teams are unchanged.",
                                )
                            }
                        />

                        <ToggleRow
                            id="ai-draft"
                            title="Let students draft opportunities with AI (Generate & Auto-Fill)"
                            description={
                                <>
                                    When <strong>on</strong>, the create form offers <em>Generate &amp; Auto-Fill</em>: the student
                                    describes the idea in any words and AI drafts the editable text (title, summary, plan, SDG,
                                    skills). AI never fills faculty, partner contacts, location pin, declarations or signature. Needs
                                    the server&apos;s OpenAI key; limited to 3 drafts a minute and 30 a day per user.
                                </>
                            }
                            checked={aiDraftEnabled}
                            saving={!!saving[STUDENT_AI_OPPORTUNITY_DRAFT_ENABLED_KEY]}
                            color="emerald"
                            tone="bg-emerald-50/40"
                            meta={meta[STUDENT_AI_OPPORTUNITY_DRAFT_ENABLED_KEY]}
                            stateLabel={aiDraftEnabled ? "AI drafting available" : "AI drafting off"}
                            onChange={(next) =>
                                void saveToggle(
                                    STUDENT_AI_OPPORTUNITY_DRAFT_ENABLED_KEY,
                                    next,
                                    "AI draft setting",
                                    next
                                        ? "Students can now use Generate & Auto-Fill (when the OpenAI key is configured)."
                                        : "Generate & Auto-Fill is hidden.",
                                )
                            }
                        />

                        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                            <div className="flex items-center gap-2 font-bold text-slate-900">
                                <TimerOff className="h-4 w-4 shrink-0 text-slate-600" aria-hidden="true" />
                                Close applications for listings created before…
                            </div>
                            <p className="mt-1 text-sm leading-relaxed text-slate-600">
                                Listings created before the cutoff show as <strong>Expired</strong> and students cannot Join /
                                Apply. Reports, attendance and reviews keep working. Listings created after the cutoff are
                                unaffected.
                            </p>
                            <div className="mt-3 rounded-lg bg-white p-3 text-sm" aria-live="polite">
                                {saving[STUDENT_APPLY_CLOSED_BEFORE_KEY] ? (
                                    <span className="flex items-center gap-2 font-medium text-slate-700">
                                        <Spinner className="h-3.5 w-3.5" /> Saving…
                                    </span>
                                ) : closedBefore ? (
                                    <span className="font-semibold text-slate-900">
                                        Active: listings created before {formatAdminDateTime(closedBefore)} are closed.
                                    </span>
                                ) : (
                                    <span className="font-semibold text-slate-700">Off: no listings are closed by a cutoff.</span>
                                )}
                                <UpdatedMeta meta={meta[STUDENT_APPLY_CLOSED_BEFORE_KEY]} />
                            </div>
                            <div className="mt-3">
                                <label htmlFor="field-cutoff" className="mb-1 block text-sm font-bold text-slate-700">
                                    Cutoff date and time (your local time)
                                </label>
                                <input
                                    id="field-cutoff"
                                    type="datetime-local"
                                    value={cutoffInput}
                                    max={toLocalInput(new Date())}
                                    onChange={(e) => setCutoffInput(e.target.value)}
                                    aria-invalid={cutoffInvalid}
                                    className={`${inputCls} max-w-xs`}
                                />
                                {cutoffInvalid && (
                                    <p className="mt-1 text-xs text-red-600">Pick a valid date that is not in the future.</p>
                                )}
                            </div>
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                                <button
                                    type="button"
                                    onClick={setCutoff}
                                    disabled={!cutoffInput || cutoffInvalid || !!saving[STUDENT_APPLY_CLOSED_BEFORE_KEY]}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-900 disabled:opacity-60"
                                >
                                    Set cutoff
                                </button>
                                <button
                                    type="button"
                                    onClick={closeNow}
                                    disabled={!!saving[STUDENT_APPLY_CLOSED_BEFORE_KEY]}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
                                >
                                    Close now
                                </button>
                                <button
                                    type="button"
                                    onClick={turnOffExpiry}
                                    disabled={!closedBefore || !!saving[STUDENT_APPLY_CLOSED_BEFORE_KEY]}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                                >
                                    Turn off
                                </button>
                            </div>
                        </div>
                    </Section>

                    {/* ---------------------------- Student messages ---------------------------- */}
                    <Section
                        id="messages"
                        title="Student messages"
                        subtitle="What students read on Browse while applications are paused or expired"
                        badge="Copy"
                        icon={<MessageSquareText className="h-5 w-5" />}
                        tone="bg-amber-50 text-amber-700"
                    >
                        {renderMessageField(
                            STUDENT_APPLY_MAINTENANCE_MESSAGE_KEY,
                            "Message students see while paused",
                            DEFAULT_STUDENT_APPLY_MAINTENANCE_MESSAGE,
                            "focus:border-amber-500",
                            "bg-amber-600 hover:bg-amber-700",
                        )}
                        {renderMessageField(
                            STUDENT_APPLY_EXPIRED_MESSAGE_KEY,
                            "Expired message students see",
                            DEFAULT_STUDENT_APPLY_EXPIRED_MESSAGE,
                            "focus:border-slate-500",
                            "bg-slate-800 hover:bg-slate-900",
                        )}
                    </Section>

                    {/* --------------------------- Reports & partners --------------------------- */}
                    <Section
                        id="reports"
                        title="Reports & partners"
                        subtitle="Partner approvals and membership enforcement"
                        badge="Approvals"
                        icon={<FileCheck className="h-5 w-5" />}
                        tone="bg-indigo-50 text-indigo-700"
                    >
                        <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
                            Impact <strong>report</strong> approval is CIEL PK Admin only. NGO / partner still
                            review opportunities and attendance. This does not change opportunity creation,
                            student join, or attendance approval flows.
                        </div>
                        <ToggleRow
                            id="partner-membership"
                            title="Require membership fee for new NGO / partners"
                            description={
                                <>
                                    When <strong>on</strong>, new partner signups start as pending membership payment and must
                                    submit bank proof (or wait for admin activation) before using the partner portal. When{" "}
                                    <strong>off</strong>, partners register without this step and any pending NGOs are
                                    activated.
                                </>
                            }
                            checked={partnerMembershipRequired}
                            saving={!!saving[PARTNER_MEMBERSHIP_REQUIRED_KEY]}
                            color="emerald"
                            tone="bg-emerald-50/40"
                            meta={meta[PARTNER_MEMBERSHIP_REQUIRED_KEY]}
                            stateLabel={partnerMembershipRequired ? "Required on signup" : "Not required on signup"}
                            onChange={onPartnerMembershipToggle}
                        />
                        <ToggleRow
                            id="university-membership"
                            title="Require membership fee for new universities"
                            description={
                                <>
                                    When <strong>on</strong>, new university signups pay the university membership fee
                                    (bank proof, reviewed by admin) before using the portal. When <strong>off</strong>, they
                                    register without paying and get the portal once you approve their organisation.
                                </>
                            }
                            checked={universityMembershipRequired}
                            saving={!!saving[UNIVERSITY_MEMBERSHIP_REQUIRED_KEY]}
                            color="emerald"
                            tone="bg-emerald-50/40"
                            meta={meta[UNIVERSITY_MEMBERSHIP_REQUIRED_KEY]}
                            stateLabel={universityMembershipRequired ? "Required on signup" : "Not required on signup"}
                            onChange={onOrgMembershipToggle(UNIVERSITY_MEMBERSHIP_REQUIRED_KEY, "University")}
                        />
                        <ToggleRow
                            id="corporate-membership"
                            title="Require membership fee for new corporates"
                            description={
                                <>
                                    When <strong>on</strong>, new corporate signups pay the corporate membership fee before
                                    using the portal. When <strong>off</strong>, they register without paying and get the
                                    portal once you approve their organisation.
                                </>
                            }
                            checked={corporateMembershipRequired}
                            saving={!!saving[CORPORATE_MEMBERSHIP_REQUIRED_KEY]}
                            color="emerald"
                            tone="bg-emerald-50/40"
                            meta={meta[CORPORATE_MEMBERSHIP_REQUIRED_KEY]}
                            stateLabel={corporateMembershipRequired ? "Required on signup" : "Not required on signup"}
                            onChange={onOrgMembershipToggle(CORPORATE_MEMBERSHIP_REQUIRED_KEY, "Corporate")}
                        />
                    </Section>
                </div>

                <div className="min-w-0 space-y-5">
                    {/* --------------------------- Fees & payments --------------------------- */}
                    <Section
                        id="fees"
                        title="Fees & payments"
                        subtitle="Configure PKR amounts for each stakeholder category"
                        badge="PKR · Whole numbers"
                        icon={<CreditCard className="h-5 w-5" />}
                        tone="bg-amber-50 text-amber-700"
                    >
                        <p className="text-xs text-slate-500">
                            Whole PKR amounts from {FEE_PKR_MIN.toLocaleString()} to {FEE_PKR_MAX.toLocaleString()}. No decimals.
                        </p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {renderIntegerField({
                            key: MEMBERSHIP_FEE_PARTNER_PKR_KEY,
                            label: "Partner membership fee (PKR)",
                            help: "Used when partner membership is required. Shown on the partner bank-transfer screen.",
                            min: FEE_PKR_MIN,
                            max: FEE_PKR_MAX,
                            prefix: "PKR",
                            saveLabel: "Save fee",
                            success: (n) => `Partner membership fee updated to PKR ${n.toLocaleString()}`,
                            btn: "bg-emerald-600 hover:bg-emerald-700",
                        })}
                        {renderIntegerField({
                            key: MEMBERSHIP_FEE_UNIVERSITY_PKR_KEY,
                            label: "University membership fee (PKR)",
                            help: "Used when university membership is required. Shown on the university bank-transfer screen.",
                            min: FEE_PKR_MIN,
                            max: FEE_PKR_MAX,
                            prefix: "PKR",
                            saveLabel: "Save fee",
                            success: (n) => `University membership fee updated to PKR ${n.toLocaleString()}`,
                            btn: "bg-emerald-600 hover:bg-emerald-700",
                        })}
                        {renderIntegerField({
                            key: MEMBERSHIP_FEE_CORPORATE_PKR_KEY,
                            label: "Corporate membership fee (PKR)",
                            help: "Used when corporate membership is required. Shown on the corporate bank-transfer screen.",
                            min: FEE_PKR_MIN,
                            max: FEE_PKR_MAX,
                            prefix: "PKR",
                            saveLabel: "Save fee",
                            success: (n) => `Corporate membership fee updated to PKR ${n.toLocaleString()}`,
                            btn: "bg-emerald-600 hover:bg-emerald-700",
                        })}
                        {renderIntegerField({
                            key: REPORTING_FEE_PKR_KEY,
                            label: "Reporting fee (PKR)",
                            help: "Fee shown to students when submitting a report that requires payment.",
                            min: FEE_PKR_MIN,
                            max: FEE_PKR_MAX,
                            prefix: "PKR",
                            saveLabel: "Save fee",
                            success: (n) => `Reporting fee updated to PKR ${n.toLocaleString()}`,
                            btn: "bg-emerald-600 hover:bg-emerald-700",
                        })}
                        </div>
                        <ToggleRow
                            id="student-subscription"
                            title="Require subscription fee from students of non-member universities"
                            description={
                                <>
                                    When <strong>on</strong>, a student whose university is not a CIEL member organization signs up
                                    as pending subscription payment and must submit bank proof before the student portal unlocks.
                                    Students of member universities are never charged. When <strong>off</strong>, students register
                                    without this step and any pending students are activated.
                                </>
                            }
                            checked={studentSubscriptionRequired}
                            saving={!!saving[STUDENT_SUBSCRIPTION_REQUIRED_KEY]}
                            color="emerald"
                            tone="bg-emerald-50/40"
                            meta={meta[STUDENT_SUBSCRIPTION_REQUIRED_KEY]}
                            stateLabel={studentSubscriptionRequired ? "Required on signup" : "Not required on signup"}
                            onChange={onStudentSubscriptionToggle}
                        />
                        {renderIntegerField({
                            key: STUDENT_SUBSCRIPTION_FEE_PKR_KEY,
                            label: "Student subscription fee (PKR)",
                            help: "One-time fee shown to students from non-member universities on the subscription screen.",
                            min: FEE_PKR_MIN,
                            max: FEE_PKR_MAX,
                            prefix: "PKR",
                            saveLabel: "Save fee",
                            success: (n) => `Student subscription fee updated to PKR ${n.toLocaleString()}`,
                            btn: "bg-emerald-600 hover:bg-emerald-700",
                        })}
                    </Section>

                    {/* --------------------------- Notifications --------------------------- */}
                    <Section
                        id="notify"
                        title="Notifications & review"
                        subtitle="Who gets review alerts and how fast reviews are due"
                        badge="Review SLA"
                        icon={<Bell className="h-5 w-5" />}
                        tone="bg-violet-50 text-violet-700"
                    >
                        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                            <label htmlFor="field-review-emails" className="block text-sm font-bold text-slate-700">
                                Admin review notification emails
                                <DirtyDot show={reviewEmailsDirty} />
                            </label>
                            <p className="mt-1 text-xs text-slate-500">
                                These addresses are notified about reports awaiting review. Up to {MAX_REVIEW_EMAILS}; at
                                least one is required.
                            </p>
                            {reviewEmails.length > 0 && (
                                <ul className="mt-3 flex flex-wrap gap-2" aria-label="Notification emails">
                                    {reviewEmails.map((email) => (
                                        <li
                                            key={email}
                                            className="inline-flex max-w-full items-center gap-1 rounded-full border border-violet-200 bg-violet-50 py-1 pl-3 pr-1 text-xs font-semibold text-violet-900"
                                        >
                                            <span className="min-w-0 break-all">{email}</span>
                                            <button
                                                type="button"
                                                onClick={() => setReviewEmails(reviewEmails.filter((e) => e !== email))}
                                                disabled={!!saving[ADMIN_REVIEW_EMAILS_KEY]}
                                                aria-label={`Remove ${email}`}
                                                className="rounded-full p-1 hover:bg-violet-100"
                                            >
                                                <X className="h-3 w-3" aria-hidden="true" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                <input
                                    id="field-review-emails"
                                    type="email"
                                    value={emailInput}
                                    placeholder="name@example.com"
                                    onChange={(e) => {
                                        setEmailInput(e.target.value);
                                        if (emailError) setEmailError("");
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === ",") {
                                            e.preventDefault();
                                            addEmails(emailInput);
                                        }
                                    }}
                                    onPaste={(e) => {
                                        const text = e.clipboardData.getData("text");
                                        if (/[,\s;]/.test(text.trim())) {
                                            e.preventDefault();
                                            addEmails(text);
                                        }
                                    }}
                                    disabled={!!saving[ADMIN_REVIEW_EMAILS_KEY] || reviewEmails.length >= MAX_REVIEW_EMAILS}
                                    aria-invalid={!!emailError}
                                    className={`${inputCls} sm:max-w-sm`}
                                />
                                <button
                                    type="button"
                                    onClick={() => addEmails(emailInput)}
                                    disabled={!emailInput.trim() || reviewEmails.length >= MAX_REVIEW_EMAILS}
                                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                                >
                                    Add
                                </button>
                            </div>
                            {emailError && (
                                <p role="alert" className="mt-1 text-xs text-red-600">
                                    {emailError}
                                </p>
                            )}
                            <p className="mt-1 text-xs text-slate-500">
                                {reviewEmails.length}/{MAX_REVIEW_EMAILS} addresses
                            </p>
                            <UpdatedMeta meta={meta[ADMIN_REVIEW_EMAILS_KEY]} />
                            <button
                                type="button"
                                onClick={async () => {
                                    if (emailInput.trim()) {
                                        setEmailError("Press Add (or Enter) to include the address you typed, or clear it.");
                                        return;
                                    }
                                    if (await saveKey(ADMIN_REVIEW_EMAILS_KEY, reviewEmails.join(","), "review emails")) {
                                        toast.success("Review notification emails saved");
                                    }
                                }}
                                disabled={
                                    !!saving[ADMIN_REVIEW_EMAILS_KEY] || !reviewEmailsDirty || reviewEmails.length === 0
                                }
                                className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60"
                            >
                                {saving[ADMIN_REVIEW_EMAILS_KEY] ? <Spinner /> : <Save className="h-4 w-4" aria-hidden="true" />}
                                Save emails
                            </button>
                        </div>
                        {renderIntegerField({
                            key: REVIEW_SLA_DAYS_KEY,
                            label: "Review SLA (days)",
                            help: `Reports waiting longer than this are flagged as overdue. ${SLA_MIN} to ${SLA_MAX} days.`,
                            min: SLA_MIN,
                            max: SLA_MAX,
                            saveLabel: "Save SLA",
                            success: (n) => `Review SLA set to ${n} day${n === 1 ? "" : "s"}`,
                            btn: "bg-violet-600 hover:bg-violet-700",
                        })}
                    </Section>

                    {/* ------------------------------- Platform ------------------------------- */}
                    <Section
                        id="platform"
                        title="Platform access"
                        subtitle="Site identity, maintenance mode and new registrations"
                        badge="System control"
                        icon={<Globe className="h-5 w-5" />}
                        tone="bg-sky-50 text-sky-700"
                    >
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <div>
                                <label htmlFor="field-site-name" className="mb-2 block text-sm font-bold text-slate-700">
                                    Site name
                                    <DirtyDot show={isDirty(SITE_NAME_KEY)} />
                                </label>
                                <input
                                    id="field-site-name"
                                    type="text"
                                    value={draftOf(SITE_NAME_KEY)}
                                    onChange={(e) => setDraft(SITE_NAME_KEY, e.target.value)}
                                    aria-invalid={!!siteNameError}
                                    className={inputCls}
                                />
                                <p className={`mt-1 text-xs ${siteNameError ? "text-red-600" : "text-slate-500"}`}>
                                    {siteNameError || `Up to ${SITE_NAME_MAX} characters.`}
                                </p>
                                <UpdatedMeta meta={meta[SITE_NAME_KEY]} />
                            </div>
                            <div>
                                <label htmlFor="field-contact-email" className="mb-2 block text-sm font-bold text-slate-700">
                                    Support email
                                    <DirtyDot show={isDirty(CONTACT_EMAIL_KEY)} />
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                                    <input
                                        id="field-contact-email"
                                        type="email"
                                        value={draftOf(CONTACT_EMAIL_KEY)}
                                        onChange={(e) => setDraft(CONTACT_EMAIL_KEY, e.target.value)}
                                        aria-invalid={!!contactEmailError}
                                        className={`${inputCls} pl-10`}
                                    />
                                </div>
                                {contactEmailError && <p className="mt-1 text-xs text-red-600">{contactEmailError}</p>}
                                <UpdatedMeta meta={meta[CONTACT_EMAIL_KEY]} />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 text-sm font-bold text-slate-900">
                            <Shield className="h-4 w-4 text-red-500" aria-hidden="true" /> System control
                        </div>
                        <ToggleRow
                            id="maintenance-mode"
                            title="Maintenance mode"
                            description={
                                <>
                                    When <strong>on</strong>, everyone except admins is blocked (503) until you turn it off.
                                    Saves immediately.
                                </>
                            }
                            checked={maintenanceMode}
                            saving={!!saving[MAINTENANCE_MODE_KEY]}
                            color="red"
                            tone={maintenanceMode ? "bg-red-50" : "bg-slate-50"}
                            meta={meta[MAINTENANCE_MODE_KEY]}
                            stateLabel={maintenanceMode ? "ON - non-admins blocked" : "Off"}
                            onChange={onMaintenanceToggle}
                        />
                        <ToggleRow
                            id="allow-registrations"
                            title="Allow registrations"
                            description={
                                <>
                                    When <strong>off</strong>, signup is closed for new users. Existing users can still sign
                                    in. Saves immediately.
                                </>
                            }
                            checked={allowRegistrations}
                            saving={!!saving[ALLOW_REGISTRATIONS_KEY]}
                            color="blue"
                            meta={meta[ALLOW_REGISTRATIONS_KEY]}
                            stateLabel={allowRegistrations ? "Open" : "Closed"}
                            onChange={onRegistrationsToggle}
                        />
                    </Section>
                </div>
            </div>

            <ConfirmDialog
                open={confirm !== null}
                title={confirm?.title ?? ""}
                description={confirm?.description}
                confirmLabel={confirm?.confirmLabel}
                variant={confirm?.variant}
                requireText={confirm?.requireText}
                loading={confirmBusy}
                onConfirm={() => void runConfirm()}
                onCancel={() => {
                    if (!confirmBusy) setConfirm(null);
                }}
            />
        </div>
    );
}
