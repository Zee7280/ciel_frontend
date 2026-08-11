"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Clock3, UploadCloud } from "lucide-react";
import clsx from "clsx";
import { authenticatedFetch } from "@/utils/api";
import PathWorkspaceShell from "@/components/ciel/PathWorkspaceShell";
import EmptyState from "@/components/ciel/EmptyState";
import { WorkspaceSkeleton } from "@/components/ciel/Skeleton";

interface FypMilestone {
    label: string;
    status: "pending" | "in_progress" | "complete";
    dueDate: string | null;
    completedAt: string | null;
}

interface FypDeliverable {
    version: number;
    label: string;
    fileUrl: string;
    uploadedAt: string;
}

interface FypCommunityLinkage {
    orgName?: string;
    contactName?: string;
    contactEmail?: string;
    description?: string;
}

interface FypEntry {
    projectTitle: string | null;
    overview: string | null;
    milestones: FypMilestone[];
    deliverables: FypDeliverable[];
    communityLinkage: FypCommunityLinkage | null;
}

const EMPTY: FypEntry = { projectTitle: "", overview: "", milestones: [], deliverables: [], communityLinkage: null };

const TABS = [
    { key: "overview", label: "Overview" },
    { key: "milestones", label: "Milestones" },
    { key: "deliverables", label: "Deliverables" },
    { key: "linkage", label: "Community linkage" },
];

export default function FypThesisPage() {
    const [loading, setLoading] = useState(true);
    const [entry, setEntry] = useState<FypEntry>(EMPTY);
    const [tab, setTab] = useState("overview");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        authenticatedFetch("/api/v1/paths/fyp-thesis", {}, { redirectToLogin: false })
            .then((res) => (res?.ok ? res.json() : null))
            .then((result) => {
                if (result?.data) setEntry({ ...EMPTY, ...result.data });
            })
            .finally(() => setLoading(false));
    }, []);

    const save = async (patch: Partial<FypEntry>) => {
        setSaving(true);
        try {
            const res = await authenticatedFetch("/api/v1/paths/fyp-thesis", { method: "PATCH", body: JSON.stringify(patch) }, { redirectToLogin: false });
            const result = res?.ok ? await res.json() : null;
            if (result?.data) setEntry({ ...EMPTY, ...result.data });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <WorkspaceSkeleton />;

    const completeCount = entry.milestones.filter((m) => m.status === "complete").length;
    const fieldClass = "w-full rounded-ciel-sm border-2 border-ciel-border bg-ciel-page/50 px-4 py-3 text-sm font-semibold text-ciel-text outline-none focus:border-ciel-green focus:bg-white focus-visible:ring-2 focus-visible:ring-ciel-green";

    return (
        <PathWorkspaceShell
            title="FYP / Thesis"
            stats={[
                { label: "Milestones", value: `${completeCount}/${entry.milestones.length || 5}` },
                { label: "Deliverables", value: String(entry.deliverables.length), hint: "Contributes to sections 4, 9 of your impact score" },
            ]}
            tabs={TABS}
            activeTab={tab}
            onTabChange={setTab}
        >
            {tab === "overview" && (
                <div className="space-y-4 rounded-ciel-lg border border-ciel-border bg-white p-5 sm:p-6">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-widest text-ciel-text-soft">Project title</label>
                        <input type="text" value={entry.projectTitle ?? ""} onChange={(e) => setEntry((s) => ({ ...s, projectTitle: e.target.value }))} className={fieldClass} placeholder="Your FYP / thesis title" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-widest text-ciel-text-soft">Overview</label>
                        <textarea rows={5} value={entry.overview ?? ""} onChange={(e) => setEntry((s) => ({ ...s, overview: e.target.value }))} className={fieldClass} placeholder="Summarize your project, its goals, and its community relevance" />
                    </div>
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => save({ projectTitle: entry.projectTitle, overview: entry.overview })}
                        className="ciel-transition rounded-ciel-sm bg-ciel-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-ciel-navy/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green focus-visible:ring-offset-2"
                    >
                        {saving ? "Saving..." : "Save overview"}
                    </button>
                </div>
            )}

            {tab === "milestones" && (
                <MilestonesTab milestones={entry.milestones} saving={saving} onSave={(milestones) => save({ milestones })} />
            )}

            {tab === "deliverables" && (
                <DeliverablesTab deliverables={entry.deliverables} onUploaded={(d) => setEntry((s) => ({ ...s, deliverables: [...s.deliverables, d] }))} />
            )}

            {tab === "linkage" && (
                <div className="space-y-4 rounded-ciel-lg border border-ciel-border bg-white p-5 sm:p-6">
                    <p className="text-xs text-ciel-text-soft">How does this project connect to a real community, organization, or partner?</p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-widest text-ciel-text-soft">Organization</label>
                            <input type="text" value={entry.communityLinkage?.orgName ?? ""} onChange={(e) => setEntry((s) => ({ ...s, communityLinkage: { ...s.communityLinkage, orgName: e.target.value } }))} className={fieldClass} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-widest text-ciel-text-soft">Contact name</label>
                            <input type="text" value={entry.communityLinkage?.contactName ?? ""} onChange={(e) => setEntry((s) => ({ ...s, communityLinkage: { ...s.communityLinkage, contactName: e.target.value } }))} className={fieldClass} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-widest text-ciel-text-soft">Contact email</label>
                            <input type="email" value={entry.communityLinkage?.contactEmail ?? ""} onChange={(e) => setEntry((s) => ({ ...s, communityLinkage: { ...s.communityLinkage, contactEmail: e.target.value } }))} className={fieldClass} />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-widest text-ciel-text-soft">How does this project help them?</label>
                        <textarea rows={3} value={entry.communityLinkage?.description ?? ""} onChange={(e) => setEntry((s) => ({ ...s, communityLinkage: { ...s.communityLinkage, description: e.target.value } }))} className={fieldClass} />
                    </div>
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => save({ communityLinkage: entry.communityLinkage ?? {} })}
                        className="ciel-transition rounded-ciel-sm bg-ciel-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-ciel-navy/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green focus-visible:ring-offset-2"
                    >
                        {saving ? "Saving..." : "Save linkage"}
                    </button>
                </div>
            )}
        </PathWorkspaceShell>
    );
}

