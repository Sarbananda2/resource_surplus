import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Phone, Package, Truck, Building2, Calendar, CheckCircle2, IndianRupee, Edit2, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LocationInput } from "@/components/location-input";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AppHeader } from "@/components/app-header";
import { AvatarUploader } from "@/components/avatar-uploader";
import type { UserProfile, NgoProfile, DeliveryAgentProfile, User } from "@shared/schema";

interface ProfilePageProps {
  user: User;
}

interface ProfileData {
  userProfile: UserProfile;
  ngoProfile?: NgoProfile | null;
  deliveryAgentProfile?: DeliveryAgentProfile | null;
}

interface ProfileStats {
  donationsCount?: number;
  completedDonationsCount?: number;
  totalMonetaryDonated?: number;
  tasksCompleted?: number;
  tasksAccepted?: number;
  distributionEventsCount?: number;
  warehouseItemsCount?: number;
}

const profileFormSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  phone: z.string().optional(),
  area: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

const ngoProfileFormSchema = z.object({
  organizationName: z.string().min(1, "Organization name is required"),
  description: z.string().optional(),
  warehouseArea: z.string().optional(),
  categories: z.array(z.string()).optional(),
});

type NgoProfileFormData = z.infer<typeof ngoProfileFormSchema>;

const agentProfileFormSchema = z.object({
  transportType: z.string().optional(),
  loadCapacity: z.string().optional(),
  operatingArea: z.string().optional(),
  availabilityStart: z.string().optional(),
  availabilityEnd: z.string().optional(),
  isAvailable: z.boolean().optional(),
});

type AgentProfileFormData = z.infer<typeof agentProfileFormSchema>;

const DONATION_CATEGORIES = ["clothing", "food", "essentials", "household"];

