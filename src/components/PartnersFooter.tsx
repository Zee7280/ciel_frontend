import Image from "next/image";

export default function PartnersFooter() {
    return (
        <section className="py-16 px-6 bg-white overflow-hidden">
            <div className="max-w-7xl mx-auto flex flex-col items-center">
                {/* Partners Row - Stylized to match mockup logos */}
                <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-80 group hover:opacity-100 transition-all duration-500">
                    {/* SPWT */}
                    <div className="flex flex-col items-center">
                        <span className="text-3xl font-[900] text-[#00897B] leading-none tracking-tighter italic">SPWT</span>
                        <span className="text-[10px] font-bold text-[#004D40] uppercase tracking-tighter">Safe Pakistan Welfare Trust</span>
                    </div>

                    {/* WWF */}
                    <div className="flex flex-col items-center">
                        <span className="text-4xl font-[900] text-black leading-none">WWF</span>
                    </div>

                    {/* Ist */}
                    <div className="flex flex-col items-center translate-y-1">
                        <span className="text-4xl font-[900] text-[#0D47A1] italic leading-none">Ist</span>
                    </div>

                    {/* UMT */}
                    <div className="w-16 h-16 rounded-full border-4 border-[#0D47A1] flex items-center justify-center">
                        <span className="text-xl font-black text-[#0D47A1]">UMT</span>
                    </div>

                    {/* PC */}
                    <div className="flex items-baseline gap-0.5">
                        <span className="text-4xl font-[900] text-[#D32F2F]">P</span>
                        <div className="w-6 h-6 bg-[#D32F2F] flex items-center justify-center transform rotate-12">
                            <div className="w-4 h-4 bg-white rounded-full" />
                        </div>
                        <span className="text-4xl font-[900] text-slate-800">H</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
