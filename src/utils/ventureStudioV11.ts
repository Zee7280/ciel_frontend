/** CIEL PK Venture Studio v11 — student create form catalog, live summaries and compass. */

export const V11_STEPS = [
    { key: "meet", label: "1 · Meet venture" },
    { key: "problem", label: "2 · Problem" },
    { key: "business", label: "3 · Business" },
    { key: "sdg", label: "4 · SDG" },
    { key: "next", label: "5 · Next step" },
    { key: "review", label: "6 · Review" },
] as const;

export const V11_STAGES = [
    { id: "Idea Recorded", emoji: "💡", title: "Early idea", blurb: "I am exploring the concept." },
    { id: "Business Plan Completed", emoji: "📝", title: "Business plan", blurb: "The plan is written but not launched." },
    { id: "Prototype Developed", emoji: "🔧", title: "Prototype / MVP", blurb: "Something has been built." },
    { id: "Pilot in Progress", emoji: "🧪", title: "Pilot", blurb: "Real users are testing it." },
    { id: "Operating Venture", emoji: "💰", title: "Operating", blurb: "The venture has real customers or revenue." },
    { id: "Scaling Venture", emoji: "🚀", title: "Scaling", blurb: "The venture is growing beyond its first market." },
] as const;

const LEGACY_STAGE: Record<string, string> = {
    Idea: "Idea Recorded",
    "Business Plan": "Business Plan Completed",
    "Prototype / MVP": "Prototype Developed",
    Pilot: "Pilot in Progress",
    "Early Revenue": "Operating Venture",
    Growth: "Scaling Venture",
};

export function normalizeV11Stage(stage?: string | null) {
    if (!stage) return "";
    if (V11_STAGES.some((s) => s.id === stage)) return stage;
    return LEGACY_STAGE[stage] || stage;
}

export const FACULTY_ROLES = [
    "Course Instructor",
    "Final Year Project (FYP) Supervisor",
    "Incubator / Entrepreneurship Faculty Mentor",
    "Programme / Department Faculty Reviewer",
    "Other",
];
export const DISCIPLINES = [
    "Business / Management",
    "Computer Science / IT",
    "Engineering",
    "Arts & Design",
    "Media & Communication",
    "Architecture",
    "Textile / Fashion",
    "Social Sciences",
    "Health Sciences",
    "Education",
    "Other",
];
export const ORIGINS = [
    "Course assignment / business plan",
    "Final Year Project (FYP)",
    "University incubator / competition",
    "Independent student startup",
    "Already operating business",
    "Other",
];
export const VENTURE_TYPES = [
    "Physical product / consumer product",
    "Service business",
    "Software / app / SaaS",
    "Marketplace / platform",
    "Hardware / device / IoT",
    "Manufacturing / industrial",
    "Creative / fashion / media venture",
    "Food / agriculture venture",
    "Education venture",
    "Health / life sciences venture",
    "Research / deep-tech commercialization",
    "Social enterprise / nonprofit venture",
    "Other",
];
export const SECTORS_V11 = [
    "Consumer / Retail",
    "Technology / AI",
    "FinTech",
    "Health / MedTech / BioTech",
    "Education / EdTech",
    "Food / AgriTech",
    "Fashion / Textile",
    "Media / Creative Industries",
    "Manufacturing / Industrial",
    "Energy / Climate",
    "Mobility / Logistics",
    "Construction / PropTech",
    "Professional Services",
    "Social Impact",
    "Other",
];
export const LEGAL_STATUSES = [
    "Student project — not registered",
    "Not registered yet — planning to register",
    "Sole proprietorship",
    "Partnership / LLP",
    "Private limited company",
    "Nonprofit / not-for-profit",
    "University-owned / spinout under discussion",
    "Other",
];
export const BUYER_MODELS = [
    "B2C · Consumer",
    "B2B · Business",
    "B2G · Government",
    "B2B2C",
    "Marketplace / P2P",
    "Institution / nonprofit",
    "Mixed",
    "Other",
];
export const EVIDENCE_METHODS = [
    "🗣️ Customer interviews",
    "📋 Survey",
    "🧪 Pilot / testing",
    "💰 Actual sales",
    "📚 Published research",
    "🔍 Competitor research",
    "👁️ Observation only",
    "Other evidence",
];
export const REVENUE_MODELS = [
    "Product sales",
    "Service fee",
    "Subscription",
    "Commission",
    "Licensing",
    "Advertising / sponsorship",
    "Institutional contracts / procurement",
    "Grant / donor funding",
    "Grant + earned income",
    "Other",
];
export const CHANNELS = [
    "Social media",
    "Website / app",
    "University network",
    "Retail",
    "Partners / distributors",
    "Referrals",
    "Direct sales",
    "Other",
];
export const SUPPORT_NEEDS = [
    "Mentorship",
    "Incubation",
    "Pilot customers",
    "Industry partner",
    "Manufacturing help",
    "Distribution",
    "Legal / IP",
    "Technical validation",
    "Clinical / regulatory guidance",
    "Research commercialization",
    "Grant funding",
    "Investment funding",
    "Nothing yet",
    "Other",
];
export const RESPONSIBILITY_PRACTICES = [
    "Environmental practices",
    "Ethical sourcing",
    "Inclusive employment",
    "Accessibility",
    "Waste reduction",
    "Employee wellbeing",
    "None currently",
    "Other",
];
export const PHONE_CODES = ["+92", "+1", "+44", "+971", "+966", "+49", "+61", "+86", "+91", "other"];

