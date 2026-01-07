import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePollingQuery } from "@/hooks/use-polling";
import { LastUpdated } from "@/components/last-updated";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardStatusTabs, TabDefinition } from "@/components/dashboard-status-tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/components/app-header";
import { DonorDonationDrawer } from "@/components/donor-donation-drawer";
import { LocationInput } from "@/components/location-input";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { MonetaryDonationDialogForm, MonetaryDonationHistory } from "@/components/monetary-donation-form";
import { Gift, Package, Clock, CheckCircle2, Eye, Heart, IndianRupee, History } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import type { User } from "@shared/models/auth";
import type { Donation, ItemCategory, ItemCondition } from "@shared/schema";

const donationFormSchema = z.object({
  category: z.enum(["clothing", "food", "essentials", "household", "other"]),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  condition: z.enum(["usable", "near_expiry", "fragile"]),
  description: z.string().optional(),
  area: z.string().min(1, "Area is required"),
  availabilityStart: z.string().min(1, "Start time is required"),
  availabilityEnd: z.string().min(1, "End time is required"),
});

type DonationFormData = z.infer<typeof donationFormSchema>;

interface DonorDashboardProps {
  user: User;
}

interface MonetaryDonationSummary {
  totalDonated: number;
  completedCount: number;
}

interface ConfirmedDonation {
  amount: number;
  ngoName: string;
  status: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  listed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  assigned: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  collected: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  delivered: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  in_warehouse: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  distributed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  expired: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const categoryLabels: Record<ItemCategory, string> = {
  clothing: "Clothing",
  food: "Food",
  essentials: "Essentials",
  household: "Household",
  other: "Other",
};

const conditionLabels: Record<ItemCondition, string> = {
  usable: "Usable",
  near_expiry: "Near Expiry",
  fragile: "Fragile",
};

export default function DonorDashboard({ user }: DonorDashboardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogTab, setDialogTab] = useState<string>("items");
  const [selectedDonationId, setSelectedDonationId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("active");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmedDonation, setConfirmedDonation] = useState<ConfirmedDonation | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const searchString = useSearch();

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const donationStatus = params.get("donation");
    
