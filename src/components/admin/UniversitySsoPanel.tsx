"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Copy, ExternalLink, KeyRound, Loader2, RefreshCw, XCircle } from "lucide-react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import StatusBadge from "@/components/admin/StatusBadge";
import { formatAdminDateTime } from "@/utils/adminDate";
import {
    parseDomainList,
    SSO_PROVIDER_OPTIONS,
    SSO_STATUS_LABEL,
    ssoErrorMessage,
    UniversitySsoApiError,
    universitySsoApi,
    type SsoProvider,
    type UniversitySsoDetail,
    type UniversitySsoUpsert,
} from "@/utils/universitySsoApi";

type Form = { provider: SsoProvider; issuer: string; tenantId: string; clientId: string; clientSecret: string; domains: string };
type Pending = "activate" | "activate-skip" | "disable" | "remove" | null;

const inputCls =
    "w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0e7d74] focus:ring-2 focus:ring-[#0e7d74]/20 disabled:bg-slate-50";
const btnCls =
    "inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-[#0e7d74] hover:text-[#0e7d74] disabled:cursor-not-allowed disabled:opacity-50";
const primaryCls =
    "inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0e7d74] px-3 py-2 text-xs font-bold text-white hover:bg-[#0b6760] disabled:cursor-not-allowed disabled:opacity-50";

function formFrom(detail: UniversitySsoDetail | null): Form {
    const s = detail?.sso;
    return {
        provider: s?.provider ?? "google",
        issuer: s?.issuer ?? "",
        tenantId: s?.tenantId ?? "",
        clientId: s?.clientId ?? "",
        clientSecret: "",
        domains: (s?.allowedDomains ?? []).join(", "),
    };
}

function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
    return (
        <label className="block min-w-0">
            <span className="mb-1 block text-xs font-semibold text-slate-700">{label}</span>
            {children}
            {hint ? <span className="mt-1 block text-[11px] leading-relaxed text-slate-500">{hint}</span> : null}
        </label>
    );
}

function CopyRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <div className="mt-1 flex items-start gap-2">
                <code className="min-w-0 flex-1 break-all text-xs text-slate-800">{value}</code>
                <button
                    type="button"
                    onClick={() =>
                        void navigator.clipboard
                            .writeText(value)
                            .then(() => toast.success("Copied"))
                            .catch(() => toast.error("Could not copy. Select the text instead."))
                    }
                    className={`${btnCls} shrink-0 px-2 py-1`}
                    aria-label={`Copy ${label}`}
                >
                    <Copy className="h-3.5 w-3.5" /> Copy
                </button>
            </div>
        </div>
    );
}

