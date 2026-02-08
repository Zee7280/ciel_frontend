export default function PartnersFooter() {
    return (
        <section className="py-16 px-6 border-t border-slate-100 bg-white">
            <div className="max-w-7xl mx-auto text-center">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-10">
                    Trusted By Leading Universities & Organization
                </h3>

                <div className="flex flex-wrap items-center justify-center gap-12 md:gap-20 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-700 rounded-full flex items-center justify-center text-white font-serif font-bold text-xl shadow-md">H</div>
                        <span className="font-bold text-slate-800 text-2xl tracking-tighter">HEC</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="font-serif text-3xl text-red-600 italic font-bold">CocaCola</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-blue-800 rounded-bl-xl rounded-tr-xl flex items-center justify-center text-white font-bold text-xs">N</div>
                        <span className="font-bold text-slate-800 text-2xl tracking-widest">NUST</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md">A</div>
                        <span className="font-bold text-slate-800 text-lg uppercase tracking-tight">Akhuwat University</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