export const SDG_COLORS: Record<number, string> = {
    1: "#E5243B",
    2: "#DDA63A",
    3: "#4C9F38",
    4: "#C5192D",
    5: "#FF3A21",
    6: "#26BDE2",
    7: "#FCC30B",
    8: "#A21942",
    9: "#FD6925",
    10: "#DD1367",
    11: "#FD9D24",
    12: "#BF8B2E",
    13: "#3F7E44",
    14: "#0A97D9",
    15: "#56C02B",
    16: "#00689D",
    17: "#19486A",
};

const SDG_KEYWORDS: Record<number, string[]> = {
    1: ["poverty", "low-income", "affordable", "income insecurity", "livelihood"],
    2: ["food", "hunger", "nutrition", "agriculture", "farmer", "crop", "agri"],
    3: ["health", "medical", "patient", "wellbeing", "mental health", "hospital", "clinical"],
    4: ["education", "school", "student", "learning", "teacher", "training", "literacy"],
    5: ["women", "woman", "girls", "gender", "female"],
    6: ["water", "sanitation", "hygiene", "wastewater"],
    7: ["energy", "solar", "renewable", "electricity", "clean energy"],
    8: ["jobs", "employment", "worker", "workforce", "sme", "economic", "livelihood"],
    9: ["innovation", "infrastructure", "manufacturing", "industrial", "technology", "tech"],
    10: ["disability", "inclusion", "inequality", "marginalized", "refugee", "accessibility"],
    11: ["city", "urban", "housing", "transport", "mobility", "community", "road safety"],
    12: ["waste", "recycle", "recycling", "circular", "packaging", "resource", "reuse", "consumption"],
    13: ["climate", "carbon", "emission", "greenhouse", "decarbon", "climate change"],
    14: ["ocean", "marine", "sea", "fish", "coastal"],
    15: ["forest", "biodiversity", "land", "wildlife", "soil", "ecosystem"],
    16: ["justice", "legal", "rights", "safety", "violence", "governance", "institution"],
    17: ["partnership", "collaboration", "coalition", "ngo", "government partner"],
};

export type V11SdgMode = "map" | "review" | "none" | "";

export interface V11Snap {
    stage: string;
    name: string;
    pitch: string;
    uni: string;
    founder: string;
    founderRole: string;
    facultyName: string;
    facultyRole: string;
    ventureType: string;
    sector: string;
    teamFit: string;
    founderInsight: string;
    teamCount: number;
    problem: string;
    customer: string;
    buyerModels: string[];
    alternative: string;
    resistance: string;
    whyNow: string;
    competitorType: string;
    evidenceMethods: string[];
    interviews: number;
    surveys: number;
    willing: number;
    testers: number;
    pilots: number;
    orders: number;
    customers: number;
    revenue: number;
    mentors: number;
    lois: number;
    marketWho: string;
    marketSize: number;
    marketSource: string;
    solution: string;
    advantage: string;
    whyUs: string;
    revenueModels: string[];
    channels: string[];
    price: number;
    unitCost: number;
    milestone: string;
    sdgMode: V11SdgMode;
    sdgs: number[];
    impactLine: string;
    impactIndicator: string;
    impactTarget: string;
    helpImpact: string;
    responsibility: string[];
    support: string[];
    risk: string;
    mitigation: string;
    assumption: string;
    reflection: string;
    investorOptIn: boolean;
    consent: boolean;
    askAmount: number;
    askUse: string;
}

