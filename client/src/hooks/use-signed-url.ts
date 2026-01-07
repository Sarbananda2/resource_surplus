import { useQuery } from "@tanstack/react-query";

interface SignedUrlResponse {
  url: string;
}

export function useSignedUrl(objectPath: string | null | undefined) {
  return useQuery<SignedUrlResponse>({
    queryKey: ["/api/objects/signed-url", objectPath],
    queryFn: async () => {
      if (!objectPath) {
        throw new Error("No object path provided");
      }
      const response = await fetch(`/api/objects/signed-url?path=${encodeURIComponent(objectPath)}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to get signed URL");
      }
      return response.json();
    },
    enabled: !!objectPath,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 15,
    retry: 1,
  });
}
