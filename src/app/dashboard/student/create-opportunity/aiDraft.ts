/**
 * Student "Generate & Auto-Fill" (POST /api/v1/ai/opportunity-draft): request building and applying the
 * AI draft onto the wizard form. Pure — no React or app imports — so `node --test` can cover it
 * (tests/aiDraft.test.mjs). Catalog lookups (cities, SDG targets) are passed in by the caller.
 *
 * The AI only drafts text. Seats, hours, dates, team mode, location and main partner come from the
 * student's own modal inputs; faculty, partner contacts, map pin, apply scope, declarations and
 * signature are never touched here.
 */
import type { TeamMode } from "./teamMode";

export type AiDraftInputs = {
    idea: string;
    titleHint: string;
    place: string;
    beneficiaries: string;
    teamMode: TeamMode;
    seats: string;
    hours: string;
    startDate: string;
    endDate: string;
    mainPartner: string;
};

/** Validated fields returned by the backend (ciel_backend src/ai/opportunity-draft.util.ts). */
export type AiDraftFields = {
    title: string;
    hook: string;
    summary: string;
    activity_types: string[];
    mode: "On site" | "Remote" | "Hybrid" | "";
    schedule_notes: string;
    objective: string;
    outputs: string;
    outcome: string;
    beneficiary_types: string[];
    responsibilities: string;
    skills: string[];
    prerequisites: string;
    resources: string;
    feasibility_warning: string;
    primary_sdg: { sdg_id: string; target_id: string; indicator_id?: string; why: string; local_metric: string } | null;
    supporting_sdg: { sdg_id: string; target_id: string; indicator_id?: string; why: string } | null;
};

/** The slice of the wizard's form state this module reads and writes. */
export type AiDraftFormShape = {
    title: string;
    hook: string;
    opportunitySummary: string;
    opportunityType: string[];
    mode: string;
    location: { city: string; venue: string; pin: string; mapSearch: string; mapLink: string };
    dates: { start: string; end: string; fromTime: string; endTime: string };
    scheduleNotes: string;
    capacity: { hours: string; volunteers: string };
    teamMode: TeamMode;
    sdg: string;
    target: string;
    indicator: string;
    subIndicator: string;
    sdgWhy: string;
    secondarySdg: string;
    secondaryTarget: string;
    secondaryIndicator: string;
    secondarySubIndicator: string;
    secondarySdgWhy: string;
    objectives: {
        description: string;
        outputs: string;
        outcome: string;
        beneficiariesCount: string;
        beneficiariesType: string[];
    };
    activity: {
        responsibilities: string;
        skills: string[];
        prerequisites: string;
        resources: string;
    };
    supervision: { executingContext: "" | "partner" | "independent"; partnerOrgName: string };
};

export type ApplyAiDraftOptions = {
    /** City dropdown options; a city is only set when the student's place names one of them. */
    cityOptions: readonly string[];
    /** True when the SDG target id exists in the wizard's SDG catalog. */
    sdgTargetExists: (sdgId: string, targetId: string) => boolean;
    /** True when the indicator id is listed under that target in the catalog. */
    sdgIndicatorExists: (sdgId: string, targetId: string, indicatorId: string) => boolean;
    /** Whether the wizard shows Private / Open (team_mode is only applied then). */
    teamModeChoosable: boolean;
};

const PRIVATE_TEAM_MAX_SEATS = 20;

const digits = (s: string) => s.replace(/\D/g, "");

function positiveInt(raw: string, max: number): number | null {
    const n = parseInt(digits(raw), 10);
    return Number.isFinite(n) && n >= 1 && n <= max ? n : null;
}

/** First problem with the modal inputs, or null when the request can be sent. */
export function aiDraftInputError(inputs: AiDraftInputs): string | null {
    if (inputs.idea.trim().length < 3) return "Write a few keywords or a short idea first.";
    if (inputs.idea.length > 4000) return "Please shorten your idea to 4000 characters.";
    const seatMax = inputs.teamMode === "private_team" ? PRIVATE_TEAM_MAX_SEATS : 5000;
    if (inputs.seats.trim() && positiveInt(inputs.seats, seatMax) === null) {
        return inputs.teamMode === "private_team"
            ? `A private team has 1–${PRIVATE_TEAM_MAX_SEATS} places including you.`
            : "Places must be between 1 and 5000.";
    }
    if (inputs.hours.trim() && positiveInt(inputs.hours, 500) === null) {
        return "Required hours must be between 1 and 500.";
    }
    if (inputs.startDate && inputs.endDate && inputs.endDate < inputs.startDate) {
        return "End date must be on or after the start date.";
    }
    return null;
}

