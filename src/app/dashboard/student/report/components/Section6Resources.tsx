import { Plus, Trash2, FileText, ChevronDown } from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { useReportForm } from "../context/ReportContext";
import { calculateEngagementMetrics, buildIndividualRosterFromSection1, displayReportHours } from "../utils/engagementMetrics";
import { FieldError } from "./ui/FieldError";
import React, { useMemo, useEffect, useState } from "react";
import clsx from "clsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { EvidenceMediaPreview } from "./ui/EvidenceMediaPreview";
import { evidenceItemKind } from "../utils/evidencePreviewKind";
import { toast } from "sonner";
import { MAX_RESOURCE_PROOF_BYTES, MAX_RESOURCE_PROOF_LABEL, splitReportFilesBySize } from "../utils/fileUploadLimits";
import { REPORT_ATTACHMENT_ACCEPT } from "@/utils/reportAttachmentAccept";
import { contributorShareOf, isExternalResourceSource, isMixedResourceSource, resourceAmountNumber } from "../utils/resourceContributors";
import type { ReportResourceProofFile } from "../context/ReportContext";

/** V19 Section 5: proof of a contribution (receipt, invoice, transfer record) is capped at 25 MB per file. */
function filterOversizedProofs(files: File[], input: HTMLInputElement): File[] {
    const { accepted, rejected } = splitReportFilesBySize(files, MAX_RESOURCE_PROOF_BYTES);
    if (rejected.length > 0) {
        toast.error(`Each proof file must be ${MAX_RESOURCE_PROOF_LABEL} or smaller: ${rejected.map((file) => file.name).join(", ")}`);
        input.value = "";
    }
    return accepted;
}

const resourceTypes = [
    "Cash / Funding", "Materials / Consumables", "Food / Water / Nutrition Supplies", "Medical / Health Supplies",
    "Educational / Learning Materials", "Technology / Devices", "Software / Cloud / Digital Services", "Equipment / Tools / Machinery",
    "Venue / Space / Land", "Transport / Fuel / Logistics", "Utilities / Energy / Internet", "Professional Expertise / Consultancy",
    "Legal / Technical / Clinical Services", "Staff Time", "Volunteer Time", "Research / Laboratory Access", "Data / Information / Licences",
    "Media / Creative Production", "Government Permission / Support", "Corporate / CSR Support", "University / Institutional Support",
    "Community Contribution", "Donated Goods", "Pro-bono Services", "Discounts / Waivers", "Other / Custom",
];

const unitOptions = [
    "People", "Households", "Participants", "Students", "Patients / Clients", "Farmers / Businesses", "Sessions", "Hours", "Days",
    "Items", "Kits", "Meals / Packages", "Books / Materials", "Devices", "Facilities", "Rooms / Classrooms", "m²", "Hectares",
    "Kilograms", "Tonnes", "Litres", "m³", "kWh", "Trees", "Referrals", "Cases", "Policies / SOPs", "Datasets", "Reports",
    "Applications / Platforms", "Posts / Media Pieces", "Views / Impressions", "Events", "Partnerships", "Local Currency",
    "PKR", "USD", "EUR", "GBP", "Percent (%)", "Other…",
];

const sourceOptions = [
    "Student Team", "University / Institution", "Faculty / Department / School", "Research / Academic Grant", "Partner Organization",
    "NGO / Nonprofit / Civil Society", "Government / Public Agency", "Corporate / CSR", "Foundation / Philanthropy",
    "International / Multilateral Organization", "Private Sponsor", "Individual Donor", "Community Members / Beneficiaries",
    "Fundraising Event / Campaign", "Crowdfunding", "Self-funded", "In-kind Donation", "Pro-bono Contributor", "Other / Custom Source",
];

const verificationOptions = [
    "Receipt / Invoice", "Bank / Payment Record", "Donation / Handover Record", "Inventory / Distribution Log", "Partner Confirmation",
    "University Confirmation", "Government / Official Documentation", "Photographic Evidence", "Contract / MoU / Letter",
    "Digital / Platform Record", "Timesheet / Volunteer Log", "Valuation / Quotation", "Self-Reported — Requires Review", "Other Verification",
];

function isCustomOption(value: unknown, customLabels: string[]): boolean {
    const text = String(value || "").trim();
    return customLabels.includes(text);
}

const emptyResource = () => ({
    type: "", type_other: "", amount: "", unit: "", unit_other: "",
    sources: [] as string[], source_other: "", purpose: "", verification: [] as string[],
    contributor_name: "", contributor_email: "", contributor_phone_code: "+92", contributor_phone: "", evidence_trail: "",
});

const inputClasses =
    "h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100";
const selectClasses =
    "h-11 w-full min-w-0 appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm font-medium text-slate-800 shadow-sm outline-none transition-colors focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100";
const fieldLabel =
    "text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500";
const badgeRequired =
    "shrink-0 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-600";

function CheckGrid({
    options,
    selected,
    onToggle,
}: {
    options: string[];
    selected: string[];
    onToggle: (value: string) => void;
}) {
    return (
        <div className="flex flex-wrap gap-2">
            {options.map((opt) => {
                const active = selected.includes(opt);
                return (
                    <button
                        key={opt}
                        type="button"
                        onClick={() => onToggle(opt)}
                        className={clsx(
                            "rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors",
                            active
                                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                        )}
                    >
                        {opt}
                    </button>
                );
            })}
        </div>
    );
}