function n(v?: number | null) {
    return Number(v || 0);
}

export function tractionCount(s: V11Snap) {
    let total = n(s.interviews) + n(s.surveys) + n(s.willing) + n(s.mentors) + n(s.lois) + n(s.testers) + n(s.pilots) + n(s.orders) + n(s.customers);
    if (n(s.revenue) > 0) total += 5;
    return total;
}

export function evidenceLabel(s: V11Snap) {
    const t = tractionCount(s);
    const methods = s.evidenceMethods.length;
    if (t >= 100 || (n(s.revenue) > 0 && n(s.customers) > 10)) return "Strong";
    if (t >= 20 || methods >= 3) return "Developing";
    if (t > 0 || methods > 0) return "Early evidence";
    return "Not yet evidenced";
}

export function venturePotentialScore(s: V11Snap) {
    let score = 0;
    if (s.problem.length > 35) score += 8;
    if (s.customer) score += 4;
    if (s.alternative) score += 3;
    if (s.solution.length > 35) score += 8;
    if (s.advantage) score += 5;
    if (s.whyUs) score += 2;
    if (s.marketWho) score += 5;
    if (s.marketSize > 0) score += 6;
    if (s.marketSource) score += 4;
    if (s.revenueModels.length) score += 6;
    if (s.price > 0) score += 3;
    if (s.unitCost > 0) score += 2;
    if (s.channels.length) score += 2;
    if (s.milestone) score += 2;
    const ev = tractionCount(s);
    const methods = s.evidenceMethods.length;
    if (ev > 0) score += 6;
    if (ev >= 10) score += 4;
    if (ev >= 30) score += 4;
    if (methods >= 2) score += 3;
    const later = ["Prototype Developed", "Pilot in Progress", "Operating Venture", "Scaling Venture"].includes(s.stage);
    if (!later && (s.mentors > 0 || s.lois > 0 || s.interviews > 0)) score += 3;
    if (later && (s.testers > 0 || s.customers > 0 || s.revenue > 0 || s.pilots > 0)) score += 3;
    if (s.founder) score += 3;
    if (s.teamFit) score += 4;
    if (s.teamCount > 0) score += 3;
    if (s.milestone) score += 3;
    if (s.support.length) score += 2;
    if (s.reflection.length > 30) score += 2;
    if (s.risk) score += 1;
    if (s.mitigation) score += 1;
    if (s.assumption) score += 1;
    return Math.min(100, score);
}

export function pathwayLevel(s: V11Snap, score: number) {
    if (
        score >= 85 &&
        s.investorOptIn &&
        s.consent &&
        ["Prototype Developed", "Pilot in Progress", "Operating Venture", "Scaling Venture"].includes(s.stage) &&
        tractionCount(s) > 0
    )
        return 5;
    if (score >= 75 && s.investorOptIn && s.consent) return 4;
    if (score >= 70) return 3;
    if (score >= 50) return 2;
    return 1;
}

function clamp(v: number) {
    return Math.max(0, Math.min(100, Math.round(v)));
}

