"use client";

import Link from "next/link";
import Image from "next/image";
import { Globe } from "lucide-react";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export default function Navbar() {
    const pathname = usePathname();

    const navItems = [
        { name: "Home", href: "/" },
        { name: "Projects", href: "/projects" },
        { name: "Contact", href: "/contact" }, // Changed Dashboard to Contact
        { name: "About Us", href: "/about" },
    ];

    return (
        <nav className="fixed w-full z-50 transition-all duration-300 bg-white/80 backdrop-blur-2xl border-b border-slate-200/50">
            <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 group cursor-pointer">
                    <div className="relative w-14 h-14 flex items-center justify-center group-hover:scale-105 transition-all duration-300">
                        <Image src="/ciel-logo-v2.png" alt="CIEL Logo" width={56} height={56} className="object-contain" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-2xl font-black tracking-tight text-slate-900 leading-none">
                            CIEL <span className="text-emerald-500">PK</span>
                        </span>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                            Education Lab
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
                                    "relative text-sm font-bold transition-all hover:text-emerald-500 tracking-wide",
                                    isActive ? "text-emerald-500" : "text-slate-500"
                                )}
                            >
                                {item.name}
                                {isActive && (
                                    <span className="absolute -bottom-2 left-0 w-full h-1 bg-emerald-500 rounded-full shadow-[0_2px_10px_rgba(16,185,129,0.4)]" />
                                )}
                            </Link>
                        );
                    })}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4">
                    <button className="hidden sm:flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-full transition-all">
                        <Globe className="w-4 h-4 text-emerald-500" /> EN
                    </button>
                    <Link href="/login" className="bg-emerald-500 text-white px-7 py-3 rounded-full text-sm font-bold hover:bg-emerald-600 hover:shadow-[0_10px_20px_-5px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 transition-all duration-300">
                        Get Started
                    </Link>
                </div>
            </div>
        </nav>
    );
}
