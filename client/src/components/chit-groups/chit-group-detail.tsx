import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChitGroup, ChitGroupMember, User, Auction } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, UserPlus, Calendar, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ChitGroupForm from "./chit-group-form";

interface ChitGroupDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chitGroup: ChitGroup;
}

export default function ChitGroupDetail({
  open,
  onOpenChange,
  chitGroup,
}: ChitGroupDetailProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

  // Fetch chit group members
  const { data: members = [], isLoading: isLoadingMembers } = useQuery<
    (ChitGroupMember & { user: Partial<User> })[]
  >({
    queryKey: [`/api/chitgroups/${chitGroup.id}/members`],
    enabled: open && !!chitGroup.id,
  });

  // Fetch auctions for this chit group
  const { data: auctions = [], isLoading: isLoadingAuctions } = useQuery<
    Auction[]
  >({
    queryKey: [`/api/chitgroups/${chitGroup.id}/auctions`],
    enabled: open && !!chitGroup.id,
  });

  // Fetch customers for member addition (manager only)
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<
    User[]
  >({
    queryKey: ["/api/customers"],
    enabled: open && user?.role === "manager",
  });

  // Filter out customers already in the group
  const availableCustomers = customers.filter(
    (customer) =>
      !members.some((member) => member.user.id === customer.id)
  );

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (data: { userId: number; chitGroupId: number; joinDate: string }) => {
      const res = await apiRequest(
        "POST",
        `/api/chitgroups/${data.chitGroupId}/members`,
        data
      );
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/chitgroups/${chitGroup.id}/members`],
      });
      toast({
        title: "Member Added",
        description: "The member has been added to the chit group.",
      });
      setIsAddingMember(false);
      setSelectedCustomerId("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsAddingMember(false);
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async ({
      chitGroupId,
      userId,
    }: {
      chitGroupId: number;
      userId: number;
    }) => {
      await apiRequest(
        "DELETE",
        `/api/chitgroups/${chitGroupId}/members/${userId}`,
        undefined
      );
    },
    onSuccess: () => {
      // Invalidate both the members list and the chit groups list
      queryClient.invalidateQueries({
        queryKey: [`/api/chitgroups/${chitGroup.id}/members`],
      });
      
      // Important: Also invalidate the main chitgroups endpoint 
      // This ensures that customer's view is updated immediately
      queryClient.invalidateQueries({
        queryKey: ["/api/chitgroups"],
      });
      
      toast({
        title: "Member Removed",
        description: "The member has been removed from the chit group.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddMember = () => {
    if (!selectedCustomerId) {
      toast({
        title: "Error",
        description: "Please select a customer to add",
        variant: "destructive",
      });
      return;
    }

    setIsAddingMember(true);
    addMemberMutation.mutate({
      userId: parseInt(selectedCustomerId),
      chitGroupId: chitGroup.id,
      joinDate: new Date().toISOString().split("T")[0],
    });
  };

  const handleRemoveMember = (userId: number) => {
    if (confirm("Are you sure you want to remove this member?")) {
      removeMemberMutation.mutate({
        chitGroupId: chitGroup.id,
        userId,
      });
    }
  };

  // Calculate chit group progress
  const totalMonths = chitGroup.duration;
  const completedAuctions = auctions.filter(
    (auction) => auction.status === "completed"
  ).length;
  const progressPercentage = Math.round(
    (completedAuctions / totalMonths) * 100
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <DialogTitle className="text-2xl">{chitGroup.name}</DialogTitle>
              {user?.role === "manager" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditDialogOpen(true)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Group
                </Button>
              )}
            </div>
            <DialogDescription>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant={chitGroup.isActive ? "success" : "default"}>
                  {chitGroup.isActive ? "Active" : "Inactive"}
                </Badge>
                <Badge variant="outline">
                  Value: ₹{chitGroup.value.toLocaleString()}
                </Badge>
                <Badge variant="outline">
                  Duration: {chitGroup.duration} months
                </Badge>
                <Badge variant="outline">
                  Members: {chitGroup.membersCount}
                </Badge>
                <Badge variant="outline">
                  Started: {new Date(chitGroup.startDate).toLocaleDateString()}
                </Badge>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress</span>
                  <span>
                    {completedAuctions} of {totalMonths} months
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="members" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="auctions">Auctions</TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle>Group Members</CardTitle>
                    {user?.role === "manager" && availableCustomers.length > 0 && (
                      <div className="flex gap-2">
                        <Select
                          value={selectedCustomerId}
                          onValueChange={setSelectedCustomerId}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select customer" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Customers</SelectLabel>
                              {availableCustomers.map((customer) => (
                                <SelectItem
                                  key={customer.id}
                                  value={customer.id.toString()}
                                >
                                  {customer.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          onClick={handleAddMember}
                          disabled={isAddingMember || !selectedCustomerId}
                        >
                          {isAddingMember ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <UserPlus className="h-4 w-4 mr-2" />
                          )}
                          Add Member
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingMembers ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : members.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No members found</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Join Date</TableHead>
                          {user?.role === "manager" && (
                            <TableHead className="text-right">Actions</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell className="font-medium">
                              {member.user.name}
                            </TableCell>
                            <TableCell>{member.user.phone}</TableCell>
                            <TableCell>{member.user.email || "-"}</TableCell>
                            <TableCell>
                              {new Date(member.joinDate).toLocaleDateString()}
                            </TableCell>
                            {user?.role === "manager" && (
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() =>
                                    handleRemoveMember(member.userId)
                                  }
                                  disabled={removeMemberMutation.isPending}
                                >
                                  Remove
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="auctions" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle>Auctions</CardTitle>
                  </div>
                  <CardDescription>
                    Monthly auctions for this chit group
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingAuctions ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : auctions.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No auctions found</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Winner</TableHead>
                          <TableHead>Winning Bid</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auctions
                          .sort((a, b) => a.monthNumber - b.monthNumber)
                          .map((auction) => (
                            <TableRow key={auction.id}>
                              <TableCell>{auction.monthNumber}</TableCell>
                              <TableCell>
                                {new Date(
                                  auction.auctionDate
                                ).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    auction.status === "completed"
                                      ? "success"
                                      : auction.status === "scheduled"
                                      ? "scheduled"
                                      : "cancelled"
                                  }
                                >
                                  {auction.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {auction.winnerUserId
                                  ? members.find(
                                      (m) => m.userId === auction.winnerUserId
                                    )?.user.name || "Unknown"
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                {auction.winningBid
                                  ? `₹${auction.winningBid.toLocaleString()}`
                                  : "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {user?.role === "manager" && (
        <ChitGroupForm
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          existingData={chitGroup}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/chitgroups"] });
            onOpenChange(false);
          }}
        />
      )}
    </>
  );
}
