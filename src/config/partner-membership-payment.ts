/**
 * Partner membership fee / bank-transfer screen — edit copy & bank lines here only.
 * Fee amount: backend `membership-fee.defaults.ts` + optional DB settings; UI uses REPORTING_FEE_DISPLAY when feePkrOverride is set.
 */

/** PKR amount shown on screen and sent as `paid_amount` when using override below. */
export const REPORTING_FEE_DISPLAY = 1000;

export type PartnerMembershipBankRow = { label: string; value: string };

export const partnerMembershipPaymentConfig = {
    /** Page heading & intro */
    pageTitle: "Membership fee — bank transfer",
    pageIntro:
        "Transfer the amount below to the bank account, then attach your receipt or bank app screenshot (PDF/image). Admin will verify or activate your account manually.",

    /**
     * Set to `REPORTING_FEE_DISPLAY` to lock UI + submit amount here.
     * Set to `null` to use only API `/organization-membership/fee`.
     */
    feePkrOverride: REPORTING_FEE_DISPLAY as number | null,

    /** Bank “report” section (label + value rows) */
    bankSectionTitle: "Bank details — use for your transfer",
    bankRows: [
        { label: "Bank name", value: "UNITED Bank Limited (UBL)" },
        { label: "Account title", value: "CIEL International" },
        { label: "Account number", value: "0374251663933" },
        { label: "IBAN", value: "PK14UNIL0109000251663933" },
    ] satisfies PartnerMembershipBankRow[],

    referenceHint:
        "In the transfer reference / remarks, put your organization name and signup email so we can match payment.",

    /** Proof form */
    proofHint: "Bank receipt, transfer confirmation screenshot, or PDF from your bank app.",
    proofFieldLabel: "Payment proof (receipt / screenshot)",
    submitButtonLabel: "Submit bank proof",
    resubmitButtonLabel: "Submit again",

    /** Toast / success panel (after submit, bank-report style) */
    successPanelTitle: "Bank proof submitted",
    successPanelBody:
        "Your payment proof is queued for review. You will receive access after verification or if an administrator activates your account earlier.",
} as const;
