"use client";

import React, { useState } from "react";
import { MessageCircle, X, Mail, Phone, HelpCircle } from "lucide-react";
import clsx from "clsx";

const WHATSAPP_E164 = "923712243575";
const WHATSAPP_DISPLAY = "0371-2243575";

function WhatsAppGlyph({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
    );
}

export default function FloatingSupportButton() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Floating support + WhatsApp (stacked bottom-right) */}
            {/* Bottom inset: clear dashboard pb-24 + mobile home indicator; avoid clipping FAB */}
            <div
                className="fixed right-4 z-[60] flex flex-col items-end gap-3 overflow-visible print:hidden sm:right-6"
                style={{
                    bottom: "calc(7rem + env(safe-area-inset-bottom, 0px))",
                }}
            >
                {/* Support Menu (appears when open, above stacks) */}
                {isOpen && (
                    <div className="absolute bottom-full right-0 mb-2 w-80 animate-in slide-in-from-bottom-4 duration-300">
                        <div className="rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-[#0056B3] to-[#0049A3] p-5">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <h3 className="text-base font-bold text-white">
                                            Need Help?
                                        </h3>
                                        <p className="text-xs text-white/80 leading-relaxed">
                                            We&apos;re here to assist you
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="text-white/80 hover:text-white transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Support Options */}
                            <div className="p-4 space-y-2">
                                <a
                                    href={`https://wa.me/${WHATSAPP_E164}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-100 hover:shadow-sm transition-all duration-200 group"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-green-500 text-white flex items-center justify-center group-hover:bg-green-600 transition-all duration-200 shadow-sm shrink-0">
                                        <WhatsAppGlyph className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="text-sm font-bold text-slate-900">WhatsApp</h4>
                                            <span className="text-[10px] font-bold uppercase tracking-wide text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                                24/7
                                            </span>
                                        </div>
                                        <div className="mt-2 inline-block rounded-lg border border-slate-200 bg-white p-1 shadow-inner">
                                            <img
                                                src="/whatsapp-support-qr.png"
                                                alt="Scan QR code to open WhatsApp chat with CIEL PK support"
                                                width={232}
                                                height={232}
                                                className="h-[6.5rem] w-[6.5rem] object-contain sm:h-28 sm:w-28"
                                                decoding="async"
                                            />
                                        </div>
                                    </div>
                                </a>

                                <a
                                    href="mailto:support@cielpk.com"
                                    className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-100 hover:shadow-sm transition-all duration-200 group"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#0056B3] flex items-center justify-center group-hover:bg-[#0056B3] group-hover:text-white transition-all duration-200 shadow-sm">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-slate-900">
                                            Email Support
                                        </h4>
                                        <p className="text-xs text-slate-500 truncate">
                                            support@cielpk.com
                                        </p>
                                    </div>
                                </a>

                                <a
                                    href="tel:+92-XXX-XXXXXXX"
                                    className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-100 hover:shadow-sm transition-all duration-200 group"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-200 shadow-sm">
                                        <Phone className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-slate-900">
                                            Call Us
                                        </h4>
                                        <p className="text-xs text-slate-500">
                                            Mon-Fri, 9am-5pm
                                        </p>
                                    </div>
                                </a>

                                <a
                                    href="/dashboard/student/help"
                                    className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-100 hover:shadow-sm transition-all duration-200 group"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all duration-200 shadow-sm">
                                        <HelpCircle className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-slate-900">
                                            Help Center
                                        </h4>
                                        <p className="text-xs text-slate-500">
                                            Browse FAQs & guides
                                        </p>
                                    </div>
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                <a
                    href={`https://wa.me/${WHATSAPP_E164}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-2xl transition-all duration-300 hover:scale-110 hover:bg-[#20bd5a] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/40 focus-visible:ring-offset-2"
                    aria-label={`WhatsApp ${WHATSAPP_DISPLAY} — 24/7 support`}
                >
                    <WhatsAppGlyph className="h-7 w-7" />
                    <span className="absolute -right-0.5 -top-0.5 rounded-full border border-white bg-green-700 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none text-white shadow-sm">
                        24/7
                    </span>
                </a>

                {/* Main support FAB */}
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={clsx(
                        "group relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full shadow-2xl transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0056B3]/30 focus-visible:ring-offset-2",
                        isOpen
                            ? "bg-slate-900 hover:bg-black rotate-90"
                            : "bg-gradient-to-br from-[#0056B3] to-[#0049A3] hover:shadow-[0_20px_40px_rgba(0,86,179,0.4)] hover:scale-110"
                    )}
                    aria-label="Support"
                >
                    {/* Pulse Animation Ring */}
                    {!isOpen && (
                        <span className="absolute inset-0 rounded-full bg-[#0056B3] animate-ping opacity-20" />
                    )}

                    {/* Icon */}
                    <div className="relative z-10">
                        {isOpen ? (
                            <X className="w-6 h-6 text-white transition-transform duration-300" />
                        ) : (
                            <MessageCircle className="w-6 h-6 text-white transition-transform duration-300 group-hover:scale-110" />
                        )}
                    </div>

                    {/* Notification Badge (optional) */}
                    {!isOpen && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-bounce">
                            !
                        </span>
                    )}
                </button>

            </div>

            {/* Backdrop (when menu is open) */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 print:hidden animate-in fade-in duration-200"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    );
}
