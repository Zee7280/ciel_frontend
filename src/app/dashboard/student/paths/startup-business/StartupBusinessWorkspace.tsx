"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import clsx from "clsx";
import { authenticatedFetch } from "@/utils/api";
import { uploadFileViaPresign } from "@/utils/presignedFileUpload";
import { sdgData } from "@/utils/sdgData";
import { pakistaniUniversities } from "@/utils/universityData";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { WorkspaceSkeleton } from "@/components/ciel/Skeleton";
import { TeamInviteBadge } from "@/components/ciel/TeamInviteBadge";
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
    V11_STEPS,
    VAULT_DOCS,
    VENTURE_TYPES,
    compassScores,
    evidenceLabel,
    htmlSdgMode,
    normalizeV11Stage,
    pathwayLevel,
    pitch60,
    progressPercent,
    sdgStatusLabel,
    suggestSdgs,
    v11Summaries,
    validationLine,
    venturePotentialScore,
    type V11Snap,
} from "@/utils/ventureStudioV11";
import {
    VsAiBox,
    VsChips,
    VsChoice,
    VsField,
    VsNav,
    VsNotice,
    VsSelectOther,
    VsUnit,
    VsWhy,
    toggleChip,
    vsField,
} from "./VentureStudioFormUi";

interface TeamMember {
    name: string;
    role: string;
    email?: string;
    whatsappCode?: string;
    whatsappNumber?: string;
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
}
interface VentureIdeaInfo {
    problem?: string; proofFact?: string; payerWho?: string; userWho?: string; beneficiaryWho?: string;
    sector?: string; city?: string; pitch?: string; customer?: string; buyerModels?: string[]; payerDiff?: string;
    evidenceMethods?: string[]; competitorType?: string; whyUs?: string; resistance?: string; whyNow?: string;
}
interface VentureSolutionInfo {
    solution?: string; alternative?: string; advantage?: string; revenue?: string; costPerSale?: string;
    milestone12mo?: string; marketWho?: string; marketSize?: string; marketSource?: string; demoUrl?: string;
    revenueModels?: string[]; channels?: string[]; numberSourceType?: string; numberSourceNote?: string;
    price?: number; unitCost?: number; startupNeed?: number; monthlyRevenue?: number; cac?: number; ltv?: number;
    raised?: number; grossMargin?: number; burn?: number; runway?: number;
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

export default function StartupBusinessWorkspace() {
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

    useEffect(() => {
        authenticatedFetch("/api/v1/paths/startup-business", {}, { redirectToLogin: true })
            .then((res) => (res?.ok ? res.json() : null))
            .then((result) => {
                if (result?.data) {
                    const data = result.data as Partial<VentureEntry>;
                    const merged = mergeEntry(EMPTY, data);
                    setEntry(merged);
                    const raw = data.stepCompleted ?? 0;
                    setStep(Math.min(5, raw > 6 ? 5 : raw));
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
    const showCard = (entry.status === "submitted" && !editing) || !isOwner;
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
    const fundingOn = (ev.openTo || []).includes("Investment funding");
    const price = sol.price || 0;
    const unitCost = sol.unitCost || 0;

    const patchGroup = <K extends keyof VentureEntry>(key: K, patch: Partial<NonNullable<VentureEntry[K]>>) => {
        setEntry((e) => ({ ...e, [key]: { ...(e[key] as object), ...patch } }));
    };

    const save = async (patch: Partial<VentureEntry>, advanceTo?: number) => {
        setSaving(true);
        setError(null);
        const nextStepCompleted = advanceTo !== undefined ? Math.max(entry.stepCompleted, Math.min(6, advanceTo)) : entry.stepCompleted;
        try {
            const res = await authenticatedFetch(
                "/api/v1/paths/startup-business",
                { method: "PATCH", body: JSON.stringify({ ...patch, stepCompleted: nextStepCompleted }) },
                { redirectToLogin: true },
            );
            const result = res?.ok ? await res.json() : null;
            if (!result?.data) throw new Error("Could not save your progress");
            setEntry((e) => mergeEntry(e, result.data as Partial<VentureEntry>));
            if (advanceTo !== undefined) setStep(Math.min(5, advanceTo));
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save your progress");
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
        }));
        return {
            ventureName: entry.ventureName || undefined,
            description: idea.pitch || entry.description || undefined,
            stage: normalizeV11Stage(entry.stage) || undefined,
            team,
            academicSetup: { ...as, submissionType: mapped || as.submissionType, submissionTypes: mapped ? [mapped] : as.submissionTypes, faculty: as.facultyRole || as.faculty },
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
        if (step !== 5) return;
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
        }, 6);
        if (ok) setEditing(false);
    };

    if (loading) return <WorkspaceSkeleton />;
    const gates = entry.gates || { academicOk: false, showcaseOk: false, investmentReadyOk: false };
    const docFor = (type: string) => entry.documents.find((d) => d.type === type);
    const teamRows = entry.team.length ? entry.team : [{ name: "", role: "", email: "", whatsappCode: "+92", whatsappNumber: "" }];

    if (showCard) {
        return (
            <div className="mx-auto max-w-[1240px] px-4 pb-16 pt-2">
                <div className="space-y-4 rounded-[18px] border border-[#e5e7eb] bg-white p-6 shadow-sm">
                    {!isOwner && <div className="rounded-[13px] border border-[#e2c7d7] bg-[#f8eef4] p-3 text-sm font-semibold text-[#603449]">👥 You&apos;re named as a team member on this venture — the founder owns it and is the only one who can edit or submit changes.</div>}
                    <div className="flex items-center gap-2 text-sm font-bold text-[#25683a]"><CheckCircle2 className="h-5 w-5" /> Submitted — awaiting faculty verification</div>
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
                    {isOwner && <button type="button" onClick={() => { setReview({}); setStep(0); setEditing(true); }} className="rounded-xl border border-[#e5e7eb] px-4 py-2.5 text-sm font-bold text-[#6b7280]">Edit this record</button>}
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[1240px] px-[18px] pb-20 pt-1">
            <header className="mb-4 flex flex-col gap-4 rounded-b-[22px] bg-[radial-gradient(circle_at_88%_15%,rgba(255,255,255,.18),transparent_25%),linear-gradient(135deg,#32133a,#5a244f)] px-[22px] py-[17px] text-white shadow-[0_10px_28px_rgba(50,19,58,.18)] sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <small className="block text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b7d9e6]">CIEL PK · Venture Studio</small>
                    <h1 className="my-1.5 text-[31px] font-black leading-tight">Build a Venture Worth Remembering ✦</h1>
                    <p className="m-0 max-w-[760px] text-sm leading-relaxed text-[#d6e8ef]">Turn a class idea, business plan, FYP or operating startup into a strong university venture record. Start simple; advanced investor questions only appear when useful. CIEL AI helps you frame—not fabricate—your answers.</p>
                    <div className="mt-3.5 max-w-[790px] rounded-[14px] bg-white/10 px-3.5 py-3 text-xs leading-relaxed text-[#e8f4f8]"><b>University Venture Repository — Mandatory:</b> this Venture Profile is part of your university record and must be submitted whether the venture is early, average, high-potential, SDG-linked or not. <b>Investor / VC exposure is completely optional</b> and is controlled separately by you. <b>Do not guess:</b> leave optional figures blank when they are not yet known.</div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                    {["6 guided steps", "Core: ~12–18 min", "Investor track: opt-in only"].map((b) => <span key={b} className="whitespace-nowrap rounded-full border border-white/16 bg-white/13 px-2.5 py-2 text-[11px] font-extrabold">{b}</span>)}
                </div>
            </header>

            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_355px]">
                <main>
                    <Card className="!py-4">
                        <div className="mb-2.5 flex items-center justify-between gap-2.5">
                            <div className="text-xs font-extrabold uppercase tracking-wide text-[#6b7280]">Your Venture Profile</div>
                            <div className="text-xs font-black text-[#a63d65]">{pct}% complete</div>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-[#edf0f5]"><span className="block h-full rounded-full bg-gradient-to-r from-[#a63d65] to-[#3dd6a6] transition-all" style={{ width: `${pct}%` }} /></div>
                        <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                            {V11_STEPS.map((s, i) => (
                                <button key={s.key} type="button" onClick={() => i <= entry.stepCompleted && setStep(i)} disabled={i > entry.stepCompleted} className={clsx("rounded-xl border px-1.5 py-2 text-center text-[10.5px] font-extrabold", step === i ? "border-[#a63d65] bg-[#f8e8ef] text-[#087657]" : i < entry.stepCompleted ? "border-[#bde7c9] bg-[#fff2d7] text-[#9b6712]" : "border-[#e5e7eb] bg-[#fbfcfe] text-[#6b7280]")}>{s.label}</button>
                            ))}
                        </div>
                    </Card>

                    {step === 0 && (
                        <>
                            <Card>
                                <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#a63d65]">Step 1 · Meet your venture</div>
                                <h2 className="mb-1 text-[23px] font-black text-[#32133a]">Where does your idea stand today?</h2>
                                <p className="mb-4 text-[13px] leading-relaxed text-[#6b7280]">Pick the honest stage. An idea is assessed as an idea; a running business is assessed as a running business.</p>
                                <VsWhy icon="💡"><b>No pressure to look “advanced.”</b> The AI assessment changes with your stage, so early projects are not penalized for not having revenue or customers yet.</VsWhy>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                    {V11_STAGES.map((s) => <VsChoice key={s.id} emoji={s.emoji} title={s.title} blurb={s.blurb} selected={stage === s.id} onClick={() => setEntry((e) => ({ ...e, stage: s.id }))} />)}
                                </div>
                            </Card>
                            <Card>
                                <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#a63d65]">Start faster</div>
                                <h2 className="mb-1 text-[23px] font-black text-[#32133a]">Already have a business plan?</h2>
                                <p className="mb-4 text-[13px] leading-relaxed text-[#6b7280]">Upload it here. CIEL AI can later extract fields for you to confirm — you stay in control of every answer.</p>
                                <label className={clsx("mb-3 block cursor-pointer rounded-2xl border-2 border-dashed border-[#bfc6d7] bg-[#fbfcff] p-5 text-center hover:border-[#a63d65]", uploading && "pointer-events-none opacity-60")}>
                                    <input type="file" className="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void handleDocFile(file, "Full business plan"); }} />
                                    📎 <strong className="text-[#a63d65]">Upload business plan / pitch deck</strong><br /><span className="text-[11.5px] text-[#6b7280]">PDF, Word or PowerPoint · optional</span>
                                    {uploading === "Full business plan" ? <div className="mt-2 text-xs font-extrabold text-[#9b6712]">Uploading…</div> : null}
                                    {docFor("Full business plan") ? <div className="mt-2 text-xs font-extrabold text-[#25683a]">✅ Plan uploaded</div> : null}
                                </label>
                                <VsNotice tone="blue">✨ <b>Student-friendly AI prefill:</b> the system should suggest answers from the uploaded plan, but students must confirm or edit them before submission.</VsNotice>
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
                                <p className="my-3 rounded-md border-l-[3px] border-[#c27698] bg-[#fff7fa] px-2.5 py-2 text-[11px] leading-relaxed text-[#7d6677]"><b>Core fields</b> create the repository record. Everything labelled optional can be left blank if you genuinely do not know it yet.</p>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <VsField label="Venture / business name" tag="core"><input className={vsField} value={entry.ventureName || ""} onChange={(e) => setEntry((s) => ({ ...s, ventureName: e.target.value }))} placeholder="e.g. EcoPack Pakistan" /></VsField>
                                    <VsField label="One-line description" tag="core"><input className={vsField} maxLength={150} value={idea.pitch || ""} onChange={(e) => patchGroup("ideaInfo", { pitch: e.target.value })} placeholder="e.g. Compostable packaging made from crop waste for food SMEs" /></VsField>
                                    <VsField label="University" tag="core"><SearchableSelect value={as.university || ""} onChange={(v) => patchGroup("academicSetup", { university: v })} options={pakistaniUniversities} placeholder="Select university…" /></VsField>
                                    <VsField label="Discipline / programme" tag="core"><VsSelectOther value={as.program || ""} options={DISCIPLINES} onChange={(v) => patchGroup("academicSetup", { program: v })} placeholder="Select discipline…" /></VsField>
                                    <VsField label="City" optional><input className={vsField} value={idea.city || ""} onChange={(e) => patchGroup("ideaInfo", { city: e.target.value })} placeholder="e.g. Lahore" /></VsField>
                                    <VsField label="How did this project originate?" tag="core"><VsSelectOther value={as.origin || ""} options={ORIGINS} onChange={(v) => patchGroup("academicSetup", { origin: v })} /></VsField>
                                    <VsField label="What are you building?" tag="core"><VsSelectOther value={as.ventureType || ""} options={VENTURE_TYPES} onChange={(v) => patchGroup("academicSetup", { ventureType: v })} placeholder="Choose venture type…" /></VsField>
                                    <VsField label="Industry / sector" optional><VsSelectOther value={idea.sector || ""} options={SECTORS_V11} onChange={(v) => patchGroup("ideaInfo", { sector: v })} /></VsField>
                                    <VsField label="Registration / legal status" optional><VsSelectOther value={as.legalStatus || ""} options={LEGAL_STATUSES} onChange={(v) => patchGroup("academicSetup", { legalStatus: v })} placeholder="Choose if known…" /></VsField>
                                </div>
                                <h3 className="mb-2.5 mt-2 text-sm font-black">Founder / team</h3>
                                <p className="mb-3 rounded-xl border border-[#ecdde5] bg-[#f9f1f5] px-3 py-2.5 text-[11px] leading-relaxed text-[#6f5568]">👥 <b>One shared venture record.</b> Team members are linked through university email and phone. They should not create duplicate submissions.</p>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <VsField label="Primary student / founder name" tag="core"><input className={vsField} value={as.founderName || ""} onChange={(e) => patchGroup("academicSetup", { founderName: e.target.value })} placeholder="Full name" /></VsField>
                                    <VsField label="Your role" tag="core"><input className={vsField} value={as.founderRole || ""} onChange={(e) => patchGroup("academicSetup", { founderRole: e.target.value })} placeholder="e.g. Founder / Team Lead / Designer" /></VsField>
                                    <VsField label="University email" tag="core" hint="Private contact field — not shown on the public or investor card."><input className={vsField} type="email" value={as.founderEmail || ""} onChange={(e) => patchGroup("academicSetup", { founderEmail: e.target.value })} placeholder="name@university.edu" /></VsField>
                                    <VsField label="Phone / WhatsApp" tag="core"><PhonePair code={as.founderWhatsappCode} number={as.founderWhatsappNumber} onCode={(v) => patchGroup("academicSetup", { founderWhatsappCode: v })} onNumber={(v) => patchGroup("academicSetup", { founderWhatsappNumber: v })} /></VsField>
                                </div>
                                <VsField label="Why is your team well placed to work on this idea?" optional><input className={vsField} maxLength={220} value={as.teamFit || ""} onChange={(e) => patchGroup("academicSetup", { teamFit: e.target.value })} placeholder="e.g. We are design students who have worked with local textile manufacturers." /></VsField>
                                <VsField label="Founder insight" optional><input className={vsField} maxLength={260} value={as.founderInsight || ""} onChange={(e) => patchGroup("academicSetup", { founderInsight: e.target.value })} placeholder="What do you understand about this customer/problem that outsiders may be missing?" /></VsField>
                                {teamRows.map((m, i) => (
                                    <div key={i} className="mb-2 grid grid-cols-1 items-center gap-2 md:grid-cols-[1.05fr_.85fr_1.15fr_1.15fr_auto]">
                                        <input className={vsField} placeholder="Team member name" value={m.name} onChange={(e) => updateTeam(entry, i, { name: e.target.value }, setEntry)} />
                                        <input className={vsField} placeholder="Role / responsibility" value={m.role} onChange={(e) => updateTeam(entry, i, { role: e.target.value }, setEntry)} />
                                        <input className={vsField} type="email" placeholder="University email" value={m.email || ""} onChange={(e) => updateTeam(entry, i, { email: e.target.value }, setEntry)} />
                                        <PhonePair code={m.whatsappCode || "+92"} number={m.whatsappNumber} onCode={(v) => updateTeam(entry, i, { whatsappCode: v }, setEntry)} onNumber={(v) => updateTeam(entry, i, { whatsappNumber: v }, setEntry)} />
                                        <div className="flex items-center gap-1">
                                            <TeamInviteBadge kind="venture" entryId={entry.id} email={m.email} inviteStatus={m.inviteStatus} />
                                            <button type="button" className="text-lg text-[#b83b4d]" onClick={() => setEntry((s) => ({ ...s, team: s.team.filter((_, idx) => idx !== i) }))} title="Remove">×</button>
                                        </div>
                                    </div>
                                ))}
                                <button type="button" className="bg-transparent p-1 text-xs font-black text-[#a63d65]" onClick={() => setEntry((s) => ({ ...s, team: [...(s.team.length ? s.team : []), { name: "", role: "", email: "", whatsappCode: "+92", whatsappNumber: "" }] }))}>+ Add another team member</button>
                                <VsAiBox title="✨ AI summary building live" text={sums.founder} empty="Your venture identity and team summary will appear here." />
                                <VsNav hideBack saving={saving} onNext={() => goNext(1)} nextLabel="Next →" />
                            </Card>
                        </>
                    )}

                    {step === 1 && (
                        <Card>
                            <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#a63d65]">Step 2 · Problem & customer</div>
                            <h2 className="mb-1 text-[23px] font-black text-[#32133a]">What problem are you solving?</h2>
                            <p className="mb-4 text-[13px] leading-relaxed text-[#6b7280]">Keep it simple. Reviewers want to understand the need, the customer and what evidence you have so far.</p>
                            <VsWhy icon="🔎"><b>Validation can be small.</b> Ten good interviews are better than a made-up “huge market.” Tell us what you actually know today.</VsWhy>
                            <VsField label="The problem / unmet need" tag="core"><textarea className={clsx(vsField, "min-h-[88px]")} maxLength={450} value={idea.problem || ""} onChange={(e) => patchGroup("ideaInfo", { problem: e.target.value })} placeholder="What is happening, to whom, and why does it matter?" /></VsField>
                            <VsField label="Who is your main customer?" tag="core"><input className={vsField} maxLength={180} value={idea.customer || ""} onChange={(e) => patchGroup("ideaInfo", { customer: e.target.value })} placeholder="e.g. small food manufacturers in Lahore" /></VsField>
                            <VsField label="Customer / buyer model" optional><VsChips options={BUYER_MODELS} selected={idea.buyerModels || []} onToggle={(v) => patchGroup("ideaInfo", { buyerModels: toggleChip(idea.buyerModels, v) })} otherKey="Other" /></VsField>
                            <VsField label="What do they currently use instead?" optional><input className={vsField} maxLength={200} value={sol.alternative || ""} onChange={(e) => patchGroup("solutionInfo", { alternative: e.target.value })} placeholder="e.g. imported plastic packaging" /></VsField>
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
                            <h3 className="mb-2 mt-2 text-sm font-black">How do you know the problem is real?</h3>
                            <VsChips options={EVIDENCE_METHODS} selected={idea.evidenceMethods || []} warn={["👁️ Observation only"]} onToggle={(v) => patchGroup("ideaInfo", { evidenceMethods: toggleChip(idea.evidenceMethods, v) })} otherKey="Other evidence" />
                            <p className="my-3 rounded-xl border border-[#ecdde5] bg-[#f9f1f5] px-3 py-2.5 text-[11px] leading-relaxed text-[#6f5568]">Evidence looks different across disciplines: prototypes, buyer feedback, lab results, signed pilots or audience engagement all count.</p>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <VsField label="Interviews completed"><VsUnit unit="people" value={ev.interviews} onChange={(n) => patchGroup("evidenceInfo", { interviews: n })} placeholder="0" min={0} /></VsField>
                                <VsField label="Survey responses"><VsUnit unit="responses" value={ev.surveyResponses} onChange={(n) => patchGroup("evidenceInfo", { surveyResponses: n })} placeholder="0" min={0} /></VsField>
                                <VsField label="People willing to test / buy"><VsUnit unit="people" value={ev.willingToTest} onChange={(n) => patchGroup("evidenceInfo", { willingToTest: n })} placeholder="0" min={0} /></VsField>
                            </div>
                            <h3 className="mb-2 mt-2 text-sm font-black">Your market — rough is fine</h3>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <VsField label="Reachable customer group"><input className={vsField} value={sol.marketWho || ""} onChange={(e) => patchGroup("solutionInfo", { marketWho: e.target.value })} placeholder="e.g. 1,200 restaurants in Lahore" /></VsField>
                                <VsField label="Approx. number of potential customers"><VsUnit unit="customers" value={sol.marketSize ? num(sol.marketSize) : undefined} onChange={(n) => patchGroup("solutionInfo", { marketSize: n != null ? String(n) : undefined })} placeholder="e.g. 1200" min={0} /></VsField>
                                <VsField label="How did you estimate it?"><select className={vsField} value={sol.marketSource || ""} onChange={(e) => patchGroup("solutionInfo", { marketSource: e.target.value })}><option value="">Choose…</option>{MARKET_SOURCES.map((o) => <option key={o}>{o}</option>)}</select></VsField>
                            </div>
                            <h3 className="mb-2 mt-2 text-sm font-black">Competition — one simple question</h3>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <VsField label="If you did not exist, what would the customer choose?"><VsSelectOther value={idea.competitorType || ""} options={COMPETITOR_TYPES} onChange={(v) => patchGroup("ideaInfo", { competitorType: v })} /></VsField>
                                <VsField label="Why might they choose you instead?"><input className={vsField} maxLength={220} value={idea.whyUs || ""} onChange={(e) => patchGroup("ideaInfo", { whyUs: e.target.value })} placeholder="One honest reason" /></VsField>
                                <VsField label="Adoption resistance / switching barrier" optional><input className={vsField} maxLength={240} value={idea.resistance || ""} onChange={(e) => patchGroup("ideaInfo", { resistance: e.target.value })} placeholder="What may stop customers from trying or switching?" /></VsField>
                                <VsField label="Why now?" optional><input className={vsField} maxLength={240} value={idea.whyNow || ""} onChange={(e) => patchGroup("ideaInfo", { whyNow: e.target.value })} placeholder="What has changed that makes this timely?" /></VsField>
                            </div>
                            <VsAiBox title="✨ AI summary building live" text={sums.opportunity} empty="Your problem, customer and evidence summary will appear here." />
                            <VsNav saving={saving} onBack={() => setStep(0)} onNext={() => goNext(2)} nextLabel="Next →" />
                        </Card>
                    )}

                    {step === 2 && (
                        <Card>
                            <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#a63d65]">Step 3 · Solution & business model</div>
                            <h2 className="mb-1 text-[23px] font-black text-[#32133a]">Show us how the business could work.</h2>
                            <p className="mb-4 text-[13px] leading-relaxed text-[#6b7280]">No finance degree required. Questions that do not fit your model can stay blank.</p>
                            <VsField label="Your solution — what are you actually offering?"><textarea className={clsx(vsField, "min-h-[88px]")} maxLength={450} value={sol.solution || ""} onChange={(e) => patchGroup("solutionInfo", { solution: e.target.value })} placeholder="Describe the product, service, platform or experience in plain language." /></VsField>
                            <VsField label="What makes it meaningfully different or difficult to copy?"><input className={vsField} maxLength={240} value={sol.advantage || ""} onChange={(e) => patchGroup("solutionInfo", { advantage: e.target.value })} placeholder="e.g. lower cost, unique customer access, proprietary design" /></VsField>
                            <VsField label="Prototype / demo / portfolio link" optional><input className={vsField} type="url" value={sol.demoUrl || ""} onChange={(e) => patchGroup("solutionInfo", { demoUrl: e.target.value })} placeholder="https://…" /></VsField>
                            <VsField label="How will the venture sustain itself financially?"><VsChips options={REVENUE_MODELS} selected={sol.revenueModels || []} onToggle={(v) => patchGroup("solutionInfo", { revenueModels: toggleChip(sol.revenueModels, v) })} otherKey="Other" /></VsField>
                            <p className="my-3 rounded-xl border border-[#ecdde5] bg-[#f9f1f5] px-3 py-2.5 text-[11px] leading-relaxed text-[#6f5568]">💰 <b>Numbers are optional, but useful.</b> Leave a field blank if it is not meaningful. Identify where key figures come from so AI can distinguish measured facts from estimates.</p>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <VsField label="Main source of your key numbers" optional><VsSelectOther value={sol.numberSourceType || ""} options={NUMBER_SOURCES} onChange={(v) => patchGroup("solutionInfo", { numberSourceType: v })} /></VsField>
                                <VsField label="Source / calculation note" optional><textarea className={clsx(vsField, "min-h-[72px]")} maxLength={500} value={sol.numberSourceNote || ""} onChange={(e) => patchGroup("solutionInfo", { numberSourceNote: e.target.value })} placeholder="Example: Market size = 420 schools from district list × estimated annual spend." /></VsField>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <VsField label="What might one customer pay?"><VsUnit unit="PKR / sale" value={sol.price} onChange={(n) => patchGroup("solutionInfo", { price: n })} placeholder="Optional" min={0} /></VsField>
                                <VsField label="Approx. cost to deliver one sale"><VsUnit unit="PKR / sale" value={sol.unitCost} onChange={(n) => patchGroup("solutionInfo", { unitCost: n })} placeholder="Optional" min={0} /></VsField>
                                <VsField label="Approx. money needed to start"><VsUnit unit="PKR total" value={sol.startupNeed} onChange={(n) => patchGroup("solutionInfo", { startupNeed: n })} placeholder="Optional" min={0} /></VsField>
                            </div>
                            {price > 0 && unitCost > 0 ? <VsNotice>{price > unitCost ? <>🧮 Approximate unit margin: <b>PKR {(price - unitCost).toLocaleString()}</b> ({Math.round(((price - unitCost) / price) * 100)}%). This is an estimate, not a verified financial result.</> : <>⚠️ Current estimated cost is at or above the selling price. That can happen early — it simply becomes an assumption the team should test.</>}</VsNotice> : null}
                            <details className="my-3 rounded-[14px] border border-[#e7dae3] bg-[#fffafd]">
                                <summary className="cursor-pointer px-3.5 py-3 text-[12.5px] font-extrabold text-[#6d315c]">Optional accelerator / investor economics — only if you know them</summary>
                                <div className="px-3.5 pb-3.5">
                                    <p className="mb-3 rounded-md border-l-[3px] border-[#c27698] bg-[#fff7fa] px-2.5 py-2 text-[11px] text-[#7d6677]">These are <b>not required</b> for an early idea.</p>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        <VsField label="Monthly revenue"><VsUnit unit="PKR / month" value={sol.monthlyRevenue} onChange={(n) => patchGroup("solutionInfo", { monthlyRevenue: n })} min={0} /></VsField>
                                        <VsField label="Customer acquisition cost (CAC)"><VsUnit unit="PKR / customer" value={sol.cac} onChange={(n) => patchGroup("solutionInfo", { cac: n })} min={0} /></VsField>
                                        <VsField label="Customer lifetime value (LTV)"><VsUnit unit="PKR / customer" value={sol.ltv} onChange={(n) => patchGroup("solutionInfo", { ltv: n })} min={0} /></VsField>
                                        <VsField label="External funding raised to date"><VsUnit unit="PKR total" value={sol.raised} onChange={(n) => patchGroup("solutionInfo", { raised: n })} min={0} /></VsField>
                                        <VsField label="Gross margin"><VsUnit unit="%" value={sol.grossMargin} onChange={(n) => patchGroup("solutionInfo", { grossMargin: n })} min={0} max={100} step={0.1} /></VsField>
                                        <VsField label="Monthly cash burn"><VsUnit unit="PKR / month" value={sol.burn} onChange={(n) => patchGroup("solutionInfo", { burn: n })} min={0} /></VsField>
                                        <VsField label="Cash runway"><VsUnit unit="months" value={sol.runway} onChange={(n) => patchGroup("solutionInfo", { runway: n })} min={0} step={0.5} /></VsField>
                                    </div>
                                </div>
                            </details>
                            <VsField label="How will customers find you?"><VsChips options={CHANNELS} selected={sol.channels || []} onToggle={(v) => patchGroup("solutionInfo", { channels: toggleChip(sol.channels, v) })} otherKey="Other" /></VsField>
                            {early ? (
                                <><h3 className="mb-2 mt-2 text-sm font-black">Progress so far — early stage</h3>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <VsField label="Mentors consulted"><VsUnit unit="people" value={ev.mentorsConsulted} onChange={(n) => patchGroup("evidenceInfo", { mentorsConsulted: n })} min={0} /></VsField>
                                    <VsField label="Letters of interest"><VsUnit unit="LOIs" value={ev.lettersOfIntent} onChange={(n) => patchGroup("evidenceInfo", { lettersOfIntent: n })} min={0} /></VsField>
                                    <VsField label="Competitions / incubators joined"><VsUnit unit="programs" value={ev.competitionsJoined} onChange={(n) => patchGroup("evidenceInfo", { competitionsJoined: n })} min={0} /></VsField>
                                </div></>
                            ) : proto ? (
                                <><h3 className="mb-2 mt-2 text-sm font-black">Progress so far — prototype / pilot</h3>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <VsField label="People who tested it"><VsUnit unit="people" value={ev.testers} onChange={(n) => patchGroup("evidenceInfo", { testers: n })} min={0} /></VsField>
                                    <VsField label="Pilot partners"><VsUnit unit="pilots" value={ev.pilotPartners} onChange={(n) => patchGroup("evidenceInfo", { pilotPartners: n })} min={0} /></VsField>
                                    <VsField label="Pre-orders / commitments"><VsUnit unit="orders" value={ev.preOrders} onChange={(n) => patchGroup("evidenceInfo", { preOrders: n })} min={0} /></VsField>
                                </div></>
                            ) : (
                                <><h3 className="mb-2 mt-2 text-sm font-black">Progress so far — operating / scaling</h3>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <VsField label="Customers / users"><VsUnit unit="customers" value={ev.customers} onChange={(n) => patchGroup("evidenceInfo", { customers: n })} min={0} /></VsField>
                                    <VsField label="Revenue to date"><VsUnit unit="PKR total" value={ev.revenueToDate} onChange={(n) => patchGroup("evidenceInfo", { revenueToDate: n })} min={0} /></VsField>
                                    <VsField label="Monthly growth"><VsUnit unit="% / month" value={ev.monthlyGrowthPercent} onChange={(n) => patchGroup("evidenceInfo", { monthlyGrowthPercent: n })} /></VsField>
                                </div></>
                            )}
                            <VsField label="Your most important next 12-month milestone"><input className={vsField} maxLength={220} value={sol.milestone12mo || ""} onChange={(e) => patchGroup("solutionInfo", { milestone12mo: e.target.value })} placeholder="e.g. complete MVP, run 2 pilots and reach 200 paying users by June" /></VsField>
                            <VsAiBox title="✨ AI summary building live" text={sums.business} empty="Your solution, business model and traction summary will appear here." />
                            <VsNav saving={saving} onBack={() => setStep(1)} onNext={() => goNext(3)} nextLabel="Next →" />
                        </Card>
                    )}

                    {step === 3 && (
                        <Card>
                            <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#a63d65]">Step 4 · Sustainability & SDGs</div>
                            <h2 className="mb-1 text-[23px] font-black text-[#32133a]">Does your venture have a meaningful SDG connection?</h2>
                            <p className="mb-4 text-[13px] leading-relaxed text-[#6b7280]">There is no penalty for choosing “Not linked.” CIEL PK wants an accurate repository, not forced SDG claims.</p>
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
                                        <VsField label="12-month target (optional)"><input className={vsField} value={sm.indicators?.[0]?.target12mo || ""} onChange={(e) => patchGroup("sdgMapping", { indicators: [{ ...(sm.indicators?.[0] || {}), indicator: sm.indicators?.[0]?.indicator, target12mo: e.target.value }] })} placeholder="e.g. 10,000 kg" /></VsField>
                                    </div>
                                </>
                            )}
                            {sm.mode === "review" && (
                                <>
                                    <VsNotice tone="blue">💡 Your venture will be marked <b>“SDG mapping assistance requested.”</b> The student confirms the mapping; AI does not force it.</VsNotice>
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
                                    <VsField label="Optional: does the business currently consider any responsible-business practices?"><VsChips options={RESPONSIBILITY_PRACTICES} selected={sm.responsibility || []} warn={["None currently"]} onToggle={(v) => patchGroup("sdgMapping", { responsibility: toggleChip(sm.responsibility, v) })} otherKey="Other" /></VsField>
                                </>
                            )}
                            <VsAiBox title="✨ Sustainability summary" text={sums.impact} empty="Choose one of the three SDG options above." />
                            <VsNav saving={saving} onBack={() => setStep(2)} onNext={() => goNext(4)} nextLabel="Next →" />
                        </Card>
                    )}

                    {step === 4 && (
                        <Card>
                            <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#a63d65]">Step 5 · Where could this go next?</div>
                            <h2 className="mb-1 text-[23px] font-black text-[#32133a]">What would help your venture move forward?</h2>
                            <p className="mb-4 text-[13px] leading-relaxed text-[#6b7280]">This does not automatically send your project to investors. It helps the university and CIEL PK understand what type of support could be useful.</p>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <VsField label="Biggest risk or resistance" optional><input className={vsField} maxLength={250} value={ev.risk || ""} onChange={(e) => patchGroup("evidenceInfo", { risk: e.target.value })} placeholder="e.g. supplier dependency, customer trust, regulation" /></VsField>
                                <VsField label="How could you reduce that risk?" optional><input className={vsField} maxLength={250} value={ev.mitigation || ""} onChange={(e) => patchGroup("evidenceInfo", { mitigation: e.target.value })} placeholder="e.g. second supplier, pilot evidence, certification" /></VsField>
                            </div>
                            <VsField label="Biggest assumption you still need to test" optional><input className={vsField} maxLength={250} value={ev.assumption || ""} onChange={(e) => patchGroup("evidenceInfo", { assumption: e.target.value })} placeholder="e.g. schools will sign annual contracts after a 4-week pilot" /></VsField>
                            <VsField label="Regulatory / legal / approval barrier" optional><VsSelectOther value={ev.regulatoryBarrier || ""} options={REG_BARRIERS} onChange={(v) => patchGroup("evidenceInfo", { regulatoryBarrier: v })} placeholder="Choose if relevant…" /></VsField>
                            <VsField label="Support you may need"><VsChips options={SUPPORT_NEEDS} selected={ev.openTo || []} warn={["Nothing yet"]} onToggle={(v) => patchGroup("evidenceInfo", { openTo: toggleChip(ev.openTo, v) })} otherKey="Other" /></VsField>
                            {fundingOn && (
                                <>
                                    <VsNotice tone="blue">Funding questions only appear because you selected <b>Investment funding</b>.</VsNotice>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        <VsField label="Amount sought"><VsUnit unit="PKR" value={ev.fundingSought} onChange={(n) => patchGroup("evidenceInfo", { fundingSought: n })} placeholder="e.g. 2500000" min={0} /></VsField>
                                        <VsField label="What would you spend it on?"><input className={vsField} value={ev.useOfFunds || ""} onChange={(e) => patchGroup("evidenceInfo", { useOfFunds: e.target.value })} placeholder="e.g. product development + pilot launch" /></VsField>
                                        <VsField label="What would that achieve?"><input className={vsField} value={ev.expectedResult || ""} onChange={(e) => patchGroup("evidenceInfo", { expectedResult: e.target.value })} placeholder="e.g. 300 paying users in 6 months" /></VsField>
                                    </div>
                                    <details className="my-3 rounded-[14px] border border-[#e7dae3] bg-[#fffafd]">
                                        <summary className="cursor-pointer px-3.5 py-3 text-[12.5px] font-extrabold text-[#6d315c]">Optional funding terms & long-term outcome</summary>
                                        <div className="px-3.5 pb-3.5">
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                                <VsField label="Indicative valuation"><VsUnit unit="PKR" value={ev.valuation} onChange={(n) => patchGroup("evidenceInfo", { valuation: n })} min={0} /></VsField>
                                                <VsField label="Equity you may consider offering"><VsUnit unit="%" value={ev.equityPercent} onChange={(n) => patchGroup("evidenceInfo", { equityPercent: n })} min={0} max={100} step={0.1} /></VsField>
                                                <VsField label="Current founder / team ownership"><VsUnit unit="%" value={ev.founderOwnership} onChange={(n) => patchGroup("evidenceInfo", { founderOwnership: n })} min={0} max={100} step={0.1} /></VsField>
                                                <VsField label="Funding runway created"><VsUnit unit="months" value={ev.fundRunway} onChange={(n) => patchGroup("evidenceInfo", { fundRunway: n })} min={0} step={0.5} /></VsField>
                                            </div>
                                            <VsField label="Exit / long-term ownership strategy" optional><VsSelectOther value={ev.exitStrategy || ""} options={EXIT_STRATEGIES} onChange={(v) => patchGroup("evidenceInfo", { exitStrategy: v })} placeholder="Not decided / not relevant yet" /></VsField>
                                        </div>
                                    </details>
                                </>
                            )}
                            <VsField label="One thing you learned while developing this idea" tag="core" hint="Aim for 2–4 honest sentences. No polished essay required."><textarea className={clsx(vsField, "min-h-[88px]")} maxLength={650} value={ev.reflection || ""} onChange={(e) => patchGroup("evidenceInfo", { reflection: e.target.value })} placeholder="What changed in your thinking about the customer, solution or business?" /></VsField>
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
                                        <VsNotice tone="green">✅ You can still control what is shared later. Approved investors should only see a curated Venture Card, and any direct introduction should require your approval.</VsNotice>
                                        <label className="flex items-start gap-2 text-xs font-bold text-[#1e293b]"><input type="checkbox" className="mt-0.5" checked={!!entry.reviewPipeline?.declarationConsent} onChange={(e) => patchGroup("reviewPipeline", { declarationConsent: e.target.checked })} />I authorize my university and CIEL PK to consider this venture for approved external opportunities. I understand that my contact details and full documents should not be shared without further permission.</label>
                                    </>
                                )}
                            </div>
                            <VsAiBox title="✨ Next-step summary" text={sums.ask} empty="Your support needs, learning and opportunity preference will appear here." />
                            <VsNav saving={saving} onBack={() => setStep(3)} onNext={() => goNext(5)} nextLabel="Review →" />
                        </Card>
                    )}

