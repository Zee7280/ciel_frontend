"use client";

import Link from "next/link";
import clsx from "clsx";

export const INVESTOR_TYPES = [
    "Venture Capital Fund",
    "Angel Investor",
    "Angel Network / Syndicate",
    "Family Office",
    "Corporate Venture Capital",
    "Accelerator / Incubator",
    "Impact Investor / DFI",
    "Other",
] as const;

export const INVESTOR_COUNTRIES = [
    "Pakistan",
    "United Arab Emirates",
    "Saudi Arabia",
    "Qatar",
    "United Kingdom",
    "United States",
    "Singapore",
    "Other",
] as const;

export const INVESTOR_HEAR = [
    "University partner",
    "Referred by another investor",
    "CIEL Demo Day",
    "LinkedIn",
    "Other",
] as const;

export const INVESTOR_ROUNDS = ["Pre-Seed", "Seed", "Series A+", "Grants / non-dilutive"] as const;
export const INVESTOR_STAGES = ["Idea", "Prototype", "MVP", "Revenue generating"] as const;
export const INVESTOR_SECTORS = [
    "AgriTech",
    "FinTech",
    "HealthTech",
    "EdTech",
    "Climate / CleanTech",
    "DeepTech / Hardware",
    "Social Impact / Livelihoods",
    "Retail / E-commerce",
    "SaaS / B2B",
    "Other",
] as const;

export const INVESTOR_PLANS = [
    { id: "explorer", name: "Explorer", price: "Free", points: ["Masked cards, scores only", "3 intro requests / quarter", "No diligence rooms", "Success fee 3.0%"] },
    { id: "angel", name: "Angel", price: "PKR 60,000 / yr · or 15K / qtr", points: ["Full cards & traction", "10 intros / quarter · rooms", "1 seat", "Success fee 2.5%"] },
    { id: "fund", name: "Fund", price: "PKR 250,000 / yr", rec: "FUNDS", points: ["Unlimited intros · AI match", "Watermarked diligence rooms", "2 seats", "Success fee 2.0%"] },
    { id: "institutional", name: "Institutional Partner", price: "PKR 1.2M / yr", points: ["10 seats · API / CRM export", "14-day first look on Spotlights", "Cohort & ecosystem reports", "Success fee 1.5%"] },
] as const;

export type InvestorWizardStep = 1 | 2 | 3;

export type InvestorSignupState = {
    linkedin: string;
    website: string;
    investorType: string;
    country: string;
    hearAbout: string;
    referralCode: string;
    preferredRounds: string[];
    preferredStages: string[];
    sectors: string[];
    typicalTicket: string;
    geographicFocus: string;
    dealsPerYear: string;
    decisionTimeline: string;
    leadFollow: string;
    sdgInterests: string;
    valueAdd: string;
    plan: string;
    professionalReference: string;
    proofOrgLabel: string;
    proofRoleLabel: string;
    agreePlatform: boolean;
    agreePrivacy: boolean;
    agreeAuthority: boolean;
};

export const EMPTY_INVESTOR_SIGNUP: InvestorSignupState = {
    linkedin: "",
    website: "",
    investorType: "",
    country: "Pakistan",
    hearAbout: "University partner",
    referralCode: "",
    preferredRounds: ["Seed"],
    preferredStages: ["MVP", "Revenue generating"],
    sectors: [],
    typicalTicket: "",
    geographicFocus: "Pakistan",
    dealsPerYear: "1–2",
    decisionTimeline: "Under 4 weeks",
    leadFollow: "Lead or follow",
    sdgInterests: "",
    valueAdd: "",
    plan: "fund",
    professionalReference: "",
    proofOrgLabel: "",
    proofRoleLabel: "",
    agreePlatform: false,
    agreePrivacy: false,
    agreeAuthority: false,
};

