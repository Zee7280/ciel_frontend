"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * The certificate is a fixed 210mm×297mm (A4) artifact — every internal measurement (corner
 * decorations, table columns, metric grid) is tuned for that exact design width, so it can't be
 * reflowed responsively without redesigning the artwork itself. Instead, this shell measures the
 * certificate's natural (unscaled) size and shrinks it uniformly (CSS `transform: scale`) to fit
 * whatever width it's actually given — same "fit one page" idea the print path already uses via
 * `--cert-print-scale` in globals.css, just applied continuously on screen instead of only at
 * print time. Below ~210mm-wide containers (most phones/tablets) this is what stops the
 * certificate from forcing horizontal overflow or, worse, being silently clipped by an ancestor
 * with `overflow-x: clip` (see globals.css `html, body`).
 *
 * Print is untouched: `@media print` rules in certificate-print.css force this shell's transform
 * back to `none` so the pre-existing `--cert-print-scale` logic (Section11Summary.tsx) — which
 * measures the certificate at its true, unscaled size — keeps working exactly as before.
 */
export default function CertificateScaleShell({ children }: { children: React.ReactNode }) {
    const outerRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [offsetX, setOffsetX] = useState(0);
    const [scaledHeight, setScaledHeight] = useState<number | null>(null);

    useLayoutEffect(() => {
        const outer = outerRef.current;
        const inner = innerRef.current;
        if (!outer || !inner) return;

        const recalc = () => {
            // offsetWidth/offsetHeight are layout-box measurements — `transform` is purely visual
            // and never affects them, so these stay the certificate's true, unscaled size even
            // after a previous rescale has already been applied.
            const naturalWidth = inner.offsetWidth;
            const naturalHeight = inner.offsetHeight;
            const available = outer.clientWidth;
            if (naturalWidth <= 0 || naturalHeight <= 0 || available <= 0) return;

            const next = Math.min(1, available / naturalWidth);
            // Centering an element WIDER than its container via `margin:auto` is unreliable
            // combined with `transform:scale` (the browser resolves the auto margins against the
            // unscaled box, and `transform-origin:center` then shrinks toward that off-center
            // point — in practice this renders pinned to one edge instead of centered). Compute
            // the centering offset explicitly in px instead, against `transform-origin:top left`.
            setScale(next);
            setOffsetX(Math.max(0, Math.round((available - naturalWidth * next) / 2)));
            setScaledHeight(Math.ceil(naturalHeight * next));
        };

        recalc();
        const ro = new ResizeObserver(recalc);
        ro.observe(outer);
        ro.observe(inner);
        window.addEventListener("resize", recalc);
        return () => {
            ro.disconnect();
            window.removeEventListener("resize", recalc);
        };
    }, []);

    return (
        <div
            ref={outerRef}
            className="cert-scale-outer w-full"
            style={scaledHeight != null ? { height: scaledHeight } : undefined}
        >
            <div
                ref={innerRef}
                className="cert-scale-inner"
                style={{ transform: `scale(${scale})`, marginLeft: offsetX }}
            >
                {children}
            </div>
        </div>
    );
}
