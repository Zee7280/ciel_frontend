import { Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";
import ProfileCompletionGate from "@/components/ProfileCompletionGate";
import WelcomeModal from "@/components/WelcomeModal";
import { DashboardChromeProvider } from "@/components/ciel/dashboard/DashboardChromeContext";
import StudentSessionGuard from "@/components/StudentSessionGuard";
export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="dashboard-shell min-h-screen min-w-0 overflow-x-clip bg-[#f4f7fa] font-sans text-[#16313d]">
            <DashboardChromeProvider>
                <StudentSessionGuard />
                <div className="print:hidden">
                    <Suspense fallback={null}>
                        <Sidebar />
                    </Suspense>
                </div>
                <div className="flex min-h-screen min-w-0 flex-1 flex-col">
                    <div className="print:hidden">
                        <DashboardHeader />
                    </div>
                    <main className="mx-auto w-full min-w-0 max-w-[1500px] flex-1 overflow-x-clip px-3 py-5 pb-[calc(6.25rem+env(safe-area-inset-bottom))] sm:px-[30px] sm:py-7 sm:pb-12 lg:ml-[var(--ciel-sidebar-width)] lg:w-[calc(100%-var(--ciel-sidebar-width))] lg:pb-12 print:ml-0 print:max-w-none print:w-full print:p-0 ciel-transition">
                        <ProfileCompletionGate>{children}</ProfileCompletionGate>
                    </main>
                </div>
                <div className="print:hidden">
                    <WelcomeModal />
                </div>
            </DashboardChromeProvider>
        </div>
    );
}
