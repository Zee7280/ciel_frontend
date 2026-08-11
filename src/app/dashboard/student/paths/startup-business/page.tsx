"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Plus, Trash2, UploadCloud } from "lucide-react";
import clsx from "clsx";
import { authenticatedFetch } from "@/utils/api";
import PathWorkspaceShell from "@/components/ciel/PathWorkspaceShell";
import ContextRail from "@/components/ciel/ContextRail";
import ProgressBar from "@/components/ciel/ProgressBar";
import { WorkspaceSkeleton } from "@/components/ciel/Skeleton";
import { ventureCompletenessPercent, ventureMissingItems, VENTURE_VISIBILITY_THRESHOLD } from "./ventureCompleteness";

interface TractionRow { date: string; metric: string; value: string; note?: string }
interface TeamMember { name: string; role: string; email?: string }

interface VentureEntry {
    ventureName: string | null;
    description: string | null;
    stage: string | null;
    tractionRows: TractionRow[];
    team: TeamMember[];
    materialUrls: string[];
    isVisible: boolean;
}

const EMPTY: VentureEntry = { ventureName: "", description: "", stage: "", tractionRows: [], team: [], materialUrls: [], isVisible: false };

const TABS = [
    { key: "profile", label: "Venture profile" },
    { key: "traction", label: "Traction" },
    { key: "team", label: "Team" },
    { key: "materials", label: "Materials" },
];

const TAB_FOR_ITEM: Record<string, string> = {
    ventureName: "profile",
    description: "profile",
    stage: "profile",
    traction: "traction",
    team: "team",
    materials: "materials",
};

