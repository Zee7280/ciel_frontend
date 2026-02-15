import { Handshake } from "lucide-react";

export default function PartnersFooter() {
    return (
        <section className="py-12 px-6 border-t border-slate-100 bg-white">
            <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-4 text-emerald-600">
                    <Handshake className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Proudly Collaborating With Universities & Organizations
                </h3>
                <p className="text-xs md:text-sm text-emerald-600 font-semibold uppercase tracking-wide">
                    Partner institutions currently piloting CIEL (full list on request)
                </p>
            </div>
        </section>
    );
}
