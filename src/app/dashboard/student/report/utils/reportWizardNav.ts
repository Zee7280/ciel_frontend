/**
 * Wizard: steps 1–9 are form tabs; step 10 is the flash card.
 * Report JSON still stores data.section1…section10 (wizard 4 holds both 4 and 5).
 */

export const FLASH_CARD_STEP = 10;

export const REPORT_FORM_STEP_TOTAL = 9;

export const REPORT_UI_SECTION_GROUPS: number[][] = [[1], [2], [3], [4, 5], [6], [7], [8], [9], [10]];

export const REPORT_UI_SECTION_TOTAL = REPORT_UI_SECTION_GROUPS.length;

/** Data-section numbers stored on a wizard step. Flash card has none. */
export function wizardStepToDataSections(step: number): number[] {
    const s = canonicalReportStep(step);
    if (s <= 0 || s >= FLASH_CARD_STEP) return [];
    if (s <= 3) return [s];
    if (s === 4) return [4, 5];
    return [s + 1];
}

export function wizardStepToPrimaryDataSection(step: number): number | null {
    return wizardStepToDataSections(step)[0] ?? null;
}

export function dataSectionToWizardStep(dataSection: number): number {
    if (dataSection <= 4) return dataSection;
    if (dataSection === 5) return 4;
    if (dataSection >= 6 && dataSection <= 10) return dataSection - 1;
    return FLASH_CARD_STEP;
}

export function isMergedActivitiesStep(step: number): boolean {
    return canonicalReportStep(step) === 4;
}

export function isFlashCardStep(step: number): boolean {
    return canonicalReportStep(step) === FLASH_CARD_STEP;
}

/** Clamp to 1–10. Legacy flash callers that still pass 11 land on 10. */
export function canonicalReportStep(step: number): number {
    if (step === 11) return FLASH_CARD_STEP;
    if (step < 1) return 1;
    if (step > FLASH_CARD_STEP) return FLASH_CARD_STEP;
    return step;
}

export function nextReportStep(step: number): number {
    return Math.min(canonicalReportStep(step) + 1, FLASH_CARD_STEP);
}

export function prevReportStep(step: number): number {
    return Math.max(canonicalReportStep(step) - 1, 1);
}

export function tabMatchesStep(tabStep: number, activeStep: number): boolean {
    return canonicalReportStep(activeStep) === tabStep;
}

export function tabIsComplete(tabStep: number, incomplete: Set<number>): boolean {
    if (tabStep === FLASH_CARD_STEP) return false;
    const dataSections = wizardStepToDataSections(tabStep);
    if (!dataSections.length) return false;
    return dataSections.every((s) => !incomplete.has(s));
}

export function uiSectionsCompleteCount(incomplete: Set<number>): number {
    return REPORT_UI_SECTION_GROUPS.filter((group) => group.every((s) => !incomplete.has(s))).length;
}

export function uiStepLabel(internalStep: number): string {
    const s = canonicalReportStep(internalStep);
    if (s === FLASH_CARD_STEP) return "Flash Card";
    return String(s);
}

export function formatIncompleteSectionHeading(section: number, label: string): string {
    return `Step ${dataSectionToWizardStep(section)} — ${label}`;
}

export type ReviewDossierNavItem = {
    id: string;
    wizard: number;
    label: string;
};

/** Reviewer TOC: 9 form tabs + flash/print. `id` is still the data-section DOM id. */
export const REVIEW_DOSSIER_FORM_NAV: ReviewDossierNavItem[] = [
    { id: "section1", wizard: 1, label: "Participation Profile" },
    { id: "section2", wizard: 2, label: "Project Context" },
    { id: "section3", wizard: 3, label: "SDG Mapping" },
    { id: "section4", wizard: 4, label: "Activities & Outputs" },
    { id: "section6", wizard: 5, label: "Resources" },
    { id: "section7", wizard: 6, label: "Partnerships" },
    { id: "section8", wizard: 7, label: "Evidence" },
    { id: "section9", wizard: 8, label: "Reflection" },
    { id: "section10", wizard: 9, label: "Sustainability" },
];

export const REVIEW_DOSSIER_FLASH_NAV: ReviewDossierNavItem = {
    id: "section11",
    wizard: FLASH_CARD_STEP,
    label: "Flash card / Print",
};

export function paddedWizardStep(n: number): string {
    return String(n).padStart(2, "0");
}

export function reviewSectionHeading(dataSection: number, title: string): string {
    return `${paddedWizardStep(dataSectionToWizardStep(dataSection))}. ${title}`;
}

export function dataSectionReviewBannerLabel(dataSection: number): string {
    if (dataSection === 4) return "4 · Part A";
    if (dataSection === 5) return "4 · Part B";
    return String(dataSectionToWizardStep(dataSection));
}

/** Compact UI mark for stored data sections (analytics APIs still use 1–10 / 11). */
export function dataSectionUiMark(dataSection: number): string {
    if (dataSection === 4) return "4A";
    if (dataSection === 5) return "4B";
    return String(dataSectionToWizardStep(dataSection));
}

/** Same auto-summary coverage as before: data sections 2, 3, 4, 5, 8, 9, 10. */
export function dataSectionsToSummarize(wizardStep: number): number[] {
    switch (canonicalReportStep(wizardStep)) {
        case 2:
            return [2];
        case 3:
            return [3];
        case 4:
            return [4, 5];
        case 7:
            return [8];
        case 8:
            return [9];
        case 9:
            return [10];
        default:
            return [];
    }
}
