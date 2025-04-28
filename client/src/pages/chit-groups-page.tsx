import Sidebar from "@/components/dashboard/sidebar";
import Header from "@/components/dashboard/header";
import ChitGroupList from "@/components/chit-groups/chit-group-list";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export default function ChitGroupsPage() {
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
          title="Chit Groups" 
          subtitle={user?.role === "manager" 
            ? "Create and manage your chit groups" 
            : "View your enrolled chit groups"
          } 
        />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20">
          <ChitGroupList />
        </main>
      </div>
    </div>
  );
}
