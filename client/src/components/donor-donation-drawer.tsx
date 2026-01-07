import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChainOfCustodyTimeline } from "@/components/chain-of-custody-timeline";
import { ClickableSignedImage } from "@/components/clickable-signed-image";
import { Building2, Send, CheckCircle, XCircle, Clock, Calendar, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Donation, DeliveryTask, NgoProfile, DistributionEvent, NgoConsentRequest } from "@shared/schema";
import {
  DonationDrawerBase,
  DonationBadges,
  DescriptionSection,
  LocationSection,
  AvailabilityWindow,
  DeliveryInfoCard,
  ProofPhotos,
  CreatedAtFootnote,
  formatDate,
} from "./donation-drawer-base";

interface DonorDonationDetails {
  donation: Donation;
  deliveryTask: DeliveryTask | null;
  ngoSummary: {
    organizationName: string;
    warehouseArea: string | null;
    description: string | null;
  } | null;
  agentDisplayName: string | null;
  distributionEvent: DistributionEvent | null;
  consentRequest: NgoConsentRequest | null;
}

interface DonorDonationDrawerProps {
  donationId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DonorDonationDrawer({ 
  donationId, 
  isOpen, 
  onClose,
}: DonorDonationDrawerProps) {
  const { toast } = useToast();
  
  const { data: details, isLoading } = useQuery<DonorDonationDetails>({
    queryKey: ["/api/donor/donations", donationId, "details"],
    queryFn: async () => {
      if (!donationId) {
        throw new Error("No donation ID provided");
      }
      const response = await fetch(`/api/donor/donations/${donationId}/details`);
      if (!response.ok) {
        throw new Error("Failed to fetch donation details");
      }
      return response.json();
    },
    enabled: !!donationId && isOpen,
  });

  const requestNgoDetailsMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/donor/donations/${id}/ngo-request`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/donor/donations", donationId, "details"] });
      toast({
        title: "Request Sent",
        description: "The NGO will be notified of your request to view their details.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const donation = details?.donation;
  const deliveryTask = details?.deliveryTask;
  const consentRequest = details?.consentRequest;
  const ngoSummary = details?.ngoSummary;
  const distributionEvent = details?.distributionEvent;
  
  const isAssigned = donation && donation.status !== "listed";
  const canRequestNgoDetails = isAssigned && !consentRequest;
  const isPendingRequest = consentRequest?.status === "pending";
  const isApprovedRequest = consentRequest?.status === "approved";
  const isDeniedRequest = consentRequest?.status === "denied";

  const footer = donation ? (
    <Button variant="outline" className="w-full" onClick={onClose}>
      Close
    </Button>
  ) : null;

  return (
    <DonationDrawerBase
      isOpen={isOpen}
      onClose={onClose}
      isLoading={isLoading}
      donation={donation}
      footer={footer}
    >
      {donation && (
        <>
          <DonationBadges donation={donation} />
          <DescriptionSection description={donation.description} />
          <Separator />
          <LocationSection 
            area={donation.area} 
            label="Pickup Location" 
            sublabel="Your donation pickup area"
          />
          <AvailabilityWindow 
            start={donation.availabilityStart} 
            end={donation.availabilityEnd} 
          />

          <Separator />
          
          <ChainOfCustodyTimeline 
            donation={donation}
            deliveryTask={deliveryTask}
            distributionEvent={distributionEvent}
            showProofLinks={true}
          />

          {isAssigned && (
            <>
              <Separator />
              
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Receiving Organization
                </h4>
                
                {isApprovedRequest && ngoSummary ? (
                  <div className="bg-muted/50 rounded-md p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{ngoSummary.organizationName}</p>
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Shared
                      </Badge>
                    </div>
                    {ngoSummary.warehouseArea && (
                      <p className="text-sm text-muted-foreground">
                        Warehouse: {ngoSummary.warehouseArea}
                      </p>
                    )}
                    {ngoSummary.description && (
                      <p className="text-sm text-muted-foreground">
                        {ngoSummary.description}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-muted/50 rounded-md p-3 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Your donation has been accepted by an NGO. Request their details to learn more about the organization.
                    </p>
                    
                    {isPendingRequest && (
                      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 gap-1">
                        <Clock className="h-3 w-3" />
                        Request Pending
                      </Badge>
                    )}
                    
                    {isDeniedRequest && (
                      <div className="space-y-2">
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 gap-1">
                          <XCircle className="h-3 w-3" />
                          Request Declined
                        </Badge>
                        {consentRequest.ngoNote && (
                          <p className="text-xs text-muted-foreground italic">
                            "{consentRequest.ngoNote}"
                          </p>
                        )}
                      </div>
                    )}
                    
                    {canRequestNgoDetails && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="gap-2"
                        onClick={() => requestNgoDetailsMutation.mutate(donation.id)}
                        disabled={requestNgoDetailsMutation.isPending}
                        data-testid="button-request-ngo-details"
                      >
                        <Send className="h-3 w-3" />
                        {requestNgoDetailsMutation.isPending ? "Sending..." : "Request NGO Details"}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {deliveryTask && (
                <>
                  <DeliveryInfoCard 
                    deliveryTask={deliveryTask} 
                    agentDisplayName={details?.agentDisplayName} 
                  />
                  <ProofPhotos 
                    pickupProofUrl={deliveryTask.pickupProofUrl}
                    deliveryProofUrl={deliveryTask.deliveryProofUrl}
                  />
                </>
              )}

              {distributionEvent && (
                <div data-testid="distribution-impact-summary">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Impact Summary
                  </h4>
                  <div className="bg-emerald-50 dark:bg-emerald-950 rounded-md p-3 space-y-2">
                    <p className="font-medium text-emerald-800 dark:text-emerald-200">
                      Your donation made a difference!
                    </p>
                    
                    {distributionEvent.impactDescription && (
                      <p className="text-sm text-emerald-700 dark:text-emerald-300 italic border-l-2 border-emerald-300 dark:border-emerald-700 pl-2">
                        "{distributionEvent.impactDescription}"
                      </p>
                    )}
                    
                    <div className="text-sm text-emerald-700 dark:text-emerald-300 space-y-1">
                      <p>Event: {distributionEvent.distributionType}</p>
                      <p>Community Served: {distributionEvent.area}</p>
                      <p>Date: {formatDate(distributionEvent.eventDate)}</p>
                      {distributionEvent.beneficiaryCount && distributionEvent.beneficiaryCount > 0 && (
                        <p>People reached: ~{distributionEvent.beneficiaryCount}</p>
                      )}
                      {distributionEvent.itemCount && distributionEvent.itemCount > 0 && (
                        <p>Total items in event: {distributionEvent.itemCount}</p>
                      )}
                    </div>
                    {distributionEvent.photoUrls && distributionEvent.photoUrls.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-800">
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mb-2">
                          <ImageIcon className="h-3 w-3" />
                          Event Photos
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {distributionEvent.photoUrls.slice(0, 3).map((url, idx) => (
                            <ClickableSignedImage 
                              key={idx}
                              objectPath={url} 
                              alt={`Distribution event ${idx + 1}`}
                              className="w-full h-full object-cover"
                              containerClassName="block w-16 h-16 rounded-md overflow-hidden border border-emerald-200 dark:border-emerald-700"
                              data-testid={`distribution-photo-${idx}`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <CreatedAtFootnote createdAt={donation.createdAt} />
        </>
      )}
    </DonationDrawerBase>
  );
}
