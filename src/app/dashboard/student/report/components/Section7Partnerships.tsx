import {
    Handshake, Plus, Trash2, ShieldCheck, Info,
    Users2, CheckCircle2, Activity, Globe, ChevronDown, Upload,
} from "lucide-react";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import React, { useMemo, useEffect } from "react";
import clsx from "clsx";
import { toast } from "sonner";
import { MAX_REPORT_UPLOAD_LABEL, splitReportFilesByImageSize } from "../utils/fileUploadLimits";
import { REPORT_ATTACHMENT_ACCEPT } from "@/utils/reportAttachmentAccept";

const partnerTypes = [
    "NGO",
    "School / University",
    "Government Department",
    "Private Company",
    "Public Limited Company",
    "Community Group",
    "Non-profit Organization / Charity",
    "Social Enterprise",
    "Local Business / Small Enterprise",
    "Hospital / Healthcare Organization",
    "Religious Organization (Mosque, Church, Temple etc.)",
    "International Organization (UN agencies, INGOs etc.)",
    "Volunteer Network",
    "Environmental Organization",
    "Youth Organization",
    "Local Council / Municipal Authority",
    "Foundation / Trust",
    "Research Institute / Think Tank",
    "Others (please specify)",
];

function filterOversizedImages(files: File[], input: HTMLInputElement): File[] {
    const { accepted, rejected } = splitReportFilesByImageSize(files);
    if (rejected.length > 0) {
        toast.error(`Each file must be ${MAX_REPORT_UPLOAD_LABEL} or smaller: ${rejected.map((file) => file.name).join(", ")}`);
        input.value = "";
    }
    return accepted;
}

const roleOptions = [
    "Project Host",
    "Venue Provider",
    "Technical Support",
    "Funding Partner",
    "Beneficiary Coordinator",
    "Implementation Partner",
    "Verification Authority",
    "Content / Expert Support",
    "Policy / Advisory Support",
];

const contributionOptions = [
    "Financial Support",
    "In-kind Materials",
    "Human Resources",
    "Venue / Infrastructure",
    "Equipment / Technical Support",
    "Access to Beneficiaries",
    "Data / Research Support",
    "Monitoring & Verification",
    "Other",
];

const verificationOptions = [
    "Attendance Verified",
    "Activity Verified",
    "Output Verified",
    "Outcome Verified",
    "Resource Support Verified",
    "Self-Reported (No External Confirmation)",
];

const formalizationOptions = [
    "Memorandum of Understanding (MOU)",
    "Letter of Collaboration",
    "Official Email Confirmation",
    "Government Approval / Notification",
    "None of the above",
];

const inputClasses =
    "h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100";
const selectClasses =
    "h-11 w-full min-w-0 appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm font-medium text-slate-800 shadow-sm outline-none transition-colors focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100";
const textareaClasses =
    "min-h-[96px] w-full min-w-0 resize-y rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium leading-relaxed text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100";
const fieldLabel =
    "text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500";

function classifyEngagement(partnerCount: number, verifiedCount: number, formalCount: number): {
    label: string; color: string; desc: string;
} {
    if (partnerCount === 0) {
        return {
            label: "No engagement",
            color: "border-slate-200 bg-slate-50 text-slate-700",
            desc: "No active partners recorded.",
        };
    }
    if (partnerCount >= 3 && formalCount >= 1 && verifiedCount >= 2) {
        return {
            label: "Strategic Partnership",
            color: "border-indigo-200 bg-indigo-50 text-indigo-800",
            desc: "Multi-sector collaboration, formalized, high verification",
        };
    }
    if (partnerCount >= 2 || verifiedCount >= 2) {
        return {
            label: "Collaborative Engagement",
            color: "border-blue-200 bg-blue-50 text-blue-800",
            desc: "Multiple partners, shared roles, verified outputs",
        };
    }
    return {
        label: "Basic Engagement",
        color: "border-slate-200 bg-slate-50 text-slate-700",
        desc: "One partner, limited role, low verification",
    };
}

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
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {options.map((opt) => {
                const active = selected.includes(opt);
                return (
                    <button
                        key={opt}
                        type="button"
                        onClick={() => onToggle(opt)}
                        className={clsx(
                            "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-xs font-medium transition-colors",
                            active
                                ? "border-indigo-200 bg-indigo-50 text-indigo-800"
                                : "border-slate-200 bg-white text-slate-600 hover:border-indigo-100 hover:bg-slate-50",
                        )}
                    >
                        <span
                            className={clsx(
                                "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                                active
                                    ? "border-indigo-600 bg-indigo-600 text-white"
                                    : "border-slate-300 bg-white",
                            )}
                        >
                            {active ? <CheckCircle2 className="h-3 w-3" /> : null}
                        </span>
                        {opt}
                    </button>
                );
            })}
        </div>
    );
}