export const INVESTOR_STEP_COPY = [
    { title: "Create your investor account", sub: "Join CIEL PK as a verified investor and discover faculty-verified university ventures." },
    { title: "Tell CIEL what belongs in your deal flow", sub: "Your mandate ranks relevance only — it never changes a venture's score, and founders don't see it unless you share it." },
    { title: "Verify, choose a plan, and agree", sub: "Verification protects founders; the agreement protects you, them and CIEL PK." },
] as const;

function toggleIn(list: string[], value: string) {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function InvestorSignupPanel({
    step,
    setStep,
    onNext,
    investor,
    setInvestor,
    errors,
    fieldClass,
    selectClass,
    labelClass,
}: {
    step: InvestorWizardStep;
    setStep: (n: InvestorWizardStep) => void;
    onNext: () => void;
    investor: InvestorSignupState;
    setInvestor: (next: InvestorSignupState | ((prev: InvestorSignupState) => InvestorSignupState)) => void;
    errors: Record<string, string>;
    fieldClass: (hasError: boolean, extra?: string) => string;
    selectClass: (hasError: boolean) => string;
    labelClass: string;
}) {
    const patch = (partial: Partial<InvestorSignupState>) => setInvestor((prev) => ({ ...prev, ...partial }));
    const chip = (on: boolean) =>
        clsx(
            "cursor-pointer rounded-full border px-3 py-2 text-[12.5px] font-semibold",
            on ? "border-ciel-green bg-ciel-green-soft text-[#0e7e55]" : "border-slate-200 bg-white text-[#516174]",
        );

    return (
        <div className="space-y-5">
            <div className="flex gap-2">
                {[1, 2, 3].map((n) => (
                    <span key={n} className={clsx("h-1.5 flex-1 rounded-full", n <= step ? "bg-ciel-green" : "bg-slate-200")} />
                ))}
            </div>
            <div className="flex justify-between text-[11px] font-bold text-[#7b889c]">
                <span className={step === 1 ? "text-ciel-text" : undefined}>1 · You & your firm</span>
                <span className={step === 2 ? "text-ciel-text" : undefined}>2 · Mandate</span>
                <span className={step === 3 ? "text-ciel-text" : undefined}>3 · Verification & agreement</span>
            </div>

            {step === 1 && (
                <>
                    <p className="text-[12.5px] italic text-ciel-text-soft">
                        Investor accounts are KYC-verified by CIEL PK within 3 working days before founder access is activated.
                    </p>
                    <div>
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ciel-text-soft">Organisation</p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className={labelClass}>LinkedIn profile *</label>
                                <input value={investor.linkedin} onChange={(e) => patch({ linkedin: e.target.value })} className={fieldClass(!!errors.linkedin)} placeholder="linkedin.com/in/yourprofile" />
                                {errors.linkedin && <p className="ml-1 text-[11px] font-semibold text-red-500">{errors.linkedin}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>Website *</label>
                                <input value={investor.website} onChange={(e) => patch({ website: e.target.value })} className={fieldClass(!!errors.website)} placeholder="www.abcventures.com" />
                                {errors.website && <p className="ml-1 text-[11px] font-semibold text-red-500">{errors.website}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>Investor type *</label>
                                <select value={investor.investorType} onChange={(e) => patch({ investorType: e.target.value })} className={selectClass(!!errors.investorType)}>
                                    <option value="">Select investor type</option>
                                    {INVESTOR_TYPES.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                                {errors.investorType && <p className="ml-1 text-[11px] font-semibold text-red-500">{errors.investorType}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>Country *</label>
                                <select value={investor.country} onChange={(e) => patch({ country: e.target.value })} className={selectClass(false)}>
                                    {INVESTOR_COUNTRIES.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>How did you hear about CIEL PK?</label>
                                <select value={investor.hearAbout} onChange={(e) => patch({ hearAbout: e.target.value })} className={selectClass(false)}>
                                    {INVESTOR_HEAR.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Referral code (optional)</label>
                                <input value={investor.referralCode} onChange={(e) => patch({ referralCode: e.target.value })} className={fieldClass(false)} placeholder="e.g. BNU-DEMO26" />
                            </div>
                        </div>
                    </div>
                    <button type="button" onClick={onNext} className="flex w-full items-center justify-center rounded-xl bg-[#19a36d] py-3.5 text-sm font-semibold text-white">
                        Continue → Mandate
                    </button>
                </>
            )}

            {step === 2 && (
                <>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ciel-text-soft">Investment mandate (powers AI Deal Match)</p>
                    <div>
                        <label className={labelClass}>Preferred round *</label>
                        <div className="flex flex-wrap gap-2">
                            {INVESTOR_ROUNDS.map((r) => (
                                <button key={r} type="button" className={chip(investor.preferredRounds.includes(r))} onClick={() => patch({ preferredRounds: toggleIn(investor.preferredRounds, r) })}>
                                    {r}
                                </button>
                            ))}
                        </div>
                        {errors.preferredRounds && <p className="ml-1 text-[11px] font-semibold text-red-500">{errors.preferredRounds}</p>}
                    </div>
                    <div>
                        <label className={labelClass}>Preferred product stage *</label>
                        <div className="flex flex-wrap gap-2">
                            {INVESTOR_STAGES.map((r) => (
                                <button key={r} type="button" className={chip(investor.preferredStages.includes(r))} onClick={() => patch({ preferredStages: toggleIn(investor.preferredStages, r) })}>
                                    {r}
                                </button>
                            ))}
                        </div>
                        <p className="mt-1 text-[11.5px] text-ciel-text-soft">Same taxonomy as venture cards: round and product stage are tracked separately.</p>
                        {errors.preferredStages && <p className="ml-1 text-[11px] font-semibold text-red-500">{errors.preferredStages}</p>}
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className={labelClass}>Typical ticket *</label>
                            <select value={investor.typicalTicket} onChange={(e) => patch({ typicalTicket: e.target.value })} className={selectClass(!!errors.typicalTicket)}>
                                <option value="">Select range</option>
                                <option>Under PKR 5 million</option>
                                <option>PKR 5–30 million</option>
                                <option>PKR 25–100 million</option>
                                <option>PKR 100–500 million</option>
                                <option>PKR 500 million+</option>
                                <option>USD ticket (international)</option>
                            </select>
                            {errors.typicalTicket && <p className="ml-1 text-[11px] font-semibold text-red-500">{errors.typicalTicket}</p>}
                        </div>
                        <div>
                            <label className={labelClass}>Geographic focus</label>
                            <select value={investor.geographicFocus} onChange={(e) => patch({ geographicFocus: e.target.value })} className={selectClass(false)}>
                                <option>Pakistan</option>
                                <option>Pakistan + South Asia</option>
                                <option>MENA</option>
                                <option>Global</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Sectors of interest *</label>
                        <div className="flex flex-wrap gap-2">
                            {INVESTOR_SECTORS.map((r) => (
                                <button key={r} type="button" className={chip(investor.sectors.includes(r))} onClick={() => patch({ sectors: toggleIn(investor.sectors, r) })}>
                                    {r}
                                </button>
                            ))}
                        </div>
                        {errors.sectors && <p className="ml-1 text-[11px] font-semibold text-red-500">{errors.sectors}</p>}
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className={labelClass}>Deals per year (approx.)</label>
                            <select value={investor.dealsPerYear} onChange={(e) => patch({ dealsPerYear: e.target.value })} className={selectClass(false)}>
                                <option>1–2</option>
                                <option>3–5</option>
                                <option>6–10</option>
                                <option>10+</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Decision timeline</label>
                            <select value={investor.decisionTimeline} onChange={(e) => patch({ decisionTimeline: e.target.value })} className={selectClass(false)}>
                                <option>Under 4 weeks</option>
                                <option>4–8 weeks</option>
                                <option>8–12 weeks</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Lead / follow</label>
                            <select value={investor.leadFollow} onChange={(e) => patch({ leadFollow: e.target.value })} className={selectClass(false)}>
                                <option>Lead or follow</option>
                                <option>Follow only</option>
                                <option>Lead only</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>SDG interests (optional)</label>
                            <input value={investor.sdgInterests} onChange={(e) => patch({ sdgInterests: e.target.value })} className={fieldClass(false)} placeholder="e.g. 2, 8, 13" />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Value beyond capital (shown to founders after an approved introduction)</label>
                        <textarea value={investor.valueAdd} onChange={(e) => patch({ valueAdd: e.target.value })} className={clsx(fieldClass(false), "min-h-[80px] py-3")} placeholder="Distribution, partnerships, follow-on capital, sector expertise…" />
                    </div>
                    <div className="flex gap-2.5">
                        <button type="button" onClick={() => setStep(1)} className="rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-[#516174]">← Back</button>
                        <button type="button" onClick={onNext} className="flex-1 rounded-xl bg-[#19a36d] py-3.5 text-sm font-semibold text-white">Continue → Verification</button>
                    </div>
                </>
            )}

            {step === 3 && (
                <>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ciel-text-soft">Verification (KYC-lite)</p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className={labelClass}>Proof of organisation *</label>
                            <label className="block cursor-pointer rounded-xl border border-dashed border-slate-200 bg-[#f7fafc] px-4 py-4 text-center text-[13px] text-[#65758b]">
                                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => patch({ proofOrgLabel: e.target.files?.[0]?.name || "" })} />
                                {investor.proofOrgLabel ? <>✓ <b className="text-ciel-text">{investor.proofOrgLabel}</b> attached</> : <>📎 <b className="text-ciel-text">Upload</b> SECP / company registration, fund licence, or NTN<br /><small>PDF, JPG · max 10 MB</small></>}
                            </label>
                            {errors.proofOrgLabel && <p className="ml-1 text-[11px] font-semibold text-red-500">{errors.proofOrgLabel}</p>}
                        </div>
                        <div>
                            <label className={labelClass}>Proof of role *</label>
                            <label className="block cursor-pointer rounded-xl border border-dashed border-slate-200 bg-[#f7fafc] px-4 py-4 text-center text-[13px] text-[#65758b]">
                                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => patch({ proofRoleLabel: e.target.files?.[0]?.name || "" })} />
                                {investor.proofRoleLabel ? <>✓ <b className="text-ciel-text">{investor.proofRoleLabel}</b> attached</> : <>📎 <b className="text-ciel-text">Upload</b> business card, employer letter, or fund website team page<br /><small>Angels: CNIC front + LinkedIn is enough</small></>}
                            </label>
                            {errors.proofRoleLabel && <p className="ml-1 text-[11px] font-semibold text-red-500">{errors.proofRoleLabel}</p>}
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>One professional reference (optional, speeds up verification)</label>
                        <input value={investor.professionalReference} onChange={(e) => patch({ professionalReference: e.target.value })} className={fieldClass(false)} placeholder="Name · organisation · email" />
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ciel-text-soft">Choose your plan</p>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                        {INVESTOR_PLANS.map((p) => {
                            const on = investor.plan === p.id;
                            return (
                                <button key={p.id} type="button" onClick={() => patch({ plan: p.id })} className={clsx("relative rounded-[14px] border-2 p-3.5 text-left", on ? "border-ciel-green bg-ciel-green-soft" : "border-slate-200 bg-white")}>
                                    {"rec" in p && p.rec ? <span className="absolute right-2.5 -top-2 rounded-full bg-[#b87a20] px-2 py-0.5 text-[9.5px] font-black text-white">{p.rec}</span> : null}
                                    <div className="text-sm font-black">{p.name}</div>
                                    <div className="mt-1 text-[13px] font-black">{p.price}</div>
                                    <ul className="mt-1.5 list-disc pl-4 text-[11.5px] leading-relaxed text-[#516174]">
                                        {p.points.map((x) => <li key={x}>{x}</li>)}
                                    </ul>
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-[11.5px] text-ciel-text-soft">Membership is invoiced after verification. Founding Investor programme: first 20 verified members get 12 months waived in exchange for a signed agreement and outcome declarations. Success fee can alternatively be venture-paid (3%, deducted from the round) — agreed per deal.</p>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ciel-text-soft">Investor Platform Agreement v2.1 — plain-language summary</p>
                    <div className="space-y-2 text-[12.5px] leading-relaxed text-[#43525c]">
                        <div className="rounded-xl border border-slate-200 px-3.5 py-2.5"><b className="mb-0.5 block text-[#32133a]">Non-circumvention · 24 months</b>Ventures you first meet on CIEL PK are CIEL-sourced. If you invest in one within 24 months, on or off the platform, the success fee applies. Undeclared off-platform closings are charged at 2×.</div>
                        <div className="rounded-xl border border-slate-200 px-3.5 py-2.5"><b className="mb-0.5 block text-[#32133a]">Confidentiality & founder protection</b>No screenshots, forwarding or scraping. Founders are contacted only through CIEL introductions and may decline. Data-room documents are watermarked and every view is logged.</div>
                        <div className="rounded-xl border border-slate-200 px-3.5 py-2.5"><b className="mb-0.5 block text-[#32133a]">Outcome declaration</b>You declare Invested / Passed for every introduced venture within 90 days or on closing. Passing includes one sentence of feedback for the student founder.</div>
                        <div className="rounded-xl border border-slate-200 px-3.5 py-2.5"><b className="mb-0.5 block text-[#32133a]">What CIEL PK is not</b>CIEL PK is a verification and introduction platform — not an SECP-licensed fund manager, broker or crowdfunding platform. It never holds your money and does not recommend securities.</div>
                    </div>
                    <div className="grid gap-2">
                        <label className="flex cursor-pointer items-start gap-2.5">
                            <input type="checkbox" checked={investor.agreePlatform} onChange={(e) => patch({ agreePlatform: e.target.checked })} className="mt-0.5 h-4 w-4 shrink-0" />
                            <span className="text-[13px] leading-relaxed text-[#65758b]">I have read and accept the <Link href="/about" className="font-semibold text-ciel-green-deep underline">Investor Platform Agreement v2.1</Link>, including non-circumvention and success-fee terms.</span>
                        </label>
                        <label className="flex cursor-pointer items-start gap-2.5">
                            <input type="checkbox" checked={investor.agreePrivacy} onChange={(e) => patch({ agreePrivacy: e.target.checked })} className="mt-0.5 h-4 w-4 shrink-0" />
                            <span className="text-[13px] leading-relaxed text-[#65758b]">I accept the <Link href="/about" className="font-semibold text-ciel-green-deep underline">Privacy Policy</Link> and consent to CIEL PK verifying my identity and organisation.</span>
                        </label>
                        <label className="flex cursor-pointer items-start gap-2.5">
                            <input type="checkbox" checked={investor.agreeAuthority} onChange={(e) => patch({ agreeAuthority: e.target.checked })} className="mt-0.5 h-4 w-4 shrink-0" />
                            <span className="text-[13px] leading-relaxed text-[#65758b]">I confirm I am investing on behalf of the organisation named above, with authority to do so, and that I will follow the founder-protection conduct rules.</span>
                        </label>
                        {errors.consent && <p className="text-[11px] font-semibold text-red-500">{errors.consent}</p>}
                    </div>
                    <div className="flex gap-2.5">
                        <button type="button" onClick={() => setStep(2)} className="rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-[#516174]">← Back</button>
                        <button type="submit" className="flex-1 rounded-xl bg-[#19a36d] py-3.5 text-sm font-semibold text-white">Submit for verification →</button>
                    </div>
                </>
            )}
        </div>
    );
}
