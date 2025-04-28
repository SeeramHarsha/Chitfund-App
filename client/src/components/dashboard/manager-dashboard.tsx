import { useQuery } from "@tanstack/react-query";
import { ChitGroup, Auction, Payment } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Users, CreditCard, Award, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ManagerDashboard() {
  const { user } = useAuth();

  // Fetch chit groups
  const { data: chitGroups = [], isLoading: isLoadingChitGroups } = useQuery<ChitGroup[]>({
    queryKey: ["/api/chitgroups"],
    enabled: !!user,
  });

  // Fetch all auctions
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

  // Fetch all payments
  const { data: allPayments = [], isLoading: isLoadingPayments } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
    enabled: !!user,
  });

  // Fetch all customers
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["/api/customers"],
    enabled: !!user && user.role === "manager",
  });

  // Calculate dashboard stats
  const activeChitGroups = chitGroups.filter(group => group.isActive).length;
  const totalChitValue = chitGroups.reduce((sum, group) => sum + group.value * group.membersCount, 0);
  const upcomingAuctions = allAuctions.filter(auction => 
    auction.status === "scheduled" && new Date(auction.auctionDate) > new Date()
  ).length;
  
  // Payment status data for pie chart
  const paymentStatusData = [
    { name: "Paid", value: allPayments.filter(p => p.status === "paid").length, color: "#10B981" },
    { name: "Pending", value: allPayments.filter(p => p.status === "pending").length, color: "#F59E0B" },
    { name: "Overdue", value: allPayments.filter(p => p.status === "overdue").length, color: "#EF4444" }
  ];

  // Auction data for bar chart
  const auctionData = chitGroups.slice(0, 5).map(group => {
    const groupAuctions = allAuctions.filter(a => a.chitGroupId === group.id);
    const completedCount = groupAuctions.filter(a => a.status === "completed").length;
    const scheduledCount = groupAuctions.filter(a => a.status === "scheduled").length;
    
    return {
      name: group.name.length > 15 ? group.name.substring(0, 15) + '...' : group.name,
      completed: completedCount,
      scheduled: scheduledCount
    };
  });

  const isLoading = isLoadingChitGroups || isLoadingAuctions || isLoadingPayments || isLoadingCustomers;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Chit Groups" 
          value={chitGroups.length} 
          trend={`${activeChitGroups} active`}
          icon={<Award className="h-5 w-5 text-primary" />}
        />
        <StatCard 
          title="Total Customers" 
          value={customers.length} 
          trend={`${chitGroups.reduce((sum, g) => sum + g.membersCount, 0)} memberships`}
          icon={<Users className="h-5 w-5 text-primary" />}
        />
        <StatCard 
          title="Total Chit Value" 
          value={`₹${formatNumber(totalChitValue)}`} 
          trend="Across all groups"
          icon={<CreditCard className="h-5 w-5 text-primary" />}
        />
        <StatCard 
          title="Upcoming Auctions" 
          value={upcomingAuctions} 
          trend={`${allAuctions.filter(a => a.status === "completed").length} completed`}
          icon={<Calendar className="h-5 w-5 text-primary" />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        {/* Bar Chart - Auction Status by Chit Group */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Auction Status by Chit Group</CardTitle>
            <CardDescription>Completed vs. scheduled auctions for top chit groups</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={auctionData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" stackId="a" fill="#3B82F6" name="Completed" />
                  <Bar dataKey="scheduled" stackId="a" fill="#93C5FD" name="Scheduled" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart - Payment Status */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Payment Status</CardTitle>
            <CardDescription>Distribution of payment statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {paymentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} payments`, 'Count']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
          <CardDescription>Latest auctions and payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {allAuctions
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 5)
              .map(auction => {
                const chitGroup = chitGroups.find(g => g.id === auction.chitGroupId);
                return (
                  <div key={auction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Auction for {chitGroup?.name}</p>
                        <p className="text-xs text-gray-500">
                          Month {auction.monthNumber} · {new Date(auction.auctionDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={
                        auction.status === "completed" ? "success" :
                        auction.status === "scheduled" ? "scheduled" : "cancelled"
                      }
                    >
                      {auction.status}
                    </Badge>
                  </div>
                );
              })}
            
            {allAuctions.length === 0 && (
              <div className="text-center py-10 text-gray-500">
                No auctions recorded yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, trend, icon }: { title: string; value: string | number; trend: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <h3 className="text-2xl font-bold">{value}</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
            {icon}
          </div>
        </div>
        <div className="text-xs text-gray-500">{trend}</div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                </div>
                <Skeleton className="w-10 h-10 rounded-full" />
              </div>
              <Skeleton className="h-3 w-16 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        <Card className="lg:col-span-4">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full rounded-full" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-20 w-full mb-3" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function formatNumber(num: number) {
  return new Intl.NumberFormat('en-IN').format(num);
}
