import Sidebar from "@/components/dashboard/sidebar";
import Header from "@/components/dashboard/header";
import ManagerDashboard from "@/components/dashboard/manager-dashboard";
import CustomerDashboard from "@/components/dashboard/customer-dashboard";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 md:ml-64 flex flex-col overflow-hidden">
        <Header 
          title="Dashboard" 
          subtitle={`Welcome back, ${user?.name}! Here's your overview.`} 
        />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20">
          {user?.role === "manager" ? (
            <ManagerDashboard />
          ) : (
            <CustomerDashboard />
          )}
        </main>
      </div>
    </div>
  );
}