function PartnerCard({
    p, idx, canRemove, onUpdate, onRemove, getFieldError,
}: {
    p: any; idx: number; canRemove: boolean;
    onUpdate: (field: string, val: any) => void;
    onRemove: () => void;
    getFieldError: (key: string) => string | undefined;
}) {
    const contribution: string[] = p.contribution || [];
    const roles: string[] = Array.isArray(p.role)
        ? p.role
        : typeof p.role === "string" && p.role
            ? [p.role]
            : [];

    const toggleContribution = (opt: string) => {
        onUpdate(
            "contribution",
            contribution.includes(opt)
                ? contribution.filter(c => c !== opt)
                : [...contribution, opt],
        );
    };

    const toggleRole = (opt: string) => {
        onUpdate(
            "role",
            roles.includes(opt)
                ? roles.filter(r => r !== opt)
                : [...roles, opt],
        );
    };

    return (
        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                        {idx + 1}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Partner entry
                    </span>
                </div>
                {canRemove ? (
                    <button
                        type="button"
                        onClick={onRemove}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 transition-colors hover:text-red-700"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                    </button>
                ) : null}
            </div>

            <div className="space-y-1.5">
                <Label className={fieldLabel}>
                    Partner name <span className="normal-case text-red-500">· required</span>
                </Label>
                <Input
                    type="text"
                    placeholder="e.g. XYZ Welfare Trust, District Health Office…"
                    value={p.name}
                    onChange={e => onUpdate("name", e.target.value)}
                    className={inputClasses}
                />
                {p.name ? (
                    <p className="text-xs text-slate-400">Avoid abbreviations unless officially registered.</p>
                ) : null}
                <FieldError message={getFieldError(`partners.${idx}.name`)} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                    <Label className={fieldLabel}>Contact name in Pakistan</Label>
                    <Input
                        type="text"
                        placeholder="Focal person name…"
                        value={p.pakistan_contact_name ?? ""}
                        onChange={e => onUpdate("pakistan_contact_name", e.target.value)}
                        className={inputClasses}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className={fieldLabel}>Number</Label>
                    <Input
                        type="tel"
                        placeholder="+92 …"
                        value={p.pakistan_contact_number ?? ""}
                        onChange={e => onUpdate("pakistan_contact_number", e.target.value)}
                        className={inputClasses}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className={fieldLabel}>Email</Label>
                    <Input
                        type="email"
                        placeholder="Contact email…"
                        value={p.pakistan_contact_email ?? ""}
                        onChange={e => onUpdate("pakistan_contact_email", e.target.value)}
                        className={inputClasses}
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <Label className={fieldLabel}>Partner type</Label>
                <div className="relative">
                    <select
                        value={p.type}
                        onChange={e => onUpdate("type", e.target.value)}
                        className={selectClasses}
                    >
                        <option value="">Select partner type...</option>
                        {partnerTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
                {p.type === "Others (please specify)" ? (
                    <Textarea
                        placeholder="Specify partner type (100–200 words)…"
                        value={p.type_other || ""}
                        onChange={e => onUpdate("type_other", e.target.value)}
                        className={textareaClasses}
                    />
                ) : null}
                <FieldError message={getFieldError(`partners.${idx}.type`)} />
            </div>

            <div className="space-y-2">
                <Label className={fieldLabel}>Role in project</Label>
                <p className="text-xs text-slate-500">Select all that apply · at least one required</p>
                <CheckGrid options={roleOptions} selected={roles} onToggle={toggleRole} />
                <FieldError message={getFieldError(`partners.${idx}.role`)} />
            </div>

            <div className="space-y-2">
                <Label className={fieldLabel}>Contribution type</Label>
                <p className="text-xs text-slate-500">Select all that apply · at least one required</p>
                <CheckGrid options={contributionOptions} selected={contribution} onToggle={toggleContribution} />
                <FieldError message={getFieldError(`partners.${idx}.contribution`)} />
            </div>

            <div className="space-y-2">
                <Label className={fieldLabel}>Verification level</Label>
                <p className="text-xs text-slate-500">Higher verification strengthens partnership credibility.</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {verificationOptions.map(v => (
                        <button
                            key={v}
                            type="button"
                            onClick={() => onUpdate("verification", v)}
                            className={clsx(
                                "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-xs font-medium transition-colors",
                                p.verification === v
                                    ? "border-indigo-200 bg-indigo-50 text-indigo-800"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-100 hover:bg-slate-50",
                            )}
                        >
                            {p.verification === v ? (
                                <ShieldCheck className="h-4 w-4 shrink-0 text-indigo-600" />
                            ) : (
                                <span className="h-4 w-4 shrink-0 rounded-full border-2 border-slate-300" />
                            )}
                            {v}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function Section7Partnerships() {
    const { data, updateSection, getFieldError } = useReportForm();
    const { has_partners, partners, formalization_status, formalization_files } = data.section7;

    const update = (field: string, val: any) => updateSection("section7", { [field]: val });

    const addPartner = () =>
        update("partners", [...partners, {
            name: "",
            pakistan_contact_name: "",
            pakistan_contact_number: "",
            pakistan_contact_email: "",
            type: "",
            role: [],
            contribution: [],
            verification: "",
        }]);
    const removePartner = (i: number) =>
        update("partners", partners.filter((_, idx) => idx !== i));
    const updatePartner = (i: number, field: string, val: any) => {
        const next = [...partners];
        next[i] = { ...next[i], [field]: val };
        update("partners", next);
    };
    const toggleFormalization = (opt: string) => {
        const cur = formalization_status || [];
        if (opt === "None of the above") {
            update("formalization_status", cur.includes(opt) ? [] : [opt]);
        } else {
            let next = cur.includes(opt) ? cur.filter(x => x !== opt) : [...cur, opt];
            next = next.filter(x => x !== "None of the above");
            update("formalization_status", next);
        }
    };

    const activePartners = has_partners === "yes" ? partners : [];
    const govPartners = activePartners.filter(p =>
        p.type?.toLowerCase().includes("government") || p.type?.toLowerCase().includes("local council"),
    );
    const privatePartners = activePartners.filter(p =>
        p.type?.toLowerCase().includes("private")
        || p.type?.toLowerCase().includes("corporate")
        || p.type?.toLowerCase().includes("csr"),
    );
    const academicPartners = activePartners.filter(p =>
        p.type?.toLowerCase().includes("school")
        || p.type?.toLowerCase().includes("university")
        || p.type?.toLowerCase().includes("research"),
    );
    const verifiedPartners = activePartners.filter(p =>
        p.verification && !p.verification.includes("Self-Reported"),
    );
    const selfReportedPartners = activePartners.filter(p =>
        p.verification?.includes("Self-Reported"),
    );
    const formalCount = has_partners === "yes"
        ? (formalization_status?.filter(s => s !== "None of the above" && s !== "No Formal Documentation").length || 0)
        : 0;
    const classification = classifyEngagement(
        activePartners.length,
        verifiedPartners.length,
        formalCount,
    );

    const fullyVerified = verifiedPartners.filter(p =>
        p.verification?.includes("Output") || p.verification?.includes("Outcome"),
    ).length;
    const partiallyVerified = verifiedPartners.filter(p =>
        p.verification?.includes("Attendance")
        || p.verification?.includes("Activity")
        || p.verification?.includes("Resource"),
    ).length;

    const autoNarrative = useMemo(() => {
        if (has_partners === "no") return "No formal partnerships reported. Project was executed independently.";
        if (!partners.length) return "Partnership summary will appear once partner details are entered.";
        const types = [...new Set(partners.map(p => p.type).filter(Boolean))].slice(0, 2);
        return `The project engaged ${partners.length} active ${partners.length === 1 ? "partner" : "partners"}${types.length ? ` including ${types.slice(0, 2).join(" and ").toLowerCase()} ${types.length === 1 ? "organization" : "organizations"}` : ""}. ${verifiedPartners.length > 0 ? `Partnerships were verified at the ${[...new Set(verifiedPartners.map(p => p.verification))].slice(0, 2).join(" and ").toLowerCase()} level.` : ""} ${formalCount > 0 ? `${formalCount} ${formalCount === 1 ? "collaboration was" : "collaborations were"} supported by formal documentation.` : ""}`;
    }, [has_partners, partners, verifiedPartners, formalCount]);

    useEffect(() => {
        if (data.section7.summary_text !== autoNarrative) {
            updateSection("section7", { summary_text: autoNarrative });
        }
    }, [autoNarrative, data.section7.summary_text, updateSection]);

    return (
        <div className="mx-auto max-w-4xl space-y-8 pb-10">
            {/* Header */}
            <div className="space-y-5">
                <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm">
                        <Handshake className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600">
                            Measurable multi-stakeholder engagement (SDG 17)
                        </p>
                        <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                            <span className="text-indigo-600">SECTION 7:</span> Partnerships &amp; collaboration
                        </h2>
                    </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3.5 sm:px-5">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                    <div>
                        <p className="text-sm font-semibold text-indigo-900">
                            Only include partners who actively contributed
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-indigo-900/80">
                            Do not list organizations that were only informed, mentioned, or tagged.
                            Include only those who provided support, coordination, expertise, resources,
                            hosting, or verification.
                        </p>
                    </div>
                </div>
            </div>

            {/* 7.0 Confirmation */}
            <section className="space-y-4">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                        7.0
                    </span>
                    <h3 className="text-base font-semibold text-slate-900">
                        Step 1 — Partnership confirmation
                    </h3>
                </div>

                <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <Label className={fieldLabel}>
                        Did this project involve any active partners?
                    </Label>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <button
                            type="button"
                            onClick={() => update("has_partners", "no")}
                            className={clsx(
                                "rounded-xl border p-5 text-left transition-colors",
                                has_partners === "no"
                                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                            )}
                        >
                            <p className="text-sm font-semibold">No — students worked independently</p>
                            <p className={clsx(
                                "mt-1.5 text-xs leading-relaxed",
                                has_partners === "no" ? "text-slate-300" : "text-slate-500",
                            )}>
                                System records: &ldquo;No formal partnerships reported.&rdquo;
                            </p>
                        </button>

                        <button
                            type="button"
                            onClick={() => update("has_partners", "yes")}
                            className={clsx(
                                "rounded-xl border p-5 text-left transition-colors",
                                has_partners === "yes"
                                    ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40",
                            )}
                        >
                            <p className="text-sm font-semibold">
                                Yes — one or more partners were actively involved
                            </p>
                            <p className={clsx(
                                "mt-1.5 text-xs leading-relaxed",
                                has_partners === "yes" ? "text-indigo-100" : "text-slate-500",
                            )}>
                                Continue to Step 2 to enter partner details.
                            </p>
                        </button>
                    </div>

                    {has_partners === "no" ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
                            No partner details are needed — this project is recorded as independent student work.
                            You can change this anytime above.
                        </div>
                    ) : null}

                    <FieldError message={getFieldError("has_partners")} />
                </div>
            </section>

            {/* 7.1 + 7.2 when yes */}
            {has_partners === "yes" ? (
                <div className="space-y-8">
                    <section className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                                    7.1
                                </span>
                                <h3 className="text-base font-semibold text-slate-900">
                                    Step 2 — Enter partner details
                                </h3>
                            </div>
                            <Button
                                type="button"
                                onClick={addPartner}
                                className="h-10 shrink-0 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                            >
                                <Plus className="mr-1.5 h-4 w-4" />
                                Add partner
                            </Button>
                        </div>

                        {partners.length === 0 ? (
                            <div className="flex flex-col items-center justify-center space-y-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-12 text-center">
                                <Users2 className="h-10 w-10 text-slate-300" />
                                <p className="text-sm font-semibold text-slate-700">No partners added yet</p>
                                <Button
                                    type="button"
                                    onClick={addPartner}
                                    className="h-9 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800"
                                >
                                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                                    Add first partner
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {partners.map((p, idx) => (
                                    <PartnerCard
                                        key={idx}
                                        p={p}
                                        idx={idx}
                                        canRemove={partners.length > 1}
                                        onUpdate={(field, val) => updatePartner(idx, field, val)}
                                        onRemove={() => removePartner(idx)}
                                        getFieldError={getFieldError}
                                    />
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                                7.2
                            </span>
                            <h3 className="text-base font-semibold text-slate-900">
                                Step 3 — Formalization status
                            </h3>
                        </div>

                        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <div>
                                <Label className="text-sm font-medium text-slate-800">
                                    Was this partnership supported by formal documentation?
                                </Label>
                                <p className="mt-1 text-xs text-slate-500">
                                    Select all that apply. Formalized partnerships increase SDG 17 classification strength.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                {formalizationOptions.map(opt => {
                                    const active = formalization_status?.includes(opt);
                                    return (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => toggleFormalization(opt)}
                                            className={clsx(
                                                "flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors",
                                                active
                                                    ? "border-indigo-600 bg-indigo-600 text-white"
                                                    : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40",
                                            )}
                                        >
                                            <span>{opt}</span>
                                            {active ? (
                                                <ShieldCheck className="h-4 w-4 shrink-0" />
                                            ) : (
                                                <span className="h-4 w-4 shrink-0 rounded border border-slate-300" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="relative rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-5 py-8 text-center transition-colors hover:border-indigo-300 hover:bg-indigo-50/30">
                                <Upload className="mx-auto h-7 w-7 text-slate-300" />
                                <p className="mt-2 text-sm font-medium text-slate-600">
                                    Upload supporting documentation (optional)
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                    MOUs, letters of collaboration, official emails, government approvals
                                </p>
                                <input
                                    type="file"
                                    multiple
                                    accept={REPORT_ATTACHMENT_ACCEPT}
                                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                    onChange={e => {
                                        if (e.target.files) {
                                            const acceptedFiles = filterOversizedImages(
                                                Array.from(e.target.files),
                                                e.currentTarget,
                                            );
                                            if (!acceptedFiles.length) return;
                                            updateSection("section7", {
                                                formalization_files: [
                                                    ...(formalization_files || []),
                                                    ...acceptedFiles,
                                                ],
                                            });
                                        }
                                    }}
                                />
                            </div>

                            {formalization_files && formalization_files.length > 0 ? (
                                <p className="text-xs text-slate-500">
                                    {formalization_files.length} file{formalization_files.length === 1 ? "" : "s"} attached
                                </p>
                            ) : null}
                        </div>
                    </section>
                </div>
            ) : null}

            {/* 7.3 Analytics — always visible (zeros when No) */}
            <section className="space-y-4 border-t border-slate-200 pt-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                            <Activity className="h-5 w-5" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-900">
                            System-generated partnership analytics
                        </h3>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Read-only
                    </span>
                </div>

                <div className="space-y-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 sm:p-6">
                    <span className="inline-flex rounded-full border border-indigo-100 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                        Recalculates automatically as partners are added
                    </span>

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {[
                            { label: "Total active partners", val: activePartners.length },
                            { label: "Government partners", val: govPartners.length },
                            { label: "Private / CSR partners", val: privatePartners.length },
                            { label: "Academic institutions", val: academicPartners.length },
                        ].map(({ label, val }) => (
                            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                <p className="text-2xl font-semibold text-slate-900">{val}</p>
                                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                    {label}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                        {[
                            { label: "Fully verified", val: fullyVerified, color: "text-emerald-600" },
                            { label: "Partially verified", val: partiallyVerified, color: "text-blue-600" },
                            { label: "Self-reported", val: selfReportedPartners.length, color: "text-amber-600" },
                        ].map(({ label, val, color }) => (
                            <div key={label}>
                                <p className={clsx("text-xl font-semibold", color)}>{val}</p>
                                <p className="mt-0.5 text-[11px] text-slate-500">{label}</p>
                            </div>
                        ))}
                    </div>

                    <div className={clsx("flex items-center justify-between gap-4 rounded-xl border p-4", classification.color)}>
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                                SDG 17 engagement classification
                            </p>
                            <p className="mt-1 text-sm font-semibold uppercase tracking-wide">
                                {classification.label}
                            </p>
                            <p className="mt-0.5 text-xs opacity-70">{classification.desc}</p>
                        </div>
                        <Globe className="h-7 w-7 shrink-0 opacity-40" />
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                        {autoNarrative}
                    </div>
                </div>
            </section>
        </div>
    );
}
