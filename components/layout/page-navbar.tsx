"use client";

import Link from "next/link";
import { ArrowLeft, LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface PageNavbarProps {
  title: string;
  backHref?: string;
  onBackClick?: () => void;
  actions?: ReactNode;
  className?: string;
  subtitle?: string;
}

/**
 * Modern, professional page navbar component
 * Used across all detail pages for consistent navigation
 */
export function PageNavbar({
  title,
  backHref,
  onBackClick,
  actions,
  className,
  subtitle,
}: PageNavbarProps) {
  const handleBack = () => {
    if (onBackClick) {
      onBackClick();
    }
  };

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200/80",
        "shadow-sm",
        className
      )}
    >
      <div className="px-4 md:px-6 py-3 md:py-3.5">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Back button + Title */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {(backHref || onBackClick) && (
              <Link
                href={backHref || "#"}
                onClick={onBackClick ? (e) => {
                  e.preventDefault();
                  handleBack();
                } : undefined}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors flex-shrink-0 group"
                aria-label="Go back"
              >
                <ArrowLeft className="h-4 w-4 text-gray-600 group-hover:text-gray-900 transition-colors" />
              </Link>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-base md:text-lg font-semibold text-gray-900 truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs md:text-sm text-gray-500 mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

