"use client";

import { memo, useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { LucideIcon, ArrowUpRight, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  gradient?: string;
  borderColor?: string;
  bgColor?: string;
  textColor?: string;
  iconColor?: string;
  blinking?: boolean;
  href?: string;
  onClick?: () => void;
  badge?: string;
  trend?: "up" | "down" | null;
  variant?: "default" | "primary" | "success" | "warning" | "danger";
  index?: number; // For stagger animation
}

export const StatCard = memo(function StatCard({
  title,
  value,
  icon: Icon,
  gradient,
  borderColor,
  bgColor = "bg-white",
  textColor = "text-gray-900",
  iconColor,
  blinking = false,
  href,
  onClick,
  badge,
  trend,
  variant = "default",
  index = 0,
}: StatCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [displayValue, setDisplayValue] = useState(typeof value === "number" ? 0 : value);
  const isClickable = !!href || !!onClick;
  
  // Animate card entrance
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, index * 50);
    return () => clearTimeout(timer);
  }, [index]);

  // Animate number counting
  useEffect(() => {
    if (typeof value === "number") {
      const duration = 1000;
      const steps = 60;
      const increment = value / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);
      
      return () => clearInterval(timer);
    } else {
      setDisplayValue(value);
    }
  }, [value]);

  // Premium variant-based styling
  const variantStyles = {
    default: {
      iconBg: "bg-gradient-to-br from-gray-50 to-gray-100",
      iconColor: "text-gray-600",
      border: "border-gray-200",
      accent: "text-gray-600",
      cardBg: "bg-white",
      glow: "",
    },
    primary: {
      iconBg: "bg-gradient-to-br from-[#273492]/10 via-[#273492]/15 to-[#273492]/10",
      iconColor: "text-[#273492]",
      border: "border-[#273492]/20",
      accent: "text-[#273492]",
      cardBg: "bg-gradient-to-br from-white to-[#273492]/5",
      glow: "stat-glow-primary",
    },
    success: {
      iconBg: "bg-gradient-to-br from-green-50 to-emerald-100",
      iconColor: "text-green-600",
      border: "border-green-200/50",
      accent: "text-green-600",
      cardBg: "bg-gradient-to-br from-white to-green-50/50",
      glow: "",
    },
    warning: {
      iconBg: "bg-gradient-to-br from-orange-50 to-amber-100",
      iconColor: "text-orange-600",
      border: "border-orange-200/50",
      accent: "text-orange-600",
      cardBg: "bg-gradient-to-br from-white to-orange-50/50",
      glow: "",
    },
    danger: {
      iconBg: "bg-gradient-to-br from-red-50 to-rose-100",
      iconColor: "text-[#e7342f]",
      border: "border-red-200/50",
      accent: "text-[#e7342f]",
      cardBg: "bg-gradient-to-br from-white to-red-50/50",
      glow: "",
    },
  };

  const styles = variantStyles[variant];
  const finalIconColor = iconColor || styles.iconColor;
  
  const cardContent = (
    <Card
      className={cn(
        "p-6 rounded-xl border transition-all duration-300 premium-hover",
        styles.cardBg,
        styles.border,
        styles.glow,
        isClickable && "cursor-pointer group",
        blinking && variant === "danger" && "pulse-glow border-red-300",
        blinking && variant === "warning" && "pulse-glow border-orange-300",
        blinking && variant === "primary" && "pulse-glow border-[#273492]/30",
        !isVisible && "opacity-0 translate-y-4",
        isVisible && "opacity-100 translate-y-0"
      )}
      style={{
        transitionDelay: `${index * 50}ms`,
        animation: isVisible ? `fadeInUp 0.6s ease-out ${index * 0.05}s forwards` : "none",
      }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {title}
            </p>
            {badge && (
              <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-[#273492]/10 to-[#273492]/5 text-[#273492] border border-[#273492]/20">
                {badge}
              </span>
            )}
            {trend && (
              <div className={cn(
                "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold",
                trend === "up" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              )}>
                {trend === "up" ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
              </div>
            )}
          </div>
          <p className={cn(
            "text-3xl sm:text-4xl font-bold text-gray-900 break-words transition-all duration-300",
            typeof value === "number" && "count-up"
          )}>
            {typeof displayValue === "number" ? displayValue.toLocaleString() : displayValue}
          </p>
        </div>
        <div className={cn(
          "p-3 rounded-xl flex-shrink-0 transition-all duration-300 icon-hover",
          styles.iconBg
        )}>
          <Icon className={cn(
            "h-6 w-6 transition-transform duration-300 group-hover:scale-110",
            finalIconColor
          )} />
        </div>
      </div>
      {isClickable && (
        <div className="mt-4 pt-4 border-t border-gray-100/50 flex items-center gap-2 text-xs font-semibold text-gray-500 group-hover:text-[#273492] transition-all duration-300">
          <span>View details</span>
          <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
        </div>
      )}
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block group">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
});
