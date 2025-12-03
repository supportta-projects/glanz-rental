import imageCompression from "browser-image-compression";

/**
 * Ultra-fast image compression optimized for maximum speed
 * Uses aggressive settings for instant feedback while maintaining quality
 * Optimized for mobile devices and staff productivity
 */
export async function compressImage(file: File): Promise<File> {
  // Skip compression for very small files (< 100KB) for instant processing
  if (file.size < 100 * 1024) {
    return file;
  }

  const options = {
    maxSizeMB: 0.15, // 150KB max for ultra-fast uploads
    maxWidthOrHeight: 1024, // Reduced further for faster processing
    useWebWorker: true, // Critical for non-blocking compression
    fileType: "image/jpeg", // Always use JPEG for best compression/speed ratio
    initialQuality: 0.8, // Balanced quality/speed ratio
    alwaysKeepResolution: false,
    exifOrientation: 1, // Skip EXIF processing for speed
    maxIteration: 10, // Limit iterations for faster compression
  };

  try {
    // Compress with aggressive timeout for ultra-fast processing (1.5 seconds)
    const compressionPromise = imageCompression(file, options);
    const timeoutPromise = new Promise<File>((_, reject) =>
      setTimeout(() => reject(new Error("Compression timeout")), 1500)
    );

    const compressedFile = await Promise.race([compressionPromise, timeoutPromise]);
    
    return compressedFile;
  } catch (error) {
    // Silently fallback to original file for maximum speed
    // No console warnings in production to avoid noise
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

