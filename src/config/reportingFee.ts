export const REPORTING_FEE_PKR = 200;

export function formatPkrAmount(amountPkr: number): string {
    return `${Math.round(amountPkr).toLocaleString("en-PK")} PKR`;
}

export const REPORTING_FEE_DISPLAY = formatPkrAmount(REPORTING_FEE_PKR);
