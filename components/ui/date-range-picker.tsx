"use client";

import { useState, useEffect } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { format, startOfToday, endOfToday, subDays, startOfWeek, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils/cn";

export type DateRangeOption = "today" | "yesterday" | "last7days" | "thisweek" | "thismonth" | "custom" | "clear";

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
  { label: "Today", value: "today" as DateRangeOption },
  { label: "Yesterday", value: "yesterday" as DateRangeOption },
  { label: "This Week", value: "thisweek" as DateRangeOption },
  { label: "This Month", value: "thismonth" as DateRangeOption },
  { label: "Last 7 Days", value: "last7days" as DateRangeOption },
  { label: "Custom", value: "custom" as DateRangeOption },
  { label: "Clear Filter", value: "clear" as DateRangeOption },
];

export function DateRangePicker({
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [customStart, setCustomStart] = useState(
    value.option === "custom" ? format(value.start, "yyyy-MM-dd") : ""
  );
  const [customEnd, setCustomEnd] = useState(
    value.option === "custom" ? format(value.end, "yyyy-MM-dd") : ""
  );

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
      case "today":
        start = startOfToday();
        end = endOfToday();
        break;
      case "yesterday":
        start = subDays(startOfToday(), 1);
        end = subDays(startOfToday(), 1);
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
      case "last7days":
        start = subDays(startOfToday(), 6);
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
      
      // Validate dates
      if (startDate > endDate) {
        alert("Start date cannot be after end date");
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
    if (value.option === "clear") {
      return "All Time";
    }
    const preset = presets.find((p) => p.value === value.option);
    return preset?.label || "Select Date Range";
  };

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="outline"
        onClick={() => setShowPicker(!showPicker)}
        className="h-8 w-full md:w-auto md:min-w-[180px] justify-between text-xs"
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5" />
          <span className="font-medium">{getDisplayText()}</span>
        </div>
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>

      {showPicker && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPicker(false)}
          />
          <Card className="absolute top-full left-0 mt-2 z-50 w-full md:w-80 p-4 shadow-lg">
            <div className="space-y-3">
              {/* Presets */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase">
                  Quick Select
                </div>
                {presets.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handlePreset(preset.value)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                      preset.value === "clear"
                        ? "text-red-600 hover:bg-red-50 font-medium border-t border-gray-200 mt-2 pt-3"
                        : value.option === preset.value
                        ? "bg-[#0b63ff]/10 text-[#0b63ff] font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Range - Show when custom option is selected */}
              {value.option === "custom" && (
                <div className="space-y-3 pt-3 border-t">
                  <div className="text-xs font-semibold text-gray-500 uppercase">
                    Custom Range
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block font-medium">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        max={customEnd || format(endOfToday(), "yyyy-MM-dd")}
                        className="w-full h-9 px-3 rounded-lg border border-gray-300 focus:border-[#0b63ff] focus:outline-none focus:ring-2 focus:ring-[#0b63ff]/20 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block font-medium">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        min={customStart || format(startOfToday(), "yyyy-MM-dd")}
                        max={format(endOfToday(), "yyyy-MM-dd")}
                        className="w-full h-9 px-3 rounded-lg border border-gray-300 focus:border-[#0b63ff] focus:outline-none focus:ring-2 focus:ring-[#0b63ff]/20 text-sm"
                      />
                    </div>
                    <Button
                      onClick={handleCustomApply}
                      className="w-full h-9 bg-[#0b63ff] hover:bg-[#0a5ce6] text-white text-sm font-medium"
                      disabled={!customStart || !customEnd}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

