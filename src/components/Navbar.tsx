"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Menu, X } from "lucide-react";
import { isTokenValid } from "@/utils/api";
import { readStoredCurrentUser } from "@/utils/currentUser";

export default function Navbar() {
    const pathname = usePathname();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    useEffect(() => {
        const token = typeof window !== "undefined" ? localStorage.getItem("ciel_token") : null;
        setIsLoggedIn(isTokenValid(token) && !!readStoredCurrentUser());
    }, [pathname]);

    useEffect(() => {
        setMobileNavOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!mobileNavOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [mobileNavOpen]);

    const navItems = [
        { name: "Home", href: "/", prefixMatch: false },
        { name: "About Us", href: "/about", prefixMatch: false },
        { name: "Projects", href: "/projects", prefixMatch: true },
        { name: "Tutorials", href: "/tutorials", prefixMatch: true },
        { name: "Contact Us", href: "/contact", prefixMatch: false },
    ];

    return (
        <nav className="fixed w-full z-50 transition-all duration-300 bg-white/80 backdrop-blur-2xl border-b border-slate-200/50">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-24 flex items-center justify-between gap-3 min-w-0">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 sm:gap-4 group cursor-pointer min-w-0 flex-1 md:flex-none">
                    <div className="relative flex h-12 w-12 sm:h-16 sm:w-16 shrink-0 items-center justify-center transition-all duration-300 group-hover:scale-105">
                        <img src="/iel-pk-logo.png" alt="IEL PK" className="h-10 w-10 sm:h-14 sm:w-14 object-contain" width={56} height={56} />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm sm:text-[18px] font-black tracking-tight text-slate-800 leading-tight line-clamp-2 sm:line-clamp-none">
                            Community Impact Education Lab
                        </span>
                        <span className="text-[11px] sm:text-[14px] text-[#FF8A65] font-medium italic -mt-0.5 line-clamp-1">
                            Youth Empowered Community Impact
                        </span>
                    </div>
                </Link>

                {/* Desktop navigation */}
                <div className="hidden md:flex items-center gap-10 shrink-0">
                    {navItems.map((item) => {
                        const isActive = item.prefixMatch
                            ? pathname === item.href || pathname.startsWith(`${item.href}/`)
                            : pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={clsx(
                                    "transition-all hover:text-blue-500",
                                    isActive ? "text-blue-500 font-bold" : "text-slate-600 font-medium",
                                )}
                            >
                                {item.name}
                            </Link>
                        );
                    })}
                </div>

                {/* Actions + mobile menu */}
                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    {isLoggedIn ? (
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-2.5 bg-gradient-to-r from-emerald-500 to-sky-500 text-white rounded-full text-xs sm:text-sm font-black hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/25 transition-all duration-300"
                        >
                            Dashboard
                        </Link>
                    ) : (
                        <>
                            <Link
                                href="/login"
                                className="hidden md:inline-flex items-center px-6 py-2.5 rounded-full text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200"
                            >
                                Login
                            </Link>
                            <Link
                                href="/signup"
                                className="inline-flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-2.5 bg-gradient-to-r from-emerald-500 to-sky-500 text-white rounded-full text-xs sm:text-sm font-black hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/25 transition-all duration-300"
                            >
                                Register
                            </Link>
                        </>
                    )}

                    <button
                        type="button"
                        className="inline-flex md:hidden h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:bg-slate-50"
                        aria-expanded={mobileNavOpen}
                        aria-controls="main-mobile-nav"
                        aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
                        onClick={() => setMobileNavOpen((o) => !o)}
                    >
                        {mobileNavOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile menu panel */}
            {mobileNavOpen ? (
                <>
                    <button
                        type="button"
                        className="fixed inset-0 top-24 z-40 bg-slate-900/40 md:hidden"
                        aria-hidden
                        onClick={() => setMobileNavOpen(false)}
                    />
                    <div
                        id="main-mobile-nav"
                        className="fixed inset-x-0 top-24 z-50 max-h-[min(32rem,calc(100vh-6rem))] overflow-y-auto border-b border-slate-200 bg-white shadow-xl md:hidden"
                        role="dialog"
                        aria-label="Site menu"
                    >
                        <div className="max-w-[1600px] mx-auto px-4 py-5 flex flex-col gap-1">
                            {navItems.map((item) => {
                                const isActive = item.prefixMatch
                                    ? pathname === item.href || pathname.startsWith(`${item.href}/`)
                                    : pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={() => setMobileNavOpen(false)}
                                        className={clsx(
                                            "rounded-xl px-4 py-3.5 text-base font-bold transition-colors",
                                            isActive ? "bg-blue-50 text-blue-600" : "text-slate-800 hover:bg-slate-50",
                                        )}
                                    >
                                        {item.name}
                                    </Link>
                                );
                            })}
                            <div className="mt-4 border-t border-slate-100 pt-4 flex flex-col gap-3">
                                {isLoggedIn ? (
                                    <Link
                                        href="/dashboard"
                                        onClick={() => setMobileNavOpen(false)}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-3.5 text-sm font-black text-white shadow-md"
                                    >
                                        Go to dashboard
                                    </Link>
                                ) : (
                                    <>
                                        <Link
                                            href="/login"
                                            onClick={() => setMobileNavOpen(false)}
                                            className="inline-flex items-center justify-center rounded-xl border-2 border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-800 hover:bg-slate-50"
                                        >
                                            Login
                                        </Link>
                                        <Link
                                            href="/signup"
                                            onClick={() => setMobileNavOpen(false)}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-3.5 text-sm font-black text-white shadow-md"
                                        >
                                            Register
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            ) : null}
        </nav>
    );
}
