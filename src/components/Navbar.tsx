"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export default function Navbar() {
    const pathname = usePathname();

    const navItems = [
        { name: "Home", href: "/" },
        { name: "How It Works", href: "/#how-it-works" },
        { name: "For Students", href: "/#for-students" },
        { name: "For Universities", href: "/#for-universities" },
    ];

    return (
        <nav className="fixed w-full z-50 transition-all duration-300 bg-white/80 backdrop-blur-2xl border-b border-slate-200/50">
            <div className="max-w-[1600px] mx-auto px-6 h-24 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-4 group cursor-pointer">
                    <div className="relative w-20 h-20 flex items-center justify-center group-hover:scale-105 transition-all duration-300">
                        <Image src="/ciel-logo-final.png" alt="CIEL Logo" width={160} height={160} className="object-contain" />
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
                </div>
            </div>
        </nav>
    );
}
