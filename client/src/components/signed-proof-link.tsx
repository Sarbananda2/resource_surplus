import { useState } from "react";
import { Camera, Loader2 } from "lucide-react";

interface SignedProofLinkProps {
  objectPath: string;
  testId?: string;
}

export function SignedProofLink({ objectPath, testId }: SignedProofLinkProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/objects/signed-url?path=${encodeURIComponent(objectPath)}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to get signed URL");
      }
      
      const data = await response.json();
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Failed to open proof photo:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      onClick={handleClick}
      className="text-xs text-primary hover:underline flex items-center gap-1 mt-1 cursor-pointer bg-transparent border-none p-0"
      data-testid={testId}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Camera className="h-3 w-3" />
      )}
      View photo proof
    </button>
  );
}
