"use client";

export type PathGuideStep = {
    emoji: string;
    title: string;
    blurb: string;
};

export default function PathHubGuide({
    kicker,
    steps,
}: {
    kicker: string;
    steps: PathGuideStep[];
}) {
    return (
        <div className="rounded-[18px] border border-[#dcebee] bg-white p-4">
            <p className="text-[8.5px] font-extrabold tracking-[0.14em] text-[#7a919a]">{kicker}</p>
            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {steps.map((s, i) => (
                    <div key={s.title} className="relative rounded-[14px] border border-[#dcebee] bg-white p-3.5">
                        <span className="absolute right-2.5 top-2 rounded-full bg-[#e6f6f4] px-2 py-0.5 text-[7.5px] font-extrabold text-[#0e7d74]">
                            {i + 1}
                        </span>
                        <div className="text-xl">{s.emoji}</div>
                        <div className="mt-1 text-[11.5px] font-extrabold text-[#0d2b33]">{s.title}</div>
                        <div className="mt-1 text-[9.5px] leading-snug text-[#7a919a]">{s.blurb}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
