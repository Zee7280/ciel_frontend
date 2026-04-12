/**
 * Magic-link verification entry paths (emails / FRONTEND_VERIFY_PATH).
 * @see `/verify-project` and `/verify/faculty`
 */
export const FRONTEND_VERIFY_PROJECT_PATH = "/verify-project";
export const FRONTEND_VERIFY_FACULTY_PATH = "/verify/faculty";

/** Magic-link verify URLs — CIEL account required before the verify API runs. */
export function isFrontendVerificationPath(pathname: string): boolean {
    return (
        pathname === FRONTEND_VERIFY_PROJECT_PATH ||
        pathname === FRONTEND_VERIFY_FACULTY_PATH ||
        pathname.startsWith(`${FRONTEND_VERIFY_PROJECT_PATH}/`) ||
        pathname.startsWith(`${FRONTEND_VERIFY_FACULTY_PATH}/`)
    );
}

/** When `true`, use POST + JSON `{ token }` instead of GET `?token=`. */
export function verificationUsePost(): boolean {
    return process.env.NEXT_PUBLIC_VERIFICATION_VERIFY_USE_POST === "true";
}
