/** Faculty-only CIEL AI Critical Review — Shark-Tank / VC lens (30% academic · 70% practical).
 * Decision support only: derived from already-stored venture jsonb. Never auto-approves. */

import { computeVentureMeritScorecard, type VentureMeritEntry } from "@/utils/ventureMeritModel";

export type SharkVote = "IN" | "CONDITIONAL" | "OUT";
export type CheckLevel = "critical" | "high" | "medium";
export type SuggestedDecision = "approved" | "revision" | "rejected";

const GRADES: [number, string, number][] = [
    [97, "A+", 4.0],
    [93, "A", 4.0],
    [90, "A−", 3.7],
    [87, "B+", 3.3],
    [83, "B", 3.0],
    [80, "B−", 2.7],
    [77, "C+", 2.3],
    [73, "C", 2.0],
    [70, "C−", 1.7],
    [60, "D", 1.0],
    [0, "F", 0],
];

const RUBRIC: { key: string; name: string; weight: number; ivy: string; merit: "team" | "problem" | "market" | "traction" | "sdg" | "evidence" | "governance" }[] = [
    { key: "venture", name: "Venture identity & team", weight: 14, ivy: "Capabilities & background of the team; founder-market fit", merit: "team" },
    { key: "problem", name: "Problem, customer & evidence", weight: 15, ivy: "Customer value proposition; validated need", merit: "problem" },
    { key: "market", name: "Market & competition", weight: 14, ivy: "Size of market, competitive landscape, clear differentiation", merit: "market" },
    { key: "solution", name: "Solution, product & operations", weight: 11, ivy: "Operational & technology viability", merit: "problem" },
    { key: "model", name: "Business model & go-to-market", weight: 15, ivy: "Economic model; go-to-market plan", merit: "evidence" },
    { key: "finance", name: "Finance, budget & funding ask", weight: 15, ivy: "Capital requirements & financial forecast", merit: "traction" },
    { key: "impact", name: "Impact / SDG", weight: 5, ivy: "Value created for society (separately scored)", merit: "sdg" },
    { key: "risk", name: "Risk, team health & milestones", weight: 11, ivy: "Risk awareness, execution plan, milestones", merit: "governance" },
];

function clamp(n: number, a = 0, b = 10) {
    return Math.max(a, Math.min(b, n));
}

function letterGrade(score: number): [string, number] {
    const hit = GRADES.find(([min]) => score >= min) || GRADES[GRADES.length - 1];
    return [hit[1], hit[2]];
}

function tier(score: number) {
    if (score >= 85) return "Finalist-ready";
    if (score >= 70) return "Semi-finalist";
    if (score >= 55) return "Workshop stage";
    return "Foundation stage";
}

function verdictOf(score: number) {
    if (score >= 85) return "INVEST — take the meeting this week";
    if (score >= 72) return "STRONG INTEREST — invest after two conditions are met";
    if (score >= 58) return "INTERESTED WITH CONDITIONS — come back with evidence";
    if (score >= 45) return "NOT YET — promising but unproven";
    return "PASS — fundamentals missing";
}

function sharkVote(score: number): SharkVote {
    if (score >= 72) return "IN";
    if (score >= 52) return "CONDITIONAL";
    return "OUT";
}

function words(s?: string | null) {
    return (s || "").trim().split(/\s+/).filter(Boolean).length;
}

export interface CriticalSection {
    key: string;
    name: string;
    weight: number;
    ivy: string;
    acad: number;
    prac: number;
    score: number;
    grade: string;
    strengths: string[];
    gaps: string[];
    actions: string[];
    questions: string[];
}

export interface VentureCriticalReview {
    overall: number;
    acad: number;
    prac: number;
    grade: string;
    gpa: number;
    tier: string;
    verdict: string;
    rec: SuggestedDecision;
    summary: string;
    sections: CriticalSection[];
    votes: { who: string; vote: SharkVote; say: string }[];
    checks: { level: CheckLevel; text: string }[];
    facultyDraft: string;
}

