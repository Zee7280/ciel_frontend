"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Activity, BarChart3, Database, FileCheck, History, Link2, Loader2, Plug, Server } from "lucide-react";
import OverviewTab from "@/components/admin/integrations/OverviewTab";
import PlatformsTab from "@/components/admin/integrations/PlatformsTab";
import ConnectionsTab from "@/components/admin/integrations/ConnectionsTab";
import EventsTab from "@/components/admin/integrations/EventsTab";
import RecordsTab from "@/components/admin/integrations/RecordsTab";
import EvidenceTab from "@/components/admin/integrations/EvidenceTab";
import MetricsTab from "@/components/admin/integrations/MetricsTab";
import AuditTab from "@/components/admin/integrations/AuditTab";

const TABS = [
    { key: "overview", label: "Overview", icon: Activity },
    { key: "platforms", label: "Platforms", icon: Server },
    { key: "connections", label: "Connections", icon: Link2 },
    { key: "events", label: "Events", icon: Plug },
    { key: "records", label: "Records", icon: Database },
    { key: "evidence", label: "Evidence", icon: FileCheck },
    { key: "metrics", label: "Metrics", icon: BarChart3 },
    { key: "audit", label: "Audit", icon: History },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function isTab(v: string | null): v is TabKey {
    return TABS.some((t) => t.key === v);
}

export default function AdminIntegrationsPage() {
    return (
        <Suspense
            fallback={
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
            }
        >
            <IntegrationConsole />
        </Suspense>
    );
}

function IntegrationConsole() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const tabParam = searchParams.get("tab");
    const tab: TabKey = isTab(tabParam) ? tabParam : "overview";
    const platformId = searchParams.get("platformId") ?? undefined;
    const connectionId = searchParams.get("connectionId") ?? undefined;

    const go = (key: TabKey) => {
        const q = new URLSearchParams();
        q.set("tab", key);
        router.replace(`${pathname}?${q.toString()}`);
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Integration Console</h1>
                    <p className="mt-1 max-w-3xl text-sm text-slate-600">
                        External platforms, their organization connections and the records they submit. Third-party data lives in its own
                        repository: nothing here changes students, opportunities, attendance, reports, CII or rankings, and nothing from
                        those systems is sent to vendors.
                    </p>
                </div>
                <Link href="/dashboard/admin/audit-logs" className="text-xs text-slate-500 underline-offset-2 hover:underline">
                    Platform audit log
                </Link>
            </div>

            <nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-slate-200 px-1" aria-label="Integration console sections">
                {TABS.map((t) => {
                    const Icon = t.icon;
                    const active = t.key === tab;
                    return (
                        <button
                            key={t.key}
                            type="button"
                            onClick={() => go(t.key)}
                            className={`-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition ${
                                active ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            <Icon className="h-4 w-4" /> {t.label}
                        </button>
                    );
                })}
            </nav>

            {(platformId || connectionId) && tab !== "overview" ? (
                <p className="text-xs text-slate-500">
                    Filtered by {platformId ? `platform ${platformId}` : `connection ${connectionId}`} ·{" "}
                    <button type="button" className="underline" onClick={() => go(tab)}>
                        clear
                    </button>
                </p>
            ) : null}

            {tab === "overview" ? <OverviewTab /> : null}
            {tab === "platforms" ? <PlatformsTab /> : null}
            {tab === "connections" ? <ConnectionsTab key={platformId ?? "all"} initialPlatformId={platformId} /> : null}
            {tab === "events" ? <EventsTab key={connectionId ?? "all"} initialConnectionId={connectionId} /> : null}
            {tab === "records" ? <RecordsTab key={connectionId ?? "all"} initialConnectionId={connectionId} /> : null}
            {tab === "evidence" ? <EvidenceTab key={connectionId ?? "all"} initialConnectionId={connectionId} /> : null}
            {tab === "metrics" ? <MetricsTab /> : null}
            {tab === "audit" ? <AuditTab /> : null}
        </div>
    );
}
