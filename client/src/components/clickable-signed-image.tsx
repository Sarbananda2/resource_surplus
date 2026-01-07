import { useState } from "react";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageOff, Loader2 } from "lucide-react";

interface ClickableSignedImageProps {
  objectPath: string | null | undefined;
  alt: string;
  className?: string;
  containerClassName?: string;
  "data-testid"?: string;
}

export function ClickableSignedImage({ 
  objectPath, 
  alt, 
  className, 
  containerClassName,
  "data-testid": testId 
}: ClickableSignedImageProps) {
  const { data, isLoading, isError } = useSignedUrl(objectPath);
  const [isOpening, setIsOpening] = useState(false);

  const handleClick = async () => {
    if (!objectPath) return;
    setIsOpening(true);
    
    try {
      const response = await fetch(`/api/objects/signed-url?path=${encodeURIComponent(objectPath)}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to get signed URL");
      }
      
      const freshData = await response.json();
      window.open(freshData.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Failed to open image:", error);
    } finally {
      setIsOpening(false);
    }
  };

  if (!objectPath) {
    return null;
  }

  if (isLoading) {
    return <Skeleton className={containerClassName || className} />;
  }

  if (isError || !data?.url) {
    return (
      <div className={`flex items-center justify-center bg-muted ${containerClassName || className}`}>
        <ImageOff className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`relative cursor-pointer bg-transparent border-none p-0 ${containerClassName}`}
      data-testid={testId}
      disabled={isOpening}
      type="button"
    >
      <img
        src={data.url}
        alt={alt}
        className={className}
      />
      {isOpening && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <Loader2 className="h-4 w-4 animate-spin text-white" />
        </div>
      )}
    </button>
  );
}
