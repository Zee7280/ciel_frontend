"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import { CourseworkCrumb, useFacultyHubView } from "@/components/ciel/coursework/CourseworkHubChrome";
import { MOCKUP_GRADIENTS, MockupHero } from "@/components/ciel/dashboard/MockupChrome";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { SDG_COLORS, SDG_SHORT } from "@/utils/ventureStudioV11";
import { computeVentureMeritScorecard, type VentureMeritEntry } from "@/utils/ventureMeritModel";
import { INVESTOR_TYPES } from "@/components/ciel/auth/InvestorSignupPanel";

const VIEWS = [
    "overview", "home", "inbox",
    "discover", "showcase",
    "match", "rankings", "rank",
    "pipeline", "saved",
    "diligence", "outcomes", "reports",
    "membership", "agreements", "activity", "impact", "profile", "record",
] as const;
type HubView = (typeof VIEWS)[number];
const BASE = "/dashboard/investor";

type HubVenture = Omit<VentureMeritEntry, "team" | "sdgMapping"> & {
    id?: string;
    ventureName?: string | null;
    createdAt?: string;
    updatedAt?: string;
    stage?: string | null;
    academicSetup?: {
        supervisorName?: string;
        university?: string;
        department?: string;
        faculty?: string;
        courseCode?: string;
        founderName?: string;
    } | null;
    ideaInfo?: { sector?: string; problem?: string; pitch?: string; payerWho?: string; userWho?: string } | null;
    solutionInfo?: { solution?: string; revenue?: string } | null;
    reviewPipeline?: { supervisorStatus?: string | null; studentDeclaredAt?: string } | null;
    student?: { id?: string; name?: string; institution?: string; department?: string; role?: string } | null;
    team?: { name?: string; inviteStatus?: "pending" | "accepted" }[] | null;
    publishSettings?: { audience?: string; acceptIntros?: boolean; featured?: boolean } | null;
    sdgMapping?: { entries?: { goalNumber: number }[] } | null;
    tractionRows?: { metric?: string; value?: string }[] | null;
    evidenceInfo?: { fundingSought?: number; useOfFunds?: string } | null;
    meritRibbon?: { rank?: number; total?: number } | null;
};

type HubRow = { entryId: string; note: string; at: string; status?: string };
type ActRow = { when: string; ev: string; v: string; vis: string };
type DeskMsg = { t: "me" | "them" | "sys"; x: string; w: string };

type PlanKey = "explorer" | "angel" | "fund" | "institutional";
const PLANS: Record<PlanKey, {
    key: PlanKey; name: string; price: number; priceLabel: string; rate: number;
    quota: number | null; rooms: boolean; seats: number; aiMatchTop: number;
    traction: boolean; firstLook: boolean; reports: boolean; api: boolean; who: string; feats: string[];
}> = {
    explorer: {
        key: "explorer", name: "Explorer", price: 0, priceLabel: "Free", rate: 0.03, quota: 3, rooms: false, seats: 1, aiMatchTop: 1, traction: false, firstLook: false, reports: false, api: false, who: "Curious / first-time investors",
        feats: ["Masked venture cards, VPS & ECS scores", "Traction figures hidden", "3 introduction requests per quarter", "No diligence rooms", "Success fee 3.0% (investor-paid route)"],
    },
    angel: {
        key: "angel", name: "Angel", price: 60000, priceLabel: "PKR 60,000 / yr", rate: 0.025, quota: 10, rooms: true, seats: 1, aiMatchTop: 99, traction: true, firstLook: false, reports: false, api: false, who: "Individual angels · diaspora · PKR 15K per quarter option",
        feats: ["Full venture cards & traction", "10 introduction requests per quarter", "Watermarked diligence rooms", "AI Deal Match", "Success fee 2.5%"],
    },
    fund: {
        key: "fund", name: "Fund", price: 250000, priceLabel: "PKR 250,000 / yr", rate: 0.02, quota: null, rooms: true, seats: 2, aiMatchTop: 99, traction: true, firstLook: false, reports: false, api: false, who: "VC funds · family offices · corporate VC",
        feats: ["Everything in Angel", "Unlimited introduction requests", "2 seats · shared pipeline", "Pass-with-feedback analytics", "Success fee 2.0%"],
    },
    institutional: {
        key: "institutional", name: "Institutional Partner", price: 1200000, priceLabel: "PKR 1,200,000 / yr", rate: 0.015, quota: null, rooms: true, seats: 10, aiMatchTop: 99, traction: true, firstLook: true, reports: true, api: true, who: "Banks · telcos · DFIs · CSR programmes",
        feats: ["Everything in Fund", "10 seats · API & CRM export", "14-day first look at Spotlight cohorts", "Quarterly cohort & ecosystem reports · logo on cohort", "Success fee 1.5% · co-invest syndicate room"],
    },
};

function asPlan(v: unknown): PlanKey {
    const k = String(v || "explorer").toLowerCase();
    return k in PLANS ? (k as PlanKey) : "explorer";
}
function asList(v: unknown): string[] {
    if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
    if (typeof v === "string" && v.trim()) return v.split(",").map((x) => x.trim()).filter(Boolean);
    return [];
}
function pk(n: number) {
    return `PKR ${n.toLocaleString()}`;
}
function feeFor(amountM: number, rate: number) {
    return Math.min(Math.round(amountM * 1e6 * rate), 1_500_000);
}
function nowStamp() {
    const d = new Date();
    return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} · ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}
function displayVentureId(entry: HubVenture) {
    const year = entry.createdAt ? new Date(entry.createdAt).getFullYear() : new Date().getFullYear();
    const tail = (entry.id || "").replace(/-/g, "").slice(-5).toUpperCase() || "00000";
    return `VEN-${year}-${tail}`;
}
function universityOf(entry: HubVenture) {
    return entry.academicSetup?.university || entry.student?.institution || "University";
}
function ownerName(entry: HubVenture) {
    return entry.academicSetup?.founderName || entry.student?.name || "Founding team";
}
function sectorOf(entry: HubVenture) {
    return entry.ideaInfo?.sector || "Sector";
}
function askAmount(entry: HubVenture) {
    return Number(entry.evidenceInfo?.fundingSought || 0);
}
function askLine(entry: HubVenture) {
    const n = askAmount(entry);
    if (!n || n <= 0) return "Ask on request";
    return `PKR ${n.toLocaleString()}`;
}
function roundOf(entry: HubVenture) {
    const use = String(entry.evidenceInfo?.useOfFunds || "").toLowerCase();
    if (/grant/.test(use)) return "Grant";
    const n = askAmount(entry);
    if (n > 0 && n <= 5_000_000) return "Pre-Seed";
    return "Seed";
}
function weakestCriterion(entry: HubVenture) {
    const card = computeVentureMeritScorecard(entry);
    return [...card.criteria].sort((a, b) => a.points / a.max - b.points / b.max)[0];
}
function strongestCriterion(entry: HubVenture) {
    const card = computeVentureMeritScorecard(entry);
    return [...card.criteria].sort((a, b) => b.points / b.max - a.points / a.max)[0];
}
function teamMasked(entry: HubVenture) {
    const n = Math.max(1, (entry.team || []).length);
    return `${n} co-founder${n === 1 ? "" : "s"} (${universityOf(entry)})`;
}
function customerOf(entry: HubVenture) {
    return entry.ideaInfo?.payerWho || entry.ideaInfo?.userWho || "";
}
function tractionLine(entry: HubVenture) {
    const rows = (entry.tractionRows || []).filter((r) => r.metric || r.value).slice(0, 3);
    if (!rows.length) return "Traction on the venture card";
    return rows.map((r) => [r.metric, r.value].filter(Boolean).join(" ")).join("; ");
}
function meritScore(entry: HubVenture) {
    return entry.meritRibbon?.total ?? computeVentureMeritScorecard(entry).total;
}
function isFeatured(entry: HubVenture) {
    return entry.publishSettings?.featured === true;
}
function sdgTags(entry: HubVenture) {
    return (entry.sdgMapping?.entries || []).map((e) => e.goalNumber).filter((n) => n >= 1 && n <= 17);
}
function classify(score: number) {
    return score >= 85 ? "Exceptional" : score >= 70 ? "Strong" : score >= 55 ? "Developing" : score >= 40 ? "Emerging" : "Limited";
}
function vpsOf(entry: HubVenture) {
    return meritScore(entry);
}
function ecsOf(entry: HubVenture) {
    const card = computeVentureMeritScorecard(entry);
    const keys = ["traction", "evidence", "market"] as const;
    const pts = card.criteria.filter((c) => keys.includes(c.key as typeof keys[number]));
    const max = pts.reduce((s, c) => s + c.max, 0) || 1;
    const got = pts.reduce((s, c) => s + c.points, 0);
    return Math.max(35, Math.min(98, Math.round((got / max) * 100)));
}
function ticketFits(ticket: string, ask: number) {
    if (!ask) return true;
    const m = ask / 1e6;
    if (/under/i.test(ticket) && /5/.test(ticket)) return m < 5;
    if (/5.?30|5–30|5-30/.test(ticket)) return m >= 5 && m <= 30;
    if (/25.?100|25–100|25-100/.test(ticket)) return m >= 25 && m <= 100;
    if (/100.?500|100–500|100-500/.test(ticket)) return m >= 100 && m <= 500;
    if (/500/.test(ticket)) return m >= 500;
    return true;
}
function stageFits(preferred: string[], stage: string) {
    if (!preferred.length || !stage) return true;
    const n = stage.toLowerCase();
    return preferred.some((p) => {
        const x = p.toLowerCase();
        if (x.includes("revenue")) return n.includes("revenue");
        return n.includes(x) || x.includes(n);
    });
}
function mandateFit(entry: HubVenture, mandate: Mandate) {
    let roundTicket = 10;
    if (mandate.preferredRounds.some((r) => roundOf(entry).toLowerCase().includes(r.toLowerCase())) || !mandate.preferredRounds.length) roundTicket += 10;
    if (ticketFits(mandate.typicalTicket, askAmount(entry))) roundTicket += 10;
    let sector = 8;
    const sec = sectorOf(entry).toLowerCase();
    if (mandate.sectors.some((s) => sec.includes(s.toLowerCase()) || s.toLowerCase().includes(sec))) sector = 25;
    else if (mandate.sectors.length) sector = 10;
    const ecs = ecsOf(entry);
    const evidence = Math.round((ecs / 100) * 25);
    const vps = vpsOf(entry);
    const readiness = Math.round((vps / 100) * 20);
    return Math.max(38, Math.min(98, roundTicket + sector + evidence + readiness));
}
function matchReason(entry: HubVenture, mandate: Mandate) {
    const r: string[] = [];
    if (stageFits(mandate.preferredStages, String(entry.stage || ""))) r.push("product stage is within your preferred window");
    if (mandate.preferredRounds.some((x) => roundOf(entry).toLowerCase().includes(x.toLowerCase()))) r.push("round matches your mandate");
    if (ticketFits(mandate.typicalTicket, askAmount(entry))) r.push("ask sits inside your ticket range");
    const sec = sectorOf(entry).toLowerCase();
    if (mandate.sectors.some((s) => sec.includes(s.toLowerCase()) || s.toLowerCase().includes(sec))) r.push("sector overlaps your focus");
    else r.push("sector is outside your declared focus (fit penalised)");
    if (ecsOf(entry) >= 80) r.push("evidence confidence is strong");
    return r.join("; ") + ".";
}

type Mandate = {
    investorType: string;
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
    screeningNotes: string;
    website: string;
    linkedin: string;
};

function mandateFrom(inv: Record<string, unknown> | null): Mandate {
    return {
        investorType: String(inv?.investorType || ""),
        preferredRounds: asList(inv?.preferredRounds),
        preferredStages: asList(inv?.preferredStages),
        sectors: asList(inv?.sectors),
        typicalTicket: String(inv?.typicalTicket || ""),
        geographicFocus: String(inv?.geographicFocus || "Pakistan"),
        dealsPerYear: String(inv?.dealsPerYear || ""),
        decisionTimeline: String(inv?.decisionTimeline || ""),
        leadFollow: String(inv?.leadFollow || ""),
        sdgInterests: Array.isArray(inv?.sdgInterests) ? asList(inv?.sdgInterests).join(", ") : String(inv?.sdgInterests || ""),
        valueAdd: String(inv?.valueAdd || ""),
        screeningNotes: String(inv?.screeningNotes || ""),
        website: String(inv?.website || ""),
        linkedin: String(inv?.linkedin || ""),
    };
}

