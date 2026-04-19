"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { isTokenValid } from "@/utils/api";
import { readStoredCurrentUser } from "@/utils/currentUser";

export default function Navbar() {
    const pathname = usePathname();
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const token = typeof window !== "undefined" ? localStorage.getItem("ciel_token") : null;
        setIsLoggedIn(isTokenValid(token) && !!readStoredCurrentUser());
    }, [pathname]);

    const navItems = [
        { name: "Home", href: "/" },
        { name: "About Us", href: "/about" },
        { name: "Projects", href: "/projects" },
        { name: "Contact Us", href: "/contact" },
    ];

    return (
        <nav className="fixed w-full z-50 transition-all duration-300 bg-white/80 backdrop-blur-2xl border-b border-slate-200/50">
            <div className="max-w-[1600px] mx-auto px-6 h-24 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-4 group cursor-pointer">
                    <div className="relative flex h-16 w-16 items-center justify-center transition-all duration-300 group-hover:scale-105">
                        <img src="/ciel-mark.svg" alt="CIEL" className="h-14 w-14 object-contain" width={56} height={56} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[18px] font-black tracking-tight text-slate-800 leading-tight">
                            Community Impact Education Lab
                        </span>
                        <span className="text-[14px] text-[#FF8A65] font-medium italic -mt-0.5">
                            Youth Empowered Community Impact
                        </span>
                    </div>
                </Link>

                {/* Navigation */}
                <div className="hidden md:flex items-center gap-10">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={clsx(
                                    "transition-all hover:text-blue-500",
                                    isActive ? "text-blue-500 font-bold" : "text-slate-600 font-medium"
                                )}
                            >
                                {item.name}
                            </Link>
                        );
                    })}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    {isLoggedIn ? (
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-sky-500 text-white rounded-full text-sm font-black hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/25 transition-all duration-300"
                        >
                            Dashboard
                        </Link>
                    ) : (
                        <>
                            <Link
                                href="/login"
                                className="hidden sm:inline-flex items-center px-6 py-2.5 rounded-full text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200"
                            >
                                Login
                            </Link>
                            <Link
                                href="/signup"
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-sky-500 text-white rounded-full text-sm font-black hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/25 transition-all duration-300"
                            >
                                Register
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