function FilePreview({ file }: { file: any }) {
    // Read the kind from the MIME type, the stored name or the URL — a saved record is often just `{ url }`.
    const isImage = evidenceItemKind(file) === "image";
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

    useEffect(() => {
        if (isImage) {
            const native = file instanceof File || file instanceof Blob ? file : file?.file instanceof File ? file.file : null;
            if (native) {
                const url = URL.createObjectURL(native);
                setPreviewUrl(url);
                return () => URL.revokeObjectURL(url);
            } else if (typeof file === "string") {
                setPreviewUrl(file);
            } else if (file?.url) {
                setPreviewUrl(file.url);
            }
        }
    }, [file, isImage]);

    if (isImage && previewUrl) {
        return (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                <img src={previewUrl} alt={file?.name || "Preview"} className="h-full w-full object-cover" />
            </div>
        );
    }

    return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-600">
            <FileText className="h-5 w-5" />
        </div>
    );
}

function FullFilePreview({ file }: { file: any }) {
    const name: string = typeof file === "string" ? file.split(/[?#]/)[0].split("/").pop() || file : file?.name || "Preview";
    const mimeType: string = typeof file === "string" ? "" : file?.type || "";
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

    useEffect(() => {
        if (!file) return;
        const native = file instanceof File || file instanceof Blob ? file : file?.file instanceof File ? file.file : null;
        if (native) {
            const url = URL.createObjectURL(native);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        } else if (typeof file === "string") {
            setPreviewUrl(file);
        } else if (file?.url) {
            setPreviewUrl(file.url);
        } else {
            setPreviewUrl(null);
        }
    }, [file]);

    if (!file) return null;

    return <EvidenceMediaPreview url={previewUrl} name={name} mimeType={mimeType} />;
}


/* ─────────────────────────────────────────────────────────────────────────────
 * Section 5 · Resources — V19 streamlined flow (same data model and submit rules as before):
 *   intro → 5.1 pathway → "What your project ran on" donut → 5.2 entries (type, amount + unit,
 *   what it made possible, source, verification, who contributed, proof upload) →
 *   5.3 contributor register → AI-ready field summary.
 * ───────────────────────────────────────────────────────────────────────────── */

const DONUT_COLORS = ["#f4b400", "#ff766f", "#7c5cff", "#2ec4b6", "#4285f4", "#e86bb5", "#25b8d8"];
const CASH_UNITS = ["PKR", "USD", "EUR", "GBP"];

type ProofFile = File | ReportResourceProofFile;

const isNativeFile = (value: unknown): value is File => typeof File !== "undefined" && value instanceof File;

/** Index of the 5.2 entry a proof supports; null for files saved before proofs were linked to entries. */
function proofEntryIndex(file: ProofFile): number | null {
    if (isNativeFile(file)) return null;
    const value = (file as ReportResourceProofFile).resource_index;
    return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}
function proofName(file: ProofFile): string {
    if (isNativeFile(file)) return file.name;
    const rec = file as ReportResourceProofFile;
    return String(rec.name || rec.file?.name || "Proof file");
}
function proofSizeLabel(file: ProofFile): string {
    const size = isNativeFile(file) ? file.size : Number((file as ReportResourceProofFile).size ?? (file as ReportResourceProofFile).file?.size ?? 0);
    return size ? `${(size / (1024 * 1024)).toFixed(2)} MB` : "";
}
/** Wraps a picked file with the entry it proves, so the link survives save / upload / reload. */
function toProofRecord(file: File, resourceIndex: number): ReportResourceProofFile {
    return { file, name: file.name, size: file.size, type: file.type, lastModified: file.lastModified, resource_index: resourceIndex };
}

function resourceLabel(res: any): string {
    const type = String(res?.type || "").trim();
    if (isCustomOption(type, ["Other / Custom", "Other (Specify)"])) return String(res?.type_other || "").trim() || "Custom resource";
    return type;
}
function unitLabel(res: any): string {
    const unit = String(res?.unit || "").trim();
    if (isCustomOption(unit, ["Other…", "Other (Specify)"])) return String(res?.unit_other || "").trim();
    return unit;
}
function isCashResource(res: any): boolean {
    return CASH_UNITS.includes(String(res?.unit || "").trim()) || /cash|funding|financial/i.test(String(res?.type || ""));
}
function amountNumber(res: any): number | null {
    const text = String(res?.amount ?? "").replace(/,/g, "").trim();
    if (!text) return null;
    const n = Number(text);
    return Number.isFinite(n) ? n : null;
}
function fmtNum(n: number): string {
    return Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function ProofList({
    proofs, onPreview, onRemove,
}: {
    proofs: Array<{ file: ProofFile; index: number }>;
    onPreview: (file: ProofFile) => void;
    onRemove: (fileIndex: number) => void;
}) {
    if (!proofs.length) return <p className="cer-hint">No proof uploaded yet.</p>;
    return (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {proofs.map(({ file, index }) => (
                <div key={`${index}-${proofName(file)}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => onPreview(file)}>
                        <FilePreview file={file} />
                        <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-slate-700">📎 {proofName(file)}</span>
                            <span className="text-xs text-slate-400">{proofSizeLabel(file) || "Saved with the report"}</span>
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => onRemove(index)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                        aria-label={`Remove ${proofName(file)}`}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            ))}
        </div>
    );
}

function ResourceCard({
    res, idx, onUpdate, onRemove, canRemove, getFieldError, proofs, onAddProofs, onRemoveProof, onPreview,
}: {
    res: any; idx: number; canRemove: boolean;
    onUpdate: (field: string, val: any) => void;
    onRemove: () => void;
    getFieldError: (key: string) => string | undefined;
    proofs: Array<{ file: ProofFile; index: number }>;
    onAddProofs: (files: File[], input: HTMLInputElement) => void;
    onRemoveProof: (fileIndex: number) => void;
    onPreview: (file: ProofFile) => void;
}) {
    const sources: string[] = res.sources || [];
    const verifications: string[] = Array.isArray(res.verification)
        ? res.verification
        : typeof res.verification === "string" && res.verification
            ? [res.verification]
            : [];
    const toggleSource = (s: string) => onUpdate("sources", sources.includes(s) ? sources.filter(x => x !== s) : [...sources, s]);
    const toggleVerification = (v: string) => onUpdate("verification", verifications.includes(v) ? verifications.filter(x => x !== v) : [...verifications, v]);
    const external = isExternalResourceSource(sources);
    const mixed = isMixedResourceSource(sources);
    const unit = unitLabel(res);
    const total = resourceAmountNumber(res.amount);
    const teamShare = resourceAmountNumber(res.student_team_share);
    const contributorShare = contributorShareOf(res);
    const shareLine = total === null
        ? "Enter the total amount above first."
        : String(res.student_team_share ?? "").trim() === ""
            ? `${fmtNum(total)} ${unit} total · waiting for the student team's share`
            : teamShare === null || teamShare < 0
                ? "The student team's share must be a number of 0 or more."
                : teamShare > total
                    ? `The student team's share (${fmtNum(teamShare)}) is more than the total (${fmtNum(total)}).`
                    : `${fmtNum(contributorShare ?? 0)} ${unit} · ${fmtNum(teamShare)} + ${fmtNum(contributorShare ?? 0)} = ${fmtNum(total)} ${unit} ✓`;
    const shareReconciles = total !== null && teamShare !== null && teamShare >= 0 && teamShare <= total;
    const contributorErrors = ["contributor_name", "contributor_email", "contributor_phone", "evidence_trail"]
        .map((key) => getFieldError(`resources.${idx}.${key}`))
        .filter((m): m is string => Boolean(m));

    return (
        <div className="overflow-hidden rounded-[14px] border border-[#dcebee] bg-white" data-ciel-resource-entry={idx}>
            <div className="flex items-center gap-2 border-b border-[#dcebee] bg-[#f5fbfa] px-3.5 py-2">
                <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] bg-[#e6f6f4] text-[10px] font-extrabold text-[#0e7d74]">
                    {idx + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-[11.5px] font-extrabold text-[#0d2b33]">
                    {resourceLabel(res) || "Resource entry"}
                </span>
                {canRemove ? (
                    <button
                        type="button"
                        onClick={onRemove}
                        className="rounded-lg border border-[#f6cfd8] bg-[#fdf1f4] px-2 py-1 text-[11px] font-extrabold text-[#e11d48]"
                        aria-label={`Remove resource entry ${idx + 1}`}
                        title="Remove this entry"
                    >
                        🗑
                    </button>
                ) : null}
            </div>
            <div className="space-y-4 px-3.5 pb-3.5 pt-3">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                    <Label className={fieldLabel}>Resource type <span className="text-rose-500">*</span></Label>
                    <div className="relative">
                        <select value={res.type || ""} onChange={e => onUpdate("type", e.target.value)} className={selectClasses}>
                            <option value="">Choose resource type…</option>
                            {res.type && !resourceTypes.includes(res.type) ? <option value={res.type}>{res.type}</option> : null}
                            {resourceTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                    {isCustomOption(res.type, ["Other / Custom", "Other (Specify)"]) ? (
                        <Input placeholder="Describe resource type…" value={res.type_other || ""} onChange={e => onUpdate("type_other", e.target.value)} className={inputClasses} />
                    ) : null}
                    <FieldError message={getFieldError(`resources.${idx}.type`)} />
                    <FieldError message={getFieldError(`resources.${idx}.type_other`)} />
                </div>
                <div className="space-y-1.5">
                    <Label className={fieldLabel}>Amount / quantity <span className="text-rose-500">*</span></Label>
                    <Input inputMode="decimal" placeholder="e.g. 8000 or 25" value={res.amount} onChange={e => onUpdate("amount", e.target.value)} className={inputClasses} />
                    <FieldError message={getFieldError(`resources.${idx}.amount`)} />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                    <Label className={fieldLabel}>Unit <span className="text-rose-500">*</span></Label>
                    <div className="relative">
                        <select value={res.unit || ""} onChange={e => onUpdate("unit", e.target.value)} className={selectClasses}>
                            <option value="">Choose unit…</option>
                            {res.unit && !unitOptions.includes(res.unit) ? <option value={res.unit}>{res.unit}</option> : null}
                            {unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                    {isCustomOption(res.unit, ["Other…", "Other (Specify)"]) ? (
                        <Input placeholder="Custom unit…" value={res.unit_other || ""} onChange={e => onUpdate("unit_other", e.target.value)} className={inputClasses} />
                    ) : null}
                    <FieldError message={getFieldError(`resources.${idx}.unit`)} />
                    <FieldError message={getFieldError(`resources.${idx}.unit_other`)} />
                </div>
                <div className="space-y-1.5">
                    <Label className={fieldLabel}>What did it make possible? <span className="text-rose-500">*</span></Label>
                    <Input placeholder="One clear line linking the resource to delivery" value={res.purpose} onChange={e => onUpdate("purpose", e.target.value)} className={inputClasses} />
                    <FieldError message={getFieldError(`resources.${idx}.purpose`)} />
                </div>
            </div>

            <div className="space-y-2">
                <Label className={fieldLabel}>Source · choose all that apply <span className="text-rose-500">*</span></Label>
                <CheckGrid options={sourceOptions} selected={sources} onToggle={toggleSource} />
                {sources.some((item) => isCustomOption(item, ["Other / Custom Source", "Other (Specify)"])) ? (
                    <Input placeholder="Specify other source…" value={res.source_other || ""} onChange={e => onUpdate("source_other", e.target.value)} className={inputClasses} />
                ) : null}
                <FieldError message={getFieldError(`resources.${idx}.sources`)} />
                <FieldError message={getFieldError(`resources.${idx}.source_other`)} />
            </div>

            <div className="space-y-2">
                <Label className={fieldLabel}>Verification · choose all that apply <span className="text-rose-500">*</span></Label>
                <CheckGrid options={verificationOptions} selected={verifications} onToggle={toggleVerification} />
                {verifications.some((item) => item === "Other Verification") ? (
                    <Input placeholder="Describe other verification…" value={res.verification_other || ""} onChange={e => onUpdate("verification_other", e.target.value)} className={inputClasses} />
                ) : null}
                <FieldError message={getFieldError(`resources.${idx}.verification`)} />
            </div>

            {/* Who contributed — follows the source choice, exactly like the V19 flow */}
            {!sources.length ? (
                <p className="cer-muted" data-ciel-contributor-state="choose-source">Choose the source above to record who contributed.</p>
            ) : !external ? (
                <div className="space-y-2" data-ciel-contributor-state="student-funded">
                    <div className="cer-ok">Student-funded resource · credited to the student team. Outside-contributor details are not required.</div>
                    {contributorErrors.map((message) => <FieldError key={message} message={message} />)}
                </div>
            ) : (
                <div className="cer-who space-y-4" data-ciel-contributor-state="outside">
                    <div>
                        <h4 className="text-[13px] font-extrabold text-[var(--ink)]">Who contributed this resource?</h4>
                        <p className="cer-hint">
                            Record the outside contributor — anyone who gave money, goods, equipment, a venue or professional help — and the trail that proves it.
                            e.g. 50 notebooks (or PKR 5,000 cash) · contributed by a local bookshop · delivered to Class 4 (purchase receipt + handover photos).
                        </p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label className={fieldLabel}>Contributor’s full name / organization <span className="text-rose-500">*</span></Label>
                            <Input placeholder="Person or organisation who gave it" value={res.contributor_name || ""} onChange={e => onUpdate("contributor_name", e.target.value)} className={inputClasses} />
                            <FieldError message={getFieldError(`resources.${idx}.contributor_name`)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className={fieldLabel}>Email for acknowledgement &amp; partner record <span className="text-rose-500">*</span></Label>
                            <Input type="email" placeholder="name@example.org" value={res.contributor_email || ""} onChange={e => onUpdate("contributor_email", e.target.value)} className={inputClasses} />
                            <FieldError message={getFieldError(`resources.${idx}.contributor_email`)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label className={fieldLabel}>Contact / WhatsApp number · with country code <span className="text-rose-500">*</span></Label>
                            <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2">
                                <Input inputMode="tel" placeholder="+92" value={res.contributor_phone_code ?? "+92"} onChange={e => onUpdate("contributor_phone_code", e.target.value)} className={inputClasses} />
                                <Input inputMode="tel" placeholder="300 1234567" value={res.contributor_phone || ""} onChange={e => onUpdate("contributor_phone", e.target.value)} className={inputClasses} />
                            </div>
                            <FieldError message={getFieldError(`resources.${idx}.contributor_phone`)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className={fieldLabel}>Evidence trail <span className="text-rose-500">*</span></Label>
                            <textarea
                                rows={2}
                                placeholder="Where it came from, how it was used, who received it — e.g. bank transfer receipt from the donor, purchase receipts, photos of the handover"
                                value={res.evidence_trail || ""}
                                onChange={e => onUpdate("evidence_trail", e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)]"
                            />
                            <FieldError message={getFieldError(`resources.${idx}.evidence_trail`)} />
                        </div>
                    </div>
                    {mixed ? (
                        <div className="space-y-2 rounded-xl border border-[#dcebee] bg-[#f5fbfa] p-3" data-ciel-resource-shares={idx}>
                            <p className="text-[12px] font-extrabold text-[var(--ink)]">Shares of this resource · same unit</p>
                            <p className="cer-hint">
                                Mixed source: record how much came from the student team. The contributor’s share is the rest, so the two always add up to the total.
                                A second outside contributor gets its own entry.
                            </p>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label className={fieldLabel}>Student team’s share{unit ? ` (${unit})` : ""} <span className="text-rose-500">*</span></Label>
                                    <Input inputMode="decimal" placeholder="0 if none" value={res.student_team_share ?? ""} onChange={e => onUpdate("student_team_share", e.target.value)} className={inputClasses} />
                                    <FieldError message={getFieldError(`resources.${idx}.student_team_share`)} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className={fieldLabel}>Contributor’s share{unit ? ` (${unit})` : ""} · calculated</Label>
                                    <p className={clsx(shareReconciles ? "cer-ok" : "cer-muted")} data-ciel-share-reconcile={shareReconciles ? "ok" : "pending"}>{shareLine}</p>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            )}

            {/* Proof of this contribution — one upload per entry, linked to it */}
            <div className="cer-proof space-y-2" data-ciel-resource-proof={idx}>
                <p className="text-[12px] font-extrabold text-[var(--ink)]">Upload proof of this contribution <span className="text-rose-500">*</span></p>
                <p className="cer-hint">
                    Upload a receipt, invoice, bank transfer record, donation confirmation, handover record or other relevant proof of the resource contributed.
                    Evidence for each contribution travels with this entry to Section 7 (Evidence). Max {MAX_RESOURCE_PROOF_LABEL} per file.
                </p>
                <input
                    type="file"
                    multiple
                    accept={REPORT_ATTACHMENT_ACCEPT}
                    className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border file:border-slate-200 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700"
                    onChange={(e) => {
                        if (!e.target.files) return;
                        onAddProofs(Array.from(e.target.files), e.currentTarget);
                        e.currentTarget.value = "";
                    }}
                />
                <ProofList proofs={proofs} onPreview={onPreview} onRemove={onRemoveProof} />
            </div>
            </div>
        </div>
    );
}

export default function Section6Resources({ projectData: _projectData }: { projectData?: unknown } = {}) {
    const { data, updateSection, getFieldError } = useReportForm();
    const { section1, section6 } = data;
    const { use_resources } = section6;
    const resources = Array.isArray(section6.resources) ? section6.resources : [];
    const evidenceFiles: ProofFile[] = Array.isArray(section6.evidence_files) ? (section6.evidence_files as ProofFile[]) : [];

    const [previewFile, setPreviewFile] = useState<any>(null);

    const update = (field: string, val: any) => updateSection("section6", { [field]: val });

    /** 5.1: choosing "We used resources" opens the first entry straight away (nothing to hunt for). */
    const setPathway = (value: "yes" | "no") => {
        const patch: Record<string, unknown> = { use_resources: value };
        if (value === "yes" && resources.length === 0) patch.resources = [emptyResource()];
        updateSection("section6", patch);
    };

    const addResource = () => update("resources", [...resources, emptyResource()]);
    const removeResource = (i: number) => {
        // Proofs follow their entry: drop the removed entry's files, shift the links of later entries.
        const keptFiles = evidenceFiles
            .filter((file) => proofEntryIndex(file) !== i)
            .map((file) => {
                const at = proofEntryIndex(file);
                return at !== null && at > i ? { ...(file as ReportResourceProofFile), resource_index: at - 1 } : file;
            });
        updateSection("section6", { resources: resources.filter((_, idx) => idx !== i), evidence_files: keptFiles });
    };
    const updateResource = (i: number, field: string, val: any) => {
        const next = [...resources];
        next[i] = { ...next[i], [field]: val };
        update("resources", next);
    };

    const proofsFor = (idx: number) =>
        evidenceFiles.map((file, index) => ({ file, index })).filter(({ file }) => proofEntryIndex(file) === idx);
    const unlinkedProofs = evidenceFiles.map((file, index) => ({ file, index })).filter(({ file }) => proofEntryIndex(file) === null);
    const addProofs = (idx: number, picked: File[], input: HTMLInputElement) => {
        const accepted = filterOversizedProofs(picked, input);
        if (!accepted.length) return;
        update("evidence_files", [...evidenceFiles, ...accepted.map((file) => toProofRecord(file, idx))]);
    };
    const removeProof = (fileIndex: number) => update("evidence_files", evidenceFiles.filter((_, i) => i !== fileIndex));
    const linkProof = (fileIndex: number, idx: number) =>
        update("evidence_files", evidenceFiles.map((file, i) => (i === fileIndex ? { ...(isNativeFile(file) ? toProofRecord(file, idx) : (file as ReportResourceProofFile)), resource_index: idx } : file)));

    const verifiedHoursSnapshot = useMemo(() => {
        const logs = Array.isArray(section1.attendance_logs) ? section1.attendance_logs : [];
        if (logs.length > 0) {
            const members = Array.isArray(section1.team_members) ? section1.team_members : [];
            const teamSize = (section1.participation_type === "team" ? members.length : 0) + 1;
            const req = data.required_hours || 16;
            const rosterIds = buildIndividualRosterFromSection1(section1, section1.team_lead?.id);
            const calc = calculateEngagementMetrics(logs, req, teamSize, undefined, rosterIds);
            // Same hours as the flashcard and certificate (larger of the stored count and the logged hours).
            return Number(Math.max(calc.total_verified_hours, displayReportHours(section1.metrics?.total_verified_hours, logs)).toFixed(1));
        }
        const stored = Number(section1.metrics?.total_verified_hours);
        return Number.isFinite(stored) ? Number(stored.toFixed(1)) : 0;
    }, [
        section1.attendance_logs,
        section1.participation_type,
        section1.team_members,
        section1.team_lead?.id,
        section1.metrics?.total_verified_hours,
        data.required_hours,
    ]);

    // ----- what the project ran on (donut by resource type) -----
    const typed = resources.filter((r) => resourceLabel(r));
    const typeCounts = useMemo(() => {
        const counts = new Map<string, number>();
        typed.forEach((r) => counts.set(resourceLabel(r), (counts.get(resourceLabel(r)) || 0) + 1));
        return [...counts.entries()];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [section6.resources]);
    const donutBackground = useMemo(() => {
        if (!typed.length) return "#eef1f3";
        let acc = 0;
        const segs = typeCounts.map(([, count], i) => {
            const share = (count / typed.length) * 100;
            const seg = `${DONUT_COLORS[i % DONUT_COLORS.length]} ${acc}% ${acc + share}%`;
            acc += share;
            return seg;
        });
        return `conic-gradient(${segs.join(",")})`;
    }, [typeCounts, typed.length]);

    // ----- cash and contributors -----
    const cashByCurrency = useMemo(() => {
        const totals: Record<string, number> = {};
        resources.forEach((r) => {
            const unit = String(r.unit || "").trim();
            if (!CASH_UNITS.includes(unit)) return;
            const amt = amountNumber(r);
            if (!amt) return;
            totals[unit] = (totals[unit] || 0) + amt;
        });
        return totals;
    }, [resources]);
    const contributors = useMemo(() => {
        const groups = new Map<string, { name: string; email: string; phone: string; items: string[]; complete: boolean }>();
        resources.forEach((r, idx) => {
            if (!isExternalResourceSource(r.sources || [])) return;
            const name = String(r.contributor_name || "").trim();
            const email = String(r.contributor_email || "").trim();
            if (!name && !email) return;
            const key = (email || name).toLowerCase();
            // On a mixed entry the contributor is credited with their share only, never the whole total.
            const mixed = isMixedResourceSource(r.sources || []);
            const amt = contributorShareOf(r);
            const unit = unitLabel(r);
            const share = `${amt !== null ? fmtNum(amt) : mixed ? "share pending" : "amount pending"}${unit ? ` ${unit}` : ""}${mixed && amt !== null ? ` of ${fmtNum(amountNumber(r) ?? 0)} (student team ${fmtNum(resourceAmountNumber(r.student_team_share) ?? 0)})` : ""} · ${resourceLabel(r) || `Resource ${idx + 1}`}`;
            const complete = Boolean(name && email && String(r.contributor_phone || "").trim() && String(r.evidence_trail || "").trim()) && proofsFor(idx).length > 0 && (!mixed || amt !== null);
            const row = groups.get(key) || { name: name || email, email, phone: String(r.contributor_phone ? `${r.contributor_phone_code ?? "+92"} ${r.contributor_phone}` : "").trim(), items: [], complete: true };
            row.items.push(share);
            row.complete = row.complete && complete;
            if (!row.email && email) row.email = email;
            groups.set(key, row);
        });
        return [...groups.values()];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [section6.resources, section6.evidence_files]);
    const inKindCount = resources.filter((r) => resourceLabel(r) && !isCashResource(r) && isExternalResourceSource(r.sources || [])).length;
    const outsideCash = useMemo(() => {
        const totals: Record<string, number> = {};
        resources.forEach((r) => {
            const unit = String(r.unit || "").trim();
            if (!CASH_UNITS.includes(unit) || !isExternalResourceSource(r.sources || [])) return;
            const amt = contributorShareOf(r);
            if (amt) totals[unit] = (totals[unit] || 0) + amt;
        });
        return Object.entries(totals);
    }, [resources]);

    // ----- AI-ready field summary (the text that travels with the report as section6.summary_text) -----
    const summaryLines = useMemo<Array<[string, string]>>(() => {
        if (use_resources === "no") {
            return [
                ["Resource pathway", "Student time and effort only."],
                ["Cash in PKR and contributors", `PKR 0 recorded cash; 0 outside contributor(s). Verified team hours: ${verifiedHoursSnapshot}h.`],
            ];
        }
        const lines: Array<[string, string]> = [["Resource pathway", use_resources === "yes" ? "Resources mobilized." : "Pathway not selected."]];
        resources.forEach((r, idx) => {
            const amt = amountNumber(r);
            const unit = unitLabel(r);
            const sources = (r.sources || []).map((s: string) => (isCustomOption(s, ["Other / Custom Source", "Other (Specify)"]) ? String(r.source_other || s) : s)).filter(Boolean);
            const verification = (Array.isArray(r.verification) ? r.verification : r.verification ? [r.verification] : []).filter(Boolean);
            const external = isExternalResourceSource(r.sources || []);
            const mixed = isMixedResourceSource(r.sources || []);
            const shareNote = mixed
                ? ` · Student team share: ${resourceAmountNumber(r.student_team_share) !== null ? fmtNum(resourceAmountNumber(r.student_team_share) as number) : "not recorded"} ${unit || ""}`.trimEnd()
                    + ` · Contributor share: ${contributorShareOf(r) !== null ? fmtNum(contributorShareOf(r) as number) : "pending"} ${unit || ""}`.trimEnd()
                : "";
            const contributor = external
                ? `${shareNote} · Contributor: ${String(r.contributor_name || "").trim() || "name pending"}${String(r.contributor_email || "").trim() ? ` (${String(r.contributor_email).trim()})` : ""}`
                : "";
            lines.push([
                `Resource ${idx + 1}: ${resourceLabel(r) || "Unspecified"}`,
                `${amt !== null ? fmtNum(amt) : "Amount missing"} ${unit || "unit missing"} · Enabled: ${String(r.purpose || "").trim() || "not supplied"} · Source: ${sources.join("; ") || "not supplied"} · Verification method: ${verification.join("; ") || "not supplied"} · ${proofsFor(idx).length} supporting file(s)${contributor}.`,
            ]);
        });
        lines.push([
            "Cash in PKR and contributors",
            `PKR ${fmtNum(cashByCurrency.PKR || 0)} recorded cash (other currencies and in-kind quantities kept separate); ${contributors.length} outside contributor(s).`,
        ]);
        return lines;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [use_resources, section6.resources, section6.evidence_files, cashByCurrency, contributors.length, verifiedHoursSnapshot]);
    const autoNarrative = useMemo(() => {
        if (use_resources === "no" || use_resources === "") {
            return `Resource Model: Volunteer-Based Implementation. Total Verified Hours: ${verifiedHoursSnapshot}h. Financial Mobilization: 0.`;
        }
        return summaryLines.map(([h, t]) => `${h}: ${t}`).join("\n");
    }, [use_resources, summaryLines, verifiedHoursSnapshot]);
    useEffect(() => {
        if (section6.summary_text !== autoNarrative) {
            updateSection("section6", { summary_text: autoNarrative });
        }
    }, [autoNarrative, section6.summary_text, updateSection]);

    const sectionTag = (text: string, auto = false) => <span className={clsx("cer-tag", auto && "auto")}>{text}</span>;

    return (
        <div className="mx-auto max-w-6xl space-y-3 pb-10" data-ciel-section5-v19>
            {/* Header */}
            <div className="cer-dup-head space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Section 5 of 11 — Resources</p>
                <h1 className="pt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">What the project ran on 📦</h1>
                <p className="text-sm text-slate-500">
                    Choose: time &amp; effort only, or resources used. If resources: one entry each — type, amount + unit, source, verification, and one line on what it made possible.
                </p>
            </div>

            {/* Every contribution has a person behind it */}
            <div className="cer-cr-intro" data-ciel-contributor-intro>
                <b>Every contribution has a person behind it.</b> Record cash and in-kind support, identify who provided it, and connect their contribution to this project’s partner history.
                <div className="cer-cr-steps">
                    <span>1 · Record support</span><span>2 · Link contributor</span><span>3 · Admin reviews</span><span>4 · Thank &amp; recognize</span>
                </div>
            </div>

            {/* 5.1 What did the project run on */}
            <section className="cer-card space-y-3">
                <div className="cer-secl">
                    <span className="cer-secn">5.1</span>
                    <h2>What did your project run on?</h2>
                    {sectionTag("Required")}
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => setPathway("no")}
                        aria-pressed={use_resources === "no"}
                        data-ciel-choice-card="use_resources:no"
                        className="cer-choice-card rounded-xl p-5 text-center transition-colors"
                    >
                        {use_resources === "no" ? <span className="cer-choice-card-tag">✓ Selected</span> : null}
                        <p className="text-2xl">💪</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">Just our time &amp; effort</p>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                            No money, materials, or outside support.
                        </p>
                    </button>

                    <button
                        type="button"
                        onClick={() => setPathway("yes")}
                        aria-pressed={use_resources === "yes"}
                        data-ciel-choice-card="use_resources:yes"
                        className="cer-choice-card rounded-xl p-5 text-center transition-colors"
                    >
                        {use_resources === "yes" ? <span className="cer-choice-card-tag">✓ Selected</span> : null}
                        <p className="text-2xl">📦</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">We used resources</p>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                            Money, materials, venue, equipment, or expert help.
                        </p>
                    </button>
                </div>
                <p className="cer-hint">Either answer is a good answer — a zero-budget project is a story worth telling too.</p>
                <FieldError message={getFieldError("use_resources")} />

                {use_resources === "no" ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">System records</p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            {[
                                { label: "Resource model", val: "Volunteer-based" },
                                { label: "Verified hours", val: `${verifiedHoursSnapshot}h` },
                                { label: "Financial mobilization", val: "0" },
                            ].map(({ label, val }) => (
                                <div key={label}>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                                    <p className="mt-0.5 text-sm font-semibold text-slate-800">{val}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}
            </section>

            {use_resources === "yes" ? (
                <>
                    {/* What your project ran on — fills itself from the entries */}
                    <div className="cer-donut-wrap" data-ciel-resource-donut>
                        <div className="cer-donut" style={{ background: donutBackground }}>
                            <div className="cer-donut-hole">
                                <b>{typed.length}</b>
                                <span>resources</span>
                            </div>
                        </div>
                        <div className="min-w-0 flex-1">
                            <b>📦 What your project ran on</b>
                            {typeCounts.length ? (
                                <div className="cer-donut-legend">
                                    {typeCounts.map(([label, count], i) => (
                                        <span key={label}><i style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />{label} · {count}</span>
                                    ))}
                                </div>
                            ) : (
                                <p>Add resource entries and this chart fills itself.</p>
                            )}
                            <p>Every entry needs a source and a verification — that is what the rubric reads.</p>
                        </div>
                    </div>

                    {/* 5.2 Resource entries */}
                    <section className="cer-card space-y-4">
                        <div className="cer-secl">
                            <span className="cer-secn">5.2</span>
                            <h2>Resource entries</h2>
                            {sectionTag("One per resource")}
                        </div>
                        <p className="cer-ex">
                            Example: <i>PKR 8,000 total = PKR 3,000 from the student team + PKR 5,000 from a named sponsor. Add the sponsor’s email, number and evidence reference.</i>
                        </p>
                        <FieldError message={getFieldError("resources")} />
                        <div className="space-y-4">
                            {resources.map((res, idx) => (
                                <ResourceCard
                                    key={idx}
                                    res={res}
                                    idx={idx}
                                    canRemove={resources.length > 1}
                                    onUpdate={(field, val) => updateResource(idx, field, val)}
                                    onRemove={() => removeResource(idx)}
                                    getFieldError={getFieldError}
                                    proofs={proofsFor(idx)}
                                    onAddProofs={(files, input) => addProofs(idx, files, input)}
                                    onRemoveProof={removeProof}
                                    onPreview={setPreviewFile}
                                />
                            ))}
                            <button type="button" onClick={addResource} className="cer-addbig flex items-center justify-center gap-1.5">
                                <Plus className="h-4 w-4" />
                                Add resource entry
                            </button>
                        </div>
                        {unlinkedProofs.length ? (
                            <div className="cer-proof space-y-2" data-ciel-unlinked-proofs>
                                <p className="text-[12px] font-extrabold text-[var(--ink)]">Proof already on file · not linked to an entry yet</p>
                                <p className="cer-hint">These files were uploaded before proofs were linked to entries. Link each one to the resource it supports, or remove it.</p>
                                <div className="space-y-2">
                                    {unlinkedProofs.map(({ file, index }) => (
                                        <div key={index} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                                            <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setPreviewFile(file)}>
                                                <FilePreview file={file} />
                                                <span className="truncate text-sm font-medium text-slate-700">📎 {proofName(file)}</span>
                                            </button>
                                            <select className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700" value="" onChange={(e) => { if (e.target.value !== "") linkProof(index, Number(e.target.value)); }}>
                                                <option value="">Link to entry…</option>
                                                {resources.map((r, i) => <option key={i} value={i}>{i + 1} · {resourceLabel(r) || "Resource entry"}</option>)}
                                            </select>
                                            <button type="button" onClick={() => removeProof(index)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500" aria-label={`Remove ${proofName(file)}`}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </section>

                    {/* 5.3 Contributor register */}
                    <section className="cer-card space-y-3" data-ciel-contributor-register>
                        <div className="cer-secl">
                            <span className="cer-secn">5.3</span>
                            <h2>Contributor register</h2>
                            {sectionTag("Links to Partnerships", true)}
                        </div>
                        <p className="cer-hint">One contributor record can support several resources. Amounts below are shares of the resources above, so they are counted once.</p>
                        <div className="flex flex-wrap gap-2">
                            <span className="cer-pill">{contributors.length} outside contributor{contributors.length === 1 ? "" : "s"}</span>
                            {outsideCash.map(([unit, total]) => <span key={unit} className="cer-pill">{unit} {fmtNum(total)} · outside cash</span>)}
                            <span className="cer-pill">{inKindCount} in-kind contribution{inKindCount === 1 ? "" : "s"}</span>
                        </div>
                        {contributors.length ? (
                            <div className="overflow-x-auto">
                                <table className="cer-cr-table">
                                    <thead><tr><th>Contributor</th><th>Support recorded</th><th>Recognition</th></tr></thead>
                                    <tbody>
                                        {contributors.map((c) => (
                                            <tr key={`${c.email}|${c.name}`}>
                                                <td><b>{c.name}</b><br /><span className="cer-hint">{c.email || "Email pending"}<br />{c.phone || "Number pending"}</span></td>
                                                <td>{c.items.map((item) => <div key={item}>{item}</div>)}</td>
                                                <td><span className="cer-pill">{c.complete ? "Ready for Admin review" : "Details incomplete"}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="cer-muted">Outside contributors will appear here as you record their support.</p>
                        )}
                        <p className="cer-hint">
                            Resource and contributor entries save with your draft. Email addresses and numbers are for authorized review and contributor communication; they stay off public summaries.
                        </p>
                    </section>
                </>
            ) : null}

            {/* AI-ready field summary */}
            {use_resources ? (
                <section className="cer-v17" data-ciel-section5-summary>
                    <header>
                        <b>SECTION 5 · RESOURCES &amp; CONTRIBUTIONS · AI-READY SUMMARY</b>
                        <small>Student-reported · pending review</small>
                    </header>
                    <div className="cer-v17-body">
                        {summaryLines.map(([h, t]) => (
                            <div key={h}>
                                <h4>{h}</h4>
                                <p>{t}</p>
                            </div>
                        ))}
                        <p className="cer-hint">Live field summary · updates from the entries above · generated from student-entered data, not independently verified.</p>
                    </div>
                </section>
            ) : null}

            <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
                <DialogContent className="flex max-w-4xl flex-col items-center bg-white p-6">
                    <DialogHeader className="mb-4 flex w-full flex-col items-start justify-start">
                        <DialogTitle className="w-full truncate break-all pr-8 text-sm font-bold text-slate-800">
                            {previewFile ? proofName(previewFile) : ""}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex max-h-[80vh] w-full items-center justify-center overflow-auto rounded-xl border border-slate-100 bg-slate-50 p-2">
                        <FullFilePreview file={previewFile} />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
