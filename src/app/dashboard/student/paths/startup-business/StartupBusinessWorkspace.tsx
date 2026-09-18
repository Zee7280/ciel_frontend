"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";
import { uploadFileViaPresign } from "@/utils/presignedFileUpload";
import { sdgData } from "@/utils/sdgData";
import { pakistaniUniversities } from "@/utils/universityData";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { WorkspaceSkeleton } from "@/components/ciel/Skeleton";
import { TeamInviteBadge } from "@/components/ciel/TeamInviteBadge";
import { MockupHero } from "@/components/ciel/dashboard/MockupChrome";
import { namedTimeGreeting } from "@/utils/timeGreeting";
import { readStoredCurrentUser } from "@/utils/currentUser";
import {
    BUYER_MODELS,
    CHANNELS,
    COMPETITOR_TYPES,
    COMPASS_TIPS,
    DISCIPLINES,
    EXIT_STRATEGIES,
    EVIDENCE_METHODS,
    FACULTY_ROLES,
    LEGAL_STATUSES,
    MARKET_SOURCES,
    NUMBER_SOURCES,
    ORIGIN_TO_SUBMISSION,
    ORIGINS,
    PATHWAY,
    PHONE_CODES,
    REG_BARRIERS,
    RESPONSIBILITY_PRACTICES,
    REVENUE_MODELS,
    REVIEW_BLOCKS,
    SDG_COLORS,
    SDG_SHORT,
    SECTORS_V11,
    SUPPORT_NEEDS,
    V11_STAGES,
    V13_FORM_VERSION,
    V13_LAST_STEP,
    V13_STEPS,
    VAULT_DOCS,
    VENTURE_TYPES,
    compassScores,
    evidenceLabel,
    htmlSdgMode,
    loadWorkspaceStep,
    normalizeV11Stage,
    pathwayLevel,
    pitch60,
    progressPercent,
    sdgStatusLabel,
    suggestSdgs,
    tractionCount,
    v11Summaries,
    validationLine,
    venturePotentialScore,
    type V11Snap,
} from "@/utils/ventureStudioV11";
import {
    ACCOUNTING,
    ASK_INSTRUMENT,
    BRAND_ASSETS,
    BUDGET_CATEGORIES,
    BUDGET_PERIOD,
    BUDGET_STATUS,
    BURNOUT_SIGNS,
    COMMITMENTS,
    COMPETITION_LEVEL,
    CUSTOMER_SEGMENTS,
    DEGREE_LEVELS,
    DELIVERY_MODELS,
    EQUITY_SPLIT,
    FOUNDER_ROLES,
    FUND_SOURCES,
    GEOGRAPHY,
    HIRING_NEED,
    HOURS_WEEK,
    IP_STATUS,
    KEY_PERSON,
    MARKET_TRENDS,
    MOAT_TYPES,
    OTHER_COMMIT,
    PAYMENT_TERMS,
    PRIOR_EXP,
    PRICING_STRATEGY,
    PRICING_TESTED,
    PROBLEM_FREQUENCY,
    PRODUCT_STATUS,
    PROFIT_MONTH,
    QUALITY_CONTROL,
    RAISE_PLAN,
    RISK_LEVELS,
    RISK_TYPES,
    SALES_CYCLE,
    SALES_MOTION,
    SKILL_GAPS,
    TEAM_SKILLS,
    TEAM_TIME,
    TECH_DEPENDENCY,
    TRIGGERS,
    WTP_EVIDENCE,
    buildVenturePlanSections,
    FIELD_EXAMPLES,
    financialReadiness,
    teamHealthLabel,
    vcChecklist,
} from "@/utils/ventureStudioV13";
import {
    VsAiBox,
    VsCalc,
    VsChips,
    VsChoice,
    VsEx,
    VsExplain,
    VsField,
    VsNav,
    VsNotice,
    VsSelectOther,
    VsTerm,
    VsUnit,
    VsWhy,
    toggleChip,
    vsField,
} from "./VentureStudioFormUi";
import { VsHelpModal } from "./VentureStudioHelpModal";
import { ventureStatusLabel } from "@/utils/pathReviewStatus";

interface TeamMember {
    name: string;
    role: string;
    email?: string;
    whatsappCode?: string;
    whatsappNumber?: string;
    commitment?: string;
    inviteStatus?: "pending" | "accepted";
}
interface VentureDocument { type: string; version: number; fileUrl: string; uploadedAt: string }
interface VentureAcademicSetup {
    submissionType?: string; submissionTypes?: string[]; university?: string; campus?: string; faculty?: string;
    department?: string; program?: string; academicYear?: string; semester?: string; courseCode?: string; groupId?: string;
    supervisorName?: string; supervisorEmail?: string; coSupervisor?: string; deadline?: string; teamType?: string;
    industrySponsor?: string; ethicsApproval?: string; confidentialityStatus?: string; ipOwnership?: string;
    founderName?: string; founderRole?: string; founderCredentials?: string; facultyRole?: string; courseRef?: string;
    origin?: string; founderEmail?: string; founderWhatsappCode?: string; founderWhatsappNumber?: string;
    teamFit?: string; founderInsight?: string; legalStatus?: string; ventureType?: string;
    formVersion?: number; startDate?: string; hoursWeek?: string; degreeLevel?: string; website?: string;
    commitment?: string; priorExp?: string; skills?: string[]; skillGap?: string; equitySplit?: string; advisors?: string;
}
interface VentureIdeaInfo {
    problem?: string; proofFact?: string; payerWho?: string; userWho?: string; beneficiaryWho?: string;
    sector?: string; city?: string; pitch?: string; customer?: string; buyerModels?: string[]; payerDiff?: string;
    evidenceMethods?: string[]; competitorType?: string; whyUs?: string; resistance?: string; whyNow?: string;
    customerSegment?: string; frequency?: string; severity?: string; trigger?: string; jtbd?: string; currentSpend?: number;
    customerQuote?: string; wtpEvidence?: string; geography?: string; tam?: number; som?: number; marketTrend?: string;
    competitionLevel?: string; positioning?: string;
    competitors?: { name?: string; price?: string; strength?: string; weakness?: string }[];
}
interface VentureSolutionInfo {
    solution?: string; alternative?: string; advantage?: string; revenue?: string; costPerSale?: string;
    milestone12mo?: string; marketWho?: string; marketSize?: string; marketSource?: string; demoUrl?: string;
    revenueModels?: string[]; channels?: string[]; numberSourceType?: string; numberSourceNote?: string;
    price?: number; unitCost?: number; startupNeed?: number; monthlyRevenue?: number; cac?: number; ltv?: number;
    raised?: number; grossMargin?: number; burn?: number; runway?: number;
    productStatus?: string; features?: string; ipStatus?: string; moatType?: string; techDependency?: string; roadmap?: string;
    deliveryModel?: string; capacity?: string; bottleneck?: string; qualityControl?: string; scalePlan?: string;
    pricingStrategy?: string; pricingTested?: string; purchaseFreq?: number; retentionYears?: number;
    primaryChannel?: string; salesMotion?: string; salesCycle?: string; referral?: string; keyMessage?: string;
    mktBudget?: number; newCustMonth?: number; funnelReach?: number; funnelLeads?: number; funnelCust?: number;
    brandAssets?: string; partners?: string; fixedCosts?: number; budgetPeriod?: string; budgetStatus?: string;
    budgetLines?: { category?: string; amount?: number; note?: string }[];
    fundSources?: { source?: string; amount?: number; note?: string }[];
    cashOnHand?: number; monthlyCosts?: number; projCustM1?: number; projGrowth?: number; paymentTerms?: string;
    revenueTarget12?: number; profitMonth?: string; mrr?: number; gmv?: number; takeRate?: number; mau?: number;
    churn?: number; payingUsers?: number; finAssumptions?: string; accounting?: string; raisePlan?: string;
    askInstrument?: string; uofProduct?: number; uofOps?: number; uofMarketing?: number; uofTeam?: number;
    uofLegal?: number; uofContingency?: number;
}
interface VentureSdgEntry { goalNumber: number; targets: string[]; how?: string }
interface VentureIndicator { indicator?: string; forGoal?: string; target12mo?: string; verifiedBy?: string }
interface VentureSdgMapping {
    entries?: VentureSdgEntry[]; mode?: "map" | "review" | "none"; howImpact?: string; helpImpact?: string;
    responsibility?: string[]; indicators?: VentureIndicator[];
}
interface VentureEvidenceInfo {
    interviews?: number; surveyResponses?: number; willingToTest?: number; testers?: number; pilotPartners?: number;
    preOrders?: number; customers?: number; revenueToDate?: number; monthlyGrowthPercent?: number; repeatPercent?: number;
    partnerships?: number; lettersOfIntent?: number; fundingSought?: number; useOfFunds?: string; expectedResult?: string;
    openTo?: string[]; mentorsConsulted?: number; competitionsJoined?: number; risk?: string; mitigation?: string;
    assumption?: string; regulatoryBarrier?: string; reflection?: string; valuation?: number; equityPercent?: number;
    founderOwnership?: number; fundRunway?: number; exitStrategy?: string;
    riskRows?: { type?: string; description?: string; likelihood?: string; impact?: string; mitigation?: string }[];
    otherCommit?: string; keyPerson?: string; hiringNeed?: string; paceScore?: string; burnoutSigns?: string[];
    burnoutPlan?: string; plan90?: string; vision35?: string;
}
interface VentureReviewPipeline {
    declarationWork?: boolean; declarationConsent?: boolean; studentDeclaredAt?: string;
    supervisorStatus?: "not_started" | "pending" | "approved" | "revisions_requested" | "rejected";
    supervisorNote?: string | null; universityStatus?: "not_started" | "pending" | "approved";
    sdgReviewStatus?: "not_started" | "pending" | "approved";
}
interface VenturePublishSettings {
    audience?: "private" | "university" | "partners" | "investors";
    showName?: boolean; showTeam?: boolean; showUniversity?: boolean; showTraction?: boolean; showAsk?: boolean; acceptIntros?: boolean;
}
interface VentureSectionSummaries {
    opportunity?: string; advantage?: string; business?: string; traction?: string; impact?: string; ask?: string; founder?: string;
}
interface VentureGates { academicOk: boolean; showcaseOk: boolean; investmentReadyOk: boolean }
interface VentureEntry {
    id?: string; ventureName: string | null; description: string | null; stage: string | null;
    tractionRows: { date: string; metric: string; value: string; note?: string }[];
    team: TeamMember[]; materialUrls: string[]; isVisible: boolean;
    academicSetup: VentureAcademicSetup | null; documents: VentureDocument[];
    ideaInfo: VentureIdeaInfo | null; solutionInfo: VentureSolutionInfo | null; sdgMapping: VentureSdgMapping | null;
    evidenceInfo: VentureEvidenceInfo | null; reviewPipeline: VentureReviewPipeline | null;
    publishSettings: VenturePublishSettings | null; teamConsent: { name: string; consented: boolean }[];
    sectionSummaries: VentureSectionSummaries | null; stepCompleted: number; status: "draft" | "submitted";
    gates?: VentureGates; isOwner?: boolean;
}

const EMPTY: VentureEntry = {
    ventureName: "", description: "", stage: "", tractionRows: [],
    team: [{ name: "", role: "", email: "", whatsappCode: "+92", whatsappNumber: "" }],
    materialUrls: [], isVisible: false, academicSetup: { founderWhatsappCode: "+92" }, documents: [],
    ideaInfo: {}, solutionInfo: {}, sdgMapping: { entries: [] }, evidenceInfo: { openTo: [] },
    reviewPipeline: {}, publishSettings: {}, teamConsent: [], sectionSummaries: {}, stepCompleted: 0, status: "draft",
};

function mergeEntry(base: VentureEntry, data: Partial<VentureEntry>): VentureEntry {
    const team = data.team?.length ? data.team : base.team;
    return {
        ...base, ...data,
        academicSetup: { ...base.academicSetup, ...data.academicSetup },
        ideaInfo: { ...base.ideaInfo, ...data.ideaInfo },
        solutionInfo: { ...base.solutionInfo, ...data.solutionInfo },
        sdgMapping: { ...base.sdgMapping, ...data.sdgMapping },
        evidenceInfo: { ...base.evidenceInfo, ...data.evidenceInfo },
        reviewPipeline: { ...base.reviewPipeline, ...data.reviewPipeline },
        publishSettings: { ...base.publishSettings, ...data.publishSettings },
        sectionSummaries: { ...base.sectionSummaries, ...data.sectionSummaries },
        documents: data.documents ?? base.documents,
        teamConsent: data.teamConsent ?? base.teamConsent,
        team: team.length ? team : [{ name: "", role: "", email: "", whatsappCode: "+92", whatsappNumber: "" }],
        stage: normalizeV11Stage(data.stage ?? base.stage),
    };
}

function num(v?: number | string | null) {
    const n = Number(v || 0);
    return Number.isFinite(n) ? n : 0;
}

function toSnap(entry: VentureEntry): V11Snap {
    const as = entry.academicSetup || {};
    const idea = entry.ideaInfo || {};
    const sol = entry.solutionInfo || {};
    const ev = entry.evidenceInfo || {};
    const sm = entry.sdgMapping || {};
    const team = (entry.team || []).filter((t) => t.name?.trim());
    return {
        stage: normalizeV11Stage(entry.stage), name: entry.ventureName || "", pitch: idea.pitch || entry.description || "",
        uni: as.university || "", founder: as.founderName || "", founderRole: as.founderRole || "",
        facultyName: as.supervisorName || "", facultyRole: as.facultyRole || "", ventureType: as.ventureType || "",
        sector: idea.sector || "", teamFit: as.teamFit || "", founderInsight: as.founderInsight || "",
        teamCount: team.length, problem: idea.problem || "", customer: idea.customer || idea.userWho || "",
        buyerModels: idea.buyerModels || [],         alternative: sol.alternative || "", resistance: idea.resistance || "",
        whyNow: idea.whyNow || "", competitorType: idea.competitorType || "", evidenceMethods: idea.evidenceMethods || [], interviews: ev.interviews || 0,
        surveys: ev.surveyResponses || 0, willing: ev.willingToTest || 0, testers: ev.testers || 0,
        pilots: ev.pilotPartners || 0, orders: ev.preOrders || 0, customers: ev.customers || 0,
        revenue: ev.revenueToDate || 0, mentors: ev.mentorsConsulted || 0, lois: ev.lettersOfIntent || 0,
        marketWho: sol.marketWho || "", marketSize: num(sol.marketSize), marketSource: sol.marketSource || "",
        solution: sol.solution || "", advantage: sol.advantage || "", whyUs: idea.whyUs || "",
        revenueModels: sol.revenueModels || (sol.revenue ? [sol.revenue] : []), channels: sol.channels || [],
        price: sol.price || 0, unitCost: sol.unitCost || 0, milestone: sol.milestone12mo || "",
        sdgMode: htmlSdgMode(sm.mode), sdgs: (sm.entries || []).map((e) => e.goalNumber),
        impactLine: sm.howImpact || "", impactIndicator: sm.indicators?.[0]?.indicator || "",
        impactTarget: sm.indicators?.[0]?.target12mo || "", helpImpact: sm.helpImpact || "",
        responsibility: sm.responsibility || [], support: ev.openTo || [], risk: ev.risk || "",
        mitigation: ev.mitigation || "", assumption: ev.assumption || "", reflection: ev.reflection || "",
        investorOptIn: !!entry.publishSettings?.acceptIntros, consent: !!entry.reviewPipeline?.declarationConsent,
        askAmount: ev.fundingSought || 0, askUse: ev.useOfFunds || "",
    };
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={clsx("mb-4 rounded-[18px] border border-[#e5e7eb] bg-[#fffdfb] p-5 shadow-[0_7px_22px_rgba(15,23,42,.045)]", className)}>{children}</div>;
}

function PhonePair({ code, number, onCode, onNumber }: { code?: string; number?: string; onCode: (v: string) => void; onNumber: (v: string) => void }) {
    const listed = PHONE_CODES.includes(code || "+92");
    return (
        <div>
            <div className="grid grid-cols-[84px_minmax(0,1fr)] gap-1.5">
                <select className={vsField} value={listed ? code || "+92" : "other"} onChange={(e) => onCode(e.target.value)}>
                    {PHONE_CODES.map((c) => <option key={c} value={c}>{c === "other" ? "Other" : c}</option>)}
                </select>
                <input className={vsField} type="tel" inputMode="tel" placeholder="3001234567" value={number || ""} onChange={(e) => onNumber(e.target.value.replace(/[^\d]/g, ""))} />
            </div>
            {!listed || code === "other" ? (
                <input className={clsx(vsField, "mt-2")} value={listed && code !== "other" ? "" : code || ""} onChange={(e) => onCode(e.target.value)} placeholder="Type country code, e.g. +33" />
            ) : null}
            <p className="mt-1 text-[10.5px] leading-snug text-[#8b7284]">Numbers only after country code, e.g. +92 · 3001234567.</p>
        </div>
    );
}

function updateTeam(entry: VentureEntry, i: number, patch: Partial<TeamMember>, setEntry: (fn: (s: VentureEntry) => VentureEntry) => void) {
    const current = entry.team.length ? entry.team : [{ name: "", role: "" }];
    const next = [...current];
    next[i] = { ...next[i], ...patch };
    setEntry((s) => ({ ...s, team: next }));
}

function formCategory(pct: number) {
    if (pct <= 0) return "Not Started";
    if (pct <= 25) return "Just Started";
    if (pct < 100) return "In Process";
    return "Complete";
}

function workspaceVentureId(entry: { id?: string; createdAt?: string }) {
    const year = entry.createdAt ? new Date(entry.createdAt).getFullYear() : new Date().getFullYear();
    const tail = (entry.id || "").replace(/-/g, "").slice(-5).toUpperCase() || "00000";
    return `VEN-${year}-${tail}`;
}