export function compassScores(s: V11Snap) {
    let problem = 0,
        evidence = 0,
        market = 0,
        business = 0,
        defence = 0,
        team = 0;
    if (s.problem.length > 25) problem += 45;
    if (s.customer) problem += 30;
    if (s.alternative) problem += 15;
    if (s.resistance) problem += 10;
    const ev = tractionCount(s);
    const methods = s.evidenceMethods.length;
    evidence += Math.min(55, ev > 0 ? 20 + Math.log10(ev + 1) * 18 : 0);
    evidence += Math.min(45, methods * 12);
    if (s.marketWho) market += 35;
    if (s.marketSize > 0) market += 35;
    if (s.marketSource) market += 20;
    if (s.whyNow) market += 10;
    if (s.revenueModels.length) business += 35;
    if (s.price > 0) business += 20;
    if (s.unitCost > 0) business += 20;
    if (s.channels.length) business += 15;
    if (s.milestone) business += 10;
    if (s.advantage) defence += 40;
    if (s.whyUs) defence += 25;
    if (s.founderInsight) defence += 20;
    if (s.competitorType) defence += 15;
    if (s.founder) team += 20;
    if (s.founderRole) team += 10;
    if (s.teamFit) team += 30;
    if (s.teamCount) team += 20;
    if (s.risk && s.mitigation) team += 20;
    return {
        problem: clamp(problem),
        evidence: clamp(evidence),
        market: clamp(market),
        business: clamp(business),
        defence: clamp(defence),
        team: clamp(team),
    };
}

export function progressPercent(s: V11Snap) {
    const key = [
        !!s.stage,
        !!s.name,
        !!s.uni,
        !!s.founder,
        !!s.problem,
        !!s.customer,
        !!s.solution,
        s.revenueModels.length > 0,
        !!s.sdgMode,
        !!s.milestone,
        !!s.reflection,
    ];
    return Math.round((key.filter(Boolean).length / key.length) * 100);
}

export function v11Summaries(s: V11Snap) {
    const sum1 =
        s.name || s.stage || s.founder
            ? `${s.name || "This venture"} is currently at the ${s.stage || "stage not yet selected"} stage${s.ventureType ? ` as a ${s.ventureType.toLowerCase()}` : ""}${s.sector ? ` in ${s.sector}` : ""}${s.pitch ? `: ${s.pitch}.` : "."} ${s.founder ? `Led by ${s.founder}${s.founderRole ? ` (${s.founderRole})` : ""}${s.teamCount ? ` with ${s.teamCount} additional team member${s.teamCount > 1 ? "s" : ""}` : ""}.` : ""} ${s.teamFit ? `Team fit: ${s.teamFit}` : ""} ${s.founderInsight ? `Founder insight: ${s.founderInsight}` : ""} ${s.facultyName ? `Faculty reviewer: ${s.facultyName}${s.facultyRole ? ` (${s.facultyRole})` : ""}.` : ""}`.trim()
            : "";
    const sum2 = s.problem
        ? `Problem: ${s.problem} Main customer: ${s.customer || "not yet defined"}.${s.buyerModels.length ? ` Buyer model: ${s.buyerModels.join(", ")}.` : ""} Current alternative: ${s.alternative || "not yet defined"}.${s.resistance ? ` Adoption resistance: ${s.resistance}.` : ""}${s.whyNow ? ` Why now: ${s.whyNow}.` : ""} Evidence: ${s.evidenceMethods.length ? s.evidenceMethods.join(", ") : "not yet stated"}${tractionCount(s) ? ` with ${s.interviews} interviews, ${s.surveys} survey responses and ${s.willing} willing to test or buy.` : "."}`
        : "";
    const sum3 = s.solution
        ? `Solution: ${s.solution} ${s.advantage ? `Advantage: ${s.advantage}.` : ""} Revenue model: ${s.revenueModels.join(" + ") || "not yet selected"}. ${s.milestone ? `Next 12-month milestone: ${s.milestone}.` : ""}`
        : "";
    let sum4 = "";
    if (s.sdgMode === "map") {
        sum4 = `SDG-linked venture${s.sdgs.length ? `: primary SDG ${s.sdgs[0]}${s.sdgs.length > 1 ? `, with SDGs ${s.sdgs.slice(1).join(", ")}` : ""}.` : " — goals not yet selected."} ${s.impactLine ? `Contribution: ${s.impactLine}.` : ""} ${s.impactIndicator ? `Indicator: ${s.impactIndicator}${s.impactTarget ? ` with a 12-month target of ${s.impactTarget}` : ""}.` : ""}`.trim();
    } else if (s.sdgMode === "review") {
        sum4 = `SDG mapping assistance requested. ${s.helpImpact ? `Potential positive change: ${s.helpImpact}.` : "A reviewer can suggest possible SDG links for student confirmation."}`;
    } else if (s.sdgMode === "none") {
        sum4 = `SDG Status: Not linked to an SDG. This status does not affect commercial venture scoring.${s.responsibility.length ? ` Responsible-business practices noted: ${s.responsibility.join(", ")}.` : ""}`;
    }
    const sum5 = `Support needs: ${s.support.join(", ") || "not yet stated"}.${s.risk ? ` Main risk: ${s.risk}.` : ""}${s.mitigation ? ` Mitigation: ${s.mitigation}.` : ""}${s.assumption ? ` Key assumption to test: ${s.assumption}.` : ""} ${s.reflection ? `Learning: ${s.reflection}` : ""} Opportunity track: ${s.investorOptIn ? (s.consent ? "student opted in with consent" : "opt-in selected but declaration not yet confirmed") : "not selected — repository only"}.`;
    return { founder: sum1, opportunity: sum2, business: sum3, impact: sum4, ask: sum5 };
}

