import {
    Handshake, Plus, Trash2, ShieldCheck, Info,
    Users2, CheckCircle2, Activity, Globe, Upload, FileText,
} from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import React, { useMemo, useEffect, useRef } from "react";
import clsx from "clsx";
import { toast } from "sonner";
import { MAX_REPORT_UPLOAD_LABEL, splitReportFilesByImageSize } from "../utils/fileUploadLimits";
import { REPORT_ATTACHMENT_ACCEPT } from "@/utils/reportAttachmentAccept";
import PhoneConnectivityRow from "@/components/ui/PhoneConnectivityRow";
import { composeInternationalPhone, parsePhoneForDisplay } from "@/utils/countryCallingCodes";

const partnerTypes = [
    "👤 Individual",
    "🏪 Small shop / local business",
    "🏢 Company / corporate",
    "🤝 NGO / Nonprofit",
    "🏫 University unit",
    "🏛️ Government body",
    "🧑‍⚕️ Professional / expert",
    "🧑‍🤝‍🧑 Community representative",
    "✏️ Other",
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
    "🏫 Host site",
    "🤝 Co-delivery",
    "💵 Funding / sponsorship",
    "🧑‍🏫 Mentorship / expertise",
    "🧾 Verification & records",
    "📣 Community access",
    "✏️ Other",
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
const fieldLabel =
    "text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500";
const badgeMandatory =
    "shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700";
const badgeRequired =
    "shrink-0 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-600";
const badgeOptional =
    "shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500";

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
            color: "border-indigo-200 bg-indigo-50 text-[var(--teal)]",
            desc: "Multi-sector collaboration, formalized, high verification",
        };
    }
    if (partnerCount >= 2 || verifiedCount >= 2) {
        return {
            label: "Collaborative Engagement",
            color: "border-indigo-200 bg-indigo-50 text-[var(--aqua)]",
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
                                : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200",
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
    const isImage = file?.type?.startsWith("image/") || file?.name?.match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

    useEffect(() => {
        if (isImage) {
            if (file instanceof File || file instanceof Blob) {
                const url = URL.createObjectURL(file);
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
    const isImage = file?.type?.startsWith("image/") || file?.name?.match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

    useEffect(() => {
        if (!file) return;
        if (isImage) {
            if (file instanceof File || file instanceof Blob) {
                const url = URL.createObjectURL(file);
                setPreviewUrl(url);
                return () => URL.revokeObjectURL(url);
            } else if (typeof file === "string") {
                setPreviewUrl(file);
            } else if (file?.url) {
                setPreviewUrl(file.url);
            }
        }
    }, [file, isImage]);

    if (!file) return null;

    if (isImage && previewUrl) {
        return (
            <img src={previewUrl} alt={file?.name || "Preview"} className="max-h-[70vh] max-w-full rounded-lg object-contain" />
        );
    }

    return (
        <div className="flex flex-col items-center justify-center space-y-4 p-12 text-slate-400">
            <FileText className="h-16 w-16 text-slate-200" />
            <p className="text-sm font-semibold">Preview not available for this file type</p>
            <p className="text-xs text-slate-400">({file?.name})</p>
        </div>
    );
}

function PartnerCard({
    p, idx, canRemove, onUpdate, onUpdateFields, onRemove, getFieldError,
}: {
    p: any; idx: number; canRemove: boolean;
    onUpdate: (field: string, val: any) => void;
    onUpdateFields: (fields: Record<string, any>) => void;
    onRemove: () => void;
    getFieldError: (key: string) => string | undefined;
}) {
    const roles: string[] = Array.isArray(p.role)
        ? p.role
        : typeof p.role === "string" && p.role
            ? [p.role]
            : [];

    const toggleRole = (opt: string) => {
        onUpdate(
            "role",
            roles.includes(opt)
                ? roles.filter(r => r !== opt)
                : [...roles, opt],
        );
    };

    return (
        <div className="overflow-hidden rounded-[14px] border border-[#dcebee] bg-white">
            <div className="flex items-center gap-2 border-b border-[#dcebee] bg-[#f5fbfa] px-3.5 py-2">
                <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] bg-[#e6f6f4] text-[10px] font-extrabold text-[#0e7d74]">
                    {idx + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-[11.5px] font-extrabold text-[#0d2b33]">
                    {p.name || "Partner"}
                </span>
                {canRemove ? (
                    <button
                        type="button"
                        onClick={onRemove}
                        className="rounded-lg border border-[#f6cfd8] bg-[#fdf1f4] px-2 py-1 text-[8.5px] font-extrabold text-[#e11d48]"
                    >
                        Delete
                    </button>
                ) : null}
            </div>
            <div className="space-y-4 px-3.5 pb-3.5 pt-3">

            <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                    <Label className={fieldLabel}>Partner name</Label>
                    <span className={badgeRequired}>Required</span>
                </div>
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

            <div className="cer-pgrid">
                <div>
                    <Label className="cer-field-label">
                        Contact person
                        <span className="cer-soft-req">RECOMMENDED</span>
                    </Label>
                    <Input
                        type="text"
                        placeholder="e.g. Imran Sheikh"
                        value={p.pakistan_contact_name ?? ""}
                        onChange={e => onUpdate("pakistan_contact_name", e.target.value)}
                        className={inputClasses}
                    />
                </div>
                <div>
                    <Label className="cer-field-label">
                        WhatsApp / mobile · country code + number
                        <span className="cer-soft-opt">OPTIONAL</span>
                    </Label>
                    {(() => {
                        const parsed = parsePhoneForDisplay(p.pakistan_contact_number ?? "");
                        return (
                            <PhoneConnectivityRow
                                usePortalCountryPicker
                                phoneCountryKey={parsed.phoneCountryKey}
                                nationalDigits={parsed.national}
                                onPhoneCountryKeyChange={(key) =>
                                    onUpdate("pakistan_contact_number", composeInternationalPhone(key, parsed.national))
                                }
                                onNationalDigitsChange={(digits) =>
                                    onUpdate(
                                        "pakistan_contact_number",
                                        composeInternationalPhone(parsed.phoneCountryKey, digits),
                                    )
                                }
                                maxNationalDigits={15}
                                placeholderNational="3001234567"
                                selectClassName="h-11 min-w-[7.5rem] rounded-lg border-slate-200 text-xs shadow-sm focus-visible:border-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-100"
                                inputClassName="h-11 rounded-lg border-slate-200 text-sm shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                                rowClassName="items-stretch gap-2"
                            />
                        );
                    })()}
                </div>
                <div className="cer-full">
                    <Label className="cer-field-label">
                        Email
                        <span className="cer-soft-req">RECOMMENDED · LINKS THEIR DASHBOARD</span>
                    </Label>
                    <Input
                        type="email"
                        placeholder="name@organisation.org"
                        value={p.pakistan_contact_email ?? ""}
                        onChange={e => onUpdate("pakistan_contact_email", e.target.value)}
                        className={inputClasses}
                    />
                </div>
            </div>

            <div className="rounded-xl border border-[#c8e7dc] bg-[#eef9f4] px-3 py-2.5 text-[12.5px] leading-relaxed text-[#1e4d40]">
                A partner can be a person, a shop, a professional, an NGO, or a large organization. Email and WhatsApp stay private and are not shown on the public flash card.
            </div>

            <div className="space-y-2">
                <Label className={fieldLabel}>What kind of partner is this? <span className="ml-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide text-amber-800">Recommended</span></Label>
                <div className="flex flex-wrap gap-2">
                    {(p.type && !partnerTypes.includes(p.type) ? [p.type, ...partnerTypes] : partnerTypes).map(t => {
                        const active = p.type === t;
                        return (
                            <button
                                key={t}
                                type="button"
                                onClick={() => onUpdate("type", t)}
                                className={clsx(
                                    "rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors",
                                    active
                                        ? "border-[#e86bb5] bg-[#e86bb5] text-white"
                                        : "border-slate-200 bg-white text-slate-600 hover:border-[#e86bb5]",
                                )}
                            >
                                {t}
                            </button>
                        );
                    })}
                </div>
                {p.type === "✏️ Other" || p.type === "Others (please specify)" ? (
                    <Input
                        placeholder="Describe the partner type"
                        value={p.type_other || ""}
                        onChange={e => onUpdate("type_other", e.target.value)}
                        className={inputClasses}
                    />
                ) : null}
                <FieldError message={getFieldError(`partners.${idx}.type`)} />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                    <Label className={fieldLabel}>Designation / role</Label>
                    <Input
                        placeholder="e.g. Village Director · Shop owner · Volunteer"
                        value={p.designation || ""}
                        onChange={e => onUpdate("designation", e.target.value)}
                        className={inputClasses}
                    />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                    <Label className={fieldLabel}>Website / LinkedIn / social <span className="ml-1 text-[9px] font-extrabold tracking-wide text-slate-400">Optional</span></Label>
                    <Input
                        placeholder="https://…"
                        value={p.website || ""}
                        onChange={e => onUpdate("website", e.target.value)}
                        className={inputClasses}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label className={fieldLabel}>What role did they play? · tap all that apply <span className="text-rose-500">*</span></Label>
                <CheckGrid
                    options={[...roles.filter((role) => !roleOptions.includes(role)), ...roleOptions]}
                    selected={roles}
                    onToggle={toggleRole}
                />
                {roles.includes("✏️ Other") ? (
                    <Input
                        placeholder="What else did they do?"
                        value={p.role_other || ""}
                        onChange={e => onUpdate("role_other", e.target.value)}
                        className={inputClasses}
                    />
                ) : null}
                <FieldError message={getFieldError(`partners.${idx}.role`)} />
            </div>

            <div className="space-y-1.5">
                <Label className={fieldLabel}>What did they contribute, in one line? <span className="text-rose-500">*</span></Label>
                <Input
                    placeholder="e.g. gave us the classroom, staff time, and verified our attendance"
                    value={p.contribution_line ?? (Array.isArray(p.contribution) ? p.contribution.join(", ") : "")}
                    onChange={e => {
                        const text = e.target.value;
                        onUpdateFields({
                            contribution_line: text,
                            contribution: text.trim() ? [text] : [],
                        });
                    }}
                    className={inputClasses}
                />
                <FieldError message={getFieldError(`partners.${idx}.contribution`)} />
            </div>
            </div>
        </div>
    );
}

export default function Section7Partnerships({ projectData }: { projectData?: any } = {}) {
    const { data, updateSection, getFieldError } = useReportForm();
    const { has_partners, partners, formalization_status } = data.section7;

    const update = (field: string, val: any) => updateSection("section7", { [field]: val });

    const emptyPartner = () => ({
        name: "",
        pakistan_contact_name: "",
        pakistan_contact_number: "",
        pakistan_contact_email: "",
        type: "",
        designation: "",
        website: "",
        role: [],
        contribution: [],
        contribution_line: "",
        verification: "",
    });

    const addPartner = () => update("partners", [...partners, emptyPartner()]);

    /** The program partner from project setup is already known — log it for the student instead of asking them to re-type it. */
    const programPartnerName = String(
        projectData?.organization_name || projectData?.partner_name || projectData?.organization || "",
    ).trim();
    const seededProgramPartner = useRef(false);
    useEffect(() => {
        if (seededProgramPartner.current) return;
        if (has_partners !== "yes" || partners.length > 0 || !programPartnerName) return;
        seededProgramPartner.current = true;
        update("partners", [{ ...emptyPartner(), name: programPartnerName, _seeded: true }]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [has_partners, partners.length, programPartnerName]);
    const removePartner = (i: number) =>
        update("partners", partners.filter((_, idx) => idx !== i));
    const updatePartner = (i: number, field: string, val: any) => {
        const next = [...partners];
        next[i] = { ...next[i], [field]: val };
        update("partners", next);
    };
    const updatePartnerFields = (i: number, fields: Record<string, any>) => {
        const next = [...partners];
        next[i] = { ...next[i], ...fields };
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
        <div className="mx-auto max-w-6xl space-y-3 pb-10">
            {/* Header */}
            <div className="cer-dup-head space-y-5">
                <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm">
                        <Handshake className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600">
                            Measurable multi-stakeholder engagement (SDG 17)
                        </p>
                        <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                            <span className="text-indigo-600">SECTION 6:</span> Partnerships &amp; collaboration
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
            <section className="cer-card space-y-4">
                <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-semibold text-slate-900">
                        Did anyone stand with you?
                    </h3>
                    <span className={clsx(badgeMandatory, "ml-auto")}>Mandatory</span>
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
                                "rounded-xl border-2 p-5 text-center transition-colors",
                                has_partners === "no"
                                    ? "border-indigo-500 bg-indigo-50 shadow-sm"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                            )}
                        >
                            <p className="text-2xl">🎒</p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">We worked independently</p>
                            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                                Beyond the program partner, no one else was actively involved.
                            </p>
                        </button>

                        <button
                            type="button"
                            onClick={() => update("has_partners", "yes")}
                            className={clsx(
                                "rounded-xl border-2 p-5 text-center transition-colors",
                                has_partners === "yes"
                                    ? "border-indigo-500 bg-indigo-50 shadow-sm"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40",
                            )}
                        >
                            <p className="text-2xl">🤝</p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">Others were involved</p>
                            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                                One or more organizations actively contributed.
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
                    <section className="cer-card space-y-4">
                        <div className="cer-secl">
                            <span className="cer-secn">6.1</span>
                            <h3>Your partner</h3>
                            <span className={clsx("cer-tag", partners[0]?._seeded && "auto")}>
                                {partners[0]?._seeded ? "From section 1 · auto" : "Required"}
                            </span>
                        </div>
                        {partners[0]?._seeded ? (
                            <p className="cer-sub">
                                {programPartnerName} is already here from your project setup. Contact details stay off the public flash card.
                            </p>
                        ) : null}

                        {partners.length === 0 ? (
                            <button
                                type="button"
                                onClick={addPartner}
                                className="cer-addbig"
                            >
                                ＋ Add your partner
                            </button>
                        ) : (
                            <PartnerCard
                                p={partners[0]}
                                idx={0}
                                canRemove={false}
                                onUpdate={(field, val) => updatePartner(0, field, val)}
                                onUpdateFields={(fields) => updatePartnerFields(0, fields)}
                                onRemove={() => removePartner(0)}
                                getFieldError={getFieldError}
                            />
                        )}
                    </section>

                    <section className="cer-card space-y-4">
                        <div className="cer-secl">
                            <span className="cer-secn">6.2</span>
                            <h3>Any other partners?</h3>
                            <span className="cer-tag auto">Optional</span>
                        </div>
                        {partners.slice(1).map((p, offset) => {
                            const idx = offset + 1;
                            return (
                                <PartnerCard
                                    key={idx}
                                    p={p}
                                    idx={idx}
                                    canRemove
                                    onUpdate={(field, val) => updatePartner(idx, field, val)}
                                    onUpdateFields={(fields) => updatePartnerFields(idx, fields)}
                                    onRemove={() => removePartner(idx)}
                                    getFieldError={getFieldError}
                                />
                            );
                        })}
                        <button
                            type="button"
                            onClick={addPartner}
                            className="cer-addbig"
                        >
                            ＋ Add another partner
                        </button>
                    </section>
                </div>
            ) : null}
        </div>
    );
}