export default function StartupBusinessPage() {
    const [loading, setLoading] = useState(true);
    const [entry, setEntry] = useState<VentureEntry>(EMPTY);
    const [tab, setTab] = useState("profile");
    const [saving, setSaving] = useState(false);
    const [visibilityError, setVisibilityError] = useState<string | null>(null);

    useEffect(() => {
        authenticatedFetch("/api/v1/paths/startup-business", {}, { redirectToLogin: false })
            .then((res) => (res?.ok ? res.json() : null))
            .then((result) => {
                if (result?.data) setEntry({ ...EMPTY, ...result.data });
            })
            .finally(() => setLoading(false));
    }, []);

    const save = async (patch: Partial<VentureEntry>) => {
        setSaving(true);
        try {
            const res = await authenticatedFetch("/api/v1/paths/startup-business", { method: "PATCH", body: JSON.stringify(patch) }, { redirectToLogin: false });
            const result = res?.ok ? await res.json() : null;
            if (result?.data) setEntry({ ...EMPTY, ...result.data });
        } finally {
            setSaving(false);
        }
    };

    const toggleVisibility = async () => {
        setVisibilityError(null);
        const res = await authenticatedFetch(
            "/api/v1/paths/startup-business/visibility",
            { method: "PATCH", body: JSON.stringify({ isVisible: !entry.isVisible }) },
            { redirectToLogin: false },
        );
        const result = res?.ok ? await res.json() : null;
        if (result?.success === false) {
            setVisibilityError(result.message || "Complete more of your profile first.");
            return;
        }
        if (result?.data) setEntry({ ...EMPTY, ...result.data });
    };

    if (loading) return <WorkspaceSkeleton />;

    const completeness = ventureCompletenessPercent(entry);
    const missing = ventureMissingItems(entry);
    const canGoVisible = completeness >= VENTURE_VISIBILITY_THRESHOLD;
    const fieldClass = "w-full rounded-ciel-sm border-2 border-ciel-border bg-ciel-page/50 px-4 py-3 text-sm font-semibold text-ciel-text outline-none focus:border-ciel-green focus:bg-white focus-visible:ring-2 focus-visible:ring-ciel-green";

    return (
        <PathWorkspaceShell
            title="Startup / Business"
            stats={[
                { label: "Profile completeness", value: `${completeness}%` },
                { label: "Visibility", value: entry.isVisible ? "Visible" : "Private", hint: "Contributes to sections 5, 7 of your impact score" },
            ]}
            tabs={TABS}
            activeTab={tab}
            onTabChange={setTab}
            contextRail={
                <ContextRail title="Visibility">
                    <div className="space-y-3">
                        <div>
                            <div className="flex items-baseline justify-between">
                                <span className="text-xs font-bold text-ciel-text">{completeness}% complete</span>
                                <span className="text-[11px] text-ciel-text-soft">{VENTURE_VISIBILITY_THRESHOLD}% needed</span>
                            </div>
                            <ProgressBar value={completeness} className="mt-1.5" />
                        </div>
                        <button
                            type="button"
                            onClick={toggleVisibility}
                            disabled={!entry.isVisible && !canGoVisible}
                            className={clsx(
                                "ciel-transition flex w-full items-center justify-center gap-2 rounded-ciel-sm px-4 py-2.5 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green",
                                entry.isVisible ? "bg-ciel-green-soft text-ciel-green-deep hover:bg-ciel-green/20" : "bg-ciel-navy text-white hover:bg-ciel-navy/90 disabled:opacity-40 disabled:cursor-not-allowed",
                            )}
                        >
                            {entry.isVisible ? <><EyeOff className="h-4 w-4" /> Make private</> : <><Eye className="h-4 w-4" /> Make visible</>}
                        </button>
                        {visibilityError && <p className="text-xs font-semibold text-red-600">{visibilityError}</p>}
                        {!!missing.length && (
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-widest text-ciel-text-soft">Still missing</p>
                                <ul className="mt-1.5 space-y-1">
                                    {missing.map((item) => (
                                        <li key={item.key}>
                                            <button
                                                type="button"
                                                onClick={() => setTab(TAB_FOR_ITEM[item.key] ?? "profile")}
                                                className="ciel-transition text-left text-xs font-semibold text-ciel-text-mid hover:text-ciel-green-deep hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green rounded-ciel-xs"
                                            >
                                                {item.label}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </ContextRail>
            }
        >
            {tab === "profile" && (
                <div className="space-y-4 rounded-ciel-lg border border-ciel-border bg-white p-5 sm:p-6">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-widest text-ciel-text-soft">Venture name</label>
                        <input type="text" value={entry.ventureName ?? ""} onChange={(e) => setEntry((s) => ({ ...s, ventureName: e.target.value }))} className={fieldClass} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-widest text-ciel-text-soft">Stage</label>
                        <select value={entry.stage ?? ""} onChange={(e) => setEntry((s) => ({ ...s, stage: e.target.value }))} className={fieldClass}>
                            <option value="">Select a stage</option>
                            <option value="Idea">Idea</option>
                            <option value="Validating">Validating</option>
                            <option value="Building">Building</option>
                            <option value="Launched">Launched</option>
                            <option value="Growing">Growing</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-widest text-ciel-text-soft">Description</label>
                        <textarea rows={4} value={entry.description ?? ""} onChange={(e) => setEntry((s) => ({ ...s, description: e.target.value }))} className={fieldClass} placeholder="What problem does this venture solve, and for whom?" />
                    </div>
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => save({ ventureName: entry.ventureName, stage: entry.stage, description: entry.description })}
                        className="ciel-transition rounded-ciel-sm bg-ciel-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-ciel-navy/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green focus-visible:ring-offset-2"
                    >
                        {saving ? "Saving..." : "Save profile"}
                    </button>
                </div>
            )}

            {tab === "traction" && (
                <RowsEditor
                    rows={entry.tractionRows}
                    saving={saving}
                    onSave={(rows) => save({ tractionRows: rows })}
                    addRow={() => ({ date: new Date().toISOString().slice(0, 10), metric: "", value: "", note: "" })}
                    renderRow={(row, update) => (
                        <>
                            <input type="date" value={row.date} onChange={(e) => update({ ...row, date: e.target.value })} className="rounded-ciel-xs border border-ciel-border px-2.5 py-2 text-xs font-semibold" />
                            <input type="text" value={row.metric} onChange={(e) => update({ ...row, metric: e.target.value })} placeholder="Metric (e.g. Users)" className="rounded-ciel-xs border border-ciel-border px-2.5 py-2 text-xs font-semibold" />
                            <input type="text" value={row.value} onChange={(e) => update({ ...row, value: e.target.value })} placeholder="Value (e.g. 120)" className="rounded-ciel-xs border border-ciel-border px-2.5 py-2 text-xs font-semibold" />
                            <input type="text" value={row.note ?? ""} onChange={(e) => update({ ...row, note: e.target.value })} placeholder="Note (optional)" className="rounded-ciel-xs border border-ciel-border px-2.5 py-2 text-xs font-semibold" />
                        </>
                    )}
                    emptyRowLabel="No traction logged yet"
                />
            )}

            {tab === "team" && (
                <RowsEditor
                    rows={entry.team}
                    saving={saving}
                    onSave={(rows) => save({ team: rows })}
                    addRow={() => ({ name: "", role: "", email: "" })}
                    renderRow={(row, update) => (
                        <>
                            <input type="text" value={row.name} onChange={(e) => update({ ...row, name: e.target.value })} placeholder="Name" className="rounded-ciel-xs border border-ciel-border px-2.5 py-2 text-xs font-semibold" />
                            <input type="text" value={row.role} onChange={(e) => update({ ...row, role: e.target.value })} placeholder="Role" className="rounded-ciel-xs border border-ciel-border px-2.5 py-2 text-xs font-semibold" />
                            <input type="email" value={row.email ?? ""} onChange={(e) => update({ ...row, email: e.target.value })} placeholder="Email (optional)" className="rounded-ciel-xs border border-ciel-border px-2.5 py-2 text-xs font-semibold sm:col-span-2" />
                        </>
                    )}
                    emptyRowLabel="No team members added yet"
                />
            )}

            {tab === "materials" && <MaterialsTab materialUrls={entry.materialUrls} onSave={(urls) => save({ materialUrls: urls })} saving={saving} />}
        </PathWorkspaceShell>
    );
}

function RowsEditor<T>({
    rows,
    saving,
    onSave,
    addRow,
    renderRow,
    emptyRowLabel,
}: {
    rows: T[];
    saving: boolean;
    onSave: (rows: T[]) => void;
    addRow: () => T;
    renderRow: (row: T, update: (next: T) => void) => React.ReactNode;
    emptyRowLabel: string;
}) {
    const [draft, setDraft] = useState<T[]>(rows);
    useEffect(() => setDraft(rows), [rows]);

    return (
        <div className="rounded-ciel-lg border border-ciel-border bg-white p-5 sm:p-6">
            {!draft.length && <p className="text-sm text-ciel-text-soft">{emptyRowLabel}</p>}
            <div className="space-y-2">
                {draft.map((row, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2 rounded-ciel-sm bg-ciel-page/60 p-3 sm:grid-cols-[repeat(4,1fr)_auto]">
                        {renderRow(row, (next) => setDraft((prev) => prev.map((r, idx) => (idx === i ? next : r))))}
                        <button
                            type="button"
                            onClick={() => setDraft((prev) => prev.filter((_, idx) => idx !== i))}
                            className="flex items-center justify-center rounded-ciel-xs px-2 text-ciel-text-soft hover:text-red-600"
                            aria-label="Remove row"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                ))}
            </div>
            <div className="mt-4 flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => setDraft((prev) => [...prev, addRow()])}
                    className="ciel-transition inline-flex items-center gap-1.5 rounded-ciel-sm border border-ciel-border px-3 py-2 text-xs font-bold text-ciel-text-mid hover:border-ciel-green/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green"
                >
                    <Plus className="h-3.5 w-3.5" /> Add row
                </button>
                <button
                    type="button"
                    disabled={saving}
                    onClick={() => onSave(draft)}
                    className="ciel-transition rounded-ciel-sm bg-ciel-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-ciel-navy/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green focus-visible:ring-offset-2"
                >
                    {saving ? "Saving..." : "Save"}
                </button>
            </div>
        </div>
    );
}

function MaterialsTab({ materialUrls, onSave, saving }: { materialUrls: string[]; onSave: (urls: string[]) => void; saving: boolean }) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFile = async (file: File) => {
        setUploading(true);
        setError(null);
        try {
            const presignRes = await authenticatedFetch(
                "/api/v1/paths/evidence/presign",
                { method: "POST", body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }) },
                { redirectToLogin: false },
            );
            const presign = presignRes?.ok ? await presignRes.json() : null;
            const { uploadUrl, publicUrl } = presign?.data ?? {};
            if (!uploadUrl || !publicUrl) throw new Error("Could not prepare the upload");
            await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
            onSave([...materialUrls, publicUrl]);
        } catch {
            setError("Upload failed. Try again.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-4 rounded-ciel-lg border border-ciel-border bg-white p-5 sm:p-6">
            <label className={clsx("ciel-transition flex cursor-pointer items-center gap-3 rounded-ciel-sm border-2 border-dashed border-ciel-border px-4 py-3 text-sm font-semibold text-ciel-text-mid hover:border-ciel-green/40", uploading && "opacity-60")}>
                <UploadCloud className="h-4 w-4" />
                {uploading ? "Uploading..." : "Upload a pitch deck, one-pager, or demo"}
                <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </label>
            {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
            {!materialUrls.length ? (
                <p className="text-sm text-ciel-text-soft">No materials uploaded yet.</p>
            ) : (
                <ul className="space-y-1.5">
                    {materialUrls.map((url) => (
                        <li key={url} className="flex items-center justify-between gap-2 rounded-ciel-xs bg-ciel-page px-3 py-2 text-xs font-semibold text-ciel-text-mid">
                            <a href={url} target="_blank" rel="noreferrer" className="truncate hover:underline">{url.split("/").pop()}</a>
                            <button
                                type="button"
                                disabled={saving}
                                onClick={() => onSave(materialUrls.filter((u) => u !== url))}
                                className="text-ciel-text-soft hover:text-red-600"
                                aria-label="Remove"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
