import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";
import ProfileCompletionGate from "@/components/ProfileCompletionGate";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <div className="print:hidden">
                <Sidebar />
            </div>
            <div className="flex-1 flex flex-col min-h-screen">
                <div className="print:hidden">
                    <DashboardHeader />
                </div>
                <main className="flex-1 p-4 pb-24 sm:p-6 lg:ml-64 lg:p-8 lg:pb-8 print:ml-0 print:p-0 print:w-full">
                    <ProfileCompletionGate>{children}</ProfileCompletionGate>
                </main>
            </div>
        </div>
    );
}
