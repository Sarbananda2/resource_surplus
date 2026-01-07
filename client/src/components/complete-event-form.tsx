import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { X, Image as ImageIcon, CheckCircle, Calendar, MapPin, Package, AlertCircle } from "lucide-react";
import { useUpload } from "@/hooks/use-upload";
import type { DistributionEvent, Donation } from "@shared/schema";

interface CompleteEventFormProps {
  event: DistributionEvent;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CompleteEventForm({ event, onSuccess, onCancel }: CompleteEventFormProps) {
  const [beneficiaryCount, setBeneficiaryCount] = useState(
    event.estimatedBeneficiaryCount?.toString() || ""
  );
  const [impactDescription, setImpactDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedDonationIds, setSelectedDonationIds] = useState<string[]>([]);
  const { toast } = useToast();

  const { data: warehouseDonations, isLoading: isLoadingWarehouse } = useQuery<Donation[]>({
    queryKey: ["/api/ngo/donations/warehouse"],
  });

  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      if (photos.length < 3) {
        setPhotos([...photos, response.objectPath]);
      }
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "Could not upload photo. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleDonation = (donationId: string) => {
    setSelectedDonationIds(prev => 
      prev.includes(donationId) 
        ? prev.filter(id => id !== donationId)
        : [...prev, donationId]
    );
  };

  const selectAllDonations = () => {
    if (warehouseDonations) {
      setSelectedDonationIds(warehouseDonations.map(d => d.id));
    }
  };

  const clearSelection = () => {
    setSelectedDonationIds([]);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      clothing: "Clothing",
      food: "Food",
      household: "Household",
      electronics: "Electronics",
      furniture: "Furniture",
      essentials: "Essentials",
      other: "Other",
    };
    return labels[category] || category;
  };

  const completeEventMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/ngo/distribution-events/${event.id}/complete`, {
        photoUrls: photos,
        beneficiaryCount: beneficiaryCount ? parseInt(beneficiaryCount, 10) : undefined,
        impactDescription: impactDescription || undefined,
        donationIds: selectedDonationIds.length > 0 ? selectedDonationIds : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ngo/distribution-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ngo/donations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ngo/donations/warehouse"] });
      toast({
        title: "Event Completed",
        description: `Distribution event completed${selectedDonationIds.length > 0 ? ` with ${selectedDonationIds.length} item(s) marked as distributed` : ""}.`,
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && photos.length < 3) {
      await uploadFile(file);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (photos.length === 0) {
      toast({
        title: "Photos Required",
        description: "Please upload at least one photo from the event.",
        variant: "destructive",
      });
      return;
    }
    completeEventMutation.mutate();
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-muted/50 rounded-md p-3 mb-4">
        <div className="flex items-start gap-2">
          <CheckCircle className="h-4 w-4 mt-0.5 text-primary" />
          <div className="text-sm">
            <p className="font-medium mb-2">Completing Event</p>
            <div className="text-muted-foreground space-y-1">
              <p className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                {formatDate(event.eventDate)}
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="h-3 w-3" />
                {event.area}
              </p>
              <p>{event.distributionType}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Items Distributed</Label>
          {warehouseDonations && warehouseDonations.length > 0 && (
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="ghost" 
                size="sm"
                onClick={selectAllDonations}
                className="text-xs h-6"
              >
                Select All
              </Button>
              {selectedDonationIds.length > 0 && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={clearSelection}
                  className="text-xs h-6"
                >
                  Clear
                </Button>
              )}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          Select which warehouse items were distributed at this event
        </p>

        {isLoadingWarehouse ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !warehouseDonations || warehouseDonations.length === 0 ? (
          <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>No items currently in warehouse</span>
          </div>
        ) : (
          <div className="max-h-40 overflow-y-auto border rounded-md divide-y">
            {warehouseDonations.map((donation) => (
              <label 
                key={donation.id} 
                className="flex items-center gap-3 p-2 hover-elevate cursor-pointer"
                data-testid={`checkbox-donation-${donation.id}`}
              >
                <Checkbox 
                  checked={selectedDonationIds.includes(donation.id)}
                  onCheckedChange={() => toggleDonation(donation.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Package className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {donation.quantity} {getCategoryLabel(donation.category)}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {donation.condition}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {donation.area}
                  </p>
                </div>
              </label>
            ))}
          </div>
        )}
        
        {selectedDonationIds.length > 0 && (
          <p className="text-xs text-primary">
            {selectedDonationIds.length} item(s) selected to mark as distributed
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label required>Event Photos (1-3)</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Upload group photos from the event. No individual beneficiary faces should be identifiable.
        </p>
        
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, index) => (
            <div key={index} className="relative aspect-square bg-muted rounded-md overflow-hidden">
              <img src={photo} alt={`Event photo ${index + 1}`} className="w-full h-full object-cover" />
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="absolute top-1 right-1"
                onClick={() => removePhoto(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          
          {photos.length < 3 && (
            <label className="aspect-square border-2 border-dashed rounded-md flex flex-col items-center justify-center cursor-pointer hover-elevate">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={isUploading}
                data-testid="input-complete-event-photo"
              />
              {isUploading ? (
                <span className="text-xs text-muted-foreground">Uploading...</span>
              ) : (
                <>
                  <ImageIcon className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">Add Photo</span>
                </>
              )}
            </label>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="beneficiaryCount">People Served</Label>
        <Input
          id="beneficiaryCount"
          type="number"
          min="1"
          placeholder="e.g., 50"
          value={beneficiaryCount}
          onChange={(e) => setBeneficiaryCount(e.target.value)}
          data-testid="input-actual-beneficiary-count"
        />
        <p className="text-xs text-muted-foreground">
          Actual number of people who received items
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="impactDescription">Impact Summary</Label>
        <Textarea
          id="impactDescription"
          placeholder="Describe the distribution: who benefited, community context, how items were used..."
          value={impactDescription}
          onChange={(e) => setImpactDescription(e.target.value)}
          className="min-h-[80px] resize-none"
          data-testid="input-complete-impact-description"
        />
        <p className="text-xs text-muted-foreground">
          This message will be shown to donors whose items were included
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={completeEventMutation.isPending || isUploading || photos.length === 0}
          data-testid="button-complete-event"
        >
          {completeEventMutation.isPending ? "Completing..." : "Complete Event"}
        </Button>
      </div>
    </form>
  );
}
