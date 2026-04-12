"use client";

import clsx from "clsx";
import { COUNTRY_DIAL_ENTRIES } from "@/utils/countryCallingCodes";

export type PhoneConnectivityRowProps = {
    /** Select value: `ISO|+dial` (see `DEFAULT_PHONE_COUNTRY_KEY`). */
    phoneCountryKey: string;
    nationalDigits: string;
    onPhoneCountryKeyChange?: (key: string) => void;
    onNationalDigitsChange?: (digits: string) => void;
    disabled?: boolean;
    readOnly?: boolean;
    errorText?: string;
    maxNationalDigits?: number;
    placeholderNational?: string;
    selectClassName?: string;
    inputClassName?: string;
    rowClassName?: string;
};

/**
 * Country calling code dropdown + national number input (matches signup / profile UX).
 */
export default function PhoneConnectivityRow({
    phoneCountryKey,
    nationalDigits,
    onPhoneCountryKeyChange,
    onNationalDigitsChange,
    disabled = false,
    readOnly = false,
    errorText,
    maxNationalDigits = 15,
    placeholderNational = "3001234567",
    selectClassName,
    inputClassName,
    rowClassName,
}: PhoneConnectivityRowProps) {
    const locked = readOnly || disabled;

    const handleNational = (e: React.ChangeEvent<HTMLInputElement>) => {
        let v = e.target.value.replace(/\D/g, "");
        if (maxNationalDigits > 0 && v.length > maxNationalDigits) v = v.slice(0, maxNationalDigits);
        onNationalDigitsChange?.(v);
    };

    return (
        <div className="space-y-1.5">
            <div className={clsx("flex gap-2", rowClassName)}>
                <select
                    value={phoneCountryKey}
                    onChange={(e) => onPhoneCountryKeyChange?.(e.target.value)}
                    disabled={locked}
                    aria-label="Country calling code"
                    className={clsx(
                        "shrink-0 min-w-[6.5rem] max-w-[40%] sm:min-w-[8.5rem] sm:max-w-[11rem] truncate rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-2 py-4 text-xs font-bold text-slate-800 outline-none focus:border-emerald-600 disabled:cursor-not-allowed disabled:opacity-70",
                        selectClassName,
                    )}
                >
                    {COUNTRY_DIAL_ENTRIES.map((e) => {
                        const key = `${e.iso2}|${e.dial}`;
                        return (
                            <option key={key} value={key} title={`${e.name} (${e.dial})`}>
                                {e.iso2} {e.dial}
                            </option>
                        );
                    })}
                </select>
                <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder={placeholderNational}
                    value={nationalDigits}
                    onChange={handleNational}
                    readOnly={readOnly}
                    disabled={disabled && !readOnly}
                    className={clsx(
                        "min-w-0 flex-1 rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-5 py-4 font-bold text-slate-800 outline-none transition-all placeholder:text-slate-300 focus:border-emerald-600 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70",
                        inputClassName,
                    )}
                />
            </div>
            {errorText ? (
                <p className="ml-1 text-[10px] font-black uppercase tracking-widest text-red-500">{errorText}</p>
            ) : null}
        </div>
    );
}
