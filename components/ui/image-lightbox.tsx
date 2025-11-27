"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface ImageLightboxProps {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
  alt?: string;
}

export function ImageLightbox({ imageUrl, isOpen, onClose, alt = "Product image" }: ImageLightboxProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-7xl w-full h-[90vh] p-0 bg-black/95 border-none"
        onClose={onClose}
      >
        <div 
          className="relative w-full h-full flex items-center justify-center"
          onClick={onClose}
        >
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute top-4 right-4 z-50 h-12 w-12 rounded-full bg-black/50 hover:bg-black/70 text-white border border-white/20"
            aria-label="Close image"
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Image - Click to close */}
          <img
            src={imageUrl}
            alt={alt}
            className="max-w-full max-h-full object-contain cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            onTouchEnd={(e) => {
              // Handle touch to close on mobile
              e.stopPropagation();
              onClose();
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

