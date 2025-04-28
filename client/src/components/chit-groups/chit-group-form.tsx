import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";

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

// Form schema based on our data model
const chitGroupSchema = z.object({
  name: z.string().min(2, "Group name must be at least 2 characters"),
  value: z.coerce.number().min(1000, "Value must be at least ₹1,000"),
  duration: z.coerce.number().min(1, "Duration must be at least 1 month").max(60, "Duration cannot exceed 60 months"),
  membersCount: z.coerce.number().min(2, "Group must have at least 2 members").max(50, "Group cannot exceed 50 members"),
  startDate: z.date(),
  isActive: z.boolean().default(true),
});

type ChitGroupFormValues = z.infer<typeof chitGroupSchema>;

interface ChitGroupFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingData?: ChitGroupFormValues & { id: number };
  onSuccess?: () => void;
}

export default function ChitGroupForm({ open, onOpenChange, existingData, onSuccess }: ChitGroupFormProps) {
  const isEditing = !!existingData;
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with default values or existing data
  const form = useForm<ChitGroupFormValues>({
    resolver: zodResolver(chitGroupSchema),
    defaultValues: existingData || {
      name: "",
      value: 0,
      duration: 12,
      membersCount: 10,
      startDate: new Date(),
      isActive: true,
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: ChitGroupFormValues) => {
      // Format date as ISO string for the server
      const formattedData = {
        ...data,
        startDate: data.startDate.toISOString().split('T')[0], // YYYY-MM-DD format
      };
      console.log("Sending data to server:", formattedData);
      const res = await apiRequest("POST", "/api/chitgroups", formattedData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chitgroups"] });
      toast({
        title: "Chit Group Created",
        description: "The chit group has been created successfully.",
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
    mutationFn: async (data: ChitGroupFormValues) => {
      // Format date as ISO string for the server
      const formattedData = {
        ...data,
        startDate: data.startDate.toISOString().split('T')[0], // YYYY-MM-DD format
      };
      console.log("Sending data to server (update):", formattedData);
      const res = await apiRequest("PUT", `/api/chitgroups/${existingData?.id}`, formattedData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chitgroups"] });
      toast({
        title: "Chit Group Updated",
        description: "The chit group has been updated successfully.",
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
  function onSubmit(data: ChitGroupFormValues) {
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
          <DialogTitle>{isEditing ? "Edit Chit Group" : "Create New Chit Group"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details of the existing chit group."
              : "Enter the details to create a new chit group."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter group name" {...field} />
                  </FormControl>
                  <FormDescription>
                    A unique name for the chit group
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Value (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" min="1000" placeholder="10000" {...field} />
                  </FormControl>
                  <FormDescription>
                    The total amount of the chit
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (months)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="60" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="membersCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Members</FormLabel>
                    <FormControl>
                      <Input type="number" min="2" max="50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Start Date</FormLabel>
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
                        disabled={(date) => date < new Date("1900-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    The date when the chit group starts
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      Whether this chit group is currently active
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update Group" : "Create Group"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