function MilestonesTab({ milestones, saving, onSave }: { milestones: FypMilestone[]; saving: boolean; onSave: (m: FypMilestone[]) => void }) {
    const [draft, setDraft] = useState(milestones);
    useEffect(() => setDraft(milestones), [milestones]);

    const cycleStatus = (index: number) => {
        const order: FypMilestone["status"][] = ["pending", "in_progress", "complete"];
        setDraft((prev) =>
            prev.map((m, i) => {
                if (i !== index) return m;
                const nextStatus = order[(order.indexOf(m.status) + 1) % order.length];
                return { ...m, status: nextStatus, completedAt: nextStatus === "complete" ? new Date().toISOString() : null };
            }),
        );
    };

    const setDueDate = (index: number, dueDate: string) => {
        setDraft((prev) => prev.map((m, i) => (i === index ? { ...m, dueDate } : m)));
    };

    return (
        <div className="rounded-ciel-lg border border-ciel-border bg-white p-5 sm:p-6">
            <ol className="space-y-0">
                {draft.map((m, i) => (
                    <li key={m.label} className="relative flex gap-4 pb-8 last:pb-0">
                        {i < draft.length - 1 && <span className="absolute left-[15px] top-8 h-full w-px bg-ciel-border" aria-hidden />}
                        <button
                            type="button"
                            onClick={() => cycleStatus(i)}
                            className={clsx(
                                "ciel-transition z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green",
                                m.status === "complete" && "border-ciel-green bg-ciel-green text-white",
                                m.status === "in_progress" && "border-ciel-amber bg-ciel-amber-soft text-ciel-amber",
                                m.status === "pending" && "border-ciel-border bg-white text-ciel-text-soft",
                            )}
                            aria-label={`${m.label}: ${m.status}, click to advance`}
                        >
                            {m.status === "complete" ? <CheckCircle2 className="h-4 w-4" /> : m.status === "in_progress" ? <Clock3 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                        </button>
                        <div className="flex-1 pt-1">
                            <p className="text-sm font-bold text-ciel-text">{m.label}</p>
                            <p className="text-xs text-ciel-text-soft capitalize">{m.status.replace("_", " ")}{m.completedAt ? ` · ${new Date(m.completedAt).toLocaleDateString()}` : ""}</p>
                            <input
                                type="date"
                                value={m.dueDate ?? ""}
                                onChange={(e) => setDueDate(i, e.target.value)}
                                className="mt-2 rounded-ciel-xs border border-ciel-border px-2.5 py-1.5 text-xs font-semibold text-ciel-text-mid outline-none focus:border-ciel-green focus-visible:ring-2 focus-visible:ring-ciel-green"
                            />
                        </div>
                    </li>
                ))}
            </ol>
            <button
                type="button"
                disabled={saving}
                onClick={() => onSave(draft)}
                className="ciel-transition rounded-ciel-sm bg-ciel-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-ciel-navy/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green focus-visible:ring-offset-2"
            >
                {saving ? "Saving..." : "Save milestones"}
            </button>
        </div>
    );
}

function DeliverablesTab({ deliverables, onUploaded }: { deliverables: FypDeliverable[]; onUploaded: (d: FypDeliverable) => void }) {
    const [label, setLabel] = useState("");
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFile = async (file: File) => {
        if (!label.trim()) {
            setError("Give this deliverable a label first (e.g. \"Chapter 3 draft\").");
            return;
        }
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
            const res = await authenticatedFetch(
                "/api/v1/paths/fyp-thesis/deliverables",
                { method: "POST", body: JSON.stringify({ label, fileUrl: publicUrl }) },
                { redirectToLogin: false },
            );
            const result = res?.ok ? await res.json() : null;
            const created: FypDeliverable[] = result?.data?.deliverables ?? [];
            const last = created[created.length - 1];
            if (last) onUploaded(last);
            setLabel("");
        } catch {
            setError("Upload failed. Try again.");
        } finally {
            setUploading(false);
        }
    };

    const sorted = [...deliverables].sort((a, b) => b.version - a.version);

    return (
        <div className="space-y-4">
            <div className="rounded-ciel-lg border border-ciel-border bg-white p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
                    <input
                        type="text"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder="Deliverable label (e.g. Chapter 3 draft)"
                        className="w-full rounded-ciel-sm border-2 border-ciel-border bg-ciel-page/50 px-4 py-3 text-sm font-semibold text-ciel-text outline-none focus:border-ciel-green focus:bg-white focus-visible:ring-2 focus-visible:ring-ciel-green"
                    />
                    <label className={clsx("ciel-transition flex cursor-pointer items-center justify-center gap-2 rounded-ciel-sm border-2 border-dashed border-ciel-border px-4 py-3 text-sm font-semibold text-ciel-text-mid hover:border-ciel-green/40", uploading && "opacity-60")}>
                        <UploadCloud className="h-4 w-4" />
                        {uploading ? "Uploading..." : "Upload version"}
                        <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                    </label>
                </div>
                {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
            </div>

            {!sorted.length ? (
                <EmptyState emoji="📄" heading="No deliverables yet" line="Uploaded versions never overwrite each other — every upload is kept." />
            ) : (
                <div className="space-y-2">
                    {sorted.map((d) => (
                        <a
                            key={`${d.version}-${d.fileUrl}`}
                            href={d.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="ciel-transition flex items-center justify-between gap-3 rounded-ciel-md border border-ciel-border bg-white p-4 hover:border-ciel-green/40"
                        >
                            <div>
                                <p className="text-sm font-bold text-ciel-text">{d.label}</p>
                                <p className="text-xs text-ciel-text-soft">v{d.version} · {new Date(d.uploadedAt).toLocaleString()}</p>
                            </div>
                            <span className="rounded-ciel-xs bg-ciel-page px-2.5 py-1 text-xs font-bold text-ciel-text-mid">v{d.version}</span>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}
