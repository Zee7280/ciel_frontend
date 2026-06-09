/**
 * Official CIEL Pakistan bank account for manual transfers (reporting fee + org membership).
 * Keep all payment screens in sync with these values.
 */
export const CIEL_OFFICIAL_BANK = {
    bankName: "United Bank Limited (UBL)",
    accountTitle: "Community Impact Education Lab Pakistan",
    accountNumber: "371162266",
    iban: "PK54UNIL0109000371162266",
} as const;

export const CIEL_OFFICIAL_BANK_ROWS = [
    { label: "Bank name", value: CIEL_OFFICIAL_BANK.bankName },
    { label: "Account title", value: CIEL_OFFICIAL_BANK.accountTitle },
    { label: "Account number", value: CIEL_OFFICIAL_BANK.accountNumber },
    { label: "IBAN", value: CIEL_OFFICIAL_BANK.iban },
] as const;