    if (donationStatus === "success") {
      // Verify pending donations with Stripe and update status
      apiRequest("POST", "/api/monetary-donations/verify-pending")
        .then(async () => {
          // Invalidate monetary donations cache to show updated status
          queryClient.invalidateQueries({ queryKey: ["/api/monetary-donations/my-donations"] });
          queryClient.invalidateQueries({ queryKey: ["/api/monetary-donations/summary"] });
          
          // Fetch the most recent donation to show in confirmation
          try {
            const response = await apiRequest("GET", "/api/monetary-donations/my-donations");
            const donations = await response.json();
            if (donations && donations.length > 0) {
              const latest = donations[0]; // Ordered by createdAt DESC (newest first)
              setConfirmedDonation({
                amount: latest.amount,
                ngoName: latest.ngoName || "Organization",
                status: latest.status,
                createdAt: latest.createdAt,
              });
              setShowConfirmation(true);
            } else {
              toast({
                title: "Payment Successful",
                description: "Thank you for your generous monetary donation!",
              });
            }
          } catch (err) {
            console.error("Error fetching latest donation:", err);
            toast({
              title: "Payment Successful",
              description: "Thank you for your generous monetary donation!",
            });
          }
        })
        .catch((error) => {
          console.error("Error verifying donation:", error);
          toast({
            title: "Payment Successful",
            description: "Thank you for your donation! Status will update shortly.",
          });
        })
        .finally(() => {
          setLocation("/donor", { replace: true });
        });
    } else if (donationStatus === "cancelled") {
      // User cancelled the payment - mark the donation as failed
      const donationId = params.get("donationId");
      
      if (donationId) {
        // Mark the specific donation as cancelled/failed
        apiRequest("POST", `/api/monetary-donations/${donationId}/cancel`)
          .catch((error) => {
            console.error("Error marking donation as cancelled:", error);
          })
          .finally(() => {
            queryClient.invalidateQueries({ queryKey: ["/api/monetary-donations/my-donations"] });
            toast({
              title: "Payment Cancelled",
              description: "No worries! Your payment was not processed. You can retry anytime from your donation history.",
            });
            setLocation("/donor", { replace: true });
          });
      } else {
        // Legacy path - no donation ID
        toast({
          title: "Payment Cancelled",
          description: "No worries! Your payment was not processed. You can retry anytime from your donation history.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/monetary-donations/my-donations"] });
        setLocation("/donor", { replace: true });
      }
    }
  }, [searchString, toast, setLocation, queryClient]);
  
  const openDrawer = (donationId: string) => {
    setSelectedDonationId(donationId);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedDonationId(null);
  };

  const { 
    data: donations, 
    isLoading,
    lastUpdated,
    isRefetching,
    isError 
  } = usePollingQuery<Donation[]>({
    queryKey: ["/api/donations"],
    intervalMs: 30000,
  });

  const { data: monetarySummary, refetch: refetchSummary } = useQuery<MonetaryDonationSummary>({
    queryKey: ["/api/monetary-donations/summary"],
    staleTime: 10000,
    refetchOnWindowFocus: true,
  });

  const form = useForm<DonationFormData>({
    resolver: zodResolver(donationFormSchema),
    defaultValues: {
      category: "clothing",
      quantity: 1,
      condition: "usable",
      description: "",
      area: "",
      availabilityStart: "",
      availabilityEnd: "",
    },
  });

  const createDonationMutation = useMutation({
    mutationFn: async (data: DonationFormData) => {
      return apiRequest("POST", "/api/donations", {
        ...data,
        availabilityStart: new Date(data.availabilityStart).toISOString(),
        availabilityEnd: new Date(data.availabilityEnd).toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/donations"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Item Listed",
        description: "Your donation has been listed and is now visible to NGOs.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create donation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DonationFormData) => {
    createDonationMutation.mutate(data);
  };

  const activeDonations = donations?.filter(d => !["distributed", "expired"].includes(d.status)) || [];
  const completedDonations = donations?.filter(d => ["distributed", "expired"].includes(d.status)) || [];
  const totalItemsDonated = donations?.length || 0;
  const totalMoneyDonated = monetarySummary?.totalDonated || 0;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} roleLabel="Donor" userRole="donor" />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-2xl font-medium">My Contributions</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-muted-foreground">Track your items and financial donations</p>
              <LastUpdated lastUpdated={lastUpdated} isRefetching={isRefetching} isError={isError} />
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setDialogTab("items");
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-contribute" className="gap-2">
                <Gift className="h-4 w-4" />
                Contribute
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Make a Contribution</DialogTitle>
                <DialogDescription>
                  Choose how you'd like to help
                </DialogDescription>
              </DialogHeader>
              
              <Tabs value={dialogTab} onValueChange={setDialogTab} className="mt-2">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="items" className="gap-2" data-testid="dialog-tab-items">
                    <Package className="h-4 w-4" />
                    Donate Items
                  </TabsTrigger>
                  <TabsTrigger value="money" className="gap-2" data-testid="dialog-tab-money">
                    <Heart className="h-4 w-4" />
                    Donate Money
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="items" className="mt-4">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel required>Category</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-category">
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="clothing">Clothing</SelectItem>
                                  <SelectItem value="food">Food</SelectItem>
                                  <SelectItem value="essentials">Essentials</SelectItem>
                                  <SelectItem value="household">Household</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="quantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel required>Quantity</FormLabel>
                              <FormControl>
                                <Input type="number" min={1} {...field} data-testid="input-quantity" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="condition"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel required>Condition</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-condition">
                                  <SelectValue placeholder="Select condition" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="usable">Usable</SelectItem>
                                <SelectItem value="near_expiry">Near Expiry</SelectItem>
                                <SelectItem value="fragile">Fragile</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="area"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel required>Area</FormLabel>
                            <FormControl>
                              <LocationInput
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="e.g., Downtown, North District"
                                data-testid="input-area"
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
                                <DateTimePicker
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="Select start time"
                                  data-testid="input-availability-start"
                                />
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
                                <DateTimePicker
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="Select end time"
                                  data-testid="input-availability-end"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Any additional details..." 
                                className="resize-none" 
                                {...field} 
                                data-testid="input-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createDonationMutation.isPending} data-testid="button-submit-donation">
                          {createDonationMutation.isPending ? "Listing..." : "List Item"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="money" className="mt-4">
                  <MonetaryDonationDialogForm onSuccess={() => setIsDialogOpen(false)} />
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Items Listed</p>
                  <p className="text-2xl font-bold">{totalItemsDonated}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                  <IndianRupee className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Money Donated</p>
                  <p className="text-2xl font-bold flex items-center">
                    <IndianRupee className="h-5 w-5" />
                    {(totalMoneyDonated / 100).toFixed(0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          if (value === "monetary") {
            refetchSummary();
            queryClient.invalidateQueries({ queryKey: ["/api/monetary-donations/my-donations"] });
          }
        }} className="space-y-6">
          <DashboardStatusTabs
            tabs={[
              { value: "active", label: "Active", icon: Clock, testId: "tab-active" },
              { value: "completed", label: "Completed", icon: CheckCircle2, testId: "tab-completed" },
              { value: "monetary", label: "Money", icon: Heart, testId: "tab-monetary" },
            ]}
          />

          <TabsContent value="active" className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-24 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : activeDonations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No active donations</h3>
                  <p className="text-muted-foreground mb-4">
                    Contribute items or money to help those in need.
                  </p>
                  <Button onClick={() => setIsDialogOpen(true)} data-testid="button-empty-contribute">
                    Make a Contribution
                  </Button>
                </CardContent>
              </Card>
            ) : (
              activeDonations.map((donation) => (
                <DonationCard 
                  key={donation.id} 
                  donation={donation} 
                  onView={() => openDrawer(donation.id)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedDonations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No completed donations yet</h3>
                  <p className="text-muted-foreground">
                    Your distributed donations will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              completedDonations.map((donation) => (
                <DonationCard 
                  key={donation.id} 
                  donation={donation} 
                  onView={() => openDrawer(donation.id)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="monetary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Financial Contributions</CardTitle>
                <CardDescription>Your monetary donation history</CardDescription>
              </CardHeader>
              <CardContent>
                <MonetaryDonationHistory />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DonorDonationDrawer
          donationId={selectedDonationId}
          isOpen={isDrawerOpen}
          onClose={closeDrawer}
        />

        <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                Donation Successful
              </DialogTitle>
              <DialogDescription>
                Thank you for your generous contribution
              </DialogDescription>
            </DialogHeader>
            
            {confirmedDonation && (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Amount</span>
                    <span className="text-2xl font-bold flex items-center">
                      <IndianRupee className="h-5 w-5" />
                      {(confirmedDonation.amount / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">To</span>
                    <span className="font-medium">{confirmedDonation.ngoName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      {confirmedDonation.status === "completed" ? "Completed" : "Processing"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Date</span>
                    <span className="text-sm">
                      {new Date(confirmedDonation.createdAt).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <Button 
                    onClick={() => {
                      setShowConfirmation(false);
                      setActiveTab("monetary");
                    }}
                    className="w-full gap-2"
                    data-testid="button-view-history"
                  >
                    <History className="h-4 w-4" />
                    View Donation History
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowConfirmation(false)}
                    className="w-full"
                    data-testid="button-close-confirmation"
                  >
                    Back to Dashboard
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

function DonationCard({ donation, onView }: { donation: Donation; onView: () => void }) {
  return (
    <Card data-testid={`card-donation-${donation.id}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="font-medium">{categoryLabels[donation.category]}</h3>
              <Badge className={statusColors[donation.status]} variant="secondary">
                {donation.status.replace("_", " ")}
              </Badge>
              <Badge variant="outline">{conditionLabels[donation.condition]}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Quantity: {donation.quantity} · Area: {donation.area}
            </p>
            {donation.description && (
              <p className="text-sm text-muted-foreground">{donation.description}</p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onView} data-testid={`button-view-${donation.id}`}>
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
