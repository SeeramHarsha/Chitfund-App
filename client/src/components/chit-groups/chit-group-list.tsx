import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChitGroup } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Info, Users, CalendarDays, Award } from "lucide-react";
import ChitGroupForm from "./chit-group-form";
import ChitGroupDetail from "./chit-group-detail";

export default function ChitGroupList() {
  const { user } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ChitGroup | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Fetch chit groups with a short refetch interval to ensure updates are reflected
  const { data: chitGroups = [], isLoading } = useQuery<ChitGroup[]>({
    queryKey: ["/api/chitgroups"],
    enabled: !!user,
    // Add refetchInterval to make sure we get the latest data after membership changes
    refetchInterval: 5000, // Refetch every 5 seconds
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  const handleViewDetails = (group: ChitGroup) => {
    setSelectedGroup(group);
    setDetailDialogOpen(true);
  };

  if (isLoading) {
    return <ChitGroupsLoading />;
  }

  return (
    <div>
      {user?.role === "manager" && (
        <div className="mb-6 flex justify-end">
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Chit Group
          </Button>
        </div>
      )}

      {chitGroups.length === 0 ? (
        <div className="text-center py-12">
          <Award className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No Chit Groups</h3>
          <p className="mt-2 text-sm text-gray-500">
            {user?.role === "manager" 
              ? "Get started by creating your first chit group."
              : "You are not currently enrolled in any chit groups."}
          </p>
          {user?.role === "manager" && (
            <Button 
              onClick={() => setCreateDialogOpen(true)}
              className="mt-4"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Chit Group
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {chitGroups.map((group) => (
            <Card key={group.id} className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <CardDescription>
                      Value: ₹{group.value.toLocaleString()}
                    </CardDescription>
                  </div>
                  <Badge variant={group.isActive ? "success" : "default"}>
                    {group.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>
                      Duration: {group.duration} {group.duration === 1 ? "month" : "months"}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Members: {group.membersCount}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>
                      Started: {new Date(group.startDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => handleViewDetails(group)}
                >
                  <Info className="mr-2 h-4 w-4" />
                  View Details
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {user?.role === "manager" && (
        <ChitGroupForm 
          open={createDialogOpen} 
          onOpenChange={setCreateDialogOpen} 
        />
      )}

      {selectedGroup && (
        <ChitGroupDetail 
          open={detailDialogOpen} 
          onOpenChange={setDetailDialogOpen}
          chitGroup={selectedGroup}
        />
      )}
    </div>
  );
}

function ChitGroupsLoading() {
  return (
    <div>
      <div className="mb-6 flex justify-end">
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <Skeleton className="h-5 w-36 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Skeleton className="h-9 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
