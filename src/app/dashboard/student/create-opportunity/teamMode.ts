/**
 * Student builder "Who can join?" rules (backend `opportunities.team_mode`). Pure — no React or app
 * imports — so `node --test` can cover it (tests/teamMode.test.mjs).
 */

/** Private team: creator adds 1–20 members from the report; nobody applies. Open: today's Apply Now flow. */
export type TeamMode = "open" | "private_team";

export const PRIVATE_TEAM_MAX_SEATS = 20;
export const OPEN_MAX_SEATS = 5000;

export function seatsRangeError(raw: string, privateTeam: boolean): string | null {
    const n = parseInt(raw, 10);
    const max = privateTeam ? PRIVATE_TEAM_MAX_SEATS : OPEN_MAX_SEATS;
    if (!raw.trim() || Number.isNaN(n) || n < 1 || n > max) {
        return privateTeam
            ? `A private team has 1–${PRIVATE_TEAM_MAX_SEATS} seats including you. Choose Open Opportunity for larger campaigns.`
            : `Available seats must be between 1 and ${OPEN_MAX_SEATS}.`;
    }
    return null;
}

/** Seats after switching to a private team: anything above the cap is clamped, else unchanged. */
export function clampSeatsForPrivateTeam(raw: string): { seats: string; clamped: boolean } {
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n) && n > PRIVATE_TEAM_MAX_SEATS) {
        return { seats: String(PRIVATE_TEAM_MAX_SEATS), clamped: true };
    }
    return { seats: raw, clamped: false };
}

/** `team_mode` as loaded from the server: undefined for a brand-new form, null for a legacy listing. */
export type LoadedTeamMode = TeamMode | null | undefined;

export function loadedTeamModeFromDetail(value: unknown): TeamMode | null {
    return value === "private_team" || value === "open" ? value : null;
}

/**
 * Whether the wizard offers Private / Open: when admins enabled private teams, or when the listing
 * being edited already is one (so it can still be switched back to Open after the feature is off).
 */
export function teamModeChooserVisible(featureEnabled: boolean, loaded: LoadedTeamMode, current: unknown): boolean {
    return featureEnabled || loaded === "private_team" || current === "private_team";
}

/**
 * `team_mode` for the submit / draft payload. Omitted while students cannot choose (feature off), so
 * new listings stay on the legacy rules (null) instead of picking up the builder's per-team cap — and
 * omitted for a legacy listing (loaded null) unless the student actually used the chooser.
 */
export function teamModePayload(
    showChooser: boolean,
    mode: unknown,
    opts: { loaded?: LoadedTeamMode; touched?: boolean } = {},
): { team_mode?: TeamMode } {
    if (!showChooser) return {};
    if (opts.loaded === null && !opts.touched) return {};
    return { team_mode: mode === "private_team" ? "private_team" : "open" };
}
