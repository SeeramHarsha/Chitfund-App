import Sidebar from "@/components/dashboard/sidebar";
import Header from "@/components/dashboard/header";
import CustomerList from "@/components/customers/customer-list";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export default function CustomersPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // This page is manager-only, but the ProtectedRoute component also handles this
  if (user?.role !== "manager") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 md:ml-64 flex flex-col overflow-hidden">
        <Header 
          title="Customers" 
          subtitle="Manage customer accounts and profiles" 
        />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20">
          <CustomerList />
        </main>
      </div>
    </div>
  );
}