                    {step === 5 && (
                        <>
                            <Card>
                                <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#a63d65]">Step 6 · Review</div>
                                <h2 className="mb-1 text-[23px] font-black text-[#32133a]">Your AI-drafted Venture Profile</h2>
                                <p className="mb-4 text-[13px] leading-relaxed text-[#6b7280]">Review each AI-drafted section summary before submission. <b>Accept or edit the summary</b> so the final repository flashcard accurately reflects what you meant. Faculty will separately receive an independent <b>CIEL AI Critical Review</b> based on your raw answers; that critical review cannot be edited by the student.</p>
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
                                    <p className="mb-3 text-[13px] text-[#6b7280]">These files stay attached to the same venture record.</p>
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
                                    <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-3.5"><h4 className="mb-1 text-[12.5px] font-black text-[#32133a]">🏛 University / Faculty Lens</h4><p className="m-0 text-[11px] leading-relaxed text-[#6b7280]">Full academic record: project origin, student/team, evidence, stage, business logic, risks, SDG status, completeness, AI potential and verification history.</p></div>
                                    <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-3.5"><h4 className="mb-1 text-[12.5px] font-black text-[#32133a]">💼 Investor / Partner Lens</h4><p className="m-0 text-[11px] leading-relaxed text-[#6b7280]">Only after student opt-in + review: concise venture card with problem, solution, market, traction, advantage and ask. Contact details remain locked until an introduction is approved.</p></div>
                                </div>
                            </Card>
                            <Card>
                                <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#a63d65]">CIEL Venture Intelligence</div>
                                <h2 className="mb-1 text-[23px] font-black text-[#32133a]">Potential, evidence & readiness — sustainability remains separate</h2>
                                <p className="mb-4 text-[13px] text-[#6b7280]">This is a stage-adjusted pre-screen. Final rankings should be reviewed by faculty / university / CIEL PK.</p>
                                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                    {[
                                        { k: "Venture Potential Score", v: `${score}/100`, bar: score },
                                        { k: "Evidence Confidence", v: evidenceLabel(snap) },
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
                                <p className="mt-2 text-[10.8px] leading-relaxed text-[#6b7280]">“Investor-Ready” is intentionally harder to earn than a high venture-potential score.</p>
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
                            <div className="mt-4"><button type="button" onClick={() => setStep(4)} className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-[13px] font-extrabold text-[#6b7280]">← Back</button></div>
                        </>
                    )}
                    {error && step !== 5 ? <p className="mt-3 text-xs font-semibold text-[#b83b4d]">{error}</p> : null}
                </main>

                <aside className="lg:sticky lg:top-3.5">
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
                            {[["Problem", snap.problem || "—"], ["Customer", snap.customer || "—"], ["Solution", snap.solution || "—"], ["Business model", snap.revenueModels.join(" + ") || "—"], ["Validation", validationLine(snap)], ["SDG status", sdgStatusLabel(snap)], ["Next step", snap.support.join(" · ") || "—"]].map(([k, v]) => (
                                <div key={k} className="grid grid-cols-[105px_1fr] gap-2 border-b border-[#e5e7eb] py-2 text-xs last:border-0"><span className="font-extrabold text-[#6b7280]">{k}</span><div className="break-words">{v}</div></div>
                            ))}
                        </div>
                    </div>
                    <Card>
                        <div className="mb-2.5 text-[11px] font-black uppercase tracking-[0.12em] text-[#6b7280]">Venture Compass · live coaching</div>
                        <div className="grid grid-cols-2 gap-2">
                            {([["problem", "🎯 Problem clarity"], ["evidence", "🔎 Evidence"], ["market", "📈 Market"], ["business", "💰 Business logic"], ["defence", "🛡 Defensibility"], ["team", "👥 Team & execution"]] as const).map(([k, label]) => (
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
                        <div className="mb-2.5 text-[11px] font-black uppercase tracking-[0.12em] text-[#6b7280]">Repository logic</div>
                        <p className="text-[10.8px] leading-relaxed text-[#6b7280]">✅ All ventures: one university repository record<br /><br />👥 Team: linked to the same venture record<br /><br />🔒 Contact details: private by default<br /><br />📎 Evidence: attached once, reused for review<br /><br />🌍 SDG-linked: separate sustainability analytics<br /><br />⭐ High-potential: reviewer shortlist<br /><br />💼 External showcase: student opt-in + verification</p>
                    </Card>
                </aside>
            </div>
            <p className="mt-3 text-center text-[10.5px] leading-relaxed text-[#8b93a3]">CIEL PK · Venture Studio v11 · Student Builder → University Review → Consented Opportunity Card</p>
        </div>
    );
}
