/**
 * Performance monitoring utilities
 * Tracks load times, query times, and navigation performance
 */

/**
 * Measure execution time of a function
 * Returns the result and execution time in milliseconds
 */
export async function measurePerformance<T>(
  fn: () => Promise<T>,
  label?: string
): Promise<{ result: T; time: number }> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  const time = end - start;

  if (process.env.NODE_ENV === "development" && label) {
    console.log(`[Performance] ${label}: ${time.toFixed(2)}ms`);
  }

  // Log slow operations (>50ms)
  if (time > 50 && label) {
    console.warn(`[Performance Warning] ${label} took ${time.toFixed(2)}ms (>50ms threshold)`);
  }

  return { result, time };
}

/**
 * Measure synchronous function execution time
 */
export function measurePerformanceSync<T>(
  fn: () => T,
  label?: string
): { result: T; time: number } {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  const time = end - start;

  if (process.env.NODE_ENV === "development" && label) {
    console.log(`[Performance] ${label}: ${time.toFixed(2)}ms`);
  }

  if (time > 50 && label) {
    console.warn(`[Performance Warning] ${label} took ${time.toFixed(2)}ms (>50ms threshold)`);
  }

  return { result, time };
}

/**
 * Create a debounced version of a function for performance
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 300
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Create a throttled version of a function for performance
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number = 100
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Check if performance API is available
 */
export function isPerformanceAPIAvailable(): boolean {
  return typeof window !== "undefined" && "performance" in window;
}

/**
 * Get navigation timing metrics
 */
export function getNavigationTiming(): {
  domContentLoaded: number;
  loadComplete: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
} | null {
  if (typeof window === "undefined" || !window.performance) {
    return null;
  }

  const timing = window.performance.timing;
  const navigation = window.performance.getEntriesByType(
    "navigation"
  )[0] as PerformanceNavigationTiming;

  const metrics = {
    domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
    loadComplete: timing.loadEventEnd - timing.navigationStart,
  };

  // Get paint timing if available
  const paintEntries = window.performance.getEntriesByType("paint");
  const firstPaint = paintEntries.find((entry) => entry.name === "first-paint");
  const firstContentfulPaint = paintEntries.find(
    (entry) => entry.name === "first-contentful-paint"
  );

  return {
    ...metrics,
    firstPaint: firstPaint ? Math.round(firstPaint.startTime) : undefined,
    firstContentfulPaint: firstContentfulPaint
      ? Math.round(firstContentfulPaint.startTime)
      : undefined,
  };
}

/**
 * Log performance metrics (for debugging)
 */
export function logPerformanceMetrics(): void {
  if (process.env.NODE_ENV === "development") {
    const metrics = getNavigationTiming();
    if (metrics) {
      console.table(metrics);
    }
  }
}