export function suggestSdgs(s: V11Snap) {
    const txt = [s.problem, s.solution, s.customer, s.helpImpact, s.impactLine].join(" ").toLowerCase();
    const scores: [number, number][] = [];
    Object.entries(SDG_KEYWORDS).forEach(([num, words]) => {
        let hits = 0;
        words.forEach((w) => {
            if (txt.includes(w)) hits += 1;
        });
        if (hits) scores.push([Number(num), hits]);
    });
    scores.sort((a, b) => b[1] - a[1]);
    if (!scores.length && txt.trim()) scores.push([9, 1], [8, 1]);
    return scores.slice(0, 3).map((x) => x[0]);
}

export function sdgStatusLabel(s: V11Snap) {
    if (s.sdgMode === "map") return s.sdgs.length ? s.sdgs.map((n) => `SDG ${n}`).join(" · ") : "SDG-linked · goals pending";
    if (s.sdgMode === "review") return "SDG mapping assistance requested";
    if (s.sdgMode === "none") return "Not linked to an SDG";
    return "Not selected";
}

export function validationLine(s: V11Snap) {
    const parts: string[] = [];
    if (s.interviews) parts.push(`${s.interviews} interviews`);
    if (s.surveys) parts.push(`${s.surveys} surveys`);
    if (s.willing) parts.push(`${s.willing} willing to test/buy`);
    if (s.customers) parts.push(`${s.customers} customers`);
    if (s.revenue) parts.push(`PKR ${s.revenue.toLocaleString()} revenue`);
    if (s.testers) parts.push(`${s.testers} testers`);
    if (s.pilots) parts.push(`${s.pilots} pilots`);
    return parts.join(" · ") || "—";
}

export function pitch60(s: V11Snap) {
    const name = s.name || "Our venture";
    const customer = s.customer || "our target customer";
    const problem = s.problem || "an important problem";
    const solution = s.solution || "a focused solution";
    const advantage = s.advantage || s.whyUs || s.founderInsight || "a differentiated approach";
    const traction: string[] = [];
    if (s.interviews) traction.push(`${s.interviews} customer interviews`);
    if (s.customers) traction.push(`${s.customers} customers`);
    if (s.revenue) traction.push(`PKR ${s.revenue.toLocaleString()} revenue to date`);
    if (s.testers) traction.push(`${s.testers} testers`);
    if (s.pilots) traction.push(`${s.pilots} pilots`);
    const model = s.revenueModels.join(" + ") || "a business model we are validating";
    const ask = s.investorOptIn && s.askAmount ? ` We are seeking PKR ${s.askAmount.toLocaleString()} to ${s.askUse || "reach our next milestone"}.` : "";
    const why = s.whyNow ? ` The timing matters because ${s.whyNow}.` : "";
    return `${name} is building ${solution} for ${customer}. The problem is ${problem}. We believe we can win through ${advantage}. Our model is ${model}.${traction.length ? ` So far, we have ${traction.join(", ")}.` : ""}${why}${ask}`;
}

