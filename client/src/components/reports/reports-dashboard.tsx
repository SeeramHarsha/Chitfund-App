import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChitGroup, Payment, Auction } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Download, Loader2 } from "lucide-react";

export default function ReportsDashboard() {
  const { user } = useAuth();
  const [selectedChitGroup, setSelectedChitGroup] = useState<string>("all");
  const [reportType, setReportType] = useState<string>("payment");

  // Fetch all data needed for reports
  const { data: chitGroups = [], isLoading: isLoadingChitGroups } = useQuery<ChitGroup[]>({
    queryKey: ["/api/chitgroups"],
    enabled: !!user,
  });

  // Fetch all payments
  const { data: payments = [], isLoading: isLoadingPayments } = useQuery<any[]>({
    queryKey: ["/api/payments"],
    enabled: !!user,
  });

  // Fetch auctions for all chit groups
  const { data: allAuctions = [], isLoading: isLoadingAuctions } = useQuery<Auction[]>({
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

  const isLoading = isLoadingChitGroups || isLoadingPayments || isLoadingAuctions;

  // Filter data based on selected chit group
  const filteredPayments = payments.filter(
    (payment) => selectedChitGroup === "all" || payment.chitGroupId.toString() === selectedChitGroup
  );

  const filteredAuctions = allAuctions.filter(
    (auction) => selectedChitGroup === "all" || auction.chitGroupId.toString() === selectedChitGroup
  );

  // Prepare data for payment status chart
  const paymentStatusData = [
    { name: "Paid", value: filteredPayments.filter(p => p.status === "paid").length, color: "#10B981" },
    { name: "Pending", value: filteredPayments.filter(p => p.status === "pending").length, color: "#F59E0B" },
    { name: "Overdue", value: filteredPayments.filter(p => p.status === "overdue").length, color: "#EF4444" }
  ];

  // Prepare data for auction status chart
  const auctionStatusData = [
    { name: "Scheduled", value: filteredAuctions.filter(a => a.status === "scheduled").length, color: "#6366F1" },
    { name: "Completed", value: filteredAuctions.filter(a => a.status === "completed").length, color: "#10B981" },
    { name: "Cancelled", value: filteredAuctions.filter(a => a.status === "cancelled").length, color: "#EF4444" }
  ];

  // Prepare data for monthly payment trend
  const monthlyPaymentData = (() => {
    // Group payments by month
    const paymentsByMonth: Record<string, { paid: number; pending: number; overdue: number }> = {};
    
    filteredPayments.forEach(payment => {
      const date = new Date(payment.paymentDate);
      const month = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear();
      const key = `${month} ${year}`;
      
      if (!paymentsByMonth[key]) {
        paymentsByMonth[key] = { paid: 0, pending: 0, overdue: 0 };
      }
      
      paymentsByMonth[key][payment.status as 'paid' | 'pending' | 'overdue']++;
    });
    
    // Convert to array for chart
    return Object.entries(paymentsByMonth).map(([month, counts]) => ({
      month,
      ...counts
    }));
  })();

  // Get summary totals
  const totalPaid = filteredPayments.filter(p => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
  const totalPending = filteredPayments.filter(p => p.status === "pending").reduce((sum, p) => sum + p.amount, 0);
  const totalOverdue = filteredPayments.filter(p => p.status === "overdue").reduce((sum, p) => sum + p.amount, 0);

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleExportReport = () => {
    // In a real implementation, this would generate and download a report
    alert("In a production system, this would generate and download a " + reportType + " report.");
  };

  if (isLoading) {
    return <ReportsLoading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Reports Dashboard</h2>
          <p className="text-gray-500">
            View and analyze chit fund performance
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Select
            value={selectedChitGroup}
            onValueChange={setSelectedChitGroup}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Select Chit Group" />
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
          
          <div className="flex gap-2">
            <Select
              value={reportType}
              onValueChange={setReportType}
            >
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="payment">Payment Report</SelectItem>
                <SelectItem value="auction">Auction Report</SelectItem>
                <SelectItem value="summary">Summary Report</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={handleExportReport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Total Paid</p>
              <h3 className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</h3>
              <p className="text-xs text-gray-500">
                {filteredPayments.filter(p => p.status === "paid").length} payments
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Total Pending</p>
              <h3 className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPending)}</h3>
              <p className="text-xs text-gray-500">
                {filteredPayments.filter(p => p.status === "pending").length} payments
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Total Overdue</p>
              <h3 className="text-2xl font-bold text-red-600">{formatCurrency(totalOverdue)}</h3>
              <p className="text-xs text-gray-500">
                {filteredPayments.filter(p => p.status === "overdue").length} payments
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Status Distribution</CardTitle>
            <CardDescription>
              Overview of payment statuses across all chit groups
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => 
                      percent > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''
                    }
                  >
                    {paymentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} payments`, 'Count']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Payment Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Payment Trend</CardTitle>
            <CardDescription>
              Payment status trends over the months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyPaymentData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="paid" stackId="a" fill="#10B981" name="Paid" />
                  <Bar dataKey="pending" stackId="a" fill="#F59E0B" name="Pending" />
                  <Bar dataKey="overdue" stackId="a" fill="#EF4444" name="Overdue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transaction Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            Latest payment activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chit Group</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments
                  .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                  .slice(0, 5)
                  .map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.chitGroup?.name || "Unknown Group"}
                      </TableCell>
                      <TableCell>
                        {payment.user?.name || "Unknown User"}
                      </TableCell>
                      <TableCell>₹{payment.amount.toLocaleString()}</TableCell>
                      <TableCell>{payment.monthNumber}</TableCell>
                      <TableCell>
                        {new Date(payment.paymentDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            payment.status === "paid"
                              ? "success"
                              : payment.status === "pending"
                              ? "pending"
                              : "destructive"
                          }
                        >
                          {payment.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                
                {filteredPayments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      No payment records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="outline">View All Transactions</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function ReportsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 w-[200px]" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-[150px]" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="space-y-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-96" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-80 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <TableHead key={i}>
                    <Skeleton className="h-4 w-24" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  {[1, 2, 3, 4, 5, 6].map((j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Skeleton className="h-10 w-40" />
        </CardFooter>
      </Card>
    </div>
  );
}