function mergeStoredInvestor(patch: Record<string, unknown>) {
    try {
        const raw = localStorage.getItem("ciel_user") || localStorage.getItem("user");
        const u = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        const prev = u.investor && typeof u.investor === "object" ? (u.investor as Record<string, unknown>) : {};
        const next = { ...u, investor: { ...prev, ...patch } };
        const s = JSON.stringify(next);
        localStorage.setItem("ciel_user", s);
        window.dispatchEvent(new Event("ciel_user_updated"));
    } catch { /* ignore */ }
}

function canonView(v: HubView): string {
    if (v === "home") return "overview";
    if (v === "showcase") return "discover";
    if (v === "saved") return "pipeline";
    if (v === "rankings" || v === "rank") return "match";
    return v;
}

const PIPE_COLS = [
    { key: "saved", title: "Saved", sub: "Private watchlist", match: ["saved"] },
    { key: "interest", title: "Interest sent", sub: "CIEL screens → founder consents", match: ["interest", "intro"] },
    { key: "introduced", title: "Introduced", sub: "Messaging open · founder revealed", match: ["introduced"] },
    { key: "diligence", title: "Diligence", sub: "NDA signed · room active", match: ["diligence"] },
    { key: "termsheet", title: "Term sheet", sub: "Terms exchanged", match: ["termsheet"] },
    { key: "closed", title: "Closed", sub: "Invested, passed or declined", match: ["invested", "passed"] },
] as const;

function PanelBack({ href }: { href: string }) {
    return (
        <a href={href} className="rounded-full bg-[#eef3f6] px-4 py-2 text-[13.5px] font-bold text-[#0b4b57] hover:bg-[#e1eaef]">
            ← Back
        </a>
    );
}

function Surface({ children }: { children: ReactNode }) {
    return <div className="mt-[22px] rounded-[22px] bg-white p-[26px_30px] shadow-[0_8px_30px_rgba(10,30,40,.08)]">{children}</div>;
}

function LockWall({ title, text }: { title: string; text: string }) {
    return (
        <div className="rounded-[18px] border border-dashed border-[#e3e9ee] bg-[#f7fafb] px-8 py-10 text-center">
            <div className="text-3xl">🔒</div>
            <h4 className="mt-2 text-[18px] font-bold text-[#14212b]">{title}</h4>
            <p className="mx-auto mt-2 max-w-xl text-[14px] leading-relaxed text-[#5d6c78]">{text}</p>
            <a href={`${BASE}?view=membership`} className="mt-4 inline-block rounded-xl bg-[#0e2530] px-4 py-2 text-[13.5px] font-bold text-white">See plans</a>
        </div>
    );
}

function bar(label: string, val: number) {
    return (
        <div className="mb-2 grid grid-cols-[140px_1fr_36px] items-center gap-2 text-[12.5px]">
            <span className="text-[#5d6c78]">{label}</span>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#eef3f6]"><span className="block h-full rounded-full bg-[#0f8f8a]" style={{ width: `${Math.max(0, Math.min(100, val))}%` }} /></div>
            <b>{val}</b>
        </div>
    );
}

const SCREEN_NAME: Record<string, string> = {
    overview: "Investor Overview",
    inbox: "Inbox & Messages",
    discover: "Discover Ventures",
    match: "AI Deal Match",
    pipeline: "My Pipeline",
    diligence: "Diligence Rooms",
    outcomes: "Deal Outcomes",
    reports: "Reports, Seats & API",
    membership: "Membership & Billing",
    agreements: "Agreements & Protection",
    activity: "My Activity Log",
    impact: "Pipeline Impact",
    profile: "Investor Profile",
    record: "Venture card",
};

export default function InvestorHub() {
    return (
        <Suspense fallback={null}>
            <InvestorHubInner />
        </Suspense>
    );
}

