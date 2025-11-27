"use client";

import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Find the scroll container using data attribute
    const findContainer = () => {
      return document.querySelector('main[data-scroll-container="true"]') as HTMLElement;
    };

    const container = findContainer();
    if (!container) {
      // Retry after a short delay if container not found (hydration timing)
      const timeout = setTimeout(() => {
        const retryContainer = findContainer();
        if (retryContainer) {
          setScrollContainer(retryContainer);
        }
      }, 100);
      return () => clearTimeout(timeout);
    }

    setScrollContainer(container);

    const toggleVisibility = () => {
      if (container.scrollTop > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // Initial check
    toggleVisibility();

    container.addEventListener("scroll", toggleVisibility, { passive: true });

    return () => {
      container.removeEventListener("scroll", toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    if (!scrollContainer) {
      // Fallback: try to find it again
      const container = document.querySelector('main[data-scroll-container="true"]') as HTMLElement;
      if (container) {
        container.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
      return;
    }

    scrollContainer.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className={cn(
        "fixed bottom-24 left-4 z-50 w-14 h-14 rounded-full bg-gray-700 text-white shadow-lg",
        "flex items-center justify-center hover:bg-gray-800 active:bg-gray-900 transition-colors",
        "md:hidden" // Only show on mobile
      )}
      aria-label="Scroll to top"
    >
      <ArrowUp className="h-6 w-6" />
    </button>
  );
}

