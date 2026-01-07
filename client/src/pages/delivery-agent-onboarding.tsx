import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { LocationInput } from "@/components/location-input";
import { Truck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { TRANSPORT_TYPE_OPTIONS, LOAD_CAPACITY_OPTIONS } from "@shared/constants";

const deliveryAgentOnboardingSchema = z.object({
  transportType: z.string().min(1, "Transport type is required"),
  loadCapacity: z.string().min(1, "Load capacity is required"),
  operatingArea: z.string().min(2, "Operating area is required"),
  availabilityStart: z.string().min(1, "Start time is required"),
  availabilityEnd: z.string().min(1, "End time is required"),
});

type DeliveryAgentOnboardingData = z.infer<typeof deliveryAgentOnboardingSchema>;

interface DeliveryAgentOnboardingProps {
  onComplete: () => void;
}

export default function DeliveryAgentOnboarding({ onComplete }: DeliveryAgentOnboardingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<DeliveryAgentOnboardingData>({
    resolver: zodResolver(deliveryAgentOnboardingSchema),
    defaultValues: {
      transportType: "",
      loadCapacity: "",
      operatingArea: "",
      availabilityStart: "",
      availabilityEnd: "",
    },
  });

  const onboardMutation = useMutation({
    mutationFn: async (data: DeliveryAgentOnboardingData) => {
      return apiRequest("POST", "/api/delivery/onboard", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      onComplete();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete setup. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DeliveryAgentOnboardingData) => {
    onboardMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Truck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Set Up Your Delivery Profile</CardTitle>
          <CardDescription>
            Tell us about your availability and capacity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="transportType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Transport Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-transport-type">
                          <SelectValue placeholder="Select transport type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TRANSPORT_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="loadCapacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Load Capacity</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-load-capacity">
                          <SelectValue placeholder="Select capacity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LOAD_CAPACITY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="operatingArea"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Operating Area</FormLabel>
                    <FormControl>
                      <LocationInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="e.g., North District, Downtown"
                        data-testid="input-operating-area"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="availabilityStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Available From</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} data-testid="input-availability-start" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="availabilityEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Available Until</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} data-testid="input-availability-end" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={onboardMutation.isPending}
                data-testid="button-complete-onboarding"
              >
                {onboardMutation.isPending ? "Setting up..." : "Complete Setup"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
