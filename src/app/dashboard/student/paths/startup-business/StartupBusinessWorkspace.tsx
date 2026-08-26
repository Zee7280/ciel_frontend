"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, UploadCloud } from "lucide-react";
import clsx from "clsx";
import { authenticatedFetch } from "@/utils/api";
import { sdgData } from "@/utils/sdgData";
import PathWorkspaceShell from "@/components/ciel/PathWorkspaceShell";
import { WorkspaceSkeleton } from "@/components/ciel/Skeleton";
import { TeamInviteBadge } from "@/components/ciel/TeamInviteBadge";

// ---------------------------------------------------------------------------
// Types (mirror ciel_backend/src/paths/entities/venture-entry.entity.ts's new groups)
// ---------------------------------------------------------------------------

interface TractionRow { date: string; metric: string; value: string; note?: string }
interface TeamMember {
    name: string;
    role: string;
    email?: string;
    /** Server-computed — 'accepted' only once this teammate clicked their emailed invite link. */
    inviteStatus?: "pending" | "accepted";
}
interface VentureDocument { type: string; version: number; fileUrl: string; uploadedAt: string }

interface VentureAcademicSetup {
    /** @deprecated single-select predecessor of submissionTypes — still read as a fallback for older entries. */
    submissionType?: string;
    /** Multi-select — a venture can legitimately be both e.g. a Final-Year Project and started as coursework. Supersedes submissionType above. */
    submissionTypes?: string[];
    university?: string; campus?: string; faculty?: string; department?: string;
    program?: string; academicYear?: string; semester?: string; courseCode?: string; groupId?: string;
    supervisorName?: string; supervisorEmail?: string; coSupervisor?: string; deadline?: string; teamType?: string; industrySponsor?: string;
    ethicsApproval?: string; confidentialityStatus?: string; ipOwnership?: string;
    founderName?: string; founderRole?: string; founderCredentials?: string;
}
interface VentureIdeaInfo {
    problem?: string; proofFact?: string; payerWho?: string; userWho?: string; beneficiaryWho?: string;
    sector?: string; city?: string; pitch?: string;
}
interface VentureSolutionInfo {
    solution?: string; alternative?: string; advantage?: string; revenue?: string; costPerSale?: string;
    milestone12mo?: string; marketWho?: string; marketSize?: string; marketSource?: string;
}
interface VentureSdgEntry { goalNumber: number; targets: string[]; how?: string }
interface VentureIndicator { indicator?: string; forGoal?: string; target12mo?: string; verifiedBy?: string }
interface VentureSdgMapping { entries?: VentureSdgEntry[]; mode?: "map" | "review" | "none"; howImpact?: string; indicators?: VentureIndicator[] }
interface VentureEvidenceInfo {
    interviews?: number; surveyResponses?: number; willingToTest?: number;
    testers?: number; pilotPartners?: number; preOrders?: number;
    customers?: number; revenueToDate?: number; monthlyGrowthPercent?: number; repeatPercent?: number; partnerships?: number; lettersOfIntent?: number;
    fundingSought?: number; useOfFunds?: string; expectedResult?: string; openTo?: string[];
}
interface VentureReviewPipeline {
    declarationWork?: boolean; declarationConsent?: boolean; studentDeclaredAt?: string;
    supervisorStatus?: "not_started" | "pending" | "approved" | "revisions_requested";
    universityStatus?: "not_started" | "pending" | "approved";
    sdgReviewStatus?: "not_started" | "pending" | "approved";
}
interface VenturePublishSettings {
    audience?: "private" | "university" | "partners" | "investors";
    showName?: boolean; showTeam?: boolean; showUniversity?: boolean; showTraction?: boolean; showAsk?: boolean; acceptIntros?: boolean;
}
interface VentureTeamConsentEntry { name: string; consented: boolean }
interface VentureSectionSummaries { opportunity?: string; advantage?: string; business?: string; traction?: string; impact?: string; ask?: string; founder?: string }
interface VentureGates { academicOk: boolean; showcaseOk: boolean; investmentReadyOk: boolean }

interface VentureEntry {
    id?: string;
    ventureName: string | null;
    description: string | null;
    stage: string | null;
    tractionRows: TractionRow[];
    team: TeamMember[];
    materialUrls: string[];
    isVisible: boolean;
    academicSetup: VentureAcademicSetup | null;
    documents: VentureDocument[];
    ideaInfo: VentureIdeaInfo | null;
    solutionInfo: VentureSolutionInfo | null;
    sdgMapping: VentureSdgMapping | null;
    evidenceInfo: VentureEvidenceInfo | null;
    reviewPipeline: VentureReviewPipeline | null;
    publishSettings: VenturePublishSettings | null;
    teamConsent: VentureTeamConsentEntry[];
    sectionSummaries: VentureSectionSummaries | null;
    stepCompleted: number;
    status: "draft" | "submitted";
    gates?: VentureGates;
    /** False when this entry is showing because the viewer accepted a team invite on someone
     * else's submitted venture, not because they own it — gates edit/submit access on the frontend. */
    isOwner?: boolean;
}

const EMPTY: VentureEntry = {
    ventureName: "", description: "", stage: "", tractionRows: [], team: [], materialUrls: [], isVisible: false,
    academicSetup: {}, documents: [], ideaInfo: {}, solutionInfo: {}, sdgMapping: { entries: [], mode: "map" },
    evidenceInfo: { openTo: [] }, reviewPipeline: {}, publishSettings: {}, teamConsent: [], sectionSummaries: {},
    stepCompleted: 0, status: "draft",
};

function mergeEntry(base: VentureEntry, data: Partial<VentureEntry>): VentureEntry {
    return {
        ...base,
        ...data,
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
    };
}

// ---------------------------------------------------------------------------
// Static option lists (mirror the prototype)
// ---------------------------------------------------------------------------

const STEPS = [
    { key: "who", emoji: "🎓", label: "Who you are" },
    { key: "upload", emoji: "📄", label: "Upload plan" },
    { key: "idea", emoji: "💡", label: "Your idea" },
    { key: "solution", emoji: "⚙️", label: "How it works" },
    { key: "sdg", emoji: "🌍", label: "Who it helps" },
    { key: "evidence", emoji: "📈", label: "Your proof" },
    { key: "review", emoji: "🧑‍🏫", label: "Supervisor" },
    { key: "publish", emoji: "🚀", label: "Go public" },
];

const SUBMISSION_TYPES = ["Final-Year Project", "Course project", "Independent venture", "Operating startup"];
const STAGE_OPTIONS = [
    { id: "Idea", d: "Concept stage" },
    { id: "Business Plan", d: "Written, not launched" },
    { id: "Prototype / MVP", d: "Being built or built" },
    { id: "Pilot", d: "Real users testing" },
    { id: "Early Revenue", d: "Earning money" },
    { id: "Growth", d: "Scaling beyond first market" },
];
const SECTORS = ["Agriculture & food", "Education / EdTech", "Health & biotech", "Energy & climate", "Fintech", "Textile & crafts", "Transport & logistics", "Waste & recycling", "Housing", "Media", "Tourism", "Retail & e-commerce", "Other"];
const MARKET_SOURCE_OPTIONS = ["Counted it", "Published report / government data", "Partner estimate", "Educated guess — needs checking"];
const HOW_IMPACT_OPTIONS = ["Core product impact — the product itself creates it", "Operational sustainability — how you run the business", "Supply-chain impact", "Employment impact", "Community / CSR activity (kept distinct from core impact)", "Future intended impact"];
const OPEN_TO_OPTIONS = ["Equity investment", "Grant", "Mentorship", "Pilot customers", "Incubation", "Manufacturing / distribution"];
const DOC_TYPES: { type: string; requirement: string }[] = [
    { type: "Full business plan", requirement: "Required for FYP" },
    { type: "Executive summary", requirement: "Optional" },
    { type: "Pitch deck", requirement: "Optional" },
    { type: "Financial projections", requirement: "Required for Investment Ready" },
    { type: "Customer research", requirement: "Evidence" },
    { type: "Prototype / product media", requirement: "Evidence" },
    { type: "Registration / ethics documents", requirement: "Conditional" },
];
const AUDIENCE_OPTIONS: { id: "private" | "university" | "partners" | "investors"; label: string }[] = [
    { id: "private", label: "Private — no card" },
    { id: "university", label: "My university only" },
    { id: "partners", label: "CIEL partners & incubators" },
    { id: "investors", label: "Approved investors" },
];
const SECTION_LABELS: Record<keyof VentureSectionSummaries, { emoji: string; label: string }> = {
    opportunity: { emoji: "🎯", label: "The opportunity" },
    advantage: { emoji: "🛡️", label: "Advantage" },
    business: { emoji: "💰", label: "Business potential" },
    traction: { emoji: "📈", label: "Evidence & traction" },
    impact: { emoji: "🌍", label: "Impact" },
    ask: { emoji: "🤝", label: "Opportunity sought" },
    founder: { emoji: "🧑‍💼", label: "Founder & team" },
};
const SECTION_KEYS: (keyof VentureSectionSummaries)[] = ["opportunity", "advantage", "business", "traction", "impact", "ask", "founder"];