/** Super admin: set up, test, activate and switch off student sign-in with this university's own accounts. */
export default function UniversitySsoPanel({ organizationId, onChange }: { organizationId: string; onChange?: () => void }) {
    const [detail, setDetail] = useState<UniversitySsoDetail | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [form, setForm] = useState<Form>(() => formFrom(null));
    const [busy, setBusy] = useState<string | null>(null);
    const [testLink, setTestLink] = useState<{ url: string; expiresAt: string } | null>(null);
    const [pending, setPending] = useState<Pending>(null);

    const load = useCallback(
        async (quiet = false) => {
            if (!quiet) setLoadError(null);
            try {
                const d = await universitySsoApi.get(organizationId);
                setDetail(d);
                setForm(formFrom(d));
                return d;
            } catch (e) {
                if (!quiet || (e instanceof UniversitySsoApiError && e.status === 403)) setLoadError(ssoErrorMessage(e));
                else toast.error(ssoErrorMessage(e));
                return null;
            }
        },
        [organizationId],
    );

    useEffect(() => {
        setDetail(null);
        setTestLink(null);
        void load();
    }, [load]);

    const run = async (key: string, fn: () => Promise<unknown>, success: string) => {
        if (busy) return false;
        setBusy(key);
        try {
            await fn();
            toast.success(success);
            await load(true);
            onChange?.();
            return true;
        } catch (e) {
            toast.error(ssoErrorMessage(e));
            return false;
        } finally {
            setBusy(null);
        }
    };

    if (loadError) {
        return (
            <section className="mt-6 rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-bold text-slate-900">Student single sign-on</h3>
                <p className="mt-2 text-sm text-slate-600">{loadError}</p>
                <button type="button" onClick={() => void load()} className={`${btnCls} mt-3`}>
                    <RefreshCw className="h-3.5 w-3.5" /> Try again
                </button>
            </section>
        );
    }
    if (!detail) {
        return (
            <section className="mt-6 flex h-24 items-center justify-center rounded-xl border border-slate-200">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </section>
        );
    }
    if (!detail.isUniversity) return null;

    const sso = detail.sso;
    const domains = parseDomainList(form.domains);
    const needsSecret = !sso?.hasClientSecret;
    const formErrors = [
        !form.clientId.trim() && "Enter the client ID.",
        needsSecret && !form.clientSecret.trim() && "Enter the client secret.",
        !domains.length && "Add at least one student email domain.",
        form.provider === "microsoft" && !form.tenantId.trim() && "Enter the Microsoft directory (tenant) ID.",
        form.provider === "oidc" && !/^https?:\/\/\S+$/i.test(form.issuer.trim()) && "Enter the provider's issuer URL (https://…).",
    ].filter(Boolean) as string[];

    const save = () => {
        if (formErrors.length) return toast.error(formErrors[0]);
        const body: UniversitySsoUpsert = {
            provider: form.provider,
            clientId: form.clientId.trim(),
            allowedDomains: domains,
            ...(form.provider === "oidc" ? { issuer: form.issuer.trim() } : {}),
            ...(form.provider !== "oidc" && form.tenantId.trim() ? { tenantId: form.tenantId.trim() } : {}),
            ...(form.clientSecret.trim() ? { clientSecret: form.clientSecret.trim() } : {}),
        };
        void run("save", () => universitySsoApi.save(organizationId, body), sso ? "Single sign-on settings saved." : "Single sign-on configured as a draft.");
    };

    const makeTestLink = async () => {
        if (busy) return;
        setBusy("test");
        try {
            setTestLink(await universitySsoApi.testLink(organizationId));
        } catch (e) {
            toast.error(ssoErrorMessage(e));
        } finally {
            setBusy(null);
        }
    };

    const confirmPending = async () => {
        const action = pending;
        if (!action) return;
        const ok =
            action === "activate" || action === "activate-skip"
                ? await run(action, () => universitySsoApi.activate(organizationId, action === "activate-skip"), "Single sign-on is active for this university.")
                : action === "disable"
                  ? await run(action, () => universitySsoApi.disable(organizationId), "Single sign-on disabled. Students sign in with their password.")
                  : await run(action, () => universitySsoApi.remove(organizationId), "Single sign-on configuration removed.");
        if (ok) {
            setPending(null);
            if (action === "remove") setTestLink(null);
        }
    };

    const providerHint = SSO_PROVIDER_OPTIONS.find((p) => p.value === form.provider)?.hint;
    const tested = sso?.lastTestOk === true;

    return (
        <section className="mt-6 rounded-xl border border-slate-200 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        <KeyRound className="h-4 w-4 text-[#0e7d74]" aria-hidden /> Student single sign-on
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">Students of this university sign in with their university Google or Microsoft account. Password sign-in keeps working.</p>
                </div>
                {sso ? <StatusBadge status={sso.status} label={SSO_STATUS_LABEL[sso.status]} /> : <StatusBadge status="inactive" label="Not set up" />}
            </div>

            {!detail.enabled ? (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>
                        The platform switch is off, so no university is offered at sign-in yet. You can still set up and test here. Turn it on in{" "}
                        <Link href="/dashboard/admin/settings#platform" className="font-bold underline">
                            Settings → Platform access
                        </Link>
                        .
                    </span>
                </div>
            ) : null}

            <ol className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold">
                {[
                    { label: "1 · Configure", done: Boolean(sso) },
                    { label: "2 · Test sign-in", done: tested },
                    { label: "3 · Activate", done: sso?.status === "active" },
                ].map((s) => (
                    <li key={s.label} className={`rounded-lg border px-2 py-1.5 ${s.done ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                        {s.done ? "✓ " : ""}
                        {s.label}
                    </li>
                ))}
            </ol>

            <div className="mt-4 space-y-3">
                <CopyRow label="Redirect URI to register with the provider" value={detail.redirectUri} />

                <div>
                    <span className="mb-1 block text-xs font-semibold text-slate-700">Provider</span>
                    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Provider">
                        {SSO_PROVIDER_OPTIONS.map((p) => (
                            <button
                                key={p.value}
                                type="button"
                                role="radio"
                                aria-checked={form.provider === p.value}
                                onClick={() => setForm((f) => ({ ...f, provider: p.value }))}
                                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                                    form.provider === p.value ? "border-[#0e7d74] bg-[#e6f6f4] text-[#0e7d74]" : "border-slate-200 bg-white text-slate-600"
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                    {providerHint ? <p className="mt-1 text-[11px] text-slate-500">{providerHint}</p> : null}
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {form.provider === "oidc" ? (
                        <Field label="Issuer URL" hint="Its /.well-known/openid-configuration must open.">
                            <input className={inputCls} value={form.issuer} maxLength={255} placeholder="https://login.example.edu.pk" onChange={(e) => setForm((f) => ({ ...f, issuer: e.target.value }))} />
                        </Field>
                    ) : (
                        <Field
                            label={form.provider === "microsoft" ? "Directory (tenant) ID" : "Workspace primary domain (optional)"}
                            hint={form.provider === "microsoft" ? "From Entra ID → Overview. “common” is not accepted." : "Pins sign-in to this Google Workspace."}
                        >
                            <input
                                className={inputCls}
                                value={form.tenantId}
                                maxLength={255}
                                placeholder={form.provider === "microsoft" ? "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" : "uni.edu.pk"}
                                onChange={(e) => setForm((f) => ({ ...f, tenantId: e.target.value }))}
                            />
                        </Field>
                    )}
                    <Field label="Client ID">
                        <input className={inputCls} value={form.clientId} maxLength={255} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))} />
                    </Field>
                    <Field label="Client secret" hint={sso?.hasClientSecret ? "A secret is saved (never shown). Leave blank to keep it." : "Stored encrypted."}>
                        <input
                            type="password"
                            autoComplete="new-password"
                            className={inputCls}
                            value={form.clientSecret}
                            maxLength={2000}
                            placeholder={sso?.hasClientSecret ? "•••••••• saved" : ""}
                            onChange={(e) => setForm((f) => ({ ...f, clientSecret: e.target.value }))}
                        />
                    </Field>
                    <Field label="Student email domains" hint="Comma separated, e.g. uni.edu.pk, students.uni.edu.pk. Only these emails may sign in.">
                        <input className={inputCls} value={form.domains} placeholder="uni.edu.pk" onChange={(e) => setForm((f) => ({ ...f, domains: e.target.value }))} />
                    </Field>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={save} disabled={!!busy} className={primaryCls}>
                        {busy === "save" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        {sso ? "Save changes" : "Save as draft"}
                    </button>
                    {sso ? <span className="text-[11px] text-slate-500">Changing provider, issuer, tenant or client ID needs a new test and returns an active setup to draft.</span> : null}
                </div>
            </div>

            {sso ? (
                <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                    <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                            <p className="font-semibold text-slate-500">Last test</p>
                            <p className={`mt-0.5 flex items-start gap-1 ${sso.lastTestOk === true ? "text-emerald-700" : sso.lastTestOk === false ? "text-red-700" : "text-slate-600"}`}>
                                {sso.lastTestOk === true ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : sso.lastTestOk === false ? <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : null}
                                <span className="break-words">{sso.lastTestNote || (sso.lastTestAt ? "Recorded" : "Not tested yet")}</span>
                            </p>
                            {sso.lastTestAt ? <p className="mt-0.5 text-slate-400">{formatAdminDateTime(sso.lastTestAt)}</p> : null}
                        </div>
                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                            <p className="font-semibold text-slate-500">Activated</p>
                            <p className="mt-0.5 text-slate-700">{sso.activatedAt ? formatAdminDateTime(sso.activatedAt) : "Not yet"}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                            <p className="font-semibold text-slate-500">Student sign-ins</p>
                            <p className="mt-0.5 text-slate-700">
                                {sso.signInCount}
                                {sso.lastSignInAt ? ` · last ${formatAdminDateTime(sso.lastSignInAt)}` : ""}
                            </p>
                        </div>
                    </div>

                    {testLink ? (
                        <div className="space-y-2">
                            <CopyRow label={`Test sign-in link · valid until ${formatAdminDateTime(testLink.expiresAt)}`} value={testLink.url} />
                            <p className="text-[11px] text-slate-500">
                                Open it in a private window, or send it to the university&apos;s IT contact. They sign in with a university account; no CIEL session is
                                created. Then refresh the status here.
                            </p>
                        </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => void makeTestLink()} disabled={!!busy || !sso.hasClientSecret} className={btnCls}>
                            {busy === "test" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                            {testLink ? "New test link" : "Create test link"}
                        </button>
                        {testLink ? (
                            <a href={testLink.url} target="_blank" rel="noopener noreferrer" className={btnCls}>
                                Open test sign-in <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                        ) : null}
                        <button type="button" onClick={() => void run("refresh", async () => undefined, "Status refreshed.")} disabled={!!busy} className={btnCls}>
                            <RefreshCw className={`h-3.5 w-3.5 ${busy === "refresh" ? "animate-spin" : ""}`} /> Refresh status
                        </button>
                        {sso.status !== "active" ? (
                            tested ? (
                                <button type="button" onClick={() => setPending("activate")} disabled={!!busy} className={primaryCls}>
                                    Activate for students
                                </button>
                            ) : (
                                <button type="button" onClick={() => setPending("activate-skip")} disabled={!!busy || !sso.hasClientSecret} className={btnCls}>
                                    Activate without a test…
                                </button>
                            )
                        ) : (
                            <button
                                type="button"
                                onClick={() => setPending("disable")}
                                disabled={!!busy}
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                            >
                                Disable
                            </button>
                        )}
                        {sso.status !== "active" ? (
                            <button type="button" onClick={() => setPending("remove")} disabled={!!busy} className="ml-auto text-xs font-semibold text-red-700 hover:underline disabled:opacity-50">
                                Remove setup
                            </button>
                        ) : null}
                    </div>
                </div>
            ) : null}

            <ConfirmDialog
                open={pending !== null}
                title={
                    pending === "disable"
                        ? "Disable single sign-on?"
                        : pending === "remove"
                          ? "Remove this single sign-on setup?"
                          : pending === "activate-skip"
                            ? "Activate without a successful test?"
                            : "Activate single sign-on?"
                }
                description={
                    pending === "disable"
                        ? "Students of this university stop seeing university sign-in immediately. Their accounts and password sign-in are unchanged."
                        : pending === "remove"
                          ? "The provider settings and saved secret are deleted. Accounts already linked keep working with their password."
                          : pending === "activate-skip"
                            ? "No test sign-in has passed. If the provider is set up wrongly, students will see an error at sign-in. This override is recorded in the audit log."
                            : detail.enabled
                              ? "Students of this university can sign in with their university account straight away."
                              : "It becomes live for students once the platform switch in Settings is on."
                }
                confirmLabel={pending === "disable" ? "Disable" : pending === "remove" ? "Remove" : "Activate"}
                variant={pending === "disable" || pending === "remove" ? "danger" : pending === "activate-skip" ? "warning" : "default"}
                loading={!!busy && busy === pending}
                onConfirm={() => void confirmPending()}
                onCancel={() => {
                    if (!busy) setPending(null);
                }}
            />
        </section>
    );
}
