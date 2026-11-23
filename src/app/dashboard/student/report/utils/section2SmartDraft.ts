/**
 * Section 2.2 — the baseline statement the rubric reads.
 *
 * "Rewrite with AI" asks the server for the Section 2 AI summary and stores it as `summary_text`
 * (with its `summary_source` fingerprint), so the banner's "AI summary — what the rubric will read"
 * is the same paragraph the student sees in 2.2. When the AI is unavailable, this local composer
 * writes the statement instead: factual, in the order the section's guidance asks for (problem and
 * affected group → gaps → how the need was identified → academic contribution), with no filler.
 */

export interface Section2SmartDraftInput {
    /** Q1 problem statement (full text). */
    problem: string;
    /** Q2 affected group, e.g. "women and children in the camp". */
    affectedGroup?: string;
    /** Q2 count as typed, e.g. "26". */
    affectedCount?: string;
    /** Q3 system gaps, human-readable labels. */
    gaps?: string[];
    /** Q4 baseline evidence sources, human-readable labels. */
    sources?: string[];
    /** Q5 discipline label (resolved "Other…" text). */
    discipline?: string;
    /** Q5 how the discipline contributed. */
    contribution?: string;
    /** 2.3 risk, safeguarding & consent, already phrased (see riskSafeguarding.safeguardingSummarySentence). */
    safeguarding?: string;
}

function clean(text: unknown): string {
    return String(text ?? "").trim();
}

/**
 * Ordinary sentence starters that may be lowercased after a lead-in clause. Anything else keeps its
 * capital: "I", acronyms ("NGO staff") and proper nouns ("Karachi's slums") are never changed.
 */
const LOWERCASE_STARTERS = new Set([
    "the", "a", "an", "our", "their", "its", "my", "his", "her", "this", "that", "these", "those", "there",
    "it", "we", "they", "in", "at", "on", "for", "with", "without", "many", "most", "some", "several", "few",
    "no", "not", "only", "almost", "about", "around", "nearly", "roughly", "approximately", "over", "under",
    "more", "less", "each", "every", "all", "both", "much", "little", "one", "two", "three", "four", "five",
    "local", "before", "during", "after", "across", "because", "due", "despite", "although", "while", "when",
    "children", "students", "women", "girls", "boys", "men", "people", "families", "households", "residents",
    "farmers", "teachers", "patients", "youth", "young", "community", "communities", "school", "schools",
    "village", "villages", "water", "waste", "lack", "access", "poor", "low", "high", "limited", "inadequate",
    "insufficient", "unsafe", "open", "rising", "increasing", "growing", "frequent", "widespread", "chronic",
    "drawing", "using", "coming", "having", "being",
]);

/** "The lights were broken." → "the lights were broken" — so it can follow a lead-in clause. */
function asClause(text: string): string {
    const t = clean(text).replace(/[.!?]+$/, "").trim();
    if (!t) return "";
    const firstWord = (t.match(/^[A-Za-z]+/) || [""])[0];
    if (!firstWord) return t;
    const lower = firstWord.toLowerCase();
    // Only an ordinary starter with a single leading capital is lowercased ("The" → "the").
    const ordinary = LOWERCASE_STARTERS.has(lower) && firstWord === lower.charAt(0).toUpperCase() + lower.slice(1);
    return ordinary ? lower + t.slice(firstWord.length) : t;
}

function sentence(text: string): string {
    const t = clean(text).replace(/[.!?]+$/, "").trim();
    return t ? `${t}.` : "";
}

export function listJoin(items: string[]): string {
    const rows = items.map(clean).filter(Boolean);
    if (rows.length < 2) return rows.join("");
    return `${rows.slice(0, -1).join(", ")} and ${rows[rows.length - 1]}`;
}

/**
 * One factual paragraph from the Section 2 quick-question answers. Every sentence is built only
 * from what the student entered; nothing is estimated and no generic commentary is added.
 */
export function composeSection2SmartDraft(input: Section2SmartDraftInput): string {
    const problem = clean(input.problem);
    if (!problem) return "";
    const parts: string[] = [];

    parts.push(sentence(`Before the project began, ${asClause(problem)}`));

    const who = asClause(input.affectedGroup || "");
    const count = clean(input.affectedCount);
    if (who) {
        parts.push(sentence(`The group most affected was ${count ? `about ${count} ` : ""}${who}`));
    } else if (count) {
        parts.push(sentence(`About ${count} people were affected`));
    }

    const gaps = (input.gaps || []).map(clean).filter(Boolean);
    if (gaps.length) {
        parts.push(sentence(`The main gaps were in ${listJoin(gaps.map((g) => g.toLowerCase()))}`));
    }

    const sources = (input.sources || []).map(clean).filter(Boolean);
    if (sources.length) {
        parts.push(sentence(`This need was identified through ${listJoin(sources.map((s) => s.toLowerCase()))}`));
    }

    const discipline = clean(input.discipline);
    const contribution = asClause(input.contribution || "");
    if (discipline && contribution) {
        parts.push(sentence(`Drawing on ${discipline}, ${contribution}`));
    } else if (discipline) {
        parts.push(sentence(`The team's academic background is in ${discipline}`));
    } else if (contribution) {
        parts.push(sentence(contribution.charAt(0).toUpperCase() + contribution.slice(1)));
    }

    const safeguarding = clean(input.safeguarding);
    if (safeguarding) parts.push(safeguarding);

    return parts.filter(Boolean).join(" ");
}