export const COMPASS_TIPS: Record<string, string> = {
    problem: "Define one specific customer and the painful problem they experience.",
    evidence: "Add real-world proof: interviews, tests, pilots, users, sales, lab validation or partner evidence.",
    market: "Show who you can realistically reach and where the estimate came from.",
    business: "Explain how value becomes revenue or sustainable funding, plus your route to customers.",
    defence: "Clarify why customers would choose you and what becomes harder for competitors to copy.",
    team: "Show why this team can execute, then name the biggest risk and how you would reduce it.",
};

export const PATHWAY = ["💡 Recorded", "🔎 Potential Identified", "⭐ High Potential", "🚀 Showcase Candidate", "💼 Investor-Ready"];

export const MARKET_SOURCES = [
    "Counted / calculated",
    "Published report / government data",
    "Industry / partner estimate",
    "Educated estimate — needs checking",
];
export const COMPETITOR_TYPES = [
    "Direct competitor",
    "Different type of solution",
    "Do it themselves",
    "Do nothing",
    "Not sure yet",
    "Other",
];
export const NUMBER_SOURCES = [
    "Measured / actual records",
    "Calculated from my own data",
    "Externally cited market source",
    "Supplier / partner quotation",
    "Customer research",
    "Estimate based on stated assumptions",
    "Assumption only",
    "Not applicable yet",
    "Other",
];
export const REG_BARRIERS = [
    "None known",
    "Business registration / licensing",
    "Sector regulator / government approval",
    "Health / safety / certification",
    "Data / privacy compliance",
    "Intellectual property / ownership",
    "Clinical / ethics approval",
    "Import / export approval",
    "University / partner approval",
    "Other",
];
export const EXIT_STRATEGIES = [
    "Build a sustainable independent company",
    "Strategic acquisition",
    "Merger",
    "License / sell intellectual property",
    "Founder / management buyout",
    "Public listing (long-term)",
    "Social enterprise / mission-lock structure",
    "Other",
];
export const VAULT_DOCS: { type: string; label: string; accept?: string; multiple?: boolean }[] = [
    { type: "Pitch deck", label: "📊 Pitch deck", accept: ".pdf,.ppt,.pptx" },
    { type: "Customer research", label: "🔎 Validation / traction proof", multiple: true },
    { type: "Prototype / product media", label: "🧪 Prototype / product evidence", multiple: true },
    { type: "Financial projections", label: "💰 Financial model", accept: ".pdf,.xls,.xlsx,.csv" },
    { type: "Registration / ethics documents", label: "⚖️ Registration / IP / approvals", multiple: true },
    { type: "Other supporting evidence", label: "➕ Other supporting evidence", multiple: true },
];
export const SDG_SHORT: Record<number, string> = {
    1: "No Poverty",
    2: "Zero Hunger",
    3: "Good Health",
    4: "Quality Education",
    5: "Gender Equality",
    6: "Clean Water",
    7: "Clean Energy",
    8: "Decent Work",
    9: "Industry & Innovation",
    10: "Reduced Inequalities",
    11: "Sustainable Cities",
    12: "Responsible Consumption",
    13: "Climate Action",
    14: "Life Below Water",
    15: "Life on Land",
    16: "Peace & Justice",
    17: "Partnerships",
};
export const ORIGIN_TO_SUBMISSION: Record<string, string> = {
    "Course assignment / business plan": "Course project",
    "Final Year Project (FYP)": "Final-Year Project",
    "University incubator / competition": "Independent venture",
    "Independent student startup": "Independent venture",
    "Already operating business": "Operating startup",
};
export const REVIEW_BLOCKS: { key: "founder" | "opportunity" | "business" | "impact" | "ask"; title: string }[] = [
    { key: "founder", title: "1 · Venture, faculty & team" },
    { key: "opportunity", title: "2 · Problem, customer & market" },
    { key: "business", title: "3 · Solution, business model & traction" },
    { key: "impact", title: "4 · Sustainability / SDG" },
    { key: "ask", title: "5 · Execution, risk & next step" },
];

export function htmlSdgMode(mode?: string | null): V11SdgMode {
    if (mode === "map") return "map";
    if (mode === "review") return "review";
    if (mode === "none") return "none";
    return "";
}
export function dtoSdgMode(mode: V11SdgMode): "map" | "review" | "none" | undefined {
    if (mode === "map" || mode === "review" || mode === "none") return mode;
    return undefined;
}

