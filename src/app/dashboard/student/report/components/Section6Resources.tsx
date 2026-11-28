import { Plus, Trash2, FileText, ChevronDown } from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { useReportForm } from "../context/ReportContext";
import { calculateEngagementMetrics, buildIndividualRosterFromSection1, displayReportHours } from "../utils/engagementMetrics";
import { FieldError } from "./ui/FieldError";
import React, { useMemo, useEffect, useState, useRef } from "react";
import clsx from "clsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { EvidenceMediaPreview } from "./ui/EvidenceMediaPreview";
import { evidenceItemKind } from "../utils/evidencePreviewKind";
import { toast } from "sonner";
import { MAX_RESOURCE_PROOF_BYTES, MAX_RESOURCE_PROOF_LABEL, splitReportFilesBySize } from "../utils/fileUploadLimits";
import { REPORT_ATTACHMENT_ACCEPT } from "@/utils/reportAttachmentAccept";
import PhoneConnectivityRow from "@/components/ui/PhoneConnectivityRow";
import { dialFromPhoneCountryKey, normalizeNationalPhoneInput, parsePhoneForDisplay, validateNationalPhone } from "@/utils/countryCallingCodes";
import {
    CONTRIBUTOR_TYPE_GROUPS, OTHER_CONTRIBUTOR_TYPE,
    contributorIdentity, contributorIsNamed, contributorKindOf, contributorOrgRequired, contributorOrgShown, contributorShareOf,
    contributorTypeOf, extraContributorSources, isMixedResourceSource, isOutsideContribution, resourceAmountNumber, resourceContributedBy,
    sourcesForContribution, type ResourceContributedBy,
} from "../utils/resourceContributors";
import {
    CASH_UNITS, OTHER_VERIFICATION, contributedByText, contributorGaveText, contributorStage, fmtAmount, groupContributors, isCashResource,
    recognitionNote, reportStage, resourceAmountText, resourceBoxChecks, resourceName, resourceUnit, shareText, stepLabels, stepStateText,
    teamContributionLines, verificationList, type ContributorGroup, type ResourceRow, type ThankYouContext,
} from "../utils/resourceContributorsView";
import ContributorThankYouPreview, { ThankYouFlowStrip } from "./ContributorThankYouPreview";
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

/** V21: the unit list shown in a friendlier order — Money · Things · Time and space · Not listed. */
const unitGroups: Array<[string, string[]]> = [
    ["Money", ["PKR", "USD", "EUR", "GBP", "Local Currency"]],
    ["Things", ["Items", "Kits", "Books / Materials", "Devices", "Meals / Packages", "Trees", "Kilograms", "Litres"]],
    ["Time and space", ["Hours", "Days", "Sessions", "Rooms / Classrooms", "Facilities", "m²"]],
    ["Not listed", ["Other…"]],
];
const groupedUnits = unitGroups.flatMap(([, units]) => units);

const verificationOptions = [
    "Receipt / Invoice", "Bank / Payment Record", "Donation / Handover Record", "Inventory / Distribution Log", "Partner Confirmation",
    "University Confirmation", "Government / Official Documentation", "Photographic Evidence", "Contract / MoU / Letter",
    "Digital / Platform Record", "Timesheet / Volunteer Log", "Valuation / Quotation", "Self-Reported — Requires Review", OTHER_VERIFICATION,
];

function isCustomOption(value: unknown, customLabels: string[]): boolean {
    const text = String(value || "").trim();
    return customLabels.includes(text);
}

const emptyResource = () => ({
    type: "", type_other: "", amount: "", unit: "", unit_other: "",
    sources: [] as string[], source_other: "", purpose: "", verification: [] as string[], verification_other: "",
    student_team_share: "", contributed_by: "" as ResourceContributedBy,
    contributor_name: "", contributor_org: "", contributor_email: "", contributor_phone_code: "+92", contributor_phone: "",
    contributor_public_recognition: false, evidence_trail: "",
});

const inputClasses =
    "h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)]";
const selectClasses =
    "h-11 w-full min-w-0 appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm font-medium text-slate-800 shadow-sm outline-none transition-colors focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)]";
const fieldLabel =
    "text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500";
const Star = () => <span className="text-rose-500"> *</span>;
const Optional = () => <span className="ml-1 text-[9px] font-semibold normal-case tracking-normal text-slate-400">optional</span>;

