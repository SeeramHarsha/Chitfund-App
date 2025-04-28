import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useMobileDetector } from "@/hooks/use-mobile";
import {
  Home,
  Users,
  Calendar,
  CreditCard,
  BarChart,
  User,
  Menu,
  X,
  LogOut,
  DollarSign,
  Award
} from "lucide-react";

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick?: () => void;
}

const SidebarLink = ({ href, icon, label, active, onClick }: SidebarLinkProps) => (
  <Link href={href}>
    <a
      className={cn(
        "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg mb-1",
        active
          ? "bg-primary-50 text-primary"
          : "text-gray-700 hover:bg-gray-100"
      )}
      onClick={onClick}
    >
      <span className="mr-3 text-lg">{icon}</span>
      {label}
    </a>
  </Link>
);

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useMobileDetector();

  // Close sidebar when location changes on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location, isMobile]);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => setSidebarOpen(true)}
          className="bg-white shadow-md"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Sidebar backdrop */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out md:translate-x-0 overflow-y-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-gray-800">ChitFund</span>
          </div>
          {isMobile && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarOpen(false)}
              className="md:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        <div className="p-4">
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-primary-700 font-medium">
                  {user?.name?.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>
          </div>

          <nav className="space-y-1">
            <SidebarLink
              href="/"
              icon={<Home size={20} />}
              label="Dashboard"
              active={location === "/"}
              onClick={() => setSidebarOpen(false)}
            />
            <SidebarLink
              href="/chit-groups"
              icon={<Award size={20} />}
              label="Chit Groups"
              active={location === "/chit-groups"}
              onClick={() => setSidebarOpen(false)}
            />
            {user?.role === "manager" && (
              <SidebarLink
                href="/customers"
                icon={<Users size={20} />}
                label="Customers"
                active={location === "/customers"}
                onClick={() => setSidebarOpen(false)}
              />
            )}
            <SidebarLink
              href="/auctions"
              icon={<Calendar size={20} />}
              label="Auctions"
              active={location === "/auctions"}
              onClick={() => setSidebarOpen(false)}
            />
            <SidebarLink
              href="/payments"
              icon={<CreditCard size={20} />}
              label="Payments"
              active={location === "/payments"}
              onClick={() => setSidebarOpen(false)}
            />
            {user?.role === "manager" && (
              <SidebarLink
                href="/reports"
                icon={<BarChart size={20} />}
                label="Reports"
                active={location === "/reports"}
                onClick={() => setSidebarOpen(false)}
              />
            )}
          </nav>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <nav className="space-y-1">
              <SidebarLink
                href="/profile"
                icon={<User size={20} />}
                label="Profile"
                active={location === "/profile"}
                onClick={() => setSidebarOpen(false)}
              />
              <button
                className="flex w-full items-center px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100 mb-1"
                onClick={handleLogout}
              >
                <span className="mr-3 text-lg">
                  <LogOut size={20} />
                </span>
                Logout
              </button>
            </nav>
          </div>
        </div>
      </aside>
    </>
  );
}
