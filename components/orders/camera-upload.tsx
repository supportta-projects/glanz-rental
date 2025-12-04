"use client";

import { useRef, useState, useCallback } from "react";
import { Camera, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { compressImage, createPreviewUrl, revokePreviewUrl } from "@/lib/utils/image-compression";
import { useToast } from "@/components/ui/toast";

export type UploadStatus = "idle" | "uploading" | "completed" | "failed";

export interface UploadResult {
  previewUrl: string;
  finalUrl?: string;
  status: UploadStatus;
  error?: string;
  promise: Promise<string>;
}

interface CameraUploadProps {
  onUploadComplete: (result: UploadResult) => void;
  currentUrl?: string;
  disabled?: boolean;
}

export function CameraUpload({ onUploadComplete, currentUrl, disabled = false }: CameraUploadProps) {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadPromiseRef = useRef<Promise<string> | null>(null);
  const supabase = createClient();
  const { showToast } = useToast();

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Prevent multiple uploads
    if (uploadStatus === "uploading") {
      showToast("Upload already in progress", "info");
      return;
    }

    // Create instant preview for immediate feedback
    const instantPreview = createPreviewUrl(file);
    setPreviewUrl(instantPreview);
    setUploadError(null);
    setUploadStatus("uploading");

    // Create upload promise
    const uploadPromise = (async (): Promise<string> => {
      try {
        // Compress image (with timeout for speed)
        let compressedFile: File;
        try {
          compressedFile = await Promise.race([
            compressImage(file),
            new Promise<File>((_, reject) => 
              setTimeout(() => reject(new Error("Compression timeout")), 2000)
            )
          ]);
        } catch (compressionError: any) {
          // If compression fails or times out, use original file
          compressedFile = file;
        }

        // Generate unique filename
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const fileName = `${timestamp}-${random}.jpg`;
        const filePath = `order-items/${fileName}`;

        // Upload to Supabase Storage with optimized settings
        const { error: uploadError } = await supabase.storage
          .from("order-items")
          .upload(filePath, compressedFile, {
            cacheControl: "31536000",
            upsert: false,
            contentType: "image/jpeg",
          });

        if (uploadError) {
          throw new Error(uploadError.message || "Upload failed");
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("order-items").getPublicUrl(filePath);

        setUploadStatus("completed");
        revokePreviewUrl(instantPreview);
        setPreviewUrl(null);
        
        return publicUrl;
      } catch (error: any) {
        const errorMessage = error.message || "Upload failed. Please try again.";
        setUploadError(errorMessage);
        setUploadStatus("failed");
        showToast(errorMessage, "error");
        throw error;
      } finally {
        // Reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    })();

    uploadPromiseRef.current = uploadPromise;

    // Call callback immediately with preview URL and promise
    onUploadComplete({
      previewUrl: instantPreview,
      status: "uploading",
      promise: uploadPromise,
    });

    // Wait for upload to complete and update with final URL
    uploadPromise
      .then((finalUrl) => {
        onUploadComplete({
          previewUrl: instantPreview,
          finalUrl,
          status: "completed",
          promise: Promise.resolve(finalUrl),
        });
      })
      .catch((error) => {
        onUploadComplete({
          previewUrl: instantPreview,
          status: "failed",
          error: error.message,
          promise: Promise.reject(error),
        });
      });
  }, [uploadStatus, showToast, supabase, onUploadComplete]);

  const handleRemove = useCallback(() => {
    if (previewUrl) {
      revokePreviewUrl(previewUrl);
      setPreviewUrl(null);
    }
    setUploadStatus("idle");
    setUploadError(null);
    uploadPromiseRef.current = null;
    onUploadComplete({
      previewUrl: "",
      status: "idle",
      promise: Promise.resolve(""),
    });
  }, [previewUrl, onUploadComplete]);

  const handleRetry = useCallback(() => {
    setUploadError(null);
    setUploadStatus("idle");
    // User can select file again
    fileInputRef.current?.click();
  }, []);

  const triggerCamera = () => {
    if (!disabled && uploadStatus !== "uploading") {
      fileInputRef.current?.click();
    }
  };

  const displayUrl = currentUrl || previewUrl;
  const isUploading = uploadStatus === "uploading";
  const isFailed = uploadStatus === "failed";
  const isCompleted = uploadStatus === "completed" && currentUrl;

  return (
    <div className="flex flex-col items-center gap-2">
      {displayUrl ? (
        <div className="relative">
          <img
            src={displayUrl}
            alt="Product"
            className={`w-20 h-20 object-cover rounded-lg border-2 ${
              isUploading ? "border-blue-300" : isFailed ? "border-red-300" : "border-gray-200"
            }`}
          />
          {isUploading && (
            <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
            </div>
          )}
          {isFailed && (
            <div className="absolute inset-0 bg-red-500/20 rounded-lg flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          )}
          {isCompleted && (
            <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
              <CheckCircle2 className="h-4 w-4 text-white" />
            </div>
          )}
          {!isUploading && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors z-10"
              aria-label="Remove photo"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <Button
          type="button"
          onClick={triggerCamera}
          disabled={disabled || isUploading}
          className="h-20 w-20 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition-all active:scale-95"
        >
          {isUploading ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
          ) : (
            <Camera className="h-8 w-8 text-gray-400" />
          )}
        </Button>
      )}
      
      {isFailed && uploadError && (
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs text-red-600 text-center max-w-[120px]">{uploadError}</p>
          <Button
            type="button"
            onClick={handleRetry}
            variant="outline"
            size="sm"
            className="h-7 text-xs"
          >
            Retry
          </Button>
        </div>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />
    </div>
  );
}
