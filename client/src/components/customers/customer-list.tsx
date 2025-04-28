import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Phone, Mail, Loader2, UserPlus } from "lucide-react";
import CustomerForm from "./customer-form";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function CustomerList() {
  const { user } = useAuth();
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  // Fetch customers
  const { data: customers, isLoading, refetch } = useQuery<User[]>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers");
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
    enabled: user?.role === "manager",
  });

  if (isLoading) {
    return <CustomersLoading />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-2xl font-bold">Customers</CardTitle>
          <CardDescription>
            Manage and view all customer accounts.
          </CardDescription>
        </div>
        {user?.role === "manager" && (
          <Button
            onClick={() => setShowAddCustomer(true)}
            className="ml-auto"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {customers && customers.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Contact Information</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.username}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center text-sm">
                          <Phone className="mr-2 h-3 w-3" />
                          {customer.phone}
                        </div>
                        {customer.email && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Mail className="mr-2 h-3 w-3" />
                            {customer.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant={customer.isFirstLogin ? "outline" : "success"}
                              className="cursor-help"
                            >
                              {customer.isFirstLogin ? "New Account" : "Active"}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            {customer.isFirstLogin
                              ? "Customer has not completed first-time login"
                              : "Customer has set up their account"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <p className="text-muted-foreground mb-4">No customers found</p>
            {user?.role === "manager" && (
              <Button
                variant="outline"
                onClick={() => setShowAddCustomer(true)}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Add Your First Customer
              </Button>
            )}
          </div>
        )}
      </CardContent>

      {/* Add Customer Dialog */}
      <CustomerForm
        open={showAddCustomer}
        onOpenChange={setShowAddCustomer}
        onSuccess={() => refetch()}
      />
    </Card>
  );
}

function CustomersLoading() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Contact Information</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3].map((i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}