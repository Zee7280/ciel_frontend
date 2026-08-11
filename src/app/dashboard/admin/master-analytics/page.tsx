"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Eye, LayoutDashboard } from "lucide-react";
import AllFieldsConsolePanel from "@/components/analytics/AllFieldsConsolePanel";
import MasterPlatformKpisPanel from "@/components/analytics/MasterPlatformKpisPanel";

type MasterTab = "view" | "reg" | "platform";

/**
 * CIEL Master — All-Fields Analytics Console flow (HTML design) as primary,
 * with legacy Platform KPIs preserved on a third tab.
 */
export default function AdminMasterAnalyticsPage() {
    const [tab, setTab] = useState<MasterTab>("view");

    return (
        <div className="mx-auto max-w-[1220px] space-y-4 pb-12">
            <div className="-mx-4 bg-[#0f1222] px-4 py-3.5 text-white sm:-mx-3 sm:px-3 md:-mx-5 md:px-5 lg:mx-0 lg:rounded-2xl lg:px-6">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-extrabold">
                        C
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-[15px] font-bold leading-tight">
                            CIEL PK — All-Fields Analytics Console
                        </h1>
                        <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Every field · every stakeholder · primary owner: super admin
                        </p>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wide">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        Super Admin · Root
                    </span>
                </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <Link
                        href="/dashboard/admin"
                        className="mb-1 inline-flex text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400 hover:text-slate-700"
                    >
                        Signed in · CIEL PK Platform Administration
                    </Link>
                    <h2 className="text-[22px] font-extrabold tracking-tight text-slate-900">
                        All Analytics Live Here First
                    </h2>
                    <p className="mt-1 max-w-2xl text-[12.5px] text-slate-500">
                        Every KPI, chart and field across Sections 1–10 belongs primarily to the Super
                        Admin. Stakeholders see mapped copies. Use <b>View as</b> to open exactly what
                        any stakeholder sees — all 5 roles × 10 sections — or open the{" "}
                        <b>Field Ownership Registry</b>. Platform KPIs remain available for cohort filters.
                    </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-[#fdf6e3] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#b8860b]">
                    ★ 50 stakeholder views · 1 owner
                </span>
            </div>

            <div className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1">
                <button
                    type="button"
                    onClick={() => setTab("view")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wide ${
                        tab === "view"
                            ? "bg-slate-900 text-white"
                            : "text-slate-500 hover:bg-slate-50"
                    }`}
                >
                    <Eye className="h-3.5 w-3.5" /> View as stakeholder
                </button>
                <button
                    type="button"
                    onClick={() => setTab("reg")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wide ${
                        tab === "reg"
                            ? "bg-slate-900 text-white"
                            : "text-slate-500 hover:bg-slate-50"
                    }`}
                >
                    <BookOpen className="h-3.5 w-3.5" /> Field ownership registry
                </button>
                <button
                    type="button"
                    onClick={() => setTab("platform")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wide ${
                        tab === "platform"
                            ? "bg-slate-900 text-white"
                            : "text-slate-500 hover:bg-slate-50"
                    }`}
                >
                    <LayoutDashboard className="h-3.5 w-3.5" /> Platform KPIs
                </button>
            </div>

            {tab === "platform" ? (
                <MasterPlatformKpisPanel />
            ) : (
                <AllFieldsConsolePanel
                    embedded
                    showModeTabs={false}
                    mode={tab}
                    onModeChange={(m) => setTab(m)}
                />
            )}
        </div>
    );
}
