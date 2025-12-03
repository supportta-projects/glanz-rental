/**
 * Security utilities for input sanitization and validation
 * Prevents XSS, injection attacks, and validates user inputs
 */

/**
 * Sanitize string input to prevent XSS attacks
 * Removes dangerous HTML/script tags and encodes special characters
 */
export function sanitizeInput(input: string | null | undefined): string {
  if (!input) return "";
  
  // Remove null bytes
  let sanitized = input.replace(/\0/g, "");
  
  // Remove script tags and event handlers
  sanitized = sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/data:text\/html/gi, "");
  
  // Encode HTML entities
  const entityMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
    "/": "&#x2F;",
  };
  
  return sanitized.replace(/[&<>"'/]/g, (s) => entityMap[s]);
}

/**
 * Sanitize phone number - only allow digits, +, -, spaces
 */
export function sanitizePhone(phone: string | null | undefined): string {
  if (!phone) return "";
  return phone.replace(/[^\d+\-\s()]/g, "").trim();
}

/**
 * Sanitize email - validate format and remove dangerous characters
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return "";
  const sanitized = email.trim().toLowerCase();
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    return "";
  }
  return sanitized;
}

/**
 * Sanitize numeric input - only allow numbers
 */
export function sanitizeNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    if (isNaN(value) || !isFinite(value)) return 0;
    return value;
  }
  if (!value) return 0;
  const parsed = parseFloat(String(value));
  return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string | null | undefined): boolean {
  if (!uuid) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Sanitize URL to prevent open redirect attacks
 */
export function sanitizeUrl(url: string | null | undefined, allowedDomains?: string[]): string {
  if (!url) return "";
  
  try {
    const parsed = new URL(url);
    
    // If allowedDomains provided, validate domain
    if (allowedDomains && allowedDomains.length > 0) {
      const domain = parsed.hostname.toLowerCase();
      const isAllowed = allowedDomains.some((allowed) => 
        domain === allowed.toLowerCase() || domain.endsWith(`.${allowed.toLowerCase()}`)
      );
      if (!isAllowed) {
        return "";
      }
    }
    
    // Only allow http/https protocols
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "";
    }
    
    return parsed.toString();
  } catch {
    // Invalid URL
    return "";
  }
}

/**
 * Rate limiting helper - simple in-memory rate limiter
 * For production, use Redis or database-backed rate limiting
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
}

/**
 * Clean up old rate limit records to prevent memory leaks
 */
export function cleanupRateLimit(olderThanMs: number = 300000): void {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime + olderThanMs) {
      rateLimitMap.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof window === "undefined") {
  setInterval(() => cleanupRateLimit(), 300000);
}