/** Body for POST /api/v1/ai/opportunity-draft. Empty values are left out. */
export function buildAiDraftRequest(
    inputs: AiDraftInputs,
    creatorPathway: "university" | "private",
): Record<string, unknown> {
    const body: Record<string, unknown> = {
        idea: inputs.idea.trim(),
        team_mode: inputs.teamMode,
        creator_pathway: creatorPathway,
    };
    // Caps mirror the backend DTO; pre-filled form values (title, venue, partner) can be longer.
    const text: Array<[keyof AiDraftInputs, string, number]> = [
        ["titleHint", "title_hint", 200],
        ["place", "place", 200],
        ["beneficiaries", "beneficiaries", 60],
        ["mainPartner", "main_partner", 200],
    ];
    for (const [from, to, max] of text) {
        const v = inputs[from].trim().slice(0, max).trim();
        if (v) body[to] = v;
    }
    const seats = positiveInt(inputs.seats, 5000);
    if (seats) body.seats = seats;
    const hours = positiveInt(inputs.hours, 500);
    if (hours) body.hours = hours;
    if (/^\d{4}-\d{2}-\d{2}$/.test(inputs.startDate)) body.start_date = inputs.startDate;
    if (/^\d{4}-\d{2}-\d{2}$/.test(inputs.endDate)) body.end_date = inputs.endDate;
    return body;
}

/** "10 students × 16 hours = 160 student-hours" plus a scope warning for paint-only ideas. */
export function aiWorkloadHint(inputs: AiDraftInputs): string {
    const seats = positiveInt(inputs.seats, 5000);
    const hours = positiveInt(inputs.hours, 500);
    if (!seats || !hours) return "";
    const parts = [`Workload check: ${seats} students × ${hours} hours = ${seats * hours} potential student-hours.`];
    if (inputs.teamMode === "open" && seats > PRIVATE_TEAM_MAX_SEATS) {
        parts.push("Activities repeat across independent report teams of up to 20.");
    }
    const idea = `${inputs.titleHint} ${inputs.idea}`.toLowerCase();
    if (
        /paint|repaint|furniture/.test(idea) &&
        !/curricul|chart|teach|lesson|artwork|upgrad|learning material/.test(idea)
    ) {
        parts.push("Painting alone may finish quickly — add real work or reduce hours / students.");
    }
    return parts.join(" ");
}

/** Pre-fills the modal from what the student already typed in the form. */
export function aiDraftInputsFromForm(form: AiDraftFormShape): AiDraftInputs {
    return {
        idea: "",
        titleHint: form.title,
        place: [form.location.venue, form.location.city].map((s) => s.trim()).filter(Boolean).join(", "),
        beneficiaries: form.objectives.beneficiariesCount,
        teamMode: form.teamMode === "private_team" ? "private_team" : "open",
        seats: form.capacity.volunteers,
        hours: form.capacity.hours,
        startDate: form.dates.start,
        endDate: form.dates.end,
        mainPartner: form.supervision.executingContext === "partner" ? form.supervision.partnerOrgName : "",
    };
}

