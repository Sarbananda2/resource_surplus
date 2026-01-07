import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Heart, Building2, IndianRupee, CheckCircle, Clock, XCircle, AlertCircle, RotateCcw } from "lucide-react";
import { format } from "date-fns";

interface NgoOption {
  id: string;
  organizationName: string;
  description: string | null;
  warehouseArea: string | null;
}

interface MonetaryDonation {
  id: string;
  ngoProfileId: string;
  amount: number;
  currency: string;
  status: string;
  message: string | null;
  isAnonymous: boolean;
  createdAt: string;
  completedAt: string | null;
  ngoName: string;
}

interface MonetaryDonationDialogFormProps {
  onSuccess?: () => void;
}

export function MonetaryDonationDialogForm({ onSuccess }: MonetaryDonationDialogFormProps) {
  const [selectedNgoId, setSelectedNgoId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const { toast } = useToast();

  const { data: ngos, isLoading: loadingNgos } = useQuery<NgoOption[]>({
    queryKey: ["/api/monetary-donations/ngos"],
  });

  const resetForm = () => {
    setSelectedNgoId("");
    setAmount("");
    setMessage("");
    setIsAnonymous(false);
  };

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const amountInPaise = Math.round(parseFloat(amount) * 100);
      const response = await apiRequest("POST", "/api/monetary-donations/checkout", {
        ngoProfileId: selectedNgoId,
        amount: amountInPaise,
        message: message || null,
        isAnonymous,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        resetForm();
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate donation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const amountNum = parseFloat(amount);
    if (!selectedNgoId || isNaN(amountNum) || amountNum < 1) {
      toast({
        title: "Invalid Input",
        description: "Please select an organization and enter an amount of at least 1 INR.",
        variant: "destructive",
      });
      return;
    }

    checkoutMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ngo">Select Organization</Label>
        {loadingNgos ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select value={selectedNgoId} onValueChange={setSelectedNgoId}>
            <SelectTrigger id="ngo" data-testid="select-ngo-donation">
              <SelectValue placeholder="Choose an organization to support" />
            </SelectTrigger>
            <SelectContent>
              {ngos?.map((ngo) => (
                <SelectItem key={ngo.id} value={ngo.id}>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>{ngo.organizationName}</span>
                    {ngo.warehouseArea && (
                      <span className="text-muted-foreground text-xs">({ngo.warehouseArea})</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount (INR)</Label>
        <div className="relative">
          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="amount"
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100"
            className="pl-10"
            data-testid="input-donation-amount"
          />
        </div>
        <p className="text-xs text-muted-foreground">Minimum donation: 1 INR</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message (Optional)</Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add a supportive message..."
          className="resize-none"
          data-testid="input-donation-message"
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="anonymous"
          checked={isAnonymous}
          onCheckedChange={(checked) => setIsAnonymous(checked === true)}
          data-testid="checkbox-anonymous"
        />
        <Label htmlFor="anonymous" className="text-sm font-normal cursor-pointer">
          Make this donation anonymous
        </Label>
      </div>

      <Button 
        type="submit" 
        className="w-full gap-2"
        disabled={checkoutMutation.isPending || !selectedNgoId || !amount}
        data-testid="button-donate-money"
      >
        {checkoutMutation.isPending ? (
          "Processing..."
        ) : (
          <>
            <Heart className="h-4 w-4" />
            Proceed to Payment
          </>
        )}
      </Button>
    </form>
  );
}

export function MonetaryDonationHistory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: myDonations, isLoading: loadingDonations } = useQuery<MonetaryDonation[]>({
    queryKey: ["/api/monetary-donations/my-donations"],
  });

  const retryMutation = useMutation({
    mutationFn: async (donation: MonetaryDonation) => {
      const response = await apiRequest("POST", "/api/monetary-donations/checkout", {
        ngoProfileId: donation.ngoProfileId,
        amount: donation.amount,
        message: donation.message || null,
        isAnonymous: donation.isAnonymous,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to retry donation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const statusIcons: Record<string, React.ReactNode> = {
    pending: <Clock className="h-4 w-4 text-yellow-600" />,
    completed: <CheckCircle className="h-4 w-4 text-green-600" />,
    failed: <XCircle className="h-4 w-4 text-red-600" />,
    expired: <AlertCircle className="h-4 w-4 text-orange-600" />,
    refunded: <XCircle className="h-4 w-4 text-gray-600" />,
  };

  const statusLabels: Record<string, string> = {
    pending: "Processing",
    completed: "Completed",
    failed: "Failed",
    expired: "Expired",
    refunded: "Refunded",
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    expired: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    refunded: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  };

  const canRetry = (status: string) => status === "failed" || status === "expired";

  if (loadingDonations) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (!myDonations || myDonations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No monetary donations yet</p>
        <p className="text-sm">Your financial contributions will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {myDonations.map((donation) => (
        <div
          key={donation.id}
          className="flex items-center justify-between p-4 rounded-lg border gap-4"
          data-testid={`donation-record-${donation.id}`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-medium truncate">{donation.ngoName}</span>
              <Badge className={statusColors[donation.status] || statusColors.pending} variant="secondary">
                <span className="flex items-center gap-1">
                  {statusIcons[donation.status] || statusIcons.pending}
                  {statusLabels[donation.status] || donation.status}
                </span>
              </Badge>
              {donation.isAnonymous && (
                <Badge variant="outline">Anonymous</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {format(new Date(donation.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </p>
            {donation.message && (
              <p className="text-sm mt-1 text-muted-foreground italic truncate">"{donation.message}"</p>
            )}
            {canRetry(donation.status) && (
              <p className="text-xs text-muted-foreground mt-1">
                {donation.status === "expired" 
                  ? "This payment session expired. You can retry the donation."
                  : "This payment failed. You can retry the donation."}
              </p>
            )}
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <p className="text-lg font-semibold flex items-center">
              <IndianRupee className="h-4 w-4" />
              {(donation.amount / 100).toFixed(2)}
            </p>
            {canRetry(donation.status) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => retryMutation.mutate(donation)}
                disabled={retryMutation.isPending}
                data-testid={`button-retry-donation-${donation.id}`}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function MonetaryDonationForm() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Make a Monetary Donation
          </CardTitle>
          <CardDescription>
            Support organizations directly with a financial contribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MonetaryDonationDialogForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Monetary Donations</CardTitle>
          <CardDescription>Track your financial contributions</CardDescription>
        </CardHeader>
        <CardContent>
          <MonetaryDonationHistory />
        </CardContent>
      </Card>
    </div>
  );
}
