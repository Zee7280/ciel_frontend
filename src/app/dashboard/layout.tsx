import { Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";
import ProfileCompletionGate from "@/components/ProfileCompletionGate";
import WelcomeModal from "@/components/WelcomeModal";
export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#f4f7fa] font-sans text-[#16313d]">
            <div className="print:hidden">
                <Suspense fallback={null}>
                    <Sidebar />
                </Suspense>
            </div>
            <div className="flex-1 flex flex-col min-h-screen">
                <div className="print:hidden">
                    <DashboardHeader />
                </div>
                <main className="mx-auto w-full max-w-[1500px] flex-1 px-[18px] py-7 pb-24 sm:px-[30px] sm:pb-12 lg:ml-[var(--ciel-sidebar-width)] lg:w-[calc(100%-var(--ciel-sidebar-width))] lg:pb-12 print:ml-0 print:max-w-none print:w-full print:p-0 ciel-transition">
                    <ProfileCompletionGate>{children}</ProfileCompletionGate>
                </main>
            </div>
            <div className="print:hidden">
                <WelcomeModal />
            </div>
        </div>
    );
}
