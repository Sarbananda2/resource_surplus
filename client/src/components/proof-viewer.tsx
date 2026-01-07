import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, MapPin, Shield } from "lucide-react";
import { SignedImage } from "@/components/signed-image";
import type { Donation } from "@shared/schema";

interface ProofViewerProps {
  donation: Donation;
}

export function ProofViewer({ donation }: ProofViewerProps) {
  return (
    <div className="space-y-4" data-testid="proof-viewer">
      <h4 className="text-sm font-medium text-muted-foreground">Proof Photos</h4>
      
      <div className="grid gap-4 md:grid-cols-2">
        {donation.pickupProofUrl && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Pickup Proof
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-video bg-muted rounded-md overflow-hidden mb-3">
                <SignedImage
                  objectPath={donation.pickupProofUrl}
                  alt="Pickup proof"
                  className="object-cover w-full h-full"
                  data-testid="img-pickup-proof"
                />
                <Badge 
                  variant="secondary" 
                  className="absolute bottom-2 left-2 gap-1 text-xs bg-background/80 backdrop-blur-sm"
                >
                  <Shield className="h-3 w-3" />
                  Faces Blurred
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {donation.area}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {donation.deliveryProofUrl && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Delivery Proof
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-video bg-muted rounded-md overflow-hidden mb-3">
                <SignedImage
                  objectPath={donation.deliveryProofUrl}
                  alt="Delivery proof"
                  className="object-cover w-full h-full"
                  data-testid="img-delivery-proof"
                />
                <Badge 
                  variant="secondary" 
                  className="absolute bottom-2 left-2 gap-1 text-xs bg-background/80 backdrop-blur-sm"
                >
                  <Shield className="h-3 w-3" />
                  Faces Blurred
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  NGO Warehouse
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Shield className="h-3 w-3" />
        All photos are automatically processed to protect privacy. Exact addresses are never shown.
      </p>
    </div>
  );
}
