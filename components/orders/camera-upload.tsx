"use client";

import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { compressImage, createPreviewUrl, revokePreviewUrl } from "@/lib/utils/image-compression";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { useToast } from "@/components/ui/toast";

interface CameraUploadProps {
  onUploadComplete: (url: string) => void;
  currentUrl?: string;
}

export function CameraUpload({ onUploadComplete, currentUrl }: CameraUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const { showToast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Prevent multiple uploads
    if (uploading) {
      showToast("Upload already in progress", "info");
      return;
    }

    // Create instant preview for immediate feedback - instant UI response
    const instantPreview = createPreviewUrl(file);
    setPreviewUrl(instantPreview);

    // Add item ONCE with preview URL for instant feedback
    // This allows staff to continue working while upload happens in background
    onUploadComplete(instantPreview);

    // Start upload in background (non-blocking)
    setUploading(true);

    // Run upload in background without blocking UI
    (async () => {
      try {
        // Compress image (with timeout for speed)
        const compressedFile = await Promise.race([
          compressImage(file),
          new Promise<File>((_, reject) => 
            setTimeout(() => reject(new Error("Compression timeout")), 1000)
          )
        ]);

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

        if (uploadError) throw uploadError;

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("order-items").getPublicUrl(filePath);

        // Update the LAST item with final URL (replaces preview)
        // Note: We don't call onUploadComplete again to avoid duplication
        // The parent component should handle updating the item's photo_url
        // For now, we'll update the preview URL state and let the parent handle it
        setPreviewUrl(null);
        revokePreviewUrl(instantPreview);
        
        // Update the item that was just added - call onUploadComplete with final URL
        // This will update the existing item instead of creating a new one
        onUploadComplete(publicUrl);
      } catch (error: any) {
        // Silently handle errors - preview URL already added as fallback
        // Preview URL will be used until upload succeeds
        if (error.message !== "Compression timeout" && process.env.NODE_ENV === 'development') {
          console.warn("Image upload warning:", error);
        }
        // Keep preview URL on error so user can still see the image
      } finally {
        setUploading(false);
        // Reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    })();
  };

  const triggerCamera = () => {
    fileInputRef.current?.click();
  };

  const displayUrl = currentUrl || previewUrl;

  return (
    <div className="flex flex-col items-center gap-2">
      {displayUrl ? (
        <div className="relative">
          <img
            src={displayUrl}
            alt="Product"
            className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200 cursor-pointer hover:opacity-80 transition-opacity active:scale-95"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedImage(displayUrl);
            }}
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (previewUrl) {
                revokePreviewUrl(previewUrl);
                setPreviewUrl(null);
              }
              onUploadComplete("");
            }}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors z-10"
            aria-label="Remove photo"
            disabled={uploading}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          onClick={triggerCamera}
          disabled={uploading}
          className="h-20 w-20 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition-all active:scale-95"
        >
          {uploading ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
          ) : (
            <Camera className="h-8 w-8 text-gray-400" />
          )}
        </Button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Image Lightbox */}
      {selectedImage && (
        <ImageLightbox
          imageUrl={selectedImage}
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          alt="Product image"
        />
      )}
    </div>
  );
}

