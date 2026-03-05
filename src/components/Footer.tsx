"use client";

import Link from "next/link";
import Image from "next/image";
import { Facebook, Instagram, Youtube, Twitter, Linkedin, Globe, MessageCircle } from "lucide-react";

export default function Footer() {
    return (
        <footer className="bg-white pt-20 pb-10">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
                    {/* Left Column: Brand & App Links */}
                    <div className="flex flex-col gap-6">
                        <Link href="/" className="flex flex-col items-start gap-4 group cursor-pointer">
                            <Image src="/ciel-logo-final.png" alt="CIEL Logo" width={60} height={60} className="object-contain" />
                        </Link>

                        <p className="text-slate-600 text-[15px] leading-relaxed max-w-xs font-medium opacity-90">
                            Explore opportunities, participate in projects, submit verified engagement, and generate impact intelligence aligned with SDGs.
                        </p>

                        <div className="flex flex-wrap gap-3 mt-4">
                            {/* App Store Buttons - Using Images or Styled divs if images not available */}
                            <Link href="#" className="w-[130px] h-[40px] bg-black rounded-md flex items-center justify-center gap-2 text-white">
                                <div className="text-[8px] leading-none uppercase text-left">
                                    Download on the <br /> <span className="text-sm font-bold normal-case">App Store</span>
                                </div>
                            </Link>
                            <Link href="#" className="w-[130px] h-[40px] bg-black rounded-md flex items-center justify-center gap-2 text-white">
                                <div className="text-[8px] leading-none uppercase text-left">
                                    GET IT ON <br /> <span className="text-sm font-bold normal-case">Google Play</span>
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* Middle Column 1: Company */}
                    <div>
                        <h4 className="text-slate-900 font-bold text-lg mb-6">Company</h4>
                        <ul className="space-y-4">
                            {['About Us', 'Projects', 'Services', 'FAQs'].map((item) => (
                                <li key={item}>
                                    <Link href="#" className="text-slate-500 hover:text-[#4285F4] transition-colors text-[15px] font-medium">
                                        {item}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Middle Column 2: Links */}
                    <div>
                        <h4 className="text-slate-900 font-bold text-lg mb-6">Links</h4>
                        <ul className="space-y-4">
                            {['Help Center', 'Site Map', 'Terms & Conditions'].map((item) => (
                                <li key={item}>
                                    <Link href="#" className="text-slate-500 hover:text-[#4285F4] transition-colors text-[15px] font-medium">
                                        {item}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Right Column: Contact Us */}
                    <div className="flex flex-col items-start">
                        <h4 className="text-slate-900 font-bold text-lg mb-6">Contact Us</h4>
                        <div className="mb-8">
                            <a href="mailto:support@cielpk.com" className="text-slate-500 hover:text-[#4285F4] transition-colors text-[16px] font-medium">
                                support@cielpk.com
                            </a>
                        </div>

                        <a
                            href="https://wa.me/923001234567"
                            target="_blank"
                            className="bg-[#25D366] hover:bg-[#128C7E] text-white px-6 py-3 rounded-full flex items-center gap-3 transition-all duration-300 shadow-lg hover:shadow-xl font-bold"
                        >
                            <MessageCircle className="w-5 h-5 fill-white" />
                            <span>WhatsApp Us</span>
                        </a>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                    <p className="text-slate-500 text-sm font-medium">
                        © 2026 CIEL PK. All Rights Reserved.
                    </p>

                    <div className="flex items-center gap-6">
                        {[
                            { icon: Facebook, href: '#' },
                            { icon: Twitter, href: '#' },
                            { icon: Instagram, href: '#' },
                            { icon: Linkedin, href: '#' },
                            { icon: Globe, href: '#' },
                            { icon: Youtube, href: '#' }
                        ].map((social, i) => (
                            <Link key={i} href={social.href} className="text-slate-400 hover:text-[#4285F4] transition-colors">
                                <social.icon className="w-5 h-5" />
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}
