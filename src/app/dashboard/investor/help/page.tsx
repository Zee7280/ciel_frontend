"use client";

import Link from "next/link";

export default function InvestorHelpPage() {
    return (
        <div className="mx-auto max-w-2xl rounded-[22px] bg-white p-8 shadow-[0_8px_30px_rgba(10,30,40,.08)]">
            <h1 className="text-2xl font-bold text-[#14212b]">Help & Deal Desk</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-[#5d6c78]">
                CIEL PK Investor Hub: faculty-verified ventures, permissioned introductions, watermarked diligence rooms, and Deal Desk verification.
                Founder contact is never shared until CIEL PK approves your request and the founder accepts.
            </p>
            <p className="mt-4 text-[14px] text-[#5d6c78]">
                Deal Desk · dealdesk@cielpk.org · replies within 2 working days.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
                <Link href="/dashboard/investor?view=agreements" className="rounded-xl bg-[#0e2530] px-4 py-2 text-[13.5px] font-bold text-white">
                    Agreements & protection
                </Link>
                <Link href="/dashboard/investor?view=inbox" className="rounded-xl bg-[#eef3f6] px-4 py-2 text-[13.5px] font-bold text-[#0b4b57]">
                    Message Deal Desk
                </Link>
            </div>
        </div>
    );
}
