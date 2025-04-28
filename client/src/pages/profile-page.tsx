import { useState } from "react";
import Sidebar from "@/components/dashboard/sidebar";
import Header from "@/components/dashboard/header";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Mail, Phone, UserCircle, AtSign, CalendarDays, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import ProfileForm from "@/components/profile/profile-form";

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleEditProfile = () => {
    setIsEditing(true);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 md:ml-64 flex flex-col overflow-hidden">
        <Header 
          title="My Profile" 
          subtitle="View and manage your account details" 
        />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20">
          <div className="max-w-3xl mx-auto">
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col">
                    <CardTitle className="text-2xl">{user?.name}</CardTitle>
                    <CardDescription>Account details and preferences</CardDescription>
                  </div>
                  <Badge variant={user?.role === 'manager' ? 'default' : 'outline'} className="mt-2 sm:mt-0 w-fit capitalize">
                    {user?.role}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                    <div className="flex-shrink-0 flex justify-center">
                      <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-700 font-bold text-2xl">
                          {user?.name?.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-4 flex-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center">
                          <UserCircle className="h-5 w-5 text-gray-500 mr-2" />
                          <div>
                            <div className="text-sm text-gray-500">Username</div>
                            <div className="font-medium">{user?.username}</div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Phone className="h-5 w-5 text-gray-500 mr-2" />
                          <div>
                            <div className="text-sm text-gray-500">Phone</div>
                            <div className="font-medium">{user?.phone}</div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Mail className="h-5 w-5 text-gray-500 mr-2" />
                          <div>
                            <div className="text-sm text-gray-500">Email</div>
                            <div className="font-medium">{user?.email || "Not provided"}</div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <CalendarDays className="h-5 w-5 text-gray-500 mr-2" />
                          <div>
                            <div className="text-sm text-gray-500">Joined On</div>
                            <div className="font-medium">{new Date(user?.createdAt || "").toLocaleDateString()}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <h3 className="font-medium flex items-center">
                      <ShieldCheck className="h-5 w-5 text-gray-500 mr-2" />
                      Account Security
                    </h3>
                    <p className="text-sm text-gray-500">
                      Your account security is important. You can update your password and account details.
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button onClick={handleEditProfile}>
                  Edit Profile
                </Button>
              </CardFooter>
            </Card>
          </div>
        </main>
      </div>
      
      {isEditing && (
        <ProfileForm 
          open={isEditing} 
          onOpenChange={setIsEditing} 
          userData={user} 
        />
      )}
    </div>
  );
}