export default function StartupBusinessWorkspace() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [entry, setEntry] = useState<VentureEntry>(EMPTY);
    const [step, setStep] = useState(0);
    const [editing, setEditing] = useState(false);
    const [review, setReview] = useState<Record<string, { accepted: boolean; edited: boolean; text: string }>>({});
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [sdgCheck, setSdgCheck] = useState("");
    const [sdgSuggest, setSdgSuggest] = useState<number[]>([]);
    const [repoAck, setRepoAck] = useState(false);
    const [help, setHelp] = useState<import("./VentureStudioHelpModal").VsHelpInitial | null>(null);
    const onTerm = (key: string) => setHelp({ kind: "term", key });

    useEffect(() => {
        authenticatedFetch("/api/v1/paths/startup-business", {}, { redirectToLogin: true })
            .then((res) => (res?.ok ? res.json() : null))
            .then((result) => {
                if (result?.data) {
                    const data = result.data as Partial<VentureEntry>;
                    const merged = mergeEntry(EMPTY, data);
                    setEntry(merged);
                    const raw = data.stepCompleted ?? 0;
                    const mapped = loadWorkspaceStep(raw, merged.academicSetup?.formVersion);
                    const stepRaw = searchParams.get("step");
                    const requested = stepRaw == null || stepRaw === "" ? Number.NaN : Number(stepRaw);
                    setStep(Number.isInteger(requested) && requested >= 0 && requested <= mapped ? requested : mapped);
                    if (merged.reviewPipeline?.declarationWork) setRepoAck(true);
                }
            })
            .finally(() => setLoading(false));
    }, []);

    const snap = useMemo(() => toSnap(entry), [entry]);
    const sums = useMemo(() => v11Summaries(snap), [snap]);
    const compass = useMemo(() => compassScores(snap), [snap]);
    const score = useMemo(() => venturePotentialScore(snap), [snap]);
    const pct = useMemo(() => progressPercent(snap), [snap]);
    const weakest = (Object.entries(compass) as [keyof typeof compass, number][]).sort((a, b) => a[1] - b[1])[0]?.[0] ?? "problem";
    const isOwner = entry.isOwner !== false;
    const as = entry.academicSetup || {};
    const idea = entry.ideaInfo || {};
    const sol = entry.solutionInfo || {};
    const ev = entry.evidenceInfo || {};
    const sm = entry.sdgMapping || {};
    const picked = sm.entries ?? [];
    const stage = snap.stage;
    const early = !stage || stage === "Idea Recorded" || stage === "Business Plan Completed";
    const proto = stage === "Prototype Developed" || stage === "Pilot in Progress";
    const investorOn = !!entry.publishSettings?.acceptIntros;
    const isRevision = entry.reviewPipeline?.supervisorStatus === "revisions_requested";
    const lockedSubmitted = entry.status === "submitted" && !isRevision && !editing;
    const showCard = lockedSubmitted || !isOwner;
    const price = sol.price || 0;
    const unitCost = sol.unitCost || 0;
    const unlocked = loadWorkspaceStep(entry.stepCompleted, as.formVersion);
    const health = teamHealthLabel({ paceScore: ev.paceScore, burnoutSigns: ev.burnoutSigns, burnoutPlan: ev.burnoutPlan });
    const ltv = price > 0 && sol.purchaseFreq && sol.retentionYears ? price * sol.purchaseFreq * sol.retentionYears : 0;
    const cacVal = sol.cac || (sol.mktBudget && sol.newCustMonth ? Math.round(sol.mktBudget / sol.newCustMonth) : undefined);
    const vcItems = vcChecklist({
        problem: snap.problem, customer: snap.customer, traction: tractionCount(snap), wtpEvidence: idea.wtpEvidence,
        marketSize: snap.marketSize, marketSource: sol.marketSource, competitors: (idea.competitors || []).filter((r) => r.name?.trim()).length,
        advantage: snap.advantage, whyUs: snap.whyUs, revenueModels: snap.revenueModels, price, unitCost,
        channels: snap.channels, mktBudget: sol.mktBudget, primaryChannel: sol.primaryChannel, cac: cacVal, ltv,
        budgetLines: (sol.budgetLines || []).filter((r) => r.category && (r.amount || 0) > 0).length,
        monthlyCosts: sol.monthlyCosts, cashOnHand: sol.cashOnHand, monthlyRevenue: sol.monthlyRevenue,
        raisePlan: sol.raisePlan, askAmount: ev.fundingSought, askUse: ev.useOfFunds,
        deliveryModel: sol.deliveryModel, capacity: sol.capacity, bottleneck: sol.bottleneck, vision35: ev.vision35,
        teamFit: as.teamFit, equitySplit: as.equitySplit,
        riskMit: (ev.riskRows || []).filter((r) => r.description?.trim() && r.mitigation?.trim()).length,
        teamHealth: health, milestone: sol.milestone12mo,
    });
    const vcOk = vcItems.filter((i) => i.ok).length;
    const uofText = [
        sol.uofProduct && `${sol.uofProduct}% product`,
        sol.uofOps && `${sol.uofOps}% ops`,
        sol.uofMarketing && `${sol.uofMarketing}% marketing`,
        sol.uofTeam && `${sol.uofTeam}% team`,
        sol.uofLegal && `${sol.uofLegal}% legal`,
        sol.uofContingency && `${sol.uofContingency}% buffer`,
    ].filter(Boolean).join(", ");
    const plan = buildVenturePlanSections({
        name: snap.name, pitch: snap.pitch, uni: snap.uni, discipline: as.program || "", city: idea.city || "",
        stage: snap.stage, founder: snap.founder, founderRole: snap.founderRole, facultyName: snap.facultyName,
        origin: as.origin || "", legalStatus: as.legalStatus || "", commitment: as.commitment || "",
        team: (entry.team || []).filter((t) => t.name?.trim()), skills: as.skills || [], skillGap: as.skillGap || "",
        equitySplit: as.equitySplit || "", advisors: as.advisors || "", teamFit: as.teamFit || "", founderInsight: as.founderInsight || "",
        problem: snap.problem, customer: snap.customer, segment: idea.customerSegment || "", jtbd: idea.jtbd || "",
        frequency: idea.frequency || "", severity: idea.severity || "", trigger: idea.trigger || "",
        alternative: sol.alternative || "", currentSpend: idea.currentSpend, payerDiff: idea.payerDiff || "",
        payerWho: idea.payerWho || "", userWho: idea.userWho || "", evidence: idea.evidenceMethods || [],
        interviews: ev.interviews || 0, surveys: ev.surveyResponses || 0, willing: ev.willingToTest || 0,
        wtpEvidence: idea.wtpEvidence || "", customerQuote: idea.customerQuote || "",
        marketWho: sol.marketWho || "", marketSize: snap.marketSize, tam: idea.tam || 0, som: idea.som || 0,
        marketSource: sol.marketSource || "", geography: idea.geography || "", marketTrend: idea.marketTrend || "",
        whyNow: idea.whyNow || "", competitorType: idea.competitorType || "", competitionLevel: idea.competitionLevel || "",
        competitors: idea.competitors || [], whyUs: idea.whyUs || "", positioning: idea.positioning || "", resistance: idea.resistance || "",
        solution: sol.solution || "", productStatus: sol.productStatus || "", features: sol.features || "",
        advantage: sol.advantage || "", moatType: sol.moatType || "", ipStatus: sol.ipStatus || "",
        techDependency: sol.techDependency || "", deliveryModel: sol.deliveryModel || "", capacity: sol.capacity || "",
        bottleneck: sol.bottleneck || "", qualityControl: sol.qualityControl || "", scalePlan: sol.scalePlan || "",
        partners: sol.partners || "", roadmap: sol.roadmap || "", demoUrl: sol.demoUrl || "",
        revenueModels: snap.revenueModels, price, purchaseFreq: sol.purchaseFreq, retentionYears: sol.retentionYears,
        pricingStrategy: sol.pricingStrategy || "", pricingTested: sol.pricingTested || "", channels: snap.channels,
        primaryChannel: sol.primaryChannel || "", salesMotion: sol.salesMotion || "", salesCycle: sol.salesCycle || "",
        keyMessage: sol.keyMessage || "", mktBudget: sol.mktBudget, newCustMonth: sol.newCustMonth, cac: cacVal,
        referral: sol.referral || "", brandAssets: sol.brandAssets || "", repeatPercent: ev.repeatPercent,
        unitCost, fixedCosts: sol.fixedCosts, monthlyRevenue: sol.monthlyRevenue, monthlyCosts: sol.monthlyCosts,
        cashOnHand: sol.cashOnHand, revenueTarget12: sol.revenueTarget12, profitMonth: sol.profitMonth || "",
        mrr: sol.mrr, gmv: sol.gmv, takeRate: sol.takeRate, mau: sol.mau, payingUsers: sol.payingUsers,
        paymentTerms: sol.paymentTerms || "", accounting: sol.accounting || "", finAssumptions: sol.finAssumptions || "",
        numberSourceType: sol.numberSourceType || "", budgetPeriod: sol.budgetPeriod || "", budgetStatus: sol.budgetStatus || "",
        budgetLines: sol.budgetLines || [], fundSources: sol.fundSources || [], raisePlan: sol.raisePlan || "",
        askAmount: ev.fundingSought, askInstrument: sol.askInstrument || "", fundRunway: ev.fundRunway,
        askUse: ev.useOfFunds || "", askOutcome: ev.expectedResult || "", uofText, valuation: ev.valuation,
        equity: ev.equityPercent, exitStrategy: ev.exitStrategy || "", sdgMode: sm.mode || "", sdgs: snap.sdgs,
        sdgNames: SDG_SHORT, impactLine: sm.howImpact || "", helpImpact: sm.helpImpact || "",
        impactIndicator: sm.indicators?.[0]?.indicator || "", impactTarget: sm.indicators?.[0]?.target12mo || "",
        responsibility: sm.responsibility || [], assumption: ev.assumption || "", regBarrier: ev.regulatoryBarrier || "",
        paceScore: ev.paceScore || "", otherCommit: ev.otherCommit || "", burnoutSigns: ev.burnoutSigns || [],
        keyPerson: ev.keyPerson || "", burnoutPlan: ev.burnoutPlan || "", hiringNeed: ev.hiringNeed || "",
        riskRows: ev.riskRows || [], milestone: sol.milestone12mo || "", plan90: ev.plan90 || "",
        support: ev.openTo || [], vision35: ev.vision35 || "", reflection: ev.reflection || "",
        score, evidenceLabel: evidenceLabel(snap), financialReadiness: financialReadiness({ price: sol.price, unitCost: sol.unitCost, budgetLines: sol.budgetLines, cashOnHand: sol.cashOnHand, monthlyCosts: sol.monthlyCosts, finAssumptions: sol.finAssumptions }),
        teamHealth: health, vcLabel: `${vcOk}/${vcItems.length}`,
    });
    const copyPlan = async () => {
        const text = [`${snap.name || "Untitled venture"} — Business Plan`, plan.meta, "", ...plan.sections.flatMap((s) => [s.title, s.body || (s.gap ? `Missing: ${s.gap}` : ""), ""]), plan.footer].join("\n");
        try {
            await navigator.clipboard.writeText(text);
            toast.success("Business plan copied");
        } catch {
            toast.error("Select the plan text and copy it manually.");
        }
    };
    const printPlan = () => {
        const html = `<!DOCTYPE html><html><head><title>${(snap.name || "Venture")} — Business Plan</title><style>body{font-family:Georgia,serif;max-width:780px;margin:24px auto;color:#1e2130;padding:0 18px}h1{font-size:22px}h2{font-size:15px;margin:22px 0 8px;color:#32133a}p,.gap{font-size:13px;line-height:1.55}.meta,.foot{font-size:11px;color:#6b7280}.gap{color:#9b6712;background:#fff8e8;padding:8px 10px;border-radius:8px}</style></head><body><h1>${(snap.name || "Untitled venture")} — Business Plan</h1><div class="meta">${plan.meta}</div>${plan.sections.map((s) => `<h2>${s.title}</h2>${s.body ? `<p>${s.body.replace(/</g, "&lt;")}</p>` : ""}${s.gap ? `<div class="gap">Missing: ${s.gap}</div>` : ""}`).join("")}<p class="foot">${plan.footer}</p></body></html>`;
        const w = window.open("", "_blank");
        if (!w) return;
        w.document.write(html);
        w.document.close();
        w.focus();
        w.print();
    };

    const patchGroup = <K extends keyof VentureEntry>(key: K, patch: Partial<NonNullable<VentureEntry[K]>>) => {
        setEntry((e) => ({ ...e, [key]: { ...(e[key] as object), ...patch } }));
    };

    const save = async (patch: Partial<VentureEntry>, advanceTo?: number) => {
        setSaving(true);
        setError(null);
        const mapped = loadWorkspaceStep(entry.stepCompleted, as.formVersion);
        const nextStepCompleted = advanceTo !== undefined
            ? Math.max(mapped, Math.min(V13_LAST_STEP, advanceTo))
            : Math.max(entry.stepCompleted, mapped);
        try {
            const res = await authenticatedFetch(
                "/api/v1/paths/startup-business",
                { method: "PATCH", body: JSON.stringify({ ...patch, stepCompleted: nextStepCompleted }) },
                { redirectToLogin: true },
            );
            if (!res) {
                throw new Error("Could not reach the server. Check your connection and try again.");
            }
            if (!res.ok) {
                const text = (await res.text().catch(() => "")) || "";
                let detail = text.trim();
                try {
                    const parsed = JSON.parse(text) as { message?: string | string[] };
                    if (typeof parsed.message === "string") detail = parsed.message;
                    else if (Array.isArray(parsed.message)) detail = parsed.message.join(" ");
                } catch {
                    /* raw text */
                }
                throw new Error(detail.slice(0, 240) || `Could not save your progress (HTTP ${res.status}).`);
            }
            const result = await res.json().catch(() => null);
            if (!result?.data) throw new Error("Could not save your progress — unexpected response.");
            setEntry((e) => mergeEntry(e, result.data as Partial<VentureEntry>));
            if (advanceTo !== undefined) setStep(Math.min(V13_LAST_STEP, advanceTo));
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Could not save your progress";
            setError(message);
            toast.error(message);
            return false;
        } finally {
            setSaving(false);
        }
    };

    const saveAllFields = (): Partial<VentureEntry> => {
        const origin = as.origin || "";
        const mapped = ORIGIN_TO_SUBMISSION[origin];
        const team = (entry.team || []).filter((t) => t.name?.trim()).map((t) => ({
            name: t.name.trim(), role: t.role?.trim() || "Team member",
            email: t.email?.trim() || undefined, whatsappCode: t.whatsappCode, whatsappNumber: t.whatsappNumber,
            commitment: t.commitment?.trim() || undefined,
        }));
        return {
            ventureName: entry.ventureName || undefined,
            description: idea.pitch || entry.description || undefined,
            stage: normalizeV11Stage(entry.stage) || undefined,
            team,
            academicSetup: { ...as, formVersion: V13_FORM_VERSION, submissionType: mapped || as.submissionType, submissionTypes: mapped ? [mapped] : as.submissionTypes, faculty: as.facultyRole || as.faculty },
            ideaInfo: { ...idea, customer: idea.customer, userWho: idea.customer || idea.userWho },
            solutionInfo: { ...sol, revenue: (sol.revenueModels || []).join(" + ") || sol.revenue, costPerSale: sol.unitCost != null ? String(sol.unitCost) : sol.costPerSale, marketSize: sol.marketSize },
            sdgMapping: sm, evidenceInfo: ev, reviewPipeline: entry.reviewPipeline ?? undefined,
            publishSettings: { ...entry.publishSettings, audience: entry.publishSettings?.acceptIntros ? "investors" : entry.publishSettings?.audience || "university" },
            teamConsent: entry.teamConsent ?? undefined,
        };
    };

    const handleDocFile = async (file: File, type: string) => {
        if (uploading) return;
        setUploading(type);
        setError(null);
        try {
            const publicUrl = await uploadFileViaPresign("/api/v1/paths/evidence/presign", file);
            const res = await authenticatedFetch("/api/v1/paths/startup-business/documents", { method: "POST", body: JSON.stringify({ type, fileUrl: publicUrl }) }, { redirectToLogin: true });
            const result = res?.ok ? await res.json() : null;
            if (result?.data?.documents) setEntry((e) => ({ ...e, documents: result.data.documents }));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed. Try again.");
        } finally {
            setUploading(null);
        }
    };

    useEffect(() => {
        if (step !== 8) return;
        setReview((prev) => {
            const next = { ...prev };
            for (const block of REVIEW_BLOCKS) {
                const existing = next[block.key];
                if (!existing || (!existing.accepted && !existing.edited)) {
                    next[block.key] = { accepted: false, edited: false, text: entry.sectionSummaries?.[block.key] || sums[block.key] || "" };
                }
            }
            return next;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    const goNext = async (to: number) => {
        await save(saveAllFields(), to);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const toggleSdg = (n: number) => {
        const exists = picked.some((p) => p.goalNumber === n);
        if (exists) patchGroup("sdgMapping", { entries: picked.filter((p) => p.goalNumber !== n), mode: "map" });
        else if (picked.length < 3) patchGroup("sdgMapping", { entries: [...picked, { goalNumber: n, targets: [] }], mode: "map" });
    };

    const submitVenture = async () => {
        if (!snap.stage || !snap.name || !snap.uni || !snap.founder || !snap.problem || !snap.solution || !snap.facultyName || !as.supervisorEmail || !snap.facultyRole) {
            setError("Please complete the core fields: stage, venture name, university, founder, problem, solution, and faculty name / email / role.");
            return;
        }
        if (REVIEW_BLOCKS.filter((b) => review[b.key]?.accepted).length < 5) {
            setError("Please accept or edit all five AI summaries before submitting.");
            return;
        }
        if (!repoAck) {
            setError("Please confirm that this Venture Profile is a mandatory university repository record.");
            return;
        }
        const ok = await save({
            ...saveAllFields(), status: "submitted",
            sectionSummaries: {
                founder: review.founder?.text || sums.founder, opportunity: review.opportunity?.text || sums.opportunity,
                business: review.business?.text || sums.business, impact: review.impact?.text || sums.impact,
                ask: review.ask?.text || sums.ask, advantage: snap.advantage,
                traction: validationLine(snap) === "—" ? "" : validationLine(snap),
            },
            reviewPipeline: {
                ...entry.reviewPipeline, declarationWork: true,
                declarationConsent: investorOn ? !!entry.reviewPipeline?.declarationConsent : true,
                studentDeclaredAt: new Date().toISOString(), supervisorStatus: "pending", universityStatus: "pending",
                sdgReviewStatus: sm.mode === "map" || sm.mode === "review" ? "pending" : entry.reviewPipeline?.sdgReviewStatus,
            },
        }, 8);
        if (ok) setEditing(false);
    };

    const greetName = (() => {
        const user = readStoredCurrentUser();
        const n = typeof user?.name === "string" ? user.name.split(" ")[0] : "";
        return n || "";
    })();
    const hasDraft = !!(entry.ventureName || (entry.stepCompleted ?? 0) > 0 || entry.status === "submitted");
    const sup = entry.reviewPipeline?.supervisorStatus;
    const heroStats = [
        { value: String(entry.status === "submitted" && sup === "approved" ? 1 : 0), label: "APPROVED", href: "/dashboard/student/paths/startup-business?view=wall" },
        { value: String(entry.status === "submitted" && (!sup || sup === "pending") ? 1 : 0), label: "UNDER REVIEW", href: "/dashboard/student/paths/startup-business?view=under-review" },
        { value: String((entry.status !== "submitted" || sup === "revisions_requested") && hasDraft ? 1 : 0), label: "IN PROGRESS", href: "/dashboard/student/paths/startup-business?view=in-progress" },
    ];
    const createTitle = isRevision
        ? `🚀 Revise venture — ${entry.ventureName || "Untitled venture"}`
        : hasDraft
            ? `🚀 Continue — ${entry.ventureName || "Untitled venture"}`
            : "🚀 Create Startup Record";
    const createSub = hasDraft
        ? `${workspaceVentureId(entry)} · every change auto-saves to your Startup Workspace and updates the completion bar your faculty, university and CIEL PK see.`
        : "Saving your first fields issues a Venture ID and creates one master record shared with your team, faculty, university and CIEL PK — never duplicated. Investor-track consent (Step 8) is recorded with a date and version.";

    if (loading) return <WorkspaceSkeleton />;
    const gates = entry.gates || { academicOk: false, showcaseOk: false, investmentReadyOk: false };
    const docFor = (type: string) => entry.documents.find((d) => d.type === type);
    const teamRows = entry.team.length ? entry.team : [{ name: "", role: "", email: "", whatsappCode: "+92", whatsappNumber: "" }];

    if (showCard) {
        return (
            <div className="mx-auto max-w-[1500px] pb-16">
                <MockupHero
                    kicker="MY PATHS · STARTUP / VENTURE"
                    title={namedTimeGreeting(greetName, "🚀")}
                    subtitle="Build your venture profile section by section, submit your venture card to faculty, collect your approved ventures here — and open the door to investors when you are ready."
                    badge="🎓 STUDENT"
                    stats={heroStats}
                />
                <div className="mx-auto mt-[22px] max-w-[1240px] px-4">
                <div className="space-y-4 rounded-[18px] border border-[#e5e7eb] bg-white p-6 shadow-sm">
                    {!isOwner && <div className="rounded-[13px] border border-[#e2c7d7] bg-[#f8eef4] p-3 text-sm font-semibold text-[#603449]">👥 You&apos;re named as a team member on this venture — the founder owns it and is the only one who can edit or submit changes.</div>}
                    <div className="rounded-[14px] border border-[#b7d8f5] bg-[#e5f1fb] px-4 py-3 text-[13.5px] leading-relaxed text-[#1f6fc2]">
                        This record is locked ({ventureStatusLabel(entry).label}). Only drafts and revision-requested records in your Startup Workspace can be edited.
                    </div>
                    <p className="text-lg font-black text-[#32133a]">{entry.ventureName || "Untitled venture"}</p>
                    <p className="text-sm text-[#6b7280]">{snap.stage || ""} {idea.sector ? `· ${idea.sector}` : ""} {idea.city ? `· ${idea.city}` : ""}</p>
                    <div className="flex flex-wrap gap-2">
                        <span className={clsx("rounded-full px-2.5 py-1 text-[11px] font-bold", gates.academicOk ? "bg-[#fff2d7] text-[#25683a]" : "bg-[#edf0f5] text-[#6b7280]")}>{gates.academicOk ? "✓ Academic submission complete" : "Academic submission incomplete"}</span>
                        <span className={clsx("rounded-full px-2.5 py-1 text-[11px] font-bold", gates.showcaseOk ? "bg-[#f8e8ef] text-[#8b3155]" : "bg-[#edf0f5] text-[#6b7280]")}>{gates.showcaseOk ? "✓ Showcase Ready" : "Showcase locked"}</span>
                    </div>
                    <div className="space-y-3 border-t border-[#e5e7eb] pt-4">
                        {REVIEW_BLOCKS.map((block) => {
                            const text = entry.sectionSummaries?.[block.key];
                            if (!text) return null;
                            return <div key={block.key}><p className="text-xs font-black uppercase tracking-wide text-[#9a8293]">{block.title}</p><p className="mt-0.5 text-sm leading-relaxed text-[#1e293b]">{text}</p></div>;
                        })}
                    </div>
                    {entry.reviewPipeline?.supervisorNote && (entry.reviewPipeline.supervisorStatus === "rejected" || entry.reviewPipeline.supervisorStatus === "revisions_requested") && (
                        <p className="rounded-[13px] border border-[#f2dfa6] bg-[#fff3dc] px-3 py-2 text-xs leading-relaxed text-[#805b13]">📝 Faculty note: “{entry.reviewPipeline.supervisorNote}”</p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-2">
                        <Link href="/dashboard/student/paths/startup-business?view=record" className="rounded-[10px] bg-[#0f8f8a] px-3 py-1.5 text-[12.5px] font-bold text-white">
                            View Venture Card
                        </Link>
                        <Link href="/dashboard/student/paths/startup-business" className="rounded-[10px] bg-[#eef3f6] px-3 py-1.5 text-[12.5px] font-bold text-[#0b4b57]">
                            ← Back to Startup / Venture
                        </Link>
                    </div>
                </div>
                </div>
            </div>
        );
    }

    return (
        <div className="pb-20">
            <div className="mx-auto max-w-[1500px] px-[18px]">
                <MockupHero
                    kicker="MY PATHS · STARTUP / VENTURE"
                    title={namedTimeGreeting(greetName, "🚀")}
                    subtitle="Build your venture profile section by section, submit your venture card to faculty, collect your approved ventures here — and open the door to investors when you are ready."
                    badge="🎓 STUDENT"
                    stats={heroStats}
                />
                <div className="mt-[22px] mb-4 flex flex-wrap items-start gap-3.5 rounded-[22px] bg-white p-[22px_26px] shadow-[0_8px_30px_rgba(10,30,40,.08)]">
                    <div className="min-w-0 flex-1">
                        <h3 className="m-0 text-[22px] font-bold text-[#14212b]">{createTitle}</h3>
                        <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#5d6c78]">{createSub}</p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-[#eef3f6] px-2.5 py-1 text-[12px] font-bold text-[#0b4b57]">
                        {pct}% · {formCategory(pct)}
                    </span>
                    <button
                        type="button"
                        onClick={() => router.push("/dashboard/student/paths/startup-business?view=create")}
                        className="rounded-xl bg-[#0f8f8a] px-4 py-2.5 text-[13.5px] font-bold text-white hover:brightness-105"
                    >
                        ＋ Create New Opportunity
                    </button>
                </div>
                {isRevision && entry.reviewPipeline?.supervisorNote ? (
                    <div className="mb-4 rounded-[14px] border border-[#f5c2be] bg-[#fdecea] px-4 py-3 text-[13.5px] leading-relaxed">
                        <b>Faculty requested revision:</b> {entry.reviewPipeline.supervisorNote}
                    </div>
                ) : null}
            </div>
        <div className="mx-auto max-w-[1260px] px-[18px] pt-0 [&_h3.sec]:flex [&_h3.sec]:items-center [&_h3.sec]:gap-2 [&_h3.sec]:rounded-r-[10px] [&_h3.sec]:border-l-4 [&_h3.sec]:border-[#e2cbd7] [&_h3.sec]:bg-[#faf6f8] [&_h3.sec]:px-3 [&_h3.sec]:py-2.5">
            <header className="sticky top-0 z-[40] mb-4 rounded-b-[18px] bg-gradient-to-br from-[#32133a] to-[#5a244f] text-white shadow-[0_8px_24px_rgba(50,19,58,.2)]">
                <div className="flex items-center gap-3.5 px-[18px] pb-2 pt-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-white/14 text-[17px]">✦</div>
                        <div className="min-w-0">
                            <small className="block text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-[#e9c9d8]">CIEL PK · Venture Studio</small>
                            <b className="block truncate text-sm">Student Venture Profile</b>
                </div>
                    </div>
                    <div className="hidden min-w-0 flex-1 text-center sm:block">
                        <small className="block text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-[#e9c9d8]">You are working on</small>
                        <b className="block truncate text-sm">Step {step + 1} · {V13_STEPS[step]?.label}</b>
                    </div>
                    <div className="ml-auto flex shrink-0 items-center gap-2">
                        <div className="relative flex h-10 w-10 items-center justify-center rounded-full text-[10px] font-black" style={{ background: `conic-gradient(#f0a8c4 ${pct}%, rgba(255,255,255,.15) 0)` }}>
                            <span className="absolute inset-1 rounded-full bg-[#5a244f]" />
                            <span className="relative">{pct}%</span>
                        </div>
                        <button type="button" className="whitespace-nowrap rounded-full border border-white/20 bg-white/14 px-2.5 py-2 text-[11.5px] font-extrabold" onClick={() => setHelp({ kind: "help", tab: "data" })}>📍 Where to get data</button>
                        <button type="button" className="whitespace-nowrap rounded-full border border-white bg-white px-2.5 py-2 text-[11.5px] font-extrabold text-[#32133a]" onClick={() => setHelp({ kind: "glossary" })}>📖 Jargon buster</button>
                    </div>
                </div>
                <div className="flex gap-1.5 overflow-x-auto px-3.5 pb-2.5">
                    {V13_STEPS.map((s, i) => (
                        <button
                            key={s.key}
                            type="button"
                            onClick={() => i <= unlocked && setStep(i)}
                            disabled={i > unlocked}
                            className={clsx(
                                "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1.5 text-[10.5px] font-extrabold",
                                step === i ? "border-white bg-white text-[#7d2b4d]" : i < unlocked ? "border-[rgba(120,220,170,.3)] bg-[rgba(120,220,170,.18)] text-[#d8f5e6]" : "border-white/14 bg-white/8 text-[#e6d6de]",
                            )}
                        >
                            <span className={clsx("inline-flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px]", step === i ? "bg-[#a63d65] text-white" : i < unlocked ? "bg-[#3fae7a] text-white" : "bg-white/16 text-white")}>{s.n}</span>
                            {s.label}
                        </button>
                    ))}
                </div>
            </header>
            <VsHelpModal key={help ? JSON.stringify(help) : "closed"} open={!!help} initial={help} onClose={() => setHelp(null)} />

            {isRevision && entry.reviewPipeline?.supervisorNote ? (
                <div className="mb-4 rounded-[14px] border border-[#f5c2be] bg-[#fdecea] px-4 py-3 text-[13.5px] leading-relaxed">
                    <b>Faculty requested revision:</b> {entry.reviewPipeline.supervisorNote}
                </div>
            ) : null}

            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
                <main>
                    {step === 0 ? (
                    <Card className="bg-gradient-to-br from-white to-[#fdf5f9]">
                        <h1 className="mb-1.5 text-[26px] font-black leading-tight text-[#32133a]">Build a Venture Worth Remembering ✦</h1>
                        <p className="m-0 max-w-[820px] text-[13.5px] leading-relaxed text-[#5b4a55]">Turn a class idea, business plan, FYP or operating startup into a strong university venture record — and walk away with a complete business plan. Every business word is explained with a student example: tap any <VsTerm term="jargon" onTerm={onTerm}>dotted term</VsTerm> or the ? icon. Every blank shows a hidden example to guide you.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {["9 guided steps", "Core: ~25–35 min", "Investor track: opt-in only", "Business plan generated at the end"].map((b) => <span key={b} className="rounded-full border border-[#ecd9e3] bg-white px-2.5 py-1.5 text-[11px] font-extrabold text-[#7d2b4d]">{b}</span>)}
                        </div>
                        <div className="mt-3 rounded-[12px] border border-[#ecd9e3] bg-white px-3.5 py-2.5 text-xs leading-relaxed text-[#5b4a55]"><b>University Venture Repository — Mandatory:</b> this Venture Profile is part of your university record and must be submitted whether the venture is early, average, high-potential, SDG-linked or not. <b>Investor / VC exposure is completely optional</b> and controlled separately by you. <b>Do not guess:</b> leave optional figures blank when they are not yet known — “not known yet” scores better than invented numbers.</div>
                        <div className="mt-3 h-[9px] overflow-hidden rounded-full bg-[#ece7ea]"><span className="block h-full bg-gradient-to-r from-[#a63d65] to-[#d98aa8]" style={{ width: `${pct}%` }} /></div>
                        <p className="mt-2 text-right text-[10.5px] text-[#8b93a3]">{saving ? "Saving…" : "Draft autosaves in this browser and to your university record."}</p>
                    </Card>
                    ) : null}

                    {step === 0 && (
                        <>
                            <Card>
                                <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#a63d65]">Step 1 · Venture & team</div>
                                <h2 className="mb-1 text-[23px] font-black text-[#32133a]">Where does your idea stand today?</h2>
                                <p className="mb-4 text-[13px] leading-relaxed text-[#6b7280]">Pick the honest stage. An idea is assessed as an idea; a running business is assessed as a running business.</p>
                                <VsWhy icon="💡"><b>No pressure to look “advanced.”</b> The AI assessment changes with your stage, so early projects are not penalized for not having revenue or customers yet.</VsWhy>
                                <VsExplain summary="📖 What do these stages mean? (with examples)">
                                    <p className="mb-2"><b>Early idea</b> — you have a concept but nothing built or tested. <VsEx><b>Example:</b> “We think hostel students would pay for home-cooked meal delivery.”</VsEx></p>
                                    <p className="mb-2"><b>Business plan</b> — the idea is written down with customer, pricing and costs, but nothing is launched. <VsEx><b>Example:</b> a 20-page ENT-301 plan with a budget, but no sales yet.</VsEx></p>
                                    <p className="mb-2"><b>Prototype / <VsTerm term="mvp" onTerm={onTerm}>MVP</VsTerm></b> — a first, rough version exists that people can see or touch. <VsEx><b>Example:</b> a Figma app mock-up, a stitched sample bag, or a WhatsApp ordering group.</VsEx></p>
                                    <p className="mb-2"><b>Pilot</b> — real users are trying it in a limited, controlled way. <VsEx><b>Example:</b> 30 students used the app for 4 weeks in one hostel and gave feedback.</VsEx></p>
                                    <p className="mb-2"><b>Operating</b> — you have real customers paying money, repeatedly. <VsEx><b>Example:</b> PKR 80,000 of sales in the last 3 months from 45 customers.</VsEx></p>
                                    <p><b>Scaling</b> — the model works and you are growing into new cities, segments or products. <VsEx><b>Example:</b> profitable in Lahore, now opening Karachi.</VsEx></p>
                                </VsExplain>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                    {V11_STAGES.map((s) => <VsChoice key={s.id} emoji={s.emoji} title={s.title} blurb={s.blurb} selected={stage === s.id} onClick={() => setEntry((e) => ({ ...e, stage: s.id }))} />)}
                                </div>
                                <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <VsField label="When did you start working on this?" optional><input className={vsField} type="month" value={as.startDate || ""} onChange={(e) => patchGroup("academicSetup", { startDate: e.target.value })} /></VsField>
                                    <VsField label="Hours per week the team currently spends on it" optional><select className={vsField} value={as.hoursWeek || ""} onChange={(e) => patchGroup("academicSetup", { hoursWeek: e.target.value })}><option value="">Choose…</option>{HOURS_WEEK.map((o) => <option key={o}>{o}</option>)}</select></VsField>
                                </div>
                            </Card>
                            <Card>
                                <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#a63d65]">Start faster</div>
                                <h2 className="mb-1 text-[23px] font-black text-[#32133a]">Already have a business plan or pitch deck?</h2>
                                <p className="mb-4 text-[13px] leading-relaxed text-[#6b7280]">Upload it here. In production, CIEL AI can extract the venture name, problem, customer, business model, market, SDG references and other fields for you to confirm.</p>
                                <label className={clsx("mb-3 block cursor-pointer rounded-2xl border-2 border-dashed border-[#bfc6d7] bg-[#fbfcff] p-5 text-center hover:border-[#a63d65]", uploading && "pointer-events-none opacity-60")}>
                                    <input type="file" className="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void handleDocFile(file, "Full business plan"); }} />
                                    📎 <strong className="text-[#a63d65]">Upload business plan / pitch deck</strong><br /><span className="text-[11.5px] text-[#6b7280]">PDF, Word or PowerPoint · optional</span>
                                    {uploading === "Full business plan" ? <div className="mt-2 text-xs font-extrabold text-[#9b6712]">Uploading…</div> : null}
                                    {docFor("Full business plan") ? <div className="mt-2 text-xs font-extrabold text-[#25683a]">✅ Plan uploaded</div> : null}
                                </label>
                                <VsNotice tone="blue">✨ <b>Student-friendly AI prefill:</b> the system suggests answers from the uploaded plan, but you must confirm or edit them before submission.</VsNotice>
                            </Card>
                            <Card>
                                <h2 className="mb-2 text-[23px] font-black text-[#32133a]">Tell us the basics</h2>
                                <VsNotice tone="rose">🎓 <b>Faculty connection — required.</b> Select the faculty member / supervisor responsible for this venture record. After submission, the opportunity routes to that faculty member for section-by-section review, evidence verification and approval.</VsNotice>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <VsField label="Faculty / supervisor name" tag="required"><input className={vsField} value={as.supervisorName || ""} onChange={(e) => patchGroup("academicSetup", { supervisorName: e.target.value })} placeholder="Full name" /></VsField>
                                    <VsField label="Faculty university email" tag="required"><input className={vsField} type="email" value={as.supervisorEmail || ""} onChange={(e) => patchGroup("academicSetup", { supervisorEmail: e.target.value })} placeholder="faculty@university.edu" /></VsField>
                                    <VsField label="Faculty role" tag="required"><VsSelectOther value={as.facultyRole || ""} options={FACULTY_ROLES} onChange={(v) => patchGroup("academicSetup", { facultyRole: v })} /></VsField>
                                    <VsField label="Course / project / section" optional><input className={vsField} value={as.courseRef || as.courseCode || ""} onChange={(e) => patchGroup("academicSetup", { courseRef: e.target.value, courseCode: e.target.value })} placeholder="e.g. ENT-301 · Section A / FYP-402" /></VsField>
                                </div>
                                <p className="my-3 rounded-md border-l-[3px] border-[#c27698] bg-[#fff7fa] px-2.5 py-2 text-[11px] leading-relaxed text-[#7d6677]"><b>Core fields</b> create the repository record. Everything labelled optional can be left blank if you do not know it yet. “Not known yet” is better than invented numbers.</p>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <VsField label="Venture / business name" tag="core"><input className={vsField} value={entry.ventureName || ""} onChange={(e) => setEntry((s) => ({ ...s, ventureName: e.target.value }))} placeholder="e.g. EcoPack Pakistan" /></VsField>
                                    <VsField label="One-line description" tag="core" term="one-liner" onTerm={onTerm} hint="Formula: [what you offer] for [who] so they can [benefit]."><input className={vsField} maxLength={150} value={idea.pitch || ""} onChange={(e) => patchGroup("ideaInfo", { pitch: e.target.value })} placeholder="e.g. Compostable packaging made from crop waste for food SMEs" /></VsField>
                                    <VsField label="University" tag="core"><SearchableSelect value={as.university || ""} onChange={(v) => patchGroup("academicSetup", { university: v })} options={pakistaniUniversities} placeholder="Select university…" /></VsField>
                                    <VsField label="Discipline / programme" tag="core"><VsSelectOther value={as.program || ""} options={DISCIPLINES} onChange={(v) => patchGroup("academicSetup", { program: v })} placeholder="Select discipline…" /></VsField>
                                    <VsField label="Degree level" optional><VsSelectOther value={as.degreeLevel || ""} options={DEGREE_LEVELS} onChange={(v) => patchGroup("academicSetup", { degreeLevel: v })} /></VsField>
                                    <VsField label="City where the venture operates" optional><input className={vsField} value={idea.city || ""} onChange={(e) => patchGroup("ideaInfo", { city: e.target.value })} placeholder="e.g. Lahore" /></VsField>
                                    <VsField label="How did this project originate?" tag="core"><VsSelectOther value={as.origin || ""} options={ORIGINS} onChange={(v) => patchGroup("academicSetup", { origin: v })} /></VsField>
                                    <VsField label="What are you building?" tag="core"><VsSelectOther value={as.ventureType || ""} options={VENTURE_TYPES} onChange={(v) => patchGroup("academicSetup", { ventureType: v })} placeholder="Choose venture type…" /></VsField>
                                    <VsField label="Industry / sector" optional><VsSelectOther value={idea.sector || ""} options={SECTORS_V11} onChange={(v) => patchGroup("ideaInfo", { sector: v })} /></VsField>
                                    <VsField label="Registration / legal status" optional term="legal-status" onTerm={onTerm}><VsSelectOther value={as.legalStatus || ""} options={LEGAL_STATUSES} onChange={(v) => patchGroup("academicSetup", { legalStatus: v })} placeholder="Choose if known…" /></VsField>
                                    <VsField label="Website / social handle" optional><input className={vsField} value={as.website || ""} onChange={(e) => patchGroup("academicSetup", { website: e.target.value })} placeholder="https://… or @instagram / WhatsApp Business" /></VsField>
                                </div>
                                <h3 className="sec mb-2.5 mt-4 text-sm font-black text-[#32133a]">👥 Founder / team</h3>
                                <p className="mb-3 rounded-xl border border-[#ecdde5] bg-[#f9f1f5] px-3 py-2.5 text-[11px] leading-relaxed text-[#6f5568]">👥 <b>One shared venture record.</b> Team members are linked to the same opportunity through their university email and phone number. They should not create duplicate venture submissions.</p>
                                <VsExplain summary="📖 Why investors care about the team more than the idea">
                                    <p>Investors often back the people, not just the idea. They look for <VsTerm term="founder-market-fit" onTerm={onTerm}>founder-market fit</VsTerm>, complementary skills, time commitment, and whether ownership is agreed.</p>
                                    <VsEx><b>Example:</b> A textile-design student who interned with exporters, teamed with a CS student who built the ordering app, is stronger for a B2B apparel platform than three CS students with no industry contact.</VsEx>
                                </VsExplain>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <VsField label="Primary student / founder name" tag="core"><input className={vsField} value={as.founderName || ""} onChange={(e) => patchGroup("academicSetup", { founderName: e.target.value })} placeholder="Full name" /></VsField>
                                    <VsField label="Your role" tag="core"><VsSelectOther value={as.founderRole || ""} options={FOUNDER_ROLES} onChange={(v) => patchGroup("academicSetup", { founderRole: v })} /></VsField>
                                    <VsField label="University email" tag="core" hint="Private contact field — not shown on the public or investor card."><input className={vsField} type="email" value={as.founderEmail || ""} onChange={(e) => patchGroup("academicSetup", { founderEmail: e.target.value })} placeholder="name@university.edu" /></VsField>
                                    <VsField label="Phone / WhatsApp" tag="core"><PhonePair code={as.founderWhatsappCode} number={as.founderWhatsappNumber} onCode={(v) => patchGroup("academicSetup", { founderWhatsappCode: v })} onNumber={(v) => patchGroup("academicSetup", { founderWhatsappNumber: v })} /></VsField>
                                    <VsField label="Your commitment after graduation" optional><VsSelectOther value={as.commitment || ""} options={COMMITMENTS} onChange={(v) => patchGroup("academicSetup", { commitment: v })} /></VsField>
                                    <VsField label="Relevant prior experience" optional><VsSelectOther value={as.priorExp || ""} options={PRIOR_EXP} onChange={(v) => patchGroup("academicSetup", { priorExp: v })} /></VsField>
                                </div>
                                <VsField label="Why is your team well placed to work on this idea?" optional term="founder-market-fit" onTerm={onTerm} hint="Skills, experience, unique access or contacts." example={FIELD_EXAMPLES.teamFit} onUseExample={() => patchGroup("academicSetup", { teamFit: FIELD_EXAMPLES.teamFit })} count={as.teamFit || ""} max={320}><textarea className={clsx(vsField, "min-h-[72px]")} maxLength={320} value={as.teamFit || ""} onChange={(e) => patchGroup("academicSetup", { teamFit: e.target.value })} placeholder="What skills, experience, contacts or access does this team have that outsiders do not?" /></VsField>
                                <VsField label="Founder insight" optional term="founder-insight" onTerm={onTerm} hint="A non-obvious truth you learned from being close to the customer." example={FIELD_EXAMPLES.founderInsight} onUseExample={() => patchGroup("academicSetup", { founderInsight: FIELD_EXAMPLES.founderInsight })} count={as.founderInsight || ""} max={320}><textarea className={clsx(vsField, "min-h-[72px]")} maxLength={320} value={as.founderInsight || ""} onChange={(e) => patchGroup("academicSetup", { founderInsight: e.target.value })} placeholder="What do you understand about this customer or problem that outsiders may be missing?" /></VsField>
                                <VsField label="Skills present in the team today" optional><VsChips options={TEAM_SKILLS} selected={as.skills || []} onToggle={(v) => patchGroup("academicSetup", { skills: toggleChip(as.skills, v) })} otherKey="Other" /></VsField>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <VsField label="Most important skill missing from the team" optional><VsSelectOther value={as.skillGap || ""} options={SKILL_GAPS} onChange={(v) => patchGroup("academicSetup", { skillGap: v })} /></VsField>
                                    <VsField label="Has the team agreed how ownership (equity) is split?" optional term="equity-split" onTerm={onTerm}><VsSelectOther value={as.equitySplit || ""} options={EQUITY_SPLIT} onChange={(v) => patchGroup("academicSetup", { equitySplit: v })} /></VsField>
                                </div>
                                <VsField label="Mentors / advisors supporting the venture" optional><input className={vsField} maxLength={220} value={as.advisors || ""} onChange={(e) => patchGroup("academicSetup", { advisors: e.target.value })} placeholder="e.g. Dr. Ali (faculty), Ms. Khan (industry mentor)" /></VsField>
                                {teamRows.map((m, i) => (
                                    <div key={i} className="mb-2 grid grid-cols-1 items-center gap-2 md:grid-cols-[1fr_.85fr_1.1fr_1.1fr_.85fr_auto]">
                                        <input className={vsField} placeholder="Team member name" value={m.name} onChange={(e) => updateTeam(entry, i, { name: e.target.value }, setEntry)} />
                                        <input className={vsField} placeholder="Role / responsibility" value={m.role} onChange={(e) => updateTeam(entry, i, { role: e.target.value }, setEntry)} />
                                        <input className={vsField} type="email" placeholder="University email" value={m.email || ""} onChange={(e) => updateTeam(entry, i, { email: e.target.value }, setEntry)} />
                                        <PhonePair code={m.whatsappCode || "+92"} number={m.whatsappNumber} onCode={(v) => updateTeam(entry, i, { whatsappCode: v }, setEntry)} onNumber={(v) => updateTeam(entry, i, { whatsappNumber: v }, setEntry)} />
                                        <select className={vsField} value={m.commitment || ""} onChange={(e) => updateTeam(entry, i, { commitment: e.target.value }, setEntry)} aria-label="Commitment">
                                            <option value="">Commitment…</option>
                                            {TEAM_TIME.map((o) => <option key={o}>{o}</option>)}
                                        </select>
                                        <div className="flex items-center gap-1">
                                            <TeamInviteBadge kind="venture" entryId={entry.id} email={m.email} inviteStatus={m.inviteStatus} />
                                            <button type="button" className="text-lg text-[#b83b4d]" onClick={() => setEntry((s) => ({ ...s, team: s.team.filter((_, idx) => idx !== i) }))} title="Remove">×</button>
                                        </div>
                                    </div>
                                ))}
                                <button type="button" className="bg-transparent p-1 text-xs font-black text-[#a63d65]" onClick={() => setEntry((s) => ({ ...s, team: [...(s.team.length ? s.team : []), { name: "", role: "", email: "", whatsappCode: "+92", whatsappNumber: "" }] }))}>+ Add another team member</button>
                                <VsAiBox title="✨ AI summary building live" text={sums.founder} empty="Your venture identity and team summary will appear here." />
                                <VsNav hideBack saving={saving} onNext={() => goNext(1)} nextLabel="Next: Problem & customer →" />
                            </Card>
                        </>
                    )}

                    {step === 1 && (
                        <Card>
                            <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#a63d65]">Step 2 · Problem & customer</div>
                            <h2 className="mb-1 text-[23px] font-black text-[#32133a]">What problem are you solving, and for whom?</h2>
                            <p className="mb-4 text-[13px] leading-relaxed text-[#6b7280]">Reviewers want to understand the need, the exact customer, how painful the problem is, and what evidence you have so far.</p>
                            <VsWhy icon="🔎"><b>Validation can be small.</b> Ten good interviews are better than a made-up “huge market.” Tell us what you actually know today.</VsWhy>
                            <VsExplain summary="📖 Problem statement, ICP, JTBD — what do investors mean?">
                                <p className="mb-2"><b>Problem statement</b> — who has the problem, what happens, and what it costs them.</p>
                                <p className="mb-2"><b><VsTerm term="icp" onTerm={onTerm}>Ideal Customer Profile</VsTerm></b> — the one specific type of customer you will serve first.</p>
                                <p><b><VsTerm term="jtbd" onTerm={onTerm}>Job to be done</VsTerm></b> — what the customer is really trying to achieve.</p>
                            </VsExplain>
                            <VsField label="The problem / unmet need" tag="core" term="problem-statement" onTerm={onTerm} hint="Who · what happens · why it matters. Aim for 2–4 sentences." example={FIELD_EXAMPLES.problem} onUseExample={() => patchGroup("ideaInfo", { problem: FIELD_EXAMPLES.problem })} count={idea.problem || ""} max={600}><textarea className={clsx(vsField, "min-h-[88px]")} maxLength={600} value={idea.problem || ""} onChange={(e) => patchGroup("ideaInfo", { problem: e.target.value })} placeholder="Who has the problem? What happens? What does it cost them in time, money or stress?" /></VsField>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <VsField label="Who is your first, most specific customer (beachhead)?" tag="core" term="beachhead" onTerm={onTerm}><input className={vsField} maxLength={180} value={idea.customer || ""} onChange={(e) => patchGroup("ideaInfo", { customer: e.target.value })} placeholder="e.g. small food manufacturers (5–50 staff) in Lahore" /></VsField>
                                <VsField label="Customer segment" optional><VsSelectOther value={idea.customerSegment || ""} options={CUSTOMER_SEGMENTS} onChange={(v) => patchGroup("ideaInfo", { customerSegment: v })} /></VsField>
                            </div>
                            <VsField label="Customer / buyer model" optional term="b2b-b2c" onTerm={onTerm}><VsChips options={BUYER_MODELS} selected={idea.buyerModels || []} onToggle={(v) => patchGroup("ideaInfo", { buyerModels: toggleChip(idea.buyerModels, v) })} otherKey="Other" /></VsField>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <VsField label="How often does the customer face this problem?" optional><select className={vsField} value={idea.frequency || ""} onChange={(e) => patchGroup("ideaInfo", { frequency: e.target.value })}><option value="">Choose…</option>{PROBLEM_FREQUENCY.map((o) => <option key={o}>{o}</option>)}</select></VsField>
                                <VsField label="How painful is it for them? (1 = minor annoyance, 5 = urgent, costly)" optional>
                                    <div className="flex gap-1.5">{["1","2","3","4","5"].map((n) => <button key={n} type="button" onClick={() => patchGroup("ideaInfo", { severity: n })} className={clsx("flex-1 rounded-full border px-2 py-2 text-xs font-bold", idea.severity === n ? "border-[#a63d65] bg-[#f8e8ef] text-[#087657]" : "border-[#e5e7eb] bg-white text-[#5e6473]")}>{n}</button>)}</div>
                                </VsField>
                                <VsField label="What triggers them to look for a solution?" optional term="trigger" onTerm={onTerm}><VsSelectOther value={idea.trigger || ""} options={TRIGGERS} onChange={(v) => patchGroup("ideaInfo", { trigger: v })} /></VsField>
                                <VsField label="What are they really trying to get done?" optional term="jtbd" onTerm={onTerm}><input className={vsField} maxLength={160} value={idea.jtbd || ""} onChange={(e) => patchGroup("ideaInfo", { jtbd: e.target.value })} placeholder="e.g. stay compliant without paying more" /></VsField>
                            <VsField label="What do they currently use instead?" optional><input className={vsField} maxLength={200} value={sol.alternative || ""} onChange={(e) => patchGroup("solutionInfo", { alternative: e.target.value })} placeholder="e.g. imported plastic packaging" /></VsField>
                                <VsField label="What do they spend on that today?" optional><VsUnit unit="PKR / month" value={idea.currentSpend} onChange={(n) => patchGroup("ideaInfo", { currentSpend: n })} min={0} /></VsField>
                            </div>
                            <VsField label="Is the person paying different from the person using it?">
                                <div className="flex flex-wrap gap-1.5">
                                    {[{ id: "No", label: "No — same person / organization" }, { id: "Yes", label: "Yes — different" }].map((opt) => (
                                        <button key={opt.id} type="button" onClick={() => patchGroup("ideaInfo", { payerDiff: opt.id })} className={clsx("rounded-full border px-3 py-2 text-xs font-bold", idea.payerDiff === opt.id ? "border-[#a63d65] bg-[#f8e8ef] text-[#087657]" : "border-[#e5e7eb] bg-white text-[#5e6473]")}>{opt.label}</button>
                                    ))}
                                </div>
                            </VsField>
                            {idea.payerDiff === "Yes" && (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <VsField label="Who pays?"><input className={vsField} value={idea.payerWho || ""} onChange={(e) => patchGroup("ideaInfo", { payerWho: e.target.value })} placeholder="e.g. parents / school / employer" /></VsField>
                                    <VsField label="Who uses or benefits?"><input className={vsField} value={idea.userWho || ""} onChange={(e) => patchGroup("ideaInfo", { userWho: e.target.value })} placeholder="e.g. students / employees / patients" /></VsField>
                                </div>
                            )}
                            <h3 className="sec mb-2.5 mt-4 text-sm font-black text-[#32133a]">🔬 How do you know the problem is real?</h3>
                            <VsChips options={EVIDENCE_METHODS} selected={idea.evidenceMethods || []} warn={["👁️ Observation only"]} onToggle={(v) => patchGroup("ideaInfo", { evidenceMethods: toggleChip(idea.evidenceMethods, v) })} otherKey="Other evidence" />
                            <p className="my-3 rounded-xl border border-[#ecdde5] bg-[#f9f1f5] px-3 py-2.5 text-[11px] leading-relaxed text-[#6f5568]">Evidence looks different across disciplines: a fashion venture may have prototypes and buyer feedback; a health venture may have technical or clinical validation; deep-tech may have lab results; a service venture may have signed pilots; a creative venture may have audience engagement or commissions.</p>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <VsField label="Interviews completed"><VsUnit unit="people" value={ev.interviews} onChange={(n) => patchGroup("evidenceInfo", { interviews: n })} placeholder="0" min={0} /></VsField>
                                <VsField label="Survey responses"><VsUnit unit="responses" value={ev.surveyResponses} onChange={(n) => patchGroup("evidenceInfo", { surveyResponses: n })} placeholder="0" min={0} /></VsField>
                                <VsField label="People willing to test / buy"><VsUnit unit="people" value={ev.willingToTest} onChange={(n) => patchGroup("evidenceInfo", { willingToTest: n })} placeholder="0" min={0} /></VsField>
                            </div>
                            <VsField label="Strongest thing a customer said to you (quote)" optional><input className={vsField} maxLength={240} value={idea.customerQuote || ""} onChange={(e) => patchGroup("ideaInfo", { customerQuote: e.target.value })} placeholder='e.g. “If you can deliver 500 boxes a week, I’ll switch tomorrow.”' /></VsField>
                            <VsField label="Evidence they would pay (not just “like it”)" optional term="willingness-to-pay" onTerm={onTerm}><VsSelectOther value={idea.wtpEvidence || ""} options={WTP_EVIDENCE} onChange={(v) => patchGroup("ideaInfo", { wtpEvidence: v })} /></VsField>
                            <VsAiBox title="✨ AI summary building live" text={sums.opportunity} empty="Your problem, customer and evidence summary will appear here." />
                            <VsNav saving={saving} onBack={() => setStep(0)} onNext={() => goNext(2)} nextLabel="Next: Market & competition →" />
                        </Card>
                    )}

                    {step === 2 && (
                        <Card>
                            <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#a63d65]">Step 3 · Market & competition</div>
                            <h2 className="mb-1 text-[23px] font-black text-[#32133a]">How big is the opportunity, and who else is chasing it?</h2>
                            <p className="mb-4 text-[13px] leading-relaxed text-[#6b7280]">Investors do not expect perfect numbers. They expect you to know roughly how many customers you can reach, where that number came from, and who you are competing with.</p>
                            <VsExplain summary="📖 TAM / SAM / SOM explained with a student example">
                                <p><b><VsTerm term="tam" onTerm={onTerm}>TAM</VsTerm> (Total Addressable Market)</b> — everyone in the world who could theoretically use your product. <b>SAM</b> (Serviceable Available Market) — the part you can actually reach with your product and location. <b>SOM</b> (Serviceable Obtainable Market) — the slice you can realistically win in the next 2–3 years.</p>
                                <VsEx><b>Example — hostel meal delivery:</b> TAM = all 1.9 million university students in Pakistan. SAM = ~60,000 hostel students in Lahore who order food online. SOM = 3,000 students (5% of SAM) across 6 hostels near your kitchen in year one. Investors care most about SOM and how you got there.</VsEx>
                                <p className="mt-2">Bottom-up counts real units (1,200 factories × PKR 15,000/month). Top-down takes a big report number and guesses a %. Bottom-up is far more credible.</p>
                            </VsExplain>
                            <h3 className="sec mb-2.5 mt-4 text-sm font-black text-[#32133a]">📈 Market size — rough is fine, source matters</h3>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <VsField label="Reachable customer group (SAM in words)" tag="core"><input className={vsField} value={sol.marketWho || ""} onChange={(e) => patchGroup("solutionInfo", { marketWho: e.target.value })} placeholder="e.g. 1,200 registered food manufacturers in Lahore" /></VsField>
                                <VsField label="Geographic focus for the first 2 years" optional><VsSelectOther value={idea.geography || ""} options={GEOGRAPHY} onChange={(v) => patchGroup("ideaInfo", { geography: v })} /></VsField>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <VsField label="TAM — total potential customers" optional term="tam" onTerm={onTerm}><VsUnit unit="customers" value={idea.tam} onChange={(n) => patchGroup("ideaInfo", { tam: n })} min={0} /></VsField>
                                <VsField label="SAM — customers you can reach" tag="core"><VsUnit unit="customers" value={sol.marketSize ? num(sol.marketSize) : undefined} onChange={(n) => patchGroup("solutionInfo", { marketSize: n != null ? String(n) : undefined })} placeholder="e.g. 1200" min={0} /></VsField>
                                <VsField label="SOM — customers you can win in 2–3 yrs" optional><VsUnit unit="customers" value={idea.som} onChange={(n) => patchGroup("ideaInfo", { som: n })} min={0} /></VsField>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <VsField label="How did you estimate it?" tag="core"><VsSelectOther value={sol.marketSource || ""} options={MARKET_SOURCES} onChange={(v) => patchGroup("solutionInfo", { marketSource: v })} /></VsField>
                                <VsField label="Is this market growing, flat or shrinking?" optional><select className={vsField} value={idea.marketTrend || ""} onChange={(e) => patchGroup("ideaInfo", { marketTrend: e.target.value })}><option value="">Choose…</option>{MARKET_TRENDS.map((o) => <option key={o}>{o}</option>)}</select></VsField>
                            </div>
                            <VsField label="Why now?" optional term="why-now" onTerm={onTerm}><input className={vsField} maxLength={240} value={idea.whyNow || ""} onChange={(e) => patchGroup("ideaInfo", { whyNow: e.target.value })} placeholder="What has changed that makes this timely?" /></VsField>
                            <h3 className="sec mb-2.5 mt-4 text-sm font-black text-[#32133a]">⚔️ Competition — name them honestly</h3>
                            <VsExplain summary="📖 “We have no competitors” is a red flag — here’s why">
                                <p>Every customer is already doing something — even “doing nothing” is a competitor. Name the alternatives and say clearly why you win.</p>
                            </VsExplain>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <VsField label="If you did not exist, what would the customer choose?" tag="core"><VsSelectOther value={idea.competitorType || ""} options={COMPETITOR_TYPES} onChange={(v) => patchGroup("ideaInfo", { competitorType: v })} /></VsField>
                                <VsField label="How crowded is the space?" optional><select className={vsField} value={idea.competitionLevel || ""} onChange={(e) => patchGroup("ideaInfo", { competitionLevel: e.target.value })}><option value="">Choose…</option>{COMPETITION_LEVEL.map((o) => <option key={o}>{o}</option>)}</select></VsField>
                            </div>
                            {(idea.competitors?.length ? idea.competitors : [{ name: "", price: "", strength: "", weakness: "" }]).map((row, i) => (
                                <div key={i} className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-[1.1fr_.8fr_1fr_1fr_auto]">
                                    <input className={vsField} placeholder="Competitor / alternative" value={row.name || ""} onChange={(e) => { const next = [...(idea.competitors?.length ? idea.competitors : [{ name: "", price: "", strength: "", weakness: "" }])]; next[i] = { ...next[i], name: e.target.value }; patchGroup("ideaInfo", { competitors: next }); }} />
                                    <input className={vsField} placeholder="What they charge" value={row.price || ""} onChange={(e) => { const next = [...(idea.competitors?.length ? idea.competitors : [{ name: "", price: "", strength: "", weakness: "" }])]; next[i] = { ...next[i], price: e.target.value }; patchGroup("ideaInfo", { competitors: next }); }} />
                                    <input className={vsField} placeholder="Their strength" value={row.strength || ""} onChange={(e) => { const next = [...(idea.competitors?.length ? idea.competitors : [{ name: "", price: "", strength: "", weakness: "" }])]; next[i] = { ...next[i], strength: e.target.value }; patchGroup("ideaInfo", { competitors: next }); }} />
                                    <input className={vsField} placeholder="Their weakness" value={row.weakness || ""} onChange={(e) => { const next = [...(idea.competitors?.length ? idea.competitors : [{ name: "", price: "", strength: "", weakness: "" }])]; next[i] = { ...next[i], weakness: e.target.value }; patchGroup("ideaInfo", { competitors: next }); }} />
                                    <button type="button" className="text-lg text-[#b83b4d]" onClick={() => patchGroup("ideaInfo", { competitors: (idea.competitors || []).filter((_, idx) => idx !== i) })}>×</button>
                                </div>
                            ))}
                            <button type="button" className="mb-3 text-xs font-black text-[#a63d65]" onClick={() => patchGroup("ideaInfo", { competitors: [...(idea.competitors || [{ name: "", price: "", strength: "", weakness: "" }]), { name: "", price: "", strength: "", weakness: "" }].slice(0, 5) })}>+ Add competitor (up to 5)</button>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <VsField label="Why would they choose you instead?" tag="core" term="usp" onTerm={onTerm}><input className={vsField} maxLength={220} value={idea.whyUs || ""} onChange={(e) => patchGroup("ideaInfo", { whyUs: e.target.value })} placeholder="One honest, specific reason" /></VsField>
                                <VsField label="Adoption resistance / switching barrier" optional term="switching-cost" onTerm={onTerm}><input className={vsField} maxLength={240} value={idea.resistance || ""} onChange={(e) => patchGroup("ideaInfo", { resistance: e.target.value })} placeholder="What may stop customers from trying or switching?" /></VsField>
                            </div>
                            <VsField label="Positioning statement" optional term="positioning" onTerm={onTerm}><input className={vsField} maxLength={260} value={idea.positioning || ""} onChange={(e) => patchGroup("ideaInfo", { positioning: e.target.value })} placeholder="For [customer] who [need], [venture] is a [category] that [key benefit]." /></VsField>
                            <VsAiBox title="✨ AI summary building live" text={sums.opportunity} empty="Your market and competition summary will appear here." />
                            <VsNav saving={saving} onBack={() => setStep(1)} onNext={() => goNext(3)} nextLabel="Next: Solution & product →" />
                        </Card>
                    )}

                    {step === 3 && (
                        <Card>
                            <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#a63d65]">Step 4 · Solution, product & operations</div>
                            <h2 className="mb-1 text-[23px] font-black text-[#32133a]">What are you offering, how far is it built, and how will you deliver it?</h2>
                            <p className="mb-4 text-[13px] leading-relaxed text-[#6b7280]">Plain language wins. Products, services, apps, creative ventures, manufacturing, health, research commercialization and social enterprises all fit here. Questions that do not fit your model can stay blank.</p>
                            <VsExplain summary="📖 Value proposition, MVP, moat — explained">
                                <p className="mb-2"><b><VsTerm term="value-prop" onTerm={onTerm}>Value proposition</VsTerm></b> — the clear benefit a customer gets, in their words.</p>
                                <p className="mb-2"><b><VsTerm term="mvp" onTerm={onTerm}>MVP</VsTerm></b> — the smallest version that lets a real customer get the benefit so you can learn.</p>
                                <p><b><VsTerm term="moat" onTerm={onTerm}>Moat</VsTerm></b> — what makes it hard to copy next month: exclusive supplier, IP, brand, data, or a cost advantage.</p>
                            </VsExplain>
                            <VsField label="Your solution — what are you offering?" tag="core" term="value-prop" onTerm={onTerm} hint="What it is · how the customer uses it · the result they get." example={FIELD_EXAMPLES.solution} onUseExample={() => patchGroup("solutionInfo", { solution: FIELD_EXAMPLES.solution })} count={sol.solution || ""} max={600}><textarea className={clsx(vsField, "min-h-[88px]")} maxLength={600} value={sol.solution || ""} onChange={(e) => patchGroup("solutionInfo", { solution: e.target.value })} placeholder="Describe the product, service, platform or experience in plain language." /></VsField>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <VsField label="What exists today?" tag="core"><VsSelectOther value={sol.productStatus || ""} options={PRODUCT_STATUS} onChange={(v) => patchGroup("solutionInfo", { productStatus: v })} /></VsField>
                                <VsField label="Prototype / demo / portfolio link" optional><input className={vsField} type="url" value={sol.demoUrl || ""} onChange={(e) => patchGroup("solutionInfo", { demoUrl: e.target.value })} placeholder="https://…" /></VsField>
                            </div>
                            <VsField label="Top 3 features or components (most important first)" optional><input className={vsField} maxLength={260} value={sol.features || ""} onChange={(e) => patchGroup("solutionInfo", { features: e.target.value })} placeholder="e.g. 1) weekly subscription ordering  2) 48-hour delivery  3) plastic-ban compliance certificate" /></VsField>
                            <VsField label="What makes it meaningfully different or hard to copy?" tag="core" term="moat" onTerm={onTerm} hint="Be specific. “Better quality” is not a moat; “exclusive supplier contract” is." example={FIELD_EXAMPLES.advantage} onUseExample={() => patchGroup("solutionInfo", { advantage: FIELD_EXAMPLES.advantage })} count={sol.advantage || ""} max={320}><textarea className={clsx(vsField, "min-h-[72px]")} maxLength={320} value={sol.advantage || ""} onChange={(e) => patchGroup("solutionInfo", { advantage: e.target.value })} placeholder="Be specific. “Better quality” is not a moat; “exclusive supplier contract” is." /></VsField>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <VsField label="Intellectual property (IP) status" optional term="ip" onTerm={onTerm}><VsSelectOther value={sol.ipStatus || ""} options={IP_STATUS} onChange={(v) => patchGroup("solutionInfo", { ipStatus: v })} /></VsField>
                                <VsField label="Strongest competitive edge today" optional term="moat" onTerm={onTerm}><VsSelectOther value={sol.moatType || ""} options={MOAT_TYPES} onChange={(v) => patchGroup("solutionInfo", { moatType: v })} /></VsField>
                                <VsField label="Key technology or supplier you depend on" optional><VsSelectOther value={sol.techDependency || ""} options={TECH_DEPENDENCY} onChange={(v) => patchGroup("solutionInfo", { techDependency: v })} /></VsField>
                            </div>
                            <VsField label="Next 3 product milestones (with rough dates)" optional term="milestone" onTerm={onTerm} hint='Milestones should be measurable, e.g. “30 paying customers by March.”' example={FIELD_EXAMPLES.roadmap} onUseExample={() => patchGroup("solutionInfo", { roadmap: FIELD_EXAMPLES.roadmap })} count={sol.roadmap || ""} max={400}><textarea className={clsx(vsField, "min-h-[72px]")} maxLength={400} value={sol.roadmap || ""} onChange={(e) => patchGroup("solutionInfo", { roadmap: e.target.value })} placeholder="Milestone 1 (month)… Milestone 2… Milestone 3…" /></VsField>
                            <h3 className="sec mb-2.5 mt-4 text-sm font-black text-[#32133a]">⚙️ Operations — how you actually deliver</h3>
                            <VsExplain summary="📖 Why investors ask about operations, capacity and bottlenecks">
                                <p>A great product that cannot be delivered reliably at volume is not a business. Investors ask: how is it made or delivered, how many can you handle today, what breaks first when orders double, and how do you keep quality consistent?</p>
                                <VsEx><b>Example:</b> “We can produce 8,000 boxes a month with two moulds. The bottleneck is drying time; at 15,000/month we need a second dryer.”</VsEx>
                            </VsExplain>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <VsField label="How is the product / service delivered?" optional><VsSelectOther value={sol.deliveryModel || ""} options={DELIVERY_MODELS} onChange={(v) => patchGroup("solutionInfo", { deliveryModel: v })} /></VsField>
                                <VsField label="Current monthly capacity" optional term="capacity" onTerm={onTerm}><input className={vsField} maxLength={120} value={sol.capacity || ""} onChange={(e) => patchGroup("solutionInfo", { capacity: e.target.value })} placeholder="e.g. 8,000 boxes / 40 client projects per month" /></VsField>
                                <VsField label="Main bottleneck if demand doubled" optional term="bottleneck" onTerm={onTerm}><input className={vsField} maxLength={160} value={sol.bottleneck || ""} onChange={(e) => patchGroup("solutionInfo", { bottleneck: e.target.value })} placeholder="e.g. drying time; only one rider" /></VsField>
                                <VsField label="How do you keep quality consistent?" optional><VsSelectOther value={sol.qualityControl || ""} options={QUALITY_CONTROL} onChange={(v) => patchGroup("solutionInfo", { qualityControl: v })} /></VsField>
                                    </div>
                            <VsField label="What must change to serve 10× more customers?" optional><input className={vsField} maxLength={220} value={sol.scalePlan || ""} onChange={(e) => patchGroup("solutionInfo", { scalePlan: e.target.value })} placeholder="e.g. second dryer, a part-time sales person" /></VsField>
                            {early ? (
                                <><h3 className="sec mb-2.5 mt-4 text-sm font-black text-[#32133a]">📍 Progress so far — early stage</h3>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <VsField label="Mentors consulted"><VsUnit unit="people" value={ev.mentorsConsulted} onChange={(n) => patchGroup("evidenceInfo", { mentorsConsulted: n })} min={0} /></VsField>
                                    <VsField label="Letters of interest"><VsUnit unit="LOIs" value={ev.lettersOfIntent} onChange={(n) => patchGroup("evidenceInfo", { lettersOfIntent: n })} min={0} /></VsField>
                                    <VsField label="Competitions / incubators joined"><VsUnit unit="programs" value={ev.competitionsJoined} onChange={(n) => patchGroup("evidenceInfo", { competitionsJoined: n })} min={0} /></VsField>
                                </div></>
                            ) : proto ? (
                                <><h3 className="sec mb-2.5 mt-4 text-sm font-black text-[#32133a]">📍 Progress so far — prototype / pilot</h3>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <VsField label="People who tested it"><VsUnit unit="people" value={ev.testers} onChange={(n) => patchGroup("evidenceInfo", { testers: n })} min={0} /></VsField>
                                    <VsField label="Pilot partners"><VsUnit unit="pilots" value={ev.pilotPartners} onChange={(n) => patchGroup("evidenceInfo", { pilotPartners: n })} min={0} /></VsField>
                                    <VsField label="Pre-orders / commitments"><VsUnit unit="orders" value={ev.preOrders} onChange={(n) => patchGroup("evidenceInfo", { preOrders: n })} min={0} /></VsField>
                                </div></>
                            ) : (
                                <><h3 className="sec mb-2.5 mt-4 text-sm font-black text-[#32133a]">📍 Progress so far — operating / scaling</h3>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <VsField label="Customers / users"><VsUnit unit="customers" value={ev.customers} onChange={(n) => patchGroup("evidenceInfo", { customers: n })} min={0} /></VsField>
                                    <VsField label="Revenue to date"><VsUnit unit="PKR total" value={ev.revenueToDate} onChange={(n) => patchGroup("evidenceInfo", { revenueToDate: n })} min={0} /></VsField>
                                    <VsField label="Monthly growth"><VsUnit unit="% / month" value={ev.monthlyGrowthPercent} onChange={(n) => patchGroup("evidenceInfo", { monthlyGrowthPercent: n })} /></VsField>
                                </div></>
                            )}
                            <VsAiBox title="✨ AI summary building live" text={sums.business} empty="Your solution and product summary will appear here." />
                            <VsNav saving={saving} onBack={() => setStep(2)} onNext={() => goNext(4)} nextLabel="Next: Business model & marketing →" />
                        </Card>
                    )}

                    {step === 4 && (
                        <Card>
                            <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#a63d65]">Step 5 · Business model & marketing</div>
                            <h2 className="mb-1 text-[23px] font-black text-[#32133a]">How does value become money, and how will customers find you?</h2>
                            <p className="mb-4 text-[13px] leading-relaxed text-[#6b7280]">Investors want two things here: a clear way to earn revenue, and a realistic, costed plan to reach customers (go-to-market). No finance degree required — every term is explained.</p>
                            <VsExplain summary="📖 Business model, pricing strategy, go-to-market, funnel — explained">
                                <p className="mb-2"><b><VsTerm term="business-model" onTerm={onTerm}>Business model</VsTerm></b> — how you make money: product, subscription, commission.</p>
                                <p><b><VsTerm term="gtm" onTerm={onTerm}>Go-to-market</VsTerm></b> — which channel, which message, what budget for the first customers.</p>
                            </VsExplain>
                            <h3 className="sec mb-2.5 mt-4 text-sm font-black text-[#32133a]">💵 Revenue model & pricing</h3>
                            <VsField label="How will the venture earn money or sustain itself?" tag="core" term="business-model" onTerm={onTerm}><VsChips options={REVENUE_MODELS} selected={sol.revenueModels || []} onToggle={(v) => patchGroup("solutionInfo", { revenueModels: toggleChip(sol.revenueModels, v) })} otherKey="Other" /></VsField>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <VsField label="Pricing strategy" optional term="pricing-strategy" onTerm={onTerm}><VsSelectOther value={sol.pricingStrategy || ""} options={PRICING_STRATEGY} onChange={(v) => patchGroup("solutionInfo", { pricingStrategy: v })} /></VsField>
                                <VsField label="Has the price been tested with real customers?" optional><select className={vsField} value={sol.pricingTested || ""} onChange={(e) => patchGroup("solutionInfo", { pricingTested: e.target.value })}><option value="">Choose…</option>{PRICING_TESTED.map((o) => <option key={o}>{o}</option>)}</select></VsField>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <VsField label="What does one customer pay?" tag="core"><VsUnit unit="PKR / sale" value={sol.price} onChange={(n) => patchGroup("solutionInfo", { price: n })} placeholder="e.g. 2500" min={0} /></VsField>
                                <VsField label="How many times a year do they buy?" optional><VsUnit unit="times / yr" value={sol.purchaseFreq} onChange={(n) => patchGroup("solutionInfo", { purchaseFreq: n })} min={0} step={0.1} /></VsField>
                                <VsField label="How many years do they stay a customer?" optional term="churn" onTerm={onTerm}><VsUnit unit="years" value={sol.retentionYears} onChange={(n) => patchGroup("solutionInfo", { retentionYears: n })} min={0} step={0.5} /></VsField>
                            </div>
                            {price > 0 && sol.purchaseFreq && sol.retentionYears ? <VsCalc>💎 LTV: <b>PKR {(price * sol.purchaseFreq * sol.retentionYears).toLocaleString()}</b> = price × purchases/yr × years.</VsCalc> : null}
                            <h3 className="sec mb-2.5 mt-4 text-sm font-black text-[#32133a]">📣 Marketing & go-to-market</h3>
                            <VsField label="How will customers find you? (channels)" tag="core" term="channel" onTerm={onTerm}><VsChips options={CHANNELS} selected={sol.channels || []} onToggle={(v) => patchGroup("solutionInfo", { channels: toggleChip(sol.channels, v) })} otherKey="Other" /></VsField>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <VsField label="Your single most important channel for the first 100 customers" optional><input className={vsField} maxLength={160} value={sol.primaryChannel || ""} onChange={(e) => patchGroup("solutionInfo", { primaryChannel: e.target.value })} placeholder="e.g. in-person visits with samples" /></VsField>
                                <VsField label="How is a sale closed?" optional><VsSelectOther value={sol.salesMotion || ""} options={SALES_MOTION} onChange={(v) => patchGroup("solutionInfo", { salesMotion: v })} /></VsField>
                                <VsField label="Typical time from first contact to payment" optional term="sales-cycle" onTerm={onTerm}><VsSelectOther value={sol.salesCycle || ""} options={SALES_CYCLE} onChange={(v) => patchGroup("solutionInfo", { salesCycle: v })} /></VsField>
                                <VsField label="Why would a customer refer others?" optional term="referral" onTerm={onTerm}><input className={vsField} maxLength={180} value={sol.referral || ""} onChange={(e) => patchGroup("solutionInfo", { referral: e.target.value })} /></VsField>
                            </div>
                            <VsField label="Your core marketing message (one line customers will remember)" optional><input className={vsField} maxLength={160} value={sol.keyMessage || ""} onChange={(e) => patchGroup("solutionInfo", { keyMessage: e.target.value })} placeholder='e.g. “Ban-proof packaging at plastic prices.”' /></VsField>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <VsField label="Monthly marketing budget (planned or actual)" optional><VsUnit unit="PKR / month" value={sol.mktBudget} onChange={(n) => patchGroup("solutionInfo", { mktBudget: n })} min={0} /></VsField>
                                <VsField label="New customers expected per month from it" optional><VsUnit unit="customers" value={sol.newCustMonth} onChange={(n) => patchGroup("solutionInfo", { newCustMonth: n })} min={0} /></VsField>
                                <VsField label="Customer acquisition cost (CAC)" optional term="cac" onTerm={onTerm}><VsUnit unit="PKR / customer" value={sol.cac} onChange={(n) => patchGroup("solutionInfo", { cac: n })} min={0} /></VsField>
                            </div>
                            {sol.mktBudget && sol.newCustMonth ? <VsCalc>📣 CAC: <b>PKR {Math.round(sol.mktBudget / sol.newCustMonth).toLocaleString()}</b> = budget ÷ new customers.</VsCalc> : null}
                            <details className="my-3 rounded-[14px] border border-[#e7dae3] bg-[#fffafd]">
                                <summary className="cursor-pointer px-3.5 py-3 text-[12.5px] font-extrabold text-[#6d315c]">Optional: funnel numbers (only if you have run any marketing)</summary>
                                <div className="px-3.5 pb-3.5">
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        <VsField label="People reached / visitors per month"><VsUnit unit="people" value={sol.funnelReach} onChange={(n) => patchGroup("solutionInfo", { funnelReach: n })} min={0} /></VsField>
                                        <VsField label="Enquiries / leads per month"><VsUnit unit="leads" value={sol.funnelLeads} onChange={(n) => patchGroup("solutionInfo", { funnelLeads: n })} min={0} /></VsField>
                                        <VsField label="Paying customers per month"><VsUnit unit="customers" value={sol.funnelCust} onChange={(n) => patchGroup("solutionInfo", { funnelCust: n })} min={0} /></VsField>
                                    </div>
                                    {sol.funnelLeads && sol.funnelCust ? <VsCalc>Funnel conversion: <b>{Math.round((sol.funnelCust / sol.funnelLeads) * 100)}%</b> of leads pay.</VsCalc> : null}
                                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <VsField label="Customers who buy again" term="churn" onTerm={onTerm}><VsUnit unit="%" value={ev.repeatPercent} onChange={(n) => patchGroup("evidenceInfo", { repeatPercent: n })} min={0} max={100} /></VsField>
                                        <VsField label="Brand assets ready"><select className={vsField} value={sol.brandAssets || ""} onChange={(e) => patchGroup("solutionInfo", { brandAssets: e.target.value })}><option value="">Choose…</option>{BRAND_ASSETS.map((o) => <option key={o}>{o}</option>)}</select></VsField>
                                    </div>
                                </div>
                            </details>
                            <VsField label="Key partners needed to deliver (suppliers, logistics, platforms)" optional><input className={vsField} maxLength={240} value={sol.partners || ""} onChange={(e) => patchGroup("solutionInfo", { partners: e.target.value })} placeholder="e.g. bagasse mill (Kasur), TCS for delivery, JazzCash for payments" /></VsField>
                            <VsField label="Your most important 12-month business milestone" tag="core" term="milestone" onTerm={onTerm}><input className={vsField} maxLength={220} value={sol.milestone12mo || ""} onChange={(e) => patchGroup("solutionInfo", { milestone12mo: e.target.value })} placeholder="e.g. 30 paying factories and PKR 600,000 monthly revenue by September" /></VsField>
                            <VsAiBox title="✨ AI summary building live" text={sums.business} empty="Your business model and marketing summary will appear here." />
                            <VsNav saving={saving} onBack={() => setStep(3)} onNext={() => goNext(5)} nextLabel="Next: Finance & budget →" />
                        </Card>
                    )}

                    {step === 5 && (
                        <Card>
                            <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#a63d65]">Step 6 · Finance & budget</div>
                            <h2 className="mb-1 text-[23px] font-black text-[#32133a]">Show us the money — simply.</h2>
                            <p className="mb-4 text-[13px] leading-relaxed text-[#6b7280]">This is where most student ventures lose investors: not because the numbers are small, but because there are none. Every field here is explained with an example, and the calculators do the maths for you.</p>
                            <VsExplain summary="📖 Unit economics, gross margin, break-even, burn rate, runway — the 5 numbers every investor asks">
                                <p><b><VsTerm term="unit-economics" onTerm={onTerm}>Unit economics</VsTerm></b> — do you make money on one sale before counting fixed costs? Price − cost to deliver that one unit = unit margin. <b><VsTerm term="runway" onTerm={onTerm}>Runway</VsTerm></b> = cash ÷ monthly burn.</p>
                            </VsExplain>
                            <h3 className="sec mb-2.5 mt-4 text-sm font-black text-[#32133a]">🧮 Unit economics</h3>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <VsField label="Cost to deliver ONE sale" tag="core" term="cogs" onTerm={onTerm} hint={price ? `Price from Step 5: PKR ${price.toLocaleString()} / sale` : "Enter price in Step 5 first."}><VsUnit unit="PKR / sale" value={sol.unitCost} onChange={(n) => patchGroup("solutionInfo", { unitCost: n })} min={0} /></VsField>
                                <VsField label="Fixed costs per month" optional term="fixed-costs" onTerm={onTerm}><VsUnit unit="PKR / month" value={sol.fixedCosts} onChange={(n) => patchGroup("solutionInfo", { fixedCosts: n })} min={0} /></VsField>
                                <VsField label="Gross margin (auto, or override)" optional><VsUnit unit="%" value={sol.grossMargin} onChange={(n) => patchGroup("solutionInfo", { grossMargin: n })} min={0} max={100} step={0.1} placeholder={price > 0 && unitCost > 0 ? String(Math.round(((price - unitCost) / price) * 1000) / 10) : "auto"} /></VsField>
                            </div>
                            {price > 0 && unitCost > 0 ? (price > unitCost ? <VsCalc>🧮 Unit margin: <b>PKR {(price - unitCost).toLocaleString()}</b> ({Math.round(((price - unitCost) / price) * 100)}%).</VsCalc> : <VsCalc tone="bad">⚠️ Cost is at or above price — every sale loses money. Normal at prototype stage.</VsCalc>) : null}
                            {price > unitCost && unitCost > 0 && sol.fixedCosts ? <VsCalc>📍 Break-even: <b>{Math.ceil(sol.fixedCosts / (price - unitCost)).toLocaleString()} sales / month</b>.</VsCalc> : null}
                            <h3 className="sec mb-2.5 mt-4 text-sm font-black text-[#32133a]">📒 Start-up budget — what do you need to spend, and on what?</h3>
                            <VsExplain summary="📖 What is a budget, and what should a student budget include?">
                                <p>A <VsTerm term="budget" onTerm={onTerm}>budget</VsTerm> is a list of everything you must pay for to reach your next milestone, with an honest amount next to each line. Include a contingency (10–15% buffer for surprises).</p>
                                <VsEx><b>Example — 6-month EcoPack pilot:</b> Moulds PKR 180,000 · Raw material PKR 90,000 · Lab test PKR 40,000 · Marketing PKR 30,000 · Website PKR 25,000 · SECP PKR 15,000 · Contingency PKR 45,000 → Total PKR 425,000.</VsEx>
                            </VsExplain>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <VsField label="This budget covers" optional><select className={vsField} value={sol.budgetPeriod || ""} onChange={(e) => patchGroup("solutionInfo", { budgetPeriod: e.target.value })}><option value="">Choose…</option>{BUDGET_PERIOD.map((o) => <option key={o}>{o}</option>)}</select></VsField>
                                <VsField label="How prepared is this budget?" optional><select className={vsField} value={sol.budgetStatus || ""} onChange={(e) => patchGroup("solutionInfo", { budgetStatus: e.target.value })}><option value="">Choose…</option>{BUDGET_STATUS.map((o) => <option key={o}>{o}</option>)}</select></VsField>
                            </div>
                            {(sol.budgetLines?.length ? sol.budgetLines : [{ category: "", amount: undefined, note: "" }]).map((row, i) => (
                                <div key={i} className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-[1.2fr_.7fr_1fr_auto]">
                                    <VsSelectOther value={row.category || ""} options={BUDGET_CATEGORIES} onChange={(v) => { const next = [...(sol.budgetLines?.length ? sol.budgetLines : [{ category: "", amount: undefined, note: "" }])]; next[i] = { ...next[i], category: v }; patchGroup("solutionInfo", { budgetLines: next }); }} />
                                    <VsUnit unit="PKR" value={row.amount} onChange={(n) => { const next = [...(sol.budgetLines?.length ? sol.budgetLines : [{ category: "", amount: undefined, note: "" }])]; next[i] = { ...next[i], amount: n }; patchGroup("solutionInfo", { budgetLines: next }); }} min={0} />
                                    <input className={vsField} placeholder="Note / what exactly" value={row.note || ""} onChange={(e) => { const next = [...(sol.budgetLines?.length ? sol.budgetLines : [{ category: "", amount: undefined, note: "" }])]; next[i] = { ...next[i], note: e.target.value }; patchGroup("solutionInfo", { budgetLines: next }); }} />
                                    <button type="button" className="text-lg text-[#b83b4d]" onClick={() => patchGroup("solutionInfo", { budgetLines: (sol.budgetLines || []).filter((_, idx) => idx !== i) })}>×</button>
                                </div>
                            ))}
                            <button type="button" className="mb-2 text-xs font-black text-[#a63d65]" onClick={() => patchGroup("solutionInfo", { budgetLines: [...(sol.budgetLines || [{ category: "", note: "" }]), { category: "", note: "" }].slice(0, 15) })}>+ Add budget line</button>
                            <p className="mb-3 text-xs font-black text-[#32133a]">Total budget: PKR {(sol.budgetLines || []).reduce((s, r) => s + (r.amount || 0), 0).toLocaleString()}</p>
                            <h3 className="sec mb-2.5 mt-4 text-sm font-black text-[#32133a]">💰 Funding so far — where has the money come from?</h3>
                            <VsExplain summary="📖 Bootstrapping, grants, angels, pre-seed — what do these mean?">
                                <p><VsTerm term="bootstrapping" onTerm={onTerm}>Bootstrapping</VsTerm> funds the business from savings and its own sales. A grant is money you do not repay. An angel invests personal money for ownership. <VsTerm term="pre-seed" onTerm={onTerm}>Pre-seed / seed</VsTerm> is the earliest investment to build an MVP and prove customers will pay.</p>
                                <VsEx><b>Example:</b> “We bootstrapped PKR 150,000 from savings, won PKR 200,000 at the university competition, and reinvested PKR 60,000 of sales.”</VsEx>
                            </VsExplain>
                            {(sol.fundSources?.length ? sol.fundSources : [{ source: "", amount: undefined, note: "" }]).map((row, i) => (
                                <div key={i} className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-[1.2fr_.7fr_1fr_auto]">
                                    <VsSelectOther value={row.source || ""} options={FUND_SOURCES} onChange={(v) => { const next = [...(sol.fundSources?.length ? sol.fundSources : [{ source: "", amount: undefined, note: "" }])]; next[i] = { ...next[i], source: v }; patchGroup("solutionInfo", { fundSources: next }); }} />
                                    <VsUnit unit="PKR" value={row.amount} onChange={(n) => { const next = [...(sol.fundSources?.length ? sol.fundSources : [{ source: "", amount: undefined, note: "" }])]; next[i] = { ...next[i], amount: n }; patchGroup("solutionInfo", { fundSources: next }); }} min={0} />
                                    <input className={vsField} placeholder="Terms / note" value={row.note || ""} onChange={(e) => { const next = [...(sol.fundSources?.length ? sol.fundSources : [{ source: "", amount: undefined, note: "" }])]; next[i] = { ...next[i], note: e.target.value }; patchGroup("solutionInfo", { fundSources: next }); }} />
                                    <button type="button" className="text-lg text-[#b83b4d]" onClick={() => patchGroup("solutionInfo", { fundSources: (sol.fundSources || []).filter((_, idx) => idx !== i) })}>×</button>
                                </div>
                            ))}
                            <button type="button" className="mb-3 text-xs font-black text-[#a63d65]" onClick={() => patchGroup("solutionInfo", { fundSources: [...(sol.fundSources || [{ source: "", note: "" }]), { source: "", note: "" }].slice(0, 8) })}>+ Add funding source</button>
                            <h3 className="sec mb-2.5 mt-4 text-sm font-black text-[#32133a]">📊 Current finances & simple 12-month outlook</h3>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <VsField label="Cash available today" optional><VsUnit unit="PKR" value={sol.cashOnHand} onChange={(n) => patchGroup("solutionInfo", { cashOnHand: n })} min={0} /></VsField>
                                <VsField label="Current monthly revenue" optional><VsUnit unit="PKR / month" value={sol.monthlyRevenue} onChange={(n) => patchGroup("solutionInfo", { monthlyRevenue: n })} min={0} /></VsField>
                                <VsField label="Current total monthly costs" optional term="burn-rate" onTerm={onTerm}><VsUnit unit="PKR / month" value={sol.monthlyCosts} onChange={(n) => patchGroup("solutionInfo", { monthlyCosts: n })} min={0} /></VsField>
                            </div>
                            {sol.monthlyCosts ? ((sol.monthlyCosts - (sol.monthlyRevenue || 0)) <= 0 ? <VsCalc>✅ Revenue covers costs.</VsCalc> : sol.cashOnHand ? <VsCalc tone={(sol.cashOnHand / (sol.monthlyCosts - (sol.monthlyRevenue || 0))) < 3 ? "bad" : "warn"}>🔥 Burn <b>PKR {(sol.monthlyCosts - (sol.monthlyRevenue || 0)).toLocaleString()}/month</b> · Runway <b>{(sol.cashOnHand / (sol.monthlyCosts - (sol.monthlyRevenue || 0))).toFixed(1)} months</b>.</VsCalc> : <VsCalc tone="warn">🔥 Burn rate known — enter cash to see runway.</VsCalc>) : null}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <VsField label="Customers you expect in month 1 of the plan" optional><VsUnit unit="customers" value={sol.projCustM1} onChange={(n) => patchGroup("solutionInfo", { projCustM1: n })} min={0} /></VsField>
                                <VsField label="Expected monthly growth in customers" optional><VsUnit unit="% / month" value={sol.projGrowth} onChange={(n) => patchGroup("solutionInfo", { projGrowth: n })} min={0} /></VsField>
                                <VsField label="When do customers pay you?" optional term="cash-flow" onTerm={onTerm}><VsSelectOther value={sol.paymentTerms || ""} options={PAYMENT_TERMS} onChange={(v) => patchGroup("solutionInfo", { paymentTerms: v })} /></VsField>
                            </div>
                            {sol.projCustM1 && price > 0 ? (() => {
                                const g = (sol.projGrowth || 0) / 100;
                                let c = sol.projCustM1 || 0;
                                let units = 0;
                                for (let m = 0; m < 12; m += 1) { units += c; c *= 1 + g; }
                                return <VsCalc>12-month outlook from these assumptions: ~<b>{Math.round(units).toLocaleString()} sales</b> · ~<b>PKR {Math.round(units * price).toLocaleString()}</b> revenue. Compare with your own target below.</VsCalc>;
                            })() : null}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <VsField label="Your own 12-month revenue target" optional><VsUnit unit="PKR / year" value={sol.revenueTarget12} onChange={(n) => patchGroup("solutionInfo", { revenueTarget12: n })} min={0} /></VsField>
                                <VsField label="When do you expect the first profitable month?" optional term="break-even" onTerm={onTerm}><select className={vsField} value={sol.profitMonth || ""} onChange={(e) => patchGroup("solutionInfo", { profitMonth: e.target.value })}><option value="">Choose…</option>{PROFIT_MONTH.map((o) => <option key={o}>{o}</option>)}</select></VsField>
                            </div>
                            <details className="my-3 rounded-[14px] border border-[#e7dae3] bg-[#fffafd]">
                                <summary className="cursor-pointer px-3.5 py-3 text-[12.5px] font-extrabold text-[#6d315c]">Optional: model-specific metrics (SaaS / app / marketplace) — only for operating ventures</summary>
                                <div className="px-3.5 pb-3.5">
                                    <p className="mb-3 text-[11px] text-[#6b7280]">Skip unless you already run a software, app or marketplace with real users. Each term is explained via the ? icon.</p>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        <VsField label="MRR — monthly recurring revenue" term="mrr" onTerm={onTerm}><VsUnit unit="PKR / month" value={sol.mrr} onChange={(n) => patchGroup("solutionInfo", { mrr: n })} min={0} /></VsField>
                                        <VsField label="GMV — value traded on your platform" term="gmv" onTerm={onTerm}><VsUnit unit="PKR / month" value={sol.gmv} onChange={(n) => patchGroup("solutionInfo", { gmv: n })} min={0} /></VsField>
                                        <VsField label="Take rate — your cut of GMV" term="take-rate" onTerm={onTerm}><VsUnit unit="%" value={sol.takeRate} onChange={(n) => patchGroup("solutionInfo", { takeRate: n })} min={0} max={100} step={0.1} /></VsField>
                                        <VsField label="Monthly active users" term="mau" onTerm={onTerm}><VsUnit unit="users" value={sol.mau} onChange={(n) => patchGroup("solutionInfo", { mau: n })} min={0} /></VsField>
                                        <VsField label="Monthly churn" term="churn" onTerm={onTerm}><VsUnit unit="% / month" value={sol.churn} onChange={(n) => patchGroup("solutionInfo", { churn: n })} min={0} max={100} step={0.1} /></VsField>
                                        <VsField label="Paying users / customers"><VsUnit unit="paying" value={sol.payingUsers} onChange={(n) => patchGroup("solutionInfo", { payingUsers: n })} min={0} /></VsField>
                                    </div>
                                </div>
                            </details>
                            <VsField label="Key financial assumptions (so reviewers can check your logic)" optional hint="Label what is measured, quoted, or assumed." example={FIELD_EXAMPLES.finAssumptions} onUseExample={() => patchGroup("solutionInfo", { finAssumptions: FIELD_EXAMPLES.finAssumptions })} count={sol.finAssumptions || ""} max={500}><textarea className={clsx(vsField, "min-h-[72px]")} maxLength={500} value={sol.finAssumptions || ""} onChange={(e) => patchGroup("solutionInfo", { finAssumptions: e.target.value })} placeholder="Where do your price, cost, growth and market numbers come from?" /></VsField>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <VsField label="Main source of your key numbers" optional><VsSelectOther value={sol.numberSourceType || ""} options={NUMBER_SOURCES} onChange={(v) => patchGroup("solutionInfo", { numberSourceType: v })} /></VsField>
                                <VsField label="How are finances tracked today?" optional><VsSelectOther value={sol.accounting || ""} options={ACCOUNTING} onChange={(v) => patchGroup("solutionInfo", { accounting: v })} /></VsField>
                            </div>
                            <h3 className="sec mb-2.5 mt-4 text-sm font-black text-[#32133a]">🎯 Funding ask (only if you want to raise money)</h3>
                            <VsField label="Are you looking to raise money in the next 12 months?" tag="core"><select className={vsField} value={sol.raisePlan || ""} onChange={(e) => patchGroup("solutionInfo", { raisePlan: e.target.value })}><option value="">Choose…</option>{RAISE_PLAN.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></VsField>
                            {["grant", "equity", "loan", "unsure"].includes(sol.raisePlan || "") ? (
                                <>
                                    <VsExplain summary="📖 Use of funds, valuation, equity, dilution, SAFE — explained">
                                        <p><b>Use of funds</b> — exactly what the money buys and which milestone it gets you to. Investors fund milestones, not salaries. <b><VsTerm term="valuation" onTerm={onTerm}>Valuation</VsTerm></b> — what the whole company is “worth” when the investor buys in. <b><VsTerm term="equity" onTerm={onTerm}>Equity</VsTerm></b> — the % of ownership you give. <b><VsTerm term="dilution" onTerm={onTerm}>Dilution</VsTerm></b> — your own share shrinking as you sell equity.</p>
                                        <VsEx><b>Example:</b> You raise PKR 5M at a PKR 45M pre-money valuation → post-money PKR 50M → investor owns 10%. If two founders had 50/50, they now hold 45% each (diluted from 50%).</VsEx>
                                        <p className="mt-2"><b><VsTerm term="safe" onTerm={onTerm}>SAFE / convertible note</VsTerm></b> — an agreement where the investor gives money now and the equity % is decided at a later round, so you don’t need to argue valuation today. Common for first cheques.</p>
                                    </VsExplain>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        <VsField label="Amount sought"><VsUnit unit="PKR" value={ev.fundingSought} onChange={(n) => patchGroup("evidenceInfo", { fundingSought: n })} min={0} /></VsField>
                                        <VsField label="Type of funding" term="safe" onTerm={onTerm}><VsSelectOther value={sol.askInstrument || ""} options={ASK_INSTRUMENT} onChange={(v) => patchGroup("solutionInfo", { askInstrument: v })} /></VsField>
                                        <VsField label="Months this funding would cover" term="runway" onTerm={onTerm}><VsUnit unit="months" value={ev.fundRunway} onChange={(n) => patchGroup("evidenceInfo", { fundRunway: n })} min={0} step={0.5} /></VsField>
                                    </div>
                                    <VsField label="Use of funds — split by category (should total 100%)" term="use-of-funds" onTerm={onTerm}>
                                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                            {([["uofProduct", "% product"], ["uofOps", "% ops"], ["uofMarketing", "% marketing"], ["uofTeam", "% team"], ["uofLegal", "% legal"], ["uofContingency", "% buffer"]] as const).map(([k, unit]) => (
                                                <VsUnit key={k} unit={unit} value={sol[k]} onChange={(n) => patchGroup("solutionInfo", { [k]: n })} min={0} max={100} />
                                            ))}
                                        </div>
                                        {(() => {
                                            const total = (sol.uofProduct || 0) + (sol.uofOps || 0) + (sol.uofMarketing || 0) + (sol.uofTeam || 0) + (sol.uofLegal || 0) + (sol.uofContingency || 0);
                                            return total > 0 ? <VsCalc tone={Math.abs(total - 100) < 1 ? undefined : "warn"}>Use of funds total: <b>{total}%</b>{Math.abs(total - 100) < 1 ? " ✓" : " — aim for 100%."}</VsCalc> : null;
                                        })()}
                                    </VsField>
                                    <input className={clsx(vsField, "mt-2")} value={ev.useOfFunds || ""} onChange={(e) => patchGroup("evidenceInfo", { useOfFunds: e.target.value })} placeholder="Optional note: e.g. 2 moulds (PKR 180k), first 3 months of raw material, one sales intern" />
                                    <VsField label="What milestone will the money achieve?"><input className={vsField} value={ev.expectedResult || ""} onChange={(e) => patchGroup("evidenceInfo", { expectedResult: e.target.value })} placeholder="e.g. 300 paying customers within 9 months" /></VsField>
                                    <details className="my-3 rounded-[14px] border border-[#e7dae3] bg-[#fffafd]">
                                        <summary className="cursor-pointer px-3.5 py-3 text-[12.5px] font-extrabold text-[#6d315c]">Optional funding terms — only if you know them</summary>
                                        <div className="px-3.5 pb-3.5">
                                            <p className="mb-3 text-[11px] text-[#6b7280]">Useful for pitch preparation; not expected from most undergraduate projects .</p>
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                                <VsField label="Indicative pre-money valuation" term="valuation" onTerm={onTerm}><VsUnit unit="PKR" value={ev.valuation} onChange={(n) => patchGroup("evidenceInfo", { valuation: n })} min={0} /></VsField>
                                                <VsField label="Equity you may offer" term="equity" onTerm={onTerm}><VsUnit unit="%" value={ev.equityPercent} onChange={(n) => patchGroup("evidenceInfo", { equityPercent: n })} min={0} max={100} step={0.1} /></VsField>
                                                <VsField label="Current founder / team ownership"><VsUnit unit="%" value={ev.founderOwnership} onChange={(n) => patchGroup("evidenceInfo", { founderOwnership: n })} min={0} max={100} step={0.1} /></VsField>
                                            </div>
                                            <VsField label="Exit / long-term ownership strategy" optional term="exit" onTerm={onTerm}><VsSelectOther value={ev.exitStrategy || ""} options={EXIT_STRATEGIES} onChange={(v) => patchGroup("evidenceInfo", { exitStrategy: v })} placeholder="Not decided / not relevant yet" /></VsField>
                                        </div>
                                    </details>
                                </>
                            ) : null}
                            <VsAiBox title="✨ AI summary building live" text={sums.business} empty="Your finance and budget summary will appear here." />
                            <VsNav saving={saving} onBack={() => setStep(4)} onNext={() => goNext(6)} nextLabel="Next: Impact / SDG →" />
                        </Card>
                    )}

                    {step === 6 && (
                        <Card>
                            <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#a63d65]">Step 7 · Sustainability & SDGs</div>
                            <h2 className="mb-1 text-[23px] font-black text-[#32133a]">Does your venture have a meaningful SDG connection?</h2>
                            <p className="mb-4 text-[13px] leading-relaxed text-[#6b7280]">There is no penalty for choosing “Not linked.” CIEL PK wants an accurate repository, not forced SDG claims.</p>
                            <VsExplain summary="📖 What are the SDGs, and what counts as a meaningful link?">
                                <p>The Sustainable Development Goals are 17 global goals. A link is meaningful when your core product directly moves a goal, not when it is a side effect.</p>
                                <VsEx><b>Meaningful:</b> compostable packaging replacing plastic → SDG 12. <b>Not:</b> “our app runs on servers powered partly by solar.”</VsEx>
                            </VsExplain>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                <VsChoice emoji="🌍" title="Yes — SDG linked" blurb="I can identify one or more meaningful goals." selected={sm.mode === "map"} onClick={() => patchGroup("sdgMapping", { mode: "map" })} />
                                <VsChoice emoji="💡" title="I think so — help me" blurb="CIEL / AI can suggest possible goals for review." selected={sm.mode === "review"} onClick={() => patchGroup("sdgMapping", { mode: "review" })} />
                                <VsChoice emoji="➖" title="Not linked to an SDG" blurb="This is primarily a commercial venture." selected={sm.mode === "none"} onClick={() => patchGroup("sdgMapping", { mode: "none" })} />
                            </div>
                            {sm.mode === "map" && (
                                <>
                                    <VsNotice tone="green">Choose up to 3 SDGs. The first one selected is treated as your primary SDG.</VsNotice>
                                    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                                        {sdgData.map((g) => {
                                            const sel = picked.some((p) => p.goalNumber === g.number);
                                            return (
                                                <button key={g.number} type="button" onClick={() => toggleSdg(g.number)} className={clsx("min-h-[62px] rounded-[11px] p-2 text-left text-[9px] font-extrabold text-white", sel ? "border-2 border-[#1f2937] opacity-100" : "border-2 border-transparent opacity-45")} style={{ background: SDG_COLORS[g.number] || g.color }}>
                                                    <strong className="block text-sm">{g.number}</strong>{SDG_SHORT[g.number] || g.title}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <VsField label="In one line, how does the venture contribute?" className="mt-3"><input className={vsField} maxLength={240} value={sm.howImpact || ""} onChange={(e) => patchGroup("sdgMapping", { howImpact: e.target.value })} placeholder="e.g. crop-waste packaging reduces plastic use by food businesses" /></VsField>
                                    <button type="button" className="mb-3 rounded-xl border border-[#e5e7eb] bg-white px-4 py-2.5 text-[13px] font-extrabold text-[#6b7280]" onClick={() => {
                                        const matches = suggestSdgs(snap);
                                        const overlap = snap.sdgs.filter((n) => matches.includes(n));
                                        setSdgCheck(!matches.length ? "Add more detail about the problem, solution or intended change so AI has enough context to check the mapping." : overlap.length ? `Your current description appears consistent with ${overlap.map((n) => `SDG ${n} — ${SDG_SHORT[n]}`).join("; ")}. Keep only goals where the venture has a direct, defensible contribution.` : `Your selected SDGs are not the strongest matches. AI currently sees ${matches.map((n) => `SDG ${n} — ${SDG_SHORT[n]}`).join("; ")}.`);
                                    }}>✨ AI check my SDG mapping</button>
                                    {sdgCheck ? <div className="mb-3 rounded-[13px] border border-[#e2c8d6] bg-[#fff8fb] p-3 text-[11px] text-[#6d315c]">{sdgCheck}</div> : null}
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <VsField label="One impact indicator you could track"><input className={vsField} value={sm.indicators?.[0]?.indicator || ""} onChange={(e) => patchGroup("sdgMapping", { indicators: [{ ...(sm.indicators?.[0] || {}), indicator: e.target.value, target12mo: sm.indicators?.[0]?.target12mo }] })} placeholder="e.g. kilograms of plastic replaced" /></VsField>
                                        <VsField label="12-month target" optional><input className={vsField} value={sm.indicators?.[0]?.target12mo || ""} onChange={(e) => patchGroup("sdgMapping", { indicators: [{ ...(sm.indicators?.[0] || {}), indicator: sm.indicators?.[0]?.indicator, target12mo: e.target.value }] })} placeholder="e.g. 10,000 kg" /></VsField>
                                    </div>
                                </>
                            )}
                            {sm.mode === "review" && (
                                <>
                                    <VsNotice tone="blue">💡 Your venture will be marked <b>“SDG mapping assistance requested.”</b> CIEL AI reads the problem, customer, solution and the change described below, then suggests likely SDGs with a reason. You confirm the mapping; AI does not force it.</VsNotice>
                                    <VsField label="What positive change could your venture create?"><textarea className={clsx(vsField, "min-h-[88px]")} maxLength={360} value={sm.helpImpact || ""} onChange={(e) => patchGroup("sdgMapping", { helpImpact: e.target.value })} placeholder="Describe the change in plain language." /></VsField>
                                    <button type="button" className="mb-3 rounded-xl bg-[#a63d65] px-4 py-2.5 text-[13px] font-extrabold text-white" onClick={() => setSdgSuggest(suggestSdgs(snap))}>✨ Ask CIEL AI to suggest SDGs</button>
                                    {sdgSuggest.length > 0 && (
                                        <div className="mb-3 rounded-[13px] border border-[#e2c8d6] bg-[#fff8fb] p-3">
                                            <b className="text-xs text-[#6d315c]">CIEL AI suggestions</b>
                                            <p className="mt-1 text-[11px] text-[#6b7280]">Based on the problem, solution and intended change, these appear to be the most plausible starting points:</p>
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {sdgSuggest.map((n) => (
                                                    <button key={n} type="button" className="rounded-[10px] border border-[#d8bdcb] bg-white px-2.5 py-2 text-[11px] font-extrabold text-[#6d315c]" onClick={() => patchGroup("sdgMapping", { mode: "map", entries: picked.some((p) => p.goalNumber === n) || picked.length >= 3 ? picked : [...picked, { goalNumber: n, targets: [] }] })}>SDG {n} · {SDG_SHORT[n]}</button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                            {sm.mode === "none" && (
                                <>
                                    <VsNotice>Your record will display <b>“Not linked to an SDG.”</b> This does not reduce the Venture Potential Score.</VsNotice>
                                    <VsField label="Optional: does the business consider any responsible-business practices?"><VsChips options={RESPONSIBILITY_PRACTICES} selected={sm.responsibility || []} warn={["None currently"]} onToggle={(v) => patchGroup("sdgMapping", { responsibility: toggleChip(sm.responsibility, v) })} otherKey="Other" /></VsField>
                                </>
                            )}
                            <VsAiBox title="✨ Sustainability summary" text={sums.impact} empty="Choose one of the three SDG options above." />
                            <VsNav saving={saving} onBack={() => setStep(5)} onNext={() => goNext(7)} nextLabel="Next: Risk, team health & next step →" />
                        </Card>
                    )}

                    {step === 7 && (
                        <Card>
                            <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#a63d65]">Step 8 · Risk, team health & next step</div>
                            <h2 className="mb-1 text-[23px] font-black text-[#32133a]">What could go wrong — and how would you handle it?</h2>
                            <p className="mb-4 text-[13px] leading-relaxed text-[#6b7280]">Investors trust founders who name their risks before being asked. This section also checks something most forms ignore: whether the team and the business can sustain the pace.</p>
                            <h3 className="sec mb-2.5 mt-4 text-sm font-black text-[#32133a]">⚠️ Risks</h3>
                            <VsExplain summary="📖 Types of risk investors ask about (with examples)">
                                <p><b>Market risk</b> — customers may not want it enough. <b>Execution risk</b> — the team may not be able to build or deliver it. <b>Financial risk</b> — running out of cash. <b>Supply / operational risk</b> — a supplier or partner fails. <b>Regulatory risk</b> — approvals, licences, bans. <b><VsTerm term="key-person" onTerm={onTerm}>Key-person risk</VsTerm></b> — everything depends on one individual. <b>Competitive risk</b> — a bigger player copies you.</p>
                                <VsEx><b>Example:</b> Risk: “Our only pulp mill raises prices 30%.” Likelihood: Medium. Mitigation: “Sign a second mill in Faisalabad by December; hold 6 weeks of stock.”</VsEx>
                            </VsExplain>
                            <div className="mb-1 hidden grid-cols-[.9fr_1.2fr_.6fr_.6fr_1fr_auto] gap-2 text-[10px] font-black uppercase tracking-wide text-[#9a8293] md:grid">
                                <span>Type</span><span>Risk — what could happen</span><span>Likelihood</span><span>Impact</span><span>How you would reduce it</span><span />
                            </div>
                            {(ev.riskRows?.length ? ev.riskRows : [{ type: "", description: "", likelihood: "", impact: "", mitigation: "" }]).map((row, i) => (
                                <div key={i} className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-[.9fr_1.2fr_.6fr_.6fr_1fr_auto]">
                                    <VsSelectOther value={row.type || ""} options={RISK_TYPES} onChange={(v) => { const next = [...(ev.riskRows?.length ? ev.riskRows : [{ type: "", description: "", likelihood: "", impact: "", mitigation: "" }])]; next[i] = { ...next[i], type: v }; patchGroup("evidenceInfo", { riskRows: next }); }} />
                                    <input className={vsField} placeholder="What could happen" value={row.description || ""} onChange={(e) => { const next = [...(ev.riskRows?.length ? ev.riskRows : [{ type: "", description: "", likelihood: "", impact: "", mitigation: "" }])]; next[i] = { ...next[i], description: e.target.value }; patchGroup("evidenceInfo", { riskRows: next }); }} />
                                    <select className={vsField} value={row.likelihood || ""} onChange={(e) => { const next = [...(ev.riskRows?.length ? ev.riskRows : [{ type: "", description: "", likelihood: "", impact: "", mitigation: "" }])]; next[i] = { ...next[i], likelihood: e.target.value }; patchGroup("evidenceInfo", { riskRows: next }); }}><option value="">—</option>{RISK_LEVELS.map((o) => <option key={o}>{o}</option>)}</select>
                                    <select className={vsField} value={row.impact || ""} onChange={(e) => { const next = [...(ev.riskRows?.length ? ev.riskRows : [{ type: "", description: "", likelihood: "", impact: "", mitigation: "" }])]; next[i] = { ...next[i], impact: e.target.value }; patchGroup("evidenceInfo", { riskRows: next }); }}><option value="">—</option>{RISK_LEVELS.map((o) => <option key={o}>{o}</option>)}</select>
                                    <input className={vsField} placeholder="How you would reduce it" value={row.mitigation || ""} onChange={(e) => { const next = [...(ev.riskRows?.length ? ev.riskRows : [{ type: "", description: "", likelihood: "", impact: "", mitigation: "" }])]; next[i] = { ...next[i], mitigation: e.target.value }; patchGroup("evidenceInfo", { riskRows: next }); }} />
                                    <button type="button" className="text-lg text-[#b83b4d]" onClick={() => patchGroup("evidenceInfo", { riskRows: (ev.riskRows || []).filter((_, idx) => idx !== i) })}>×</button>
                                </div>
                            ))}
                            <button type="button" className="mb-3 text-xs font-black text-[#a63d65]" onClick={() => patchGroup("evidenceInfo", { riskRows: [...(ev.riskRows || [{ type: "", description: "", mitigation: "" }]), { type: "", description: "", mitigation: "" }].slice(0, 6) })}>+ Add risk (top 3 is enough)</button>
                            <VsField label="Biggest assumption you still need to test" optional term="assumption" onTerm={onTerm}><input className={vsField} maxLength={250} value={ev.assumption || ""} onChange={(e) => patchGroup("evidenceInfo", { assumption: e.target.value })} placeholder="e.g. factories will sign 12-month contracts after a 4-week pilot" /></VsField>
                            <VsField label="Regulatory / legal / approval barrier" optional><VsSelectOther value={ev.regulatoryBarrier || ""} options={REG_BARRIERS} onChange={(v) => patchGroup("evidenceInfo", { regulatoryBarrier: v })} placeholder="Choose if relevant…" /></VsField>
                            <h3 className="sec mb-2.5 mt-4 text-sm font-black text-[#32133a]">🧠 Team health & burnout check</h3>
                            <VsExplain summary="📖 What is burnout? Founder, employee and business burnout — explained with examples">
                                <p><VsTerm term="founder-burnout" onTerm={onTerm}>Founder burnout</VsTerm> is weeks or months of exhaustion, not a busy week. <VsTerm term="employee-burnout" onTerm={onTerm}>Team burnout</VsTerm> shows up as unclear roles, unpaid work and quiet exits. <VsTerm term="business-burnout" onTerm={onTerm}>Business burnout</VsTerm> is when cash, stock or goodwill run out faster than they can be renewed.</p>
                                <VsEx><b>Example:</b> A team spends its entire PKR 300,000 on inventory before confirming demand. Unsold stock ties up all the cash even though the idea was good.</VsEx>
                            </VsExplain>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <VsField label="Main competing commitments of the team right now" optional><VsSelectOther value={ev.otherCommit || ""} options={OTHER_COMMIT} onChange={(v) => patchGroup("evidenceInfo", { otherCommit: v })} /></VsField>
                                <VsField label="Key-person dependency" optional term="key-person" onTerm={onTerm}><select className={vsField} value={ev.keyPerson || ""} onChange={(e) => patchGroup("evidenceInfo", { keyPerson: e.target.value })}><option value="">Choose…</option>{KEY_PERSON.map((o) => <option key={o}>{o}</option>)}</select></VsField>
                                <VsField label="First hire or co-founder needed in the next 12 months" optional><VsSelectOther value={ev.hiringNeed || ""} options={HIRING_NEED} onChange={(v) => patchGroup("evidenceInfo", { hiringNeed: v })} /></VsField>
                                <VsField label="How sustainable is the current pace for the next 6 months? (1 = we will burn out, 5 = very sustainable)">
                                    <div className="flex gap-1.5">{["1","2","3","4","5"].map((n) => <button key={n} type="button" onClick={() => patchGroup("evidenceInfo", { paceScore: n })} className={clsx("flex-1 rounded-full border px-2 py-2 text-xs font-bold", ev.paceScore === n ? "border-[#a63d65] bg-[#f8e8ef] text-[#087657]" : "border-[#e5e7eb] bg-white text-[#5e6473]")}>{n}</button>)}</div>
                                </VsField>
                            </div>
                            <VsField label="Any of these warning signs present today?" optional><VsChips options={BURNOUT_SIGNS} selected={ev.burnoutSigns || []} warn={BURNOUT_SIGNS.filter((s) => s !== "None of these" && s !== "Other")} onToggle={(v) => patchGroup("evidenceInfo", { burnoutSigns: toggleChip(ev.burnoutSigns, v) })} otherKey="Other" /></VsField>
                            <VsField label="What will you do to keep the team and business healthy?" optional hint="Simple rules beat good intentions." example={FIELD_EXAMPLES.burnoutPlan} onUseExample={() => patchGroup("evidenceInfo", { burnoutPlan: FIELD_EXAMPLES.burnoutPlan })} count={ev.burnoutPlan || ""} max={400}><textarea className={clsx(vsField, "min-h-[72px]")} maxLength={400} value={ev.burnoutPlan || ""} onChange={(e) => patchGroup("evidenceInfo", { burnoutPlan: e.target.value })} placeholder="e.g. written roles, weekly check-in, exam-period pause" /></VsField>
                            <h3 className="sec mb-2.5 mt-4 text-sm font-black text-[#32133a]">🤝 Support & next step</h3>
                            <VsField label="Support you may need"><VsChips options={SUPPORT_NEEDS} selected={ev.openTo || []} warn={["Nothing yet"]} onToggle={(v) => patchGroup("evidenceInfo", { openTo: toggleChip(ev.openTo, v) })} otherKey="Other" /></VsField>
                            <VsField label="Your next 90 days — three concrete actions" optional hint="Actions you control, each with a date." example={FIELD_EXAMPLES.plan90} onUseExample={() => patchGroup("evidenceInfo", { plan90: FIELD_EXAMPLES.plan90 })} count={ev.plan90 || ""} max={400}><textarea className={clsx(vsField, "min-h-[72px]")} maxLength={400} value={ev.plan90 || ""} onChange={(e) => patchGroup("evidenceInfo", { plan90: e.target.value })} placeholder="1) … 2) … 3) …" /></VsField>
                            <VsField label="If this works, what could the venture become in 3–5 years?" optional term="vision" onTerm={onTerm} hint="Investors fund the 5-year story; faculty judge the 12-month plan. Give both." example={FIELD_EXAMPLES.vision35} onUseExample={() => patchGroup("evidenceInfo", { vision35: FIELD_EXAMPLES.vision35 })} count={ev.vision35 || ""} max={400}><textarea className={clsx(vsField, "min-h-[72px]")} maxLength={400} value={ev.vision35 || ""} onChange={(e) => patchGroup("evidenceInfo", { vision35: e.target.value })} placeholder="Size, geography, product range, team — be ambitious but specific" /></VsField>
                            <VsField label="One thing you learned while developing this idea" tag="core" hint="Aim for 2–4 honest sentences. No polished essay required." example={FIELD_EXAMPLES.reflection} onUseExample={() => patchGroup("evidenceInfo", { reflection: FIELD_EXAMPLES.reflection })} count={ev.reflection || ""} max={650}><textarea className={clsx(vsField, "min-h-[88px]")} maxLength={650} value={ev.reflection || ""} onChange={(e) => patchGroup("evidenceInfo", { reflection: e.target.value })} placeholder="What changed in your thinking about the customer, solution or business?" /></VsField>
                            <div className="rounded-[18px] border border-[#e5e7eb] bg-[#fbfcfe] p-4">
                                <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#a63d65]">Opportunity track · optional</div>
                                <h2 className="mb-1 text-lg font-black text-[#32133a]">Would you like CIEL PK to consider this venture for external opportunities?</h2>
                                <p className="mb-3 text-[13px] text-[#6b7280]">Default is OFF. Your university repository record is created either way.</p>
                                <div className="flex items-center justify-between gap-4 border-b border-[#e5e7eb] py-3">
                                    <div><b className="block text-[12.5px]">Consider my venture for mentorship, incubation, partnerships or investment opportunities</b><span className="mt-0.5 block text-[11px] text-[#6b7280]">This is only an opt-in to be considered. It does not automatically share your documents or contact details.</span></div>
                                    <button type="button" aria-label="Toggle opportunity consideration" onClick={() => patchGroup("publishSettings", { acceptIntros: !investorOn, audience: !investorOn ? "investors" : "university" })} className={clsx("relative h-[26px] w-[46px] shrink-0 rounded-full after:absolute after:top-[3px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition", investorOn ? "bg-[#a63d65] after:left-[23px]" : "bg-[#d7dbe5] after:left-[3px]")} />
                                </div>
                                {investorOn && (
                                    <>
                                        <VsNotice tone="green">✅ You can still control what is shared later. Approved investors only see a curated Venture Card, and any direct introduction requires your approval.</VsNotice>
                                        <label className="flex items-start gap-2 text-xs font-bold text-[#1e293b]"><input type="checkbox" className="mt-0.5" checked={!!entry.reviewPipeline?.declarationConsent} onChange={(e) => patchGroup("reviewPipeline", { declarationConsent: e.target.checked })} />I authorize my university and CIEL PK to consider this venture for approved external opportunities. I understand that my contact details and full documents will not be shared without further permission.</label>
                                    </>
                                )}
                            </div>
                            <VsAiBox title="✨ Risk & next-step summary" text={sums.ask} empty="Your risks, team health, support needs and opportunity preference will appear here." />
                            <VsNav saving={saving} onBack={() => setStep(6)} onNext={() => goNext(8)} nextLabel="Review →" />
                        </Card>
                    )}

                    {step === 8 && (
                        <>
                            <Card>
                                <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#a63d65]">Step 9 · Review & business plan</div>
                                <h2 className="mb-1 text-[23px] font-black text-[#32133a]">Your AI-drafted Venture Profile</h2>
                                <p className="mb-4 text-[13px] leading-relaxed text-[#6b7280]">Review each AI-drafted section summary before submission. <b>Accept or edit the summary</b> so the final repository flashcard accurately reflects what you meant. Faculty separately receive an independent <b>CIEL AI Critical Review</b> based on your raw answers, calculations, uploaded evidence and market benchmarking; that review cannot be edited by the student.</p>
                                {REVIEW_BLOCKS.map((block) => {
                                    const r = review[block.key] ?? { accepted: false, edited: false, text: sums[block.key] || "" };
                                    return (
                                        <div key={block.key} className="mb-2.5 rounded-[14px] border border-[#e5e7eb] p-3.5">
                                            <div className="mb-1.5 flex items-center justify-between gap-2">
                                                <b className="text-xs">{block.title}</b>
                                                <span className="rounded-full bg-[#f4e9f2] px-2 py-1 text-[10px] font-extrabold text-[#7d3c78]">{r.accepted ? "Accepted by student ✓" : r.edited ? "Edited · please accept" : "AI draft · awaiting acceptance"}</span>
                                            </div>
                                            <textarea className={clsx(vsField, "min-h-[75px]")} value={r.text} onChange={(e) => setReview((prev) => ({ ...prev, [block.key]: { ...r, text: e.target.value, edited: true, accepted: false } }))} />
                                            <div className="mt-2 flex gap-2">
                                                <button type="button" className="rounded-xl bg-[#a63d65] px-3 py-2 text-xs font-extrabold text-white" onClick={() => setReview((prev) => ({ ...prev, [block.key]: { ...r, accepted: true } }))}>✓ Accept AI Summary</button>
                                                <button type="button" className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-xs font-extrabold text-[#6b7280]" onClick={() => setReview((prev) => ({ ...prev, [block.key]: { ...r, accepted: false } }))}>✎ Edit / Correct</button>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div className="mt-3.5 rounded-[18px] border border-[#e5e7eb] bg-[#fffafd] p-4">
                                    <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#a63d65]">Evidence Vault · optional</div>
                                    <h2 className="mb-1 text-lg font-black text-[#32133a]">Add proof once — let every reviewer use it.</h2>
                                    <p className="mb-3 text-[13px] text-[#6b7280]">Files stay attached to the same venture record for faculty verification, AI evidence confidence and later CIEL review.</p>
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                        {VAULT_DOCS.map((d) => (
                                            <label key={d.type} className={clsx("cursor-pointer rounded-[13px] border-[1.5px] border-dashed border-[#d6c4cf] bg-[#fffafd] p-3 text-center text-[11px] text-[#775d70]", uploading && "pointer-events-none opacity-60")}>
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept={d.accept}
                                                    multiple={d.multiple}
                                                    onChange={(e) => {
                                                        const files = Array.from(e.target.files || []);
                                                        e.target.value = "";
                                                        if (!files.length) return;
                                                        void (async () => {
                                                            for (const f of files) await handleDocFile(f, d.type);
                                                        })();
                                                    }}
                                                />
                                                <span className="block font-extrabold text-[#5d3b52]">{d.label}</span>
                                                <span className="mt-1 block text-[9.5px] font-extrabold text-[#8b3155]">{uploading === d.type ? "Uploading…" : docFor(d.type) ? "Uploaded" : ""}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-3.5 rounded-2xl border-[1.5px] border-[#e0c4d4] bg-gradient-to-br from-[#fff8fb] to-[#f8edf4] p-4">
                                    <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-[#8b3155]">🎤 60-second pitch builder</div>
                                    <p className="font-serif text-sm leading-relaxed text-[#4a2940]">{pitch60(snap)}</p>
                                </div>
                                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                    <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-3.5"><h4 className="mb-1 text-[12.5px] font-black text-[#32133a]">🏛 University / Faculty Lens</h4><p className="m-0 text-[11px] leading-relaxed text-[#6b7280]">Full academic record: project origin, student/team, evidence, stage, business logic, finances, risks, team health, SDG status, completeness, AI potential and verification history.</p></div>
                                    <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-3.5"><h4 className="mb-1 text-[12.5px] font-black text-[#32133a]">💼 Investor / Partner Lens</h4><p className="m-0 text-[11px] leading-relaxed text-[#6b7280]">Only after student opt-in + review: concise venture card with problem, solution, market, traction, unit economics, advantage and ask. Contact details and full documents remain locked until an introduction is approved.</p></div>
                                </div>
                            </Card>
                            <Card>
                                <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#a63d65]">Your business plan · generated from your answers</div>
                                <h2 className="mb-1 text-[19px] font-black text-[#32133a]">One document, every section a reviewer or investor expects</h2>
                                <p className="mb-4 text-[13px] leading-relaxed text-[#6b7280]">Assembled live from the nine steps. Empty sections show what is still missing. Print it, save it as PDF, or copy the text into Word.</p>
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                    <button type="button" className="rounded-xl bg-[#a63d65] px-3 py-2 text-xs font-extrabold text-white" onClick={printPlan}>🖨 Print / save as PDF</button>
                                    <button type="button" className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-xs font-extrabold text-[#6b7280]" onClick={() => void copyPlan()}>📋 Copy plan text</button>
                                    <span className="text-[11.5px] text-[#6b7280]">{plan.filled} of {plan.total} sections complete</span>
                                </div>
                                <div className="rounded-[14px] border border-[#e5e7eb] bg-white px-4 py-3">
                                    <h3 className="m-0 text-lg font-black text-[#32133a]">{snap.name || "Untitled venture"} — Business Plan</h3>
                                    <p className="mt-1 text-[11px] text-[#6b7280]">{plan.meta}</p>
                                    {plan.sections.map((s) => (
                                        <div key={s.title} className="mt-3 border-t border-[#eee] pt-3">
                                            <b className="block text-[13px] text-[#32133a]">{s.title}</b>
                                            {s.body ? <p className="mt-1 text-[12.5px] leading-relaxed text-[#1e2130]">{s.body}</p> : <p className="mt-1 rounded-lg bg-[#fff8e8] px-2.5 py-2 text-[12px] text-[#9b6712]">Missing: {s.gap}</p>}
                                        </div>
                                    ))}
                                    <p className="mt-3 border-t border-[#eee] pt-3 text-[11px] text-[#6b7280]">{plan.footer}</p>
                                </div>
                            </Card>
                            <Card>
                                <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#a63d65]">Investor-readiness checklist</div>
                                <h2 className="mb-1 text-[19px] font-black text-[#32133a]">What a top-tier VC would look for — <span className="text-[#a63d65]">{vcOk}/{vcItems.length}</span> present</h2>
                                <p className="mb-4 text-[13px] text-[#6b7280]">Auto-generated from your answers. Gaps are not failures — they are your to-do list.</p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    {vcItems.map((item) => (
                                        <div key={item.label} className="flex gap-2 rounded-[12px] border border-[#e5e7eb] bg-[#fbfcfe] px-3 py-2.5">
                                            <span className={clsx("mt-0.5 text-sm font-black", item.ok ? "text-[#2e7d55]" : "text-[#b83b4d]")}>{item.ok ? "✓" : "○"}</span>
                                            <div>
                                                <b className="block text-[12px] text-[#32133a]">{item.label}</b>
                                                <span className="text-[10.5px] text-[#6b7280]">{item.hint}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                            <Card>
                                <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#a63d65]">CIEL Venture Intelligence</div>
                                <h2 className="mb-1 text-[23px] font-black text-[#32133a]">Potential, evidence & readiness — sustainability remains separate</h2>
                                <p className="mb-4 text-[13px] text-[#6b7280]">Illustrative, stage-adjusted pre-screening model for the prototype. Final rankings are reviewed by faculty / university / CIEL PK.</p>
                                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                    {[
                                        { k: "Venture Potential Score", v: `${score}/100`, bar: score },
                                        { k: "Evidence Confidence", v: evidenceLabel(snap) },
                                        { k: "Financial Readiness", v: financialReadiness({ price: sol.price, unitCost: sol.unitCost, budgetLines: sol.budgetLines, cashOnHand: sol.cashOnHand, monthlyCosts: sol.monthlyCosts, finAssumptions: sol.finAssumptions }) },
                                        { k: "Team Health", v: teamHealthLabel({ paceScore: ev.paceScore, burnoutSigns: ev.burnoutSigns, burnoutPlan: ev.burnoutPlan }) },
                                        { k: "SDG Status", v: sdgStatusLabel(snap) },
                                        { k: "Opportunity Status", v: investorOn ? (entry.reviewPipeline?.declarationConsent ? "Opted in · review required" : "Opt-in incomplete") : "Repository only" },
                                    ].map((r) => (
                                        <div key={r.k} className="rounded-[14px] border border-[#e5e7eb] bg-[#fbfcfe] p-3.5">
                                            <small className="block text-[9.5px] font-black uppercase tracking-wide text-[#6b7280]">{r.k}</small>
                                            <b className="mt-1 block text-lg text-[#32133a]">{r.v}</b>
                                            {"bar" in r && r.bar != null ? <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e8ecf3]"><span className="block h-full bg-gradient-to-r from-[#8b5cf6] to-[#14a87b]" style={{ width: `${r.bar}%` }} /></div> : null}
                                        </div>
                                    ))}
                                </div>
                                <h3 className="mb-2 mt-4 text-sm font-black">CIEL Venture Journey</h3>
                                <div className="flex flex-wrap gap-1">
                                    {PATHWAY.map((p, i) => <span key={p} className={clsx("rounded-full px-2 py-1 text-[9.5px] font-extrabold", i < pathwayLevel(snap, score) ? "bg-[#f8e8ef] text-[#087657]" : "bg-[#eef1f6] text-[#7a8091]")}>{p}</span>)}
                                </div>
                                <p className="mt-2 text-[10.8px] leading-relaxed text-[#6b7280]">“Investor-Ready” is intentionally harder to earn than a high venture-potential score. A strong plan may be high-potential without yet being ready for VC exposure.</p>
                            </Card>
                            <div className="rounded-[18px] border-2 border-[#cfe6dd] bg-gradient-to-br from-[#effaf6] to-[#f7fffc] p-[18px] text-center">
                                <h3 className="m-0 text-lg font-black text-[#32133a]">Ready to add this venture to the university repository?</h3>
                                <p className="mt-1.5 text-xs leading-relaxed text-[#6b7280]">This submission is required for the university venture repository. Investor / VC exposure remains a separate student opt-in and is never automatic.</p>
                                <label className="mx-auto mt-4 flex max-w-[790px] items-start gap-2.5 rounded-[14px] border border-[#e4d4dc] bg-[#fffafd] px-4 py-3.5 text-left text-xs text-[#5d4052]">
                                    <input type="checkbox" className="mt-0.5" checked={repoAck} onChange={(e) => setRepoAck(e.target.checked)} />
                                    <span><b>I understand this Venture Profile is a mandatory university repository record.</b> I may separately choose whether I want the venture considered for external incubation, partners, investors or venture capital. Declining external exposure does not remove or disadvantage my university repository record.</span>
                                </label>
                                <button type="button" disabled={saving} onClick={() => void submitVenture()} className="mt-4 rounded-xl bg-[#32133a] px-4 py-3 text-[13px] font-extrabold text-white disabled:opacity-50">{saving ? "Submitting…" : "Submit Venture Record"}</button>
                            </div>
                            {error ? <p className="mt-3 text-xs font-semibold text-[#b83b4d]">{error}</p> : null}
                            <div className="mt-4"><button type="button" onClick={() => setStep(7)} className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-[13px] font-extrabold text-[#6b7280]">← Back</button></div>
                        </>
                    )}
                    {error && step !== 8 ? <p className="mt-3 text-xs font-semibold text-[#b83b4d]">{error}</p> : null}
                </main>

                <aside className="lg:sticky lg:top-[118px]">
                    <div className="mb-4 overflow-hidden rounded-[18px] border border-[#e5e7eb] bg-[#fffdfb] shadow-[0_7px_22px_rgba(15,23,42,.045)]">
                        <div className="bg-gradient-to-br from-[#32133a] to-[#15556b] px-[18px] py-[17px] text-white">
                            <small className="text-[9px] font-black uppercase tracking-[0.14em] text-[#b7d8e5]">My Venture Card · live preview</small>
                            <h3 className="my-1 text-[19px] font-black">{snap.name || "Your Venture"}</h3>
                            <p className="m-0 text-xs leading-relaxed text-[#cce1e9]">{snap.pitch || "Your one-line description will appear here."}</p>
                            <div className="mt-2 flex flex-wrap gap-1">
                                <span className="rounded-lg bg-white/13 px-1.5 py-1 text-[9px] font-extrabold">STAGE · {(snap.stage || "NOT SET").toUpperCase()}</span>
                                <span className="rounded-lg bg-white/13 px-1.5 py-1 text-[9px] font-extrabold">UNIVERSITY · {snap.uni || "—"}</span>
                            </div>
                        </div>
                        <div className="px-[18px] py-3.5">
                            {[["Problem", snap.problem || "—"], ["Customer", snap.customer || "—"], ["Solution", snap.solution || "—"], ["Market", snap.marketWho || "—"], ["Business model", snap.revenueModels.join(" + ") || "—"], ["Unit economics", price && unitCost ? `PKR ${price.toLocaleString()} − ${unitCost.toLocaleString()}` : "—"], ["Validation", validationLine(snap)], ["Ask", snap.investorOptIn && snap.askAmount ? `PKR ${snap.askAmount.toLocaleString()}` : "—"], ["SDG status", sdgStatusLabel(snap)]].map(([k, v]) => (
                                <div key={k} className="grid grid-cols-[105px_1fr] gap-2 border-b border-[#e5e7eb] py-2 text-xs last:border-0"><span className="font-extrabold text-[#6b7280]">{k}</span><div className="break-words">{v}</div></div>
                            ))}
                        </div>
                    </div>
                    <Card>
                        <div className="mb-2.5 text-[11px] font-black uppercase tracking-[0.12em] text-[#6b7280]">Venture Compass · live coaching</div>
                        <div className="grid grid-cols-2 gap-2">
                            {([["problem", "🎯 Problem"], ["evidence", "🔎 Evidence"], ["market", "📈 Market"], ["business", "💵 Business model"], ["marketing", "📣 Marketing"], ["finance", "🧮 Finance"], ["defence", "🛡 Defensibility"], ["team", "👥 Team & health"]] as const).map(([k, label]) => (
                                <div key={k} className="rounded-xl border border-[#eadce4] bg-[#fffafd] p-2.5">
                                    <div className="flex justify-between gap-2 text-[10.5px] font-extrabold text-[#5b344e]"><span>{label}</span><b>{compass[k]}%</b></div>
                                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#efe6eb]"><span className="block h-full bg-gradient-to-r from-[#b57417] to-[#a63d65]" style={{ width: `${compass[k]}%` }} /></div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-2.5 rounded-[11px] bg-[#fff3dc] px-2.5 py-2.5 text-[11px] leading-relaxed text-[#7b5314]"><b>Next strongest move:</b> {COMPASS_TIPS[weakest]}</div>
                    </Card>
                    <Card>
                        <div className="mb-2.5 text-[11px] font-black uppercase tracking-[0.12em] text-[#6b7280]">Live AI pre-screen</div>
                        <div className="mb-2.5 rounded-[14px] border border-[#e5e7eb] bg-[#f8fafc] p-3.5">
                            <div className="flex items-center justify-between"><b className="text-xs">Venture potential</b><strong className="text-lg text-[#32133a]">{score}</strong></div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e8ecf3]"><span className="block h-full bg-gradient-to-r from-[#8b5cf6] to-[#14a87b]" style={{ width: `${score}%` }} /></div>
                        </div>
                        <p className="text-[10.8px] leading-relaxed text-[#6b7280]">Commercial potential is calculated separately from SDG alignment. Choosing “Not linked to an SDG” does not reduce this score.</p>
                    </Card>
                    <Card>
                        <div className="mb-2.5 text-[11px] font-black uppercase tracking-[0.12em] text-[#6b7280]">Investor-readiness · quick view</div>
                        <ul className="m-0 list-none space-y-1.5 p-0">
                            {vcItems.map((item) => (
                                <li key={item.label} className="flex items-start gap-2 text-[11px] leading-snug text-[#3a3340]">
                                    <span className={clsx("font-black", item.ok ? "text-[#2e7d55]" : "text-[#b83b4d]")}>{item.ok ? "✓" : "○"}</span>
                                    <span>{item.label}</span>
                                </li>
                            ))}
                        </ul>
                    </Card>
                    <Card>
                        <div className="mb-2.5 text-[11px] font-black uppercase tracking-[0.12em] text-[#6b7280]">Repository logic</div>
                        <p className="text-[10.8px] leading-relaxed text-[#6b7280]">✅ All ventures: one university repository record<br /><br />👥 Team: linked to the same venture record<br /><br />🔒 Contact details: private by default<br /><br />📎 Evidence: attached once, reused for review<br /><br />🌍 SDG-linked: separate sustainability analytics<br /><br />⭐ High-potential: reviewer shortlist<br /><br />💼 External showcase: student opt-in + verification</p>
                    </Card>
                </aside>
            </div>
            <p className="mt-3 text-center text-[10.5px] leading-relaxed text-[#8b93a3]">CIEL PK · Venture Studio v13 · Student Builder → University Review → Consented Opportunity Card</p>
        </div>
        </div>
    );
}