const fieldClass = "w-full rounded-ciel-sm border-2 border-ciel-border bg-ciel-page/50 px-4 py-3 text-sm font-semibold text-ciel-text outline-none focus:border-ciel-green focus:bg-white focus-visible:ring-2 focus-visible:ring-ciel-green";
const labelClass = "text-xs font-bold uppercase tracking-widest text-ciel-text-soft";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className={labelClass}>{label}</label>
            {hint ? <p className="text-xs text-ciel-text-soft">{hint}</p> : null}
            {children}
        </div>
    );
}

function ChipGroup({ options, selected, onToggle, single }: { options: string[]; selected: string[]; onToggle: (v: string) => void; single?: boolean }) {
    return (
        <div className="flex flex-wrap gap-2">
            {options.map((opt) => {
                const isSel = selected.includes(opt);
                return (
                    <button
                        key={opt}
                        type="button"
                        onClick={() => onToggle(opt)}
                        className={clsx(
                            "ciel-transition rounded-full border-2 px-3.5 py-2 text-xs font-bold",
                            isSel ? "border-ciel-green bg-ciel-green-soft text-ciel-green-deep" : "border-ciel-border text-ciel-text-mid hover:border-ciel-green/40",
                        )}
                    >
                        {opt}
                    </button>
                );
            })}
            {single ? null : null}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Compose — builds each section's summary from the student's own answers.
// ---------------------------------------------------------------------------

function cap(s: string) {
    const t = (s || "").trim();
    return t ? t.replace(/\.$/, "").charAt(0).toUpperCase() + t.replace(/\.$/, "").slice(1) : "";
}
/** Strips a trailing period without changing case — for free text embedded mid-sentence, where a
 * literal "." is appended right after it and a student-typed period would otherwise double up. */
function stripPeriod(s: string) {
    return (s || "").trim().replace(/\.$/, "");
}

function stageAdaptedTraction(entry: VentureEntry): string[] {
    const ev = entry.evidenceInfo || {};
    const stage = entry.stage || "";
    const out: string[] = [];
    const idea = ["Idea", "Business Plan"].includes(stage) || !stage;
    const proto = ["Prototype / MVP", "Pilot"].includes(stage);
    const ops = ["Early Revenue", "Growth"].includes(stage);
    if (idea) {
        if (ev.interviews) out.push(`${ev.interviews} interviews`);
        if (ev.surveyResponses) out.push(`${ev.surveyResponses} survey responses`);
        if (ev.willingToTest) out.push(`${ev.willingToTest} willing to test`);
    }
    if (proto) {
        if (ev.testers) out.push(`${ev.testers} testers`);
        if (ev.pilotPartners) out.push(`${ev.pilotPartners} pilot partners`);
        if (ev.preOrders) out.push(`${ev.preOrders} pre-orders / LOIs`);
    }
    if (ops) {
        if (ev.customers) out.push(`${ev.customers.toLocaleString()} users`);
        if (ev.revenueToDate) out.push(`PKR ${ev.revenueToDate.toLocaleString()} revenue`);
        if (ev.monthlyGrowthPercent) out.push(`${ev.monthlyGrowthPercent}% monthly growth`);
        if (ev.repeatPercent) out.push(`${ev.repeatPercent}% repeat`);
        if (ev.partnerships) out.push(`${ev.partnerships} partnerships`);
        if (ev.lettersOfIntent) out.push(`${ev.lettersOfIntent} LOIs`);
    }
    return out;
}

function composeSummaries(entry: VentureEntry): VentureSectionSummaries {
    const idea = entry.ideaInfo || {};
    const sol = entry.solutionInfo || {};
    const sm = entry.sdgMapping || {};
    const ev = entry.evidenceInfo || {};

    const s: VentureSectionSummaries = {};

    s.opportunity = idea.problem
        ? `${cap(idea.problem)}.${idea.proofFact ? ` Strongest fact: ${stripPeriod(idea.proofFact)}.` : ""} Solution: ${sol.solution || "—"}.`
        : "";
    s.advantage = sol.advantage ? `${cap(sol.advantage)}.` : "";
    s.business = sol.revenue
        ? `Customers: ${stripPeriod(idea.payerWho || sol.marketWho || "—")}. Revenue: ${stripPeriod(sol.revenue)}. Market: ${sol.marketWho || "—"}${sol.marketSize ? ` (est. ${sol.marketSize}${sol.marketSource ? `, ${sol.marketSource.toLowerCase()}` : ""})` : ""}. Milestone: ${stripPeriod(sol.milestone12mo || "—")}.`
        : "";
    const tractionPills = stageAdaptedTraction(entry);
    s.traction = tractionPills.length ? `${tractionPills.join(" · ")}.` : "";
    s.impact = sm.mode === "none"
        ? "No SDG claim — commercial venture (recorded, not reviewed as impact)."
        : sm.mode === "review"
          ? "SDG review requested — pending reviewer assessment."
          : (sm.entries || []).length
            ? `${(sm.entries || []).map((en, i) => `SDG ${en.goalNumber} (${i === 0 ? "primary" : "secondary"}${en.targets?.[0] ? `, target ${en.targets[0]}` : ""})`).join(", ")}.${entry.sdgMapping?.howImpact ? ` Created via: ${entry.sdgMapping.howImpact.split(" — ")[0].toLowerCase()}.` : ""}${(sm.indicators || []).length ? ` Indicators: ${(sm.indicators || []).map((x) => `${x.indicator || ""}${x.target12mo ? ` → ${x.target12mo}` : ""} (${x.verifiedBy || "—"})`).join("; ")}.` : ""}`
            : "";
    const openTo = (ev.openTo || []).join(" · ");
    s.ask = ev.fundingSought
        ? `Seeking PKR ${ev.fundingSought.toLocaleString()}${ev.useOfFunds ? ` — use of funds: ${stripPeriod(ev.useOfFunds)}` : ""}${ev.expectedResult ? ` — expected: ${stripPeriod(ev.expectedResult)}` : ""}.${openTo ? ` Also open to: ${openTo}.` : ""}`
        : (openTo ? `Open to: ${openTo}.` : "");
    const as = entry.academicSetup || {};
    s.founder = as.founderName
        ? `${as.founderName}${as.founderCredentials ? ` — ${as.founderCredentials}` : ""}.${(entry.team || []).length ? ` Team: ${entry.team.length} members.` : ""}`
        : "";

    return s;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StartupBusinessWorkspace() {
    const [loading, setLoading] = useState(true);
    const [entry, setEntry] = useState<VentureEntry>(EMPTY);
    const [step, setStep] = useState(0);
    const [editing, setEditing] = useState(false);
    const [review, setReview] = useState<Record<string, { accepted: boolean; edited: boolean; text: string }>>({});
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        authenticatedFetch("/api/v1/paths/startup-business", {}, { redirectToLogin: false })
            .then((res) => (res?.ok ? res.json() : null))
            .then((result) => {
                if (result?.data) {
                    const data = result.data as Partial<VentureEntry>;
                    setEntry(mergeEntry(EMPTY, data));
                    setStep(Math.min(7, data.stepCompleted ?? 0));
                }
            })
            .finally(() => setLoading(false));
    }, []);

    const sums = composeSummaries(entry);
    const isOwner = entry.isOwner !== false;
    const showCard = (entry.status === "submitted" && !editing) || !isOwner;

    const save = async (patch: Partial<VentureEntry>, advanceTo?: number) => {
        setSaving(true);
        setError(null);
        const nextStepCompleted = advanceTo !== undefined ? Math.max(entry.stepCompleted, advanceTo) : entry.stepCompleted;
        try {
            const res = await authenticatedFetch(
                "/api/v1/paths/startup-business",
                { method: "PATCH", body: JSON.stringify({ ...patch, stepCompleted: nextStepCompleted }) },
                { redirectToLogin: false },
            );
            const result = res?.ok ? await res.json() : null;
            if (!result?.data) throw new Error("Could not save your progress");
            setEntry((e) => mergeEntry(e, result.data as Partial<VentureEntry>));
            if (advanceTo !== undefined) setStep(Math.min(7, advanceTo));
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save your progress");
            return false;
        } finally {
            setSaving(false);
        }
    };

    const patchGroup = <K extends keyof VentureEntry>(key: K, patch: Partial<NonNullable<VentureEntry[K]>>) => {
        setEntry((e) => ({ ...e, [key]: { ...(e[key] as object), ...patch } }));
    };

    const updateTeamMember = (i: number, patch: Partial<TeamMember>) => {
        const current = entry.team.length ? entry.team : [{ name: "", role: "" }];
        const next = [...current];
        next[i] = { ...next[i], ...patch };
        setEntry((s) => ({ ...s, team: next }));
    };

    /** Populate un-accepted/un-edited review blocks whenever the publish step opens — prefers the student's previously saved/edited wording over a fresh draft, so reopening an already-submitted venture doesn't discard their earlier edits. */
    useEffect(() => {
        if (step !== 7) return;
        setReview((prev) => {
            const next = { ...prev };
            for (const key of SECTION_KEYS) {
                const existing = next[key];
                if (!existing || (!existing.accepted && !existing.edited)) {
                    const saved = entry.sectionSummaries?.[key];
                    next[key] = { accepted: false, edited: false, text: saved || sums[key] || "" };
                }
            }
            return next;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    const regenerateAllReview = () => {
        setReview(() => {
            const next: Record<string, { accepted: boolean; edited: boolean; text: string }> = {};
            for (const key of SECTION_KEYS) next[key] = { accepted: false, edited: false, text: sums[key] || "" };
            return next;
        });
    };
    const acceptedCount = SECTION_KEYS.filter((k) => review[k]?.accepted).length;
    const filledSections = SECTION_KEYS.filter((k) => (sums[k] || "").trim().length > 0);
    const allAccepted = filledSections.length > 0 && filledSections.every((k) => review[k]?.accepted);
    const finalSectionSummaries = (): VentureSectionSummaries => {
        const out: VentureSectionSummaries = {};
        for (const key of SECTION_KEYS) out[key] = review[key]?.text ?? sums[key] ?? "";
        return out;
    };

    const hasBusinessPlan = entry.documents.some((d) => d.type === "Full business plan");
    const handleDocFile = async (file: File, type: string) => {
        setUploading(type);
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
            const putRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
            if (!putRes.ok) throw new Error("Upload failed — please try again");
            const res = await authenticatedFetch(
                "/api/v1/paths/startup-business/documents",
                { method: "POST", body: JSON.stringify({ type, fileUrl: publicUrl }) },
                { redirectToLogin: false },
            );
            const result = res?.ok ? await res.json() : null;
            if (result?.data?.documents) setEntry((e) => ({ ...e, documents: result.data.documents }));
        } catch {
            setError("Upload failed. Try again.");
        } finally {
            setUploading(null);
        }
    };

    const saveAllFields = () => ({
        ventureName: entry.ideaInfo?.pitch !== undefined ? (entry.ventureName ?? undefined) : entry.ventureName ?? undefined,
        description: entry.description ?? undefined,
        stage: entry.stage ?? undefined,
        team: entry.team ?? undefined,
        academicSetup: entry.academicSetup ?? undefined,
        ideaInfo: entry.ideaInfo ?? undefined,
        solutionInfo: entry.solutionInfo ?? undefined,
        sdgMapping: entry.sdgMapping ?? undefined,
        evidenceInfo: entry.evidenceInfo ?? undefined,
        reviewPipeline: entry.reviewPipeline ?? undefined,
        publishSettings: entry.publishSettings ?? undefined,
        teamConsent: entry.teamConsent ?? undefined,
    });

    if (loading) return <WorkspaceSkeleton />;

    const picked = entry.sdgMapping?.entries ?? [];
    const toggleGoal = (num: number) => {
        const exists = picked.some((p) => p.goalNumber === num);
        if (exists) patchGroup("sdgMapping", { entries: picked.filter((p) => p.goalNumber !== num) });
        else {
            if (picked.length >= 3) return;
            patchGroup("sdgMapping", { entries: [...picked, { goalNumber: num, targets: [] }], mode: "map" });
        }
    };
    const toggleTarget = (num: number, targetId: string) => {
        patchGroup("sdgMapping", {
            entries: picked.map((p) => (p.goalNumber !== num ? p : { ...p, targets: p.targets.includes(targetId) ? p.targets.filter((t) => t !== targetId) : [...p.targets, targetId] })),
        });
    };
    const setHow = (num: number, how: string) => {
        patchGroup("sdgMapping", { entries: picked.map((p) => (p.goalNumber === num ? { ...p, how } : p)) });
    };

    const declared = !!entry.reviewPipeline?.declarationWork && !!entry.reviewPipeline?.declarationConsent;
    const stage = entry.stage || "";
    const showIdeaEvidence = ["Idea", "Business Plan"].includes(stage) || !stage;
    const showProtoEvidence = ["Prototype / MVP", "Pilot"].includes(stage);
    const showOpsEvidence = ["Early Revenue", "Growth"].includes(stage);

    const gates = entry.gates || { academicOk: false, showcaseOk: false, investmentReadyOk: false };
    const teamNames = (entry.team || []).map((t) => t.name).filter(Boolean);
    const teamConsentMap = new Map((entry.teamConsent || []).map((t) => [t.name, t.consented]));
    const allTeamConsented = teamNames.length === 0 || teamNames.every((n) => teamConsentMap.get(n));

    return (
        <PathWorkspaceShell
            title="Startup / Business"
            stats={[
                { label: "Status", value: entry.status === "submitted" ? "Submitted" : "Draft" },
                { label: "Steps complete", value: `${entry.stepCompleted}/8`, hint: "Contributes to sections 5, 7 of your impact score" },
            ]}
            tabs={[{ key: "build", label: "Build my venture record" }]}
            activeTab="build"
            onTabChange={() => {}}
        >
            {showCard ? (
                <div className="space-y-4 rounded-ciel-lg border border-ciel-border bg-white p-6 shadow-sm">
                    {!isOwner && (
                        <div className="rounded-ciel-sm border border-ciel-indigo/30 bg-ciel-indigo-soft/60 p-3 text-sm font-semibold text-ciel-indigo">
                            👥 You&apos;re named as a team member on this venture — the founder owns it and is the only one who can edit or submit changes.
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-sm font-bold text-ciel-green-deep">
                        <CheckCircle2 className="h-5 w-5" /> Submitted — awaiting supervisor sign-off
                    </div>
                    <p className="text-lg font-black text-ciel-text">{entry.ventureName || "Untitled venture"}</p>
                    <p className="text-sm text-ciel-text-mid">
                        {entry.stage || ""} {entry.ideaInfo?.sector ? `· ${entry.ideaInfo.sector}` : ""} {entry.ideaInfo?.city ? `· ${entry.ideaInfo.city}` : ""}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <span className={clsx("rounded-full px-2.5 py-1 text-[11px] font-bold", gates.academicOk ? "bg-ciel-green-soft text-ciel-green-deep" : "bg-ciel-border text-ciel-text-mid")}>
                            {gates.academicOk ? "✓ Academic submission complete" : "Academic submission incomplete"}
                        </span>
                        <span className={clsx("rounded-full px-2.5 py-1 text-[11px] font-bold", gates.showcaseOk ? "bg-ciel-indigo-soft text-ciel-indigo" : "bg-ciel-border text-ciel-text-mid")}>
                            {gates.showcaseOk ? "✓ Showcase Ready" : "Showcase locked"}
                        </span>
                        <span className={clsx("rounded-full px-2.5 py-1 text-[11px] font-bold", gates.investmentReadyOk ? "bg-ciel-navy text-white" : "bg-ciel-border text-ciel-text-mid")}>
                            {gates.investmentReadyOk ? "★ Investment Ready" : "Not investment-ready yet"}
                        </span>
                    </div>
                    <div className="space-y-3 border-t border-ciel-border pt-4">
                        {SECTION_KEYS.map((key) => {
                            const text = entry.sectionSummaries?.[key];
                            if (!text) return null;
                            const meta = SECTION_LABELS[key];
                            return (
                                <div key={key} className="flex items-start gap-3">
                                    <span className="text-base">{meta.emoji}</span>
                                    <div className="min-w-0">
                                        <p className="text-xs font-black uppercase tracking-wide text-ciel-text-soft">{meta.label}</p>
                                        <p className="mt-0.5 text-sm leading-relaxed text-ciel-text">{text}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {isOwner && (
                        <button
                            type="button"
                            onClick={() => { setReview({}); setStep(0); setEditing(true); }}
                            className="ciel-transition rounded-ciel-sm border border-ciel-border px-4 py-2.5 text-sm font-bold text-ciel-text-mid hover:border-ciel-green/40"
                        >
                            Edit this record
                        </button>
                    )}
                </div>
            ) : (
            <div className="rounded-ciel-lg border border-ciel-border bg-white p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                    {STEPS.map((s, i) => (
                        <div key={s.key} className="flex flex-1 items-center gap-2">
                            <button
                                type="button"
                                onClick={() => i <= entry.stepCompleted && setStep(i)}
                                disabled={i > entry.stepCompleted}
                                className={clsx(
                                    "ciel-transition flex h-8 min-w-[2rem] items-center justify-center gap-1 rounded-full px-2 text-xs font-black",
                                    step === i ? "bg-ciel-navy text-white" : i < entry.stepCompleted ? "bg-ciel-green-soft text-ciel-green-deep" : i === entry.stepCompleted ? "border-2 border-ciel-border text-ciel-text-mid" : "cursor-not-allowed text-ciel-border",
                                )}
                                title={s.label}
                            >
                                {i < entry.stepCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span>{s.emoji}</span>}
                            </button>
                            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-ciel-border" />}
                        </div>
                    ))}
                </div>
                <p className="mt-2 text-xs font-bold uppercase tracking-widest text-ciel-text-soft">Step {step + 1} of {STEPS.length} — {STEPS[step].emoji} {STEPS[step].label}</p>

                <div className="mt-5 space-y-5">
                    {/* 1. Who you are */}
                    {step === 0 && (
                        <>
                            <Field label="Submission type" hint="Tap all that apply — a venture can be both a Final-Year Project and started as coursework.">
                                <ChipGroup
                                    options={SUBMISSION_TYPES}
                                    selected={entry.academicSetup?.submissionTypes ?? (entry.academicSetup?.submissionType ? [entry.academicSetup.submissionType] : [])}
                                    onToggle={(v) => {
                                        const cur = entry.academicSetup?.submissionTypes ?? (entry.academicSetup?.submissionType ? [entry.academicSetup.submissionType] : []);
                                        const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
                                        patchGroup("academicSetup", { submissionTypes: next, submissionType: next[0] });
                                    }}
                                />
                            </Field>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <Field label="University"><input type="text" value={entry.academicSetup?.university ?? ""} onChange={(e) => patchGroup("academicSetup", { university: e.target.value })} className={fieldClass} /></Field>
                                <Field label="School / Faculty"><input type="text" value={entry.academicSetup?.faculty ?? ""} onChange={(e) => patchGroup("academicSetup", { faculty: e.target.value })} className={fieldClass} /></Field>
                                <Field label="Department"><input type="text" value={entry.academicSetup?.department ?? ""} onChange={(e) => patchGroup("academicSetup", { department: e.target.value })} className={fieldClass} /></Field>
                                <Field label="Degree program"><input type="text" value={entry.academicSetup?.program ?? ""} onChange={(e) => patchGroup("academicSetup", { program: e.target.value })} className={fieldClass} /></Field>
                                <Field label="Course / FYP code"><input type="text" value={entry.academicSetup?.courseCode ?? ""} onChange={(e) => patchGroup("academicSetup", { courseCode: e.target.value })} className={fieldClass} /></Field>
                                <Field label="Project group ID"><input type="text" value={entry.academicSetup?.groupId ?? ""} onChange={(e) => patchGroup("academicSetup", { groupId: e.target.value })} className={fieldClass} /></Field>
                                <Field label="Supervisor"><input type="text" value={entry.academicSetup?.supervisorName ?? ""} onChange={(e) => patchGroup("academicSetup", { supervisorName: e.target.value })} className={fieldClass} placeholder="Dr. …" /></Field>
                                <Field label="Supervisor email"><input type="email" value={entry.academicSetup?.supervisorEmail ?? ""} onChange={(e) => patchGroup("academicSetup", { supervisorEmail: e.target.value })} className={fieldClass} placeholder="so they see this in their cohort" /></Field>
                                <Field label="Co-supervisor (optional)"><input type="text" value={entry.academicSetup?.coSupervisor ?? ""} onChange={(e) => patchGroup("academicSetup", { coSupervisor: e.target.value })} className={fieldClass} /></Field>
                                <Field label="Submission deadline"><input type="date" value={entry.academicSetup?.deadline ?? ""} onChange={(e) => patchGroup("academicSetup", { deadline: e.target.value })} className={fieldClass} /></Field>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="Individual or group?">
                                    <ChipGroup options={["Individual", "Group"]} selected={entry.academicSetup?.teamType ? [entry.academicSetup.teamType] : []} onToggle={(v) => patchGroup("academicSetup", { teamType: v })} />
                                </Field>
                                <Field label="Confidentiality status">
                                    <ChipGroup options={["Open — can be showcased after review", "Restricted — academic use only", "Sponsor NDA applies"]} selected={entry.academicSetup?.confidentialityStatus ? [entry.academicSetup.confidentialityStatus] : []} onToggle={(v) => patchGroup("academicSetup", { confidentialityStatus: v })} />
                                </Field>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="Ethics approval needed?">
                                    <ChipGroup options={["Yes", "No", "Unsure — ask reviewer"]} selected={entry.academicSetup?.ethicsApproval ? [entry.academicSetup.ethicsApproval] : []} onToggle={(v) => patchGroup("academicSetup", { ethicsApproval: v })} />
                                </Field>
                                <Field label="IP ownership">
                                    <ChipGroup options={["Student-owned", "Shared with university", "Sponsor agreement", "Not yet decided"]} selected={entry.academicSetup?.ipOwnership ? [entry.academicSetup.ipOwnership] : []} onToggle={(v) => patchGroup("academicSetup", { ipOwnership: v })} />
                                </Field>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <Field label="Your full name"><input type="text" value={entry.academicSetup?.founderName ?? ""} onChange={(e) => patchGroup("academicSetup", { founderName: e.target.value })} className={fieldClass} /></Field>
                                <Field label="Your role"><input type="text" value={entry.academicSetup?.founderRole ?? ""} onChange={(e) => patchGroup("academicSetup", { founderRole: e.target.value })} className={fieldClass} placeholder="e.g. Team lead" /></Field>
                                <Field label="Your background in one line"><input type="text" value={entry.academicSetup?.founderCredentials ?? ""} onChange={(e) => patchGroup("academicSetup", { founderCredentials: e.target.value })} className={fieldClass} /></Field>
                            </div>
                            <Field label="Team members" hint="Name, role, and (optionally) email — add an email and we'll send a confirmation link so this venture appears on their dashboard too.">
                                <div className="space-y-2">
                                    {(entry.team.length ? entry.team : [{ name: "", role: "" }]).map((m, i) => (
                                        <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                                            <input type="text" value={m.name} onChange={(e) => updateTeamMember(i, { name: e.target.value })} placeholder="Name" className={fieldClass} />
                                            <input type="text" value={m.role} onChange={(e) => updateTeamMember(i, { role: e.target.value })} placeholder="Role" className={fieldClass} />
                                            <input type="email" value={m.email ?? ""} onChange={(e) => updateTeamMember(i, { email: e.target.value })} placeholder="Email — optional" className={fieldClass} />
                                            <TeamInviteBadge kind="venture" entryId={entry.id} email={m.email} inviteStatus={m.inviteStatus} />
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={() => setEntry((s) => ({ ...s, team: [...(s.team.length ? s.team : [{ name: "", role: "" }]), { name: "", role: "" }] }))} className="text-xs font-bold text-ciel-green-deep hover:underline">
                                    + Add team member
                                </button>
                                <p className="text-xs text-ciel-text-soft">Every listed member must individually approve any public publication in Step 8.</p>
                            </Field>
                        </>
                    )}

                    {/* 2. Upload plan */}
                    {step === 1 && (
                        <div className="space-y-3">
                            <p className="text-sm text-ciel-text-mid">Your existing plan stays the principal academic document. Each file is versioned — replacing one keeps the history, nothing is lost.</p>
                            {DOC_TYPES.map((d) => {
                                const versions = entry.documents.filter((doc) => doc.type === d.type);
                                const latest = versions[versions.length - 1];
                                return (
                                    <div key={d.type} className="flex flex-wrap items-center justify-between gap-3 rounded-ciel-sm border border-ciel-border p-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-ciel-text">{d.type}</p>
                                            <p className="text-xs text-ciel-text-soft">{d.requirement}{latest ? ` · v${latest.version} uploaded` : ""}</p>
                                        </div>
                                        <label className={clsx("ciel-transition flex shrink-0 cursor-pointer items-center gap-2 rounded-ciel-xs border-2 border-dashed px-3 py-2 text-xs font-bold", latest ? "border-ciel-green bg-ciel-green-soft text-ciel-green-deep" : "border-ciel-border text-ciel-text-mid hover:border-ciel-green/40", uploading === d.type && "opacity-60")}>
                                            <UploadCloud className="h-3.5 w-3.5" />
                                            {uploading === d.type ? "Uploading..." : latest ? "Replace" : "Upload"}
                                            <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleDocFile(e.target.files[0], d.type)} />
                                        </label>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* 3. Your idea */}
                    {step === 2 && (
                        <>
                            <Field label="Venture stage">
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                    {STAGE_OPTIONS.map((s) => (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => setEntry((e) => ({ ...e, stage: s.id }))}
                                            className={clsx("rounded-ciel-sm border-2 p-3 text-left", entry.stage === s.id ? "border-ciel-green bg-ciel-green-soft" : "border-ciel-border hover:border-ciel-green/40")}
                                        >
                                            <span className="block text-sm font-bold text-ciel-text">{s.id}</span>
                                            <span className="block text-xs text-ciel-text-soft">{s.d}</span>
                                        </button>
                                    ))}
                                </div>
                            </Field>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="Venture name"><input type="text" value={entry.ventureName ?? ""} onChange={(e) => setEntry((s) => ({ ...s, ventureName: e.target.value }))} className={fieldClass} /></Field>
                                <Field label="One-line pitch" hint="Max 120 characters"><input type="text" maxLength={120} value={entry.ideaInfo?.pitch ?? ""} onChange={(e) => patchGroup("ideaInfo", { pitch: e.target.value })} className={fieldClass} /></Field>
                                <Field label="Sector">
                                    <select value={entry.ideaInfo?.sector ?? ""} onChange={(e) => patchGroup("ideaInfo", { sector: e.target.value })} className={fieldClass}>
                                        <option value="">Select…</option>
                                        {SECTORS.map((o) => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </Field>
                                <Field label="City"><input type="text" value={entry.ideaInfo?.city ?? ""} onChange={(e) => patchGroup("ideaInfo", { city: e.target.value })} className={fieldClass} /></Field>
                            </div>
                            <Field label="What problem are you solving?" hint="One sentence, like you'd tell a friend.">
                                <input type="text" value={entry.ideaInfo?.problem ?? ""} onChange={(e) => patchGroup("ideaInfo", { problem: e.target.value })} className={fieldClass} />
                            </Field>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <Field label="Who pays?"><input type="text" value={entry.ideaInfo?.payerWho ?? ""} onChange={(e) => patchGroup("ideaInfo", { payerWho: e.target.value })} className={fieldClass} /></Field>
                                <Field label="Who uses it?"><input type="text" value={entry.ideaInfo?.userWho ?? ""} onChange={(e) => patchGroup("ideaInfo", { userWho: e.target.value })} className={fieldClass} /></Field>
                                <Field label="Who benefits?"><input type="text" value={entry.ideaInfo?.beneficiaryWho ?? ""} onChange={(e) => patchGroup("ideaInfo", { beneficiaryWho: e.target.value })} className={fieldClass} /></Field>
                            </div>
                            <Field label="What's your best proof the problem is real?" hint="One specific number. A small real number beats a big vague claim.">
                                <input type="text" value={entry.ideaInfo?.proofFact ?? ""} onChange={(e) => patchGroup("ideaInfo", { proofFact: e.target.value })} placeholder="e.g. 41% of the 340 students we surveyed skipped class last month" className={fieldClass} />
                            </Field>
                        </>
                    )}

                    {/* 4. How it works */}
                    {step === 3 && (
                        <>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="What do you offer?" hint="Finish this thought: 'We give people…'"><input type="text" value={entry.solutionInfo?.solution ?? ""} onChange={(e) => patchGroup("solutionInfo", { solution: e.target.value })} className={fieldClass} /></Field>
                                <Field label="What do people use today instead?" hint="Even 'nothing — they just cope' is a real answer."><input type="text" value={entry.solutionInfo?.alternative ?? ""} onChange={(e) => patchGroup("solutionInfo", { alternative: e.target.value })} className={fieldClass} /></Field>
                            </div>
                            <Field label="Why can't someone just copy you next month?" hint="Special access, a partnership, technology, research, or knowing the customer better than anyone.">
                                <input type="text" value={entry.solutionInfo?.advantage ?? ""} onChange={(e) => patchGroup("solutionInfo", { advantage: e.target.value })} placeholder="e.g. exclusive driver-verification agreements with two universities" className={fieldClass} />
                            </Field>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <Field label="Revenue stream(s)"><input type="text" value={entry.solutionInfo?.revenue ?? ""} onChange={(e) => patchGroup("solutionInfo", { revenue: e.target.value })} placeholder="e.g. PKR 6,000/month" className={fieldClass} /></Field>
                                <Field label="Rough cost per sale"><input type="text" value={entry.solutionInfo?.costPerSale ?? ""} onChange={(e) => patchGroup("solutionInfo", { costPerSale: e.target.value })} className={fieldClass} /></Field>
                                <Field label="12-month milestone"><input type="text" value={entry.solutionInfo?.milestone12mo ?? ""} onChange={(e) => patchGroup("solutionInfo", { milestone12mo: e.target.value })} className={fieldClass} /></Field>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <Field label="Target market — who exactly?"><input type="text" value={entry.solutionInfo?.marketWho ?? ""} onChange={(e) => patchGroup("solutionInfo", { marketWho: e.target.value })} className={fieldClass} /></Field>
                                <Field label="Roughly how many exist?"><input type="text" value={entry.solutionInfo?.marketSize ?? ""} onChange={(e) => patchGroup("solutionInfo", { marketSize: e.target.value })} className={fieldClass} /></Field>
                                <Field label="How did you get that number?">
                                    <select value={entry.solutionInfo?.marketSource ?? ""} onChange={(e) => patchGroup("solutionInfo", { marketSource: e.target.value })} className={fieldClass}>
                                        <option value="">Choose the honest answer…</option>
                                        {MARKET_SOURCE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </Field>
                            </div>
                        </>
                    )}

                    {/* 5. SDG & impact */}
                    {step === 4 && (
                        <>
                            <Field label="Select one primary + up to two secondary SDGs" hint="Pick up to 3 — tap a tile, then choose the target that fits.">
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                    {sdgData.map((sdg) => {
                                        const isSel = picked.some((p) => p.goalNumber === sdg.number);
                                        const isDisabled = !isSel && picked.length >= 3;
                                        return (
                                            <button
                                                key={sdg.id}
                                                type="button"
                                                disabled={isDisabled}
                                                onClick={() => toggleGoal(sdg.number)}
                                                style={{ backgroundColor: sdg.color }}
                                                className={clsx(
                                                    "relative flex min-h-[66px] flex-col gap-0.5 rounded-lg border-2 p-2 text-left text-[11px] font-bold leading-tight text-white transition-all",
                                                    isSel ? "border-slate-900 shadow-lg" : isDisabled ? "cursor-not-allowed border-transparent opacity-15" : "border-transparent opacity-70 hover:-translate-y-0.5 hover:opacity-100",
                                                )}
                                            >
                                                {isSel ? <CheckCircle2 className="absolute right-1.5 top-1.5 h-3.5 w-3.5" /> : null}
                                                <span className="text-base font-extrabold">{sdg.number}</span>
                                                {sdg.title}
                                            </button>
                                        );
                                    })}
                                </div>
                            </Field>

                            {picked.length > 0 && (
                                <div className="space-y-3">
                                    {picked.map((p) => {
                                        const sdg = sdgData.find((s) => s.number === p.goalNumber);
                                        if (!sdg) return null;
                                        return (
                                            <div key={p.goalNumber} className="overflow-hidden rounded-ciel-sm border-2 border-ciel-border">
                                                <div className="flex items-center justify-between px-4 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: sdg.color }}>
                                                    <span>SDG {sdg.number} · {sdg.title}</span>
                                                    <button type="button" onClick={() => toggleGoal(sdg.number)} className="flex h-6 w-6 items-center justify-center rounded-full bg-white/25 text-xs">✕</button>
                                                </div>
                                                <div className="space-y-2 bg-white p-4">
                                                    <p className={labelClass}>Which target fits?</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {sdg.targets.map((t) => (
                                                            <button
                                                                key={t.id}
                                                                type="button"
                                                                onClick={() => toggleTarget(p.goalNumber, t.id)}
                                                                className={clsx(
                                                                    "ciel-transition rounded-ciel-xs border-2 px-2.5 py-1.5 text-left text-xs font-semibold",
                                                                    p.targets.includes(t.id) ? "border-ciel-green bg-ciel-green-soft text-ciel-green-deep" : "border-ciel-border text-ciel-text-mid hover:border-ciel-green/40",
                                                                )}
                                                            >
                                                                <span className="font-black">{t.id}</span> {t.description}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <input type="text" value={p.how ?? ""} onChange={(e) => setHow(p.goalNumber, e.target.value)} placeholder="One line: how does your venture support this goal?" className={clsx(fieldClass, "mt-1")} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <label className="ciel-transition flex cursor-pointer items-start gap-3 rounded-ciel-sm border-2 border-ciel-border p-4 hover:border-ciel-green/40">
                                    <input type="radio" name="sdgmode" checked={entry.sdgMapping?.mode === "review"} onChange={() => patchGroup("sdgMapping", { mode: "review" })} className="mt-0.5 h-4 w-4 accent-ciel-green" />
                                    <span>
                                        <span className="block text-sm font-bold text-ciel-text">I&apos;m unsure — request an SDG review</span>
                                        <span className="block text-xs text-ciel-text-soft">A CIEL reviewer proposes goals. Your profile shows &quot;SDG review pending.&quot;</span>
                                    </span>
                                </label>
                                <label className="ciel-transition flex cursor-pointer items-start gap-3 rounded-ciel-sm border-2 border-ciel-border p-4 hover:border-ciel-green/40">
                                    <input type="radio" name="sdgmode" checked={entry.sdgMapping?.mode === "none"} onChange={() => patchGroup("sdgMapping", { mode: "none" })} className="mt-0.5 h-4 w-4 accent-ciel-green" />
                                    <span>
                                        <span className="block text-sm font-bold text-ciel-text">Commercial venture — no SDG mapping claimed</span>
                                        <span className="block text-xs text-ciel-text-soft">Fully eligible for showcase and investment.</span>
                                    </span>
                                </label>
                            </div>

                            <Field label="How is the impact created?" hint="This affects your impact status.">
                                <select value={entry.sdgMapping?.howImpact ?? ""} onChange={(e) => patchGroup("sdgMapping", { howImpact: e.target.value })} className={fieldClass}>
                                    <option value="">Select…</option>
                                    {HOW_IMPACT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </Field>

                            <Field label="Indicators" hint="Each tied to a goal, each with a verifier.">
                                <div className="space-y-2.5">
                                    {(entry.sdgMapping?.indicators?.length ? entry.sdgMapping.indicators : [{}]).map((ind, i) => (
                                        <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                                            <input type="text" value={ind.indicator ?? ""} onChange={(e) => { const next = [...(entry.sdgMapping?.indicators?.length ? entry.sdgMapping.indicators : [{}])]; next[i] = { ...next[i], indicator: e.target.value }; patchGroup("sdgMapping", { indicators: next }); }} placeholder="Indicator" className={fieldClass} />
                                            <input type="text" value={ind.target12mo ?? ""} onChange={(e) => { const next = [...(entry.sdgMapping?.indicators?.length ? entry.sdgMapping.indicators : [{}])]; next[i] = { ...next[i], target12mo: e.target.value }; patchGroup("sdgMapping", { indicators: next }); }} placeholder="12-mo target" className={fieldClass} />
                                            <select value={ind.verifiedBy ?? ""} onChange={(e) => { const next = [...(entry.sdgMapping?.indicators?.length ? entry.sdgMapping.indicators : [{}])]; next[i] = { ...next[i], verifiedBy: e.target.value }; patchGroup("sdgMapping", { indicators: next }); }} className={fieldClass}>
                                                <option value="">Verified by…</option>
                                                <option>Supervisor</option><option>Partner organization</option><option>University reviewer</option><option>CIEL reviewer</option><option>Founder (self)</option>
                                            </select>
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={() => patchGroup("sdgMapping", { indicators: [...(entry.sdgMapping?.indicators?.length ? entry.sdgMapping.indicators : [{}]), {}] })} className="text-xs font-bold text-ciel-green-deep hover:underline">
                                    + Add another indicator
                                </button>
                            </Field>
                        </>
                    )}

                    {/* 6. Evidence & traction */}
                    {step === 5 && (
                        <div className="space-y-5">
                            {showIdeaEvidence && (
                                <div>
                                    <h3 className="mb-2 text-sm font-black text-ciel-text">Validation (idea / business-plan stage)</h3>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                        <Field label="Customer interviews"><input type="number" min={0} value={entry.evidenceInfo?.interviews ?? ""} onChange={(e) => patchGroup("evidenceInfo", { interviews: e.target.valueAsNumber || undefined })} className={fieldClass} /></Field>
                                        <Field label="Survey responses"><input type="number" min={0} value={entry.evidenceInfo?.surveyResponses ?? ""} onChange={(e) => patchGroup("evidenceInfo", { surveyResponses: e.target.valueAsNumber || undefined })} className={fieldClass} /></Field>
                                        <Field label="Willing to test or buy"><input type="number" min={0} value={entry.evidenceInfo?.willingToTest ?? ""} onChange={(e) => patchGroup("evidenceInfo", { willingToTest: e.target.valueAsNumber || undefined })} className={fieldClass} /></Field>
                                    </div>
                                </div>
                            )}
                            {showProtoEvidence && (
                                <div>
                                    <h3 className="mb-2 text-sm font-black text-ciel-text">Testing (prototype / pilot stage)</h3>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                        <Field label="People who tested it"><input type="number" min={0} value={entry.evidenceInfo?.testers ?? ""} onChange={(e) => patchGroup("evidenceInfo", { testers: e.target.valueAsNumber || undefined })} className={fieldClass} /></Field>
                                        <Field label="Pilot partners"><input type="number" min={0} value={entry.evidenceInfo?.pilotPartners ?? ""} onChange={(e) => patchGroup("evidenceInfo", { pilotPartners: e.target.valueAsNumber || undefined })} className={fieldClass} /></Field>
                                        <Field label="Pre-orders / letters of intent"><input type="number" min={0} value={entry.evidenceInfo?.preOrders ?? ""} onChange={(e) => patchGroup("evidenceInfo", { preOrders: e.target.valueAsNumber || undefined })} className={fieldClass} /></Field>
                                    </div>
                                </div>
                            )}
                            {showOpsEvidence && (
                                <div>
                                    <h3 className="mb-2 text-sm font-black text-ciel-text">Operations (revenue / growth stage)</h3>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                        <Field label="Customers / users"><input type="number" min={0} value={entry.evidenceInfo?.customers ?? ""} onChange={(e) => patchGroup("evidenceInfo", { customers: e.target.valueAsNumber || undefined })} className={fieldClass} /></Field>
                                        <Field label="Revenue to date (PKR)"><input type="number" min={0} value={entry.evidenceInfo?.revenueToDate ?? ""} onChange={(e) => patchGroup("evidenceInfo", { revenueToDate: e.target.valueAsNumber || undefined })} className={fieldClass} /></Field>
                                        <Field label="Monthly growth %"><input type="number" value={entry.evidenceInfo?.monthlyGrowthPercent ?? ""} onChange={(e) => patchGroup("evidenceInfo", { monthlyGrowthPercent: e.target.valueAsNumber || undefined })} className={fieldClass} /></Field>
                                        <Field label="Repeat customers %"><input type="number" min={0} max={100} value={entry.evidenceInfo?.repeatPercent ?? ""} onChange={(e) => patchGroup("evidenceInfo", { repeatPercent: e.target.valueAsNumber || undefined })} className={fieldClass} /></Field>
                                        <Field label="Partnerships"><input type="number" min={0} value={entry.evidenceInfo?.partnerships ?? ""} onChange={(e) => patchGroup("evidenceInfo", { partnerships: e.target.valueAsNumber || undefined })} className={fieldClass} /></Field>
                                        <Field label="Letters of intent"><input type="number" min={0} value={entry.evidenceInfo?.lettersOfIntent ?? ""} onChange={(e) => patchGroup("evidenceInfo", { lettersOfIntent: e.target.valueAsNumber || undefined })} className={fieldClass} /></Field>
                                    </div>
                                </div>
                            )}
                            <div>
                                <h3 className="mb-2 text-sm font-black text-ciel-text">The ask</h3>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <Field label="Funding sought (PKR)" hint="Leave blank if not raising"><input type="number" min={0} value={entry.evidenceInfo?.fundingSought ?? ""} onChange={(e) => patchGroup("evidenceInfo", { fundingSought: e.target.valueAsNumber || undefined })} className={fieldClass} /></Field>
                                    <Field label="Use of funds"><input type="text" value={entry.evidenceInfo?.useOfFunds ?? ""} onChange={(e) => patchGroup("evidenceInfo", { useOfFunds: e.target.value })} placeholder="Product 45% · Team 35% · Launch 20%" className={fieldClass} /></Field>
                                    <Field label="Expected result, by when"><input type="text" value={entry.evidenceInfo?.expectedResult ?? ""} onChange={(e) => patchGroup("evidenceInfo", { expectedResult: e.target.value })} className={fieldClass} /></Field>
                                </div>
                            </div>
                            <Field label="Or / and — open to">
                                <ChipGroup options={OPEN_TO_OPTIONS} selected={entry.evidenceInfo?.openTo ?? []} onToggle={(v) => { const cur = entry.evidenceInfo?.openTo ?? []; patchGroup("evidenceInfo", { openTo: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] }); }} />
                            </Field>
                        </div>
                    )}

                    {/* 7. Send to supervisor */}
                    {step === 6 && (
                        <div className="space-y-5">
                            <p className="text-sm text-ciel-text-mid">This completes your FYP whether or not you ever publish a card. Declare it, and send it to your supervisor.</p>
                            <h3 className="text-sm font-black text-ciel-text">Declarations</h3>
                            <label className="flex items-start gap-3 text-sm text-ciel-text">
                                <input type="checkbox" checked={!!entry.reviewPipeline?.declarationWork} onChange={(e) => patchGroup("reviewPipeline", { declarationWork: e.target.checked })} className="mt-0.5 h-4 w-4 accent-ciel-green" />
                                I confirm this submission is my/our own work, and the evidence attached is genuine.
                            </label>
                            <label className="flex items-start gap-3 text-sm text-ciel-text">
                                <input type="checkbox" checked={!!entry.reviewPipeline?.declarationConsent} onChange={(e) => patchGroup("reviewPipeline", { declarationConsent: e.target.checked })} className="mt-0.5 h-4 w-4 accent-ciel-green" />
                                All listed team members have seen this submission and consent to academic review.
                            </label>
                            <h3 className="text-sm font-black text-ciel-text">Review pipeline</h3>
                            <div className="divide-y divide-ciel-border rounded-ciel-sm border border-ciel-border">
                                {[
                                    { label: "Student declaration", status: entry.status === "submitted" ? "Declared" : "Waiting" },
                                    { label: "Supervisor review", status: entry.reviewPipeline?.supervisorStatus === "approved" ? "Approved" : entry.status === "submitted" ? "Pending" : "Not started" },
                                    { label: "Department / university verification", status: entry.reviewPipeline?.universityStatus === "approved" ? "Verified" : entry.status === "submitted" ? "Pending" : "Not started" },
                                    { label: "SDG review", status: entry.reviewPipeline?.sdgReviewStatus === "approved" ? "Reviewed" : entry.sdgMapping?.mode !== "map" ? "Not applicable" : entry.status === "submitted" ? "Pending" : "Not started" },
                                ].map((row) => (
                                    <div key={row.label} className="flex items-center justify-between px-4 py-2.5 text-sm">
                                        <span className="text-ciel-text-mid">{row.label}</span>
                                        <span className={clsx("rounded-full px-2.5 py-0.5 text-[11px] font-bold", row.status === "Approved" || row.status === "Verified" || row.status === "Reviewed" || row.status === "Declared" ? "bg-ciel-green-soft text-ciel-green-deep" : row.status === "Pending" ? "bg-amber-50 text-amber-700" : "bg-ciel-border text-ciel-text-soft")}>{row.status}</span>
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button"
                                disabled={!declared || saving}
                                onClick={async () => {
                                    const ok = await save({ ...saveAllFields(), status: "submitted", reviewPipeline: { ...entry.reviewPipeline, studentDeclaredAt: new Date().toISOString(), supervisorStatus: "pending", universityStatus: "pending", sdgReviewStatus: entry.sdgMapping?.mode === "map" ? "pending" : entry.reviewPipeline?.sdgReviewStatus } });
                                    if (ok) setStep(7);
                                }}
                                className="ciel-transition rounded-ciel-sm bg-ciel-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-ciel-navy/90 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Submit for academic review
                            </button>
                            <p className="text-xs text-ciel-text-soft">Your supervisor is notified first. Revision requests come back to you with comments — nothing overwritten.</p>
                        </div>
                    )}

                    {/* 8. Go public */}
                    {step === 7 && (
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="text-sm font-black text-ciel-text">1 · Approve your public summary</h3>
                                    <button type="button" onClick={regenerateAllReview} className="ciel-transition shrink-0 rounded-ciel-xs border border-ciel-border px-3 py-1.5 text-xs font-bold text-ciel-text-mid hover:border-ciel-green/40">
                                        ↻ Regenerate all
                                    </button>
                                </div>
                                <p className="text-xs text-ciel-text-soft">The Discovery Card is generated exclusively from what you approve here — deleting a block removes it from the card, always.</p>
                                {filledSections.length > 0 && (
                                    <div className="flex items-center gap-3">
                                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-ciel-border">
                                            <div className="h-full rounded-full bg-ciel-green transition-all" style={{ width: `${(acceptedCount / filledSections.length) * 100}%` }} />
                                        </div>
                                        <span className="shrink-0 text-xs font-bold text-ciel-text-soft">{acceptedCount} of {filledSections.length} accepted</span>
                                    </div>
                                )}
                                {SECTION_KEYS.filter((k) => (sums[k] || review[k]?.text || "").trim()).map((key) => {
                                    const meta = SECTION_LABELS[key];
                                    const r = review[key] ?? { accepted: false, edited: false, text: sums[key] || "" };
                                    return (
                                        <div key={key} className={clsx("overflow-hidden rounded-ciel-sm border-2", r.accepted ? "border-ciel-green" : "border-ciel-border")}>
                                            <div className={clsx("flex flex-wrap items-center gap-2 px-4 py-2.5", r.accepted ? "bg-ciel-green-soft" : "bg-ciel-page/60")}>
                                                <span className="text-xs font-black uppercase tracking-widest text-ciel-text-soft">{meta.emoji} {meta.label}</span>
                                                {r.edited && <span className="text-[10px] font-bold text-ciel-indigo">✏️ edited</span>}
                                                <span className={clsx("ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-black", r.accepted ? "bg-ciel-green text-white" : "bg-ciel-border text-ciel-text-mid")}>
                                                    {r.accepted ? "✓ APPROVED" : "PENDING"}
                                                </span>
                                            </div>
                                            <textarea
                                                rows={2}
                                                value={r.text}
                                                onChange={(e) => setReview((prev) => ({ ...prev, [key]: { ...r, text: e.target.value, edited: true, accepted: false } }))}
                                                className="w-full resize-none bg-white p-4 text-sm leading-relaxed text-ciel-text outline-none focus-visible:ring-2 focus-visible:ring-ciel-green"
                                            />
                                            <div className="flex gap-2 border-t border-ciel-border bg-white px-4 py-2.5">
                                                <button type="button" onClick={() => setReview((prev) => ({ ...prev, [key]: { ...r, accepted: true } }))} className={clsx("ciel-transition rounded-ciel-xs border-2 px-3 py-1.5 text-xs font-bold", r.accepted ? "border-ciel-green bg-ciel-green text-white" : "border-ciel-green text-ciel-green-deep hover:bg-ciel-green-soft")}>
                                                    {r.accepted ? "✓ Accepted" : "✓ Accept"}
                                                </button>
                                                <button type="button" onClick={() => setReview((prev) => ({ ...prev, [key]: { accepted: false, edited: false, text: sums[key] || "" } }))} className="ciel-transition rounded-ciel-xs border-2 border-ciel-border px-3 py-1.5 text-xs font-bold text-ciel-text-mid hover:border-ciel-green/40">
                                                    ↻ Reset
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-sm font-black text-ciel-text">2 · Three separate doors</h3>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    {[
                                        { label: "1 · Academic submission", ok: gates.academicOk, verdict: gates.academicOk ? "Complete" : "Incomplete" },
                                        { label: "2 · Showcase", ok: gates.showcaseOk, verdict: gates.showcaseOk ? "Showcase Ready" : "Locked" },
                                        { label: "3 · Investment Ready", ok: gates.investmentReadyOk, verdict: gates.investmentReadyOk ? "Investment Ready" : "Locked" },
                                    ].map((g) => (
                                        <div key={g.label} className="rounded-ciel-sm border border-ciel-border p-4">
                                            <p className="text-xs font-black text-ciel-text">{g.label}</p>
                                            <p className={clsx("mt-3 rounded-ciel-xs px-2.5 py-1.5 text-center text-xs font-bold", g.ok ? "bg-ciel-green-soft text-ciel-green-deep" : "bg-ciel-border text-ciel-text-mid")}>{g.verdict}</p>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-ciel-text-soft">An idea-stage venture can be fully Showcase Ready without being Investment Ready — that tier is reserved for ventures actively raising with stage-appropriate verified evidence.</p>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-sm font-black text-ciel-text">3 · Choose who sees what — everything starts OFF</h3>
                                <Field label="Card audience">
                                    <div className="flex flex-wrap gap-2">
                                        {AUDIENCE_OPTIONS.map((a) => (
                                            <button key={a.id} type="button" onClick={() => patchGroup("publishSettings", { audience: a.id })} className={clsx("ciel-transition rounded-full border-2 px-3.5 py-2 text-xs font-bold", entry.publishSettings?.audience === a.id ? "border-ciel-green bg-ciel-green-soft text-ciel-green-deep" : "border-ciel-border text-ciel-text-mid hover:border-ciel-green/40")}>
                                                {a.label}
                                            </button>
                                        ))}
                                    </div>
                                </Field>
                                {[
                                    { key: "showName" as const, label: "Show my name as founder" },
                                    { key: "showTeam" as const, label: "Show team member names" },
                                    { key: "showUniversity" as const, label: "Show university" },
                                    { key: "showTraction" as const, label: "Show traction numbers" },
                                    { key: "showAsk" as const, label: "Show funding requirement" },
                                    { key: "acceptIntros" as const, label: "Accept introduction requests" },
                                ].map((t) => (
                                    <label key={t.key} className="flex items-center justify-between gap-3 border-b border-ciel-border py-2.5 text-sm text-ciel-text last:border-0">
                                        {t.label}
                                        <input type="checkbox" checked={!!entry.publishSettings?.[t.key]} onChange={(e) => patchGroup("publishSettings", { [t.key]: e.target.checked })} className="h-5 w-5 accent-ciel-green" />
                                    </label>
                                ))}
                            </div>

                            {teamNames.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-sm font-black text-ciel-text">Team consent — every member, not just the lead</h3>
                                    {teamNames.map((name) => (
                                        <label key={name} className="flex items-center gap-3 text-sm text-ciel-text">
                                            <input
                                                type="checkbox"
                                                checked={!!teamConsentMap.get(name)}
                                                onChange={(e) => {
                                                    const next = teamNames.map((n) => ({ name: n, consented: n === name ? e.target.checked : !!teamConsentMap.get(n) }));
                                                    setEntry((s) => ({ ...s, teamConsent: next }));
                                                }}
                                                className="h-4 w-4 accent-ciel-green"
                                            />
                                            {name} — consents to publication
                                        </label>
                                    ))}
                                </div>
                            )}

                            <div className="rounded-ciel-lg border border-ciel-border bg-ciel-page/60 p-4">
                                <p className={labelClass}>Badge ladder — earned, never self-declared</p>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {[
                                        { label: "Academic Complete", ok: gates.academicOk },
                                        { label: "Supervisor Reviewed", ok: entry.reviewPipeline?.supervisorStatus === "approved" },
                                        { label: "University Verified", ok: entry.reviewPipeline?.universityStatus === "approved" },
                                        { label: "SDG Reviewed", ok: entry.reviewPipeline?.sdgReviewStatus === "approved" },
                                        { label: "Showcase Ready", ok: gates.showcaseOk },
                                        { label: "Investment Ready", ok: gates.investmentReadyOk, gold: true },
                                    ].map((b) => (
                                        <span key={b.label} className={clsx("rounded-full px-2.5 py-1 text-[10px] font-bold", b.ok ? (b.gold ? "bg-ciel-navy text-white" : "bg-ciel-green-soft text-ciel-green-deep") : "bg-ciel-border text-ciel-text-soft")}>
                                            {b.ok ? "✓ " : ""}{b.label}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {!allTeamConsented && teamNames.length > 0 && (
                                <p className="text-xs font-semibold text-amber-700">Every team member must consent above before you can submit for showcase approval.</p>
                            )}
                        </div>
                    )}
                </div>

                {error && <p className="mt-4 text-xs font-semibold text-red-600">{error}</p>}

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    <button
                        type="button"
                        disabled={step === 0}
                        onClick={() => setStep((s) => Math.max(0, s - 1))}
                        className="ciel-transition rounded-ciel-sm border border-ciel-border px-4 py-2.5 text-sm font-bold text-ciel-text-mid hover:border-ciel-green/40 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green"
                    >
                        Back
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                        {step < 6 ? (
                            <button
                                type="button"
                                disabled={saving}
                                onClick={() => save(saveAllFields(), step + 1)}
                                className="ciel-transition rounded-ciel-sm bg-ciel-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-ciel-navy/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green focus-visible:ring-offset-2"
                            >
                                {saving ? "Saving..." : "Continue"}
                            </button>
                        ) : step === 6 ? null : (
                            <button
                                type="button"
                                disabled={saving || !allAccepted || !allTeamConsented || !gates.showcaseOk}
                                title={!gates.showcaseOk ? "Reach Showcase Ready first (supervisor + university + SDG review)" : !allAccepted ? "Accept every section above first" : !allTeamConsented ? "Every team member must consent" : undefined}
                                onClick={async () => {
                                    const ok = await save({ ...saveAllFields(), sectionSummaries: finalSectionSummaries() }, 8);
                                    if (ok) setEditing(false);
                                }}
                                className="ciel-transition rounded-ciel-sm bg-ciel-green-deep px-5 py-2.5 text-sm font-bold text-white hover:bg-ciel-green-deep/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green focus-visible:ring-offset-2"
                            >
                                {saving ? "Sending..." : "Submit for showcase approval →"}
                            </button>
                        )}
                    </div>
                </div>
                {step === 1 && !hasBusinessPlan && (
                    <p className="mt-3 text-xs text-ciel-text-soft">Business plan upload is optional to continue — but required before your academic submission gate opens.</p>
                )}
            </div>
            )}
        </PathWorkspaceShell>
    );
}
