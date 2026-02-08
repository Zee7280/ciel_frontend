import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";

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
                <main className="ml-64 p-8 flex-1 print:ml-0 print:p-0 print:w-full">
                    {children}
                </main>
            </div>
        </div>
    );
}
