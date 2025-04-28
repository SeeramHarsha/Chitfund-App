import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChitGroup, Auction, User, ChitGroupMember } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Calendar, Gavel, Plus, Search, Edit } from "lucide-react";
import AuctionForm from "./auction-form";

export default function AuctionList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [filterChitGroup, setFilterChitGroup] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch chit groups
  const { data: chitGroups = [], isLoading: isLoadingChitGroups } = useQuery<
    ChitGroup[]
  >({
    queryKey: ["/api/chitgroups"],
    enabled: !!user,
  });

  // Fetch auctions for all chit groups
  const { data: allAuctions = [], isLoading: isLoadingAuctions } = useQuery<
    Auction[]
  >({
    queryKey: ["/api/auctions"],
    queryFn: async () => {
      // Fetch auctions for all chit groups
      const auctionsPromises = chitGroups.map((group) =>
        fetch(`/api/chitgroups/${group.id}/auctions`, {
          credentials: "include",
        }).then((res) => {
          if (!res.ok) throw new Error("Failed to fetch auctions");
          return res.json();
        })
      );

      const auctionsArrays = await Promise.all(auctionsPromises);
      return auctionsArrays.flat();
    },
    enabled: !!chitGroups.length,
  });

  // Apply filters and search
  const filteredAuctions = allAuctions.filter((auction) => {
    const matchesChitGroup =
      filterChitGroup === "all" ||
      auction.chitGroupId.toString() === filterChitGroup;
    const matchesStatus =
      filterStatus === "all" || auction.status === filterStatus;

    // For search, we look at the chit group name
    const chitGroup = chitGroups.find((g) => g.id === auction.chitGroupId);
    const matchesSearch = chitGroup
      ? chitGroup.name.toLowerCase().includes(searchTerm.toLowerCase())
      : false;

    return matchesChitGroup && matchesStatus && (searchTerm ? matchesSearch : true);
  });

  // Sort auctions by date (most recent first)
  const sortedAuctions = [...filteredAuctions].sort(
    (a, b) => new Date(b.auctionDate).getTime() - new Date(a.auctionDate).getTime()
  );

  const isLoading = isLoadingChitGroups || isLoadingAuctions;

  const handleEdit = (auction: Auction) => {
    setSelectedAuction(auction);
    setEditDialogOpen(true);
  };

  const handlePlaceBid = (auction: Auction) => {
    // In a real implementation, this would open a bid form
    toast({
      title: "Place Bid",
      description: "Bid functionality would be implemented here.",
    });
  };

  if (isLoading) {
    return <AuctionsLoading />;
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Search by chit group..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Select
            value={filterChitGroup}
            onValueChange={setFilterChitGroup}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Chit Groups</SelectItem>
              {chitGroups.map((group) => (
                <SelectItem key={group.id} value={group.id.toString()}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filterStatus}
            onValueChange={setFilterStatus}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {user?.role === "manager" && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Calendar className="mr-2 h-4 w-4" />
            Schedule Auction
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Auctions</CardTitle>
          <CardDescription>
            {user?.role === "manager"
              ? "Schedule and manage auctions for your chit groups"
              : "View upcoming and past auctions for your chit groups"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedAuctions.length === 0 ? (
            <div className="text-center py-12">
              <Gavel className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                {searchTerm || filterChitGroup !== "all" || filterStatus !== "all"
                  ? "No auctions match your filters"
                  : "No auctions found"}
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {searchTerm || filterChitGroup !== "all" || filterStatus !== "all"
                  ? "Try changing your search or filters"
                  : user?.role === "manager"
                  ? "Get started by scheduling your first auction."
                  : "No auctions have been scheduled for your chit groups yet."}
              </p>
              {user?.role === "manager" &&
                !(searchTerm || filterChitGroup !== "all" || filterStatus !== "all") && (
                  <Button
                    onClick={() => setCreateDialogOpen(true)}
                    className="mt-4"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Schedule Auction
                  </Button>
                )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chit Group</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Winner</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAuctions.map((auction) => {
                    const chitGroup = chitGroups.find(
                      (g) => g.id === auction.chitGroupId
                    );
                    return (
                      <TableRow key={auction.id}>
                        <TableCell className="font-medium">
                          {chitGroup?.name || "Unknown Group"}
                        </TableCell>
                        <TableCell>{auction.monthNumber}</TableCell>
                        <TableCell>
                          {new Date(auction.auctionDate).toLocaleDateString()}
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
                            ? `User #${auction.winnerUserId}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {auction.winningBid
                            ? `₹${auction.winningBid.toLocaleString()}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {user?.role === "manager" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(auction)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          ) : auction.status === "scheduled" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePlaceBid(auction)}
                            >
                              <Gavel className="h-4 w-4 mr-1" />
                              Place Bid
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {user?.role === "manager" && (
        <>
          <AuctionForm
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            chitGroups={chitGroups}
          />

          {selectedAuction && (
            <AuctionForm
              open={editDialogOpen}
              onOpenChange={setEditDialogOpen}
              chitGroups={chitGroups}
              existingData={selectedAuction}
              onSuccess={() => {
                setSelectedAuction(null);
                queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

function AuctionsLoading() {
  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-[180px]" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Skeleton className="h-4 w-32" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-4 w-16" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-4 w-24" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-4 w-24" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-4 w-16" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-8" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-16 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