function matchCity(place: string, options: readonly string[]): string {
    const p = place.toLowerCase();
    return options.find((c) => new RegExp(`\\b${c.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(p)) ?? "";
}

const pick = (ai: string, current: string) => (ai.trim() ? ai : current);

/** New form state with the AI draft and the student's own modal facts applied. */
export function applyAiDraft<F extends AiDraftFormShape>(
    form: F,
    fields: AiDraftFields,
    inputs: AiDraftInputs,
    opts: ApplyAiDraftOptions,
): F {
    const place = inputs.place.trim();
    const primary = fields.primary_sdg;
    const supporting = fields.supporting_sdg;
    const keepsOtherType = form.opportunityType.includes("Other");
    const seats = positiveInt(inputs.seats, inputs.teamMode === "private_team" ? PRIVATE_TEAM_MAX_SEATS : 5000);
    const hours = positiveInt(inputs.hours, 500);
    const mainPartner = inputs.mainPartner.trim();

    /** Target + indicator the dropdowns can show; anything missing from the catalog stays empty. */
    const catalogPick = (sdg: { sdg_id: string; target_id: string; indicator_id?: string }) => {
        const target = sdg.target_id && opts.sdgTargetExists(sdg.sdg_id, sdg.target_id) ? sdg.target_id : "";
        const indicator =
            target && sdg.indicator_id && opts.sdgIndicatorExists(sdg.sdg_id, target, sdg.indicator_id)
                ? sdg.indicator_id
                : "";
        return { target, indicator };
    };
    const primaryPick = primary ? catalogPick(primary) : null;
    const supportingPick = supporting ? catalogPick(supporting) : null;

    const sdgFields = primary
        ? {
              sdg: primary.sdg_id,
              target: primaryPick?.target ?? "",
              indicator: primaryPick?.indicator ?? "",
              subIndicator: primary.local_metric,
              sdgWhy: primary.why,
              ...(supporting
                  ? {
                        secondarySdg: supporting.sdg_id,
                        secondaryTarget: supportingPick?.target ?? "",
                        secondaryIndicator: supportingPick?.indicator ?? "",
                        secondarySubIndicator: "",
                        secondarySdgWhy: supporting.why,
                    }
                  : form.secondarySdg === primary.sdg_id
                    ? {
                          secondarySdg: "",
                          secondaryTarget: "",
                          secondaryIndicator: "",
                          secondarySubIndicator: "",
                          secondarySdgWhy: "",
                      }
                    : {}),
          }
        : {};

    return {
        ...form,
        title: pick(fields.title, form.title),
        hook: pick(fields.hook, form.hook),
        opportunitySummary: pick(fields.summary, form.opportunitySummary),
        opportunityType: fields.activity_types.length
            ? [...fields.activity_types, ...(keepsOtherType ? ["Other"] : [])]
            : form.opportunityType,
        mode: fields.mode || form.mode,
        location: place
            ? {
                  ...form.location,
                  venue: form.location.venue.trim() || place,
                  city: form.location.city.trim() || matchCity(place, opts.cityOptions),
              }
            : form.location,
        dates: {
            ...form.dates,
            start: inputs.startDate || form.dates.start,
            end: inputs.endDate || form.dates.end,
        },
        scheduleNotes: pick(fields.schedule_notes, form.scheduleNotes),
        capacity: {
            hours: hours ? String(hours) : form.capacity.hours,
            volunteers: seats ? String(seats) : form.capacity.volunteers,
        },
        teamMode: opts.teamModeChoosable ? inputs.teamMode : form.teamMode,
        ...sdgFields,
        objectives: {
            ...form.objectives,
            description: pick(fields.objective, form.objectives.description),
            outputs: pick(fields.outputs, form.objectives.outputs),
            outcome: pick(fields.outcome, form.objectives.outcome),
            beneficiariesCount: digits(inputs.beneficiaries) || form.objectives.beneficiariesCount,
            beneficiariesType: fields.beneficiary_types.length
                ? fields.beneficiary_types
                : form.objectives.beneficiariesType,
        },
        activity: {
            ...form.activity,
            responsibilities: pick(fields.responsibilities, form.activity.responsibilities),
            skills: fields.skills.length ? fields.skills : form.activity.skills,
            prerequisites: pick(fields.prerequisites, form.activity.prerequisites),
            resources: pick(fields.resources, form.activity.resources),
        },
        // A named main partner switches on the partner block with only the name: the student must
        // still enter the partner's contact person and official email before submitting.
        supervision:
            mainPartner && !form.supervision.partnerOrgName.trim()
                ? { ...form.supervision, executingContext: "partner", partnerOrgName: mainPartner }
                : form.supervision,
    };
}
