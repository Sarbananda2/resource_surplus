import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";

interface UploadResponse {
  objectPath: string;
  fileName: string;
}

interface UseUploadOptions {
  onSuccess?: (response: UploadResponse) => void;
  onError?: (error: Error) => void;
}

export function useUpload(options: UseUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = async (file: File): Promise<UploadResponse | null> => {
    setIsUploading(true);
    setProgress(0);

    try {
      // Request presigned URL
      const presignedResponse = await apiRequest("POST", "/api/uploads/request-url", {
        name: file.name,
        size: file.size,
        contentType: file.type,
      });

      const { uploadURL, objectPath } = await presignedResponse.json();

      // Upload file directly to object storage
      setProgress(30);
      const uploadResponse = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      setProgress(100);

      const result = { objectPath, fileName: file.name };
      options.onSuccess?.(result);
      return result;
    } catch (error) {
      options.onError?.(error as Error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadFile, isUploading, progress };
}
