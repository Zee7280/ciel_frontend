"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, FileBarChart, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";

type SourceFilter = "all" | "structured" | "quick";

type CsReportItem = {
    id: string;
    code: string;
    preparedFor: string | null;
    filters: { from: string | null; to: string | null; university: string | null; source: SourceFilter };
    includeStudents: boolean;
    summary: {
        projects: number;
        structuredProjects: number;
        quickProjects: number;
        students: number;
        universities: number;
        personHours: number;
        beneficiaries: number;
    };
    generatedByName: string | null;
    createdAt: string;
};

const SOURCE_LABEL: Record<SourceFilter, string> = {
    all: "All community service",
    structured: "Community service projects",
    quick: "Quick Community Impact",
};

const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20";

function periodLabel(f: CsReportItem["filters"]): string {
    if (f.from && f.to) return `${f.from} to ${f.to}`;
    if (f.from) return `From ${f.from}`;
    if (f.to) return `Up to ${f.to}`;
    return "All time";
}

async function errorMessage(res: Response | null, fallback: string): Promise<string> {
    const body = (await res?.json().catch(() => ({}))) as { message?: unknown };
    const m = body?.message;
    if (Array.isArray(m)) return m.join(" ");
    return typeof m === "string" && m ? m : fallback;
}

export default function CsReportingPage() {
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [university, setUniversity] = useState("");
    const [source, setSource] = useState<SourceFilter>("all");
    const [preparedFor, setPreparedFor] = useState("");
    const [includeStudents, setIncludeStudents] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [latest, setLatest] = useState<CsReportItem | null>(null);
    const [history, setHistory] = useState<CsReportItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [downloading, setDownloading] = useState<string | null>(null);

    const loadHistory = useCallback(async () => {
        try {
            const res = await authenticatedFetch("/api/v1/admin/cs-reports");
            if (!res?.ok) throw new Error(await errorMessage(res, "Could not load past reports"));
            setHistory((await res.json()) as CsReportItem[]);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not load past reports");
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    useEffect(() => {
        void loadHistory();
    }, [loadHistory]);

    const generate = async () => {
        if (from && to && from > to) {
            toast.error("The start date is after the end date.");
            return;
        }
        setGenerating(true);
        try {
            const res = await authenticatedFetch("/api/v1/admin/cs-reports", {
                method: "POST",
                body: JSON.stringify({
                    ...(from ? { from } : {}),
                    ...(to ? { to } : {}),
                    ...(university.trim() ? { university: university.trim() } : {}),
                    ...(preparedFor.trim() ? { preparedFor: preparedFor.trim() } : {}),
                    source,
                    includeStudents,
                }),
            });
            if (!res?.ok) throw new Error(await errorMessage(res, "Could not generate the report"));
            const item = (await res.json()) as CsReportItem;
            setLatest(item);
            setHistory((h) => [item, ...h.filter((x) => x.id !== item.id)]);
            toast.success(`Report ${item.code} is ready`);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not generate the report");
        } finally {
            setGenerating(false);
        }
    };

    const download = async (item: CsReportItem, format: "xlsx" | "pdf") => {
        const key = `${item.id}:${format}`;
        if (downloading) return;
        setDownloading(key);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/cs-reports/${encodeURIComponent(item.id)}/${format}`);
            if (!res?.ok) throw new Error(await errorMessage(res, "Download failed"));
            const url = URL.createObjectURL(await res.blob());
            const a = document.createElement("a");
            a.href = url;
            a.download = `community-service-report-${item.code}.${format}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Download failed");
        } finally {
            setDownloading(null);
        }
    };

    const downloadButtons = (item: CsReportItem) => (
        <div className="flex flex-wrap gap-2">
            {(["xlsx", "pdf"] as const).map((format) => {
                const busy = downloading === `${item.id}:${format}`;
                const Icon = format === "xlsx" ? FileSpreadsheet : FileText;
                return (
                    <button
                        key={format}
                        type="button"
                        disabled={downloading !== null}
                        onClick={() => void download(item, format)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                        {format === "xlsx" ? "Excel" : "PDF"}
                    </button>
                );
            })}
        </div>
    );

    return (
        <div className="min-w-0 max-w-full p-4 sm:p-8">
            <div className="mb-8 flex items-start gap-4 border-b border-slate-200/80 pb-8">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-slate-900 text-white shadow-lg">
                    <FileBarChart className="h-7 w-7" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Community service reporting</h1>
                    <p className="mt-1 max-w-2xl text-sm text-slate-500 sm:text-base">
                        Reports of completed community service for HEC, government and universities. Each report is saved
                        with an ID, so you can download the same figures again later.
                    </p>
                </div>
            </div>

            <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="mb-4 text-base font-semibold text-slate-900">New report</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="block text-sm">
                        <span className="mb-1 block font-medium text-slate-700">Verified from</span>
                        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
                    </label>
                    <label className="block text-sm">
                        <span className="mb-1 block font-medium text-slate-700">Verified to</span>
                        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
                    </label>
                    <label className="block text-sm">
                        <span className="mb-1 block font-medium text-slate-700">Project types</span>
                        <select value={source} onChange={(e) => setSource(e.target.value as SourceFilter)} className={inputClass}>
                            {(Object.keys(SOURCE_LABEL) as SourceFilter[]).map((s) => (
                                <option key={s} value={s}>
                                    {SOURCE_LABEL[s]}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="block text-sm">
                        <span className="mb-1 block font-medium text-slate-700">University</span>
                        <input
                            value={university}
                            onChange={(e) => setUniversity(e.target.value)}
                            placeholder="Leave empty for all universities"
                            maxLength={200}
                            className={inputClass}
                        />
                    </label>
                    <label className="block text-sm lg:col-span-2">
                        <span className="mb-1 block font-medium text-slate-700">Prepared for</span>
                        <input
                            value={preparedFor}
                            onChange={(e) => setPreparedFor(e.target.value)}
                            placeholder="e.g. Higher Education Commission"
                            maxLength={120}
                            className={inputClass}
                        />
                    </label>
                </div>

                <label className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                    <input
                        type="checkbox"
                        checked={includeStudents}
                        onChange={(e) => setIncludeStudents(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-teal-600"
                    />
                    <span>
                        <span className="font-medium text-slate-800">Include the named student list</span>
                        <span className="mt-0.5 block text-slate-500">
                            Adds a Students sheet with names, university, roll numbers, hours and certificate links. Without it the
                            report has totals and the project list only.
                        </span>
                    </span>
                </label>
                {includeStudents && (
                    <p className="mt-3 flex items-start gap-2 text-xs text-amber-700">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        Include names only when the recipient has asked for them, and send the file only to that recipient.
                    </p>
                )}

                <button
                    type="button"
                    disabled={generating}
                    onClick={() => void generate()}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {generating && <Loader2 className="h-4 w-4 animate-spin" />}
                    {generating ? "Generating…" : "Generate report"}
                </button>

                {latest && (
                    <div className="mt-6 rounded-xl border border-teal-200 bg-teal-50/60 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-900">Report {latest.code}</p>
                                <p className="text-xs text-slate-600">
                                    {periodLabel(latest.filters)} · {SOURCE_LABEL[latest.filters.source]}
                                    {latest.filters.university ? ` · ${latest.filters.university}` : ""}
                                </p>
                            </div>
                            {downloadButtons(latest)}
                        </div>
                        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                            {[
                                ["Projects", latest.summary.projects],
                                ["Students", latest.summary.students],
                                ["Universities", latest.summary.universities],
                                ["Person-hours", latest.summary.personHours],
                                ["Beneficiaries", latest.summary.beneficiaries],
                                ["Quick Impact", latest.summary.quickProjects],
                            ].map(([label, value]) => (
                                <div key={label} className="rounded-lg bg-white p-3">
                                    <dt className="text-xs text-slate-500">{label}</dt>
                                    <dd className="text-lg font-semibold text-slate-900">{Number(value).toLocaleString()}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <h2 className="border-b border-slate-200 px-5 py-4 text-base font-semibold text-slate-900">Past reports</h2>
                {loadingHistory ? (
                    <div className="flex items-center gap-2 px-5 py-6 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                    </div>
                ) : history.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-slate-500">No reports yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[820px] text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-5 py-3 font-semibold">Report</th>
                                    <th className="px-5 py-3 font-semibold">Period and filters</th>
                                    <th className="px-5 py-3 font-semibold text-right">Projects</th>
                                    <th className="px-5 py-3 font-semibold text-right">Students</th>
                                    <th className="px-5 py-3 font-semibold text-right">Hours</th>
                                    <th className="px-5 py-3 font-semibold">Generated</th>
                                    <th className="px-5 py-3 font-semibold">Download</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {history.map((item) => (
                                    <tr key={item.id} className="align-top">
                                        <td className="px-5 py-3">
                                            <p className="font-medium text-slate-900">{item.code}</p>
                                            <p className="text-xs text-slate-500">{item.preparedFor || "—"}</p>
                                        </td>
                                        <td className="px-5 py-3 text-xs text-slate-600">
                                            <p>{periodLabel(item.filters)}</p>
                                            <p>{SOURCE_LABEL[item.filters.source]}</p>
                                            {item.filters.university && <p>{item.filters.university}</p>}
                                            {item.includeStudents && <p className="font-medium text-amber-700">Includes student names</p>}
                                        </td>
                                        <td className="px-5 py-3 text-right">{item.summary.projects.toLocaleString()}</td>
                                        <td className="px-5 py-3 text-right">{item.summary.students.toLocaleString()}</td>
                                        <td className="px-5 py-3 text-right">{item.summary.personHours.toLocaleString()}</td>
                                        <td className="px-5 py-3 text-xs text-slate-600">
                                            <p>{new Date(item.createdAt).toLocaleString()}</p>
                                            <p>{item.generatedByName || "—"}</p>
                                        </td>
                                        <td className="px-5 py-3">{downloadButtons(item)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
