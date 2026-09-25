import type { ReportData } from "../context/ReportContext";
import { distinctBeneficiaryTotal } from "./activityReach";

/**
 * Purely decorative "fun meter" layer — every function here is a derived read of data the real
 * form already collects. Nothing here is stored, nothing here feeds CII/validation/submit, and
 * nothing here should ever be treated as an academic signal. Mirrors the mockup's own
 * strength()/xp()/level() functions, adapted to this app's real ReportData field names.
 */

export type JourneyGrade = 0 | 1 | 2 | 3;

export const JOURNEY_STOPS: Array<{ step: number; label: string; icon: string; color: string }> = [
    { step: 1, label: "Participation", icon: "🎮", color: "#34a853" },
    { step: 2, label: "Context", icon: "🔎", color: "#4285f4" },
    { step: 3, label: "SDG Mapping", icon: "🌍", color: "#7c5cff" },
    { step: 4, label: "Activities & Outputs", icon: "🛠️", color: "#ff766f" },
    { step: 5, label: "Resources", icon: "📦", color: "#f4b400" },
    { step: 6, label: "Partnerships", icon: "🤝", color: "#e86bb5" },
    { step: 7, label: "Evidence", icon: "📸", color: "#25b8d8" },
    { step: 8, label: "Reflection", icon: "💭", color: "#6f62d9" },
    { step: 9, label: "Sustainability", icon: "🌱", color: "#0f9d79" },
];

export const JOURNEY_LEVELS: Array<[minXp: number, icon: string, name: string]> = [
    [0, "🌱", "Explorer"],
    [250, "🔧", "Builder"],
    [550, "🚀", "Changemaker"],
    [850, "🏆", "Impact Champion"],
    [1150, "👑", "Impact Legend"],
];

const wc = (s?: string | null): number => (s || "").trim().split(/\s+/).filter(Boolean).length;

/** Bronze/Silver/Gold read on how strongly a section currently reads — never how "correct" it is. */
export function sectionStrength(step: number, data: ReportData): JourneyGrade {
    try {
        switch (step) {
            case 1: {
                const logs = data.section1.attendance_logs || [];
                if (!logs.length) return 0;
                const photos = logs.filter((l) => l.evidence_file).length;
                const declared = (data.section1.review_checked || []).length === 3 && (data.section1.review_checked || []).every(Boolean);
                const hoursHealthy = !data.section1.metrics?.isNonCompliant;
                if (declared && hoursHealthy && photos >= 3) return 3;
                if (declared) return 2;
                return 1;
            }
            case 2: {
                const w = wc(data.section2.problem_statement);
                if (w < 15) return w ? 1 : 0;
                const gold =
                    w >= 20 &&
                    (data.section2.system_gaps || []).length > 0 &&
                    (data.section2.baseline_evidence || []).length > 0 &&
                    wc(data.section2.discipline_contribution) >= 15;
                if (gold) return 3;
                return w >= 15 && !!data.section2.discipline ? 2 : 1;
            }
            case 3: {
                const w = wc(data.section3.contribution_intent_statement || data.section3.student_contribution_intent_statement);
                if (w < 20) return w ? 1 : 0;
                const secondary = data.section3.secondary_sdgs || [];
                const secondaryOk = secondary.length === 0 || secondary.every((s) => !!s.target_id && wc(s.justification_text) >= 20);
                if (w >= 30 && !!data.section3.primary_sdg?.target_id && secondaryOk) return 3;
                return 2;
            }
            case 4: {
                const acts = data.section4.activity_blocks || [];
                if (!acts.length) return 0;
                const done4 = acts.some((a) => a.title && a.primary_category);
                const outs = acts.reduce((sum, a) => sum + (a.outputs?.length || 0), 0);
                const reach = distinctBeneficiaryTotal(data.section4);
                const meas = (data.section5.measurable_outcomes || []).filter((o) => (o.metric || o.outcome_area) && o.baseline && o.endline);
                const done5 = wc(data.section5.observed_change) >= 30 && (data.section5.measurable_outcomes || []).some((o) => o.metric || o.outcome_area);
                const good = outs > 0 && reach > 0 && meas.length > 0;
                if (good && done4 && done5) return 3;
                if (done4 && done5) return 2;
                return 1;
            }
            case 5: {
                if (!data.section6.use_resources) return 0;
                if (data.section6.use_resources === "no") return 2;
                const r = (data.section6.resources || []).filter((x) => x.type);
                if (!r.length) return 1;
                return r.every((x) => (x.verification || []).length && (x.sources || []).length) ? 3 : 2;
            }
            case 6: {
                const partners = data.section7.partners || [];
                const rolesPicked = partners.some((p) => (p.role || []).length);
                if (!rolesPicked) return 0;
                const detailed = partners.some((p) => (p.contribution || []).length >= 2);
                return detailed ? 3 : 2;
            }
            case 7: {
                const ethics = Object.values(data.section8.ethical_compliance || {});
                const consented = ethics.length > 0 && ethics.every(Boolean);
                const visSet = !!data.section8.media_visible;
                if (!consented) return visSet ? 1 : 0;
                const evN = (data.section8.evidence_files || []).length;
                return visSet && evN >= 5 ? 3 : 2;
            }
            case 8: {
                const done9 =
                    (data.section9.skills_grown || []).length > 0 &&
                    Object.values(data.section9.competency_scores || {}).filter((n) => typeof n === "number" && n > 0).length === 12;
                if (!done9) return (data.section9.skills_grown || []).length ? 1 : 0;
                return wc(data.section9.personal_learning) >= 40 && wc(data.section9.academic_application) >= 25 ? 3 : 2;
            }
            case 9: {
                const done10 =
                    !!data.section10.continuation_status &&
                    wc(data.section10.continuation_details) >= 50 &&
                    (data.section10.mechanisms || []).length > 0 &&
                    !!data.section10.scaling_potential &&
                    !!data.section10.policy_influence;
                if (!done10) return data.section10.continuation_status ? 1 : 0;
                return wc(data.section10.continuation_details) >= 60 && (data.section10.mechanisms || []).length > 0 ? 3 : 2;
            }
            default:
                return 0;
        }
    } catch {
        return 0;
    }
}

