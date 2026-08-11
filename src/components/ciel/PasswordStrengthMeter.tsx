"use client";

import clsx from "clsx";

export function passwordStrengthLevel(password: string): 0 | 1 | 2 | 3 | 4 {
    if (!password) return 0;
    if (password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) return 4;
    if (password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password)) return 3;
    if (password.length >= 8 && /[A-Za-z]/.test(password)) return 2;
    return 1;
}

const LABELS = ["", "Weak — must be at least 8 characters", "Acceptable — add uppercase & numbers", "Good password", "Strong password"];
const SEGMENT_CLASSES = ["bg-red-400", "bg-ciel-amber", "bg-ciel-green", "bg-ciel-green-deep"];

/** 4-segment strength meter driven by the shared `passwordStrengthLevel` scale. */
export default function PasswordStrengthMeter({ password }: { password: string }) {
    if (!password) return null;
    const level = passwordStrengthLevel(password);
    return (
        <div className="mt-2 space-y-1">
            <div className="flex gap-1">
                {[1, 2, 3, 4].map((segment) => (
                    <div
                        key={segment}
                        className={clsx(
                            "ciel-transition h-1 flex-1 rounded-full",
                            segment <= level ? SEGMENT_CLASSES[segment - 1] : "bg-ciel-border",
                        )}
                    />
                ))}
            </div>
            <p className="text-[11px] font-semibold text-ciel-text-soft">{LABELS[level]}</p>
        </div>
    );
}
