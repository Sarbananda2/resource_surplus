import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChainOfCustodyTimeline } from "@/components/chain-of-custody-timeline";
import { ClickableSignedImage } from "@/components/clickable-signed-image";
import { Check, Box, UserPlus, Calendar, MapPin, CheckCircle } from "lucide-react";
import type { Donation, DeliveryTask, DeliveryAgentProfile, DistributionEvent } from "@shared/schema";
import {
  DonationDrawerBase,
  DonationBadges,
  DescriptionSection,
  LocationSection,
  AvailabilityWindow,
  PersonInfo,
  DeliveryInfoCard,
  ProofPhotos,
  CreatedAtFootnote,
} from "./donation-drawer-base";

interface DonationDetailDrawerProps {
  donationId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onAccept?: (id: string, assignedAgentProfileId?: string) => void;
  onConfirmReceipt?: (id: string, status: string) => void;
  isAccepting?: boolean;
  isConfirming?: boolean;
  onBuildTeam?: () => void;
}

interface DonationDetails {
  donation: Donation;
  deliveryTask: DeliveryTask | null;
  donorDisplayName: string | null;
  agentDisplayName: string | null;
}

interface VolunteerWithProfile {
  id: string;
  userProfileId: string;
  displayName: string;
  transportType: string | null;
  isAvailable: boolean;
}

export function DonationDetailDrawer({ 
  donationId, 
  isOpen, 
  onClose, 
  onAccept, 
  onConfirmReceipt,
  isAccepting,
  isConfirming,
  onBuildTeam
}: DonationDetailDrawerProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");

  // Reset selected agent when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedAgentId("");
    }
  }, [isOpen]);

  const { data: details, isLoading } = useQuery<DonationDetails>({
    queryKey: ["/api/ngo/donations", donationId, "details"],
    queryFn: async () => {
      if (!donationId) {
        throw new Error("No donation ID provided");
      }
      const response = await fetch(`/api/ngo/donations/${donationId}/details`);
      if (!response.ok) {
        throw new Error("Failed to fetch donation details");
      }
      return response.json();
    },
    enabled: !!donationId && isOpen,
  });

  // Fetch available volunteers for assignment
  const { data: volunteers } = useQuery<VolunteerWithProfile[]>({
    queryKey: ["/api/ngo/volunteers/available"],
    enabled: isOpen && details?.donation?.status === "listed",
  });

  // Fetch distribution events to show linked event in timeline
  const { data: distributionEvents } = useQuery<DistributionEvent[]>({
    queryKey: ["/api/ngo/distribution-events"],
    enabled: isOpen && !!details?.donation?.distributionEventId,
  });

  const donation = details?.donation;
  const deliveryTask = details?.deliveryTask;
  
  // Find the distribution event linked to this donation
  const linkedDistributionEvent = donation?.distributionEventId && distributionEvents
    ? distributionEvents.find(e => e.id === donation.distributionEventId)
    : undefined;
  const isPreAccept = donation?.status === "listed";
  const isPendingReceipt = donation?.status === "delivered";
  const isDistributed = donation?.status === "distributed";

  const hasVolunteers = volunteers && volunteers.length > 0;

  const footer = donation ? (
    <>
      {isPreAccept && onAccept && (
        <div className="w-full space-y-3">
          {hasVolunteers ? (
            <>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Assign volunteer <span className="text-destructive">*</span>
                </label>
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger data-testid="select-assign-volunteer">
                    <SelectValue placeholder="Select a volunteer" />
                  </SelectTrigger>
                  <SelectContent>
                    {volunteers.map((volunteer) => (
                      <SelectItem 
                        key={volunteer.id} 
                        value={volunteer.id}
                        data-testid={`select-volunteer-${volunteer.id}`}
                      >
                        {volunteer.displayName}
                        {volunteer.transportType && ` (${volunteer.transportType})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                className="w-full gap-2" 
                onClick={() => onAccept(donation.id, selectedAgentId)}
                disabled={isAccepting || !selectedAgentId}
                data-testid="button-drawer-accept"
              >
                <Check className="h-4 w-4" />
                {isAccepting ? "Accepting..." : "Accept Donation"}
              </Button>
            </>
          ) : (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h4 className="font-medium mb-1">No volunteers available</h4>
                <p className="text-sm text-muted-foreground">
                  You need at least one approved volunteer to accept donations. Build your team to start accepting!
                </p>
              </div>
              <Button 
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  onClose();
                  onBuildTeam?.();
                }}
                data-testid="button-go-to-team"
              >
                <UserPlus className="h-4 w-4" />
                Build Your Team
              </Button>
            </div>
          )}
        </div>
      )}
      {isPendingReceipt && onConfirmReceipt && (
        <div className="w-full space-y-2">
          <Button 
            className="w-full gap-2" 
            onClick={() => onConfirmReceipt(donation.id, "received")}
            disabled={isConfirming}
            data-testid="button-drawer-confirm"
          >
            <Box className="h-4 w-4" />
            {isConfirming ? "Confirming..." : "Confirm Receipt"}
          </Button>
          <Button 
            variant="outline"
            className="w-full" 
            onClick={() => onConfirmReceipt(donation.id, "partially_usable")}
            disabled={isConfirming}
          >
            Partially Usable
          </Button>
        </div>
      )}
      {!isPreAccept && !isPendingReceipt && (
        <Button variant="outline" className="w-full" onClick={onClose}>
          Close
        </Button>
      )}
    </>
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
          <LocationSection area={donation.area} />
          <AvailabilityWindow 
            start={donation.availabilityStart} 
            end={donation.availabilityEnd} 
          />
          
          {details?.donorDisplayName && (
            <PersonInfo label="Donor" name={details.donorDisplayName} />
          )}

          {!isPreAccept && deliveryTask && (
            <>
              <Separator />
              <DeliveryInfoCard 
                deliveryTask={deliveryTask} 
                agentDisplayName={details?.agentDisplayName} 
              />
              <ChainOfCustodyTimeline 
                donation={donation}
                deliveryTask={deliveryTask}
                distributionEvent={linkedDistributionEvent}
                showProofLinks={true}
              />
              <ProofPhotos 
                pickupProofUrl={deliveryTask.pickupProofUrl}
                deliveryProofUrl={deliveryTask.deliveryProofUrl}
              />
            </>
          )}

          {isDistributed && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span>Distribution Summary</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      Distributed on {donation.distributedAt 
                        ? new Date(donation.distributedAt).toLocaleDateString() 
                        : "Date not recorded"}
                    </span>
                  </div>
                  {linkedDistributionEvent ? (
                    <>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{linkedDistributionEvent.area}</span>
                      </div>
                      <div className="text-muted-foreground">
                        Event: {linkedDistributionEvent.distributionType}
                      </div>
                      {linkedDistributionEvent.beneficiaryCount && (
                        <div className="text-muted-foreground">
                          Beneficiaries served: {linkedDistributionEvent.beneficiaryCount}
                        </div>
                      )}
                      {linkedDistributionEvent.photoUrls && linkedDistributionEvent.photoUrls.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {linkedDistributionEvent.photoUrls.slice(0, 3).map((url, i) => (
                            <ClickableSignedImage 
                              key={i}
                              objectPath={url} 
                              alt={`Event photo ${i + 1}`} 
                              className="w-full h-full object-cover"
                              containerClassName="block w-16 h-16 rounded-md overflow-hidden bg-muted"
                            />
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-muted-foreground text-xs">
                      Event details not linked
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <CreatedAtFootnote createdAt={donation.createdAt} />
        </>
      )}
    </DonationDrawerBase>
  );
}
