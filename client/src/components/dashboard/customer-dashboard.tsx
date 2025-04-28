import { useQuery } from "@tanstack/react-query";
import { ChitGroup, Auction, Payment } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { Progress } from "@/components/ui/progress";
import { Calendar, CreditCard, ArrowUpRight, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch customer's chit groups
  const { data: chitGroups = [], isLoading: isLoadingChitGroups } = useQuery<ChitGroup[]>({
    queryKey: ["/api/chitgroups"],
    enabled: !!user,
  });

  // Fetch all auctions for the customer's chit groups
  const { data: allAuctions = [], isLoading: isLoadingAuctions } = useQuery<Auction[]>({
    queryKey: ["/api/auctions"],
    queryFn: async () => {
      // Fetch auctions for all chit groups
      const auctionsPromises = chitGroups.map(group => 
        fetch(`/api/chitgroups/${group.id}/auctions`, { 
          credentials: "include" 
        }).then(res => {
          if (!res.ok) throw new Error("Failed to fetch auctions");
          return res.json();
        })
      );
      
      const auctionsArrays = await Promise.all(auctionsPromises);
      return auctionsArrays.flat();
    },
    enabled: !!chitGroups.length,
  });

  // Fetch customer's payments
  const { data: payments = [], isLoading: isLoadingPayments } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
    enabled: !!user,
  });

  const isLoading = isLoadingChitGroups || isLoadingAuctions || isLoadingPayments;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Get upcoming auctions
  const upcomingAuctions = allAuctions
    .filter(auction => 
      auction.status === "scheduled" && new Date(auction.auctionDate) > new Date()
    )
    .sort((a, b) => new Date(a.auctionDate).getTime() - new Date(b.auctionDate).getTime());

  // Get recent payments
  const recentPayments = payments
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
    .slice(0, 5);

  // Calculate payment status percentages
  const totalPayments = payments.length;
  const paidPayments = payments.filter(p => p.status === "paid").length;
  const pendingPayments = payments.filter(p => p.status === "pending").length;
  const overduePayments = payments.filter(p => p.status === "overdue").length;

  const paidPercentage = totalPayments ? Math.round((paidPayments / totalPayments) * 100) : 0;
  const pendingPercentage = totalPayments ? Math.round((pendingPayments / totalPayments) * 100) : 0;
  const overduePercentage = totalPayments ? Math.round((overduePayments / totalPayments) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card className="bg-gradient-to-r from-primary to-blue-600 text-white">
        <CardContent className="pt-6">
          <h2 className="text-2xl font-bold mb-2">Welcome back, {user?.name}!</h2>
          <p className="opacity-90 mb-4">
            You are currently enrolled in {chitGroups.length} chit {chitGroups.length === 1 ? 'group' : 'groups'}.
          </p>
          <Button 
            variant="secondary" 
            className="bg-white text-primary hover:bg-gray-100"
            onClick={() => setLocation("/chit-groups")}
          >
            View My Chit Groups
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-gray-500">My Chit Groups</p>
                <h3 className="text-2xl font-bold">{chitGroups.length}</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <Award className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {chitGroups.filter(g => g.isActive).length} active groups
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-gray-500">Upcoming Auctions</p>
                <h3 className="text-2xl font-bold">{upcomingAuctions.length}</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Next auction: {upcomingAuctions.length > 0 
                ? new Date(upcomingAuctions[0].auctionDate).toLocaleDateString() 
                : 'None scheduled'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-gray-500">Payment Status</p>
                <h3 className="text-2xl font-bold">
                  {overduePayments > 0 ? 'Attention Needed' : 'Good Standing'}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {overduePayments} overdue, {pendingPayments} pending
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Progress</CardTitle>
          <CardDescription>Status of your payments across all chit groups</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Paid</span>
                <span>{paidPercentage}%</span>
              </div>
              <Progress value={paidPercentage} className="h-2 bg-gray-100" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Pending</span>
                <span>{pendingPercentage}%</span>
              </div>
              <Progress value={pendingPercentage} className="h-2 bg-gray-100" indicatorColor="bg-yellow-500" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Overdue</span>
                <span>{overduePercentage}%</span>
              </div>
              <Progress value={overduePercentage} className="h-2 bg-gray-100" indicatorColor="bg-red-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Auctions and Recent Payments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Auctions</CardTitle>
            <CardDescription>Auctions scheduled for your chit groups</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingAuctions.slice(0, 3).map(auction => {
                const chitGroup = chitGroups.find(g => g.id === auction.chitGroupId);
                return (
                  <div key={auction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{chitGroup?.name}</p>
                        <p className="text-xs text-gray-500">
                          Month {auction.monthNumber} · {new Date(auction.auctionDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="scheduled">Upcoming</Badge>
                  </div>
                );
              })}
              
              {upcomingAuctions.length === 0 && (
                <div className="text-center py-10 text-gray-500">
                  No upcoming auctions
                </div>
              )}
            </div>
            
            {upcomingAuctions.length > 0 && (
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => setLocation("/auctions")}
              >
                View All Auctions
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>Your latest payments across all chit groups</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPayments.map(payment => {
                const chitGroup = chitGroups.find(g => g.id === payment.chitGroupId);
                return (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">₹{payment.amount.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">
                          {chitGroup?.name} · Month {payment.monthNumber}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={
                        payment.status === "paid" ? "success" :
                        payment.status === "pending" ? "pending" : "destructive"
                      }
                    >
                      {payment.status}
                    </Badge>
                  </div>
                );
              })}
              
              {recentPayments.length === 0 && (
                <div className="text-center py-10 text-gray-500">
                  No payment records found
                </div>
              )}
            </div>
            
            {payments.length > 0 && (
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => setLocation("/payments")}
              >
                View All Payments
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 w-full" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                </div>
                <Skeleton className="w-10 h-10 rounded-full" />
              </div>
              <Skeleton className="h-3 w-36 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-10" />
            </div>
            <Skeleton className="h-2 w-full" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-10" />
            </div>
            <Skeleton className="h-2 w-full" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-10" />
            </div>
            <Skeleton className="h-2 w-full" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map(i => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              {[1, 2, 3].map(j => (
                <Skeleton key={j} className="h-16 w-full mb-3" />
              ))}
              <Skeleton className="h-10 w-full mt-4" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
