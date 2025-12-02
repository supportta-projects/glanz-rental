"use client";

import { useState, useEffect, useRef } from "react";
import { Calendar, ChevronDown, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { format, startOfToday, endOfToday, subDays, startOfWeek, startOfMonth, startOfDay, endOfDay, addYears, addDays } from "date-fns";
import { cn } from "@/lib/utils/cn";

export type DateRangeOption = "alltime" | "today" | "yesterday" | "tomorrow" | "thisweek" | "thismonth" | "custom" | "clear";

export interface DateRange {
  start: Date;
  end: Date;
  option: DateRangeOption;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const presets = [
  { label: "All Time", value: "alltime" as DateRangeOption },
  { label: "Today", value: "today" as DateRangeOption },
  { label: "Yesterday", value: "yesterday" as DateRangeOption },
  { label: "Tomorrow", value: "tomorrow" as DateRangeOption },
  { label: "This Week", value: "thisweek" as DateRangeOption },
  { label: "This Month", value: "thismonth" as DateRangeOption },
  { label: "Custom", value: "custom" as DateRangeOption },
];

export function DateRangePicker({
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [customStart, setCustomStart] = useState(
    value.option === "custom" ? format(value.start, "yyyy-MM-dd") : ""
  );
  const [customEnd, setCustomEnd] = useState(
    value.option === "custom" ? format(value.end, "yyyy-MM-dd") : ""
  );

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPicker]);

  // Update custom dates when value changes externally
  useEffect(() => {
    if (value.option === "custom") {
      setCustomStart(format(value.start, "yyyy-MM-dd"));
      setCustomEnd(format(value.end, "yyyy-MM-dd"));
    }
  }, [value]);

  const handlePreset = (option: DateRangeOption) => {
    let start: Date;
    let end: Date = endOfToday();

    switch (option) {
      case "alltime":
        start = subDays(startOfToday(), 365 * 2); // 2 years ago
        end = endOfToday();
        break;
      case "today":
        start = startOfToday();
        end = endOfToday();
        break;
      case "yesterday":
        const yesterday = subDays(startOfToday(), 1);
        start = startOfDay(yesterday);
        end = endOfDay(yesterday);
        break;
      case "tomorrow":
        const tomorrow = addDays(startOfToday(), 1); // Add 1 day
        start = startOfDay(tomorrow);
        end = endOfDay(tomorrow);
        break;
      case "thisweek":
        // Start of week (Monday) to today
        start = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday as start of week
        end = endOfToday();
        break;
      case "thismonth":
        // Start of current month to today
        start = startOfMonth(new Date());
        end = endOfToday();
        break;
      case "custom":
        // When custom is clicked, initialize with current range or default to last 7 days
        const defaultStart = customStart || format(subDays(startOfToday(), 6), "yyyy-MM-dd");
        const defaultEnd = customEnd || format(endOfToday(), "yyyy-MM-dd");
        setCustomStart(defaultStart);
        setCustomEnd(defaultEnd);
        // Set option to custom and show picker
        onChange({
          start: new Date(defaultStart),
          end: new Date(defaultEnd),
          option: "custom",
        });
        setShowPicker(true);
        return;
      case "clear":
        // Clear filter - set to a wide range (all time) to effectively show all orders
        // Using 1 year ago to today to show all orders
        start = subDays(startOfToday(), 365);
        end = endOfToday();
        onChange({ start, end, option: "clear" });
        setShowPicker(false);
        return;
      default:
        start = startOfToday();
        end = endOfToday();
    }

    onChange({ start, end, option });
    setShowPicker(false);
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      const startDate = new Date(customStart);
      const endDate = new Date(customEnd);
      const today = endOfToday();
      
      // Validate dates
      if (startDate > endDate) {
        alert("Start date cannot be after end date");
        return;
      }
      
      // Validate start date is not in the future
      if (startDate > today) {
        alert("Start date cannot be in the future");
        return;
      }
      
      onChange({
        start: startDate,
        end: endDate,
        option: "custom",
      });
      setShowPicker(false);
    }
  };

  const getDisplayText = () => {
    if (value.option === "custom") {
      return `${format(value.start, "dd MMM")} - ${format(value.end, "dd MMM yyyy")}`;
    }
    if (value.option === "clear" || value.option === "alltime") {
      return "All Time";
    }
    if (value.option === "today") {
      return "Today";
    }
    if (value.option === "tomorrow") {
      return "Tomorrow";
    }
    if (value.option === "thisweek") {
      return "This Week";
    }
    if (value.option === "thismonth") {
      return "This Month";
    }
    if (value.option === "yesterday") {
      return "Yesterday";
    }
    const preset = presets.find((p) => p.value === value.option);
    return preset?.label || "All Time";
  };

  const displayText = getDisplayText();
  const isFiltered = value.option !== "clear" && value.option !== "alltime";

  return (
    <div className={cn("relative", className)} ref={pickerRef}>
      <Button
        variant="outline"
        onClick={() => setShowPicker(!showPicker)}
        className={cn(
          "!h-9 !px-3.5 !min-h-0 gap-2 text-sm font-medium transition-all duration-200",
          "border border-gray-200 bg-white hover:border-[#273492] hover:bg-[#273492]/5 hover:shadow-sm",
          "active:scale-[0.97] shadow-sm",
          "focus-visible:ring-2 focus-visible:ring-[#273492]/20 focus-visible:ring-offset-1",
          isFiltered && "border-[#273492] text-[#273492] bg-[#273492]/5 shadow-sm"
        )}
        size="sm"
      >
        {isFiltered ? (
          <Filter className="h-3.5 w-3.5 flex-shrink-0" />
        ) : (
          <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-gray-500" />
        )}
        <span className={cn(
          "truncate max-w-[100px] sm:max-w-[140px] font-medium",
          isFiltered ? "text-[#273492]" : "text-gray-700"
        )}>{displayText}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200 text-gray-400", showPicker && "rotate-180")} />
        {isFiltered && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const today = new Date();
              const oneYearAgo = new Date();
              oneYearAgo.setFullYear(today.getFullYear() - 1);
              onChange({
                start: oneYearAgo,
                end: today,
                option: "clear",
              });
              setShowPicker(false);
            }}
            className="ml-0.5 p-0.5 rounded hover:bg-[#273492]/10 transition-colors"
            aria-label="Clear filter"
          >
            <X className="h-3 w-3 text-[#273492] hover:text-[#e7342f]" />
          </button>
        )}
      </Button>

      {showPicker && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPicker(false)}
          />
          <Card className="absolute top-full right-0 mt-1.5 z-50 w-72 p-2.5 shadow-xl border border-gray-200 bg-white rounded-lg">
            <div className="space-y-2">
              {/* Header */}
              <div className="flex items-center justify-between pb-1.5 border-b border-gray-200">
                <span className="text-xs font-semibold text-gray-700">Date Filter</span>
                <button
                  onClick={() => setShowPicker(false)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  aria-label="Close"
                >
                  <X className="h-3 w-3 text-gray-500" />
                </button>
              </div>

            {/* Presets Grid - Compact 2-column layout */}
            <div className="grid grid-cols-2 gap-1.5">
              {presets.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePreset(preset.value)}
                  className={cn(
                    "text-left px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-150",
                    "hover:bg-gray-50 active:scale-[0.98]",
                    value.option === preset.value || (preset.value === "alltime" && value.option === "clear")
                      ? "bg-[#273492] text-white shadow-sm"
                      : "text-gray-700 bg-white border border-gray-200 hover:border-gray-300"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Date Range */}
            {value.option === "custom" && (
              <div className="space-y-2 pt-2 border-t border-gray-200">
                <div className="text-xs font-semibold text-gray-700 mb-1.5">Custom Range</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Start</label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      max={format(endOfToday(), "yyyy-MM-dd")}
                      className="w-full h-7 px-2 rounded border border-gray-300 focus:border-[#273492] focus:outline-none focus:ring-1 focus:ring-[#273492] text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">End</label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      min={customStart || format(startOfToday(), "yyyy-MM-dd")}
                      max={format(addYears(new Date(), 1), "yyyy-MM-dd")}
                      className="w-full h-7 px-2 rounded border border-gray-300 focus:border-[#273492] focus:outline-none focus:ring-1 focus:ring-[#273492] text-xs"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleCustomApply}
                  className="w-full h-7 bg-[#273492] hover:bg-[#1f2a7a] text-white text-xs font-medium"
                  disabled={!customStart || !customEnd}
                  size="sm"
                >
                  Apply
                </Button>
              </div>
            )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

