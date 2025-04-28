import { Bell, Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { Notification } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { user, logoutMutation } = useAuth();

  // Fetch notifications
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", {
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    enabled: !!user,
  });

  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Handle notification read
  const markAsRead = async (id: number) => {
    try {
      await apiRequest("POST", `/api/notifications/${id}/read`);
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  return (
    <div className="bg-white shadow z-10 sticky top-0">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 pl-9 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {notifications.length === 0 ? (
                <div className="py-2 px-3 text-sm text-gray-500">
                  No notifications
                </div>
              ) : (
                notifications.slice(0, 5).map((notification) => (
                  <DropdownMenuItem 
                    key={notification.id}
                    className="cursor-default"
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex flex-col gap-1 py-1 w-full">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium capitalize">
                          {notification.type} notification
                        </span>
                        <div className="flex-shrink-0">
                          {!notification.isRead && (
                            <Badge variant="info" size="sm">New</Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">{notification.message}</p>
                      <span className="text-xs text-gray-400">
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
              
              {notifications.length > 5 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <span className="text-sm text-primary w-full text-center">
                      View all notifications
                    </span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="hidden md:flex items-center border-l border-gray-200 pl-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center mr-2">
              <span className="text-primary-700 font-medium text-sm">
                {user?.name?.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <span className="text-sm font-medium">{user?.name}</span>
          </div>
        </div>
      </div>
      
      {subtitle && (
        <div className="px-4 md:px-6 py-2 border-b border-gray-200">
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
      )}
    </div>
  );
}
