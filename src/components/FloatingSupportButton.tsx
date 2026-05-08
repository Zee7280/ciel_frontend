"use client";

import React, { useState } from "react";
import { MessageCircle, X, Mail, Phone, HelpCircle } from "lucide-react";
import clsx from "clsx";

export default function FloatingSupportButton() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Floating Button */}
            <div className="fixed bottom-6 right-6 z-50 print:hidden">
                {/* Support Menu (appears when open) */}
                {isOpen && (
                    <div className="absolute bottom-20 right-0 w-80 mb-2 animate-in slide-in-from-bottom-4 duration-300">
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
                                    href="mailto:support@ciel.edu.pk"
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
                                            support@ciel.edu.pk
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

                            {/* Footer */}
                            <div className="px-4 pb-4 pt-2">
                                <div className="text-center">
                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                                        Average response time: 2 hours
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Floating Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={clsx(
                        "group relative flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0056B3]/30 focus-visible:ring-offset-2",
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

                {/* Tooltip */}
                {!isOpen && (
                    <div className="absolute bottom-16 right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <div className="bg-slate-900 text-white text-xs font-medium px-3 py-2 rounded-lg shadow-xl whitespace-nowrap">
                            Need help? Chat with us
                            <div className="absolute -bottom-1 right-5 w-2 h-2 bg-slate-900 rotate-45" />
                        </div>
                    </div>
                )}
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