function InvestorHubInner() {
    const searchParams = useSearchParams();
    const recordId = searchParams.get("id");
    const { view: rawView } = useFacultyHubView(VIEWS, "overview");
    const screen = canonView(rawView);

    const [entries, setEntries] = useState<HubVenture[]>([]);
    const [loading, setLoading] = useState(true);
    const [kycPending, setKycPending] = useState(false);
    const [savedIds, setSavedIds] = useState<string[]>([]);
    const [interest, setInterest] = useState<HubRow[]>([]);
    const [intros, setIntros] = useState<HubRow[]>([]);
    const [activity, setActivity] = useState<ActRow[]>([]);
    const [deskMsgs, setDeskMsgs] = useState<DeskMsg[]>([]);
    const [noteOpen, setNoteOpen] = useState<{ kind: "interest" | "intro"; id: string } | null>(null);
    const [note, setNote] = useState("");
    const [q, setQ] = useState("");
    const [sector, setSector] = useState("");
    const [stage, setStage] = useState("");
    const [sdg, setSdg] = useState("");
    const [uni, setUni] = useState("");
    const [round, setRound] = useState("");
    const [ask, setAsk] = useState("");
    const [ecsMin, setEcsMin] = useState("");
    const [thread, setThread] = useState<"desk" | "platform" | string>("desk");
    const [compose, setCompose] = useState("");
    const [orgName, setOrgName] = useState("");
    const [mandate, setMandate] = useState<Mandate>(mandateFrom(null));
    const [planKey, setPlanKey] = useState<PlanKey>("explorer");
    const [savingMandate, setSavingMandate] = useState(false);
    const viewedRef = useRef<string>("");

    const me = readStoredCurrentUser();
    const investorProfile = me?.investor && typeof me.investor === "object" ? (me.investor as Record<string, unknown>) : null;
    const org = String(orgName || me?.orgName || investorProfile?.investorType || "Investor").trim();
    const name = String(me?.name || "Investor").trim();
    const plan = PLANS[planKey];

    useEffect(() => {
        void load();
    }, []);

    const load = async () => {
        setLoading(true);
        try {
            const res = await authenticatedFetch("/api/v1/paths/startup-business/investor-hub");
            const json = res?.ok ? await res.json() : null;
            setEntries(Array.isArray(json?.data) ? json.data : []);
            const meRes = await authenticatedFetch("/api/v1/users/me");
            const meJson = meRes?.ok ? await meRes.json() : null;
            const inv = meJson?.data?.investor && typeof meJson.data.investor === "object" ? meJson.data.investor : investorProfile;
            const status = String(meJson?.data?.account_status || me?.account_status || "").toLowerCase();
            setKycPending(json?.kycStatus === "pending" || status === "pending");
            const hub = (inv?.hub && typeof inv.hub === "object" ? inv.hub : {}) as {
                savedIds?: string[]; interest?: HubRow[]; intros?: HubRow[]; activity?: ActRow[]; deskMsgs?: DeskMsg[];
            };
            setSavedIds(Array.isArray(hub.savedIds) ? hub.savedIds : []);
            setInterest(Array.isArray(hub.interest) ? hub.interest : []);
            setIntros(Array.isArray(hub.intros) ? hub.intros : []);
            setActivity(Array.isArray(hub.activity) ? hub.activity : []);
            setDeskMsgs(Array.isArray(hub.deskMsgs) ? hub.deskMsgs : []);
            setMandate(mandateFrom(inv));
            setPlanKey(asPlan(inv?.plan));
            setOrgName(String(meJson?.data?.orgName || me?.orgName || ""));
            if (inv) mergeStoredInvestor(inv);
        } catch {
            toast.error("Failed to load the Investor Hub");
        } finally {
            setLoading(false);
        }
    };

    const persistHub = async (next: { savedIds: string[]; interest: HubRow[]; intros: HubRow[]; activity: ActRow[]; deskMsgs: DeskMsg[] }, silent = false) => {
        setSavedIds(next.savedIds);
        setInterest(next.interest);
        setIntros(next.intros);
        setActivity(next.activity);
        setDeskMsgs(next.deskMsgs);
        mergeStoredInvestor({ hub: next });
        const res = await authenticatedFetch("/api/v1/user/update", {
            method: "POST",
            body: JSON.stringify({ investorHub: next }),
        });
        if (!res?.ok && !silent) toast.error("Could not save pipeline");
    };

    const snapshot = () => ({ savedIds, interest, intros, activity, deskMsgs });

    const logAct = (ev: string, ventureName?: string | null, vis = "CIEL PK") => {
        const row: ActRow = { when: nowStamp(), ev, v: ventureName || "—", vis };
        void persistHub({ ...snapshot(), activity: [row, ...activity].slice(0, 200) }, true);
    };

    const dealStatus = (id?: string): string => {
        if (!id) return "none";
        if (intros.some((r) => r.entryId === id)) return "intro";
        if (interest.some((r) => r.entryId === id)) return "interest";
        if (savedIds.includes(id)) return "saved";
        return "none";
    };

    const toggleSave = (id: string, ventureName?: string | null) => {
        const next = savedIds.includes(id) ? savedIds.filter((x) => x !== id) : [...savedIds, id];
        const ev = savedIds.includes(id) ? "Removed from saved" : "Saved venture";
        const row: ActRow = { when: nowStamp(), ev, v: ventureName || "—", vis: "You" };
        void persistHub({ ...snapshot(), savedIds: next, activity: [row, ...activity].slice(0, 200) });
    };

    const sendNote = () => {
        if (!noteOpen) return;
        if (kycPending) {
            toast.error("CIEL PK verification is required before you can act on ventures.");
            return;
        }
        const entry = entries.find((e) => e.id === noteOpen.id);
        const row: HubRow = { entryId: noteOpen.id, note: note.trim(), at: new Date().toISOString(), status: "pending" };
        if (noteOpen.kind === "interest") {
            if (interest.some((r) => r.entryId === noteOpen.id)) return;
            const wouldIntro = !intros.some((r) => r.entryId === noteOpen.id);
            if (wouldIntro && plan.quota && intros.length >= plan.quota) {
                toast.error(`${plan.name} intro quota used this quarter. Upgrade to keep requesting introductions.`);
                return;
            }
            void persistHub({
                ...snapshot(),
                interest: [...interest, row],
                intros: wouldIntro ? [...intros, { ...row, status: "pending" }] : intros,
                activity: [{ when: nowStamp(), ev: "Expressed interest", v: entry?.ventureName || "—", vis: "CIEL PK · founder · faculty" }, ...activity].slice(0, 200),
            });
            toast.success("Interest sent — CIEL PK screens first, then the founder consents. You will be notified when messaging opens.");
        } else {
            if (plan.quota && intros.length >= plan.quota) {
                toast.error(`${plan.name} intro quota used this quarter. Upgrade to keep requesting introductions.`);
                return;
            }
            if (intros.some((r) => r.entryId === noteOpen.id)) return;
            void persistHub({
                ...snapshot(),
                intros: [...intros, { ...row, status: "pending" }],
                activity: [{ when: nowStamp(), ev: "Requested founder contact", v: entry?.ventureName || "—", vis: "CIEL PK" }, ...activity].slice(0, 200),
            });
            toast.success("Contact request sent to CIEL PK — you will be notified when approved.");
        }
        setNoteOpen(null);
        setNote("");
    };

    const sendDesk = () => {
        if (!compose.trim()) return;
        const msg: DeskMsg = { t: "me", x: compose.trim(), w: nowStamp() };
        void persistHub({
            ...snapshot(),
            deskMsgs: [...deskMsgs, msg],
            activity: [{ when: nowStamp(), ev: "Message sent to Deal Desk", v: "—", vis: "CIEL PK" }, ...activity].slice(0, 200),
        });
        setCompose("");
        toast.success("Message logged for Deal Desk (replies within 2 working days).");
    };

    const saveMandate = async () => {
        setSavingMandate(true);
        try {
            const res = await authenticatedFetch("/api/v1/user/update", {
                method: "POST",
                body: JSON.stringify({ orgName, investorMandate: mandate }),
            });
            if (!res?.ok) {
                toast.error("Could not save mandate");
                return;
            }
            mergeStoredInvestor(mandate);
            toast.success("Investor profile saved. AI Deal Match re-ranked.");
            logAct("Updated investment mandate", null, "You");
        } finally {
            setSavingMandate(false);
        }
    };

    const unis = useMemo(() => [...new Set(entries.map(universityOf).filter(Boolean))].sort(), [entries]);
    const sectors = useMemo(() => [...new Set(entries.map(sectorOf).filter(Boolean))].sort(), [entries]);
    const featured = entries.filter(isFeatured);
    const ranked = useMemo(
        () => [...entries].sort((a, b) => mandateFit(b, mandate) - mandateFit(a, mandate) || meritScore(b) - meritScore(a)),
        [entries, mandate],
    );
    const filtered = ranked.filter((e) => {
        if (uni && universityOf(e) !== uni) return false;
        if (sector && sectorOf(e) !== sector) return false;
        if (stage && String(e.stage || "") !== stage) return false;
        if (round && roundOf(e) !== round) return false;
        if (sdg && !sdgTags(e).includes(Number(sdg))) return false;
        if (ecsMin && ecsOf(e) < Number(ecsMin)) return false;
        const n = askAmount(e);
        if (ask === "lt10" && !(n > 0 && n < 10_000_000)) return false;
        if (ask === "10to20" && !(n >= 10_000_000 && n <= 20_000_000)) return false;
        if (ask === "gt20" && !(n > 20_000_000)) return false;
        if (q) {
            const hay = `${e.ventureName || ""} ${ownerName(e)} ${sectorOf(e)} ${e.ideaInfo?.problem || ""} ${displayVentureId(e)}`.toLowerCase();
            if (!hay.includes(q.toLowerCase())) return false;
        }
        return true;
    });
    const pipeline = entries.filter((e) => savedIds.includes(e.id || "") || interest.some((r) => r.entryId === e.id) || intros.some((r) => r.entryId === e.id));
    const record = entries.find((e) => e.id === recordId) || null;
    const strongMatches = ranked.filter((e) => mandateFit(e, mandate) >= 80);
    const waitingIds = new Set([...interest.map((r) => r.entryId), ...intros.map((r) => r.entryId)]);
    const waiting = waitingIds.size;
    const quotaUsed = intros.length;
    const introLocked = kycPending || Boolean(plan.quota && quotaUsed >= plan.quota);

    useEffect(() => {
        if (loading || screen !== "record" || !record?.id || viewedRef.current === record.id) return;
        viewedRef.current = record.id;
        logAct("Viewed venture detail", record.ventureName, "CIEL PK");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, screen, record?.id]);

    const todos: { b: string; s: string; href: string }[] = [];
    if (kycPending) todos.push({ b: "Account verification in progress", s: "Browse only — introductions unlock after CIEL PK verifies you", href: `${BASE}?view=agreements` });
    intros.forEach((r) => {
        const v = entries.find((e) => e.id === r.entryId);
        todos.push({ b: `${v?.ventureName || "Venture"}: waiting on CIEL screening`, s: "Founder contact is requested — CIEL PK will notify you", href: `${BASE}?view=pipeline` });
    });
    if (plan.quota && quotaUsed >= plan.quota) todos.push({ b: `${plan.name} intro quota used (${quotaUsed}/${plan.quota})`, s: "Upgrade to keep requesting introductions this quarter", href: `${BASE}?view=membership` });

    const stand = [
        ["Saved", entries.filter((e) => dealStatus(e.id) === "saved").length],
        ["Waiting on CIEL / founder", waiting],
        ["Introduced", 0],
        ["In diligence / terms", 0],
        ["Closed", 0],
    ] as const;
    const standMax = Math.max(1, ...stand.map(([, n]) => n));

    const notifications = [
        ...(kycPending ? [{ x: "Account pending CIEL PK verification", go: "agreements" }] : []),
        ...intros.map((r) => ({ x: `${entries.find((e) => e.id === r.entryId)?.ventureName || "Venture"}: introduction with CIEL PK`, go: "pipeline" })),
        ...interest.filter((r) => !intros.some((i) => i.entryId === r.entryId)).map((r) => ({ x: `Interest sent · ${entries.find((e) => e.id === r.entryId)?.ventureName || "venture"}`, go: "pipeline" })),
    ];

    const deskThread: DeskMsg[] = [
        { t: "sys", x: "Deal Desk threads are read by CIEL PK staff only.", w: "" },
        { t: "them", x: `Welcome, ${name.split(" ")[0]}. Every introduction passes two gates before a founder is revealed: CIEL PK screening, then the founder's own acceptance in their dashboard.`, w: "today" },
        ...deskMsgs,
    ];

    const impactPool = pipeline.length ? pipeline : [];
    const sdgCounts: Record<number, number> = {};
    const secCounts: Record<string, number> = {};
    impactPool.forEach((e) => {
        sdgTags(e).forEach((n) => { sdgCounts[n] = (sdgCounts[n] || 0) + 1; });
        const k = sectorOf(e).split(" /")[0];
        secCounts[k] = (secCounts[k] || 0) + 1;
    });
    const sdgMax = Math.max(1, ...Object.values(sdgCounts));
    const secMax = Math.max(1, ...Object.values(secCounts));

    const capitalSought = entries.reduce((s, e) => s + (askAmount(e) || 0), 0);
    const matchShown = ranked.slice(0, plan.aiMatchTop);
    const homeHref = `${BASE}?view=overview`;

    const heroStats = [
        { value: String(entries.length), label: "INVESTMENT-READY", href: `${BASE}?view=discover` },
        { value: String(strongMatches.length), label: "STRONG MATCHES", href: `${BASE}?view=match` },
        { value: String(pipeline.length), label: "MY PIPELINE", href: `${BASE}?view=pipeline` },
        { value: "PKR 0", label: "DEPLOYED VIA CIEL", href: `${BASE}?view=outcomes` },
    ];

    const openNote = (kind: "interest" | "intro", id: string) => {
        if (kycPending) {
            toast.error("🔒 Your investor account is pending — CIEL PK verification is required before you can act on ventures.");
            return;
        }
        if (kind === "intro" && introLocked && !intros.some((r) => r.entryId === id)) {
            toast.error(`${plan.name} intro quota used this quarter.`);
            return;
        }
        setNoteOpen({ kind, id });
    };

    const cardProps = (entry: HubVenture) => ({
        entry,
        saved: savedIds.includes(entry.id || ""),
        interested: interest.some((r) => r.entryId === entry.id),
        intro: intros.find((r) => r.entryId === entry.id),
        kycPending,
        hideTraction: !plan.traction,
        fit: mandateFit(entry, mandate),
        onSave: () => entry.id && toggleSave(entry.id, entry.ventureName),
        onInterest: () => entry.id && openNote("interest", entry.id),
        onIntro: () => entry.id && openNote("intro", entry.id),
    });

    return (
        <div>
            <CourseworkCrumb role="Investor" pathLabel="Startup / Venture" view={SCREEN_NAME[screen] || "Investor Hub"} />
            {kycPending && (
                <div className="mb-4 rounded-[14px] border border-[#ffe08a] bg-[#fff8e1] px-4 py-3 text-[13.5px] leading-relaxed text-[#5d6c78]">
                    <b className="text-[#a06a00]">Account pending.</b> Browse only — introductions, rooms and outcomes unlock after CIEL PK verifies your account (CIEL PK Master Dashboard → Investor Accounts).
                </div>
            )}

            {screen === "overview" && (
                <>
                    <MockupHero
                        kicker="CIEL PK · Investor Hub"
                        title="Find credible university ventures before everyone else."
                        subtitle="Screen faculty-verified ventures, request permissioned introductions, run diligence inside watermarked rooms, and close through CIEL — every step logged, every founder protected."
                        badge={kycPending ? "⏳ PENDING VERIFICATION" : "✓ VERIFIED INVESTOR"}
                        gradient="radial-gradient(120% 140% at 100% 0%, #c2185b 0%, #5a1f5c 45%, #1b1f3b 100%)"
                        stats={heroStats}
                    />
                    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-[16px] border border-[#e3e9ee] bg-white px-4 py-3">
                        <b className="text-[13px] text-[#14212b]">My mandate</b>
                        {[mandate.geographicFocus || "Pakistan", mandate.preferredRounds.join(" → ") || "Rounds", mandate.typicalTicket || "Ticket", ...mandate.sectors.slice(0, 4)].filter(Boolean).map((c) => (
                            <span key={c} className="rounded-full bg-[#eef6f6] px-2.5 py-1 text-[11.5px] font-extrabold text-[#0b4b57]">{c}</span>
                        ))}
                        <span className="flex-1" />
                        <a href={`${BASE}?view=profile`} className="text-[13px] font-bold text-[#0f8f8a]">Edit mandate →</a>
                    </div>
                    <div className="mt-[22px] grid grid-cols-1 gap-[22px] md:grid-cols-2">
                        <div className="rounded-[22px] bg-white p-6 shadow-[0_8px_30px_rgba(10,30,40,.08)]">
                            <h3 className="m-0 text-[16px] font-bold">Needs your action</h3>
                            <p className="mt-1 text-[13px] text-[#5d6c78]">Steps waiting on you, not on CIEL or the founder.</p>
                            <div className="mt-3 space-y-2">
                                {todos.length ? todos.map((t) => (
                                    <div key={t.b} className="flex items-start gap-3 rounded-xl bg-[#f6f8fa] px-3 py-3">
                                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#c2185b]" />
                                        <div className="min-w-0 flex-1"><b className="block text-[13.5px]">{t.b}</b><small className="text-[#5d6c78]">{t.s}</small></div>
                                        <a href={t.href} className="rounded-lg bg-[#eef3f6] px-3 py-1.5 text-[12px] font-bold text-[#0b4b57]">Go</a>
                                    </div>
                                )) : <div className="rounded-xl border border-dashed border-[#e3e9ee] px-4 py-6 text-center text-[13px] text-[#5d6c78]">Nothing waiting on you.</div>}
                            </div>
                        </div>
                        <div className="rounded-[22px] bg-white p-6 shadow-[0_8px_30px_rgba(10,30,40,.08)]">
                            <h3 className="m-0 text-[16px] font-bold">Where things stand</h3>
                            <p className="mt-1 text-[13px] text-[#5d6c78]">Live counts from your pipeline.</p>
                            <div className="mt-3">
                                {stand.map(([l, n]) => (
                                    <div key={l} className="mb-2 grid grid-cols-[170px_1fr_30px] items-center gap-2 text-[12.5px]">
                                        <span>{l}</span>
                                        <div className="h-1.5 overflow-hidden rounded-full bg-[#eef3f6]"><span className="block h-full rounded-full bg-[#0f8f8a]" style={{ width: `${(n / standMax) * 100}%` }} /></div>
                                        <b>{n}</b>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 rounded-xl bg-[#f6f8fa] px-3 py-2.5 text-[12.5px] text-[#5d6c78]">
                                <b>CIEL Deal Desk:</b> dealdesk@cielpk.org · replies within 2 working days.{" "}
                                <a href={`${BASE}?view=inbox`} className="font-bold text-[#0f8f8a]">Message Deal Desk →</a>
                            </div>
                        </div>
                    </div>
                    <div className="mt-7 flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <h3 className="m-0 text-[18px] font-bold text-[#14212b]">Top matches for your mandate</h3>
                            <p className="mt-1 text-[13.5px] text-[#5d6c78]">Fit is based on your declared preferences; Venture Potential and Evidence Confidence are independent faculty-reviewed signals.</p>
                        </div>
                        <div className="flex gap-2">
                            <a href={`${BASE}?view=match`} className="rounded-xl bg-[#eef3f6] px-4 py-2 text-[13.5px] font-bold text-[#0b4b57]">See AI rationale</a>
                            <a href={`${BASE}?view=discover`} className="rounded-xl bg-[#c2185b] px-4 py-2 text-[13.5px] font-bold text-white">Explore all ventures</a>
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-[18px] md:grid-cols-2 xl:grid-cols-3">
                        {ranked.slice(0, 3).map((entry) => <VentureCard key={entry.id} {...cardProps(entry)} />)}
                        {!ranked.length && !loading && <div className="col-span-full rounded-2xl border border-dashed border-[#e3e9ee] px-8 py-8 text-center text-[#5d6c78]">No investment-ready ventures yet.</div>}
                    </div>
                </>
            )}

            {screen === "inbox" && (
                <>
                    <MockupHero
                        kicker="Inbox & messages"
                        title="All founder conversations start here."
                        subtitle="Messaging stays on CIEL until a term sheet is signed. This protects founders from unsolicited contact, protects you with a verifiable record, and lets the CIEL Deal Desk step in if a conversation stalls."
                        badge="IN-PLATFORM CONTACT"
                        gradient={MOCKUP_GRADIENTS.navy}
                        stats={[
                            { value: "1", label: "OPEN THREADS" },
                            { value: String(notifications.length), label: "UNREAD" },
                            { value: String(notifications.length), label: "NOTIFICATIONS" },
                            { value: "2d", label: "DEAL DESK SLA" },
                        ]}
                    />
                    <Surface>
                        <div className="grid min-h-[420px] grid-cols-1 overflow-hidden rounded-[16px] border border-[#e3e9ee] md:grid-cols-[280px_1fr]">
                            <div className="border-b border-[#e3e9ee] md:border-b-0 md:border-r">
                                <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wide text-[#6e92a5]">Notifications</div>
                                {notifications.map((n) => (
                                    <a key={n.x} href={`${BASE}?view=${n.go}`} className="block px-3 py-2.5 text-[13px] hover:bg-[#f6f8fa]"><small>🔔 {n.x}</small></a>
                                ))}
                                {!notifications.length && <div className="px-3 py-4 text-[12.5px] text-[#5d6c78]">No notifications.</div>}
                                <div className="px-3 pb-1 pt-3 text-[10px] font-black uppercase tracking-wide text-[#6e92a5]">Conversations</div>
                                <button type="button" onClick={() => setThread("desk")} className={`block w-full px-3 py-2.5 text-left ${thread === "desk" ? "bg-[#eef6f6]" : "hover:bg-[#f6f8fa]"}`}>
                                    <b className="block text-[13.5px]">CIEL Deal Desk</b>
                                    <small className="text-[#5d6c78]">CIEL PK staff</small>
                                </button>
                                {intros.map((r) => {
                                    const v = entries.find((e) => e.id === r.entryId);
                                    return (
                                        <button key={r.entryId} type="button" onClick={() => setThread(r.entryId)} className={`block w-full px-3 py-2.5 text-left ${thread === r.entryId ? "bg-[#eef6f6]" : "hover:bg-[#f6f8fa]"}`}>
                                            <b className="block text-[13.5px]">{v?.ventureName || "Venture"}</b>
                                            <small className="text-[#5d6c78]">Pending CIEL PK · founder not revealed</small>
                                        </button>
                                    );
                                })}
                                <Link href="/dashboard/investor/messages" className="block px-3 py-2.5 hover:bg-[#f6f8fa]">
                                    <b className="block text-[13.5px]">Platform messages</b>
                                    <small className="text-[#5d6c78]">On-platform chat with CIEL users</small>
                                </Link>
                            </div>
                            <div className="flex flex-col p-5">
                                {thread !== "desk" && thread !== "platform" ? (
                                    <>
                                        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e3e9ee] pb-3">
                                            <div>
                                                <b className="text-[15px]">{entries.find((e) => e.id === thread)?.ventureName || "Venture"}</b>
                                                <br /><small className="text-[#5d6c78]">Gate 1 · CIEL PK screening — founder identity stays masked</small>
                                            </div>
                                            <a href={`${BASE}?view=pipeline`} className="rounded-lg bg-[#eef3f6] px-3 py-1.5 text-[12.5px] font-bold text-[#0b4b57]">Open pipeline</a>
                                        </div>
                                        <div className="flex-1 py-8 text-center text-[14px] leading-relaxed text-[#5d6c78]">
                                            Messaging opens after CIEL PK screens this request and the founder accepts in their dashboard. Direct email is never revealed before that.
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e3e9ee] pb-3">
                                            <div>
                                                <b className="text-[15px]">CIEL Deal Desk</b>
                                                <br /><small className="text-[#5d6c78]">Hina Raza · CIEL PK · dealdesk@cielpk.org</small>
                                            </div>
                                            <a href={`${BASE}?view=agreements`} className="rounded-lg bg-[#eef3f6] px-3 py-1.5 text-[12.5px] font-bold text-[#0b4b57]">Help & agreements</a>
                                        </div>
                                        <div className="flex-1 space-y-2 overflow-y-auto py-4">
                                            {deskThread.map((m, i) => (
                                                <div key={i} className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.5px] ${m.t === "me" ? "ml-auto bg-[#0e2530] text-white" : m.t === "sys" ? "bg-[#f6f8fa] text-[#5d6c78]" : "bg-[#e8f3f2] text-[#14212b]"}`}>
                                                    {m.x}
                                                    {m.w ? <small className="mt-1 block opacity-70">{m.w}</small> : null}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <input value={compose} onChange={(e) => setCompose(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendDesk()} placeholder="Write a message… (logged, on-platform)" className="flex-1 rounded-xl border border-[#e3e9ee] px-3 py-2 text-sm" />
                                            <button type="button" onClick={sendDesk} className="rounded-xl bg-[#c2185b] px-4 py-2 text-[13.5px] font-bold text-white">Send</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </Surface>
                </>
            )}

            {screen === "discover" && (
                <>
                    <MockupHero
                        kicker="Verified pipeline"
                        title="Discover investment-ready ventures."
                        subtitle="Only faculty-approved ventures whose founders opted into the Investor Track appear here. Founder identities stay masked until an introduction is approved by both CIEL PK and the founder."
                        badge="DEAL DISCOVERY"
                        gradient={MOCKUP_GRADIENTS.pink}
                        stats={[
                            { value: String(filtered.length), label: "VISIBLE VENTURES" },
                            { value: String(unis.length), label: "UNIVERSITIES" },
                            { value: capitalSought ? pk(capitalSought) : "PKR 0", label: "CAPITAL SOUGHT" },
                            { value: String(featured.length), label: "CIEL SPOTLIGHTS" },
                        ]}
                    />
                    <Surface>
                        <div className="mb-[18px] flex flex-wrap items-start gap-3.5">
                            <PanelBack href={homeHref} />
                            <div className="min-w-0 flex-1">
                                <h3 className="m-0 text-[22px] font-bold text-[#14212b]">🚀 Venture marketplace — {filtered.length}</h3>
                                <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#5d6c78]">Search by venture, sector, university, product stage, round, ask or Evidence Confidence.</p>
                            </div>
                            <button type="button" className="rounded-xl bg-[#eef3f6] px-4 py-2 text-[13.5px] font-bold text-[#0b4b57]" onClick={() => { setQ(""); setUni(""); setSector(""); setStage(""); setRound(""); setAsk(""); setEcsMin(""); setSdg(""); }}>Clear filters</button>
                        </div>
                        <div className="mb-4 flex flex-wrap gap-2.5">
                            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search venture / sector / problem…" className="min-w-[200px] rounded-xl border border-[#e3e9ee] px-3 py-2 text-sm" />
                            <select value={uni} onChange={(e) => setUni(e.target.value)} className="min-w-[160px] rounded-xl border border-[#e3e9ee] px-3 py-2 text-sm"><option value="">All universities</option>{unis.map((u) => <option key={u}>{u}</option>)}</select>
                            <select value={stage} onChange={(e) => setStage(e.target.value)} className="min-w-[150px] rounded-xl border border-[#e3e9ee] px-3 py-2 text-sm"><option value="">All product stages</option>{["Idea", "Prototype", "MVP", "Revenue"].map((u) => <option key={u}>{u}</option>)}</select>
                            <select value={round} onChange={(e) => setRound(e.target.value)} className="min-w-[140px] rounded-xl border border-[#e3e9ee] px-3 py-2 text-sm"><option value="">Any round</option><option>Pre-Seed</option><option>Seed</option><option>Grant</option></select>
                            <select value={ask} onChange={(e) => setAsk(e.target.value)} className="min-w-[150px] rounded-xl border border-[#e3e9ee] px-3 py-2 text-sm"><option value="">Any ask</option><option value="lt10">Under PKR 10M</option><option value="10to20">PKR 10–20M</option><option value="gt20">Above PKR 20M</option></select>
                            <select value={ecsMin} onChange={(e) => setEcsMin(e.target.value)} className="min-w-[150px] rounded-xl border border-[#e3e9ee] px-3 py-2 text-sm"><option value="">Any evidence</option><option value="75">ECS 75+</option><option value="80">ECS 80+</option></select>
                            <select value={sector} onChange={(e) => setSector(e.target.value)} className="min-w-[150px] rounded-xl border border-[#e3e9ee] px-3 py-2 text-sm"><option value="">All sectors</option>{sectors.map((u) => <option key={u}>{u}</option>)}</select>
                            <select value={sdg} onChange={(e) => setSdg(e.target.value)} className="min-w-[150px] rounded-xl border border-[#e3e9ee] px-3 py-2 text-sm"><option value="">All SDGs</option>{Array.from({ length: 17 }, (_, i) => i + 1).map((n) => <option key={n} value={String(n)}>SDG {n} — {SDG_SHORT[n]}</option>)}</select>
                        </div>
                        {loading ? <p className="text-[#5d6c78]">Loading ventures…</p> : (
                            <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2 xl:grid-cols-3">
                                {filtered.map((entry) => <VentureCard key={entry.id} {...cardProps(entry)} />)}
                                {filtered.length === 0 && (
                                    <div className="col-span-full rounded-2xl border border-dashed border-[#e3e9ee] px-8 py-8 text-center text-[#5d6c78]">No ventures match these filters.</div>
                                )}
                                {!plan.firstLook && featured.length > 0 && (
                                    <div className="col-span-full flex flex-wrap items-center gap-3 rounded-[16px] border border-[#ffe08a] bg-[#fff8e1] px-4 py-3 text-[13px] text-[#5d6c78]">
                                        <b>⏱ {featured.length} Spotlight venture{featured.length > 1 ? "s" : ""}</b>
                                        <span>— Institutional Partners get a 14-day first look at Spotlight cohorts. Your current plan sees them with everyone else.</span>
                                        <span className="flex-1" />
                                        <a href={`${BASE}?view=membership`} className="rounded-lg bg-[#c2185b] px-3 py-1.5 text-[12.5px] font-bold text-white">Institutional Partner →</a>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="mt-5 flex flex-wrap gap-4 text-[12px] text-[#5d6c78]">
                            <span>● <b>Fit</b> = mandate match</span>
                            <span>● <b>VPS</b> = Venture Potential Score, faculty-reviewed (0–100)</span>
                            <span>● <b>ECS</b> = Evidence Confidence Score (0–100)</span>
                            <span>● All ventures are CIEL-sourced; CIEL holds a disclosed 1.5% advisory warrant in each Investor-Track venture.</span>
                        </div>
                    </Surface>
                </>
            )}

            {screen === "match" && (
                <>
                    <MockupHero
                        kicker="Investor lens"
                        title="Match the opportunity to your mandate — not the hype."
                        subtitle="CIEL separates mandate fit from venture quality. A high fit means the venture resembles what you said you invest in; it is not an investment recommendation."
                        badge="AI DECISION SUPPORT"
                        gradient={MOCKUP_GRADIENTS.purple}
                        stats={[
                            { value: String(strongMatches.length), label: "80%+ FIT" },
                            { value: String(entries.reduce((m, e) => Math.max(m, ecsOf(e)), 0) || 0), label: "HIGHEST EVIDENCE" },
                            { value: String(entries.reduce((m, e) => Math.max(m, vpsOf(e)), 0) || 0), label: "HIGHEST POTENTIAL" },
                            { value: String(entries.length), label: "VENTURES RANKED" },
                        ]}
                    />
                    <Surface>
                        <div className="mb-[18px] flex flex-wrap items-start gap-3.5">
                            <PanelBack href={homeHref} />
                            <div className="min-w-0 flex-1">
                                <h3 className="m-0 text-[22px] font-bold text-[#14212b]">AI Deal Match</h3>
                                <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#5d6c78]">Current lens weights: round & ticket 30 · sector 25 · evidence 25 · readiness 20. Previews only — investor runs never issue badges or affect student records.</p>
                            </div>
                            <a href={`${BASE}?view=profile`} className="rounded-xl bg-[#c2185b] px-4 py-2 text-[13.5px] font-bold text-white">Adjust mandate</a>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {matchShown.map((entry) => (
                                <div key={entry.id} className="rounded-[18px] border border-[#e3e9ee] p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="text-[11px] font-bold tracking-wide text-[#5d6c78]">{universityOf(entry)} · {sectorOf(entry)}</div>
                                            <h3 className="m-0 mt-1 text-[18px] font-bold">{entry.ventureName}</h3>
                                            <div className="text-[13px] text-[#5d6c78]">{entry.stage} · {roundOf(entry)} · {askLine(entry)}</div>
                                        </div>
                                        <div className="text-right"><strong className="text-[22px]">{mandateFit(entry, mandate)}%</strong><div className="text-[11px] text-[#5d6c78]">fit</div></div>
                                    </div>
                                    <p className="mt-3 text-[13.5px] leading-relaxed text-[#5d6c78]"><b>Why matched:</b> {matchReason(entry, mandate)}<br /><b>Quality signals:</b> readiness {vpsOf(entry)}/100 ({classify(vpsOf(entry))}) · evidence {ecsOf(entry)}.<br /><b>Primary concern:</b> Weakest faculty-reviewed dimension: {(weakestCriterion(entry)?.label.split("·")[1] || weakestCriterion(entry)?.label || "—").trim()} ({weakestCriterion(entry)?.points}/{weakestCriterion(entry)?.max}).</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <a href={`${BASE}?view=record&id=${entry.id}`} className="rounded-lg bg-[#eef3f6] px-3 py-1.5 text-[12.5px] font-bold text-[#0b4b57]">Review evidence</a>
                                        {interest.some((r) => r.entryId === entry.id) || intros.some((r) => r.entryId === entry.id)
                                            ? <button type="button" className="rounded-lg bg-[#eef3f6] px-3 py-1.5 text-[12.5px] font-bold text-[#0b4b57]" onClick={() => toast.message("Gate 1 · CIEL PK is screening your request.")}>⏳ Waiting for CIEL PK</button>
                                            : <button type="button" className="rounded-lg bg-[#c2185b] px-3 py-1.5 text-[12.5px] font-bold text-white" onClick={() => entry.id && openNote("interest", entry.id)}>Express interest</button>}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {ranked.length > matchShown.length && (
                            <div className="mt-4">
                                <LockWall title={`${ranked.length - matchShown.length} more ranked matches with AI rationale`} text="Explorer shows your single best match. Angel and above see the full ranked list, the reasons behind each score, and the critical-risk notes." />
                            </div>
                        )}
                        {!ranked.length && <div className="rounded-2xl border border-dashed border-[#e3e9ee] px-8 py-8 text-center text-[#5d6c78]">No investment-ready ventures to rank yet.</div>}
                        <div className="mt-5 rounded-xl bg-[#fff8e1] px-4 py-3 text-[13px] leading-relaxed text-[#5d6c78]"><b>Important:</b> AI Match is screening support only. CIEL PK is not an SECP-licensed investment adviser, broker or fund manager and makes no offer of securities.</div>
                    </Surface>
                </>
            )}

            {screen === "pipeline" && (
                <>
                    <MockupHero
                        kicker="Permissioned pipeline"
                        title="Move ventures through a loop both sides can see."
                        subtitle='Stages before "Introduced" need CIEL screening and founder consent. Stages after it need a data-room NDA. Every deal ends in a declared outcome — Invested or Passed — so founders get closure and CIEL can reconcile.'
                        badge="MY DEAL FLOW"
                        gradient="linear-gradient(135deg,#3b5ba9,#1f3a7a)"
                        stats={[
                            { value: String(pipeline.length), label: "ACTIVE DEALS" },
                            { value: String(waiting), label: "WAITING ON CIEL / FOUNDER" },
                            { value: "0", label: "IN DILIGENCE" },
                            { value: "0", label: "CLOSED" },
                        ]}
                    />
                    <Surface>
                        <div className="mb-4 flex flex-wrap items-start gap-3.5">
                            <PanelBack href={homeHref} />
                            <div>
                                <h3 className="m-0 text-[22px] font-bold text-[#14212b]">Investment pipeline</h3>
                                <p className="mt-1 text-[14px] text-[#5d6c78]">Buttons only appear when the next step is actually available to you.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                            {PIPE_COLS.map((col) => {
                                const list = entries.filter((e) => (col.match as readonly string[]).includes(dealStatus(e.id)));
                                return (
                                    <div key={col.key} className="min-h-[180px] rounded-[16px] bg-[#f6f8fa] p-3">
                                        <div className="mb-2 flex items-start justify-between gap-2">
                                            <div><b className="block text-[13px]">{col.title}</b><small className="text-[11px] text-[#5d6c78]">{col.sub}</small></div>
                                            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold">{list.length}</span>
                                        </div>
                                        {list.map((e) => (
                                            <div key={e.id} className="mb-2 rounded-xl border border-[#e3e9ee] bg-white p-3">
                                                <b className="block text-[13.5px]">{e.ventureName}</b>
                                                <small className="text-[#5d6c78]">{universityOf(e)} · {roundOf(e)} · {askLine(e)}<br />Fit {mandateFit(e, mandate)}% · readiness {vpsOf(e)} · evidence {ecsOf(e)}</small>
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    <a href={`${BASE}?view=record&id=${e.id}`} className="rounded-lg bg-[#eef3f6] px-2.5 py-1 text-[11.5px] font-bold text-[#0b4b57]">Open</a>
                                                    {dealStatus(e.id) === "saved" && !interest.some((r) => r.entryId === e.id) && !intros.some((r) => r.entryId === e.id) && (
                                                        <button type="button" className="rounded-lg bg-[#c2185b] px-2.5 py-1 text-[11.5px] font-bold text-white" onClick={() => e.id && openNote("interest", e.id)}>Express interest</button>
                                                    )}
                                                    {(dealStatus(e.id) === "interest" || dealStatus(e.id) === "intro") && (
                                                        <button type="button" className="rounded-lg bg-[#eef3f6] px-2.5 py-1 text-[11.5px] font-bold text-[#0b4b57]" onClick={() => toast.message("Gate 1 · CIEL PK is screening your request. The founder is not notified until CIEL passes screening.")}>⏳ Waiting for CIEL PK</button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {!list.length && <div className="px-2 py-6 text-center text-[11px] text-[#5d6c78]">Empty</div>}
                                    </div>
                                );
                            })}
                        </div>
                    </Surface>
                </>
            )}

            {screen === "diligence" && (
                <>
                    <MockupHero
                        kicker="Diligence rooms"
                        title="See deeper evidence only when access is granted."
                        subtitle="Rooms open after an approved introduction and a click-through NDA. Documents are view-only, dynamically watermarked with your name, expire after 30 days, and every view is logged for the founder and CIEL PK."
                        badge="PERMISSIONED DATA"
                        gradient={MOCKUP_GRADIENTS.gold}
                        stats={[
                            { value: "0", label: "ACTIVE ROOMS" },
                            { value: String(intros.length), label: "AWAITING NDA / ACCESS" },
                            { value: "0", label: "DOCUMENTS AVAILABLE" },
                            { value: "✓", label: "VIEWS LOGGED" },
                        ]}
                    />
                    <Surface>
                        {!plan.rooms ? (
                            <LockWall title="Diligence rooms are an Angel+ feature" text={`You have ${intros.length} introduction request${intros.length === 1 ? "" : "s"}. Founders can release pitch decks, financials and legal files into a watermarked, logged room — but only for members on Angel (PKR 60,000 / yr) or above. Introductions you already have stay valid.`} />
                        ) : intros.length ? (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {intros.map((r) => {
                                    const v = entries.find((e) => e.id === r.entryId);
                                    return (
                                        <div key={r.entryId} className="rounded-[18px] border border-[#e3e9ee] p-5">
                                            <span className="rounded-full bg-[#eef3f6] px-2.5 py-1 text-[11px] font-extrabold uppercase text-[#5d6c78]">Not requested · introduction pending CIEL PK</span>
                                            <h4 className="mt-3 text-[17px] font-bold">{v?.ventureName || "Venture"}</h4>
                                            <p className="text-[13.5px] text-[#5d6c78]">Introduction is with CIEL PK. Sign the NDA after both CIEL PK and the founder approve — rooms do not open on a pending request.</p>
                                            <div className="mt-3 space-y-1.5 text-[13px]">
                                                {["Pitch deck", "Financials", "Legal / cap table"].map((d) => (
                                                    <div key={d} className="flex items-center justify-between rounded-xl bg-[#f6f8fa] px-3 py-2"><span>{d}</span><span>🔒 Locked</span></div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-[#e3e9ee] px-8 py-8 text-center text-[#5d6c78]">No rooms yet. Rooms appear after an approved introduction.</div>
                        )}
                    </Surface>
                </>
            )}

            {screen === "outcomes" && (
                <>
                    <MockupHero
                        kicker="Deal outcomes & CIEL success fee"
                        title="Every CIEL-sourced deal ends with a declared outcome."
                        subtitle="Declare Invested or Passed for each venture you were introduced to. Passing with a reason gives the student founder structured feedback (delivered by CIEL). Investing triggers the success fee you agreed to at sign-up."
                        badge="CLOSE THE LOOP"
                        gradient={MOCKUP_GRADIENTS.green}
                        stats={[
                            { value: "0", label: "INVESTMENTS DECLARED" },
                            { value: "PKR 0", label: "CAPITAL DEPLOYED" },
                            { value: "PKR 0", label: "SUCCESS FEES OWED" },
                            { value: "0", label: "PASSED WITH FEEDBACK" },
                        ]}
                    />
                    <Surface>
                        <h3 className="m-0 text-[18px] font-bold">Outcome register</h3>
                        <p className="mt-1 text-[14px] text-[#5d6c78]">Dual attestation: the founder declares the same outcome from their side; CIEL reconciles the two. Outcomes unlock after an approved introduction.</p>
                        <div className="mt-4 overflow-x-auto">
                            <table className="w-full min-w-[720px] text-left text-[13.5px]">
                                <thead><tr className="text-[11px] uppercase tracking-wide text-[#5d6c78]"><th className="py-2">Venture</th><th>Introduced</th><th>Your declaration</th><th>Founder attestation</th><th>Instrument · amount</th><th>Fee route</th><th /></tr></thead>
                                <tbody>
                                    <tr><td colSpan={7} className="py-8 text-center text-[#5d6c78]">No introduced ventures yet. Request founder contact from Discover or Pipeline — CIEL PK must approve before an outcome can be declared.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </Surface>
                </>
            )}

            {screen === "reports" && (
                <>
                    <MockupHero
                        kicker="Reports, seats & API"
                        title="Ecosystem intelligence for your investment committee and annual report."
                        subtitle="Quarterly cohort reports, anonymised university-venture analytics, a 14-day first look at every Spotlight cohort, ten seats for your team, and CRM / API export. This is what the PKR 1.2M partnership buys beyond deal flow."
                        badge="INSTITUTIONAL PARTNER"
                        gradient={MOCKUP_GRADIENTS.slate}
                        stats={[
                            { value: plan.reports ? `1 / ${plan.seats}` : `${plan.seats} / ${plan.seats}`, label: "SEATS IN USE" },
                            { value: plan.firstLook ? String(featured.length) : "—", label: "FIRST-LOOK NOW" },
                            { value: "Q3 2026", label: "LATEST COHORT REPORT" },
                            { value: plan.api ? "Active" : "—", label: "API STATUS" },
                        ]}
                    />
                    <Surface>
                        {!plan.reports ? (
                            <LockWall title="Institutional Partner features" text="Quarterly cohort reports, anonymised ecosystem analytics by university and sector, 14-day first look at Spotlight cohorts, 10 seats and API export are part of the PKR 1.2M annual partnership." />
                        ) : (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div className="rounded-[18px] border border-[#e3e9ee] p-5">
                                    <h3 className="m-0 text-[15px] font-bold">Cohort & ecosystem reports</h3>
                                    {[["Q3 2026 Spotlight cohort report", "Faculty-approved Investor Track · PDF"], ["University venture pipeline", "Anonymised by partner university"], ["Investor activity benchmark", "Your response time vs. peers"]].map(([a, b]) => (
                                        <div key={a} className="mt-3 flex items-start justify-between gap-2 border-t border-[#eef3f6] pt-3">
                                            <div><b className="block text-[13px]">{a}</b><small className="text-[#5d6c78]">{b}</small></div>
                                            <button type="button" className="rounded-lg bg-[#eef3f6] px-2.5 py-1 text-[12px] font-bold text-[#0b4b57]" onClick={() => toast.message("Report is issued by Deal Desk for Institutional Partners.")}>Open</button>
                                        </div>
                                    ))}
                                </div>
                                <div className="rounded-[18px] border border-[#e3e9ee] p-5">
                                    <h3 className="m-0 text-[15px] font-bold">Seats (1 of {plan.seats})</h3>
                                    <div className="mt-3 flex items-center justify-between text-[13px]"><span>{name} · admin</span><span className="rounded-full bg-[#e6f6ec] px-2 py-0.5 text-[11px] font-extrabold text-[#1c8a52]">Active</span></div>
                                    <p className="mt-3 text-[12.5px] text-[#5d6c78]">Every seat signs the agreement individually; activity is logged per person. Additional seats are invited by Deal Desk.</p>
                                </div>
                                <div className="rounded-[18px] border border-[#e3e9ee] p-5">
                                    <h3 className="m-0 text-[15px] font-bold">First look & API</h3>
                                    {featured.map((v) => (
                                        <div key={v.id} className="mt-3 flex items-start justify-between gap-2 border-t border-[#eef3f6] pt-3">
                                            <div><b className="block text-[13px]">{v.ventureName}</b><small className="text-[#5d6c78]">{askLine(v)}</small></div>
                                            <a href={`${BASE}?view=record&id=${v.id}`} className="rounded-lg bg-[#c2185b] px-2.5 py-1 text-[12px] font-bold text-white">Open</a>
                                        </div>
                                    ))}
                                    {!featured.length && <div className="mt-3 text-[13px] text-[#5d6c78]">No ventures in first-look window.</div>}
                                    <div className="mt-3 flex items-center justify-between text-[13px]"><span>API key · CRM export</span><span className="rounded-full bg-[#e6f6ec] px-2 py-0.5 text-[11px] font-extrabold text-[#1c8a52]">Active</span></div>
                                    <div className="mt-3 flex items-center justify-between text-[13px]"><span>Co-invest syndicate room (licensed partner)</span><button type="button" className="rounded-lg bg-[#eef3f6] px-2.5 py-1 text-[12px] font-bold text-[#0b4b57]" onClick={() => toast.message("Syndicate room opens with an SECP-licensed partner fund via Deal Desk.")}>Open</button></div>
                                </div>
                            </div>
                        )}
                    </Surface>
                </>
            )}

            {screen === "membership" && (
                <>
                    <MockupHero
                        kicker="Plans & billing"
                        title="Pay for access. Pay for outcomes. Nothing hidden."
                        subtitle="CIEL PK earns from investors in two transparent ways: an annual membership for verified access, and a success fee only when you actually invest in a CIEL-sourced venture. CIEL never holds or moves your investment money."
                        badge="MEMBERSHIP"
                        gradient={MOCKUP_GRADIENTS.navy}
                        stats={[
                            { value: plan.name, label: "CURRENT PLAN" },
                            { value: plan.price ? pk(plan.price) : "Free", label: "ANNUAL FEE" },
                            { value: `${(plan.rate * 100).toFixed(1)}%`, label: "YOUR SUCCESS FEE RATE" },
                            { value: "PKR 0", label: "OUTSTANDING NOW" },
                        ]}
                    />
                    <div className="mt-[22px] grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {Object.values(PLANS).map((p) => (
                            <div key={p.key} className={`rounded-[22px] border bg-white p-5 shadow-[0_8px_30px_rgba(10,30,40,.06)] ${p.key === planKey ? "border-[#0f8f8a]" : "border-[#e3e9ee]"}`}>
                                {p.key === planKey && <span className="rounded-full bg-[#e0f2f1] px-2.5 py-1 text-[11px] font-extrabold uppercase text-[#0b6f6c]">Current</span>}
                                <div className="mt-2 text-[18px] font-bold">{p.name}</div>
                                <div className="text-[15px] font-extrabold">{p.price ? pk(p.price) : "Free"} <small className="font-semibold text-[#5d6c78]">{p.price ? "/ yr" : ""}</small></div>
                                <div className="mt-1 text-[11.5px] text-[#5d6c78]">{p.who}</div>
                                <ul className="mt-3 list-disc space-y-1 pl-4 text-[12.5px] text-[#5d6c78]">{p.feats.map((f) => <li key={f}>{f}</li>)}</ul>
                                <div className="my-3 text-[12px]"><b>Success fee {(p.rate * 100).toFixed(1)}%</b> · {p.quota ? `${p.quota} intros / qtr` : "unlimited intros"} · {p.seats} seat{p.seats > 1 ? "s" : ""}</div>
                                {p.key === planKey ? (
                                    <button type="button" disabled className="w-full rounded-xl bg-[#eef3f6] px-3 py-2 text-[13px] font-bold text-[#5d6c78]">Active</button>
                                ) : (
                                    <button type="button" className="w-full rounded-xl bg-[#0e2530] px-3 py-2 text-[13px] font-bold text-white" onClick={() => toast.message(`Upgrade to ${p.name} requested — Deal Desk will invoice ${p.price ? pk(p.price) : "Free"}.`)}>
                                        {Object.keys(PLANS).indexOf(p.key) > Object.keys(PLANS).indexOf(planKey) ? "Upgrade" : "Downgrade at renewal"}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    <Surface>
                        <h3 className="m-0 text-[18px] font-bold">How CIEL charges a fee — the mechanism</h3>
                        <p className="mt-1 text-[14px] text-[#5d6c78]">Nothing is charged silently. A fee exists only when a deal closes and both sides have said so.</p>
                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {[
                                ["1", "Introduction logged", "The moment CIEL introduces you, the venture is tagged CIEL-sourced in your log."],
                                ["2", "You declare", "On closing you declare Invested: instrument, amount, valuation, and the fee route."],
                                ["3", "Founder attests", "The founder confirms the same figures. Mismatch → Deal Desk reconciles."],
                                ["4", "Invoice raised", `Automatic tax invoice at your tier rate (${(plan.rate * 100).toFixed(1)}%), capped at PKR 1.5M per deal.`],
                                ["5", "You pay", "Bank transfer, RAAST / 1Link, JazzCash, Easypaisa, or card. CIEL is the payee for its fee only."],
                                ["6", "Badge & receipt", "Venture gets its CIEL-verified funding badge; unpaid after 45 days pauses intro requests."],
                            ].map(([i, t, d]) => (
                                <div key={i} className="rounded-[16px] bg-[#f6f8fa] p-4"><i className="grid h-7 w-7 place-items-center rounded-full bg-[#0e2530] text-[12px] font-bold text-white">{i}</i><b className="mt-2 block">{t}</b><small className="text-[#5d6c78]">{d}</small></div>
                            ))}
                        </div>
                        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="rounded-[16px] border border-[#e3e9ee] p-4">
                                <h4 className="m-0 text-[15px]">Fee routes (agreed per deal)</h4>
                                <div className="mt-2 space-y-2 text-[13px]">
                                    <div className="flex justify-between gap-3"><span><b>A · Investor-paid</b> · your tier rate on capital you invest</span><b>{(plan.rate * 100).toFixed(1)}%</b></div>
                                    <div className="flex justify-between gap-3"><span><b>B · Venture-paid</b> · 3.0% deducted from the round at closing</span><b>3.0%</b></div>
                                    <div className="flex justify-between gap-3"><span>Per-deal cap on either route</span><b>PKR 1,500,000</b></div>
                                    <div className="flex justify-between gap-3"><span>CIEL advisory warrant (granted by venture at listing)</span><b>1.5%</b></div>
                                    <div className="flex justify-between gap-3"><span>Undeclared off-platform closing found later</span><b>2× route A</b></div>
                                </div>
                            </div>
                            <div className="rounded-[16px] border border-[#e3e9ee] p-4">
                                <h4 className="m-0 text-[15px]">Worked example · PKR 12M seed</h4>
                                <div className="mt-2 space-y-2 text-[13px]">
                                    <div className="flex justify-between gap-3"><span>Route A · {plan.name} {(plan.rate * 100).toFixed(1)}% × PKR 12M</span><b>{pk(feeFor(12, plan.rate))}</b></div>
                                    <div className="flex justify-between gap-3"><span>Route B · venture pays 3%</span><b>{pk(Math.min(12e6 * 0.03, 1_500_000))} (you: 0)</b></div>
                                    <div className="flex justify-between gap-3"><span>Undeclared off-platform closing</span><b>{pk(feeFor(12, plan.rate) * 2)}</b></div>
                                </div>
                                <p className="mt-3 text-[12.5px] text-[#5d6c78]">The investment itself goes directly from you to the venture. CIEL only invoices its fee.</p>
                            </div>
                        </div>
                        <h3 className="mb-2 mt-8 text-[18px] font-bold">Invoices & ledger</h3>
                        <p className="text-[14px] text-[#5d6c78]">Membership, success fees and add-ons in one ledger. Success-fee invoices are raised automatically when you declare an investment and finalise when the founder attests.</p>
                        <div className="mt-2 flex justify-end">
                            <button type="button" className="rounded-xl bg-[#eef3f6] px-4 py-2 text-[13px] font-bold text-[#0b4b57]" onClick={() => toast.message("Statement export is issued by Deal Desk as a PDF.")}>Export statement</button>
                        </div>
                        <div className="mt-3 overflow-x-auto">
                            <table className="w-full min-w-[640px] text-left text-[13.5px]">
                                <thead><tr className="text-[11px] uppercase tracking-wide text-[#5d6c78]"><th className="py-2">Date</th><th>Item</th><th>Reference</th><th>Amount</th><th>Status</th></tr></thead>
                                <tbody>
                                    <tr className="border-t border-[#eef3f6]">
                                        <td className="py-3">{new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                                        <td>Membership · {plan.name}</td>
                                        <td>Deal Desk</td>
                                        <td><b>{plan.price ? pk(plan.price) : "Free"}</b></td>
                                        <td><span className="rounded-full bg-[#e6f6ec] px-2 py-0.5 text-[11px] font-extrabold text-[#1c8a52]">{plan.price ? (kycPending ? "Awaiting verification" : "On file") : "Included"}</span></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-4 rounded-xl bg-[#fff8e1] px-4 py-3 text-[13px] leading-relaxed text-[#5d6c78]"><b>Add-ons (per deal):</b> CIEL Verified Diligence Pack (faculty verification report + evidence audit + founder background summary) PKR 50,000 · Faculty expert call (1 hr) PKR 25,000 · Co-invest syndicate facilitation via SECP-licensed partner, referral basis. <b>Founding Investor programme (2026–27):</b> first 20 members have membership waived for 12 months in exchange for a signed agreement and outcome declarations.</div>
                    </Surface>
                </>
            )}

            {screen === "agreements" && (
                <>
                    <MockupHero
                        kicker="Agreements & how everyone is protected"
                        title="The rules that keep founders, investors and CIEL safe."
                        subtitle="You accepted the CIEL PK Investor Platform Agreement at sign-up (v2.1). The clauses below are the plain-language summary."
                        badge="PROTECTION"
                        gradient={MOCKUP_GRADIENTS.navy}
                        stats={[
                            { value: "v2.1", label: "AGREEMENT VERSION" },
                            { value: "24 mo", label: "NON-CIRCUMVENTION" },
                            { value: "✓", label: "NDA PER DATA ROOM" },
                            { value: kycPending ? "Pending" : "✓", label: "KYC" },
                        ]}
                    />
                    <div className="mt-[22px] grid grid-cols-1 gap-4 md:grid-cols-2">
                        {[
                            ["1 · Non-circumvention (24 months)", "Any venture you first encountered through CIEL PK is a CIEL-sourced venture. If you (or an affiliate) invest in it within 24 months of first access — on or off the platform — the success fee applies. Off-platform closings that are not declared are charged at 2× the fee."],
                            ["2 · Confidentiality & no redistribution", "Venture cards, scores, data-room documents and founder identities are confidential. No screenshots, forwarding or scraping. Documents are watermarked with your name and every view is logged."],
                            ["3 · Founder consent & no direct outreach", "You contact founders only through CIEL introductions. Founders may decline. Contacting students, faculty or universities directly to bypass the platform is a breach and results in removal."],
                            ["4 · Outcome declaration", "You declare Invested / Passed for every introduced venture within 90 days of introduction (or on closing). Founders attest from their side; CIEL reconciles."],
                            ["5 · Fees", `Annual membership per tier (Explorer free · Angel PKR 60K · Fund PKR 250K · Institutional Partner PKR 1.2M). Success fee Route A investor-paid at your tier rate, or Route B venture-paid at 3.0%; either route capped at PKR 1.5M per deal. CIEL also holds a disclosed 1.5% advisory warrant in each Investor-Track venture.`],
                            ["6 · Conduct & student protection", "Founders are students or faculty. No exploitative terms (CIEL flags >25% equity asks at pre-seed), no unpaid “trial work” requests, no recruiting founders away from their venture without CIEL notice. Founders rate investors after each process; repeated low ratings suspend access."],
                            ["7 · What CIEL is — and isn't", "CIEL PK is a verification and introduction platform. It is not an SECP-licensed fund manager, broker or crowdfunding platform, never holds investor money, and makes no offer or recommendation of securities. All investment decisions and instruments are between you and the venture."],
                        ].map(([t, d]) => (
                            <div key={t} className="rounded-[22px] bg-white p-5 shadow-[0_8px_30px_rgba(10,30,40,.06)]">
                                <h4 className="m-0 text-[15px] font-bold">{t}</h4>
                                <p className="mt-2 text-[13.5px] leading-relaxed text-[#5d6c78]">{d}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" className="rounded-xl bg-[#eef3f6] px-4 py-2 text-[13.5px] font-bold text-[#0b4b57]" onClick={() => toast.message("Signed agreement PDF is issued by Deal Desk with your KYC pack.")}>📄 Signed agreement (PDF)</button>
                        <a href={`${BASE}?view=inbox`} className="rounded-xl bg-[#0e2530] px-4 py-2 text-[13.5px] font-bold text-white">Raise a concern with Deal Desk</a>
                    </div>
                </>
            )}

            {screen === "activity" && (
                <>
                    <MockupHero
                        kicker="My activity log"
                        title="What CIEL PK and founders can see about your activity."
                        subtitle="CIEL PK keeps an investor activity log for every venture: who viewed it, who requested access and what was opened. You see the same record here — nothing is logged that you can't see."
                        badge="TRANSPARENCY"
                        gradient={MOCKUP_GRADIENTS.slate}
                        stats={[
                            { value: String(activity.length), label: "EVENTS" },
                            { value: String(activity.filter((a) => /document/i.test(a.ev)).length), label: "DOCUMENT VIEWS" },
                            { value: String(new Set(activity.map((a) => a.v).filter((x) => x !== "—")).size), label: "VENTURES TOUCHED" },
                            { value: "90d", label: "RETENTION SHOWN" },
                        ]}
                    />
                    <Surface>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[640px] text-left text-[13.5px]">
                                <thead><tr className="text-[11px] uppercase tracking-wide text-[#5d6c78]"><th className="py-2">When</th><th>Event</th><th>Venture</th><th>Visible to</th></tr></thead>
                                <tbody>
                                    {activity.map((a, i) => (
                                        <tr key={`${a.when}-${i}`} className="border-t border-[#eef3f6]">
                                            <td className="py-2.5">{a.when}</td>
                                            <td>{a.ev}</td>
                                            <td>{a.v}</td>
                                            <td><span className="rounded-full bg-[#eef3f6] px-2 py-0.5 text-[11px] font-bold text-[#5d6c78]">{a.vis}</span></td>
                                        </tr>
                                    ))}
                                    {!activity.length && <tr><td colSpan={4} className="py-8 text-center text-[#5d6c78]">No activity yet. Saving a venture, expressing interest or opening a card will appear here.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </Surface>
                </>
            )}

            {screen === "impact" && (
                <>
                    <MockupHero
                        kicker="Impact remains a separate lens"
                        title="Understand the impact profile of your pipeline."
                        subtitle="Commercial potential is not increased because a venture maps to an SDG. Impact is computed from the ventures actually in your pipeline so you can report it to LPs and CSR partners."
                        badge="PIPELINE INTELLIGENCE"
                        gradient={MOCKUP_GRADIENTS.pink}
                        stats={[
                            { value: String(Object.keys(sdgCounts).length), label: "SDGS REPRESENTED" },
                            { value: String(impactPool.length), label: "VENTURES IN PIPELINE" },
                            { value: String(new Set(impactPool.map(universityOf)).size), label: "UNIVERSITIES" },
                            { value: "0", label: "INVESTED VENTURES" },
                        ]}
                    />
                    <div className="mt-[22px] grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="rounded-[22px] bg-white p-6 shadow-[0_8px_30px_rgba(10,30,40,.08)]">
                            <h3 className="m-0 mb-3 text-[16px] font-bold">SDG concentration (pipeline)</h3>
                            {Object.entries(sdgCounts).sort((a, b) => b[1] - a[1]).map(([n, c]) => (
                                <div key={n} className="mb-2 grid grid-cols-[170px_1fr_30px] items-center gap-2 text-[12.5px]">
                                    <span>SDG {n} · {SDG_SHORT[Number(n)]}</span>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-[#eef3f6]"><span className="block h-full rounded-full" style={{ width: `${(c / sdgMax) * 100}%`, background: SDG_COLORS[Number(n)] || "#0f8f8a" }} /></div>
                                    <b>{c}</b>
                                </div>
                            ))}
                            {!Object.keys(sdgCounts).length && <p className="text-[13px] text-[#5d6c78]">Save or express interest in a venture to build this view.</p>}
                        </div>
                        <div className="rounded-[22px] bg-white p-6 shadow-[0_8px_30px_rgba(10,30,40,.08)]">
                            <h3 className="m-0 mb-3 text-[16px] font-bold">Sector mix (pipeline)</h3>
                            {Object.entries(secCounts).sort((a, b) => b[1] - a[1]).map(([n, c]) => (
                                <div key={n} className="mb-2 grid grid-cols-[170px_1fr_30px] items-center gap-2 text-[12.5px]">
                                    <span>{n}</span>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-[#eef3f6]"><span className="block h-full rounded-full bg-[#0f8f8a]" style={{ width: `${(c / secMax) * 100}%` }} /></div>
                                    <b>{c}</b>
                                </div>
                            ))}
                            <div className="mt-4 rounded-xl bg-[#fdecee] px-3 py-2.5 text-[12.5px] text-[#5d6c78]">Impact analytics summarise stated and faculty-reviewed information. They do not replace independent impact verification.</div>
                        </div>
                    </div>
                </>
            )}

            {screen === "profile" && (
                <>
                    <MockupHero
                        kicker="Matching preferences"
                        title="Tell CIEL what belongs in your deal flow."
                        subtitle="Your mandate ranks relevance. It never changes a venture's Venture Potential or Evidence Confidence, and founders never see it unless you choose to share it."
                        badge="INVESTOR PROFILE"
                        gradient={MOCKUP_GRADIENTS.navy}
                        stats={[
                            { value: mandate.geographicFocus || "Pakistan", label: "PRIMARY GEOGRAPHY" },
                            { value: mandate.preferredRounds[0] || "—", label: "PRIMARY ROUND" },
                            { value: mandate.typicalTicket || "—", label: "TICKET RANGE" },
                            { value: String(mandate.sectors.length), label: "FOCUS SECTORS" },
                        ]}
                    />
                    <Surface>
                        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h3 className="m-0 text-[18px] font-bold">Investment mandate</h3>
                                <p className="mt-1 text-[14px] text-[#5d6c78]">Same taxonomy as the sign-up form, so matching stays consistent. KYC and plan are not editable here.</p>
                            </div>
                            <button type="button" disabled={savingMandate} onClick={() => void saveMandate()} className="rounded-xl bg-[#c2185b] px-4 py-2 text-[13.5px] font-bold text-white disabled:opacity-60">{savingMandate ? "Saving…" : "Save preferences"}</button>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Field label="Investor / fund name"><input value={orgName} onChange={(e) => setOrgName(e.target.value)} className={inp} /></Field>
                            <Field label="Investor type">
                                <select value={mandate.investorType} onChange={(e) => setMandate({ ...mandate, investorType: e.target.value })} className={inp}>
                                    <option value="">Select type</option>
                                    {INVESTOR_TYPES.map((t) => <option key={t}>{t}</option>)}
                                </select>
                            </Field>
                            <Field label="Preferred rounds"><input value={mandate.preferredRounds.join(", ")} onChange={(e) => setMandate({ ...mandate, preferredRounds: asList(e.target.value) })} className={inp} /></Field>
                            <Field label="Preferred product stage"><input value={mandate.preferredStages.join(", ")} onChange={(e) => setMandate({ ...mandate, preferredStages: asList(e.target.value) })} className={inp} /></Field>
                            <Field label="Ticket size (PKR)">
                                <select value={mandate.typicalTicket} onChange={(e) => setMandate({ ...mandate, typicalTicket: e.target.value })} className={inp}>
                                    <option value="">Select range</option>
                                    {["Under PKR 5 million", "PKR 5–30 million", "PKR 25–100 million", "PKR 100–500 million", "PKR 500 million+", "USD ticket (international)"].map((o) => <option key={o}>{o}</option>)}
                                </select>
                            </Field>
                            <Field label="Geography">
                                <select value={mandate.geographicFocus} onChange={(e) => setMandate({ ...mandate, geographicFocus: e.target.value })} className={inp}>
                                    {["Pakistan", "Pakistan + South Asia", "MENA", "Global"].map((o) => <option key={o}>{o}</option>)}
                                </select>
                            </Field>
                            <Field label="Sector focus"><input value={mandate.sectors.join(", ")} onChange={(e) => setMandate({ ...mandate, sectors: asList(e.target.value) })} className={inp} /></Field>
                            <Field label="SDG interests"><input value={mandate.sdgInterests} onChange={(e) => setMandate({ ...mandate, sdgInterests: e.target.value })} className={inp} /></Field>
                            <Field label="Deals per year">
                                <select value={mandate.dealsPerYear} onChange={(e) => setMandate({ ...mandate, dealsPerYear: e.target.value })} className={inp}>
                                    <option value="">Select</option>
                                    {["1–2", "3–5", "6–10", "10+"].map((o) => <option key={o}>{o}</option>)}
                                </select>
                            </Field>
                            <Field label="Decision timeline">
                                <select value={mandate.decisionTimeline} onChange={(e) => setMandate({ ...mandate, decisionTimeline: e.target.value })} className={inp}>
                                    <option value="">Select</option>
                                    {["Under 4 weeks", "4–8 weeks", "8–12 weeks"].map((o) => <option key={o}>{o}</option>)}
                                </select>
                            </Field>
                            <Field label="Willing to co-invest / lead">
                                <select value={mandate.leadFollow} onChange={(e) => setMandate({ ...mandate, leadFollow: e.target.value })} className={inp}>
                                    <option value="">Select</option>
                                    {["Lead or follow", "Follow only", "Lead only"].map((o) => <option key={o}>{o}</option>)}
                                </select>
                            </Field>
                            <Field label="Value beyond capital" wide><input value={mandate.valueAdd} onChange={(e) => setMandate({ ...mandate, valueAdd: e.target.value })} className={inp} /></Field>
                            <Field label="Internal screening notes (private)" wide><textarea value={mandate.screeningNotes} onChange={(e) => setMandate({ ...mandate, screeningNotes: e.target.value })} className={`${inp} min-h-[90px]`} /></Field>
                        </div>
                        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {[["Name", name], ["Email", String(me?.email || "—")], ["Plan", plan.name], ["KYC", kycPending ? "Pending verification" : "Verified"]].map(([k, v]) => (
                                <div key={k} className="rounded-[14px] bg-[#f6f8fa] px-4 py-3.5">
                                    <small className="block text-[11px] font-bold uppercase tracking-wide text-[#5d6c78]">{k}</small>
                                    <b className="mt-1 block text-[15px]">{v}</b>
                                </div>
                            ))}
                        </div>
                    </Surface>
                </>
            )}

            {screen === "record" && record && (
                <Surface>
                    <div className="mb-[18px] flex flex-wrap items-start gap-3.5">
                        <PanelBack href={`${BASE}?view=discover`} />
                        <div className="min-w-0 flex-1">
                            <h3 className="m-0 text-[22px] font-bold text-[#14212b]">{record.ventureName}</h3>
                            <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#5d6c78]">
                                {displayVentureId(record)} · {universityOf(record)} · {sectorOf(record)} · {roundOf(record)} · Faculty score {vpsOf(record)}/100 ({classify(vpsOf(record))})
                            </p>
                        </div>
                        <button type="button" className="rounded-xl bg-[#eef3f6] px-4 py-2 text-[13.5px] font-bold text-[#0b4b57]" onClick={() => record.id && toggleSave(record.id, record.ventureName)}>{savedIds.includes(record.id || "") ? "★ Saved" : "☆ Save"}</button>
                        {interest.some((r) => r.entryId === record.id) || intros.some((r) => r.entryId === record.id)
                            ? <button type="button" className="rounded-xl bg-[#eef3f6] px-4 py-2 text-[13.5px] font-bold text-[#0b4b57]" onClick={() => toast.message("Gate 1 · CIEL PK is screening your request.")}>⏳ Waiting for CIEL PK</button>
                            : <button type="button" className="rounded-xl bg-[#c2185b] px-4 py-2 text-[13.5px] font-bold text-white" onClick={() => record.id && openNote("interest", record.id)}>🤝 Express interest</button>}
                    </div>
                    {kycPending && <div className="mb-4 rounded-[14px] border border-[#b7d8f5] bg-[#e5f1fb] px-4 py-3 text-[13.5px]">Founder details stay masked until CIEL PK verifies your account.</div>}
                    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[["Funding ask", askLine(record)], ["Mandate fit", `${mandateFit(record, mandate)}%`], ["Investment readiness", `${vpsOf(record)}/100`], ["Evidence confidence", `${ecsOf(record)}/100`]].map(([k, v]) => (
                            <div key={k} className="rounded-xl bg-[#f6f8fa] px-3 py-3"><small className="text-[11px] uppercase tracking-wide text-[#5d6c78]">{k}</small><b className="mt-1 block text-[16px]">{v}</b></div>
                        ))}
                    </div>
                    <div className="mb-4 flex flex-wrap gap-2">
                        {["Saved", "Interest", "Introduced", "Diligence", "Term sheet", "Closed"].map((s, i) => {
                            const st = dealStatus(record.id);
                            const idx = st === "saved" ? 0 : st === "interest" || st === "intro" ? 1 : st === "introduced" ? 2 : st === "diligence" ? 3 : st === "termsheet" ? 4 : st === "invested" || st === "passed" ? 5 : -1;
                            return (
                                <span key={s} className={`rounded-full px-3 py-1 text-[11.5px] font-extrabold uppercase ${i < idx ? "bg-[#e6f6ec] text-[#1c8a52]" : i === idx ? "bg-[#0e2530] text-white" : "bg-[#eef3f6] text-[#5d6c78]"}`}>{s}</span>
                            );
                        })}
                    </div>
                    <div className="overflow-hidden rounded-[22px] border border-[#e3e9ee]">
                        <div className="flex flex-wrap items-start justify-between gap-3.5 bg-gradient-to-br from-[#0b4b57] to-[#0f8f8a] px-6 py-5 text-white">
                            <div>
                                <div className="text-[12px] font-bold tracking-wide text-[#bfe8e4]">{displayVentureId(record)} · {universityOf(record)}</div>
                                <h4 className="m-0 text-[22px] font-bold">{record.ventureName}</h4>
                                <div className="mt-1.5 text-[13px] text-[#dff3f1]">{kycPending ? "Founding team" : ownerName(record)} · {sectorOf(record)} · {record.stage}</div>
                            </div>
                            <div className="text-right text-[12px]">🤝 Open to investors · Ask: {askLine(record)}</div>
                        </div>
                        <div className="grid grid-cols-1 gap-2.5 p-6 lg:grid-cols-2">
                            <div className="space-y-2.5">
                                <div className="rounded-xl bg-[#f6f8fa] p-3 text-[13px]"><b className="mb-1 block text-[11px] uppercase tracking-wide text-[#5d6c78]">Problem & solution</b><p><b>Problem:</b> {record.ideaInfo?.problem || "—"}</p><p><b>Solution:</b> {record.solutionInfo?.solution || "—"}</p>{customerOf(record) ? <p><b>Target customer:</b> {customerOf(record)}</p> : null}</div>
                                <div className="rounded-xl bg-[#f6f8fa] p-3 text-[13px]"><b className="mb-1 block text-[11px] uppercase tracking-wide text-[#5d6c78]">Business model & traction</b><p><b>Model:</b> {record.solutionInfo?.revenue || "—"}</p><p><b>Traction:</b> {plan.traction ? tractionLine(record) : <>Hidden on Explorer — <a href={`${BASE}?view=membership`} className="font-bold text-[#0f8f8a]">Angel+ to see traction</a></>}</p></div>
                                <div className="rounded-xl bg-[#f6f8fa] p-3 text-[13px]"><b className="mb-1 block text-[11px] uppercase tracking-wide text-[#5d6c78]">Founding team</b>🔒 {teamMasked(record)} — names, contacts and LinkedIn are revealed after CIEL screening and founder consent.</div>
                                <div className="rounded-xl bg-[#f6f8fa] p-3 text-[13px]">
                                    <b className="mb-1 block text-[11px] uppercase tracking-wide text-[#5d6c78]">SDG / impact lens</b>
                                    <div className="flex flex-wrap gap-1">
                                        {sdgTags(record).map((n) => <span key={n} className="rounded-lg px-2 py-0.5 text-[11.5px] font-extrabold text-white" style={{ background: SDG_COLORS[n] }}>SDG {n}</span>)}
                                    </div>
                                    <p className="mt-2 m-0 text-[#5d6c78]">Impact is displayed separately from commercial potential and investor fit.</p>
                                </div>
                            </div>
                            <div className="space-y-2.5">
                                <div className="rounded-xl bg-[#f6f8fa] p-3 text-[13px]">
                                    <b className="mb-2 block text-[11px] uppercase tracking-wide text-[#5d6c78]">CIEL venture signals (faculty-reviewed)</b>
                                    {computeVentureMeritScorecard(record).criteria.map((c) => bar(c.label.split("·")[1]?.trim() || c.label, Math.round((c.points / c.max) * 100)))}
                                </div>
                                <div className="rounded-xl bg-[#f6f8fa] p-3 text-[13px]"><b className="mb-1 block text-[11px] uppercase tracking-wide text-[#5d6c78]">Investor insight</b><p><b>Why this startup may have potential:</b> strongest on {(strongestCriterion(record)?.label.split("·")[1] || strongestCriterion(record)?.label || "—").trim()}.</p><p><b>Primary investment concern:</b> weakest faculty-reviewed dimension is {(weakestCriterion(record)?.label.split("·")[1] || "—").trim()} ({weakestCriterion(record)?.points}/{weakestCriterion(record)?.max}).</p><p><b>Recommended next proof:</b> independent evidence on {(weakestCriterion(record)?.label.split("·")[1] || "this dimension").trim().toLowerCase()} before term sheet.</p></div>
                                <div className="rounded-xl bg-[#f6f8fa] p-3 text-[13px]"><b className="mb-1 block text-[11px] uppercase tracking-wide text-[#5d6c78]">Mandate fit</b><p><b>Why it matches:</b> {matchReason(record, mandate)}</p></div>
                                <div className="rounded-xl bg-[#f6f8fa] p-3 text-[13px]"><b className="mb-1 block text-[11px] uppercase tracking-wide text-[#5d6c78]">Verification & protection</b><p>✓ Faculty verified by {record.academicSetup?.supervisorName || record.academicSetup?.faculty || "faculty"} (contact via CIEL only)<br />✓ No AI report is shared with investors — faculty-reviewed signals only<br />✓ Evidence Confidence {ecsOf(record)}/100<br />✓ CIEL-sourced · non-circumvention applies from first view{isFeatured(record) ? <><br />✓ CIEL Spotlight</> : null}</p></div>
                            </div>
                        </div>
                    </div>
                </Surface>
            )}

            {screen === "record" && !record && !loading && (
                <div className="mt-[22px] rounded-[22px] bg-white p-8 text-center text-[#5d6c78]">This venture is not in the Investor Hub.</div>
            )}

            {noteOpen && (
                <div className="fixed inset-0 z-[98] grid place-items-center bg-[rgba(8,20,28,.55)] p-5" onClick={() => setNoteOpen(null)}>
                    <div className="w-full max-w-[760px] rounded-[22px] bg-white p-7" onClick={(e) => e.stopPropagation()}>
                        <h3 className="m-0 text-xl font-bold">{noteOpen.kind === "interest" ? "🤝 Express interest" : "📇 Request founder contact"}</h3>
                        <p className="mt-1 text-[14px] text-[#5d6c78]">
                            {noteOpen.kind === "interest"
                                ? "Your note goes to the founder, their faculty, the university and CIEL PK. CIEL PK facilitates the introduction."
                                : "CIEL PK reviews every contact request before the founder's details are shared."}
                        </p>
                        <label className="mb-1.5 mt-3 block text-[12px] font-bold uppercase tracking-wide text-[#5d6c78]">Message</label>
                        <textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[90px] w-full rounded-xl border border-[#e3e9ee] p-3 text-sm" placeholder={noteOpen.kind === "interest" ? "e.g. Interested in the seed round — could we schedule a call?" : "e.g. Diligence call ahead of our seed committee."} />
                        <div className="mt-3.5 flex justify-end gap-2.5">
                            <button type="button" className="rounded-xl bg-[#eef3f6] px-4 py-2 font-bold text-[#0b4b57]" onClick={() => setNoteOpen(null)}>Cancel</button>
                            <button type="button" className="rounded-xl bg-[#c2185b] px-4 py-2 font-bold text-white" onClick={sendNote}>{noteOpen.kind === "interest" ? "Send interest" : "Send request to CIEL PK"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const inp = "w-full rounded-xl border border-[#e3e9ee] px-3 py-2 text-sm";

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
    return (
        <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#5d6c78]">{label}</span>
            {children}
        </label>
    );
}

function VentureCard({
    entry, saved, interested, intro, kycPending, hideTraction, fit, onSave, onInterest,
}: {
    entry: HubVenture;
    saved: boolean;
    interested: boolean;
    intro?: HubRow;
    kycPending: boolean;
    hideTraction: boolean;
    fit: number;
    onSave: () => void;
    onInterest: () => void;
    onIntro: () => void;
}) {
    const score = vpsOf(entry);
    const pending = interested || !!intro;
    return (
        <div className={`flex flex-col overflow-hidden rounded-[20px] border ${isFeatured(entry) ? "border-[#f8bbd0]" : "border-[#e3e9ee]"} bg-white`}>
            <div className={`px-[18px] py-4 text-white ${isFeatured(entry) ? "bg-gradient-to-br from-[#c2185b] to-[#7d4ddb]" : "bg-gradient-to-br from-[#0b4b57] to-[#0f8f8a]"}`}>
                <small className="text-[11px] font-bold tracking-wide text-[#bfe8e4]">{displayVentureId(entry)} · {universityOf(entry)}{isFeatured(entry) ? " · ★ CIEL SPOTLIGHT" : ""}</small>
                <h4 className="m-0 text-[17px] font-bold">{entry.ventureName || "Venture"}</h4>
                <div className="mt-1 text-[12.5px] text-[#f8dbe7]">{sectorOf(entry)} · {entry.stage || "—"} · {roundOf(entry)}</div>
            </div>
            <div className="flex-1 px-[18px] py-3.5 text-[13.5px] leading-relaxed">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                    <div><small className="block text-[11px] uppercase tracking-wide text-[#5d6c78]">Funding ask</small><b>{askLine(entry)}</b></div>
                    <div className="flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-[#e0f2f1] px-2.5 py-1 text-[11px] font-extrabold text-[#0b6f6c]">Fit {fit}%</span>
                        <span className="rounded-full bg-[#e6f6ec] px-2.5 py-1 text-[11px] font-extrabold text-[#1c8a52]">Readiness {score}</span>
                        <span className="rounded-full bg-[#eef3f6] px-2.5 py-1 text-[11px] font-extrabold text-[#0b4b57]">Evidence {ecsOf(entry)}</span>
                    </div>
                </div>
                <p className="mb-1"><b>Investment readiness:</b> {classify(score)}</p>
                <p className="mb-1"><b>Problem:</b> {entry.ideaInfo?.problem || "—"}</p>
                <p className="mb-1"><b>Solution:</b> {entry.solutionInfo?.solution || "—"}</p>
                {customerOf(entry) ? <p className="mb-1"><b>Target customer:</b> {customerOf(entry)}</p> : null}
                <p className="mb-1"><b>Business model:</b> {entry.solutionInfo?.revenue || "—"}</p>
                <p className="mb-1"><b>Traction:</b> {hideTraction ? <><span className="text-[#9aa8b2]">Hidden on Explorer</span> <a href={`${BASE}?view=membership`} className="font-bold text-[#0f8f8a]">🔒 Angel+ to see traction</a></> : tractionLine(entry)}</p>
                <p className="mb-2"><b>Team:</b> 🔒 {teamMasked(entry)}</p>
                <div className="flex flex-wrap gap-1">
                    {sdgTags(entry).map((n) => (
                        <span key={n} className="rounded-lg px-2 py-0.5 text-[11.5px] font-extrabold text-white" style={{ background: SDG_COLORS[n] }}>SDG {n}</span>
                    ))}
                    {isFeatured(entry) ? <span className="rounded-lg bg-[#c2185b] px-2 py-0.5 text-[11.5px] font-extrabold text-white">CIEL Spotlight</span> : null}
                </div>
                <p className="mt-2 text-[12px] text-[#5d6c78]">{pending ? "Gate 1 · CIEL PK is screening your request." : "Founder not notified until you express interest."}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-[#e3e9ee] px-[18px] py-3">
                <span className="rounded-full bg-[#e6f6ec] px-2.5 py-1 text-[11.5px] font-extrabold uppercase text-[#1c8a52]">✔ Faculty verified</span>
                <span className="flex-1" />
                {!pending && <button type="button" className="rounded-[10px] bg-[#eef3f6] px-3 py-1.5 text-[12.5px] font-bold text-[#0b4b57]" onClick={onSave}>{saved ? "★ Saved" : "☆ Save"}</button>}
                <a href={`${BASE}?view=record&id=${entry.id}`} className="rounded-[10px] bg-[#eef3f6] px-3 py-1.5 text-[12.5px] font-bold text-[#0b4b57]">Open</a>
                {pending ? (
                    <button type="button" className="rounded-[10px] bg-[#eef3f6] px-3 py-1.5 text-[12.5px] font-bold text-[#0b4b57]" onClick={() => toast.message("Gate 1 · CIEL PK is screening your request.")}>⏳ Waiting for CIEL PK</button>
                ) : (
                    <button type="button" disabled={kycPending} className="rounded-[10px] bg-[#c2185b] px-3 py-1.5 text-[12.5px] font-bold text-white disabled:opacity-45" onClick={onInterest}>🤝 Express interest</button>
                )}
            </div>
        </div>
    );
}