function Select({ value, onChange, children, ariaLabel }: { value: string; onChange: (value: string) => void; children: React.ReactNode; ariaLabel?: string }) {
    return (
        <div className="relative">
            <select value={value} onChange={(e) => onChange(e.target.value)} className={selectClasses} aria-label={ariaLabel}>
                {children}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#cbe7e3] bg-[var(--teal-soft)] text-[var(--teal)]">
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
 * Section 5 · Resources — V21 "simple resource boxes" (same data model and submit rules as before):
 *   intro → 5.1 pathway → 5.2 one box per resource, three short steps in each box
 *   (1 the resource · 2 who contributed it · 3 proof; finished boxes fold away) →
 *   5.3 who gave what (automatic) → AI-ready field summary.
 *   Every outside contributor is named (name, WhatsApp as country code + mobile number, email); the
 *   thank-you email is prepared here and released by the server after CIEL PK Admin approves the
 *   report; contributors are carried into Partnerships as contributing partners.
 * ───────────────────────────────────────────────────────────────────────────── */

const DONUT_COLORS = ["#f4b400", "#ff766f", "#7c5cff", "#2ec4b6", "#4285f4", "#e86bb5", "#25b8d8"];

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
/** The optional note saved on one proof file (empty for a bare File picked before notes existed). */
function proofNote(file: ProofFile): string {
    if (isNativeFile(file)) return "";
    const note = (file as ReportResourceProofFile).note;
    return typeof note === "string" ? note : "";
}
function proofSizeLabel(file: ProofFile): string {
    const size = isNativeFile(file) ? file.size : Number((file as ReportResourceProofFile).size ?? (file as ReportResourceProofFile).file?.size ?? 0);
    return size ? `${(size / (1024 * 1024)).toFixed(2)} MB` : "";
}
/** Wraps a picked file with the entry it proves, so the link survives save / upload / reload. */
function toProofRecord(file: File, resourceIndex: number): ReportResourceProofFile {
    return { file, name: file.name, size: file.size, type: file.type, lastModified: file.lastModified, resource_index: resourceIndex };
}

function ProofList({
    proofs, onPreview, onRemove, onNote,
}: {
    proofs: Array<{ file: ProofFile; index: number }>;
    onPreview: (file: ProofFile) => void;
    onRemove: (fileIndex: number) => void;
    onNote: (fileIndex: number, note: string) => void;
}) {
    if (!proofs.length) return <p className="cer-hint">No proof uploaded yet.</p>;
    return (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {proofs.map(({ file, index }) => {
                const note = proofNote(file);
                return (
                <div key={`${index}-${proofName(file)}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2" data-ciel-proof-file={index}>
                <div className="flex items-center justify-between gap-3">
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
                <details className="mt-1.5" data-ciel-proof-note={index}>
                    <summary className="cursor-pointer truncate text-[11px] font-semibold text-[#0e7d74]">
                        {note.trim() ? `Note: ${note.trim()}` : "Add a note about this proof (optional)"}
                    </summary>
                    <textarea
                        rows={2}
                        maxLength={240}
                        aria-label={`Optional note for ${proofName(file)}`}
                        placeholder="What does it show?"
                        value={note}
                        onChange={(e) => onNote(index, e.target.value)}
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)]"
                    />
                </details>
                </div>
                );
            })}
        </div>
    );
}

/** The three step heads inside a box: number · title · what is still needed. */
function StepHead({ n, title, labels }: { n: 1 | 2 | 3; title: string; labels: string[] }) {
    return (
        <div className="cer-rx-step-head">
            <span className="cer-rx-num">{n}</span>
            <b>{title}</b>
            <span className={clsx("cer-rx-state", !labels.length && "ok")} data-ciel-step-state={n}>{stepStateText(labels)}</span>
        </div>
    );
}

type ReusableContributor = { key: string; label: string; row: ResourceRow };

function ResourceBox({
    res, idx, open, onToggle, onUpdate, onUpdateFields, onRemove, getFieldError, proofs, onAddProofs, onRemoveProof, onProofNote, onPreview,
    teamNames, reusable,
}: {
    res: any; idx: number; open: boolean;
    onToggle: (open: boolean) => void;
    onUpdate: (field: string, val: any) => void;
    onUpdateFields: (fields: Record<string, any>) => void;
    onRemove: () => void;
    getFieldError: (key: string) => string | undefined;
    proofs: Array<{ file: ProofFile; index: number }>;
    onAddProofs: (files: File[], input: HTMLInputElement) => void;
    onRemoveProof: (fileIndex: number) => void;
    onProofNote: (fileIndex: number, note: string) => void;
    onPreview: (file: ProofFile) => void;
    teamNames: string[];
    reusable: ReusableContributor[];
}) {
    const row = res as ResourceRow;
    const who = resourceContributedBy(row);
    const external = isOutsideContribution(row);
    const mixed = isMixedResourceSource(row.sources);
    const type = contributorTypeOf(row);
    const extras = extraContributorSources(row);
    const kinds = verificationList(row);
    const proofKind = kinds[0] || "";
    const checks = resourceBoxChecks(row, proofs.length);
    const labels: [string[], string[], string[]] = [stepLabels(checks, 1), stepLabels(checks, 2), stepLabels(checks, 3)];
    const stepsLeft = labels.filter((l) => l.length).length;
    const unit = resourceUnit(row);
    const total = resourceAmountNumber(row.amount);
    const teamShare = resourceAmountNumber(row.student_team_share);
    const contributorShare = contributorShareOf(row);
    const shareReconciles = total !== null && teamShare !== null && teamShare >= 0 && teamShare < total;
    const shareLine = total === null
        ? "Enter the total amount in step 1 first."
        : String(row.student_team_share ?? "").trim() === ""
            ? "Worked out for you once both amounts are entered."
            : teamShare === null || teamShare < 0
                ? "The student team’s own share must be a number of 0 or more."
                : teamShare >= total
                    ? `The student team’s own share (${fmtAmount(teamShare)}) must be smaller than the total (${fmtAmount(total)}).`
                    : `${fmtAmount(contributorShare ?? 0)} ${unit || "unit not chosen yet"} — the total minus the team’s share`;
    const err = (key: string) => getFieldError(`resources.${idx}.${key}`);
    const orgKind = contributorKindOf(row) === "organization";
    const mustOrg = contributorOrgRequired(row);
    const showOrg = contributorOrgShown(row);
    const named = contributorIsNamed(row);
    const phone = parsePhoneForDisplay(`${String(row.contributor_phone_code || "+92")}${String(row.contributor_phone || "")}`);
    const phoneMessage = String(row.contributor_phone || "").trim()
        ? validateNationalPhone(phone.phoneCountryKey, phone.national)
        : null;
    const phoneOk = Boolean(String(row.contributor_phone || "").trim()) && !phoneMessage;
    const filled = resourceName(row) || String(row.amount || "").trim() || String(row.purpose || "").trim() || proofs.length > 0 || named;

    const setWho = (next: ResourceContributedBy) => {
        if (next === who) return;
        onUpdateFields({ contributed_by: next, sources: sourcesForContribution(next, type, extras, row.sources) });
    };
    const setType = (next: string) => {
        onUpdateFields({
            sources: sourcesForContribution(external ? who : "outside", next, extras, row.sources),
            source_other: next === OTHER_CONTRIBUTOR_TYPE ? String(row.source_other || "") : "",
        });
    };
    const dropExtra = (source: string) => onUpdate("sources", (row.sources || []).filter((s) => s !== source));
    const setProofKind = (next: string) =>
        onUpdateFields({ verification: next ? [next] : [], verification_other: next === OTHER_VERIFICATION ? String(row.verification_other || "") : "" });
    const reuse = (key: string) => {
        const pick = reusable.find((r) => r.key === key);
        if (!pick) return;
        const from = pick.row;
        onUpdateFields({
            sources: sourcesForContribution(who, contributorTypeOf(from), extras, row.sources),
            source_other: String(from.source_other || ""),
            contributor_name: String(from.contributor_name || ""),
            contributor_org: String(from.contributor_org || ""),
            contributor_email: String(from.contributor_email || ""),
            contributor_phone_code: String(from.contributor_phone_code || "+92"),
            contributor_phone: String(from.contributor_phone || ""),
            contributor_public_recognition: from.contributor_public_recognition === true,
        });
    };

    const titleText = resourceName(row) || "New resource";
    const amountText = resourceAmountText(row);
    const byText = contributedByText(row);

    return (
        <details
            className="cer-rx-box"
            open={open}
            onToggle={(e) => onToggle((e.currentTarget as HTMLDetailsElement).open)}
            data-ciel-resource-entry={idx}
            data-ciel-resource-complete={stepsLeft === 0 ? "1" : undefined}
        >
            <summary className="cer-rx-summary">
                <span className="cer-rx-idx">{idx + 1}</span>
                <span className="cer-rx-title">
                    <b>{titleText}</b>{amountText ? ` · ${amountText}` : ""}
                    {byText ? <small>{byText}</small> : null}
                </span>
                <span className="cer-rx-badge">
                    <span className="cer-rx-dots" aria-hidden="true">
                        {labels.map((l, i) => <i key={i} className={clsx(!l.length && "ok")}>{i + 1}</i>)}
                    </span>
                    <span className={clsx("cer-rx-badge-text", !stepsLeft && "ok")}>
                        {stepsLeft ? `${stepsLeft} step${stepsLeft === 1 ? "" : "s"} to finish` : "✓ Complete"}
                    </span>
                </span>
                <button
                    type="button"
                    className="cer-rx-del"
                    title="Remove this resource"
                    aria-label={`Remove resource ${idx + 1}`}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (filled && !window.confirm("Remove this resource together with its contributor and proof?")) return;
                        onRemove();
                    }}
                >
                    🗑
                </button>
            </summary>

            <div className="cer-rx-body">
                {/* 1 · The resource */}
                <section className="cer-rx-step" data-ciel-resource-step="1">
                    <StepHead n={1} title="The resource" labels={labels[0]} />
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label className={fieldLabel}>What was it?<Star /></Label>
                            <Select value={res.type || ""} onChange={(v) => {
                                const patch: Record<string, unknown> = { type: v };
                                if (!isCustomOption(v, ["Other / Custom", "Other (Specify)"])) patch.type_other = "";
                                if (v === "Cash / Funding" && !String(res.unit || "").trim()) patch.unit = "PKR";
                                onUpdateFields(patch);
                            }}>
                                <option value="">Choose…</option>
                                {res.type && !resourceTypes.includes(res.type) ? <option value={res.type}>{res.type}</option> : null}
                                {resourceTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                            </Select>
                            {isCustomOption(res.type, ["Other / Custom", "Other (Specify)"]) ? (
                                <Input placeholder="Describe it" aria-label="Describe the resource" value={res.type_other || ""} onChange={e => onUpdate("type_other", e.target.value)} className={inputClasses} />
                            ) : null}
                            <FieldError message={getFieldError(`resources.${idx}.type`)} />
                            <FieldError message={getFieldError(`resources.${idx}.type_other`)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className={fieldLabel}>How much?<Star /></Label>
                            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-2">
                                <Input inputMode="decimal" placeholder="e.g. 8000" autoComplete="off" value={res.amount} onChange={e => onUpdate("amount", e.target.value)} className={inputClasses} aria-label="Amount or quantity" />
                                <Select ariaLabel="Unit" value={res.unit || ""} onChange={(v) => onUpdateFields({ unit: v, unit_other: isCustomOption(v, ["Other…", "Other (Specify)"]) ? String(res.unit_other || "") : "" })}>
                                    <option value="">Unit…</option>
                                    {unitGroups.map(([group, units]) => (
                                        <optgroup key={group} label={group}>
                                            {units.map((u) => <option key={u} value={u}>{u}</option>)}
                                        </optgroup>
                                    ))}
                                    {res.unit && !groupedUnits.includes(res.unit) ? <option value={res.unit}>{res.unit}</option> : null}
                                </Select>
                            </div>
                            {isCustomOption(res.unit, ["Other…", "Other (Specify)"]) ? (
                                <Input placeholder="Name the unit" aria-label="Name the unit" value={res.unit_other || ""} onChange={e => onUpdate("unit_other", e.target.value)} className={inputClasses} />
                            ) : null}
                            <FieldError message={getFieldError(`resources.${idx}.amount`)} />
                            <FieldError message={getFieldError(`resources.${idx}.unit`)} />
                            <FieldError message={getFieldError(`resources.${idx}.unit_other`)} />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className={fieldLabel}>What did it make possible?<Star /></Label>
                        <Input placeholder="One line — e.g. bought paint and furniture for both classrooms" autoComplete="off" value={res.purpose} onChange={e => onUpdate("purpose", e.target.value)} className={inputClasses} />
                        <FieldError message={getFieldError(`resources.${idx}.purpose`)} />
                    </div>
                </section>

                {/* 2 · Who contributed it? */}
                <section className="cer-rx-step" data-ciel-resource-step="2">
                    <StepHead n={2} title="Who contributed it?" labels={labels[1]} />
                    <div className="cer-rx-who" role="radiogroup" aria-label="Who contributed this resource">
                        {([
                            ["team", "🎓", "Our student team", "We paid for it or brought it ourselves"],
                            ["outside", "🤝", "Someone outside the team", "A person, shop, NGO, sponsor or office"],
                            ["both", "➗", "Both shared it", "The team and someone outside"],
                        ] as Array<[ResourceContributedBy, string, string, string]>).map(([key, icon, title, sub]) => (
                            <button
                                key={key}
                                type="button"
                                role="radio"
                                aria-checked={who === key}
                                data-ciel-contributed-by={key}
                                className={clsx("cer-rx-choice", who === key && "on")}
                                onClick={() => setWho(key)}
                            >
                                <span aria-hidden="true">{icon}</span>
                                <b>{title}</b>
                                <small>{sub}</small>
                            </button>
                        ))}
                    </div>
                    {!who ? (
                        <p className="cer-muted" data-ciel-contributor-state="choose-who">Choose who contributed this resource.</p>
                    ) : null}
                    <FieldError message={!external ? getFieldError(`resources.${idx}.sources`) : undefined} />
                    {who === "team" ? (
                        <div className="cer-ok" data-ciel-contributor-state="student-funded">
                            Credited to the student team — {teamNames.join(", ") || "registered team"}. Nothing more to fill in this step.
                        </div>
                    ) : null}
                    {external ? (
                        <div className="cer-rx-contributor space-y-3" data-ciel-contributor-state="outside">
                            <p className="cer-hint">
                                CIEL PK emails them a thank-you with a summary of what they gave, once the report is approved.
                                {/Fundraising|Crowdfunding/.test(type) ? " For a collection from many people, enter the organiser." : ""}
                                {" "}e.g. 50 notebooks (or PKR 5,000 cash) · contributed by a local bookshop · delivered to Class 4.
                            </p>
                            {mixed ? (
                                <div className="grid grid-cols-1 gap-4 rounded-xl border border-[#dcebee] bg-[#f5fbfa] p-3 md:grid-cols-2" data-ciel-resource-shares={idx}>
                                    <div className="space-y-1.5">
                                        <Label className={fieldLabel}>Student team’s own share · {unit || "resource unit"}<Star /></Label>
                                        <Input inputMode="decimal" placeholder="e.g. 2000" value={res.student_team_share ?? ""} onChange={e => onUpdate("student_team_share", e.target.value)} className={inputClasses} aria-label="Student team’s share" />
                                        <FieldError message={err("student_team_share")} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className={fieldLabel}>Contributor’s share</Label>
                                        <p className={clsx("cer-rx-share", shareReconciles && "ok")} data-ciel-share-reconcile={shareReconciles ? "ok" : "pending"}>{shareLine}</p>
                                    </div>
                                </div>
                            ) : null}
                            {!named && reusable.length ? (
                                <div className="space-y-1.5">
                                    <Label className={fieldLabel}>Someone you already entered in another box?</Label>
                                    <Select value="" onChange={reuse}>
                                        <option value="">No — a new contributor</option>
                                        {reusable.map((r) => <option key={r.key} value={r.key}>Yes — {r.label}</option>)}
                                    </Select>
                                </div>
                            ) : null}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label className={fieldLabel}>Who are they?<Star /></Label>
                                    <Select value={type} onChange={setType}>
                                        <option value="">Choose…</option>
                                        {CONTRIBUTOR_TYPE_GROUPS.map(([group, types]) => (
                                            <optgroup key={group} label={group}>
                                                {types.map((t) => <option key={t} value={t}>{t}</option>)}
                                            </optgroup>
                                        ))}
                                        {type && !CONTRIBUTOR_TYPE_GROUPS.some(([, types]) => types.includes(type)) ? <option value={type}>{type}</option> : null}
                                    </Select>
                                    {type === OTHER_CONTRIBUTOR_TYPE ? (
                                        <Input placeholder="Describe them" aria-label="Describe the contributor" value={res.source_other || ""} onChange={e => onUpdate("source_other", e.target.value)} className={inputClasses} />
                                    ) : null}
                                    <FieldError message={getFieldError(`resources.${idx}.sources`)} />
                                    <FieldError message={err("source_other")} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className={fieldLabel}>{orgKind ? "Contact person’s full name" : "Full name"}<Star /></Label>
                                    <Input placeholder="Full name" autoComplete="off" value={res.contributor_name || ""} onChange={e => onUpdate("contributor_name", e.target.value)} className={inputClasses} />
                                    <FieldError message={err("contributor_name")} />
                                </div>
                            </div>
                            {showOrg ? (
                                <div className="space-y-1.5">
                                    <Label className={fieldLabel}>{mustOrg ? "Organization name" : "Organization or business"}{mustOrg ? <Star /> : <Optional />}</Label>
                                    <Input placeholder={mustOrg ? "e.g. the company, NGO or department" : "Only if they gave on behalf of one"} autoComplete="off" value={res.contributor_org || ""} onChange={e => onUpdate("contributor_org", e.target.value)} className={inputClasses} />
                                    <FieldError message={err("contributor_org")} />
                                </div>
                            ) : null}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label className={fieldLabel}>WhatsApp number<Star /></Label>
                                    <PhoneConnectivityRow
                                        usePortalCountryPicker
                                        phoneCountryKey={phone.phoneCountryKey}
                                        nationalDigits={phone.national}
                                        onPhoneCountryKeyChange={(key) =>
                                            onUpdateFields({
                                                contributor_phone_code: dialFromPhoneCountryKey(key),
                                                contributor_phone: normalizeNationalPhoneInput(key, phone.national),
                                            })
                                        }
                                        onNationalDigitsChange={(digits) =>
                                            onUpdateFields({
                                                contributor_phone_code: dialFromPhoneCountryKey(phone.phoneCountryKey),
                                                contributor_phone: normalizeNationalPhoneInput(phone.phoneCountryKey, digits),
                                            })
                                        }
                                        maxNationalDigits={14}
                                        placeholderNational={phone.phoneCountryKey.startsWith("PK|") ? "300 1234567" : "Mobile number"}
                                        selectClassName="h-11 min-w-[7.5rem] rounded-lg border-slate-200 text-xs shadow-sm focus-visible:border-[var(--teal)] focus-visible:ring-2 focus-visible:ring-[var(--teal-soft)]"
                                        inputClassName="h-11 rounded-lg border-slate-200 text-sm shadow-sm focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)]"
                                        rowClassName="items-stretch gap-2"
                                    />
                                    <p className={clsx("cer-rx-wa-msg", phoneOk && "good", phoneMessage && "bad")} aria-live="polite" data-ciel-whatsapp-state={phoneOk ? "ok" : phoneMessage ? "bad" : "empty"}>
                                        {phoneOk
                                            ? `✓ WhatsApp ${dialFromPhoneCountryKey(phone.phoneCountryKey)} ${phone.national}`
                                            : phoneMessage || "Country code, then the mobile number without the first 0."}
                                    </p>
                                    <FieldError message={err("contributor_phone")} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className={fieldLabel}>Email<Star /></Label>
                                    <Input type="email" placeholder="name@example.org" autoComplete="off" value={res.contributor_email || ""} onChange={e => onUpdate("contributor_email", e.target.value)} className={inputClasses} />
                                    <FieldError message={err("contributor_email")} />
                                </div>
                            </div>
                            {unit && !isCashResource(row) ? (
                                <details className="rounded-xl border border-[#dcebee] bg-[#f5fbfa] px-3 py-2" data-ciel-resource-value={idx}>
                                    <summary className="cursor-pointer text-[12px] font-semibold text-[#0e7d74]">
                                        {String(res.contributor_value_pkr ?? "").trim()
                                            ? `Estimated value · PKR ${String(res.contributor_value_pkr).trim()}${String(res.contributor_value_basis ?? "").trim() ? ` (${String(res.contributor_value_basis).trim()})` : ""}`
                                            : "Add an estimated PKR value (optional)"}
                                    </summary>
                                    <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label className={fieldLabel}>Estimated value · PKR</Label>
                                            <Input inputMode="decimal" placeholder="e.g. 8000" value={res.contributor_value_pkr ?? ""} onChange={e => onUpdate("contributor_value_pkr", e.target.value)} className={inputClasses} />
                                            <FieldError message={err("contributor_value_pkr")} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className={fieldLabel}>How was it valued?</Label>
                                            <Input placeholder="Invoice / quotation / market rate" value={res.contributor_value_basis ?? ""} onChange={e => onUpdate("contributor_value_basis", e.target.value)} className={inputClasses} />
                                            <FieldError message={err("contributor_value_basis")} />
                                        </div>
                                    </div>
                                </details>
                            ) : null}
                            {extras.length ? (
                                <p className="cer-hint">
                                    Also recorded as a source earlier:{" "}
                                    {extras.map((s) => (
                                        <span key={s} className="cer-pill mr-1">
                                            {s}{" "}
                                            <button type="button" className="font-extrabold" aria-label={`Remove ${s}`} onClick={() => dropExtra(s)}>✕</button>
                                        </span>
                                    ))}
                                </p>
                            ) : null}
                            <label className="cer-rx-check">
                                <input
                                    type="checkbox"
                                    checked={res.contributor_public_recognition === true}
                                    onChange={(e) => onUpdate("contributor_public_recognition", e.target.checked)}
                                />
                                <span>They agreed to be named publicly. Their WhatsApp number and email always stay private.</span>
                            </label>
                            <p className="cer-hint">A second outside contributor to the same resource gets its own box, so each one receives their own thank-you.</p>
                        </div>
                    ) : null}
                </section>

                {/* 3 · Proof */}
                <section className="cer-rx-step" data-ciel-resource-step="3" data-ciel-resource-proof={idx}>
                    <StepHead n={3} title="Proof" labels={labels[2]} />
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label className={fieldLabel}>Upload a receipt, photo or letter<Star /></Label>
                            <input
                                type="file"
                                multiple
                                accept={REPORT_ATTACHMENT_ACCEPT}
                                aria-label="Upload proof of this resource"
                                className="block h-11 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-600 file:mr-3 file:rounded-md file:border file:border-slate-200 file:bg-white file:px-3 file:py-1 file:text-xs file:font-semibold file:text-slate-700"
                                onChange={(e) => {
                                    if (!e.target.files) return;
                                    onAddProofs(Array.from(e.target.files), e.currentTarget);
                                    e.currentTarget.value = "";
                                }}
                            />
                            <p className="cer-hint">Evidence for each contribution travels with this box to Section 7 (Evidence). Max {MAX_RESOURCE_PROOF_LABEL} per file.</p>
                            <FieldError message={err("proof")} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className={fieldLabel}>What kind of proof is it?<Star /></Label>
                            <Select value={proofKind} onChange={setProofKind}>
                                <option value="">Choose…</option>
                                {proofKind && !verificationOptions.includes(proofKind) ? <option value={proofKind}>{proofKind}</option> : null}
                                {verificationOptions.map((v) => <option key={v} value={v}>{v}</option>)}
                            </Select>
                            {proofKind === OTHER_VERIFICATION ? (
                                <Input placeholder="Describe the proof" aria-label="Describe the proof" value={res.verification_other || ""} onChange={e => onUpdate("verification_other", e.target.value)} className={inputClasses} />
                            ) : null}
                            {kinds.length > 1 ? <p className="cer-hint">Also recorded earlier: {kinds.slice(1).join(", ")}. Choosing again keeps one kind of proof.</p> : null}
                            <FieldError message={getFieldError(`resources.${idx}.verification`)} />
                        </div>
                    </div>
                    <ProofList proofs={proofs} onPreview={onPreview} onRemove={onRemoveProof} onNote={onProofNote} />
                    <div className="space-y-1.5">
                        <Label className={fieldLabel}>What does this proof show?{external ? <Star /> : <Optional />}</Label>
                        <textarea
                            rows={2}
                            placeholder="Where it came from, how it was used, who received it — e.g. bank transfer receipt from the donor, purchase receipts, photos of the handover"
                            value={res.evidence_trail || ""}
                            onChange={e => onUpdate("evidence_trail", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)]"
                        />
                        <FieldError message={err("evidence_trail")} />
                    </div>
                </section>
            </div>
        </details>
    );
}

export default function Section6Resources({ projectData }: { projectData?: any } = {}) {
    const { data, updateSection, getFieldError } = useReportForm();
    const { section1, section6 } = data;
    const { use_resources } = section6;
    const resources = Array.isArray(section6.resources) ? section6.resources : [];
    const evidenceFiles: ProofFile[] = Array.isArray(section6.evidence_files) ? (section6.evidence_files as ProofFile[]) : [];

    const [previewFile, setPreviewFile] = useState<any>(null);
    const [previewGroup, setPreviewGroup] = useState<ContributorGroup | null>(null);
    // Which boxes are unfolded. A box the student has not seen yet opens only while it still needs something.
    const [openBoxes, setOpenBoxes] = useState<number[]>([]);
    const seenBoxes = useRef<Set<number>>(new Set());

    const update = (field: string, val: any) => updateSection("section6", { [field]: val });

    const proofsFor = (idx: number) =>
        evidenceFiles.map((file, index) => ({ file, index })).filter(({ file }) => proofEntryIndex(file) === idx);
    const unlinkedProofs = evidenceFiles.map((file, index) => ({ file, index })).filter(({ file }) => proofEntryIndex(file) === null);
    // Files saved before proofs were linked to boxes still count as proof until they are linked or removed.
    const proofCountFor = (idx: number) => proofsFor(idx).length || (unlinkedProofs.length ? 1 : 0);
    const boxIncomplete = (idx: number) => resourceBoxChecks(resources[idx] as ResourceRow, proofCountFor(idx)).length > 0;

    useEffect(() => {
        const fresh = resources.map((_, idx) => idx).filter((idx) => !seenBoxes.current.has(idx));
        if (!fresh.length) return;
        fresh.forEach((idx) => seenBoxes.current.add(idx));
        const toOpen = fresh.filter(boxIncomplete);
        if (toOpen.length) setOpenBoxes((prev) => [...new Set([...prev, ...toOpen])]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resources.length]);

    /** 5.1: choosing "We used resources" opens the first box straight away (nothing to hunt for). */
    const setPathway = (value: "yes" | "no") => {
        const patch: Record<string, unknown> = { use_resources: value };
        if (value === "yes" && resources.length === 0) patch.resources = [emptyResource()];
        updateSection("section6", patch);
    };

    const addResource = () => {
        const next = resources.length;
        // Finished boxes fold away so the new one has the student's full attention.
        setOpenBoxes((prev) => [...prev.filter((idx) => idx < resources.length && boxIncomplete(idx)), next]);
        seenBoxes.current.add(next);
        update("resources", [...resources, emptyResource()]);
        window.setTimeout(() => document.querySelector(`[data-ciel-resource-entry="${next}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 60);
    };
    const removeResource = (i: number) => {
        // Proofs follow their entry: drop the removed entry's files, shift the links of later entries.
        const keptFiles = evidenceFiles
            .filter((file) => proofEntryIndex(file) !== i)
            .map((file) => {
                const at = proofEntryIndex(file);
                return at !== null && at > i ? { ...(file as ReportResourceProofFile), resource_index: at - 1 } : file;
            });
        setOpenBoxes((prev) => prev.filter((idx) => idx !== i).map((idx) => (idx > i ? idx - 1 : idx)));
        seenBoxes.current = new Set([...seenBoxes.current].filter((idx) => idx !== i).map((idx) => (idx > i ? idx - 1 : idx)));
        updateSection("section6", { resources: resources.filter((_, idx) => idx !== i), evidence_files: keptFiles });
    };
    const updateResource = (i: number, field: string, val: any) => {
        const next = [...resources];
        next[i] = { ...next[i], [field]: val };
        update("resources", next);
    };
    const updateResourceFields = (i: number, fields: Record<string, any>) => {
        const next = [...resources];
        next[i] = { ...next[i], ...fields };
        update("resources", next);
    };
    const toggleBox = (i: number, open: boolean) =>
        setOpenBoxes((prev) => (open ? (prev.includes(i) ? prev : [...prev, i]) : prev.filter((idx) => idx !== i)));

    const addProofs = (idx: number, picked: File[], input: HTMLInputElement) => {
        const accepted = filterOversizedProofs(picked, input);
        if (!accepted.length) return;
        update("evidence_files", [...evidenceFiles, ...accepted.map((file) => toProofRecord(file, idx))]);
    };
    const removeProof = (fileIndex: number) => update("evidence_files", evidenceFiles.filter((_, i) => i !== fileIndex));
    const setProofNote = (fileIndex: number, note: string) =>
        update(
            "evidence_files",
            evidenceFiles.map((file, i) => {
                if (i !== fileIndex) return file;
                if (isNativeFile(file)) {
                    return { file, name: file.name, size: file.size, type: file.type, lastModified: file.lastModified, note } satisfies ReportResourceProofFile;
                }
                return { ...(file as ReportResourceProofFile), note };
            }),
        );
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
    const typed = resources.filter((r) => resourceName(r as ResourceRow));
    const typeCounts = useMemo(() => {
        const counts = new Map<string, number>();
        typed.forEach((r) => counts.set(resourceName(r as ResourceRow), (counts.get(resourceName(r as ResourceRow)) || 0) + 1));
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

    const teamNames = useMemo(() => {
        const lead = String(section1.team_lead?.name || "").trim();
        const members = (Array.isArray(section1.team_members) ? section1.team_members : []).map((m: any) => String(m?.name || "").trim());
        return [lead, ...members].filter(Boolean);
    }, [section1.team_lead?.name, section1.team_members]);

    // ----- cash, contributors and the team's own part -----
    const cashByCurrency = useMemo(() => {
        const totals: Record<string, number> = {};
        resources.forEach((r) => {
            const unit = String(r.unit || "").trim();
            if (!(CASH_UNITS as readonly string[]).includes(unit)) return;
            const amt = resourceAmountNumber(r.amount);
            if (!amt) return;
            totals[unit] = (totals[unit] || 0) + amt;
        });
        return totals;
    }, [resources]);
    const activeResources = useMemo(() => (use_resources === "yes" ? (resources as ResourceRow[]) : []), [use_resources, resources]);
    const contributors = useMemo(
        () => groupContributors(activeResources, proofCountFor),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [activeResources, section6.evidence_files],
    );
    const teamLines = useMemo(() => teamContributionLines(activeResources), [activeResources]);
    const stage = reportStage(data);
    const reusableFor = (idx: number): ReusableContributor[] => {
        const seen = new Set<string>();
        return resources.flatMap((row, i) => {
            if (i === idx || !isOutsideContribution(row) || !contributorIsNamed(row)) return [];
            const key = contributorIdentity(row) || `row|${i}`;
            if (seen.has(key)) return [];
            seen.add(key);
            const name = String(row.contributor_name || "").trim() || String(row.contributor_org || "").trim();
            return [{ key, label: `${name}${row.contributor_email ? ` · ${row.contributor_email}` : ""}`, row: row as ResourceRow }];
        });
    };

    const thankYouCtx: ThankYouContext = {
        projectTitle: String(projectData?.title || data.project_title || "Community Service project").trim(),
        projectCode: String(data.project_id || data.public_id || projectData?.id || "").trim() || "pending",
        partnerName: String(projectData?.organization_name || projectData?.partner_name || projectData?.organization || "").trim() || undefined,
        university: String(section1.team_lead?.university || "").trim() || undefined,
        location: String(projectData?.location || projectData?.city || "").trim() || undefined,
        teamNames,
    };

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
            const row = r as ResourceRow;
            const amt = resourceAmountNumber(r.amount);
            const unit = resourceUnit(row);
            const sources = (r.sources || []).map((s: string) => (isCustomOption(s, ["Other / Custom Source", "Other (Specify)"]) ? String(r.source_other || s) : s)).filter(Boolean);
            const verification = verificationList(row).map((v) => (v === OTHER_VERIFICATION ? String(r.verification_other || v) : v));
            const external = isOutsideContribution(row);
            const mixed = isMixedResourceSource(r.sources || []);
            const who = resourceContributedBy(row);
            const shareNote = mixed
                ? ` · Student team share: ${resourceAmountNumber(r.student_team_share) !== null ? fmtAmount(resourceAmountNumber(r.student_team_share) as number) : "not recorded"} ${unit || ""}`.trimEnd()
                    + ` · Contributor share: ${contributorShareOf(r) !== null ? fmtAmount(contributorShareOf(r) as number) : "pending"} ${unit || ""}`.trimEnd()
                : "";
            const contributor = external
                ? `${shareNote} · Contributor: ${String(r.contributor_name || "").trim() || "name pending"}${String(r.contributor_org || "").trim() ? ` of ${String(r.contributor_org).trim()}` : ""}${String(r.contributor_email || "").trim() ? ` (${String(r.contributor_email).trim()})` : ""}`
                : "";
            lines.push([
                `Resource ${idx + 1}: ${resourceName(row) || "Unspecified"}`,
                `${amt !== null ? fmtAmount(amt) : "Amount missing"} ${unit || "unit missing"} · Enabled: ${String(r.purpose || "").trim() || "not supplied"} · Contributed by: ${who === "team" ? "student team" : who === "outside" ? "outside contributor" : who === "both" ? "student team + outside contributor" : "not chosen"} · Source: ${sources.join("; ") || "not supplied"} · Verification method: ${verification.join("; ") || "not supplied"} · ${proofsFor(idx).length} supporting file(s)${contributor}.`,
            ]);
        });
        if (contributors.length) {
            lines.push(["Who gave what", contributors.map((g) => `${g.display}${g.kind === "organization" && g.name ? ` (contact: ${g.name})` : g.kind === "individual" && g.org ? ` (${g.org})` : ""} — ${contributorGaveText(g)}`).join("; ")]);
        }
        if (teamLines.length) lines.push(["Student team’s own contribution", teamLines.join("; ")]);
        const note = recognitionNote(contributors.length, stage);
        lines.push([
            "Cash in PKR and contributors",
            `PKR ${fmtAmount(cashByCurrency.PKR || 0)} recorded cash (other currencies and in-kind quantities kept separate); ${contributors.length} outside contributor(s).${note ? ` ${note}` : ""}`,
        ]);
        return lines;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [use_resources, section6.resources, section6.evidence_files, cashByCurrency, contributors, teamLines, verifiedHoursSnapshot, stage]);
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
    const showRollup = use_resources === "yes" && (contributors.length > 0 || teamLines.length > 0);

    return (
        <div className="mx-auto max-w-6xl space-y-3 pb-10" data-ciel-section5-v21>
            {/* Header */}
            <div className="cer-dup-head space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Section 5 of 11 — Resources</p>
                <h1 className="pt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">What the project ran on 📦</h1>
                <p className="text-sm text-slate-500">
                    One box per resource, three short steps in each box. 1 · The resource: what it was, how much, and what it made possible.
                    2 · Who contributed it: your team, someone outside, or both — for an outside contributor add their name, WhatsApp number and email.
                    3 · Proof: upload a receipt, photo or letter and say what kind it is.
                </p>
            </div>

            {/* One box per resource */}
            <div className="cer-cr-intro" data-ciel-resource-intro>
                <b>One box per resource.</b> In each box, three short steps: <b>1</b> the resource · <b>2</b> who contributed it · <b>3</b> proof. Add another box for each further resource.
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
                    {/* What your project ran on — fills itself from the boxes */}
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
                                <p>Add a resource and this chart fills itself.</p>
                            )}
                            <p>Each box needs who contributed it and one proof — that is what the rubric reads.</p>
                        </div>
                    </div>

                    {/* 5.2 Your resources — one box each */}
                    <section className="cer-card space-y-4" data-ciel-resource-boxes>
                        <div className="cer-secl">
                            <span className="cer-secn">5.2</span>
                            <h2>Your resources</h2>
                            {sectionTag("One box each")}
                        </div>
                        <FieldError message={getFieldError("resources")} />
                        <div className="space-y-3">
                            {resources.map((res, idx) => (
                                <ResourceBox
                                    key={idx}
                                    res={res}
                                    idx={idx}
                                    open={openBoxes.includes(idx)}
                                    onToggle={(open) => toggleBox(idx, open)}
                                    onUpdate={(field, val) => updateResource(idx, field, val)}
                                    onUpdateFields={(fields) => updateResourceFields(idx, fields)}
                                    onRemove={() => removeResource(idx)}
                                    getFieldError={getFieldError}
                                    proofs={proofsFor(idx)}
                                    onAddProofs={(files, input) => addProofs(idx, files, input)}
                                    onRemoveProof={removeProof}
                                    onProofNote={setProofNote}
                                    onPreview={setPreviewFile}
                                    teamNames={teamNames}
                                    reusable={reusableFor(idx)}
                                />
                            ))}
                            <button type="button" onClick={addResource} className="cer-addbig flex items-center justify-center gap-1.5">
                                <Plus className="h-4 w-4" />
                                {resources.length ? "Add another resource" : "Add a resource"}
                            </button>
                        </div>
                        {unlinkedProofs.length ? (
                            <div className="cer-proof space-y-2" data-ciel-unlinked-proofs>
                                <p className="text-[12px] font-extrabold text-[var(--ink)]">Proof already on file · not linked to a box yet</p>
                                <p className="cer-hint">These files were uploaded before proofs were linked to boxes. Link each one to the resource it supports, or remove it.</p>
                                <div className="space-y-2">
                                    {unlinkedProofs.map(({ file, index }) => (
                                        <div key={index} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                                            <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setPreviewFile(file)}>
                                                <FilePreview file={file} />
                                                <span className="truncate text-sm font-medium text-slate-700">📎 {proofName(file)}</span>
                                            </button>
                                            <select className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700" value="" onChange={(e) => { if (e.target.value !== "") linkProof(index, Number(e.target.value)); }}>
                                                <option value="">Link to entry…</option>
                                                {resources.map((r, i) => <option key={i} value={i}>{i + 1} · {resourceName(r as ResourceRow) || "Resource"}</option>)}
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

                    {/* 5.3 Who gave what — built from the boxes; nothing to fill in */}
                    {showRollup ? (
                        <section className="cer-card space-y-3" data-ciel-contributor-register>
                            <div className="cer-secl">
                                <span className="cer-secn">5.3</span>
                                <h2>Who gave what</h2>
                                {sectionTag("Automatic", true)}
                            </div>
                            <p className="cer-hint">Built from your boxes above — nothing to fill in here. Each outside contributor receives their line by email after CIEL PK Admin approves the report.</p>
                            {contributors.length ? (
                                <div className="overflow-x-auto">
                                    <table className="cer-cr-table" data-ciel-who-gave-what>
                                        <thead><tr><th>Contributor</th><th>WhatsApp · Email</th><th>What they contributed</th><th>Thank-you email</th></tr></thead>
                                        <tbody>
                                            {contributors.map((g) => {
                                                const [label, tone] = contributorStage(g, stage);
                                                return (
                                                    <tr key={g.key}>
                                                        <td>
                                                            <b>{g.display}</b>
                                                            {g.kind === "organization" ? <><br /><span className="cer-hint">Contact: {g.name || "name pending"}</span></> : g.org ? <><br /><span className="cer-hint">{g.org}</span></> : null}
                                                        </td>
                                                        <td><span className="whitespace-nowrap">{g.phone || "WhatsApp pending"}</span><br /><span className="cer-hint">{g.email || "Email pending"}</span></td>
                                                        <td>
                                                            {g.items.map((q) => (
                                                                <div key={q.index}>
                                                                    {(q.share ?? 0) > 0
                                                                        ? <>{shareText(q.row, q.share)}{q.enabled ? <><br /><span className="cer-hint">→ {q.enabled}</span></> : null}</>
                                                                        : <span className="cer-hint">{resourceName(q.row) || "Resource"} · amount pending</span>}
                                                                </div>
                                                            ))}
                                                        </td>
                                                        <td>
                                                            <span className={clsx("cer-pill", `cer-pill-${tone}`)}>{label}</span><br />
                                                            <button type="button" className="cer-rx-button mt-1.5" disabled={!g.previewReady} onClick={() => setPreviewGroup(g)}>Preview thank-you email</button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : null}
                            {teamLines.length ? (
                                <div className="cer-ok" data-ciel-team-contribution>
                                    <b>Student team’s own contribution</b>
                                    {teamLines.map((line) => <div key={line}>{line}</div>)}
                                </div>
                            ) : null}
                            <details className="cer-rx-why">
                                <summary>What happens after you submit?</summary>
                                <ThankYouFlowStrip stage={stage} />
                                <p className="cer-hint">
                                    Resource and contributor entries save with your draft. WhatsApp numbers and emails are used only by authorized CIEL PK reviewers and to contact the contributor; they never appear on public summaries. This page cannot send email — CIEL PK’s server sends it after Admin approval.
                                </p>
                            </details>
                        </section>
                    ) : null}
                </>
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

            <ContributorThankYouPreview group={previewGroup} ctx={thankYouCtx} stage={stage} onClose={() => setPreviewGroup(null)} />
        </div>
    );
}
