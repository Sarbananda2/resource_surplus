import { useSignedUrl } from "@/hooks/use-signed-url";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageOff } from "lucide-react";

interface SignedImageProps {
  objectPath: string | null | undefined;
  alt: string;
  className?: string;
  "data-testid"?: string;
}

export function SignedImage({ objectPath, alt, className, "data-testid": testId }: SignedImageProps) {
  const { data, isLoading, isError } = useSignedUrl(objectPath);

  if (!objectPath) {
    return null;
  }

  if (isLoading) {
    return <Skeleton className={className} />;
  }

  if (isError || !data?.url) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <ImageOff className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={data.url}
      alt={alt}
      className={className}
      data-testid={testId}
    />
  );
}
