"use client";

export default function ContextRail({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <aside className="hidden w-[320px] shrink-0 xl:block">
            <div className="sticky top-6 rounded-ciel-lg border border-ciel-border bg-white p-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-ciel-text-soft">{title}</h3>
                <div className="mt-3 space-y-3 text-sm text-ciel-text-mid">{children}</div>
            </div>
        </aside>
    );
}