export const STRENGTH_LABEL: Record<JourneyGrade, string> = { 0: "Not started", 1: "Bronze", 2: "Silver", 3: "Gold" };
export const STRENGTH_CLASS: Record<JourneyGrade, string> = {
    0: "cer-grade-none",
    1: "cer-grade-bronze",
    2: "cer-grade-silver",
    3: "cer-grade-gold",
};

/** Fun-meter XP — never CII points. Rewards logging sessions, attaching evidence, and how
 * strongly each section currently reads. */
export function computeJourneyXP(data: ReportData): number {
    let x = 0;
    try {
        const logs = data.section1.attendance_logs || [];
        const photos = logs.filter((l) => l.evidence_file).length;
        x += Math.min(logs.length, 10) * 15 + Math.min(photos, 10) * 5;
        JOURNEY_STOPS.forEach((s) => {
            x += sectionStrength(s.step, data) * 40;
        });
        const acts = data.section4.activity_blocks || [];
        const meas = (data.section5.measurable_outcomes || []).filter((o) => (o.metric || o.outcome_area) && (o.baseline || o.endline));
        const evN = (data.section8.evidence_files || []).length + photos + (data.section6.resources || []).filter((r) => r.type).length;
        x += Math.min(acts.length, 5) * 10 + Math.min(meas.length, 4) * 15 + Math.min(evN, 10) * 4;
    } catch {
        // fun meter only — a bad read here should never break the report
    }
    return x;
}

export function journeyLevel(xp: number): { index: number; icon: string; name: string; next: [number, string, string] | null; pct: number } {
    let i = 0;
    JOURNEY_LEVELS.forEach((l, k) => {
        if (xp >= l[0]) i = k;
    });
    const current = JOURNEY_LEVELS[i];
    const next = JOURNEY_LEVELS[i + 1] || null;
    const pct = next ? Math.round(((xp - current[0]) / (next[0] - current[0])) * 100) : 100;
    return { index: i, icon: current[1], name: current[2], next, pct };
}
