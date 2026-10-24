"use client";

import { useEffect, useState } from "react";
import { PlugZap } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";

export type HubAvailability = "checking" | "enabled" | "disabled" | "error";

/**
 * The Integration Hub module is loaded on the backend only when HUB_DATABASE_URL is set. Until
 * then its routes do not exist (404). This probe turns that into a clear state so the pages can
 * explain instead of showing "Cannot GET …".
 */
export function useHubAvailability(probePath: string): HubAvailability {
    const [state, setState] = useState<HubAvailability>("checking");
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await authenticatedFetch(probePath, {}, { redirectToLogin: true });
                if (cancelled) return;
                if (!res) {
                    setState("error");
                    return;
                }
                if (res.status === 404) {
                    setState("disabled");
                    return;
                }
                // 200, 401, 403 and 5xx all prove the route exists; the tabs report their own errors.
                setState("enabled");
            } catch {
                if (!cancelled) setState("error");
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [probePath]);
    return state;
}

export function HubDisabledNotice({ audience }: { audience: "admin" | "org" }) {
    return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6">
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <PlugZap className="h-5 w-5" />
                </div>
                <div className="min-w-0 text-sm text-amber-950">
                    <p className="text-base font-semibold">The Integration Hub is not enabled on this deployment yet.</p>
                    {audience === "admin" ? (
                        <>
                            <p className="mt-2">
                                The hub code is deployed but dormant. It switches on when the backend has its isolated database
                                schema and the hub environment variables. Nothing about students, opportunities, attendance,
                                reports, CII or rankings is affected while it is off.
                            </p>
                            <ol className="mt-3 list-decimal space-y-1 pl-5">
                                <li>
                                    Run <code className="rounded bg-white/70 px-1">scripts/hub-bootstrap-roles.sql</code> on the
                                    production database (creates the <code className="rounded bg-white/70 px-1">external_hub</code>{" "}
                                    schema and two restricted roles).
                                </li>
                                <li>
                                    Run <code className="rounded bg-white/70 px-1">npm run hub:migrate</code>, then{" "}
                                    <code className="rounded bg-white/70 px-1">npm run hub:isolation-check</code>.
                                </li>
                                <li>
                                    Add <code className="rounded bg-white/70 px-1">HUB_DATABASE_URL</code>,{" "}
                                    <code className="rounded bg-white/70 px-1">HUB_SECRETS_KEY</code> and optionally{" "}
                                    <code className="rounded bg-white/70 px-1">HUB_EVIDENCE_BUCKET</code> to the backend project,
                                    then redeploy.
                                </li>
                            </ol>
                            <p className="mt-3 text-xs text-amber-800">
                                Details: docs/integration-hub-technical-design.md in the backend repository.
                            </p>
                        </>
                    ) : (
                        <p className="mt-2">
                            External platform connections are not available for your organization yet. CIEL PK will enable
                            this section when the first integration is activated. Your existing dashboard is unaffected.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
