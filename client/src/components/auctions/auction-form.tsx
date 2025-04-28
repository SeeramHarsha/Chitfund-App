import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ChitGroup, Auction } from "@shared/schema";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Form schema for auction
const auctionSchema = z.object({
  chitGroupId: z.coerce.number().min(1, "Chit group is required"),
  monthNumber: z.coerce.number().min(1, "Month number is required"),
  auctionDate: z.date({
    required_error: "Auction date is required",
  }),
  status: z.enum(["scheduled", "completed", "cancelled"], {
    required_error: "Status is required",
  }),
  winnerUserId: z.coerce.number().optional(),
  winningBid: z.coerce.number().optional(),
});

type AuctionFormValues = z.infer<typeof auctionSchema>;

interface AuctionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chitGroups: ChitGroup[];
  existingData?: Auction;
  onSuccess?: () => void;
}

export default function AuctionForm({
  open,
  onOpenChange,
  chitGroups,
  existingData,
  onSuccess,
}: AuctionFormProps) {
  const isEditing = !!existingData;
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with default values or existing data
  const form = useForm<AuctionFormValues>({
    resolver: zodResolver(auctionSchema),
    defaultValues: existingData || {
      chitGroupId: 0,
      monthNumber: 1,
      auctionDate: new Date(),
      status: "scheduled",
      winnerUserId: undefined,
      winningBid: undefined,
    },
  });

  // Track status to conditionally show/hide winner fields
  const status = form.watch("status");
  const showWinnerFields = status === "completed";

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: AuctionFormValues) => {
      // If not completed, don't send winner fields
      const formData = data.status !== "completed" 
        ? { ...data, winnerUserId: undefined, winningBid: undefined }
        : data;
        
      const res = await apiRequest(
        "POST",
        `/api/chitgroups/${data.chitGroupId}/auctions`,
        formData
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/chitgroups/${form.getValues("chitGroupId")}/auctions`] 
      });
      toast({
        title: "Auction Created",
        description: "The auction has been scheduled successfully.",
      });
      form.reset();
      onOpenChange(false);
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: AuctionFormValues) => {
      // If not completed, don't send winner fields
      const formData = data.status !== "completed" 
        ? { ...data, winnerUserId: undefined, winningBid: undefined }
        : data;
        
      const res = await apiRequest(
        "PUT",
        `/api/auctions/${existingData?.id}`,
        formData
      );
      return res.json();
    },
    onSuccess: () => {
      const chitGroupId = form.getValues("chitGroupId");
      queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/chitgroups/${chitGroupId}/auctions`] 
      });
      toast({
        title: "Auction Updated",
        description: "The auction has been updated successfully.",
      });
      onOpenChange(false);
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Handle form submission
  function onSubmit(data: AuctionFormValues) {
    setIsSubmitting(true);
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Auction" : "Schedule New Auction"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details of the existing auction."
              : "Enter the details to schedule a new auction."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="chitGroupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chit Group</FormLabel>
                  <Select
                    disabled={isEditing}
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value ? field.value.toString() : ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a chit group" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {chitGroups
                        .filter((group) => group.isActive)
                        .map((group) => (
                          <SelectItem
                            key={group.id}
                            value={group.id.toString()}
                          >
                            {group.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The chit group for this auction
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="monthNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Month Number</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder="1"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Which month of the chit cycle (1-based)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="auctionDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Auction Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={`w-full pl-3 text-left font-normal ${
                            !field.value ? "text-muted-foreground" : ""
                          }`}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    The date of the auction
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Current status of the auction
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showWinnerFields && (
              <>
                <FormField
                  control={form.control}
                  name="winnerUserId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Winner User ID</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription>
                        ID of the user who won the auction
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="winningBid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Winning Bid Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormDescription>
                        Amount of the winning bid
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? "Update Auction" : "Schedule Auction"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
