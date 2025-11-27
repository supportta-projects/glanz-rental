import imageCompression from "browser-image-compression";

/**
 * Ultra-fast image compression optimized for 90% quality
 * Uses aggressive settings for maximum speed while maintaining quality
 * Optimized for mobile devices with instant feedback
 */
export async function compressImage(file: File): Promise<File> {
  // Skip compression for very small files (< 50KB) for instant processing
  if (file.size < 50 * 1024) {
    return file;
  }

  const options = {
    maxSizeMB: 0.2, // Reduced to 200KB for ultra-fast uploads
    maxWidthOrHeight: 1200, // Reduced for faster processing on mobile
    useWebWorker: true, // Critical for non-blocking compression
    fileType: "image/jpeg", // Always use JPEG for best compression/speed ratio
    initialQuality: 0.85, // Slightly reduced for faster compression (still high quality)
    alwaysKeepResolution: false,
    exifOrientation: 1, // Skip EXIF processing for speed
  };

  try {
    // Compress with aggressive timeout for ultra-fast processing
    const compressionPromise = imageCompression(file, options);
    const timeoutPromise = new Promise<File>((_, reject) =>
      setTimeout(() => reject(new Error("Compression timeout")), 2000) // Reduced to 2 seconds
    );

    const compressedFile = await Promise.race([compressionPromise, timeoutPromise]);
    
    return compressedFile;
  } catch (error) {
    console.warn("Image compression failed or timed out, using original:", error);
    // Return original file for ultra-fast fallback
    return file;
  }
}

/**
 * Create instant preview blob URL for immediate UI feedback
 * This allows users to see the image before upload completes
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revoke blob URL to free memory
 */
export function revokePreviewUrl(url: string): void {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