export default function ProfilePage({ user }: ProfilePageProps) {
  const { toast } = useToast();
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [isEditingNgo, setIsEditingNgo] = useState(false);
  const [isEditingAgent, setIsEditingAgent] = useState(false);

  const { data: profileData, isLoading: profileLoading } = useQuery<ProfileData>({
    queryKey: ["/api/profile"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<ProfileStats>({
    queryKey: ["/api/profile/stats"],
  });

  const basicForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: "",
      phone: "",
      area: "",
    },
  });

  const ngoForm = useForm<NgoProfileFormData>({
    resolver: zodResolver(ngoProfileFormSchema),
    defaultValues: {
      organizationName: "",
      description: "",
      warehouseArea: "",
      categories: [],
    },
  });

  const agentForm = useForm<AgentProfileFormData>({
    resolver: zodResolver(agentProfileFormSchema),
    defaultValues: {
      transportType: "",
      loadCapacity: "",
      operatingArea: "",
      availabilityStart: "",
      availabilityEnd: "",
      isAvailable: true,
    },
  });

  const updateBasicMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      return apiRequest("PATCH", "/api/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setIsEditingBasic(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateAvatarMutation = useMutation({
    mutationFn: async (avatarUrl: string) => {
      return apiRequest("PATCH", "/api/profile", { avatarUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save profile picture. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateNgoMutation = useMutation({
    mutationFn: async (data: NgoProfileFormData) => {
      return apiRequest("PATCH", "/api/ngo/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setIsEditingNgo(false);
      toast({
        title: "Organization profile updated",
        description: "Your organization details have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update organization profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateAgentMutation = useMutation({
    mutationFn: async (data: AgentProfileFormData) => {
      return apiRequest("PATCH", "/api/delivery-agent/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setIsEditingAgent(false);
      toast({
        title: "Agent profile updated",
        description: "Your delivery agent details have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update agent profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEditBasic = () => {
    if (profileData?.userProfile) {
      basicForm.reset({
        displayName: profileData.userProfile.displayName || user.firstName || "",
        phone: profileData.userProfile.phone || "",
        area: profileData.userProfile.area || "",
      });
    }
    setIsEditingBasic(true);
  };

  const handleEditNgo = () => {
    if (profileData?.ngoProfile) {
      ngoForm.reset({
        organizationName: profileData.ngoProfile.organizationName || "",
        description: profileData.ngoProfile.description || "",
        warehouseArea: profileData.ngoProfile.warehouseArea || "",
        categories: profileData.ngoProfile.categories || [],
      });
    }
    setIsEditingNgo(true);
  };

  const handleEditAgent = () => {
    if (profileData?.deliveryAgentProfile) {
      agentForm.reset({
        transportType: profileData.deliveryAgentProfile.transportType || "",
        loadCapacity: profileData.deliveryAgentProfile.loadCapacity || "",
        operatingArea: profileData.deliveryAgentProfile.operatingArea || "",
        availabilityStart: profileData.deliveryAgentProfile.availabilityStart || "",
        availabilityEnd: profileData.deliveryAgentProfile.availabilityEnd || "",
        isAvailable: profileData.deliveryAgentProfile.isAvailable ?? true,
      });
    }
    setIsEditingAgent(true);
  };

  const roleLabels: Record<string, string> = {
    donor: "Donor",
    ngo: "NGO",
    delivery_agent: "Delivery Agent",
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader user={user} roleLabel="Profile" userRole={null} />
        <main className="max-w-7xl mx-auto px-4 py-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64 mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-48 w-full" />
        </main>
      </div>
    );
  }

  const userProfile = profileData?.userProfile;
  if (!userProfile) {
    return null;
  }

  const roleBadgeVariants: Record<string, "default" | "secondary" | "outline"> = {
    donor: "default",
    ngo: "secondary",
    delivery_agent: "outline",
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} roleLabel="Profile" userRole={userProfile.role} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-2xl font-medium">My Profile</h1>
            <p className="text-muted-foreground">Manage your account and preferences</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {userProfile.role === "donor" && (
            <>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-primary/10">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Items Listed</p>
                      <p className="text-2xl font-bold" data-testid="stat-items-listed">
                        {statsLoading ? "-" : stats?.donationsCount ?? 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                      <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                      <p className="text-2xl font-bold" data-testid="stat-completed-donations">
                        {statsLoading ? "-" : stats?.completedDonationsCount ?? 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900">
                      <IndianRupee className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Money Donated</p>
                      <p className="text-2xl font-bold flex items-center" data-testid="stat-money-donated">
                        <IndianRupee className="h-5 w-5" />
                        {statsLoading ? "-" : stats?.totalMonetaryDonated ?? 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {userProfile.role === "delivery_agent" && (
            <>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-primary/10">
                      <Truck className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tasks Accepted</p>
                      <p className="text-2xl font-bold" data-testid="stat-tasks-accepted">
                        {statsLoading ? "-" : stats?.tasksAccepted ?? 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                      <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                      <p className="text-2xl font-bold" data-testid="stat-tasks-completed">
                        {statsLoading ? "-" : stats?.tasksCompleted ?? 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {userProfile.role === "ngo" && (
            <>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-primary/10">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Warehouse Items</p>
                      <p className="text-2xl font-bold" data-testid="stat-warehouse-items">
                        {statsLoading ? "-" : stats?.warehouseItemsCount ?? 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                      <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Distribution Events</p>
                      <p className="text-2xl font-bold" data-testid="stat-distribution-events">
                        {statsLoading ? "-" : stats?.distributionEventsCount ?? 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <AvatarUploader
                  currentAvatarUrl={userProfile.avatarUrl}
                  displayName={userProfile.displayName || user.firstName}
                  onUploadComplete={(url) => updateAvatarMutation.mutate(url)}
                  disabled={updateAvatarMutation.isPending}
                  showChangeButton={isEditingBasic}
                />
                <div className="pt-2">
                  <CardTitle className="text-xl" data-testid="text-profile-name">
                    {userProfile.displayName || user.firstName || "User"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground" data-testid="text-profile-email">
                    {user.email}
                  </p>
                  <Badge variant={roleBadgeVariants[userProfile.role]} className="mt-1" data-testid="badge-profile-role">
                    {roleLabels[userProfile.role]}
                  </Badge>
                </div>
              </div>
              {!isEditingBasic && (
                <Button variant="outline" size="sm" onClick={handleEditBasic} data-testid="button-edit-profile">
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </CardHeader>

            <CardContent>
              {isEditingBasic ? (
                <Form {...basicForm}>
                  <form onSubmit={basicForm.handleSubmit((data) => updateBasicMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={basicForm.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-display-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={basicForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} type="tel" data-testid="input-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={basicForm.control}
                      name="area"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Area</FormLabel>
                          <FormControl>
                            <LocationInput
                              value={field.value || ""}
                              onChange={field.onChange}
                              placeholder="e.g., Noida, Delhi"
                              data-testid="input-area"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2 pt-2">
                      <Button type="submit" disabled={updateBasicMutation.isPending} data-testid="button-save-profile">
                        {updateBasicMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setIsEditingBasic(false)} data-testid="button-cancel-edit">
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm" data-testid="text-profile-phone">
                      {userProfile.phone || "No phone added"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm" data-testid="text-profile-area">
                      {userProfile.area || "No area set"}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {profileData?.ngoProfile && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-lg">Organization Details</CardTitle>
                {!isEditingNgo && (
                  <Button variant="outline" size="sm" onClick={handleEditNgo} data-testid="button-edit-ngo">
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {isEditingNgo ? (
                  <Form {...ngoForm}>
                    <form onSubmit={ngoForm.handleSubmit((data) => updateNgoMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={ngoForm.control}
                        name="organizationName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Organization Name</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-org-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={ngoForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={3} data-testid="input-org-description" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={ngoForm.control}
                        name="warehouseArea"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Warehouse Area</FormLabel>
                            <FormControl>
                              <LocationInput
                                value={field.value || ""}
                                onChange={field.onChange}
                                placeholder="e.g., Noida, Delhi"
                                data-testid="input-warehouse-area"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={ngoForm.control}
                        name="categories"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Categories Accepted</FormLabel>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              {DONATION_CATEGORIES.map((category) => (
                                <div key={category} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`cat-${category}`}
                                    checked={field.value?.includes(category)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      if (checked) {
                                        field.onChange([...current, category]);
                                      } else {
                                        field.onChange(current.filter((c) => c !== category));
                                      }
                                    }}
                                    data-testid={`checkbox-category-${category}`}
                                  />
                                  <label htmlFor={`cat-${category}`} className="text-sm capitalize cursor-pointer">
                                    {category}
                                  </label>
                                </div>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex gap-2 pt-2">
                        <Button type="submit" disabled={updateNgoMutation.isPending} data-testid="button-save-ngo">
                          {updateNgoMutation.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setIsEditingNgo(false)} data-testid="button-cancel-ngo">
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Form>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-muted-foreground">Organization Name</span>
                      <p className="font-medium" data-testid="text-org-name">{profileData.ngoProfile.organizationName}</p>
                    </div>
                    {profileData.ngoProfile.description && (
                      <div>
                        <span className="text-sm text-muted-foreground">Description</span>
                        <p className="text-sm" data-testid="text-org-description">{profileData.ngoProfile.description}</p>
                      </div>
                    )}
                    {profileData.ngoProfile.warehouseArea && (
                      <div>
                        <span className="text-sm text-muted-foreground">Warehouse Area</span>
                        <p className="text-sm" data-testid="text-warehouse-area">{profileData.ngoProfile.warehouseArea}</p>
                      </div>
                    )}
                    {profileData.ngoProfile.categories && profileData.ngoProfile.categories.length > 0 && (
                      <div>
                        <span className="text-sm text-muted-foreground">Categories Accepted</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {profileData.ngoProfile.categories.map((cat) => (
                            <Badge key={cat} variant="secondary" className="capitalize" data-testid={`badge-category-${cat}`}>
                              {cat}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {profileData?.deliveryAgentProfile && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-lg">Delivery Agent Details</CardTitle>
                {!isEditingAgent && (
                  <Button variant="outline" size="sm" onClick={handleEditAgent} data-testid="button-edit-agent">
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {isEditingAgent ? (
                  <Form {...agentForm}>
                    <form onSubmit={agentForm.handleSubmit((data) => updateAgentMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={agentForm.control}
                        name="transportType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Transport Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-transport-type">
                                  <SelectValue placeholder="Select transport type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="bike">Bike</SelectItem>
                                <SelectItem value="scooter">Scooter</SelectItem>
                                <SelectItem value="car">Car</SelectItem>
                                <SelectItem value="van">Van</SelectItem>
                                <SelectItem value="truck">Truck</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={agentForm.control}
                        name="loadCapacity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Load Capacity</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-load-capacity">
                                  <SelectValue placeholder="Select capacity" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="small">Small (up to 5kg)</SelectItem>
                                <SelectItem value="medium">Medium (5-20kg)</SelectItem>
                                <SelectItem value="large">Large (20-50kg)</SelectItem>
                                <SelectItem value="extra_large">Extra Large (50kg+)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={agentForm.control}
                        name="operatingArea"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Operating Area</FormLabel>
                            <FormControl>
                              <LocationInput
                                value={field.value || ""}
                                onChange={field.onChange}
                                placeholder="e.g., Noida, Delhi"
                                data-testid="input-operating-area"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={agentForm.control}
                          name="availabilityStart"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Available From</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} data-testid="input-availability-start" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={agentForm.control}
                          name="availabilityEnd"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Available Until</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} data-testid="input-availability-end" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={agentForm.control}
                        name="isAvailable"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Available for Tasks</FormLabel>
                              <p className="text-sm text-muted-foreground">
                                Toggle to show or hide from available task pool
                              </p>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-availability"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <div className="flex gap-2 pt-2">
                        <Button type="submit" disabled={updateAgentMutation.isPending} data-testid="button-save-agent">
                          {updateAgentMutation.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setIsEditingAgent(false)} data-testid="button-cancel-agent">
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Form>
                ) : (
                  <div className="space-y-3">
                    {profileData.deliveryAgentProfile.transportType && (
                      <div>
                        <span className="text-sm text-muted-foreground">Transport Type</span>
                        <p className="font-medium capitalize" data-testid="text-transport-type">
                          {profileData.deliveryAgentProfile.transportType}
                        </p>
                      </div>
                    )}
                    {profileData.deliveryAgentProfile.loadCapacity && (
                      <div>
                        <span className="text-sm text-muted-foreground">Load Capacity</span>
                        <p className="font-medium capitalize" data-testid="text-load-capacity">
                          {profileData.deliveryAgentProfile.loadCapacity.replace("_", " ")}
                        </p>
                      </div>
                    )}
                    {profileData.deliveryAgentProfile.operatingArea && (
                      <div>
                        <span className="text-sm text-muted-foreground">Operating Area</span>
                        <p className="text-sm" data-testid="text-operating-area">
                          {profileData.deliveryAgentProfile.operatingArea}
                        </p>
                      </div>
                    )}
                    {(profileData.deliveryAgentProfile.availabilityStart || profileData.deliveryAgentProfile.availabilityEnd) && (
                      <div>
                        <span className="text-sm text-muted-foreground">Availability Hours</span>
                        <p className="text-sm" data-testid="text-availability-hours">
                          {profileData.deliveryAgentProfile.availabilityStart || "Not set"} - {profileData.deliveryAgentProfile.availabilityEnd || "Not set"}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <Badge
                        variant={profileData.deliveryAgentProfile.isAvailable ? "default" : "secondary"}
                        data-testid="badge-availability-status"
                      >
                        {profileData.deliveryAgentProfile.isAvailable ? "Available" : "Unavailable"}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Member since {userProfile.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : "N/A"}
          </p>
        </div>
      </main>
    </div>
  );
}