export function analyseVentureCriticalReview(entry: VentureMeritEntry & {
    ventureName?: string | null;
    ideaInfo?: (VentureMeritEntry["ideaInfo"] & { pitch?: string; sector?: string }) | null;
    solutionInfo?: (VentureMeritEntry["solutionInfo"] & { solution?: string; revenue?: string }) | null;
    evidenceInfo?: VentureMeritEntry["evidenceInfo"];
}): VentureCriticalReview {
    const card = computeVentureMeritScorecard(entry);
    const byKey = Object.fromEntries(card.criteria.map((c) => [c.key, c]));
    const idea = entry.ideaInfo;
    const solution = entry.solutionInfo;
    const evidence = entry.evidenceInfo;

    const sections: CriticalSection[] = RUBRIC.map((r) => {
        const crit = byKey[r.merit];
        const frac = crit.max ? crit.points / crit.max : 0;
        const acad = clamp(Math.round(frac * 10 - (r.merit === "traction" ? 0.5 : 0)));
        const prac = clamp(Math.round(frac * 10 + (r.merit === "traction" || r.merit === "market" ? 0.5 : 0)));
        const score = Math.round(acad * 3 + prac * 7);
        const strengths: string[] = [];
        const gaps: string[] = [];
        const actions: string[] = [];
        const questions: string[] = [];
        if (crit.note) (frac >= 0.55 ? strengths : gaps).push(crit.note);
        if (r.key === "problem") {
            if (words(idea?.problem) >= 25) strengths.push("Problem statement is developed enough to analyse.");
            else gaps.push("Problem statement is thin — under 25 words leaves the reviewer inferring the mechanism.");
            if (!idea?.proofFact) gaps.push("No proof fact — the claim cannot be falsified.");
            questions.push("Describe the last time you watched a customer experience this problem. What did they do?");
            actions.push("Quantify cost, frequency and the incumbent workaround in the problem section.");
        }
        if (r.key === "finance") {
            if (!evidence?.revenueToDate && !evidence?.preOrders) gaps.push("No verified rupees — unit cost, margin and runway are not on paper.");
            else strengths.push("Demand or revenue signals are on the record.");
            actions.push("Add two supplier quotes or three months of sales / pre-order records.");
            questions.push("What is unit cost, gross margin, and months of runway on current cash?");
        }
        if (r.key === "market") {
            if (!solution?.marketSize) gaps.push("Market is described, not measured.");
            actions.push("Size the market bottom-up and name who you are taking customers from.");
        }
        if (r.key === "venture") {
            questions.push("Why is this team the one that wins this market in the next 18 months?");
        }
        if (!actions.length) actions.push("Tighten evidence in this section before the next faculty review.");
        if (!questions.length) questions.push("What would change your plan if this assumption is wrong?");
        return { key: r.key, name: r.name, weight: r.weight, ivy: r.ivy, acad, prac, score, grade: letterGrade(score)[0], strengths, gaps, actions, questions };
    });

    const weightSum = sections.reduce((s, x) => s + x.weight, 0);
    const overall = Math.round(sections.reduce((s, x) => s + x.score * x.weight, 0) / weightSum);
    const acad = Math.round(sections.reduce((s, x) => s + x.acad * 10 * x.weight, 0) / weightSum);
    const prac = Math.round(sections.reduce((s, x) => s + x.prac * 10 * x.weight, 0) / weightSum);
    const [grade, gpa] = letterGrade(overall);
    const rec: SuggestedDecision = overall >= 72 ? "approved" : overall >= 50 ? "revision" : "rejected";

    const checks: VentureCriticalReview["checks"] = [];
    if (words(idea?.problem) < 12) checks.push({ level: "high", text: "Problem statement has little substance — a VC cannot test it." });
    if (!evidence?.revenueToDate && !evidence?.preOrders && !evidence?.lettersOfIntent) {
        checks.push({ level: "critical", text: "No paid, pre-order or LOI evidence — the plan is still an untested hypothesis." });
    }
    if (!solution?.marketSize) checks.push({ level: "medium", text: "Market size is missing; stated TAM without a method will not survive a panel." });
    if (!(entry.team || []).length) checks.push({ level: "high", text: "Team is a single founder with no named co-founders on the record." });

    const by = (k: string) => sections.find((s) => s.key === k)!;
    const fin = by("finance").score;
    const mkt = by("market").score;
    const ops = by("venture").score;
    const numbersVote = sharkVote(fin);
    const marketVote = sharkVote(mkt);
    const operatorVote = sharkVote(ops);
    const deanVote = sharkVote(acad);

    const votes: VentureCriticalReview["votes"] = [
        {
            who: "The Numbers Shark",
            vote: numbersVote,
            say:
                numbersVote === "IN"
                    ? "The economics are real enough to take the meeting. I am in if the bank statement matches the form."
                    : numbersVote === "CONDITIONAL"
                      ? "The skeleton of a model exists but the numbers are estimates. Come back with quotes and sales records."
                      : "I cannot count a single verified rupee. Out — until unit cost, margin and runway are on paper.",
        },
        {
            who: "The Market Shark",
            vote: marketVote,
            say:
                marketVote === "IN"
                    ? "Real customers, real competitors, real timing. This is a market I would want a piece of."
                    : marketVote === "CONDITIONAL"
                      ? "The problem is real but the market is described, not measured. Size it bottom-up."
                      : "I do not know who the customer is or why now. Out.",
        },
        {
            who: "The Operator Shark",
            vote: operatorVote,
            say:
                operatorVote === "IN"
                    ? "This team can ship. Roles are clear enough to execute a 90-day plan."
                    : operatorVote === "CONDITIONAL"
                      ? "Capable people, unproven execution. I want one channel run for 30 days before I commit."
                      : "Execution risk is the story here — unclear roles or a team that will not survive the semester. Out.",
        },
        {
            who: "The Dean",
            vote: deanVote,
            say:
                deanVote === "IN"
                    ? "Academic rigour holds: sources, assumptions and reflection are good enough for a faculty sign-off."
                    : deanVote === "CONDITIONAL"
                      ? "The idea is teachable but the evidence trail is thin. Send them back with a tighter literature and method note."
                      : "This would not pass a viva. Fundamentals of problem, evidence and reflection are missing.",
        },
    ];

    const best = [...sections].sort((a, b) => b.score - a.score)[0];
    const worst = [...sections].sort((a, b) => a.score - b.score)[0];
    const ins = votes.filter((v) => v.vote === "IN").length;
    const cond = votes.filter((v) => v.vote === "CONDITIONAL").length;
    const name = (entry as { ventureName?: string | null }).ventureName || "This venture";
    const summary = `${name} scores ${overall}/100 (${grade}, ${tier(overall)}) on the 30/70 academic–practical blend. Strongest section: ${best.name.toLowerCase()} (${best.score}); weakest: ${worst.name.toLowerCase()} (${worst.score}). Shark panel: ${ins} in, ${cond} conditional, ${4 - ins - cond} out. ${
        checks.length
            ? `${checks.length} reality-check flag${checks.length === 1 ? "" : "s"} raised, ${checks.filter((c) => c.level === "critical").length} critical.`
            : "No reality-check flags."
    } Verdict: ${verdictOf(overall)}.`;

    const recLabel = rec === "approved" ? "Approve & publish" : rec === "revision" ? "Request revision" : "Flag / reject";
    const facultyDraft = `${summary}\n\nAI-suggested decision: ${recLabel} (decision support only — AI never approves or rejects).\n\n${sections
        .map((s, i) => `${i + 1}. ${s.name} — ${s.score}/100 (${s.grade})\n  Works: ${s.strengths.join(" ") || "—"}\n  Gaps: ${s.gaps.join(" ") || "—"}\n  Do next: ${s.actions.join(" ")}`)
        .join("\n\n")}`;

    return {
        overall,
        acad,
        prac,
        grade,
        gpa,
        tier: tier(overall),
        verdict: verdictOf(overall),
        rec,
        summary,
        sections,
        votes,
        checks,
        facultyDraft,
    };
}
