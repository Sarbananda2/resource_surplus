import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Building2, Truck, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UserRole } from "@shared/schema";

interface RoleSelectorProps {
  onRoleSelected: (role: UserRole) => void;
}

export default function RoleSelector({ onRoleSelected }: RoleSelectorProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createProfileMutation = useMutation({
    mutationFn: async (role: UserRole) => {
      return apiRequest("POST", "/api/profile", { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      if (selectedRole) {
        onRoleSelected(selectedRole);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to set up your account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleContinue = () => {
    if (selectedRole) {
      createProfileMutation.mutate(selectedRole);
    }
  };

  const roles = [
    {
      id: "donor" as UserRole,
      title: "I have something usable",
      description: "Declare surplus items like clothing, food, or household essentials for pickup.",
      icon: Package,
    },
    {
      id: "ngo" as UserRole,
      title: "I represent an NGO",
      description: "Accept donations, manage warehouse inventory, and distribute to those in need.",
      icon: Building2,
    },
    {
      id: "delivery_agent" as UserRole,
      title: "I can deliver items",
      description: "Pick up donations from donors and deliver them to NGO warehouses.",
      icon: Truck,
    },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-medium mb-2">Welcome to SurplusFlow</h1>
          <p className="text-muted-foreground">Select how you'd like to contribute</p>
        </div>

        <div className="grid gap-4 mb-8">
          {roles.map((role) => (
            <Card
              key={role.id}
              data-testid={`card-role-${role.id}`}
              className={`cursor-pointer transition-all hover-elevate ${
                selectedRole === role.id
                  ? "ring-2 ring-primary bg-accent/50"
                  : ""
              }`}
              onClick={() => setSelectedRole(role.id)}
            >
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  selectedRole === role.id ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>
                  <role.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {role.title}
                    {selectedRole === role.id && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">{role.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="flex justify-center">
          <Button
            size="lg"
            data-testid="button-continue"
            disabled={!selectedRole || createProfileMutation.isPending}
            onClick={handleContinue}
          >
            {createProfileMutation.isPending ? "Setting up..." : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
