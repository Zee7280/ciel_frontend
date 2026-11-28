import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import React, { useMemo, useEffect, useRef } from "react";
import clsx from "clsx";
import PhoneConnectivityRow from "@/components/ui/PhoneConnectivityRow";
import { composeInternationalPhone, parsePhoneForDisplay } from "@/utils/countryCallingCodes";
import {
    contributorGaveText, contributorRoleText, contributorStage, groupContributors, linkedPartnerName, partnerCountWithContributors,
    reportStage, type ContributorGroup, type ResourceRow, type ThankYouContext,
} from "../utils/resourceContributorsView";
import ContributorThankYouPreview, { ThankYouFlowStrip } from "./ContributorThankYouPreview";

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

const roleOptions = [
    "🏫 Host site",
    "🤝 Co-delivery",
    "💵 Funding / sponsorship",
    "🧑‍🏫 Mentorship / expertise",
    "🧾 Verification & records",
    "📣 Community access",
    "✏️ Other",
];

const inputClasses =
    "h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100";
const fieldLabel =
    "text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500";
const badgeMandatory =
    "shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700";
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
                        <span className="cer-soft-req">RECOMMENDED</span>
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
                🌐 <b>Bringing your partner into the CIEL PK ecosystem.</b> A partner can be anyone who genuinely helped — an individual, a
                small shop, a professional, a community elder, an NGO or a large organization. Contact details stay private: they never appear
                on the public flash card.
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
    const { data, updateSection, getFieldError, setStep } = useReportForm();
    const { has_partners, partners, formalization_status } = data.section7;
    const [previewGroup, setPreviewGroup] = React.useState<ContributorGroup | null>(null);

    /* 6.3 · Everyone named in Resources is carried here automatically as a contributing partner. */
    const section6Resources = useMemo<ResourceRow[]>(
        () => (data.section6?.use_resources === "yes" && Array.isArray(data.section6.resources) ? (data.section6.resources as ResourceRow[]) : []),
        [data.section6?.use_resources, data.section6?.resources],
    );
    const resourceProofs = Array.isArray(data.section6?.evidence_files) ? data.section6.evidence_files : [];
    const contributorGroups = useMemo(() => {
        const unlinked = resourceProofs.some((f: any) => typeof f?.resource_index !== "number");
        return groupContributors(section6Resources, (index) =>
            resourceProofs.filter((f: any) => f?.resource_index === index).length || (unlinked ? 1 : 0));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [section6Resources, data.section6?.evidence_files]);
    const unnamedContributorRows = section6Resources.filter((row) => {
        const who = String(row.contributed_by || "");
        const outside = who === "outside" || who === "both" || (Array.isArray(row.sources) && row.sources.some((s) => !["Student Team", "Self-funded"].includes(String(s))));
        return outside && !["contributor_name", "contributor_org", "contributor_email", "contributor_phone"].some((k) => String((row as any)[k] || "").trim());
    }).length;
    const stage = reportStage(data);
    const namedPartners = (Array.isArray(partners) ? partners : []).filter((p: any) => String(p?.name || "").trim());
    const thankYouCtx: ThankYouContext = {
        projectTitle: String(projectData?.title || data.project_title || "Community Service project").trim(),
        projectCode: String(data.project_id || data.public_id || projectData?.id || "").trim() || "pending",
        partnerName: String(projectData?.organization_name || projectData?.partner_name || projectData?.organization || "").trim() || undefined,
        university: String(data.section1?.team_lead?.university || "").trim() || undefined,
        location: String(projectData?.location || projectData?.city || "").trim() || undefined,
        teamNames: [String(data.section1?.team_lead?.name || "").trim(), ...(Array.isArray(data.section1?.team_members) ? data.section1.team_members : []).map((m: any) => String(m?.name || "").trim())].filter(Boolean),
    };

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
    
    const activePartners = has_partners === "yes" ? partners : [];
                const verifiedPartners = activePartners.filter(p =>
        p.verification && !p.verification.includes("Self-Reported"),
    );
        const formalCount = has_partners === "yes"
        ? (formalization_status?.filter(s => s !== "None of the above" && s !== "No Formal Documentation").length || 0)
        : 0;
    
        
    const contributingNote = useMemo(() => {
        if (!contributorGroups.length) return "";
        const n = contributorGroups.length;
        const counted = partnerCountWithContributors(has_partners === "yes" ? namedPartners : [], contributorGroups);
        return ` ${n} outside contributor${n === 1 ? "" : "s"} recorded in Resources ${n === 1 ? "is" : "are"} carried here as contributing partner${n === 1 ? "" : "s"} (${counted} partner${counted === 1 ? "" : "s"} in all, each counted once); the thank-you email ${stage === "live" ? "was issued by CIEL PK after approval" : "follows Admin approval"}.`;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contributorGroups, has_partners, partners, stage]);

    const autoNarrative = useMemo(() => {
        if (has_partners === "no") return `No formal partnerships reported. Project was executed independently.${contributingNote}`;
        if (!partners.length) return `Partnership summary will appear once partner details are entered.${contributingNote}`;
        const types = [...new Set(partners.map(p => p.type).filter(Boolean))].slice(0, 2);
        return `The project engaged ${partners.length} active ${partners.length === 1 ? "partner" : "partners"}${types.length ? ` including ${types.slice(0, 2).join(" and ").toLowerCase()} ${types.length === 1 ? "organization" : "organizations"}` : ""}. ${verifiedPartners.length > 0 ? `Partnerships were verified at the ${[...new Set(verifiedPartners.map(p => p.verification))].slice(0, 2).join(" and ").toLowerCase()} level.` : ""} ${formalCount > 0 ? `${formalCount} ${formalCount === 1 ? "collaboration was" : "collaborations were"} supported by formal documentation.` : ""}${contributingNote}`;
    }, [has_partners, partners, verifiedPartners, formalCount, contributingNote]);

    useEffect(() => {
        if (data.section7.summary_text !== autoNarrative) {
            updateSection("section7", { summary_text: autoNarrative });
        }
    }, [autoNarrative, data.section7.summary_text, updateSection]);

    return (
        <div className="mx-auto max-w-6xl space-y-3">

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
                            aria-pressed={has_partners === "no"}
                            data-ciel-choice-card="has_partners:no"
                            className="cer-choice-card rounded-xl p-5 text-center transition-colors"
                        >
                            {has_partners === "no" ? <span className="cer-choice-card-tag">✓ Selected</span> : null}
                            <p className="text-2xl">🎒</p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">We worked independently</p>
                            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                                Beyond the program partner, no one else was actively involved.
                            </p>
                        </button>

                        <button
                            type="button"
                            onClick={() => update("has_partners", "yes")}
                            aria-pressed={has_partners === "yes"}
                            data-ciel-choice-card="has_partners:yes"
                            className="cer-choice-card rounded-xl p-5 text-center transition-colors"
                        >
                            {has_partners === "yes" ? <span className="cer-choice-card-tag">✓ Selected</span> : null}
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
                <div className="space-y-3">
                    <section className="cer-card space-y-4">
                        <div className="cer-secl">
                            <span className="cer-secn">6.1</span>
                            <h3>Your partner</h3>
                            <span className={clsx("cer-tag", partners[0]?._seeded && "auto")}>
                                {partners[0]?._seeded ? "From project setup · auto" : "Required"}
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

            {/* 6.3 Contributing partners · from Resources (automatic) */}
            <section className="cer-card space-y-3" data-ciel-contributing-partners>
                <div className="cer-secl">
                    <span className="cer-secn">6.3</span>
                    <h3>Contributing partners · from Resources</h3>
                    <span className="cer-tag auto">Automatic</span>
                </div>
                <p className="cer-hint">
                    Everyone you named in Resources is carried here automatically as a <b>contributing partner</b> — you never type them twice.
                    They are shown separately from the partner(s) above, because giving a resource is a different role from helping to deliver the project.
                </p>
                {contributorGroups.length ? contributorGroups.map((g) => {
                    const link = linkedPartnerName(g, has_partners === "yes" ? namedPartners : []);
                    const [label, tone] = contributorStage(g, stage);
                    return (
                        <div key={g.key} className="cer-rx-profile" data-ciel-contributing-partner>
                            <h4>🤝 {g.display}</h4>
                            <div className="flex flex-wrap gap-1.5">
                                <span className="cer-pill">{link ? `Same as “${link}” above · counted once` : "Contributing partner"}</span>
                                <span className={clsx("cer-pill", `cer-pill-${tone}`)}>{label}</span>
                            </div>
                            <p><b>Role:</b> {contributorRoleText(g) || "Contribution"}<br /><b>Contribution:</b> {contributorGaveText(g)}</p>
                            <p>
                                <b>{g.kind === "organization" ? "Contact person" : "Contact"} · private:</b> {g.name || "name pending"} · WhatsApp <span className="whitespace-nowrap">{g.phone || "pending"}</span> · {g.email || "email pending"}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <button type="button" className="cer-rx-button" onClick={() => setStep(5)}>Edit in Resources</button>
                                <button type="button" className="cer-rx-button" disabled={!g.previewReady} onClick={() => setPreviewGroup(g)}>Preview thank-you email</button>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="cer-muted">
                        No outside contributor has been named in Resources yet. If the project ran only on the student team’s own time or money, this list stays empty — that is fine.
                    </div>
                )}
                {unnamedContributorRows ? (
                    <div className="cer-muted">
                        {unnamedContributorRows} resource {unnamedContributorRows === 1 ? "entry" : "entries"} still {unnamedContributorRows === 1 ? "needs" : "need"} a contributor’s name in Resources.
                    </div>
                ) : null}
                <details className="cer-rx-why">
                    <summary>How a contributor becomes a partner — what, how and when</summary>
                    <p className="cer-hint"><b>What:</b> each named contributor is recorded as a contributing partner of this project — their name or organization, their role (funding or in-kind support) and what they gave. WhatsApp number and email stay private.</p>
                    <p className="cer-hint"><b>How:</b> automatically, from the contributor record in Resources. If the contributor is already your registered or additional partner (same organization name or email), the contribution is attached to that partner and counted once. Resources paid for by the student team never create a partner.</p>
                    <p className="cer-hint"><b>When:</b></p>
                    <ThankYouFlowStrip stage={stage} />
                    <p className="cer-hint">A contributing partner is not automatically a delivery partner. To record a role such as host site or co-delivery, add them under “Any other partners?” above as well — their contribution is then shown under that partner and counted once.</p>
                </details>
            </section>

            <ContributorThankYouPreview group={previewGroup} ctx={thankYouCtx} stage={stage} onClose={() => setPreviewGroup(null)} />
        </div>
    );
}
