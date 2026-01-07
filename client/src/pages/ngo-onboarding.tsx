import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { LocationInput } from "@/components/location-input";
import { Building2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const ngoOnboardingSchema = z.object({
  organizationName: z.string().min(2, "Organization name is required"),
  description: z.string().optional(),
  warehouseArea: z.string().min(2, "Warehouse area is required"),
  categories: z.array(z.string()).min(1, "Select at least one category"),
});

type NgoOnboardingData = z.infer<typeof ngoOnboardingSchema>;

interface NgoOnboardingProps {
  onComplete: () => void;
}

const categoryOptions = [
  { id: "clothing", label: "Clothing" },
  { id: "food", label: "Food" },
  { id: "essentials", label: "Essentials" },
  { id: "household", label: "Household Items" },
  { id: "other", label: "Other" },
];

export default function NgoOnboarding({ onComplete }: NgoOnboardingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<NgoOnboardingData>({
    resolver: zodResolver(ngoOnboardingSchema),
    defaultValues: {
      organizationName: "",
      description: "",
      warehouseArea: "",
      categories: [],
    },
  });

  const onboardMutation = useMutation({
    mutationFn: async (data: NgoOnboardingData) => {
      return apiRequest("POST", "/api/ngo/onboard", data);
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

  const onSubmit = (data: NgoOnboardingData) => {
    onboardMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Set Up Your NGO Profile</CardTitle>
          <CardDescription>
            Tell us about your organization so donors can find you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="organizationName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Organization Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Community Aid Foundation" {...field} data-testid="input-org-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Brief description of your organization's mission..."
                        className="resize-none"
                        {...field}
                        data-testid="input-org-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="warehouseArea"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Warehouse Area</FormLabel>
                    <FormControl>
                      <LocationInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="e.g., North District, Downtown"
                        data-testid="input-warehouse-area"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categories"
                render={() => (
                  <FormItem>
                    <FormLabel required>Categories You Accept</FormLabel>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {categoryOptions.map((category) => (
                        <FormField
                          key={category.id}
                          control={form.control}
                          name="categories"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(category.id)}
                                  onCheckedChange={(checked) => {
                                    const value = field.value || [];
                                    if (checked) {
                                      field.onChange([...value, category.id]);
                                    } else {
                                      field.onChange(value.filter((v) => v !== category.id));
                                    }
                                  }}
                                  data-testid={`checkbox-category-${category.id}`}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal cursor-pointer">
                                {category.label}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
