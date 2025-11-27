"use client";

import { useState, useRef } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { compressImage, createPreviewUrl, revokePreviewUrl } from "@/lib/utils/image-compression";
import { ImageLightbox } from "@/components/ui/image-lightbox";

interface IdProofUploadProps {
  label: string;
  currentUrl?: string;
  onUploadComplete: (url: string) => void;
  onRemove?: () => void;
}

export function IdProofUpload({
  label,
  currentUrl,
  onUploadComplete,
  onRemove,
}: IdProofUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create instant preview for immediate feedback
    const instantPreview = createPreviewUrl(file);
    setPreview(instantPreview);
    onUploadComplete(instantPreview); // Update immediately with preview

    setUploading(true);

    try {
      // Compress and upload in background (non-blocking)
      const compressedFile = await compressImage(file);

      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const fileName = `${timestamp}-${random}.jpg`;
      const filePath = `customer-id-proofs/${fileName}`;

      // Upload compressed file to Supabase Storage with optimized settings
      const { error: uploadError } = await supabase.storage
        .from("customer-id-proofs")
        .upload(filePath, compressedFile, {
          cacheControl: "31536000", // 1 year cache
          upsert: false,
          contentType: "image/jpeg",
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("customer-id-proofs").getPublicUrl(filePath);

      // Revoke preview URL to free memory
      revokePreviewUrl(instantPreview);

      // Update with final URL (replaces preview)
      onUploadComplete(publicUrl);
    } catch (error) {
      console.error("Error uploading file:", error);
      // Revoke preview on error
      revokePreviewUrl(instantPreview);
      setPreview(null);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    setPreview(null);
    if (onRemove) {
      onRemove();
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm text-gray-600">{label} (Optional)</Label>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {preview ? (
        <div className="relative">
          <div className="border-2 border-gray-200 rounded-xl p-2 bg-gray-50">
            <img
              src={preview}
              alt={label}
              className="w-full h-48 object-contain rounded-lg cursor-pointer hover:opacity-80 transition-opacity active:scale-95"
              onClick={() => setSelectedImage(preview)}
            />
          </div>
          <div className="flex gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={triggerFileSelect}
              disabled={uploading}
              className="flex-1 h-12"
            >
              {uploading ? "Uploading..." : "Change"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
              className="h-12 px-4 text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={triggerFileSelect}
          disabled={uploading}
          className="w-full h-32 border-2 border-dashed border-gray-300 hover:border-sky-500 hover:bg-sky-50 flex flex-col items-center justify-center gap-2"
        >
          {uploading ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
          ) : (
            <>
              <Camera className="h-8 w-8 text-gray-400" />
              <span className="text-sm text-gray-600">Tap to upload {label}</span>
            </>
          )}
        </Button>
      )}

      {/* Image Lightbox */}
      {selectedImage && (
        <ImageLightbox
          imageUrl={selectedImage}
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          alt={label}
        />
      )}
    </div>
  );
}

