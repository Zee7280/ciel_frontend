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
        { name: "About Us", href: "/about" },
        { name: "Projects", href: "/projects" },
        { name: "Contact", href: "/contact" },
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
                <div className="flex items-center gap-10">
                    <button className="hidden sm:flex items-center gap-2 text-slate-500 hover:text-emerald-500 transition-colors">
                        <Globe className="w-5 h-5 text-emerald-500" />
                        <span className="font-bold text-[14px]">EN</span>
                    </button>
                    <Link href="/login" className="bg-emerald-500 text-white px-7 py-3 rounded-full text-sm font-bold hover:bg-emerald-600 hover:shadow-[0_10px_20px_-5px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 transition-all duration-300">
                        Get Started
                    </Link>
                </div>
            </div>
        </nav>
    );
}
