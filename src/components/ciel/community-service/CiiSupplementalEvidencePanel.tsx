"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";
import { uploadFileViaPresign } from "@/utils/presignedFileUpload";
import { sectionOptionLabel, SUPPLEMENTAL_SECTIONS, SUPPLEMENTAL_VISIBILITIES, validateSupplementalForm } from "@/utils/ciiModerationView";

export type SupplementalEvidenceItem = {
    id: string;
    url: string;
    name: string;
    label: string;
    section: string;
    visibility: string;
    caption: string | null;
    addedAt?: string;
};

function messageOf(payload: unknown, fallback: string): string {
    const p = payload as { message?: string | string[]; error?: string } | null;
    if (Array.isArray(p?.message)) return p.message.join(" ");
    return (typeof p?.message === "string" && p.message) || (typeof p?.error === "string" && p.error) || fallback;
}

/**
 * R3 Admin supplemental evidence: labelled files the Super Admin attaches during review. They are kept
 * apart from the student's originals, visible to Admin only, and never change a mark by themselves.
 * Adding or removing one makes the stored analysis stale: the parent is told, and approval stays blocked
 * until the analysis is re-run. Hidden by the parent once the score is locked.
 */
export function CiiSupplementalEvidencePanel({
    basePath,
    onItemsChange,
    onChanged,
}: {
    /** `.../community-service/reports/:id/supplemental-evidence` */
    basePath: string;
    onItemsChange: (items: SupplementalEvidenceItem[]) => void;
    /** Called after an add or remove with whether a stored analysis is now stale. */
    onChanged: (requiresReanalysis: boolean) => void;
}) {
    const [items, setItems] = useState<SupplementalEvidenceItem[]>([]);
    const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
    const [file, setFile] = useState<File | null>(null);
    const [label, setLabel] = useState("");
    const [section, setSection] = useState<string>("general");
    const [visibility, setVisibility] = useState<string>("restricted");
    const [caption, setCaption] = useState("");
    const [busy, setBusy] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const fileInput = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        let cancelled = false;
        authenticatedFetch(basePath)
            .then(async (res) => {
                if (cancelled) return;
                if (!res?.ok) {
                    setLoadState("error");
                    return;
                }
                const json = (await res.json().catch(() => ({}))) as { data?: SupplementalEvidenceItem[] };
                const list = Array.isArray(json.data) ? json.data : [];
                setItems(list);
                onItemsChange(list);
                setLoadState("ready");
            })
            .catch(() => {
                if (!cancelled) setLoadState("error");
            });
        return () => {
            cancelled = true;
        };
        // The parent callback is stable (a state setter); only a different report reloads the list.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [basePath]);

    const apply = (next: SupplementalEvidenceItem[]) => {
        setItems(next);
        onItemsChange(next);
    };

    const add = async () => {
        const problem = validateSupplementalForm({ hasFile: Boolean(file), label });
        if (problem) {
            toast.error(problem);
            return;
        }
        if (!file || busy) return;
        try {
            setBusy(true);
            const publicUrl = await uploadFileViaPresign(`${basePath}/presign`, file);
            const res = await authenticatedFetch(basePath, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    url: publicUrl,
                    name: file.name,
                    label: label.trim(),
                    section,
                    visibility,
                    ...(caption.trim() ? { caption: caption.trim() } : {}),
                }),
            });
            const json = res ? ((await res.json().catch(() => ({}))) as { data?: SupplementalEvidenceItem; requiresReanalysis?: boolean }) : {};
            if (!res?.ok || !json.data) {
                toast.error(messageOf(json, "Could not attach the file."));
                return;
            }
            apply([...items, json.data]);
            setFile(null);
            setLabel("");
            setCaption("");
            if (fileInput.current) fileInput.current.value = "";
            toast.success("Supplemental evidence attached");
            onChanged(json.requiresReanalysis === true);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not attach the file.");
        } finally {
            setBusy(false);
        }
    };

    const remove = async (item: SupplementalEvidenceItem) => {
        if (removingId) return;
        if (!window.confirm(`Remove "${item.label}"? It stays in the audit record, and the analysis must be re-run.`)) return;
        try {
            setRemovingId(item.id);
            const res = await authenticatedFetch(`${basePath}/${encodeURIComponent(item.id)}`, { method: "DELETE" });
            const json = res ? ((await res.json().catch(() => ({}))) as { requiresReanalysis?: boolean }) : {};
            if (!res?.ok) {
                toast.error(messageOf(json, "Could not remove the file."));
                return;
            }
            apply(items.filter((i) => i.id !== item.id));
            toast.success("Supplemental evidence removed");
            onChanged(json.requiresReanalysis === true);
        } catch {
            toast.error("Could not remove the file.");
        } finally {
            setRemovingId(null);
        }
    };

    return (
        <div className="card supplemental-panel" data-testid="supplemental-panel">
            <div className="eyebrow">ADMIN SUPPLEMENTAL EVIDENCE · LABELLED · NOT PART OF THE STUDENT ORIGINALS</div>
            <p className="optional" style={{ margin: "6px 0 10px" }}>
                Attach extra records you obtained during review (a partner letter, a follow-up photo, a register). They are visible to Admin only and never change a mark by themselves. Adding or removing a file makes the stored analysis stale, so re-run the analysis before approving.
            </p>
            {loadState === "loading" ? <p className="optional">Loading supplemental files…</p> : null}
            {loadState === "error" ? <div className="banner red">Could not load supplemental files. Nothing about the review is affected.</div> : null}
            {items.length ? (
                <ul className="supp-list">
                    {items.map((item) => (
                        <li key={item.id}>
                            <span className="tag">Supplemental · {item.label}</span>{" "}
                            <a href={item.url} target="_blank" rel="noopener noreferrer">
                                {item.name}
                            </a>
                            <span className="optional">
                                {" "}
                                · {sectionOptionLabel(item.section)} · {item.visibility}
                                {item.caption ? ` · ${item.caption}` : ""}
                            </span>{" "}
                            <button type="button" className="crit-restore" disabled={Boolean(removingId)} onClick={() => void remove(item)}>
                                {removingId === item.id ? "Removing…" : "Remove"}
                            </button>
                        </li>
                    ))}
                </ul>
            ) : loadState === "ready" ? (
                <p className="optional">No supplemental files attached.</p>
            ) : null}
            <div className="supp-form">
                <input ref={fileInput} type="file" disabled={busy} onChange={(e) => setFile(e.target.files?.[0] ?? null)} aria-label="Supplemental evidence file" />
                <input type="text" value={label} maxLength={120} disabled={busy} onChange={(e) => setLabel(e.target.value)} placeholder="Label: why this file was added (required)" aria-label="Supplemental evidence label" />
                <select value={section} disabled={busy} onChange={(e) => setSection(e.target.value)} aria-label="Related report section">
                    {SUPPLEMENTAL_SECTIONS.map((s) => (
                        <option key={s} value={s}>
                            {sectionOptionLabel(s)}
                        </option>
                    ))}
                </select>
                <select value={visibility} disabled={busy} onChange={(e) => setVisibility(e.target.value)} aria-label="Visibility label">
                    {SUPPLEMENTAL_VISIBILITIES.map((v) => (
                        <option key={v} value={v}>
                            {v[0].toUpperCase() + v.slice(1)}
                        </option>
                    ))}
                </select>
                <input type="text" value={caption} maxLength={500} disabled={busy} onChange={(e) => setCaption(e.target.value)} placeholder="Caption / relevance (optional)" aria-label="Caption" />
                <button type="button" className="primary" disabled={busy} onClick={() => void add()}>
                    {busy ? "Uploading…" : "Attach file"}
                </button>
            </div>
        </div>
    );
}
