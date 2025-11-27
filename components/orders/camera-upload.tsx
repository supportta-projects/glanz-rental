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

    // Create instant preview for immediate feedback (but don't add item yet)
    const instantPreview = createPreviewUrl(file);
    setPreviewUrl(instantPreview);

    setUploading(true);

    try {
      // Compress and upload in background (non-blocking)
      const compressedFile = await compressImage(file);

      // Generate unique filename with timestamp for better uniqueness
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const fileExt = "jpg"; // Always use jpg for consistency
      const fileName = `${timestamp}-${random}.${fileExt}`;
      const filePath = `order-items/${fileName}`;

      // Upload compressed file to Supabase Storage with optimized settings
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("order-items")
        .upload(filePath, compressedFile, {
          cacheControl: "31536000", // 1 year cache
          upsert: false,
          contentType: "image/jpeg",
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("order-items").getPublicUrl(filePath);

      // Revoke preview URL to free memory
      revokePreviewUrl(instantPreview);
      setPreviewUrl(null);

      // Call onUploadComplete only once with final URL (adds item to order)
      onUploadComplete(publicUrl);
    } catch (error: any) {
      console.error("Error uploading file:", error);
      // Revoke preview on error
      if (previewUrl) {
        revokePreviewUrl(previewUrl);
        setPreviewUrl(null);
      }
      showToast("Failed to upload image. Please try again.", "error");
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
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

